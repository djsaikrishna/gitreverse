/**
 * Smoke test for X profile reverse (parser + optional live API).
 * Usage: npx tsx --env-file=.env.local scripts/smoke-x-profile.mjs
 */
import { parseXProfileInput } from "../lib/parse-x-profile";

const parsed = parseXProfileInput("@naval");
if (!parsed || parsed.login !== "naval") {
  console.error("parseXProfileInput failed");
  process.exit(1);
}
console.log("parser ok:", parsed);

const apiKey = process.env.X_API_KEY?.trim();
const apiSecret = process.env.X_API_SECRET?.trim();
const token = process.env.X_BEARER_TOKEN?.trim();
if (!apiKey || !apiSecret) {
  if (!token) {
    console.log("skip live API: set X_API_KEY + X_API_SECRET or X_BEARER_TOKEN");
    process.exit(0);
  }
}

const { getXProfileWithPosts } = await import("../lib/x-profile-client");
const handle = process.argv[2] ?? "naval";
const result = await getXProfileWithPosts(handle);
console.log("profile:", result.overview.handle, result.overview.displayName);
console.log("link-free posts:", result.posts.length);
if (result.posts.length === 0) {
  console.error("expected at least one link-free post");
  process.exit(1);
}
console.log("live API ok");
