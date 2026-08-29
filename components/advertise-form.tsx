"use client";

import { useState, type ReactNode } from "react";
import {
  countAdWords,
  FOOTER_AD_MAX_WORDS,
  FOOTER_AD_PRICE_LABEL,
} from "@/lib/footer-ads";

function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-sm font-bold text-zinc-900"
    >
      {children}
    </label>
  );
}

function inputClassName() {
  return "block w-full rounded-lg border-[2.5px] border-zinc-900 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:opacity-60";
}

export function AdvertiseForm({
  soldOut = false,
  onSuccessRedirect,
}: {
  soldOut?: boolean;
  onSuccessRedirect?: string;
}) {
  const [website, setWebsite] = useState("");
  const [words, setWords] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wordCount = countAdWords(words);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (soldOut) return;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/create-ad-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ website, words }),
      });
      const data = (await res.json()) as { url?: string; message?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.message || "Could not start checkout.");
      }
      if (onSuccessRedirect) {
        try {
          sessionStorage.setItem("gr_ad_return", onSuccessRedirect);
        } catch {
          /* ignore */
        }
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout.");
      setLoading(false);
    }
  }

  if (soldOut) {
    return (
      <div className="rounded-lg border-[2.5px] border-zinc-900 bg-[#fff4da] px-4 py-4 text-sm text-zinc-700">
        <p className="font-bold text-zinc-900">Both slots are taken</p>
        <p className="mt-1">
          Email{" "}
          <a
            href="mailto:fili@gitreverse.com"
            className="font-semibold text-zinc-900 underline decoration-zinc-400 underline-offset-2"
          >
            fili@gitreverse.com
          </a>{" "}
          if you want the next opening.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5 text-left">
      <div>
        <FieldLabel htmlFor="ad-website">Your website</FieldLabel>
        <input
          id="ad-website"
          type="text"
          inputMode="url"
          autoComplete="url"
          required
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="yourproduct.com"
          className={inputClassName()}
          disabled={loading}
        />
      </div>

      <div>
        <FieldLabel htmlFor="ad-words">Ad copy</FieldLabel>
        <input
          id="ad-words"
          type="text"
          required
          value={words}
          onChange={(e) => setWords(e.target.value)}
          placeholder="Ship faster with us"
          className={inputClassName()}
          disabled={loading}
          aria-describedby="ad-words-hint"
        />
        <p id="ad-words-hint" className="mt-1.5 text-xs text-zinc-500">
          {wordCount}/{FOOTER_AD_MAX_WORDS} words. Keep it very short.
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-[#fff4da] px-4 py-3 text-sm text-zinc-700">
        <p className="font-semibold text-zinc-900">
          {FOOTER_AD_PRICE_LABEL} · one-time
        </p>
        <p className="mt-1">
          Your footer slot goes live immediately after payment.
        </p>
      </div>

      {error ? (
        <p className="text-sm font-semibold text-[#d31611]" role="alert">
          {error}
        </p>
      ) : null}

      <div className="group relative">
        <div className="absolute inset-0 translate-x-1 translate-y-1 rounded-lg bg-zinc-900 transition-transform group-hover:translate-x-0.5 group-hover:translate-y-0.5" />
        <button
          type="submit"
          disabled={loading}
          className="relative z-10 w-full rounded-lg border-[3px] border-zinc-900 bg-[#d31611] px-5 py-3 text-sm font-bold text-white transition-transform group-hover:-translate-x-px group-hover:-translate-y-px disabled:pointer-events-none disabled:opacity-70"
        >
          {loading
            ? "Redirecting to checkout…"
            : `Advertise — ${FOOTER_AD_PRICE_LABEL}`}
        </button>
      </div>
    </form>
  );
}
