"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { SiteAutocompleteInput } from "@/components/site-autocomplete-input";
import { parseWebsiteInput, urlToSlug } from "@/lib/parse-website-input";

type DesignSwapHomeProps = {
  initialContentUrl?: string;
};

export function DesignSwapHome({ initialContentUrl = "" }: DesignSwapHomeProps) {
  const router = useRouter();
  const [contentUrl, setContentUrl] = useState(initialContentUrl);
  const [styleUrl, setStyleUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialContentUrl) setContentUrl(initialContentUrl);
  }, [initialContentUrl]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);

    const contentParsed = parseWebsiteInput(contentUrl.trim());
    const styleParsed = parseWebsiteInput(styleUrl.trim());

    if (!contentParsed) {
      setError("Could not parse website URL. Use https://example.com or example.com.");
      return;
    }
    if (!styleParsed) {
      setError("Could not parse style URL. Use https://example.com or example.com.");
      return;
    }
    if (contentParsed.hostname === styleParsed.hostname) {
      setError("Pick two different sites.");
      return;
    }

    const contentSlug = urlToSlug(contentParsed.hostname);
    const styleSlug = urlToSlug(styleParsed.hostname);
    setLoading(true);
    router.push(
      `/designswap/${encodeURIComponent(contentSlug)}/${encodeURIComponent(styleSlug)}?contentUrl=${encodeURIComponent(contentParsed.url)}&styleUrl=${encodeURIComponent(styleParsed.url)}`
    );
  }

  const contentLocked = Boolean(initialContentUrl);

  return (
    <div className="flex min-h-screen flex-col bg-[#FFFDF8] text-zinc-900">
      <Navbar />

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center gap-12 px-4 py-12 sm:px-6">
        <h1 className="sr-only">Design swap</h1>

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
                  value={contentUrl}
                  onChange={setContentUrl}
                  placeholder="https://pinterest.com"
                  required
                  readOnly={contentLocked}
                />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                  <SiteAutocompleteInput
                    id="style-site"
                    aria-label="Style site"
                    value={styleUrl}
                    onChange={setStyleUrl}
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

              {error ? (
                <div
                  className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800"
                  role="alert"
                >
                  {error}
                </div>
              ) : null}
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
