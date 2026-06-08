import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getAuthenticatedUser } from "@/lib/auth-request";
import { STRIPE_PRICE_IDS, type BillingPlan } from "@/lib/billing-config";
import { getBillingStatus } from "@/lib/subscriber";

export const runtime = "nodejs";

type UpgradablePlan = Extract<BillingPlan, "starter" | "pro" | "unlimited">;

function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  return new Stripe(key, {
    apiVersion: "2025-02-24.acacia",
  });
}

async function listStripeCustomersByEmail(
  stripe: Stripe,
  email: string
): Promise<Stripe.Customer[]> {
  const customers: Stripe.Customer[] = [];
  let startingAfter: string | undefined;
  for (;;) {
    const page = await stripe.customers.list({
      email: email.trim(),
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    customers.push(...page.data);
    if (!page.has_more || page.data.length === 0) break;
    startingAfter = page.data[page.data.length - 1]?.id;
  }
  return customers;
}

async function listStripeCustomersByUserId(
  stripe: Stripe,
  userId: string
): Promise<Stripe.Customer[]> {
  try {
    const result = await stripe.customers.search({
      query: `metadata['supabase_user_id']:'${userId}'`,
      limit: 100,
    });
    return result.data;
  } catch (err) {
    console.warn(
      "[change-plan] customer search:",
      err instanceof Error ? err.message : String(err)
    );
    return [];
  }
}

function priceIdForPlan(plan: UpgradablePlan): string {
  switch (plan) {
    case "pro":
      return STRIPE_PRICE_IDS.pro;
    case "unlimited":
      return STRIPE_PRICE_IDS.unlimited;
    default:
      return STRIPE_PRICE_IDS.starter;
  }
}

function nextPlanFor(plan: BillingPlan): UpgradablePlan | null {
  switch (plan) {
    case "free":
      return "starter";
    case "starter":
      return "pro";
    case "pro":
      return "unlimited";
    default:
      return null;
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json(
      { error: "Authorization header required" },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const targetPlan =
    body &&
    typeof body === "object" &&
    "plan" in body &&
    typeof (body as { plan?: unknown }).plan === "string"
      ? ((body as { plan: string }).plan.trim().toLowerCase() as UpgradablePlan)
      : null;

  if (
    targetPlan !== "starter" &&
    targetPlan !== "pro" &&
    targetPlan !== "unlimited"
  ) {
    return NextResponse.json(
      { error: "invalid_plan", message: "Plan must be starter, pro, or unlimited" },
      { status: 400 }
    );
  }

  const status = await getBillingStatus({
    userId: user.id,
    authEmail: user.email,
  });

  if (!status.subscribed) {
    return NextResponse.json(
      { error: "no_subscription", message: "Start a subscription checkout first." },
      { status: 400 }
    );
  }

  const expectedNextPlan = nextPlanFor(status.plan);
  if (!expectedNextPlan || targetPlan !== expectedNextPlan) {
    return NextResponse.json(
      {
        error: "invalid_upgrade_path",
        message: "Only the next plan upgrade is supported.",
      },
      { status: 400 }
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

  try {
    let customers = await listStripeCustomersByUserId(stripe, user.id);
    if (customers.length === 0 && user.email) {
      customers = await listStripeCustomersByEmail(stripe, user.email);
    }
    if (customers.length === 0) {
      return NextResponse.json(
        { error: "No Stripe customer found for this account" },
        { status: 400 }
      );
    }

    for (const customer of customers) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: "active",
        limit: 100,
      });
      const subscription = subscriptions.data[0];
      const item = subscription?.items.data[0];
      if (!subscription?.id || !item?.id) continue;

      const updated = await stripe.subscriptions.update(subscription.id, {
        proration_behavior: "create_prorations",
        items: [{ id: item.id, price: priceIdForPlan(targetPlan) }],
      });

      return NextResponse.json({
        success: true,
        target_plan: targetPlan,
        subscription_id: updated.id,
      });
    }

    return NextResponse.json(
      { error: "No active subscription found" },
      { status: 400 }
    );
  } catch (err) {
    console.error("[change-plan]", err);
    return NextResponse.json(
      {
        error: "change_plan_failed",
        message: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 502 }
    );
  }
}
