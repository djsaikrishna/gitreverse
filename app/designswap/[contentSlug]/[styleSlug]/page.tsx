import { notFound } from "next/navigation";
import { DesignSwapResult } from "@/components/design-swap-result";
import {
  isValidWebsiteSlug,
  parseWebsiteInput,
  urlToSlug,
} from "@/lib/parse-website-input";

type PageProps = {
  params: Promise<{ contentSlug: string; styleSlug: string }>;
  searchParams: Promise<{ contentUrl?: string; styleUrl?: string }>;
};

export default async function DesignSwapResultPage({
  params,
  searchParams,
}: PageProps) {
  const { contentSlug: rawContent, styleSlug: rawStyle } = await params;
  const contentSlug = rawContent.trim().toLowerCase();
  const styleSlug = rawStyle.trim().toLowerCase();
  const { contentUrl: rawContentUrl, styleUrl: rawStyleUrl } =
    await searchParams;

  if (!isValidWebsiteSlug(contentSlug) || !isValidWebsiteSlug(styleSlug)) {
    notFound();
  }

  const contentParsed = rawContentUrl ? parseWebsiteInput(rawContentUrl) : null;
  const styleParsed = rawStyleUrl ? parseWebsiteInput(rawStyleUrl) : null;

  if (!contentParsed || !styleParsed) {
    notFound();
  }

  if (urlToSlug(contentParsed.hostname) !== contentSlug) {
    notFound();
  }
  if (urlToSlug(styleParsed.hostname) !== styleSlug) {
    notFound();
  }

  return (
    <DesignSwapResult
      contentSlug={contentSlug}
      styleSlug={styleSlug}
      contentUrl={contentParsed.url}
      styleUrl={styleParsed.url}
    />
  );
}
