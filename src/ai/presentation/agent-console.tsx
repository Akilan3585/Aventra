"use client";

import { useActionState } from "react";
import { Bot, Play } from "lucide-react";

import { runAgentAction, type AgentActionState } from "@/ai/application/agent-actions";
import { cn } from "@/lib/utils";

export function AgentConsole({ canExecute }: { canExecute: boolean }) {
  const initialAgentState: AgentActionState = { message: "", status: "idle" };
  const [state, action, pending] = useActionState(runAgentAction, initialAgentState);
  if (!canExecute) return null;
  return <form action={action} className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 sm:p-6"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary text-white"><Bot className="size-5" /></span><div><h2 className="font-semibold text-slate-950">Run a governed agent</h2><p className="text-xs text-slate-500">Source data only · persisted evidence · human-controlled actions</p></div></div><div className="mt-5 grid gap-4 md:grid-cols-[.7fr_1.3fr_auto]"><select className="rounded-xl border border-white bg-white px-3.5 py-2.5 text-sm shadow-sm" name="agentName"><option value="coordinator">Coordinator</option><option value="student-success">Student Success</option><option value="classroom">Classroom</option><option value="maintenance">Maintenance</option></select><input className="rounded-xl border border-white bg-white px-3.5 py-2.5 text-sm shadow-sm" maxLength={500} name="focus" placeholder="Optional focus, e.g. tomorrow morning sessions" /><button className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50" disabled={pending} type="submit"><Play className="size-4" />{pending ? "Running…" : "Run agent"}</button></div>{state.message ? <p aria-live="polite" className={cn("mt-4 rounded-xl px-4 py-3 text-sm", state.status === "success" ? "bg-white text-emerald-700" : "bg-rose-50 text-rose-700")}>{state.message}</p> : null}</form>;
}
