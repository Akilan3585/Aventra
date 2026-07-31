import { AlertTriangle, Clock3, ListTodo, Wrench } from "lucide-react";

import { EmptyOperationsState, FilterBar, OperationsHeader, OperationsMetrics, StatusPill, WorkspaceBanner } from "@/components/operations/operations-ui";
import { Card } from "@/design-system/primitives/card";
import { updateMaintenanceStatusAction } from "@/features/operations/application/operations-actions";
import { loadMaintenanceWorkspace } from "@/features/operations/infrastructure/campus-operations.repository";
import { MaintenanceTicketCreator } from "@/features/operations/presentation/operation-dialogs";
import { resolveWorkspaceAccess } from "@/server/workspace/workspace-access";

export const dynamic = "force-dynamic";

const columns = [
  { key: "open", label: "Open", statuses: ["open"] },
  { key: "assigned", label: "Assigned", statuses: ["assigned"] },
  { key: "in_progress", label: "In progress", statuses: ["in_progress"] },
  { key: "completed", label: "Completed", statuses: ["resolved", "closed"] },
] as const;

type MaintenancePageProps = { searchParams: Promise<{ priority?: string; q?: string; status?: string }> };

export default async function MaintenancePage({ searchParams }: MaintenancePageProps) {
  const filters = await searchParams;
  const access = await resolveWorkspaceAccess("reports:read", "maintenance:manage");
  let workspace = null;
  if (access.mode === "live") { try { workspace = await loadMaintenanceWorkspace(); } catch { workspace = null; } }
  const mode = access.mode === "live" && !workspace ? "error" : access.mode;
  const data = workspace ?? { critical: 0, equipmentOptions: [], inProgress: 0, overdue: 0, roomOptions: [], tickets: [] };
  const active = data.tickets.filter((ticket) => !["resolved", "closed"].includes(ticket.status));
  const normalizedQuery = filters.q?.trim().toLowerCase() ?? "";
  const tickets = data.tickets.filter((ticket) => {
    const matchesQuery = !normalizedQuery || [ticket.title, ticket.description, ticket.room, ticket.equipment ?? ""].some((value) => value.toLowerCase().includes(normalizedQuery));
    const matchesPriority = !filters.priority || filters.priority === "all" || ticket.priority === filters.priority;
    const matchesStatus = !filters.status || filters.status === "all" || ticket.status === filters.status;
    return matchesQuery && matchesPriority && matchesStatus;
  });

  return <section>
    <OperationsHeader actions={<MaintenanceTicketCreator canManage={access.canManage && mode === "live"} equipment={data.equipmentOptions} rooms={data.roomOptions} />} description="Prioritize facility faults by operational impact, monitor response SLAs, and restore teaching spaces quickly." eyebrow="Campus operations" title="Maintenance command board" />
    <WorkspaceBanner mode={mode} />
    <OperationsMetrics metrics={[
      { detail: "tickets not yet resolved", icon: ListTodo, label: "Open queue", value: active.length },
      { detail: "immediate operational impact", icon: AlertTriangle, label: "Critical", value: data.critical },
      { detail: "past the response window", icon: Clock3, label: "SLA overdue", value: data.overdue },
      { detail: "work currently underway", icon: Wrench, label: "In progress", value: data.inProgress },
    ]} />

    <div className="mt-6"><FilterBar query={filters.q} resetHref="/maintenance" searchLabel="Search tickets, rooms, or equipment"><select aria-label="Filter by priority" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700" defaultValue={filters.priority ?? "all"} name="priority"><option value="all">All priorities</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select><select aria-label="Filter by status" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700" defaultValue={filters.status ?? "all"} name="status"><option value="all">All statuses</option><option value="open">Open</option><option value="assigned">Assigned</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select></FilterBar></div>

    {tickets.length ? <div className="mt-6 grid items-start gap-4 md:grid-cols-2 2xl:grid-cols-4">{columns.map((column) => {
      const columnTickets = tickets.filter((ticket) => column.statuses.some((status) => status === ticket.status));
      return <div className="rounded-2xl bg-slate-100/70 p-3" key={column.key}><div className="flex items-center justify-between px-1 py-2"><h2 className="text-sm font-semibold text-slate-800">{column.label}</h2><span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">{columnTickets.length}</span></div><div className="mt-2 space-y-3">{columnTickets.map((ticket) => <Card className="p-4" key={ticket.id}><div className="flex flex-wrap items-center gap-2"><StatusPill tone={ticket.priority === "critical" ? "critical" : ticket.priority === "high" ? "warning" : "neutral"}>{ticket.priority}</StatusPill>{ticket.isOverdue ? <StatusPill tone="critical">SLA overdue</StatusPill> : null}</div><h3 className="mt-3 text-sm font-semibold text-slate-950">{ticket.title}</h3><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{ticket.description}</p><div className="mt-4 border-t border-slate-100 pt-3"><p className="text-xs font-medium text-slate-600">{ticket.room}{ticket.equipment ? ` · ${ticket.equipment}` : ""}</p><p className="mt-1 text-[11px] text-slate-400">Open {ticket.ageHours}h</p></div>{access.canManage ? <form action={updateMaintenanceStatusAction} className="mt-3 flex gap-2"><input name="ticketId" type="hidden" value={ticket.id} /><select aria-label={`Update ${ticket.title} status`} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs" defaultValue={ticket.status} name="status"><option value="open">Open</option><option value="assigned">Assigned</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select><button className="rounded-lg bg-slate-900 px-2.5 py-2 text-xs font-semibold text-white" type="submit">Save</button></form> : null}</Card>)}{columnTickets.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 bg-white/70 px-3 py-8 text-center text-xs text-slate-400">No tickets</div> : null}</div></div>;
    })}</div> : <Card className="mt-6"><EmptyOperationsState description={data.tickets.length ? "Adjust the search or status filters." : "Open the first room or equipment issue to activate SLA monitoring."} icon={Wrench} title={data.tickets.length ? "No tickets match this view." : "No maintenance tickets."} /></Card>}
  </section>;
}
