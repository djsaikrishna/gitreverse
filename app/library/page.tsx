import type { Metadata } from "next";
import { connection } from "next/server";
import { fetchInitialLibrary } from "@/lib/library-query";
import { getSupabase } from "@/lib/supabase";
import { LibraryPage } from "@/components/library-page";
import { JsonLd } from "@/components/json-ld";

export const dynamic = "force-dynamic";

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

export default async function LibraryRoute() {
  await connection();
  const supabase = getSupabase();

  let initialData: Awaited<ReturnType<typeof fetchInitialLibrary>>["data"] = [];
  let initialTotal = 0;

  if (supabase) {
    const result = await fetchInitialLibrary(supabase, INITIAL_LIMIT);
    initialData = result.data;
    initialTotal = result.total;
  }

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
