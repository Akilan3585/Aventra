"use client";

import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import {
  Bell,
  ChevronDown,
  Command,
  LogIn,
  Menu,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { BrandLogo } from "@/components/brand/brand-logo";
import {
  findNavigationItem,
  homeForRole,
  moduleKeywords,
  navigationForRole,
} from "@/config/navigation";
import { cn } from "@/lib/utils";
import type { Role } from "@/server/auth/permissions";

type AppShellProps = { children: ReactNode; role: Role | null };

const subscribeNoop = () => () => undefined;

/**
 * False during server rendering and hydration, true afterwards. Clerk's
 * UserButton and OrganizationSwitcher render nothing on the server but can
 * render their host element on the client's first pass once Clerk has loaded,
 * which causes a hydration mismatch; they are mounted only after hydration.
 */
function useHydrated() {
  return useSyncExternalStore(subscribeNoop, () => true, () => false);
}

const workspaceNames: Record<Role, string> = {
  admin: "Faculty administration",
  faculty: "Faculty workspace",
  student: "Student workspace",
  "super-admin": "Faculty administration",
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
  const organizationsEnabled =
    process.env.NEXT_PUBLIC_CLERK_ORGANIZATIONS_ENABLED === "true";
  const hydrated = useHydrated();
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
    <div className="min-h-screen bg-background">
      <a className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-900 focus:shadow-md" href="#main-content">Skip to content</a>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200/80 bg-white transition-transform duration-200 lg:translate-x-0",
          isMenuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 px-4">
          <Link className="min-w-0 rounded-lg" href={homeHref} aria-label="Aventra AI workspace home">
            <BrandLogo className="w-[132px] [&_img]:size-8" eager />
            <span className="-mt-0.5 block truncate pl-10 text-[11px] font-medium leading-4 text-slate-500">{role ? workspaceNames[role] : "Smart Campus OS"}</span>
          </Link>
          <button aria-label="Close navigation" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={() => setIsMenuOpen(false)} type="button"><X className="size-5" /></button>
        </div>

        <nav aria-label="Primary navigation" className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
          {roleNavigation.map((group) => {
            const isOpen = openGroups[group.label];
            return (
              <div className="mb-4" key={group.label}>
                <button
                  aria-expanded={isOpen}
                  className="group/label flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-slate-700"
                  onClick={() => setOpenGroups((current) => ({ ...current, [group.label]: !current[group.label] }))}
                  type="button"
                >
                  {group.label}<ChevronDown className={cn("size-3.5 opacity-0 transition group-hover/label:opacity-100 group-focus-visible/label:opacity-100", !isOpen && "-rotate-90 opacity-100")} />
                </button>
                {isOpen ? (
                  <ul className="mt-0.5 space-y-px">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                      return (
                        <li key={item.href}>
                          <Link
                            aria-current={isActive ? "page" : undefined}
                            className={cn(
                              "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                              isActive ? "bg-slate-100 font-semibold text-slate-950" : "font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-950",
                            )}
                            href={item.href}
                            onClick={() => setIsMenuOpen(false)}
                          >
                            {isActive ? <span aria-hidden className="absolute inset-y-2 -left-3 w-0.5 rounded-r-full bg-blue-600" /> : null}
                            <Icon className={cn("size-4 shrink-0", isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
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

        {role === "admin" || role === "super-admin" || role === "faculty" ? <div className="shrink-0 border-t border-slate-200/80 p-3">
          <Link className="group flex items-start gap-3 rounded-lg p-2.5 transition-colors hover:bg-slate-50" href="/agents">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-900 text-white"><Sparkles className="size-4" /></span>
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold text-slate-900">Aventra assistant</span>
              <span className="mt-0.5 block text-xs leading-[1.1rem] text-slate-500">Evidence-backed help, with decisions kept in human hands.</span>
            </span>
          </Link>
        </div> : null}
      </aside>

      {isMenuOpen ? <button aria-label="Close navigation overlay" className="fixed inset-0 z-30 bg-slate-950/25 lg:hidden" onClick={() => setIsMenuOpen(false)} type="button" /> : null}

      <div className="min-w-0 overflow-x-clip lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <button aria-label="Open navigation" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setIsMenuOpen(true)} type="button"><Menu className="size-5" /></button>
          <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-2 text-sm md:flex">
            <Link className="text-slate-400 transition-colors hover:text-slate-700" href={homeHref}>{role ? workspaceNames[role] : "Workspace"}</Link>
            <span aria-hidden className="text-slate-300">/</span>
            <span aria-current="page" className="truncate font-medium text-slate-800">{activeItem?.label ?? "Faculty operations"}</span>
          </nav>
          <button
            className="mx-auto hidden w-full max-w-sm items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-left text-sm text-slate-400 transition hover:border-slate-300 hover:bg-white md:flex"
            onClick={() => setIsSearchOpen(true)}
            type="button"
          >
            <Search className="size-4" /><span className="flex-1">Search modules and workflows</span><kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-sans text-[10px] font-medium text-slate-400">⌘ K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <button aria-label="Search workspace" className="rounded-lg p-2.5 text-slate-500 hover:bg-slate-100 md:hidden" onClick={() => setIsSearchOpen(true)} type="button"><Search className="size-5" /></button>
            {role === "student" ? <Link aria-label="Notifications" className="relative rounded-lg p-2.5 text-slate-500 hover:bg-slate-100" href="/notifications"><Bell className="size-5" /><span className="absolute right-2 top-2 size-1.5 rounded-full bg-blue-600" /></Link> : null}
            {clerkConfigured && organizationsEnabled ? <div className="hidden lg:block">{hydrated ? <OrganizationSwitcher /> : <span aria-hidden className="block h-8 w-40 rounded-lg bg-slate-100" />}</div> : null}
            {clerkConfigured ? (hydrated ? <UserButton showName userProfileMode="modal" /> : <span aria-hidden className="flex items-center gap-2"><span className="hidden h-4 w-16 rounded bg-slate-100 sm:block" /><span className="size-7 rounded-full bg-slate-100" /></span>) : <Link className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100" href="/sign-in"><LogIn className="size-4" /><span className="hidden sm:inline">Connect account</span></Link>}
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1440px] px-4 pb-12 pt-6 sm:px-6 lg:px-10 lg:pb-16 lg:pt-9" id="main-content">{children}</main>
      </div>

      {isSearchOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/30 p-4 pt-[12vh] backdrop-blur-sm" role="presentation">
          <button aria-label="Close search" className="absolute inset-0" onClick={() => setIsSearchOpen(false)} type="button" />
          <div aria-label="Search faculty workspace" aria-modal="true" className="relative z-10 w-full max-w-xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_24px_60px_-20px_rgba(15,23,42,0.35)]" role="dialog">
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
                <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-slate-50" key={item.href} onClick={() => openResult(item.href)} type="button">
                  <span className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500"><Icon className="size-4" /></span>
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
