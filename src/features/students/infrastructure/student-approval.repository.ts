import "server-only";

import { DatabaseQueryError } from "@/server/database/database-query-error";
import type { Role } from "@/server/auth/permissions";
import { createSupabaseAdminClient } from "@/server/supabase/admin-client";

export type PendingStudentApproval = {
  admissionYear: number;
  departmentCode: string;
  departmentId: string;
  departmentName: string;
  displayName: string;
  email: string;
  identityLinked: boolean;
  profileId: string;
  semester: number;
  studentId: string;
  studentNumber: string;
  submittedAt: string;
};

export type StudentApprovalQueue = {
  departmentLabel: string | null;
  items: PendingStudentApproval[];
  scope: "all-departments" | "faculty-department";
};

export async function loadPendingStudentApprovals({
  profileId,
  role,
}: {
  profileId: string;
  role: Role;
}): Promise<StudentApprovalQueue> {
  const client = createSupabaseAdminClient();
  let departmentId: string | null = null;
  let departmentLabel: string | null = null;

  if (role === "faculty") {
    const { data: faculty, error: facultyError } = await client
      .from("faculty_members")
      .select("department_id, departments (code, name)")
      .eq("profile_id", profileId)
      .maybeSingle();
    if (facultyError) throw new DatabaseQueryError("load faculty approval scope", facultyError.message);
    if (!faculty) return { departmentLabel: null, items: [], scope: "faculty-department" };
    departmentId = faculty.department_id;
    departmentLabel = `${faculty.departments.code} · ${faculty.departments.name}`;
  }

  let query = client
    .from("students")
    .select(`
      id,
      student_number,
      admission_year,
      semester,
      department_id,
      profiles!inner (id, display_name, email, clerk_user_id, campus_role, membership_status, updated_at),
      departments (code, name)
    `)
    .eq("profiles.campus_role", "student")
    .eq("profiles.membership_status", "pending")
    .order("created_at", { ascending: true });
  if (departmentId) query = query.eq("department_id", departmentId);

  const { data, error } = await query;
  if (error) throw new DatabaseQueryError("load pending student approvals", error.message);

  return {
    departmentLabel,
    items: data.map((student) => ({
      admissionYear: student.admission_year,
      departmentCode: student.departments.code,
      departmentId: student.department_id,
      departmentName: student.departments.name,
      displayName: student.profiles.display_name,
      email: student.profiles.email,
      identityLinked: Boolean(student.profiles.clerk_user_id),
      profileId: student.profiles.id,
      semester: student.semester,
      studentId: student.id,
      studentNumber: student.student_number,
      submittedAt: student.profiles.updated_at,
    })),
    scope: role === "faculty" ? "faculty-department" : "all-departments",
  };
}
