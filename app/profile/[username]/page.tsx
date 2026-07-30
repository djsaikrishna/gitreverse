import { redirect } from "next/navigation";
import {
  isValidXProfileHandle,
  normalizeProfileSegment,
} from "@/lib/parse-x-profile";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ username: string }>;
};

/** Legacy /profile/:username → /:username */
export default async function ProfileUsernameRedirect({ params }: PageProps) {
  const { username: usernameRaw } = await params;
  const login = normalizeProfileSegment(decodeURIComponent(usernameRaw)).toLowerCase();

  if (!isValidXProfileHandle(login)) {
    notFound();
  }

  redirect(`/${encodeURIComponent(login)}`);
}
