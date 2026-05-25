import { connection } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { LibraryPage } from "@/components/library-page";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Prompt Library — GitReverse",
  description:
    "Browse 1,000+ reverse-engineered prompts from real GitHub repositories.",
};

const INITIAL_LIMIT = 24;
const TRENDING_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export default async function LibraryRoute() {
  await connection();
  const supabase = getSupabase();

  let initialData: {
    id: number;
    owner: string;
    repo: string;
    prompt: string;
    cached_at: string;
    views?: number;
    title?: string | null;
  }[] = [];
  let initialTotal = 0;

  if (supabase) {
    const { data, count } = await supabase
      .from("prompt_cache")
      .select("id, owner, repo, prompt, cached_at, views, title", { count: "exact" })
      .gte("cached_at", new Date(Date.now() - TRENDING_WINDOW_MS).toISOString())
      .order("views", { ascending: false })
      .order("cached_at", { ascending: false })
      .range(0, INITIAL_LIMIT - 1);

    initialData = (data ?? []) as typeof initialData;
    initialTotal = count ?? 0;
  }

  return <LibraryPage initialData={initialData} initialTotal={initialTotal} />;
}
