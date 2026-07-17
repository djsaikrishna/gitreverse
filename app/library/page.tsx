import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { fetchInitialLibrary } from "@/lib/library-query";
import { getSupabase } from "@/lib/supabase";
import { LibraryPage } from "@/components/library-page";
import { JsonLd } from "@/components/json-ld";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Prompt Library",
  description:
    "Browse reverse-engineered prompts from GitHub repositories and live websites. Find coding agent prompts for open-source projects and product UIs.",
  alternates: { canonical: "https://gitreverse.com/library" },
  openGraph: {
    title: "Prompt Library",
    description:
      "Browse reverse-engineered prompts from GitHub repositories and live websites. Find coding agent prompts for open-source projects and product UIs.",
    url: "https://gitreverse.com/library",
    type: "website",
  },
  twitter: {
    title: "Prompt Library",
    description:
      "Browse reverse-engineered prompts from GitHub repositories and live websites. Find coding agent prompts for open-source projects and product UIs.",
  },
};

const INITIAL_LIMIT = 24;

const getCachedInitialLibrary = unstable_cache(
  async () => {
    const supabase = getSupabase();
    if (!supabase) return { data: [], total: 0 };
    try {
      return await fetchInitialLibrary(supabase, INITIAL_LIMIT);
    } catch (error) {
      console.error(
        "[library] initial fetch failed:",
        error instanceof Error ? error.message : error
      );
      return { data: [], total: 0 };
    }
  },
  ["library-initial-newest-v2"],
  { revalidate: 60 }
);

export default async function LibraryRoute() {
  const { data: initialData, total: initialTotal } =
    await getCachedInitialLibrary();

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Prompt Library — GitReverse",
    description:
      "Browse reverse-engineered coding agent prompts from GitHub repositories and live websites.",
    url: "https://gitreverse.com/library",
    numberOfItems: initialTotal,
    hasPart: initialData.slice(0, 10).map((entry) => ({
      "@type": "TechArticle",
      name: entry.title,
      url: `https://gitreverse.com${entry.href}`,
    })),
  };

  return (
    <>
      <JsonLd data={collectionJsonLd} />
      <LibraryPage initialData={initialData} initialTotal={initialTotal} />
    </>
  );
}
