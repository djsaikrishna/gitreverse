import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-request";
import { getBillingStatus } from "@/lib/subscriber";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

const VERIFY_RETRY_MS = 1500;
const VERIFY_MAX_ATTEMPTS = 3;

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

async function reconcileCreditsForUser(userId: string): Promise<number | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("reconcile_user_credits", {
    p_user_id: userId,
  });
  if (error) {
    console.warn("[verify-credit-purchase] reconcile_user_credits:", error.message);
    return null;
  }
  return typeof data === "number" ? data : null;
}

async function creditSessionIsReconciled(
  userId: string,
  sessionId: string
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { data, error } = await supabase.rpc("credit_session_is_reconciled", {
    p_user_id: userId,
    p_session_id: sessionId,
  });

  if (error) {
    console.warn("[verify-credit-purchase] credit_session_is_reconciled:", error.message);
    return false;
  }
  return data === true;
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id")?.trim();
  if (!sessionId) {
    return NextResponse.json({ error: "missing_session_id" }, { status: 400 });
  }

  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  for (let attempt = 0; attempt < VERIFY_MAX_ATTEMPTS; attempt++) {
    await reconcileCreditsForUser(user.id);
    const reconciled = await creditSessionIsReconciled(user.id, sessionId);
    if (reconciled) {
      const status = await getBillingStatus({
        userId: user.id,
        authEmail: user.email,
      });
      return NextResponse.json({
        sessionId,
        reconciled: true,
        ...status,
      });
    }
    if (attempt < VERIFY_MAX_ATTEMPTS - 1) {
      await sleep(VERIFY_RETRY_MS);
    }
  }

  return NextResponse.json({ error: "still_processing" }, { status: 404 });
}
