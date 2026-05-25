import type { Metadata } from "next";
import { PremiumPage } from "@/components/premium-page";

export const metadata: Metadata = {
  title: "Premium",
  description:
    "Unlimited deep reverse, unlimited manual control, and no monthly limits for $9/mo.",
  alternates: { canonical: "https://gitreverse.com/premium" },
  openGraph: {
    title: "Premium",
    description:
      "Unlimited deep reverse, unlimited manual control, and no monthly limits for $9/mo.",
    url: "https://gitreverse.com/premium",
    type: "website",
  },
  twitter: {
    title: "Premium",
    description:
      "Unlimited deep reverse, unlimited manual control, and no monthly limits for $9/mo.",
  },
};

export default function PremiumRoute() {
  return <PremiumPage />;
}
