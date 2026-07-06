-- Pay-per-use credits: ledger + reconcile + updated billing RPCs

CREATE TABLE IF NOT EXISTS public.user_credit_ledger (
  id bigserial PRIMARY KEY,
  user_id text NOT NULL,
  delta integer NOT NULL,
  reason text NOT NULL CHECK (reason IN ('purchase', 'deep_reverse', 'manual_control', 'admin_adjustment')),
  stripe_checkout_session_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_credit_ledger_user_id_idx
  ON public.user_credit_ledger (user_id);

ALTER TABLE public.user_credit_ledger ENABLE ROW LEVEL SECURITY;

-- Keep in sync with lib/billing-config.ts STRIPE_PRICE_IDS.credit
CREATE OR REPLACE FUNCTION public.reconcile_user_credits(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'stripe', 'public'
AS $$
DECLARE
  v_user_key text := COALESCE(p_user_id::text, '');
  v_credit_price_id text := 'price_1Tq9A8IBG5KwEK8aYIUW1fVp';
BEGIN
  IF v_user_key = '' THEN
    RETURN 0;
  END IF;

  INSERT INTO public.user_credit_ledger (user_id, delta, reason, stripe_checkout_session_id)
  SELECT
    cs.metadata->>'supabase_user_id',
    li.quantity::integer,
    'purchase',
    cs.id
  FROM stripe.checkout_sessions cs
  JOIN stripe.checkout_session_line_items li ON li.checkout_session = cs.id
  WHERE cs.mode = 'payment'
    AND cs._raw_data->>'payment_status' = 'paid'
    AND li.price #>> '{id}' = v_credit_price_id
    AND cs.metadata->>'supabase_user_id' = v_user_key
    AND NOT EXISTS (
      SELECT 1
      FROM public.user_credit_ledger l
      WHERE l.stripe_checkout_session_id = cs.id
    )
  ON CONFLICT (stripe_checkout_session_id) DO NOTHING;

  RETURN (
    SELECT COALESCE(SUM(delta), 0)::integer
    FROM public.user_credit_ledger
    WHERE user_id = v_user_key
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_test_credits(p_user_id uuid, p_credits integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_key text := COALESCE(p_user_id::text, '');
  v_balance integer := 0;
BEGIN
  IF v_user_key = '' OR p_credits IS NULL OR p_credits <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_input');
  END IF;

  INSERT INTO public.user_credit_ledger (user_id, delta, reason, stripe_checkout_session_id)
  VALUES (v_user_key, p_credits, 'admin_adjustment', NULL);

  SELECT COALESCE(SUM(delta), 0)::integer INTO v_balance
  FROM public.user_credit_ledger
  WHERE user_id = v_user_key;

  RETURN jsonb_build_object('ok', true, 'balance', v_balance);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_billing_status(
  p_user_id uuid DEFAULT NULL,
  p_auth_email text DEFAULT NULL,
  p_header_email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'stripe', 'public'
AS $$
DECLARE
  v_price_id text;
  v_plan text := 'free';
  v_month_start date := date_trunc('month', now() AT TIME ZONE 'utc')::date;
  v_user_key text := COALESCE(p_user_id::text, '');
  v_deep_month_count integer := 0;
  v_manual_month_count integer := 0;
  v_limit integer := 5;
  v_deep_remaining integer := 0;
  v_manual_remaining integer := 0;
  v_credit_balance integer := 0;
  v_deep_can_use boolean := false;
  v_manual_can_use boolean := false;
BEGIN
  IF p_user_id IS NOT NULL THEN
    v_credit_balance := public.reconcile_user_credits(p_user_id);
  ELSIF v_user_key <> '' THEN
    SELECT COALESCE(SUM(delta), 0)::integer INTO v_credit_balance
    FROM public.user_credit_ledger
    WHERE user_id = v_user_key;
  END IF;

  WITH candidate_emails AS (
    SELECT lower(btrim(email_txt)) AS email
    FROM unnest(ARRAY[p_auth_email, p_header_email]) AS email_txt
    WHERE email_txt IS NOT NULL AND btrim(email_txt) <> ''
  ),
  matched AS (
    SELECT DISTINCT
      si.price #>> '{}' AS price_id
    FROM stripe.subscriptions s
    JOIN stripe.subscription_items si ON si.subscription = s.id
    JOIN stripe.customers c ON c.id = s.customer
    WHERE s.status = 'active'
      AND COALESCE(si.deleted, false) = false
      AND (
        (p_user_id IS NOT NULL AND c.metadata->>'supabase_user_id' = p_user_id::text)
        OR EXISTS (
          SELECT 1
          FROM candidate_emails e
          WHERE lower(btrim(COALESCE(c.email, ''))) = e.email
        )
      )
      AND si.price #>> '{}' IN (
        'price_1TQj8FIBG5KwEK8atVJ49Oq9',
        'price_1TfvMRIBG5KwEK8aVwcI83zp',
        'price_1TfvMRIBG5KwEK8aYeCaGRML',
        'price_1TfvMRIBG5KwEK8a5aETT5X8'
      )
    LIMIT 1
  )
  SELECT price_id INTO v_price_id
  FROM matched;

  IF FOUND THEN
    v_plan := 'starter';
  ELSE
    v_plan := 'free';
    v_price_id := NULL;
  END IF;

  IF v_user_key <> '' THEN
    SELECT u.count INTO v_deep_month_count
    FROM public.user_usage_windows u
    WHERE u.user_id = v_user_key
      AND u.action = 'deep_reverse'
      AND u.window_type = 'month'
      AND u.window_start = v_month_start;

    SELECT u.count INTO v_manual_month_count
    FROM public.user_usage_windows u
    WHERE u.user_id = v_user_key
      AND u.action = 'manual_control'
      AND u.window_type = 'month'
      AND u.window_start = v_month_start;
  END IF;

  v_deep_month_count := COALESCE(v_deep_month_count, 0);
  v_manual_month_count := COALESCE(v_manual_month_count, 0);

  IF v_plan = 'starter' THEN
    v_deep_remaining := GREATEST(v_limit - v_deep_month_count, 0);
    v_manual_remaining := GREATEST(v_limit - v_manual_month_count, 0);
  END IF;

  v_deep_can_use := (v_plan <> 'free' AND v_deep_remaining > 0) OR v_credit_balance >= 1;
  v_manual_can_use := (v_plan <> 'free' AND v_manual_remaining > 0) OR v_credit_balance >= 1;

  RETURN jsonb_build_object(
    'subscribed', v_plan <> 'free',
    'plan', v_plan,
    'priceId', v_price_id,
    'isLegacy', false,
    'nextPlan', CASE WHEN v_plan = 'free' THEN 'starter' ELSE NULL END,
    'credits', jsonb_build_object('balance', v_credit_balance),
    'deepReverse',
      CASE
        WHEN v_plan = 'free' AND v_credit_balance < 1 THEN
          jsonb_build_object(
            'limit', 0,
            'remaining', 0,
            'window', 'month',
            'canUse', false
          )
        WHEN v_plan <> 'free' AND v_deep_remaining > 0 THEN
          jsonb_build_object(
            'limit', v_limit,
            'remaining', v_deep_remaining,
            'window', 'month',
            'canUse', true
          )
        WHEN v_credit_balance >= 1 THEN
          jsonb_build_object(
            'limit', NULL,
            'remaining', v_credit_balance,
            'window', NULL,
            'canUse', true
          )
        ELSE
          jsonb_build_object(
            'limit', v_limit,
            'remaining', 0,
            'window', 'month',
            'canUse', false
          )
      END,
    'manualControl',
      CASE
        WHEN v_plan = 'free' AND v_credit_balance < 1 THEN
          jsonb_build_object(
            'limit', 0,
            'remaining', 0,
            'window', 'month',
            'canUse', false
          )
        WHEN v_plan <> 'free' AND v_manual_remaining > 0 THEN
          jsonb_build_object(
            'limit', v_limit,
            'remaining', v_manual_remaining,
            'window', 'month',
            'canUse', true
          )
        WHEN v_credit_balance >= 1 THEN
          jsonb_build_object(
            'limit', NULL,
            'remaining', v_credit_balance,
            'window', NULL,
            'canUse', true
          )
        ELSE
          jsonb_build_object(
            'limit', v_limit,
            'remaining', 0,
            'window', 'month',
            'canUse', false
          )
      END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.check_and_increment_billing_usage(
  p_user_id uuid,
  p_auth_email text DEFAULT NULL,
  p_header_email text DEFAULT NULL,
  p_action text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'stripe', 'public'
AS $$
DECLARE
  v_status jsonb;
  v_plan text;
  v_user_key text := COALESCE(p_user_id::text, '');
  v_month_start date := date_trunc('month', now() AT TIME ZONE 'utc')::date;
  v_month_limit integer := 5;
  v_month_count integer := 0;
  v_remaining integer := 0;
  v_credit_balance integer := 0;
BEGIN
  IF p_action NOT IN ('deep_reverse', 'manual_control') THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'error', 'invalid_action'
    );
  END IF;

  IF v_user_key = '' THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'error', 'premium_required',
      'remaining', 0
    );
  END IF;

  v_status := public.get_billing_status(p_user_id, p_auth_email, p_header_email);
  v_plan := COALESCE(v_status->>'plan', 'free');
  v_credit_balance := COALESCE((v_status->'credits'->>'balance')::integer, 0);

  PERFORM pg_advisory_xact_lock(hashtext(v_user_key)::bigint);

  SELECT u.count INTO v_month_count
  FROM public.user_usage_windows u
  WHERE u.user_id = v_user_key
    AND u.action = p_action
    AND u.window_type = 'month'
    AND u.window_start = v_month_start;

  v_month_count := COALESCE(v_month_count, 0);

  IF v_plan <> 'free' AND v_month_count < v_month_limit THEN
    INSERT INTO public.user_usage_windows (user_id, action, window_type, window_start, count)
    VALUES (v_user_key, p_action, 'month', v_month_start, 1)
    ON CONFLICT (user_id, action, window_type, window_start)
    DO UPDATE SET count = public.user_usage_windows.count + 1
    RETURNING count INTO v_month_count;

    v_remaining := GREATEST(v_month_limit - v_month_count, 0);

    RETURN jsonb_build_object(
      'allowed', true,
      'plan', v_plan,
      'source', 'subscription',
      'error', NULL,
      'remaining', v_remaining,
      'window', 'month'
    );
  END IF;

  SELECT COALESCE(SUM(delta), 0)::integer INTO v_credit_balance
  FROM public.user_credit_ledger
  WHERE user_id = v_user_key;

  IF v_credit_balance >= 1 THEN
    INSERT INTO public.user_credit_ledger (user_id, delta, reason, stripe_checkout_session_id)
    VALUES (v_user_key, -1, p_action, NULL);

    v_credit_balance := v_credit_balance - 1;

    RETURN jsonb_build_object(
      'allowed', true,
      'plan', v_plan,
      'source', 'credit',
      'error', NULL,
      'remaining', v_credit_balance,
      'window', NULL
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', false,
    'plan', v_plan,
    'error', 'out_of_credits',
    'remaining', 0
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.credit_session_is_reconciled(
  p_user_id uuid,
  p_session_id text
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_credit_ledger l
    WHERE l.user_id = p_user_id::text
      AND l.stripe_checkout_session_id = p_session_id
  );
$$;

-- Grant credits for a specific Stripe checkout session (called from verify-credit-purchase API route)
CREATE OR REPLACE FUNCTION public.grant_credits_for_session(
  p_user_id uuid,
  p_session_id text,
  p_credits integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_balance integer := 0;
BEGIN
  IF COALESCE(p_user_id::text, '') = '' OR p_session_id IS NULL OR p_credits <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_input');
  END IF;

  INSERT INTO public.user_credit_ledger (user_id, delta, reason, stripe_checkout_session_id)
  VALUES (p_user_id::text, p_credits, 'purchase', p_session_id)
  ON CONFLICT (stripe_checkout_session_id) DO NOTHING;

  SELECT COALESCE(SUM(delta), 0)::integer INTO v_balance
  FROM public.user_credit_ledger
  WHERE user_id = p_user_id::text;

  RETURN jsonb_build_object('ok', true, 'balance', v_balance);
END;
$$;
