import "server-only";

import { facultyOfferingIds, studentEnrollmentIds } from "@/server/auth/academic-scope";
import type { Role } from "@/server/auth/permissions";
import { DatabaseQueryError } from "@/server/database/database-query-error";
import { createSupabaseAdminClient } from "@/server/supabase/admin-client";

export async function loadAssignmentsWorkspace(role: Role, profileId: string | null) {
  const client = createSupabaseAdminClient();
  let offeringIds: string[] | null = null;
  let ownEnrollmentIds: string[] | null = null;
  const ownEnrollmentByOffering = new Map<string, string>();

  if (role === "faculty") offeringIds = profileId ? await facultyOfferingIds(profileId) : [];
  if (role === "student") {
    ownEnrollmentIds = profileId ? await studentEnrollmentIds(profileId) : [];
    if (ownEnrollmentIds.length) {
      const { data, error } = await client.from("enrollments").select("id, offering_id").in("id", ownEnrollmentIds);
      if (error) throw new DatabaseQueryError("load student assignment scope", error.message);
      data.forEach(({ id, offering_id }) => ownEnrollmentByOffering.set(offering_id, id));
      offeringIds = [...new Set(data.map(({ offering_id }) => offering_id))];
    } else offeringIds = [];
  }

  if (offeringIds && !offeringIds.length) return { assignments: [], offeringOptions: [] };
  let assignmentQuery = client.from("assignments").select(`
    id, offering_id, title, maximum_marks, due_at, created_at,
    course_offerings (section, academic_year, term, courses (code, title))
  `);
  let offeringsQuery = client.from("course_offerings").select("id, section, academic_year, term, courses (code, title)");
  if (offeringIds) {
    assignmentQuery = assignmentQuery.in("offering_id", offeringIds);
    offeringsQuery = offeringsQuery.in("id", offeringIds);
  }
  const [assignmentResult, offeringResult] = await Promise.all([
    assignmentQuery.order("due_at", { ascending: true, nullsFirst: false }).limit(250),
    offeringsQuery.order("academic_year", { ascending: false }),
  ]);
  if (assignmentResult.error) throw new DatabaseQueryError("load assignments", assignmentResult.error.message);
  if (offeringResult.error) throw new DatabaseQueryError("load assignment offerings", offeringResult.error.message);

  const assignmentIds = assignmentResult.data.map(({ id }) => id);
  let submissions: Array<{
    assignment_id: string; enrollment_id: string; feedback: string | null; graded_at: string | null;
    id: string; score: number | null; submitted_at: string | null;
    enrollments: { students: { student_number: string; profiles: { display_name: string } | null } };
  }> = [];
  if (assignmentIds.length) {
    let submissionQuery = client.from("assignment_submissions").select(`
      id, assignment_id, enrollment_id, submitted_at, score, feedback, graded_at,
      enrollments (students (student_number, profiles (display_name)))
    `).in("assignment_id", assignmentIds);
    if (ownEnrollmentIds) submissionQuery = submissionQuery.in("enrollment_id", ownEnrollmentIds);
    const result = await submissionQuery.order("submitted_at", { ascending: false });
    if (result.error) throw new DatabaseQueryError("load assignment submissions", result.error.message);
    submissions = result.data;
  }

  return {
    assignments: assignmentResult.data.map((assignment) => {
      const matching = submissions.filter((submission) => submission.assignment_id === assignment.id);
      const enrollmentId = ownEnrollmentByOffering.get(assignment.offering_id);
      return {
        ...assignment,
        submissions: matching.length || !enrollmentId ? matching : [{
          assignment_id: assignment.id,
          enrollment_id: enrollmentId,
          feedback: null,
          graded_at: null,
          id: `pending-${assignment.id}`,
          score: null,
          submitted_at: null,
          enrollments: { students: { student_number: "", profiles: null } },
        }],
      };
    }),
    offeringOptions: offeringResult.data.map((offering) => ({
      id: offering.id,
      label: `${offering.courses.code} — ${offering.courses.title} · ${offering.section}`,
    })),
  };
}

export async function loadEnrollmentsWorkspace() {
  const client = createSupabaseAdminClient();
  const [enrollments, students, offerings] = await Promise.all([
    client.from("enrollments").select(`
      id, enrolled_at,
      students (id, student_number, profiles (display_name)),
      course_offerings (id, section, academic_year, term, capacity, courses (code, title))
    `).order("enrolled_at", { ascending: false }).limit(500),
    client.from("students").select("id, student_number, profiles (display_name)").order("student_number"),
    client.from("course_offerings").select("id, section, academic_year, term, capacity, courses (code, title)").order("academic_year", { ascending: false }),
  ]);
  if (enrollments.error) throw new DatabaseQueryError("load enrollments", enrollments.error.message);
  if (students.error) throw new DatabaseQueryError("load enrollment students", students.error.message);
  if (offerings.error) throw new DatabaseQueryError("load enrollment offerings", offerings.error.message);
  const counts = new Map<string, number>();
  enrollments.data.forEach(({ course_offerings }) => counts.set(course_offerings.id, (counts.get(course_offerings.id) ?? 0) + 1));
  return {
    enrollments: enrollments.data,
    studentOptions: students.data.map((student) => ({ id: student.id, label: `${student.student_number} — ${student.profiles?.display_name ?? "Profile not linked"}` })),
    offeringOptions: offerings.data.map((offering) => ({
      id: offering.id,
      label: `${offering.courses.code} · ${offering.section} (${counts.get(offering.id) ?? 0}/${offering.capacity})`,
    })),
  };
}
