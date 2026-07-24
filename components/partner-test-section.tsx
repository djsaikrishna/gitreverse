"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import {
  buildPartnerDestinationUrl,
  buildPartnerRepoTestUrl,
  buildPartnerWebsiteTestUrl,
  normalizePartnerWebsite,
  resolvePartnerButtonLabel,
  type PartnerButtonLabelType,
  type PartnerPreviewConfig,
} from "@/lib/partner-preview";

const BUTTON_OPTIONS: {
  value: PartnerButtonLabelType;
  label: string;
  example?: string;
}[] = [
  { value: "design_this", label: "Design This", example: "Design This" },
  { value: "build_this", label: "Build This", example: "Build This" },
  { value: "custom", label: "Custom", example: "Review This" },
];

const SAMPLE_PROMPT =
  "Build a modern dashboard with a sidebar, analytics cards, and a dark mode toggle.";

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
  return "block w-full rounded-lg border-[2.5px] border-zinc-900 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400";
}

function PreviewButton({ label }: { label: string }) {
  return (
    <span className="relative inline-flex shrink-0 rounded">
      <span className="absolute inset-0 translate-x-0.5 translate-y-0.5 rounded bg-zinc-900" />
      <span className="relative z-10 inline-flex items-center rounded border-[3px] border-zinc-900 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-900">
        {label}
      </span>
    </span>
  );
}

