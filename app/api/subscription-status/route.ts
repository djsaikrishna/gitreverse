import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-request";
import { isPremium } from "@/lib/subscriber";
import { SUBSCRIBER_EMAIL_HEADER } from "@/lib/subscriber-constants";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json(
      { error: "Authorization header required" },
      { status: 401 }
    );
  }

  const headerEmail = req.headers.get(SUBSCRIBER_EMAIL_HEADER)?.trim() ?? null;
  const subscribed = await isPremium({
    userId: user.id,
    authEmail: user.email,
    headerEmail,
  });

  return NextResponse.json({ subscribed });
}
