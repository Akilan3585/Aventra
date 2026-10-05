import type { LucideIcon } from "lucide-react";
import { AlertCircle, ArrowDownRight, ArrowUpRight, DatabaseZap, Search, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Card } from "@/design-system/primitives/card";
import { cn } from "@/lib/utils";

type HeaderProps = { actions?: ReactNode; description: string; eyebrow: string; title: string };

export function OperationsHeader({ actions, description, eyebrow, title }: HeaderProps) {
  return <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div className="max-w-3xl"><p className="flex items-center gap-2 text-[13px] font-medium text-slate-500"><span aria-hidden className="h-3.5 w-0.5 rounded-full bg-blue-600" />{eyebrow}</p><h1 className="mt-2.5 text-2xl font-semibold tracking-[-0.022em] text-slate-950 sm:text-[1.75rem] sm:leading-9">{title}</h1><p className="mt-2 max-w-[65ch] text-sm leading-6 text-slate-500">{description}</p></div>{actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}</div>;
}

export type OperationsMetric = { detail: string; icon: LucideIcon; label: string; trend?: { direction: "down" | "up"; label: string; positive?: boolean }; value: string | number };

const metricColumns: Record<number, string> = { 1: "", 2: "grid-cols-2", 3: "sm:grid-cols-3", 4: "grid-cols-2 xl:grid-cols-4", 5: "grid-cols-2 xl:grid-cols-5", 6: "grid-cols-2 sm:grid-cols-3 xl:grid-cols-6" };

/** One joined strip rather than a row of separate cards: the figures read as a single operating snapshot. */
export function OperationsMetrics({ metrics }: { metrics: readonly OperationsMetric[] }) {
  const spanLast = metrics.length === 5;
  return <Card className="mt-8 overflow-hidden"><dl className={cn("grid gap-px bg-slate-200/70", metricColumns[metrics.length] ?? "sm:grid-cols-2 xl:grid-cols-4")}>{metrics.map(({ detail, icon: Icon, label, trend, value }, index) => <div className={cn("flex min-w-0 flex-col bg-white px-4 py-4 sm:px-6 sm:py-5", spanLast && index === metrics.length - 1 && "col-span-2 xl:col-span-1")} key={label}><dt className="flex items-center gap-2 text-[13px] font-medium text-slate-500"><Icon aria-hidden className="size-3.5 text-slate-400" />{label}</dt><dd className="mt-3 text-[1.75rem] font-semibold leading-none tracking-[-0.02em] text-slate-950 tabular-nums">{value}</dd><dd className="mt-3 flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1">{trend ? <span className={cn("inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium", trend.positive === false ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700")}>{trend.direction === "up" ? <ArrowUpRight aria-hidden className="size-3.5" /> : <ArrowDownRight aria-hidden className="size-3.5" />}{trend.label}</span> : null}<span className="text-xs leading-5 text-slate-500">{detail}</span></dd></div>)}</dl></Card>;
}

export function FilterBar({ children, query, resetHref, searchLabel = "Search records" }: { children?: ReactNode; query?: string; resetHref: string; searchLabel?: string }) {
  return <form className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center" method="get"><label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5 ring-1 ring-inset ring-slate-200 transition focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500"><Search className="size-4 shrink-0 text-slate-400" /><span className="sr-only">{searchLabel}</span><input className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400" defaultValue={query} name="q" placeholder={searchLabel} type="search" /></label>{children}<button className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 active:translate-y-px" type="submit">Apply</button><Link className="rounded-lg px-3 py-2.5 text-center text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800" href={resetHref}>Reset</Link></form>;
}

export function SectionHeader({ action, description, title }: { action?: ReactNode; description?: string; title: string }) {
  return <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:px-6"><div><h2 className="text-[15px] font-semibold tracking-[-0.01em] text-slate-950">{title}</h2>{description ? <p className="mt-0.5 text-[13px] leading-5 text-slate-500">{description}</p> : null}</div>{action ? <div className="self-start sm:self-auto">{action}</div> : null}</div>;
}

export function ProgressBar({ label, tone = "blue", value }: { label?: string; tone?: "amber" | "blue" | "emerald" | "rose"; value: number }) {
  const safeValue = Math.min(100, Math.max(0, value));
  const tones = { amber: "bg-amber-500", blue: "bg-blue-600", emerald: "bg-emerald-500", rose: "bg-rose-500" };
  return <div><div aria-label={label ?? `${safeValue}%`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={safeValue} className="h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar"><div className={cn("h-full rounded-full transition-[width] duration-500", tones[tone])} style={{ width: `${safeValue}%` }} /></div>{label ? <p className="mt-1.5 text-xs text-slate-500">{label}</p> : null}</div>;
}

export function WorkspaceBanner({ mode }: { mode: "configuration" | "error" | "forbidden" | "live" }) {
  if (mode === "live") return null;
  const Icon = mode === "error" ? AlertCircle : mode === "configuration" ? DatabaseZap : ShieldCheck;
  const content = mode === "configuration" ? ["Connect secure operations", "Add Clerk keys, CAMPUS_ADMIN_EMAILS, and the server-only SUPABASE_SECRET_KEY to .env.local, then restart and sign in."] : mode === "forbidden" ? ["Role-protected workspace", "Your active campus-directory role does not include access to this module. Ask a campus administrator to review your membership."] : ["Live data is unavailable", "The secure connection is configured, but the operational query failed. Verify the Supabase URL and secret key."];
  return <div className="mt-6 flex gap-3.5 rounded-xl border border-amber-200/80 bg-amber-50/60 px-5 py-4" role={mode === "error" ? "alert" : "status"}><Icon aria-hidden className="mt-0.5 size-4.5 shrink-0 text-amber-700" /><div><h2 className="text-sm font-semibold text-slate-900">{content[0]}</h2><p className="mt-0.5 text-[13px] leading-5 text-slate-600">{content[1]}</p></div></div>;
}

type Tone = "critical" | "good" | "neutral" | "warning";
const toneStyles: Record<Tone, string> = { critical: "bg-rose-50 text-rose-700 ring-rose-200/80", good: "bg-emerald-50 text-emerald-700 ring-emerald-200/80", neutral: "bg-slate-50 text-slate-600 ring-slate-200", warning: "bg-amber-50 text-amber-800 ring-amber-200/80" };
const toneDots: Record<Tone, string> = { critical: "bg-rose-500", good: "bg-emerald-500", neutral: "bg-slate-400", warning: "bg-amber-500" };

export function StatusPill({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium capitalize tabular-nums ring-1 ring-inset", toneStyles[tone])}><span aria-hidden className={cn("size-1.5 rounded-full", toneDots[tone])} />{children}</span>;
}

export function EmptyOperationsState({ description, icon: Icon, title }: { description: string; icon: LucideIcon; title: string }) {
  return <div className="grid min-h-64 place-items-center px-6 py-12 text-center"><div className="max-w-sm"><span className="mx-auto grid size-11 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500"><Icon className="size-5" /></span><h3 className="mt-4 font-semibold text-slate-950">{title}</h3><p className="mt-1.5 text-sm leading-6 text-slate-500">{description}</p></div></div>;
}
