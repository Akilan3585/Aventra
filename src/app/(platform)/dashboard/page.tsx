import Link from "next/link";
import { Activity, AlertTriangle, ArrowRight, Bot, Building2, CalendarDays, GraduationCap, Sparkles, Wrench } from "lucide-react";
import { redirect } from "next/navigation";

import { OperationsHeader, OperationsMetrics, ProgressBar, SectionHeader, StatusPill, WorkspaceBanner } from "@/components/operations/operations-ui";
import { Card } from "@/design-system/primitives/card";
import { campusPolicies } from "@/features/operations/domain/operations-rules";
import { loadCampusDashboard } from "@/features/operations/infrastructure/campus-operations.repository";
import { getCampusAccess } from "@/server/auth/campus-access";
import { isSupabaseAdminConfigured } from "@/server/supabase/admin-client";
import { resolveWorkspaceAccess } from "@/server/workspace/workspace-access";

export const dynamic = "force-dynamic";

const quickActions = [
  { description: "Review support risk and roster signals", href: "/students", icon: GraduationCap, label: "Student success" },
  { description: "Resolve timetable constraints", href: "/schedules", icon: CalendarDays, label: "Schedule desk" },
  { description: "Triage campus facility tickets", href: "/maintenance", icon: Wrench, label: "Maintenance queue" },
  { description: "Inspect decisions and evidence", href: "/agents", icon: Bot, label: "AI agent review" },
];

