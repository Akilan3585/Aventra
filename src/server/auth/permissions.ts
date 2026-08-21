export const roles = [
  "super-admin",
  "admin",
  "faculty",
  "maintenance-staff",
  "student",
] as const;

export type Role = (typeof roles)[number];

export const permissions = [
  "workspace:access",
  "campus:manage",
  "students:read",
  "students:manage",
  "attendance:record",
  "assignments:read",
  "assignments:manage",
  "submissions:manage",
  "enrollments:manage",
  "schedules:manage",
  "maintenance:manage",
  "reports:read",
  "agents:execute",
  "agents:review",
  "audit:read",
] as const;

export type Permission = (typeof permissions)[number];

export const rolePermissions: Readonly<Record<Role, readonly Permission[]>> = {
  "super-admin": permissions,
  admin: [
    "workspace:access",
    "campus:manage",
    "students:read",
    "students:manage",
    "attendance:record",
    "assignments:read",
    "assignments:manage",
    "submissions:manage",
    "enrollments:manage",
    "schedules:manage",
    "maintenance:manage",
    "reports:read",
    "agents:execute",
    "agents:review",
    "audit:read",
  ],
  faculty: [
    "workspace:access",
    "students:read",
    "attendance:record",
    "assignments:read",
    "assignments:manage",
    "submissions:manage",
    "reports:read",
    "agents:execute",
    "agents:review",
  ],
  "maintenance-staff": ["workspace:access", "maintenance:manage", "reports:read"],
  student: ["workspace:access", "assignments:read", "submissions:manage"],
};

export function hasPermission(role: Role, permission: Permission) {
  return rolePermissions[role].includes(permission);
}
