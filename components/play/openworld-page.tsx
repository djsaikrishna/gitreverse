"use client";

import { useEffect, useRef, useState } from "react";
import { createTouchOverlay, type TouchOverlay } from "@/lib/play/input";
import { LOCO_TO_CLIP, type LocoClip } from "@/lib/play/clips";
import { PlayShell } from "@/components/play/play-shell";
import { TouchPad } from "@/components/play/touch-pad";
import type { OpenWorldHud } from "@/lib/play/openworld/sim";
import { playGameById } from "@/lib/play/catalog";

const GAME = playGameById("openworld");

export function OpenWorldPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<TouchOverlay>(createTouchOverlay());
  const playingRef = useRef(false);
  const [phase, setPhase] = useState<"start" | "loading" | "play" | "pause">("start");
  const [error, setError] = useState<string | null>(null);
  const [hud, setHud] = useState<OpenWorldHud | null>(null);

  useEffect(() => {
    if (phase === "start") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let handle: { dispose: () => void } | null = null;
    playingRef.current = phase === "play";
    setError(null);

    (async () => {
      const { bootOpenWorld } = await import("@/components/play/openworld-runtime");
      if (disposed) return;
      handle = await bootOpenWorld(canvas, {
        overlay: overlayRef.current,
        onHud: setHud,
        isPlaying: () => playingRef.current,
      });
      if (!disposed) setPhase((p) => (p === "loading" ? "play" : p));
    })().catch((e) => {
      if (!disposed) setError(e instanceof Error ? e.message : String(e));
    });

    return () => {
      disposed = true;
      handle?.dispose();
    };
  }, [phase === "start" ? "start" : "boot"]);

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

  const clip =
    hud?.gait && hud.gait in LOCO_TO_CLIP
      ? LOCO_TO_CLIP[hud.gait as LocoClip]
      : null;

  return (
    <PlayShell>
      {phase === "start" ? (
        <div className="flex flex-1 flex-col items-center justify-center bg-[#f0c98a] px-4 text-zinc-900">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-700">
            Iron Wharf · Ridge Hill · Market Cut
          </p>
          <h1 className="mt-2 text-5xl font-extrabold tracking-tighter sm:text-6xl">
            Cinder Bay
          </h1>
          <p className="mt-3 max-w-lg text-center text-sm text-zinc-700">
            {GAME.setting}
          </p>
          <ul className="mt-4 max-w-md list-disc space-y-1 pl-5 text-left text-sm text-zinc-800">
            {GAME.howToPlay.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <button
            type="button"
            className="mt-6 rounded-md border-[3px] border-zinc-900 bg-[#d31611] px-6 py-3 text-sm font-bold text-white"
            onClick={() => setPhase("loading")}
          >
            Roam Cinder Bay
          </button>
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
            <div className="pointer-events-none absolute left-3 right-3 top-12 z-20 flex flex-col gap-2 sm:left-16">
              <div className="max-w-xl rounded-md border-[2.5px] border-zinc-900 bg-[#fff4da]/95 p-3 text-zinc-900">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-extrabold">{hud.title}</p>
                  <p className="text-xs font-bold">{hud.district}</p>
                </div>
                <p className="mt-1 text-xs leading-relaxed">{hud.mission}</p>
                <p className="mt-2 text-[11px] text-zinc-600">{hud.hint}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold">
                  <span>Heat {"★".repeat(hud.wanted)}{"☆".repeat(3 - hud.wanted)}</span>
                  {clip ? <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-white">{clip}</span> : null}
                  {hud.inVehicle ? <span>Driving {hud.vehicleKind}</span> : null}
                </div>
              </div>
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
          {hud?.done ? (
            <div className="pointer-events-none absolute bottom-24 left-1/2 z-20 -translate-x-1/2 rounded-md border-[2.5px] border-zinc-900 bg-[#ffc480] px-4 py-2 text-sm font-bold text-zinc-900">
              District finished. Keep roaming.
            </div>
          ) : null}
          <TouchPad overlay={overlayRef.current} mode="openworld" />
        </div>
      )}
    </PlayShell>
  );
}
