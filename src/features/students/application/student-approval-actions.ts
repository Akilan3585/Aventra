"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requirePermission } from "@/server/auth/campus-access";
import { syncClerkCampusAuthorization } from "@/server/auth/clerk-authorization-sync";
import { createSupabaseAdminClient } from "@/server/supabase/admin-client";

const approvalSchema = z.object({ profileId: z.string().trim().min(2).max(200) });

function approvalResult(result: string): never {
  redirect(`/student-approvals?result=${encodeURIComponent(result)}`);
}

export async function approveStudentAction(formData: FormData) {
  const access = await requirePermission("students:approve");
  const parsed = approvalSchema.safeParse({ profileId: formData.get("profileId") });
  if (!parsed.success || !access.profileId) approvalResult("invalid-request");

  const client = createSupabaseAdminClient();
  const { data: target, error: targetError } = await client
    .from("students")
    .select("id, department_id, student_number, profiles!inner (id, clerk_user_id, campus_role, membership_status)")
    .eq("profile_id", parsed.data.profileId)
    .maybeSingle();
  if (targetError || !target) approvalResult("not-found");
  if (target.profiles.campus_role !== "student" || target.profiles.membership_status !== "pending") {
    approvalResult("already-reviewed");
  }
  if (!target.profiles.clerk_user_id) approvalResult("identity-required");

  if (access.role === "faculty") {
    const { data: faculty, error: facultyError } = await client
      .from("faculty_members")
      .select("department_id")
      .eq("profile_id", access.profileId)
      .maybeSingle();
    if (facultyError || !faculty || faculty.department_id !== target.department_id) {
      approvalResult("outside-scope");
    }
  }

  const approvedAt = new Date().toISOString();
  const { data: approved, error: approvalError } = await client
    .from("profiles")
    .update({
      approved_at: approvedAt,
      approved_by_profile_id: access.profileId,
      membership_status: "active",
      updated_at: approvedAt,
      valid_from: approvedAt,
      valid_until: null,
    })
    .eq("id", parsed.data.profileId)
    .eq("campus_role", "student")
    .eq("membership_status", "pending")
    .select("id")
    .maybeSingle();
  if (approvalError || !approved) approvalResult("already-reviewed");

  const clerkSync = await syncClerkCampusAuthorization({
    role: "student",
    status: "active",
    userId: target.profiles.clerk_user_id,
  });
  await client.from("audit_logs").insert({
    action: "student.onboarding_approved",
    actor_profile_id: access.profileId,
    entity_id: target.id,
    entity_type: "student",
    metadata: {
      actor_clerk_id: access.userId,
      clerk_metadata_sync: clerkSync.metadata,
      clerk_organization_sync: clerkSync.organization,
      department_id: target.department_id,
      student_number: target.student_number,
    },
  });

  revalidatePath("/student-approvals");
  revalidatePath("/access-pending");
  revalidatePath("/student-workspace");
  revalidatePath("/settings");
  approvalResult(clerkSync.metadata === "failed" ? "approved-sync-pending" : "approved");
}
