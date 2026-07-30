"use client";

import { ArrowRight, Bot, CalendarDays, CheckCircle2, GraduationCap, ShieldCheck, Sparkles, Wrench } from "lucide-react";
import Link from "next/link";
import type { HTMLAttributes } from "react";

import { AnimatedGradientText } from "@/components/effects/animated-gradient-text";
import { ShimmerLink } from "@/components/effects/shimmer-link";

const features = [
  { icon: GraduationCap, title: "Student success", text: "Bring attendance, performance, and interventions into one focused workspace." },
  { icon: CalendarDays, title: "Academic flow", text: "Coordinate schedules, courses, faculty, and room capacity without the busywork." },
  { icon: Wrench, title: "Campus readiness", text: "Move maintenance from reactive tickets to clear, accountable operations." },
];

type MotionProps = HTMLAttributes<HTMLDivElement> & {
  animate?: unknown;
  initial?: unknown;
  transition?: unknown;
  viewport?: unknown;
  whileInView?: unknown;
};

function MotionElement({
  animate: _animate,
  initial: _initial,
  transition: _transition,
  viewport: _viewport,
  whileInView: _whileInView,
  ...props
}: MotionProps) {
  void _animate;
  void _initial;
  void _transition;
  void _viewport;
  void _whileInView;

  return <div {...props} />;
}

const motion = {
  article: MotionElement,
  div: MotionElement,
  h1: MotionElement,
  p: MotionElement,
};

const ease = [0.22, 1, 0.36, 1] as const;

