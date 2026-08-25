"use client";

import { useState } from "react";
import type { TouchOverlay } from "@/lib/play/input";

type TouchPadProps = {
  overlay: TouchOverlay;
  mode: "openworld" | "football";
};

function PadButton({
  label,
  pressed,
  onDown,
  onUp,
  hold,
  className,
}: {
  label: string;
  pressed?: boolean;
  onDown: () => void;
  onUp?: () => void;
  hold?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`min-w-12 rounded-md border-[2.5px] border-zinc-900 px-3 py-2 text-xs font-bold shadow-sm ${
        pressed ? "bg-[#ffc480] text-zinc-900" : "bg-white/90 text-zinc-900"
      } ${className ?? ""}`}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDown();
      }}
      onPointerUp={(e) => {
        if (hold) return;
        e.preventDefault();
        onUp?.();
      }}
      onPointerLeave={() => {
        if (hold) return;
        onUp?.();
      }}
    >
      {label}
    </button>
  );
}

export function TouchPad({ overlay, mode }: TouchPadProps) {
  const [axis, setAxis] = useState<{ x: number; z: number }>({ x: 0, z: 0 });
  const [sprint, setSprint] = useState(false);
  const [crouch, setCrouch] = useState(false);

  const applyAxis = (x: number, z: number) => {
    const next = axis.x === x && axis.z === z ? { x: 0, z: 0 } : { x, z };
    setAxis(next);
    overlay.axisX = next.x;
    overlay.axisZ = next.z;
  };

  const toggleSprint = () => {
    const next = !sprint;
    setSprint(next);
    overlay.sprint = next;
  };

  const toggleCrouch = () => {
    const next = !crouch;
    setCrouch(next);
    overlay.crouch = next;
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-3 p-3 sm:p-4">
      <div className="pointer-events-auto flex flex-col items-center gap-1">
        <PadButton
          label="W"
          hold
          pressed={axis.z === 1}
          onDown={() => applyAxis(axis.x, 1)}
        />
        <div className="flex gap-1">
          <PadButton
            label="A"
            hold
            pressed={axis.x === -1}
            onDown={() => applyAxis(-1, axis.z)}
          />
          <PadButton
            label="S"
            hold
            pressed={axis.z === -1}
            onDown={() => applyAxis(axis.x, -1)}
          />
          <PadButton
            label="D"
            hold
            pressed={axis.x === 1}
            onDown={() => applyAxis(1, axis.z)}
          />
        </div>
      </div>
      <div className="pointer-events-auto flex flex-wrap justify-end gap-1">
        <PadButton label="Sprint" hold pressed={sprint} onDown={toggleSprint} />
        {mode === "openworld" ? (
          <>
            <PadButton
              label="Jump"
              onDown={() => {
                overlay.jump = true;
              }}
            />
            <PadButton label="Crouch" hold pressed={crouch} onDown={toggleCrouch} />
            <PadButton
              label="E"
              onDown={() => {
                overlay.interact = true;
              }}
            />
            <PadButton
              label="Punch"
              onDown={() => {
                overlay.punch = true;
              }}
            />
          </>
        ) : (
          <>
            <PadButton
              label="Pass"
              onDown={() => {
                overlay.pass = true;
              }}
            />
            <PadButton
              label="Shoot"
              onDown={() => {
                overlay.shoot = true;
              }}
            />
            <PadButton
              label="Header"
              onDown={() => {
                overlay.jump = true;
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
