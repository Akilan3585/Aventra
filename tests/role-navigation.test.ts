import { describe, expect, it } from "vitest";

import { homeForRole, navigationForRole } from "../src/config/navigation";

const linksFor = (role: Parameters<typeof navigationForRole>[0]) =>
  navigationForRole(role).flatMap((group) => group.items.map((item) => item.href));

describe("role-aware workspace navigation", () => {
  it("keeps the student experience focused on personal work", () => {
    expect(homeForRole("student")).toBe("/student-workspace");
    expect(linksFor("student")).toEqual(["/student-workspace", "/assignments", "/notifications", "/profile"]);
    expect(linksFor("student")).not.toContain("/settings");
  });

  it("gives faculty teaching tools without campus administration", () => {
    expect(homeForRole("faculty")).toBe("/faculty-workspace");
    expect(linksFor("faculty")).toContain("/attendance");
    expect(linksFor("faculty")).toContain("/assignments");
    expect(linksFor("faculty")).toContain("/agents");
    expect(linksFor("faculty")).not.toContain("/audit-logs");
  });

  it("retains the full console for administrators", () => {
    expect(homeForRole("admin")).toBe("/dashboard");
    expect(linksFor("admin")).toContain("/settings");
    expect(linksFor("super-admin")).toContain("/audit-logs");
  });
});
