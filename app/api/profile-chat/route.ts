import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { ensureProfileReversed } from "@/lib/profile-reverse-engine";
import { resolveAiSdkModel } from "@/lib/ai-sdk-model";
import { isValidXProfileHandle } from "@/lib/parse-x-profile";

export const maxDuration = 60;

const MAX_MESSAGES = 12;
const MAX_MESSAGE_CHARS = 2000;

function normalizeLogin(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const login = raw.trim().toLowerCase();
  return isValidXProfileHandle(login) ? login : null;
}

function capMessages(messages: UIMessage[]): UIMessage[] {
  return messages.slice(-MAX_MESSAGES);
}

function hasValidLatestUserMessage(messages: UIMessage[]): boolean {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) return false;

  const text = lastUser.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("")
    .trim();

  return text.length > 0 && text.length <= MAX_MESSAGE_CHARS;
}

export async function POST(req: Request) {
  let body: { messages?: UIMessage[]; login?: string };
  try {
    body = (await req.json()) as { messages?: UIMessage[]; login?: string };
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const login = normalizeLogin(body.login);
  if (!login) {
    return Response.json({ error: "Invalid X profile handle." }, { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? capMessages(body.messages) : [];
  if (messages.length === 0 || !hasValidLatestUserMessage(messages)) {
    return Response.json(
      { error: "Send a non-empty message (max 2000 characters)." },
      { status: 400 }
    );
  }

  const persona = await ensureProfileReversed({ login });
  if (!persona.ok) {
    return Response.json({ error: persona.error }, { status: persona.status });
  }

  const resolved = resolveAiSdkModel();
  if ("error" in resolved) {
    return Response.json({ error: resolved.error }, { status: 500 });
  }

  const result = streamText({
    model: resolved.model,
    system: persona.prompt,
    messages: await convertToModelMessages(messages),
    abortSignal: req.signal,
    maxOutputTokens: 1024,
    ...(resolved.reasoningEffort
      ? {
          providerOptions: {
            [resolved.providerName]: {
              reasoningEffort: resolved.reasoningEffort,
            },
          },
        }
      : {}),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
