import "server-only";

import {
  academicYearForDate,
  buildClassLabel,
  isAttendanceStatus,
  yearOfStudyFromSemester,
  type AttendanceStatus,
} from "@/features/attendance/domain/attendance-rules";
import type {
  AttendanceMirrorRecord,
  AuditMirrorRecord,
  StudentMirrorRecord,
} from "@/features/attendance/domain/attendance-sheet";
import { DatabaseQueryError } from "@/server/database/database-query-error";
import { facultyStudentIds } from "@/server/auth/academic-scope";
import { createSupabaseAdminClient } from "@/server/supabase/admin-client";
import { formatCampusDateTime } from "@/lib/format-date";


export type AttendanceDepartmentOption = { code: string; id: string; name: string };

export type AttendanceRosterStudent = {
  department: string;
  departmentName: string;
  existing: { recordId: string; remarks: string | null; status: AttendanceStatus; updatedAt: string } | null;
  membershipStatus: string | null;
  registerNumber: string;
  semester: number;
  studentId: string;
  studentName: string;
  year: string;
};

export type AttendanceRosterView = {
  departments: AttendanceDepartmentOption[];
  lastSavedAt: string | null;
  /** Server-formatted so the client component never re-formats it (avoids hydration mismatches). */
  lastSavedLabel: string | null;
  students: AttendanceRosterStudent[];
  /** Newest `updated_at` among existing records; the save action refuses stale versions. */
  version: string;
  /** Year-of-study labels present in the (department-filtered) roster. */
  years: string[];
};

export type AttendanceSessionKey = { session: string; sessionDate: string };
export type AttendanceRosterFilter = { departmentCode?: string; year?: string };

/** Student ids the signed-in user may mark; `null` means every student. */
export async function scopedStudentIds(facultyProfileId?: string) {
  if (!facultyProfileId) return null;
  return facultyStudentIds(facultyProfileId);
}

/**
 * Every student in the campus directory (faculty: only students in their
 * assigned classes), with any record already saved for the date and session.
 */
export async function loadAttendanceRoster(
  key: AttendanceSessionKey,
  filter: AttendanceRosterFilter,
  facultyProfileId?: string,
): Promise<AttendanceRosterView> {
  const client = createSupabaseAdminClient();
  const scoped = await scopedStudentIds(facultyProfileId);
  const departmentsResult = await client.from("departments").select("id, code, name").order("code");
  if (departmentsResult.error) throw new DatabaseQueryError("list departments", departmentsResult.error.message);
  const departments = departmentsResult.data;
  if (scoped && !scoped.length) return { departments, lastSavedAt: null, lastSavedLabel: null, students: [], version: "", years: [] };

  let query = client.from("students").select(`
    id, student_number, semester,
    departments (code, name),
    profiles (display_name, membership_status),
    attendance_records (id, status, remarks, updated_at, session, session_date)
  `)
    .eq("attendance_records.session_date", key.sessionDate)
    .eq("attendance_records.session", key.session);
  if (scoped) query = query.in("id", scoped);
  const department = filter.departmentCode ? departments.find((item) => item.code === filter.departmentCode) : undefined;
  if (department) query = query.eq("department_id", department.id);
  const { data, error } = await query.order("student_number");
  if (error) throw new DatabaseQueryError("load attendance roster", error.message);

  const all = data.map((student): AttendanceRosterStudent => {
    const record = student.attendance_records[0];
    return {
      department: student.departments.code,
      departmentName: student.departments.name,
      existing: record && isAttendanceStatus(record.status)
        ? { recordId: record.id, remarks: record.remarks, status: record.status, updatedAt: record.updated_at }
        : null,
      membershipStatus: student.profiles?.membership_status ?? null,
      registerNumber: student.student_number,
      semester: student.semester,
      studentId: student.id,
      studentName: student.profiles?.display_name ?? "Profile not linked",
      year: yearOfStudyFromSemester(student.semester),
    };
  });
  const years = [...new Set(all.map((student) => student.year))];
  const students = filter.year ? all.filter((student) => student.year === filter.year) : all;
  const updatedAts = students.flatMap((student) => (student.existing ? [student.existing.updatedAt] : []));
  const version = updatedAts.length ? updatedAts.sort().at(-1) ?? "" : "";
  return { departments, lastSavedAt: version || null, lastSavedLabel: version ? formatCampusDateTime(version) : null, students, version, years };
}

