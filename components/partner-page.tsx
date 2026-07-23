import type { ReactNode } from "react";
import { Navbar } from "@/components/navbar";
import { PartnerCheckoutForm } from "@/components/partner-checkout-form";
import { PartnerScreenshots } from "@/components/partner-screenshots";

const PARTNER_STATS = [
  {
    name: "make.design",
    visitors: "1,300",
    period: "in 2 weeks",
    description: "Design This button clicks",
  },
  {
    name: "v0",
    visitors: "800",
    period: "in 1 week",
    description: "Builder button clicks",
  },
  {
    name: "Lovable",
    visitors: "742",
    period: "in 1 week",
    description: "Build This button clicks",
  },
  {
    name: "CodeRabbit",
    visitors: "478",
    period: "in 1 week",
    description: "Sponsored banner clicks",
  },
] as const;

const TRAFFIC_STATS = [
  { label: "Monthly visitors", value: "35,000" },
  { label: "Daily visitors", value: "1,000+" },
  { label: "High-intent clicks", value: "3,000+" },
] as const;

const VIDEO_DEMOS = {
  designThis: "/partner/design-this.mp4",
  buildThis: "/partner/build-this.mp4",
} as const;

type VideoDemoProps = {
  title: string;
  subtitle: string;
  buttonLabel: string;
  src?: string;
};

function ShadowCard({
  children,
  className = "",
  shadow = "md",
}: {
  children: ReactNode;
  className?: string;
  shadow?: "sm" | "md";
}) {
  const offset = shadow === "sm" ? "translate-x-1 translate-y-1" : "translate-x-1.5 translate-y-1.5";
  return (
    <div className={`relative ${className}`}>
      <div className={`absolute inset-0 ${offset} rounded-xl bg-zinc-900`} />
      <div className="relative z-10 rounded-xl border-[3px] border-zinc-900 bg-white">
        {children}
      </div>
    </div>
  );
}

function VideoDemoSlot({ title, subtitle, buttonLabel, src }: VideoDemoProps) {
  return (
    <ShadowCard className="h-full">
      <div className="flex h-full flex-col p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold tracking-tight text-zinc-900">
              {title}
            </h3>
            <p className="mt-1 text-sm text-zinc-600">{subtitle}</p>
          </div>
          <span className="inline-flex shrink-0 items-center rounded border-[2.5px] border-zinc-900 bg-[#ffc480] px-2.5 py-1 text-xs font-bold text-zinc-900">
            {buttonLabel}
          </span>
        </div>

        <div className="relative mt-auto aspect-video w-full overflow-hidden rounded-lg border-[2.5px] border-zinc-900 bg-[#fff4da]">
          {src ? (
            <video
              src={src}
              controls
              playsInline
              preload="metadata"
              className="h-full w-full bg-black object-contain"
            >
              <track kind="captions" />
            </video>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-zinc-900 bg-white">
                <svg
                  className="ml-1 h-6 w-6 text-zinc-900"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-zinc-700">
                Demo video coming soon
              </p>
            </div>
          )}
        </div>
      </div>
    </ShadowCard>
  );
}

function StatCard({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-0 translate-x-1 translate-y-1 rounded-lg bg-zinc-900" />
      <div className="relative z-10 rounded-lg border-[3px] border-zinc-900 bg-[#fff4da] px-4 py-5 text-center">
        <p className="text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
          {value}
        </p>
        <p className="mt-1 text-sm font-medium text-zinc-600">{label}</p>
      </div>
    </div>
  );
}

function PartnerStatRow({
  name,
  visitors,
  period,
  description,
}: (typeof PARTNER_STATS)[number]) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-4 py-3.5 last:border-b-0 sm:px-5">
      <div className="min-w-0">
        <p className="font-bold text-zinc-900">{name}</p>
        <p className="text-xs text-zinc-500">{description}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-lg font-extrabold text-zinc-900">{visitors}</p>
        <p className="text-xs text-zinc-500">visitors {period}</p>
      </div>
    </div>
  );
}

