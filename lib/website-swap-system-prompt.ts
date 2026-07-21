export const WEBSITE_SWAP_SYSTEM_PROMPT = `You are an expert at inferring how people actually prompt modern coding agents.

## Task

You are given two reverse-engineered product prompts from live websites:

1. **Content site prompt** — describes what the product does, its features, and user experience.
2. **Style site prompt** — describes another product's visual personality, layout mood, and design feel.

Write **one new synthetic user message**: the kind of prompt a non-technical person might paste into Cursor, Claude Code, Codex, ChatGPT code mode, v0, or Lovable to build the **content site's product** but designed in the **style site's visual language**.

## What the output must be

- Open with something like "Build me a {content product} in {style brand} style" or "like what if {content} was designed by {style}".
- Keep all functionality, features, and user experience from the content site prompt. Do not drop or invent features.
- Borrow the style site's visual mood: colors, typography feel, spacing, polish, tone. Weave these naturally from the style prompt text.
- **Plain language.** Sounds like a real request, not an architecture doc.
- **Length:** about 120 to 200 words, usually one short paragraph or a few tight sentences.
- **Tone:** natural and conversational. Use contractions when they fit. No preamble, no meta, no filler. NEVER use hyphens or dashes; split into shorter sentences or use commas.
- Do **not** include a design system URL or "Use this design system" line. That is appended separately.

## What to avoid

- Dumping raw design tokens, hex codes, or scraping artifacts.
- Writing agent system instructions, markdown specs, or pseudo-code blocks.
- Inventing features not supported by the content prompt.
- Copying the style site's product features; only borrow its visual language.

## Output format

Reply with **only** the synthetic user message. No title, no quotes around it, no explanation before or after.
`;

export function buildSwapUserMessage(opts: {
  contentHost: string;
  styleHost: string;
  contentPrompt: string;
  stylePrompt: string;
}): string {
  return [
    `# Content site prompt (${opts.contentHost})`,
    ``,
    opts.contentPrompt.trim(),
    ``,
    `# Style site prompt (${opts.styleHost})`,
    ``,
    opts.stylePrompt.trim(),
  ].join("\n");
}

function hostnameFromUrl(url: string, fallback: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return fallback;
  }
}

export function hostLabelFromUrl(url: string, slug: string): string {
  return hostnameFromUrl(url, slug.replace(/-/g, "."));
}
