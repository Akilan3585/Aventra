import { Bell, CheckCheck, Mail, Send } from "lucide-react";
import { redirect } from "next/navigation";

import { OperationsHeader, OperationsMetrics, StatusPill, WorkspaceBanner } from "@/components/operations/operations-ui";
import { markNotificationReadAction } from "@/features/administration/application/administration-actions";
import { loadNotificationsWorkspace, resolveActorProfileId } from "@/features/administration/infrastructure/administration.repository";
import { AdministrationTable } from "@/features/administration/presentation/administration-table";
import { getCampusAccess } from "@/server/auth/campus-access";
import { resolveWorkspaceAccess } from "@/server/workspace/workspace-access";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const access = await resolveWorkspaceAccess("workspace:access");
  if (access.mode === "live" && access.role !== "student") redirect("/dashboard");
  const campusAccess = access.mode === "live" ? await getCampusAccess() : null;
  const profileId = campusAccess ? await resolveActorProfileId(campusAccess.userId) : null;
  let workspace = null;
  if (access.mode === "live" && profileId) try { workspace = await loadNotificationsWorkspace(profileId); } catch { workspace = null; }
  const mode = access.mode === "live" && !workspace ? "error" : access.mode;
  const data = workspace ?? { notifications: [] };
  return <section><OperationsHeader description="Attendance alerts and campus messages addressed to you, with delivery and read-state tracking." eyebrow="My messages" title="Notification center." /><WorkspaceBanner mode={mode} /><OperationsMetrics metrics={[{ detail: "Messages addressed to you", icon: Bell, label: "Notifications", value: data.notifications.length }, { detail: "Awaiting delivery processing", icon: Send, label: "Queued", value: data.notifications.filter((item) => item.status === "queued").length }, { detail: "Email-channel messages", icon: Mail, label: "Email", value: data.notifications.filter((item) => item.channel === "email").length }, { detail: "Acknowledged by you", icon: CheckCheck, label: "Read", value: data.notifications.filter((item) => item.read_at).length }]} /><AdministrationTable columns={["Message", "Channel", "State", "Created", "Action"]} description="Messages generated for you by attendance monitoring and campus workflows." emptyDescription="You have no messages yet. Attendance alerts and campus updates will appear here." emptyIcon={Bell} emptyTitle="No notifications." rows={data.notifications.map((item) => ({ id: item.id, cells: [<div className="max-w-sm" key="message"><p className="text-sm font-semibold text-slate-900">{item.subject}</p><p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.body}</p></div>, <span className="text-sm capitalize text-slate-700" key="channel">{item.channel.replace("_", "-")}</span>, <StatusPill key="state" tone={item.read_at ? "good" : item.status === "failed" ? "critical" : "warning"}>{item.read_at ? "read" : item.status}</StatusPill>, <span className="font-mono text-xs text-slate-600" key="date">{new Date(item.created_at).toLocaleDateString()}</span>, !item.read_at ? <form action={markNotificationReadAction} key="action"><input name="notificationId" type="hidden" value={item.id} /><button className="text-xs font-semibold text-primary" type="submit">Mark read</button></form> : <span className="text-xs text-slate-400" key="action">—</span>] }))} title="Message activity" /></section>;
}
