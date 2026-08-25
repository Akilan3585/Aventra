export const campusPolicies = {
  attendanceEmailAlertPercent: 70,
  attendanceWarningPercent: 75,
  criticalTicketHours: 4,
  highTicketHours: 12,
  roomUtilizationTargetPercent: 80,
  scheduleConflictBufferMinutes: 0,
} as const;

export const maintenanceStatuses = [
  "open",
  "assigned",
  "in_progress",
  "resolved",
  "closed",
] as const;

export type MaintenanceStatus = (typeof maintenanceStatuses)[number];

const maintenanceTransitions: Readonly<Record<MaintenanceStatus, readonly MaintenanceStatus[]>> = {
  open: ["assigned", "in_progress"],
  assigned: ["open", "in_progress"],
  in_progress: ["assigned", "resolved"],
  resolved: ["in_progress", "closed"],
  closed: [],
};

export function intervalsOverlap(
  left: { endsAt: string; startsAt: string },
  right: { endsAt: string; startsAt: string },
) {
  return new Date(left.startsAt) < new Date(right.endsAt) && new Date(left.endsAt) > new Date(right.startsAt);
}

export function ticketSlaHours(priority: "low" | "medium" | "high" | "critical") {
  return { critical: 4, high: 12, low: 72, medium: 36 }[priority];
}

export function canTransitionMaintenanceTicket(
  current: MaintenanceStatus,
  next: MaintenanceStatus,
) {
  return current === next || maintenanceTransitions[current].includes(next);
}

export function maintenanceTransitionNeedsVerification(status: MaintenanceStatus) {
  return status === "resolved" || status === "closed";
}

export function isFutureCampusDate(value: string, now = new Date()) {
  const selected = new Date(`${value}T00:00:00`);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return selected > today;
}

export function readinessScore({ active, degraded, offline, openTickets }: { active: boolean; degraded: number; offline: number; openTickets: number }) {
  if (!active) return 0;
  return Math.max(0, Math.min(100, 100 - offline * 30 - degraded * 12 - openTickets * 8));
}

export function readinessLabel(score: number): "ready" | "attention" | "unavailable" {
  return score >= 85 ? "ready" : score >= 60 ? "attention" : "unavailable";
}
