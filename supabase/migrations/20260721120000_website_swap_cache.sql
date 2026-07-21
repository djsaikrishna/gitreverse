CREATE TABLE IF NOT EXISTS public.website_swap_cache (
  content_slug text NOT NULL,
  style_slug text NOT NULL,
  content_url text NOT NULL,
  style_url text NOT NULL,
  prompt text NOT NULL,
  cached_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (content_slug, style_slug)
);

ALTER TABLE public.website_swap_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon can read website_swap_cache"
  ON public.website_swap_cache
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "anon can insert website_swap_cache"
  ON public.website_swap_cache
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "anon can update website_swap_cache"
  ON public.website_swap_cache
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
