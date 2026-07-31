import { BadgeCheck, CalendarClock, Mail, UserRound } from "lucide-react";

import { OperationsHeader, OperationsMetrics, StatusPill, WorkspaceBanner } from "@/components/operations/operations-ui";
import { Card } from "@/design-system/primitives/card";
import { loadProfileWorkspace } from "@/features/administration/infrastructure/administration.repository";
import { AdministrationForm } from "@/features/administration/presentation/administration-form";
import { getCampusAccess } from "@/server/auth/campus-access";
import { resolveWorkspaceAccess } from "@/server/workspace/workspace-access";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const access = await resolveWorkspaceAccess("reports:read");
  const campusAccess = access.mode === "live" ? await getCampusAccess() : null;
  let profile = null;
  if (campusAccess) try { profile = await loadProfileWorkspace(campusAccess.userId); } catch { profile = null; }
  const mode = access.mode === "live" && !profile ? "error" : access.mode;
  return <section><OperationsHeader actions={<AdministrationForm canManage={Boolean(profile) && mode === "live"} kind="profile" options={{ profile: profile ? [{ id: profile.id, label: profile.display_name }] : [] }} />} description="Review the signed-in identity, campus role, synchronization state, and account-facing profile details." eyebrow="Account" title="Your campus profile." /><WorkspaceBanner mode={mode} />{profile ? <><OperationsMetrics metrics={[{ detail: "Campus directory display identity", icon: UserRound, label: "Display name", value: profile.display_name }, { detail: "Verified account address", icon: Mail, label: "Email", value: profile.email }, { detail: "Server-enforced authorization role", icon: BadgeCheck, label: "Campus role", value: profile.campus_role }, { detail: "Last synchronized profile change", icon: CalendarClock, label: "Last updated", value: new Date(profile.updated_at).toLocaleDateString() }]} /><Card className="mt-6 p-5 sm:p-6"><div className="flex flex-col gap-5 sm:flex-row sm:items-center"><span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-xl font-semibold text-white">{profile.display_name.slice(0, 1).toUpperCase()}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-3"><h2 className="text-xl font-semibold text-slate-950">{profile.display_name}</h2><StatusPill tone="good">{profile.campus_role}</StatusPill></div><p className="mt-1 text-sm text-slate-500">{profile.email}</p><p className="mt-4 text-xs leading-5 text-slate-500">Identity is synchronized from Clerk. Campus authorization is checked again on every protected server mutation.</p></div></div></Card></> : null}</section>;
}
