import { BookMarked, BookOpen, FolderOpen, Layers3 } from "lucide-react";

import { OperationsHeader, OperationsMetrics, WorkspaceBanner } from "@/components/operations/operations-ui";
import { loadCoursesWorkspace } from "@/features/administration/infrastructure/administration.repository";
import { AdministrationForm } from "@/features/administration/presentation/administration-form";
import { AdministrationTable } from "@/features/administration/presentation/administration-table";
import { loadCourseMaterialsWorkspace, type CourseMaterialsWorkspace } from "@/features/academics/infrastructure/course-materials.repository";
import { CourseMaterialPublisher, MaterialFolderCreator } from "@/features/academics/presentation/academic-workflow-forms";
import { CourseMaterialsClassNav, CourseMaterialsPanel } from "@/features/academics/presentation/course-materials-panel";
import { MaterialDialog } from "@/features/academics/presentation/material-dialog";
import { hasPermission } from "@/server/auth/permissions";
import { resolveWorkspaceAccess } from "@/server/workspace/workspace-access";

export const dynamic = "force-dynamic";

const code = "rounded bg-white px-1.5 py-0.5 text-xs";
const emptyMaterials: CourseMaterialsWorkspace = { courses: [], folderOptions: [], offeringOptions: [], totals: { documents: 0, folders: 0, materials: 0 } };

function MaterialsUnavailableNotice() {
  return <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900" role="status">
    <p className="font-semibold">Study materials are not available yet.</p>
    <p className="mt-1">The <code className={code}>course_materials</code> tables and the <code className={code}>course-materials</code> storage bucket are missing from the Supabase project. Run <code className={code}>supabase/migrations/20260923120000_add_course_materials.sql</code> in the Supabase SQL editor, then reload this page.</p>
  </div>;
}

function SectionIntro({ description, title }: { description: string; title: string }) {
  return <div className="mb-3"><h2 className="text-lg font-semibold tracking-tight text-slate-950">{title}</h2><p className="mt-0.5 text-sm text-slate-500">{description}</p></div>;
}

