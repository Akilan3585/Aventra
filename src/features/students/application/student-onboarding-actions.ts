"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

import {
  canSubmitStudentOnboarding,
  studentOnboardingSchema,
  type StudentOnboardingState,
} from "@/features/students/domain/student-onboarding";
import { isMembershipStatus } from "@/server/auth/campus-access";
import { syncClerkCampusAuthorization } from "@/server/auth/clerk-authorization-sync";
import { createSupabaseAdminClient } from "@/server/supabase/admin-client";

export async function submitStudentOnboardingAction(
  _previousState: StudentOnboardingState,
  formData: FormData,
): Promise<StudentOnboardingState> {
  try {
    const [{ userId }, user] = await Promise.all([auth(), currentUser()]);
    if (!userId || !user) {
      return { message: "Sign in to complete student onboarding.", status: "error" };
    }

    const primaryEmail = user.primaryEmailAddress;
    const email = primaryEmail?.emailAddress.trim().toLowerCase() ?? "";
    if (!email || primaryEmail?.verification?.status !== "verified") {
      return { message: "Verify your primary email in Clerk before continuing.", status: "error" };
    }

    const parsed = studentOnboardingSchema.safeParse({
      admissionYear: formData.get("admissionYear"),
      departmentId: formData.get("departmentId"),
      displayName: formData.get("displayName"),
      semester: formData.get("semester"),
      studentNumber: formData.get("studentNumber"),
    });
    if (!parsed.success) {
      return {
        message: parsed.error.issues[0]?.message ?? "Check your student details.",
        status: "error",
      };
    }

    const client = createSupabaseAdminClient();
    const { data: linkedProfile, error: linkedError } = await client
      .from("profiles")
      .select("id, campus_role, membership_status")
      .eq("clerk_user_id", userId)
      .maybeSingle();
    if (linkedError) throw new Error("PROFILE_LOOKUP_FAILED");

    let profile = linkedProfile;
    if (!profile) {
      const { data, error } = await client
        .from("profiles")
        .select("id, campus_role, membership_status")
        .eq("email", email)
        .maybeSingle();
      if (error) throw new Error("PROFILE_LOOKUP_FAILED");
      profile = data;
    }

    const status = profile?.membership_status ?? "unlinked";
    if (!canSubmitStudentOnboarding({ role: profile?.campus_role ?? null, status })) {
      return {
        message: "This identity is assigned to another portal or is not eligible for onboarding.",
        status: "error",
      };
    }

    const profileId = profile?.id ?? userId;
    if (profile) {
      const { error } = await client
        .from("profiles")
        .update({
          clerk_user_id: userId,
          display_name: parsed.data.displayName,
          email,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profileId);
      if (error) {
        return {
          message: error.code === "23505" ? "This account is already linked to another campus identity." : "Could not update your campus profile.",
          status: "error",
        };
      }
    } else {
      const { error } = await client.from("profiles").insert({
        campus_role: "student",
        clerk_user_id: userId,
        display_name: parsed.data.displayName,
        email,
        id: profileId,
        membership_status: "pending",
      });
      if (error) {
        return {
          message: error.code === "23505" ? "A campus profile already exists for this account." : "Could not create your campus profile.",
          status: "error",
        };
      }
      profile = { campus_role: "student", id: profileId, membership_status: "pending" };
    }

    const { data: existingStudent, error: existingError } = await client
      .from("students")
      .select("id")
      .eq("profile_id", profileId)
      .maybeSingle();
    if (existingError) throw new Error("STUDENT_LOOKUP_FAILED");

    if (!existingStudent) {
      const { data: department, error: departmentError } = await client
        .from("departments")
        .select("id")
        .eq("id", parsed.data.departmentId)
        .maybeSingle();
      if (departmentError || !department) {
        return { message: "Select a department from the campus directory.", status: "error" };
      }

      const { data: student, error: studentError } = await client
        .from("students")
        .insert({
          admission_year: parsed.data.admissionYear,
          department_id: parsed.data.departmentId,
          profile_id: profileId,
          semester: parsed.data.semester,
          student_number: parsed.data.studentNumber.toUpperCase(),
        })
        .select("id")
        .single();
      if (studentError) {
        return {
          message: studentError.code === "23505" ? "That student number is already registered. Contact your college office if it belongs to you." : "Could not submit your student details.",
          status: "error",
        };
      }

      await client.from("audit_logs").insert({
        action: "student.onboarding_submitted",
        actor_profile_id: profileId,
        entity_id: student.id,
        entity_type: "student",
        metadata: {
          actor_clerk_id: userId,
          membership_status: profile.membership_status,
          student_number: parsed.data.studentNumber.toUpperCase(),
        },
      });
    }

    if (isMembershipStatus(profile.membership_status)) {
      await syncClerkCampusAuthorization({
        role: "student",
        status: profile.membership_status,
        userId,
      });
    }

    revalidatePath("/access-pending");
    revalidatePath("/students");
    return {
      message: existingStudent
        ? "Your student profile is already submitted and awaiting campus approval."
        : "Student profile submitted. Your campus team will verify and activate it.",
      status: "success",
    };
  } catch {
    return {
      message: "We could not complete onboarding right now. Please try again or contact your campus office.",
      status: "error",
    };
  }
}
