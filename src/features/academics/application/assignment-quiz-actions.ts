"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { assignmentDueDateIsValid } from "@/features/academics/domain/academic-rules";
import {
  answersFromEntries,
  assignmentAcceptsAttempts,
  assignmentStatuses,
  attemptIsWithinTime,
  canTransitionAssignmentStatus,
  gradeQuizAttempt,
  parseQuizQuestionsPayload,
  quizLimits,
  quizTotalMarks,
  validateQuizQuestions,
} from "@/features/academics/domain/assignment-quiz-rules";
import { loadAssignmentQuestions } from "@/features/academics/infrastructure/assignment-quizzes.repository";
import { facultyOwnsOffering, studentEnrollmentIds } from "@/server/auth/academic-scope";
import { requirePermission } from "@/server/auth/campus-access";
import { createSupabaseAdminClient } from "@/server/supabase/admin-client";

export type QuizActionState = { errors?: string[]; message: string; status: "idle" | "error" | "success" };
const fail = (message: string, errors?: string[]): QuizActionState => ({ errors, message, status: "error" });

async function audit(actorProfileId: string | null, action: string, entityType: string, entityId: string, metadata = {}) {
  await createSupabaseAdminClient().from("audit_logs").insert({ action, actor_profile_id: actorProfileId, entity_id: entityId, entity_type: entityType, metadata });
}

function refreshAssignment(assignmentId: string) {
  for (const path of ["/assignments", `/assignments/${assignmentId}`, "/student-workspace"]) revalidatePath(path);
}

const quizSchema = z.object({
  dueAt: z.union([z.iso.datetime({ local: true }), z.literal("")]),
  instructions: z.string().trim().max(4000),
  offeringId: z.guid(),
  publish: z.enum(["draft", "published"]),
  timeLimitMinutes: z.union([z.literal(""), z.coerce.number().int().min(1).max(quizLimits.maxTimeLimitMinutes)]),
  title: z.string().trim().min(3).max(160),
});

/**
 * Creates a Google-Form style multiple choice quiz with its question bank in
 * one transaction-like sequence (the assignment row is removed again if the
 * questions or options fail to save). Redirects to the new quiz on success.
 */
export async function createQuizAction(_: QuizActionState, formData: FormData): Promise<QuizActionState> {
  let assignmentId = "";
  try {
    const access = await requirePermission("assignments:manage");
    const parsed = quizSchema.safeParse({
      dueAt: formData.get("dueAt") ?? "",
      instructions: formData.get("instructions") ?? "",
      offeringId: formData.get("offeringId"),
      publish: formData.get("publish") ?? "draft",
      timeLimitMinutes: formData.get("timeLimitMinutes") ?? "",
      title: formData.get("title"),
    });
    if (!parsed.success) return fail("Choose a class, give the quiz a title of at least 3 characters, and keep the time limit between 1 and 600 minutes.");
    if (!assignmentDueDateIsValid(parsed.data.dueAt)) return fail("The due date must be in the future.");
    const questions = parseQuizQuestionsPayload(formData.get("questions"));
    if (!questions) return fail("The quiz questions could not be read. Reload the builder and try again.");
    const errors = validateQuizQuestions(questions);
    if (errors.length) return fail("Fix the highlighted questions before saving.", errors);
    if (access.role === "faculty" && (!access.profileId || !(await facultyOwnsOffering(access.profileId, parsed.data.offeringId)))) return fail("You can create quizzes only for your assigned classes.");

    const client = createSupabaseAdminClient();
    const now = new Date().toISOString();
    const { data: assignment, error } = await client.from("assignments").insert({
      created_by_profile_id: access.profileId,
      due_at: parsed.data.dueAt ? new Date(parsed.data.dueAt).toISOString() : null,
      instructions: parsed.data.instructions || null,
      kind: "quiz",
      maximum_marks: quizTotalMarks(questions),
      offering_id: parsed.data.offeringId,
      published_at: parsed.data.publish === "published" ? now : null,
      show_results: formData.get("showResults") === "on",
      shuffle_questions: formData.get("shuffleQuestions") === "on",
      status: parsed.data.publish,
      time_limit_minutes: parsed.data.timeLimitMinutes === "" ? null : parsed.data.timeLimitMinutes,
      title: parsed.data.title,
    }).select("id").single();
    if (error || !assignment) return fail("The quiz could not be created.");

    const { data: savedQuestions, error: questionError } = await client.from("assignment_questions").insert(questions.map((question, index) => ({
      allow_multiple: question.allowMultiple,
      assignment_id: assignment.id,
      explanation: question.explanation?.trim() || null,
      marks: question.marks,
      position: index + 1,
      prompt: question.prompt.trim(),
    }))).select("id, position");
    if (questionError || !savedQuestions) {
      await client.from("assignments").delete().eq("id", assignment.id);
      return fail("The quiz questions could not be saved.");
    }
    const questionIdByPosition = new Map(savedQuestions.map((question) => [question.position, question.id]));
    const { error: optionError } = await client.from("assignment_question_options").insert(questions.flatMap((question, index) => question.options.map((option, optionIndex) => ({
      is_correct: option.isCorrect,
      label: option.label.trim(),
      position: optionIndex + 1,
      question_id: questionIdByPosition.get(index + 1) ?? "",
    }))));
    if (optionError) {
      await client.from("assignments").delete().eq("id", assignment.id);
      return fail("The answer options could not be saved.");
    }

    await audit(access.profileId, "quiz.created", "assignment", assignment.id, { offering_id: parsed.data.offeringId, questions: questions.length, status: parsed.data.publish });
    refreshAssignment(assignment.id);
    assignmentId = assignment.id;
  } catch {
    return fail("You do not have permission to create quizzes.");
  }
  redirect(`/assignments/${assignmentId}?created=1`);
}

