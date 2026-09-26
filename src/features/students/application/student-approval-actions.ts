"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  acceptedStudentDetailsSchema,
  canApproveStudent,
  placeholderStudentDetails,
  placeholderStudentNumber,
  resolveAcceptedDepartment,
  studentApprovalReadiness,
} from "@/features/students/domain/student-approval";
import { enrollStudentInClasses } from "@/features/students/application/student-enrollment.service";
import { resolveApprovalReviewer } from "@/features/students/infrastructure/student-approval.repository";
import { requirePermission } from "@/server/auth/campus-access";
import { syncClerkCampusAuthorization } from "@/server/auth/clerk-authorization-sync";
import { createSupabaseAdminClient } from "@/server/supabase/admin-client";

const approvalSchema = z.object({ profileId: z.string().trim().min(2).max(200) });

function approvalResult(result: string): never {
  redirect(`/student-approvals?result=${encodeURIComponent(result)}`);
}

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value : undefined;
}

/**
 * Accepts a pending student sign-up. When the student has not submitted
 * academic details, the reviewer supplies them from the official record and
 * the students row is created here. A faculty reviewer's student is then
 * enrolled in that faculty member's sections so the student immediately sees
 * their assignments and study materials.
 */
export async function approveStudentAction(formData: FormData) {
  const access = await requirePermission("students:approve");
  const parsed = approvalSchema.safeParse({ profileId: formData.get("profileId") });
  if (!parsed.success || !access.profileId) approvalResult("invalid-request");

  const client = createSupabaseAdminClient();
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("id, clerk_user_id, campus_role, membership_status")
    .eq("id", parsed.data.profileId)
    .maybeSingle();
  if (profileError || !profile) approvalResult("not-found");
  if (profile.campus_role !== "student" || profile.membership_status !== "pending") approvalResult("already-reviewed");
  if (!profile.clerk_user_id) approvalResult("identity-required");

  const { facultyId, reviewer } = await resolveApprovalReviewer(access.profileId, access.role);
  const { data: existingStudent, error: studentError } = await client
    .from("students")
    .select("id, department_id, student_number")
    .eq("profile_id", profile.id)
    .maybeSingle();
  if (studentError) approvalResult("not-found");

  const readiness = studentApprovalReadiness({ detailsSubmitted: Boolean(existingStudent), identityLinked: true });
  if (!canApproveStudent({ readiness, reviewer, studentDepartmentId: existingStudent?.department_id ?? null })) {
    approvalResult("outside-scope");
  }

  let student = existingStudent;
  let placeholderDetails = false;
  if (!student) {
    // One-click accept: the student never submitted academic details, so the
    // roster row is created with placeholders. Faculty place the student in
    // their own department; admins pick one on the form.
    const chosen = acceptedStudentDetailsSchema.safeParse({ departmentId: formValue(formData, "departmentId") });
    if (!chosen.success) approvalResult("details-invalid");
    const departmentId = resolveAcceptedDepartment(reviewer, chosen.data.departmentId);
    if (!departmentId) approvalResult("details-invalid");
    const { data: department } = await client.from("departments").select("id").eq("id", departmentId).maybeSingle();
    if (!department) approvalResult("details-invalid");

    const { data: profileRow } = await client.from("profiles").select("email").eq("id", profile.id).single();
    const details = placeholderStudentDetails({ email: profileRow?.email ?? profile.id });
    let created: { department_id: string; id: string; student_number: string } | null = null;
    for (let attempt = 0; attempt < 5 && !created; attempt += 1) {
      const { data, error } = await client
        .from("students")
        .insert({
          admission_year: details.admissionYear,
          department_id: departmentId,
          profile_id: profile.id,
          semester: details.semester,
          student_number: placeholderStudentNumber(profileRow?.email ?? profile.id, attempt),
        })
        .select("id, department_id, student_number")
        .single();
      if (data) created = data;
      else if (error?.code !== "23505") approvalResult("details-invalid");
    }
    if (!created) approvalResult("student-number-taken");
    student = created;
    placeholderDetails = true;
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
    .eq("id", profile.id)
    .eq("campus_role", "student")
    .eq("membership_status", "pending")
    .select("id")
    .maybeSingle();
  if (approvalError || !approved) approvalResult("already-reviewed");

  const clerkSync = await syncClerkCampusAuthorization({
    role: "student",
    status: "active",
    userId: profile.clerk_user_id,
  });

  // Connect the student to their department's classes, plus the approving
  // faculty member's own sections, so assignments and materials appear at once.
  const enrolledOfferingIds = await enrollStudentInClasses({
    actorProfileId: access.profileId,
    departmentId: student.department_id,
    facultyId,
    source: "student.onboarding_approved",
    studentId: student.id,
  });

  // Best effort: the student sees this in their message centre after sign-in.
  const notification = await client.from("notifications").insert({
    body: enrolledOfferingIds.length
      ? `Your student account (${student.student_number}) has been verified and you are enrolled in ${enrolledOfferingIds.length} class${enrolledOfferingIds.length === 1 ? "" : "es"}. Open your workspace to see assignments and study materials.`
      : `Your student account (${student.student_number}) has been verified. Sign in to open your workspace, assignments, and study materials.`,
    channel: "in_app",
    recipient_profile_id: profile.id,
    sent_at: approvedAt,
    status: "sent",
    subject: "Your campus membership is approved",
  });
  await client.from("audit_logs").insert({
    action: "student.onboarding_approved",
    actor_profile_id: access.profileId,
    entity_id: student.id,
    entity_type: "student",
    metadata: {
      actor_clerk_id: access.userId,
      clerk_metadata_sync: clerkSync.metadata,
      clerk_organization_sync: clerkSync.organization,
      department_id: student.department_id,
      placeholder_details: placeholderDetails,
      enrolled_offering_ids: enrolledOfferingIds,
      student_notified: !notification.error,
      student_number: student.student_number,
    },
  });

  for (const path of ["/student-approvals", "/access-pending", "/student-workspace", "/students", "/assignments", "/courses", "/notifications"]) {
    revalidatePath(path);
  }
  approvalResult(clerkSync.metadata === "failed" ? "approved-sync-pending" : enrolledOfferingIds.length ? "approved-enrolled" : "approved");
}
