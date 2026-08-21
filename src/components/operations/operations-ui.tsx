import type { LucideIcon } from "lucide-react";
import { AlertCircle, ArrowDownRight, ArrowUpRight, DatabaseZap, Search, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Card } from "@/design-system/primitives/card";
import { cn } from "@/lib/utils";

type HeaderProps = { actions?: ReactNode; description: string; eyebrow: string; title: string };

export function OperationsHeader({ actions, description, eyebrow, title }: HeaderProps) {
  return <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div className="max-w-3xl"><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">{eyebrow}</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.025em] text-slate-950 sm:text-4xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p></div>{actions ? <div className="flex shrink-0 flex-wrap gap-3">{actions}</div> : null}</div>;
}

export type OperationsMetric = { detail: string; icon: LucideIcon; label: string; trend?: { direction: "down" | "up"; label: string; positive?: boolean }; value: string | number };

export function OperationsMetrics({ metrics }: { metrics: readonly OperationsMetric[] }) {
  return <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(({ detail, icon: Icon, label, trend, value }) => <Card className="p-5" key={label}><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p></div><span className="grid size-10 place-items-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700"><Icon className="size-4.5" /></span></div><div className="mt-4 flex min-h-5 items-center gap-2">{trend ? <span className={cn("inline-flex items-center gap-1 text-xs font-semibold", trend.positive === false ? "text-rose-600" : "text-emerald-600")}>{trend.direction === "up" ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}{trend.label}</span> : null}<p className="text-xs leading-5 text-slate-500">{detail}</p></div></Card>)}</div>;
}

export function FilterBar({ children, query, resetHref, searchLabel = "Search records" }: { children?: ReactNode; query?: string; resetHref: string; searchLabel?: string }) {
  return <form className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center" method="get"><label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-inset ring-slate-200 focus-within:ring-2 focus-within:ring-blue-500"><Search className="size-4 shrink-0 text-slate-400" /><span className="sr-only">{searchLabel}</span><input className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400" defaultValue={query} name="q" placeholder={searchLabel} type="search" /></label>{children}<button className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800" type="submit">Apply</button><Link className="rounded-xl px-3 py-2.5 text-center text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-800" href={resetHref}>Reset</Link></form>;
}

export function SectionHeader({ action, description, title }: { action?: ReactNode; description?: string; title: string }) {
  return <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:p-6"><div><h2 className="font-semibold text-slate-950">{title}</h2>{description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}</div>{action}</div>;
}

export function ProgressBar({ label, tone = "blue", value }: { label?: string; tone?: "amber" | "blue" | "emerald" | "rose"; value: number }) {
  const safeValue = Math.min(100, Math.max(0, value));
  const tones = { amber: "bg-amber-500", blue: "bg-blue-600", emerald: "bg-emerald-500", rose: "bg-rose-500" };
  return <div><div aria-label={label ?? `${safeValue}%`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={safeValue} className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar"><div className={cn("h-full rounded-full", tones[tone])} style={{ width: `${safeValue}%` }} /></div>{label ? <p className="mt-1.5 text-xs text-slate-500">{label}</p> : null}</div>;
}

export function WorkspaceBanner({ mode }: { mode: "configuration" | "error" | "forbidden" | "live" }) {
  if (mode === "live") return null;
  const Icon = mode === "error" ? AlertCircle : mode === "configuration" ? DatabaseZap : ShieldCheck;
  const content = mode === "configuration" ? ["Connect secure operations", "Add Clerk keys, CAMPUS_ADMIN_EMAILS, and the server-only SUPABASE_SECRET_KEY to .env.local, then restart and sign in."] : mode === "forbidden" ? ["Role-protected workspace", "Your active campus-directory role does not include access to this module. Ask a campus administrator to review your membership."] : ["Live data is unavailable", "The secure connection is configured, but the operational query failed. Verify the Supabase URL and secret key."];
  return <Card className="mt-8 border-amber-200 bg-amber-50/70 p-6"><div className="flex gap-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-amber-700 shadow-sm"><Icon className="size-5" /></span><div><h2 className="font-semibold text-slate-950">{content[0]}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{content[1]}</p></div></div></Card>;
}

type Tone = "critical" | "good" | "neutral" | "warning";
const toneStyles: Record<Tone, string> = { critical: "bg-rose-50 text-rose-700 ring-rose-200", good: "bg-emerald-50 text-emerald-700 ring-emerald-200", neutral: "bg-slate-100 text-slate-600 ring-slate-200", warning: "bg-amber-50 text-amber-700 ring-amber-200" };

export function StatusPill({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset", toneStyles[tone])}>{children}</span>;
}

export function EmptyOperationsState({ description, icon: Icon, title }: { description: string; icon: LucideIcon; title: string }) {
  return <div className="grid min-h-64 place-items-center px-6 py-12 text-center"><div className="max-w-sm"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-blue-50 text-primary"><Icon className="size-6" /></span><h3 className="mt-5 font-semibold text-slate-950">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{description}</p></div></div>;
}
