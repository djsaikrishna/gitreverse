import { NextRequest, NextResponse } from "next/server";
import { hasEmbeddingProvider } from "@/lib/embeddings";
import { browseLibrary, searchLibrary } from "@/lib/library-query";
import type { SortOption } from "@/lib/library-types";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const LIMIT = 24;

export async function GET(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
  }

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search")?.trim() ?? "";
  const sort = (searchParams.get("sort") ?? "newest") as SortOption;
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") ?? String(LIMIT), 10))
  );

  try {
    if (search) {
      const result = await searchLibrary({
        supabase,
        search,
        sort,
        page,
        limit,
        useHybrid: hasEmbeddingProvider(),
      });
      return NextResponse.json(result);
    }

    const result = await browseLibrary({ supabase, sort, page, limit });
    return NextResponse.json({ ...result, strategy: "browse" as const });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
