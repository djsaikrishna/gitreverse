"use client";

import { useCallback, useState } from "react";

const CONTACT_EMAIL = "fili@gitreverse.com";

function IconMail({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

export function FooterEmailLink() {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — address still visible in title */
    }
  }, []);

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className="inline-flex items-center gap-1.5 font-medium text-zinc-700 underline decoration-zinc-400 underline-offset-2 transition-colors hover:text-zinc-900"
      title={copied ? "Copied!" : `Copy ${CONTACT_EMAIL}`}
      aria-label={
        copied ? "Email address copied" : `Copy email address ${CONTACT_EMAIL}`
      }
    >
      <IconMail className="h-4 w-4 shrink-0" />
      {copied ? "Copied!" : "Email"}
    </button>
  );
}
