import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getAuthenticatedUser } from "@/lib/auth-request";
import { STRIPE_PRICE_IDS } from "@/lib/billing-config";

export const runtime = "nodejs";

function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  return new Stripe(key, {
    apiVersion: "2025-02-24.acacia",
  });
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json(
      { error: "Authorization header required" },
      { status: 401 }
    );
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json(
      {
        error: "stripe_not_configured",
        message: "STRIPE_SECRET_KEY is not set",
      },
      { status: 503 }
    );
  }

  const priceId = STRIPE_PRICE_IDS.credit;
  if (!priceId) {
    return NextResponse.json(
      {
        error: "stripe_not_configured",
        message: "No Stripe price is configured for credits",
      },
      { status: 503 }
    );
  }

  const origin =
    req.headers.get("origin")?.trim() || "https://gitreverse.com";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price: priceId,
          quantity: 1,
          adjustable_quantity: {
            enabled: true,
            minimum: 1,
            maximum: 200,
          },
        },
      ],
      success_url: `${origin}/?credit_session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
      allow_promotion_codes: true,
      customer_email: user.email ?? undefined,
      metadata: {
        supabase_user_id: user.id,
      },
    });

    const url = session.url;
    if (!url) {
      return NextResponse.json(
        { error: "checkout_failed", message: "Stripe returned no checkout URL" },
        { status: 502 }
      );
    }

    return NextResponse.json({ url });
  } catch (err) {
    console.error("[create-credit-checkout]", err);
    return NextResponse.json(
      {
        error: "checkout_failed",
        message: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 502 }
    );
  }
}
