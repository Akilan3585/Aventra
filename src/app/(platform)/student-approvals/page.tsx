import { BadgeCheck, Building2, Clock3, GraduationCap, ShieldCheck, UserCheck } from "lucide-react";

import { EmptyOperationsState, OperationsHeader, OperationsMetrics, StatusPill, WorkspaceBanner } from "@/components/operations/operations-ui";
import { Card } from "@/design-system/primitives/card";
import { approveStudentAction } from "@/features/students/application/student-approval-actions";
import { loadPendingStudentApprovals } from "@/features/students/infrastructure/student-approval.repository";
import { resolveWorkspaceAccess } from "@/server/workspace/workspace-access";

export const dynamic = "force-dynamic";

const resultMessages: Record<string, { message: string; tone: "good" | "warning" | "critical" }> = {
  approved: { message: "Student membership approved. The student can now open the Student workspace.", tone: "good" },
  "approved-sync-pending": { message: "Student membership is active. Clerk metadata synchronization needs an administrator to retry.", tone: "warning" },
  "already-reviewed": { message: "This request was already reviewed by another staff member.", tone: "warning" },
  "identity-required": { message: "The student must finish Clerk identity verification before approval.", tone: "warning" },
  "invalid-request": { message: "The approval request was invalid. Reload the page and try again.", tone: "critical" },
  "not-found": { message: "The pending student record could not be found.", tone: "critical" },
  "outside-scope": { message: "Faculty can approve only students in their own department.", tone: "critical" },
};

function waitingDays(value: string) {
  return Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 86_400_000));
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
        <OperationsHeader description="Verify pending student onboarding requests through a governed, auditable workflow." eyebrow="Faculty operations" title="Student approvals" />
        <WorkspaceBanner mode={access.mode} />
      </section>
    );
  }

  const queue = await loadPendingStudentApprovals({
    profileId: access.profileId ?? "",
    role: access.role,
  });
  const message = result ? resultMessages[result] : null;
  const linkedCount = queue.items.filter((item) => item.identityLinked).length;
  const departments = new Set(queue.items.map((item) => item.departmentId)).size;
  const oldestWait = queue.items.length ? Math.max(...queue.items.map((item) => waitingDays(item.submittedAt))) : 0;
  const canApprove = Boolean(access.profileId);

  return (
    <section>
      <OperationsHeader
        description={queue.scope === "faculty-department"
          ? `Review identity-linked students in ${queue.departmentLabel ?? "your assigned department"}. Every approval is re-authorized and audited.`
          : "Review pending student identities across the campus. Every approval is re-authorized, synchronized, and audited."}
        eyebrow="Faculty operations"
        title="Student onboarding approvals"
      />
      {message ? <div className={`mt-6 rounded-2xl border p-4 text-sm ${message.tone === "good" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : message.tone === "warning" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-rose-200 bg-rose-50 text-rose-800"}`} role="status">{message.message}</div> : null}
      {!canApprove ? <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Your staff identity must be linked to a campus profile before you can approve students.</div> : null}

      <OperationsMetrics metrics={[
        { detail: "awaiting staff verification", icon: Clock3, label: "Pending requests", value: queue.items.length },
        { detail: "Clerk identity already verified", icon: ShieldCheck, label: "Ready to approve", value: linkedCount },
        { detail: queue.scope === "faculty-department" ? "your assigned department" : "represented in this queue", icon: Building2, label: "Departments", value: queue.scope === "faculty-department" ? 1 : departments },
        { detail: "oldest request in the queue", icon: UserCheck, label: "Longest wait", value: `${oldestWait}d` },
      ]} />

      <Card className="mt-6 overflow-hidden">
        <div className="border-b border-slate-100 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700"><BadgeCheck className="size-5" /></span>
            <div><h2 className="font-semibold text-slate-950">Pending student directory matches</h2><p className="mt-1 text-sm leading-6 text-slate-500">Confirm the name, student number, department, admission year, and semester against the official college record before approving.</p></div>
          </div>
        </div>
        {queue.items.length ? (
          <div className="divide-y divide-slate-100">
            {queue.items.map((student) => (
              <article className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1.25fr_1fr_auto] lg:items-center" key={student.studentId}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-950">{student.displayName}</h3><StatusPill tone={student.identityLinked ? "good" : "warning"}>{student.identityLinked ? "identity verified" : "identity required"}</StatusPill></div>
                  <p className="mt-1 truncate text-sm text-slate-500">{student.email}</p>
                  <p className="mt-3 font-mono text-sm font-semibold text-violet-700">{student.studentNumber}</p>
                </div>
                <dl className="grid grid-cols-2 gap-x-5 gap-y-3 text-sm">
                  <div><dt className="text-xs text-slate-400">Department</dt><dd className="mt-0.5 font-medium text-slate-700">{student.departmentCode}</dd></div>
                  <div><dt className="text-xs text-slate-400">Semester</dt><dd className="mt-0.5 font-medium text-slate-700">{student.semester}</dd></div>
                  <div><dt className="text-xs text-slate-400">Admission</dt><dd className="mt-0.5 font-medium text-slate-700">{student.admissionYear}</dd></div>
                  <div><dt className="text-xs text-slate-400">Waiting</dt><dd className="mt-0.5 font-medium text-slate-700">{waitingDays(student.submittedAt)} days</dd></div>
                </dl>
                <form action={approveStudentAction}>
                  <input name="profileId" type="hidden" value={student.profileId} />
                  <button className="w-full rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300 lg:w-auto" disabled={!student.identityLinked || !canApprove} type="submit">Approve student</button>
                </form>
              </article>
            ))}
          </div>
        ) : <EmptyOperationsState description={queue.scope === "faculty-department" ? "No students in your department are waiting for onboarding approval." : "No student onboarding requests are waiting for approval."} icon={GraduationCap} title="Approval queue is clear" />}
      </Card>
    </section>
  );
}
