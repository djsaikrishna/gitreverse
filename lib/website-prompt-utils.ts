import { websiteDesignPageUrl } from "@/lib/site-url";

/** Matches legacy bare API URLs and old markdown-link suffixes. */
const DESIGN_SYSTEM_SUFFIX_RE =
  /\n*Use this design system for the visuals:\s*(?:\[[^\]]*\]\([^)]+\)|https?:\/\/\S+)\s*$/i;

export function stripDesignSystemLink(prompt: string): string {
  return prompt.replace(DESIGN_SYSTEM_SUFFIX_RE, "").trimEnd();
}

export function appendDesignSystemLink(prompt: string, slug: string): string {
  const stripped = stripDesignSystemLink(prompt);
  const link = websiteDesignPageUrl(slug);
  const suffix = `Use this design system for the visuals: ${link}`;
  if (stripped.includes(suffix)) return stripped;
  return `${stripped}\n\n${suffix}`;
}
