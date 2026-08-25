import type { Metadata } from "next";
import { ArrowRight, ChevronRight, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { BrandLogo } from "@/components/brand/brand-logo";
import { portalDefinitions } from "@/components/auth/portal-sign-in";
import { workspaceRoutes, type WorkspaceRouteKey } from "@/config/workspace-routes";

export const metadata: Metadata = { title: "Choose your portal" };

export default function SignInPage() {
  return <main className="relative grid min-h-screen place-items-center overflow-hidden bg-slate-950 px-5 py-12 text-white sm:px-8">
    <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(rgba(148,163,184,.45)_1px,transparent_1px)] [background-size:28px_28px]" />
    <div className="absolute left-[10%] top-[10%] size-80 rounded-full bg-blue-600/20 blur-3xl" />
    <div className="absolute bottom-[8%] right-[8%] size-72 rounded-full bg-violet-600/20 blur-3xl" />
    <section className="relative w-full max-w-5xl">
      <div className="flex items-center justify-between gap-4"><Link aria-label="Aventra AI home" className="rounded-2xl bg-white p-2 shadow-xl" href="/"><BrandLogo className="w-40" eager /></Link><span className="hidden items-center gap-2 text-xs text-slate-400 sm:flex"><ShieldCheck className="size-4 text-emerald-400" />Role verified by your campus directory</span></div>
      <div className="mx-auto mt-14 max-w-3xl text-center"><p className="text-sm font-semibold text-blue-300">Secure campus access</p><h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">Choose the portal that matches your role.</h1><p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">Each portal opens a different experience. Your Clerk identity is checked against the Supabase campus directory before access is granted.</p></div>
      <div className="mt-10 grid gap-4 md:grid-cols-3">{(Object.keys(portalDefinitions) as WorkspaceRouteKey[]).map((key) => { const portal = portalDefinitions[key]; const Icon = portal.icon; return <Link className="group relative overflow-hidden rounded-[26px] border border-white/10 bg-white/[.06] p-6 backdrop-blur transition hover:-translate-y-1 hover:border-white/25 hover:bg-white/[.09]" href={workspaceRoutes[key].signIn} key={key}><div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${portal.accent}`} /><span className={`grid size-12 place-items-center rounded-2xl bg-gradient-to-br ${portal.accent} shadow-lg`}><Icon className="size-5" /></span><p className="mt-7 text-xs font-semibold uppercase tracking-[.14em] text-slate-400">{portal.eyebrow}</p><h2 className="mt-2 text-xl font-semibold">{portal.label} sign in</h2><p className="mt-3 min-h-20 text-sm leading-6 text-slate-400">{portal.description}</p><span className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-sm font-semibold text-blue-200">Continue to portal <ChevronRight className="size-4 transition group-hover:translate-x-1" /></span></Link>; })}</div>
      <div className="mt-8 flex flex-col items-center justify-between gap-3 text-sm text-slate-400 sm:flex-row"><Link className="hover:text-white" href="/">← Return home</Link><Link className="inline-flex items-center gap-2 font-semibold text-white" href="/sign-up">Request access <ArrowRight className="size-4" /></Link></div>
    </section>
  </main>;
}
