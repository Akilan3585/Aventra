"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { analyticsRanges, type AnalyticsRange } from "@/features/analytics/domain/analytics-rules";
import { cn } from "@/lib/utils";

const refreshSeconds = 60;

function hrefFor(range: AnalyticsRange, department: string | null) {
  const params = new URLSearchParams({ range: String(range) });
  if (department) params.set("department", department);
  return `/analytics?${params.toString()}`;
}

/** Range and department filters live in the URL so every view is shareable and server-rendered. */
export function AnalyticsControls({
  department,
  departments,
  generatedAt,
  range,
}: {
  department: string | null;
  departments: Array<{ code: string; name: string }>;
  generatedAt: string;
  range: AnalyticsRange;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!live) return;
    const timer = window.setInterval(() => startTransition(() => router.refresh()), refreshSeconds * 1000);
    return () => window.clearInterval(timer);
  }, [live, router]);

  const go = (nextRange: AnalyticsRange, nextDepartment: string | null) => startTransition(() => router.push(hrefFor(nextRange, nextDepartment)));

  return <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center sm:justify-between">
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-xl bg-slate-100 p-1" role="group" aria-label="Time range">
        {analyticsRanges.map((item) => <button aria-pressed={item === range} className={cn("rounded-lg px-3 py-1.5 text-sm font-semibold transition", item === range ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800")} key={item} onClick={() => go(item, department)} type="button">{item} days</button>)}
      </div>
      <label className="text-sm">
        <span className="sr-only">Department</span>
        <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" onChange={(event) => go(range, event.target.value || null)} value={department ?? ""}>
          <option value="">All departments</option>
          {departments.map((item) => <option key={item.code} value={item.code}>{item.code} · {item.name}</option>)}
        </select>
      </label>
    </div>
    <div className="flex items-center gap-3 text-xs text-slate-500">
      <span>Updated {new Date(generatedAt).toLocaleTimeString()}</span>
      <label className="inline-flex cursor-pointer items-center gap-2 font-medium text-slate-700"><input checked={live} className="size-4 accent-blue-600" onChange={(event) => setLive(event.target.checked)} type="checkbox" />Auto-refresh every {refreshSeconds}s</label>
      <button aria-label="Refresh now" className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50" disabled={pending} onClick={() => startTransition(() => router.refresh())} type="button"><RefreshCw className={cn("size-4", pending && "animate-spin")} /></button>
    </div>
  </div>;
}
