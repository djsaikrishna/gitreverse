"use client";

import { useEffect, useState } from "react";
import { AdvertiseForm } from "@/components/advertise-form";
import { Navbar } from "@/components/navbar";
import {
  FOOTER_AD_PRICE_LABEL,
  FOOTER_PAID_SLOT_COUNT,
  type FooterAd,
} from "@/lib/footer-ads";

const STATS = [
  { label: "Visitors", value: "200K" },
  { label: "Audience", value: "High-intent devs" },
  { label: "Slots left", value: "2" },
] as const;

export function AdvertisePage({
  sessionId,
  checkoutStatus,
}: {
  sessionId?: string;
  checkoutStatus?: "cancelled";
}) {
  const [soldOut, setSoldOut] = useState(false);
  const [remaining, setRemaining] = useState(FOOTER_PAID_SLOT_COUNT);
  const [postedAd, setPostedAd] = useState<FooterAd | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(Boolean(sessionId));

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/footer-ads");
        const data = (await res.json()) as {
          soldOut?: boolean;
          remaining?: number;
        };
        if (cancelled) return;
        setSoldOut(Boolean(data.soldOut));
        if (typeof data.remaining === "number") setRemaining(data.remaining);
      } catch {
        if (!cancelled) setSoldOut(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [postedAd]);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    setVerifying(true);
    setVerifyError(null);

    void (async () => {
      try {
        const res = await fetch(
          `/api/verify-ad-purchase?session_id=${encodeURIComponent(sessionId)}`
        );
        const data = (await res.json()) as {
          ok?: boolean;
          ad?: FooterAd;
          message?: string;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok || !data.ok || !data.ad) {
          setVerifyError(
            data.message ||
              (data.error === "still_processing"
                ? "Payment is still processing. Refresh in a moment."
                : "Could not post your ad. Email fili@gitreverse.com.")
          );
          setVerifying(false);
          return;
        }
        setPostedAd(data.ad);
        setVerifying(false);
      } catch {
        if (!cancelled) {
          setVerifyError("Network error while posting your ad.");
          setVerifying(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <div className="flex min-h-screen flex-col bg-[#FFFDF8] text-zinc-900">
      <Navbar />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-12 sm:px-6 sm:py-16">
        <section className="flex flex-col items-center gap-4 text-center">
          <div className="group relative inline-block">
            <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-lg bg-zinc-900" />
            <div className="relative z-10 rounded-lg border-[3px] border-zinc-900 bg-[#d31611] px-4 py-1">
              <span className="text-sm font-bold text-white">Advertise</span>
            </div>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tighter sm:text-5xl">
            Reach 200K high-intent developers
          </h1>
          <p className="max-w-xl text-lg text-zinc-600">
            If you&apos;re selling to developers, this is the audience. A footer
            slot on GitReverse is {FOOTER_AD_PRICE_LABEL} and goes live the
            moment you pay.
          </p>
        </section>

        <div className="grid gap-3 sm:grid-cols-3">
          {STATS.map((stat) => (
            <div key={stat.label} className="relative">
              <div className="absolute inset-0 translate-x-1 translate-y-1 rounded-lg bg-zinc-900" />
              <div className="relative z-10 rounded-lg border-[3px] border-zinc-900 bg-[#fff4da] px-4 py-5 text-center">
                <p className="text-2xl font-extrabold tracking-tight text-zinc-900">
                  {stat.label === "Slots left" ? remaining : stat.value}
                </p>
                <p className="mt-1 text-sm font-medium text-zinc-600">
                  {stat.label}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="relative">
          <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-xl bg-zinc-900" />
          <section className="relative z-10 rounded-xl border-[3px] border-zinc-900 bg-white px-6 py-8">
            {verifying ? (
              <p className="text-center text-sm font-semibold text-zinc-900">
                Payment received. Posting your ad…
              </p>
            ) : postedAd ? (
              <div className="text-center">
                <h2 className="text-2xl font-extrabold tracking-tight">
                  Your ad is live
                </h2>
                <p className="mt-2 text-zinc-600">
                  <span className="font-semibold text-zinc-900">
                    {postedAd.words}
                  </span>{" "}
                  now appears in the footer.
                </p>
              </div>
            ) : (
              <>
                {checkoutStatus === "cancelled" ? (
                  <div
                    className="mb-5 rounded-lg border-[2.5px] border-amber-400 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900"
                    role="status"
                  >
                    Checkout was cancelled. Fill this in when you&apos;re ready.
                  </div>
                ) : null}
                {verifyError ? (
                  <div
                    className="mb-5 rounded-lg border-[2.5px] border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
                    role="alert"
                  >
                    {verifyError}
                  </div>
                ) : null}
                <div className="mb-6 text-center">
                  <h2 className="text-2xl font-extrabold tracking-tight">
                    Book a footer slot
                  </h2>
                  <p className="mt-2 text-zinc-600">
                    Website + 4 words max. {remaining} of {FOOTER_PAID_SLOT_COUNT}{" "}
                    slots left.
                  </p>
                </div>
                <AdvertiseForm soldOut={soldOut && !postedAd} />
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
