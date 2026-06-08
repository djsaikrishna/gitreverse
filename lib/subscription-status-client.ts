import {
  buildDefaultBillingStatus,
  coerceBillingStatus,
  type BillingStatus,
} from "@/lib/billing-config";

/** Client-side billing status for the logged-in user. */
export async function fetchBillingStatus(
  accessToken: string
): Promise<BillingStatus> {
  try {
    const res = await fetch("/api/subscription-status", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return buildDefaultBillingStatus();
    const data = await res.json();
    return coerceBillingStatus(data);
  } catch {
    return buildDefaultBillingStatus();
  }
}

/** Backward-compatible boolean helper for subscriber-only UI affordances. */
export async function fetchSubscriptionStatus(
  accessToken: string
): Promise<boolean> {
  return (await fetchBillingStatus(accessToken)).subscribed;
}
