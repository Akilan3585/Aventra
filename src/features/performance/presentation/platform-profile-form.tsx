"use client";

import { Plus, RefreshCw, X } from "lucide-react";
import { useActionState, useState } from "react";

import {
  recordPlatformProfileAction,
  refreshPlatformMetricsAction,
  type PlatformPerformanceActionState,
} from "@/features/performance/application/platform-performance-actions";
import { codingPlatforms, platformCatalog, type CodingPlatform } from "@/features/performance/domain/platform-performance";
import { cn } from "@/lib/utils";

export type PlatformFormOption = { id: string; label: string };

const initialState: PlatformPerformanceActionState = { message: "", status: "idle" };
const fieldClass = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100";
const labelClass = "text-sm font-medium text-slate-700";

const handlePlaceholders: Record<CodingPlatform, string> = {
  codechef: "username or https://www.codechef.com/users/…",
  github: "username or https://github.com/…",
  hackerrank: "username or https://www.hackerrank.com/profile/…",
  leetcode: "username or https://leetcode.com/u/…",
  linkedin: "public profile name",
};

function Message({ state }: { state: PlatformPerformanceActionState }) {
  return state.message ? <p aria-live="polite" className={cn("rounded-xl px-4 py-3 text-sm", state.status === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>{state.message}</p> : null;
}

/** Re-fetches every linked profile from the platforms right now. */
export function PlatformRefreshButton({ canManage }: { canManage: boolean }) {
  const [state, action, pending] = useActionState(refreshPlatformMetricsAction, initialState);
  if (!canManage) return null;
  return <form action={action} className="flex flex-col items-end gap-2">
    <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50" disabled={pending} type="submit"><RefreshCw className={cn("size-4", pending && "animate-spin")} />{pending ? "Fetching…" : "Refresh metrics"}</button>
    {state.message ? <div className="max-w-md text-left"><Message state={state} /></div> : null}
  </form>;
}

export function PlatformProfileForm({ canManage, students }: { canManage: boolean; students: PlatformFormOption[] }) {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<CodingPlatform>("github");
  const [state, action, pending] = useActionState(recordPlatformProfileAction, initialState);
  if (!canManage) return null;
  const definition = platformCatalog[platform];
  const manual = platform === "linkedin";

  return <>
    <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50" onClick={() => setOpen(true)} type="button"><Plus className="size-4" />Link platform profile</button>
    {open ? <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm"><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/70 bg-white p-5 shadow-2xl sm:p-7">
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.15em] text-primary">Authorized workflow</p><h2 className="mt-1 text-2xl font-semibold text-slate-950">Link platform profile</h2><p className="mt-2 text-sm leading-6 text-slate-500">Enter the student&apos;s username. GitHub, LeetCode, CodeChef, and HackerRank metrics are fetched live from the platform and refreshed every night. LinkedIn does not allow automated access, so its numbers are entered by hand.</p></div><button aria-label="Close" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100" onClick={() => setOpen(false)} type="button"><X className="size-5" /></button></div>
      <form action={action} className="mt-7 grid gap-5 sm:grid-cols-2">
        <label className="sm:col-span-2"><span className={labelClass}>Student</span><select className={fieldClass} name="studentId" required><option value="">Select student</option>{students.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
        <label><span className={labelClass}>Platform</span><select className={fieldClass} name="platform" onChange={(event) => setPlatform(event.target.value as CodingPlatform)} value={platform}>{codingPlatforms.map((item) => <option key={item} value={item}>{platformCatalog[item].label}{item === "linkedin" ? " (manual)" : ""}</option>)}</select></label>
        <label><span className={labelClass}>Username or profile link</span><input className={fieldClass} maxLength={200} name="handle" placeholder={handlePlaceholders[platform]} required /></label>
        {manual ? <>
          <label className="sm:col-span-2"><span className={labelClass}>Profile link</span><input className={fieldClass} name="profileUrl" placeholder="https://www.linkedin.com/in/…" required type="url" /></label>
          <label><span className={labelClass}>{definition.scoreLabel}</span><input className={fieldClass} min="0" name="score" required step="any" type="number" /></label>
          <label><span className={labelClass}>{definition.activityLabel} (optional)</span><input className={fieldClass} min="0" name="activityCount" step="1" type="number" /></label>
          <label className="sm:col-span-2"><span className={labelClass}>Headline or badge (optional)</span><input className={fieldClass} maxLength={40} name="tier" /></label>
        </> : <p className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800 sm:col-span-2">{definition.scoreLabel} and {definition.activityLabel.toLowerCase()} are read from {definition.label} when you save.</p>}
        <div className="sm:col-span-2"><Message state={state} /></div>
        <div className="flex justify-end gap-3 sm:col-span-2"><button className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700" onClick={() => setOpen(false)} type="button">Done</button><button className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50" disabled={pending} type="submit">{pending ? (manual ? "Saving…" : "Fetching from platform…") : manual ? "Save snapshot" : "Link and fetch"}</button></div>
      </form>
    </div></div> : null}
  </>;
}
