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
  const { data, error } = await client.from("agent_runs").select("id, agent_name, status, input, output, error_message, correlation_id, created_at, started_at, completed_at, agent_decisions (confidence, decision_type, reasons, recommendations, requires_human_review)").order("created_at", { ascending: false }).limit(100);
  if (error) throw new DatabaseQueryError("load agent workspace", error.message);
  return data;
}
