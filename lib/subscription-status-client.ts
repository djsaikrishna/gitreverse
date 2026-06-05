/** Client-side Premium status for the logged-in user. */
export async function fetchSubscriptionStatus(
  accessToken: string
): Promise<boolean> {
  try {
    const res = await fetch("/api/subscription-status", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { subscribed?: boolean };
    return data.subscribed === true;
  } catch {
    return false;
  }
}
