import { notFound } from "next/navigation";
import { WebsiteReversePage } from "@/components/website-reverse-page";
import {
  isValidWebsiteSlug,
  parseWebsiteInput,
  urlToSlug,
} from "@/lib/parse-website-input";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ url?: string }>;
};

export default async function WebsiteSlugPage({
  params,
  searchParams,
}: PageProps) {
  const { slug: rawSlug } = await params;
  const slug = rawSlug.trim().toLowerCase();
  const { url: rawUrl } = await searchParams;

  if (!isValidWebsiteSlug(slug)) {
    notFound();
  }

  const parsed = rawUrl ? parseWebsiteInput(rawUrl) : null;
  if (!parsed) {
    notFound();
  }

  if (urlToSlug(parsed.hostname) !== slug) {
    notFound();
  }

  const designPath = `/api/website-design/${encodeURIComponent(slug)}`;

  return (
    <WebsiteReversePage
      siteSlug={slug}
      targetUrl={parsed.url}
      designPath={designPath}
    />
  );
}
