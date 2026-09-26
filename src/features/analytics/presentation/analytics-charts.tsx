import type { DepartmentAttendance, TrendPoint } from "@/features/analytics/domain/analytics-rules";
import { attendanceStatusLabels, type AttendanceStatus } from "@/features/attendance/domain/attendance-rules";

const statusColor: Record<AttendanceStatus, string> = {
  absent: "#e11d48",
  excused: "#64748b",
  late: "#f59e0b",
  leave: "#7c3aed",
  od: "#0284c7",
  permission: "#0d9488",
  present: "#059669",
};

const shortDate = (iso: string) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

/** Daily attendance rate as a line with a threshold rule; hover a point for its numbers. */
export function AttendanceTrendChart({ points, threshold }: { points: TrendPoint[]; threshold: number }) {
  const width = 720;
  const height = 220;
  const pad = { bottom: 28, left: 36, right: 12, top: 12 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const x = (index: number) => pad.left + (points.length <= 1 ? innerW / 2 : (index / (points.length - 1)) * innerW);
  const y = (rate: number) => pad.top + innerH - (rate / 100) * innerH;
  const segments: string[] = [];
  let current = "";
  points.forEach((point, index) => {
    if (point.rate === null) { if (current) segments.push(current); current = ""; return; }
    current += `${current ? "L" : "M"}${x(index).toFixed(1)},${y(point.rate).toFixed(1)}`;
  });
  if (current) segments.push(current);
  const labelEvery = Math.max(1, Math.ceil(points.length / 8));
  const hasData = points.some((point) => point.rate !== null);

  return <div className="overflow-x-auto">
    <svg aria-label="Daily attendance rate" className="h-auto w-full min-w-[560px]" role="img" viewBox={`0 0 ${width} ${height}`}>
      {[0, 25, 50, 75, 100].map((tick) => <g key={tick}><line stroke="#e2e8f0" x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} /><text fill="#94a3b8" fontSize="10" textAnchor="end" x={pad.left - 6} y={y(tick) + 3}>{tick}%</text></g>)}
      <line stroke="#f59e0b" strokeDasharray="4 4" x1={pad.left} x2={width - pad.right} y1={y(threshold)} y2={y(threshold)} />
      <text fill="#b45309" fontSize="10" textAnchor="end" x={width - pad.right} y={y(threshold) - 4}>policy {threshold}%</text>
      {segments.map((d) => <path d={d} fill="none" key={d} stroke="#2563eb" strokeLinejoin="round" strokeWidth="2.5" />)}
      {points.map((point, index) => point.rate === null ? null : <circle cx={x(index)} cy={y(point.rate)} fill={point.rate < threshold ? "#e11d48" : "#2563eb"} key={point.date} r="4"><title>{`${shortDate(point.date)}: ${point.rate}% (${point.attended} of ${point.counted} counted, ${point.marked} marks)`}</title></circle>)}
      {points.map((point, index) => index % labelEvery === 0 || index === points.length - 1 ? <text fill="#64748b" fontSize="10" key={point.date} textAnchor="middle" x={x(index)} y={height - 8}>{shortDate(point.date)}</text> : null)}
      {!hasData ? <text fill="#94a3b8" fontSize="13" textAnchor="middle" x={width / 2} y={height / 2}>No attendance recorded in this range</text> : null}
    </svg>
  </div>;
}

/** Stacked bar of every status plus a legend with counts. */
export function StatusBreakdownBar({ items }: { items: Array<{ count: number; status: AttendanceStatus }> }) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  return <div>
    <div className="flex h-4 overflow-hidden rounded-full bg-slate-100">
      {total ? items.filter((item) => item.count).map((item) => <span key={item.status} style={{ backgroundColor: statusColor[item.status], width: `${(item.count / total) * 100}%` }} title={`${attendanceStatusLabels[item.status]}: ${item.count}`} />) : null}
    </div>
    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => <div className="rounded-xl border border-slate-100 p-3" key={item.status}>
        <p className="flex items-center gap-2 text-xs font-medium text-slate-500"><span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: statusColor[item.status] }} />{attendanceStatusLabels[item.status]}</p>
        <p className="mt-1 text-lg font-semibold text-slate-950">{item.count}<span className="ml-1 text-xs font-normal text-slate-500">{total ? `${Math.round((item.count / total) * 100)}%` : ""}</span></p>
      </div>)}
    </div>
  </div>;
}

/** Horizontal bars comparing departments against the policy line. */
export function DepartmentBars({ items, threshold }: { items: DepartmentAttendance[]; threshold: number }) {
  if (!items.length) return <p className="text-sm text-slate-500">No attendance recorded for any department in this range.</p>;
  return <div className="space-y-4">
    {items.map((item) => <div key={item.department}>
      <div className="mb-1.5 flex items-center justify-between text-sm"><span className="font-semibold text-slate-800">{item.department}</span><span className="text-xs text-slate-500">{item.students} students · {item.marks} marks · <span className="font-mono font-semibold text-slate-900">{item.rate === null ? "—" : `${item.rate}%`}</span></span></div>
      <div className="relative h-3 overflow-hidden rounded-full bg-slate-100">
        <span className="absolute inset-y-0 left-0 rounded-full" style={{ backgroundColor: item.rate !== null && item.rate < threshold ? "#f59e0b" : "#059669", width: `${item.rate ?? 0}%` }} />
        <span aria-hidden className="absolute inset-y-0 w-0.5 bg-slate-900/40" style={{ left: `${threshold}%` }} />
      </div>
    </div>)}
  </div>;
}
