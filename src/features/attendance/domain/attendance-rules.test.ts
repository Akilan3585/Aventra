import { describe, expect, it } from "vitest";

import {
  academicYearForDate,
  buildClassLabel,
  calculateAttendanceRate,
  isAttendanceSession,
  isAttendanceStatus,
  isAttendedStatus,
  isBelowAttendanceThreshold,
  summarizeAttendance,
  yearOfStudyFromSemester,
} from "./attendance-rules";

describe("attendance alert rules", () => {
  it("counts present and late records as attended", () => {
    expect(calculateAttendanceRate(["present", "late", "absent", "present"])).toBe(75);
  });

  it("counts on-duty (OD) records as attended", () => {
    expect(isAttendedStatus("od")).toBe(true);
    expect(calculateAttendanceRate(["od", "absent"])).toBe(50);
    expect(calculateAttendanceRate(["od", "od", "present", "absent"])).toBe(75);
  });

  it("excludes excused, permission, and leave records from the percentage", () => {
    expect(calculateAttendanceRate(["present", "absent", "excused"])).toBe(50);
    expect(calculateAttendanceRate(["present", "absent", "permission", "leave"])).toBe(50);
  });

  it("does not calculate a rate when every record is excused", () => {
    expect(calculateAttendanceRate(["excused", "leave"])).toBeNull();
  });

  it("recognises only the supported statuses and sessions", () => {
    expect(isAttendanceStatus("od")).toBe(true);
    expect(isAttendanceStatus("leave")).toBe(true);
    expect(isAttendanceStatus("on-duty")).toBe(false);
    expect(isAttendanceStatus(null)).toBe(false);
    expect(isAttendanceSession("Period 3")).toBe(true);
    expect(isAttendanceSession("Period 9")).toBe(false);
  });

  it("alerts only when attendance is strictly below 70 percent", () => {
    expect(isBelowAttendanceThreshold(69.9, 70)).toBe(true);
    expect(isBelowAttendanceThreshold(70, 70)).toBe(false);
    expect(isBelowAttendanceThreshold(null, 70)).toBe(false);
  });
});

describe("attendance marking summary", () => {
  it("counts each status and leaves unmarked students out of the percentage", () => {
    const summary = summarizeAttendance(["present", "present", "absent", "late", "od", null]);
    expect(summary.total).toBe(6);
    expect(summary.marked).toBe(5);
    expect(summary.unmarked).toBe(1);
    expect(summary.counts.present).toBe(2);
    expect(summary.counts.absent).toBe(1);
    expect(summary.counts.leave).toBe(0);
    expect(summary.attendancePercent).toBe(80);
  });

  it("returns a null percentage when nobody is marked", () => {
    expect(summarizeAttendance([null, null]).attendancePercent).toBeNull();
  });
});

describe("class labels", () => {
  it("derives the year of study from the semester", () => {
    expect(yearOfStudyFromSemester(1)).toBe("I");
    expect(yearOfStudyFromSemester(2)).toBe("I");
    expect(yearOfStudyFromSemester(5)).toBe("III");
    expect(yearOfStudyFromSemester(8)).toBe("IV");
    expect(yearOfStudyFromSemester(0)).toBe("I");
  });

  it("builds the class/batch label", () => {
    expect(buildClassLabel("CSE", "III", "A")).toBe("CSE-III-A");
    expect(buildClassLabel("CSE", "III", "")).toBe("CSE-III");
  });

  it("starts the campus academic year in June", () => {
    expect(academicYearForDate("2026-09-23")).toBe("2026-2027");
    expect(academicYearForDate("2027-03-01")).toBe("2026-2027");
    expect(academicYearForDate("2027-06-01")).toBe("2027-2028");
    expect(academicYearForDate("bad")).toBe("");
  });
});
