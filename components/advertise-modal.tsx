"use client";

import { useEffect, useId } from "react";
import { AdvertiseForm } from "@/components/advertise-form";
import { FOOTER_AD_PRICE_LABEL } from "@/lib/footer-ads";

export function AdvertiseModal({
  open,
  soldOut,
  onClose,
}: {
  open: boolean;
  soldOut?: boolean;
  onClose: () => void;
}) {
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-zinc-900/40 px-4 py-8"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative max-h-[min(90vh,640px)] w-full max-w-md overflow-hidden rounded-[10px] border-[3px] border-zinc-900 bg-[#FFFDF8]"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          className="pointer-events-none absolute inset-0 rounded-[10px] bg-zinc-900"
          style={{ transform: "translate(5px,5px)" }}
          aria-hidden
        />
        <div className="relative max-h-[inherit] overflow-y-auto rounded-[10px] bg-[#FFFDF8]">
          <div className="border-b-2 border-zinc-200 bg-[#fff4da] px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  id={titleId}
                  className="text-sm font-extrabold tracking-tight text-zinc-900"
                >
                  Advertise on GitReverse
                </h2>
                <p
                  id={descId}
                  className="mt-1 text-xs leading-relaxed text-zinc-500"
                >
                  {FOOTER_AD_PRICE_LABEL} · live immediately after payment
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border-[2px] border-zinc-900 bg-white px-2 py-1 text-xs font-bold text-zinc-900 hover:bg-zinc-50"
              >
                Close
              </button>
            </div>
          </div>

          <div className="space-y-4 p-4">
            <ul className="space-y-1.5 text-sm text-zinc-700">
              <li>
                <span className="font-extrabold text-zinc-900">200K</span>{" "}
                visitors
              </li>
              <li>High-intent developer audience</li>
              <li>If you&apos;re selling to developers, advertise here</li>
            </ul>
            <AdvertiseForm soldOut={soldOut} />
          </div>
        </div>
      </div>
    </div>
  );
}
