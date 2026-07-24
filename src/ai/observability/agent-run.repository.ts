import "server-only";

import { DatabaseQueryError } from "@/server/database/database-query-error";
import { createServerSupabaseClient } from "@/server/supabase/server-client";
import type { Database } from "@/types/database";

export type AgentRun = Database["public"]["Tables"]["agent_runs"]["Row"];

export async function listAgentRuns(): Promise<AgentRun[]> {
  const { data, error } = await createServerSupabaseClient()
    .from("agent_runs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new DatabaseQueryError("list agent runs", error.message);

  return data;
}
