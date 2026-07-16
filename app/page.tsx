import type { Metadata } from "next";
import { ReversePromptHome } from "@/components/reverse-prompt-home";
import { JsonLd } from "@/components/json-ld";

export const metadata: Metadata = {
  title: "GitReverse",
  description:
    "Reverse engineer a GitHub repo or a website into a prompt you can build from.",
  alternates: { canonical: "https://gitreverse.com" },
  openGraph: {
    title: "GitReverse",
    description:
      "Reverse engineer a GitHub repo or a website into a prompt you can build from.",
    url: "https://gitreverse.com",
  },
  twitter: {
    title: "GitReverse",
    description:
      "Reverse engineer a GitHub repo or a website into a prompt you can build from.",
  },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "GitReverse",
  url: "https://gitreverse.com",
  description:
    "Reverse engineer any GitHub repository or website into a plain-language coding agent prompt you can build from.",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://gitreverse.com/{owner}/{repo}",
    },
    "query-input": "required name=owner",
  },
};

export default function Home() {
  return (
    <>
      <JsonLd data={websiteJsonLd} />
      <ReversePromptHome isHome />
    </>
  );
}
