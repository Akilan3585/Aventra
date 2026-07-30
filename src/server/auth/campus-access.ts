import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";

import {
  hasPermission,
  roles,
  type Permission,
  type Role,
} from "@/server/auth/permissions";

export type CampusAccess = {
  email: string;
  role: Role;
  userId: string;
};

function isRole(value: unknown): value is Role {
  return typeof value === "string" && roles.includes(value as Role);
}

function adminEmails() {
  return new Set(
    (process.env.CAMPUS_ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isClerkConfigured() {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const secretKey = process.env.CLERK_SECRET_KEY;

  return Boolean(
    publishableKey &&
      secretKey &&
      !publishableKey.includes("REPLACE_ME") &&
      !secretKey.includes("REPLACE_ME"),
  );
}

export async function getCampusAccess(): Promise<CampusAccess | null> {
  if (!isClerkConfigured()) return null;

  const { userId } = await auth();
  if (!userId) return null;

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress.toLowerCase() ?? "";
  const metadataRole =
    user?.privateMetadata.campusRole ?? user?.publicMetadata.campusRole;
  const role = isRole(metadataRole)
    ? metadataRole
    : adminEmails().has(email)
      ? "super-admin"
      : "student";

  return { email, role, userId };
}

export async function requirePermission(permission: Permission) {
  const access = await getCampusAccess();

  if (!access) throw new Error("AUTHENTICATION_REQUIRED");
  if (!hasPermission(access.role, permission)) {
    throw new Error("PERMISSION_DENIED");
  }

  return access;
}
