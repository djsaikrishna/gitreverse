import type { LlmTarget } from "@/lib/quick-llm";
import { resolveLlmTarget } from "@/lib/quick-llm";

const DEFAULT_OPENROUTER_SWAP_MODEL = "openai/gpt-5.4-mini";

export function resolveSwapLlmTarget(): LlmTarget | { error: string } {
  const base = resolveLlmTarget();
  if ("error" in base) return base;

  const override = process.env.GITREVERSE_SWAP_LLM_MODEL?.trim();
  if (override) {
    return { ...base, model: override };
  }

  if (base.provider === "openrouter") {
    return { ...base, model: DEFAULT_OPENROUTER_SWAP_MODEL };
  }

  return base;
}
