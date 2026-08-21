import { redirect } from "next/navigation";

import { homeForRole } from "@/config/navigation";
import { isWorkspaceRouteKey, portalForRole } from "@/config/workspace-routes";
import {
  getCampusIdentity,
  isClerkConfigured,
} from "@/server/auth/campus-access";
import { isSupabaseAdminConfigured } from "@/server/supabase/admin-client";

export const dynamic = "force-dynamic";

export default async function RoleRouterPage({ searchParams }: { searchParams: Promise<{ portal?: string }> }) {
  if (!isClerkConfigured() || !isSupabaseAdminConfigured()) redirect("/dashboard");

  const identity = await getCampusIdentity();
  if (!identity) redirect("/sign-in?redirect_url=/app");
  if (identity.status === "pending" || identity.status === "unlinked") {
    redirect("/access-pending");
  }
  if (identity.status !== "active" || !identity.role) {
    redirect(`/access-denied?reason=${encodeURIComponent(identity.status)}`);
  }

  const { portal } = await searchParams;
  if (isWorkspaceRouteKey(portal)) {
    const verifiedPortal = portalForRole(identity.role);
    if (portal !== verifiedPortal) {
      redirect(`/access-denied?reason=role-mismatch&portal=${portal}&verified=${verifiedPortal}`);
    }
  }

  redirect(homeForRole(identity.role));
}
