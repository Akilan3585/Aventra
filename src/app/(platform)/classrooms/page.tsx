import { Building2, FlaskConical, Gauge, UsersRound } from "lucide-react";

import { EmptyOperationsState, OperationsHeader, OperationsMetrics, StatusPill, WorkspaceBanner } from "@/components/operations/operations-ui";
import { Card } from "@/design-system/primitives/card";
import { loadClassroomWorkspace } from "@/features/operations/infrastructure/campus-operations.repository";
import { resolveWorkspaceAccess } from "@/server/workspace/workspace-access";

export const dynamic = "force-dynamic";

export default async function ClassroomsPage() {
  const access = await resolveWorkspaceAccess("reports:read");
  let workspace = null;
  if (access.mode === "live") { try { workspace = await loadClassroomWorkspace(); } catch { workspace = null; } }
  const mode = access.mode === "live" && !workspace ? "error" : access.mode;
  const data = workspace ?? { attentionRooms: 0, averageReadiness: 0, classrooms: [], laboratories: 0, totalCapacity: 0 };
  return <section><OperationsHeader description="Balance teaching demand with room capacity, equipment health, maintenance load, and facility availability." eyebrow="Space operations" title="Classroom readiness, live." /><WorkspaceBanner mode={mode} /><OperationsMetrics metrics={[{ detail: "Classrooms and laboratories", icon: Building2, label: "Managed spaces", value: data.classrooms.length }, { detail: "Seats available across campus", icon: UsersRound, label: "Total capacity", value: data.totalCapacity }, { detail: "Mean equipment and ticket score", icon: Gauge, label: "Average readiness", value: `${data.averageReadiness}%` }, { detail: "Rooms requiring operational review", icon: FlaskConical, label: "Needs attention", value: data.attentionRooms }]} />
    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.classrooms.length ? data.classrooms.map((room) => <Card className="p-5" key={room.id}><div className="flex items-start justify-between gap-4"><div><p className="font-mono text-xs font-semibold text-primary">{room.code}</p><h2 className="mt-1 font-semibold text-slate-950">{room.name}</h2><p className="mt-1 text-sm text-slate-500">{room.building} · {room.kind}</p></div><StatusPill tone={room.readiness === "ready" ? "good" : room.readiness === "attention" ? "warning" : "critical"}>{room.readiness}</StatusPill></div><div className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm"><div><p className="text-xs text-slate-500">Capacity</p><p className="mt-1 font-semibold text-slate-900">{room.capacity}</p></div><div><p className="text-xs text-slate-500">Readiness</p><p className="mt-1 font-semibold text-slate-900">{room.readinessScore}%</p></div><div><p className="text-xs text-slate-500">Equipment</p><p className="mt-1 font-semibold text-slate-900">{room.totalEquipment}</p></div><div><p className="text-xs text-slate-500">Open tickets</p><p className="mt-1 font-semibold text-slate-900">{room.openTickets}</p></div></div>{room.offlineEquipment || room.degradedEquipment ? <p className="mt-4 text-xs text-amber-700">{room.offlineEquipment} offline · {room.degradedEquipment} degraded assets</p> : <p className="mt-4 text-xs text-emerald-700">No equipment faults detected</p>}</Card>) : <Card className="md:col-span-2 xl:col-span-3"><EmptyOperationsState description="Add classrooms, laboratories, and equipment to activate readiness scoring." icon={Building2} title="No campus spaces configured." /></Card>}</div>
  </section>;
}
