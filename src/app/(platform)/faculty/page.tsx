import { BadgeCheck, BookOpenCheck, Building2, UsersRound } from "lucide-react";

import { OperationsHeader, OperationsMetrics, StatusPill, WorkspaceBanner } from "@/components/operations/operations-ui";
import { loadFacultyWorkspace } from "@/features/administration/infrastructure/administration.repository";
import { AdministrationForm } from "@/features/administration/presentation/administration-form";
import { AdministrationTable } from "@/features/administration/presentation/administration-table";
import { resolveWorkspaceAccess } from "@/server/workspace/workspace-access";

export const dynamic = "force-dynamic";

export default async function FacultyPage() {
  const access = await resolveWorkspaceAccess("reports:read", "campus:manage");
  let workspace = null;
  if (access.mode === "live") try { workspace = await loadFacultyWorkspace(); } catch { workspace = null; }
  const mode = access.mode === "live" && !workspace ? "error" : access.mode;
  const data = workspace ?? { departments: [], members: [] };
  const departments = data.departments.map((item) => ({ id: item.id, label: `${item.code} — ${item.name}` }));
  return <section><OperationsHeader actions={<AdministrationForm canManage={access.canManage && mode === "live"} kind="faculty" options={{ departments }} />} description="Maintain faculty ownership, identity linkage, departmental alignment, and teaching workload signals." eyebrow="People operations" title="Faculty workspace." /><WorkspaceBanner mode={mode} /><OperationsMetrics metrics={[{ detail: "Faculty roster records", icon: UsersRound, label: "Faculty", value: data.members.length }, { detail: "Linked to a signed-in campus profile", icon: BadgeCheck, label: "Identity linked", value: data.members.filter((item) => item.profiles).length }, { detail: "Departments with faculty coverage", icon: Building2, label: "Departments covered", value: new Set(data.members.map((item) => item.department_id)).size }, { detail: "Course sections assigned", icon: BookOpenCheck, label: "Teaching load", value: data.members.reduce((sum, item) => sum + item.offerings, 0) }]} /><AdministrationTable columns={["Faculty member", "Department", "Designation", "Sections", "Identity"]} description="Roster records remain usable before a Clerk profile is linked." emptyDescription="Add the first faculty roster record and assign it to a department." emptyIcon={UsersRound} emptyTitle="No faculty records yet." rows={data.members.map((member) => ({ id: member.id, cells: [<div key="member"><p className="text-sm font-semibold text-slate-900">{member.profiles?.display_name ?? "Invitation pending"}</p><p className="font-mono text-xs text-slate-500">{member.employee_number}</p></div>, <span className="text-sm text-slate-700" key="department">{member.departments.code}</span>, <span className="text-sm text-slate-700" key="designation">{member.designation}</span>, <span className="text-sm text-slate-700" key="offerings">{member.offerings}</span>, <StatusPill key="identity" tone={member.profiles ? "good" : "warning"}>{member.profiles ? "linked" : "pending"}</StatusPill>] }))} title="Faculty roster" /></section>;
}
