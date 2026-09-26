import "server-only";

import {
  stableShuffle,
  summariseAssignmentScores,
  summariseQuizQuestions,
  type AssignmentKind,
  type AssignmentStatus,
} from "@/features/academics/domain/assignment-quiz-rules";
import { facultyOfferingIds, studentEnrollmentIds } from "@/server/auth/academic-scope";
import type { Role } from "@/server/auth/permissions";
import { DatabaseQueryError } from "@/server/database/database-query-error";
import { createSupabaseAdminClient } from "@/server/supabase/admin-client";

export const assignmentQuizMigration = "supabase/migrations/20260924120000_add_assignment_quizzes.sql";

/** True when a query failed because the quiz migration has not been applied to the Supabase project yet. */
export function isAssignmentQuizSchemaMissing(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /does not exist|schema cache|PGRST205|42703/i.test(message);
}

export type QuizOption = { id: string; isCorrect: boolean | null; label: string; position: number };
export type QuizQuestion = { allowMultiple: boolean; explanation: string | null; id: string; marks: number; options: QuizOption[]; position: number; prompt: string };

export type AssignmentRecord = {
  createdAt: string;
  dueAt: string | null;
  id: string;
  instructions: string | null;
  kind: AssignmentKind;
  maximumMarks: number;
  offering: { academicYear: number; code: string; label: string; section: string; term: string; title: string };
  offeringId: string;
  publishedAt: string | null;
  showResults: boolean;
  shuffleQuestions: boolean;
  status: AssignmentStatus;
  timeLimitMinutes: number | null;
  title: string;
};

export type AssignmentSubmissionRecord = {
  answeredCount: number;
  enrollmentId: string;
  feedback: string | null;
  gradedAt: string | null;
  id: string;
  score: number | null;
  startedAt: string | null;
  studentName: string;
  studentNumber: string;
  submittedAt: string | null;
};

export type OwnQuizAnswer = { awardedMarks: number; isCorrect: boolean; selectedOptionIds: string[] };

export type OwnSubmission = {
  answers: Record<string, OwnQuizAnswer>;
  feedback: string | null;
  gradedAt: string | null;
  id: string;
  score: number | null;
  startedAt: string | null;
  submittedAt: string | null;
};

const assignmentColumns = `
  id, offering_id, title, kind, status, instructions, maximum_marks, due_at, time_limit_minutes,
  shuffle_questions, show_results, published_at, created_at,
  course_offerings (section, academic_year, term, courses (code, title))
`;

type AssignmentRow = {
  course_offerings: { academic_year: number; courses: { code: string; title: string }; section: string; term: string };
  created_at: string; due_at: string | null; id: string; instructions: string | null; kind: AssignmentKind; maximum_marks: number;
  offering_id: string; published_at: string | null; show_results: boolean; shuffle_questions: boolean; status: AssignmentStatus;
  time_limit_minutes: number | null; title: string;
};

function toAssignmentRecord(row: AssignmentRow): AssignmentRecord {
  const offering = row.course_offerings;
  return {
    createdAt: row.created_at,
    dueAt: row.due_at,
    id: row.id,
    instructions: row.instructions,
    kind: row.kind,
    maximumMarks: Number(row.maximum_marks),
    offering: {
      academicYear: offering.academic_year,
      code: offering.courses.code,
      label: `${offering.courses.code} — ${offering.courses.title} · ${offering.section}`,
      section: offering.section,
      term: offering.term,
      title: offering.courses.title,
    },
    offeringId: row.offering_id,
    publishedAt: row.published_at,
    showResults: row.show_results,
    shuffleQuestions: row.shuffle_questions,
    status: row.status,
    timeLimitMinutes: row.time_limit_minutes,
    title: row.title,
  };
}

export async function loadAssignmentQuestions(assignmentId: string): Promise<QuizQuestion[]> {
  const { data, error } = await createSupabaseAdminClient()
    .from("assignment_questions")
    .select("id, position, prompt, explanation, marks, allow_multiple, assignment_question_options (id, position, label, is_correct)")
    .eq("assignment_id", assignmentId)
    .order("position");
  if (error) throw new DatabaseQueryError("load quiz questions", error.message);
  return data.map((question) => ({
    allowMultiple: question.allow_multiple,
    explanation: question.explanation,
    id: question.id,
    marks: Number(question.marks),
    options: [...question.assignment_question_options].sort((a, b) => a.position - b.position).map((option) => ({ id: option.id, isCorrect: option.is_correct, label: option.label, position: option.position })),
    position: question.position,
    prompt: question.prompt,
  }));
}

