import "server-only";

import { clerkClient } from "@clerk/nextjs/server";

import type { MembershipStatus } from "@/server/auth/campus-access";
import {
  clerkOrganizationRoleByCampusRole,
  type Role,
} from "@/server/auth/permissions";

type ClerkAuthorizationSyncInput = {
  role: Role;
  status: MembershipStatus;
  syncMetadata?: boolean;
  userId: string;
};

export type ClerkAuthorizationSyncResult = {
  metadata: "failed" | "skipped" | "synced";
  organization: "failed" | "skipped" | "synced";
};

function configuredOrganizationId() {
  const organizationId = process.env.CLERK_CAMPUS_ORGANIZATION_ID?.trim();
  return organizationId && !organizationId.includes("REPLACE_ME")
    ? organizationId
    : null;
}

function shouldSyncOrganizationMemberships() {
  return process.env.CLERK_SYNC_ORGANIZATION_MEMBERSHIPS === "true";
}

export async function syncClerkCampusAuthorization({
  role,
  status,
  syncMetadata = true,
  userId,
}: ClerkAuthorizationSyncInput): Promise<ClerkAuthorizationSyncResult> {
  const client = await clerkClient();
  let metadata: ClerkAuthorizationSyncResult["metadata"] = "skipped";

  if (syncMetadata) {
    try {
      await client.users.updateUserMetadata(userId, {
        privateMetadata: {
          campusMembershipStatus: status,
          campusRole: role,
        },
      });
      metadata = "synced";
    } catch {
      return { metadata: "failed", organization: "skipped" };
    }
  }

  const organizationId = configuredOrganizationId();
  if (
    !organizationId ||
    !shouldSyncOrganizationMemberships() ||
    status !== "active"
  ) {
    return { metadata, organization: "skipped" };
  }

  const organizationRole = clerkOrganizationRoleByCampusRole[role];
  try {
    await client.organizations.updateOrganizationMembership({
      organizationId,
      role: organizationRole,
      userId,
    });
    return { metadata, organization: "synced" };
  } catch {
    try {
      await client.organizations.createOrganizationMembership({
        organizationId,
        role: organizationRole,
        userId,
      });
      return { metadata, organization: "synced" };
    } catch {
      return { metadata, organization: "failed" };
    }
  }
}
