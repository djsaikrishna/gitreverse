import { getSupabase } from "@/lib/supabase";

export type WebsiteSwapMeta = {
  contentUrl: string;
  styleUrl: string;
  prompt: string;
  updatedAt: string;
};

export async function readWebsiteSwap(
  contentSlug: string,
  styleSlug: string
): Promise<{ meta: WebsiteSwapMeta } | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("website_swap_cache")
    .select("content_url, style_url, prompt, cached_at")
    .eq("content_slug", contentSlug)
    .eq("style_slug", styleSlug)
    .maybeSingle();

  if (
    error ||
    !data?.prompt ||
    !data?.content_url ||
    !data?.style_url
  ) {
    return null;
  }

  return {
    meta: {
      contentUrl: data.content_url as string,
      styleUrl: data.style_url as string,
      prompt: data.prompt as string,
      updatedAt: data.cached_at as string,
    },
  };
}

export async function writeWebsiteSwap(opts: {
  contentSlug: string;
  styleSlug: string;
  contentUrl: string;
  styleUrl: string;
  prompt: string;
}): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error(
      "Supabase not configured. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY."
    );
  }

  const { error } = await supabase.from("website_swap_cache").upsert(
    {
      content_slug: opts.contentSlug,
      style_slug: opts.styleSlug,
      content_url: opts.contentUrl,
      style_url: opts.styleUrl,
      prompt: opts.prompt,
      cached_at: new Date().toISOString(),
    },
    { onConflict: "content_slug,style_slug" }
  );

  if (error) {
    throw new Error(error.message);
  }
}
