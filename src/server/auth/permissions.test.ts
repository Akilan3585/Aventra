import { describe, expect, it } from "vitest";

import {
  clerkOrganizationPermissionByCampusPermission,
  clerkOrganizationRoleMatchesCampusRole,
  hasPermission,
  workspaceAudienceForRole,
} from "./permissions";

describe("campus role authorization", () => {
  it("keeps student access limited to their learning workspace", () => {
    expect(hasPermission("student", "workspace:access")).toBe(true);
    expect(hasPermission("student", "assignments:read")).toBe(true);
    expect(hasPermission("student", "attendance:record")).toBe(false);
    expect(hasPermission("student", "campus:manage")).toBe(false);
  });

  it("allows faculty teaching actions without campus administration", () => {
    expect(hasPermission("faculty", "attendance:record")).toBe(true);
    expect(hasPermission("faculty", "assignments:manage")).toBe(true);
    expect(hasPermission("faculty", "materials:manage")).toBe(true);
    expect(hasPermission("faculty", "students:approve")).toBe(true);
    expect(hasPermission("faculty", "campus:manage")).toBe(false);
  });

  it("keeps student approval away from student accounts", () => {
    expect(hasPermission("student", "students:approve")).toBe(false);
    expect(hasPermission("admin", "students:approve")).toBe(true);
  });

  it("maps organization users to the campus administration audience", () => {
    expect(workspaceAudienceForRole("student")).toBe("student");
    expect(workspaceAudienceForRole("faculty")).toBe("organization");
    expect(workspaceAudienceForRole("admin")).toBe("organization");
    expect(workspaceAudienceForRole("super-admin")).toBe("organization");
  });

  it("requires the Clerk organization role to match the backend campus role", () => {
    expect(clerkOrganizationRoleMatchesCampusRole("student", "org:student")).toBe(true);
    expect(clerkOrganizationRoleMatchesCampusRole("faculty", "org:faculty")).toBe(true);
    expect(clerkOrganizationRoleMatchesCampusRole("admin", "org:admin")).toBe(true);
    expect(clerkOrganizationRoleMatchesCampusRole("student", "org:admin")).toBe(false);
  });

  it("maps every backend permission to a Clerk custom permission", () => {
    expect(clerkOrganizationPermissionByCampusPermission["students:read"]).toBe(
      "org:students:read",
    );
    expect(clerkOrganizationPermissionByCampusPermission["campus:manage"]).toBe(
      "org:campus:manage",
    );
  });
});
