"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthModal } from "@/components/auth/AuthModal";
import {
  buildDefaultBillingStatus,
  getPlanLabel,
  type BillingPlan,
  type BillingStatus,
} from "@/lib/billing-config";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/contexts/AuthContext";
import {
  beginStripeCheckout,
  changeStripePlan,
  type CheckoutPlan,
} from "@/lib/stripe-checkout-navigate";
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

function FeatureRow({ title }: { title: string }) {
  return (
    <div className="flex gap-2.5">
      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
        <IconCheck size={14} />
      </div>
      <div className="text-sm font-bold text-zinc-900">{title}</div>
    </div>
  );
}

const PLAN_RANK: Record<BillingPlan, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  unlimited: 3,
  legacy_unlimited: 4,
};

const PLAN_CARDS: Array<{
  plan: CheckoutPlan;
  price: string;
  title: string;
  features: string[];
}> = [
  {
    plan: "starter",
    price: "$9",
    title: "Starter",
    features: [
      "3 deep reverse per month",
      "3 manual control per month",
      "A simple upgrade from the free tier",
    ],
  },
  {
    plan: "pro",
    price: "$19",
    title: "Pro",
    features: [
      "10 deep reverse per month",
      "10 manual control per month",
      "Best for recurring product research",
    ],
  },
  {
    plan: "unlimited",
    price: "$39",
    title: "Unlimited",
    features: [
      "Unlimited deep reverse",
      "Unlimited manual control",
      "Protected by invisible abuse caps",
    ],
  },
];

