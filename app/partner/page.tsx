import type { Metadata } from "next";
import { PartnerPage } from "@/components/partner-page";

export const metadata: Metadata = {
  title: "Partner",
  description:
    "Partner with GitReverse and get high-intent visitors to your site.",
  robots: { index: false, follow: false },
};

type PartnerRouteProps = {
  searchParams: Promise<{ checkout?: string }>;
};

export default async function PartnerRoute({ searchParams }: PartnerRouteProps) {
  const params = await searchParams;
  const checkoutStatus =
    params.checkout === "success"
      ? "success"
      : params.checkout === "cancelled"
        ? "cancelled"
        : undefined;

  return <PartnerPage checkoutStatus={checkoutStatus} />;
}
