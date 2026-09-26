import { describe, expect, it } from "vitest";

import { homeForRole, navigationForRole } from "../src/config/navigation";

const linksFor = (role: Parameters<typeof navigationForRole>[0]) =>
  navigationForRole(role).flatMap((group) => group.items.map((item) => item.href));

describe("role-aware workspace navigation", () => {
  it("keeps the student experience focused on personal work", () => {
    expect(homeForRole("student")).toBe("/student-workspace");
    expect(linksFor("student")).toEqual(["/student-workspace", "/assignments", "/courses", "/notifications", "/profile"]);
    expect(linksFor("student")).not.toContain("/settings");
  });

  it("routes faculty through the campus console", () => {
    expect(homeForRole("faculty")).toBe("/dashboard");
    expect(linksFor("faculty")).toContain("/attendance");
    expect(linksFor("faculty")).toContain("/assignments");
    expect(linksFor("faculty")).not.toContain("/faculty-workspace");
  });

  it("has no faculty roster page in any console", () => {
    for (const role of ["admin", "super-admin", "faculty", "student"] as const) {
      expect(linksFor(role)).not.toContain("/faculty");
    }
  });

  it("keeps campus operations and administration out of every console", () => {
    expect(homeForRole("admin")).toBe("/dashboard");
    for (const role of ["admin", "super-admin", "faculty"] as const) {
      for (const href of ["/classrooms", "/laboratories", "/equipment", "/maintenance", "/audit-logs", "/settings", "/notifications", "/profile"]) {
        expect(linksFor(role)).not.toContain(href);
      }
    }
  });
});
