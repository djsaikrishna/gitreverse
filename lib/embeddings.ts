import {
  AzureOpenAiRequestError,
  generateAzureEmbeddings,
  getAzureEmbeddingDimensions,
  getAzureEmbeddingModel,
  hasAzureOpenAiConfig,
} from "@/lib/azure-openai";

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 512;

export type EmbeddingInput = {
  owner: string;
  repo: string;
  prompt: string;
};

export function embeddingText({ owner, repo, prompt }: EmbeddingInput): string {
  return `${owner}/${repo}\n${prompt}`;
}

export function getOpenAiApiKey(): string | null {
  const key = process.env.OPENAI_API_KEY?.trim();
  return key || null;
}

export function hasEmbeddingProvider(): boolean {
  return hasAzureOpenAiConfig() || !!getOpenAiApiKey();
}

function shouldFallbackToOpenAiEmbeddings(error: unknown): boolean {
  if (!(error instanceof AzureOpenAiRequestError)) return false;
  if (error.status === 404) return true;
  if (error.status !== 400) return false;

  const lower = error.message.toLowerCase();
  return (
    lower.includes("deployment") ||
    lower.includes("model") ||
    lower.includes("not found")
  );
}

async function embedTextsWithOpenAi(texts: string[]): Promise<number[][]> {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    throw new Error(
      "No embedding provider configured. Set Azure embeddings or OPENAI_API_KEY as a fallback."
    );
  }

  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts,
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI embeddings failed (${res.status}): ${body}`);
  }

  const json = (await res.json()) as {
    data: Array<{ index: number; embedding: number[] }>;
  };

  return json.data
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((item) => item.embedding);
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  if (hasAzureOpenAiConfig()) {
    try {
      return await generateAzureEmbeddings(texts);
    } catch (error) {
      if (getOpenAiApiKey() && shouldFallbackToOpenAiEmbeddings(error)) {
        console.warn(
          "[embeddings] Azure embedding deployment unavailable; falling back to OpenAI."
        );
        return embedTextsWithOpenAi(texts);
      }
      throw error;
    }
  }

  if (!getOpenAiApiKey()) {
    throw new Error(
      "No embedding provider configured. Set Azure embeddings or OPENAI_API_KEY as a fallback."
    );
  }

  return embedTextsWithOpenAi(texts);
}

export async function embedText(text: string): Promise<number[]> {
  const [embedding] = await embedTexts([text]);
  if (!embedding) {
    throw new Error("Embedding provider returned no vector.");
  }
  return embedding;
}

export async function embedPromptEntry(input: EmbeddingInput): Promise<number[]> {
  return embedText(embeddingText(input));
}

export {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  getAzureEmbeddingDimensions,
  getAzureEmbeddingModel,
};
