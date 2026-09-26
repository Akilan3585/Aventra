import { Activity, AlertTriangle, BrainCircuit, CalendarDays, Code2, TrendingDown, TrendingUp, UserX } from "lucide-react";
import Link from "next/link";

import { OperationsHeader, OperationsMetrics, SectionHeader, StatusPill, WorkspaceBanner } from "@/components/operations/operations-ui";
import { Card } from "@/design-system/primitives/card";
import {
  attendanceTrend,
  departmentAttendance,
  isAnalyticsRange,
  rangeDates,
  statusBreakdown,
  studentsBelowThreshold,
  trendDelta,
  type AnalyticsRange,
} from "@/features/analytics/domain/analytics-rules";
import { loadAnalyticsDataset, type AnalyticsDataset } from "@/features/analytics/infrastructure/analytics.repository";
import { AttendanceTrendChart, DepartmentBars, StatusBreakdownBar } from "@/features/analytics/presentation/analytics-charts";
import { AnalyticsControls } from "@/features/analytics/presentation/analytics-controls";
import { calculateAttendanceRate } from "@/features/attendance/domain/attendance-rules";
import { campusPolicies } from "@/features/operations/domain/operations-rules";
import { loadScheduleWorkspace } from "@/features/operations/infrastructure/campus-operations.repository";
import { codingPlatforms, platformCatalog, summarizePlatformCoverage } from "@/features/performance/domain/platform-performance";
import { loadPlatformPerformanceWorkspace } from "@/features/performance/infrastructure/platform-performance.repository";
import { listStudentDirectory } from "@/features/students/infrastructure/student.repository";
import { resolveWorkspaceAccess } from "@/server/workspace/workspace-access";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function AnalyticsPage({ searchParams }: { searchParams: SearchParams }) {
  const [access, params] = await Promise.all([resolveWorkspaceAccess("reports:read"), searchParams]);
  const rangeParam = first(params.range);
  const range: AnalyticsRange = isAnalyticsRange(rangeParam) ? (Number(rangeParam) as AnalyticsRange) : 30;
  const departmentParam = (first(params.department) ?? "").trim().slice(0, 16) || null;
  const today = new Date().toISOString().slice(0, 10);
  const dates = rangeDates(today, range);
  const facultyProfileId = access.mode === "live" && access.role === "faculty" ? access.profileId ?? undefined : undefined;

  let dataset: AnalyticsDataset | null = null;
  let students: Awaited<ReturnType<typeof listStudentDirectory>> = [];
  let schedules: Awaited<ReturnType<typeof loadScheduleWorkspace>> | null = null;
  let platforms: Awaited<ReturnType<typeof loadPlatformPerformanceWorkspace>> | null = null;
  if (access.mode === "live") {
    const [datasetResult, studentsResult, schedulesResult, platformsResult] = await Promise.allSettled([
      loadAnalyticsDataset({ departmentCode: departmentParam ?? undefined, facultyProfileId, from: dates[0], to: today }),
      listStudentDirectory(facultyProfileId),
      loadScheduleWorkspace(facultyProfileId),
      loadPlatformPerformanceWorkspace(),
    ]);
    dataset = datasetResult.status === "fulfilled" ? datasetResult.value : null;
    students = studentsResult.status === "fulfilled" ? studentsResult.value : [];
    schedules = schedulesResult.status === "fulfilled" ? schedulesResult.value : null;
    platforms = platformsResult.status === "fulfilled" ? platformsResult.value : null;
  }
  const mode = access.mode === "live" && !dataset ? "error" : access.mode;
  const department = dataset?.departments.some((item) => item.code === departmentParam) ? departmentParam : null;
  const records = dataset?.records ?? [];
  const threshold = campusPolicies.attendanceWarningPercent;

  const trend = attendanceTrend(records, dates);
  const delta = trendDelta(trend);
  const rate = calculateAttendanceRate(records.map((record) => record.status));
  const breakdown = statusBreakdown(records);
  const departments = departmentAttendance(records);
  const atRisk = studentsBelowThreshold(records, threshold);
  const studentsMarked = new Set(records.map((record) => record.studentId)).size;
  const activeDays = trend.filter((point) => point.marked > 0).length;

  const scopedStudents = department ? students.filter((student) => student.departmentCode === department) : students;
  const risk = [
    { color: "bg-rose-500", label: "High priority", value: scopedStudents.filter((student) => student.riskLevel === "high").length },
    { color: "bg-amber-500", label: "Monitor", value: scopedStudents.filter((student) => student.riskLevel === "medium").length },
    { color: "bg-emerald-500", label: "On track", value: scopedStudents.filter((student) => student.riskLevel === "low").length },
    { color: "bg-slate-300", label: "Needs data", value: scopedStudents.filter((student) => student.riskLevel === "insufficient-data").length },
  ];
  const coverage = summarizePlatformCoverage((platforms?.profiles ?? [])
    .filter((item) => !department || item.students.departments?.code === department)
    .map((item) => ({ platform: item.platform, score: Number(item.score), studentId: item.student_id })));

  return <section>
    <OperationsHeader description="Live attendance trends, department comparisons, at-risk students, and coding readiness. Change the range or department and every chart recalculates from the source records." eyebrow="Intelligence" title="Campus analytics." />
    <WorkspaceBanner mode={mode} />
    {mode === "live" && dataset ? <>
      <AnalyticsControls department={department} departments={dataset.departments} generatedAt={new Date().toISOString()} range={range} />

      <OperationsMetrics metrics={[
        { detail: `last ${range} days${department ? ` · ${department}` : ""}`, icon: Activity, label: "Attendance rate", trend: delta === null ? undefined : { direction: delta >= 0 ? "up" : "down", label: `${delta >= 0 ? "+" : ""}${delta} pts vs first half`, positive: delta >= 0 }, value: rate === null ? "—" : `${rate}%` },
        { detail: `of ${dataset.totalStudents} students have marks in range`, icon: CalendarDays, label: "Students marked", value: studentsMarked },
        { detail: `below the ${threshold}% policy in this range`, icon: UserX, label: "At-risk students", value: atRisk.length },
        { detail: `days with sessions out of ${range}`, icon: TrendingUp, label: "Active days", value: activeDays },
      ]} />

      <Card className="mt-6 overflow-hidden">
        <SectionHeader description="Daily attendance rate. Red points fall below the policy line; hover a point for its counts." title="Attendance trend" />
        <div className="p-5 sm:p-6"><AttendanceTrendChart points={trend} threshold={threshold} /></div>
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card className="overflow-hidden"><SectionHeader description="Every mark in the range by status. Permission, leave, and excused are excluded from the rate." title="Status breakdown" /><div className="p-5 sm:p-6"><StatusBreakdownBar items={breakdown} /></div></Card>
        <Card className="overflow-hidden"><SectionHeader description={`Rate per department; the thin line marks the ${threshold}% policy.`} title="Department comparison" /><div className="p-5 sm:p-6"><DepartmentBars items={departments} threshold={threshold} /></div></Card>
      </div>

      <Card className="mt-6 overflow-hidden">
        <SectionHeader action={<Link className="text-sm font-semibold text-blue-700 hover:underline" href="/attendance">Open attendance</Link>} description={`Students whose attendance in the last ${range} days is below ${threshold}%, lowest first.`} title="Students needing attention" />
        {atRisk.length ? <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-6 py-3">Student</th><th className="px-4 py-3">Dept</th><th className="px-4 py-3">Sessions</th><th className="px-4 py-3">Absences</th><th className="px-4 py-3">Rate</th></tr></thead><tbody className="divide-y divide-slate-100">{atRisk.slice(0, 25).map((student) => <tr key={student.studentId}>
          <td className="px-6 py-3"><p className="text-sm font-semibold text-slate-900">{student.studentName}</p><p className="font-mono text-xs text-slate-500">{student.studentNumber}</p></td>
          <td className="px-4 py-3 text-sm text-slate-600">{student.department}</td>
          <td className="px-4 py-3 font-mono text-sm text-slate-700">{student.sessions}</td>
          <td className="px-4 py-3 font-mono text-sm text-slate-700">{student.absences}</td>
          <td className="px-4 py-3"><StatusPill tone={student.rate < campusPolicies.attendanceEmailAlertPercent ? "critical" : "warning"}>{student.rate}%</StatusPill></td>
        </tr>)}</tbody></table></div> : <p className="flex items-center gap-2 p-5 text-sm text-slate-500 sm:px-6"><TrendingDown className="size-4 text-emerald-600" />{records.length ? "No student is below the policy in this range." : "No attendance recorded in this range yet."}</p>}
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <Card className="overflow-hidden"><SectionHeader description="Explainable risk from attendance, internal marks, and results for the students in scope." title="Student success distribution" /><div className="p-5 sm:p-6">
          <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">{risk.map((segment) => <span className={segment.color} key={segment.label} style={{ width: `${scopedStudents.length ? (segment.value / scopedStudents.length) * 100 : 0}%` }} />)}</div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">{risk.map((segment) => <div className="flex items-center justify-between rounded-xl border border-slate-100 p-3" key={segment.label}><span className="flex items-center gap-2 text-sm text-slate-700"><span className={`size-2.5 rounded-full ${segment.color}`} />{segment.label}</span><span className="font-mono text-sm font-semibold text-slate-900">{segment.value}</span></div>)}</div>
        </div></Card>

        <Card className="overflow-hidden"><SectionHeader description="Timetable constraints and seat use for the classes in scope." title="Teaching continuity" /><div className="grid grid-cols-2 gap-px bg-slate-100">
          {[{ icon: AlertTriangle, label: "Schedule exceptions", value: schedules?.conflicts ?? "—" }, { icon: CalendarDays, label: "Sessions today", value: schedules?.todaySessions ?? "—" }, { icon: Activity, label: "Seat utilisation", value: schedules ? `${schedules.utilizationPercent}%` : "—" }, { icon: BrainCircuit, label: "High-priority students", value: risk[0].value }].map(({ icon: Icon, label, value }) => <div className="bg-white p-5" key={label}><p className="flex items-center gap-2 text-xs font-medium text-slate-500"><Icon className="size-3.5" />{label}</p><p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p></div>)}
        </div></Card>
      </div>

      <Card className="mt-6 overflow-hidden">
        <SectionHeader action={<Link className="text-sm font-semibold text-blue-700 hover:underline" href="/performance">Open performance</Link>} description="Students linked and average readiness per platform, from profiles fetched from each site." title="Coding readiness" />
        <div className="grid gap-px bg-slate-100 sm:grid-cols-5">{codingPlatforms.map((platform) => { const item = coverage.find((entry) => entry.platform === platform); return <div className="bg-white p-5" key={platform}>
          <p className="flex items-center gap-2 text-xs font-medium text-slate-500"><span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: platformCatalog[platform].accent }} />{platformCatalog[platform].label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{item?.linkedStudents ?? 0}<span className="ml-1 text-xs font-normal text-slate-500">linked</span></p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full" style={{ backgroundColor: platformCatalog[platform].accent, width: `${item?.averageReadiness ?? 0}%` }} /></div>
          <p className="mt-1.5 text-xs text-slate-500">{item?.averageReadiness === null || !item ? "no profiles yet" : `avg readiness ${item.averageReadiness}%`}</p>
        </div>; })}</div>
        {!platforms?.profiles.length ? <p className="flex items-center gap-2 border-t border-slate-100 px-5 py-4 text-sm text-slate-500 sm:px-6"><Code2 className="size-4" />No coding profiles linked yet. Students add them from My coding profiles in their workspace.</p> : null}
      </Card>
    </> : null}
  </section>;
}
