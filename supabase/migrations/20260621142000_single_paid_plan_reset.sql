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
BEGIN
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

  RETURN jsonb_build_object(
    'subscribed', v_plan <> 'free',
    'plan', v_plan,
    'priceId', v_price_id,
    'isLegacy', false,
    'nextPlan', CASE WHEN v_plan = 'free' THEN 'starter' ELSE NULL END,
    'deepReverse',
      CASE
        WHEN v_plan = 'free' THEN
          jsonb_build_object(
            'limit', 0,
            'remaining', 0,
            'window', 'month',
            'canUse', false
          )
        ELSE
          jsonb_build_object(
            'limit', v_limit,
            'remaining', v_deep_remaining,
            'window', 'month',
            'canUse', true
          )
      END,
    'manualControl',
      CASE
        WHEN v_plan = 'free' THEN
          jsonb_build_object(
            'limit', 0,
            'remaining', 0,
            'window', 'month',
            'canUse', false
          )
        ELSE
          jsonb_build_object(
            'limit', v_limit,
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
  v_month_limit integer := 5;
  v_month_count integer := 0;
  v_remaining integer := 0;
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

  IF v_plan = 'free' THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'plan', v_plan,
      'error', 'premium_required',
      'remaining', 0
    );
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_user_key || E'\x1f' || p_action)::bigint);

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

  INSERT INTO public.user_usage_windows (user_id, action, window_type, window_start, count)
  VALUES (v_user_key, p_action, 'month', v_month_start, 1)
  ON CONFLICT (user_id, action, window_type, window_start)
  DO UPDATE SET count = public.user_usage_windows.count + 1
  RETURNING count INTO v_month_count;

  v_remaining := GREATEST(v_month_limit - v_month_count, 0);

  RETURN jsonb_build_object(
    'allowed', true,
    'plan', v_plan,
    'error', NULL,
    'remaining', v_remaining,
    'window', 'month'
  );
END;
$$;
