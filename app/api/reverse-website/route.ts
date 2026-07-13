import { NextRequest, NextResponse } from "next/server";
import { isValidWebsiteSlug, parseWebsiteInput } from "@/lib/parse-website-input";
import { callQuickLlm, resolveLlmTarget } from "@/lib/quick-llm";
import { websiteDesignApiUrl } from "@/lib/site-url";
import { buildWebsiteDesignSystemPrompt } from "@/lib/website-design-system-prompt";
import { WEBSITE_REVERSE_SYSTEM_PROMPT } from "@/lib/website-reverse-system-prompt";
import {
  evidenceStatusMessage,
  gatherWebsiteEvidence,
  type WebsiteEvidence,
} from "@/lib/website-scraper";
import {
  designApiPath,
  readWebsiteReverse,
  writeWebsiteReverse,
} from "@/lib/website-reverse-storage";

export const runtime = "nodejs";
export const maxDuration = 300;

const ROUTE_TIMEOUT_MS = 240_000;
const inFlight = new Map<string, Promise<WebsiteReverseResult>>();

type WebsiteReverseResult =
  | {
      ok: true;
      prompt: string;
      designPath: string;
      fromCache: boolean;
    }
  | { ok: false; error: string; status: number };

function encodeSse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function appendDesignSystemLink(prompt: string, slug: string): string {
  const link = websiteDesignApiUrl(slug);
  const suffix = `Use this design system for the visuals: ${link}`;
  if (prompt.includes(suffix)) return prompt;
  return `${prompt.trimEnd()}\n\n${suffix}`;
}

function buildDesignUserMessage(opts: {
  targetUrl: string;
  evidence: WebsiteEvidence;
}): string {
  const lines: string[] = [
    `# Target website`,
    ``,
    `URL: ${opts.targetUrl}`,
    opts.evidence.title ? `Title: ${opts.evidence.title}` : "",
    ``,
    `Evidence source: ${opts.evidence.source}`,
    ``,
  ];

  if (opts.evidence.source === "firecrawl" && opts.evidence.branding) {
    lines.push(
      `## Firecrawl branding JSON`,
      ``,
      "```json",
      JSON.stringify(opts.evidence.branding, null, 2),
      "```",
      ``
    );
  }

  if (opts.evidence.source === "context-dev") {
    if (opts.evidence.styleguide) {
      lines.push(
        `## Context.dev styleguide JSON`,
        ``,
        "```json",
        JSON.stringify(opts.evidence.styleguide, null, 2),
        "```",
        ``
      );
    }
    if (opts.evidence.brand) {
      lines.push(
        `## Context.dev brand JSON`,
        ``,
        "```json",
        JSON.stringify(opts.evidence.brand, null, 2),
        "```",
        ``
      );
    }
  }

  if (opts.evidence.screenshotUrl) {
    lines.push(`## Screenshot URL`, ``, opts.evidence.screenshotUrl, ``);
  }

  lines.push(`## Page markdown`, ``, opts.evidence.markdown || "*(empty)*");

  return lines
    .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
    .join("\n");
}

function buildReversePromptUserMessage(opts: {
  targetUrl: string;
  evidence: WebsiteEvidence;
  designMd: string;
}): string {
  const designSummary =
    opts.designMd.length > 2500
      ? `${opts.designMd.slice(0, 2500)}\n\n… (design.md truncated)`
      : opts.designMd;

  const tokenPayload =
    opts.evidence.source === "firecrawl"
      ? opts.evidence.branding
      : {
          styleguide: opts.evidence.styleguide,
          brand: opts.evidence.brand,
        };

  return [
    `# Target website`,
    ``,
    `URL: ${opts.targetUrl}`,
    opts.evidence.title ? `Title: ${opts.evidence.title}` : "",
    ``,
    `Evidence source: ${opts.evidence.source}`,
    ``,
    `## Design tokens JSON`,
    ``,
    "```json",
    JSON.stringify(tokenPayload, null, 2),
    "```",
    ``,
    opts.evidence.screenshotUrl
      ? `Screenshot URL: ${opts.evidence.screenshotUrl}\n`
      : "",
    `## Page markdown excerpt`,
    ``,
    opts.evidence.markdown.slice(0, 4000) || "*(empty)*",
    ``,
    `## Design system summary`,
    ``,
    designSummary,
  ]
    .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
    .join("\n");
}

