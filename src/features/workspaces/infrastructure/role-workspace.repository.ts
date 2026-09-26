import "server-only";

import { calculateAttendanceRate, isAttendanceStatus } from "@/features/attendance/domain/attendance-rules";
import { DatabaseQueryError } from "@/server/database/database-query-error";
import { createSupabaseAdminClient } from "@/server/supabase/admin-client";

type ClassSession = {
  course: string;
  endsAt: string;
  id: string;
  room: string;
  startsAt: string;
};

type MessageSummary = { createdAt: string; id: string; subject: string };

function assertQuery(error: { message: string } | null, operation: string) {
  if (error) throw new DatabaseQueryError(operation, error.message);
}

function isToday(value: string) {
  return value.slice(0, 10) === new Date().toISOString().slice(0, 10);
}

export async function loadStudentRoleWorkspace(clerkUserId: string) {
  const client = createSupabaseAdminClient();
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("id, display_name")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();
  assertQuery(profileError, "load student profile");

  if (!profile) return { linked: false as const, messages: [] as MessageSummary[], name: "Student" };

  const [studentResult, messagesResult] = await Promise.all([
    client.from("students").select("id, student_number, semester, departments (code, name)").eq("profile_id", profile.id).maybeSingle(),
    client.from("notifications").select("id, subject, created_at").eq("recipient_profile_id", profile.id).order("created_at", { ascending: false }).limit(3),
  ]);
  assertQuery(studentResult.error, "load linked student");
  assertQuery(messagesResult.error, "load student messages");
  const messages = (messagesResult.data ?? []).map((message) => ({ createdAt: message.created_at, id: message.id, subject: message.subject }));

  if (!studentResult.data) return { linked: false as const, messages, name: profile.display_name };
  const student = studentResult.data;
  const [enrollmentsResult, resultsResult, attendanceResult] = await Promise.all([
    client.from("enrollments").select(`
      id, offering_id,
      course_offerings (
        section,
        courses (code, title),
        faculty_members (profiles (display_name)),
        schedules (id, starts_at, ends_at, rooms (code, name))
      )
    `).eq("student_id", student.id),
    client.from("semester_results").select("id, academic_year, term, semester, gpa, cgpa, published_at").eq("student_id", student.id).order("academic_year", { ascending: false }).order("semester", { ascending: false }).limit(4),
    client.from("attendance_records").select("id, session_date, session, status").eq("student_id", student.id).order("session_date", { ascending: false }).order("session", { ascending: false }),
  ]);
  assertQuery(enrollmentsResult.error, "load student enrollments");
  assertQuery(resultsResult.error, "load student results");
  assertQuery(attendanceResult.error, "load student attendance");

  const enrollments = enrollmentsResult.data ?? [];
  const attendance = attendanceResult.data ?? [];
  const attendanceRate = calculateAttendanceRate(attendance.map((record) => record.status).filter(isAttendanceStatus));
  const classes: ClassSession[] = enrollments.flatMap((enrollment) => enrollment.course_offerings.schedules.map((schedule) => ({
    course: `${enrollment.course_offerings.courses.code} · ${enrollment.course_offerings.section}`,
    endsAt: schedule.ends_at,
    id: schedule.id,
    room: `${schedule.rooms.code} · ${schedule.rooms.name}`,
    startsAt: schedule.starts_at,
  })));
  const todayClasses = classes.filter((session) => isToday(session.startsAt)).sort((left, right) => left.startsAt.localeCompare(right.startsAt));
  const latestResult = resultsResult.data?.[0] ?? null;

  return {
    attendanceRate,
    recentAttendance: attendance.slice(0, 8).map((record) => ({
      date: record.session_date,
      id: record.id,
      session: record.session,
      status: isAttendanceStatus(record.status) ? record.status : null,
    })),
    courses: enrollments.map((enrollment) => ({
      code: enrollment.course_offerings.courses.code,
      faculty: enrollment.course_offerings.faculty_members?.profiles?.display_name ?? "Faculty to be assigned",
      title: enrollment.course_offerings.courses.title,
    })),
    department: `${student.departments.code} · ${student.departments.name}`,
    latestResult,
    linked: true as const,
    messages,
    name: profile.display_name,
    results: resultsResult.data ?? [],
    semester: student.semester,
    studentNumber: student.student_number,
    todayClasses,
  };
}
