import { describe, expect, it } from "vitest";

import { calculateAttendanceRate, isBelowAttendanceThreshold } from "./attendance-rules";

describe("attendance alert rules", () => {
  it("counts present and late records as attended", () => {
    expect(calculateAttendanceRate(["present", "late", "absent", "present"])).toBe(75);
  });

  it("excludes excused records from the percentage", () => {
    expect(calculateAttendanceRate(["present", "absent", "excused"])).toBe(50);
  });

  it("does not calculate a rate when every record is excused", () => {
    expect(calculateAttendanceRate(["excused", "excused"])).toBeNull();
  });

  it("alerts only when attendance is strictly below 70 percent", () => {
    expect(isBelowAttendanceThreshold(69.9, 70)).toBe(true);
    expect(isBelowAttendanceThreshold(70, 70)).toBe(false);
    expect(isBelowAttendanceThreshold(null, 70)).toBe(false);
  });
});
