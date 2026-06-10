const DEFAULT_AZURE_MODEL = "gpt-5.4";
const DEFAULT_AZURE_TITLE_MODEL = "gpt-5.4-mini";
const DEFAULT_AZURE_EMBEDDING_MODEL = "text-embedding-3-small";
const DEFAULT_AZURE_EMBEDDING_DIMENSIONS = 512;

export type AzureOpenAiReasoningEffort = "none" | "low" | "medium" | "high";

export type AzureChatMessage = {
  role: "system" | "user";
  content: string;
};

export class AzureOpenAiRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AzureOpenAiRequestError";
    this.status = status;
  }
}

function readTrimmedEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

function parseReasoningEffort(
  raw: string | null,
  fallback: AzureOpenAiReasoningEffort
): AzureOpenAiReasoningEffort {
  switch (raw?.toLowerCase()) {
    case "none":
    case "low":
    case "medium":
    case "high":
      return raw.toLowerCase() as AzureOpenAiReasoningEffort;
    default:
      return fallback;
  }
}

function parsePositiveInt(raw: string | null, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseDeploymentNameMap(): Map<string, string> {
  const raw = readTrimmedEnv("AZURE_OPENAI_DEPLOYMENT_NAME_MAP");
  const map = new Map<string, string>();
  if (!raw) return map;

  for (const entry of raw.split(/[\n,;]+/)) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const equalsIdx = trimmed.indexOf("=");
    if (equalsIdx === -1) continue;
    const key = trimmed.slice(0, equalsIdx).trim();
    const value = trimmed.slice(equalsIdx + 1).trim();
    if (key && value) {
      map.set(key, value);
    }
  }

  return map;
}

function requireAzureBaseUrl(): string {
  const baseUrl = readTrimmedEnv("AZURE_OPENAI_BASE_URL");
  if (!baseUrl) {
    throw new Error("AZURE_OPENAI_BASE_URL is not configured.");
  }
  return baseUrl.replace(/\/+$/, "");
}

function requireAzureApiKey(): string {
  const apiKey = getAzureOpenAiApiKey();
  if (!apiKey) {
    throw new Error("AZURE_OPENAI_API_KEY is not configured.");
  }
  return apiKey;
}

function extractErrorMessage(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const err = (data as { error?: unknown }).error;
  if (typeof err === "string" && err.trim()) return err.trim();
  if (err && typeof err === "object" && "message" in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message.trim();
    }
  }
  return null;
}

function extractMessageText(content: unknown): string {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";

  return content
    .map((part) =>
      part && typeof part === "object" && "text" in part
        ? String((part as { text: unknown }).text)
        : ""
    )
    .join("")
    .trim();
}

export function getAzureOpenAiApiKey(): string | null {
  return readTrimmedEnv("AZURE_OPENAI_API_KEY");
}

export function getAzureOpenAiBaseUrl(): string | null {
  return readTrimmedEnv("AZURE_OPENAI_BASE_URL");
}

export function hasAzureOpenAiConfig(): boolean {
  return !!getAzureOpenAiApiKey() && !!getAzureOpenAiBaseUrl();
}

export function getAzureQuickModel(): string {
  return readTrimmedEnv("AZURE_OPENAI_MODEL") || DEFAULT_AZURE_MODEL;
}

export function getAzureTitleModel(): string {
  return (
    readTrimmedEnv("AZURE_OPENAI_TITLE_MODEL") || DEFAULT_AZURE_TITLE_MODEL
  );
}

export function getAzureEmbeddingModel(): string {
  return (
    readTrimmedEnv("AZURE_OPENAI_EMBEDDING_MODEL") ||
    DEFAULT_AZURE_EMBEDDING_MODEL
  );
}

export function getAzureQuickReasoningEffort(): AzureOpenAiReasoningEffort {
  return parseReasoningEffort(
    readTrimmedEnv("AZURE_OPENAI_REASONING_EFFORT"),
    "medium"
  );
}

export function getAzureTitleReasoningEffort(): AzureOpenAiReasoningEffort {
  return parseReasoningEffort(
    readTrimmedEnv("AZURE_OPENAI_TITLE_REASONING_EFFORT"),
    "none"
  );
}

