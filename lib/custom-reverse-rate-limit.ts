import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  extractEmailFromJwtPayload,
  extractUserIdFromJwtPayload,
  getBearerToken,
} from "@/lib/auth-request";
import type { BillingAction } from "@/lib/billing-config";
import { getSupabase } from "@/lib/supabase";
import { SUBSCRIBER_EMAIL_HEADER } from "@/lib/subscriber-constants";

const RATE_LIMIT_RPC_TIMEOUT_MS = 2500;

/** Skip DB-backed limits while developing locally or when explicitly opted out. */
function shouldSkipCustomReverseRateLimit(req: NextRequest): boolean {
  if (process.env.GITREVERSE_FORCE_BILLING_CHECKS === "true") {
    return false;
  }
  if (process.env.GITREVERSE_SKIP_CUSTOM_REVERSE_RATE_LIMIT === "true") {
    return true;
  }
  if (process.env.NODE_ENV === "development") {
    return true;
  }
  const host =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  return hostname === "localhost" || hostname === "127.0.0.1";
}

/** Enforce plan-aware per-user limits for non-cached custom reverse. Returns a
 * response when over limit; returns `null` to continue (including fail-open on
 * missing token, timeout/DB errors). */
export async function enforceCustomReverseRateLimit(
  req: NextRequest,
  action: BillingAction
): Promise<NextResponse | null> {
  if (shouldSkipCustomReverseRateLimit(req)) {
    return null;
  }

  const supabase = getSupabase();
  if (!supabase) return null;

  const token = getBearerToken(req);
  const userId = token ? extractUserIdFromJwtPayload(token) : null;
  const authEmail = token ? extractEmailFromJwtPayload(token) : null;
  const headerEmail = req.headers.get(SUBSCRIBER_EMAIL_HEADER)?.trim() ?? null;
  if (!userId) {
    return NextResponse.json(
      {
        error: "premium_required",
        remaining: 0,
      },
      { status: 403 }
    );
  }

  try {
    const rpcPromise = supabase.rpc("check_and_increment_billing_usage", {
      p_user_id: userId,
      p_auth_email: authEmail,
      p_header_email: headerEmail,
      p_action: action,
    });
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("rl-timeout")), RATE_LIMIT_RPC_TIMEOUT_MS)
    );
    const { data, error } = await Promise.race([rpcPromise, timeoutPromise]);
    if (error) {
      console.warn("[custom-reverse] rate limit RPC error:", error.message);
      return null;
    }
    const payload = data as
      | {
          allowed?: unknown;
          error?: unknown;
          remaining?: unknown;
        }
      | null;
    const allowed =
      payload != null &&
      typeof payload === "object" &&
      payload.allowed === true;
    if (!allowed) {
      const errorCode =
        payload != null &&
        typeof payload === "object" &&
        typeof payload.error === "string"
          ? payload.error
          : "monthly_limit_reached";
      const remaining =
        payload != null &&
        typeof payload === "object" &&
        typeof payload.remaining === "number"
          ? payload.remaining
          : 0;
      const status = errorCode === "premium_required" ? 403 : 429;
      const httpStatus =
        errorCode === "premium_required" || errorCode === "out_of_credits"
          ? 403
          : 429;
      return NextResponse.json(
        {
          error: errorCode,
          remaining,
        },
        { status: httpStatus }
      );
    }
  } catch (e) {
    if (e instanceof Error && e.message !== "rl-timeout") {
      console.warn("[custom-reverse] rate limit:", e.message);
    }
    // Timeout or network — fail open
  }
  return null;
}
