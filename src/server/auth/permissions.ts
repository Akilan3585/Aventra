export const roles = [
  "super-admin",
  "admin",
  "faculty",
  "student",
] as const;

export type Role = (typeof roles)[number];

export const permissions = [
  "workspace:access",
  "campus:manage",
  "students:read",
  "students:manage",
  "students:approve",
  "attendance:record",
  "assignments:read",
  "assignments:manage",
  "submissions:manage",
  "materials:read",
  "materials:manage",
  "reports:read",
  "agents:execute",
  "agents:review",
  "audit:read",
] as const;

export type Permission = (typeof permissions)[number];

export type WorkspaceAudience = "organization" | "student";

export const clerkOrganizationRoleByCampusRole: Readonly<Record<Role, string>> = {
  "super-admin": "org:admin",
  admin: "org:admin",
  faculty: "org:faculty",
  student: "org:student",
};

export const clerkOrganizationPermissionByCampusPermission: Readonly<
  Record<Permission, string>
> = Object.fromEntries(
  permissions.map((permission) => [permission, `org:${permission}`]),
) as Record<Permission, string>;

export const rolePermissions: Readonly<Record<Role, readonly Permission[]>> = {
  "super-admin": permissions,
  admin: [
    "workspace:access",
    "campus:manage",
    "students:read",
    "students:manage",
    "students:approve",
    "attendance:record",
    "assignments:read",
    "assignments:manage",
    "submissions:manage",
    "materials:read",
    "materials:manage",
    "reports:read",
    "agents:execute",
    "agents:review",
    "audit:read",
  ],
  faculty: [
    "workspace:access",
    "students:read",
    "students:approve",
    "attendance:record",
    "assignments:read",
    "assignments:manage",
    "submissions:manage",
    "materials:read",
    "materials:manage",
    "reports:read",
    "agents:execute",
    "agents:review",
  ],
  student: ["workspace:access", "assignments:read", "submissions:manage", "materials:read"],
};

export function hasPermission(role: Role, permission: Permission) {
  return rolePermissions[role].includes(permission);
}

export function isCampusRole(value: unknown): value is Role {
  return typeof value === "string" && roles.includes(value as Role);
}

export function workspaceAudienceForRole(role: Role): WorkspaceAudience {
  if (role === "student") return "student";
  return "organization";
}

export function clerkOrganizationRoleMatchesCampusRole(
  campusRole: Role,
  clerkOrganizationRole: string | null | undefined,
) {
  return clerkOrganizationRoleByCampusRole[campusRole] === clerkOrganizationRole;
}
