export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export function calculateAttendanceRate(statuses: readonly AttendanceStatus[]) {
  const counted = statuses.filter((status) => status !== "excused");
  if (!counted.length) return null;

  const attended = counted.filter((status) => status === "present" || status === "late").length;
  return Math.round((attended / counted.length) * 1000) / 10;
}

export function isBelowAttendanceThreshold(rate: number | null, threshold: number): rate is number {
  return rate !== null && rate < threshold;
}
