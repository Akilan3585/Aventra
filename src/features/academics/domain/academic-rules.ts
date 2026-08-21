export function assignmentDueDateIsValid(dueAt: string, now = new Date()) {
  return dueAt === "" || new Date(dueAt) > now;
}

export function canSubmitAssignment(
  assignment: { dueAt: string | null; offeringId: string },
  enrollment: { offeringId: string },
  now = new Date(),
) {
  if (assignment.offeringId !== enrollment.offeringId) return false;
  return !assignment.dueAt || new Date(assignment.dueAt) >= now;
}

export function scoreIsWithinMaximum(score: number, maximumMarks: number) {
  return Number.isFinite(score) && score >= 0 && score <= maximumMarks;
}
