import { Award, BookCheck, Gauge, TrendingUp } from "lucide-react";

import { OperationsHeader, OperationsMetrics, StatusPill, WorkspaceBanner } from "@/components/operations/operations-ui";
import { loadPerformanceWorkspace } from "@/features/administration/infrastructure/administration.repository";
import { AdministrationForm } from "@/features/administration/presentation/administration-form";
import { AdministrationTable } from "@/features/administration/presentation/administration-table";
import { resolveWorkspaceAccess } from "@/server/workspace/workspace-access";

export const dynamic = "force-dynamic";

export default async function PerformancePage() {
  const access = await resolveWorkspaceAccess("reports:read", "campus:manage");
  let workspace = null;
  if (access.mode === "live") try { workspace = await loadPerformanceWorkspace(); } catch { workspace = null; }
  const mode = access.mode === "live" && !workspace ? "error" : access.mode;
  const data = workspace ?? { results: [], students: [] };
  const students = data.students.map((item) => ({ id: item.id, label: `${item.student_number} — ${item.profiles?.display_name ?? "Profile not linked"}` }));
  const avgGpa = data.results.length ? Math.round(data.results.reduce((sum, item) => sum + Number(item.gpa), 0) / data.results.length * 100) / 100 : 0;
  return <section><OperationsHeader actions={<AdministrationForm canManage={access.canManage && mode === "live"} kind="result" options={{ students }} />} description="Publish verified semester results, monitor GPA health, and provide evidence for student-success decisions." eyebrow="Academic intelligence" title="Performance outcomes." /><WorkspaceBanner mode={mode} /><OperationsMetrics metrics={[{ detail: "Semester outcome records", icon: BookCheck, label: "Results", value: data.results.length }, { detail: "Mean GPA across visible results", icon: Gauge, label: "Average GPA", value: avgGpa }, { detail: "Results visible to governed reports", icon: Award, label: "Published", value: data.results.filter((item) => item.published_at).length }, { detail: "Students below a 6.0 GPA support signal", icon: TrendingUp, label: "Support review", value: data.results.filter((item) => Number(item.gpa) < 6).length }]} /><AdministrationTable columns={["Student", "Term", "Semester", "GPA", "CGPA", "State"]} description="Published and draft semester outcomes; deterministic thresholds remain the source of truth." emptyDescription="Record the first semester result after student records are available." emptyIcon={BookCheck} emptyTitle="No performance results." rows={data.results.map((item) => ({ id: item.id, cells: [<div key="student"><p className="text-sm font-semibold text-slate-900">{item.students.profiles?.display_name ?? "Profile not linked"}</p><p className="font-mono text-xs text-slate-500">{item.students.student_number}</p></div>, <span className="text-sm capitalize text-slate-700" key="term">{item.term} {item.academic_year}</span>, <span className="text-sm text-slate-700" key="semester">{item.semester}</span>, <span className="font-mono text-sm font-semibold text-slate-900" key="gpa">{item.gpa}</span>, <span className="font-mono text-sm text-slate-700" key="cgpa">{item.cgpa}</span>, <StatusPill key="state" tone={item.published_at ? "good" : "warning"}>{item.published_at ? "published" : "draft"}</StatusPill>] }))} title="Semester results" /></section>;
}
