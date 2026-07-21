import { DesignSwapHome } from "@/components/design-swap-home";
import { parseWebsiteInput } from "@/lib/parse-website-input";

type PageProps = {
  searchParams: Promise<{ contentUrl?: string }>;
};

export default async function DesignSwapPage({ searchParams }: PageProps) {
  const { contentUrl: rawContentUrl } = await searchParams;
  const parsed = rawContentUrl ? parseWebsiteInput(rawContentUrl) : null;

  return (
    <DesignSwapHome initialContentUrl={parsed?.url ?? ""} />
  );
}
