import { Code2, Link2, Sparkles, Trophy, UserX } from "lucide-react";

import { OperationsMetrics, ProgressBar, SectionHeader, StatusPill } from "@/components/operations/operations-ui";
import { Card } from "@/design-system/primitives/card";
import { AdministrationTable } from "@/features/administration/presentation/administration-table";
import {
  codingPlatforms,
  platformCatalog,
  platformReadiness,
  readinessBand,
  summarizePlatformCoverage,
  summarizeStudentPlatforms,
  type CodingPlatform,
  type ReadinessBand,
} from "@/features/performance/domain/platform-performance";
import type { PlatformProfileRecord } from "@/features/performance/infrastructure/platform-performance.repository";

const bandTone: Record<ReadinessBand, "good" | "neutral" | "warning"> = { advanced: "good", developing: "neutral", emerging: "warning", expert: "good", starter: "warning" };
const formatDate = (value: string) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
const formatNumber = (value: number) => new Intl.NumberFormat("en-IN").format(value);

function PlatformMark({ platform }: { platform: CodingPlatform }) {
  return <span aria-hidden className="inline-block size-2.5 shrink-0 rounded-full" style={{ backgroundColor: platformCatalog[platform].accent }} />;
}

function PlatformChip({ platform, readiness }: { platform: CodingPlatform; readiness: number }) {
  return <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-700"><PlatformMark platform={platform} />{platformCatalog[platform].label}<span className="font-mono text-slate-500">{readiness}%</span></span>;
}

