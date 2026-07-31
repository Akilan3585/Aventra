import { Bell, Bot, Database, Globe2, KeyRound, LockKeyhole, Settings2, ShieldCheck, SlidersHorizontal } from "lucide-react";

import { OperationsHeader, OperationsMetrics, SectionHeader, StatusPill } from "@/components/operations/operations-ui";
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
  const sections = [
    { description: "Campus identity, locale, and default workspace behavior.", icon: Globe2, label: "General", status: "Configured" },
    { description: "Delivery channels, review alerts, and escalation rules.", icon: Bell, label: "Notifications", status: "Defaults active" },
    { description: "Role enforcement, session security, and privileged actions.", icon: LockKeyhole, label: "Security", status: clerk ? "Protected" : "Setup required" },
    { description: "Clerk, Supabase, and AI provider connection health.", icon: Database, label: "Integrations", status: `${configured}/3 ready` },
  ];

  return <section>
    <OperationsHeader description="Review workspace preferences, integration health, security boundaries, and deterministic campus policies." eyebrow="Admin" title="Workspace settings" />
    <OperationsMetrics metrics={[
      { detail: "authentication, database, and AI", icon: Settings2, label: "Integrations ready", value: `${configured}/3` },
      { detail: "permissions checked on every mutation", icon: ShieldCheck, label: "Authorization", value: clerk ? "Active" : "Setup" },
      { detail: "reviewed guidance provider", icon: Bot, label: "AI provider", value: aiProvider },
      { detail: "student support trigger", icon: SlidersHorizontal, label: "Attendance threshold", value: `${campusPolicies.attendanceWarningPercent}%` },
    ]} />

    <div className="mt-6 grid gap-6 xl:grid-cols-[320px_1fr]">
      <Card className="h-fit p-3"><p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Settings sections</p>{sections.map(({ description, icon: Icon, label, status }, index) => <a className={`flex gap-3 rounded-xl p-3 transition hover:bg-slate-50 ${index === 0 ? "bg-blue-50" : ""}`} href={`#${label.toLowerCase()}`} key={label}><span className={`grid size-9 shrink-0 place-items-center rounded-lg ${index === 0 ? "bg-white text-blue-700" : "bg-slate-100 text-slate-500"}`}><Icon className="size-4" /></span><span><span className="block text-sm font-semibold text-slate-900">{label}</span><span className="mt-0.5 block text-xs text-slate-500">{status}</span><span className="sr-only">{description}</span></span></a>)}</Card>

      <div className="space-y-6">
        <Card className="overflow-hidden" id="general"><SectionHeader description="Core defaults used throughout the campus workspace." title="General" /><dl className="divide-y divide-slate-100 px-5 sm:px-6">{[{ label: "Workspace name", value: "Aventra AI Smart Campus" }, { label: "Default theme", value: "Light" }, { label: "Application URL", value: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000" }, { label: "Authorization model", value: "Role-based access control" }].map((item) => <div className="flex flex-col justify-between gap-1 py-4 sm:flex-row sm:items-center" key={item.label}><dt className="text-sm text-slate-500">{item.label}</dt><dd className="text-sm font-semibold text-slate-900">{item.value}</dd></div>)}</dl></Card>

        <Card className="overflow-hidden" id="notifications"><SectionHeader description="Safe defaults for campus events and approval workflows." title="Notifications" /><div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">{[{ label: "Operational exceptions", value: "In-app" }, { label: "Agent review requests", value: "In-app" }, { label: "Critical maintenance", value: "Immediate" }, { label: "Student outreach", value: "Human approval" }].map((item) => <div className="flex items-center justify-between rounded-xl border border-slate-100 p-4" key={item.label}><span className="text-sm text-slate-600">{item.label}</span><StatusPill tone="good">{item.value}</StatusPill></div>)}</div></Card>

        <Card className="overflow-hidden" id="security"><SectionHeader description="Secrets stay server-side and every privileged action is re-authorized." title="Security" /><div className="grid gap-4 p-5 sm:grid-cols-3 sm:p-6">{[{ label: "Authentication", ready: clerk }, { label: "Database boundary", ready: supabase }, { label: "Human review", ready: true }].map((item) => <div className="rounded-xl border border-slate-100 p-4" key={item.label}><ShieldCheck className={`size-5 ${item.ready ? "text-emerald-600" : "text-amber-600"}`} /><p className="mt-3 text-sm font-semibold text-slate-900">{item.label}</p><p className="mt-1 text-xs text-slate-500">{item.ready ? "Control active" : "Configuration required"}</p></div>)}</div></Card>

        <Card className="overflow-hidden" id="integrations"><SectionHeader description="Values are checked without exposing secret material." title="Integration health" /><div className="divide-y divide-slate-100">{integrations.map(({ description, icon: Icon, label, ready }) => <div className="flex items-center gap-4 p-5 sm:px-6" key={label}><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><Icon className="size-4.5" /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-900">{label}</p><p className="mt-0.5 text-xs text-slate-500">{description}</p></div><StatusPill tone={ready ? "good" : "warning"}>{ready ? "connected" : "required"}</StatusPill></div>)}</div></Card>

        <Card className="overflow-hidden"><SectionHeader description="Version-controlled thresholds applied by the business-logic layer." title="Operational policies" /><dl className="divide-y divide-slate-100 px-5 sm:px-6">{[{ label: "Attendance warning", value: `${campusPolicies.attendanceWarningPercent}%` }, { label: "Target room utilization", value: `${campusPolicies.roomUtilizationTargetPercent}%` }, { label: "Critical maintenance SLA", value: `${campusPolicies.criticalTicketHours} hours` }, { label: "High maintenance SLA", value: `${campusPolicies.highTicketHours} hours` }].map((policy) => <div className="flex items-center justify-between gap-4 py-4" key={policy.label}><dt className="text-sm text-slate-600">{policy.label}</dt><dd className="font-mono text-sm font-semibold text-slate-900">{policy.value}</dd></div>)}</dl></Card>
      </div>
    </div>
  </section>;
}
