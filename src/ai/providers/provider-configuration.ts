export type AiProviderName = "gemini" | "openai";

export type AiProviderConfiguration = {
  model: string;
  provider: AiProviderName;
};

export type ProviderEnvironment = {
  AI_PROVIDER?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
};

function usable(value: string | undefined) {
  return Boolean(value?.trim() && !value.includes("REPLACE_ME"));
}

export function parseAiProvider(value: string | undefined): AiProviderName {
  return value === "gemini" ? "gemini" : "openai";
}

export function resolveAiProviderConfiguration(
  environment: ProviderEnvironment = process.env as ProviderEnvironment,
): AiProviderConfiguration | null {
  const selected = parseAiProvider(environment.AI_PROVIDER);
  const candidates: AiProviderName[] =
    selected === "openai" ? ["openai", "gemini"] : ["gemini", "openai"];

  for (const provider of candidates) {
    const key = provider === "openai" ? environment.OPENAI_API_KEY : environment.GEMINI_API_KEY;
    const model = provider === "openai" ? environment.OPENAI_MODEL : environment.GEMINI_MODEL;
    if (usable(key) && usable(model)) return { model: model!.trim(), provider };
  }

  return null;
}
