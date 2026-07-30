import Link from "next/link";
import { Activity, AlertTriangle, ArrowRight, Bot, Building2, CalendarDays, GraduationCap, Wrench } from "lucide-react";

import { OperationsHeader, OperationsMetrics, StatusPill, WorkspaceBanner } from "@/components/operations/operations-ui";
import { Card } from "@/design-system/primitives/card";
import { loadCampusDashboard } from "@/features/operations/infrastructure/campus-operations.repository";
import { resolveWorkspaceAccess } from "@/server/workspace/workspace-access";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const access = await resolveWorkspaceAccess("reports:read");
  let dashboard = null;
  if (access.mode === "live") { try { dashboard = await loadCampusDashboard(); } catch { dashboard = null; } }
  const mode = access.mode === "live" && !dashboard ? "error" : access.mode;
  const data = dashboard ?? { activeAgentRuns: 0, attendanceRate: null, attentionRooms: 0, openTickets: 0, scheduleConflicts: 0, students: 0, todaySessions: 0 };
  const alerts = [
    { href: "/schedules", label: "Schedule constraints", value: data.scheduleConflicts, tone: data.scheduleConflicts ? "critical" as const : "good" as const },
    { href: "/classrooms", label: "Rooms needing attention", value: data.attentionRooms, tone: data.attentionRooms ? "warning" as const : "good" as const },
    { href: "/maintenance", label: "Open maintenance tickets", value: data.openTickets, tone: data.openTickets ? "warning" as const : "good" as const },
  ];
  return <section><OperationsHeader actions={<Link className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-200" href="/analytics">Open analytics <ArrowRight className="size-4" /></Link>} description="A live operating picture across student success, teaching spaces, schedules, maintenance, and agent activity." eyebrow="Campus operations" title="Your campus, in focus." /><WorkspaceBanner mode={mode} /><OperationsMetrics metrics={[{ detail: "Verified roster records", icon: GraduationCap, label: "Students", value: data.students }, { detail: "Participation across recorded sessions", icon: Activity, label: "Attendance", value: data.attendanceRate === null ? "—" : `${data.attendanceRate}%` }, { detail: "Teaching sessions on today’s timetable", icon: CalendarDays, label: "Today’s sessions", value: data.todaySessions }, { detail: "Queued or running orchestrations", icon: Bot, label: "Active agent runs", value: data.activeAgentRuns }]} />
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_.85fr]"><Card className="p-5 sm:p-6"><div className="flex items-center justify-between"><div><h2 className="font-semibold text-slate-950">Operational exceptions</h2><p className="mt-1 text-sm text-slate-500">Items that require a human decision.</p></div><AlertTriangle className="size-5 text-amber-500" /></div><div className="mt-5 space-y-3">{alerts.map((alert) => <Link className="flex items-center justify-between rounded-xl border border-slate-100 p-4 transition hover:border-blue-100 hover:bg-blue-50/40" href={alert.href} key={alert.label}><span className="text-sm font-medium text-slate-700">{alert.label}</span><StatusPill tone={alert.tone}>{alert.value ? alert.value : "clear"}</StatusPill></Link>)}</div></Card><Card className="bg-slate-950 p-5 text-white sm:p-6"><span className="grid size-10 place-items-center rounded-xl bg-white/10"><Bot className="size-5 text-blue-300" /></span><h2 className="mt-5 font-semibold">Coordinator agent chain</h2><p className="mt-2 text-sm leading-6 text-slate-300">Student demand informs room allocation; facility readiness validates the space; conflicts return for reassignment before notifications are queued.</p><div className="mt-5 grid grid-cols-2 gap-3 text-xs"><div className="rounded-xl bg-white/5 p-3"><Building2 className="mb-2 size-4 text-blue-300" />Capacity aware</div><div className="rounded-xl bg-white/5 p-3"><Wrench className="mb-2 size-4 text-emerald-300" />Readiness aware</div></div><Link className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-300" href="/analytics">Review intelligence <ArrowRight className="size-4" /></Link></Card></div>
  </section>;
}
