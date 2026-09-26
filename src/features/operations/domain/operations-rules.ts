export const campusPolicies = {
  assessmentPassPercent: 40,
  attendanceEmailAlertPercent: 70,
  attendanceWarningPercent: 75,
  roomUtilizationTargetPercent: 80,
  scheduleConflictBufferMinutes: 0,
} as const;

export function intervalsOverlap(
  left: { endsAt: string; startsAt: string },
  right: { endsAt: string; startsAt: string },
) {
  return new Date(left.startsAt) < new Date(right.endsAt) && new Date(left.endsAt) > new Date(right.startsAt);
}

export function isFutureCampusDate(value: string, now = new Date()) {
  const selected = new Date(`${value}T00:00:00`);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return selected > today;
}
