import { CalendarCheck, Clock3, GraduationCap, UserX } from "lucide-react";

import { EmptyOperationsState, OperationsHeader, OperationsMetrics, StatusPill, WorkspaceBanner } from "@/components/operations/operations-ui";
import { Card } from "@/design-system/primitives/card";
import { campusPolicies } from "@/features/operations/domain/operations-rules";
import { loadAttendanceWorkspace } from "@/features/operations/infrastructure/campus-operations.repository";
import { AttendanceRecorder } from "@/features/operations/presentation/operation-dialogs";
import { resolveWorkspaceAccess } from "@/server/workspace/workspace-access";

export const dynamic = "force-dynamic";

export default async function AttendancePage() {
  const access = await resolveWorkspaceAccess("students:read", "attendance:record");
  let workspace = null;
  if (access.mode === "live") {
    try { workspace = await loadAttendanceWorkspace(access.role === "faculty" ? access.profileId ?? undefined : undefined); } catch { workspace = null; }
  }
  const mode = access.mode === "live" && !workspace ? "error" : access.mode;
  const data = workspace ?? { absent: 0, attendanceRate: null, enrollmentOptions: [], late: 0, records: [], todayRecorded: 0 };
  const belowPolicy = data.attendanceRate !== null && data.attendanceRate < campusPolicies.attendanceWarningPercent;

  return <section aria-labelledby="attendance-heading"><OperationsHeader actions={<AttendanceRecorder canManage={access.canManage && mode === "live"} enrollments={data.enrollmentOptions} />} description="Record daily participation, correct mistakes safely, and surface attendance risk before it becomes academic loss." eyebrow="Academic operations" title="Attendance control center." /><WorkspaceBanner mode={mode} /><OperationsMetrics metrics={[{ detail: `Policy threshold is ${campusPolicies.attendanceWarningPercent}%`, icon: GraduationCap, label: "Attendance rate", value: data.attendanceRate === null ? "—" : `${data.attendanceRate}%` }, { detail: "Records captured for the current date", icon: CalendarCheck, label: "Today recorded", value: data.todayRecorded }, { detail: "Absence records in the current view", icon: UserX, label: "Absences", value: data.absent }, { detail: "Late arrivals requiring trend review", icon: Clock3, label: "Late arrivals", value: data.late }]} />
    {belowPolicy ? <Card className="mt-6 border-rose-200 bg-rose-50 p-5"><p className="text-sm font-semibold text-rose-800">Attendance is below the campus support threshold.</p><p className="mt-1 text-sm text-rose-700">Review repeated absences before running personalized guidance.</p></Card> : null}
    <Card className="mt-6 overflow-hidden"><div className="border-b border-slate-100 p-5 sm:p-6"><h2 className="font-semibold text-slate-950">Recent attendance</h2><p className="mt-1 text-sm text-slate-500">Latest 150 verified records across active enrollments.</p></div>{data.records.length ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-6 py-3">Student</th><th className="px-4 py-3">Course</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{data.records.map((record) => <tr key={record.id}><td className="px-6 py-4"><p className="text-sm font-semibold text-slate-900">{record.studentName}</p><p className="font-mono text-xs text-slate-500">{record.studentNumber}</p></td><td className="px-4 py-4 text-sm text-slate-700">{record.course}</td><td className="px-4 py-4 font-mono text-sm text-slate-600">{record.sessionDate}</td><td className="px-4 py-4"><StatusPill tone={record.status === "absent" ? "critical" : record.status === "late" ? "warning" : record.status === "present" ? "good" : "neutral"}>{record.status}</StatusPill></td></tr>)}</tbody></table></div> : <EmptyOperationsState description="Add students and course enrollments, then record the first session." icon={CalendarCheck} title="No attendance records yet." />}</Card>
  </section>;
}
