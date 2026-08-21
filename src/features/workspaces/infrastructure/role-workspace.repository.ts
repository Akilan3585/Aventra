import "server-only";

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
  const [enrollmentsResult, resultsResult] = await Promise.all([
    client.from("enrollments").select(`
      id, offering_id,
      attendance_records (session_date, status),
      course_offerings (
        section,
        courses (code, title),
        faculty_members (profiles (display_name)),
        schedules (id, starts_at, ends_at, rooms (code, name))
      )
    `).eq("student_id", student.id),
    client.from("semester_results").select("id, academic_year, term, semester, gpa, cgpa, published_at").eq("student_id", student.id).order("academic_year", { ascending: false }).order("semester", { ascending: false }).limit(4),
  ]);
  assertQuery(enrollmentsResult.error, "load student enrollments");
  assertQuery(resultsResult.error, "load student results");

  const enrollments = enrollmentsResult.data ?? [];
  const attendance = enrollments.flatMap((enrollment) => enrollment.attendance_records);
  const countedAttendance = attendance.filter((record) => record.status !== "excused");
  const attended = countedAttendance.filter((record) => record.status === "present" || record.status === "late").length;
  const attendanceRate = countedAttendance.length ? Math.round((attended / countedAttendance.length) * 1000) / 10 : null;
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
    attendanceByCourse: enrollments.map((enrollment) => {
      const records = enrollment.attendance_records.filter((record) => record.status !== "excused");
      const present = records.filter((record) => record.status === "present" || record.status === "late").length;
      return {
        course: `${enrollment.course_offerings.courses.code} · ${enrollment.course_offerings.courses.title}`,
        rate: records.length ? Math.round((present / records.length) * 100) : null,
      };
    }),
    attendanceRate,
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

export async function loadFacultyRoleWorkspace(clerkUserId: string) {
  const client = createSupabaseAdminClient();
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("id, display_name")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();
  assertQuery(profileError, "load faculty profile");

  if (!profile) return { linked: false as const, messages: [] as MessageSummary[], name: "Faculty member" };

  const [facultyResult, messagesResult] = await Promise.all([
    client.from("faculty_members").select("id, employee_number, designation, departments (code, name)").eq("profile_id", profile.id).maybeSingle(),
    client.from("notifications").select("id, subject, created_at").eq("recipient_profile_id", profile.id).order("created_at", { ascending: false }).limit(3),
  ]);
  assertQuery(facultyResult.error, "load linked faculty member");
  assertQuery(messagesResult.error, "load faculty messages");
  const messages = (messagesResult.data ?? []).map((message) => ({ createdAt: message.created_at, id: message.id, subject: message.subject }));

  if (!facultyResult.data) return { linked: false as const, messages, name: profile.display_name };
  const faculty = facultyResult.data;
  const { data: offerings, error: offeringsError } = await client.from("course_offerings").select(`
    id, section, capacity,
    courses (code, title),
    enrollments (id, students (student_number, profiles (display_name)), attendance_records (session_date, status)),
    schedules (id, starts_at, ends_at, rooms (code, name))
  `).eq("faculty_id", faculty.id).order("academic_year", { ascending: false });
  assertQuery(offeringsError, "load faculty offerings");

  const courseOfferings = offerings ?? [];
  const classes: ClassSession[] = courseOfferings.flatMap((offering) => offering.schedules.map((schedule) => ({
    course: `${offering.courses.code} · ${offering.section}`,
    endsAt: schedule.ends_at,
    id: schedule.id,
    room: `${schedule.rooms.code} · ${schedule.rooms.name}`,
    startsAt: schedule.starts_at,
  })));
  const todayClasses = classes.filter((session) => isToday(session.startsAt)).sort((left, right) => left.startsAt.localeCompare(right.startsAt));
  const studentIds = new Set(courseOfferings.flatMap((offering) => offering.enrollments.map((enrollment) => enrollment.students.student_number)));
  const attendancePending = courseOfferings.reduce((total, offering) => total + offering.enrollments.filter((enrollment) => !enrollment.attendance_records.some((record) => isToday(record.session_date))).length, 0);

  return {
    attendancePending,
    courses: courseOfferings.map((offering) => ({
      code: offering.courses.code,
      enrolled: offering.enrollments.length,
      id: offering.id,
      section: offering.section,
      title: offering.courses.title,
    })),
    department: `${faculty.departments.code} · ${faculty.departments.name}`,
    designation: faculty.designation,
    employeeNumber: faculty.employee_number,
    linked: true as const,
    messages,
    name: profile.display_name,
    studentCount: studentIds.size,
    todayClasses,
  };
}
