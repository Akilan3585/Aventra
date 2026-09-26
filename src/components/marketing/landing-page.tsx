"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BellRing,
  BookOpen,
  Bot,
  Building2,
  CalendarCheck2,
  Check,
  ChevronRight,
  CircleCheck,
  Clock3,
  GraduationCap,
  LockKeyhole,
  Menu,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";

import { BrandLogo } from "@/components/brand/brand-logo";
import { BlurWords, Reveal } from "@/components/effects/motion-reveal";
import { ShimmerLink } from "@/components/effects/shimmer-link";
import { workspaceRoutes } from "@/config/workspace-routes";

const ease = [0.22, 1, 0.36, 1] as const;

const operationBars = [42, 58, 48, 72, 61, 84, 67, 93, 76, 88, 71, 96];

const agentEvents = [
  { label: "Attendance risk detected", meta: "Student success agent · 1m", color: "bg-violet-500" },
  { label: "Room B-204 reassigned", meta: "Scheduling agent · 4m", color: "bg-blue-500" },
  { label: "Quiz results published", meta: "Classroom agent · 8m", color: "bg-amber-500" },
];

const capabilities = [
  {
    icon: GraduationCap,
    href: workspaceRoutes.student.signIn,
    eyebrow: "Academic intelligence",
    title: "Keep every learner in view.",
    copy: "Attendance, performance, and interventions become one clear student-success workflow.",
    className: "md:col-span-2",
  },
  {
    icon: CalendarCheck2,
    eyebrow: "Smart scheduling",
    title: "A timetable that adapts.",
    copy: "Resolve faculty, course, and room constraints before they turn into disruption.",
    className: "",
  },
  {
    icon: BookOpen,
    eyebrow: "Study materials",
    title: "Every class, one folder.",
    copy: "Share notes, documents, and quizzes with each class from a governed library.",
    className: "",
  },
  {
    icon: Bot,
    eyebrow: "Agent control centre",
    title: "AI that works across teams.",
    copy: "Specialised agents coordinate work, explain recommendations, and wait for approval when it matters.",
    className: "md:col-span-2",
  },
];

const workspaceJourneys = [
  {
    accent: "from-violet-500 to-indigo-500",
    eyebrow: "For students",
    title: "A clear day, from class to result.",
    copy: "See today’s timetable, attendance health, courses, and campus updates without digging through an ERP.",
    icon: GraduationCap,
    href: workspaceRoutes.student.signIn,
    stat: "One personal workspace",
    badge: "Student workspace",
  },
  {
    accent: "from-emerald-500 to-teal-500",
    eyebrow: "For faculty",
    title: "Turn operations into momentum.",
    copy: "Coordinate classes, schedules, student success, and approvals with one shared operational view.",
    icon: Building2,
    href: workspaceRoutes.faculty.signIn,
    stat: "Connected decisions",
    badge: "Faculty workspace",
  },
];

const outcomeMetrics = [
  { label: "Focused workspaces", value: "02", detail: "Students and faculty" },
  { label: "Connected service areas", value: "06", detail: "Academic and operational flows" },
  { label: "Human approval", value: "100%", detail: "For sensitive AI actions" },
];

function Brand({ eager = false }: { eager?: boolean }) {
  return (
    <Link className="group block shrink-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600" href="/" aria-label="Aventra AI home">
      <BrandLogo className="w-[126px] transition duration-200 group-hover:opacity-90 sm:w-[142px]" eager={eager} />
    </Link>
  );
}

