import type { Metadata } from "next";
import { PremiumPage } from "@/components/premium-page";

export const metadata: Metadata = {
  title: "Premium",
  description:
    "Starter for $9/mo, Pro for $19/mo, or Unlimited for $39/mo.",
  alternates: { canonical: "https://gitreverse.com/premium" },
  openGraph: {
    title: "Premium",
    description:
      "Starter for $9/mo, Pro for $19/mo, or Unlimited for $39/mo.",
    url: "https://gitreverse.com/premium",
    type: "website",
  },
  twitter: {
    title: "Premium",
    description:
      "Starter for $9/mo, Pro for $19/mo, or Unlimited for $39/mo.",
  },
};

export default function PremiumRoute() {
  return <PremiumPage />;
}
