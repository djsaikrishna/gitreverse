-- Paid footer advertisement slots (2 remaining after owned placements)

CREATE TABLE IF NOT EXISTS public.footer_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website text NOT NULL,
  words text NOT NULL,
  stripe_checkout_session_id text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT footer_ads_words_not_blank CHECK (length(trim(words)) > 0),
  CONSTRAINT footer_ads_website_not_blank CHECK (length(trim(website)) > 0)
);

CREATE INDEX IF NOT EXISTS footer_ads_created_at_idx
  ON public.footer_ads (created_at ASC);

ALTER TABLE public.footer_ads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS footer_ads_public_read ON public.footer_ads;
CREATE POLICY footer_ads_public_read
  ON public.footer_ads
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.footer_ads TO anon, authenticated;
