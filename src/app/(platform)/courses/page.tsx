import { BookOpen, CalendarRange, Layers3, UsersRound } from "lucide-react";

import { OperationsHeader, OperationsMetrics, WorkspaceBanner } from "@/components/operations/operations-ui";
import { loadCoursesWorkspace } from "@/features/administration/infrastructure/administration.repository";
import { AdministrationForm } from "@/features/administration/presentation/administration-form";
import { AdministrationTable } from "@/features/administration/presentation/administration-table";
import { resolveWorkspaceAccess } from "@/server/workspace/workspace-access";

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const access = await resolveWorkspaceAccess("reports:read", "campus:manage");
  let workspace = null;
  if (access.mode === "live") try { workspace = await loadCoursesWorkspace(access.role === "faculty" ? access.profileId ?? undefined : undefined); } catch { workspace = null; }
  const mode = access.mode === "live" && !workspace ? "error" : access.mode;
  const data = workspace ?? { courses: [], departments: [], faculty: [], offerings: [] };
  const departmentOptions = data.departments.map((item) => ({ id: item.id, label: `${item.code} — ${item.name}` }));
  const courseOptions = data.courses.map((item) => ({ id: item.id, label: `${item.code} — ${item.title}` }));
  const facultyOptions = data.faculty.map((item) => ({ id: item.id, label: `${item.employee_number} — ${item.profiles?.display_name ?? item.designation}` }));
  return <section><OperationsHeader actions={<><AdministrationForm canManage={access.canManage && mode === "live"} kind="course" options={{ departments: departmentOptions }} /><AdministrationForm canManage={access.canManage && mode === "live"} kind="offering" options={{ courses: courseOptions, faculty: facultyOptions }} /></>} description="Manage the catalog and open term sections that connect faculty, capacity, scheduling, and enrollment." eyebrow="Academic administration" title="Courses and offerings." /><WorkspaceBanner mode={mode} /><OperationsMetrics metrics={[{ detail: "Governed course catalog", icon: BookOpen, label: "Courses", value: data.courses.length }, { detail: "Current and historical sections", icon: Layers3, label: "Offerings", value: data.offerings.length }, { detail: "Sections without faculty ownership", icon: UsersRound, label: "Unassigned", value: data.offerings.filter((item) => !item.faculty_id).length }, { detail: "Combined section capacity", icon: CalendarRange, label: "Seat capacity", value: data.offerings.reduce((sum, item) => sum + item.capacity, 0) }]} /><AdministrationTable columns={["Course", "Department", "Credits", "Offerings"]} description="Catalog entries and the number of term sections opened for each course." emptyDescription="Create a department and then add the first course." emptyIcon={BookOpen} emptyTitle="No courses in the catalog." rows={data.courses.map((course) => ({ id: course.id, cells: [<div key="course"><p className="text-sm font-semibold text-slate-900">{course.title}</p><p className="font-mono text-xs text-slate-500">{course.code}</p></div>, <span className="text-sm text-slate-700" key="department">{course.departments.code} · {course.departments.name}</span>, <span className="text-sm text-slate-700" key="credits">{course.credit_hours}</span>, <span className="text-sm text-slate-700" key="offerings">{data.offerings.filter((item) => item.course_id === course.id).length}</span>] }))} title="Course catalog" /></section>;
}
