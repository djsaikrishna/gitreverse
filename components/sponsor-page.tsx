import type { ReactNode } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { SponsorEmailActions } from "@/components/sponsor-email-actions";

type Stat = {
  value: string;
  label: string;
  detail?: string;
};

const reachStats: Stat[] = [
  {
    value: "~100,000",
    label: "Lifetime views",
    detail: "Product live ~2 months",
  },
  { value: "13,000+", label: "Visitors this week" },
  { value: "35,000+", label: "Monthly visitors" },
  { value: "2,200+", label: "GitHub-authenticated users" },
  { value: "1,000+", label: "GitHub stars" },
  { value: "Growing", label: "Active Discord community" },
];

const sponsorFits = [
  "AI coding tools and developer agents",
  "Cloud infrastructure and LLM APIs",
  "Dev tools, CI/CD, and deployment platforms",
  "Anything developers pay for",
];

const surfaces = [
  {
    name: "Home page and results",
    description:
      "Visible to every visitor as they use the tool. Native placement, no ad scripts, no popups.",
  },
  {
    name: "GitHub README",
    description:
      "Durable, long-tail visibility. Seen by every developer who discovers the repo organically — thousands per month.",
  },
  {
    name: "X (@filiksyos)",
    description:
      "~3,500 followers. Sponsored posts — integration walkthroughs, discount promos, and community announcements. Multiple posts per month available.",
  },
  {
    name: "Discord community",
    description:
      "Mention to an active community of builders using GitReverse daily.",
  },
];

