import { AlertTriangle, Clock3, ListTodo, Wrench } from "lucide-react";

import { EmptyOperationsState, OperationsHeader, OperationsMetrics, StatusPill, WorkspaceBanner } from "@/components/operations/operations-ui";
import { Card } from "@/design-system/primitives/card";
import { updateMaintenanceStatusAction } from "@/features/operations/application/operations-actions";
import { loadMaintenanceWorkspace } from "@/features/operations/infrastructure/campus-operations.repository";
import { MaintenanceTicketCreator } from "@/features/operations/presentation/operation-dialogs";
import { resolveWorkspaceAccess } from "@/server/workspace/workspace-access";

export const dynamic = "force-dynamic";

export default async function MaintenancePage() {
  const access = await resolveWorkspaceAccess("reports:read", "maintenance:manage");
  let workspace = null;
  if (access.mode === "live") { try { workspace = await loadMaintenanceWorkspace(); } catch { workspace = null; } }
  const mode = access.mode === "live" && !workspace ? "error" : access.mode;
  const data = workspace ?? { critical: 0, equipmentOptions: [], inProgress: 0, overdue: 0, roomOptions: [], tickets: [] };
  const active = data.tickets.filter((ticket) => !["resolved", "closed"].includes(ticket.status));
  return <section><OperationsHeader actions={<MaintenanceTicketCreator canManage={access.canManage && mode === "live"} equipment={data.equipmentOptions} rooms={data.roomOptions} />} description="Prioritize facility faults by operational impact, monitor response SLAs, and restore teaching spaces quickly." eyebrow="Facility operations" title="Maintenance command queue." /><WorkspaceBanner mode={mode} /><OperationsMetrics metrics={[{ detail: "Tickets not yet resolved", icon: ListTodo, label: "Open queue", value: active.length }, { detail: "Immediate operational impact", icon: AlertTriangle, label: "Critical", value: data.critical }, { detail: "Past the priority response window", icon: Clock3, label: "SLA overdue", value: data.overdue }, { detail: "Work currently underway", icon: Wrench, label: "In progress", value: data.inProgress }]} />
    <Card className="mt-6 overflow-hidden"><div className="border-b border-slate-100 p-5 sm:p-6"><h2 className="font-semibold text-slate-950">Prioritized work queue</h2><p className="mt-1 text-sm text-slate-500">Oldest tickets first, with SLA breaches made explicit.</p></div>{data.tickets.length ? <div className="divide-y divide-slate-100">{data.tickets.map((ticket) => <article className="grid gap-4 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center" key={ticket.id}><div><div className="flex flex-wrap items-center gap-2"><StatusPill tone={ticket.priority === "critical" ? "critical" : ticket.priority === "high" ? "warning" : "neutral"}>{ticket.priority}</StatusPill><StatusPill tone={ticket.isOverdue ? "critical" : ticket.status === "resolved" || ticket.status === "closed" ? "good" : "neutral"}>{ticket.isOverdue ? "SLA overdue" : ticket.status.replace("_", " ")}</StatusPill></div><h3 className="mt-3 font-semibold text-slate-950">{ticket.title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{ticket.description}</p><p className="mt-2 text-xs text-slate-500">{ticket.room}{ticket.equipment ? ` · ${ticket.equipment}` : ""} · open {ticket.ageHours}h</p></div>{access.canManage ? <form action={updateMaintenanceStatusAction} className="flex items-center gap-2"><input name="ticketId" type="hidden" value={ticket.id} /><select aria-label={`Update ${ticket.title} status`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" defaultValue={ticket.status} name="status"><option value="open">Open</option><option value="assigned">Assigned</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select><button className="rounded-xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white" type="submit">Update</button></form> : null}</article>)}</div> : <EmptyOperationsState description="Open the first room or equipment issue to activate SLA monitoring." icon={Wrench} title="No maintenance tickets." />}</Card>
  </section>;
}