export default async function DashboardPage() {
  if (isSupabaseAdminConfigured()) {
    const identity = await getCampusAccess();
    if (identity?.role === "student") redirect("/student-workspace");
    if (identity?.role === "faculty") redirect("/faculty-workspace");
    if (identity?.role === "maintenance-staff") redirect("/maintenance");
  }
  const access = await resolveWorkspaceAccess("reports:read");
  let dashboard = null;
  if (access.mode === "live") { try { dashboard = await loadCampusDashboard(); } catch { dashboard = null; } }
  const mode = access.mode === "live" && !dashboard ? "error" : access.mode;
  const data = dashboard ?? { activeAgentRuns: 0, attendanceRate: null, attentionRooms: 0, openTickets: 0, scheduleConflicts: 0, students: 0, todaySessions: 0 };
  const attendance = data.attendanceRate ?? 0;
  const alerts = [
    { detail: "Conflicts awaiting a timetable decision", href: "/schedules", label: "Schedule constraints", value: data.scheduleConflicts, tone: data.scheduleConflicts ? "critical" as const : "good" as const },
    { detail: "Readiness or capacity exceptions", href: "/classrooms", label: "Rooms needing attention", value: data.attentionRooms, tone: data.attentionRooms ? "warning" as const : "good" as const },
    { detail: "Facility requests not yet closed", href: "/maintenance", label: "Open maintenance tickets", value: data.openTickets, tone: data.openTickets ? "warning" as const : "good" as const },
  ];

  return <section>
    <OperationsHeader actions={<Link className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700" href="/analytics">Open analytics <ArrowRight className="size-4" /></Link>} description="A live operating picture across student success, teaching spaces, schedules, maintenance, and agent activity." eyebrow="Campus operations" title="Good morning. Here is today’s campus." />
    <WorkspaceBanner mode={mode} />
    <OperationsMetrics metrics={[
      { detail: "verified roster records", icon: GraduationCap, label: "Students", value: data.students },
      { detail: `target ${campusPolicies.attendanceWarningPercent}%`, icon: Activity, label: "Attendance", trend: data.attendanceRate === null ? undefined : { direction: attendance >= campusPolicies.attendanceWarningPercent ? "up" : "down", label: attendance >= campusPolicies.attendanceWarningPercent ? "Healthy" : "Needs review", positive: attendance >= campusPolicies.attendanceWarningPercent }, value: data.attendanceRate === null ? "—" : `${attendance}%` },
      { detail: "teaching sessions today", icon: CalendarDays, label: "Today’s sessions", value: data.todaySessions },
      { detail: "queued or running workflows", icon: Bot, label: "Active agent runs", value: data.activeAgentRuns },
    ]} />

    <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
      <Card className="overflow-hidden">
        <SectionHeader description="Exceptions are ranked by operational impact and remain human-controlled." title="Requires attention" />
        <div className="divide-y divide-slate-100">{alerts.map((alert) => <Link className="flex items-center gap-4 p-5 transition hover:bg-slate-50 sm:px-6" href={alert.href} key={alert.label}><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700"><AlertTriangle className="size-4.5" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-900">{alert.label}</span><span className="mt-0.5 block text-xs text-slate-500">{alert.detail}</span></span><StatusPill tone={alert.tone}>{alert.value || "clear"}</StatusPill><ArrowRight className="size-4 text-slate-300" /></Link>)}</div>
      </Card>

      <Card className="p-5 sm:p-6">
        <div className="flex items-start justify-between"><div><h2 className="font-semibold text-slate-950">Campus health</h2><p className="mt-1 text-sm text-slate-500">Live operational readiness</p></div><span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><Building2 className="size-5" /></span></div>
        <div className="mt-6 space-y-5">
          <div><div className="mb-2 flex items-center justify-between text-sm"><span className="font-medium text-slate-700">Attendance participation</span><span className="font-mono font-semibold text-slate-900">{data.attendanceRate === null ? "—" : `${attendance}%`}</span></div><ProgressBar tone={attendance >= campusPolicies.attendanceWarningPercent ? "emerald" : "amber"} value={attendance} /></div>
          <div><div className="mb-2 flex items-center justify-between text-sm"><span className="font-medium text-slate-700">Teaching continuity</span><span className="font-mono font-semibold text-slate-900">{Math.max(0, 100 - data.scheduleConflicts * 10)}%</span></div><ProgressBar tone={data.scheduleConflicts ? "amber" : "emerald"} value={Math.max(0, 100 - data.scheduleConflicts * 10)} /></div>
          <div><div className="mb-2 flex items-center justify-between text-sm"><span className="font-medium text-slate-700">Facility readiness</span><span className="font-mono font-semibold text-slate-900">{Math.max(0, 100 - data.attentionRooms * 8)}%</span></div><ProgressBar tone={data.attentionRooms ? "amber" : "emerald"} value={Math.max(0, 100 - data.attentionRooms * 8)} /></div>
        </div>
      </Card>
    </div>

    <Card className="mt-6 overflow-hidden">
      <SectionHeader description="Move directly into the campus workflows used most often." title="Operational shortcuts" />
      <div className="grid sm:grid-cols-2 xl:grid-cols-4">{quickActions.map(({ description, href, icon: Icon, label }, index) => <Link className={`group p-5 transition hover:bg-blue-50/50 sm:p-6 ${index > 0 ? "border-t border-slate-100 sm:border-l sm:border-t-0" : ""}`} href={href} key={href}><span className="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 group-hover:border-blue-200 group-hover:text-blue-700"><Icon className="size-4.5" /></span><p className="mt-4 text-sm font-semibold text-slate-900">{label}</p><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p></Link>)}</div>
    </Card>

    <Card className="mt-6 border-blue-200 bg-blue-50/60 p-5 sm:p-6"><div className="flex flex-col gap-5 sm:flex-row sm:items-center"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-blue-700 shadow-sm"><Sparkles className="size-5" /></span><div className="flex-1"><h2 className="font-semibold text-slate-950">Coordinator agent chain</h2><p className="mt-1 text-sm leading-6 text-slate-600">Demand, room readiness, schedule conflicts, and maintenance state are evaluated in sequence. Privileged decisions remain queued for human review.</p></div><Link className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700" href="/agents">Review evidence <ArrowRight className="size-4" /></Link></div></Card>
  </section>;
}
