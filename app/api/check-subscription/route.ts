import { NextRequest, NextResponse } from "next/server";
import { getBillingStatus } from "@/lib/subscriber";

export const runtime = "nodejs";

const MAX_EMAIL_LEN = 320;

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")?.trim();
  if (!email || email.length > MAX_EMAIL_LEN) {
    return NextResponse.json({ error: "bad_email" }, { status: 400 });
  }

  const status = await getBillingStatus({ authEmail: email });
  return NextResponse.json({ subscribed: status.subscribed, plan: status.plan });
}
