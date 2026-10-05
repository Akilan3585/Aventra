import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { cache } from "react";

import {
  clerkOrganizationPermissionByCampusPermission,
  clerkOrganizationRoleMatchesCampusRole,
  hasPermission,
  isCampusRole,
  type Permission,
  type Role,
} from "@/server/auth/permissions";
import {
  createSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from "@/server/supabase/admin-client";
import type { Database } from "@/types/database";

export const membershipStatuses = [
  "pending",
  "active",
  "suspended",
  "expired",
] as const;

export type MembershipStatus = (typeof membershipStatuses)[number];
export type CampusIdentityStatus =
  | MembershipStatus
  | "organization-mismatch"
  | "organization-required"
  | "role-mismatch"
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

export function isMembershipStatus(value: unknown): value is MembershipStatus {
  return (
    typeof value === "string" &&
    membershipStatuses.includes(value as MembershipStatus)
  );
}

function configuredOrganizationId() {
  const organizationId = process.env.CLERK_CAMPUS_ORGANIZATION_ID?.trim();
  return organizationId && !organizationId.includes("REPLACE_ME")
    ? organizationId
    : null;
}

export function isClerkOrganizationConfigured() {
  return Boolean(configuredOrganizationId());
}

function enforceClerkOrganizationPermissions() {
  return process.env.CLERK_ENFORCE_ORGANIZATION_PERMISSIONS === "true";
}

function organizationAccessStatus(
  role: Role,
  organizationId: string | null | undefined,
  organizationRole: string | null | undefined,
): CampusIdentityStatus | null {
  const requiredOrganizationId = configuredOrganizationId();
  if (!requiredOrganizationId) return null;
  if (!organizationId) return "organization-required";
  if (organizationId !== requiredOrganizationId) return "organization-mismatch";
  if (!clerkOrganizationRoleMatchesCampusRole(role, organizationRole)) {
    return "role-mismatch";
  }
  return null;
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

  const { orgId, orgRole, userId } = await auth();
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
    if (!isBootstrapAdmin) {
      return { email, profileId: null, role: null, status: "unlinked", userId };
    }
    return {
      email,
      profileId: null,
      role: "super-admin",
      status:
        organizationAccessStatus("super-admin", orgId, orgRole) ?? "active",
      userId,
    };
  }

  const client = createSupabaseAdminClient();
  let { data: profile } = await client
    .from("profiles")
    .select(
      "id, email, campus_role, membership_status, valid_from, valid_until, clerk_user_id",
    )
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (!profile) {
    // If not linked by clerk_user_id, look up by verified email
    const { data: profileByEmail } = await client
      .from("profiles")
      .select(
        "id, email, campus_role, membership_status, valid_from, valid_until, clerk_user_id",
      )
      .eq("email", email)
      .maybeSingle();

    if (profileByEmail) {
      const now = new Date().toISOString();
      const activateFacultyInvitation =
        profileByEmail.campus_role === "faculty" &&
        profileByEmail.membership_status === "pending";

      const updatePayload: Database["public"]["Tables"]["profiles"]["Update"] = {
        clerk_user_id: userId,
        updated_at: now,
      };

      if (isBootstrapAdmin) {
        updatePayload.approved_at = now;
        updatePayload.campus_role = "super-admin";
        updatePayload.membership_status = "active";
        updatePayload.valid_from = now;
      } else if (activateFacultyInvitation) {
        updatePayload.approved_at = now;
        updatePayload.membership_status = "active";
        updatePayload.valid_from = now;
      }

      await client
        .from("profiles")
        .update(updatePayload)
        .eq("id", profileByEmail.id);

      profile = {
        ...profileByEmail,
        clerk_user_id: userId,
        ...(isBootstrapAdmin
          ? {
              campus_role: "super-admin",
              membership_status: "active",
            }
          : activateFacultyInvitation
            ? {
                membership_status: "active",
              }
            : {}),
      };
    } else if (isBootstrapAdmin) {
      const displayName =
        [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
        user?.username ||
        email.split("@")[0] ||
        "Campus Administrator";
      const now = new Date().toISOString();
      const { data: createdAdmin } = await client
        .from("profiles")
        .insert({
          approved_at: now,
          campus_role: "super-admin",
          clerk_user_id: userId,
          display_name: displayName,
          email,
          id: userId,
          membership_status: "active",
          valid_from: now,
        })
        .select(
          "id, email, campus_role, membership_status, valid_from, valid_until, clerk_user_id",
        )
        .maybeSingle();

      profile = createdAdmin;
    } else {
      const displayName =
        [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
        user?.username ||
        email.split("@")[0] ||
        "Student";
      const { data: createdStudent } = await client
        .from("profiles")
        .insert({
          campus_role: "student",
          clerk_user_id: userId,
          display_name: displayName,
          email,
          id: userId,
          membership_status: "pending",
        })
        .select(
          "id, email, campus_role, membership_status, valid_from, valid_until, clerk_user_id",
        )
        .maybeSingle();

      profile = createdStudent;
    }
  }

  if (!profile) {
    if (!isBootstrapAdmin) {
      return { email, profileId: null, role: null, status: "unlinked", userId };
    }
    return {
      email,
      profileId: null,
      role: "super-admin",
      status:
        organizationAccessStatus("super-admin", orgId, orgRole) ?? "active",
      userId,
    };
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
    if (profile.campus_role !== "super-admin" || profile.membership_status !== "active") {
      const now = new Date().toISOString();
      await client
        .from("profiles")
        .update({
          approved_at: now,
          campus_role: "super-admin",
          membership_status: "active",
          updated_at: now,
          valid_from: now,
        })
        .eq("id", profile.id);
    }
    return {
      email,
      profileId: profile.id,
      role: "super-admin",
      status:
        organizationAccessStatus("super-admin", orgId, orgRole) ?? "active",
      userId,
    };
  }

  if (!isCampusRole(profile.campus_role)) {
    return {
      email,
      profileId: profile.id,
      role: null,
      status: "suspended",
      userId,
    };
  }

  const membershipStatus = effectiveMembershipStatus(profile);
  return {
    email,
    profileId: profile.id,
    role: profile.campus_role,
    status:
      membershipStatus === "active"
        ? organizationAccessStatus(profile.campus_role, orgId, orgRole) ?? "active"
        : membershipStatus,
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
  if (isClerkOrganizationConfigured() && enforceClerkOrganizationPermissions()) {
    const { has } = await auth();
    const clerkPermission = clerkOrganizationPermissionByCampusPermission[permission];
    if (!has({ permission: clerkPermission })) {
      throw new Error("CLERK_PERMISSION_DENIED");
    }
  }

  return { ...identity, role: identity.role, status: "active" } satisfies CampusAccess;
}
