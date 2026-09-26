import "server-only";

import { offeringsWithSeats } from "@/features/students/domain/student-approval";
import { createSupabaseAdminClient } from "@/server/supabase/admin-client";

/**
 * Connects a student to classes: every course offering in the student's
 * department, plus the approving faculty member's own sections when known.
 * Sections that are full or already contain the student are skipped, and each
 * new enrollment is audited. Returns the offering ids that were added.
 */
export async function enrollStudentInClasses({
  actorProfileId,
  departmentId,
  facultyId,
  source,
  studentId,
}: {
  actorProfileId: string | null;
  departmentId: string;
  facultyId: string | null;
  source: string;
  studentId: string;
}) {
  const client = createSupabaseAdminClient();
  const [departmentOfferings, facultyOfferings] = await Promise.all([
    client.from("course_offerings").select("id, capacity, courses!inner (department_id)").eq("courses.department_id", departmentId),
    facultyId ? client.from("course_offerings").select("id, capacity").eq("faculty_id", facultyId) : Promise.resolve({ data: [] as Array<{ capacity: number; id: string }>, error: null }),
  ]);
  const offerings = new Map<string, { capacity: number; id: string }>();
  for (const offering of [...(departmentOfferings.data ?? []), ...(facultyOfferings.data ?? [])]) offerings.set(offering.id, { capacity: offering.capacity, id: offering.id });
  if (!offerings.size) return [] as string[];

  const offeringIds = [...offerings.keys()];
  const { data: enrollments } = await client.from("enrollments").select("offering_id, student_id").in("offering_id", offeringIds);
  const counts = new Map<string, number>();
  const alreadyEnrolled = new Set<string>();
  for (const enrollment of enrollments ?? []) {
    counts.set(enrollment.offering_id, (counts.get(enrollment.offering_id) ?? 0) + 1);
    if (enrollment.student_id === studentId) alreadyEnrolled.add(enrollment.offering_id);
  }
  const targets = offeringsWithSeats([...offerings.values()], counts, alreadyEnrolled);
  if (!targets.length) return [] as string[];

  const { data: inserted } = await client
    .from("enrollments")
    .insert(targets.map((offeringId) => ({ offering_id: offeringId, student_id: studentId })))
    .select("id, offering_id");
  const added: string[] = [];
  for (const row of inserted ?? []) {
    added.push(row.offering_id);
    await client.from("audit_logs").insert({
      action: "enrollment.created",
      actor_profile_id: actorProfileId,
      entity_id: row.id,
      entity_type: "enrollment",
      metadata: { offering_id: row.offering_id, source, student_id: studentId },
    });
  }
  return added;
}
