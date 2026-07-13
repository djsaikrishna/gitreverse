export type FirecrawlBranding = Record<string, unknown>;

export type FirecrawlScrapeResult = {
  branding: FirecrawlBranding | null;
  markdown: string;
  title: string | null;
  sourceUrl: string;
};

const FIRECRAWL_SCRAPE_URL = "https://api.firecrawl.dev/v1/scrape";
const MARKDOWN_MAX_CHARS = 12_000;

function getFirecrawlApiKey(): string | null {
  return process.env.FIRECRAWL_API_KEY?.trim() || null;
}

export async function scrapeWebsite(url: string): Promise<FirecrawlScrapeResult> {
  const apiKey = getFirecrawlApiKey();
  if (!apiKey) {
    throw new Error(
      "FIRECRAWL_API_KEY is not set. Add it to .env.local to use website reverse."
    );
  }

  let res: Response;
  try {
    res = await fetch(FIRECRAWL_SCRAPE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["branding", "markdown"],
        onlyMainContent: true,
      }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Firecrawl request failed: ${msg}`);
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error("Firecrawl returned invalid JSON.");
  }

  if (!res.ok) {
    const errMsg =
      json &&
      typeof json === "object" &&
      "error" in json &&
      typeof (json as { error: unknown }).error === "string"
        ? (json as { error: string }).error
        : `Firecrawl error ${res.status}`;
    throw new Error(errMsg);
  }

  const data =
    json && typeof json === "object" && "data" in json
      ? (json as { data: unknown }).data
      : null;

  if (!data || typeof data !== "object") {
    throw new Error("Firecrawl returned no page data.");
  }

  const record = data as Record<string, unknown>;
  const metadata =
    record.metadata && typeof record.metadata === "object"
      ? (record.metadata as Record<string, unknown>)
      : null;

  const rawMarkdown =
    typeof record.markdown === "string" ? record.markdown.trim() : "";
  const markdown =
    rawMarkdown.length > MARKDOWN_MAX_CHARS
      ? `${rawMarkdown.slice(0, MARKDOWN_MAX_CHARS)}\n\n… (page content truncated)`
      : rawMarkdown;

  const branding =
    record.branding && typeof record.branding === "object"
      ? (record.branding as FirecrawlBranding)
      : null;

  const title =
    metadata && typeof metadata.title === "string" ? metadata.title : null;
  const sourceUrl =
    metadata && typeof metadata.sourceURL === "string"
      ? metadata.sourceURL
      : url;

  return { branding, markdown, title, sourceUrl };
}
