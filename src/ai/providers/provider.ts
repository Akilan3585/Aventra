import "server-only";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

import type { AiProviderConfiguration } from "@/ai/providers/provider-configuration";

export { resolveAiProviderConfiguration } from "@/ai/providers/provider-configuration";

export function createCampusLanguageModel(configuration: AiProviderConfiguration): LanguageModel {
  if (configuration.provider === "gemini") {
    const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
    return google(configuration.model);
  }

  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai(configuration.model);
}
