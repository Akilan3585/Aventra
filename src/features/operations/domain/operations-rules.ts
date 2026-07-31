export const campusPolicies = {
  attendanceWarningPercent: 75,
  criticalTicketHours: 4,
  highTicketHours: 12,
  roomUtilizationTargetPercent: 80,
  scheduleConflictBufferMinutes: 0,
} as const;

export function intervalsOverlap(
  left: { endsAt: string; startsAt: string },
  right: { endsAt: string; startsAt: string },
) {
  return new Date(left.startsAt) < new Date(right.endsAt) && new Date(left.endsAt) > new Date(right.startsAt);
}

export function ticketSlaHours(priority: "low" | "medium" | "high" | "critical") {
  return { critical: 4, high: 12, low: 72, medium: 36 }[priority];
}

export function readinessScore({ active, degraded, offline, openTickets }: { active: boolean; degraded: number; offline: number; openTickets: number }) {
  if (!active) return 0;
  return Math.max(0, Math.min(100, 100 - offline * 30 - degraded * 12 - openTickets * 8));
}

export function readinessLabel(score: number): "ready" | "attention" | "unavailable" {
  return score >= 85 ? "ready" : score >= 60 ? "attention" : "unavailable";
}
