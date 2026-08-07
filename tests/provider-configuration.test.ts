import { describe, expect, it } from "vitest";

import { resolveAiProviderConfiguration } from "../src/ai/providers/provider-configuration";

describe("AI provider configuration", () => {
  it("uses the selected provider when its key and model are valid", () => {
    expect(resolveAiProviderConfiguration({
      AI_PROVIDER: "openai",
      OPENAI_API_KEY: "sk-valid",
      OPENAI_MODEL: "gpt-test",
    })).toEqual({ model: "gpt-test", provider: "openai" });
  });

  it("falls back to Gemini when selected OpenAI values are placeholders", () => {
    expect(resolveAiProviderConfiguration({
      AI_PROVIDER: "openai",
      GEMINI_API_KEY: "AIza-valid",
      GEMINI_MODEL: "gemini-test",
      OPENAI_API_KEY: "sk_REPLACE_ME",
      OPENAI_MODEL: "",
    })).toEqual({ model: "gemini-test", provider: "gemini" });
  });

  it("returns null when no complete provider is configured", () => {
    expect(resolveAiProviderConfiguration({
      AI_PROVIDER: "gemini",
      GEMINI_API_KEY: "AIza-valid",
      GEMINI_MODEL: "",
    })).toBeNull();
  });
});
