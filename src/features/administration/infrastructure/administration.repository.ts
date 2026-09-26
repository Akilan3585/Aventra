import "server-only";

import { DatabaseQueryError } from "@/server/database/database-query-error";
import { createSupabaseAdminClient } from "@/server/supabase/admin-client";
import { facultyOfferingIds } from "@/server/auth/academic-scope";

function assertQuery(error: { message: string } | null, operation: string) {
  if (error) throw new DatabaseQueryError(operation, error.message);
}

export async function loadCoursesWorkspace(facultyProfileId?: string) {
  const client = createSupabaseAdminClient();
  const scopedOfferingIds = facultyProfileId ? await facultyOfferingIds(facultyProfileId) : null;
  if (scopedOfferingIds && !scopedOfferingIds.length) return { courses: [], departments: [], offerings: [], faculty: [] };
  let offeringsQuery = client.from("course_offerings").select("id, course_id, faculty_id, academic_year, term, section, capacity");
  if (scopedOfferingIds) offeringsQuery = offeringsQuery.in("id", scopedOfferingIds);
  const [courses, departments, offerings, faculty] = await Promise.all([
    client.from("courses").select("id, code, title, credit_hours, department_id, departments (code, name)").order("code"),
    client.from("departments").select("id, code, name").order("code"),
    offeringsQuery.order("academic_year", { ascending: false }),
    client.from("faculty_members").select("id, employee_number, designation, profiles (display_name)").order("employee_number"),
  ]);
  assertQuery(courses.error, "load courses");
  assertQuery(departments.error, "load course departments");
  assertQuery(offerings.error, "load course offerings");
  assertQuery(faculty.error, "load offering faculty");
  const offeringRows = offerings.data ?? [];
  const courseIds = new Set(offeringRows.map((item) => item.course_id));
  return {
    courses: scopedOfferingIds ? (courses.data ?? []).filter((course) => courseIds.has(course.id)) : courses.data ?? [],
    departments: departments.data ?? [],
    offerings: offeringRows,
    faculty: faculty.data ?? [],
  };
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

/** Students only ever see their own messages; the query is scoped server-side. */
export async function loadNotificationsWorkspace(profileId: string) {
  const client = createSupabaseAdminClient();
  const { data, error } = await client
    .from("notifications")
    .select("id, recipient_profile_id, channel, subject, body, status, sent_at, read_at, created_at")
    .eq("recipient_profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(200);
  assertQuery(error, "load notifications");
  return { notifications: data ?? [] };
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
