"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";

type ButtonLabelType = "design_this" | "build_this" | "custom";

const BUTTON_OPTIONS: {
  value: ButtonLabelType;
  label: string;
  example?: string;
}[] = [
  { value: "design_this", label: "Design This", example: "Design This" },
  { value: "build_this", label: "Build This", example: "Build This" },
  { value: "custom", label: "Custom", example: "Review This" },
];

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

function inputClassName(disabled = false) {
  return `block w-full rounded-lg border-[2.5px] border-zinc-900 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:opacity-60 ${disabled ? "" : ""}`;
}

export function PartnerCheckoutForm() {
  const [website, setWebsite] = useState("");
  const [email, setEmail] = useState("");
  const [buttonLabelType, setButtonLabelType] =
    useState<ButtonLabelType>("design_this");
  const [customButtonLabel, setCustomButtonLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/create-partner-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          website,
          email,
          buttonLabelType,
          customButtonLabel:
            buttonLabelType === "custom" ? customButtonLabel : undefined,
        }),
      });

      const data = (await res.json()) as { url?: string; message?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.message || "Could not start checkout.");
      }

      window.location.href = data.url;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not start checkout."
      );
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5 text-left">
      <div>
        <FieldLabel htmlFor="partner-website">Your website</FieldLabel>
        <input
          id="partner-website"
          type="text"
          inputMode="url"
          autoComplete="url"
          required
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="yourcompany.com"
          className={inputClassName(loading)}
          disabled={loading}
        />
      </div>

      <div>
        <FieldLabel htmlFor="partner-email">Your email</FieldLabel>
        <input
          id="partner-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className={inputClassName(loading)}
          disabled={loading}
        />
      </div>

      <fieldset>
        <legend className="mb-2 block text-sm font-bold text-zinc-900">
          Button label
        </legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {BUTTON_OPTIONS.map((option) => {
            const selected = buttonLabelType === option.value;
            return (
              <label
                key={option.value}
                className={`relative cursor-pointer rounded-lg border-[2.5px] px-3 py-3 transition-colors ${
                  selected
                    ? "border-zinc-900 bg-[#ffc480]"
                    : "border-zinc-300 bg-white hover:border-zinc-900"
                }`}
              >
                <input
                  type="radio"
                  name="button-label"
                  value={option.value}
                  checked={selected}
                  onChange={() => setButtonLabelType(option.value)}
                  className="sr-only"
                  disabled={loading}
                />
                <span className="block text-sm font-bold text-zinc-900">
                  {option.label}
                </span>
                {option.example ? (
                  <span className="mt-0.5 block text-xs text-zinc-600">
                    e.g. {option.example}
                  </span>
                ) : null}
              </label>
            );
          })}
        </div>
      </fieldset>

      {buttonLabelType === "custom" ? (
        <div>
          <FieldLabel htmlFor="partner-custom-label">Custom button text</FieldLabel>
          <input
            id="partner-custom-label"
            type="text"
            required
            value={customButtonLabel}
            onChange={(e) => setCustomButtonLabel(e.target.value)}
            placeholder="Review This"
            maxLength={40}
            className={inputClassName(loading)}
            disabled={loading}
          />
        </div>
      ) : null}

      <div className="rounded-lg border border-zinc-200 bg-[#fff4da] px-4 py-3 text-sm text-zinc-700">
        <p className="font-semibold text-zinc-900">$999 / month</p>
        <ul className="mt-2 space-y-1.5">
          <li>Your button goes live within 24 hours of payment.</li>
          <li>
            You&apos;ll receive partnership updates and performance reports by
            email.
          </li>
          <li>
            We&apos;ll also post about the partnership on{" "}
            <Link
              href="https://x.com/filiksyos"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-zinc-900 underline decoration-zinc-400 underline-offset-2"
            >
              X
            </Link>{" "}
            to promote it.
          </li>
        </ul>
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
          {loading ? "Redirecting to checkout…" : "Checkout — $999/month"}
        </button>
      </div>

      <p className="text-center text-sm text-zinc-600">
        Questions? Email{" "}
        <a
          href="mailto:fili@gitreverse.com"
          className="font-semibold text-zinc-900 underline decoration-zinc-400 underline-offset-2"
        >
          fili@gitreverse.com
        </a>{" "}
        or DM{" "}
        <Link
          href="https://x.com/filiksyos"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-zinc-900 underline decoration-zinc-400 underline-offset-2"
        >
          @filiksyos on X
        </Link>
        .
      </p>
    </form>
  );
}
