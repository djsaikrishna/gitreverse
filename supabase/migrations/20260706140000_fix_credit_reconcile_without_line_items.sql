-- Fix credit reconciliation when stripe.checkout_session_line_items is not synced.
-- Fall back to checkout_sessions.amount_subtotal ($1/credit) for payment-mode sessions
-- created by GitReverse (metadata.supabase_user_id, no subscription requested_plan).

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

  -- Primary path: synced line items (when Stripe Sync populates them).
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

  -- Fallback: line items table empty but checkout session is paid (observed in prod).
  INSERT INTO public.user_credit_ledger (user_id, delta, reason, stripe_checkout_session_id)
  SELECT
    cs.metadata->>'supabase_user_id',
    (cs.amount_subtotal / 100)::integer,
    'purchase',
    cs.id
  FROM stripe.checkout_sessions cs
  WHERE cs.mode = 'payment'
    AND cs._raw_data->>'payment_status' = 'paid'
    AND cs.metadata->>'supabase_user_id' = v_user_key
    AND cs.amount_subtotal IS NOT NULL
    AND cs.amount_subtotal > 0
    AND cs.amount_subtotal % 100 = 0
    AND (
      cs.metadata->>'purchase_type' = 'credits'
      OR cs.metadata->>'requested_plan' IS NULL
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.user_credit_ledger l
      WHERE l.stripe_checkout_session_id = cs.id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM stripe.checkout_session_line_items li
      WHERE li.checkout_session = cs.id
    )
  ON CONFLICT (stripe_checkout_session_id) DO NOTHING;

  RETURN (
    SELECT COALESCE(SUM(delta), 0)::integer
    FROM public.user_credit_ledger
    WHERE user_id = v_user_key
  );
END;
$$;
