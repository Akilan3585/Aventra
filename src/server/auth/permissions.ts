export const roles = [
  "super-admin",
  "admin",
  "faculty",
  "maintenance-staff",
  "student",
] as const;

export type Role = (typeof roles)[number];

export const permissions = [
  "campus:manage",
  "students:read",
  "students:manage",
  "attendance:record",
  "schedules:manage",
  "maintenance:manage",
  "reports:read",
  "agents:execute",
  "audit:read",
] as const;

export type Permission = (typeof permissions)[number];

export const rolePermissions: Readonly<Record<Role, readonly Permission[]>> = {
  "super-admin": permissions,
  admin: [
    "campus:manage",
    "students:read",
    "students:manage",
    "attendance:record",
    "schedules:manage",
    "maintenance:manage",
    "reports:read",
    "agents:execute",
    "audit:read",
  ],
  faculty: [
    "students:read",
    "attendance:record",
    "reports:read",
    "agents:execute",
  ],
  "maintenance-staff": ["maintenance:manage", "reports:read"],
  student: ["reports:read"],
};

export function hasPermission(role: Role, permission: Permission) {
  return rolePermissions[role].includes(permission);
}
