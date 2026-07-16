import type { SupabaseClient } from "@supabase/supabase-js";
import { embedText } from "@/lib/embeddings";
import {
  codeEntryFromRow,
  paginateLibraryEntries,
  sortLibraryEntries,
  websiteEntryFromRow,
  type LibraryEntry,
  type SortOption,
} from "@/lib/library-types";

const VIEW_BOOST = 0.4;
const TRENDING_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

type PromptRow = {
  id: number;
  owner: string;
  repo: string;
  prompt: string;
  cached_at: string;
  views: number;
  title?: string | null;
  relevance_score?: number;
};

type WebsiteRow = {
  slug: string;
  target_url: string;
  prompt: string;
  cached_at: string;
};

function searchWords(raw: string): string[] {
  return raw
    .trim()
    .split(/\s+/u)
    .map((w) => w.trim())
    .filter(Boolean);
}

function applyCodeSort(
  // Supabase filter builder types don't compose cleanly across chained selects.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  sort: SortOption,
  searching: boolean
) {
  let q = query;
  switch (sort) {
    case "oldest":
      q = q.order("cached_at", { ascending: true });
      break;
    case "newest":
      q = q.order("cached_at", { ascending: false });
      break;
    case "trending":
    default:
      q = q
        .gte(
          "cached_at",
          new Date(Date.now() - TRENDING_WINDOW_MS).toISOString()
        )
        .order("views", { ascending: false })
        .order("cached_at", { ascending: false });
      break;
  }
  if (searching) {
    q = q.order("views", { ascending: false });
  }
  return q;
}

function applyWebsiteSort(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  sort: SortOption
) {
  switch (sort) {
    case "oldest":
      return query.order("cached_at", { ascending: true });
    case "newest":
      return query.order("cached_at", { ascending: false });
    case "trending":
    default:
      return query
        .gte(
          "cached_at",
          new Date(Date.now() - TRENDING_WINDOW_MS).toISOString()
        )
        .order("cached_at", { ascending: false });
  }
}

async function fetchCodeBrowse(
  supabase: SupabaseClient,
  sort: SortOption,
  fetchLimit: number
): Promise<{ rows: PromptRow[]; total: number }> {
  const { data, count, error } = await applyCodeSort(
    supabase
      .from("prompt_cache")
      .select("id, owner, repo, prompt, cached_at, views, title", {
        count: "exact",
      }),
    sort,
    false
  ).range(0, fetchLimit - 1);

  if (error) throw new Error(error.message);
  return { rows: (data ?? []) as PromptRow[], total: count ?? 0 };
}

async function fetchWebsiteBrowse(
  supabase: SupabaseClient,
  sort: SortOption,
  fetchLimit: number
): Promise<{ rows: WebsiteRow[]; total: number }> {
  const { data, count, error } = await applyWebsiteSort(
    supabase
      .from("website_reverse_cache")
      .select("slug, target_url, prompt, cached_at", { count: "exact" }),
    sort
  ).range(0, fetchLimit - 1);

  if (error) throw new Error(error.message);
  return { rows: (data ?? []) as WebsiteRow[], total: count ?? 0 };
}

type FtsStrategy = "fts-plain" | "fts-or" | "ilike-and" | "ilike-or";

