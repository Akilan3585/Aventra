import { describe, expect, it } from "vitest";

import {
  assignmentDueDateIsValid,
  canSubmitAssignment,
  scoreIsWithinMaximum,
} from "../src/features/academics/domain/academic-rules";
import { isFutureCampusDate } from "../src/features/operations/domain/operations-rules";

describe("academic workflow rules", () => {
  const now = new Date("2026-08-10T10:00:00.000Z");

  it("requires assignment due dates to remain in the future", () => {
    expect(assignmentDueDateIsValid("", now)).toBe(true);
    expect(assignmentDueDateIsValid("2026-08-11T10:00:00.000Z", now)).toBe(true);
    expect(assignmentDueDateIsValid("2026-08-09T10:00:00.000Z", now)).toBe(false);
  });

  it("accepts submissions only for the matching offering before the deadline", () => {
    expect(canSubmitAssignment({ dueAt: "2026-08-11T10:00:00.000Z", offeringId: "offering-a" }, { offeringId: "offering-a" }, now)).toBe(true);
    expect(canSubmitAssignment({ dueAt: "2026-08-09T10:00:00.000Z", offeringId: "offering-a" }, { offeringId: "offering-a" }, now)).toBe(false);
    expect(canSubmitAssignment({ dueAt: null, offeringId: "offering-a" }, { offeringId: "offering-b" }, now)).toBe(false);
  });

  it("keeps grades inside the assignment maximum", () => {
    expect(scoreIsWithinMaximum(75, 100)).toBe(true);
    expect(scoreIsWithinMaximum(101, 100)).toBe(false);
    expect(scoreIsWithinMaximum(-1, 100)).toBe(false);
  });
});

describe("operations workflow rules", () => {
  it("rejects future attendance dates", () => {
    const now = new Date(2026, 7, 10, 18, 30);
    expect(isFutureCampusDate("2026-08-10", now)).toBe(false);
    expect(isFutureCampusDate("2026-08-11", now)).toBe(true);
  });
});
