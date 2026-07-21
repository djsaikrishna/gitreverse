"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { track } from "@vercel/analytics";
import { Navbar } from "@/components/navbar";
import { PromptMarkdown } from "@/components/prompt-markdown";
import { SiteAutocompleteInput } from "@/components/site-autocomplete-input";
import { parseWebsiteInput, urlToSlug } from "@/lib/parse-website-input";
import { hostLabelFromUrl } from "@/lib/website-swap-system-prompt";

type DesignSwapResultProps = {
  contentSlug: string;
  styleSlug: string;
  contentUrl: string;
  styleUrl: string;
};

export function DesignSwapResult({
  contentSlug,
  styleSlug,
  contentUrl,
  styleUrl,
}: DesignSwapResultProps) {
  const router = useRouter();
  const [currentContentUrl, setCurrentContentUrl] = useState(contentUrl);
  const [currentStyleUrl, setCurrentStyleUrl] = useState(styleUrl);
  const [currentContentSlug, setCurrentContentSlug] = useState(contentSlug);
  const [currentStyleSlug, setCurrentStyleSlug] = useState(styleSlug);

  const [prompt, setPrompt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusLine, setStatusLine] = useState("Checking if it's cached…");
  const [copied, setCopied] = useState(false);
  const started = useRef(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const contentHost = hostLabelFromUrl(currentContentUrl, currentContentSlug);
  const styleHost = hostLabelFromUrl(currentStyleUrl, currentStyleSlug);

  const run = useCallback(
    async (cSlug: string, cUrl: string, sSlug: string, sUrl: string) => {
      setLoading(true);
      setError(null);
      setPrompt(null);
      setStatusLine("Checking if it's cached…");

      try {
        const res = await fetch("/api/design-swap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contentSlug: cSlug,
            contentUrl: cUrl,
            styleSlug: sSlug,
            styleUrl: sUrl,
            stream: true,
          }),
        });

        const contentType = res.headers.get("content-type") ?? "";
        if (contentType.includes("application/json")) {
          const data = (await res.json()) as {
            prompt?: string;
            fromCache?: boolean;
            error?: string;
          };
          if (!res.ok || data.error) {
            throw new Error(data.error ?? `Request failed (${res.status})`);
          }
          if (data.prompt) {
            setPrompt(data.prompt);
            if (data.fromCache) setStatusLine("Loaded from cache");
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
                fromCache?: boolean;
                error?: string;
              };

              if (event === "status" && typeof json.message === "string") {
                setStatusLine(json.message);
              }
              if (event === "done" && typeof json.prompt === "string") {
                setPrompt(json.prompt);
                if (json.fromCache) setStatusLine("Loaded from cache");
              }
              if (event === "error" && typeof json.error === "string") {
                throw new Error(json.error);
              }
            } catch (e) {
              if (
                e instanceof Error &&
                e.message !== "Unexpected end of JSON input"
              ) {
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
    },
    []
  );

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void run(contentSlug, contentUrl, styleSlug, styleUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (prompt && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [prompt]);

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

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    const contentParsed = parseWebsiteInput(currentContentUrl.trim());
    const styleParsed = parseWebsiteInput(currentStyleUrl.trim());

    if (!contentParsed || !styleParsed) {
      setError("Could not parse website URLs.");
      return;
    }

    const cSlug = urlToSlug(contentParsed.hostname);
    const sSlug = urlToSlug(styleParsed.hostname);
    setCurrentContentSlug(cSlug);
    setCurrentStyleSlug(sSlug);
    setCurrentContentUrl(contentParsed.url);
    setCurrentStyleUrl(styleParsed.url);
    router.replace(
      `/designswap/${encodeURIComponent(cSlug)}/${encodeURIComponent(sSlug)}?contentUrl=${encodeURIComponent(contentParsed.url)}&styleUrl=${encodeURIComponent(styleParsed.url)}`,
      { scroll: false }
    );
    void run(cSlug, contentParsed.url, sSlug, styleParsed.url);
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#FFFDF8] text-zinc-900">
      <Navbar />

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center gap-12 px-4 py-12 sm:px-6">
        <h1 className="sr-only">{`${contentHost} in ${styleHost} style`}</h1>

        <div className="flex w-full max-w-2xl flex-col gap-3">
          <div className="relative w-full">
            <div className="absolute inset-0 translate-x-2 translate-y-2 rounded-xl bg-zinc-900" />
            <form
              onSubmit={onSubmit}
              className="relative z-10 rounded-xl border-[3px] border-zinc-900 bg-[#fff4da] p-6"
            >
              <div className="flex flex-col gap-3">
                <SiteAutocompleteInput
                  id="content-site"
                  aria-label="Content site"
                  value={currentContentUrl}
                  onChange={setCurrentContentUrl}
                  placeholder="https://pinterest.com"
                  required
                  readOnly
                />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                  <SiteAutocompleteInput
                    id="style-site"
                    aria-label="Style site"
                    value={currentStyleUrl}
                    onChange={setCurrentStyleUrl}
                    placeholder="https://vercel.com"
                    required
                  />
                  <div className="group relative w-full shrink-0 sm:w-auto">
                    <div className="absolute inset-0 translate-x-1 translate-y-1 rounded bg-zinc-800" />
                    <button
                      type="submit"
                      disabled={loading}
                      aria-busy={loading}
                      className={`relative z-10 flex w-full items-center justify-center gap-2 rounded border-[3px] border-zinc-900 px-6 py-3 font-medium text-white transition-transform group-hover:-translate-x-px group-hover:-translate-y-px disabled:pointer-events-none sm:min-w-[10rem] ${
                        loading ? "bg-[#b5120e]" : "bg-[#d31611]"
                      }`}
                    >
                      {loading ? (
                        <>
                          <svg
                            className="h-5 w-5 shrink-0 animate-spin text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            aria-hidden
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          <span>Processing…</span>
                        </>
                      ) : (
                        "Get Prompt"
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {loading && !prompt && !error ? (
                <p
                  className="mt-4 min-h-[1.25rem] text-sm text-zinc-600"
                  role="status"
                  aria-live="polite"
                >
                  {statusLine}…
                </p>
              ) : null}

              {error ? (
                <div
                  className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800"
                  role="alert"
                >
                  {error}
                  <button
                    type="button"
                    onClick={() =>
                      void run(
                        currentContentSlug,
                        currentContentUrl,
                        currentStyleSlug,
                        currentStyleUrl
                      )
                    }
                    className="ml-3 font-medium underline"
                  >
                    Retry
                  </button>
                </div>
              ) : null}
            </form>
          </div>
        </div>

        {prompt ? (
          <div
            ref={resultsRef}
            data-results
            className="relative w-full max-w-2xl scroll-mt-24"
          >
            <div className="absolute inset-0 translate-x-2 translate-y-2 rounded-xl bg-zinc-900" />
            <section className="relative z-10 rounded-xl border-[3px] border-zinc-900 bg-[#fafafa] p-6">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-zinc-700">
                  Reverse engineered prompt
                </h2>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  <a
                    href={`https://lovable.dev/?prompt=${encodeURIComponent(prompt)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Build in Lovable"
                    onClick={() =>
                      track("Design Swap Build Click", {
                        destination: "lovable.dev",
                      })
                    }
                    className="group/build relative inline-flex rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
                  >
                    <span className="absolute inset-0 translate-x-0.5 translate-y-0.5 rounded bg-zinc-900 transition-transform group-hover/build:translate-x-px group-hover/build:translate-y-px" />
                    <span className="relative z-10 inline-flex items-center gap-1.5 rounded border-[3px] border-zinc-900 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-900 transition-colors group-hover/build:bg-zinc-50">
                      Build in Lovable
                    </span>
                  </a>
                  <div className="group relative">
                    <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 rounded bg-zinc-900" />
                    <button
                      type="button"
                      onClick={() => void copyPrompt()}
                      className="relative z-10 rounded border-[3px] border-zinc-900 bg-[#ffc480] px-3 py-1.5 text-xs font-medium text-zinc-900 transition-transform group-hover:-translate-x-px group-hover:-translate-y-px"
                    >
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>
              <div className="max-h-[min(70vh,32rem)] overflow-auto rounded-lg border border-zinc-200 bg-white p-4 text-sm leading-relaxed text-zinc-800">
                <PromptMarkdown>{prompt}</PromptMarkdown>
              </div>
            </section>
          </div>
        ) : null}
      </main>
    </div>
  );
}
