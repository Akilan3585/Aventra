import { describe, expect, it } from "vitest";

import {
  attendanceTrend,
  departmentAttendance,
  isAnalyticsRange,
  rangeDates,
  statusBreakdown,
  studentsBelowThreshold,
  trendDelta,
  type AnalyticsAttendanceRecord,
} from "./analytics-rules";

const mark = (studentId: string, department: string, sessionDate: string, status: AnalyticsAttendanceRecord["status"]): AnalyticsAttendanceRecord => ({
  department, sessionDate, status, studentId, studentName: studentId.toUpperCase(), studentNumber: `N-${studentId}`,
});

const records = [
  mark("a", "CSE", "2026-09-24", "present"),
  mark("a", "CSE", "2026-09-25", "absent"),
  mark("a", "CSE", "2026-09-26", "absent"),
  mark("b", "ECE", "2026-09-24", "present"),
  mark("b", "ECE", "2026-09-26", "od"),
  mark("b", "ECE", "2026-09-26", "leave"),
];

describe("analytics ranges", () => {
  it("lists inclusive dates ending today", () => {
    expect(rangeDates("2026-09-26", 3)).toEqual(["2026-09-24", "2026-09-25", "2026-09-26"]);
    expect(rangeDates("2026-03-01", 2)).toEqual(["2026-02-28", "2026-03-01"]);
  });

  it("accepts only supported ranges", () => {
    expect(isAnalyticsRange("30")).toBe(true);
    expect(isAnalyticsRange(14)).toBe(false);
  });
});

describe("attendance analytics", () => {
  it("builds a daily trend with empty days as null", () => {
    const trend = attendanceTrend(records, rangeDates("2026-09-26", 4));
    expect(trend.map((point) => point.rate)).toEqual([null, 100, 0, 50]);
    expect(trend[3]).toMatchObject({ attended: 1, counted: 2, marked: 3 });
  });

  it("counts every status", () => {
    const breakdown = Object.fromEntries(statusBreakdown(records).map((item) => [item.status, item.count]));
    expect(breakdown).toMatchObject({ absent: 2, leave: 1, od: 1, present: 2 });
  });

  it("compares departments", () => {
    expect(departmentAttendance(records)).toEqual([
      { department: "CSE", marks: 3, rate: 33.3, students: 1 },
      { department: "ECE", marks: 3, rate: 100, students: 1 },
    ]);
  });

  it("lists students below the threshold, lowest first", () => {
    const below = studentsBelowThreshold(records, 75);
    expect(below).toHaveLength(1);
    expect(below[0]).toMatchObject({ absences: 2, rate: 33.3, sessions: 3, studentId: "a" });
  });

  it("measures the change between the two halves of the range", () => {
    const trend = attendanceTrend(records, rangeDates("2026-09-26", 4));
    expect(trendDelta(trend)).toBe(-66.7);
    expect(trendDelta(attendanceTrend([], rangeDates("2026-09-26", 4)))).toBeNull();
  });
});
