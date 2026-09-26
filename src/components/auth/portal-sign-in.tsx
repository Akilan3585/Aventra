import type { LucideIcon } from "lucide-react";
import { Building2, ChevronDown, GraduationCap, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { ClerkAuthForm } from "@/components/auth/clerk-auth-form";
import { BrandLogo } from "@/components/brand/brand-logo";
import { workspaceRoutes, type WorkspaceRouteKey } from "@/config/workspace-routes";
import { isClerkConfigured } from "@/server/auth/campus-access";

type PortalDefinition = {
  accent: string;
  description: string;
  eyebrow: string;
  icon: LucideIcon;
  label: string;
  roleSummary: string;
};

export const portalDefinitions: Record<WorkspaceRouteKey, PortalDefinition> = {
  student: {
    accent: "from-violet-600 to-indigo-600",
    description: "Access your timetable, attendance, assignments, results, and college messages.",
    eyebrow: "Student portal",
    icon: GraduationCap,
    label: "Student",
    roleSummary: "Learning and campus life",
  },
  faculty: {
    accent: "from-emerald-600 to-teal-600",
    description: "Manage classes, attendance, assignments, reports, agents, and governed approvals.",
    eyebrow: "Faculty portal",
    icon: Building2,
    label: "Faculty",
    roleSummary: "Teaching and faculty operations",
  },
};

export function PortalSignIn({ portal }: { portal: WorkspaceRouteKey }) {
  const selected = portalDefinitions[portal];
  const SelectedIcon = selected.icon;
  const route = workspaceRoutes[portal];
  const signUpUrl = portal === "student" ? "/student/sign-up" : "/sign-up";

  return <main className="relative min-h-screen overflow-hidden bg-slate-50 px-5 py-8 sm:px-8 lg:grid lg:grid-cols-[.88fr_1.12fr] lg:p-0">
    <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${selected.accent}`} />
    <section className="relative hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
      <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(rgba(148,163,184,.45)_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className={`absolute -right-20 top-24 size-80 rounded-full bg-gradient-to-br ${selected.accent} opacity-25 blur-3xl`} />
      <Link aria-label="Aventra AI home" className="relative self-start rounded-2xl bg-white p-2 shadow-xl" href="/"><BrandLogo className="w-44" eager /></Link>
      <div className="relative max-w-lg">
        <span className={`grid size-14 place-items-center rounded-2xl bg-gradient-to-br ${selected.accent} shadow-xl`}><SelectedIcon className="size-6" /></span>
        <p className="mt-8 text-sm font-semibold text-blue-300">{selected.eyebrow}</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">A focused workspace for {selected.label.toLowerCase()} users.</h1>
        <p className="mt-5 text-base leading-7 text-slate-300">{selected.description}</p>
      </div>
      <div className="relative flex items-center gap-2 text-xs text-slate-400"><ShieldCheck className="size-4 text-emerald-400" />Your selected portal must match your verified college role.</div>
    </section>

    <section className="grid place-items-center py-6 lg:bg-white">
      <div className="w-full max-w-lg">
        <Link aria-label="Return to Aventra AI home" className="mb-6 inline-flex rounded-xl border border-slate-200 bg-white p-2 shadow-sm transition hover:border-slate-300 hover:shadow" href="/"><BrandLogo className="w-32" eager /></Link>
        <div aria-label="Choose portal" className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          {(Object.keys(portalDefinitions) as WorkspaceRouteKey[]).map((key) => {
            const item = portalDefinitions[key];
            const Icon = item.icon;
            const active = key === portal;
            return <Link aria-current={active ? "page" : undefined} className={`relative flex min-w-0 flex-col items-center rounded-xl px-2 py-3 text-center transition ${active ? "bg-slate-950 text-white shadow-lg" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`} href={workspaceRoutes[key].signIn} key={key}>
              <Icon className="size-4" /><span className="mt-1.5 text-xs font-semibold">{item.label}</span>
              {active ? <ChevronDown aria-hidden="true" className="absolute -bottom-3 size-4 fill-slate-950 text-slate-950" /> : null}
            </Link>;
          })}
        </div>
        <div className="mb-6 mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-600">{selected.eyebrow}</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">Welcome back.</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Sign in with your verified college account for {selected.roleSummary.toLowerCase()}. Aventra will reject access if your directory role does not match this portal.</p>
        </div>
        {isClerkConfigured() ? <ClerkAuthForm fallbackRedirectUrl={`/app?portal=${portal}`} mode="sign-in" path={route.signIn} signInUrl={route.signIn} signUpUrl={signUpUrl} /> : <div className="rounded-2xl border border-amber-200 bg-white p-6 text-sm leading-6 text-slate-600 shadow-sm">Clerk is not configured. Add the Clerk keys to <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">.env.local</code> and restart the app.</div>}
        <p className="mt-6 text-center text-sm text-slate-500">{portal === "student" ? "New student?" : "Need access?"} <Link className="font-semibold text-primary hover:text-blue-700" href={signUpUrl}>{portal === "student" ? "Start student onboarding" : "Request a faculty account"}</Link></p>
      </div>
    </section>
  </main>;
}
