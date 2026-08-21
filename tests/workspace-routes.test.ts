import { describe, expect, it } from "vitest";

import { portalForRole, workspaceRoutes } from "../src/config/workspace-routes";

describe("workspace entry routes", () => {
  it("uses a distinct sign-in route for every audience", () => {
    const signInPaths = Object.values(workspaceRoutes).map((route) => route.signIn);

    expect(new Set(signInPaths)).toEqual(new Set(["/student/sign-in", "/faculty/sign-in", "/campus/sign-in"]));
  });

  it("routes each entry to its role home", () => {
    expect(workspaceRoutes.student.home).toBe("/student-workspace");
    expect(workspaceRoutes.faculty.home).toBe("/faculty-workspace");
    expect(workspaceRoutes.campus.home).toBe("/dashboard");
  });

  it("maps verified directory roles to the correct portal", () => {
    expect(portalForRole("student")).toBe("student");
    expect(portalForRole("faculty")).toBe("faculty");
    expect(portalForRole("admin")).toBe("campus");
    expect(portalForRole("super-admin")).toBe("campus");
    expect(portalForRole("maintenance-staff")).toBe("campus");
  });
});
