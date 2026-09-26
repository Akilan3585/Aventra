import { BookCheck, CalendarClock, CircleCheck, ClipboardList, FileQuestion, Plus } from "lucide-react";
import Link from "next/link";

import { submitAssignmentAction } from "@/features/academics/application/academic-workflow-actions";
import type { AssignmentStatus } from "@/features/academics/domain/assignment-quiz-rules";
import { loadAssignmentsWorkspace } from "@/features/academics/infrastructure/academic-workflows.repository";
import { AssignmentCreator } from "@/features/academics/presentation/academic-workflow-forms";
import { EmptyOperationsState, OperationsHeader, OperationsMetrics, StatusPill, WorkspaceBanner } from "@/components/operations/operations-ui";
import { Card } from "@/design-system/primitives/card";
import { resolveWorkspaceAccess } from "@/server/workspace/workspace-access";

export const dynamic = "force-dynamic";

const formatDateTime = (value: string) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const statusTone: Record<AssignmentStatus, "good" | "neutral" | "warning"> = { closed: "neutral", draft: "warning", published: "good" };
const isPastDue = (dueAt: string | null) => Boolean(dueAt && new Date(dueAt).getTime() < Date.now());

export default async function AssignmentsPage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const [access, query] = await Promise.all([resolveWorkspaceAccess("assignments:read", "assignments:manage"), searchParams]);
  let workspace = null;
  if (access.mode === "live") try { workspace = await loadAssignmentsWorkspace(access.role, access.profileId); } catch { workspace = null; }
  const mode = access.mode === "live" && !workspace ? "error" : access.mode;
  const data = workspace ?? { assignments: [], offeringOptions: [] };
  const isStudent = access.role === "student";
  const quizzes = data.assignments.filter((assignment) => assignment.kind === "quiz").length;
  const pending = data.assignments.filter((assignment) => assignment.status === "published" && !assignment.submissions.some((submission) => submission.submitted_at)).length;
  const awaitingGrade = data.assignments.reduce((sum, assignment) => sum + assignment.submissions.filter((submission) => submission.submitted_at && !submission.graded_at).length, 0);
  const graded = data.assignments.reduce((sum, assignment) => sum + assignment.submissions.filter((submission) => submission.graded_at).length, 0);

  return <section>
    <OperationsHeader
      actions={mode === "live" && access.canManage ? <Link className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700" href="/assignments/new"><Plus className="size-4" /> Create quiz</Link> : undefined}
      description={isStudent ? "Quizzes are graded the moment you submit. Coursework is graded by your faculty member." : "Publish multiple choice quizzes that grade themselves, or coursework you mark by hand, and see how every class performs."}
      eyebrow="Academic delivery"
      title={isStudent ? "My assignments." : "Assignments, quizzes, and grading."}
    />
    <WorkspaceBanner mode={mode} />
    {query.deleted ? <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800" role="status">The assignment was deleted.</div> : null}
    {mode === "live" && access.canManage ? <details className="mt-6 rounded-2xl border border-slate-200 bg-white"><summary className="cursor-pointer px-5 py-3 text-sm font-semibold text-slate-800">Publish hand-graded coursework instead</summary><div className="border-t border-slate-100 p-4"><AssignmentCreator offerings={data.offeringOptions} /></div></details> : null}

    <OperationsMetrics metrics={[
      { detail: isStudent ? "Published to your classes" : "Across your classes", icon: ClipboardList, label: "Assignments", value: data.assignments.length },
      { detail: "Auto-graded multiple choice", icon: FileQuestion, label: "Quizzes", value: quizzes },
      { detail: isStudent ? "Open work you have not submitted" : "Submitted coursework to mark", icon: isStudent ? CalendarClock : BookCheck, label: isStudent ? "To do" : "Awaiting grade", value: isStudent ? pending : awaitingGrade },
      { detail: "Submissions with marks", icon: CircleCheck, label: "Graded", value: graded },
    ]} />

    <Card className="mt-6 overflow-hidden">
      <div className="border-b border-slate-100 p-5 sm:p-6"><h2 className="font-semibold text-slate-950">{isStudent ? "Your work" : "All assignments"}</h2><p className="mt-1 text-sm text-slate-500">{isStudent ? "Open an item to attempt a quiz or see your result." : "Open an item for attempts, grading, and per-question analytics."}</p></div>
      {data.assignments.length ? <div className="divide-y divide-slate-100">
        {data.assignments.map((assignment) => {
          const own = assignment.submissions[0];
          const overdue = isPastDue(assignment.due_at);
          const submitted = assignment.submissions.filter((submission) => submission.submitted_at).length;
          return <article className="flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between" key={assignment.id}>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link className="font-semibold text-slate-950 hover:text-blue-700" href={`/assignments/${assignment.id}`}>{assignment.title}</Link>
                <StatusPill tone="neutral">{assignment.kind === "quiz" ? "quiz" : "coursework"}</StatusPill>
                {!isStudent ? <StatusPill tone={statusTone[assignment.status]}>{assignment.status}</StatusPill> : null}
                {assignment.due_at ? <StatusPill tone={overdue ? "critical" : "neutral"}>{overdue ? "past due" : `due ${formatDateTime(assignment.due_at)}`}</StatusPill> : null}
              </div>
              <p className="mt-1 text-sm text-slate-600">{assignment.course_offerings.courses.code} · {assignment.course_offerings.section} · {assignment.maximum_marks} marks{assignment.kind === "quiz" && assignment.time_limit_minutes ? ` · ${assignment.time_limit_minutes} min` : ""}</p>
              {!isStudent ? <p className="mt-1 text-xs text-slate-500">{submitted} submitted · {assignment.submissions.filter((submission) => submission.graded_at).length} graded</p> : null}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {isStudent && own ? <StatusPill tone={own.graded_at ? "good" : own.submitted_at ? "warning" : own.started_at ? "warning" : "neutral"}>{own.graded_at ? `${own.score}/${assignment.maximum_marks}` : own.submitted_at ? "submitted" : own.started_at ? "in progress" : "not started"}</StatusPill> : null}
              {isStudent && own && !own.submitted_at && assignment.kind === "coursework" && assignment.status === "published" && !overdue ? <form action={submitAssignmentAction}><input name="assignmentId" type="hidden" value={assignment.id} /><input name="enrollmentId" type="hidden" value={own.enrollment_id} /><button className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" type="submit">Mark as submitted</button></form> : null}
              <Link className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700" href={`/assignments/${assignment.id}`}>{isStudent ? assignment.kind === "quiz" ? own?.submitted_at ? "View result" : own?.started_at ? "Continue quiz" : "Open quiz" : "Open" : "Open analytics"}</Link>
            </div>
          </article>;
        })}
      </div> : <EmptyOperationsState description={isStudent ? "Your account is approved. Assignments and quizzes appear here once your faculty publishes them to your class." : "Create a quiz or publish coursework to an active class."} icon={ClipboardList} title="No assignments yet." />}
    </Card>
  </section>;
}
