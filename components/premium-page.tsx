"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthModal } from "@/components/auth/AuthModal";
import {
  buildDefaultBillingStatus,
  type BillingStatus,
} from "@/lib/billing-config";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/contexts/AuthContext";
import { beginStripeCheckout } from "@/lib/stripe-checkout-navigate";
import { fetchBillingStatus } from "@/lib/subscription-status-client";

function IconCheck({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#d31611"
      strokeWidth={2.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

type FeatureRowProps = {
  title: string;
  description: string;
};

function FeatureRow({ title, description }: FeatureRowProps) {
  return (
    <div className="flex gap-2.5">
      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
        <IconCheck size={14} />
      </div>
      <div>
        <div className="text-sm font-bold text-zinc-900">{title}</div>
        <p className="mt-0 text-xs leading-snug text-zinc-500">{description}</p>
      </div>
    </div>
  );
}

export function PremiumPage() {
  const { session, isAuthenticated, isLoading: authLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [billingStatus, setBillingStatus] = useState<BillingStatus>(
    buildDefaultBillingStatus()
  );
  const [statusLoaded, setStatusLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = session?.access_token;
    if (!token) {
      setBillingStatus(buildDefaultBillingStatus());
      setStatusLoaded(!authLoading);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const status = await fetchBillingStatus(token);
        if (!cancelled) setBillingStatus(status);
      } catch {
        if (!cancelled) setBillingStatus(buildDefaultBillingStatus());
      } finally {
        if (!cancelled) setStatusLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.access_token, authLoading]);

  useEffect(() => {
    if (!pendingCheckout || !isAuthenticated || authLoading) return;
    setPendingCheckout(false);
    setShowAuthModal(false);
    setCheckoutBusy(true);
    setError(null);
    void beginStripeCheckout("starter", session?.access_token)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Checkout unavailable.");
      })
      .finally(() => {
        setCheckoutBusy(false);
      });
  }, [pendingCheckout, isAuthenticated, authLoading, session?.access_token]);

  const handleAuthModalClose = useCallback(() => {
    setShowAuthModal(false);
    setPendingCheckout(false);
  }, []);

  const isSubscriber = billingStatus.subscribed;

  const handleSubscribe = useCallback(() => {
    if (isSubscriber) return;
    if (authLoading) return;
    setError(null);
    if (!isAuthenticated) {
      setPendingCheckout(true);
      setShowAuthModal(true);
      return;
    }
    setCheckoutBusy(true);
    void beginStripeCheckout("starter", session?.access_token)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Checkout unavailable.");
      })
      .finally(() => {
        setCheckoutBusy(false);
      });
  }, [authLoading, isAuthenticated, isSubscriber, session?.access_token]);

  const ctaDisabled = checkoutBusy || authLoading || !statusLoaded || isSubscriber;
  const ctaLabel = (() => {
    if (isSubscriber) return "You’re already on Premium";
    if (checkoutBusy) return "Processing…";
    if (authLoading || !statusLoaded) return "…";
    return "Subscribe Now";
  })();

  return (
    <div className="min-h-[100vh] bg-[#fffdf8] text-zinc-900">
      <Navbar isSubscriber={isSubscriber} />

      <div className="mx-auto flex max-w-4xl flex-col items-center px-6 pb-3 pt-12 text-center sm:px-8 sm:pt-16 md:pb-4">
        <h1 className="m-0 max-w-[100%] text-center text-[clamp(0.9375rem,calc(0.65rem+3.85vw),3.75rem)] font-extrabold leading-none tracking-tight text-zinc-900 whitespace-nowrap">
          Reverse more, build better
        </h1>
      </div>

      {error ? (
        <div className="mx-auto mb-6 max-w-[440px] px-6 sm:px-8">
          <div className="rounded-lg border-[2.5px] border-red-700 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-[440px] px-6 pb-12 sm:px-8">
        <div className="relative isolate">
          <div
            className="pointer-events-none absolute inset-0 rounded-lg bg-zinc-900"
            style={{ transform: "translate(5px,5px)" }}
            aria-hidden
          />
          <div className="relative flex flex-col gap-3.5 rounded-lg border-[2.5px] border-zinc-900 bg-[#fff4da] p-5 sm:p-6">
            <div>
              <div className="mb-1 text-xs font-semibold tracking-wide text-zinc-600">
                MONTHLY PLAN
              </div>
              <div className="text-4xl font-extrabold tracking-tight sm:text-[2.5rem]">
                $9
                <span className="text-base font-semibold text-zinc-500 sm:text-lg">
                  /mo
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 border-y border-zinc-900 py-3.5">
              <FeatureRow
                title="5 deep reverse per month"
                description="Break down the architecture and reasoning behind real codebases."
              />
              <FeatureRow
                title="5 manual control per month"
                description="Focus the reverse on the exact feature or workflow you want to copy."
              />
              <FeatureRow
                title="Quick reverse stays free"
                description="Use the fast path for lightweight inspiration before you subscribe."
              />
            </div>

            <div>
              <span className="relative isolate block">
                <span
                  className="pointer-events-none absolute inset-0 rounded-md bg-zinc-900"
                  style={{ transform: "translate(3px,3px)" }}
                  aria-hidden
                />
                <button
                  type="button"
                  disabled={ctaDisabled}
                  onClick={() => void handleSubscribe()}
                  className="relative z-10 w-full cursor-pointer rounded-md border-[2.5px] border-zinc-900 bg-[#d31611] px-4 py-2.5 text-sm font-bold text-white transition-transform duration-100 enabled:hover:-translate-x-px enabled:hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60 sm:px-5 sm:text-base"
                >
                  {ctaLabel}
                </button>
              </span>
            </div>

            <p className="m-0 text-center text-xs leading-relaxed text-zinc-500">
              Cancel anytime. No hidden fees.
            </p>
          </div>
        </div>
      </div>

      <AuthModal isOpen={showAuthModal} onClose={handleAuthModalClose} />
    </div>
  );
}
