import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAuthorized(req: NextRequest): boolean {
  const adminSecret = process.env.ADMIN_SECRET?.trim();
  if (!adminSecret) return false;

  const auth = req.headers.get("authorization")?.trim();
  if (!auth?.startsWith("Bearer ")) return false;
  return auth.slice("Bearer ".length) === adminSecret;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const record =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : null;
  const userId =
    typeof record?.userId === "string" ? record.userId.trim() : "";
  const credits =
    typeof record?.credits === "number" ? record.credits : NaN;

  if (!userId || !Number.isFinite(credits) || credits <= 0) {
    return NextResponse.json(
      { error: "Body must include userId (string) and credits (positive number)." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase.rpc("grant_test_credits", {
    p_user_id: userId,
    p_credits: Math.floor(credits),
  });

  if (error) {
    console.error("[grant-test-credits]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
