import { track } from "@vercel/analytics";

const AEOS_URL = "https://tryaeos.com/";

type AeosBannerProps = {
  className?: string;
  embedded?: boolean;
  placement?: "website-card" | "design-card" | "home-card";
};

const COPY = {
  "website-card": {
    title: "You reversed the site — now make AI recommend it",
    subtitle: "AEOS audits how ChatGPT, Gemini & Perplexity see your site.",
  },
  "design-card": {
    title: "You reversed the site — now make AI recommend it",
    subtitle: "AEOS audits how ChatGPT, Gemini & Perplexity see your site.",
  },
  "home-card": {
    title: "Make AI recommend your site",
    subtitle: "AEOS audits how ChatGPT, Gemini & Perplexity see your site.",
  },
} as const;

export function AeosBanner({
  className,
  embedded = false,
  placement = "website-card",
}: AeosBannerProps) {
  const copy = COPY[placement];
  const content = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/aeos-icon.png"
        alt=""
        width={32}
        height={32}
        className={`shrink-0 rounded ${embedded ? "h-7 w-7" : "h-8 w-8"}`}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p
          className={`font-semibold text-zinc-900 ${embedded ? "text-xs" : "text-sm"}`}
        >
          {copy.title}
        </p>
        <p
          className={`text-zinc-600 ${embedded ? "text-[11px]" : "text-xs"}`}
        >
          {copy.subtitle}
        </p>
      </div>
      <span
        className={`shrink-0 rounded border-[2px] border-zinc-900 bg-zinc-900 font-semibold text-white ${
          embedded ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs"
        }`}
      >
        Analyze free
      </span>
    </>
  );

  const trackClick = () =>
    track("AEOS Click", {
      placement,
    });

  if (embedded) {
    return (
      <a
        href={AEOS_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={trackClick}
        className={`group flex items-center gap-3 rounded-lg border-[2px] border-zinc-900/15 bg-white/70 px-3 py-2.5 transition-colors hover:bg-white ${className ?? ""}`}
      >
        {content}
        <span className="sr-only">Opens AEOS in a new tab</span>
      </a>
    );
  }

  return (
    <a
      href={AEOS_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={trackClick}
      className={`group relative mt-4 block ${className ?? ""}`}
    >
      <div className="absolute inset-0 translate-x-1 translate-y-1 rounded-lg bg-zinc-900" />
      <div className="relative z-10 flex items-center gap-3 rounded-lg border-[3px] border-zinc-900 bg-white px-4 py-3 transition-transform group-hover:-translate-x-px group-hover:-translate-y-px">
        {content}
      </div>
      <span className="sr-only">Opens AEOS in a new tab</span>
    </a>
  );
}
