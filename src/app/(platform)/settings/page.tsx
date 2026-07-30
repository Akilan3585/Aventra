import { Bot, Database, KeyRound, Settings2, ShieldCheck, SlidersHorizontal } from "lucide-react";

import { OperationsHeader, OperationsMetrics, StatusPill } from "@/components/operations/operations-ui";
import { Card } from "@/design-system/primitives/card";
import { campusPolicies } from "@/features/operations/domain/operations-rules";
import { isClerkConfigured } from "@/server/auth/campus-access";
import { isSupabaseAdminConfigured } from "@/server/supabase/admin-client";

export const dynamic = "force-dynamic";

function isSet(name: string) {
  const value = process.env[name];
  return Boolean(value && !value.includes("REPLACE_ME"));
}

export default function SettingsPage() {
  const clerk = isClerkConfigured();
  const supabase = isSupabaseAdminConfigured();
  const aiProvider = process.env.AI_PROVIDER ?? "not selected";
  const aiReady = aiProvider === "openai" ? isSet("OPENAI_API_KEY") : aiProvider === "gemini" ? isSet("GEMINI_API_KEY") : false;
  const configured = [clerk, supabase, aiReady].filter(Boolean).length;
  const integrations = [
    { description: "Identity, sessions, and campus role metadata", icon: KeyRound, label: "Clerk authentication", ready: clerk },
    { description: "Server-only operational data access", icon: Database, label: "Supabase database", ready: supabase },
    { description: `${aiProvider} provider for reviewed guidance`, icon: Bot, label: "AI provider", ready: aiReady },
  ];
  return <section><OperationsHeader description="Review integration health, security boundaries, and the deterministic policies used throughout campus operations." eyebrow="Platform administration" title="Workspace settings." /><OperationsMetrics metrics={[{ detail: "Authentication, database, and AI", icon: Settings2, label: "Integrations ready", value: `${configured}/3` }, { detail: "Server Actions re-check every permission", icon: ShieldCheck, label: "Authorization", value: clerk ? "Active" : "Setup" }, { detail: "Current reviewed guidance provider", icon: Bot, label: "AI provider", value: aiProvider }, { detail: "Attendance support trigger", icon: SlidersHorizontal, label: "Attendance threshold", value: `${campusPolicies.attendanceWarningPercent}%` }]} />
    <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]"><Card className="p-5 sm:p-6"><h2 className="font-semibold text-slate-950">Integration health</h2><p className="mt-1 text-sm text-slate-500">Values are checked without exposing any secret.</p><div className="mt-5 space-y-3">{integrations.map(({ description, icon: Icon, label, ready }) => <div className="flex items-center gap-4 rounded-xl border border-slate-100 p-4" key={label}><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-primary"><Icon className="size-4" /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-900">{label}</p><p className="mt-0.5 text-xs text-slate-500">{description}</p></div><StatusPill tone={ready ? "good" : "warning"}>{ready ? "connected" : "required"}</StatusPill></div>)}</div></Card><Card className="p-5 sm:p-6"><h2 className="font-semibold text-slate-950">Operational policies</h2><p className="mt-1 text-sm text-slate-500">Version-controlled thresholds currently applied by the business-logic layer.</p><dl className="mt-5 divide-y divide-slate-100">{[{ label: "Attendance warning", value: `${campusPolicies.attendanceWarningPercent}%` }, { label: "Target room utilization", value: `${campusPolicies.roomUtilizationTargetPercent}%` }, { label: "Critical maintenance SLA", value: `${campusPolicies.criticalTicketHours} hours` }, { label: "High maintenance SLA", value: `${campusPolicies.highTicketHours} hours` }].map((policy) => <div className="flex items-center justify-between gap-4 py-4" key={policy.label}><dt className="text-sm text-slate-600">{policy.label}</dt><dd className="font-mono text-sm font-semibold text-slate-900">{policy.value}</dd></div>)}</dl><p className="mt-4 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-500">Change these values through reviewed code/configuration until institution-level policy persistence and approval history are added.</p></Card></div>
  </section>;
}
