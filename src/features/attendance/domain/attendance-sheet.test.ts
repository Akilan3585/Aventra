import { describe, expect, it } from "vitest";

import {
  attendanceSheetHeader,
  buildAttendanceRow,
  buildAuditRow,
  buildStudentRow,
  formatSheetDate,
  planSheetUpsert,
  sanitizeSheetText,
  type AttendanceMirrorRecord,
} from "./attendance-sheet";

const record: AttendanceMirrorRecord = {
  academicYear: "2026-2027",
  classLabel: "CSE-III-A",
  department: "CSE",
  id: "8f1c2b3e-0000-4000-8000-000000000001",
  markedAt: "2026-09-23T09:45:00.000Z",
  markedBy: "teacher@example.com",
  registerNumber: "23CSE001",
  remarks: null,
  section: "A",
  session: "Period 1",
  sessionDate: "2026-09-23",
  status: "present",
  studentId: "STU001",
  studentName: "Student One",
  updatedAt: "2026-09-23T09:45:00.000Z",
  year: "III",
};

describe("attendance sheet rows", () => {
  it("writes one normalized row per record in header order", () => {
    const row = buildAttendanceRow(record);
    expect(row).toHaveLength(attendanceSheetHeader.length);
    expect(row).toEqual([
      record.id, "23-09-2026", "2026-2027", "CSE", "III", "A", "CSE-III-A", "Period 1",
      "STU001", "23CSE001", "Student One", "Present", "", "teacher@example.com",
      "2026-09-23T09:45:00.000Z", "2026-09-23T09:45:00.000Z",
    ]);
  });

  it("neutralises formula-like user text and line breaks", () => {
    expect(sanitizeSheetText("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(sanitizeSheetText("+1")).toBe("'+1");
    expect(sanitizeSheetText("line one\nline two")).toBe("line one line two");
    expect(sanitizeSheetText(null)).toBe("");
    expect(buildAttendanceRow({ ...record, remarks: "-late bus" })[12]).toBe("'-late bus");
  });

  it("formats dates for readers and keeps unknown formats intact", () => {
    expect(formatSheetDate("2026-09-23")).toBe("23-09-2026");
    expect(formatSheetDate("bad")).toBe("bad");
  });

  it("writes student and audit rows", () => {
    expect(buildStudentRow({ classLabel: "CSE-III-A", department: "CSE", registerNumber: "23CSE001", section: "A", status: "Active", studentId: "STU001", studentName: "Student One", year: "III" }))
      .toEqual(["STU001", "23CSE001", "Student One", "CSE", "III", "A", "CSE-III-A", "Active"]);
    expect(buildAuditRow({ action: "UPDATE", attendanceId: "att-1", id: "audit-1", newStatus: "absent", oldStatus: "present", timestamp: "2026-09-23T10:00:00.000Z", user: "teacher@example.com" }))
      .toEqual(["audit-1", "att-1", "UPDATE", "teacher@example.com", "2026-09-23T10:00:00.000Z", "Present", "Absent"]);
  });
});

describe("sheet upsert planning", () => {
  it("updates rows whose id already exists and appends the rest", () => {
    const plan = planSheetUpsert(["Attendance ID", "a", "b", undefined, "b"], ["b", "c", "a"], (id) => id);
    expect(plan.updates).toEqual([{ item: "b", rowNumber: 3 }, { item: "a", rowNumber: 2 }]);
    expect(plan.appends).toEqual(["c"]);
  });

  it("never matches the header row", () => {
    const plan = planSheetUpsert(["a"], ["a"], (id) => id);
    expect(plan.updates).toEqual([]);
    expect(plan.appends).toEqual(["a"]);
  });
});
