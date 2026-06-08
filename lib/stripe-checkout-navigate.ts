/**
 * Client-side Stripe checkout redirect (premium page + in-app upgrade CTAs).
 */

import type { BillingPlan } from "@/lib/billing-config";

const PENDING_REDIRECT_KEY = "gr_pending_redirect";
const CHECKOUT_NAVIGATION_STATE_KEY = "gr_checkout_navigation_state";

export type CheckoutPlan = Extract<BillingPlan, "starter" | "pro" | "unlimited">;

export const PAYMENT_LINK =
  (typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK?.trim()) ||
  "";

export function saveReturnPath(): void {
  if (typeof window === "undefined") return;
  try {
    if (!localStorage.getItem(PENDING_REDIRECT_KEY)) {
      localStorage.setItem(PENDING_REDIRECT_KEY, window.location.pathname);
    }
  } catch {
    /* storage unavailable */
  }
}

function savePendingRedirect(): void {
  // Only saves if nothing was pre-saved (e.g. from a "Get Unlimited" click)
  saveReturnPath();
}

export async function beginStripeCheckout(
  plan: CheckoutPlan,
  accessToken?: string | null
): Promise<void> {
  if (typeof window === "undefined") return;
  savePendingRedirect();
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (accessToken?.trim()) {
      headers.Authorization = `Bearer ${accessToken.trim()}`;
    }
    const res = await fetch("/api/create-checkout", {
      method: "POST",
      headers,
      body: JSON.stringify({ plan }),
    });
    const data = (await res.json()) as { url?: string };
    if (!res.ok || !data.url) {
      throw new Error("checkout_unavailable");
    }
    try {
      sessionStorage.setItem(CHECKOUT_NAVIGATION_STATE_KEY, "started");
    } catch {
      /* ignore */
    }
    window.location.href = data.url;
  } catch {
    if (!PAYMENT_LINK || plan !== "starter") {
      throw new Error("checkout_unavailable");
    }
    try {
      sessionStorage.setItem(CHECKOUT_NAVIGATION_STATE_KEY, "started");
    } catch {
      /* ignore */
    }
    window.location.href = PAYMENT_LINK;
  }
}

export async function changeStripePlan(
  plan: CheckoutPlan,
  accessToken: string
): Promise<void> {
  const res = await fetch("/api/change-plan", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ plan }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };
    throw new Error(data.message || data.error || "change_plan_failed");
  }
}
