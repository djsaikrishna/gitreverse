import type { Metadata } from "next";
import { SponsorPage } from "@/components/sponsor-page";

const description =
  "Reach developers while they reverse engineer GitHub repos into build-ready prompts. Sponsor GitReverse during viral growth.";

export const metadata: Metadata = {
  title: "Sponsor",
  description,
  alternates: { canonical: "https://gitreverse.com/sponsor" },
  openGraph: {
    title: "Sponsor GitReverse",
    description,
    url: "https://gitreverse.com/sponsor",
    type: "website",
  },
  twitter: {
    title: "Sponsor GitReverse",
    description,
  },
};

export default function SponsorRoute() {
  return <SponsorPage />;
}