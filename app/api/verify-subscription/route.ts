import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-request";
import {
  getCheckoutSessionCustomer,
  getEmailFromCheckoutSession,
  isPremium,
  linkStripeCustomerToUser,
} from "@/lib/subscriber";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id")?.trim();
  if (!sessionId) {
    return NextResponse.json(
      { error: "missing_session_id" },
      { status: 400 }
    );
  }

  const email = await getEmailFromCheckoutSession(sessionId);
  if (!email) {
    return NextResponse.json({ error: "still_processing" }, { status: 404 });
  }

  const user = await getAuthenticatedUser(req);
  let linked = false;

  if (user) {
    const customerId = await getCheckoutSessionCustomer(sessionId);
    if (customerId) {
      linked = await linkStripeCustomerToUser(customerId, user.id);
    }
  }

  const subscribed = user
    ? await isPremium({
        userId: user.id,
        authEmail: user.email,
        headerEmail: email,
      })
    : await isPremium({ headerEmail: email });

  return NextResponse.json({
    email,
    linked,
    subscribed,
  });
}
