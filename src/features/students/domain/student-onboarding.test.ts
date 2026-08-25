import { describe, expect, it } from "vitest";

import { canSubmitStudentOnboarding, studentOnboardingSchema } from "./student-onboarding";

describe("student onboarding policy", () => {
  it("allows an unlinked or pending student to submit", () => {
    expect(canSubmitStudentOnboarding({ role: null, status: "unlinked" })).toBe(true);
    expect(canSubmitStudentOnboarding({ role: "student", status: "pending" })).toBe(true);
  });

  it("does not allow a privileged role to onboard as a student", () => {
    expect(canSubmitStudentOnboarding({ role: "faculty", status: "pending" })).toBe(false);
    expect(canSubmitStudentOnboarding({ role: "admin", status: "active" })).toBe(false);
  });

  it("does not allow suspended or expired accounts", () => {
    expect(canSubmitStudentOnboarding({ role: "student", status: "suspended" })).toBe(false);
    expect(canSubmitStudentOnboarding({ role: "student", status: "expired" })).toBe(false);
  });

  it("does not let an active student rewrite an approved roster record", () => {
    expect(canSubmitStudentOnboarding({ role: "student", status: "active" })).toBe(false);
  });

  it("normalizes and validates campus identifiers", () => {
    const result = studentOnboardingSchema.safeParse({
      admissionYear: String(new Date().getFullYear()),
      departmentId: "10000000-0000-0000-0000-000000000002",
      displayName: "  Asha Raman  ",
      semester: "3",
      studentNumber: "  cse/2026/041  ",
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.displayName).toBe("Asha Raman");
  });

  it("rejects a department value that is not a database identifier", () => {
    const result = studentOnboardingSchema.safeParse({
      admissionYear: "2026",
      departmentId: "../../faculty",
      displayName: "Asha Raman",
      semester: "3",
      studentNumber: "CSE/2026/041",
    });

    expect(result.success).toBe(false);
  });
});
