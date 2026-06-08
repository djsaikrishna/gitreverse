import type { NextRequest } from "next/server";
import Stripe from "stripe";
import { getAuthenticatedUser } from "@/lib/auth-request";
import {
  buildDefaultBillingStatus,
  coerceBillingStatus,
  type BillingStatus,
} from "@/lib/billing-config";
import { getSupabase } from "@/lib/supabase";
import { SUBSCRIBER_EMAIL_HEADER } from "@/lib/subscriber-constants";

const VERIFY_RETRY_MS = 1500;
const VERIFY_MAX_ATTEMPTS = 3;

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2025-02-24.acacia" });
}

/** Resolves payer email from synced `stripe.checkout_sessions` (retries for webhook lag). */
export async function getEmailFromCheckoutSession(
  sessionId: string
): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  for (let attempt = 0; attempt < VERIFY_MAX_ATTEMPTS; attempt++) {
    const { data, error } = await supabase.rpc(
      "get_email_from_checkout_session",
      { p_session_id: sessionId }
    );
    if (error) {
      console.warn(
        "[subscriber] get_email_from_checkout_session:",
        error.message
      );
      if (attempt < VERIFY_MAX_ATTEMPTS - 1) await sleep(VERIFY_RETRY_MS);
      continue;
    }
    const email = typeof data === "string" ? data.trim() : "";
    if (email) return email;
    if (attempt < VERIFY_MAX_ATTEMPTS - 1) await sleep(VERIFY_RETRY_MS);
  }
  return null;
}

/** Stripe customer id for a completed checkout session (synced table). */
export async function getCheckoutSessionCustomer(
  sessionId: string
): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  for (let attempt = 0; attempt < VERIFY_MAX_ATTEMPTS; attempt++) {
    const { data, error } = await supabase.rpc("get_checkout_session_customer", {
      p_session_id: sessionId,
    });
    if (error) {
      console.warn(
        "[subscriber] get_checkout_session_customer:",
        error.message
      );
      if (attempt < VERIFY_MAX_ATTEMPTS - 1) await sleep(VERIFY_RETRY_MS);
      continue;
    }
    const customerId = typeof data === "string" ? data.trim() : "";
    if (customerId) return customerId;
    if (attempt < VERIFY_MAX_ATTEMPTS - 1) await sleep(VERIFY_RETRY_MS);
  }
  return null;
}

async function queryBillingStatus(
  input: PremiumCheckInput
): Promise<BillingStatus | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const trimmedUserId = input.userId?.trim() || null;
  const trimmedAuthEmail = input.authEmail?.trim() || null;
  const trimmedHeaderEmail = input.headerEmail?.trim() || null;

  const { data, error } = await supabase.rpc("get_billing_status", {
    p_user_id: trimmedUserId,
    p_auth_email: trimmedAuthEmail,
    p_header_email: trimmedHeaderEmail,
  });
  if (error) {
    console.warn("[subscriber] get_billing_status:", error.message);
    return null;
  }
  return coerceBillingStatus(data);
}

/** Whether `email` has an active subscription in synced `stripe` tables. */
export async function checkActiveSubscriber(
  email: string
): Promise<boolean | null> {
  const trimmed = email.trim();
  if (!trimmed) return false;
  const status = await queryBillingStatus({ authEmail: trimmed });
  if (!status) return null;
  return status.subscribed;
}

/** Whether `userId` has an active subscription linked via Stripe customer metadata. */
export async function checkActiveSubscriberByUserId(
  userId: string
): Promise<boolean | null> {
  const trimmed = userId.trim();
  if (!trimmed) return false;
  const status = await queryBillingStatus({ userId: trimmed });
  if (!status) return null;
  return status.subscribed;
}

export type PremiumCheckInput = {
  userId?: string | null;
  authEmail?: string | null;
  headerEmail?: string | null;
};

export async function getBillingStatus(
  input: PremiumCheckInput
): Promise<BillingStatus> {
  return (await queryBillingStatus(input)) ?? buildDefaultBillingStatus();
}

/** Premium if user id is linked to an active sub, or any provided email has one. */
export async function isPremium(input: PremiumCheckInput): Promise<boolean> {
  return (await getBillingStatus(input)).subscribed;
}

/** Resolve Premium from a request (JWT user id + auth email + optional header email). */
export async function isPremiumFromRequest(
  req: NextRequest
): Promise<boolean> {
  const user = await getAuthenticatedUser(req);
  const headerEmail = req.headers.get(SUBSCRIBER_EMAIL_HEADER)?.trim() ?? null;
  return isPremium({
    userId: user?.id ?? null,
    authEmail: user?.email ?? null,
    headerEmail,
  });
}

export async function getBillingStatusFromRequest(
  req: NextRequest
): Promise<BillingStatus> {
  const user = await getAuthenticatedUser(req);
  const headerEmail = req.headers.get(SUBSCRIBER_EMAIL_HEADER)?.trim() ?? null;
  return getBillingStatus({
    userId: user?.id ?? null,
    authEmail: user?.email ?? null,
    headerEmail,
  });
}

/** Stamp `supabase_user_id` on a Stripe customer (live API; sync follows). */
export async function linkStripeCustomerToUser(
  customerId: string,
  userId: string
): Promise<boolean> {
  const stripe = getStripeClient();
  if (!stripe) return false;
  const trimmedCustomer = customerId.trim();
  const trimmedUser = userId.trim();
  if (!trimmedCustomer || !trimmedUser) return false;

  try {
    await stripe.customers.update(trimmedCustomer, {
      metadata: { supabase_user_id: trimmedUser },
    });
    return true;
  } catch (err) {
    console.warn(
      "[subscriber] linkStripeCustomerToUser:",
      err instanceof Error ? err.message : String(err)
    );
    return false;
  }
}
