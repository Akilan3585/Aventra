import { z } from "zod";

import { campusPolicies } from "../../operations/domain/operations-rules";

export const assignmentKinds = ["coursework", "quiz"] as const;
export type AssignmentKind = (typeof assignmentKinds)[number];

export const assignmentStatuses = ["draft", "published", "closed"] as const;
export type AssignmentStatus = (typeof assignmentStatuses)[number];

export const quizLimits = {
  maxExplanation: 2000,
  maxMarksPerQuestion: 100,
  maxOptionLabel: 500,
  maxOptions: 8,
  maxPrompt: 2000,
  maxQuestions: 100,
  maxTimeLimitMinutes: 600,
  minOptions: 2,
  minPrompt: 3,
  submissionGraceSeconds: 30,
} as const;

export type QuizOptionDraft = { isCorrect: boolean; label: string };
export type QuizQuestionDraft = { allowMultiple: boolean; explanation?: string; marks: number; options: QuizOptionDraft[]; prompt: string };

/** Returns human readable problems with a quiz draft; an empty array means it can be saved. */
export function validateQuizQuestions(questions: QuizQuestionDraft[]) {
  const errors: string[] = [];
  if (!questions.length) errors.push("Add at least one question.");
  if (questions.length > quizLimits.maxQuestions) errors.push(`A quiz can have at most ${quizLimits.maxQuestions} questions.`);
  questions.forEach((question, index) => {
    const label = `Question ${index + 1}`;
    const prompt = question.prompt.trim();
    if (prompt.length < quizLimits.minPrompt || prompt.length > quizLimits.maxPrompt) errors.push(`${label} needs a prompt between ${quizLimits.minPrompt} and ${quizLimits.maxPrompt} characters.`);
    if ((question.explanation ?? "").length > quizLimits.maxExplanation) errors.push(`${label} explanation is too long.`);
    if (!Number.isFinite(question.marks) || question.marks <= 0 || question.marks > quizLimits.maxMarksPerQuestion) errors.push(`${label} needs marks between 0.01 and ${quizLimits.maxMarksPerQuestion}.`);
    const options = question.options.map((option) => ({ ...option, label: option.label.trim() }));
    if (options.length < quizLimits.minOptions || options.length > quizLimits.maxOptions) errors.push(`${label} needs between ${quizLimits.minOptions} and ${quizLimits.maxOptions} options.`);
    if (options.some((option) => !option.label.length || option.label.length > quizLimits.maxOptionLabel)) errors.push(`${label} has an empty option.`);
    const correct = options.filter((option) => option.isCorrect).length;
    if (!correct) errors.push(`${label} needs a correct answer.`);
    if (!question.allowMultiple && correct > 1) errors.push(`${label} allows one answer but has ${correct} marked correct. Switch it to multiple answers or keep one.`);
    if (question.allowMultiple && correct === options.length && options.length) errors.push(`${label} marks every option correct.`);
    const labels = new Set(options.map((option) => option.label.toLowerCase()));
    if (labels.size !== options.length) errors.push(`${label} has duplicate options.`);
  });
  return errors;
}

export function quizTotalMarks(questions: ReadonlyArray<{ marks: number }>) {
  return Math.round(questions.reduce((sum, question) => sum + question.marks, 0) * 100) / 100;
}

export type ScorableQuestion = { allowMultiple: boolean; id: string; marks: number; options: ReadonlyArray<{ id: string; isCorrect: boolean }> };

/** All-or-nothing grading: the selected set must exactly match the correct set. */
export function scoreQuizAnswer(question: ScorableQuestion, selectedOptionIds: readonly string[]) {
  const valid = new Set(question.options.map((option) => option.id));
  const selected = [...new Set(selectedOptionIds.filter((id) => valid.has(id)))];
  const correct = question.options.filter((option) => option.isCorrect).map((option) => option.id);
  const limited = question.allowMultiple ? selected : selected.slice(0, 1);
  const isCorrect = limited.length === correct.length && correct.every((id) => limited.includes(id));
  return { awardedMarks: isCorrect ? question.marks : 0, isCorrect, selectedOptionIds: limited };
}

