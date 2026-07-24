export type AiProviderName = "gemini" | "openai";

export type AiProviderConfiguration = {
  model: string;
  provider: AiProviderName;
};

export function parseAiProvider(value: string | undefined): AiProviderName {
  if (value === "gemini" || value === "openai") {
    return value;
  }

  return "openai";
}
