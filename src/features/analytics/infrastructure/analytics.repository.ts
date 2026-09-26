import "server-only";

import type { AnalyticsAttendanceRecord } from "@/features/analytics/domain/analytics-rules";
import { isAttendanceStatus } from "@/features/attendance/domain/attendance-rules";
import { facultyStudentIds } from "@/server/auth/academic-scope";
import { DatabaseQueryError } from "@/server/database/database-query-error";
import { createSupabaseAdminClient } from "@/server/supabase/admin-client";

export type AnalyticsFilter = {
  departmentCode?: string;
  /** Faculty see only students in their assigned classes. */
  facultyProfileId?: string;
  from: string;
  to: string;
};

export type AnalyticsDataset = {
  departments: Array<{ code: string; name: string }>;
  records: AnalyticsAttendanceRecord[];
  totalStudents: number;
};

export async function loadAnalyticsDataset(filter: AnalyticsFilter): Promise<AnalyticsDataset> {
  const client = createSupabaseAdminClient();
  const scoped = filter.facultyProfileId ? await facultyStudentIds(filter.facultyProfileId) : null;
  const departmentsResult = await client.from("departments").select("id, code, name").order("code");
  if (departmentsResult.error) throw new DatabaseQueryError("load analytics departments", departmentsResult.error.message);
  const departments = departmentsResult.data;
  if (scoped && !scoped.length) return { departments, records: [], totalStudents: 0 };
  const department = filter.departmentCode ? departments.find((item) => item.code === filter.departmentCode) : undefined;

  let studentsQuery = client.from("students").select("id", { count: "exact", head: true });
  let recordsQuery = client
    .from("attendance_records")
    .select("session_date, status, student_id, students!inner (student_number, department_id, departments (code), profiles (display_name))")
    .gte("session_date", filter.from)
    .lte("session_date", filter.to);
  if (scoped) {
    studentsQuery = studentsQuery.in("id", scoped);
    recordsQuery = recordsQuery.in("student_id", scoped);
  }
  if (department) {
    studentsQuery = studentsQuery.eq("department_id", department.id);
    recordsQuery = recordsQuery.eq("students.department_id", department.id);
  }

  const [studentsResult, recordsResult] = await Promise.all([studentsQuery, recordsQuery.order("session_date").limit(20000)]);
  if (studentsResult.error) throw new DatabaseQueryError("count analytics students", studentsResult.error.message);
  if (recordsResult.error) throw new DatabaseQueryError("load analytics attendance", recordsResult.error.message);

  const records = recordsResult.data.flatMap((row): AnalyticsAttendanceRecord[] => isAttendanceStatus(row.status) ? [{
    department: row.students.departments.code,
    sessionDate: row.session_date,
    status: row.status,
    studentId: row.student_id,
    studentName: row.students.profiles?.display_name ?? "Profile not linked",
    studentNumber: row.students.student_number,
  }] : []);
  return { departments: departments.map(({ code, name }) => ({ code, name })), records, totalStudents: studentsResult.count ?? 0 };
}
