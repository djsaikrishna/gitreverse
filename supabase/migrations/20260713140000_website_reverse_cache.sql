CREATE TABLE IF NOT EXISTS public.website_reverse_cache (
  slug text PRIMARY KEY,
  target_url text NOT NULL,
  design_md text NOT NULL,
  prompt text NOT NULL,
  cached_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.website_reverse_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon can read website_reverse_cache"
  ON public.website_reverse_cache
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "anon can insert website_reverse_cache"
  ON public.website_reverse_cache
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "anon can update website_reverse_cache"
  ON public.website_reverse_cache
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
