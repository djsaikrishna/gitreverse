import { NextRequest, NextResponse } from "next/server";
import {
  ensureProfileReversed,
  type ProfileReverseResult,
} from "@/lib/profile-reverse-engine";
import {
  isValidGitHubProfileLogin,
  normalizeProfileSegment,
  parseGitHubProfileInput,
} from "@/lib/parse-github-profile";
import { readProfileReverse } from "@/lib/profile-reverse-storage";

export const runtime = "nodejs";
export const maxDuration = 300;

const inFlight = new Map<string, Promise<ProfileReverseResult>>();

function encodeSse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

async function executeProfileReverse(opts: {
  login: string;
  stream: boolean;
  force?: boolean;
}): Promise<NextResponse> {
  const { login, stream, force } = opts;

  if (!stream) {
    const existing = inFlight.get(login);
    if (existing) {
      const result = await existing;
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      return NextResponse.json({
        login: result.login,
        displayName: result.displayName,
        avatarUrl: result.avatarUrl,
        prompt: result.prompt,
        fromCache: result.fromCache,
      });
    }

    const promise = ensureProfileReversed({ login, force });
    inFlight.set(login, promise);
    try {
      const result = await promise;
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      return NextResponse.json({
        login: result.login,
        displayName: result.displayName,
        avatarUrl: result.avatarUrl,
        prompt: result.prompt,
        fromCache: result.fromCache,
      });
    } finally {
      inFlight.delete(login);
    }
  }

  const encoder = new TextEncoder();
  const streamBody = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(encodeSse(event, data)));
      };

      try {
        const result = await ensureProfileReversed({
          login,
          force,
          onStatus: (message) => send("status", { message }),
        });

        if (!result.ok) {
          send("error", { error: result.error });
          controller.close();
          return;
        }

        send("done", {
          login: result.login,
          displayName: result.displayName,
          avatarUrl: result.avatarUrl,
          prompt: result.prompt,
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
    profile?: string;
    login?: string;
    stream?: boolean;
    force?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rawInput =
    typeof body.profile === "string"
      ? body.profile
      : typeof body.login === "string"
        ? body.login
        : "";

  const parsed = parseGitHubProfileInput(rawInput);
  if (!parsed) {
    return NextResponse.json(
      {
        error:
          "Enter a GitHub profile like @shadcn or https://github.com/shadcn.",
      },
      { status: 400 }
    );
  }

  return executeProfileReverse({
    login: parsed.login,
    stream: Boolean(body.stream),
    force: Boolean(body.force),
  });
}

export async function GET(request: NextRequest) {
  const loginRaw = request.nextUrl.searchParams.get("login")?.trim();
  if (!loginRaw) {
    return NextResponse.json({ error: "login query param is required." }, { status: 400 });
  }

  const login = normalizeProfileSegment(loginRaw).toLowerCase();
  if (!isValidGitHubProfileLogin(login)) {
    return NextResponse.json({ error: "Invalid GitHub login." }, { status: 400 });
  }

  const cached = await readProfileReverse(login);
  if (!cached) {
    return NextResponse.json({ error: "Not cached." }, { status: 404 });
  }

  return NextResponse.json({
    login: cached.login,
    displayName: cached.displayName,
    avatarUrl: cached.avatarUrl,
    prompt: cached.prompt,
    fromCache: true,
  });
}