export function getAzureEmbeddingDimensions(): number {
  return parsePositiveInt(
    readTrimmedEnv("AZURE_OPENAI_EMBEDDING_DIMENSIONS"),
    DEFAULT_AZURE_EMBEDDING_DIMENSIONS
  );
}

export function resolveAzureDeploymentName(
  model: string,
  explicitEnvName?: string
): string {
  if (explicitEnvName) {
    const explicitDeployment = readTrimmedEnv(explicitEnvName);
    if (explicitDeployment) return explicitDeployment;
  }

  return parseDeploymentNameMap().get(model) || model;
}

export function buildAzureOpenAiUrl(path: string): string {
  return `${requireAzureBaseUrl()}/${path.replace(/^\/+/, "")}`;
}

export function buildAzureChatCompletionsBody(opts: {
  model: string;
  messages: AzureChatMessage[];
  reasoningEffort?: AzureOpenAiReasoningEffort;
  temperature?: number;
  maxCompletionTokens?: number;
  deploymentEnvName?: string;
}): Record<string, unknown> {
  return {
    model: resolveAzureDeploymentName(opts.model, opts.deploymentEnvName),
    messages: opts.messages,
    ...(opts.reasoningEffort ? { reasoning_effort: opts.reasoningEffort } : {}),
    ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
    ...(opts.maxCompletionTokens !== undefined
      ? { max_completion_tokens: opts.maxCompletionTokens }
      : {}),
  };
}

export async function generateAzureChatText(opts: {
  model: string;
  systemPrompt: string;
  userMessage: string;
  reasoningEffort?: AzureOpenAiReasoningEffort;
  temperature?: number;
  maxCompletionTokens?: number;
  deploymentEnvName?: string;
}): Promise<string> {
  const response = await fetch(buildAzureOpenAiUrl("chat/completions"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireAzureApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      buildAzureChatCompletionsBody({
        model: opts.model,
        messages: [
          { role: "system", content: opts.systemPrompt },
          { role: "user", content: opts.userMessage },
        ],
        reasoningEffort: opts.reasoningEffort,
        temperature: opts.temperature,
        maxCompletionTokens: opts.maxCompletionTokens,
        deploymentEnvName: opts.deploymentEnvName,
      })
    ),
  });

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    if (!response.ok) {
      throw new AzureOpenAiRequestError(
        `Azure OpenAI failed with status ${response.status}.`,
        response.status
      );
    }
    throw new Error("Azure OpenAI returned invalid JSON.");
  }

  if (!response.ok) {
    throw new AzureOpenAiRequestError(
      extractErrorMessage(data) ??
        `Azure OpenAI failed with status ${response.status}.`,
      response.status
    );
  }

  const choices = (data as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new Error("Azure OpenAI returned no choices.");
  }

  const first = choices[0] as { message?: { content?: unknown } };
  const text = extractMessageText(first.message?.content);
  if (!text) {
    throw new Error("Azure OpenAI returned an empty response.");
  }
  return text;
}

export async function generateAzureEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const response = await fetch(buildAzureOpenAiUrl("embeddings"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireAzureApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: resolveAzureDeploymentName(
        getAzureEmbeddingModel(),
        "AZURE_OPENAI_EMBEDDING_DEPLOYMENT"
      ),
      input: texts,
      dimensions: getAzureEmbeddingDimensions(),
    }),
  });

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    if (!response.ok) {
      throw new AzureOpenAiRequestError(
        `Azure embeddings failed with status ${response.status}.`,
        response.status
      );
    }
    throw new Error("Azure embeddings returned invalid JSON.");
  }

  if (!response.ok) {
    throw new AzureOpenAiRequestError(
      extractErrorMessage(data) ??
        `Azure embeddings failed with status ${response.status}.`,
      response.status
    );
  }

  const rows = (data as { data?: Array<{ index: number; embedding: number[] }> }).data;
  if (!Array.isArray(rows)) {
    throw new Error("Azure embeddings returned no vectors.");
  }

  return rows
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((item) => item.embedding);
}
