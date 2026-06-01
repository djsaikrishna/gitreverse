import { NextRequest, NextResponse } from "next/server";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";
import { getFileTree, getReadme, getRepoMeta } from "@/lib/github-client";
import { formatAsFilteredTree } from "@/lib/file-tree-formatter";
import { parseGitHubRepoInput } from "@/lib/parse-github-repo";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

const README_MAX_CHARS = 8000;
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-4.1";

function writeSse(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  event: string,
  data: unknown
): void {
  controller.enqueue(
    encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  );
}

function buildUserMessage(
  owner: string,
  repo: string,
  meta: Awaited<ReturnType<typeof getRepoMeta>>,
  depth1Tree: string,
  readme: string,
  truncatedTree: boolean
): string {
  const topicsLine =
    meta.topics.length > 0 ? `\n**Topics:** ${meta.topics.join(", ")}` : "";
  const readmeBody = readme
    ? readme.length > README_MAX_CHARS
      ? `${readme.slice(0, README_MAX_CHARS)}\n\n… (README truncated)`
      : readme
    : "*(No README or empty)*";

  return [
    `# Repository: ${owner}/${repo}`,
    "",
    `**Description:** ${meta.description ?? "*(none)*"}`,
    `**Primary language:** ${meta.language ?? "*(unknown)*"}`,
    `**Stars:** ${meta.stargazers_count}`,
    `**Default branch:** ${meta.default_branch}`,
    topicsLine,
    truncatedTree ? "\n**Note:** Full repository tree was truncated by GitHub." : "",
    "",
    "## Root file tree (depth 1)",
    "",
    "```",
    depth1Tree,
    "```",
    "",
    "## README",
    "",
    readmeBody,
  ].join("\n");
}

function persistPromptCache(owner: string, repo: string, prompt: string): void {
  const sb = getSupabase();
  if (!sb) return;
  void sb
    .from("prompt_cache")
    .upsert(
      {
        owner,
        repo,
        prompt,
        cached_at: new Date().toISOString(),
      },
      { onConflict: "owner,repo" }
    )
    .then(async ({ error: upsertError }) => {
      if (upsertError) {
        console.error("[reverse-prompt] cache upsert:", upsertError.message);
        return;
      }
      try {
        const { updatePromptEmbedding } = await import(
          "@/lib/prompt-cache-embedding"
        );
        await updatePromptEmbedding(sb, { owner, repo, prompt });
      } catch (embedError) {
        console.error(
          "[reverse-prompt] cache embedding:",
          embedError instanceof Error ? embedError.message : embedError
        );
      }
      try {
        const { updatePromptTitle } = await import("@/lib/prompt-cache-title");
        await updatePromptTitle(sb, { owner, repo, prompt });
      } catch (titleError) {
        console.error(
          "[reverse-prompt] cache title:",
          titleError instanceof Error ? titleError.message : titleError
        );
      }
    });
}

function isExhaustedCreditsOrQuotaMessage(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    lower.includes("insufficient_quota") ||
    lower.includes("rate_limit_exceeded") ||
    lower.includes("exceeded your current quota") ||
    lower.includes("billing has not been enabled")
  );
}

function extractOpenAiErrorMessage(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const err = (data as { error?: unknown }).error;
  if (typeof err === "string" && err.trim()) return err.trim();
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string" && m.trim()) return m.trim();
  }
  return null;
}