async function fetchCodeSearch(
  supabase: SupabaseClient,
  search: string,
  sort: SortOption,
  fetchLimit: number
): Promise<{ rows: PromptRow[]; total: number; strategy: FtsStrategy }> {
  const words = searchWords(search);

  const runQuery = (strategy?: FtsStrategy) => {
    let query = supabase
      .from("prompt_cache")
      .select("id, owner, repo, prompt, cached_at, views, title", {
        count: "exact",
      });

    if (words.length > 0 && strategy) {
      switch (strategy) {
        case "fts-plain":
          query = query.textSearch("search_vector", search, {
            type: "plain",
            config: "english",
          });
          break;
        case "fts-or":
          query = query.textSearch("search_vector", words.join(" OR "), {
            type: "websearch",
            config: "english",
          });
          break;
        case "ilike-and":
          for (const word of words) {
            query = query.or(
              `owner.ilike.%${word}%,repo.ilike.%${word}%,prompt.ilike.%${word}%`
            );
          }
          break;
        case "ilike-or": {
          const clauses = words.flatMap((w) => [
            `owner.ilike.%${w}%`,
            `repo.ilike.%${w}%`,
            `prompt.ilike.%${w}%`,
          ]);
          query = query.or(clauses.join(","));
          break;
        }
      }
    }

    return applyCodeSort(query, sort, words.length > 0).range(0, fetchLimit - 1);
  };

  let strategy: FtsStrategy = "fts-plain";
  let res = await runQuery(words.length > 0 ? "fts-plain" : undefined);
  if (res.error) throw new Error(res.error.message);

  if ((res.count ?? 0) === 0 && words.length > 1) {
    strategy = "fts-or";
    res = await runQuery("fts-or");
    if (res.error) throw new Error(res.error.message);
  }

  if ((res.count ?? 0) === 0 && words.length > 0) {
    strategy = "ilike-and";
    res = await runQuery("ilike-and");
    if (res.error) throw new Error(res.error.message);
  }

  if ((res.count ?? 0) === 0 && words.length > 1) {
    strategy = "ilike-or";
    res = await runQuery("ilike-or");
    if (res.error) throw new Error(res.error.message);
  }

  return {
    rows: (res.data ?? []) as PromptRow[],
    total: res.count ?? 0,
    strategy,
  };
}

async function fetchWebsiteSearch(
  supabase: SupabaseClient,
  search: string,
  sort: SortOption,
  fetchLimit: number
): Promise<{ rows: WebsiteRow[]; total: number }> {
  const words = searchWords(search);
  let query = supabase
    .from("website_reverse_cache")
    .select("slug, target_url, prompt, cached_at", { count: "exact" });

  if (words.length > 0) {
    for (const word of words) {
      query = query.or(
        `slug.ilike.%${word}%,target_url.ilike.%${word}%,prompt.ilike.%${word}%`
      );
    }
  }

  const { data, count, error } = await applyWebsiteSort(query, sort).range(
    0,
    fetchLimit - 1
  );

  if (error) throw new Error(error.message);
  return { rows: (data ?? []) as WebsiteRow[], total: count ?? 0 };
}

function scoreWebsiteSearch(row: WebsiteRow, search: string): number {
  const haystack = `${row.slug} ${row.target_url} ${row.prompt}`.toLowerCase();
  const words = searchWords(search);
  if (words.length === 0) return 0;
  let score = 0;
  for (const word of words) {
    const w = word.toLowerCase();
    if (row.slug.toLowerCase().includes(w)) score += 3;
    if (row.target_url.toLowerCase().includes(w)) score += 2;
    if (row.prompt.toLowerCase().includes(w)) score += 1;
  }
  return score / words.length;
}

async function fetchCodeHybrid(
  supabase: SupabaseClient,
  search: string,
  fetchLimit: number
): Promise<PromptRow[]> {
  const queryEmbed = await embedText(search);
  const { data, error } = await supabase.rpc("hybrid_search", {
    query_text: search,
    query_embed: queryEmbed,
    match_count: fetchLimit,
    result_offset: 0,
  });

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as PromptRow[];

  const ids = rows.map((row) => row.id).filter(Boolean);
  if (ids.length === 0) return rows;

  const { data: titleRows } = await supabase
    .from("prompt_cache")
    .select("id, title")
    .in("id", ids);

  const titleById = new Map(
    (titleRows ?? []).map((row) => [row.id as number, row.title as string | null])
  );

  const boosted = rows.map((row) => ({
    ...row,
    title: titleById.get(row.id) ?? row.title ?? null,
    relevance_score:
      (row.relevance_score ?? 0) *
      (1 + Math.log10((row.views ?? 0) + 1) * VIEW_BOOST),
  }));

  const maxScore = boosted.reduce(
    (max, row) => Math.max(max, row.relevance_score ?? 0),
    0
  );

  if (maxScore <= 0) return boosted;

  return boosted.map((row) => ({
    ...row,
    relevance_score: (row.relevance_score ?? 0) / maxScore,
  }));
}

