import Link from "next/link";
import { AlertTriangle, Bot, CalendarDays, CheckCircle2, ClipboardCheck, Code2, GraduationCap, Sparkles, UserCheck } from "lucide-react";
import { redirect } from "next/navigation";

import { StatusPill, WorkspaceBanner } from "@/components/operations/operations-ui";
import { campusPolicies } from "@/features/operations/domain/operations-rules";
import { loadCampusDashboard } from "@/features/operations/infrastructure/campus-operations.repository";
import { codingPlatforms, platformCatalog, summarizePlatformCoverage, summarizeStudentPlatforms } from "@/features/performance/domain/platform-performance";
import { loadPlatformPerformanceWorkspace, type PlatformPerformanceWorkspace } from "@/features/performance/infrastructure/platform-performance.repository";
import { getCampusAccess } from "@/server/auth/campus-access";
import { isSupabaseAdminConfigured } from "@/server/supabase/admin-client";
import { cn } from "@/lib/utils";
import { resolveWorkspaceAccess } from "@/server/workspace/workspace-access";

import { AttendanceGauge, Bezel, Eyebrow, PillLink, RowArrow } from "./dashboard-ui";

export const dynamic = "force-dynamic";

const quickActions = [
  { description: "Review support risk and roster signals", href: "/students", icon: GraduationCap, label: "Student success" },
  { description: "Record sessions and review participation risk", href: "/attendance", icon: ClipboardCheck, label: "Attendance desk" },
  { description: "Inspect decisions and evidence", href: "/agents", icon: Bot, label: "AI agent review" },
];

