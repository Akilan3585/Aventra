"use client";

import { Bot, ClipboardCopy, Loader2, Send, Sparkles, User } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { askFacultyAssistantAction, runAssistantUseCaseAction } from "@/ai/application/faculty-assistant-actions";
import {
  assistantUseCases,
  type AssistantChatMessage,
  type AssistantReport,
  type AssistantUseCaseId,
} from "@/ai/contracts/assistant-report";
import { Card } from "@/design-system/primitives/card";
import { cn } from "@/lib/utils";

type Entry =
  | { id: number; kind: "user"; text: string }
  | { id: number; kind: "answer"; model: string | null; text: string; tools: string[] }
  | { id: number; kind: "report"; report: AssistantReport }
  | { id: number; kind: "error"; text: string };

type NewEntry = Entry extends infer Item ? (Item extends Entry ? Omit<Item, "id"> : never) : never;

const suggestions = [
  "Who needs attention this week?",
  "Summarise attendance for the last 7 days",
  "What is waiting for me to grade?",
];

/** Renders the small markdown subset the model is told to use: **bold** and "-" or "*" bullets. */
function inlineBold(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => part.startsWith("**") && part.endsWith("**") && part.length > 4
    ? <strong className="font-semibold text-slate-950" key={index}>{part.slice(2, -2)}</strong>
    : <span key={index}>{part}</span>);
}