/**
 * Everything the assignment detail page needs, scoped to the caller:
 * faculty and admins receive every submission plus cohort analytics; a student
 * receives only their own attempt and never sees answer keys before submitting.
 * Returns null when the assignment is missing or outside the caller's scope.
 */
export async function loadAssignmentDetail(assignmentId: string, role: Role, profileId: string | null) {
  const client = createSupabaseAdminClient();
  const { data: row, error } = await client.from("assignments").select(assignmentColumns).eq("id", assignmentId).maybeSingle();
  if (error) throw new DatabaseQueryError("load assignment", error.message);
  if (!row) return null;
  const assignment = toAssignmentRecord(row);

  let ownEnrollmentId: string | null = null;
  if (role === "faculty") {
    if (!profileId || !(await facultyOfferingIds(profileId)).includes(assignment.offeringId)) return null;
  } else if (role === "student") {
    const enrollmentIds = profileId ? await studentEnrollmentIds(profileId) : [];
    if (!enrollmentIds.length || assignment.status === "draft") return null;
    const { data: enrollment, error: enrollmentError } = await client.from("enrollments").select("id").in("id", enrollmentIds).eq("offering_id", assignment.offeringId).maybeSingle();
    if (enrollmentError) throw new DatabaseQueryError("load student assignment enrollment", enrollmentError.message);
    if (!enrollment) return null;
    ownEnrollmentId = enrollment.id;
  }

  let submissionQuery = client.from("assignment_submissions")
    .select("id, enrollment_id, started_at, submitted_at, score, feedback, graded_at, enrollments (students (student_number, profiles (display_name)))")
    .eq("assignment_id", assignmentId);
  if (ownEnrollmentId) submissionQuery = submissionQuery.eq("enrollment_id", ownEnrollmentId);
  const [questions, submissionResult, enrolledResult] = await Promise.all([
    loadAssignmentQuestions(assignmentId),
    submissionQuery.order("submitted_at", { ascending: false, nullsFirst: false }),
    client.from("enrollments").select("id", { count: "exact", head: true }).eq("offering_id", assignment.offeringId),
  ]);
  if (submissionResult.error) throw new DatabaseQueryError("load assignment submissions", submissionResult.error.message);
  if (enrolledResult.error) throw new DatabaseQueryError("count assignment enrollments", enrolledResult.error.message);

  const submissionIds = submissionResult.data.map(({ id }) => id);
  let answers: Array<{ awarded_marks: number; is_correct: boolean; question_id: string; selected_option_ids: string[]; submission_id: string }> = [];
  if (submissionIds.length && questions.length) {
    const { data, error: answerError } = await client.from("assignment_answers").select("submission_id, question_id, selected_option_ids, is_correct, awarded_marks").in("submission_id", submissionIds);
    if (answerError) throw new DatabaseQueryError("load quiz answers", answerError.message);
    answers = data;
  }

  const submissions: AssignmentSubmissionRecord[] = submissionResult.data.map((submission) => ({
    answeredCount: answers.filter((answer) => answer.submission_id === submission.id && answer.selected_option_ids.length).length,
    enrollmentId: submission.enrollment_id,
    feedback: submission.feedback,
    gradedAt: submission.graded_at,
    id: submission.id,
    score: submission.score === null ? null : Number(submission.score),
    startedAt: submission.started_at,
    studentName: submission.enrollments.students.profiles?.display_name ?? "Student",
    studentNumber: submission.enrollments.students.student_number,
    submittedAt: submission.submitted_at,
  }));

  const scoreSummary = summariseAssignmentScores({ enrolledCount: enrolledResult.count ?? 0, maximumMarks: assignment.maximumMarks, submissions });
  const questionSummary = assignment.kind === "quiz" && role !== "student"
    ? summariseQuizQuestions(
        questions.map((question) => ({ ...question, options: question.options.map((option) => ({ ...option, isCorrect: Boolean(option.isCorrect) })) })),
        answers.map((answer) => ({ isCorrect: answer.is_correct, questionId: answer.question_id, selectedOptionIds: answer.selected_option_ids })),
      )
    : null;

  if (role !== "student") return { assignment, enrolledCount: enrolledResult.count ?? 0, ownEnrollmentId: null, ownSubmission: null, questionSummary, questions, revealAnswers: true, scoreSummary, submissions };

  const own = submissions[0] ?? null;
  const ownSubmission: OwnSubmission | null = own ? {
    answers: Object.fromEntries(answers.filter((answer) => answer.submission_id === own.id).map((answer) => [answer.question_id, { awardedMarks: Number(answer.awarded_marks), isCorrect: answer.is_correct, selectedOptionIds: answer.selected_option_ids }])),
    feedback: own.feedback,
    gradedAt: own.gradedAt,
    id: own.id,
    score: own.score,
    startedAt: own.startedAt,
    submittedAt: own.submittedAt,
  } : null;
  const revealAnswers = Boolean(ownSubmission?.submittedAt) && assignment.showResults;
  const ordered = assignment.shuffleQuestions && ownEnrollmentId ? stableShuffle(questions, ownEnrollmentId) : questions;
  const studentQuestions = ordered.map((question) => revealAnswers ? question : { ...question, explanation: null, options: question.options.map((option) => ({ ...option, isCorrect: null })) });

  return { assignment, enrolledCount: enrolledResult.count ?? 0, ownEnrollmentId, ownSubmission, questionSummary: null, questions: studentQuestions, revealAnswers, scoreSummary, submissions: [] as AssignmentSubmissionRecord[] };
}