export function PlatformPerformanceDashboard({ mode, profiles, totalStudents }: { mode: "error" | "live"; profiles: PlatformProfileRecord[]; totalStudents: number }) {
  const coverage = summarizePlatformCoverage(profiles.map((item) => ({ platform: item.platform, score: Number(item.score), studentId: item.student_id })));
  const byStudent = new Map<string, PlatformProfileRecord[]>();
  for (const profile of profiles) byStudent.set(profile.student_id, [...(byStudent.get(profile.student_id) ?? []), profile]);
  const leaderboard = [...byStudent.entries()]
    .map(([studentId, records]) => ({ records, studentId, summary: summarizeStudentPlatforms(records.map((item) => ({ platform: item.platform, score: Number(item.score) }))), updatedAt: records.reduce((latest, item) => (item.updated_at > latest ? item.updated_at : latest), records[0].updated_at) }))
    .sort((left, right) => (right.summary.compositeReadiness ?? 0) - (left.summary.compositeReadiness ?? 0) || right.summary.linkedPlatforms - left.summary.linkedPlatforms)
    .slice(0, 25);
  const linkedStudents = byStudent.size;
  const averageReadiness = leaderboard.length ? Math.round([...byStudent.values()].reduce((sum, records) => sum + (summarizeStudentPlatforms(records.map((item) => ({ platform: item.platform, score: Number(item.score) }))).compositeReadiness ?? 0), 0) / byStudent.size) : 0;
  const unlinkedStudents = Math.max(0, totalStudents - linkedStudents);

  return <div className="mt-10">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Platform performance</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-slate-950">LinkedIn, HackerRank, CodeChef, LeetCode, and GitHub</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Each snapshot is normalized to a 0–100 readiness score from the platform&apos;s own scale, so profiles can be compared side by side. Readiness bands are deterministic and explainable.</p></div>{mode === "error" ? <StatusPill tone="warning">platform data unavailable</StatusPill> : null}</div>
    {mode === "error" ? <Card className="mt-6 border-amber-200 bg-amber-50/70 p-5 text-sm leading-6 text-slate-600">The platform metrics query failed. Apply the <span className="font-mono text-xs">20260923150000_add_student_platform_profiles.sql</span> migration to the Supabase project and reload.</Card> : null}

    <OperationsMetrics metrics={[
      { detail: `of ${formatNumber(totalStudents)} students have at least one linked profile`, icon: Link2, label: "Students linked", value: linkedStudents },
      { detail: "platform snapshots on record", icon: Code2, label: "Snapshots", value: profiles.length },
      { detail: "mean composite readiness across linked students", icon: Sparkles, label: "Average readiness", value: `${averageReadiness}%` },
      { detail: "students with no external profile recorded yet", icon: UserX, label: "Not linked", value: unlinkedStudents },
    ]} />

    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {coverage.map((item) => {
        const definition = platformCatalog[item.platform];
        const readiness = item.averageReadiness ?? 0;
        return <Card className="p-5" key={item.platform}>
          <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-sm font-semibold text-slate-900"><PlatformMark platform={item.platform} />{definition.label}</span>{item.averageReadiness === null ? <StatusPill>no data</StatusPill> : <StatusPill tone={bandTone[readinessBand(readiness)]}>{readinessBand(readiness)}</StatusPill>}</div>
          <p className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">{item.linkedStudents}</p>
          <p className="text-xs text-slate-500">students linked{totalStudents ? ` · ${Math.round((item.linkedStudents / totalStudents) * 100)}% of campus` : ""}</p>
          <div className="mt-4"><div className="mb-1.5 flex items-center justify-between text-xs"><span className="text-slate-500">Avg readiness</span><span className="font-mono font-semibold text-slate-900">{item.averageReadiness === null ? "—" : `${item.averageReadiness}%`}</span></div><ProgressBar tone="blue" value={readiness} /></div>
          <p className="mt-3 text-xs text-slate-500">Avg {definition.scoreLabel.toLowerCase()}: <span className="font-mono font-semibold text-slate-800">{item.averageScore === null ? "—" : formatNumber(item.averageScore)}</span></p>
        </Card>;
      })}
    </div>

    <Card className="mt-6 overflow-hidden">
      <SectionHeader description="Students ranked by composite readiness across every platform they have linked. Ties break on the number of linked platforms." title="Student leaderboard" />
      {leaderboard.length ? <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-6 py-3">#</th><th className="px-4 py-3">Student</th><th className="px-4 py-3">Platforms</th><th className="px-4 py-3">Composite readiness</th><th className="px-4 py-3">Strongest</th><th className="px-4 py-3">Updated</th></tr></thead><tbody className="divide-y divide-slate-100">{leaderboard.map((row, index) => {
        const student = row.records[0].students;
        const composite = row.summary.compositeReadiness ?? 0;
        return <tr className="transition hover:bg-slate-50/70" key={row.studentId}>
          <td className="px-6 py-4 font-mono text-sm text-slate-500">{index + 1}</td>
          <td className="px-4 py-4"><p className="text-sm font-semibold text-slate-900">{student.profiles?.display_name ?? "Profile not linked"}</p><p className="font-mono text-xs text-slate-500">{student.student_number}{student.departments ? ` · ${student.departments.code}` : ""} · Sem {student.semester}</p></td>
          <td className="px-4 py-4"><div className="flex flex-wrap gap-1.5">{codingPlatforms.filter((platform) => row.records.some((item) => item.platform === platform)).map((platform) => <PlatformChip key={platform} platform={platform} readiness={platformReadiness(platform, Number(row.records.find((item) => item.platform === platform)?.score))} />)}</div></td>
          <td className="px-4 py-4"><div className="flex items-center gap-3"><div className="w-28"><ProgressBar tone="blue" value={composite} /></div><span className="font-mono text-sm font-semibold text-slate-900">{composite}%</span><StatusPill tone={bandTone[readinessBand(composite)]}>{readinessBand(composite)}</StatusPill></div></td>
          <td className="px-4 py-4">{row.summary.strongest ? <span className="flex items-center gap-2 text-sm text-slate-700"><Trophy className="size-3.5 text-amber-500" />{platformCatalog[row.summary.strongest.platform].label}</span> : <span className="text-sm text-slate-400">—</span>}</td>
          <td className="px-4 py-4 text-sm text-slate-600">{formatDate(row.updatedAt)}</td>
        </tr>;
      })}</tbody></table></div> : <div className="grid min-h-48 place-items-center px-6 py-12 text-center"><div className="max-w-sm"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-blue-50 text-primary"><Trophy className="size-6" /></span><h3 className="mt-5 font-semibold text-slate-950">No platform snapshots yet.</h3><p className="mt-2 text-sm leading-6 text-slate-500">Students add their GitHub, LeetCode, CodeChef, or HackerRank usernames under My coding profiles in their workspace, or use Link platform profile here. Numbers are fetched from each site automatically.</p></div></div>}
    </Card>

    <AdministrationTable columns={["Student", "Platform", "Handle", "Score", "Activity", "Tier", "Readiness", "Recorded"]} description="Latest snapshot per student per platform. GitHub, LeetCode, CodeChef, and HackerRank refresh nightly or with Refresh metrics; LinkedIn is entered by hand." emptyDescription="Snapshots appear here once a platform profile is linked." emptyIcon={Code2} emptyTitle="No platform snapshots." rows={profiles.map((item) => {
      const definition = platformCatalog[item.platform];
      const readiness = platformReadiness(item.platform, Number(item.score));
      return { id: item.id, cells: [
        <div key="student"><p className="text-sm font-semibold text-slate-900">{item.students.profiles?.display_name ?? "Profile not linked"}</p><p className="font-mono text-xs text-slate-500">{item.students.student_number}</p></div>,
        <span className="flex items-center gap-2 text-sm text-slate-700" key="platform"><PlatformMark platform={item.platform} />{definition.label}</span>,
        <a className="text-sm font-medium text-blue-700 hover:underline" href={item.profile_url} key="handle" rel="noreferrer noopener" target="_blank">@{item.handle}</a>,
        <span className="text-sm text-slate-700" key="score"><span className="font-mono font-semibold text-slate-900">{formatNumber(Number(item.score))}</span> <span className="text-xs text-slate-500">{definition.scoreLabel.toLowerCase()}</span></span>,
        <span className="text-sm text-slate-700" key="activity">{item.activity_count === null ? <span className="text-slate-400">—</span> : <><span className="font-mono font-semibold text-slate-900">{formatNumber(item.activity_count)}</span> <span className="text-xs text-slate-500">{definition.activityLabel.toLowerCase()}</span></>}</span>,
        <span className="text-sm text-slate-700" key="tier">{item.tier ?? <span className="text-slate-400">—</span>}</span>,
        <span className="flex items-center gap-2" key="readiness"><span className="font-mono text-sm font-semibold text-slate-900">{readiness}%</span><StatusPill tone={bandTone[readinessBand(readiness)]}>{readinessBand(readiness)}</StatusPill></span>,
        <span className="text-sm text-slate-600" key="recorded">{formatDate(item.recorded_at)}</span>,
      ] };
    })} title="Platform snapshots" />
  </div>;
}