function AnswerText({ text }: { text: string }) {
  const blocks: Array<{ items: string[]; kind: "list" } | { kind: "text"; value: string }> = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    const last = blocks[blocks.length - 1];
    if (bullet) {
      if (last?.kind === "list") last.items.push(bullet[1]);
      else blocks.push({ items: [bullet[1]], kind: "list" });
    } else if (line) blocks.push({ kind: "text", value: line.replace(/^#+\s*/, "") });
  }
  return <div className="space-y-2 text-sm leading-6 text-slate-800">{blocks.map((block, index) => block.kind === "list"
    ? <ul className="space-y-1" key={index}>{block.items.map((item, itemIndex) => <li className="flex gap-2" key={itemIndex}><span className="text-slate-400">•</span><span>{inlineBold(item)}</span></li>)}</ul>
    : <p key={index}>{inlineBold(block.value)}</p>)}</div>;
}

function ReportView({ report }: { report: AssistantReport }) {
  const [copied, setCopied] = useState<string | null>(null);
  return <div className="space-y-4">
    <div><p className="text-sm font-semibold text-slate-950">{report.title}</p><p className="mt-1 text-sm text-slate-600">{report.summary}</p></div>
    {report.sections.map((section) => <div key={section.heading}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{section.heading}</p>
      {section.lines ? <ul className="mt-2 space-y-1 text-sm text-slate-700">{section.lines.map((line) => <li className="flex gap-2" key={line}><span className="text-slate-400">•</span><span>{line}</span></li>)}</ul> : null}
      {section.table ? <div className="mt-2 overflow-x-auto rounded-xl border border-slate-100"><table className="w-full min-w-[420px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{section.table.columns.map((column) => <th className="px-3 py-2" key={column}>{column}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{section.table.rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td className="px-3 py-2 text-slate-700" key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div> : null}
      {section.draft ? <div className="mt-2"><pre className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-4 font-sans text-sm leading-6 text-slate-800">{section.draft}</pre><button className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50" onClick={() => { void navigator.clipboard.writeText(section.draft ?? "").then(() => setCopied(section.heading)); }} type="button"><ClipboardCopy className="size-3.5" />{copied === section.heading ? "Copied" : "Copy draft"}</button></div> : null}
    </div>)}
  </div>;
}

/** Faculty assistant: one-click reports that always work, plus model-backed chat grounded in the same tools. */
export function FacultyAssistant({ canUse, modelLabel }: { canUse: boolean; modelLabel: string | null }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [question, setQuestion] = useState("");
  const [inputs, setInputs] = useState<Partial<Record<AssistantUseCaseId, string>>>({});
  const [pending, startTransition] = useTransition();
  const nextId = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const push = (entry: NewEntry) => {
    setEntries((current) => [...current, { ...entry, id: nextId.current++ } as Entry]);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ behavior: "smooth", top: scrollRef.current.scrollHeight }));
  };

  const runUseCase = (id: AssistantUseCaseId, label: string, needsInput: boolean) => {
    const input = (inputs[id] ?? "").trim();
    if (needsInput && !input) { push({ kind: "error", text: `Enter a student name or register number for "${label}".` }); return; }
    push({ kind: "user", text: needsInput ? `${label}: ${input}` : label });
    startTransition(async () => {
      const outcome = await runAssistantUseCaseAction(id, input);
      if (outcome.status === "success") push({ kind: "report", report: outcome.data });
      else push({ kind: "error", text: outcome.message });
    });
  };

  const ask = (text: string) => {
    const trimmed = text.trim();
    if (trimmed.length < 2 || pending) return;
    const history: AssistantChatMessage[] = entries.flatMap((entry): AssistantChatMessage[] => entry.kind === "user" ? [{ content: entry.text, role: "user" as const }] : entry.kind === "answer" ? [{ content: entry.text, role: "assistant" as const }] : []);
    setQuestion("");
    push({ kind: "user", text: trimmed });
    startTransition(async () => {
      const outcome = await askFacultyAssistantAction(history, trimmed);
      if (outcome.status === "success") push({ kind: "answer", model: outcome.data.model, text: outcome.data.text, tools: outcome.data.tools });
      else push({ kind: "error", text: outcome.message });
    });
  };

  if (!canUse) return <Card className="p-6 text-sm text-slate-600">The faculty assistant needs agent permission and a live database connection.</Card>;

  return <Card className="overflow-hidden">
    <div className="flex flex-col gap-2 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-blue-600 text-white"><Sparkles className="size-5" /></span><div><h2 className="font-semibold text-slate-950">Faculty assistant</h2><p className="text-sm text-slate-500">Answers come only from your campus records. It can read and draft, never change or send.</p></div></div>
      <span className={cn("self-start rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset sm:self-auto", modelLabel ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-amber-50 text-amber-700 ring-amber-200")}>{modelLabel ? `Chat: ${modelLabel}` : "Chat off · quick actions only"}</span>
    </div>

    <div className="grid gap-3 border-b border-slate-100 bg-slate-50/60 p-5 sm:grid-cols-2 sm:px-6 xl:grid-cols-4">
      {assistantUseCases.map((useCase) => <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4" key={useCase.id}>
        <p className="text-sm font-semibold text-slate-900">{useCase.label}</p>
        <p className="mt-1 flex-1 text-xs leading-5 text-slate-500">{useCase.description}</p>
        {useCase.input ? <input className="mt-3 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" maxLength={80} onChange={(event) => setInputs((current) => ({ ...current, [useCase.id]: event.target.value }))} onKeyDown={(event) => { if (event.key === "Enter") runUseCase(useCase.id, useCase.label, true); }} placeholder={useCase.input} value={inputs[useCase.id] ?? ""} /> : null}
        <button className="mt-3 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50" disabled={pending} onClick={() => runUseCase(useCase.id, useCase.label, Boolean(useCase.input))} type="button">Run</button>
      </div>)}
    </div>

    <div className="max-h-[560px] min-h-48 space-y-4 overflow-y-auto p-5 sm:px-6" ref={scrollRef}>
      {!entries.length ? <p className="py-8 text-center text-sm text-slate-500">Run a quick action above{modelLabel ? " or ask a question below" : ""}.</p> : null}
      {entries.map((entry) => entry.kind === "user"
        ? <div className="flex justify-end gap-2" key={entry.id}><p className="max-w-[80%] rounded-2xl rounded-tr-sm bg-blue-600 px-4 py-2.5 text-sm text-white">{entry.text}</p><span className="grid size-8 shrink-0 place-items-center rounded-full bg-blue-100 text-blue-700"><User className="size-4" /></span></div>
        : <div className="flex gap-2" key={entry.id}>
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-900 text-white"><Bot className="size-4" /></span>
          <div className={cn("min-w-0 max-w-[92%] rounded-2xl rounded-tl-sm border px-4 py-3", entry.kind === "error" ? "border-rose-200 bg-rose-50 text-sm text-rose-700" : "border-slate-200 bg-white")}>
            {entry.kind === "report" ? <ReportView report={entry.report} /> : null}
            {entry.kind === "answer" ? <><AnswerText text={entry.text} />{entry.tools.length ? <p className="mt-2 text-xs text-slate-400">Checked: {entry.tools.join(", ")}</p> : null}</> : null}
            {entry.kind === "error" ? entry.text : null}
          </div>
        </div>)}
      {pending ? <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" />Reading campus records…</p> : null}
    </div>

    <form className="border-t border-slate-100 p-4 sm:px-6" onSubmit={(event) => { event.preventDefault(); ask(question); }}>
      {modelLabel && !entries.length ? <div className="mb-3 flex flex-wrap gap-2">{suggestions.map((item) => <button className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50" key={item} onClick={() => ask(item)} type="button">{item}</button>)}</div> : null}
      <div className="flex gap-2">
        <input className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 disabled:bg-slate-50" disabled={!modelLabel || pending} maxLength={1000} onChange={(event) => setQuestion(event.target.value)} placeholder={modelLabel ? "Ask about attendance, a student, grading, or coding profiles…" : "Set GEMINI_MODEL in .env.local to enable chat"} value={question} />
        <button aria-label="Send" className="grid size-11 place-items-center rounded-xl bg-primary text-white disabled:opacity-50" disabled={!modelLabel || pending || question.trim().length < 2} type="submit"><Send className="size-4" /></button>
      </div>
    </form>
  </Card>;
}
