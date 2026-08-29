export const FOOTER_AD_PRICE_CENTS = 79900;
export const FOOTER_AD_PRICE_LABEL = "$799";
export const FOOTER_PAID_SLOT_COUNT = 2;
export const FOOTER_OWNED_SLOT_COUNT = 3;
export const FOOTER_TOTAL_SLOTS =
  FOOTER_OWNED_SLOT_COUNT + FOOTER_PAID_SLOT_COUNT;
export const FOOTER_AD_MAX_WORDS = 4;
export const FOOTER_AD_MAX_WORD_LENGTH = 16;

export type FooterAd = {
  id: string;
  website: string;
  words: string;
  createdAt: string;
};

export type OwnedFooterSlot = {
  id: "coderabbit" | "solo-alliance" | "gitgta" | "github" | "discord" | "x";
  href: string;
  label: string;
  words: string;
  logoSrc?: string;
  logoAlt: string;
  sponsored: boolean;
  icon?: "github" | "discord" | "x";
};

export const OWNED_FOOTER_SLOTS: OwnedFooterSlot[] = [
  {
    id: "coderabbit",
    href: "https://coderabbit.link/filiksyos-destaw",
    label: "CodeRabbit",
    words: "AI code reviews",
    logoSrc: "https://www.coderabbit.ai/images/CR_mark_orange.svg",
    logoAlt: "CodeRabbit",
    sponsored: true,
  },
  {
    id: "solo-alliance",
    href: "https://soloalliance.club",
    label: "Solo Alliance Club",
    words: "Solo founder network",
    logoSrc: "https://www.google.com/s2/favicons?domain=soloalliance.club&sz=64",
    logoAlt: "Solo Alliance Club",
    sponsored: false,
  },
  {
    id: "gitgta",
    href: "https://gitgta.com",
    label: "GitGTA",
    words: "Drive your GitHub",
    logoSrc: "https://www.google.com/s2/favicons?domain=gitgta.com&sz=64",
    logoAlt: "GitGTA",
    sponsored: false,
  },
];

export const COMMUNITY_RAIL_SLOTS: OwnedFooterSlot[] = [
  {
    id: "github",
    href: "https://github.com/filiksyos/gitreverse",
    label: "GitHub",
    words: "Star the repo",
    logoAlt: "GitHub",
    sponsored: false,
    icon: "github",
  },
  {
    id: "discord",
    href: "https://discord.gg/AYnCD68WCr",
    label: "Discord",
    words: "Join the community",
    logoAlt: "Discord",
    sponsored: false,
    icon: "discord",
  },
  {
    id: "x",
    href: "https://x.com/filiksyos",
    label: "X",
    words: "Product updates",
    logoAlt: "X",
    sponsored: false,
    icon: "x",
  },
];

export function normalizeAdWebsite(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    if (!url.hostname.includes(".")) return null;
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function normalizeAdWords(value: string): string | null {
  const words = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.replace(/[^\p{L}\p{N}'+-]/gu, ""))
    .filter(Boolean);
  if (words.length === 0 || words.length > FOOTER_AD_MAX_WORDS) return null;
  if (words.some((word) => word.length > FOOTER_AD_MAX_WORD_LENGTH)) return null;
  return words.join(" ");
}

export function countAdWords(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

export function hostnameOf(website: string): string {
  try {
    return new URL(website).hostname.replace(/^www\./, "");
  } catch {
    return website;
  }
}

export function faviconForWebsite(website: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostnameOf(website))}&sz=64`;
}

export function coerceFooterAd(value: unknown): FooterAd | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const id = typeof raw.id === "string" ? raw.id : null;
  const website =
    typeof raw.website === "string"
      ? raw.website
      : typeof raw.ad_website === "string"
        ? raw.ad_website
        : null;
  const words =
    typeof raw.words === "string"
      ? raw.words
      : typeof raw.ad_words === "string"
        ? raw.ad_words
        : null;
  const createdAt =
    typeof raw.created_at === "string"
      ? raw.created_at
      : typeof raw.createdAt === "string"
        ? raw.createdAt
        : new Date().toISOString();
  if (!id || !website || !words) return null;
  return { id, website, words, createdAt };
}
