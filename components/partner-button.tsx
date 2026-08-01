import { track } from "@vercel/analytics";
import { buildPartnerDestinationUrl } from "@/lib/partner-preview";
import type { PartnerPreviewConfig } from "@/lib/partner-preview";

type PartnerButtonProps = {
  config: PartnerPreviewConfig;
  prompt: string;
  placement: "repo-card" | "website-card" | "partner-preview";
};

export function PartnerButton({ config, prompt, placement }: PartnerButtonProps) {
  const href = buildPartnerDestinationUrl(
    config.website,
    prompt,
    config.queryParam
  );

  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${config.label} with your product`}
      onClick={() =>
        track("Partner Preview Click", {
          placement,
          label: config.label,
          hasQueryParam: Boolean(config.queryParam),
        })
      }
      className="group/partner relative inline-flex rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
    >
      <span className="absolute inset-0 translate-x-0.5 translate-y-0.5 rounded bg-zinc-900 transition-transform group-hover/partner:translate-x-px group-hover/partner:translate-y-px" />
      <span className="relative z-10 inline-flex items-center gap-1.5 rounded border-[3px] border-zinc-900 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-900 transition-colors group-hover/partner:bg-zinc-50">
        {config.label}
      </span>
    </a>
  );
}