export function gradeQuizAttempt(questions: readonly ScorableQuestion[], answers: Readonly<Record<string, readonly string[]>>) {
  const perQuestion = questions.map((question) => ({ questionId: question.id, ...scoreQuizAnswer(question, answers[question.id] ?? []) }));
  const total = Math.round(perQuestion.reduce((sum, answer) => sum + answer.awardedMarks, 0) * 100) / 100;
  return { answered: perQuestion.filter((answer) => answer.selectedOptionIds.length).length, maximum: quizTotalMarks(questions), perQuestion, total };
}

const statusTransitions: Readonly<Record<AssignmentStatus, readonly AssignmentStatus[]>> = {
  closed: ["published"],
  draft: ["published"],
  published: ["closed", "draft"],
};

export function canTransitionAssignmentStatus(from: AssignmentStatus, to: AssignmentStatus) {
  return statusTransitions[from].includes(to);
}

/** Students may open and submit only while the assignment is published and not past due. */
export function assignmentAcceptsAttempts(assignment: { dueAt: string | null; status: AssignmentStatus }, now = new Date()) {
  return assignment.status === "published" && (!assignment.dueAt || new Date(assignment.dueAt) >= now);
}

/** The instant an in-progress attempt must be submitted by: the earlier of the time limit and the due date. */
export function attemptDeadline(attempt: { dueAt: string | null; startedAt: string | null; timeLimitMinutes: number | null }) {
  const candidates: number[] = [];
  if (attempt.dueAt) candidates.push(new Date(attempt.dueAt).getTime());
  if (attempt.startedAt && attempt.timeLimitMinutes) candidates.push(new Date(attempt.startedAt).getTime() + attempt.timeLimitMinutes * 60_000);
  return candidates.length ? new Date(Math.min(...candidates)) : null;
}

export function attemptIsWithinTime(attempt: { dueAt: string | null; startedAt: string | null; timeLimitMinutes: number | null }, now = new Date(), graceSeconds: number = quizLimits.submissionGraceSeconds) {
  const deadline = attemptDeadline(attempt);
  return !deadline || now.getTime() <= deadline.getTime() + graceSeconds * 1000;
}

function hash(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

/** Deterministic per-seed ordering so a shuffled quiz keeps the same order when the page reloads. */
export function stableShuffle<T extends { id: string }>(items: readonly T[], seed: string) {
  return [...items].sort((a, b) => hash(`${seed}:${a.id}`) - hash(`${seed}:${b.id}`) || a.id.localeCompare(b.id));
}

export type SubmissionScoreInput = { gradedAt: string | null; score: number | null; startedAt: string | null; submittedAt: string | null };

export const scoreBands = [
  { label: "0–39%", max: 39, min: 0, tone: "rose" },
  { label: "40–59%", max: 59, min: 40, tone: "amber" },
  { label: "60–79%", max: 79, min: 60, tone: "blue" },
  { label: "80–100%", max: 100, min: 80, tone: "emerald" },
] as const;

const percent = (value: number, maximum: number) => (maximum > 0 ? Math.round((value / maximum) * 100) : 0);
const median = (values: number[]) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
};

/** Cohort level analytics for one assignment, computed from its submissions. */
export function summariseAssignmentScores(input: { enrolledCount: number; maximumMarks: number; submissions: readonly SubmissionScoreInput[] }, passPercent: number = campusPolicies.assessmentPassPercent) {
  const submitted = input.submissions.filter((submission) => submission.submittedAt);
  const graded = submitted.filter((submission) => submission.gradedAt && submission.score !== null);
  const percents = graded.map((submission) => percent(Number(submission.score), input.maximumMarks));
  const durations = submitted.flatMap((submission) => submission.startedAt && submission.submittedAt ? [Math.max(0, (new Date(submission.submittedAt).getTime() - new Date(submission.startedAt).getTime()) / 1000)] : []);
  const enrolled = Math.max(input.enrolledCount, submitted.length);
  return {
    averageDurationSeconds: durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : null,
    averagePercent: percents.length ? Math.round(percents.reduce((sum, value) => sum + value, 0) / percents.length) : 0,
    completionRate: enrolled ? Math.round((submitted.length / enrolled) * 100) : 0,
    distribution: scoreBands.map((band) => ({ ...band, count: percents.filter((value) => value >= band.min && value <= band.max).length })),
    enrolled,
    graded: graded.length,
    highestPercent: percents.length ? Math.max(...percents) : 0,
    lowestPercent: percents.length ? Math.min(...percents) : 0,
    medianPercent: median(percents),
    passRate: percents.length ? Math.round((percents.filter((value) => value >= passPercent).length / percents.length) * 100) : 0,
    passed: percents.filter((value) => value >= passPercent).length,
    pending: enrolled - submitted.length,
    submitted: submitted.length,
    ungraded: submitted.length - graded.length,
  };
}

