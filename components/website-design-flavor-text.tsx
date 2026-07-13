"use client";

import { useEffect, useState } from "react";

const ELLIPSIS_MS = 450;
const FLAVOR_MS = 2400;

/** Rotating filler copy shown while the design.md LLM call is in flight (the slow step). */
const DESIGN_FLAVOR_LINES = [
  "Extracting the color palette",
  "Analyzing typography choices",
  "Mapping the grid and layout system",
  "Studying spacing and visual rhythm",
  "Detecting recurring component patterns",
  "Reading the brand voice and tone",
  "Cataloging button and card styles",
  "Inspecting hover and motion cues",
  "Checking responsive breakpoints",
  "Distilling the visual hierarchy",
  "Naming design tokens",
  "Drafting the design system doc",
  "Cross checking colors against contrast rules",
  "Writing section headers for design.md",
  "Polishing design.md",
  "Almost done with the design system",
] as const;

const ELLIPSIS_FRAMES = ["", ".", "..", "..."] as const;

export function WebsiteDesignFlavorText() {
  const [flavorIndex, setFlavorIndex] = useState(0);
  const [ellipsisIndex, setEllipsisIndex] = useState(0);

  useEffect(() => {
    const ellipsisId = window.setInterval(() => {
      setEllipsisIndex((i) => (i + 1) % ELLIPSIS_FRAMES.length);
    }, ELLIPSIS_MS);

    const flavorId = window.setInterval(() => {
      setFlavorIndex((i) => (i + 1) % DESIGN_FLAVOR_LINES.length);
    }, FLAVOR_MS);

    return () => {
      window.clearInterval(ellipsisId);
      window.clearInterval(flavorId);
    };
  }, []);

  const line = DESIGN_FLAVOR_LINES[flavorIndex] ?? DESIGN_FLAVOR_LINES[0];
  const dots = ELLIPSIS_FRAMES[ellipsisIndex] ?? "";

  return (
    <p
      className="min-h-[1.25rem] text-sm text-zinc-600"
      role="status"
      aria-live="polite"
    >
      {line}
      <span className="inline-block min-w-[1.25em] font-mono tabular-nums text-zinc-500">
        {dots}
      </span>
    </p>
  );
}
