import { z } from "zod";

import { departmentIdentifierSchema, studentOnboardingSchema } from "./student-onboarding";

/**
 * Pure rules for the student-approval queue.
 *
 * A student sign-up is a `profiles` row with role `student` and status
 * `pending`. It may or may not have submitted academic details (a `students`
 * row). Faculty or admins accept the sign-up from one queue; when details are
 * missing the reviewer enters them from the official college record. Until the
 * profile becomes `active` the platform layout keeps the student on
 * /access-pending, so assignments and study materials stay closed.
 */

export type StudentApprovalReadiness = "ready" | "identity-required" | "details-required";

export type ApprovalReviewer = {
  /** Faculty must be linked to a department (faculty_members row) to approve. */
  facultyDepartmentId: string | null;
  profileId: string | null;
  role: "super-admin" | "admin" | "faculty" | "student";
};

export function studentApprovalReadiness({
  detailsSubmitted,
  identityLinked,
}: {
  detailsSubmitted: boolean;
  identityLinked: boolean;
}): StudentApprovalReadiness {
  if (!identityLinked) return "identity-required";
  if (!detailsSubmitted) return "details-required";
  return "ready";
}

export const readinessLabels: Record<StudentApprovalReadiness, string> = {
  "details-required": "details needed",
  "identity-required": "identity required",
  ready: "ready to approve",
};

/** Whether the reviewer's own account is able to approve anyone at all. */
export function reviewerCanApprove(reviewer: ApprovalReviewer) {
  if (!reviewer.profileId) return false;
  if (reviewer.role === "student") return false;
  if (reviewer.role === "faculty") return Boolean(reviewer.facultyDepartmentId);
  return true;
}

/**
 * Whether this reviewer may approve this specific pending student. A sign-up
 * without details (`studentDepartmentId` null) can be accepted by any eligible
 * reviewer, who supplies the details; faculty then place the student in their
 * own department.
 */
export function canApproveStudent({
  readiness,
  reviewer,
  studentDepartmentId,
}: {
  readiness: StudentApprovalReadiness;
  reviewer: ApprovalReviewer;
  studentDepartmentId: string | null;
}) {
  if (readiness === "identity-required") return false;
  if (!reviewerCanApprove(reviewer)) return false;
  if (reviewer.role === "faculty" && studentDepartmentId) return reviewer.facultyDepartmentId === studentDepartmentId;
  return true;
}

/** The only thing a reviewer may pick when accepting a sign-up that has no details. */
export const acceptedStudentDetailsSchema = z.object({
  departmentId: departmentIdentifierSchema.optional(),
});

/**
 * A stand-in student number for a sign-up accepted before the student
 * submitted one: the email's local part in the roster format (upper-case,
 * only letters, digits, `/`, `_`, `-`). `attempt` > 0 appends a suffix so a
 * clash with an existing roster number can be retried.
 */
export function placeholderStudentNumber(email: string, attempt = 0) {
  const local = email.split("@")[0] ?? "";
  const base = local.toUpperCase().replace(/[^A-Z0-9/_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 34) || "STUDENT";
  return attempt ? `${base}-${String(attempt).padStart(2, "0")}` : base;
}

/** Placeholder academic details used when a reviewer accepts with one click. */
export function placeholderStudentDetails({ email, now = new Date() }: { email: string; now?: Date }) {
  return studentOnboardingSchema.pick({ admissionYear: true, semester: true, studentNumber: true }).parse({
    admissionYear: now.getFullYear(),
    semester: 1,
    studentNumber: placeholderStudentNumber(email),
  });
}

/**
 * The department a newly accepted student is placed in: faculty always use
 * their own; admins must choose one.
 */
export function resolveAcceptedDepartment(reviewer: ApprovalReviewer, chosenDepartmentId: string | undefined) {
  if (reviewer.role === "faculty") return reviewer.facultyDepartmentId;
  return chosenDepartmentId ?? null;
}

/** Which of a faculty member's sections still have a seat for the new student. */
export function offeringsWithSeats(
  offerings: ReadonlyArray<{ capacity: number; id: string }>,
  enrolledCounts: ReadonlyMap<string, number>,
  alreadyEnrolled: ReadonlySet<string>,
) {
  return offerings
    .filter((offering) => !alreadyEnrolled.has(offering.id))
    .filter((offering) => (enrolledCounts.get(offering.id) ?? 0) < offering.capacity)
    .map((offering) => offering.id);
}
