import Link from "next/link";
import { Activity, AlertTriangle, CalendarDays, Download, GraduationCap } from "lucide-react";

import { OperationsHeader, OperationsMetrics, WorkspaceBanner } from "@/components/operations/operations-ui";
import { Card } from "@/design-system/primitives/card";
import { loadCampusDashboard } from "@/features/operations/infrastructure/campus-operations.repository";
import { resolveWorkspaceAccess } from "@/server/workspace/workspace-access";

export const dynamic = "force-dynamic";

const reports = [
  { description: "Student identifiers, departments, admission year, and semester context.", href: "/api/reports/students", icon: GraduationCap, name: "Student registry" },
  { description: "Verified attendance records with date, status, student, and course context.", href: "/api/reports/attendance", icon: Activity, name: "Attendance ledger" },
] as const;

export default async function ReportsPage() {
  const access = await resolveWorkspaceAccess("reports:read");
  let dashboard = null;
  if (access.mode === "live") try { dashboard = await loadCampusDashboard(); } catch { dashboard = null; }
  const mode = access.mode === "live" && !dashboard ? "error" : access.mode;
  const data = dashboard ?? { activeAgentRuns: 0, attendanceRate: null, scheduleConflicts: 0, students: 0, todaySessions: 0 };
  return <section><OperationsHeader description="Generate permission-controlled CSV exports directly from verified campus source data." eyebrow="Governed reporting" title="Reports and exports." /><WorkspaceBanner mode={mode} /><OperationsMetrics metrics={[{ detail: "Verified student records", icon: GraduationCap, label: "Students", value: data.students }, { detail: "Current participation signal", icon: Activity, label: "Attendance", value: data.attendanceRate === null ? "—" : `${data.attendanceRate}%` }, { detail: "Teaching sessions scheduled today", icon: CalendarDays, label: "Today’s sessions", value: data.todaySessions }, { detail: "Overlap or capacity exceptions", icon: AlertTriangle, label: "Schedule conflicts", value: data.scheduleConflicts }]} /><div className="mt-6 grid gap-4 md:grid-cols-2">{reports.map(({ description, href, icon: Icon, name }) => <Card className="group p-5 sm:p-6" key={href}><span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-primary"><Icon className="size-5" /></span><h2 className="mt-5 font-semibold text-slate-950">{name}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{description}</p><Link className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary" href={href}>Download CSV <Download className="size-4 transition group-hover:translate-y-0.5" /></Link></Card>)}</div></section>;
}
