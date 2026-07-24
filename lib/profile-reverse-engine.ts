import {
  getGitHubProfileOverview,
  getGitHubRepoStyleDetails,
  selectReposForDeepDive,
  type GitHubProfileOverview,
  type GitHubProfileRepo,
  type GitHubRepoStyleDetails,
} from "@/lib/github-profile-client";
import { callQuickLlm, resolveLlmTarget } from "@/lib/quick-llm";
import { PROFILE_SYSTEM_PROMPT } from "@/lib/profile-system-prompt";
import {
  readProfileReverse,
  writeProfileReverse,
} from "@/lib/profile-reverse-storage";

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

function dependencyFence(path: string): string {
  if (path.endsWith(".json") || path.endsWith(".toml")) return "json";
  if (path.endsWith(".gradle.kts")) return "kotlin";
  if (path.endsWith(".gradle")) return "gradle";
  if (path.endsWith(".swift")) return "swift";
  return "";
}

function repoBullet(repo: GitHubProfileRepo): string {
  const language = repo.primaryLanguage ? `, ${repo.primaryLanguage}` : "";
  const topics =
    repo.topics.length > 0
      ? `, topics: ${repo.topics.slice(0, 4).join(", ")}`
      : "";
  return `- ${repo.nameWithOwner} (${repo.url})${repo.description ? `: ${repo.description}` : ""} (${repo.stargazerCount} stars${language}${topics})`;
}

export function buildProfileAnalysisPrompt(input: {
  overview: GitHubProfileOverview;
  repoDetails: GitHubRepoStyleDetails[];
}): string {
  const { overview, repoDetails } = input;

  const repoBlocks = repoDetails
    .map((repo) =>
      [
        `## ${repo.nameWithOwner}`,
        repo.description ? `Description: ${repo.description}` : "",
        repo.readme ? `README excerpt:\n${repo.readme}` : "",
        repo.dependencies && repo.dependenciesPath
          ? `Dependency manifest (${repo.dependenciesPath}):\n\`\`\`${dependencyFence(repo.dependenciesPath)}\n${repo.dependencies}\n\`\`\``
          : "",
        repo.globalsCss && repo.globalsCssPath
          ? `UI/design file (${repo.globalsCssPath}):\n\`\`\`css\n${repo.globalsCss}\n\`\`\``
          : "",
      ]
        .filter(Boolean)
        .join("\n\n")
    )
    .join("\n\n");

  return [
    `Profile login: ${overview.login}`,
    `Display name: ${overview.displayName}`,
    overview.bio ? `Bio: ${overview.bio}` : "",
    overview.websiteUrl ? `Website: ${overview.websiteUrl}` : "",
    overview.followerCount != null ? `Followers: ${overview.followerCount}` : "",
    "",
    "Pinned / notable repositories:",
    ...overview.pinnedRepos.map(repoBullet),
    "",
    "Top repositories:",
    ...overview.topRepos.map(repoBullet),
    "",
    overview.profileReadme
      ? `Profile README:\n${overview.profileReadme}`
      : "Profile README: none",
    "",
    "Repository evidence for tech stack and UI taste:",
    repoBlocks || "No detailed repository excerpts were available.",
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

  onStatus?.("Fetching GitHub profile");
  let overview: GitHubProfileOverview;
  try {
    overview = await getGitHubProfileOverview(normalizedLogin);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.toLowerCase().includes("not found") ? 404 : 500;
    return { ok: false, error: message, status };
  }

  onStatus?.("Picking the most telling repos");
  const selectedRepos = selectReposForDeepDive([
    ...overview.pinnedRepos,
    ...overview.topRepos,
  ]);

  onStatus?.("Reading READMEs and style files");
  let repoDetails: GitHubRepoStyleDetails[];
  try {
    repoDetails = await getGitHubRepoStyleDetails(selectedRepos);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message, status: 502 };
  }

  onStatus?.("Writing system prompt");
  const promptResult = await callQuickLlm(
    llm,
    PROFILE_SYSTEM_PROMPT,
    buildProfileAnalysisPrompt({ overview, repoDetails }),
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
      login: overview.login,
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
    login: overview.login,
    displayName: overview.displayName,
    avatarUrl: overview.avatarUrl,
    prompt,
    fromCache: false,
  };
}
