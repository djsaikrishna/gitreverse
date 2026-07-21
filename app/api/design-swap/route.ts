import { NextRequest, NextResponse } from "next/server";
import { isValidWebsiteSlug, parseWebsiteInput } from "@/lib/parse-website-input";
import { callQuickLlm } from "@/lib/quick-llm";
import { resolveSwapLlmTarget } from "@/lib/swap-llm";
import {
  appendDesignSystemLink,
  stripDesignSystemLink,
} from "@/lib/website-prompt-utils";
import { ensureWebsiteReversed } from "@/lib/website-reverse-engine";
import { designApiPath } from "@/lib/website-reverse-storage";
import {
  readWebsiteSwap,
  writeWebsiteSwap,
} from "@/lib/website-swap-storage";
import {
  buildSwapUserMessage,
  hostLabelFromUrl,
  WEBSITE_SWAP_SYSTEM_PROMPT,
} from "@/lib/website-swap-system-prompt";

export const runtime = "nodejs";
export const maxDuration = 300;

const ROUTE_TIMEOUT_MS = 240_000;

type DesignSwapResult =
  | {
      ok: true;
      prompt: string;
      contentDesignPath: string;
      styleDesignPath: string;
      fromCache: boolean;
    }
  | { ok: false; error: string; status: number };

const inFlight = new Map<string, Promise<DesignSwapResult>>();

function swapKey(contentSlug: string, styleSlug: string): string {
  return `${contentSlug}::${styleSlug}`;
}

function encodeSse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

async function runDesignSwap(opts: {
  contentSlug: string;
  contentUrl: string;
  styleSlug: string;
  styleUrl: string;
  onStatus?: (message: string) => void;
  force?: boolean;
}): Promise<DesignSwapResult> {
  const { contentSlug, contentUrl, styleSlug, styleUrl, onStatus, force } =
    opts;

  if (!force) {
    const cached = await readWebsiteSwap(contentSlug, styleSlug);
    if (cached) {
      return {
        ok: true,
        prompt: cached.meta.prompt,
        contentDesignPath: designApiPath(contentSlug),
        styleDesignPath: designApiPath(styleSlug),
        fromCache: true,
      };
    }
  }

  const contentHost = hostLabelFromUrl(contentUrl, contentSlug);
  const styleHost = hostLabelFromUrl(styleUrl, styleSlug);

  onStatus?.(`Reversing ${contentHost}`);
  const contentResult = await ensureWebsiteReversed({
    slug: contentSlug,
    targetUrl: contentUrl,
    onStatus,
  });
  if (!contentResult.ok) {
    return contentResult;
  }

  onStatus?.(`Reversing ${styleHost}`);
  const styleResult = await ensureWebsiteReversed({
    slug: styleSlug,
    targetUrl: styleUrl,
    onStatus,
  });
  if (!styleResult.ok) {
    return styleResult;
  }

  onStatus?.("Blending styles");
  const llm = resolveSwapLlmTarget();
  if ("error" in llm) {
    return { ok: false, error: llm.error, status: 500 };
  }

  const swapResult = await callQuickLlm(
    llm,
    WEBSITE_SWAP_SYSTEM_PROMPT,
    buildSwapUserMessage({
      contentHost,
      styleHost,
      contentPrompt: stripDesignSystemLink(contentResult.prompt),
      stylePrompt: stripDesignSystemLink(styleResult.prompt),
    }),
    2048
  );
  if (!swapResult.ok) {
    return { ok: false, error: swapResult.error, status: swapResult.status };
  }

  const finalPrompt = appendDesignSystemLink(swapResult.text, styleSlug);

  try {
    await writeWebsiteSwap({
      contentSlug,
      styleSlug,
      contentUrl,
      styleUrl,
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
    contentDesignPath: designApiPath(contentSlug),
    styleDesignPath: designApiPath(styleSlug),
    fromCache: false,
  };
}

async function executeDesignSwap(opts: {
  contentSlug: string;
  contentUrl: string;
  styleSlug: string;
  styleUrl: string;
  stream: boolean;
  force?: boolean;
}): Promise<NextResponse> {
  const { contentSlug, contentUrl, styleSlug, styleUrl, stream, force } = opts;
  const key = swapKey(contentSlug, styleSlug);

  if (!stream) {
    const existing = inFlight.get(key);
    if (existing) {
      const result = await existing;
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      return NextResponse.json({
        prompt: result.prompt,
        contentDesignPath: result.contentDesignPath,
        styleDesignPath: result.styleDesignPath,
        fromCache: result.fromCache,
      });
    }

    const promise = runDesignSwap({
      contentSlug,
      contentUrl,
      styleSlug,
      styleUrl,
      force,
    });
    inFlight.set(key, promise);
    try {
      const result = await promise;
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      return NextResponse.json({
        prompt: result.prompt,
        contentDesignPath: result.contentDesignPath,
        styleDesignPath: result.styleDesignPath,
        fromCache: result.fromCache,
      });
    } finally {
      inFlight.delete(key);
    }
  }

  const encoder = new TextEncoder();
  const streamBody = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(encodeSse(event, data)));
      };

      try {
        const result = await runDesignSwap({
          contentSlug,
          contentUrl,
          styleSlug,
          styleUrl,
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
          contentDesignPath: result.contentDesignPath,
          styleDesignPath: result.styleDesignPath,
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
    contentSlug?: string;
    contentUrl?: string;
    styleSlug?: string;
    styleUrl?: string;
    stream?: boolean;
    force?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const contentSlug = body.contentSlug?.trim().toLowerCase();
  const styleSlug = body.styleSlug?.trim().toLowerCase();

  if (!contentSlug || !isValidWebsiteSlug(contentSlug)) {
    return NextResponse.json(
      { error: "contentSlug is required and must be a valid slug." },
      { status: 400 }
    );
  }
  if (!styleSlug || !isValidWebsiteSlug(styleSlug)) {
    return NextResponse.json(
      { error: "styleSlug is required and must be a valid slug." },
      { status: 400 }
    );
  }

  let contentUrl = body.contentUrl?.trim();
  let styleUrl = body.styleUrl?.trim();

  if (!contentUrl) {
    const cached = await readWebsiteSwap(contentSlug, styleSlug);
    if (cached?.meta.contentUrl) {
      contentUrl = cached.meta.contentUrl;
    }
  }
  if (!styleUrl) {
    const cached = await readWebsiteSwap(contentSlug, styleSlug);
    if (cached?.meta.styleUrl) {
      styleUrl = cached.meta.styleUrl;
    }
  }

  if (!contentUrl || !styleUrl) {
    return NextResponse.json(
      { error: "contentUrl and styleUrl are required for the first run." },
      { status: 400 }
    );
  }

  const parsedContent = parseWebsiteInput(contentUrl);
  const parsedStyle = parseWebsiteInput(styleUrl);
  if (!parsedContent || !parsedStyle) {
    return NextResponse.json(
      {
        error:
          "Could not parse website URLs. Use https://example.com or example.com.",
      },
      { status: 400 }
    );
  }

  const timer = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("__timeout__")), ROUTE_TIMEOUT_MS)
  );

  try {
    return await Promise.race([
      executeDesignSwap({
        contentSlug,
        contentUrl: parsedContent.url,
        styleSlug,
        styleUrl: parsedStyle.url,
        stream: body.stream === true,
        force: body.force === true,
      }),
      timer,
    ]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "__timeout__") {
      return NextResponse.json(
        { error: "Design swap timed out. Try again." },
        { status: 504 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
