import { Activity, AlertTriangle, BarChart3, BrainCircuit, Building2, GraduationCap } from "lucide-react";

import { OperationsHeader, OperationsMetrics, ProgressBar, SectionHeader, StatusPill, WorkspaceBanner } from "@/components/operations/operations-ui";
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
  const totalStudents = analytics?.students.length ?? 0;
  const highRisk = analytics?.students.filter((student) => student.riskLevel === "high").length ?? 0;
  const monitored = analytics?.students.filter((student) => student.riskLevel === "medium").length ?? 0;
  const onTrack = analytics?.students.filter((student) => student.riskLevel === "low").length ?? 0;
  const insufficient = Math.max(0, totalStudents - highRisk - monitored - onTrack);
  const signalCoverage = totalStudents ? Math.round(((totalStudents - insufficient) / totalStudents) * 100) : 0;
  const operationalRisk = (analytics?.schedules.conflicts ?? 0) + (analytics?.classrooms.attentionRooms ?? 0) + (analytics?.maintenance.overdue ?? 0);
  const attendanceRate = analytics?.attendance.attendanceRate ?? 0;
  const segments = [
    { color: "bg-rose-500", label: "High priority", value: highRisk },
    { color: "bg-amber-500", label: "Monitor", value: monitored },
    { color: "bg-emerald-500", label: "On track", value: onTrack },
    { color: "bg-slate-300", label: "Needs data", value: insufficient },
  ];
  const insights = [
    { detail: analytics?.attendance.attendanceRate === null || analytics?.attendance.attendanceRate === undefined ? "Attendance data is not available yet." : attendanceRate < campusPolicies.attendanceWarningPercent ? `Attendance is below the ${campusPolicies.attendanceWarningPercent}% support threshold.` : "Attendance remains above the support threshold.", label: "Attendance health", tone: attendanceRate < campusPolicies.attendanceWarningPercent ? "warning" as const : "good" as const },
    { detail: `${highRisk} high-priority and ${monitored} monitored students are waiting in the human-review queue.`, label: "Student success", tone: highRisk ? "critical" as const : monitored ? "warning" as const : "good" as const },
    { detail: `${analytics?.schedules.conflicts ?? 0} timetable constraints, ${analytics?.classrooms.attentionRooms ?? 0} rooms, and ${analytics?.maintenance.overdue ?? 0} overdue tickets require review.`, label: "Teaching continuity", tone: operationalRisk ? "warning" as const : "good" as const },
  ];

  return <section>
    <OperationsHeader description="Translate academic and operational signals into transparent, reviewable decisions across the whole campus." eyebrow="Intelligence" title="Analytics that lead to action" />
    <WorkspaceBanner mode={mode} />
    <OperationsMetrics metrics={[
      { detail: "students with a usable success signal", icon: GraduationCap, label: "Signal coverage", value: `${signalCoverage}%` },
      { detail: "students requiring immediate review", icon: BrainCircuit, label: "High-priority students", value: highRisk },
      { detail: "schedule, room, and SLA exceptions", icon: AlertTriangle, label: "Operational exceptions", value: operationalRisk },
      { detail: "average facility readiness", icon: Building2, label: "Facility readiness", value: `${analytics?.classrooms.averageReadiness ?? 0}%` },
    ]} />

    <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
      <Card className="overflow-hidden"><SectionHeader description="Population distribution based on explainable attendance, assessment, and result signals." title="Student success distribution" /><div className="p-5 sm:p-6"><div className="flex h-3 overflow-hidden rounded-full bg-slate-100">{segments.map((segment) => <span className={segment.color} key={segment.label} style={{ width: `${totalStudents ? (segment.value / totalStudents) * 100 : 0}%` }} />)}</div><div className="mt-6 grid gap-3 sm:grid-cols-2">{segments.map((segment) => <div className="flex items-center justify-between rounded-xl border border-slate-100 p-3" key={segment.label}><span className="flex items-center gap-2 text-sm text-slate-600"><span className={`size-2.5 rounded-full ${segment.color}`} />{segment.label}</span><span className="font-mono text-sm font-semibold text-slate-900">{segment.value}</span></div>)}</div><div className="mt-6"><div className="mb-2 flex items-center justify-between text-sm"><span className="font-medium text-slate-700">Data coverage</span><span className="font-mono font-semibold text-slate-900">{signalCoverage}%</span></div><ProgressBar tone={signalCoverage >= 80 ? "emerald" : "amber"} value={signalCoverage} /></div></div></Card>

      <Card className="overflow-hidden"><SectionHeader description="Computed from current source-of-truth records." title="Cross-campus insights" /><div className="divide-y divide-slate-100">{insights.map((insight) => <div className="p-5 sm:px-6" key={insight.label}><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-slate-900">{insight.label}</p><StatusPill tone={insight.tone}>{insight.tone === "good" ? "healthy" : "review"}</StatusPill></div><p className="mt-2 text-sm leading-6 text-slate-600">{insight.detail}</p></div>)}</div></Card>
    </div>

    <div className="mt-6 grid gap-6 lg:grid-cols-3">
      {[{ icon: Activity, label: "Attendance participation", value: attendanceRate, target: campusPolicies.attendanceWarningPercent }, { icon: Building2, label: "Room readiness", value: analytics?.classrooms.averageReadiness ?? 0, target: 90 }, { icon: BarChart3, label: "Signal coverage", value: signalCoverage, target: 80 }].map(({ icon: Icon, label, target, value }) => <Card className="p-5" key={label}><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-700"><Icon className="size-4" /></span><p className="text-sm font-semibold text-slate-900">{label}</p></div><p className="mt-5 text-2xl font-semibold text-slate-950">{value}%</p><div className="mt-3"><ProgressBar tone={value >= target ? "emerald" : "amber"} value={value} /></div><p className="mt-2 text-xs text-slate-500">Institutional target: {target}%</p></Card>)}
    </div>

    <Card className="mt-6 border-blue-100 bg-blue-50/60 p-5 sm:p-6"><div className="flex gap-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-blue-700 shadow-sm"><BrainCircuit className="size-5" /></span><div><h2 className="font-semibold text-slate-950">How Aventra explains these results</h2><p className="mt-2 text-sm leading-6 text-slate-600">Deterministic business rules produce the metrics. AI may explain and personalize recommendations, but it cannot approve room moves, contact students, or close maintenance work without human review. Attendance, marks, enrollment demand, equipment state, and ticket history remain the evidence.</p></div></div></Card>
  </section>;
}
