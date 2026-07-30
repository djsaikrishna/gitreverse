import { callQuickLlm, resolveLlmTarget } from "@/lib/quick-llm";
import { PROFILE_SYSTEM_PROMPT } from "@/lib/profile-system-prompt";
import {
  readProfileReverse,
  writeProfileReverse,
} from "@/lib/profile-reverse-storage";
import {
  getXProfileWithPosts,
  type XProfileOverview,
  type XProfilePost,
} from "@/lib/x-profile-client";

export type ProfileReverseResult =
  | {
      ok: true;
      login: string;
      displayName: string;
      avatarUrl: string;
      prompt: string;
      fromCache: boolean;
    }
  | { ok: false; error: string; status: number };

function formatPost(post: XProfilePost, index: number): string {
  const metrics = [
    post.likeCount != null ? `${post.likeCount} likes` : null,
    post.retweetCount != null ? `${post.retweetCount} reposts` : null,
    post.replyCount != null ? `${post.replyCount} replies` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return [
    `Post ${index + 1}${post.createdAt ? ` (${post.createdAt})` : ""}:`,
    post.text,
    metrics ? `(${metrics})` : "",
    post.lang ? `[lang: ${post.lang}]` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildProfileAnalysisPrompt(input: {
  overview: XProfileOverview;
  posts: XProfilePost[];
}): string {
  const { overview, posts } = input;

  return [
    `X handle: @${overview.handle}`,
    `Display name: ${overview.displayName}`,
    overview.bio ? `Bio: ${overview.bio}` : "",
    overview.location ? `Location: ${overview.location}` : "",
    overview.websiteUrl ? `Website: ${overview.websiteUrl}` : "",
    overview.verified ? "Verified: yes" : "",
    overview.followerCount != null
      ? `Followers: ${overview.followerCount}`
      : "",
    overview.followingCount != null
      ? `Following: ${overview.followingCount}`
      : "",
    "",
    `Recent original posts (${posts.length} link-free samples, no retweets/replies):`,
    posts.length > 0
      ? posts.map(formatPost).join("\n\n")
      : "No suitable original posts were available in the recent timeline.",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function ensureProfileReversed(opts: {
  login: string;
  onStatus?: (message: string) => void;
  force?: boolean;
}): Promise<ProfileReverseResult> {
  const { login, onStatus, force } = opts;
  const normalizedLogin = login.trim().toLowerCase();

  if (!force) {
    const cached = await readProfileReverse(normalizedLogin);
    if (cached) {
      return {
        ok: true,
        login: cached.login,
        displayName: cached.displayName,
        avatarUrl: cached.avatarUrl,
        prompt: cached.prompt,
        fromCache: true,
      };
    }
  }

  const llm = resolveLlmTarget();
  if ("error" in llm) {
    return { ok: false, error: llm.error, status: 500 };
  }

  onStatus?.("Fetching X profile");
  let overview: XProfileOverview;
  let posts: XProfilePost[];
  try {
    const result = await getXProfileWithPosts(normalizedLogin);
    overview = result.overview;
    posts = result.posts;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.toLowerCase().includes("not found") ? 404 : 500;
    return { ok: false, error: message, status };
  }

  if (posts.length === 0) {
    return {
      ok: false,
      error:
        "No link-free original posts found on this profile. Try another account with more text posts.",
      status: 422,
    };
  }

  onStatus?.("Writing system prompt");
  const promptResult = await callQuickLlm(
    llm,
    PROFILE_SYSTEM_PROMPT,
    buildProfileAnalysisPrompt({ overview, posts }),
    3000
  );

  if (!promptResult.ok) {
    return {
      ok: false,
      error: promptResult.error,
      status: promptResult.status,
    };
  }

  const prompt = promptResult.text.trim();
  if (!prompt) {
    return {
      ok: false,
      error: "Model did not return a usable system prompt.",
      status: 500,
    };
  }

  try {
    await writeProfileReverse({
      login: overview.handle,
      displayName: overview.displayName,
      avatarUrl: overview.avatarUrl,
      prompt,
    });
  } catch (error) {
    console.warn(
      "[reverse-profile] cache write failed:",
      error instanceof Error ? error.message : error
    );
  }

  return {
    ok: true,
    login: overview.handle,
    displayName: overview.displayName,
    avatarUrl: overview.avatarUrl,
    prompt,
    fromCache: false,
  };
}
