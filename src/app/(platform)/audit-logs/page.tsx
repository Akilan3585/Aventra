import { Bot, Fingerprint, ScrollText, ShieldCheck } from "lucide-react";

import { OperationsHeader, OperationsMetrics, StatusPill, WorkspaceBanner } from "@/components/operations/operations-ui";
import { loadAuditWorkspace } from "@/features/administration/infrastructure/administration.repository";
import { AdministrationTable } from "@/features/administration/presentation/administration-table";
import { resolveWorkspaceAccess } from "@/server/workspace/workspace-access";

export const dynamic = "force-dynamic";

export default async function AuditLogsPage() {
  const access = await resolveWorkspaceAccess("audit:read");
  let logs = null;
  if (access.mode === "live") try { logs = await loadAuditWorkspace(); } catch { logs = null; }
  const mode = access.mode === "live" && !logs ? "error" : access.mode;
  const rows = logs ?? [];
  return <section><OperationsHeader description="Review privileged mutations, security-relevant activity, and agent decisions through immutable evidence." eyebrow="Trust and governance" title="Audit history." /><WorkspaceBanner mode={mode} /><OperationsMetrics metrics={[{ detail: "Most recent immutable events", icon: ScrollText, label: "Events loaded", value: rows.length }, { detail: "Distinct action categories", icon: Fingerprint, label: "Action types", value: new Set(rows.map((item) => item.action)).size }, { detail: "Agent-correlated audit events", icon: Bot, label: "Agent events", value: rows.filter((item) => item.correlation_id).length }, { detail: "Events linked to a known actor", icon: ShieldCheck, label: "Actor coverage", value: rows.filter((item) => item.profiles).length }]} /><AdministrationTable columns={["Action", "Actor", "Entity", "Correlation", "Timestamp"]} description="Latest 300 records, ordered newest first. Audit records are never edited from this interface." emptyDescription="Privileged actions and agent runs will appear here automatically." emptyIcon={ScrollText} emptyTitle="No audit events recorded." rows={rows.map((item) => ({ id: item.id, cells: [<div key="action"><p className="text-sm font-semibold text-slate-900">{item.action}</p><StatusPill>{item.entity_type}</StatusPill></div>, <div key="actor"><p className="text-sm text-slate-700">{item.profiles?.display_name ?? "System / unlinked"}</p><p className="text-xs text-slate-500">{item.profiles?.email ?? "No profile"}</p></div>, <span className="font-mono text-xs text-slate-600" key="entity">{item.entity_id ?? "—"}</span>, <span className="font-mono text-xs text-slate-600" key="correlation">{item.correlation_id?.slice(0, 8) ?? "—"}</span>, <span className="font-mono text-xs text-slate-600" key="date">{new Date(item.created_at).toLocaleString()}</span>] }))} title="Immutable activity ledger" /></section>;
}
