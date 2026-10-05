import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

const spring = "duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]";

/**
 * Double-bezel tile: a hairline tray with a machined inner core. `delay`
 * staggers the shared `reveal-entry` fade-up so the bento assembles in order.
 */
export function Bezel({ children, className, coreClassName, delay = 0 }: { children: ReactNode; className?: string; coreClassName?: string; delay?: number }) {
  return (
    <div
      className={cn("reveal-entry rounded-[1.75rem] bg-slate-900/[0.035] p-1.5 ring-1 ring-slate-900/[0.05]", className)}
      style={{ "--reveal-delay": `${delay}s`, "--reveal-distance": "22px" } as CSSProperties}
    >
      <div className={cn("relative h-full overflow-hidden rounded-[calc(1.75rem-0.375rem)] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(15,23,42,0.04),0_22px_44px_-28px_rgba(30,41,82,0.3)]", coreClassName)}>
        {children}
      </div>
    </div>
  );
}

export function Eyebrow({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em]", dark ? "bg-white/[0.07] text-white/70 ring-1 ring-inset ring-white/10" : "bg-slate-900/[0.04] text-slate-500 ring-1 ring-inset ring-slate-900/[0.06]")}>
      {children}
    </span>
  );
}

/** Pill CTA with the arrow nested in its own island, which drifts on hover. */
export function PillLink({ children, href, variant = "solid" }: { children: ReactNode; href: string; variant?: "ghost" | "ink" | "solid" }) {
  const shell = {
    ghost: "bg-white/[0.07] text-white ring-1 ring-inset ring-white/15 hover:bg-white/[0.12]",
    ink: "bg-slate-950 text-white hover:bg-slate-800",
    solid: "bg-white text-slate-950 shadow-[0_10px_30px_-12px_rgba(120,150,255,0.6)] hover:bg-blue-50",
  }[variant];
  const island = { ghost: "bg-white/10 text-white", ink: "bg-white/15 text-white", solid: "bg-slate-950 text-white" }[variant];

  return (
    <Link className={cn("group inline-flex items-center gap-3 rounded-full py-1.5 pl-5 pr-1.5 text-sm font-semibold transition-[transform,background-color] active:scale-[0.98]", spring, shell)} href={href}>
      {children}
      <span className={cn("grid size-8 place-items-center rounded-full transition-transform group-hover:-translate-y-px group-hover:translate-x-0.5 group-hover:scale-105", spring, island)}>
        <ArrowUpRight aria-hidden className="size-4" strokeWidth={1.75} />
      </span>
    </Link>
  );
}

/** Small round arrow used at the end of list rows; nudges on row hover. */
export function RowArrow() {
  return (
    <span className={cn("grid size-8 shrink-0 place-items-center rounded-full bg-slate-900/[0.04] text-slate-400 transition-[transform,background-color,color] group-hover:-translate-y-px group-hover:translate-x-0.5 group-hover:bg-slate-950 group-hover:text-white", spring)}>
      <ArrowUpRight aria-hidden className="size-4" strokeWidth={1.75} />
    </span>
  );
}

const RADIUS = 76;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Ring gauge for attendance, with a tick marking the policy floor. */
export function AttendanceGauge({ healthy, target, value }: { healthy: boolean; target: number; value: number | null }) {
  const length = value === null ? 0 : (Math.min(100, Math.max(0, value)) / 100) * CIRCUMFERENCE;
  const targetAngle = (target / 100) * 2 * Math.PI;
  const tick = { x: 88 + RADIUS * Math.cos(targetAngle), y: 88 + RADIUS * Math.sin(targetAngle) };

  return (
    <div className="relative size-44 shrink-0">
      <svg aria-hidden className="size-full -rotate-90" viewBox="0 0 176 176">
        <defs>
          <linearGradient id="gauge-healthy" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stopColor="oklch(0.7 0.12 258)" /><stop offset="100%" stopColor="oklch(0.455 0.15 263)" /></linearGradient>
          <linearGradient id="gauge-warning" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stopColor="#fbbf24" /><stop offset="100%" stopColor="#ea580c" /></linearGradient>
        </defs>
        <circle cx="88" cy="88" fill="none" r={RADIUS} stroke="rgb(15 23 42 / 0.06)" strokeWidth="12" />
        {length ? <circle className="gauge-arc" cx="88" cy="88" fill="none" r={RADIUS} stroke={`url(#${healthy ? "gauge-healthy" : "gauge-warning"})`} strokeDasharray={`${length} ${CIRCUMFERENCE}`} strokeLinecap="round" strokeWidth="12" style={{ "--gauge-length": length } as CSSProperties} /> : null}
        <circle cx={tick.x} cy={tick.y} fill="white" r="5" stroke="rgb(15 23 42 / 0.55)" strokeWidth="2" />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-[2.6rem] font-semibold leading-none tracking-[-0.05em] text-slate-950 tabular-nums">{value === null ? "—" : value}<span className="text-lg font-medium text-slate-400">{value === null ? "" : "%"}</span></p>
          <p className="mt-1.5 text-[11px] font-medium text-slate-400">attendance</p>
        </div>
      </div>
    </div>
  );
}
