import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell/app-shell";
import { resolveWorkspaceAccess } from "@/server/workspace/workspace-access";

export default async function PlatformLayout({ children }: { children: ReactNode }) {
  // Defense in depth: every current and future platform route requires a
  // verified campus identity, even if a page forgets its finer permission gate.
  const access = await resolveWorkspaceAccess("workspace:access");

  return <AppShell role={access.role}>{children}</AppShell>;
}
