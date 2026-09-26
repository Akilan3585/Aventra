import { describe, expect, it } from "vitest";

import {
  acceptedStudentDetailsSchema,
  canApproveStudent,
  offeringsWithSeats,
  placeholderStudentDetails,
  placeholderStudentNumber,
  resolveAcceptedDepartment,
  reviewerCanApprove,
  studentApprovalReadiness,
} from "./student-approval";

const cse = "10000000-0000-0000-0000-000000000001";
const ece = "10000000-0000-0000-0000-000000000002";

const admin = { facultyDepartmentId: null, profileId: "admin-1", role: "admin" as const };
const linkedFaculty = { facultyDepartmentId: cse, profileId: "fac-1", role: "faculty" as const };
const unlinkedFaculty = { facultyDepartmentId: null, profileId: "fac-2", role: "faculty" as const };

describe("student approval readiness", () => {
  it("requires a linked Clerk identity first", () => {
    expect(studentApprovalReadiness({ detailsSubmitted: true, identityLinked: false })).toBe("identity-required");
    expect(studentApprovalReadiness({ detailsSubmitted: false, identityLinked: false })).toBe("identity-required");
  });

  it("flags a verified sign-up that has no academic details", () => {
    expect(studentApprovalReadiness({ detailsSubmitted: false, identityLinked: true })).toBe("details-required");
  });

  it("is ready once identity and details are both present", () => {
    expect(studentApprovalReadiness({ detailsSubmitted: true, identityLinked: true })).toBe("ready");
  });
});

describe("reviewer approval rights", () => {
  it("lets admins approve without a department link", () => {
    expect(reviewerCanApprove(admin)).toBe(true);
    expect(reviewerCanApprove({ ...admin, role: "super-admin" })).toBe(true);
  });

  it("requires faculty to be linked to a department", () => {
    expect(reviewerCanApprove(linkedFaculty)).toBe(true);
    expect(reviewerCanApprove(unlinkedFaculty)).toBe(false);
  });

  it("never lets students or unlinked staff approve", () => {
    expect(reviewerCanApprove({ facultyDepartmentId: cse, profileId: "stu", role: "student" })).toBe(false);
    expect(reviewerCanApprove({ ...admin, profileId: null })).toBe(false);
  });
});

describe("approving a specific student", () => {
  it("blocks approval until identity is verified", () => {
    expect(canApproveStudent({ readiness: "identity-required", reviewer: admin, studentDepartmentId: cse })).toBe(false);
  });

  it("lets an eligible reviewer accept a sign-up that has no details yet", () => {
    expect(canApproveStudent({ readiness: "details-required", reviewer: linkedFaculty, studentDepartmentId: null })).toBe(true);
    expect(canApproveStudent({ readiness: "details-required", reviewer: admin, studentDepartmentId: null })).toBe(true);
    expect(canApproveStudent({ readiness: "details-required", reviewer: unlinkedFaculty, studentDepartmentId: null })).toBe(false);
  });

  it("scopes faculty to their own department once details exist", () => {
    expect(canApproveStudent({ readiness: "ready", reviewer: linkedFaculty, studentDepartmentId: cse })).toBe(true);
    expect(canApproveStudent({ readiness: "ready", reviewer: linkedFaculty, studentDepartmentId: ece })).toBe(false);
    expect(canApproveStudent({ readiness: "ready", reviewer: unlinkedFaculty, studentDepartmentId: cse })).toBe(false);
  });

  it("lets admins approve any department", () => {
    expect(canApproveStudent({ readiness: "ready", reviewer: admin, studentDepartmentId: ece })).toBe(true);
  });
});

describe("accepting a sign-up with one click", () => {
  it("derives a roster-safe placeholder student number from the email", () => {
    expect(placeholderStudentNumber("dharshini.s2023aiml@sece.ac.in")).toBe("DHARSHINI-S2023AIML");
    expect(placeholderStudentNumber("a+b__c@x.edu")).toBe("A-B__C");
    expect(placeholderStudentNumber("@x.edu")).toBe("STUDENT");
    expect(placeholderStudentNumber("maya@x.edu", 2)).toBe("MAYA-02");
  });

  it("fills placeholder details that satisfy the onboarding rules", () => {
    const details = placeholderStudentDetails({ email: "maya.patel@demo.aventra.example", now: new Date("2026-09-24") });
    expect(details).toEqual({ admissionYear: 2026, semester: 1, studentNumber: "MAYA-PATEL" });
  });

  it("accepts an omitted department and rejects an invalid one", () => {
    expect(acceptedStudentDetailsSchema.safeParse({}).success).toBe(true);
    expect(acceptedStudentDetailsSchema.safeParse({ departmentId: "cse" }).success).toBe(false);
    expect(acceptedStudentDetailsSchema.safeParse({ departmentId: cse }).success).toBe(true);
  });

  it("places faculty-accepted students in the faculty department and admin-accepted ones where chosen", () => {
    expect(resolveAcceptedDepartment(linkedFaculty, ece)).toBe(cse);
    expect(resolveAcceptedDepartment(admin, ece)).toBe(ece);
    expect(resolveAcceptedDepartment(admin, undefined)).toBeNull();
    expect(resolveAcceptedDepartment(unlinkedFaculty, ece)).toBeNull();
  });
});

describe("connecting an accepted student to the faculty member's sections", () => {
  it("enrolls only into sections with a free seat that the student is not already in", () => {
    const offerings = [{ capacity: 2, id: "o-full" }, { capacity: 30, id: "o-open" }, { capacity: 30, id: "o-existing" }];
    const counts = new Map([["o-full", 2], ["o-open", 1]]);
    expect(offeringsWithSeats(offerings, counts, new Set(["o-existing"]))).toEqual(["o-open"]);
  });
});
