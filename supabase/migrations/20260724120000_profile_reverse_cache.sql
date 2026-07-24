CREATE TABLE IF NOT EXISTS public.profile_reverse_cache (
  login text PRIMARY KEY,
  display_name text NOT NULL DEFAULT '',
  avatar_url text NOT NULL DEFAULT '',
  prompt text NOT NULL,
  views integer NOT NULL DEFAULT 0,
  cached_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_reverse_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon can read profile_reverse_cache"
  ON public.profile_reverse_cache
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "anon can insert profile_reverse_cache"
  ON public.profile_reverse_cache
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "anon can update profile_reverse_cache"
  ON public.profile_reverse_cache
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS profile_reverse_cache_cached_at_idx
  ON public.profile_reverse_cache (cached_at DESC);

CREATE INDEX IF NOT EXISTS profile_reverse_cache_trending_idx
  ON public.profile_reverse_cache (views DESC, cached_at DESC);

CREATE OR REPLACE VIEW public.library_profile_entries
WITH (security_invoker = true) AS
SELECT
  login,
  display_name,
  avatar_url,
  left(prompt, 180) AS prompt,
  cached_at,
  views
FROM public.profile_reverse_cache;

GRANT SELECT ON public.library_profile_entries TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.increment_profile_views(
  p_login text,
  p_ip_hash text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profile_reverse_cache
  SET views = views + 1
  WHERE login = lower(trim(p_login));
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_profile_views(text, text) TO anon, authenticated;
