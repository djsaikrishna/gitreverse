import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getSupabaseAdmin } from "@/lib/supabase";

export const OBJECT3D_ASSETS_BUCKET = "object3d-assets";

export const OBJECT3D_GLB_FILENAME = "object.glb";

function diskDir(slug: string): string {
  return path.join(process.cwd(), "data", "object3d-assets", slug);
}

export function isSafeObject3dAssetFilename(filename: string): boolean {
  return /^(object\.glb|source\.(jpe?g|png|webp))$/i.test(filename);
}

export async function writeObject3dAssetFile(
  slug: string,
  filename: string,
  bytes: Buffer,
  contentType: string
): Promise<void> {
  const dir = diskDir(slug);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), bytes);

  const admin = getSupabaseAdmin();
  if (!admin) return;
  const { error } = await admin.storage
    .from(OBJECT3D_ASSETS_BUCKET)
    .upload(`${slug}/${filename}`, bytes, {
      contentType,
      upsert: true,
    });
  if (error) {
    console.warn(
      `[object3d-assets] supabase upload skipped for ${slug}/${filename}: ${error.message}`
    );
  }
}

export async function readObject3dAssetFile(
  slug: string,
  filename: string
): Promise<Buffer | null> {
  try {
    return await readFile(path.join(diskDir(slug), filename));
  } catch {
    // fall through to supabase
  }

  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data, error } = await admin.storage
    .from(OBJECT3D_ASSETS_BUCKET)
    .download(`${slug}/${filename}`);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}
