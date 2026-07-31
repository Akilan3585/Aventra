import { BookOpen, Building2, GraduationCap, UsersRound } from "lucide-react";

import { OperationsHeader, OperationsMetrics, WorkspaceBanner } from "@/components/operations/operations-ui";
import { loadDepartmentsWorkspace } from "@/features/administration/infrastructure/administration.repository";
import { AdministrationForm } from "@/features/administration/presentation/administration-form";
import { AdministrationTable } from "@/features/administration/presentation/administration-table";
import { resolveWorkspaceAccess } from "@/server/workspace/workspace-access";

export const dynamic = "force-dynamic";

export default async function DepartmentsPage() {
  const access = await resolveWorkspaceAccess("reports:read", "campus:manage");
  let departments = null;
  if (access.mode === "live") try { departments = await loadDepartmentsWorkspace(); } catch { departments = null; }
  const mode = access.mode === "live" && !departments ? "error" : access.mode;
  const rows = departments ?? [];
  return <section><OperationsHeader actions={<AdministrationForm canManage={access.canManage && mode === "live"} kind="department" />} description="Own the academic organization, monitor staffing coverage, and keep programs attached to a governed department." eyebrow="Academic administration" title="Department portfolio." /><WorkspaceBanner mode={mode} /><OperationsMetrics metrics={[{ detail: "Active organizational units", icon: Building2, label: "Departments", value: rows.length }, { detail: "Students assigned across departments", icon: GraduationCap, label: "Students", value: rows.reduce((sum, row) => sum + row.students, 0) }, { detail: "Faculty roster ownership", icon: UsersRound, label: "Faculty", value: rows.reduce((sum, row) => sum + row.faculty, 0) }, { detail: "Governed catalog entries", icon: BookOpen, label: "Courses", value: rows.reduce((sum, row) => sum + row.courses, 0) }]} /><AdministrationTable columns={["Department", "Students", "Faculty", "Courses"]} description="Live ownership totals derived from student, faculty, and course records." emptyDescription="Create the first department before adding students, faculty, or courses." emptyIcon={Building2} emptyTitle="No departments configured." rows={rows.map((row) => ({ id: row.id, cells: [<div key="department"><p className="text-sm font-semibold text-slate-900">{row.name}</p><p className="font-mono text-xs text-slate-500">{row.code}</p></div>, <span className="text-sm text-slate-700" key="students">{row.students}</span>, <span className="text-sm text-slate-700" key="faculty">{row.faculty}</span>, <span className="text-sm text-slate-700" key="courses">{row.courses}</span>] }))} title="Academic departments" /></section>;
}
