export const attendanceStatuses = ["present", "absent", "late", "od", "permission", "leave", "excused"] as const;

export type AttendanceStatus = (typeof attendanceStatuses)[number];

export const attendanceStatusLabels: Readonly<Record<AttendanceStatus, string>> = {
  absent: "Absent",
  excused: "Excused",
  late: "Late",
  leave: "Leave",
  od: "On duty (OD)",
  permission: "Permission",
  present: "Present",
};

/** Short labels for the quick-mark buttons and sheet cells. */
export const attendanceStatusShortLabels: Readonly<Record<AttendanceStatus, string>> = {
  absent: "Absent",
  excused: "Excused",
  late: "Late",
  leave: "Leave",
  od: "OD",
  permission: "Permission",
  present: "Present",
};

/** Periods a teacher can mark. Kept as a fixed list so sheet rows stay comparable. */
export const attendanceSessions = [
  "Period 1",
  "Period 2",
  "Period 3",
  "Period 4",
  "Period 5",
  "Period 6",
  "Period 7",
  "Period 8",
] as const;

export type AttendanceSession = (typeof attendanceSessions)[number];

export const defaultAttendanceSession: AttendanceSession = "Period 1";

export const attendanceRemarksMaxLength = 500;

export function isAttendanceStatus(value: unknown): value is AttendanceStatus {
  return typeof value === "string" && attendanceStatuses.includes(value as AttendanceStatus);
}

export function isAttendanceSession(value: unknown): value is AttendanceSession {
  return typeof value === "string" && attendanceSessions.includes(value as AttendanceSession);
}

/** Excused, permission, and leave sessions are left out of the percentage entirely. */
export function countsTowardAttendance(status: AttendanceStatus) {
  return status !== "excused" && status !== "permission" && status !== "leave";
}

/** Present, late, and on-duty (OD) sessions all count as attended. */
export function isAttendedStatus(status: AttendanceStatus) {
  return status === "present" || status === "late" || status === "od";
}

export function calculateAttendanceRate(statuses: readonly AttendanceStatus[]) {
  const counted = statuses.filter(countsTowardAttendance);
  if (!counted.length) return null;

  const attended = counted.filter(isAttendedStatus).length;
  return Math.round((attended / counted.length) * 1000) / 10;
}

export function isBelowAttendanceThreshold(rate: number | null, threshold: number): rate is number {
  return rate !== null && rate < threshold;
}

export type AttendanceSummary = {
  attendancePercent: number | null;
  counts: Record<AttendanceStatus, number>;
  marked: number;
  total: number;
  unmarked: number;
};

/** Live summary for a marking session; `null` entries are students not yet marked. */
export function summarizeAttendance(statuses: ReadonlyArray<AttendanceStatus | null>): AttendanceSummary {
  const counts = Object.fromEntries(attendanceStatuses.map((status) => [status, 0])) as Record<AttendanceStatus, number>;
  const marked: AttendanceStatus[] = [];
  for (const status of statuses) {
    if (status === null) continue;
    counts[status] += 1;
    marked.push(status);
  }
  return {
    attendancePercent: calculateAttendanceRate(marked),
    counts,
    marked: marked.length,
    total: statuses.length,
    unmarked: statuses.length - marked.length,
  };
}

const yearLabels = ["I", "II", "III", "IV", "V", "VI"] as const;

/** Two semesters per year of study: semester 5 or 6 is year III. */
export function yearOfStudyFromSemester(semester: number) {
  const index = Math.max(0, Math.min(yearLabels.length - 1, Math.ceil(semester / 2) - 1));
  return yearLabels[index];
}

/** Class/batch label such as "CSE-III-A", or "CSE-III" when there is no section. */
export function buildClassLabel(departmentCode: string, year: string, section: string) {
  return [departmentCode, year, section].filter(Boolean).join("-");
}

/**
 * Academic year label for a session date. The campus year starts in June, so
 * 2026-09-23 is "2026-2027" and 2027-03-01 is also "2026-2027".
 */
export function academicYearForDate(isoDate: string) {
  const [year, month] = isoDate.split("-").map(Number);
  if (!year || !month) return "";
  const start = month >= 6 ? year : year - 1;
  return `${start}-${start + 1}`;
}
