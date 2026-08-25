"use client";

import { useEffect, useRef, useState } from "react";
import { createTouchOverlay, type TouchOverlay } from "@/lib/play/input";
import { PlayShell } from "@/components/play/play-shell";
import { TouchPad } from "@/components/play/touch-pad";
import {
  FOOTBALL_TEAMS,
  type FootballHud,
  type FootballTeamId,
} from "@/lib/play/football/sim";
import { playGameById } from "@/lib/play/catalog";

const GAME = playGameById("football");

export function FootballPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<TouchOverlay>(createTouchOverlay());
  const playingRef = useRef(false);
  const [team, setTeam] = useState<FootballTeamId | null>(null);
  const [phase, setPhase] = useState<"start" | "loading" | "play" | "pause">("start");
  const [error, setError] = useState<string | null>(null);
  const [hud, setHud] = useState<FootballHud | null>(null);

  useEffect(() => {
    if (!team || phase === "start") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let handle: { dispose: () => void } | null = null;
    playingRef.current = phase === "play";

    (async () => {
      const { bootFootball } = await import("@/components/play/football-runtime");
      if (disposed) return;
      handle = await bootFootball(canvas, {
        overlay: overlayRef.current,
        userTeam: team,
        onHud: setHud,
        isPlaying: () => playingRef.current,
      });
      if (disposed) {
        handle.dispose();
        return;
      }
      setPhase((p) => (p === "loading" ? "play" : p));
    })().catch((e) => {
      if (!disposed) setError(e instanceof Error ? e.message : String(e));
    });

    return () => {
      disposed = true;
      handle?.dispose();
    };
  }, [team, phase === "start" ? "start" : "boot"]);

  useEffect(() => {
    playingRef.current = phase === "play";
  }, [phase]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Escape") return;
      setPhase((p) => (p === "play" ? "pause" : p === "pause" ? "play" : p));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pick = (next: FootballTeamId) => {
    setTeam(next);
    setPhase("loading");
  };

  return (
    <PlayShell>
      {phase === "start" ? (
        <div className="flex flex-1 flex-col items-center justify-center bg-[#0b1220] px-4 text-zinc-100">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">
            Floodlit five-a-side
          </p>
          <h1 className="mt-2 text-5xl font-extrabold tracking-tighter sm:text-6xl">
            Floodlight Eleven
          </h1>
          <p className="mt-3 max-w-lg text-center text-sm text-zinc-300">
            {GAME.setting}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              className="rounded-md border-[3px] border-zinc-900 bg-[#0f6f73] px-6 py-3 text-sm font-bold text-white"
              onClick={() => pick("home")}
            >
              Play as {FOOTBALL_TEAMS.home.name}
            </button>
            <button
              type="button"
              className="rounded-md border-[3px] border-zinc-900 bg-[#d89a1a] px-6 py-3 text-sm font-bold text-zinc-900"
              onClick={() => pick("away")}
            >
              Play as {FOOTBALL_TEAMS.away.name}
            </button>
          </div>
          <ul className="mt-6 max-w-md list-disc space-y-1 pl-5 text-left text-sm text-zinc-400">
            {GAME.howToPlay.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="relative min-h-[calc(100vh-4rem)] flex-1">
          <canvas ref={canvasRef} className="block h-[calc(100vh-4rem)] w-full" />
          {error ? (
            <p className="absolute inset-x-0 top-14 text-center text-sm text-red-200">{error}</p>
          ) : null}
          {phase === "loading" && !error ? (
            <p className="absolute inset-x-0 top-1/2 text-center text-sm font-semibold text-white">
              Loading Quaternius kernel…
            </p>
          ) : null}
          {hud ? (
            <div className="pointer-events-none absolute left-1/2 top-12 z-20 w-[min(100%-1.5rem,36rem)] -translate-x-1/2 rounded-md border-[2.5px] border-zinc-900 bg-[#0b1220]/90 p-3 text-center text-white">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                {hud.title}
              </p>
              <p className="mt-1 text-2xl font-black tabular-nums">
                {hud.home} {hud.scoreHome}–{hud.scoreAway} {hud.away}
              </p>
              <p className="mt-1 text-sm font-bold text-[#ffe08a]">{hud.clock} · {hud.event}</p>
              <p className="mt-1 font-mono text-[11px] text-[#9fd8d4]">
                You {hud.userClip} · Field {hud.fieldClips}
              </p>
              <p className="mt-2 text-[11px] text-zinc-400">{hud.hint}</p>
            </div>
          ) : null}
          {phase === "pause" ? (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-zinc-950/70">
              <div className="rounded-xl border-[3px] border-zinc-900 bg-[#fff4da] px-8 py-6 text-center text-zinc-900">
                <p className="text-lg font-extrabold">Paused</p>
                <button
                  type="button"
                  className="mt-4 rounded-md border-[2.5px] border-zinc-900 bg-[#d31611] px-4 py-2 text-sm font-bold text-white"
                  onClick={() => setPhase("play")}
                >
                  Resume
                </button>
              </div>
            </div>
          ) : null}
          {hud?.phase === "fulltime" ? (
            <div className="pointer-events-none absolute bottom-24 left-1/2 z-20 -translate-x-1/2 rounded-md border-[2.5px] border-zinc-900 bg-[#ffc480] px-4 py-2 text-sm font-bold text-zinc-900">
              {hud.event} · press R to replay
            </div>
          ) : null}
          <TouchPad overlay={overlayRef.current} mode="football" />
        </div>
      )}
    </PlayShell>
  );
}
