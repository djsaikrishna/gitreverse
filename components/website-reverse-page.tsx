"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

const FLAVOR_LINES = [
  "Opening site in browser",
  "Extracting styles and layout",
  "Writing design.md",
  "Building reverse prompt",
  "Almost there",
];

type WebsiteReversePageProps = {
  siteSlug: string;
  targetUrl: string;
  designPath: string;
};

export function WebsiteReversePage({
  siteSlug,
  targetUrl,
  designPath,
}: WebsiteReversePageProps) {
  const [prompt, setPrompt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusLine, setStatusLine] = useState(FLAVOR_LINES[0]);
  const [copied, setCopied] = useState(false);
  const [localDesignPath, setLocalDesignPath] = useState<string | null>(null);
  const started = useRef(false);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPrompt(null);
    setLocalDesignPath(null);
    setStatusLine(FLAVOR_LINES[0]);

    try {
      const res = await fetch("/api/reverse-website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteSlug,
          targetUrl,
          stream: true,
        }),
      });

      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const data = (await res.json()) as {
          prompt?: string;
          fromCache?: boolean;
          designPath?: string;
          localDesignPath?: string;
          error?: string;
        };
        if (!res.ok || data.error) {
          throw new Error(data.error ?? `Request failed (${res.status})`);
        }
        if (data.prompt) {
          setPrompt(data.prompt);
          if (data.localDesignPath) setLocalDesignPath(data.localDesignPath);
          if (data.fromCache) setStatusLine("Loaded from local cache");
        } else {
          throw new Error("No prompt returned.");
        }
        return;
      }

      if (!res.ok || !res.body) {
        throw new Error(`Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });

        for (;;) {
          const idx = buf.indexOf("\n\n");
          if (idx < 0) break;
          const block = buf.slice(0, idx);
          buf = buf.slice(idx + 2);

          const eventLine = block.split("\n").find((l) => l.startsWith("event: "));
          const dataLine = block.split("\n").find((l) => l.startsWith("data: "));
          if (!eventLine || !dataLine) continue;

          const event = eventLine.slice(7).trim();
          try {
            const json = JSON.parse(dataLine.slice(5).trim()) as {
              message?: string;
              prompt?: string;
              designPath?: string;
              localDesignPath?: string;
              error?: string;
            };

            if (event === "status" && typeof json.message === "string") {
              setStatusLine(json.message);
            }
            if (event === "done" && typeof json.prompt === "string") {
              setPrompt(json.prompt);
              if (json.localDesignPath) setLocalDesignPath(json.localDesignPath);
            }
            if (event === "error" && typeof json.error === "string") {
              throw new Error(json.error);
            }
          } catch (e) {
            if (e instanceof Error && e.message !== "Unexpected end of JSON input") {
              throw e;
            }
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [siteSlug, targetUrl]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void run();
  }, [run]);

  const copyPrompt = async () => {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-5 py-10 sm:px-8">
      <header className="mb-8 border-b border-zinc-200 pb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Website reverse (test)
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
          {siteSlug}
        </h1>
        <a
          href={targetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block text-sm text-zinc-600 underline-offset-2 hover:underline"
        >
          {targetUrl}
        </a>
      </header>

      {loading && !prompt && !error ? (
        <p className="text-sm text-zinc-600" role="status" aria-live="polite">
          {statusLine}…
        </p>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
          <button
            type="button"
            onClick={() => void run()}
            className="ml-3 underline"
          >
            Retry
          </button>
        </div>
      ) : null}

      {prompt ? (
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void copyPrompt()}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              {copied ? "Copied" : "Copy prompt"}
            </button>
            <a
              href={designPath}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
            >
              View design.md
            </a>
            <a
              href={designPath}
              download="design.md"
              className="text-sm text-zinc-600 underline-offset-2 hover:underline"
            >
              Download design.md
            </a>
          </div>

          {localDesignPath ? (
            <p className="text-xs text-zinc-500">
              Local file:{" "}
              <code className="rounded bg-zinc-100 px-1 py-0.5">{localDesignPath}</code>
            </p>
          ) : null}

          <article className="prose prose-zinc max-w-none rounded-lg border border-zinc-200 bg-white p-5 text-sm leading-relaxed">
            <ReactMarkdown>{prompt}</ReactMarkdown>
          </article>
        </div>
      ) : null}
    </main>
  );
}