function ProductPreview() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
      className="relative mx-auto w-full max-w-[620px] lg:mr-0"
      transition={{ duration: 8, ease: "easeInOut", repeat: Infinity }}
    >
      <div className="absolute -inset-10 -z-10 rounded-full bg-blue-200/35 blur-3xl" />
      <div className="surface-glow overflow-hidden rounded-[26px] border border-white/90 bg-white/90 p-2 shadow-[0_40px_100px_-38px_rgba(37,73,140,.45)] backdrop-blur-xl">
        <div className="overflow-hidden rounded-[20px] border border-slate-200/80 bg-[#f7f9fc]">
          <div className="flex h-11 items-center justify-between border-b border-slate-200/80 bg-white/80 px-4">
            <div className="flex gap-1.5" aria-hidden="true">
              <span className="size-2 rounded-full bg-rose-300" />
              <span className="size-2 rounded-full bg-amber-300" />
              <span className="size-2 rounded-full bg-emerald-300" />
            </div>
            <span className="text-[10px] font-medium tracking-wide text-slate-400">CAMPUS COMMAND</span>
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600">
              <span className="live-dot size-1.5 rounded-full bg-emerald-500" /> Live
            </span>
          </div>

          <div className="grid gap-3 p-3 sm:grid-cols-[1.1fr_.9fr] sm:p-4">
            <div className="rounded-2xl bg-slate-950 p-4 text-white sm:p-5">
              <div className="flex items-start justify-between">
                <span className="grid size-9 place-items-center rounded-xl bg-blue-500/15 text-blue-300"><Bot className="size-4" /></span>
                <span className="rounded-full border border-white/10 px-2 py-1 text-[9px] font-semibold text-slate-400">6 AGENTS ACTIVE</span>
              </div>
              <p className="mt-8 text-[10px] font-medium uppercase tracking-[0.18em] text-blue-300">Morning brief</p>
              <p className="mt-2 text-sm font-medium leading-6 text-white sm:text-[15px]">Three actions can improve today&apos;s academic outcomes.</p>
              <button className="mt-5 flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[.07] px-3 py-2.5 text-left text-[11px] text-slate-300 transition hover:bg-white/[.12]" type="button">
                Review recommendations <ChevronRight className="size-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-1">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
                <div className="flex items-center justify-between text-[10px] font-medium text-slate-500"><span>Readiness</span><CircleCheck className="size-3.5 text-emerald-500" /></div>
                <div className="mt-2 flex items-end justify-between"><span className="text-2xl font-semibold tracking-[-0.05em] text-slate-950">94%</span><span className="text-[9px] font-semibold text-emerald-600">+6.2%</span></div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="progress-reveal h-full w-[94%] origin-left rounded-full bg-gradient-to-r from-blue-500 to-emerald-400" /></div>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
                <div className="flex items-center justify-between text-[10px] font-medium text-slate-500"><span>Review queue</span><BellRing className="size-3.5 text-blue-500" /></div>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-slate-950">04</p>
                <p className="mt-1 text-[9px] leading-4 text-slate-400">2 scheduling · 2 attendance</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:col-span-2">
              <div className="flex items-center justify-between">
                <div><p className="text-[11px] font-semibold text-slate-800">Operational pulse</p><p className="mt-0.5 text-[9px] text-slate-400">Activity across the last 12 hours</p></div>
                <span className="rounded-full bg-blue-50 px-2 py-1 text-[9px] font-semibold text-blue-600">Healthy</span>
              </div>
              <div className="mt-4 flex h-14 items-end gap-1.5">
                {operationBars.map((height, index) => (
                  <span
                    className="flex-1 rounded-t-[3px] bg-gradient-to-t from-blue-600 to-blue-300"
                    key={`${height}-${index}`}
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <motion.div
        animate={reduceMotion ? undefined : { y: [0, 5, 0], rotate: [0, 1, 0] }}
        className="absolute -bottom-8 -left-5 hidden w-52 rounded-2xl border border-white bg-white/95 p-3.5 shadow-[0_20px_60px_-24px_rgba(15,23,42,.4)] backdrop-blur md:block"
        transition={{ duration: 6, ease: "easeInOut", repeat: Infinity, delay: 0.7 }}
      >
        <div className="flex items-center gap-2"><span className="grid size-7 place-items-center rounded-lg bg-emerald-50"><Check className="size-3.5 text-emerald-600" /></span><div><p className="text-[10px] font-semibold text-slate-800">Conflict resolved</p><p className="text-[9px] text-slate-400">Room B-204 · just now</p></div></div>
      </motion.div>
    </motion.div>
  );
}

export function LandingPage() {
  return (
    <main className="overflow-hidden bg-[#fbfcfe] text-slate-950">
      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between rounded-2xl border border-white/80 bg-white/80 px-4 shadow-[0_8px_40px_-24px_rgba(15,23,42,.28)] backdrop-blur-xl sm:px-5">
          <Brand eager />
          <nav aria-label="Marketing navigation" className="hidden items-center gap-1 rounded-full bg-slate-50 p-1 text-[13px] font-medium text-slate-600 md:flex">
            <a className="rounded-full px-4 py-2 transition hover:bg-white hover:text-slate-950 hover:shadow-sm" href="#workspaces">Workspaces</a>
            <a className="rounded-full px-4 py-2 transition hover:bg-white hover:text-slate-950 hover:shadow-sm" href="#platform">Platform</a>
            <a className="rounded-full px-4 py-2 transition hover:bg-white hover:text-slate-950 hover:shadow-sm" href="#agents">AI coordination</a>
            <a className="rounded-full px-4 py-2 transition hover:bg-white hover:text-slate-950 hover:shadow-sm" href="#trust">Trust</a>
          </nav>
          <div className="hidden items-center gap-2 sm:flex">
            <Link className="rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-950" href="#workspaces">Choose portal</Link>
            <Link className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-200 transition hover:-translate-y-0.5 hover:bg-slate-800" href="/sign-up">Open workspace <ArrowRight className="size-3.5" /></Link>
          </div>
          <details className="group relative sm:hidden">
            <summary aria-label="Toggle navigation" className="grid size-10 cursor-pointer list-none place-items-center rounded-xl border border-slate-200 text-slate-700 [&::-webkit-details-marker]:hidden">
              <Menu className="size-4 group-open:hidden" />
              <X className="hidden size-4 group-open:block" />
            </summary>
            <nav aria-label="Mobile navigation" className="absolute right-0 top-12 grid w-[min(18rem,calc(100vw-2rem))] gap-1 rounded-2xl border border-slate-200 bg-white p-2 text-sm font-medium text-slate-700 shadow-xl">
              <a className="rounded-xl px-4 py-3 hover:bg-slate-50" href="#workspaces">Workspaces</a>
              <a className="rounded-xl px-4 py-3 hover:bg-slate-50" href="#platform">Platform</a>
              <a className="rounded-xl px-4 py-3 hover:bg-slate-50" href="#agents">AI coordination</a>
              <Link className="rounded-xl px-4 py-3 hover:bg-slate-50" href="#workspaces">Choose portal</Link>
              <Link className="rounded-xl bg-slate-950 px-4 py-3 text-center text-white" href="/sign-up">Open workspace</Link>
            </nav>
          </details>
        </div>
      </header>

      <section className="hero-grid relative px-5 pb-24 pt-36 sm:px-8 sm:pt-44 lg:pb-32">
        <div className="aurora-orb absolute left-[8%] top-24 size-80 rounded-full bg-blue-300/25 blur-3xl" />
        <div className="aurora-orb absolute right-[5%] top-40 size-72 rounded-full bg-violet-200/30 blur-3xl [animation-delay:-3s]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-[.92fr_1.08fr] lg:gap-12">
          <div className="max-w-2xl">
            <Reveal distance={12}>
              <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/90 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm backdrop-blur">
                <Sparkles className="size-3.5" /> Built for the people who run a modern campus
              </span>
            </Reveal>
            <h1 className="mt-7 text-balance text-[3.35rem] font-semibold leading-[.98] tracking-[-0.065em] text-slate-950 sm:text-6xl lg:text-[4.65rem]">
              <BlurWords text="Unified campus management," />
              {" "}<span className="mt-1 block"><BlurWords className="animated-gradient-text" text="made human." /></span>
            </h1>
            <Reveal delay={0.24}>
              <p className="mt-7 max-w-xl text-pretty text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">Aventra gives every student, educator, and campus team a focused place to get work done—while intelligent coordination keeps the whole campus moving forward.</p>
            </Reveal>
            <Reveal className="mt-8 flex flex-col gap-3 sm:flex-row" delay={0.31}>
              <ShimmerLink className="px-5 py-3 text-sm font-semibold" href="/sign-up">Start your campus <ArrowRight className="size-4" /></ShimmerLink>
              <Link className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md" href="#workspaces">Choose your portal</Link>
            </Reveal>
            <Reveal className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-slate-500" delay={0.38}>
              {['Simple for every role', 'Human approval built in', 'One connected data layer'].map((item) => <span className="flex items-center gap-1.5" key={item}><Check className="size-3.5 text-emerald-600" />{item}</span>)}
            </Reveal>
          </div>
          <Reveal delay={0.18} distance={28}><ProductPreview /></Reveal>
        </div>
      </section>

      <section className="border-y border-slate-200/70 bg-white/80 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-5 sm:px-8 lg:flex-row">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 lg:text-left">One workspace for every campus team</p>
          <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-4 text-xs font-semibold text-slate-500 sm:gap-x-10">
            <span className="flex items-center gap-2"><UsersRound className="size-4 text-blue-500" />Student services</span>
            <span className="flex items-center gap-2"><GraduationCap className="size-4 text-violet-500" />Faculty</span>
            <span className="flex items-center gap-2"><BookOpen className="size-4 text-emerald-500" />Academics</span>
            <span className="flex items-center gap-2"><BarChart3 className="size-4 text-amber-500" />Leadership</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28" id="workspaces">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold text-indigo-600">One product. Two clear experiences.</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-5xl">Every person gets a workspace that feels made for them.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600">The same trusted campus data, presented in the right level of detail for the work each person needs to do.</p>
        </Reveal>
        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          {workspaceJourneys.map(({ accent, badge, copy, eyebrow, href, icon: Icon, stat, title }, index) => (
            <Reveal delay={index * 0.08} key={eyebrow}>
              <Link className="block h-full" href={href}>
              <motion.article className="group relative h-full overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_22px_70px_-50px_rgba(15,23,42,.6)] sm:p-7" transition={{ duration: 0.25, ease }} whileHover={{ y: -6 }}>
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`} />
                <div className="flex items-start justify-between gap-4">
                  <span className={`grid size-12 place-items-center rounded-2xl bg-gradient-to-br ${accent} text-white shadow-lg`}><Icon className="size-5" /></span>
                  <span className="rounded-full border border-slate-100 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-500">{badge}</span>
                </div>
                <p className="mt-8 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{eyebrow}</p>
                <h3 className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-slate-950">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{copy}</p>
                <div className="mt-7 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-semibold text-slate-600"><span>{stat}</span><span className="flex items-center gap-1.5">Sign in <ArrowUpRight className="size-4 text-slate-400 transition group-hover:text-slate-950" /></span></div>
              </motion.article>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 lg:pb-28">
        <Reveal>
          <div className="grid overflow-hidden rounded-[28px] border border-slate-200 bg-slate-950 text-white md:grid-cols-3">
            {outcomeMetrics.map(({ detail, label, value }, index) => (
              <div className={`relative px-7 py-7 sm:px-9 ${index < outcomeMetrics.length - 1 ? "border-b border-white/10 md:border-b-0 md:border-r" : ""}`} key={label}>
                <div className="absolute right-0 top-0 size-32 rounded-full bg-blue-500/10 blur-3xl" />
                <p className="relative text-4xl font-semibold tracking-[-0.06em] text-white">{value}</p>
                <p className="relative mt-2 text-sm font-semibold text-blue-200">{label}</p>
                <p className="relative mt-1 text-xs text-slate-400">{detail}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-32" id="platform">
        <Reveal className="max-w-2xl">
          <p className="text-sm font-semibold text-blue-600">The campus, clearly organised</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-5xl">Everything your campus needs. None of the ERP friction.</h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">One connected platform turns fragmented campus activity into timely, accountable work—without making everyday users learn a complex system.</p>
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {capabilities.map(({ className, copy, eyebrow, icon: Icon, title }, index) => (
            <Reveal className={className} delay={index * 0.045} key={title}>
              <motion.article className="group relative h-full min-h-72 overflow-hidden rounded-[26px] border border-slate-200/80 bg-white p-6 shadow-[0_16px_60px_-42px_rgba(15,23,42,.45)] transition-colors hover:border-blue-200 sm:p-7" whileHover={{ y: -5 }} transition={{ duration: 0.28, ease }}>
                <div className="absolute -right-10 -top-10 size-36 rounded-full bg-blue-100/0 blur-3xl transition group-hover:bg-blue-100/80" />
                <span className="relative grid size-11 place-items-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600"><Icon className="size-5" /></span>
                <div className="relative mt-16">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{eyebrow}</p>
                  <h3 className="mt-3 text-xl font-semibold tracking-[-0.025em] text-slate-950">{title}</h3>
                  <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">{copy}</p>
                </div>
                {className ? <div className="absolute bottom-7 right-7 hidden items-end gap-1.5 md:flex">{[34, 52, 43, 67, 58, 82].map((height, barIndex) => <span className="w-2 rounded-full bg-blue-100 transition-colors group-hover:bg-blue-400" key={barIndex} style={{ height }} />)}</div> : null}
              </motion.article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="relative border-y border-slate-200/70 bg-slate-950 py-24 text-white lg:py-32" id="agents">
        <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(rgba(148,163,184,.4)_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="relative mx-auto grid max-w-7xl gap-14 px-5 sm:px-8 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-blue-300"><Zap className="size-4" /> Multi-agent coordination</span>
            <h2 className="mt-4 max-w-xl text-balance text-3xl font-semibold tracking-[-0.045em] sm:text-5xl">Specialists that collaborate. People who stay in control.</h2>
            <p className="mt-6 max-w-lg text-base leading-7 text-slate-300">Aventra routes each request to the right campus agent, combines the evidence, and presents a reviewable recommendation before sensitive actions move forward.</p>
            <div className="mt-8 space-y-4">
              {[['1', 'Understand', 'Classify intent, role, and campus context.'], ['2', 'Coordinate', 'Call the right academic or operational tools.'], ['3', 'Review', 'Explain the outcome and request approval.']].map(([number, title, copy]) => (
                <div className="flex gap-4" key={number}><span className="grid size-8 shrink-0 place-items-center rounded-full border border-white/15 bg-white/[.06] text-xs font-semibold text-blue-300">{number}</span><div><p className="text-sm font-semibold text-white">{title}</p><p className="mt-1 text-sm text-slate-400">{copy}</p></div></div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.12}>
            <div className="relative rounded-[28px] border border-white/10 bg-white/[.06] p-3 shadow-2xl backdrop-blur">
              <div className="rounded-[21px] border border-white/10 bg-[#111b2e] p-5 sm:p-6">
                <div className="flex items-center justify-between"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-blue-500/15 text-blue-300"><Bot className="size-4" /></span><div><p className="text-sm font-semibold">Agent activity</p><p className="text-[10px] text-slate-500">Live campus orchestration</p></div></div><span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-300">6 online</span></div>
                <div className="mt-6 space-y-2.5">
                  {agentEvents.map((event) => (
                    <motion.div className="flex items-center gap-3 rounded-2xl border border-white/[.07] bg-white/[.04] p-3.5" key={event.label} whileHover={{ x: 3 }} transition={{ duration: 0.2, ease }}>
                      <span className={`size-2 rounded-full ${event.color}`} />
                      <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-slate-200">{event.label}</p><p className="mt-1 text-[10px] text-slate-500">{event.meta}</p></div>
                      <ChevronRight className="size-3.5 text-slate-600" />
                    </motion.div>
                  ))}
                </div>
                <div className="mt-5 rounded-2xl border border-blue-400/20 bg-blue-500/[.08] p-4"><div className="flex gap-3"><MessageSquareText className="mt-0.5 size-4 shrink-0 text-blue-300" /><div><p className="text-xs font-semibold text-blue-100">Recommendation ready</p><p className="mt-1 text-[11px] leading-5 text-slate-400">Move Data Structures to C-108 and notify 42 students?</p><div className="mt-3 flex gap-2"><button className="rounded-lg bg-blue-500 px-3 py-1.5 text-[10px] font-semibold text-white transition hover:bg-blue-400" type="button">Approve</button><button className="rounded-lg border border-white/10 px-3 py-1.5 text-[10px] font-semibold text-slate-300 transition hover:bg-white/5" type="button">Review evidence</button></div></div></div></div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-32" id="trust">
        <div className="grid gap-10 rounded-[32px] border border-blue-100 bg-[linear-gradient(135deg,#f5f9ff_0%,#fff_55%,#f7f5ff_100%)] p-7 sm:p-10 lg:grid-cols-[1fr_.86fr] lg:items-center lg:p-14">
          <Reveal>
            <p className="text-sm font-semibold text-blue-600">Designed for institutional trust</p>
            <h2 className="mt-3 max-w-2xl text-balance text-3xl font-semibold tracking-[-0.045em] sm:text-5xl">Intelligence with a clear chain of responsibility.</h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">Every recommendation is role-aware, reviewable, and connected to an audit trail—so teams move faster without losing governance.</p>
            <div className="mt-8 grid gap-3 text-sm font-semibold text-slate-700 sm:grid-cols-2">
              {['Human-in-the-loop actions', 'Role-based permissions', 'Auditable agent runs', 'Protected campus data'].map((item) => <span className="flex items-center gap-2" key={item}><CircleCheck className="size-4 text-emerald-600" />{item}</span>)}
            </div>
          </Reveal>
          <Reveal delay={0.12}>
            <div className="rounded-[24px] border border-white bg-white/85 p-5 shadow-[0_24px_70px_-42px_rgba(37,73,140,.45)] backdrop-blur sm:p-6">
              <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-blue-50 text-blue-600"><ShieldCheck className="size-5" /></span><div><p className="text-sm font-semibold text-slate-900">Policy-aware by design</p><p className="mt-0.5 text-xs text-slate-500">Control remains visible at every step</p></div></div>
              <div className="mt-6 space-y-3">
                {[{ icon: LockKeyhole, label: 'Identity verified', meta: 'Clerk role and session context' }, { icon: Bot, label: 'Agent run recorded', meta: 'Inputs, tools, and output trace' }, { icon: Clock3, label: 'Approval retained', meta: 'Reviewer and timestamp captured' }].map(({ icon: Icon, label, meta }) => <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5" key={label}><Icon className="size-4 text-blue-500" /><div><p className="text-xs font-semibold text-slate-800">{label}</p><p className="mt-0.5 text-[10px] text-slate-400">{meta}</p></div><Check className="ml-auto size-3.5 text-emerald-600" /></div>)}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-[32px] bg-slate-950 px-7 py-14 text-center text-white sm:px-12 sm:py-20">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,.35),transparent_45%)]" />
            <div className="relative">
              <p className="text-sm font-semibold text-blue-300">One campus. One operational rhythm.</p>
              <h2 className="mx-auto mt-4 max-w-3xl text-balance text-3xl font-semibold tracking-[-0.045em] sm:text-5xl">Give every team a clearer way to move forward.</h2>
              <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-slate-300">Create your workspace and connect the campus services you are ready to coordinate today.</p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-blue-50" href="/sign-up">Open your workspace <ArrowRight className="size-4" /></Link><Link className="inline-flex items-center justify-center rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10" href="/sign-in">Sign in</Link></div>
            </div>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-slate-200/70 bg-white py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 text-xs text-slate-500 sm:flex-row sm:px-8"><Brand /><p>Academic operations, intelligently coordinated.</p><p>© 2026 Aventra AI</p></div>
      </footer>
    </main>
  );
}
