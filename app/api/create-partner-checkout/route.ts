import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { STRIPE_PRICE_IDS } from "@/lib/billing-config";

export const runtime = "nodejs";

const BUTTON_LABELS = {
  design_this: "Design This",
  build_this: "Build This",
} as const;

type ButtonLabelType = keyof typeof BUTTON_LABELS | "custom";

function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  return new Stripe(key, {
    apiVersion: "2025-02-24.acacia",
  });
}

function normalizeWebsite(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
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

  const priceId = STRIPE_PRICE_IDS.partner;
  if (!priceId) {
    return NextResponse.json(
      {
        error: "stripe_not_configured",
        message: "Partner Stripe price is not configured",
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
  const website = normalizeWebsite(String(raw.website ?? ""));
  const email = String(raw.email ?? "").trim().toLowerCase();
  const buttonLabelType = String(raw.buttonLabelType ?? "") as ButtonLabelType;
  const customButtonLabel = String(raw.customButtonLabel ?? "").trim();

  if (!website) {
    return NextResponse.json(
      { error: "invalid_website", message: "Enter a valid website URL." },
      { status: 400 }
    );
  }

  if (!isValidEmail(email)) {
    return NextResponse.json(
      { error: "invalid_email", message: "Enter a valid email address." },
      { status: 400 }
    );
  }

  if (
    buttonLabelType !== "design_this" &&
    buttonLabelType !== "build_this" &&
    buttonLabelType !== "custom"
  ) {
    return NextResponse.json(
      { error: "invalid_button_label", message: "Choose a button label." },
      { status: 400 }
    );
  }

  const buttonLabel =
    buttonLabelType === "custom"
      ? customButtonLabel
      : BUTTON_LABELS[buttonLabelType];

  if (!buttonLabel || buttonLabel.length < 2 || buttonLabel.length > 40) {
    return NextResponse.json(
      {
        error: "invalid_button_label",
        message: "Custom button text must be between 2 and 40 characters.",
      },
      { status: 400 }
    );
  }

  const origin =
    req.headers.get("origin")?.trim() || "https://gitreverse.com";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/partner?checkout=success`,
      cancel_url: `${origin}/partner?checkout=cancelled`,
      allow_promotion_codes: true,
      customer_email: email,
      metadata: {
        type: "partner",
        partner_website: website,
        partner_email: email,
        button_label_type: buttonLabelType,
        button_label: buttonLabel,
      },
      subscription_data: {
        metadata: {
          type: "partner",
          partner_website: website,
          partner_email: email,
          button_label_type: buttonLabelType,
          button_label: buttonLabel,
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
    console.error("[create-partner-checkout]", err);
    return NextResponse.json(
      {
        error: "checkout_failed",
        message: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 502 }
    );
  }
}
