import "server-only";

import type { AgentResult } from "@/ai/contracts/agent-result";
import type { AssistantAnswer, AssistantChatMessage } from "@/ai/contracts/assistant-report";
import { redisGet, redisSet } from "@/server/redis/redis-client";

const DEFAULT_AGENT_DECISION_TTL_SECONDS = 300; // 5 minutes
const DEFAULT_ASSISTANT_ANSWER_TTL_SECONDS = 180; // 3 minutes
const DEFAULT_SESSION_HISTORY_TTL_SECONDS = 86400; // 24 hours

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, ":");
}

/**
 * Generates a cache key for campus agent decisions.
 */
export function getAgentDecisionCacheKey(agentName: string, focus: string): string {
  return `aventra:ai:agent:${normalizeKey(agentName)}:${normalizeKey(focus)}`;
}

/**
 * Gets cached decision for an AI campus agent run.
 */
export async function getCachedAgentDecision<T>(
  agentName: string,
  focus: string,
): Promise<AgentResult<T> | null> {
  const key = getAgentDecisionCacheKey(agentName, focus);
  return await redisGet<AgentResult<T>>(key);
}

/**
 * Stores decision for an AI campus agent run in Redis.
 */
export async function cacheAgentDecision<T>(
  agentName: string,
  focus: string,
  result: AgentResult<T>,
  ttlSeconds = DEFAULT_AGENT_DECISION_TTL_SECONDS,
): Promise<void> {
  const key = getAgentDecisionCacheKey(agentName, focus);
  await redisSet(key, result, { ex: ttlSeconds });
}

/**
 * Generates a cache key for faculty assistant questions.
 */
export function getAssistantAnswerCacheKey(
  scopeKey: string,
  question: string,
): string {
  return `aventra:ai:assistant:${normalizeKey(scopeKey)}:${normalizeKey(question)}`;
}

/**
 * Gets cached answer for a faculty assistant question.
 */
export async function getCachedAssistantAnswer(
  scopeKey: string,
  question: string,
): Promise<AssistantAnswer | null> {
  const key = getAssistantAnswerCacheKey(scopeKey, question);
  return await redisGet<AssistantAnswer>(key);
}

/**
 * Stores faculty assistant answer in Redis.
 */
export async function cacheAssistantAnswer(
  scopeKey: string,
  question: string,
  answer: AssistantAnswer,
  ttlSeconds = DEFAULT_ASSISTANT_ANSWER_TTL_SECONDS,
): Promise<void> {
  const key = getAssistantAnswerCacheKey(scopeKey, question);
  await redisSet(key, answer, { ex: ttlSeconds });
}

/**
 * Gets cached chat session messages for an agent conversation.
 */
export async function getAgentSessionHistory(
  userId: string,
  sessionId: string,
): Promise<AssistantChatMessage[] | null> {
  const key = `aventra:ai:session:${normalizeKey(userId)}:${normalizeKey(sessionId)}`;
  return await redisGet<AssistantChatMessage[]>(key);
}

/**
 * Saves chat session messages for an agent conversation.
 */
export async function saveAgentSessionHistory(
  userId: string,
  sessionId: string,
  messages: AssistantChatMessage[],
  ttlSeconds = DEFAULT_SESSION_HISTORY_TTL_SECONDS,
): Promise<void> {
  const key = `aventra:ai:session:${normalizeKey(userId)}:${normalizeKey(sessionId)}`;
  await redisSet(key, messages, { ex: ttlSeconds });
}
