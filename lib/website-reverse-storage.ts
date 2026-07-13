import fs from "node:fs/promises";
import path from "node:path";

const OUTPUT_DIR = path.join(process.cwd(), ".website-reverse");

export type WebsiteReverseMeta = {
  targetUrl: string;
  prompt: string;
  updatedAt: string;
};

export function getWebsiteReverseDir(slug: string): string {
  return path.join(OUTPUT_DIR, slug);
}

export function getLocalDesignFilePath(slug: string): string {
  return path.join(getWebsiteReverseDir(slug), "design.md");
}

export async function readWebsiteReverse(
  slug: string
): Promise<{ designMd: string; meta: WebsiteReverseMeta } | null> {
  const dir = getWebsiteReverseDir(slug);
  try {
    const [designMd, metaRaw] = await Promise.all([
      fs.readFile(path.join(dir, "design.md"), "utf8"),
      fs.readFile(path.join(dir, "meta.json"), "utf8"),
    ]);
    const meta = JSON.parse(metaRaw) as WebsiteReverseMeta;
    if (!meta.targetUrl || !meta.prompt) return null;
    return { designMd, meta };
  } catch {
    return null;
  }
}

export async function writeWebsiteReverse(opts: {
  slug: string;
  targetUrl: string;
  designMd: string;
  prompt: string;
}): Promise<void> {
  const dir = getWebsiteReverseDir(opts.slug);
  await fs.mkdir(dir, { recursive: true });
  const meta: WebsiteReverseMeta = {
    targetUrl: opts.targetUrl,
    prompt: opts.prompt,
    updatedAt: new Date().toISOString(),
  };
  await Promise.all([
    fs.writeFile(path.join(dir, "design.md"), opts.designMd, "utf8"),
    fs.writeFile(path.join(dir, "meta.json"), JSON.stringify(meta, null, 2), "utf8"),
  ]);
}
