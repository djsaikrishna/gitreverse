import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ReversePromptHome } from "@/components/reverse-prompt-home";
import { isValidGitHubRepoPath, normalizeRepoSegment } from "@/lib/parse-github-repo";

type PageProps = {
  params: Promise<{ owner: string; repo: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { owner: ownerRaw, repo: repoRaw } = await params;
  const owner = decodeURIComponent(ownerRaw);
  const repoNorm = normalizeRepoSegment(decodeURIComponent(repoRaw));

  const pageTitle = `Deep reverse — ${owner}/${repoNorm}`;
  const pageDesc = `Deep reverse-engineered coding agent prompt for ${owner}/${repoNorm}.`;
  const url = `https://gitreverse.com/${owner}/${repoNorm}/deep`;

  return {
    title: pageTitle,
    description: pageDesc,
    alternates: { canonical: url },
    openGraph: { title: pageTitle, description: pageDesc, url, type: "article" },
    twitter: { title: pageTitle, description: pageDesc },
  };
}

export default async function RepoDeepPage({ params }: PageProps) {
  await connection();
  const { owner: ownerRaw, repo: repoRaw } = await params;
  const owner = decodeURIComponent(ownerRaw);
  const repo = decodeURIComponent(repoRaw);

  if (!isValidGitHubRepoPath(owner, repo)) {
    notFound();
  }

  const repoNorm = normalizeRepoSegment(repo);
  const initialRepoInput = `${owner}/${repoNorm}`;

  return (
    <ReversePromptHome
      initialRepoInput={initialRepoInput}
      autoSubmit={false}
      autoSubmitDeep
      owner={owner}
      repo={repoNorm}
      preserveUrl
    />
  );
}
