import { parseWebsiteInput, urlToSlug } from "@/lib/parse-website-input";

const SKIP_HOSTS = new Set([
  "gitreverse.com",
  "www.gitreverse.com",
  "localhost",
  "127.0.0.1",
]);

export function parseWebsiteReverseHost(
  host: string
): { slug: string; targetUrl: string } | null {
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  if (!hostname || SKIP_HOSTS.has(hostname)) return null;

  let prefix: string | null = null;

  if (hostname.endsWith(".gitreverse.com")) {
    prefix = hostname.slice(0, -".gitreverse.com".length);
  } else if (hostname.endsWith(".localhost")) {
    prefix = hostname.slice(0, -".localhost".length);
  }

  if (!prefix) return null;

  const targetUrl = `https://${prefix}.com`;
  const parsed = parseWebsiteInput(targetUrl);
  if (!parsed) return null;

  const slug = urlToSlug(parsed.hostname);
  if (!slug) return null;

  return { slug, targetUrl: parsed.url };
}
