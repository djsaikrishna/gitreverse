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

Given design evidence from a live website (Firecrawl branding and/or Context.dev styleguide + brand) and page markdown, write a complete design system markdown document.

Use the provided design evidence as the primary source of design tokens. When Context.dev styleguide data is present, treat it as higher-confidence evidence (per-element typography, component-level CSS, spacing scale, shadows). When only Firecrawl branding is present, use that instead.

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
