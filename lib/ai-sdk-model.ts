import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import { resolveAzureDeploymentName } from "@/lib/azure-openai";
import { resolveLlmTarget, type LlmTarget } from "@/lib/quick-llm";

function stripChatCompletionsSuffix(url: string): string {
  return url.replace(/\/chat\/completions\/?$/, "");
}

function openRouterHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const referer = process.env.OPENROUTER_HTTP_REFERER?.trim();
  if (referer) headers["HTTP-Referer"] = referer;
  const title = process.env.OPENROUTER_APP_TITLE?.trim();
  if (title) headers["X-Title"] = title;
  return headers;
}

function modelFromTarget(llm: LlmTarget): LanguageModel {
  const baseURL = stripChatCompletionsSuffix(llm.url);
  const extraHeaders =
    llm.provider === "openrouter" ? openRouterHeaders() : undefined;

  const provider = createOpenAICompatible({
    name: `gitreverse-${llm.provider}`,
    apiKey: llm.apiKey,
    baseURL,
    headers: extraHeaders,
    ...(llm.provider === "azure"
      ? {
          transformRequestBody: (body: Record<string, unknown>) => {
            const next = { ...body };
            if ("max_tokens" in next) {
              next.max_completion_tokens = next.max_tokens;
              delete next.max_tokens;
            }
            return next;
          },
        }
      : {}),
  });

  const modelId =
    llm.provider === "azure"
      ? resolveAzureDeploymentName(llm.model)
      : llm.model;

  return provider.chatModel(modelId);
}

export type ResolvedAiSdkModel = {
  model: LanguageModel;
  providerName: string;
  reasoningEffort?: string;
};

export function resolveAiSdkModel():
  | ResolvedAiSdkModel
  | { error: string } {
  const target = resolveLlmTarget();
  if ("error" in target) return { error: target.error };

  return {
    model: modelFromTarget(target),
    providerName: `gitreverse-${target.provider}`,
    reasoningEffort: target.reasoningEffort,
  };
}