function IconGithub({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function IconArrowUpRight({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M7 17L17 7" />
      <path d="M7 7h10v10" />
    </svg>
  );
}

function IconShield({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

const CARD_SHADOW_OFFSET = "3px";

function NeoCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative isolate h-full w-full ${className}`.trim()}>
      <div
        className="pointer-events-none absolute inset-0 rounded-lg bg-zinc-900"
        style={{
          transform: `translate(${CARD_SHADOW_OFFSET},${CARD_SHADOW_OFFSET})`,
        }}
        aria-hidden
      />
      <div className="relative flex h-full min-h-[7.75rem] flex-col rounded-lg border-[2.5px] border-zinc-900 bg-white p-5">
        {children}
      </div>
    </div>
  );
}

function StatCard({ stat }: { stat: Stat }) {
  return (
    <NeoCard className="min-h-[8.5rem]">
      <p className="text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
        {stat.value}
      </p>
      <p className="mt-2 text-sm font-bold text-zinc-900">{stat.label}</p>
      {stat.detail ? (
        <p className="mt-1 text-xs leading-5 text-zinc-500">{stat.detail}</p>
      ) : (
        <span className="mt-1 block flex-1" aria-hidden />
      )}
    </NeoCard>
  );
}

function SurfaceCard({
  name,
  description,
}: {
  name: string;
  description: string;
}) {
  return (
    <NeoCard className="min-h-[10.5rem]">
      <h3 className="text-lg font-extrabold text-zinc-900">{name}</h3>
      <p className="mt-3 flex-1 text-sm leading-6 text-zinc-600">{description}</p>
    </NeoCard>
  );
}

function FitCard({ children }: { children: ReactNode }) {
  return (
    <li className="relative isolate h-full min-h-[3.75rem] w-full">
      <div
        className="pointer-events-none absolute inset-0 rounded-lg bg-zinc-900"
        style={{ transform: "translate(3px,3px)" }}
        aria-hidden
      />
      <div className="relative flex h-full min-h-[inherit] items-center gap-3 rounded-lg border-[2.5px] border-zinc-900 bg-[#fff4da] px-4 py-3">
        {children}
      </div>
    </li>
  );
}

export function SponsorPage() {
  return (
    <div className="min-h-[100vh] bg-[#fffdf8] text-zinc-900">
      <Navbar />

      <main className="flex-grow px-5 py-10 sm:px-8 lg:py-14">
        <div className="mx-auto max-w-5xl">
          <section>
            <h1 className="max-w-4xl text-4xl font-extrabold leading-[1.04] tracking-tight text-zinc-900 sm:text-5xl lg:text-[3.5rem]">
              Reach developers while they&apos;re{" "}
              <span className="text-[#d31611]">planning to build something</span>
              .
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-7 text-zinc-600">
              GitReverse is an open-source tool developers use to reverse
              engineer any GitHub repository into a plain-language AI prompt.
              Sponsor the moment when they&apos;re already thinking about what
              to build next.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <SponsorEmailActions />
              <span className="relative isolate inline-flex">
                <span
                  className="pointer-events-none absolute inset-0 rounded-md bg-zinc-900"
                  style={{ transform: "translate(3px,3px)" }}
                  aria-hidden
                />
                <Link
                  href="https://github.com/filiksyos/gitreverse"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative inline-flex min-h-[48px] items-center justify-center gap-2 rounded-md border-[2.5px] border-zinc-900 bg-[#fff4da] px-5 py-3 text-sm font-bold text-zinc-900 transition-transform hover:-translate-x-px hover:-translate-y-px"
                >
                  <IconGithub className="h-4 w-4 shrink-0" />
                  View the project
                  <IconArrowUpRight className="h-4 w-4 shrink-0" />
                </Link>
              </span>
            </div>
          </section>

          <section className="mt-16 lg:mt-20">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-extrabold tracking-[0.16em] text-[#d31611] uppercase">
                  Verified audience
                </p>
                <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
                  Current GitReverse reach
                </h2>
              </div>
              <p className="text-sm font-semibold text-zinc-500">
                As of June 2026
              </p>
            </div>

            <div className="mt-8 grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {reachStats.map((stat) => (
                <StatCard key={stat.label} stat={stat} />
              ))}
            </div>
          </section>

          <section className="mt-16 lg:mt-20">
            <p className="text-xs font-extrabold tracking-[0.16em] text-[#d31611] uppercase">
              Who uses GitReverse
            </p>
            <h2 className="mt-2 max-w-3xl text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
              High-intent builders, not passive scrollers.
            </h2>
            <p className="mt-3 max-w-3xl text-base leading-7 text-zinc-600">
              Developers, vibe coders, and technical founders who want to
              understand, copy, or build on top of existing codebases. They
              arrive with intent — they already have a GitHub repo in mind and
              they want to build something from it.
            </p>

            <p className="mt-6 text-sm font-bold text-zinc-700">
              Best fit for companies selling to:
            </p>
            <ul className="mt-4 grid auto-rows-fr gap-3 sm:grid-cols-2">
              {sponsorFits.map((fit) => (
                <FitCard key={fit}>
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#d31611]"
                    aria-hidden
                  />
                  <p className="text-sm font-bold text-zinc-900">{fit}</p>
                </FitCard>
              ))}
            </ul>
          </section>

          <section className="mt-16 lg:mt-20">
            <p className="text-xs font-extrabold tracking-[0.16em] text-[#d31611] uppercase">
              Placement surfaces
            </p>
            <h2 className="mt-2 max-w-3xl text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
              Clean native placements across the product.
            </h2>
            <p className="mt-3 max-w-3xl text-base leading-7 text-zinc-600">
              GitReverse visitors aren&apos;t passively scrolling. They paste a
              repo URL, read generated prompts, and decide what to build next.
            </p>
            <div className="mt-6 grid auto-rows-fr gap-4 sm:grid-cols-2">
              {surfaces.map((surface) => (
                <SurfaceCard
                  key={surface.name}
                  name={surface.name}
                  description={surface.description}
                />
              ))}
            </div>
          </section>

          <section className="mt-16 lg:mt-20">
            <div className="relative isolate h-fit w-full">
              <div
                className="pointer-events-none absolute inset-0 rounded-lg bg-zinc-900"
                style={{ transform: "translate(3px,3px)" }}
                aria-hidden
              />
              <div className="relative flex gap-3 rounded-lg border-[2.5px] border-zinc-900 bg-[#fff4da] p-4">
                <IconShield className="mt-0.5 h-5 w-5 shrink-0 text-[#d31611]" />
                <p className="text-sm leading-6 font-semibold text-zinc-900">
                  Sponsorship is clearly labeled. No third-party tracking, no
                  popups.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-16 lg:mt-20">
            <div className="relative isolate h-fit w-full">
              <div
                className="pointer-events-none absolute inset-0 rounded-lg bg-zinc-900"
                style={{ transform: "translate(3px,3px)" }}
                aria-hidden
              />
              <div className="relative rounded-lg border-[2.5px] border-zinc-900 bg-[#fff4da] p-8 sm:p-10">
                <p className="text-xs font-extrabold tracking-[0.16em] text-[#d31611] uppercase">
                  Sponsorship is simple
                </p>
                <h2 className="mt-2 max-w-2xl text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
                  If you sell to developers, reach out.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
                  No tiers listed here. Email Fili and we&apos;ll figure out what
                  makes sense for your team.
                </p>
                <SponsorEmailActions className="mt-6" />
                <p className="mt-6 text-sm text-zinc-500">
                  GitReverse is built and maintained by{" "}
                  <a
                    href="https://x.com/filiksyos"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-zinc-700 underline decoration-zinc-400 underline-offset-2 hover:text-zinc-900"
                  >
                    Fili
                  </a>{" "}
                  — solo founder, open source.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-zinc-200 py-6 text-center text-sm text-zinc-500">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-2 px-4 sm:px-6">
          <a
            href="https://github.com/filiksyos/gitreverse"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-medium text-zinc-700 underline decoration-zinc-400 underline-offset-2 transition-colors hover:text-zinc-900"
          >
            <IconGithub className="h-4 w-4 shrink-0" />
            GitHub
          </a>
          <span className="text-zinc-300" aria-hidden>
            ·
          </span>
          <a
            href="https://discord.gg/bhEMbZMHS"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-medium text-zinc-700 underline decoration-zinc-400 underline-offset-2 transition-colors hover:text-zinc-900"
          >
            Discord
          </a>
          <span className="text-zinc-300" aria-hidden>
            ·
          </span>
          <Link
            href="/sponsor"
            className="font-medium text-zinc-700 underline decoration-zinc-400 underline-offset-2 transition-colors hover:text-zinc-900"
          >
            Sponsor
          </Link>
        </div>
      </footer>
    </div>
  );
}