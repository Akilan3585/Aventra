"use client";

import { Check, Code2, ExternalLink, Pencil, Trash2, X } from "lucide-react";
import { useActionState, useState } from "react";

import {
  linkMyPlatformProfileAction,
  unlinkMyPlatformProfileAction,
  type StudentPlatformActionState,
} from "@/features/performance/application/student-platform-actions";
import {
  codingPlatforms,
  platformCatalog,
  platformReadiness,
  readinessBand,
  type CodingPlatform,
} from "@/features/performance/domain/platform-performance";
import type { StudentPlatformSnapshot } from "@/features/performance/infrastructure/platform-performance.repository";
import { Card } from "@/design-system/primitives/card";
import { cn } from "@/lib/utils";

const initialState: StudentPlatformActionState = { message: "", status: "idle" };
const formatNumber = (value: number) => new Intl.NumberFormat("en-IN").format(value);
const formatDate = (value: string) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(new Date(value));

const placeholders: Record<CodingPlatform, string> = {
  codechef: "CodeChef username or profile link",
  github: "GitHub username or profile link",
  hackerrank: "HackerRank username or profile link",
  leetcode: "LeetCode username or profile link",
  linkedin: "https://www.linkedin.com/in/your-name",
};

const inputClass = "min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50";

function Message({ state }: { state: StudentPlatformActionState }) {
  return state.message ? <p aria-live="polite" className={cn("mt-2 rounded-lg px-3 py-2 text-xs", state.status === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>{state.message}</p> : null;
}

/** The link/update form for one platform. LinkedIn also asks for the connection count. */
function LinkForm({ onCancel, platform, snapshot }: { onCancel?: () => void; platform: CodingPlatform; snapshot?: StudentPlatformSnapshot }) {
  const [state, action, pending] = useActionState(linkMyPlatformProfileAction, initialState);
  const linkedin = platform === "linkedin";
  return <form action={action}>
    <input name="platform" type="hidden" value={platform} />
    <div className="flex flex-col gap-2 sm:flex-row">
      <input aria-label={`${platformCatalog[platform].label} ${linkedin ? "profile link" : "username"}`} className={inputClass} defaultValue={snapshot ? (linkedin ? snapshot.profile_url : snapshot.handle) : ""} maxLength={200} name="handle" placeholder={placeholders[platform]} required />
      {linkedin ? <input aria-label="LinkedIn connections" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm sm:w-36" defaultValue={snapshot ? String(Number(snapshot.score)) : ""} inputMode="numeric" max={100000} min={0} name="connections" placeholder="Connections" required type="number" /> : null}
      <div className="flex gap-2">
        <button className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={pending} type="submit"><Check className="size-4" />{pending ? (linkedin ? "Saving…" : "Fetching…") : snapshot ? "Save" : "Link"}</button>
        {onCancel ? <button aria-label="Cancel" className="rounded-xl border border-slate-200 px-3 py-2 text-slate-500 hover:bg-slate-50" disabled={pending} onClick={onCancel} type="button"><X className="size-4" /></button> : null}
      </div>
    </div>
    {linkedin ? <p className="mt-1.5 text-xs text-slate-500">LinkedIn does not allow automatic reading, so enter the connection count shown on your profile. It is marked as self-reported.</p> : null}
    <Message state={state} />
  </form>;
}

function RemoveButton({ platform }: { platform: CodingPlatform }) {
  const [state, action, pending] = useActionState(unlinkMyPlatformProfileAction, initialState);
  return <form action={action} className="flex flex-col items-end">
    <input name="platform" type="hidden" value={platform} />
    <button aria-label={`Remove ${platformCatalog[platform].label}`} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50" disabled={pending} type="submit"><Trash2 className="size-4" /></button>
    {state.status === "error" ? <span className="text-xs text-rose-600">{state.message}</span> : null}
  </form>;
}

function PlatformRow({ platform, snapshot }: { platform: CodingPlatform; snapshot?: StudentPlatformSnapshot }) {
  const [editing, setEditing] = useState(false);
  const [editedFrom, setEditedFrom] = useState(snapshot?.updated_at);
  // A successful save re-renders with a newer snapshot; close the editor then.
  if (snapshot?.updated_at !== editedFrom) {
    setEditedFrom(snapshot?.updated_at);
    setEditing(false);
  }
  const definition = platformCatalog[platform];

  if (!snapshot) return <div className="p-5 sm:px-6">
    <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900"><span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: definition.accent }} />{definition.label}<span className="text-xs font-normal text-slate-400">not linked</span></p>
    <LinkForm platform={platform} />
  </div>;

  const readiness = platformReadiness(platform, Number(snapshot.score));
  return <div className="p-5 sm:px-6">
    <div className="flex flex-wrap items-center gap-4">
      <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: definition.accent }} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">{definition.label} <a className="ml-1 inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline" href={snapshot.profile_url} rel="noreferrer noopener" target="_blank">@{snapshot.handle}<ExternalLink className="size-3" /></a></p>
        <p className="mt-1 text-xs text-slate-500">{definition.scoreLabel}: <span className="font-mono font-semibold text-slate-800">{formatNumber(Number(snapshot.score))}</span>{snapshot.activity_count !== null ? <> · {definition.activityLabel}: <span className="font-mono font-semibold text-slate-800">{formatNumber(snapshot.activity_count)}</span></> : null}{snapshot.tier ? <> · {snapshot.tier}</> : null} · updated {formatDate(snapshot.updated_at)}</p>
      </div>
      <span className="text-right"><span className="block font-mono text-sm font-semibold text-slate-900">{readiness}%</span><span className="text-xs capitalize text-slate-500">{readinessBand(readiness)}</span></span>
      {!editing ? <button aria-label={`Edit ${definition.label}`} className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-700" onClick={() => setEditing(true)} type="button"><Pencil className="size-4" /></button> : null}
      <RemoveButton platform={platform} />
    </div>
    {editing ? <div className="mt-3 pl-6"><LinkForm onCancel={() => setEditing(false)} platform={platform} snapshot={snapshot} /></div> : null}
  </div>;
}

/** Student workspace card: one row per platform. Linked rows show the saved profile; others offer their own link field. */
export function MyCodingProfiles({ snapshots }: { snapshots: StudentPlatformSnapshot[] }) {
  const byPlatform = new Map(snapshots.map((item) => [item.platform, item]));
  const ordered = [...codingPlatforms].sort((left, right) => Number(byPlatform.has(right)) - Number(byPlatform.has(left)));
  const linkedCount = codingPlatforms.filter((platform) => byPlatform.has(platform)).length;

  return <Card className="overflow-hidden">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-5 sm:px-6">
      <div>
        <div className="flex items-center gap-2"><Code2 className="size-4 text-primary" /><h2 className="font-semibold text-slate-950">My coding profiles</h2></div>
        <p className="mt-1 text-sm text-slate-500">GitHub, LeetCode, CodeChef, and HackerRank numbers are read from those sites and refreshed every night.</p>
      </div>
      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{linkedCount} of {codingPlatforms.length} linked</span>
    </div>
    <div className="divide-y divide-slate-100">{ordered.map((platform) => <PlatformRow key={platform} platform={platform} snapshot={byPlatform.get(platform)} />)}</div>
  </Card>;
}
