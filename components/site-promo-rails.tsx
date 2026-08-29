"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { track } from "@vercel/analytics";
import { AdvertiseModal } from "@/components/advertise-modal";
import {
  COMMUNITY_RAIL_SLOTS,
  faviconForWebsite,
  FOOTER_PAID_SLOT_COUNT,
  hostnameOf,
  OWNED_FOOTER_SLOTS,
  type FooterAd,
  type OwnedFooterSlot,
} from "@/lib/footer-ads";

function IconGithub() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function IconDiscord() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function IconX() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.725-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}

function RailMark({
  slot,
  logoSrc,
}: {
  slot?: Pick<OwnedFooterSlot, "icon" | "logoAlt">;
  logoSrc?: string;
}) {
  if (slot?.icon === "github") return <IconGithub />;
  if (slot?.icon === "discord") return <IconDiscord />;
  if (slot?.icon === "x") return <IconX />;
  if (logoSrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoSrc}
        alt=""
        width={20}
        height={20}
        className="h-5 w-5 shrink-0 rounded-sm"
        aria-hidden
      />
    );
  }
  return (
    <span
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border border-zinc-900 bg-[#fff4da] text-[10px] font-extrabold"
      aria-hidden
    >
      +
    </span>
  );
}

function RailCard({
  href,
  logoSrc,
  label,
  words,
  sponsored,
  icon,
  onClick,
}: {
  href?: string;
  logoSrc?: string;
  label: string;
  words: string;
  sponsored?: boolean;
  icon?: OwnedFooterSlot["icon"];
  onClick?: () => void;
}) {
  const inner = (
    <>
      <div className="absolute inset-0 translate-x-1 translate-y-1 rounded-xl bg-zinc-900" />
      <div className="relative z-10 flex min-h-[4.75rem] flex-col justify-between rounded-xl border-[3px] border-zinc-900 bg-white p-3 transition-transform group-hover:-translate-x-px group-hover:-translate-y-px">
        <div className="flex items-center gap-2">
          <RailMark slot={icon ? { icon, logoAlt: label } : undefined} logoSrc={logoSrc} />
          <p className="truncate text-sm font-extrabold tracking-tight text-zinc-900">
            {label}
          </p>
        </div>
        <p className="mt-2 line-clamp-2 text-xs leading-snug text-zinc-500">
          {words}
        </p>
      </div>
    </>
  );

  const className = "group relative block w-full text-left";

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {inner}
      </button>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel={sponsored ? "sponsored noopener noreferrer" : "noopener noreferrer"}
      className={className}
      onClick={() =>
        track("Footer Ad Click", {
          label,
          href: href ?? "",
        })
      }
    >
      {inner}
      {sponsored ? (
        <span className="sr-only">Sponsored — opens in a new tab</span>
      ) : null}
    </a>
  );
}

function RailColumn({
  side,
  children,
}: {
  side: "left" | "right";
  children: ReactNode;
}) {
  return (
    <aside
      className={`pointer-events-none fixed top-20 z-30 hidden w-[176px] flex-col gap-3 xl:flex ${
        side === "left" ? "left-4" : "right-4"
      }`}
      aria-label={side === "left" ? "Featured links" : "More links"}
    >
      <div className="pointer-events-auto flex flex-col gap-3">{children}</div>
    </aside>
  );
}

export function SitePromoRails() {
  const pathname = usePathname();
  const [ads, setAds] = useState<FooterAd[]>([]);
  const [soldOut, setSoldOut] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const loadAds = useCallback(async () => {
    try {
      const res = await fetch("/api/footer-ads");
      const data = (await res.json()) as {
        ads?: FooterAd[];
        soldOut?: boolean;
      };
      setAds(
        Array.isArray(data.ads) ? data.ads.slice(0, FOOTER_PAID_SLOT_COUNT) : []
      );
      setSoldOut(Boolean(data.soldOut));
    } catch {
      setAds([]);
    }
  }, []);

  useEffect(() => {
    void loadAds();
  }, [loadAds]);

  const openAdvertise = useCallback(() => setModalOpen(true), []);
  const remaining = Math.max(0, FOOTER_PAID_SLOT_COUNT - ads.length);
  const [adLeft, adRight] = ads;

  if (pathname?.startsWith("/auth/")) return null;

  const github = COMMUNITY_RAIL_SLOTS[0]!;
  const discord = COMMUNITY_RAIL_SLOTS[1]!;
  const x = COMMUNITY_RAIL_SLOTS[2]!;

  return (
    <>
      <RailColumn side="left">
        <RailCard {...OWNED_FOOTER_SLOTS[0]!} />
        <RailCard {...OWNED_FOOTER_SLOTS[1]!} />
        <RailCard {...github} />
        {adLeft ? (
          <RailCard
            href={adLeft.website}
            logoSrc={faviconForWebsite(adLeft.website)}
            label={adLeft.words}
            words={hostnameOf(adLeft.website)}
          />
        ) : (
          <RailCard
            label="Advertise"
            words="Your brand here"
            onClick={openAdvertise}
          />
        )}
      </RailColumn>

      <RailColumn side="right">
        <RailCard {...OWNED_FOOTER_SLOTS[2]!} />
        <RailCard {...discord} />
        <RailCard {...x} />
        {adRight ? (
          <RailCard
            href={adRight.website}
            logoSrc={faviconForWebsite(adRight.website)}
            label={adRight.words}
            words={hostnameOf(adRight.website)}
          />
        ) : remaining > 0 ? (
          <RailCard
            label="Advertise"
            words="Your brand here"
            onClick={openAdvertise}
          />
        ) : null}
      </RailColumn>

      <AdvertiseModal
        open={modalOpen}
        soldOut={soldOut}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
