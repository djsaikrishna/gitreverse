import {
  getContextDevApiKey,
  scrapeWithContextDev,
} from "@/lib/context-dev-client";
import { scrapeWebsite } from "@/lib/firecrawl-client";

export type WebsiteEvidence = {
  source: "firecrawl" | "context-dev";
  branding: unknown;
  styleguide: unknown;
  brand: unknown;
  markdown: string;
  title: string | null;
  screenshotUrl: string | null;
};

function getFirecrawlApiKey(): string | null {
  return process.env.FIRECRAWL_API_KEY?.trim() || null;
}

function brandingHasData(branding: unknown): boolean {
  if (!branding || typeof branding !== "object") return false;
  return Object.keys(branding as object).length > 0;
}

export function evidenceStatusMessage(source: WebsiteEvidence["source"]): string {
  return source === "firecrawl"
    ? "Fetching brand identity via Firecrawl"
    : "Fetching brand identity via context.dev";
}

export async function gatherWebsiteEvidence(url: string): Promise<WebsiteEvidence> {
  const firecrawlKey = getFirecrawlApiKey();
  const contextDevKey = getContextDevApiKey();

  if (!firecrawlKey && !contextDevKey) {
    throw new Error(
      "Configure at least one of FIRECRAWL_API_KEY or CONTEXT_DEV_API_KEY in .env.local."
    );
  }

  const errors: string[] = [];

  if (firecrawlKey) {
    try {
      const scrape = await scrapeWebsite(url);
      if (brandingHasData(scrape.branding)) {
        return {
          source: "firecrawl",
          branding: scrape.branding,
          styleguide: null,
          brand: null,
          markdown: scrape.markdown,
          title: scrape.title,
          screenshotUrl: null,
        };
      }
      errors.push(
        "Firecrawl returned no branding data (site may block scraping)"
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`Firecrawl: ${msg}`);
    }
  }

  if (contextDevKey) {
    try {
      const evidence = await scrapeWithContextDev(url);
      return {
        source: "context-dev",
        branding: null,
        styleguide: evidence.styleguide,
        brand: evidence.brand,
        markdown: evidence.markdown,
        title: evidence.title,
        screenshotUrl: evidence.screenshotUrl,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`context.dev: ${msg}`);
    }
  }

  throw new Error(
    errors.length
      ? `Website evidence gathering failed. ${errors.join(" ")}`
      : "Website evidence gathering failed. No API keys configured."
  );
}
