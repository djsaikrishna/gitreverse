import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getSupabase } from "@/lib/supabase";

export type Object3dReverseMeta = {
  title: string;
  prompt: string;
  updatedAt: string;
  glbFilename: string;
  sourceFilename: string | null;
  metadata: Record<string, unknown> | null;
};

function diskMetaPath(slug: string): string {
  return path.join(process.cwd(), "data", "object3d-assets", slug, "meta.json");
}

async function readDiskMeta(slug: string): Promise<Object3dReverseMeta | null> {
  try {
    const raw = await readFile(diskMetaPath(slug), "utf8");
    const parsed = JSON.parse(raw) as {
      title?: string;
      prompt?: string;
      updatedAt?: string;
      glbFilename?: string;
      sourceFilename?: string | null;
      metadata?: Record<string, unknown> | null;
    };
    if (!parsed.title || !parsed.prompt || !parsed.glbFilename) return null;
    return {
      title: parsed.title,
      prompt: parsed.prompt,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
      glbFilename: parsed.glbFilename,
      sourceFilename: parsed.sourceFilename ?? null,
      metadata: parsed.metadata ?? null,
    };
  } catch {
    return null;
  }
}

async function writeDiskMeta(
  slug: string,
  meta: Object3dReverseMeta
): Promise<void> {
  const file = diskMetaPath(slug);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(meta, null, 2), "utf8");
}

export async function readObject3dReverse(
  slug: string
): Promise<Object3dReverseMeta | null> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("object3d_reverse_cache")
      .select(
        "title, prompt, glb_filename, source_filename, cached_at, metadata"
      )
      .eq("slug", slug)
      .maybeSingle();

    if (!error && data?.prompt && data?.title && data?.glb_filename) {
      return {
        title: data.title as string,
        prompt: data.prompt as string,
        updatedAt: data.cached_at as string,
        glbFilename: data.glb_filename as string,
        sourceFilename: (data.source_filename as string | null) ?? null,
        metadata: (data.metadata as Record<string, unknown> | null) ?? null,
      };
    }
  }

  return readDiskMeta(slug);
}

export async function writeObject3dReverse(opts: {
  slug: string;
  title: string;
  prompt: string;
  glbFilename: string;
  sourceFilename?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  const meta: Object3dReverseMeta = {
    title: opts.title,
    prompt: opts.prompt,
    updatedAt: new Date().toISOString(),
    glbFilename: opts.glbFilename,
    sourceFilename: opts.sourceFilename ?? null,
    metadata: opts.metadata ?? null,
  };

  await writeDiskMeta(opts.slug, meta);

  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase.from("object3d_reverse_cache").upsert(
    {
      slug: opts.slug,
      title: opts.title,
      prompt: opts.prompt,
      glb_filename: opts.glbFilename,
      source_filename: opts.sourceFilename ?? null,
      metadata: opts.metadata ?? null,
      cached_at: meta.updatedAt,
    },
    { onConflict: "slug" }
  );

  if (error) {
    console.warn(`[object3d] supabase cache skipped: ${error.message}`);
  }
}
