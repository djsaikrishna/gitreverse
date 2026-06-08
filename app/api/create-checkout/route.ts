import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getAuthenticatedUser } from "@/lib/auth-request";
import { STRIPE_PRICE_IDS, type BillingPlan } from "@/lib/billing-config";

export const runtime = "nodejs";

type CheckoutPlan = Extract<BillingPlan, "starter" | "pro" | "unlimited">;

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

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const requestedPlan =
    body &&
    typeof body === "object" &&
    "plan" in body &&
    typeof (body as { plan?: unknown }).plan === "string"
      ? ((body as { plan: string }).plan.trim().toLowerCase() as CheckoutPlan)
      : "starter";

  const priceId =
    requestedPlan === "pro"
      ? STRIPE_PRICE_IDS.pro
      : requestedPlan === "unlimited"
        ? STRIPE_PRICE_IDS.unlimited
        : STRIPE_PRICE_IDS.starter;

  if (
    requestedPlan !== "starter" &&
    requestedPlan !== "pro" &&
    requestedPlan !== "unlimited"
  ) {
    return NextResponse.json(
      { error: "invalid_plan", message: "Plan must be starter, pro, or unlimited" },
      { status: 400 }
    );
  }

  if (!priceId) {
    return NextResponse.json(
      {
        error: "stripe_not_configured",
        message: "No Stripe price is configured for the selected plan",
      },
      { status: 503 }
    );
  }

  const origin =
    req.headers.get("origin")?.trim() || "https://gitreverse.com";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
      allow_promotion_codes: true,
      client_reference_id: user.id,
      customer_email: user.email ?? undefined,
      metadata: {
        supabase_user_id: user.id,
        requested_plan: requestedPlan,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          requested_plan: requestedPlan,
        },
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
    console.error("[create-checkout]", err);
    return NextResponse.json(
      {
        error: "checkout_failed",
        message: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 502 }
    );
  }
}
