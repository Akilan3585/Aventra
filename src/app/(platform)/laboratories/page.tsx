import { FlaskConical, MonitorCheck, ShieldAlert, UsersRound } from "lucide-react";

import { OperationsHeader, OperationsMetrics, StatusPill, WorkspaceBanner } from "@/components/operations/operations-ui";
import { loadClassroomWorkspace } from "@/features/operations/infrastructure/campus-operations.repository";
import { AdministrationForm } from "@/features/administration/presentation/administration-form";
import { AdministrationTable } from "@/features/administration/presentation/administration-table";
import { resolveWorkspaceAccess } from "@/server/workspace/workspace-access";

export const dynamic = "force-dynamic";

export default async function LaboratoriesPage() {
  const access = await resolveWorkspaceAccess("reports:read", "campus:manage");
  let workspace = null;
  if (access.mode === "live") try { workspace = await loadClassroomWorkspace(); } catch { workspace = null; }
  const mode = access.mode === "live" && !workspace ? "error" : access.mode;
  const laboratories = (workspace?.classrooms ?? []).filter((room) => room.kind === "laboratory");
  return <section><OperationsHeader actions={<AdministrationForm canManage={access.canManage && mode === "live"} kind="room" />} description="Manage laboratory capacity, operational equipment, maintenance exposure, and source-derived readiness." eyebrow="Specialist facilities" title="Laboratory operations." /><WorkspaceBanner mode={mode} /><OperationsMetrics metrics={[{ detail: "Managed specialist teaching spaces", icon: FlaskConical, label: "Laboratories", value: laboratories.length }, { detail: "Combined student capacity", icon: UsersRound, label: "Seat capacity", value: laboratories.reduce((sum, room) => sum + room.capacity, 0) }, { detail: "Operational and tracked assets", icon: MonitorCheck, label: "Equipment", value: laboratories.reduce((sum, room) => sum + room.totalEquipment, 0) }, { detail: "Labs below ready state", icon: ShieldAlert, label: "Needs attention", value: laboratories.filter((room) => room.readiness !== "ready").length }]} /><AdministrationTable columns={["Laboratory", "Building", "Capacity", "Equipment", "Open tickets", "Readiness"]} description="Readiness is derived from active state, equipment condition, and open maintenance tickets." emptyDescription="Register the first laboratory to begin readiness and equipment monitoring." emptyIcon={FlaskConical} emptyTitle="No laboratories configured." rows={laboratories.map((room) => ({ id: room.id, cells: [<div key="lab"><p className="text-sm font-semibold text-slate-900">{room.name}</p><p className="font-mono text-xs text-slate-500">{room.code}</p></div>, <span className="text-sm text-slate-700" key="building">{room.building}</span>, <span className="text-sm text-slate-700" key="capacity">{room.capacity}</span>, <span className="text-sm text-slate-700" key="equipment">{room.totalEquipment}</span>, <span className="text-sm text-slate-700" key="tickets">{room.openTickets}</span>, <StatusPill key="readiness" tone={room.readiness === "ready" ? "good" : room.readiness === "attention" ? "warning" : "critical"}>{room.readiness} · {room.readinessScore}%</StatusPill>] }))} title="Laboratory readiness" /></section>;
}
