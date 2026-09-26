import { BadgeCheck, Building2, GraduationCap, ShieldCheck, UserCheck, UserPlus } from "lucide-react";
import type { ReactNode } from "react";

import { EmptyOperationsState, OperationsHeader, OperationsMetrics, StatusPill, WorkspaceBanner } from "@/components/operations/operations-ui";
import { Card } from "@/design-system/primitives/card";
import { approveStudentAction } from "@/features/students/application/student-approval-actions";
import { placeholderStudentDetails, readinessLabels } from "@/features/students/domain/student-approval";
import { loadPendingStudentApprovals, type PendingStudentApproval, type StudentApprovalQueue } from "@/features/students/infrastructure/student-approval.repository";
import { resolveWorkspaceAccess } from "@/server/workspace/workspace-access";

export const dynamic = "force-dynamic";

const resultMessages: Record<string, { message: string; tone: "good" | "warning" | "critical" }> = {
  approved: { message: "Student accepted. The student can now open the Student workspace, assignments, and study materials.", tone: "good" },
  "approved-enrolled": { message: "Student accepted and enrolled in your classes. Your assignments and study materials are now visible to them.", tone: "good" },
  "approved-sync-pending": { message: "Student membership is active. Clerk metadata synchronization needs an administrator to retry.", tone: "warning" },
  "already-reviewed": { message: "This request was already reviewed by another staff member.", tone: "warning" },
  "details-invalid": { message: "Choose a valid department before accepting this student.", tone: "critical" },
  "identity-required": { message: "The student must finish Clerk identity verification before approval.", tone: "warning" },
  "invalid-request": { message: "The approval request was invalid. Reload the page and try again.", tone: "critical" },
  "not-found": { message: "The pending student record could not be found.", tone: "critical" },
  "outside-scope": { message: "Faculty can accept only students in their own department. Ask an administrator to link your faculty profile to a department.", tone: "critical" },
  "student-number-taken": { message: "That student number is already registered to another student. Check the college record and try again.", tone: "critical" },
};

const toneClass = { critical: "border-rose-200 bg-rose-50 text-rose-800", good: "border-emerald-200 bg-emerald-50 text-emerald-800", warning: "border-amber-200 bg-amber-50 text-amber-800" } as const;
const inputClass = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100";
const buttonClass = "w-full rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300 lg:w-auto";

function Notice({ children, tone }: { children: ReactNode; tone: keyof typeof toneClass }) {
  return <div className={`mt-6 rounded-2xl border p-4 text-sm leading-6 ${toneClass[tone]}`} role="status">{children}</div>;
}

function waitingDays(value: string) {
  return Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 86_400_000));
}

function disabledReason(student: PendingStudentApproval) {
  if (student.canApprove) return undefined;
  if (student.readiness === "identity-required") return readinessLabels[student.readiness];
  return "Your staff account cannot approve students yet";
}

function SubmittedDetails({ student }: { student: PendingStudentApproval & { details: NonNullable<PendingStudentApproval["details"]> } }) {
  return (
    <>
      <dl className="grid grid-cols-2 gap-x-5 gap-y-3 text-sm">
        <div><dt className="text-xs text-slate-400">Department</dt><dd className="mt-0.5 font-medium text-slate-700">{student.details.departmentCode}</dd></div>
        <div><dt className="text-xs text-slate-400">Semester</dt><dd className="mt-0.5 font-medium text-slate-700">{student.details.semester}</dd></div>
        <div><dt className="text-xs text-slate-400">Admission</dt><dd className="mt-0.5 font-medium text-slate-700">{student.details.admissionYear}</dd></div>
        <div><dt className="text-xs text-slate-400">Waiting</dt><dd className="mt-0.5 font-medium text-slate-700">{waitingDays(student.submittedAt)} days</dd></div>
      </dl>
      <form action={approveStudentAction}>
        <input name="profileId" type="hidden" value={student.profileId} />
        <button className={buttonClass} disabled={!student.canApprove} title={disabledReason(student)} type="submit">Accept student</button>
      </form>
    </>
  );
}

function AcceptWithoutDetails({ queue, student }: { queue: StudentApprovalQueue; student: PendingStudentApproval }) {
  const placeholder = placeholderStudentDetails({ email: student.email });
  return (
    <form action={approveStudentAction} className="contents">
      <input name="profileId" type="hidden" value={student.profileId} />
      <dl className="grid grid-cols-2 gap-x-5 gap-y-3 text-sm">
        <div className="col-span-2">
          <dt className="text-xs text-slate-400">Department</dt>
          <dd className="mt-0.5">
            {queue.reviewer.role === "faculty"
              ? <span className="font-medium text-slate-700">{queue.departmentLabel ?? "Not linked to a department"}</span>
              : <select className={inputClass} defaultValue={queue.departmentOptions[0]?.id ?? ""} disabled={!student.canApprove} name="departmentId" required>{queue.departmentOptions.map((department) => <option key={department.id} value={department.id}>{department.code} — {department.name}</option>)}</select>}
          </dd>
        </div>
        <div><dt className="text-xs text-slate-400">Student number</dt><dd className="mt-0.5 font-mono text-sm font-medium text-slate-700">{placeholder.studentNumber}</dd></div>
        <div><dt className="text-xs text-slate-400">Semester</dt><dd className="mt-0.5 font-medium text-slate-700">{placeholder.semester} · {placeholder.admissionYear}</dd></div>
      </dl>
      <div><button className={buttonClass} disabled={!student.canApprove} title={disabledReason(student)} type="submit">Accept student</button><p className="mt-2 max-w-[12rem] text-xs leading-5 text-slate-500">Accepts with the placeholder number shown; no details to fill in.</p></div>
    </form>
  );
}

