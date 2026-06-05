"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

export const SPONSOR_EMAIL = "fili@gitreverse.com";
export const SPONSOR_MAILTO = `mailto:${SPONSOR_EMAIL}?subject=GitReverse%20Sponsorship`;
function IconMail({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

function IconCopy({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconArrowUpRight({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M7 17L17 7" />
      <path d="M7 7h10v10" />
    </svg>
  );
}

type SponsorEmailActionsProps = {
  className?: string;
};

export function SponsorEmailActions({ className = "" }: SponsorEmailActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(SPONSOR_EMAIL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.location.href = SPONSOR_MAILTO;
    }
  }, []);

  return (
    <div
      className={`flex flex-col flex-wrap gap-3 sm:flex-row ${className}`.trim()}
    >
      <span className="relative isolate inline-flex w-full sm:w-auto">
        <span
          className="pointer-events-none absolute inset-0 rounded-md bg-zinc-900"
          style={{ transform: "translate(3px,3px)" }}
          aria-hidden
        />
        <Link
          href={SPONSOR_MAILTO}
          className="relative inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-md border-[2.5px] border-zinc-900 bg-[#d31611] px-5 py-3 text-sm font-bold text-white transition-transform hover:-translate-x-px hover:-translate-y-px sm:w-auto"
        >
          <IconMail className="h-4 w-4 shrink-0" />
          Email Fili to sponsor
          <IconArrowUpRight className="h-4 w-4 shrink-0" />
        </Link>
      </span>
      <span className="relative isolate inline-flex w-full sm:w-auto">
        <span
          className="pointer-events-none absolute inset-0 rounded-md bg-zinc-900"
          style={{ transform: "translate(3px,3px)" }}
          aria-hidden
        />
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="relative inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-md border-[2.5px] border-zinc-900 bg-[#fff4da] px-5 py-3 text-sm font-bold text-zinc-900 transition-transform hover:-translate-x-px hover:-translate-y-px sm:w-auto"
        >
          {copied ? (
            <IconCheck className="h-4 w-4 shrink-0" />
          ) : (
            <IconCopy className="h-4 w-4 shrink-0" />
          )}
          {copied ? "Copied email" : "Copy email"}
        </button>
      </span>
    </div>
  );
}