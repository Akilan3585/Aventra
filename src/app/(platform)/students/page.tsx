import { redirect } from "next/navigation";

import { StudentWorkspace } from "@/features/students/presentation/student-workspace";
import {
  listDepartments,
  listStudentDirectory,
} from "@/features/students/infrastructure/student.repository";
import { getCampusAccess, isClerkConfigured } from "@/server/auth/campus-access";
import { hasPermission } from "@/server/auth/permissions";
import { isSupabaseAdminConfigured } from "@/server/supabase/admin-client";

export const dynamic = "force-dynamic";

async function loadStudentWorkspace(facultyProfileId?: string) {
  try {
    const [students, departments] = await Promise.all([
      listStudentDirectory(facultyProfileId),
      listDepartments(),
    ]);
    return { departments, students };
  } catch {
    return null;
  }
}

export default async function StudentsPage() {
  if (!isClerkConfigured() || !isSupabaseAdminConfigured()) {
    return (
      <StudentWorkspace
        canManage={false}
        departments={[]}
        mode="configuration"
        students={[]}
      />
    );
  }

  const access = await getCampusAccess();
  if (!access) redirect("/sign-in?redirect_url=/students");

  if (!hasPermission(access.role, "students:read")) {
    return (
      <StudentWorkspace
        canManage={false}
        departments={[]}
        mode="forbidden"
        students={[]}
      />
    );
  }

  const workspace = await loadStudentWorkspace(
    access.role === "faculty" ? access.profileId ?? undefined : undefined,
  );
  if (!workspace) {
    return (
      <StudentWorkspace
        canManage={false}
        departments={[]}
        mode="error"
        students={[]}
      />
    );
  }

  return (
    <StudentWorkspace
      canManage={hasPermission(access.role, "students:manage")}
      departments={workspace.departments}
      mode="live"
      students={workspace.students}
    />
  );
}
