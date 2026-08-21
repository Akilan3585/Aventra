export const workspaceRoutes = {
  student: { home: "/student-workspace", signIn: "/student/sign-in" },
  faculty: { home: "/faculty-workspace", signIn: "/faculty/sign-in" },
  campus: { home: "/dashboard", signIn: "/campus/sign-in" },
} as const;

export type WorkspaceRouteKey = keyof typeof workspaceRoutes;

export function portalForRole(role: string): WorkspaceRouteKey {
  if (role === "student") return "student";
  if (role === "faculty") return "faculty";
  return "campus";
}

export function isWorkspaceRouteKey(value: unknown): value is WorkspaceRouteKey {
  return typeof value === "string" && value in workspaceRoutes;
}