export default async function CoursesPage() {
  const access = await resolveWorkspaceAccess("workspace:access", "campus:manage");
  const canReadMaterials = access.mode === "live" && hasPermission(access.role, "materials:read");
  const canManageMaterials = access.mode === "live" && hasPermission(access.role, "materials:manage");
  const canReadCatalog = access.mode === "live" && hasPermission(access.role, "reports:read");
  const facultyProfileId = access.mode === "live" && access.role === "faculty" ? access.profileId : null;

  let workspace = null;
  let materials: CourseMaterialsWorkspace | null = null;
  let failed = false;
  let materialsUnavailable = false;
  if (canReadCatalog) try { workspace = await loadCoursesWorkspace(facultyProfileId ?? undefined); } catch { failed = true; }
  if (canReadMaterials) try { materials = await loadCourseMaterialsWorkspace(access.mode === "live" ? access.role : "student", access.mode === "live" ? access.profileId : null); } catch { materialsUnavailable = true; }

  const mode = access.mode === "live" && !canReadCatalog && !canReadMaterials ? "forbidden" : access.mode === "live" && failed ? "error" : access.mode;
  const data = workspace ?? { courses: [], departments: [], faculty: [], offerings: [] };
  const materialData = materials ?? emptyMaterials;
  const departmentOptions = data.departments.map((item) => ({ id: item.id, label: `${item.code} — ${item.name}` }));
  const courseOptions = data.courses.map((item) => ({ id: item.id, label: `${item.code} — ${item.title}` }));
  const facultyOptions = data.faculty.map((item) => ({ id: item.id, label: `${item.employee_number} — ${item.profiles?.display_name ?? item.designation}` }));
  const isStudent = access.mode === "live" && access.role === "student";
  const showMaterials = canReadMaterials && !materialsUnavailable;
  const manageMaterials = canManageMaterials && showMaterials && mode === "live";

  if (isStudent) {
    return <section>
      <OperationsHeader description="Notes, documents, and resource links your faculty have shared, organised by class and folder." eyebrow="Learning" title="My courses and study materials." />
      <WorkspaceBanner mode={mode} />
      {materialsUnavailable ? <MaterialsUnavailableNotice /> : null}
      <OperationsMetrics metrics={[{ detail: "Classes you are enrolled in", icon: BookOpen, label: "My courses", value: materialData.courses.length }, { detail: "Across all your classes", icon: FolderOpen, label: "Folders", value: materialData.totals.folders }, { detail: "Notes, links, and documents", icon: BookMarked, label: "Study materials", value: materialData.totals.materials }, { detail: "Files you can download", icon: Layers3, label: "Documents", value: materialData.totals.documents }]} />
      {showMaterials ? <div className="mt-6">
        <SectionIntro description="Open a folder to see its notes and documents. Download links stay valid for one hour and refresh when you reload." title="Study materials by class" />
        <div className="mb-3"><CourseMaterialsClassNav courses={materialData.courses} /></div>
        <CourseMaterialsPanel canManage={false} courses={materialData.courses} layout="grid" />
      </div> : null}
    </section>;
  }

  return <section>
    <OperationsHeader actions={<>
      {manageMaterials ? <MaterialDialog description="Group materials by unit or topic, for example Unit A." icon="folder" label="New folder" title="Create a folder"><MaterialFolderCreator offerings={materialData.offeringOptions} /></MaterialDialog> : null}
      {manageMaterials ? <MaterialDialog description="Upload a document, write notes, or share a link. Approved students in the class see it straight away." icon="upload" label="Publish material" title="Publish study material" tone="primary"><CourseMaterialPublisher folders={materialData.folderOptions} offerings={materialData.offeringOptions} /></MaterialDialog> : null}
      <AdministrationForm canManage={access.canManage && mode === "live"} kind="course" options={{ departments: departmentOptions }} />
      <AdministrationForm canManage={access.canManage && mode === "live"} kind="offering" options={{ courses: courseOptions, faculty: facultyOptions }} />
    </>} description={facultyProfileId ? "Share notes, documents, and links with the classes assigned to you." : "Manage the catalog, open term sections, and share study materials with enrolled students."} eyebrow={facultyProfileId ? "Teaching" : "Academic administration"} title={facultyProfileId ? "My classes and study materials." : "Courses and offerings."} />
    <WorkspaceBanner mode={mode} />
    {materialsUnavailable ? <MaterialsUnavailableNotice /> : null}
    <OperationsMetrics metrics={[{ detail: "Governed course catalog", icon: BookOpen, label: "Courses", value: data.courses.length }, { detail: "Current and historical sections", icon: Layers3, label: "Offerings", value: data.offerings.length }, { detail: "Across your classes", icon: FolderOpen, label: "Material folders", value: materialData.totals.folders }, { detail: "Notes, links, and documents", icon: BookMarked, label: "Study materials", value: materialData.totals.materials }]} />

    {showMaterials ? <div className="mt-6">
      <SectionIntro description={facultyProfileId ? "Everything you have published, organised by class and folder." : "Everything published to students, organised by class and folder."} title="Study materials" />
      <div className="space-y-3">
        <CourseMaterialsClassNav courses={materialData.courses} />
        <CourseMaterialsPanel canManage={manageMaterials} courses={materialData.courses} layout="grid" />
      </div>
    </div> : null}

    {canReadCatalog ? <div className="mt-8">
      <AdministrationTable columns={["Course", "Department", "Credits", "Offerings"]} description="Catalog entries and term sections per course. Use the header buttons to add a course or open a new offering." emptyDescription="Create a department and then add the first course." emptyIcon={BookOpen} emptyTitle="No courses in the catalog." rows={data.courses.map((course) => ({ id: course.id, cells: [<div key="course"><p className="text-sm font-semibold text-slate-900">{course.title}</p><p className="font-mono text-xs text-slate-500">{course.code}</p></div>, <span className="text-sm text-slate-700" key="department">{course.departments.code} · {course.departments.name}</span>, <span className="text-sm text-slate-700" key="credits">{course.credit_hours}</span>, <span className="text-sm text-slate-700" key="offerings">{data.offerings.filter((item) => item.course_id === course.id).length}</span>] }))} title="Course catalog" />
    </div> : null}
  </section>;
}
