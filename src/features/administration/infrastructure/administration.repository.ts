import "server-only";

import { DatabaseQueryError } from "@/server/database/database-query-error";
import { createSupabaseAdminClient } from "@/server/supabase/admin-client";

function assertQuery(error: { message: string } | null, operation: string) {
  if (error) throw new DatabaseQueryError(operation, error.message);
}

export async function loadDepartmentsWorkspace() {
  const client = createSupabaseAdminClient();
  const [departments, students, faculty, courses] = await Promise.all([
    client.from("departments").select("id, code, name, created_at").order("code"),
    client.from("students").select("department_id"),
    client.from("faculty_members").select("department_id"),
    client.from("courses").select("department_id"),
  ]);
  assertQuery(departments.error, "load departments");
  assertQuery(students.error, "load department students");
  assertQuery(faculty.error, "load department faculty");
  assertQuery(courses.error, "load department courses");

  const departmentRows = departments.data ?? [];
  const studentRows = students.data ?? [];
  const facultyRows = faculty.data ?? [];
  const courseRows = courses.data ?? [];
  return departmentRows.map((department) => ({
    ...department,
    courses: courseRows.filter((item) => item.department_id === department.id).length,
    faculty: facultyRows.filter((item) => item.department_id === department.id).length,
    students: studentRows.filter((item) => item.department_id === department.id).length,
  }));
}

export async function loadCoursesWorkspace() {
  const client = createSupabaseAdminClient();
  const [courses, departments, offerings, faculty] = await Promise.all([
    client.from("courses").select("id, code, title, credit_hours, department_id, departments (code, name)").order("code"),
    client.from("departments").select("id, code, name").order("code"),
    client.from("course_offerings").select("id, course_id, faculty_id, academic_year, term, section, capacity").order("academic_year", { ascending: false }),
    client.from("faculty_members").select("id, employee_number, designation, profiles (display_name)").order("employee_number"),
  ]);
  assertQuery(courses.error, "load courses");
  assertQuery(departments.error, "load course departments");
  assertQuery(offerings.error, "load course offerings");
  assertQuery(faculty.error, "load offering faculty");
  return { courses: courses.data ?? [], departments: departments.data ?? [], offerings: offerings.data ?? [], faculty: faculty.data ?? [] };
}

export async function loadFacultyWorkspace() {
  const client = createSupabaseAdminClient();
  const [members, departments, offerings] = await Promise.all([
    client.from("faculty_members").select("id, employee_number, designation, department_id, profiles (display_name, email), departments (code, name)").order("employee_number"),
    client.from("departments").select("id, code, name").order("code"),
    client.from("course_offerings").select("faculty_id"),
  ]);
  assertQuery(members.error, "load faculty");
  assertQuery(departments.error, "load faculty departments");
  assertQuery(offerings.error, "load faculty workload");
  return {
    departments: departments.data ?? [],
    members: (members.data ?? []).map((member) => ({
      ...member,
      offerings: (offerings.data ?? []).filter((item) => item.faculty_id === member.id).length,
    })),
  };
}

export async function loadEquipmentWorkspace() {
  const client = createSupabaseAdminClient();
  const [equipment, rooms] = await Promise.all([
    client.from("equipment").select("id, asset_tag, name, category, status, installed_at, last_serviced_at, room_id, rooms (code, name, building)").order("asset_tag"),
    client.from("rooms").select("id, code, name, building").eq("is_active", true).order("code"),
  ]);
  assertQuery(equipment.error, "load equipment");
  assertQuery(rooms.error, "load equipment rooms");
  return { equipment: equipment.data ?? [], rooms: rooms.data ?? [] };
}

export async function loadPerformanceWorkspace() {
  const client = createSupabaseAdminClient();
  const [results, students] = await Promise.all([
    client.from("semester_results").select("id, student_id, academic_year, term, semester, gpa, cgpa, published_at, students (student_number, profiles (display_name))").order("academic_year", { ascending: false }).order("semester", { ascending: false }).limit(300),
    client.from("students").select("id, student_number, profiles (display_name)").order("student_number"),
  ]);
  assertQuery(results.error, "load semester results");
  assertQuery(students.error, "load performance students");
  return { results: results.data ?? [], students: students.data ?? [] };
}

export async function loadNotificationsWorkspace(profileId: string, canManage: boolean) {
  const client = createSupabaseAdminClient();
  const notificationQuery = client.from("notifications").select("id, recipient_profile_id, channel, subject, body, status, sent_at, read_at, created_at, profiles (display_name, email)").order("created_at", { ascending: false }).limit(200);
  const [notifications, profiles] = await Promise.all([
    canManage ? notificationQuery : notificationQuery.eq("recipient_profile_id", profileId),
    client.from("profiles").select("id, display_name, email, campus_role").order("display_name"),
  ]);
  assertQuery(notifications.error, "load notifications");
  assertQuery(profiles.error, "load notification recipients");
  return { notifications: notifications.data ?? [], profiles: profiles.data ?? [] };
}

export async function loadAuditWorkspace() {
  const client = createSupabaseAdminClient();
  const { data, error } = await client.from("audit_logs").select("id, action, entity_type, entity_id, correlation_id, metadata, created_at, profiles (display_name, email)").order("created_at", { ascending: false }).limit(300);
  assertQuery(error, "load audit logs");
  return data ?? [];
}

export async function loadProfileWorkspace(clerkUserId: string) {
  const client = createSupabaseAdminClient();
  const { data, error } = await client.from("profiles").select("id, clerk_user_id, display_name, email, campus_role, created_at, updated_at").eq("clerk_user_id", clerkUserId).maybeSingle();
  assertQuery(error, "load campus profile");
  return data;
}

export async function resolveActorProfileId(clerkUserId: string) {
  const client = createSupabaseAdminClient();
  const { data } = await client.from("profiles").select("id").eq("clerk_user_id", clerkUserId).maybeSingle();
  return data?.id ?? null;
}
