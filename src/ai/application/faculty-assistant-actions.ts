"use server";

import { z } from "zod";

import { buildAssistantReport } from "@/ai/assistant/assistant-reports";
import { answerFacultyQuestion } from "@/ai/assistant/faculty-assistant";
import {
  isAssistantUseCaseId,
  type AssistantAnswer,
  type AssistantReport,
} from "@/ai/contracts/assistant-report";
import { recordAssistantUse } from "@/ai/observability/agent-run.repository";
import { requirePermission } from "@/server/auth/campus-access";

type Outcome<T> = { data: T; status: "success" } | { message: string; status: "error" };

const useCaseSchema = z.object({
  input: z.string().trim().max(80),
  useCase: z.string().refine(isAssistantUseCaseId),
});

const chatSchema = z.object({
  history: z.array(z.object({ content: z.string().max(4000), role: z.enum(["assistant", "user"]) })).max(20),
  question: z.string().trim().min(2).max(1000),
});

async function authorize() {
  try {
    return await requirePermission("agents:execute");
  } catch {
    return null;
  }
}

/** Runs one quick-action report. Read-only and scoped to the caller's classes. */
export async function runAssistantUseCaseAction(useCase: string, input: string): Promise<Outcome<AssistantReport>> {
  const access = await authorize();
  if (!access) return { message: "Sign in with agent permission to use the assistant.", status: "error" };
  const parsed = useCaseSchema.safeParse({ input, useCase });
  if (!parsed.success || !isAssistantUseCaseId(parsed.data.useCase)) return { message: "Choose a supported action and keep the search under 80 characters.", status: "error" };
  const useCaseId = parsed.data.useCase;

  try {
    const report = await buildAssistantReport(useCaseId, { profileId: access.profileId, role: access.role }, parsed.data.input);
    await recordAssistantUse({ actorProfileId: access.profileId, kind: "report", name: useCaseId, tools: [] }).catch(() => undefined);
    return { data: report, status: "success" };
  } catch {
    return { message: "The records for this report could not be loaded. Check that the database migrations are applied.", status: "error" };
  }
}

/** Free-text question answered by the tool-using model from verified records. */
export async function askFacultyAssistantAction(history: unknown, question: unknown): Promise<Outcome<AssistantAnswer>> {
  const access = await authorize();
  if (!access) return { message: "Sign in with agent permission to use the assistant.", status: "error" };
  const parsed = chatSchema.safeParse({ history, question });
  if (!parsed.success) return { message: "Ask a question between 2 and 1000 characters.", status: "error" };

  try {
    const answer = await answerFacultyQuestion({ profileId: access.profileId, role: access.role }, parsed.data.history, parsed.data.question);
    await recordAssistantUse({ actorProfileId: access.profileId, kind: "chat", name: answer.model ?? "unavailable", tools: answer.tools }).catch(() => undefined);
    return { data: answer, status: "success" };
  } catch {
    return { message: "The AI provider did not respond. Try again, or use a quick action, which works without the model.", status: "error" };
  }
}
