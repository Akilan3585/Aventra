"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  assignmentDueDateIsValid,
  canSubmitAssignment,
  scoreIsWithinMaximum,
} from "@/features/academics/domain/academic-rules";
import { facultyOwnsEnrollment, facultyOwnsOffering, studentEnrollmentIds } from "@/server/auth/academic-scope";
import { requirePermission } from "@/server/auth/campus-access";
import { createSupabaseAdminClient } from "@/server/supabase/admin-client";

export type AcademicActionState = { message: string; status: "idle" | "error" | "success" };
const fail = (message: string): AcademicActionState => ({ message, status: "error" });
const success = (message: string): AcademicActionState => ({ message, status: "success" });

async function audit(actorProfileId: string | null, action: string, entityType: string, entityId: string, metadata = {}) {
  await createSupabaseAdminClient().from("audit_logs").insert({ action, actor_profile_id: actorProfileId, entity_id: entityId, entity_type: entityType, metadata });
}

const assignmentSchema = z.object({
  dueAt: z.union([z.iso.datetime({ local: true }), z.literal("")]),
  maximumMarks: z.coerce.number().positive().max(1000),
  offeringId: z.uuid(),
  title: z.string().trim().min(3).max(160),
});

export async function createAssignmentAction(_: AcademicActionState, formData: FormData): Promise<AcademicActionState> {
  try {
    const access = await requirePermission("assignments:manage");
    const parsed = assignmentSchema.safeParse({ dueAt: formData.get("dueAt") ?? "", maximumMarks: formData.get("maximumMarks"), offeringId: formData.get("offeringId"), title: formData.get("title") });
    if (!parsed.success) return fail("Complete the class, title, marks, and a valid due date.");
    if (!assignmentDueDateIsValid(parsed.data.dueAt)) return fail("The due date must be in the future.");
    if (access.role === "faculty" && (!access.profileId || !(await facultyOwnsOffering(access.profileId, parsed.data.offeringId)))) return fail("You can create work only for your assigned classes.");
    const client = createSupabaseAdminClient();
    const { data, error } = await client.from("assignments").insert({ due_at: parsed.data.dueAt ? new Date(parsed.data.dueAt).toISOString() : null, maximum_marks: parsed.data.maximumMarks, offering_id: parsed.data.offeringId, title: parsed.data.title }).select("id").single();
    if (error) return fail("Assignment could not be created.");
    await audit(access.profileId, "assignment.created", "assignment", data.id, { offering_id: parsed.data.offeringId });
    revalidatePath("/assignments"); revalidatePath("/student-workspace"); revalidatePath("/faculty-workspace");
    return success("Assignment published to enrolled students.");
  } catch { return fail("You do not have permission to create assignments."); }
}

const submissionSchema = z.object({ assignmentId: z.uuid(), enrollmentId: z.uuid() });
export async function submitAssignmentAction(formData: FormData) {
  const access = await requirePermission("submissions:manage");
  const parsed = submissionSchema.safeParse({ assignmentId: formData.get("assignmentId"), enrollmentId: formData.get("enrollmentId") });
  if (!parsed.success || access.role !== "student" || !access.profileId) return;
  const ownIds = await studentEnrollmentIds(access.profileId);
  if (!ownIds.includes(parsed.data.enrollmentId)) return;
  const client = createSupabaseAdminClient();
  const [{ data: assignment }, { data: enrollment }] = await Promise.all([
    client.from("assignments").select("offering_id, due_at").eq("id", parsed.data.assignmentId).maybeSingle(),
    client.from("enrollments").select("offering_id").eq("id", parsed.data.enrollmentId).maybeSingle(),
  ]);
  if (!assignment || !enrollment || !canSubmitAssignment(
    { dueAt: assignment.due_at, offeringId: assignment.offering_id },
    { offeringId: enrollment.offering_id },
  )) return;
  const { data } = await client.from("assignment_submissions").upsert({ assignment_id: parsed.data.assignmentId, enrollment_id: parsed.data.enrollmentId, submitted_at: new Date().toISOString() }, { onConflict: "assignment_id,enrollment_id" }).select("id").single();
  if (data) await audit(access.profileId, "assignment.submitted", "assignment_submission", data.id);
  revalidatePath("/assignments"); revalidatePath("/student-workspace");
}

const gradeSchema = z.object({ feedback: z.string().trim().max(2000), score: z.coerce.number().min(0), submissionId: z.uuid() });
export async function gradeSubmissionAction(_: AcademicActionState, formData: FormData): Promise<AcademicActionState> {
  try {
    const access = await requirePermission("assignments:manage");
    const parsed = gradeSchema.safeParse({ feedback: formData.get("feedback") ?? "", score: formData.get("score"), submissionId: formData.get("submissionId") });
    if (!parsed.success) return fail("Enter a valid score and feedback.");
    const client = createSupabaseAdminClient();
    const { data: submission } = await client.from("assignment_submissions").select("enrollment_id, submitted_at, assignments (maximum_marks, offering_id)").eq("id", parsed.data.submissionId).maybeSingle();
    if (!submission?.submitted_at) return fail("Only a submitted assignment can be graded.");
    if (!scoreIsWithinMaximum(parsed.data.score, Number(submission.assignments.maximum_marks))) return fail("Score cannot exceed the assignment maximum.");
    if (access.role === "faculty" && (!access.profileId || !(await facultyOwnsEnrollment(access.profileId, submission.enrollment_id)))) return fail("You can grade only your assigned students.");
    const { error } = await client.from("assignment_submissions").update({ feedback: parsed.data.feedback || null, graded_at: new Date().toISOString(), graded_by_profile_id: access.profileId, score: parsed.data.score }).eq("id", parsed.data.submissionId);
    if (error) return fail("Grade could not be saved.");
    await audit(access.profileId, "assignment.graded", "assignment_submission", parsed.data.submissionId, { score: parsed.data.score });
    revalidatePath("/assignments"); revalidatePath("/student-workspace");
    return success("Grade and feedback saved.");
  } catch { return fail("You do not have permission to grade submissions."); }
}

const enrollmentSchema = z.object({ offeringId: z.uuid(), studentId: z.uuid() });
export async function createEnrollmentAction(_: AcademicActionState, formData: FormData): Promise<AcademicActionState> {
  try {
    const access = await requirePermission("enrollments:manage");
    const parsed = enrollmentSchema.safeParse({ offeringId: formData.get("offeringId"), studentId: formData.get("studentId") });
    if (!parsed.success) return fail("Choose a student and course offering.");
    const client = createSupabaseAdminClient();
    const [{ data: offering }, count] = await Promise.all([
      client.from("course_offerings").select("capacity").eq("id", parsed.data.offeringId).maybeSingle(),
      client.from("enrollments").select("id", { count: "exact", head: true }).eq("offering_id", parsed.data.offeringId),
    ]);
    if (!offering) return fail("Course offering was not found.");
    if ((count.count ?? 0) >= offering.capacity) return fail("This section has reached its seat capacity.");
    const { data, error } = await client.from("enrollments").insert({ offering_id: parsed.data.offeringId, student_id: parsed.data.studentId }).select("id").single();
    if (error) return fail(error.code === "23505" ? "The student is already enrolled in this section." : "Enrollment could not be created.");
    await audit(access.profileId, "enrollment.created", "enrollment", data.id, { offering_id: parsed.data.offeringId, student_id: parsed.data.studentId });
    revalidatePath("/enrollments"); revalidatePath("/students");
    return success("Student enrolled and section capacity refreshed.");
  } catch { return fail("You do not have permission to manage enrollment."); }
}
