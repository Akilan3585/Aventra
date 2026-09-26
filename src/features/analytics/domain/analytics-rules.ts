import {
  attendanceStatuses,
  calculateAttendanceRate,
  isAttendedStatus,
  countsTowardAttendance,
  type AttendanceStatus,
} from "../../attendance/domain/attendance-rules";

/** One attendance mark with the student context the analytics need. */
export type AnalyticsAttendanceRecord = {
  department: string;
  sessionDate: string;
  status: AttendanceStatus;
  studentId: string;
  studentName: string;
  studentNumber: string;
};

export const analyticsRanges = [7, 30, 90] as const;
export type AnalyticsRange = (typeof analyticsRanges)[number];

export function isAnalyticsRange(value: unknown): value is AnalyticsRange {
  return analyticsRanges.includes(Number(value) as AnalyticsRange);
}

/** Inclusive list of ISO dates ending on `today`. */
export function rangeDates(today: string, days: number): string[] {
  const end = new Date(`${today}T00:00:00Z`);
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(end);
    date.setUTCDate(end.getUTCDate() - (days - 1 - index));
    return date.toISOString().slice(0, 10);
  });
}

export type TrendPoint = { attended: number; counted: number; date: string; marked: number; rate: number | null };

/** Daily attendance rate across the range; days without sessions have a null rate. */
export function attendanceTrend(records: readonly AnalyticsAttendanceRecord[], dates: readonly string[]): TrendPoint[] {
  const byDate = new Map<string, AttendanceStatus[]>();
  for (const record of records) byDate.set(record.sessionDate, [...(byDate.get(record.sessionDate) ?? []), record.status]);
  return dates.map((date) => {
    const statuses = byDate.get(date) ?? [];
    const counted = statuses.filter(countsTowardAttendance);
    return {
      attended: counted.filter(isAttendedStatus).length,
      counted: counted.length,
      date,
      marked: statuses.length,
      rate: calculateAttendanceRate(statuses),
    };
  });
}

export function statusBreakdown(records: readonly AnalyticsAttendanceRecord[]) {
  const counts = Object.fromEntries(attendanceStatuses.map((status) => [status, 0])) as Record<AttendanceStatus, number>;
  for (const record of records) counts[record.status] += 1;
  return attendanceStatuses.map((status) => ({ count: counts[status], status }));
}

export type DepartmentAttendance = { department: string; marks: number; rate: number | null; students: number };

export function departmentAttendance(records: readonly AnalyticsAttendanceRecord[]): DepartmentAttendance[] {
  const groups = new Map<string, AnalyticsAttendanceRecord[]>();
  for (const record of records) groups.set(record.department, [...(groups.get(record.department) ?? []), record]);
  return [...groups.entries()]
    .map(([department, items]) => ({
      department,
      marks: items.length,
      rate: calculateAttendanceRate(items.map((item) => item.status)),
      students: new Set(items.map((item) => item.studentId)).size,
    }))
    .sort((left, right) => left.department.localeCompare(right.department));
}

export type StudentAttendanceSummary = {
  absences: number;
  department: string;
  rate: number;
  sessions: number;
  studentId: string;
  studentName: string;
  studentNumber: string;
};

/** Students whose rate in the range is below the threshold, lowest first. */
export function studentsBelowThreshold(records: readonly AnalyticsAttendanceRecord[], threshold: number): StudentAttendanceSummary[] {
  const groups = new Map<string, AnalyticsAttendanceRecord[]>();
  for (const record of records) groups.set(record.studentId, [...(groups.get(record.studentId) ?? []), record]);
  const result: StudentAttendanceSummary[] = [];
  for (const [studentId, items] of groups) {
    const rate = calculateAttendanceRate(items.map((item) => item.status));
    if (rate === null || rate >= threshold) continue;
    result.push({
      absences: items.filter((item) => item.status === "absent").length,
      department: items[0].department,
      rate,
      sessions: items.length,
      studentId,
      studentName: items[0].studentName,
      studentNumber: items[0].studentNumber,
    });
  }
  return result.sort((left, right) => left.rate - right.rate || right.absences - left.absences);
}

/** Change between the first and second half of the range, in percentage points. */
export function trendDelta(points: readonly TrendPoint[]): number | null {
  const half = Math.floor(points.length / 2);
  const rate = (slice: readonly TrendPoint[]) => {
    const counted = slice.reduce((sum, point) => sum + point.counted, 0);
    return counted ? (slice.reduce((sum, point) => sum + point.attended, 0) / counted) * 100 : null;
  };
  const before = rate(points.slice(0, half));
  const after = rate(points.slice(half));
  return before === null || after === null ? null : Math.round((after - before) * 10) / 10;
}
