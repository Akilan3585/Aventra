import Link from "next/link";
import { ArrowRight, Bot, Building2, CheckCircle2, GraduationCap, ShieldCheck, Wrench } from "lucide-react";

import { MetricCard } from "@/design-system/patterns/metric-card";

const metrics = [
  { icon: GraduationCap, label: "Student workspace", value: "Ready", supportingText: "Typed student data service is in place." },
  { icon: Building2, label: "Facilities workspace", value: "Ready", supportingText: "Rooms, equipment, and schedules are modeled." },
  { icon: Wrench, label: "Operational data", value: "Secure", supportingText: "Campus records have an RLS security baseline." },
  { icon: Bot, label: "Agent runtime", value: "Queued", supportingText: "Auditable agent records are ready for controlled runs." },
] as const;

const checklist = [
  ["Add Clerk keys and enable role-based access", "In progress", "/settings"],
  ["Define Supabase RLS policies for campus roles", "Next", "/settings"],
  ["Import students, rooms, and course offerings", "Next", "/students"],
  ["Connect an AI provider and enable review queues", "Planned", "/analytics"],
] as const;

export default function DashboardPage() {
  return (
    <section aria-labelledby="dashboard-heading">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold text-primary">Good morning, administrator</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl" id="dashboard-heading">Your campus, in focus.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">A reliable command center for academic operations, facilities, and AI-assisted decisions.</p></div><Link className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700" href="/settings">Configure workspace <ArrowRight className="size-4" /></Link></div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}</div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="launch-heading"><div className="flex items-center justify-between gap-4"><div><p className="text-sm font-semibold text-slate-950" id="launch-heading">Launch checklist</p><p className="mt-1 text-sm text-slate-500">Complete these steps to activate live campus operations.</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Foundation</span></div><div className="mt-6 space-y-3">{checklist.map(([label, status, href], index) => <Link className="group flex items-center gap-4 rounded-xl border border-slate-100 p-3 transition hover:border-blue-100 hover:bg-blue-50/40" href={href} key={label}><span className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">{index + 1}</span><span className="min-w-0 flex-1 text-sm font-medium text-slate-700">{label}</span><span className="text-xs font-semibold text-slate-400 group-hover:text-primary">{status}</span></Link>)}</div></section>
        <section className="rounded-2xl bg-slate-950 p-5 text-white shadow-xl shadow-slate-300 sm:p-6" aria-labelledby="copilot-heading"><div className="flex size-10 items-center justify-center rounded-xl bg-white/10"><Bot className="size-5 text-blue-300" /></div><p className="mt-5 text-sm font-semibold" id="copilot-heading">Aventra Copilot</p><p className="mt-2 text-sm leading-6 text-slate-300">Your agent layer will recommend actions, log every decision, and keep people in control of high-impact changes.</p><div className="mt-6 space-y-3 border-t border-white/10 pt-5 text-sm"><p className="flex items-center gap-2"><ShieldCheck className="size-4 text-emerald-300" />Human review stays in the loop</p><p className="flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-300" />Every run is auditable</p></div><Link className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-300 hover:text-white" href="/analytics">Explore agent workspace <ArrowRight className="size-4" /></Link></section>
      </div>
    </section>
  );
}
