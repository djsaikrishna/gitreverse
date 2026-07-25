import { notFound } from "next/navigation";
import { AeosBanner } from "@/components/aeos-banner";
import { Navbar } from "@/components/navbar";
import { PromptMarkdown } from "@/components/prompt-markdown";
import { isValidWebsiteSlug } from "@/lib/parse-website-input";
import { readWebsiteReverse } from "@/lib/website-reverse-storage";

type PageProps = {
  params: Promise<{ slug: string }>;
};

function hostnameOf(url: string, fallback: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return fallback;
  }
}

export default async function DesignSystemPage({ params }: PageProps) {
  const { slug: rawSlug } = await params;
  const slug = rawSlug.trim().toLowerCase();

  if (!isValidWebsiteSlug(slug)) {
    notFound();
  }

  const cached = await readWebsiteReverse(slug);
  if (!cached) {
    notFound();
  }

  const displayHost = hostnameOf(cached.meta.targetUrl, slug);
  const downloadHref = `/api/website-design/${encodeURIComponent(slug)}?download=1`;

  return (
    <div className="flex min-h-screen flex-col bg-[#FFFDF8] text-zinc-900">
      <Navbar />

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center gap-12 px-4 py-12 sm:px-6">
        <h1 className="sr-only">{`${displayHost} design system`}</h1>

        <div className="relative w-full max-w-2xl">
          <div className="absolute inset-0 translate-x-2 translate-y-2 rounded-xl bg-zinc-900" />
          <section className="relative z-10 rounded-xl border-[3px] border-zinc-900 bg-[#fafafa] p-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-zinc-700">
                  Design system
                </h2>
                <a
                  href={cached.meta.targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 block truncate text-xs font-medium text-zinc-500 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-800 hover:decoration-zinc-600"
                >
                  {displayHost}
                </a>
              </div>
              <div className="group relative shrink-0">
                <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 rounded bg-zinc-900" />
                <a
                  href={downloadHref}
                  download={`${slug}-design.md`}
                  className="relative z-10 inline-flex rounded border-[3px] border-zinc-900 bg-[#ffc480] px-3 py-1.5 text-xs font-medium text-zinc-900 transition-transform group-hover:-translate-x-px group-hover:-translate-y-px"
                >
                  Download design.md
                </a>
              </div>
            </div>
            <div className="overflow-auto rounded-lg border border-zinc-200 bg-white p-4 text-sm leading-relaxed text-zinc-800">
              <PromptMarkdown>{cached.designMd}</PromptMarkdown>
            </div>
            <AeosBanner
              className="mt-4 w-full"
              embedded
              placement="design-card"
            />
          </section>
        </div>
      </main>
    </div>
  );
}
