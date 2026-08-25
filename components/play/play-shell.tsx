"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Navbar } from "@/components/navbar";

export function PlayShell({
  children,
  backLabel = "All playable slices",
}: {
  children: ReactNode;
  backLabel?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[#0d0c0b] text-zinc-100">
      <Navbar />
      <div className="relative flex min-h-0 flex-1 flex-col">
        <Link
          href="/play"
          className="absolute left-3 top-3 z-30 rounded-md border-[2.5px] border-zinc-900 bg-[#fff4da] px-2.5 py-1 text-xs font-bold text-zinc-900"
        >
          ← {backLabel}
        </Link>
        {children}
      </div>
    </div>
  );
}
