import { NextRequest, NextResponse } from "next/server";
import { parseWebsiteReverseHost } from "@/lib/parse-website-reverse-host";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const parsed = parseWebsiteReverseHost(host);
  if (!parsed) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `/website/${encodeURIComponent(parsed.slug)}`;
  url.searchParams.set("url", parsed.targetUrl);
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|opengraph-image).*)"],
};
