const SLUG_SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isPrivateOrLocalHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  if (h === "127.0.0.1" || h === "0.0.0.0" || h === "::1") return true;
  if (/^10\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  return false;
}

export function parseWebsiteInput(
  raw: string
): { url: string; hostname: string } | null {
  const s = raw.trim();
  if (!s || s.includes(" ")) return null;

  let url: URL;
  try {
    url = s.includes("://") ? new URL(s) : new URL(`https://${s}`);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  const hostname = url.hostname.replace(/^www\./i, "");
  if (!hostname || !hostname.includes(".")) return null;
  if (isPrivateOrLocalHost(hostname)) return null;

  url.hostname = hostname;
  return { url: url.toString(), hostname };
}

export function urlToSlug(hostname: string): string {
  return hostname
    .toLowerCase()
    .replace(/^www\./, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isValidWebsiteSlug(slug: string): boolean {
  const s = slug.trim().toLowerCase();
  if (!s || s.length > 120) return false;
  return SLUG_SEGMENT.test(s);
}
