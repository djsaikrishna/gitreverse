export type PartnerPreviewConfig = {
  website: string;
  label: string;
  queryParam?: string;
};

export type PartnerButtonLabelType = "design_this" | "build_this" | "custom";

export const PARTNER_BUTTON_LABELS: Record<
  Exclude<PartnerButtonLabelType, "custom">,
  string
> = {
  design_this: "Design This",
  build_this: "Build This",
};

export function normalizePartnerWebsite(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function resolvePartnerButtonLabel(
  type: PartnerButtonLabelType,
  customLabel?: string
): string | null {
  if (type === "custom") {
    const label = customLabel?.trim() ?? "";
    return label.length >= 2 && label.length <= 40 ? label : null;
  }
  return PARTNER_BUTTON_LABELS[type];
}

export function buildPartnerDestinationUrl(
  website: string,
  prompt: string,
  queryParam?: string
): string | null {
  const base = normalizePartnerWebsite(website);
  if (!base) return null;

  const param = queryParam?.trim();
  if (!param) return base;

  try {
    const url = new URL(base);
    url.searchParams.set(param, prompt);
    return url.toString();
  } catch {
    return base;
  }
}

export function parsePartnerPreviewParams(
  params: URLSearchParams
): PartnerPreviewConfig | null {
  const websiteRaw = params.get("partner_url")?.trim();
  const label = params.get("partner_label")?.trim();
  if (!websiteRaw || !label) return null;

  const website = normalizePartnerWebsite(websiteRaw);
  if (!website) return null;

  const queryParam = params.get("partner_q")?.trim() || undefined;
  return { website, label, queryParam };
}

export function appendPartnerPreviewParams(
  params: URLSearchParams,
  config: Pick<PartnerPreviewConfig, "website" | "label" | "queryParam">
): URLSearchParams {
  const next = new URLSearchParams(params);
  next.set("partner_url", config.website);
  next.set("partner_label", config.label);
  if (config.queryParam?.trim()) {
    next.set("partner_q", config.queryParam.trim());
  } else {
    next.delete("partner_q");
  }
  return next;
}

export function buildPartnerRepoTestUrl(config: PartnerPreviewConfig): string {
  const params = appendPartnerPreviewParams(new URLSearchParams(), config);
  return `/openclaw/openclaw?${params.toString()}`;
}

export function buildPartnerWebsiteTestUrl(config: PartnerPreviewConfig): string {
  const params = appendPartnerPreviewParams(
    new URLSearchParams({ url: "https://pinterest.com" }),
    config
  );
  return `/website/pinterest-com?${params.toString()}`;
}

const PARTNER_QUERY_KEYS = ["partner_url", "partner_label", "partner_q"] as const;

/** Keep partner preview query params when rewriting the URL after a reverse. */
export function pathWithPartnerPreviewParams(path: string): string {
  if (typeof window === "undefined") return path;
  const current = new URLSearchParams(window.location.search);
  const kept = new URLSearchParams();
  for (const key of PARTNER_QUERY_KEYS) {
    const value = current.get(key);
    if (value) kept.set(key, value);
  }
  const qs = kept.toString();
  return qs ? `${path}?${qs}` : path;
}
