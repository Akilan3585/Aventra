import "server-only";

import { DatabaseQueryError } from "@/server/database/database-query-error";
import { createSupabaseAdminClient } from "@/server/supabase/admin-client";
import { intervalsOverlap } from "@/features/operations/domain/operations-rules";
import { facultyOfferingIds, facultyStudentIds } from "@/server/auth/academic-scope";

import { calculateAttendanceRate, isAttendanceStatus, type AttendanceStatus } from "@/features/attendance/domain/attendance-rules";

export type { AttendanceStatus };

export type AttendanceRow = {
  id: string;
  session: string;
  sessionDate: string;
  status: AttendanceStatus;
  studentName: string;
  studentNumber: string;
};

export type AttendanceWorkspace = {
  absent: number;
  attendanceRate: number | null;
  late: number;
  onDuty: number;
  records: AttendanceRow[];
  todayRecorded: number;
};

export async function loadAttendanceWorkspace(facultyProfileId?: string): Promise<AttendanceWorkspace> {
  const client = createSupabaseAdminClient();
  const studentIds = facultyProfileId ? await facultyStudentIds(facultyProfileId) : null;
  if (studentIds && !studentIds.length) return { absent: 0, attendanceRate: null, late: 0, onDuty: 0, records: [], todayRecorded: 0 };
  let recordsQuery = client.from("attendance_records").select(`
      id, session_date, session, status,
      students (student_number, profiles (display_name))
    `);
  if (studentIds) recordsQuery = recordsQuery.in("student_id", studentIds);
  const recordsResult = await recordsQuery.order("session_date", { ascending: false }).order("session").limit(500);
  if (recordsResult.error) throw new DatabaseQueryError("load attendance", recordsResult.error.message);

  const records: AttendanceRow[] = recordsResult.data.flatMap((record) => isAttendanceStatus(record.status) ? [{
    id: record.id,
    session: record.session,
    sessionDate: record.session_date,
    status: record.status,
    studentName: record.students.profiles?.display_name ?? "Profile not linked",
    studentNumber: record.students.student_number,
  }] : []);
  const attendanceRate = calculateAttendanceRate(records.map((record) => record.status));
  const today = new Date().toISOString().slice(0, 10);

  return {
    absent: records.filter((record) => record.status === "absent").length,
    attendanceRate,
    late: records.filter((record) => record.status === "late").length,
    onDuty: records.filter((record) => record.status === "od").length,
    records,
    todayRecorded: records.filter((record) => record.sessionDate === today).length,
  };
}

export type ScheduleRow = {
  capacityMismatch: boolean;
  course: string;
  endsAt: string;
  enrollmentCount: number;
  faculty: string;
  hasConflict: boolean;
  id: string;
  roomCapacity: number;
  roomCode: string;
  startsAt: string;
};

export type ScheduleOption = { id: string; label: string; capacity?: number };

export type ScheduleWorkspace = {
  conflicts: number;
  offeringOptions: ScheduleOption[];
  roomOptions: ScheduleOption[];
  schedules: ScheduleRow[];
  todaySessions: number;
  utilizationPercent: number;
};

