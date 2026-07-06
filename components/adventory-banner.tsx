"use client";

import { useEffect, useRef } from "react";

const PLACEMENT_ID = "a8783f8a-f160-4ac8-84c3-6b2b41e2bd4f";

type AdventoryBannerProps = {
  className?: string;
};

export function AdventoryBanner({ className }: AdventoryBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://adventory.to/ad.banner.js";
    script.id = `adventory-${PLACEMENT_ID}`;
    script.setAttribute("data-placement", PLACEMENT_ID);
    script.setAttribute("data-bg", "#fffdf8");
    script.setAttribute("data-text", "#18181b");
    script.setAttribute("data-cta-bg", "#d31611");

    container.appendChild(script);

    return () => {
      container.querySelectorAll(".adventory-ad").forEach((node) => node.remove());
      script.remove();
    };
  }, []);

  return <div ref={containerRef} className={className} />;
}