export type QuestionAnalyticsInput = { allowMultiple: boolean; id: string; marks: number; options: ReadonlyArray<{ id: string; isCorrect: boolean; label: string }>; position: number; prompt: string };
export type AnswerAnalyticsInput = { isCorrect: boolean; questionId: string; selectedOptionIds: readonly string[] };

/** Per-question and per-option breakdown used by the quiz analytics dashboard. */
export function summariseQuizQuestions(questions: readonly QuestionAnalyticsInput[], answers: readonly AnswerAnalyticsInput[]) {
  const byQuestion = questions.map((question) => {
    const related = answers.filter((answer) => answer.questionId === question.id);
    const attempted = related.filter((answer) => answer.selectedOptionIds.length);
    const correctCount = related.filter((answer) => answer.isCorrect).length;
    return {
      allowMultiple: question.allowMultiple,
      attempts: related.length,
      correctCount,
      correctRate: related.length ? Math.round((correctCount / related.length) * 100) : 0,
      id: question.id,
      marks: question.marks,
      options: question.options.map((option) => {
        const count = attempted.filter((answer) => answer.selectedOptionIds.includes(option.id)).length;
        return { count, id: option.id, isCorrect: option.isCorrect, label: option.label, share: attempted.length ? Math.round((count / attempted.length) * 100) : 0 };
      }),
      position: question.position,
      prompt: question.prompt,
      skipped: related.length - attempted.length,
    };
  }).sort((a, b) => a.position - b.position);
  const ranked = byQuestion.filter((question) => question.attempts).sort((a, b) => a.correctRate - b.correctRate);
  return { easiest: ranked.length ? ranked[ranked.length - 1] : null, hardest: ranked[0] ?? null, questions: byQuestion };
}

export const quizAnswerFieldPrefix = "answer-";

/** Groups submitted form entries named `answer-<questionId>` into a question id to option id map. */
export function answersFromEntries(entries: Iterable<[string, FormDataEntryValue | string]>) {
  const answers: Record<string, string[]> = {};
  for (const [name, value] of entries) {
    if (!name.startsWith(quizAnswerFieldPrefix) || typeof value !== "string" || !value) continue;
    const questionId = name.slice(quizAnswerFieldPrefix.length);
    if (!questionId) continue;
    answers[questionId] = [...(answers[questionId] ?? []), value];
  }
  return answers;
}

export function formatDuration(seconds: number) {
  const whole = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  if (minutes >= 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  return minutes ? `${minutes}m ${rest}s` : `${rest}s`;
}

const quizOptionPayloadSchema = z.object({
  isCorrect: z.boolean().default(false),
  label: z.string().max(quizLimits.maxOptionLabel + 50),
});

export const quizQuestionPayloadSchema = z.object({
  allowMultiple: z.boolean().default(false),
  explanation: z.string().max(quizLimits.maxExplanation + 50).optional(),
  marks: z.coerce.number(),
  options: z.array(quizOptionPayloadSchema).max(quizLimits.maxOptions + 5),
  prompt: z.string().max(quizLimits.maxPrompt + 50),
});

/**
 * Reads the JSON the quiz builder posts in its hidden `questions` field.
 * Structural problems return null; content problems are left to
 * `validateQuizQuestions` so the faculty member sees a precise message.
 */
export function parseQuizQuestionsPayload(raw: unknown): QuizQuestionDraft[] | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const parsed = z.array(quizQuestionPayloadSchema).max(quizLimits.maxQuestions + 5).safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
