import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { STRIPE_PRICE_IDS } from "@/lib/billing-config";
import {
  normalizeAdWebsite,
  normalizeAdWords,
} from "@/lib/footer-ads";
import { publishFooterAd } from "@/lib/footer-ads-server";

export const runtime = "nodejs";

function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2025-02-24.acacia" });
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id")?.trim();
  if (!sessionId) {
    return NextResponse.json({ error: "missing_session_id" }, { status: 400 });
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json(
      { error: "stripe_not_configured" },
      { status: 503 }
    );
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items"],
    });
  } catch (err) {
    console.warn(
      "[verify-ad-purchase] stripe.retrieve:",
      err instanceof Error ? err.message : err
    );
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (session.payment_status !== "paid") {
    return NextResponse.json({ error: "still_processing" }, { status: 404 });
  }

  if (session.metadata?.type !== "footer_ad") {
    return NextResponse.json({ error: "wrong_product" }, { status: 400 });
  }

  const lineItems = session.line_items?.data ?? [];
  const adLine = lineItems.find(
    (li) => li.price?.id === STRIPE_PRICE_IDS.footerAd
  );
  if (!adLine) {
    return NextResponse.json({ error: "wrong_product" }, { status: 400 });
  }

  const website = normalizeAdWebsite(session.metadata.ad_website ?? "");
  const words = normalizeAdWords(session.metadata.ad_words ?? "");
  if (!website || !words) {
    return NextResponse.json({ error: "invalid_ad" }, { status: 400 });
  }

  const ad = await publishFooterAd({
    website,
    words,
    stripeCheckoutSessionId: sessionId,
  });

  if (!ad) {
    return NextResponse.json(
      {
        error: "publish_failed",
        message: "Payment received, but the ad could not be posted. Email fili@gitreverse.com.",
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, ad });
}
