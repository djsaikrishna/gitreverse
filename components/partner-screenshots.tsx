"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useState } from "react";

const SCREENSHOTS = [
  {
    src: "/partner/traffic.png",
    alt: "Vercel Analytics showing 35,636 monthly visitors on gitreverse.vercel.app",
    width: 1200,
    height: 600,
  },
  {
    src: "/partner/events.png",
    alt: "Analytics events: Design This, Builder Button Clicked, and CodeRabbit Click",
    width: 600,
    height: 400,
  },
  {
    src: "/partner/builder-clicks.png",
    alt: "Builder Button Clicked breakdown: v0 with 800 visitors and Lovable with 742 visitors",
    width: 600,
    height: 400,
  },
] as const;

function ScreenshotCard({
  src,
  alt,
  width,
  height,
  onOpen,
}: (typeof SCREENSHOTS)[number] & { onOpen: () => void }) {
  return (
    <div className="relative w-full self-start">
      <div className="absolute inset-0 translate-x-1 translate-y-1 rounded-lg bg-zinc-900" />
      <button
        type="button"
        onClick={onOpen}
        className="group relative z-10 block w-full overflow-hidden rounded-lg border-[3px] border-zinc-900 bg-white p-2 text-left transition-transform hover:-translate-x-px hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
        aria-label={`View full screen: ${alt}`}
      >
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className="w-full rounded-md"
        />
        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded border-[2px] border-zinc-900 bg-white/95 px-2 py-1 text-[11px] font-bold text-zinc-900 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5h-4m4 0v-4m0 4l-5-5"
            />
          </svg>
          Expand
        </span>
      </button>
    </div>
  );
}

export function PartnerScreenshots() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const dialogTitleId = useId();

  const close = useCallback(() => setActiveIndex(null), []);

  useEffect(() => {
    if (activeIndex === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [activeIndex, close]);

  useEffect(() => {
    if (activeIndex === null) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [activeIndex]);

  const active = activeIndex !== null ? SCREENSHOTS[activeIndex] : null;

  return (
    <>
      <div className="flex flex-col gap-4">
        <ScreenshotCard
          {...SCREENSHOTS[0]}
          onOpen={() => setActiveIndex(0)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <ScreenshotCard
            {...SCREENSHOTS[1]}
            onOpen={() => setActiveIndex(1)}
          />
          <ScreenshotCard
            {...SCREENSHOTS[2]}
            onOpen={() => setActiveIndex(2)}
          />
        </div>
      </div>

      {active ? (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-zinc-900/80 p-4 sm:p-8"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            className="relative flex max-h-full w-full max-w-6xl flex-col"
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <p
                id={dialogTitleId}
                className="text-sm font-semibold text-white sm:text-base"
              >
                {active.alt}
              </p>
              <button
                type="button"
                onClick={close}
                className="shrink-0 rounded-md border-[2.5px] border-white bg-white px-3 py-1.5 text-sm font-bold text-zinc-900 hover:bg-zinc-100"
              >
                Close
              </button>
            </div>
            <div className="relative max-h-[calc(100vh-8rem)] overflow-auto rounded-lg border-[3px] border-zinc-900 bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={active.src}
                alt={active.alt}
                className="mx-auto h-auto max-h-[calc(100vh-9rem)] w-full object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
