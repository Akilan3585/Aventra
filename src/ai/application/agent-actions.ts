"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { campusAgentNames, executeCampusAgent } from "@/ai/orchestration/campus-agent";
import { requirePermission } from "@/server/auth/campus-access";

export type AgentActionState = { message: string; status: "idle" | "error" | "success" };
const schema = z.object({ agentName: z.enum(campusAgentNames), focus: z.string().trim().max(500) });

export async function runAgentAction(_: AgentActionState, formData: FormData): Promise<AgentActionState> {
  try {
    const access = await requirePermission("agents:execute");
    const parsed = schema.safeParse({ agentName: formData.get("agentName"), focus: formData.get("focus") ?? "" });
    if (!parsed.success) return { message: "Choose an agent and keep the focus prompt under 500 characters.", status: "error" };
    const result = await executeCampusAgent({ ...parsed.data, userId: access.userId });
    revalidatePath("/agents"); revalidatePath("/dashboard"); revalidatePath("/audit-logs");
    return { message: `${result.decision.summary} Confidence ${Math.round(result.confidence * 100)}%.`, status: "success" };
  } catch { return { message: "The agent run failed. Verify permissions, Supabase connectivity, and source records.", status: "error" }; }
}
