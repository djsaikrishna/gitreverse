-- Fast sort paths for /library (anon statement_timeout is 3s)
CREATE INDEX IF NOT EXISTS prompt_cache_cached_at_idx
  ON public.prompt_cache (cached_at DESC);

CREATE INDEX IF NOT EXISTS prompt_cache_trending_idx
  ON public.prompt_cache (views DESC, cached_at DESC);

CREATE INDEX IF NOT EXISTS website_reverse_cache_cached_at_idx
  ON public.website_reverse_cache (cached_at DESC);

-- Lightweight projections so library cards never pull full prompt / design_md
CREATE OR REPLACE VIEW public.library_code_entries
WITH (security_invoker = true) AS
SELECT
  id,
  owner,
  repo,
  left(prompt, 180) AS prompt,
  cached_at,
  views,
  title,
  search_vector
FROM public.prompt_cache;

CREATE OR REPLACE VIEW public.library_website_entries
WITH (security_invoker = true) AS
SELECT
  slug,
  target_url,
  left(prompt, 180) AS prompt,
  cached_at
FROM public.website_reverse_cache;

GRANT SELECT ON public.library_code_entries TO anon, authenticated;
GRANT SELECT ON public.library_website_entries TO anon, authenticated;
