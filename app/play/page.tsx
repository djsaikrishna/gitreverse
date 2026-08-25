import type { Metadata } from "next";
import { PlayHome } from "@/components/play/play-home";

export const metadata: Metadata = {
  title: "Playable slices",
  description: "Cinder Bay and Floodlight Eleven, driven by the Quaternius Universal kernel.",
};

export default function Page() {
  return <PlayHome />;
}