async function hybridSearchCount(
  supabase: SupabaseClient,
  search: string
): Promise<number> {
  const queryEmbed = await embedText(search);
  const { data, error } = await supabase.rpc("hybrid_search_count", {
    query_text: search,
    query_embed: queryEmbed,
  });
  if (error) throw new Error(error.message);
  return typeof data === "number" ? data : 0;
}

function mergeBrowse(
  codeRows: PromptRow[],
  websiteRows: WebsiteRow[],
  sort: SortOption
): LibraryEntry[] {
  const entries = [
    ...codeRows.map(codeEntryFromRow),
    ...websiteRows.map(websiteEntryFromRow),
  ];
  return sortLibraryEntries(entries, sort);
}

function mergeSearch(
  codeRows: PromptRow[],
  websiteRows: WebsiteRow[],
  search: string
): LibraryEntry[] {
  const entries: LibraryEntry[] = [
    ...codeRows.map(codeEntryFromRow),
    ...websiteRows.map((row) => {
      const entry = websiteEntryFromRow(row);
      const textScore = scoreWebsiteSearch(row, search);
      const hybridScore = entry.relevance_score ?? 0;
      return {
        ...entry,
        relevance_score: Math.max(hybridScore, textScore > 0 ? textScore / 3 : 0),
      };
    }),
  ];

  entries.sort((a, b) => {
    const scoreDiff = (b.relevance_score ?? 0) - (a.relevance_score ?? 0);
    if (scoreDiff !== 0) return scoreDiff;
    return (
      new Date(b.cached_at).getTime() - new Date(a.cached_at).getTime()
    );
  });

  return entries;
}

export async function browseLibrary(opts: {
  supabase: SupabaseClient;
  sort: SortOption;
  page: number;
  limit: number;
}): Promise<{ data: LibraryEntry[]; total: number }> {
  const fetchLimit = (opts.page + 1) * opts.limit;
  const [code, website] = await Promise.all([
    fetchCodeBrowse(opts.supabase, opts.sort, fetchLimit),
    fetchWebsiteBrowse(opts.supabase, opts.sort, fetchLimit),
  ]);

  const merged = mergeBrowse(code.rows, website.rows, opts.sort);
  return {
    data: paginateLibraryEntries(merged, opts.page, opts.limit),
    total: code.total + website.total,
  };
}

export async function searchLibrary(opts: {
  supabase: SupabaseClient;
  search: string;
  sort: SortOption;
  page: number;
  limit: number;
  useHybrid: boolean;
}): Promise<{
  data: LibraryEntry[];
  total: number;
  strategy: string;
}> {
  const fetchLimit = (opts.page + 1) * opts.limit;

  if (opts.useHybrid) {
    try {
      const [codeRows, website, codeTotal] = await Promise.all([
        fetchCodeHybrid(opts.supabase, opts.search, fetchLimit),
        fetchWebsiteSearch(opts.supabase, opts.search, opts.sort, fetchLimit),
        hybridSearchCount(opts.supabase, opts.search),
      ]);

      if (codeRows.length > 0 || website.rows.length > 0) {
        const merged = mergeSearch(codeRows, website.rows, opts.search);
        return {
          data: paginateLibraryEntries(merged, opts.page, opts.limit),
          total: codeTotal + website.total,
          strategy: "hybrid",
        };
      }
    } catch (error) {
      console.error(
        "[library] hybrid search failed, falling back to FTS:",
        error instanceof Error ? error.message : error
      );
    }
  }

  const [code, website] = await Promise.all([
    fetchCodeSearch(opts.supabase, opts.search, opts.sort, fetchLimit),
    fetchWebsiteSearch(opts.supabase, opts.search, opts.sort, fetchLimit),
  ]);

  const merged = mergeSearch(code.rows, website.rows, opts.search);
  return {
    data: paginateLibraryEntries(merged, opts.page, opts.limit),
    total: code.total + website.total,
    strategy: code.strategy,
  };
}

export async function fetchInitialLibrary(
  supabase: SupabaseClient,
  limit: number
): Promise<{ data: LibraryEntry[]; total: number }> {
  return browseLibrary({
    supabase,
    sort: "newest",
    page: 0,
    limit,
  });
}