export async function loadScheduleWorkspace(facultyProfileId?: string): Promise<ScheduleWorkspace> {
  const client = createSupabaseAdminClient();
  const offeringIds = facultyProfileId ? await facultyOfferingIds(facultyProfileId) : null;
  if (offeringIds && !offeringIds.length) return { conflicts: 0, offeringOptions: [], roomOptions: [], schedules: [], todaySessions: 0, utilizationPercent: 0 };
  let scheduleQuery = client.from("schedules").select(`
      id, starts_at, ends_at,
      rooms (code, name, capacity),
      course_offerings (
        id, section, capacity,
        courses (code, title),
        faculty_members (employee_number, profiles (display_name))
      )
    `);
  let enrollmentQuery = client.from("enrollments").select("offering_id");
  let offeringsQuery = client.from("course_offerings").select("id, section, courses (code, title)");
  if (offeringIds) {
    scheduleQuery = scheduleQuery.in("offering_id", offeringIds);
    enrollmentQuery = enrollmentQuery.in("offering_id", offeringIds);
    offeringsQuery = offeringsQuery.in("id", offeringIds);
  }
  const [scheduleResult, enrollmentResult, offeringsResult, roomsResult] = await Promise.all([
    scheduleQuery.order("starts_at", { ascending: true }).limit(250),
    enrollmentQuery,
    offeringsQuery.order("academic_year", { ascending: false }).limit(300),
    client.from("rooms").select("id, code, name, capacity").eq("is_active", true).order("code"),
  ]);
  if (scheduleResult.error) throw new DatabaseQueryError("load schedules", scheduleResult.error.message);
  if (enrollmentResult.error) throw new DatabaseQueryError("load schedule enrollments", enrollmentResult.error.message);
  if (offeringsResult.error) throw new DatabaseQueryError("load offerings", offeringsResult.error.message);
  if (roomsResult.error) throw new DatabaseQueryError("load rooms", roomsResult.error.message);

  const enrollmentCounts = new Map<string, number>();
  enrollmentResult.data.forEach(({ offering_id }) => enrollmentCounts.set(offering_id, (enrollmentCounts.get(offering_id) ?? 0) + 1));
  const baseRows = scheduleResult.data.map((schedule) => {
    const enrollmentCount = enrollmentCounts.get(schedule.course_offerings.id) ?? 0;
    return {
      capacityMismatch: enrollmentCount > schedule.rooms.capacity,
      course: `${schedule.course_offerings.courses.code} · ${schedule.course_offerings.section}`,
      endsAt: schedule.ends_at,
      enrollmentCount,
      faculty: schedule.course_offerings.faculty_members?.profiles?.display_name ?? "Faculty unassigned",
      hasConflict: false,
      id: schedule.id,
      roomCapacity: schedule.rooms.capacity,
      roomCode: schedule.rooms.code,
      startsAt: schedule.starts_at,
    };
  });
  const schedules = baseRows.map((schedule, index) => ({
    ...schedule,
    hasConflict: baseRows.some((candidate, candidateIndex) => candidateIndex !== index && candidate.roomCode === schedule.roomCode && intervalsOverlap(schedule, candidate)),
  }));
  const today = new Date().toISOString().slice(0, 10);
  const totalSeats = schedules.reduce((sum, schedule) => sum + schedule.roomCapacity, 0);
  const allocatedSeats = schedules.reduce((sum, schedule) => sum + Math.min(schedule.enrollmentCount, schedule.roomCapacity), 0);

  return {
    conflicts: schedules.filter((schedule) => schedule.hasConflict || schedule.capacityMismatch).length,
    offeringOptions: offeringsResult.data.map((offering) => ({ id: offering.id, label: `${offering.courses.code} — ${offering.courses.title} · ${offering.section}` })),
    roomOptions: roomsResult.data.map((room) => ({ capacity: room.capacity, id: room.id, label: `${room.code} — ${room.name} (${room.capacity})` })),
    schedules,
    todaySessions: schedules.filter((schedule) => schedule.startsAt.startsWith(today)).length,
    utilizationPercent: totalSeats ? Math.round((allocatedSeats / totalSeats) * 100) : 0,
  };
}

export type CampusDashboard = {
  activeAgentRuns: number;
  attendanceRate: number | null;
  scheduleConflicts: number;
  students: number;
  todaySessions: number;
};

export async function loadCampusDashboard(): Promise<CampusDashboard> {
  const client = createSupabaseAdminClient();
  const [attendance, schedules, studentsResult, runsResult] = await Promise.all([
    loadAttendanceWorkspace(), loadScheduleWorkspace(),
    client.from("students").select("id", { count: "exact", head: true }),
    client.from("agent_runs").select("id", { count: "exact", head: true }).in("status", ["queued", "running"]),
  ]);
  if (studentsResult.error) throw new DatabaseQueryError("count students", studentsResult.error.message);
  if (runsResult.error) throw new DatabaseQueryError("count agent runs", runsResult.error.message);
  return {
    activeAgentRuns: runsResult.count ?? 0,
    attendanceRate: attendance.attendanceRate,
    scheduleConflicts: schedules.conflicts,
    students: studentsResult.count ?? 0,
    todaySessions: schedules.todaySessions,
  };
}