const agentChain = [
  { detail: "Participation against the support threshold", human: false, label: "Attendance" },
  { detail: "Coursework and coding-profile signals", human: false, label: "Performance" },
  { detail: "Teaching sessions that overlap", human: false, label: "Schedule conflicts" },
  { detail: "Faculty approve or dismiss each decision", human: true, label: "Human review" },
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

  const attendanceHealthy = attendance >= campusPolicies.attendanceWarningPercent;
  const continuity = Math.max(0, 100 - data.scheduleConflicts * 10);
  const openAlerts = alerts.filter((alert) => alert.tone !== "good").length;
  const heroStats = [
    { icon: GraduationCap, label: "Students", note: "verified roster", value: data.students },
    { icon: CalendarDays, label: "Sessions today", note: "teaching sessions", value: data.todaySessions },
    { icon: Bot, label: "Agent runs", note: "queued or running", value: data.activeAgentRuns },
  ];
  const statusLabel = mode === "live" ? "Live" : mode === "configuration" ? "Setup needed" : mode === "forbidden" ? "Restricted" : "Offline";

  return <section>
    {mode !== "live" ? <div className="mb-5 [&>*]:mt-0"><WorkspaceBanner mode={mode} /></div> : null}

    <div className="grid gap-4 xl:grid-cols-12">
      {/* Hero: identity, primary actions and the three headline counts. */}
      <Bezel className="xl:col-span-8" coreClassName="dashboard-hero-mesh bg-slate-950 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_30px_60px_-30px_rgba(20,30,80,0.55)]">
        <div aria-hidden className="aurora-orb absolute -right-16 -top-24 size-72 rounded-full bg-[radial-gradient(circle,oklch(0.7_0.14_258/0.35),transparent_65%)]" />
        <div className="relative flex h-full flex-col p-6 sm:p-9">
          <div className="flex flex-wrap items-center gap-2">
            <Eyebrow dark><span className={cn("size-1.5 rounded-full", mode === "live" ? "live-dot bg-emerald-400" : "bg-amber-400")} />{statusLabel}</Eyebrow>
            <Eyebrow dark>Faculty operations</Eyebrow>
          </div>
          <h1 className="mt-6 max-w-xl text-4xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-[3.4rem]">
            Student <span className="bg-gradient-to-r from-white via-blue-200 to-blue-400 bg-clip-text text-transparent">management</span>
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-6 text-white/60">A live operating picture across student success, schedules, and agent activity.</p>
          <div className="mt-7 flex flex-wrap gap-2.5">
            <PillLink href="/analytics">Open analytics</PillLink>
            <PillLink href="/reports" variant="ghost">Reports</PillLink>
          </div>
          <div aria-hidden className="min-h-10 flex-1" />
          <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/10">
            {heroStats.map(({ icon: Icon, label, note, value }) => <div className="bg-[oklch(0.17_0.035_267)] px-4 py-4 sm:px-5" key={label}>
              <dt className="flex items-center gap-1.5 text-[11px] font-medium text-white/50 sm:text-xs"><Icon aria-hidden className="size-3.5" strokeWidth={1.5} />{label}</dt>
              <dd className="mt-2 text-2xl font-semibold tracking-[-0.03em] tabular-nums sm:text-[2rem]">{value}</dd>
              <dd className="mt-0.5 hidden text-xs text-white/40 sm:block">{note}</dd>
            </div>)}
          </dl>
        </div>
      </Bezel>

      {/* Attendance ring: the one policy number every faculty lead checks first. */}
      <Bezel className="xl:col-span-4" delay={0.08}>
        <div className="flex h-full flex-col p-6 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <Eyebrow>Attendance</Eyebrow>
            {data.attendanceRate === null ? <StatusPill>pending</StatusPill> : <StatusPill tone={attendanceHealthy ? "good" : "warning"}>{attendanceHealthy ? "healthy" : "needs review"}</StatusPill>}
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-6 py-6 sm:flex-row xl:flex-col">
            <AttendanceGauge healthy={attendanceHealthy} target={campusPolicies.attendanceWarningPercent} value={data.attendanceRate === null ? null : attendance} />
            <div className="w-full space-y-4 sm:flex-1 xl:flex-none">
              <p className="flex items-center justify-between text-[13px] text-slate-500"><span className="inline-flex items-center gap-2"><span aria-hidden className="size-2.5 rounded-full border-2 border-slate-600 bg-white" />Policy floor</span><span className="font-semibold text-slate-900 tabular-nums">{campusPolicies.attendanceWarningPercent}%</span></p>
              <div>
                <p className="flex items-center justify-between text-[13px] text-slate-500"><span>Teaching continuity</span><span className="font-semibold text-slate-900 tabular-nums">{continuity}%</span></p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-900/[0.06]"><div className={cn("progress-reveal h-full origin-left rounded-full", data.scheduleConflicts ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${continuity}%` }} /></div>
                <p className="mt-1.5 text-xs text-slate-400">{data.scheduleConflicts ? `${data.scheduleConflicts} schedule conflict${data.scheduleConflicts === 1 ? "" : "s"}` : "No schedule conflicts"}</p>
              </div>
            </div>
          </div>
        </div>
      </Bezel>

      {/* Exceptions queue. */}
      <Bezel className="xl:col-span-7" delay={0.16}>
        <div className="p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div><h2 className="text-lg font-semibold tracking-[-0.02em] text-slate-950">Requires attention</h2><p className="mt-1 text-[13px] text-slate-500">Ranked by operational impact. Every action stays human-controlled.</p></div>
            <span className={cn("grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold tabular-nums", openAlerts ? "bg-amber-100 text-amber-800" : "bg-emerald-50 text-emerald-700")}>{openAlerts}</span>
          </div>
          <ul className="mt-5 space-y-2">{alerts.map((alert) => {
            const needsAction = alert.tone !== "good";
            const Icon = needsAction ? AlertTriangle : CheckCircle2;
            return <li key={alert.label}><Link className="group flex items-center gap-4 rounded-2xl bg-slate-900/[0.025] p-3 pr-3 ring-1 ring-inset ring-transparent transition-[background-color,box-shadow] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white hover:shadow-[0_12px_30px_-18px_rgba(30,41,82,0.35)] hover:ring-slate-900/[0.06]" href={alert.href}>
              <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", needsAction ? "bg-amber-100/80 text-amber-700" : "bg-white text-emerald-600 shadow-[0_1px_2px_rgba(15,23,42,0.06)]")}><Icon aria-hidden className="size-5" strokeWidth={1.5} /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-900">{alert.label}</span><span className="mt-0.5 block text-[13px] leading-5 text-slate-500">{alert.detail}</span></span>
              <span className="hidden sm:block"><StatusPill tone={alert.tone}>{alert.value || "clear"}</StatusPill></span>
              <RowArrow />
            </Link></li>;
          })}</ul>
        </div>
      </Bezel>

      {/* Shortcuts. */}
      <Bezel className="xl:col-span-5" delay={0.22}>
        <div className="p-6 sm:p-7">
          <h2 className="text-lg font-semibold tracking-[-0.02em] text-slate-950">Jump back in</h2>
          <p className="mt-1 text-[13px] text-slate-500">The faculty workflows used most often.</p>
          <ul className="mt-5 space-y-2">{quickActions.map(({ description, href, icon: Icon, label }) => <li key={href}><Link className="group flex items-center gap-4 rounded-2xl p-3 transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-slate-900/[0.035]" href={href}>
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-50 to-white text-blue-700 ring-1 ring-inset ring-blue-100"><Icon aria-hidden className="size-5" strokeWidth={1.5} /></span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-900">{label}</span><span className="mt-0.5 block text-[13px] leading-5 text-slate-500">{description}</span></span>
            <RowArrow />
          </Link></li>)}</ul>
        </div>
      </Bezel>

      {mode === "live" ? <Bezel className="xl:col-span-12" delay={0.28}>
        <div className="p-6 sm:p-7">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div><Eyebrow><Code2 aria-hidden className="size-3" strokeWidth={1.75} />Coding profiles</Eyebrow><h2 className="mt-3 text-lg font-semibold tracking-[-0.02em] text-slate-950">Student coding readiness</h2><p className="mt-1 max-w-2xl text-[13px] text-slate-500">Read from each platform for the usernames students link in their workspace, refreshed nightly.</p></div>
            <PillLink href="/performance" variant="ink">View performance</PillLink>
          </div>
          {platforms ? <dl className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
            <div className="rounded-2xl bg-slate-950 p-4 text-white"><dt className="text-xs font-medium text-white/55">Students linked</dt><dd className="mt-3 text-[1.75rem] font-semibold leading-none tracking-[-0.03em] tabular-nums">{profilesByStudent.size}<span className="text-sm font-normal text-white/40"> / {totalStudents}</span></dd><dd className="mt-2 text-xs text-white/50">Avg readiness {averageReadiness === null ? "—" : `${averageReadiness}%`}</dd></div>
            {codingPlatforms.map((platform) => { const item = coverage.find((entry) => entry.platform === platform); return <div className="relative overflow-hidden rounded-2xl bg-slate-900/[0.03] p-4 ring-1 ring-inset ring-slate-900/[0.04]" key={platform}><span aria-hidden className="absolute inset-x-0 top-0 h-0.5" style={{ backgroundColor: platformCatalog[platform].accent }} /><dt className="text-xs font-medium text-slate-500">{platformCatalog[platform].label}</dt><dd className="mt-3 text-[1.75rem] font-semibold leading-none tracking-[-0.03em] text-slate-950 tabular-nums">{item?.linkedStudents ?? 0}</dd><dd className="mt-2 text-xs text-slate-500">{item?.averageReadiness === null || item === undefined ? "No profiles yet" : `Avg readiness ${item.averageReadiness}%`}</dd></div>; })}
          </dl> : <p className="mt-6 text-sm text-slate-500">Coding profile data could not be loaded.</p>}
          {platforms && !profilesByStudent.size ? <p className="mt-4 text-[13px] text-slate-500">No student has linked a profile yet. Students add their usernames from <span className="font-medium text-slate-700">My coding profiles</span> in their workspace.</p> : null}
        </div>
      </Bezel> : null}

      {/* Coordinator chain as a horizontal stepper. */}
      <Bezel className="xl:col-span-12" delay={0.32}>
        <div className="grid gap-8 p-6 sm:p-7 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] lg:items-center">
          <div>
            <Eyebrow><Sparkles aria-hidden className="size-3" strokeWidth={1.75} />Coordinator agent</Eyebrow>
            <h2 className="mt-3 text-lg font-semibold tracking-[-0.02em] text-slate-950">Evaluated in sequence, approved by people</h2>
            <p className="mt-1 text-[13px] leading-5 text-slate-500">Privileged decisions stay queued for human review.</p>
            <div className="mt-5"><PillLink href="/agents" variant="ink">Review evidence</PillLink></div>
          </div>
          <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{agentChain.map((step, index) => <li className={cn("relative rounded-2xl p-4", step.human ? "bg-slate-950 text-white" : "bg-slate-900/[0.03] ring-1 ring-inset ring-slate-900/[0.04]")} key={step.label}>
            <span className={cn("grid size-8 place-items-center rounded-full text-xs font-semibold tabular-nums", step.human ? "bg-white/10 text-white" : "bg-white text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.08)]")}>{step.human ? <UserCheck aria-hidden className="size-4" strokeWidth={1.75} /> : `0${index + 1}`}</span>
            <p className={cn("mt-4 text-sm font-semibold", step.human ? "text-white" : "text-slate-900")}>{step.label}</p>
            <p className={cn("mt-1 text-xs leading-5", step.human ? "text-white/55" : "text-slate-500")}>{step.detail}</p>
            {index < agentChain.length - 1 ? <span aria-hidden className="absolute -right-2.5 top-8 z-10 hidden h-px w-4 bg-slate-300 xl:block" /> : null}
          </li>)}</ol>
        </div>
      </Bezel>
    </div>
  </section>;
}
