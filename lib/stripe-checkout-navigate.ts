/**
 * Client-side Stripe checkout redirect (premium page + in-app upgrade CTAs).
 */

const PENDING_REDIRECT_KEY = "gr_pending_redirect";

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

export async function beginCreditCheckout(
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
    const res = await fetch("/api/create-credit-checkout", {
      method: "POST",
      headers,
    });
    const data = (await res.json()) as { url?: string };
    if (!res.ok || !data.url) {
      throw new Error("checkout_unavailable");
    }
    window.location.href = data.url;
  } catch (err) {
    throw err instanceof Error ? err : new Error("checkout_unavailable");
  }
}

function savePendingRedirect(): void {
  // Only saves if nothing was pre-saved (e.g. from a "Get Unlimited" click)
  saveReturnPath();
}

export async function beginStripeCheckout(
  _plan?: "starter",
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
      body: JSON.stringify({ plan: "starter" }),
    });
    const data = (await res.json()) as { url?: string };
    if (!res.ok || !data.url) {
      throw new Error("checkout_unavailable");
    }
    window.location.href = data.url;
  } catch {
    if (!PAYMENT_LINK) {
      throw new Error("checkout_unavailable");
    }
    window.location.href = PAYMENT_LINK;
  }
}
