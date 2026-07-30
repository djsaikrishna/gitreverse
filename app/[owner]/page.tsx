import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { connection } from "next/server";
import { ProfileReversePage } from "@/components/profile-reverse-page";
import { JsonLd } from "@/components/json-ld";
import {
  isValidXProfileHandle,
  normalizeProfileSegment,
} from "@/lib/parse-x-profile";
import { readProfileReverse } from "@/lib/profile-reverse-storage";

type PageProps = {
  params: Promise<{ owner: string }>;
};

const getCachedEntry = cache(async (login: string) => {
  try {
    return await readProfileReverse(login);
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { owner: ownerRaw } = await params;
  const login = normalizeProfileSegment(decodeURIComponent(ownerRaw)).toLowerCase();

  const data = await getCachedEntry(login);
  const pageTitle = data?.displayName?.trim() || login;
  const pageDesc = data?.prompt
    ? data.prompt.slice(0, 160).trimEnd() + "…"
    : `Reverse-engineered X voice system prompt for @${login}.`;
  const url = `https://gitreverse.com/${login}`;

  return {
    title: pageTitle,
    description: pageDesc,
    alternates: { canonical: url },
    openGraph: {
      title: pageTitle,
      description: pageDesc,
      url,
      type: "article",
    },
    twitter: {
      card: "summary",
      title: pageTitle,
      description: pageDesc,
    },
  };
}

export default async function OwnerProfilePage({ params }: PageProps) {
  await connection();

  const { owner: ownerRaw } = await params;
  const login = normalizeProfileSegment(decodeURIComponent(ownerRaw)).toLowerCase();

  if (!isValidXProfileHandle(login)) {
    notFound();
  }

  const cached = await getCachedEntry(login);
  const cachedPrompt = cached?.prompt ?? undefined;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: cached?.displayName?.trim() || login,
    description: cachedPrompt
      ? cachedPrompt.slice(0, 200)
      : `System prompt reverse engineered from @${login} on X via GitReverse.`,
    url: `https://gitreverse.com/${login}`,
    author: {
      "@type": "Person",
      name: cached?.displayName?.trim() || login,
      url: `https://x.com/${login}`,
    },
  };

  return (
    <>
      <JsonLd data={articleJsonLd} />
      <ProfileReversePage
        login={login}
        initialPrompt={cachedPrompt}
      />
    </>
  );
}
