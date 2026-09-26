import "server-only";

import { DatabaseQueryError } from "@/server/database/database-query-error";
import { createSupabaseAdminClient } from "@/server/supabase/admin-client";
import { calculateStudentSuccessSignals } from "@/features/students/domain/student-success";
import type { RiskLevel } from "@/features/students/domain/student-success";
import type { Database } from "@/types/database";
import { facultyStudentIds } from "@/server/auth/academic-scope";

export type DepartmentOption = Pick<
  Database["public"]["Tables"]["departments"]["Row"],
  "code" | "id" | "name"
>;

export type StudentDirectoryItem = {
  academicAverage: number | null;
  admissionYear: number;
  /** When the sign-up was accepted, or null while still pending. */
  approvedAt: string | null;
  /** Display name of the faculty member or administrator who accepted the sign-up. */
  approvedBy: string | null;
  approvedByProfileId: string | null;
  attendanceRate: number | null;
  departmentCode: string;
  departmentName: string;
  displayName: string;
  email: string | null;
  enrollmentCount: number;
  id: string;
  latestCgpa: number | null;
  membershipStatus: "active" | "pending" | "suspended" | "expired" | "unlinked";
  reasons: string[];
  riskLevel: RiskLevel;
  riskScore: number | null;
  semester: number;
  studentNumber: string;
};

export async function listDepartments(): Promise<DepartmentOption[]> {
  const { data, error } = await createSupabaseAdminClient()
    .from("departments")
    .select("id, code, name")
    .order("code");

  if (error) throw new DatabaseQueryError("list departments", error.message);
  return data;
}

/** Students whose sign-up this staff member accepted, even before any enrollment exists. */
async function acceptedStudentIds(approverProfileId: string) {
  const { data, error } = await createSupabaseAdminClient()
    .from("students")
    .select("id, profiles!inner (approved_by_profile_id)")
    .eq("profiles.approved_by_profile_id", approverProfileId);
  if (error) throw new DatabaseQueryError("list accepted students", error.message);
  return data.map(({ id }) => id);
}

async function approverNames(profileIds: string[]) {
  if (!profileIds.length) return new Map<string, string>();
  const { data, error } = await createSupabaseAdminClient()
    .from("profiles")
    .select("id, display_name")
    .in("id", profileIds);
  if (error) throw new DatabaseQueryError("list approvers", error.message);
  return new Map(data.map((profile) => [profile.id, profile.display_name]));
}

function membershipStatusOf(value: string | null | undefined): StudentDirectoryItem["membershipStatus"] {
  return value === "active" || value === "pending" || value === "suspended" || value === "expired" ? value : "unlinked";
}

export async function listStudentDirectory(facultyProfileId?: string): Promise<StudentDirectoryItem[]> {
  // Faculty see the students in their classes plus every student they accepted.
  const scopedIds = facultyProfileId
    ? [...new Set([...(await facultyStudentIds(facultyProfileId)), ...(await acceptedStudentIds(facultyProfileId))])]
    : null;
  if (scopedIds && !scopedIds.length) return [];
  let query = createSupabaseAdminClient()
    .from("students")
    .select(`
      id,
      student_number,
      admission_year,
      semester,
      profiles (display_name, email, membership_status, approved_at, approved_by_profile_id),
      departments (code, name),
      attendance_records (status),
      enrollments (
        id,
        internal_marks (marks_obtained, maximum_marks)
      ),
      semester_results (cgpa, published_at)
    `);
  if (scopedIds) query = query.in("id", scopedIds);
  const { data, error } = await query.order("student_number");

  if (error) throw new DatabaseQueryError("list student directory", error.message);
  const approvers = await approverNames([...new Set(data.map((student) => student.profiles?.approved_by_profile_id).filter((id): id is string => Boolean(id)))]);

  return data.map((student) => {
    const latestResult = [...student.semester_results].sort((left, right) =>
      (right.published_at ?? "").localeCompare(left.published_at ?? ""),
    )[0];
    const signals = calculateStudentSuccessSignals({
      attendanceStatuses: student.attendance_records.map((record) => record.status),
      internalMarks: student.enrollments.flatMap((enrollment) =>
        enrollment.internal_marks.map((mark) => ({
          marksObtained: Number(mark.marks_obtained),
          maximumMarks: Number(mark.maximum_marks),
        })),
      ),
      latestCgpa: latestResult ? Number(latestResult.cgpa) : null,
    });

    const approvedByProfileId = student.profiles?.approved_by_profile_id ?? null;
    return {
      ...signals,
      admissionYear: student.admission_year,
      approvedAt: student.profiles?.approved_at ?? null,
      approvedBy: approvedByProfileId ? approvers.get(approvedByProfileId) ?? "Campus staff" : null,
      approvedByProfileId,
      departmentCode: student.departments.code,
      departmentName: student.departments.name,
      displayName: student.profiles?.display_name ?? "Profile not linked",
      email: student.profiles?.email ?? null,
      enrollmentCount: student.enrollments.length,
      id: student.id,
      membershipStatus: membershipStatusOf(student.profiles?.membership_status),
      semester: student.semester,
      studentNumber: student.student_number,
    };
  });
}
