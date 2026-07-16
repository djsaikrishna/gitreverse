import { parseWebsiteReverseHost } from "@/lib/parse-website-reverse-host";

export function getSiteBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}

export function websiteDesignApiUrl(slug: string): string {
  return `${getSiteBaseUrl()}/api/website-design/${encodeURIComponent(slug)}`;
}

function normalizePath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

/** Apex host for website-reverse subdomains (e.g. discord.gitreverse.com → gitreverse.com). */
export function getApexHost(host: string): string {
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  const port = host.includes(":") ? host.split(":")[1] : "";

  if (hostname.endsWith(".gitreverse.com")) {
    return "gitreverse.com";
  }
  if (hostname.endsWith(".localhost")) {
    return port ? `localhost:${port}` : "localhost";
  }

  try {
    return new URL(getSiteBaseUrl()).host;
  } catch {
    return host;
  }
}

/** Absolute URL on the main GitReverse site. */
export function mainSiteHref(path: string): string {
  return `${getSiteBaseUrl()}${normalizePath(path)}`;
}

/**
 * App navigation href: relative on the apex domain, absolute on website-reverse subdomains.
 */
export function appHref(host: string, path: string): string {
  if (parseWebsiteReverseHost(host)) {
    return mainSiteHref(path);
  }
  return normalizePath(path);
}
