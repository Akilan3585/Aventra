"use client";

import { UserButton } from "@clerk/nextjs";
import {
  Bell,
  ChevronDown,
  Command,
  LogIn,
  Menu,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  findNavigationItem,
  homeForRole,
  moduleKeywords,
  navigationForRole,
} from "@/config/navigation";
import { cn } from "@/lib/utils";
import type { Role } from "@/server/auth/permissions";

type AppShellProps = { children: ReactNode; role: Role | null };

const workspaceNames: Record<Role, string> = {
  admin: "Campus administration",
  faculty: "Faculty workspace",
  "maintenance-staff": "Facilities workspace",
  student: "Student workspace",
  "super-admin": "Campus administration",
};

export function AppShell({ children, role }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const roleNavigation = useMemo(() => navigationForRole(role), [role]);
  const roleItems = useMemo(() => roleNavigation.flatMap((group) => group.items), [roleNavigation]);
  const homeHref = homeForRole(role);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(navigationForRole(role).map((group) => [group.label, true])),
  );
  const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const clerkConfigured = Boolean(
    clerkPublishableKey && !clerkPublishableKey.includes("REPLACE_ME"),
  );
  const activeItem = roleItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)) ?? findNavigationItem(pathname);

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return roleItems.slice(0, 8);
    return roleItems.filter((item) =>
      `${item.label} ${moduleKeywords[item.href] ?? ""}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [query, roleItems]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsSearchOpen(true);
      }
      if (event.key === "Escape") setIsSearchOpen(false);
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    if (isSearchOpen) window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [isSearchOpen]);

  function openResult(href: string) {
    router.push(href);
    setIsSearchOpen(false);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:translate-x-0",
          isMenuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-5">
          <Link className="flex items-center gap-3" href={homeHref}>
            <span className="grid size-9 place-items-center rounded-xl bg-blue-600 text-sm font-bold text-white shadow-sm">A</span>
            <span>
              <span className="block text-sm font-semibold tracking-tight text-slate-950">Aventra AI</span>
              <span className="block text-[11px] font-medium text-slate-500">{role ? workspaceNames[role] : "Smart Campus OS"}</span>
            </span>
          </Link>
          <button aria-label="Close navigation" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={() => setIsMenuOpen(false)} type="button"><X className="size-5" /></button>
        </div>

        <nav aria-label="Primary navigation" className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
          {roleNavigation.map((group) => {
            const isOpen = openGroups[group.label];
            return (
              <div className="mb-3" key={group.label}>
                <button
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                  onClick={() => setOpenGroups((current) => ({ ...current, [group.label]: !current[group.label] }))}
                  type="button"
                >
                  {group.label}<ChevronDown className={cn("size-3.5 transition-transform", !isOpen && "-rotate-90")} />
                </button>
                {isOpen ? (
                  <ul className="mt-1 space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                      return (
                        <li key={item.href}>
                          <Link
                            aria-current={isActive ? "page" : undefined}
                            className={cn(
                              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                              isActive ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
                            )}
                            href={item.href}
                            onClick={() => setIsMenuOpen(false)}
                          >
                            <Icon className={cn("size-4", isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
                            {item.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </nav>

        {role === "admin" || role === "super-admin" || role === "faculty" ? <div className="shrink-0 border-t border-slate-100 p-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-800">Aventra assistant</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">Get evidence-backed help without losing human control.</p>
            <Link className="mt-2 inline-flex text-xs font-semibold text-blue-700" href="/agents">Open assistant</Link>
          </div>
        </div> : null}
      </aside>

      {isMenuOpen ? <button aria-label="Close navigation overlay" className="fixed inset-0 z-30 bg-slate-950/25 lg:hidden" onClick={() => setIsMenuOpen(false)} type="button" /> : null}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <button aria-label="Open navigation" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setIsMenuOpen(true)} type="button"><Menu className="size-5" /></button>
          <div className="hidden min-w-0 items-center gap-2 text-sm md:flex">
            <Link className="text-slate-400 hover:text-slate-700" href={homeHref}>{role ? workspaceNames[role] : "Workspace"}</Link>
            <span className="text-slate-300">/</span>
            <span className="truncate font-medium text-slate-700">{activeItem?.label ?? "Campus operations"}</span>
          </div>
          <button
            className="mx-auto hidden w-full max-w-md items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm text-slate-400 transition hover:border-slate-300 hover:bg-white md:flex"
            onClick={() => setIsSearchOpen(true)}
            type="button"
          >
            <Search className="size-4" /><span className="flex-1">Search modules and workflows</span><kbd className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">⌘ K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <button aria-label="Search workspace" className="rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 md:hidden" onClick={() => setIsSearchOpen(true)} type="button"><Search className="size-5" /></button>
            <Link aria-label="Notifications" className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-100" href="/notifications"><Bell className="size-5" /><span className="absolute right-2 top-2 size-1.5 rounded-full bg-blue-600" /></Link>
            {clerkConfigured ? <UserButton showName userProfileMode="modal" /> : <Link className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100" href="/sign-in"><LogIn className="size-4" /><span className="hidden sm:inline">Connect account</span></Link>}
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>

      {isSearchOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/30 p-4 pt-[12vh] backdrop-blur-sm" role="presentation">
          <button aria-label="Close search" className="absolute inset-0" onClick={() => setIsSearchOpen(false)} type="button" />
          <div aria-label="Search campus workspace" aria-modal="true" className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" role="dialog">
            <div className="flex items-center gap-3 border-b border-slate-100 px-4">
              <Search className="size-5 text-slate-400" />
              <input
                className="h-14 min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter" && results[0]) openResult(results[0].href); }}
                placeholder="Find students, schedules, agents, reports…"
                ref={inputRef}
                type="search"
                value={query}
              />
              <button aria-label="Close search" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" onClick={() => setIsSearchOpen(false)} type="button"><X className="size-4" /></button>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {results.length ? results.map((item) => { const Icon = item.icon; return (
                <button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-slate-50" key={item.href} onClick={() => openResult(item.href)} type="button">
                  <span className="grid size-9 place-items-center rounded-lg bg-blue-50 text-blue-700"><Icon className="size-4" /></span>
                  <span className="flex-1 text-sm font-medium text-slate-800">{item.label}</span>
                  <Command className="size-3.5 text-slate-300" />
                </button>
              ); }) : <p className="px-4 py-10 text-center text-sm text-slate-500">No matching module found.</p>}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