export type AssignmentDetail = NonNullable<Awaited<ReturnType<typeof loadAssignmentDetail>>>;

/** Compact per-assignment analytics rows for the campus analytics dashboard. */
export async function loadAssignmentAnalyticsOverview(role: Role, profileId: string | null) {
  if (role === "student") return [];
  const client = createSupabaseAdminClient();
  const offeringIds = role === "faculty" ? (profileId ? await facultyOfferingIds(profileId) : []) : null;
  if (offeringIds && !offeringIds.length) return [];

  let assignmentQuery = client.from("assignments").select(assignmentColumns);
  if (offeringIds) assignmentQuery = assignmentQuery.in("offering_id", offeringIds);
  const assignmentResult = await assignmentQuery.order("created_at", { ascending: false }).limit(100);
  if (assignmentResult.error) throw new DatabaseQueryError("load assignment analytics", assignmentResult.error.message);
  const assignments = assignmentResult.data.map(toAssignmentRecord);
  if (!assignments.length) return [];

  const assignmentOfferingIds = [...new Set(assignments.map((assignment) => assignment.offeringId))];
  const [submissionResult, enrollmentResult] = await Promise.all([
    client.from("assignment_submissions").select("assignment_id, started_at, submitted_at, score, graded_at").in("assignment_id", assignments.map((assignment) => assignment.id)),
    client.from("enrollments").select("offering_id").in("offering_id", assignmentOfferingIds),
  ]);
  if (submissionResult.error) throw new DatabaseQueryError("load assignment analytics submissions", submissionResult.error.message);
  if (enrollmentResult.error) throw new DatabaseQueryError("load assignment analytics enrollments", enrollmentResult.error.message);

  const enrolledByOffering = new Map<string, number>();
  enrollmentResult.data.forEach(({ offering_id }) => enrolledByOffering.set(offering_id, (enrolledByOffering.get(offering_id) ?? 0) + 1));

  return assignments.map((assignment) => ({
    assignment,
    summary: summariseAssignmentScores({
      enrolledCount: enrolledByOffering.get(assignment.offeringId) ?? 0,
      maximumMarks: assignment.maximumMarks,
      submissions: submissionResult.data
        .filter((submission) => submission.assignment_id === assignment.id)
        .map((submission) => ({ gradedAt: submission.graded_at, score: submission.score === null ? null : Number(submission.score), startedAt: submission.started_at, submittedAt: submission.submitted_at })),
    }),
  }));
}

export type AssignmentAnalyticsRow = Awaited<ReturnType<typeof loadAssignmentAnalyticsOverview>>[number];
