import type { LucideIcon } from "lucide-react";
import { AlertCircle, DatabaseZap, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

import { Card } from "@/design-system/primitives/card";
import { cn } from "@/lib/utils";

type HeaderProps = {
  actions?: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
};

export function OperationsHeader({ actions, description, eyebrow, title }: HeaderProps) {
  return (
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div>
        <p className="text-sm font-semibold text-primary">{eyebrow}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}

export type OperationsMetric = {
  detail: string;
  icon: LucideIcon;
  label: string;
  value: string | number;
};

export function OperationsMetrics({ metrics }: { metrics: readonly OperationsMetric[] }) {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map(({ detail, icon: Icon, label, value }) => (
        <Card className="p-5" key={label}>
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p></div>
            <span className="grid size-9 place-items-center rounded-xl bg-blue-50 text-primary"><Icon className="size-4" /></span>
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">{detail}</p>
        </Card>
      ))}
    </div>
  );
}

export function WorkspaceBanner({ mode }: { mode: "configuration" | "error" | "forbidden" | "live" }) {
  if (mode === "live") return null;
  const Icon = mode === "error" ? AlertCircle : mode === "configuration" ? DatabaseZap : ShieldCheck;
  const content = mode === "configuration"
    ? ["Connect secure operations", "Add Clerk keys, CAMPUS_ADMIN_EMAILS, and the server-only SUPABASE_SECRET_KEY to .env.local, then restart and sign in."]
    : mode === "forbidden"
      ? ["Role-protected workspace", "Your signed-in campus role does not include access to this module. Update the Clerk privateMetadata.campusRole value."]
      : ["Live data is unavailable", "The secure connection is configured, but the operational query failed. Verify the Supabase URL and secret key."];

  return <Card className="mt-8 border-amber-200 bg-amber-50/70 p-6"><div className="flex gap-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-amber-700 shadow-sm"><Icon className="size-5" /></span><div><h2 className="font-semibold text-slate-950">{content[0]}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{content[1]}</p></div></div></Card>;
}

type Tone = "critical" | "good" | "neutral" | "warning";

const toneStyles: Record<Tone, string> = {
  critical: "bg-rose-50 text-rose-700 ring-rose-200",
  good: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  neutral: "bg-slate-100 text-slate-600 ring-slate-200",
  warning: "bg-amber-50 text-amber-700 ring-amber-200",
};

export function StatusPill({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset", toneStyles[tone])}>{children}</span>;
}

export function EmptyOperationsState({ description, icon: Icon, title }: { description: string; icon: LucideIcon; title: string }) {
  return <div className="grid min-h-64 place-items-center px-6 py-12 text-center"><div className="max-w-sm"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-blue-50 text-primary"><Icon className="size-6" /></span><h3 className="mt-5 font-semibold text-slate-950">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{description}</p></div></div>;
}
