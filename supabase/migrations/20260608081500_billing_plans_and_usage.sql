CREATE TABLE IF NOT EXISTS public.user_usage_windows (
  user_id text NOT NULL,
  action text NOT NULL CHECK (action IN ('deep_reverse', 'manual_control')),
  window_type text NOT NULL CHECK (window_type IN ('day', 'month')),
  window_start date NOT NULL,
  count integer NOT NULL DEFAULT 0 CHECK (count >= 0),
  PRIMARY KEY (user_id, action, window_type, window_start)
);

ALTER TABLE public.user_usage_windows ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.legacy_plan_overrides (
  subscription_id text PRIMARY KEY,
  customer_id text NOT NULL,
  legacy_until timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.legacy_plan_overrides ENABLE ROW LEVEL SECURITY;

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
  v_next_plan text;
  v_deep_limit integer;
  v_manual_limit integer;
  v_deep_remaining integer;
  v_manual_remaining integer;
  v_subscription_id text;
  v_customer_id text;
  v_is_legacy_override boolean := false;
BEGIN
  WITH candidate_emails AS (
    SELECT lower(btrim(email_txt)) AS email
    FROM unnest(ARRAY[p_auth_email, p_header_email]) AS email_txt
    WHERE email_txt IS NOT NULL AND btrim(email_txt) <> ''
  ),
  matched AS (
    SELECT DISTINCT
      s.id AS subscription_id,
      s.customer AS customer_id,
      si.price #>> '{}' AS price_id,
      CASE
        WHEN si.price #>> '{}' = 'price_1TQj8FIBG5KwEK8atVJ49Oq9' THEN 'legacy_unlimited'
        WHEN si.price #>> '{}' = 'price_1TfvMRIBG5KwEK8a5aETT5X8' THEN 'unlimited'
        WHEN si.price #>> '{}' = 'price_1TfvMRIBG5KwEK8aYeCaGRML' THEN 'pro'
        WHEN si.price #>> '{}' = 'price_1TfvMRIBG5KwEK8aVwcI83zp' THEN 'starter'
        ELSE NULL
      END AS plan,
      CASE
        WHEN si.price #>> '{}' = 'price_1TQj8FIBG5KwEK8atVJ49Oq9' THEN 4
        WHEN si.price #>> '{}' = 'price_1TfvMRIBG5KwEK8a5aETT5X8' THEN 3
        WHEN si.price #>> '{}' = 'price_1TfvMRIBG5KwEK8aYeCaGRML' THEN 2
        WHEN si.price #>> '{}' = 'price_1TfvMRIBG5KwEK8aVwcI83zp' THEN 1
        ELSE 0
      END AS precedence_rank
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
  )
  SELECT m.subscription_id, m.customer_id, m.price_id, m.plan
  INTO v_subscription_id, v_customer_id, v_price_id, v_plan
  FROM matched m
  WHERE m.plan IS NOT NULL
  ORDER BY m.precedence_rank DESC, m.subscription_id DESC
  LIMIT 1;

  IF NOT FOUND THEN
    v_plan := 'free';
    v_price_id := NULL;
  END IF;

  IF v_subscription_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.legacy_plan_overrides o
      WHERE o.subscription_id = v_subscription_id
        AND o.legacy_until > now()
    )
    INTO v_is_legacy_override;
  END IF;

  IF v_is_legacy_override THEN
    v_plan := 'legacy_unlimited';
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

  CASE v_plan
    WHEN 'starter' THEN
      v_deep_limit := 3;
      v_manual_limit := 3;
      v_next_plan := 'pro';
    WHEN 'pro' THEN
      v_deep_limit := 10;
      v_manual_limit := 10;
      v_next_plan := 'unlimited';
    WHEN 'unlimited' THEN
      v_deep_limit := NULL;
      v_manual_limit := NULL;
      v_next_plan := NULL;
    WHEN 'legacy_unlimited' THEN
      v_deep_limit := NULL;
      v_manual_limit := NULL;
      v_next_plan := NULL;
    ELSE
      v_deep_limit := 0;
      v_manual_limit := 1;
      v_next_plan := 'starter';
  END CASE;

  v_deep_remaining :=
    CASE
      WHEN v_deep_limit IS NULL THEN NULL
      ELSE GREATEST(v_deep_limit - v_deep_month_count, 0)
    END;

  v_manual_remaining :=
    CASE
      WHEN v_manual_limit IS NULL THEN NULL
      ELSE GREATEST(v_manual_limit - v_manual_month_count, 0)
    END;

  RETURN jsonb_build_object(
    'subscribed', v_plan <> 'free',
    'plan', v_plan,
    'priceId', v_price_id,
    'isLegacy', v_plan = 'legacy_unlimited',
    'nextPlan', v_next_plan,
    'deepReverse',
      CASE
        WHEN v_plan IN ('unlimited', 'legacy_unlimited') THEN
          jsonb_build_object(
            'limit', NULL,
            'remaining', NULL,
            'window', NULL,
            'canUse', true
          )
        WHEN v_plan = 'free' THEN
          jsonb_build_object(
            'limit', 0,
            'remaining', 0,
            'window', 'month',
            'canUse', false
          )
        ELSE
          jsonb_build_object(
            'limit', v_deep_limit,
            'remaining', v_deep_remaining,
            'window', 'month',
            'canUse', true
          )
      END,
    'manualControl',
      CASE
        WHEN v_plan IN ('unlimited', 'legacy_unlimited') THEN
          jsonb_build_object(
            'limit', NULL,
            'remaining', NULL,
            'window', NULL,
            'canUse', true
          )
        ELSE
          jsonb_build_object(
            'limit', v_manual_limit,
            'remaining', v_manual_remaining,
            'window', 'month',
            'canUse', true
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
  v_day_start date := (now() AT TIME ZONE 'utc')::date;
  v_month_limit integer := NULL;
  v_day_limit integer := NULL;
  v_month_count integer := 0;
  v_day_count integer := 0;
  v_remaining integer := NULL;
  v_window text := NULL;
BEGIN
  IF p_action NOT IN ('deep_reverse', 'manual_control') THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'error', 'invalid_action'
    );
  END IF;

  v_status := public.get_billing_status(p_user_id, p_auth_email, p_header_email);
  v_plan := COALESCE(v_status->>'plan', 'free');

  IF v_user_key = '' THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'plan', v_plan,
      'error', NULL
    );
  END IF;

  IF v_plan = 'free' AND p_action = 'deep_reverse' THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'plan', v_plan,
      'error', 'premium_required'
    );
  END IF;

  IF v_plan = 'free' AND p_action = 'manual_control' THEN
    v_month_limit := 1;
  ELSIF v_plan = 'starter' THEN
    v_month_limit := 3;
  ELSIF v_plan = 'pro' THEN
    v_month_limit := 10;
  ELSIF v_plan IN ('unlimited', 'legacy_unlimited') THEN
    v_day_limit := 50;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_user_key || E'\x1f' || p_action)::bigint);

  IF v_month_limit IS NOT NULL THEN
    SELECT u.count INTO v_month_count
    FROM public.user_usage_windows u
    WHERE u.user_id = v_user_key
      AND u.action = p_action
      AND u.window_type = 'month'
      AND u.window_start = v_month_start;

    v_month_count := COALESCE(v_month_count, 0);

    IF v_month_count >= v_month_limit THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'plan', v_plan,
        'error', 'monthly_limit_reached',
        'remaining', 0,
        'window', 'month'
      );
    END IF;
  END IF;

  IF v_day_limit IS NOT NULL THEN
    SELECT u.count INTO v_day_count
    FROM public.user_usage_windows u
    WHERE u.user_id = v_user_key
      AND u.action = p_action
      AND u.window_type = 'day'
      AND u.window_start = v_day_start;

    v_day_count := COALESCE(v_day_count, 0);

    IF v_day_count >= v_day_limit THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'plan', v_plan,
        'error', 'daily_limit_reached',
        'remaining', 0,
        'window', 'day'
      );
    END IF;
  END IF;

  IF v_month_limit IS NOT NULL THEN
    INSERT INTO public.user_usage_windows (user_id, action, window_type, window_start, count)
    VALUES (v_user_key, p_action, 'month', v_month_start, 1)
    ON CONFLICT (user_id, action, window_type, window_start)
    DO UPDATE SET count = public.user_usage_windows.count + 1
    RETURNING count INTO v_month_count;

    v_remaining := GREATEST(v_month_limit - v_month_count, 0);
    v_window := 'month';
  END IF;

  IF v_day_limit IS NOT NULL THEN
    INSERT INTO public.user_usage_windows (user_id, action, window_type, window_start, count)
    VALUES (v_user_key, p_action, 'day', v_day_start, 1)
    ON CONFLICT (user_id, action, window_type, window_start)
    DO UPDATE SET count = public.user_usage_windows.count + 1
    RETURNING count INTO v_day_count;

    v_remaining := GREATEST(v_day_limit - v_day_count, 0);
    v_window := 'day';
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'plan', v_plan,
    'error', NULL,
    'remaining', v_remaining,
    'window', v_window
  );
END;
$$;