export function PremiumPage() {
  const { session, isAuthenticated, isLoading: authLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingCheckoutPlan, setPendingCheckoutPlan] = useState<CheckoutPlan | null>(
    null
  );
  const [busyPlan, setBusyPlan] = useState<CheckoutPlan | null>(null);
  const [billingStatus, setBillingStatus] = useState<BillingStatus>(
    buildDefaultBillingStatus()
  );
  const [statusLoaded, setStatusLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    const token = session?.access_token;
    if (!token) {
      setBillingStatus(buildDefaultBillingStatus());
      return;
    }
    const status = await fetchBillingStatus(token);
    setBillingStatus(status);
  }, [session?.access_token]);

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
    if (!pendingCheckoutPlan || !isAuthenticated || authLoading) return;
    const plan = pendingCheckoutPlan;
    setPendingCheckoutPlan(null);
    setShowAuthModal(false);
    setBusyPlan(plan);
    setError(null);
    void beginStripeCheckout(plan, session?.access_token)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Checkout unavailable.");
      })
      .finally(() => {
        setBusyPlan(null);
      });
  }, [pendingCheckoutPlan, isAuthenticated, authLoading, session?.access_token]);

  const handleAuthModalClose = useCallback(() => {
    setShowAuthModal(false);
    setPendingCheckoutPlan(null);
  }, []);

  const currentPlan = billingStatus.plan;
  const isSubscriber = billingStatus.subscribed;

  const handlePlanAction = useCallback(
    (plan: CheckoutPlan) => {
      if (authLoading) return;
      setError(null);

      if (!isAuthenticated) {
        setPendingCheckoutPlan(plan);
        setShowAuthModal(true);
        return;
      }

      setBusyPlan(plan);

      const promise =
        isSubscriber && billingStatus.nextPlan === plan && session?.access_token
          ? changeStripePlan(plan, session.access_token).then(refreshStatus)
          : beginStripeCheckout(plan, session?.access_token);

      void promise
        .catch((err) => {
          const fallback =
            currentPlan === "legacy_unlimited"
              ? "Your legacy unlimited plan stays active until renewal."
              : "Plan change unavailable.";
          setError(err instanceof Error ? err.message : fallback);
        })
        .finally(() => {
          setBusyPlan(null);
        });
    },
    [
      authLoading,
      billingStatus.nextPlan,
      currentPlan,
      isAuthenticated,
      isSubscriber,
      refreshStatus,
      session?.access_token,
    ]
  );

  const actionLabel = (plan: CheckoutPlan): string => {
    if (busyPlan === plan) return "Processing…";
    if (currentPlan === plan) return `Current: ${getPlanLabel(plan)}`;
    if (currentPlan === "legacy_unlimited") return "Legacy Unlimited";
    if (isSubscriber) {
      if (billingStatus.nextPlan === plan) {
        return `Upgrade to ${getPlanLabel(plan)}`;
      }
      if (PLAN_RANK[plan] < PLAN_RANK[currentPlan]) {
        return "Not available";
      }
      return "Already above this tier";
    }
    return `Start ${getPlanLabel(plan)}`;
  };

  const actionDisabled = (plan: CheckoutPlan): boolean => {
    if (busyPlan !== null) return true;
    if (authLoading || !statusLoaded) return true;
    if (currentPlan === plan) return true;
    if (currentPlan === "legacy_unlimited") return true;
    if (isSubscriber) {
      return billingStatus.nextPlan !== plan;
    }
    return false;
  };

  return (
    <div className="min-h-[100vh] bg-[#fffdf8] text-zinc-900">
      <Navbar isSubscriber={isSubscriber} />

      <div className="mx-auto flex max-w-5xl flex-col items-center px-6 pb-6 pt-12 text-center sm:px-8 sm:pt-16">
        <h1 className="m-0 text-[clamp(1.5rem,calc(1rem+2vw),3.75rem)] font-extrabold leading-none tracking-tight text-zinc-900">
          Reverse more. Build faster.
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-zinc-600 sm:text-base">
          Choose the plan that matches your workload. Existing $9 unlimited
          subscribers stay unlimited until renewal, then switch to Starter.
        </p>
      </div>

      {billingStatus.isLegacy ? (
        <div className="mx-auto mb-6 max-w-5xl px-6 sm:px-8">
          <div className="rounded-lg border-[2.5px] border-zinc-900 bg-[#fff4da] p-4 text-sm text-zinc-800">
            You&apos;re on Legacy Unlimited right now. Your access stays the same
            until the next renewal.
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="mx-auto mb-6 max-w-5xl px-6 sm:px-8">
          <div className="rounded-lg border-[2.5px] border-red-700 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        </div>
      ) : null}

      <div className="mx-auto grid max-w-5xl gap-5 px-6 pb-12 sm:grid-cols-3 sm:px-8">
        {PLAN_CARDS.map((plan) => (
          <div key={plan.plan} className="relative isolate">
            <div
              className="pointer-events-none absolute inset-0 rounded-lg bg-zinc-900"
              style={{ transform: "translate(5px,5px)" }}
              aria-hidden
            />
            <div className="relative flex h-full flex-col gap-4 rounded-lg border-[2.5px] border-zinc-900 bg-[#fff4da] p-5 sm:p-6">
              <div>
                <div className="mb-1 text-xs font-semibold tracking-wide text-zinc-600">
                  {plan.title.toUpperCase()}
                </div>
                <div className="text-4xl font-extrabold tracking-tight sm:text-[2.5rem]">
                  {plan.price}
                  <span className="text-base font-semibold text-zinc-500 sm:text-lg">
                    /mo
                  </span>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-2 border-y border-zinc-900 py-3.5">
                {plan.features.map((feature) => (
                  <FeatureRow key={`${plan.plan}-${feature}`} title={feature} />
                ))}
              </div>

              <span className="relative isolate block">
                <span
                  className="pointer-events-none absolute inset-0 rounded-md bg-zinc-900"
                  style={{ transform: "translate(3px,3px)" }}
                  aria-hidden
                />
                <button
                  type="button"
                  disabled={actionDisabled(plan.plan)}
                  onClick={() => void handlePlanAction(plan.plan)}
                  className="relative z-10 w-full cursor-pointer rounded-md border-[2.5px] border-zinc-900 bg-[#d31611] px-4 py-2.5 text-sm font-bold text-white transition-transform duration-100 enabled:hover:-translate-x-px enabled:hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60 sm:px-5 sm:text-base"
                >
                  {actionLabel(plan.plan)}
                </button>
              </span>
            </div>
          </div>
        ))}
      </div>

      <AuthModal isOpen={showAuthModal} onClose={handleAuthModalClose} />
    </div>
  );
}
