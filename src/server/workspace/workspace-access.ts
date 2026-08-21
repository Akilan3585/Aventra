import "server-only";

import { redirect } from "next/navigation";

import { getCampusIdentity, isClerkConfigured } from "@/server/auth/campus-access";
import { hasPermission, type Permission, type Role } from "@/server/auth/permissions";
import { isSupabaseAdminConfigured } from "@/server/supabase/admin-client";

export type WorkspaceAccess =
  | { canManage: false; mode: "configuration"; role: null }
  | { canManage: false; mode: "forbidden"; role: Role }
  | { canManage: boolean; mode: "live"; profileId: string | null; role: Role };

export async function resolveWorkspaceAccess(
  readPermission: Permission,
  managePermission?: Permission,
): Promise<WorkspaceAccess> {
  if (!isClerkConfigured() || !isSupabaseAdminConfigured()) {
    return { canManage: false, mode: "configuration", role: null };
  }

  const access = await getCampusIdentity();
  if (!access) redirect("/sign-in?redirect_url=/app");
  if (access.status === "pending" || access.status === "unlinked") {
    redirect("/access-pending");
  }
  if (access.status !== "active" || !access.role) {
    redirect(`/access-denied?reason=${encodeURIComponent(access.status)}`);
  }

  if (!hasPermission(access.role, readPermission)) {
    return { canManage: false, mode: "forbidden", role: access.role };
  }

  return {
    canManage: managePermission ? hasPermission(access.role, managePermission) : false,
    mode: "live",
    profileId: access.profileId,
    role: access.role,
  };
}
