"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { campusAgentNames, executeCampusAgent } from "@/ai/orchestration/campus-agent";
import { requirePermission } from "@/server/auth/campus-access";
import { createSupabaseAdminClient } from "@/server/supabase/admin-client";

export type AgentActionState = { message: string; status: "idle" | "error" | "success" };
const schema = z.object({ agentName: z.enum(campusAgentNames), focus: z.string().trim().max(500) });

export async function runAgentAction(_: AgentActionState, formData: FormData): Promise<AgentActionState> {
  try {
    const access = await requirePermission("agents:execute");
    const parsed = schema.safeParse({ agentName: formData.get("agentName"), focus: formData.get("focus") ?? "" });
    if (!parsed.success) return { message: "Choose an agent and keep the focus prompt under 500 characters.", status: "error" };
    const result = await executeCampusAgent({ ...parsed.data, userId: access.userId });
    revalidatePath("/agents"); revalidatePath("/dashboard");
    return { message: `${result.decision.summary} Confidence ${Math.round(result.confidence * 100)}%.`, status: "success" };
  } catch { return { message: "The agent run failed. Verify permissions, Supabase connectivity, and source records.", status: "error" }; }
}

export async function approveAgentDecisionAction(formData: FormData) {
  const access = await requirePermission("agents:review");
  const decisionId = z.guid().safeParse(formData.get("decisionId"));
  if (!decisionId.success || !access.profileId) return;
  const client = createSupabaseAdminClient();
  const { data, error } = await client.from("agent_decisions").update({
    approved_at: new Date().toISOString(), approved_by_profile_id: access.profileId,
  }).eq("id", decisionId.data).eq("requires_human_review", true).is("approved_at", null).select("id, run_id").maybeSingle();
  if (!error && data) await client.from("audit_logs").insert({ action: "agent_decision.approved", actor_profile_id: access.profileId, entity_id: data.id, entity_type: "agent_decision", metadata: { run_id: data.run_id } });
  revalidatePath("/agents");
}
