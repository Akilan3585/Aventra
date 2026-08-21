import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { cache } from "react";

import {
  hasPermission,
  roles,
  type Permission,
  type Role,
} from "@/server/auth/permissions";
import {
  createSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from "@/server/supabase/admin-client";

export const membershipStatuses = [
  "pending",
  "active",
  "suspended",
  "expired",
] as const;

export type MembershipStatus = (typeof membershipStatuses)[number];
export type CampusIdentityStatus =
  | MembershipStatus
  | "unlinked"
  | "unverified-email";

export type CampusIdentity = {
  email: string;
  profileId: string | null;
  role: Role | null;
  status: CampusIdentityStatus;
  userId: string;
};

export type CampusAccess = CampusIdentity & {
  profileId: string | null;
  role: Role;
  status: "active";
};

function isRole(value: unknown): value is Role {
  return typeof value === "string" && roles.includes(value as Role);
}

function isMembershipStatus(value: unknown): value is MembershipStatus {
  return (
    typeof value === "string" &&
    membershipStatuses.includes(value as MembershipStatus)
  );
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

function effectiveMembershipStatus(profile: {
  membership_status: string;
  valid_from: string | null;
  valid_until: string | null;
}): CampusIdentityStatus {
  const status = isMembershipStatus(profile.membership_status)
    ? profile.membership_status
    : "suspended";
  if (status !== "active") return status;

  const now = Date.now();
  if (profile.valid_from && Date.parse(profile.valid_from) > now) return "pending";
  if (profile.valid_until && Date.parse(profile.valid_until) <= now) return "expired";
  return "active";
}

const resolveCampusIdentity = async (): Promise<CampusIdentity | null> => {
  if (!isClerkConfigured()) return null;

  const { userId } = await auth();
  if (!userId) return null;

  const user = await currentUser();
  const primaryEmail = user?.primaryEmailAddress;
  const email = primaryEmail?.emailAddress.toLowerCase() ?? "";
  const emailVerified = primaryEmail?.verification?.status === "verified";

  if (!email || !emailVerified) {
    return {
      email,
      profileId: null,
      role: null,
      status: "unverified-email",
      userId,
    };
  }

  // The allowlist is the recovery path for the first campus administrator.
  // All normal role decisions come from the Supabase campus directory.
  const isBootstrapAdmin = adminEmails().has(email);
  if (!isSupabaseAdminConfigured()) {
    return isBootstrapAdmin
      ? { email, profileId: null, role: "super-admin", status: "active", userId }
      : { email, profileId: null, role: null, status: "unlinked", userId };
  }

  const { data: profile, error } = await createSupabaseAdminClient()
    .from("profiles")
    .select(
      "id, email, campus_role, membership_status, valid_from, valid_until",
    )
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (error || !profile) {
    return isBootstrapAdmin
      ? { email, profileId: null, role: "super-admin", status: "active", userId }
      : { email, profileId: null, role: null, status: "unlinked", userId };
  }

  if (profile.email.toLowerCase() !== email) {
    return {
      email,
      profileId: profile.id,
      role: null,
      status: "suspended",
      userId,
    };
  }

  // CAMPUS_ADMIN_EMAILS is the explicit bootstrap/recovery authority for the
  // first campus owner. Keep it authoritative even when Clerk re-links an
  // existing directory record after a new OAuth session is created.
  if (isBootstrapAdmin) {
    return {
      email,
      profileId: profile.id,
      role: "super-admin",
      status: "active",
      userId,
    };
  }

  if (!isRole(profile.campus_role)) {
    return {
      email,
      profileId: profile.id,
      role: null,
      status: "suspended",
      userId,
    };
  }

  return {
    email,
    profileId: profile.id,
    role: profile.campus_role,
    status: effectiveMembershipStatus(profile),
    userId,
  };
};

// Layouts and pages may both authorize during one render. React cache keeps
// that request to one Clerk lookup and one campus-directory query.
export const getCampusIdentity = cache(resolveCampusIdentity);

export async function getCampusAccess(): Promise<CampusAccess | null> {
  const identity = await getCampusIdentity();
  if (!identity || identity.status !== "active" || !identity.role) return null;
  return { ...identity, role: identity.role, status: "active" };
}

export async function requirePermission(permission: Permission) {
  const identity = await getCampusIdentity();

  if (!identity) throw new Error("AUTHENTICATION_REQUIRED");
  if (identity.status !== "active" || !identity.role) {
    throw new Error("CAMPUS_MEMBERSHIP_INACTIVE");
  }
  if (!hasPermission(identity.role, permission)) {
    throw new Error("PERMISSION_DENIED");
  }

  return { ...identity, role: identity.role, status: "active" } satisfies CampusAccess;
}
