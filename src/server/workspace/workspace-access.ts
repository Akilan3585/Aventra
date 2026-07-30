import "server-only";

import { redirect } from "next/navigation";

import { getCampusAccess, isClerkConfigured } from "@/server/auth/campus-access";
import { hasPermission, type Permission, type Role } from "@/server/auth/permissions";
import { isSupabaseAdminConfigured } from "@/server/supabase/admin-client";

export type WorkspaceAccess =
  | { canManage: false; mode: "configuration"; role: null }
  | { canManage: false; mode: "forbidden"; role: Role }
  | { canManage: boolean; mode: "live"; role: Role };

export async function resolveWorkspaceAccess(
  readPermission: Permission,
  managePermission?: Permission,
): Promise<WorkspaceAccess> {
  if (!isClerkConfigured() || !isSupabaseAdminConfigured()) {
    return { canManage: false, mode: "configuration", role: null };
  }

  const access = await getCampusAccess();
  if (!access) redirect(`/sign-in?redirect_url=/dashboard`);

  if (!hasPermission(access.role, readPermission)) {
    return { canManage: false, mode: "forbidden", role: access.role };
  }

  return {
    canManage: managePermission ? hasPermission(access.role, managePermission) : false,
    mode: "live",
    role: access.role,
  };
}