export function PartnerPage({
  checkoutStatus,
}: {
  checkoutStatus?: "success" | "cancelled";
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[#FFFDF8] text-zinc-900">
      <Navbar />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-14 px-4 py-12 sm:px-6 sm:py-16">
        {/* Hero */}
        <section className="flex flex-col items-center gap-4 text-center">
          <div className="group relative inline-block">
            <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-lg bg-zinc-900" />
            <div className="relative z-10 rounded-lg border-[3px] border-zinc-900 bg-[#d31611] px-4 py-1">
              <span className="text-sm font-bold text-white">Partnerships</span>
            </div>
          </div>
          <h1 className="max-w-3xl text-4xl font-extrabold tracking-tighter sm:text-5xl lg:text-6xl">
            Partner with GitReverse
          </h1>
          <p className="max-w-2xl text-lg text-zinc-600 sm:text-xl">
            Partner with GitReverse and get high-intent visitors to your site.
          </p>
        </section>

        {/* Traffic overview */}
        <section className="flex flex-col gap-5">
          <div className="text-center sm:text-left">
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Our reach
            </h2>
            <p className="mt-1 text-zinc-600">
              GitReverse attracts builders actively looking for tools to ship
              faster.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {TRAFFIC_STATS.map((stat) => (
              <StatCard key={stat.label} label={stat.label} value={stat.value} />
            ))}
          </div>
        </section>

        {/* Video demos */}
        <section className="flex flex-col gap-5">
          <div className="text-center sm:text-left">
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              How partnerships work
            </h2>
            <p className="mt-1 text-zinc-600">
              We place your product directly in the user flow — right when
              someone has a prompt ready to build or design.
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <VideoDemoSlot
              title="Design This"
              subtitle="Website reverse results link to make.design with the prompt pre-filled."
              buttonLabel="Design This"
              src={VIDEO_DEMOS.designThis}
            />
            <VideoDemoSlot
              title="Build This"
              subtitle="Repo and website results link to Lovable with the prompt pre-filled."
              buttonLabel="Build This"
              src={VIDEO_DEMOS.buildThis}
            />
          </div>
        </section>

        {/* Partner results */}
        <section className="flex flex-col gap-5">
          <div className="text-center sm:text-left">
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Partner results
            </h2>
            <p className="mt-1 text-zinc-600">
              Real click-through data from recent partner placements.
            </p>
          </div>

          <div className="grid items-start gap-6 lg:grid-cols-2">
            <ShadowCard shadow="sm" className="self-start">
              <div className="divide-y divide-zinc-200">
                {PARTNER_STATS.map((stat) => (
                  <PartnerStatRow key={stat.name} {...stat} />
                ))}
              </div>
            </ShadowCard>

            <PartnerScreenshots />
          </div>
        </section>

        {/* Checkout */}
        <section className="flex flex-col items-center gap-4">
          {checkoutStatus === "success" ? (
            <div
              className="w-full max-w-xl rounded-lg border-[3px] border-emerald-500 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900"
              role="status"
            >
              Payment received. Your button will go live within 24 hours, and
              we&apos;ll email you with updates.
            </div>
          ) : checkoutStatus === "cancelled" ? (
            <div
              className="w-full max-w-xl rounded-lg border-[3px] border-amber-400 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900"
              role="status"
            >
              Checkout was cancelled. Fill out the form below when you&apos;re
              ready.
            </div>
          ) : null}

          <ShadowCard className="w-full max-w-xl">
            <div className="px-6 py-8">
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-extrabold tracking-tight">
                  Start partnering
                </h2>
                <p className="mt-2 text-zinc-600">
                  Add your details and checkout to get your button live on
                  GitReverse.
                </p>
              </div>
              <PartnerCheckoutForm />
            </div>
          </ShadowCard>
        </section>
      </main>
    </div>
  );
}
