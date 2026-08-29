import type { Metadata } from "next";
import { AdvertisePage } from "@/components/advertise-page";

export const metadata: Metadata = {
  title: "Advertise",
  description:
    "Advertise on GitReverse for $799. 200K visitors and a high-intent developer audience. Your footer slot goes live immediately after payment.",
  alternates: { canonical: "https://gitreverse.com/advertise" },
  openGraph: {
    title: "Advertise on GitReverse",
    description:
      "200K visitors. High-intent developers. $799 for a footer slot that goes live immediately.",
    url: "https://gitreverse.com/advertise",
  },
};

type AdvertiseRouteProps = {
  searchParams: Promise<{ session_id?: string; checkout?: string }>;
};

export default async function AdvertiseRoute({
  searchParams,
}: AdvertiseRouteProps) {
  const params = await searchParams;
  const sessionId = params.session_id?.trim() || undefined;
  const checkoutStatus =
    params.checkout === "cancelled" ? "cancelled" : undefined;

  return (
    <AdvertisePage sessionId={sessionId} checkoutStatus={checkoutStatus} />
  );
}
