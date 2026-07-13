import { NextRequest, NextResponse } from "next/server";
import { isValidWebsiteSlug } from "@/lib/parse-website-input";
import { readDesignMd } from "@/lib/website-reverse-storage";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { slug: rawSlug } = await context.params;
  const slug = rawSlug.trim().toLowerCase();

  if (!isValidWebsiteSlug(slug)) {
    return NextResponse.json({ error: "Invalid slug." }, { status: 400 });
  }

  const designMd = await readDesignMd(slug);
  if (!designMd) {
    return NextResponse.json(
      { error: "design.md not found. Run website reverse first." },
      { status: 404 }
    );
  }

  return new NextResponse(designMd, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
