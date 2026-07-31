import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { connection } from "next/server";
import { ProfileChatPage } from "@/components/profile-chat-page";
import {
  isValidXProfileHandle,
  normalizeProfileSegment,
} from "@/lib/parse-x-profile";
import { readProfileReverse } from "@/lib/profile-reverse-storage";

type PageProps = {
  params: Promise<{ username: string }>;
};

const getCachedEntry = cache(async (login: string) => {
  try {
    return await readProfileReverse(login);
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username: usernameRaw } = await params;
  const login = normalizeProfileSegment(
    decodeURIComponent(usernameRaw)
  ).toLowerCase();

  const data = await getCachedEntry(login);
  const pageTitle = data?.displayName?.trim() || login;
  const pageDesc = `Chat with @${login} in their reversed X voice on GitReverse.`;
  const url = `https://gitreverse.com/chat/${login}`;

  return {
    title: `Chat with ${pageTitle}`,
    description: pageDesc,
    alternates: { canonical: url },
    openGraph: {
      title: `Chat with ${pageTitle}`,
      description: pageDesc,
      url,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: `Chat with ${pageTitle}`,
      description: pageDesc,
    },
  };
}

export default async function ChatUsernamePage({ params }: PageProps) {
  await connection();

  const { username: usernameRaw } = await params;
  const login = normalizeProfileSegment(
    decodeURIComponent(usernameRaw)
  ).toLowerCase();

  if (!isValidXProfileHandle(login)) {
    notFound();
  }

  const cached = await getCachedEntry(login);

  return (
    <ProfileChatPage
      login={login}
      displayName={cached?.displayName?.trim() || login}
      avatarUrl={cached?.avatarUrl ?? ""}
    />
  );
}
