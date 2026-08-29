import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { STRIPE_PRICE_IDS } from "@/lib/billing-config";
import {
  FOOTER_AD_MAX_WORDS,
  FOOTER_PAID_SLOT_COUNT,
  normalizeAdWebsite,
  normalizeAdWords,
} from "@/lib/footer-ads";
import { countPublishedFooterAds } from "@/lib/footer-ads-server";

export const runtime = "nodejs";

function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  return new Stripe(key, {
    apiVersion: "2025-02-24.acacia",
  });
}

export async function POST(req: NextRequest) {
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

  const priceId = STRIPE_PRICE_IDS.footerAd;
  if (!priceId) {
    return NextResponse.json(
      {
        error: "stripe_not_configured",
        message: "Footer ad Stripe price is not configured",
      },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const website = normalizeAdWebsite(String(raw.website ?? ""));
  const words = normalizeAdWords(String(raw.words ?? ""));

  if (!website) {
    return NextResponse.json(
      { error: "invalid_website", message: "Enter a valid website URL." },
      { status: 400 }
    );
  }

  if (!words) {
    return NextResponse.json(
      {
        error: "invalid_words",
        message: `Ad copy must be ${FOOTER_AD_MAX_WORDS} words or fewer.`,
      },
      { status: 400 }
    );
  }

  const taken = await countPublishedFooterAds();
  if (taken >= FOOTER_PAID_SLOT_COUNT) {
    return NextResponse.json(
      {
        error: "sold_out",
        message: "Both footer slots are taken. Check back later.",
      },
      { status: 409 }
    );
  }

  const origin =
    req.headers.get("origin")?.trim() || "https://gitreverse.com";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/advertise?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/advertise?checkout=cancelled`,
      allow_promotion_codes: true,
      metadata: {
        type: "footer_ad",
        ad_website: website,
        ad_words: words,
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
    console.error("[create-ad-checkout]", err);
    return NextResponse.json(
      {
        error: "checkout_failed",
        message: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 502 }
    );
  }
}
