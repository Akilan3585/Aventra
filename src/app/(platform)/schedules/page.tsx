import { AlertTriangle, CalendarDays, Gauge, School } from "lucide-react";

import { EmptyOperationsState, OperationsHeader, OperationsMetrics, StatusPill, WorkspaceBanner } from "@/components/operations/operations-ui";
import { Card } from "@/design-system/primitives/card";
import { loadScheduleWorkspace } from "@/features/operations/infrastructure/campus-operations.repository";
import { ScheduleCreator } from "@/features/operations/presentation/operation-dialogs";
import { resolveWorkspaceAccess } from "@/server/workspace/workspace-access";

export const dynamic = "force-dynamic";
const formatTime = (value: string) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default async function SchedulesPage() {
  const access = await resolveWorkspaceAccess("reports:read", "schedules:manage");
  let workspace = null;
  if (access.mode === "live") { try { workspace = await loadScheduleWorkspace(); } catch { workspace = null; } }
  const mode = access.mode === "live" && !workspace ? "error" : access.mode;
  const data = workspace ?? { conflicts: 0, offeringOptions: [], roomOptions: [], schedules: [], todaySessions: 0, utilizationPercent: 0 };
  return <section><OperationsHeader actions={<ScheduleCreator canManage={access.canManage && mode === "live"} offerings={data.offeringOptions} rooms={data.roomOptions} />} description="Coordinate course demand, faculty delivery, room capacity, and timetable constraints from one operational queue." eyebrow="Timetable intelligence" title="Schedules without collisions." /><WorkspaceBanner mode={mode} /><OperationsMetrics metrics={[{ detail: "Sessions scheduled for today", icon: CalendarDays, label: "Today’s sessions", value: data.todaySessions }, { detail: "Room overlaps or capacity mismatches", icon: AlertTriangle, label: "Constraint alerts", value: data.conflicts }, { detail: "Allocated seats against room capacity", icon: Gauge, label: "Seat utilization", value: `${data.utilizationPercent}%` }, { detail: "Active schedule records", icon: School, label: "Total sessions", value: data.schedules.length }]} />
    <Card className="mt-6 overflow-hidden"><div className="border-b border-slate-100 p-5 sm:p-6"><h2 className="font-semibold text-slate-950">Timetable</h2><p className="mt-1 text-sm text-slate-500">Constraint warnings remain visible until capacity or overlap is resolved.</p></div>{data.schedules.length ? <div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-6 py-3">Course</th><th className="px-4 py-3">Time</th><th className="px-4 py-3">Room</th><th className="px-4 py-3">Faculty</th><th className="px-4 py-3">Demand</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{data.schedules.map((schedule) => <tr key={schedule.id}><td className="px-6 py-4 text-sm font-semibold text-slate-900">{schedule.course}</td><td className="px-4 py-4"><p className="text-sm text-slate-700">{formatTime(schedule.startsAt)}</p><p className="text-xs text-slate-500">to {formatTime(schedule.endsAt)}</p></td><td className="px-4 py-4 font-mono text-sm text-slate-700">{schedule.roomCode}</td><td className="px-4 py-4 text-sm text-slate-600">{schedule.faculty}</td><td className="px-4 py-4 text-sm text-slate-700">{schedule.enrollmentCount}/{schedule.roomCapacity}</td><td className="px-4 py-4"><StatusPill tone={schedule.hasConflict || schedule.capacityMismatch ? "critical" : "good"}>{schedule.hasConflict ? "overlap" : schedule.capacityMismatch ? "capacity" : "clear"}</StatusPill></td></tr>)}</tbody></table></div> : <EmptyOperationsState description="Create rooms and course offerings, then schedule the first conflict-checked session." icon={CalendarDays} title="No sessions scheduled." />}</Card>
  </section>;
}