export default async function StudentApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string }>;
}) {
  const access = await resolveWorkspaceAccess("students:approve");
  const { result } = await searchParams;

  if (access.mode !== "live") {
    return (
      <section>
        <OperationsHeader description="Verify pending student sign-ups through a governed, auditable workflow." eyebrow="Faculty operations" title="Student approvals" />
        <WorkspaceBanner mode={access.mode} />
      </section>
    );
  }

  let queue: StudentApprovalQueue | null = null;
  try {
    queue = await loadPendingStudentApprovals({ profileId: access.profileId ?? "", role: access.role });
  } catch {
    queue = null;
  }
  if (!queue) {
    return (
      <section>
        <OperationsHeader description="Verify pending student sign-ups through a governed, auditable workflow." eyebrow="Faculty operations" title="Student approvals" />
        <WorkspaceBanner mode="error" />
      </section>
    );
  }

  const message = result ? resultMessages[result] : null;
  const readyCount = queue.items.filter((item) => item.readiness === "ready").length;
  const detailsNeeded = queue.items.filter((item) => item.readiness === "details-required").length;
  const departments = new Set(queue.items.map((item) => item.details?.departmentId).filter(Boolean)).size;
  const oldestWait = queue.items.length ? Math.max(...queue.items.map((item) => waitingDays(item.submittedAt))) : 0;
  const facultyUnlinked = access.role === "faculty" && !queue.reviewer.facultyDepartmentId;
  const description = access.role === "faculty"
    ? "New student sign-ups wait here until you accept them. Accepted students are enrolled in your classes and can then see your assignments and study materials."
    : "New student sign-ups across the campus wait here until accepted. Students cannot open assignments or study materials before that.";

  return (
    <section>
      <OperationsHeader description={description} eyebrow="Faculty operations" title="Student onboarding approvals" />
      {message ? <Notice tone={message.tone}>{message.message}</Notice> : null}
      {!access.profileId ? <Notice tone="warning">Your staff identity must be linked to a campus profile before you can accept students.</Notice> : null}
      {access.profileId && facultyUnlinked ? (
        <Notice tone="warning">
          <p className="font-semibold">Your faculty profile is not linked to a department yet.</p>
          <p className="mt-1">You can see the queue, but accepting is disabled until an administrator adds you as a faculty member of a department.</p>
        </Notice>
      ) : null}

      <OperationsMetrics metrics={[
        { detail: "identity verified, awaiting your decision", icon: UserPlus, label: "Pending sign-ups", value: queue.items.length },
        { detail: "student submitted their academic details", icon: ShieldCheck, label: "Details submitted", value: readyCount },
        { detail: "you enter the details when accepting", icon: Building2, label: "Details needed", value: detailsNeeded },
        { detail: departments ? `across ${departments} department${departments === 1 ? "" : "s"}` : "oldest sign-up still waiting", icon: UserCheck, label: "Longest wait", value: `${oldestWait}d` },
      ]} />

      <Card className="mt-6 overflow-hidden">
        <div className="border-b border-slate-100 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700"><BadgeCheck className="size-5" /></span>
            <div><h2 className="font-semibold text-slate-950">Pending student approvals</h2><p className="mt-1 text-sm leading-6 text-slate-500">Confirm each student against the official college record before accepting. Accepting activates the account{access.role === "faculty" ? ", enrolls the student in your classes," : ""} and unlocks assignments and study materials.</p></div>
          </div>
        </div>
        {queue.items.length ? (
          <div className="divide-y divide-slate-100">
            {queue.items.map((student) => (
              <article className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1.1fr_1.1fr_auto] lg:items-start" key={student.profileId}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-950">{student.displayName}</h3><StatusPill tone={student.readiness === "ready" ? "good" : student.readiness === "details-required" ? "neutral" : "warning"}>{readinessLabels[student.readiness]}</StatusPill></div>
                  <p className="mt-1 truncate text-sm text-slate-500">{student.email}</p>
                  {student.details ? <p className="mt-3 font-mono text-sm font-semibold text-violet-700">{student.details.studentNumber}</p> : <p className="mt-3 text-sm text-slate-500">Signed up {waitingDays(student.submittedAt)} days ago · no academic details submitted</p>}
                </div>
                {student.details ? <SubmittedDetails student={{ ...student, details: student.details }} /> : <AcceptWithoutDetails queue={queue} student={student} />}
              </article>
            ))}
          </div>
        ) : <EmptyOperationsState description={access.role === "faculty" && queue.departmentLabel ? `No student sign-ups are waiting for ${queue.departmentLabel}.` : "No student sign-ups are waiting for approval."} icon={GraduationCap} title="Approval queue is clear" />}
      </Card>
    </section>
  );
}