export function LandingPage() {
  return (
    <main className="overflow-hidden bg-[#fbfcff] text-slate-950">
      <header className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link className="flex items-center gap-3" href="/"><span className="grid size-10 place-items-center rounded-2xl bg-primary text-sm font-bold text-white shadow-lg shadow-blue-200">A</span><span className="text-base font-semibold tracking-tight">Aventra AI</span></Link>
        <nav aria-label="Marketing navigation" className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex"><a href="#platform">Platform</a><a href="#trust">Trust</a><a href="#launch">Get started</a></nav>
        <div className="flex items-center gap-3"><Link className="hidden px-3 py-2 text-sm font-semibold text-slate-600 sm:block" href="/dashboard">Open workspace</Link><a className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-200 transition hover:bg-slate-800" href="#launch">Build your campus OS</a></div>
      </header>
      <section className="relative mx-auto max-w-7xl px-5 pb-20 pt-14 sm:px-8 sm:pt-20 lg:pb-28">
        <div className="absolute left-1/2 top-0 -z-0 size-[42rem] -translate-x-1/2 rounded-full bg-blue-100/70 blur-3xl" />
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <motion.div animate={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 12 }} transition={{ duration: 0.5, ease }} className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm"><Sparkles className="size-3.5" />The intelligent campus operating system</motion.div>
          <motion.h1 animate={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 24 }} transition={{ delay: 0.08, duration: 0.5, ease }} className="mt-6 text-balance text-5xl font-semibold tracking-[-0.055em] text-slate-950 sm:text-6xl lg:text-7xl">Campus operations that feel <AnimatedGradientText>effortless.</AnimatedGradientText></motion.h1>
          <motion.p animate={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 18 }} transition={{ delay: 0.16, duration: 0.5, ease }} className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-7 text-slate-600 sm:text-lg">Aventra unifies academic delivery, facilities, and AI-guided operations so your team can act with clarity—not spreadsheets.</motion.p>
          <motion.div animate={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 18 }} transition={{ delay: 0.24, duration: 0.5, ease }} className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><ShimmerLink className="px-5 py-3 text-sm font-semibold" href="/dashboard">Explore the workspace <ArrowRight className="size-4" /></ShimmerLink><a className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50" href="#platform">See what it solves</a></motion.div>
          <p className="mt-4 text-xs text-slate-500">Built for administrators, faculty, facilities teams, and students.</p>
        </div>
        <motion.div animate={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 36 }} transition={{ delay: 0.28, duration: 0.6, ease }} className="relative z-10 mx-auto mt-14 max-w-6xl rounded-[2rem] border border-slate-200/80 bg-white p-3 shadow-[0_32px_90px_-30px_rgba(36,77,160,.32)] sm:p-5">
          <div className="overflow-hidden rounded-[1.35rem] border border-slate-100 bg-slate-50 p-4 sm:p-6"><div className="flex items-center justify-between"><div className="flex gap-2"><span className="size-2 rounded-full bg-rose-400" /><span className="size-2 rounded-full bg-amber-400" /><span className="size-2 rounded-full bg-emerald-400" /></div><span className="text-xs font-medium text-slate-400">Aventra workspace</span></div><div className="mt-6 grid gap-4 lg:grid-cols-[.85fr_1.5fr]"><div className="rounded-2xl bg-slate-950 p-5 text-white"><div className="flex size-9 items-center justify-center rounded-xl bg-white/10"><Bot className="size-4 text-blue-300" /></div><p className="mt-6 text-sm font-semibold">Aventra Copilot</p><p className="mt-2 text-sm leading-6 text-slate-300">“Three room conflicts need attention before tomorrow’s first period.”</p><div className="mt-6 rounded-xl bg-white/10 p-3 text-xs text-slate-300">Review recommendations <ArrowRight className="ml-1 inline size-3" /></div></div><div className="grid gap-4 sm:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Today’s readiness</p><p className="mt-2 text-3xl font-semibold tracking-tight">98%</p><div className="mt-5 h-2 rounded-full bg-slate-100"><div className="h-full w-[98%] rounded-full bg-emerald-500" /></div><p className="mt-3 text-xs font-medium text-emerald-600">Campus operations on track</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Review queue</p><p className="mt-2 text-3xl font-semibold tracking-tight">04</p><p className="mt-5 text-xs leading-5 text-slate-500">AI recommendations are ready for your approval.</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5 sm:col-span-2"><div className="flex items-center justify-between"><p className="text-sm font-semibold">Operational pulse</p><span className="text-xs font-medium text-blue-600">Live foundation</span></div><div className="mt-4 flex h-16 items-end gap-2">{[38, 54, 42, 76, 65, 88, 72, 94, 81, 100, 78, 91].map((height) => <span className="flex-1 rounded-t-sm bg-gradient-to-t from-blue-500 to-blue-300" key={height} style={{ height: `${height}%` }} />)}</div></div></div></div></div>
        </motion.div>
      </section>
      <section className="border-y border-slate-200 bg-white py-16" id="platform"><div className="mx-auto max-w-7xl px-5 sm:px-8"><div className="max-w-2xl"><p className="text-sm font-semibold text-primary">One connected campus</p><h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Less operational noise. More momentum.</h2></div><div className="mt-10 grid gap-4 md:grid-cols-3">{features.map(({ icon: Icon, text, title }, index) => <motion.article className="rounded-2xl border border-slate-200 bg-[#fbfcff] p-6 transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-100" initial={{ opacity: 0, y: 16 }} key={title} transition={{ delay: index * 0.06, duration: 0.5, ease }} viewport={{ once: true }} whileInView={{ opacity: 1, y: 0 }}><span className="grid size-11 place-items-center rounded-xl bg-blue-50 text-primary"><Icon className="size-5" /></span><h3 className="mt-6 text-lg font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></motion.article>)}</div></div></section>
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8" id="trust"><div className="grid items-center gap-10 rounded-[2rem] bg-blue-50 p-7 sm:p-10 lg:grid-cols-[1fr_.9fr] lg:p-14"><div><p className="text-sm font-semibold text-primary">Designed for trust</p><h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">AI that recommends. People who decide.</h2><p className="mt-5 max-w-xl text-sm leading-7 text-slate-600">Aventra is built around auditable agent runs, role-aware access, and review paths for important actions—so you get intelligence without losing control.</p><div className="mt-7 grid gap-3 text-sm font-semibold text-slate-700 sm:grid-cols-2"><span className="flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-600" />Reviewable decisions</span><span className="flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-600" />Role-ready security</span></div></div><div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm"><ShieldCheck className="size-7 text-primary" /><p className="mt-5 text-sm font-semibold">A secure foundation from day one</p><div className="mt-5 space-y-3">{["Row-level security baseline", "Typed database access", "Auditable agent records"].map((item) => <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-600" key={item}><CheckCircle2 className="size-4 text-emerald-600" />{item}</div>)}</div></div></div></section>
      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8" id="launch"><div className="rounded-[2rem] bg-slate-950 px-7 py-12 text-center text-white sm:px-12 sm:py-16"><p className="text-sm font-semibold text-blue-300">Your next operating model</p><h2 className="mx-auto mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">Build a campus that gets better every day.</h2><p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-slate-300">Start with the operations your campus needs today. Activate AI guidance when your data, policies, and teams are ready.</p><Link className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-blue-50" href="/dashboard">Open Aventra workspace <ArrowRight className="size-4" /></Link></div></section>
    </main>
  );
}
