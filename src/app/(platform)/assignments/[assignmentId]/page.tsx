import { ArrowLeft, BarChart3, CheckCircle2, CircleCheckBig, CircleX, ClipboardList, Clock3, ListChecks, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { EmptyOperationsState, OperationsHeader, OperationsMetrics, ProgressBar, StatusPill, WorkspaceBanner } from "@/components/operations/operations-ui";
import { Card } from "@/design-system/primitives/card";
import { submitAssignmentAction } from "@/features/academics/application/academic-workflow-actions";
import { deleteAssignmentAction, setAssignmentStatusAction, startQuizAttemptAction } from "@/features/academics/application/assignment-quiz-actions";
import { assignmentAcceptsAttempts, attemptDeadline, attemptIsWithinTime, formatDuration, type AssignmentStatus } from "@/features/academics/domain/assignment-quiz-rules";
import { loadAssignmentDetail, type AssignmentDetail } from "@/features/academics/infrastructure/assignment-quizzes.repository";
import { GradeSubmissionForm } from "@/features/academics/presentation/academic-workflow-forms";
import { QuizAttempt } from "@/features/academics/presentation/quiz-attempt";
import { campusPolicies } from "@/features/operations/domain/operations-rules";
import { cn } from "@/lib/utils";
import { resolveWorkspaceAccess } from "@/server/workspace/workspace-access";

export const dynamic = "force-dynamic";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const formatDateTime = (value: string) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const percentOf = (score: number, maximum: number) => (maximum > 0 ? Math.round((score / maximum) * 100) : 0);
const statusTone: Record<AssignmentStatus, "good" | "neutral" | "warning"> = { closed: "neutral", draft: "warning", published: "good" };
const secondaryButton = "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50";
const primaryButton = "inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700";

function Notice({ children, tone }: { children: ReactNode; tone: "good" | "info" | "warning" }) {
  const styles = { good: "border-emerald-200 bg-emerald-50 text-emerald-800", info: "border-blue-200 bg-blue-50 text-blue-800", warning: "border-amber-200 bg-amber-50 text-amber-800" };
  return <div className={`mt-6 rounded-2xl border p-4 text-sm leading-6 ${styles[tone]}`} role="status">{children}</div>;
}

function StatusControls({ detail }: { detail: AssignmentDetail }) {
  const { assignment, scoreSummary } = detail;
  const transitions: Array<{ label: string; to: AssignmentStatus }> = assignment.status === "draft"
    ? [{ label: "Publish to students", to: "published" }]
    : assignment.status === "published"
      ? [{ label: "Close attempts", to: "closed" }, { label: "Move back to draft", to: "draft" }]
      : [{ label: "Reopen", to: "published" }];
  return <div className="flex flex-wrap items-center gap-2">
    {transitions.map((transition) => <form action={setAssignmentStatusAction} key={transition.to}><input name="assignmentId" type="hidden" value={assignment.id} /><input name="status" type="hidden" value={transition.to} /><button className={transition.to === "published" ? primaryButton : secondaryButton} type="submit">{transition.label}</button></form>)}
    {!scoreSummary.submitted ? <form action={deleteAssignmentAction}><input name="assignmentId" type="hidden" value={assignment.id} /><button className="rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50" type="submit">Delete</button></form> : null}
  </div>;
}

function FacultyView({ detail }: { detail: AssignmentDetail }) {
  const { assignment, enrolledCount, questionSummary, questions, scoreSummary, submissions } = detail;
  const isQuiz = assignment.kind === "quiz";
  return <>
    <OperationsMetrics metrics={[
      { detail: `${scoreSummary.submitted} of ${enrolledCount} enrolled students`, icon: Users, label: "Completion", value: `${scoreSummary.completionRate}%` },
      { detail: scoreSummary.graded ? `median ${scoreSummary.medianPercent}% · range ${scoreSummary.lowestPercent}–${scoreSummary.highestPercent}%` : "no graded work yet", icon: BarChart3, label: "Average score", value: scoreSummary.graded ? `${scoreSummary.averagePercent}%` : "—" },
      { detail: `${scoreSummary.passed} scored ${campusPolicies.assessmentPassPercent}% or more`, icon: Trophy, label: "Pass rate", value: scoreSummary.graded ? `${scoreSummary.passRate}%` : "—" },
      { detail: isQuiz ? (scoreSummary.averageDurationSeconds !== null ? `average time ${formatDuration(scoreSummary.averageDurationSeconds)}` : "no attempts finished yet") : `${scoreSummary.ungraded} submitted, not yet graded`, icon: isQuiz ? Clock3 : ClipboardList, label: isQuiz ? "Attempt time" : "Awaiting grade", value: isQuiz ? (scoreSummary.averageDurationSeconds !== null ? formatDuration(scoreSummary.averageDurationSeconds) : "—") : scoreSummary.ungraded },
    ]} />

    <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_340px] xl:items-start">
      <div className="space-y-6">
        {isQuiz && questionSummary ? <Card className="overflow-hidden">
          <div className="border-b border-slate-100 p-5 sm:p-6"><h2 className="font-semibold text-slate-950">Question performance</h2><p className="mt-1 text-sm text-slate-500">{questionSummary.hardest?.attempts ? <>Hardest: Q{questionSummary.hardest.position} ({questionSummary.hardest.correctRate}% correct). Easiest: Q{questionSummary.easiest?.position} ({questionSummary.easiest?.correctRate}% correct).</> : "Per-question results appear after the first submission."}</p></div>
          <div className="divide-y divide-slate-100">
            {questionSummary.questions.map((question) => <div className="p-5 sm:p-6" key={question.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><p className="text-sm font-semibold text-slate-950">Q{question.position}. {question.prompt}</p><span className="shrink-0 text-sm font-semibold text-slate-700">{question.attempts ? `${question.correctRate}% correct` : "no attempts"}</span></div>
              <div className="mt-3"><ProgressBar label={`${question.correctCount} of ${question.attempts} correct · ${question.skipped} skipped · ${question.marks} marks`} tone={question.correctRate >= 70 ? "emerald" : question.correctRate >= 40 ? "amber" : "rose"} value={question.correctRate} /></div>
              <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">{question.options.map((option) => <li className={cn("flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-xs", option.isCorrect ? "bg-emerald-50 text-emerald-800" : "bg-slate-50 text-slate-600")} key={option.id}><span className="inline-flex items-center gap-1.5">{option.isCorrect ? <CircleCheckBig className="size-3.5" /> : <span className="size-3.5 rounded-full border border-slate-300" />}{option.label}</span><span className="font-mono">{option.share}%</span></li>)}</ul>
            </div>)}
          </div>
        </Card> : null}

        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 p-5 sm:p-6"><h2 className="font-semibold text-slate-950">{isQuiz ? "Attempts" : "Submissions"}</h2><p className="mt-1 text-sm text-slate-500">{isQuiz ? "Every attempt is graded automatically from the answer key." : "Grade submitted work and return feedback."}</p></div>
          {submissions.length ? <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-6 py-3">Student</th><th className="px-4 py-3">State</th><th className="px-4 py-3">Score</th><th className="px-4 py-3">{isQuiz ? "Time taken" : "Submitted"}</th><th className="px-4 py-3">{isQuiz ? "Answered" : "Grading"}</th></tr></thead><tbody className="divide-y divide-slate-100">
            {submissions.map((submission) => {
              const seconds = submission.startedAt && submission.submittedAt ? (new Date(submission.submittedAt).getTime() - new Date(submission.startedAt).getTime()) / 1000 : null;
              return <tr key={submission.id}>
                <td className="px-6 py-4"><p className="text-sm font-semibold text-slate-900">{submission.studentName}</p><p className="font-mono text-xs text-slate-500">{submission.studentNumber}</p></td>
                <td className="px-4 py-4"><StatusPill tone={submission.submittedAt ? "good" : submission.startedAt ? "warning" : "neutral"}>{submission.submittedAt ? "submitted" : submission.startedAt ? "in progress" : "not started"}</StatusPill></td>
                <td className="px-4 py-4 text-sm font-semibold text-slate-800">{submission.score !== null ? `${submission.score}/${assignment.maximumMarks} · ${percentOf(submission.score, assignment.maximumMarks)}%` : "—"}</td>
                <td className="px-4 py-4 text-sm text-slate-600">{isQuiz ? (seconds !== null ? formatDuration(seconds) : "—") : submission.submittedAt ? formatDateTime(submission.submittedAt) : "—"}</td>
                <td className="px-4 py-4 text-sm text-slate-600">{isQuiz ? `${submission.answeredCount}/${questions.length}` : submission.submittedAt && !submission.gradedAt ? <GradeSubmissionForm maximumMarks={assignment.maximumMarks} submissionId={submission.id} /> : submission.gradedAt ? "graded" : "—"}</td>
              </tr>;
            })}
          </tbody></table></div> : <EmptyOperationsState description={assignment.status === "draft" ? "Publish the assignment so enrolled students can start." : "Students have not started this work yet."} icon={ListChecks} title="No attempts yet" />}
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="p-5">
          <p className="text-sm font-semibold text-slate-950">Score distribution</p>
          <div className="mt-4 space-y-3">{scoreSummary.distribution.map((band) => <div key={band.label}><div className="mb-1 flex items-center justify-between text-xs text-slate-600"><span>{band.label}</span><span className="font-mono">{band.count}</span></div><ProgressBar tone={band.tone} value={scoreSummary.graded ? Math.round((band.count / scoreSummary.graded) * 100) : 0} /></div>)}</div>
          <p className="mt-4 text-xs text-slate-500">{scoreSummary.pending} enrolled students have not submitted.</p>
        </Card>
        {isQuiz ? <Card className="overflow-hidden">
          <details><summary className="cursor-pointer p-5 text-sm font-semibold text-slate-950">Answer key · {questions.length} questions · {assignment.maximumMarks} marks</summary>
            <ol className="divide-y divide-slate-100 border-t border-slate-100">{questions.map((question) => <li className="p-5 text-sm" key={question.id}><p className="font-medium text-slate-900">Q{question.position}. {question.prompt} <span className="text-xs text-slate-400">({question.marks})</span></p><ul className="mt-2 space-y-1 text-xs">{question.options.map((option) => <li className={option.isCorrect ? "font-semibold text-emerald-700" : "text-slate-500"} key={option.id}>{option.isCorrect ? "✓" : "○"} {option.label}</li>)}</ul>{question.explanation ? <p className="mt-2 text-xs text-slate-500">{question.explanation}</p> : null}</li>)}</ol>
          </details>
        </Card> : null}
      </div>
    </div>
  </>;
}

function StudentQuizView({ detail }: { detail: AssignmentDetail }) {
  const { assignment, ownEnrollmentId, ownSubmission, questions, revealAnswers } = detail;
  const accepting = assignmentAcceptsAttempts({ dueAt: assignment.dueAt, status: assignment.status });
  const totalMarks = assignment.maximumMarks;

  if (ownSubmission?.submittedAt) {
    const score = ownSubmission.score ?? 0;
    const percent = percentOf(score, totalMarks);
    const correct = Object.values(ownSubmission.answers).filter((answer) => answer.isCorrect).length;
    return <>
      <Card className="mt-6 p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-sm font-semibold text-emerald-700">Submitted {formatDateTime(ownSubmission.submittedAt)}</p><h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{assignment.showResults ? `You scored ${score} out of ${totalMarks}.` : "Your answers are in."}</h2><p className="mt-2 text-sm text-slate-600">{assignment.showResults ? `${correct} of ${questions.length} questions correct.` : "Your faculty member will release the score."}</p></div>
          {assignment.showResults ? <div className="text-center"><p className="text-4xl font-semibold tracking-tight text-slate-950">{percent}%</p><StatusPill tone={percent >= campusPolicies.assessmentPassPercent ? "good" : "critical"}>{percent >= campusPolicies.assessmentPassPercent ? "passed" : "below pass mark"}</StatusPill></div> : null}
        </div>
        {ownSubmission.feedback ? <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-700"><strong>Feedback:</strong> {ownSubmission.feedback}</p> : null}
      </Card>
      {revealAnswers ? <div className="mt-6 space-y-4">{questions.map((question, index) => {
        const answer = ownSubmission.answers[question.id];
        const selected = new Set(answer?.selectedOptionIds ?? []);
        return <Card className="p-5 sm:p-6" key={question.id}>
          <div className="flex items-start justify-between gap-4"><p className="text-sm font-semibold text-slate-950">Q{index + 1}. {question.prompt}</p><span className={cn("inline-flex shrink-0 items-center gap-1 text-xs font-semibold", answer?.isCorrect ? "text-emerald-700" : "text-rose-600")}>{answer?.isCorrect ? <CircleCheckBig className="size-4" /> : <CircleX className="size-4" />}{answer?.awardedMarks ?? 0}/{question.marks}</span></div>
          <ul className="mt-3 space-y-1.5">{question.options.map((option) => <li className={cn("flex items-center justify-between rounded-lg px-3 py-2 text-sm", option.isCorrect ? "bg-emerald-50 text-emerald-800" : selected.has(option.id) ? "bg-rose-50 text-rose-700" : "text-slate-600")} key={option.id}><span>{option.label}</span><span className="text-xs">{option.isCorrect ? "correct" : selected.has(option.id) ? "your answer" : ""}</span></li>)}</ul>
          {question.explanation ? <p className="mt-3 text-xs leading-5 text-slate-500">{question.explanation}</p> : null}
        </Card>;
      })}</div> : null}
    </>;
  }

  if (ownSubmission?.startedAt) {
    const deadline = attemptDeadline({ dueAt: assignment.dueAt, startedAt: ownSubmission.startedAt, timeLimitMinutes: assignment.timeLimitMinutes });
    if (assignment.status !== "published" || !attemptIsWithinTime({ dueAt: assignment.dueAt, startedAt: ownSubmission.startedAt, timeLimitMinutes: assignment.timeLimitMinutes })) {
      return <Notice tone="warning">{assignment.status !== "published" ? "This quiz has been closed by your faculty member." : "The time for this attempt has run out and it can no longer be submitted."} Contact your faculty member if you need another attempt.</Notice>;
    }
    return <div className="mt-6"><QuizAttempt assignmentId={assignment.id} deadline={deadline ? deadline.toISOString() : null} questions={questions} /></div>;
  }

  return <Card className="mt-6 p-6 sm:p-8">
    <h2 className="text-xl font-semibold tracking-tight text-slate-950">Before you start</h2>
    {assignment.instructions ? <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">{assignment.instructions}</p> : null}
    <dl className="mt-5 grid gap-4 sm:grid-cols-3 text-sm">
      <div><dt className="text-xs text-slate-400">Questions</dt><dd className="mt-0.5 font-semibold text-slate-800">{questions.length} · {totalMarks} marks</dd></div>
      <div><dt className="text-xs text-slate-400">Time limit</dt><dd className="mt-0.5 font-semibold text-slate-800">{assignment.timeLimitMinutes ? `${assignment.timeLimitMinutes} minutes from when you start` : "None"}</dd></div>
      <div><dt className="text-xs text-slate-400">Due</dt><dd className="mt-0.5 font-semibold text-slate-800">{assignment.dueAt ? formatDateTime(assignment.dueAt) : "No deadline"}</dd></div>
    </dl>
    <div className="mt-6 flex flex-wrap items-center gap-4">
      {accepting && ownEnrollmentId ? <form action={startQuizAttemptAction}><input name="assignmentId" type="hidden" value={assignment.id} /><button className={primaryButton} type="submit">Start quiz</button></form> : <StatusPill tone="neutral">{assignment.status === "closed" ? "closed" : "past due"}</StatusPill>}
      <p className="text-xs text-slate-500">You get one attempt. {assignment.timeLimitMinutes ? "The timer starts as soon as you press Start." : ""}</p>
    </div>
  </Card>;
}

function StudentCourseworkView({ detail }: { detail: AssignmentDetail }) {
  const { assignment, ownEnrollmentId, ownSubmission } = detail;
  const accepting = assignmentAcceptsAttempts({ dueAt: assignment.dueAt, status: assignment.status });
  return <Card className="mt-6 p-6 sm:p-8">
    {assignment.instructions ? <p className="whitespace-pre-line text-sm leading-6 text-slate-600">{assignment.instructions}</p> : null}
    <div className="mt-5 flex flex-wrap items-center gap-4">
      {ownSubmission?.submittedAt ? <StatusPill tone={ownSubmission.gradedAt ? "good" : "warning"}>{ownSubmission.gradedAt ? `${ownSubmission.score}/${assignment.maximumMarks}` : "Submitted, awaiting grade"}</StatusPill> : accepting && ownEnrollmentId ? <form action={submitAssignmentAction}><input name="assignmentId" type="hidden" value={assignment.id} /><input name="enrollmentId" type="hidden" value={ownEnrollmentId} /><button className={primaryButton} type="submit">Mark as submitted</button></form> : <StatusPill tone="neutral">closed</StatusPill>}
      {ownSubmission?.feedback ? <p className="text-sm text-slate-600"><strong>Feedback:</strong> {ownSubmission.feedback}</p> : null}
    </div>
  </Card>;
}

export default async function AssignmentDetailPage({ params, searchParams }: { params: Promise<{ assignmentId: string }>; searchParams: Promise<{ created?: string; submitted?: string }> }) {
  const [{ assignmentId }, query] = await Promise.all([params, searchParams]);
  if (!uuidPattern.test(assignmentId)) notFound();
  const access = await resolveWorkspaceAccess("assignments:read", "assignments:manage");
  if (access.mode !== "live") return <section><OperationsHeader description="Assignment details, attempts, and analytics." eyebrow="Academic delivery" title="Assignment" /><WorkspaceBanner mode={access.mode} /></section>;

  let detail: AssignmentDetail | null = null;
  let failed = false;
  try { detail = await loadAssignmentDetail(assignmentId, access.role, access.profileId); } catch { failed = true; }
  if (failed) return <section><OperationsHeader description="Assignment details, attempts, and analytics." eyebrow="Academic delivery" title="Assignment" /><WorkspaceBanner mode="error" /></section>;
  if (!detail) notFound();

  const { assignment } = detail;
  const isStudent = access.role === "student";
  const isQuiz = assignment.kind === "quiz";
  return <section>
    <OperationsHeader
      actions={<div className="flex flex-wrap items-center gap-2"><Link className={secondaryButton} href="/assignments"><ArrowLeft className="size-4" /> All assignments</Link>{access.canManage ? <StatusControls detail={detail} /> : null}</div>}
      description={`${assignment.offering.label} · ${assignment.maximumMarks} marks${assignment.dueAt ? ` · due ${formatDateTime(assignment.dueAt)}` : ""}${isQuiz && assignment.timeLimitMinutes ? ` · ${assignment.timeLimitMinutes} min` : ""}`}
      eyebrow={isQuiz ? "Multiple choice quiz" : "Coursework"}
      title={assignment.title}
    />
    <div className="mt-4 flex flex-wrap items-center gap-2"><StatusPill tone={statusTone[assignment.status]}>{assignment.status}</StatusPill><StatusPill tone="neutral">{isQuiz ? `${detail.questions.length} questions` : "graded by faculty"}</StatusPill>{isQuiz ? <StatusPill tone="neutral">{assignment.showResults ? "results shown on submit" : "results held"}</StatusPill> : null}</div>
    {query.created ? <Notice tone="good"><CheckCircle2 className="mr-1.5 inline size-4" />Quiz saved{assignment.status === "published" ? " and published to enrolled students." : " as a draft. Publish it when you are ready."}</Notice> : null}
    {query.submitted && isStudent ? <Notice tone="good"><CheckCircle2 className="mr-1.5 inline size-4" />Your quiz was submitted and graded.</Notice> : null}
    {isStudent ? (isQuiz ? <StudentQuizView detail={detail} /> : <StudentCourseworkView detail={detail} />) : <FacultyView detail={detail} />}
  </section>;
}
