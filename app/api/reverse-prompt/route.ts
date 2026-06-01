import { NextRequest, NextResponse } from "next/server";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";
import { getFileTree, getReadme, getRepoMeta } from "@/lib/github-client";
import { formatAsFilteredTree } from "@/lib/file-tree-formatter";
import { parseGitHubRepoInput } from "@/lib/parse-github-repo";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

const README_MAX_CHARS = 8000;
const DEFAULT_CUSTOM_REVERSE_URL = "http://localhost:3001";

function getServiceUrl(): string {
  return (
    process.env.CUSTOM_REVERSE_SERVICE_URL?.trim() || DEFAULT_CUSTOM_REVERSE_URL
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

async function parseSseStreamForDonePersist(
  body: ReadableStream<Uint8Array>,
  owner: string,
  repo: string
): Promise<void> {
  const reader = body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      for (;;) {
        const idx = buf.indexOf("\n\n");
        if (idx < 0) break;
        const block = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        if (!block.includes("event: done")) continue;
        const dataLine = block
          .split("\n")
          .find((l) => l.startsWith("data: "));
        if (!dataLine) continue;
        try {
          const json = JSON.parse(dataLine.slice(5).trim()) as {
            prompt?: string;
          };
          if (typeof json.prompt === "string" && json.prompt) {
            persistPromptCache(owner, repo, json.prompt);
          }
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // ignore
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // ignore
    }
  }
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

  const agentMessage = [
    SYSTEM_PROMPT.trim(),
    "",
    "---",
    "",
    userContent.trim(),
  ].join("\n");

  const base = getServiceUrl().replace(/\/$/, "");
  let upstream: Response;
  try {
    upstream = await fetch(`${base}/prompt/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: agentMessage }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        error: `Generation service unreachable (${msg}). Check CUSTOM_REVERSE_SERVICE_URL and that custom_reverse is running.`,
      },
      { status: 503 }
    );
  }

  if (!upstream.ok) {
    let err = `Request failed (${upstream.status})`;
    try {
      const j = (await upstream.json()) as { error?: string };
      if (j.error) err = j.error;
    } catch {
      // ignore
    }
    return NextResponse.json(
      { error: err },
      {
        status:
          upstream.status >= 400 && upstream.status < 600
            ? upstream.status
            : 502,
      }
    );
  }

  if (!upstream.body) {
    return NextResponse.json(
      { error: "Generation service returned an empty body." },
      { status: 502 }
    );
  }

  const [toClient, toParse] = upstream.body.tee();
  void parseSseStreamForDonePersist(toParse, owner, repo);

  return new Response(toClient, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
