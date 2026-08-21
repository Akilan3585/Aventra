import "server-only";

import { createSupabaseAdminClient } from "@/server/supabase/admin-client";

export async function facultyOfferingIds(profileId: string) {
  const client = createSupabaseAdminClient();
  const { data: faculty, error: facultyError } = await client
    .from("faculty_members")
    .select("id")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (facultyError || !faculty) return [];

  const { data, error } = await client
    .from("course_offerings")
    .select("id")
    .eq("faculty_id", faculty.id);
  if (error) return [];
  return data.map(({ id }) => id);
}

export async function facultyOwnsOffering(profileId: string, offeringId: string) {
  return (await facultyOfferingIds(profileId)).includes(offeringId);
}

export async function facultyOwnsEnrollment(profileId: string, enrollmentId: string) {
  const offeringIds = await facultyOfferingIds(profileId);
  if (!offeringIds.length) return false;
  const { data, error } = await createSupabaseAdminClient()
    .from("enrollments")
    .select("id")
    .eq("id", enrollmentId)
    .in("offering_id", offeringIds)
    .maybeSingle();
  return !error && Boolean(data);
}

export async function facultyEnrollmentIds(profileId: string) {
  const offeringIds = await facultyOfferingIds(profileId);
  if (!offeringIds.length) return [];
  const { data, error } = await createSupabaseAdminClient()
    .from("enrollments")
    .select("id")
    .in("offering_id", offeringIds);
  if (error) return [];
  return data.map(({ id }) => id);
}

export async function facultyStudentIds(profileId: string) {
  const offeringIds = await facultyOfferingIds(profileId);
  if (!offeringIds.length) return [];
  const { data, error } = await createSupabaseAdminClient()
    .from("enrollments")
    .select("student_id")
    .in("offering_id", offeringIds);
  if (error) return [];
  return [...new Set(data.map(({ student_id }) => student_id))];
}

export async function studentEnrollmentIds(profileId: string) {
  const client = createSupabaseAdminClient();
  const { data: student, error: studentError } = await client
    .from("students")
    .select("id")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (studentError || !student) return [];
  const { data, error } = await client
    .from("enrollments")
    .select("id")
    .eq("student_id", student.id);
  if (error) return [];
  return data.map(({ id }) => id);
}
