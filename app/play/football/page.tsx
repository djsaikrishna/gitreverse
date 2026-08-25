import type { Metadata } from "next";
import { FootballPage } from "@/components/play/football-page";

export const metadata: Metadata = {
  title: "Floodlight Eleven",
  description:
    "Harbor Rovers versus Milltown Athletic. Kickoff, pass, shoot, save, final whistle.",
};

export default function Page() {
  return <FootballPage />;
}
