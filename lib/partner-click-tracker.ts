import { track } from "@vercel/analytics";

export type AnythingClickPlacement = "codebase-prompt" | "website-prompt";

export type ContextDevClickPlacement =
  | "home-card"
  | "repo-card"
  | "website-crosssell";

export function trackAnythingClick(placement: AnythingClickPlacement) {
  track("Anything Click", { destination: "anything.com", placement });
}

export function trackContextDevClick(placement: ContextDevClickPlacement) {
  track("Context.dev Click", { destination: "context.dev", placement });
}
