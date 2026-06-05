-- Premium entitlement by Supabase user id (stripe.customers.metadata.supabase_user_id)

CREATE OR REPLACE FUNCTION public.check_active_subscriber_by_user_id(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'stripe', 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM stripe.subscriptions s
    JOIN stripe.customers c ON s.customer = c.id
    WHERE c.metadata->>'supabase_user_id' = p_user_id::text
      AND s.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_checkout_session_customer(p_session_id text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'stripe', 'public'
AS $$
  SELECT customer
  FROM stripe.checkout_sessions
  WHERE id = p_session_id
  LIMIT 1;
$$;
