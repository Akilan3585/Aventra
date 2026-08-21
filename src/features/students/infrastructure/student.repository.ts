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
  attendanceRate: number | null;
  departmentCode: string;
  departmentName: string;
  displayName: string;
  email: string | null;
  enrollmentCount: number;
  id: string;
  latestCgpa: number | null;
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

export async function listStudentDirectory(facultyProfileId?: string): Promise<StudentDirectoryItem[]> {
  const scopedIds = facultyProfileId ? await facultyStudentIds(facultyProfileId) : null;
  if (scopedIds && !scopedIds.length) return [];
  let query = createSupabaseAdminClient()
    .from("students")
    .select(`
      id,
      student_number,
      admission_year,
      semester,
      profiles (display_name, email),
      departments (code, name),
      enrollments (
        id,
        attendance_records (status),
        internal_marks (marks_obtained, maximum_marks)
      ),
      semester_results (cgpa, published_at)
    `);
  if (scopedIds) query = query.in("id", scopedIds);
  const { data, error } = await query.order("student_number");

  if (error) throw new DatabaseQueryError("list student directory", error.message);

  return data.map((student) => {
    const latestResult = [...student.semester_results].sort((left, right) =>
      (right.published_at ?? "").localeCompare(left.published_at ?? ""),
    )[0];
    const signals = calculateStudentSuccessSignals({
      attendanceStatuses: student.enrollments.flatMap((enrollment) =>
        enrollment.attendance_records.map((record) => record.status),
      ),
      internalMarks: student.enrollments.flatMap((enrollment) =>
        enrollment.internal_marks.map((mark) => ({
          marksObtained: Number(mark.marks_obtained),
          maximumMarks: Number(mark.maximum_marks),
        })),
      ),
      latestCgpa: latestResult ? Number(latestResult.cgpa) : null,
    });

    return {
      ...signals,
      admissionYear: student.admission_year,
      departmentCode: student.departments.code,
      departmentName: student.departments.name,
      displayName: student.profiles?.display_name ?? "Profile not linked",
      email: student.profiles?.email ?? null,
      enrollmentCount: student.enrollments.length,
      id: student.id,
      semester: student.semester,
      studentNumber: student.student_number,
    };
  });
}
