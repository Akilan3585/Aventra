import "server-only";

import {
  canApproveStudent,
  studentApprovalReadiness,
  type ApprovalReviewer,
  type StudentApprovalReadiness,
} from "@/features/students/domain/student-approval";
import { listDepartments, type DepartmentOption } from "@/features/students/infrastructure/student.repository";
import { DatabaseQueryError } from "@/server/database/database-query-error";
import type { Role } from "@/server/auth/permissions";
import { createSupabaseAdminClient } from "@/server/supabase/admin-client";

export type PendingStudentDetails = {
  admissionYear: number;
  departmentCode: string;
  departmentId: string;
  departmentName: string;
  semester: number;
  studentId: string;
  studentNumber: string;
};

export type PendingStudentApproval = {
  canApprove: boolean;
  /** Null when the student signed up but has not submitted academic details. */
  details: PendingStudentDetails | null;
  displayName: string;
  email: string;
  identityLinked: boolean;
  profileId: string;
  readiness: StudentApprovalReadiness;
  submittedAt: string;
};

export type StudentApprovalQueue = {
  departmentLabel: string | null;
  /** Departments an admin may place a detail-less sign-up in. */
  departmentOptions: DepartmentOption[];
  items: PendingStudentApproval[];
  reviewer: ApprovalReviewer;
  scope: "all-departments" | "faculty-department";
};

export async function resolveApprovalReviewer(profileId: string | null, role: Role) {
  const reviewer: ApprovalReviewer = { facultyDepartmentId: null, profileId: profileId || null, role };
  let departmentLabel: string | null = null;
  let facultyId: string | null = null;
  if (role !== "faculty" || !profileId) return { departmentLabel, facultyId, reviewer };

  const { data: faculty, error } = await createSupabaseAdminClient()
    .from("faculty_members")
    .select("id, department_id, departments (code, name)")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) throw new DatabaseQueryError("load faculty approval scope", error.message);
  if (faculty) {
    facultyId = faculty.id;
    reviewer.facultyDepartmentId = faculty.department_id;
    departmentLabel = `${faculty.departments.code} · ${faculty.departments.name}`;
  }
  return { departmentLabel, facultyId, reviewer };
}

export async function loadPendingStudentApprovals({
  profileId,
  role,
}: {
  profileId: string;
  role: Role;
}): Promise<StudentApprovalQueue> {
  const client = createSupabaseAdminClient();
  const [{ departmentLabel, reviewer }, departmentOptions] = await Promise.all([
    resolveApprovalReviewer(profileId, role),
    role === "faculty" ? Promise.resolve([]) : listDepartments(),
  ]);
  const scope = role === "faculty" ? "faculty-department" : "all-departments";

  // Every pending student sign-up, whether or not onboarding details exist yet.
  const { data: profiles, error: profilesError } = await client
    .from("profiles")
    .select("id, display_name, email, clerk_user_id, updated_at")
    .eq("campus_role", "student")
    .eq("membership_status", "pending")
    .order("updated_at", { ascending: true });
  if (profilesError) throw new DatabaseQueryError("load pending student sign-ups", profilesError.message);
  if (!profiles.length) return { departmentLabel, departmentOptions, items: [], reviewer, scope };

  const { data: students, error: studentsError } = await client
    .from("students")
    .select("id, student_number, admission_year, semester, department_id, profile_id, departments (code, name)")
    .in("profile_id", profiles.map((profile) => profile.id));
  if (studentsError) throw new DatabaseQueryError("load pending student approvals", studentsError.message);
  const studentByProfile = new Map(students.map((student) => [student.profile_id, student]));

  const items: PendingStudentApproval[] = [];
  for (const profile of profiles) {
    const student = studentByProfile.get(profile.id);
    // A department-linked faculty member sees their own department plus every
    // sign-up that has no department yet (they place it in their own on accept).
    if (student && reviewer.facultyDepartmentId && student.department_id !== reviewer.facultyDepartmentId) continue;

    const identityLinked = Boolean(profile.clerk_user_id);
    const readiness = studentApprovalReadiness({ detailsSubmitted: Boolean(student), identityLinked });
    items.push({
      canApprove: canApproveStudent({ readiness, reviewer, studentDepartmentId: student?.department_id ?? null }),
      details: student
        ? {
            admissionYear: student.admission_year,
            departmentCode: student.departments.code,
            departmentId: student.department_id,
            departmentName: student.departments.name,
            semester: student.semester,
            studentId: student.id,
            studentNumber: student.student_number,
          }
        : null,
      displayName: profile.display_name,
      email: profile.email,
      identityLinked,
      profileId: profile.id,
      readiness,
      submittedAt: profile.updated_at,
    });
  }

  return { departmentLabel, departmentOptions, items, reviewer, scope };
}
