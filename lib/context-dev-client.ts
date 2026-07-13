import { ContextDev } from "context.dev";
import { parseWebsiteInput } from "@/lib/parse-website-input";

export type ContextDevEvidence = {
  styleguide: unknown;
  brand: unknown;
  markdown: string;
  title: string | null;
  screenshotUrl: string | null;
};

const MARKDOWN_MAX_CHARS = 12_000;

export function getContextDevApiKey(): string | null {
  return process.env.CONTEXT_DEV_API_KEY?.trim() || null;
}

function truncateMarkdown(markdown: string): string {
  const trimmed = markdown.trim();
  if (trimmed.length <= MARKDOWN_MAX_CHARS) return trimmed;
  return `${trimmed.slice(0, MARKDOWN_MAX_CHARS)}\n\n… (page content truncated)`;
}

function extractTitleFromBrand(brand: unknown): string | null {
  if (!brand || typeof brand !== "object") return null;
  const record = brand as Record<string, unknown>;
  if (typeof record.title === "string" && record.title.trim()) {
    return record.title.trim();
  }
  return null;
}

function hasUsefulEvidence(evidence: ContextDevEvidence): boolean {
  if (evidence.markdown.trim()) return true;
  if (evidence.styleguide && typeof evidence.styleguide === "object") {
    return Object.keys(evidence.styleguide as object).length > 0;
  }
  if (evidence.brand && typeof evidence.brand === "object") {
    return Object.keys(evidence.brand as object).length > 0;
  }
  return false;
}

export async function scrapeWithContextDev(url: string): Promise<ContextDevEvidence> {
  const apiKey = getContextDevApiKey();
  if (!apiKey) {
    throw new Error(
      "CONTEXT_DEV_API_KEY is not set. Add it to .env.local for context.dev fallback."
    );
  }

  const parsed = parseWebsiteInput(url);
  if (!parsed) {
    throw new Error(`Invalid URL for context.dev: ${url}`);
  }

  const domain = parsed.hostname;
  const client = new ContextDev({ apiKey });

  const errors: string[] = [];

  const [styleguideResult, brandResult, markdownResult] = await Promise.allSettled([
    client.web.extractStyleguide({ domain, timeoutMS: 120_000 }),
    client.brand.retrieve({ domain, type: "by_domain" }),
    client.web.webScrapeMd({
      url: parsed.url,
      includeLinks: true,
      includeImages: false,
      useMainContentOnly: true,
    }),
  ]);

  let styleguide: unknown = null;
  if (styleguideResult.status === "fulfilled") {
    styleguide = styleguideResult.value.styleguide ?? null;
  } else {
    const msg =
      styleguideResult.reason instanceof Error
        ? styleguideResult.reason.message
        : String(styleguideResult.reason);
    errors.push(`styleguide: ${msg}`);
  }

  let brand: unknown = null;
  if (brandResult.status === "fulfilled") {
    brand = brandResult.value.brand ?? null;
  } else {
    const msg =
      brandResult.reason instanceof Error
        ? brandResult.reason.message
        : String(brandResult.reason);
    errors.push(`brand: ${msg}`);
  }

  let markdown = "";
  if (markdownResult.status === "fulfilled") {
    markdown = truncateMarkdown(markdownResult.value.markdown ?? "");
  } else {
    const msg =
      markdownResult.reason instanceof Error
        ? markdownResult.reason.message
        : String(markdownResult.reason);
    errors.push(`markdown: ${msg}`);
  }

  let screenshotUrl: string | null = null;
  try {
    const screenshot = await client.web.screenshot({
      domain,
      fullScreenshot: "false",
      handleCookiePopup: "true",
    });
    screenshotUrl = screenshot.screenshot ?? null;
  } catch {
    // Screenshot is optional supporting evidence.
  }

  const evidence: ContextDevEvidence = {
    styleguide,
    brand,
    markdown,
    title: extractTitleFromBrand(brand),
    screenshotUrl,
  };

  if (!hasUsefulEvidence(evidence)) {
    const detail = errors.length ? errors.join("; ") : "no usable data returned";
    throw new Error(`context.dev extraction failed (${detail})`);
  }

  return evidence;
}
