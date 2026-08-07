import { describe, expect, it } from "vitest";

import { hasPermission, permissions } from "../src/server/auth/permissions";

describe("campus role permissions", () => {
  it("gives super admins every declared permission", () => {
    expect(permissions.every((permission) => hasPermission("super-admin", permission))).toBe(true);
  });

  it("keeps administrator settings away from non-admin roles", () => {
    expect(hasPermission("admin", "campus:manage")).toBe(true);
    expect(hasPermission("faculty", "campus:manage")).toBe(false);
    expect(hasPermission("maintenance-staff", "campus:manage")).toBe(false);
    expect(hasPermission("student", "campus:manage")).toBe(false);
  });

  it("allows students to read their workspace without privileged mutations", () => {
    expect(hasPermission("student", "reports:read")).toBe(true);
    expect(hasPermission("student", "students:manage")).toBe(false);
    expect(hasPermission("student", "agents:execute")).toBe(false);
  });
});
