import Link from "next/link";
import { Activity, AlertTriangle, ArrowRight, Bot, CalendarDays, ClipboardCheck, Code2, GraduationCap, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";

import { OperationsHeader, OperationsMetrics, ProgressBar, SectionHeader, StatusPill, WorkspaceBanner } from "@/components/operations/operations-ui";
import { Card } from "@/design-system/primitives/card";
import { campusPolicies } from "@/features/operations/domain/operations-rules";
import { loadCampusDashboard } from "@/features/operations/infrastructure/campus-operations.repository";
import { codingPlatforms, platformCatalog, summarizePlatformCoverage, summarizeStudentPlatforms } from "@/features/performance/domain/platform-performance";
import { loadPlatformPerformanceWorkspace, type PlatformPerformanceWorkspace } from "@/features/performance/infrastructure/platform-performance.repository";
import { getCampusAccess } from "@/server/auth/campus-access";
import { isSupabaseAdminConfigured } from "@/server/supabase/admin-client";
import { resolveWorkspaceAccess } from "@/server/workspace/workspace-access";

export const dynamic = "force-dynamic";

const quickActions = [
  { description: "Review support risk and roster signals", href: "/students", icon: GraduationCap, label: "Student success" },
  { description: "Record sessions and review participation risk", href: "/attendance", icon: ClipboardCheck, label: "Attendance desk" },
  { description: "Inspect decisions and evidence", href: "/agents", icon: Bot, label: "AI agent review" },
];

export default async function DashboardPage() {
  if (isSupabaseAdminConfigured()) {
    const identity = await getCampusAccess();
    if (identity?.role === "student") redirect("/student-workspace");
  }
  const access = await resolveWorkspaceAccess("reports:read");
  let dashboard = null;
  let platforms: PlatformPerformanceWorkspace | null = null;
  if (access.mode === "live") {
    const [dashboardResult, platformResult] = await Promise.allSettled([loadCampusDashboard(), loadPlatformPerformanceWorkspace()]);
    dashboard = dashboardResult.status === "fulfilled" ? dashboardResult.value : null;
    platforms = platformResult.status === "fulfilled" ? platformResult.value : null;
  }
  const platformProfiles = platforms?.profiles ?? [];
  const coverage = summarizePlatformCoverage(platformProfiles.map((item) => ({ platform: item.platform, score: Number(item.score), studentId: item.student_id })));
  const profilesByStudent = new Map<string, typeof platformProfiles>();
  for (const item of platformProfiles) profilesByStudent.set(item.student_id, [...(profilesByStudent.get(item.student_id) ?? []), item]);
  const composites = [...profilesByStudent.values()].map((records) => summarizeStudentPlatforms(records.map((item) => ({ platform: item.platform, score: Number(item.score) }))).compositeReadiness ?? 0);
  const averageReadiness = composites.length ? Math.round(composites.reduce((sum, value) => sum + value, 0) / composites.length) : null;
  const totalStudents = platforms?.totalStudents ?? 0;
  const mode = access.mode === "live" && !dashboard ? "error" : access.mode;
  const data = dashboard ?? { activeAgentRuns: 0, attendanceRate: null, scheduleConflicts: 0, students: 0, todaySessions: 0 };
  const attendance = data.attendanceRate ?? 0;
  const alerts = [
    { detail: `Participation below the ${campusPolicies.attendanceWarningPercent}% support threshold`, href: "/attendance", label: "Attendance below policy", value: data.attendanceRate !== null && attendance < campusPolicies.attendanceWarningPercent ? `${attendance}%` : 0, tone: data.attendanceRate !== null && attendance < campusPolicies.attendanceWarningPercent ? "warning" as const : "good" as const },
    { detail: "Queued or running agent workflows awaiting evidence review", href: "/agents", label: "Active agent runs", value: data.activeAgentRuns, tone: data.activeAgentRuns ? "warning" as const : "good" as const },
  ];

  return <section>
    <OperationsHeader actions={<Link className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700" href="/analytics">Open analytics <ArrowRight className="size-4" /></Link>} description="A live operating picture across student success, schedules, and agent activity." eyebrow="Faculty operations" title="Good morning. Here is today’s faculty overview." />
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
        <div className="flex items-start justify-between"><div><h2 className="font-semibold text-slate-950">Faculty health</h2><p className="mt-1 text-sm text-slate-500">Live academic continuity</p></div><span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><Activity className="size-5" /></span></div>
        <div className="mt-6 space-y-5">
          <div><div className="mb-2 flex items-center justify-between text-sm"><span className="font-medium text-slate-700">Attendance participation</span><span className="font-mono font-semibold text-slate-900">{data.attendanceRate === null ? "—" : `${attendance}%`}</span></div><ProgressBar tone={attendance >= campusPolicies.attendanceWarningPercent ? "emerald" : "amber"} value={attendance} /></div>
          <div><div className="mb-2 flex items-center justify-between text-sm"><span className="font-medium text-slate-700">Teaching continuity</span><span className="font-mono font-semibold text-slate-900">{Math.max(0, 100 - data.scheduleConflicts * 10)}%</span></div><ProgressBar tone={data.scheduleConflicts ? "amber" : "emerald"} value={Math.max(0, 100 - data.scheduleConflicts * 10)} /></div>
        </div>
      </Card>
    </div>

    {mode === "live" ? <Card className="mt-6 overflow-hidden">
      <SectionHeader action={<Link className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:underline" href="/performance">Performance <ArrowRight className="size-4" /></Link>} description="Numbers are read from each platform for the usernames students link in their workspace, and refreshed nightly." title="Student coding profiles" />
      {platforms ? <div className="grid gap-px bg-slate-100 sm:grid-cols-3 xl:grid-cols-6">
        <div className="bg-white p-5"><p className="flex items-center gap-2 text-xs font-medium text-slate-500"><Code2 className="size-3.5" />Students linked</p><p className="mt-2 text-2xl font-semibold text-slate-950">{profilesByStudent.size}<span className="text-sm font-normal text-slate-500"> / {totalStudents}</span></p><p className="mt-1 text-xs text-slate-500">Avg readiness {averageReadiness === null ? "—" : `${averageReadiness}%`}</p></div>
        {codingPlatforms.map((platform) => { const item = coverage.find((entry) => entry.platform === platform); return <div className="bg-white p-5" key={platform}><p className="flex items-center gap-2 text-xs font-medium text-slate-500"><span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: platformCatalog[platform].accent }} />{platformCatalog[platform].label}</p><p className="mt-2 text-2xl font-semibold text-slate-950">{item?.linkedStudents ?? 0}</p><p className="mt-1 text-xs text-slate-500">{item?.averageReadiness === null || item === undefined ? "no profiles yet" : `avg readiness ${item.averageReadiness}%`}</p></div>; })}
      </div> : <p className="p-5 text-sm text-slate-500 sm:px-6">Coding profile data could not be loaded.</p>}
      {platforms && !profilesByStudent.size ? <p className="border-t border-slate-100 px-5 py-4 text-sm text-slate-500 sm:px-6">No student has linked a profile yet. Students add their usernames from <span className="font-medium text-slate-700">My coding profiles</span> in their workspace.</p> : null}
    </Card> : null}

    <Card className="mt-6 overflow-hidden">
      <SectionHeader description="Move directly into the faculty workflows used most often." title="Operational shortcuts" />
      <div className="grid sm:grid-cols-3">{quickActions.map(({ description, href, icon: Icon, label }, index) => <Link className={`group p-5 transition hover:bg-blue-50/50 sm:p-6 ${index > 0 ? "border-t border-slate-100 sm:border-l sm:border-t-0" : ""}`} href={href} key={href}><span className="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 group-hover:border-blue-200 group-hover:text-blue-700"><Icon className="size-4.5" /></span><p className="mt-4 text-sm font-semibold text-slate-900">{label}</p><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p></Link>)}</div>
    </Card>

    <Card className="mt-6 border-blue-200 bg-blue-50/60 p-5 sm:p-6"><div className="flex flex-col gap-5 sm:flex-row sm:items-center"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-blue-700 shadow-sm"><Sparkles className="size-5" /></span><div className="flex-1"><h2 className="font-semibold text-slate-950">Coordinator agent chain</h2><p className="mt-1 text-sm leading-6 text-slate-600">Attendance, performance, and schedule conflicts are evaluated in sequence. Privileged decisions remain queued for human review.</p></div><Link className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700" href="/agents">Review evidence <ArrowRight className="size-4" /></Link></div></Card>
  </section>;
}
