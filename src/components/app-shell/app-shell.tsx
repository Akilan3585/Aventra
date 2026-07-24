"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import { Bell, ChevronDown, Menu, Search, Sparkles, X } from "lucide-react";

import { navigationItems } from "@/config/navigation";
import { cn } from "@/lib/utils";

type AppShellProps = { children: ReactNode };

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f7f9fc]">
      <aside className={cn("fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white px-4 py-5 transition-transform lg:translate-x-0", isMenuOpen ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex items-center justify-between px-2">
          <Link className="flex items-center gap-3" href="/dashboard">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-sm font-bold text-white shadow-lg shadow-blue-200">A</span>
            <span><span className="block text-sm font-semibold tracking-tight text-slate-950">Aventra AI</span><span className="block text-xs text-slate-500">Campus OS</span></span>
          </Link>
          <button aria-label="Close navigation" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={() => setIsMenuOpen(false)} type="button"><X className="size-5" /></button>
        </div>
        <div className="mt-8 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-4"><div className="flex items-center gap-2 text-xs font-semibold text-blue-700"><Sparkles className="size-3.5" />AI workspace</div><p className="mt-2 text-sm font-semibold text-slate-800">Bring every campus operation into focus.</p></div>
        <nav aria-label="Primary navigation" className="mt-7 flex-1">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Workspace</p>
          <ul className="mt-2 space-y-1">{navigationItems.map((item) => { const Icon = item.icon; const isActive = pathname === item.href; return <li key={item.href}><Link className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors", isActive ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950")} href={item.href} onClick={() => setIsMenuOpen(false)}><Icon className="size-4" />{item.label}</Link></li>; })}</ul>
        </nav>
        <div className="rounded-2xl bg-slate-950 p-4 text-white"><p className="text-xs font-medium text-slate-300">Need a hand?</p><p className="mt-1 text-sm font-semibold">Ask Aventra Copilot</p><Link className="mt-3 inline-flex text-xs font-semibold text-blue-300" href="/analytics">Explore AI workspace →</Link></div>
      </aside>
      {isMenuOpen ? <button aria-label="Close navigation overlay" className="fixed inset-0 z-30 bg-slate-950/20 lg:hidden" onClick={() => setIsMenuOpen(false)} type="button" /> : null}
      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200/80 bg-white/85 px-4 backdrop-blur sm:px-6 lg:px-8">
          <button aria-label="Open navigation" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setIsMenuOpen(true)} type="button"><Menu className="size-5" /></button>
          <div className="hidden max-w-md flex-1 items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-400 md:flex"><Search className="size-4" /><span>Search people, rooms, schedules…</span></div>
          <div className="ml-auto flex items-center gap-2"><button aria-label="Notifications" className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-100" type="button"><Bell className="size-5" /><span className="absolute right-2 top-2 size-1.5 rounded-full bg-blue-600" /></button><button className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-100" type="button"><span className="grid size-8 place-items-center rounded-lg bg-amber-100 text-xs font-bold text-amber-700">AD</span><span className="hidden text-left sm:block"><span className="block text-xs font-semibold text-slate-800">Campus admin</span><span className="block text-[11px] text-slate-500">Administrator</span></span><ChevronDown className="hidden size-4 text-slate-400 sm:block" /></button></div>
        </header>
        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