async function runWebsiteReverse(opts: {
  slug: string;
  targetUrl: string;
  onStatus?: (message: string) => void;
  force?: boolean;
}): Promise<WebsiteReverseResult> {
  const { slug, targetUrl, onStatus, force } = opts;

  if (!force) {
    const cached = await readWebsiteReverse(slug);
    if (cached) {
      return {
        ok: true,
        prompt: cached.meta.prompt,
        designPath: designApiPath(slug),
        fromCache: true,
      };
    }
  }

  const llm = resolveLlmTarget();
  if ("error" in llm) {
    return { ok: false, error: llm.error, status: 500 };
  }

  onStatus?.("Visiting site");
  let evidence: WebsiteEvidence;
  try {
    evidence = await gatherWebsiteEvidence(targetUrl);
    onStatus?.(evidenceStatusMessage(evidence.source));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg, status: 502 };
  }

  onStatus?.("Understanding design");
  onStatus?.("Writing design.md");
  const designResult = await callQuickLlm(
    llm,
    buildWebsiteDesignSystemPrompt(),
    buildDesignUserMessage({
      targetUrl,
      evidence,
    }),
    12_000
  );
  if (!designResult.ok) {
    return { ok: false, error: designResult.error, status: designResult.status };
  }

  onStatus?.("Reverse engineering prompt");
  const promptResult = await callQuickLlm(
    llm,
    WEBSITE_REVERSE_SYSTEM_PROMPT,
    buildReversePromptUserMessage({
      targetUrl,
      evidence,
      designMd: designResult.text,
    }),
    4096
  );
  if (!promptResult.ok) {
    return { ok: false, error: promptResult.error, status: promptResult.status };
  }

  const finalPrompt = appendDesignSystemLink(promptResult.text, slug);

  try {
    await writeWebsiteReverse({
      slug,
      targetUrl,
      designMd: designResult.text,
      prompt: finalPrompt,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      error: `Failed to save cache: ${msg}`,
      status: 500,
    };
  }

  return {
    ok: true,
    prompt: finalPrompt,
    designPath: designApiPath(slug),
    fromCache: false,
  };
}

async function executeWebsiteReverse(opts: {
  slug: string;
  targetUrl: string;
  stream: boolean;
  force?: boolean;
}): Promise<NextResponse> {
  const { slug, targetUrl, stream, force } = opts;

  if (!stream) {
    const existing = inFlight.get(slug);
    if (existing) {
      const result = await existing;
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      return NextResponse.json({
        prompt: result.prompt,
        designPath: result.designPath,
        fromCache: result.fromCache,
      });
    }

    const promise = runWebsiteReverse({ slug, targetUrl, force });
    inFlight.set(slug, promise);
    try {
      const result = await promise;
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      return NextResponse.json({
        prompt: result.prompt,
        designPath: result.designPath,
        fromCache: result.fromCache,
      });
    } finally {
      inFlight.delete(slug);
    }
  }

  const encoder = new TextEncoder();
  const streamBody = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(encodeSse(event, data)));
      };

      try {
        const result = await runWebsiteReverse({
          slug,
          targetUrl,
          force,
          onStatus: (message) => send("status", { message }),
        });

        if (!result.ok) {
          send("error", { error: result.error });
          controller.close();
          return;
        }

        send("done", {
          prompt: result.prompt,
          designPath: result.designPath,
          fromCache: result.fromCache,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        send("error", { error: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(streamBody, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function POST(request: NextRequest) {
  let body: {
    siteSlug?: string;
    targetUrl?: string;
    stream?: boolean;
    force?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const siteSlug = body.siteSlug?.trim().toLowerCase();
  if (!siteSlug || !isValidWebsiteSlug(siteSlug)) {
    return NextResponse.json(
      { error: "siteSlug is required and must be a valid slug." },
      { status: 400 }
    );
  }

  let targetUrl = body.targetUrl?.trim();
  if (!targetUrl) {
    const cached = await readWebsiteReverse(siteSlug);
    if (cached?.meta.targetUrl) {
      targetUrl = cached.meta.targetUrl;
    }
  }

  if (!targetUrl) {
    return NextResponse.json(
      { error: "targetUrl is required for the first run." },
      { status: 400 }
    );
  }

  const parsed = parseWebsiteInput(targetUrl);
  if (!parsed) {
    return NextResponse.json(
      {
        error:
          "Could not parse website URL. Use https://example.com or example.com.",
      },
      { status: 400 }
    );
  }

  const timer = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("__timeout__")), ROUTE_TIMEOUT_MS)
  );

  try {
    return await Promise.race([
      executeWebsiteReverse({
        slug: siteSlug,
        targetUrl: parsed.url,
        stream: body.stream === true,
        force: body.force === true,
      }),
      timer,
    ]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "__timeout__") {
      return NextResponse.json(
        { error: "Website reverse timed out. Try again." },
        { status: 504 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