export function PartnerTestSection() {
  const [website, setWebsite] = useState("");
  const [queryParam, setQueryParam] = useState("");
  const [buttonLabelType, setButtonLabelType] =
    useState<PartnerButtonLabelType>("build_this");
  const [customButtonLabel, setCustomButtonLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [tested, setTested] = useState(false);

  const buttonLabel = useMemo(
    () => resolvePartnerButtonLabel(buttonLabelType, customButtonLabel),
    [buttonLabelType, customButtonLabel]
  );

  const previewConfig = useMemo((): PartnerPreviewConfig | null => {
    const normalized = normalizePartnerWebsite(website);
    if (!normalized || !buttonLabel) return null;
    return {
      website: normalized,
      label: buttonLabel,
      queryParam: queryParam.trim() || undefined,
    };
  }, [website, buttonLabel, queryParam]);

  const destinationPreview = useMemo(() => {
    if (!previewConfig) return null;
    return buildPartnerDestinationUrl(
      previewConfig.website,
      SAMPLE_PROMPT,
      previewConfig.queryParam
    );
  }, [previewConfig]);

  function validateConfig(): PartnerPreviewConfig | null {
    setError(null);
    const normalized = normalizePartnerWebsite(website);
    if (!normalized) {
      setError("Enter a valid website URL.");
      return null;
    }
    if (!buttonLabel) {
      setError("Choose a button label (2–40 characters for custom).");
      return null;
    }
    return {
      website: normalized,
      label: buttonLabel,
      queryParam: queryParam.trim() || undefined,
    };
  }

  function openTest(buildUrl: (config: PartnerPreviewConfig) => string) {
    const config = validateConfig();
    if (!config) return;
    setTested(true);
    window.open(buildUrl(config), "_blank", "noopener,noreferrer");
  }

  return (
    <section className="flex flex-col items-center gap-4" id="partner-test">
      <div className="w-full max-w-xl text-center">
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          Test your placement
        </h2>
        <p className="mt-2 text-zinc-600">
          See how your button looks on real GitReverse results before you pay.
        </p>
        <p className="mt-3 text-sm font-semibold text-zinc-900">
          Estimated high-intent visitors to your site:{" "}
          <span className="text-[#d31611]">2,500–3,500 per month</span>
        </p>
      </div>

      <div className="relative w-full max-w-xl">
        <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-xl bg-zinc-900" />
        <div className="relative z-10 rounded-xl border-[3px] border-zinc-900 bg-white px-6 py-8">
          <div className="space-y-5 text-left">
            <div>
              <FieldLabel htmlFor="test-website">Your website</FieldLabel>
              <input
                id="test-website"
                type="text"
                inputMode="url"
                autoComplete="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="yourcompany.com"
                className={inputClassName()}
              />
            </div>

            <div>
              <FieldLabel htmlFor="test-query-param">
                Prompt query param{" "}
                <span className="font-normal text-zinc-500">(optional)</span>
              </FieldLabel>
              <input
                id="test-query-param"
                type="text"
                value={queryParam}
                onChange={(e) => setQueryParam(e.target.value)}
                placeholder="prompt, q, or leave empty"
                className={inputClassName()}
              />
              <p className="mt-1.5 text-xs text-zinc-500">
                If set, we append the reverse-engineered prompt as{" "}
                <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono">
                  ?{queryParam.trim() || "prompt"}=…
                </code>
                . Leave empty to send visitors straight to your landing page.
              </p>
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
                        name="test-button-label"
                        value={option.value}
                        checked={selected}
                        onChange={() => setButtonLabelType(option.value)}
                        className="sr-only"
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
                <FieldLabel htmlFor="test-custom-label">
                  Custom button text
                </FieldLabel>
                <input
                  id="test-custom-label"
                  type="text"
                  value={customButtonLabel}
                  onChange={(e) => setCustomButtonLabel(e.target.value)}
                  placeholder="Review This"
                  maxLength={40}
                  className={inputClassName()}
                />
              </div>
            ) : null}

            {previewConfig && buttonLabel ? (
              <div className="rounded-lg border border-zinc-200 bg-[#fafafa] p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Preview
                </p>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-zinc-700">
                    Reverse engineered prompt
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <PreviewButton label={buttonLabel} />
                    <span className="rounded border-[3px] border-zinc-900 bg-[#ffc480] px-3 py-1.5 text-xs font-medium text-zinc-900">
                      Copy
                    </span>
                  </div>
                </div>
                {destinationPreview ? (
                  <p className="mt-3 break-all text-xs text-zinc-500">
                    Clicks go to:{" "}
                    <span className="font-mono text-zinc-700">
                      {destinationPreview}
                    </span>
                  </p>
                ) : null}
              </div>
            ) : null}

            {error ? (
              <p className="text-sm font-semibold text-[#d31611]" role="alert">
                {error}
              </p>
            ) : null}

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="group relative">
                <div className="absolute inset-0 translate-x-1 translate-y-1 rounded-lg bg-zinc-900 transition-transform group-hover:translate-x-0.5 group-hover:translate-y-0.5" />
                <button
                  type="button"
                  onClick={() => openTest(buildPartnerRepoTestUrl)}
                  className="relative z-10 w-full rounded-lg border-[3px] border-zinc-900 bg-white px-4 py-3 text-sm font-bold text-zinc-900 transition-transform group-hover:-translate-x-px group-hover:-translate-y-px"
                >
                  Test with repo
                </button>
              </div>
              <div className="group relative">
                <div className="absolute inset-0 translate-x-1 translate-y-1 rounded-lg bg-zinc-900 transition-transform group-hover:translate-x-0.5 group-hover:translate-y-0.5" />
                <button
                  type="button"
                  onClick={() => openTest(buildPartnerWebsiteTestUrl)}
                  className="relative z-10 w-full rounded-lg border-[3px] border-zinc-900 bg-white px-4 py-3 text-sm font-bold text-zinc-900 transition-transform group-hover:-translate-x-px group-hover:-translate-y-px"
                >
                  Test with website
                </button>
              </div>
            </div>

            <p className="text-center text-xs text-zinc-500">
              Repo test uses{" "}
              <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono">
                openclaw/openclaw
              </code>
              . Website test uses{" "}
              <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono">
                pinterest.com
              </code>
              .
            </p>

            {tested ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                <p className="font-semibold">Like what you see?</p>
                <p className="mt-1">
                  Upgrade below to go live on GitReverse within 24 hours.
                </p>
                <Link
                  href="#partner-checkout"
                  className="mt-2 inline-flex font-semibold text-emerald-900 underline decoration-emerald-400 underline-offset-2"
                >
                  Upgrade — $999/month
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
