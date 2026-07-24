import { getSupabase } from "@/lib/supabase";

export type ProfileReverseMeta = {
  login: string;
  displayName: string;
  avatarUrl: string;
  prompt: string;
  updatedAt: string;
};

export async function readProfileReverse(
  login: string
): Promise<ProfileReverseMeta | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const normalizedLogin = login.trim().toLowerCase();
  const { data, error } = await supabase
    .from("profile_reverse_cache")
    .select("login, display_name, avatar_url, prompt, cached_at")
    .eq("login", normalizedLogin)
    .maybeSingle();

  if (error || !data?.prompt || !data?.login) {
    return null;
  }

  return {
    login: data.login as string,
    displayName: (data.display_name as string | null)?.trim() || (data.login as string),
    avatarUrl: (data.avatar_url as string | null)?.trim() || "",
    prompt: data.prompt as string,
    updatedAt: data.cached_at as string,
  };
}

export async function writeProfileReverse(opts: {
  login: string;
  displayName: string;
  avatarUrl: string;
  prompt: string;
}): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error(
      "Supabase not configured. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY."
    );
  }

  const { error } = await supabase.from("profile_reverse_cache").upsert(
    {
      login: opts.login.trim().toLowerCase(),
      display_name: opts.displayName,
      avatar_url: opts.avatarUrl,
      prompt: opts.prompt,
      cached_at: new Date().toISOString(),
    },
    { onConflict: "login" }
  );

  if (error) {
    throw new Error(error.message);
  }
}
