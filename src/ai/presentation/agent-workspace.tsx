"use client";

import {
  Bot,
  Building2,
  Check,
  ChevronDown,
  ClipboardCopy,
  GraduationCap,
  Loader2,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import { useRef, useState, useTransition } from "react";

import {
  askFacultyAssistantAction,
  runAssistantUseCaseAction,
} from "@/ai/application/faculty-assistant-actions";
import type {
  AssistantChatMessage,
  AssistantReport,
  AssistantUseCaseId,
} from "@/ai/contracts/assistant-report";
import { Card } from "@/design-system/primitives/card";
import { cn } from "@/lib/utils";

export type AgentId = "faculty-assistant" | "student-success" | "academic-coordinator";

type AgentDefinition = {
  description: string;
  icon: typeof Sparkles;
  id: AgentId;
  name: string;
  placeholder: string;
  roleBadge: string;
  suggestedPrompts: string[];
};

const agents: AgentDefinition[] = [
  {
    description: "Answers questions about students, attendance, courses, assignments and academic performance.",
    icon: GraduationCap,
    id: "faculty-assistant",
    name: "Faculty Assistant",
    placeholder: "Ask about students, attendance, assignments, or performance...",
    roleBadge: "Academic Assistant",
    suggestedPrompts: [
      "Show students with low attendance",
      "Summarize today's attendance",
      "Find students who need attention",
      "Show performance of a student",
    ],
  },
  {
    description: "Analyzes student performance and identifies students who may need attention.",
    icon: ShieldCheck,
    id: "student-success",
    name: "Student Success",
    placeholder: "Ask about student risk factors, attendance thresholds, or academic interventions...",
    roleBadge: "Student Analytics",
    suggestedPrompts: [
      "Find students who need attention",
      "Show students with low attendance",
      "List top coding performers",
      "Check grading queue and pending reviews",
    ],
  },
  {
    description: "Helps faculty understand academic data, schedule conflicts, and generate useful insights.",
    icon: Building2,
    id: "academic-coordinator",
    name: "Academic Coordinator",
    placeholder: "Ask about timetable conflicts, room capacity, or attendance health...",
    roleBadge: "Operations & Schedules",
    suggestedPrompts: [
      "Summarize today's attendance",
      "Show timetable and room conflicts",
      "Show students with low attendance",
      "Summarize attendance for the last 7 days",
    ],
  },
];

type MessageEntry =
  | { id: number; kind: "user"; text: string }
  | { id: number; kind: "answer"; model: string | null; text: string; tools: string[] }
  | { id: number; kind: "report"; report: AssistantReport }
  | { id: number; kind: "error"; text: string };

type NewMessageEntry = MessageEntry extends infer Item
  ? Item extends MessageEntry
    ? Omit<Item, "id">
    : never
  : never;

/** Simple markdown formatting: bold (**text**) and bullet lists */
function inlineBold(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
      <strong className="font-semibold text-slate-950" key={index}>
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={index}>{part}</span>
    ),
  );
}

type ParsedBlock =
  | { kind: "list"; items: string[] }
  | { kind: "text"; value: string }
  | { headers: string[]; kind: "table"; rows: string[][] };