/** Existing records for the given students on a date and session (save-action version check). */
export async function listSessionRecords(key: AttendanceSessionKey, studentIds: readonly string[]) {
  if (!studentIds.length) return [];
  const { data, error } = await createSupabaseAdminClient()
    .from("attendance_records")
    .select("id, student_id, status, remarks, recorded_at, recorded_by_profile_id, updated_at")
    .eq("session_date", key.sessionDate)
    .eq("session", key.session)
    .in("student_id", [...studentIds]);
  if (error) throw new DatabaseQueryError("load session records", error.message);
  return data;
}

const mirrorRecordSelect = `
  id, session_date, session, status, remarks, recorded_at, updated_at,
  recorded_by:profiles!attendance_records_recorded_by_profile_id_fkey (email),
  students!inner (id, student_number, semester, departments (code), profiles (display_name))
`;

/** Rows for the `Attendance` tab; scope by record ids or everything. */
export async function listAttendanceRecordsForMirror(
  scope: { recordIds?: readonly string[] },
): Promise<AttendanceMirrorRecord[]> {
  let query = createSupabaseAdminClient().from("attendance_records").select(mirrorRecordSelect);
  if (scope.recordIds) {
    if (!scope.recordIds.length) return [];
    query = query.in("id", [...scope.recordIds]);
  }
  const { data, error } = await query.order("session_date", { ascending: true }).order("session");
  if (error) throw new DatabaseQueryError("load attendance for sheet mirror", error.message);

  return data.flatMap((record) => {
    if (!isAttendanceStatus(record.status)) return [];
    const student = record.students;
    const year = yearOfStudyFromSemester(student.semester);
    const department = student.departments.code;
    return [{
      academicYear: academicYearForDate(record.session_date),
      classLabel: buildClassLabel(department, year, ""),
      department,
      id: record.id,
      markedAt: record.recorded_at,
      markedBy: record.recorded_by?.email ?? "system",
      registerNumber: student.student_number,
      remarks: record.remarks,
      section: "",
      session: record.session,
      sessionDate: record.session_date,
      status: record.status,
      studentId: student.id,
      studentName: student.profiles?.display_name ?? "Profile not linked",
      updatedAt: record.updated_at,
      year,
    }];
  });
}

/** Rows for the `Students` tab: one per student in the directory. */
export async function listStudentsForMirror(studentIds?: readonly string[]): Promise<StudentMirrorRecord[]> {
  let query = createSupabaseAdminClient().from("students").select(`
    id, student_number, semester,
    departments (code),
    profiles (display_name, membership_status)
  `);
  if (studentIds) {
    if (!studentIds.length) return [];
    query = query.in("id", [...studentIds]);
  }
  const { data, error } = await query.order("student_number");
  if (error) throw new DatabaseQueryError("load students for sheet mirror", error.message);

  return data.map((student) => {
    const year = yearOfStudyFromSemester(student.semester);
    return {
      classLabel: buildClassLabel(student.departments.code, year, ""),
      department: student.departments.code,
      registerNumber: student.student_number,
      section: "",
      status: student.profiles?.membership_status === "active" ? "Active" : "Inactive",
      studentId: student.id,
      studentName: student.profiles?.display_name ?? "Profile not linked",
      year,
    };
  });
}

export const attendanceAuditActions = ["attendance.created", "attendance.updated"] as const;

/** Rows for the `Attendance_Audit` tab, newest first, capped so full syncs stay bounded. */
export async function listAttendanceAuditForMirror(recordIds?: readonly string[], limit = 2000): Promise<AuditMirrorRecord[]> {
  let query = createSupabaseAdminClient()
    .from("audit_logs")
    .select("id, action, entity_id, created_at, metadata, profiles (email)")
    .eq("entity_type", "attendance_record")
    .in("action", [...attendanceAuditActions]);
  if (recordIds) {
    if (!recordIds.length) return [];
    query = query.in("entity_id", [...recordIds]);
  }
  const { data, error } = await query.order("created_at", { ascending: false }).limit(limit);
  if (error) throw new DatabaseQueryError("load attendance audit for sheet mirror", error.message);

  return data.flatMap((row) => {
    if (!row.entity_id) return [];
    const metadata = (row.metadata ?? {}) as { new_status?: unknown; old_status?: unknown };
    return [{
      action: row.action === "attendance.created" ? "CREATE" as const : "UPDATE" as const,
      attendanceId: row.entity_id,
      id: row.id,
      newStatus: isAttendanceStatus(metadata.new_status) ? metadata.new_status : null,
      oldStatus: isAttendanceStatus(metadata.old_status) ? metadata.old_status : null,
      timestamp: row.created_at,
      user: row.profiles?.email ?? "system",
    }];
  });
}
