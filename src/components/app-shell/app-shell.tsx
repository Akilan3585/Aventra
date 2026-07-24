import Link from "next/link";
import type { ReactNode } from "react";

import { navigationItems } from "@/config/navigation";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <Link className="font-semibold tracking-tight" href="/dashboard">
            Aventra AI
          </Link>
          <span className="text-xs text-muted-foreground">
            Smart Campus Operations
          </span>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Primary navigation" className="hidden lg:block">
          <ul className="space-y-1">
            {navigationItems.map((item) => (
              <li key={item.href}>
                <Link
                  className="block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  href={item.href}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <main>{children}</main>
      </div>
    </div>
  );
}