async function streamPromptFromOpenAi(opts: {
  userContent: string;
  owner: string;
  repo: string;
  controller: ReadableStreamDefaultController<Uint8Array>;
  encoder: TextEncoder;
}): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    writeSse(opts.controller, opts.encoder, "error", {
      error: "OPENAI_API_KEY is not configured.",
    });
    return;
  }

  let openAiRes: Response;
  try {
    openAiRes = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        stream: true,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: opts.userContent },
        ],
      }),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    writeSse(opts.controller, opts.encoder, "error", {
      error: `Generation failed: ${message}`,
    });
    return;
  }

  if (!openAiRes.ok) {
    let msg = `OpenAI error ${openAiRes.status}`;
    try {
      const data = await openAiRes.json();
      msg = extractOpenAiErrorMessage(data) ?? msg;
    } catch {
      // ignore
    }

    if (
      openAiRes.status === 429 ||
      openAiRes.status === 402 ||
      isExhaustedCreditsOrQuotaMessage(msg)
    ) {
      writeSse(opts.controller, opts.encoder, "error", {
        error: "Service is currently over capacity. Try again later.",
      });
      return;
    }

    const isAuth =
      openAiRes.status === 401 ||
      msg.toLowerCase().includes("unauthorized") ||
      msg.toLowerCase().includes("invalid api key");
    writeSse(opts.controller, opts.encoder, "error", {
      error: isAuth
        ? "OpenAI authentication failed. Check OPENAI_API_KEY in .env.local."
        : `Generation failed: ${msg}`,
    });
    return;
  }

  if (!openAiRes.body) {
    writeSse(opts.controller, opts.encoder, "error", {
      error: "OpenAI returned an empty body.",
    });
    return;
  }

  const reader = openAiRes.body.getReader();
  const dec = new TextDecoder();
  let buffer = "";
  let fullPrompt = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += dec.decode(value, { stream: true });

      for (;;) {
        const lineEnd = buffer.indexOf("\n");
        if (lineEnd < 0) break;
        const line = buffer.slice(0, lineEnd).trim();
        buffer = buffer.slice(lineEnd + 1);
        if (!line.startsWith("data:")) continue;

        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;

        try {
          const json = JSON.parse(payload) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const chunk = json.choices?.[0]?.delta?.content;
          if (typeof chunk === "string" && chunk) {
            fullPrompt += chunk;
            writeSse(opts.controller, opts.encoder, "token", { chunk });
          }
        } catch {
          // ignore malformed chunk
        }
      }
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    writeSse(opts.controller, opts.encoder, "error", {
      error: `Generation stream failed: ${message}`,
    });
    return;
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // ignore
    }
  }

  const prompt = fullPrompt.trim();
  if (!prompt) {
    writeSse(opts.controller, opts.encoder, "error", {
      error: "Model did not return a usable text response.",
    });
    return;
  }

  persistPromptCache(opts.owner, opts.repo, prompt);
  writeSse(opts.controller, opts.encoder, "done", { prompt });
}

export async function POST(request: NextRequest) {
  let body: { repoUrl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const repoUrl = body.repoUrl;
  if (typeof repoUrl !== "string") {
    return NextResponse.json(
      { error: "repoUrl is required (string)" },
      { status: 400 }
    );
  }

  const parsed = parseGitHubRepoInput(repoUrl);
  if (!parsed) {
    return NextResponse.json(
      {
        error:
          "Could not parse a GitHub repo. Use a URL like https://github.com/owner/repo or owner/repo.",
      },
      { status: 400 }
    );
  }

  const { owner, repo } = parsed;

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("prompt_cache")
        .select("prompt")
        .eq("owner", owner)
        .eq("repo", repo)
        .maybeSingle();
      if (!error && data?.prompt) {
        return NextResponse.json({
          prompt: data.prompt as string,
          fromCache: true,
        });
      }
    } catch {
      // cache miss — continue
    }
  }

  let meta: Awaited<ReturnType<typeof getRepoMeta>>;
  try {
    meta = await getRepoMeta(owner, repo);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.toLowerCase().includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }

  const branch = meta.default_branch;

  let tree: { tree: Array<{ path: string; type: string }>; truncated: boolean };
  let readme: string;
  try {
    [tree, readme] = await Promise.all([
      getFileTree(owner, repo, branch),
      getReadme(owner, repo, branch),
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.toLowerCase().includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }

  const depth1Tree = formatAsFilteredTree(
    tree.tree,
    `${owner}/${repo}`,
    undefined,
    1
  );

  const userContent = buildUserMessage(
    owner,
    repo,
    meta,
    depth1Tree,
    readme,
    tree.truncated
  );

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        await streamPromptFromOpenAi({
          userContent,
          owner,
          repo,
          controller,
          encoder,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        writeSse(controller, encoder, "error", {
          error: `Generation failed: ${msg}`,
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