function parseMarkdownBlocks(text: string): ParsedBlock[] {
  const lines = text.split(/\r?\n/);
  const blocks: ParsedBlock[] = [];
  let tableBuffer: string[] = [];

  const flushTable = () => {
    if (tableBuffer.length >= 2) {
      const headerLine = tableBuffer[0];
      const headers = headerLine
        .split("|")
        .map((c) => c.trim())
        .filter((c, i, arr) => (i === 0 || i === arr.length - 1 ? c !== "" : true));

      const rows: string[][] = [];
      for (let i = 1; i < tableBuffer.length; i++) {
        const rowLine = tableBuffer[i];
        if (/^\|?[\s\-:|]+\|?$/.test(rowLine)) continue;
        const cells = rowLine
          .split("|")
          .map((c) => c.trim())
          .filter((c, idx, arr) => (idx === 0 || idx === arr.length - 1 ? c !== "" : true));
        if (cells.length > 0) rows.push(cells);
      }

      if (headers.length > 0 && rows.length > 0) {
        blocks.push({ headers, kind: "table", rows });
      }
    }
    tableBuffer = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith("|") && line.endsWith("|")) {
      tableBuffer.push(line);
      continue;
    } else if (tableBuffer.length > 0) {
      flushTable();
    }

    const bullet = line.match(/^[-*•]\s+(.*)$/);
    const last = blocks[blocks.length - 1];
    if (bullet) {
      if (last?.kind === "list") {
        last.items.push(bullet[1]);
      } else {
        blocks.push({ items: [bullet[1]], kind: "list" });
      }
    } else if (line) {
      blocks.push({ kind: "text", value: line.replace(/^#+\s*/, "") });
    }
  }

  if (tableBuffer.length > 0) {
    flushTable();
  }

  return blocks;
}

function AnswerText({ text }: { text: string }) {
  const blocks = parseMarkdownBlocks(text);

  return (
    <div className="space-y-3 text-sm leading-6 text-slate-800">
      {blocks.map((block, index) => {
        if (block.kind === "list") {
          return (
            <ul className="space-y-1.5 pl-1" key={index}>
              {block.items.map((item, itemIndex) => (
                <li className="flex items-start gap-2.5" key={itemIndex}>
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-blue-600" />
                  <span>{inlineBold(item)}</span>
                </li>
              ))}
            </ul>
          );
        }
        if (block.kind === "table") {
          return (
            <div className="my-2.5 overflow-x-auto rounded-xl border border-slate-200/80 bg-white" key={index}>
              <table className="w-full min-w-[360px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/90 text-xs font-semibold uppercase tracking-wider text-slate-600">
                  <tr>
                    {block.headers.map((h, i) => (
                      <th className="px-3.5 py-2.5" key={i}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {block.rows.map((row, rIdx) => (
                    <tr className="hover:bg-slate-50/50" key={rIdx}>
                      {row.map((cell, cIdx) => (
                        <td className="px-3.5 py-2 text-slate-700" key={cIdx}>
                          {inlineBold(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return <p key={index}>{inlineBold(block.value)}</p>;
      })}
    </div>
  );
}

function ReportTableView({ report }: { report: AssistantReport }) {
  const [copiedHeading, setCopiedHeading] = useState<string | null>(null);

  const handleCopy = (heading: string, text: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopiedHeading(heading);
      setTimeout(() => setCopiedHeading(null), 2000);
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="font-semibold text-slate-950">{report.title}</p>
        <p className="mt-1 text-sm text-slate-600">{report.summary}</p>
      </div>
      {report.sections.map((section) => (
        <div className="space-y-2" key={section.heading}>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {section.heading}
          </p>
          {section.lines?.length ? (
            <ul className="space-y-1.5 pl-1 text-sm text-slate-700">
              {section.lines.map((line, idx) => (
                <li className="flex items-start gap-2.5" key={idx}>
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-blue-600" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {section.table ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white">
              <table className="w-full min-w-[440px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <tr>
                    {section.table.columns.map((column) => (
                      <th className="px-3.5 py-2.5" key={column}>
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {section.table.rows.map((row, index) => (
                    <tr className="hover:bg-slate-50/50" key={index}>
                      {row.map((cell, cellIndex) => (
                        <td className="px-3.5 py-2.5 text-slate-700" key={cellIndex}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {section.draft ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-slate-800">
                {section.draft}
              </pre>
              <button
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                onClick={() => handleCopy(section.heading, section.draft ?? "")}
                type="button"
              >
                {copiedHeading === section.heading ? (
                  <>
                    <Check className="size-3.5 text-emerald-600" /> Copied to clipboard
                  </>
                ) : (
                  <>
                    <ClipboardCopy className="size-3.5" /> Copy draft
                  </>
                )}
              </button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

const promptMappings: Record<string, AssistantUseCaseId> = {
  "Find students who need attention": "at-risk-students",
  "List top coding performers": "coding-leaders",
  "Show performance of a student": "coding-leaders",
  "Show students with low attendance": "at-risk-students",
  "Show timetable and room conflicts": "daily-briefing",
  "Summarize attendance for the last 7 days": "attendance-summary",
  "Summarize today's attendance": "daily-briefing",
};

export function AgentWorkspace({
  canUse,
  modelLabel,
}: {
  canUse: boolean;
  modelLabel: string | null;
}) {
  const [selectedAgentId, setSelectedAgentId] = useState<AgentId>("faculty-assistant");
  const [messagesByAgent, setMessagesByAgent] = useState<Record<AgentId, MessageEntry[]>>({
    "academic-coordinator": [],
    "faculty-assistant": [],
    "student-success": [],
  });
  const [inputQuestion, setInputQuestion] = useState("");
  const [pending, startTransition] = useTransition();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const nextId = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeAgent = agents.find((a) => a.id === selectedAgentId) ?? agents[0];
  const entries = messagesByAgent[selectedAgentId] ?? [];

  const pushMessage = (entry: NewMessageEntry, targetAgentId = selectedAgentId) => {
    setMessagesByAgent((prev) => ({
      ...prev,
      [targetAgentId]: [...(prev[targetAgentId] ?? []), { ...entry, id: nextId.current++ } as MessageEntry],
    }));
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({
          behavior: "smooth",
          top: scrollRef.current.scrollHeight,
        });
      }
    });
  };

  const handleClearChat = () => {
    setMessagesByAgent((prev) => ({
      ...prev,
      [selectedAgentId]: [],
    }));
    setInputQuestion("");
  };

  const handleAsk = (text: string) => {
    const trimmed = text.trim();
    if (trimmed.length < 2 || pending) return;

    const currentAgentId = selectedAgentId;
    setInputQuestion("");
    pushMessage({ kind: "user", text: trimmed }, currentAgentId);

    const matchedUseCase = promptMappings[trimmed];

    startTransition(async () => {
      // If a standard prompt matches and no LLM is configured, or as deterministic response
      if (matchedUseCase && !modelLabel) {
        const outcome = await runAssistantUseCaseAction(matchedUseCase, "");
        if (outcome.status === "success") {
          pushMessage({ kind: "report", report: outcome.data }, currentAgentId);
          return;
        }
      }

      // Format conversation history
      const history: AssistantChatMessage[] = [];
      for (const entry of entries) {
        if (entry.kind === "user") {
          history.push({ content: entry.text, role: "user" });
        } else if (entry.kind === "answer") {
          history.push({ content: entry.text, role: "assistant" });
        }
      }

      // Scoped contextual question if specialized agent is active
      let contextualQuestion = trimmed;
      if (currentAgentId === "student-success" && !trimmed.toLowerCase().includes("student")) {
        contextualQuestion = `[Student Success Focus] ${trimmed}`;
      } else if (currentAgentId === "academic-coordinator" && !trimmed.toLowerCase().includes("schedule")) {
        contextualQuestion = `[Academic Coordinator Focus] ${trimmed}`;
      }

      const outcome = await askFacultyAssistantAction(history, contextualQuestion);
      if (outcome.status === "success") {
        pushMessage(
          {
            kind: "answer",
            model: outcome.data.model,
            text: outcome.data.text,
            tools: outcome.data.tools,
          },
          currentAgentId,
        );
      } else {
        // If chat fails or model unavailable, attempt graceful fallback to matched use-case
        if (matchedUseCase) {
          const reportOutcome = await runAssistantUseCaseAction(matchedUseCase, "");
          if (reportOutcome.status === "success") {
            pushMessage({ kind: "report", report: reportOutcome.data }, currentAgentId);
            return;
          }
        }
        pushMessage({ kind: "error", text: outcome.message }, currentAgentId);
      }
    });
  };

  const handleSelectAgent = (id: AgentId) => {
    if (id === selectedAgentId) return;
    setSelectedAgentId(id);
    setIsDropdownOpen(false);
    setInputQuestion("");
  };

  const handlePromptClick = (prompt: string) => {
    setInputQuestion(prompt);
    handleAsk(prompt);
  };

  if (!canUse) {
    return (
      <Card className="p-8 text-center text-sm text-slate-600">
        <Bot className="mx-auto size-8 text-slate-400" />
        <p className="mt-3 font-semibold text-slate-900">AI Agents Unavailable</p>
        <p className="mt-1 text-slate-500">
          The AI Agents workspace requires active staff permissions and database connectivity.
        </p>
      </Card>
    );
  }

  const ActiveIcon = activeAgent.icon;

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">AI Agents</h1>
        <p className="mt-1 text-sm text-slate-500">
          Ask AI agents to analyze student and academic data.
        </p>
      </div>

      {/* 2. Agent Selector Cards */}
      <div className="grid gap-3.5 sm:grid-cols-3">
        {agents.map((agent) => {
          const isSelected = agent.id === selectedAgentId;
          const Icon = agent.icon;
          return (
            <button
              className={cn(
                "group relative flex flex-col items-start rounded-2xl border p-4 text-left transition-all",
                isSelected
                  ? "border-blue-500 bg-white shadow-sm ring-2 ring-blue-500/20"
                  : "border-slate-200/80 bg-white/70 hover:border-slate-300 hover:bg-white",
              )}
              key={agent.id}
              onClick={() => handleSelectAgent(agent.id)}
              type="button"
            >
              <div className="flex w-full items-center justify-between">
                <span
                  className={cn(
                    "grid size-9 place-items-center rounded-xl transition-colors",
                    isSelected
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600",
                  )}
                >
                  <Icon className="size-4.5" />
                </span>
                <span
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase",
                    isSelected
                      ? "bg-blue-50 text-blue-700"
                      : "bg-slate-100 text-slate-500",
                  )}
                >
                  {agent.roleBadge}
                </span>
              </div>
              <p className="mt-3 font-semibold text-slate-950">{agent.name}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{agent.description}</p>
            </button>
          );
        })}
      </div>

      {/* 3. Main AI Chat Area */}
      <Card className="flex flex-col overflow-hidden border-slate-200/90 bg-white shadow-sm">
        {/* Chat Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid size-9.5 place-items-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-200">
              <ActiveIcon className="size-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-slate-950">{activeAgent.name}</h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200/80">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  Ready
                </span>
              </div>
              <p className="text-xs text-slate-500">{activeAgent.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Compact Agent Selector Dropdown */}
            <div className="relative">
              <button
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                onClick={() => setIsDropdownOpen((v) => !v)}
                type="button"
              >
                Agent: <span className="text-blue-600">{activeAgent.name}</span>
                <ChevronDown className="size-3.5 text-slate-400" />
              </button>

              {isDropdownOpen ? (
                <>
                  <div
                    aria-hidden
                    className="fixed inset-0 z-10"
                    onClick={() => setIsDropdownOpen(false)}
                  />
                  <div className="absolute right-0 z-20 mt-1.5 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                    {agents.map((agent) => (
                      <button
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium transition",
                          agent.id === selectedAgentId
                            ? "bg-blue-50 font-semibold text-blue-700"
                            : "text-slate-700 hover:bg-slate-50",
                        )}
                        key={agent.id}
                        onClick={() => handleSelectAgent(agent.id)}
                        type="button"
                      >
                        <span>{agent.name}</span>
                        {agent.id === selectedAgentId ? <Check className="size-3.5 text-blue-600" /> : null}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
            </div>

            {/* Clear Chat Button */}
            {entries.length > 0 ? (
              <button
                aria-label="Clear chat"
                className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-600"
                onClick={handleClearChat}
                title="Clear conversation"
                type="button"
              >
                <RotateCcw className="size-3.5" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Chat Messages / Empty State */}
        <div
          className="min-h-[380px] max-h-[540px] space-y-4 overflow-y-auto p-5 sm:p-6"
          ref={scrollRef}
        >
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 shadow-sm ring-1 ring-blue-100">
                <Sparkles className="size-6" />
              </span>
              <h3 className="mt-4 text-xl font-semibold tracking-tight text-slate-950">
                How can I help?
              </h3>
              <p className="mt-1.5 max-w-md text-sm text-slate-500">
                Ask me about attendance, students, assignments, courses, performance, or academic trends.
              </p>

              {/* 4 Suggested Prompts */}
              <div className="mt-8 grid w-full max-w-2xl gap-2.5 sm:grid-cols-2">
                {activeAgent.suggestedPrompts.map((prompt) => (
                  <button
                    className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/60 px-4 py-3 text-left text-xs font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-900 active:scale-[0.99]"
                    disabled={pending}
                    key={prompt}
                    onClick={() => handlePromptClick(prompt)}
                    type="button"
                  >
                    <span>{prompt}</span>
                    <span className="text-slate-400">→</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            entries.map((entry) =>
              entry.kind === "user" ? (
                <div className="flex justify-end gap-2.5" key={entry.id}>
                  <div className="max-w-[80%] rounded-2xl rounded-tr-xs bg-slate-900 px-4 py-3 text-sm text-white shadow-xs sm:max-w-[70%]">
                    <p className="leading-6">{entry.text}</p>
                  </div>
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-200 text-slate-700">
                    <User className="size-4" />
                  </span>
                </div>
              ) : (
                <div className="flex gap-2.5" key={entry.id}>
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-blue-600 text-white shadow-xs">
                    <Bot className="size-4" />
                  </span>
                  <div
                    className={cn(
                      "min-w-0 max-w-[92%] rounded-2xl rounded-tl-xs border p-4 sm:max-w-[82%]",
                      entry.kind === "error"
                        ? "border-rose-200 bg-rose-50/70 text-rose-800"
                        : "border-slate-200/90 bg-white shadow-xs",
                    )}
                  >
                    {entry.kind === "answer" ? (
                      <div>
                        <AnswerText text={entry.text} />
                        {entry.tools.length > 0 ? (
                          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2.5 text-[11px] text-slate-400">
                            <span className="font-medium text-slate-500">Evidence verified:</span>
                            {entry.tools.map((t) => (
                              <span
                                className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600"
                                key={t}
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {entry.kind === "report" ? <ReportTableView report={entry.report} /> : null}

                    {entry.kind === "error" ? <p className="text-sm">{entry.text}</p> : null}
                  </div>
                </div>
              ),
            )
          )}

          {pending ? (
            <div className="flex items-center gap-2.5 text-sm text-slate-500">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-blue-600/10 text-blue-600">
                <Loader2 className="size-4 animate-spin" />
              </span>
              <span>Analyzing campus records…</span>
            </div>
          ) : null}
        </div>

        {/* Chat Input */}
        <form
          className="border-t border-slate-100 bg-slate-50/50 p-4 sm:px-6"
          onSubmit={(event) => {
            event.preventDefault();
            handleAsk(inputQuestion);
          }}
        >
          <div className="flex gap-2">
            <input
              autoFocus
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-xs outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
              disabled={pending}
              maxLength={1000}
              onChange={(e) => setInputQuestion(e.target.value)}
              placeholder={activeAgent.placeholder}
              ref={inputRef}
              value={inputQuestion}
            />
            <button
              aria-label="Send query"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
              disabled={pending || inputQuestion.trim().length < 2}
              type="submit"
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
          <p className="mt-2.5 text-center text-[11px] text-slate-400">
            Aventra AI analyzes live campus records. Privileged operational changes remain under faculty and administrator governance.
          </p>
        </form>
      </Card>
    </div>
  );
}