const statusSchema = z.object({ assignmentId: z.guid(), status: z.enum(assignmentStatuses) });

/** Draft -> published -> closed transitions for faculty; students never see drafts. */
export async function setAssignmentStatusAction(formData: FormData) {
  const access = await requirePermission("assignments:manage");
  const parsed = statusSchema.safeParse({ assignmentId: formData.get("assignmentId"), status: formData.get("status") });
  if (!parsed.success) return;
  const client = createSupabaseAdminClient();
  const { data: assignment } = await client.from("assignments").select("id, offering_id, status, published_at").eq("id", parsed.data.assignmentId).maybeSingle();
  if (!assignment || !canTransitionAssignmentStatus(assignment.status, parsed.data.status)) return;
  if (access.role === "faculty" && (!access.profileId || !(await facultyOwnsOffering(access.profileId, assignment.offering_id)))) return;
  const { error } = await client.from("assignments").update({
    published_at: parsed.data.status === "published" ? assignment.published_at ?? new Date().toISOString() : assignment.published_at,
    status: parsed.data.status,
  }).eq("id", assignment.id);
  if (error) return;
  await audit(access.profileId, `assignment.${parsed.data.status}`, "assignment", assignment.id, { from: assignment.status });
  refreshAssignment(assignment.id);
}

const assignmentIdSchema = z.object({ assignmentId: z.guid() });

/** Removes an assignment that nobody has submitted yet (drafts, or published work with no attempts). */
export async function deleteAssignmentAction(formData: FormData) {
  const access = await requirePermission("assignments:manage");
  const parsed = assignmentIdSchema.safeParse({ assignmentId: formData.get("assignmentId") });
  if (!parsed.success) return;
  const client = createSupabaseAdminClient();
  const [{ data: assignment }, submitted] = await Promise.all([
    client.from("assignments").select("id, offering_id, title").eq("id", parsed.data.assignmentId).maybeSingle(),
    client.from("assignment_submissions").select("id", { count: "exact", head: true }).eq("assignment_id", parsed.data.assignmentId).not("submitted_at", "is", null),
  ]);
  if (!assignment || (submitted.count ?? 0) > 0) return;
  if (access.role === "faculty" && (!access.profileId || !(await facultyOwnsOffering(access.profileId, assignment.offering_id)))) return;
  const { error } = await client.from("assignments").delete().eq("id", assignment.id);
  if (error) return;
  await audit(access.profileId, "assignment.deleted", "assignment", assignment.id, { offering_id: assignment.offering_id, title: assignment.title });
  refreshAssignment(assignment.id);
  redirect("/assignments?deleted=1");
}

async function ownEnrollmentFor(profileId: string, offeringId: string) {
  const ownIds = await studentEnrollmentIds(profileId);
  if (!ownIds.length) return null;
  const { data } = await createSupabaseAdminClient().from("enrollments").select("id").in("id", ownIds).eq("offering_id", offeringId).maybeSingle();
  return data?.id ?? null;
}

