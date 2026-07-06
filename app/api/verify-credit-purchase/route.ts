import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getAuthenticatedUser } from "@/lib/auth-request";
import { getBillingStatus } from "@/lib/subscriber";
import { getSupabase } from "@/lib/supabase";
import { STRIPE_PRICE_IDS } from "@/lib/billing-config";

export const runtime = "nodejs";

function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2025-02-24.acacia" });
}

/** Ask Stripe directly for the session, confirm it's paid and is our credit
 *  product, then write the credits into our ledger. Idempotent via the
 *  unique stripe_checkout_session_id constraint. */
async function grantCreditsFromStripe(
  userId: string,
  sessionId: string
): Promise<{ granted: boolean; credits: number }> {
  const stripe = getStripeClient();
  const supabase = getSupabase();
  if (!stripe || !supabase) return { granted: false, credits: 0 };

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items"],
    });
  } catch (err) {
    console.warn("[verify-credit-purchase] stripe.retrieve:", err instanceof Error ? err.message : err);
    return { granted: false, credits: 0 };
  }

  // Safety checks — must be paid, must be for this user
  if (session.payment_status !== "paid") return { granted: false, credits: 0 };
  if (session.metadata?.supabase_user_id !== userId) return { granted: false, credits: 0 };

  // Must contain our credit price ID
  const lineItems = session.line_items?.data ?? [];
  const creditLine = lineItems.find(
    (li) => li.price?.id === STRIPE_PRICE_IDS.credit
  );
  if (!creditLine) return { granted: false, credits: 0 };

  const quantity = creditLine.quantity ?? 1;

  // Write to ledger — ON CONFLICT DO NOTHING makes this safe to call again
  const { error } = await supabase.from("user_credit_ledger").insert({
    user_id: userId,
    delta: quantity,
    reason: "purchase",
    stripe_checkout_session_id: sessionId,
  });

  if (error) {
    // unique violation = already granted (idempotent)
    if (error.code === "23505") return { granted: true, credits: quantity };
    console.warn("[verify-credit-purchase] ledger insert:", error.message);
    return { granted: false, credits: 0 };
  }

  return { granted: true, credits: quantity };
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id")?.trim();
  if (!sessionId) {
    return NextResponse.json({ error: "missing_session_id" }, { status: 400 });
  }

  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { granted } = await grantCreditsFromStripe(user.id, sessionId);
  if (!granted) {
    return NextResponse.json({ error: "still_processing" }, { status: 404 });
  }

  const status = await getBillingStatus({
    userId: user.id,
    authEmail: user.email,
  });

  return NextResponse.json({
    sessionId,
    reconciled: true,
    ...status,
  });
}
