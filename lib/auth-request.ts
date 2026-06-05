import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export function getBearerToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (!auth) return null;
  const m = /^Bearer\s+(.+)$/i.exec(auth.trim());
  const t = m?.[1]?.trim();
  return t || null;
}

/** Read JWT payload fields without network (base64url decode). */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const raw = parts[1];
    if (!raw) return null;
    return JSON.parse(
      Buffer.from(raw, "base64url").toString("utf-8")
    ) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function extractUserIdFromJwtPayload(token: string): string | null {
  const payload = decodeJwtPayload(token);
  return typeof payload?.sub === "string" ? payload.sub : null;
}

export function extractEmailFromJwtPayload(token: string): string | null {
  const payload = decodeJwtPayload(token);
  return typeof payload?.email === "string" ? payload.email.trim() : null;
}

export type AuthenticatedUser = { id: string; email: string | null };

/** Resolve the logged-in user from a Bearer token. */
export async function getAuthenticatedUser(
  req: NextRequest
): Promise<AuthenticatedUser | null> {
  const token = getBearerToken(req);
  if (!token) return null;

  const url = process.env.SUPABASE_URL?.trim();
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();
  if (url && publishableKey) {
    const supabase = createClient(url, publishableKey);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    if (!error && user?.id) {
      return { id: user.id, email: user.email?.trim() ?? null };
    }
  }

  const id = extractUserIdFromJwtPayload(token);
  if (!id) return null;
  return { id, email: extractEmailFromJwtPayload(token) };
}
