import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { isValidWebsiteSlug } from "@/lib/parse-website-input";
import { getLocalDesignFilePath } from "@/lib/website-reverse-storage";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { slug: rawSlug } = await context.params;
  const slug = rawSlug.trim().toLowerCase();

  if (!isValidWebsiteSlug(slug)) {
    return NextResponse.json({ error: "Invalid slug." }, { status: 400 });
  }

  const filePath = getLocalDesignFilePath(slug);
  try {
    const designMd = await readFile(filePath, "utf8");
    return new NextResponse(designMd, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "design.md not found. Run website reverse first." },
      { status: 404 }
    );
  }
}
