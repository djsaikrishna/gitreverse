import { NextRequest, NextResponse } from "next/server";
import {
  isValidGitHubProfileLogin,
  normalizeProfileSegment,
} from "@/lib/parse-github-profile";
import { getSupabase } from "@/lib/supabase";
import {
  hashVisitorIp,
  isDefaultIpHashSaltInProduction,
} from "@/lib/visitor-ip";

export const runtime = "nodejs";

if (isDefaultIpHashSaltInProduction()) {
  throw new Error(
    "[increment-profile-views] VIEWS_IP_SALT is not set. " +
      "Set a random secret (openssl rand -hex 32) in your deployment env."
  );
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("login" in body)
  ) {
    return NextResponse.json(
      { error: "Expected JSON body with login." },
      { status: 400 }
    );
  }

  const loginRaw = (body as { login: unknown }).login;
  if (typeof loginRaw !== "string") {
    return NextResponse.json({ error: "login must be a string." }, { status: 400 });
  }

  const login = normalizeProfileSegment(loginRaw).toLowerCase();
  if (!isValidGitHubProfileLogin(login)) {
    return NextResponse.json({ error: "Invalid login." }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
  }

  const ipHash = hashVisitorIp(req);

  const { error } = await supabase.rpc("increment_profile_views", {
    p_login: login,
    p_ip_hash: ipHash,
  });
  if (error) {
    console.warn("[increment-profile-views]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
