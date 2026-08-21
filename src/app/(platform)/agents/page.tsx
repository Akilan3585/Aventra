import { Bot, BrainCircuit, CircleCheck, ShieldCheck } from "lucide-react";

import { approveAgentDecisionAction } from "@/ai/application/agent-actions";
import { loadAgentWorkspace } from "@/ai/observability/agent-run.repository";
import { AgentConsole } from "@/ai/presentation/agent-console";
import { OperationsHeader, OperationsMetrics, StatusPill, WorkspaceBanner } from "@/components/operations/operations-ui";
import { AdministrationTable } from "@/features/administration/presentation/administration-table";
import { resolveWorkspaceAccess } from "@/server/workspace/workspace-access";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const access = await resolveWorkspaceAccess("reports:read", "agents:execute");
  let runs = null;
  if (access.mode === "live") try { runs = await loadAgentWorkspace(); } catch { runs = null; }
  const mode = access.mode === "live" && !runs ? "error" : access.mode;
  const rows = runs ?? [];
  const waiting = rows.filter((run) => run.agent_decisions.some((decision) => decision.requires_human_review && !decision.approved_at)).length;

  return <section>
    <OperationsHeader description="Execute evidence-backed specialist agents, inspect persisted decisions, and keep privileged outcomes under human control." eyebrow="Decision intelligence" title="Agent operations." />
    <WorkspaceBanner mode={mode} />
    <div className="mt-8"><AgentConsole canExecute={access.canManage && mode === "live"} /></div>
    <OperationsMetrics metrics={[
      { detail: "Most recent persisted executions", icon: Bot, label: "Agent runs", value: rows.length },
      { detail: "Runs that completed with evidence", icon: CircleCheck, label: "Completed", value: rows.filter((item) => item.status === "completed").length },
      { detail: "Decisions waiting for an authorized reviewer", icon: ShieldCheck, label: "Human review", value: waiting },
      { detail: "Specialist roles represented", icon: BrainCircuit, label: "Agent types", value: new Set(rows.map((item) => item.agent_name)).size },
    ]} />
    <AdministrationTable columns={["Agent", "Decision", "Confidence", "Review", "Status", "Run time"]} description="Every run retains input, output, correlation ID, decision evidence, and audit history." emptyDescription="Run the coordinator or a specialist agent after source data is connected." emptyIcon={Bot} emptyTitle="No agent runs yet." rows={rows.map((run) => {
      const decision = run.agent_decisions[0];
      return { id: run.id, cells: [
        <div key="agent"><p className="text-sm font-semibold capitalize text-slate-900">{run.agent_name.replace("-", " ")}</p><p className="font-mono text-xs text-slate-500">{run.correlation_id.slice(0, 8)}</p></div>,
        <span className="text-sm capitalize text-slate-700" key="decision">{decision?.decision_type ?? "—"}</span>,
        <span className="font-mono text-sm text-slate-700" key="confidence">{decision ? `${Math.round(Number(decision.confidence) * 100)}%` : "—"}</span>,
        <div key="review">{decision?.approved_at ? <StatusPill tone="good">approved</StatusPill> : decision?.requires_human_review ? <form action={approveAgentDecisionAction}><input name="decisionId" type="hidden" value={decision.id} /><button className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-200" type="submit">Approve decision</button></form> : <StatusPill tone="good">not required</StatusPill>}</div>,
        <StatusPill key="status" tone={run.status === "completed" ? "good" : run.status === "failed" ? "critical" : "warning"}>{run.status}</StatusPill>,
        <span className="font-mono text-xs text-slate-600" key="date">{new Date(run.created_at).toLocaleString()}</span>,
      ] };
    })} title="Execution history" />
  </section>;
}
