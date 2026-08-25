import type { Metadata } from "next";
import { OpenWorldPage } from "@/components/play/openworld-page";

export const metadata: Metadata = {
  title: "Cinder Bay",
  description:
    "Roam Iron Wharf, Ridge Hill, and Market Cut. Deliver a bag, shake a tail, boost a coupe.",
};

export default function Page() {
  return <OpenWorldPage />;
}
