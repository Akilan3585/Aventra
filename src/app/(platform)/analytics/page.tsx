import { Activity, AlertTriangle, BarChart3, BrainCircuit, Building2, GraduationCap } from "lucide-react";

import { OperationsHeader, OperationsMetrics, StatusPill, WorkspaceBanner } from "@/components/operations/operations-ui";
import { Card } from "@/design-system/primitives/card";
import { campusPolicies } from "@/features/operations/domain/operations-rules";
import { loadAttendanceWorkspace, loadClassroomWorkspace, loadMaintenanceWorkspace, loadScheduleWorkspace } from "@/features/operations/infrastructure/campus-operations.repository";
import { listStudentDirectory } from "@/features/students/infrastructure/student.repository";
import { resolveWorkspaceAccess } from "@/server/workspace/workspace-access";

export const dynamic = "force-dynamic";

async function loadAnalytics() {
  try {
    const [attendance, classrooms, maintenance, schedules, students] = await Promise.all([loadAttendanceWorkspace(), loadClassroomWorkspace(), loadMaintenanceWorkspace(), loadScheduleWorkspace(), listStudentDirectory()]);
    return { attendance, classrooms, maintenance, schedules, students };
  } catch { return null; }
}

export default async function AnalyticsPage() {
  const access = await resolveWorkspaceAccess("reports:read");
  const analytics = access.mode === "live" ? await loadAnalytics() : null;
  const mode = access.mode === "live" && !analytics ? "error" : access.mode;
  const highRisk = analytics?.students.filter((student) => student.riskLevel === "high").length ?? 0;
  const monitored = analytics?.students.filter((student) => student.riskLevel === "medium").length ?? 0;
  const signalCoverage = analytics?.students.length ? Math.round((analytics.students.filter((student) => student.attendanceRate !== null || student.academicAverage !== null || student.latestCgpa !== null).length / analytics.students.length) * 100) : 0;
  const operationalRisk = (analytics?.schedules.conflicts ?? 0) + (analytics?.classrooms.attentionRooms ?? 0) + (analytics?.maintenance.overdue ?? 0);
  const insights = [
    { detail: analytics?.attendance.attendanceRate === null || analytics?.attendance.attendanceRate === undefined ? "Attendance data is not available yet." : analytics.attendance.attendanceRate < campusPolicies.attendanceWarningPercent ? `Attendance is below the ${campusPolicies.attendanceWarningPercent}% support threshold.` : "Attendance remains above the support threshold.", label: "Attendance health", tone: analytics?.attendance.attendanceRate !== null && analytics?.attendance.attendanceRate !== undefined && analytics.attendance.attendanceRate < campusPolicies.attendanceWarningPercent ? "warning" as const : "good" as const },
    { detail: `${highRisk} high-priority and ${monitored} monitored students are in the human-review queue.`, label: "Student success", tone: highRisk ? "critical" as const : monitored ? "warning" as const : "good" as const },
    { detail: `${analytics?.schedules.conflicts ?? 0} timetable constraints and ${analytics?.classrooms.attentionRooms ?? 0} rooms require review.`, label: "Teaching continuity", tone: operationalRisk ? "warning" as const : "good" as const },
  ];
  return <section><OperationsHeader description="Translate academic and operational signals into transparent, reviewable decisions across the whole campus." eyebrow="Decision intelligence" title="Analytics that lead to action." /><WorkspaceBanner mode={mode} /><OperationsMetrics metrics={[{ detail: "Students with at least one success signal", icon: GraduationCap, label: "Signal coverage", value: `${signalCoverage}%` }, { detail: "Students requiring immediate review", icon: BrainCircuit, label: "High-priority students", value: highRisk }, { detail: "Schedule, room, and SLA exceptions", icon: AlertTriangle, label: "Operational exceptions", value: operationalRisk }, { detail: "Average facility readiness", icon: Building2, label: "Facility readiness", value: `${analytics?.classrooms.averageReadiness ?? 0}%` }]} />
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_.9fr]"><Card className="p-5 sm:p-6"><div className="flex items-center justify-between"><div><h2 className="font-semibold text-slate-950">Cross-campus insights</h2><p className="mt-1 text-sm text-slate-500">Rules are visible and evidence remains traceable.</p></div><BarChart3 className="size-5 text-primary" /></div><div className="mt-5 space-y-3">{insights.map((insight) => <div className="rounded-xl border border-slate-100 p-4" key={insight.label}><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-slate-900">{insight.label}</p><StatusPill tone={insight.tone}>{insight.tone === "good" ? "healthy" : "review"}</StatusPill></div><p className="mt-2 text-sm leading-6 text-slate-600">{insight.detail}</p></div>)}</div></Card><Card className="border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5 sm:p-6"><span className="grid size-10 place-items-center rounded-xl bg-white text-primary shadow-sm"><BrainCircuit className="size-5" /></span><h2 className="mt-5 font-semibold text-slate-950">AI operating boundary</h2><p className="mt-2 text-sm leading-6 text-slate-600">Deterministic business rules produce the current metrics. LLM guidance may explain and personalize recommendations, but it cannot approve room moves, contact students, or close maintenance work without human review.</p><div className="mt-5 rounded-xl bg-white/80 p-4 text-sm text-slate-600"><p className="flex items-center gap-2 font-medium text-slate-800"><Activity className="size-4 text-emerald-600" />Evidence before generation</p><p className="mt-2 text-xs leading-5">Attendance, marks, enrollment demand, equipment state, and ticket history remain the source of truth.</p></div></Card></div>
  </section>;
}
