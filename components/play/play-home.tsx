"use client";

import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { PLAY_GAMES } from "@/lib/play/catalog";

export function PlayHome() {
  return (
    <div className="flex min-h-screen flex-col bg-[#FFFDF8] text-zinc-900">
      <Navbar />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-12 sm:px-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
            Kernel slices
          </p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tighter sm:text-5xl">
            Playable reverse demos
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-zinc-600">
            Two browser games generated from gitreverse game-reverse prompts.
            Both drive the vendored Quaternius Universal kernel (Idle_Loop,
            Walk_Loop, Jog_Fwd_Loop, Sprint_Loop, and the rest of the 43 clips)
            through Three.js AnimationMixer. No licensed maps, clubs, or names.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {PLAY_GAMES.map((game) => (
            <div key={game.id} className="relative">
              <div className="absolute inset-0 translate-x-2 translate-y-2 rounded-xl bg-zinc-900" />
              <div className="relative z-10 flex h-full flex-col rounded-xl border-[3px] border-zinc-900 bg-[#fff4da] p-5">
                <h2 className="text-xl font-extrabold">{game.title}</h2>
                <p className="mt-1 text-sm text-zinc-700">{game.tagline}</p>
                <p className="mt-3 text-xs leading-relaxed text-zinc-600">
                  {game.setting}
                </p>
                <Link
                  href={game.href}
                  className="mt-4 inline-flex w-fit rounded-md border-[2.5px] border-zinc-900 bg-[#d31611] px-4 py-2 text-sm font-bold text-white"
                >
                  Play {game.title}
                </Link>
              </div>
            </div>
          ))}
        </div>

        <p className="text-sm text-zinc-500">
          Movement lab:{" "}
          <Link href="/game/kernel" className="font-medium underline underline-offset-2">
            /game/kernel
          </Link>
          . Reverse a title:{" "}
          <Link href="/game" className="font-medium underline underline-offset-2">
            /game
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
