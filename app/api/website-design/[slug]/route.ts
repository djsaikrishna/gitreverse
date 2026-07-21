import { NextRequest, NextResponse } from "next/server";
import { isValidWebsiteSlug } from "@/lib/parse-website-input";
import { readDesignMd } from "@/lib/website-reverse-storage";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
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

  const download = request.nextUrl.searchParams.has("download");
  const headers: Record<string, string> = {
    "Content-Type": "text/markdown; charset=utf-8",
    "Cache-Control": "public, max-age=86400, s-maxage=86400",
    "Access-Control-Allow-Origin": "*",
  };
  if (download) {
    headers["Content-Disposition"] =
      `attachment; filename="${slug}-design.md"`;
  }

  return new NextResponse(designMd, {
    status: 200,
    headers,
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
