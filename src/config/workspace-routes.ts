export const workspaceRoutes = {
  student: { home: "/student-workspace", signIn: "/student/sign-in" },
  faculty: { home: "/dashboard", signIn: "/faculty/sign-in" },
} as const;

export type WorkspaceRouteKey = keyof typeof workspaceRoutes;

export function portalForRole(role: string): WorkspaceRouteKey {
  if (role === "student") return "student";
  return "faculty";
}

export function isWorkspaceRouteKey(value: unknown): value is WorkspaceRouteKey {
  return typeof value === "string" && value in workspaceRoutes;
}
