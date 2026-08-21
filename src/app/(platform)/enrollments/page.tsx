import { BookOpenCheck, GraduationCap, Layers3, UsersRound } from "lucide-react";

import { OperationsHeader, OperationsMetrics, WorkspaceBanner } from "@/components/operations/operations-ui";
import { loadEnrollmentsWorkspace } from "@/features/academics/infrastructure/academic-workflows.repository";
import { EnrollmentCreator } from "@/features/academics/presentation/academic-workflow-forms";
import { AdministrationTable } from "@/features/administration/presentation/administration-table";
import { resolveWorkspaceAccess } from "@/server/workspace/workspace-access";

export const dynamic = "force-dynamic";

export default async function EnrollmentsPage() {
  const access = await resolveWorkspaceAccess("students:manage", "enrollments:manage");
  let workspace = null;
  if (access.mode === "live") try { workspace = await loadEnrollmentsWorkspace(); } catch { workspace = null; }
  const mode = access.mode === "live" && !workspace ? "error" : access.mode;
  const data = workspace ?? { enrollments: [], offeringOptions: [], studentOptions: [] };
  return <section><OperationsHeader description="Place verified students into active course sections with duplicate and seat-capacity safeguards." eyebrow="Academic administration" title="Enrollment management." /><WorkspaceBanner mode={mode} />
    {mode === "live" && access.canManage ? <div className="mt-6"><EnrollmentCreator offerings={data.offeringOptions} students={data.studentOptions} /></div> : null}
    <OperationsMetrics metrics={[{ detail: "Active student-to-section records", icon: BookOpenCheck, label: "Enrollments", value: data.enrollments.length }, { detail: "Students available in the campus roster", icon: GraduationCap, label: "Students", value: data.studentOptions.length }, { detail: "Course sections accepting enrollment", icon: Layers3, label: "Offerings", value: data.offeringOptions.length }, { detail: "Unique learners with at least one class", icon: UsersRound, label: "Participating", value: new Set(data.enrollments.map((item) => item.students.id)).size }]} />
    <AdministrationTable columns={["Student", "Course offering", "Term", "Enrolled"]} description="The current governed relationship between students and course sections." emptyDescription="Create students and course offerings, then make the first enrollment." emptyIcon={BookOpenCheck} emptyTitle="No enrollments yet." rows={data.enrollments.map((item) => ({ id: item.id, cells: [<div key="student"><p className="text-sm font-semibold text-slate-900">{item.students.profiles?.display_name ?? "Profile not linked"}</p><p className="font-mono text-xs text-slate-500">{item.students.student_number}</p></div>, <div key="course"><p className="text-sm font-semibold text-slate-800">{item.course_offerings.courses.title}</p><p className="font-mono text-xs text-slate-500">{item.course_offerings.courses.code} · {item.course_offerings.section}</p></div>, <span className="text-sm capitalize text-slate-600" key="term">{item.course_offerings.term} {item.course_offerings.academic_year}</span>, <span className="font-mono text-xs text-slate-600" key="date">{new Date(item.enrolled_at).toLocaleDateString("en-IN")}</span>] }))} title="Enrollment roster" />
  </section>;
}
