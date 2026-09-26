import "server-only";

import { DatabaseQueryError } from "@/server/database/database-query-error";
import { createSupabaseAdminClient } from "@/server/supabase/admin-client";
import type { Database } from "@/types/database";

export type AgentRun = Database["public"]["Tables"]["agent_runs"]["Row"];

export async function listAgentRuns(): Promise<AgentRun[]> {
  const { data, error } = await createSupabaseAdminClient()
    .from("agent_runs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new DatabaseQueryError("list agent runs", error.message);

  return data;
}

export async function loadAgentWorkspace() {
  const client = createSupabaseAdminClient();
  const { data, error } = await client.from("agent_runs").select("id, agent_name, status, input, output, error_message, correlation_id, created_at, started_at, completed_at, agent_decisions (id, confidence, decision_type, reasons, recommendations, requires_human_review, approved_at, approved_by_profile_id)").order("created_at", { ascending: false }).limit(100);
  if (error) throw new DatabaseQueryError("load agent workspace", error.message);
  return data;
}

/** Audit trail for faculty-assistant use. Stores what ran, never the question text or student data. */
export async function recordAssistantUse(entry: { actorProfileId: string | null; kind: "chat" | "report"; name: string; tools: string[] }) {
  await createSupabaseAdminClient().from("audit_logs").insert({
    action: entry.kind === "chat" ? "assistant.chat" : "assistant.report",
    actor_profile_id: entry.actorProfileId,
    entity_id: null,
    entity_type: "faculty_assistant",
    metadata: { name: entry.name, tools: entry.tools },
  });
}
