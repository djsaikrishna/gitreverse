import { readFileSync } from "node:fs";
import path from "node:path";

function loadDesignTemplate(): string {
  const templatePath = path.join(
    process.cwd(),
    "lib",
    "assets",
    "DESIGN.template.md"
  );
  return readFileSync(templatePath, "utf8");
}

export function buildWebsiteDesignSystemPrompt(): string {
  const template = loadDesignTemplate();
  return `You are an expert design systems writer. You synthesize live website evidence into a reusable design.md document.

## Task

Given Firecrawl branding JSON and page markdown from a live website, write a complete design system markdown document.

## Rules

- Follow the section structure in the template below exactly (all 9 required sections).
- Use semantic color names and exact hex values when branding data provides them.
- Label observed facts vs reasonable inferences. Put uncertain items in Evidence Notes if needed.
- If branding indicates light or dark colorScheme, document Theme Modes explicitly.
- Translate technical tokens into design language an agent can reuse.
- Do not invent features or pages not supported by the evidence.
- Output markdown only. No preamble, no code fences wrapping the whole document.

## Template structure

${template}`;
}