/** Records when a student opens a quiz so the time limit can be enforced server-side. */
export async function startQuizAttemptAction(formData: FormData) {
  const access = await requirePermission("submissions:manage");
  const parsed = assignmentIdSchema.safeParse({ assignmentId: formData.get("assignmentId") });
  if (!parsed.success || access.role !== "student" || !access.profileId) return;
  const client = createSupabaseAdminClient();
  const { data: assignment } = await client.from("assignments").select("id, offering_id, kind, status, due_at").eq("id", parsed.data.assignmentId).maybeSingle();
  if (!assignment || assignment.kind !== "quiz" || !assignmentAcceptsAttempts({ dueAt: assignment.due_at, status: assignment.status })) return;
  const enrollmentId = await ownEnrollmentFor(access.profileId, assignment.offering_id);
  if (!enrollmentId) return;
  const { data: existing } = await client.from("assignment_submissions").select("id, started_at, submitted_at").eq("assignment_id", assignment.id).eq("enrollment_id", enrollmentId).maybeSingle();
  if (existing?.submitted_at) return;
  const startedAt = new Date().toISOString();
  const result = existing
    ? existing.started_at ? { data: existing, error: null } : await client.from("assignment_submissions").update({ started_at: startedAt }).eq("id", existing.id).select("id").single()
    : await client.from("assignment_submissions").insert({ assignment_id: assignment.id, enrollment_id: enrollmentId, started_at: startedAt }).select("id").single();
  if (result.error || !result.data) return;
  if (!existing?.started_at) await audit(access.profileId, "quiz.started", "assignment_submission", result.data.id, { assignment_id: assignment.id });
  refreshAssignment(assignment.id);
}

/**
 * Grades a quiz attempt server-side from the answer key, stores every answer,
 * and marks the submission graded. Attempts past the time limit or due date
 * (plus a short grace period) are refused.
 */
export async function submitQuizAttemptAction(_: QuizActionState, formData: FormData): Promise<QuizActionState> {
  let assignmentId = "";
  try {
    const access = await requirePermission("submissions:manage");
    if (access.role !== "student" || !access.profileId) return fail("Only students can submit a quiz.");
    const parsed = assignmentIdSchema.safeParse({ assignmentId: formData.get("assignmentId") });
    if (!parsed.success) return fail("The quiz reference was invalid.");
    const client = createSupabaseAdminClient();
    const { data: assignment } = await client.from("assignments").select("id, offering_id, kind, status, due_at, time_limit_minutes").eq("id", parsed.data.assignmentId).maybeSingle();
    if (!assignment || assignment.kind !== "quiz") return fail("This quiz could not be found.");
    if (assignment.status !== "published") return fail("This quiz is no longer accepting attempts.");
    const enrollmentId = await ownEnrollmentFor(access.profileId, assignment.offering_id);
    if (!enrollmentId) return fail("You are not enrolled in this class.");
    const { data: submission } = await client.from("assignment_submissions").select("id, started_at, submitted_at").eq("assignment_id", assignment.id).eq("enrollment_id", enrollmentId).maybeSingle();
    if (!submission?.started_at) return fail("Start the quiz before submitting it.");
    if (submission.submitted_at) return fail("This quiz was already submitted.");
    if (!attemptIsWithinTime({ dueAt: assignment.due_at, startedAt: submission.started_at, timeLimitMinutes: assignment.time_limit_minutes })) {
      return fail("Time is up for this attempt, so it could not be submitted. Ask your faculty member if you need another attempt.");
    }

    const questions = await loadAssignmentQuestions(assignment.id);
    const graded = gradeQuizAttempt(
      questions.map((question) => ({ allowMultiple: question.allowMultiple, id: question.id, marks: question.marks, options: question.options.map((option) => ({ id: option.id, isCorrect: Boolean(option.isCorrect) })) })),
      answersFromEntries(formData.entries()),
    );
    const now = new Date().toISOString();
    const { error: answerError } = await client.from("assignment_answers").upsert(graded.perQuestion.map((answer) => ({
      awarded_marks: answer.awardedMarks,
      is_correct: answer.isCorrect,
      question_id: answer.questionId,
      selected_option_ids: answer.selectedOptionIds,
      submission_id: submission.id,
    })), { onConflict: "submission_id,question_id" });
    if (answerError) return fail("Your answers could not be saved. Try submitting again.");
    const { error } = await client.from("assignment_submissions").update({ graded_at: now, graded_by_profile_id: null, score: graded.total, submitted_at: now }).eq("id", submission.id).is("submitted_at", null);
    if (error) return fail("Your submission could not be recorded. Try again.");
    await audit(access.profileId, "quiz.submitted", "assignment_submission", submission.id, { answered: graded.answered, assignment_id: assignment.id, maximum: graded.maximum, score: graded.total });
    refreshAssignment(assignment.id);
    assignmentId = assignment.id;
  } catch {
    return fail("You do not have permission to submit this quiz.");
  }
  redirect(`/assignments/${assignmentId}?submitted=1`);
}
