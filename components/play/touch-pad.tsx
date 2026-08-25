"use client";

import type { TouchOverlay } from "@/lib/play/input";

type TouchPadProps = {
  overlay: TouchOverlay;
  mode: "openworld" | "football";
};

function PadButton({
  label,
  onDown,
  onUp,
  className,
}: {
  label: string;
  onDown: () => void;
  onUp: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`min-w-12 rounded-md border-[2.5px] border-zinc-900 bg-white/90 px-3 py-2 text-xs font-bold text-zinc-900 shadow-sm active:bg-[#ffc480] ${className ?? ""}`}
      onPointerDown={(e) => {
        e.preventDefault();
        onDown();
      }}
      onPointerUp={(e) => {
        e.preventDefault();
        onUp();
      }}
      onPointerLeave={onUp}
    >
      {label}
    </button>
  );
}

export function TouchPad({ overlay, mode }: TouchPadProps) {
  const holdAxis = (x: number, z: number) => {
    overlay.axisX = x;
    overlay.axisZ = z;
  };
  const clearAxis = () => {
    overlay.axisX = 0;
    overlay.axisZ = 0;
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-3 p-3 sm:p-4">
      <div className="pointer-events-auto flex flex-col items-center gap-1">
        <PadButton label="W" onDown={() => holdAxis(overlay.axisX, 1)} onUp={clearAxis} />
        <div className="flex gap-1">
          <PadButton label="A" onDown={() => holdAxis(-1, overlay.axisZ)} onUp={clearAxis} />
          <PadButton label="S" onDown={() => holdAxis(overlay.axisX, -1)} onUp={clearAxis} />
          <PadButton label="D" onDown={() => holdAxis(1, overlay.axisZ)} onUp={clearAxis} />
        </div>
      </div>
      <div className="pointer-events-auto flex flex-wrap justify-end gap-1">
        <PadButton
          label="Sprint"
          onDown={() => {
            overlay.sprint = true;
          }}
          onUp={() => {
            overlay.sprint = false;
          }}
        />
        {mode === "openworld" ? (
          <>
            <PadButton
              label="Jump"
              onDown={() => {
                overlay.jump = true;
              }}
              onUp={() => undefined}
            />
            <PadButton
              label="Crouch"
              onDown={() => {
                overlay.crouch = true;
              }}
              onUp={() => {
                overlay.crouch = false;
              }}
            />
            <PadButton
              label="E"
              onDown={() => {
                overlay.interact = true;
              }}
              onUp={() => undefined}
            />
            <PadButton
              label="Punch"
              onDown={() => {
                overlay.punch = true;
              }}
              onUp={() => undefined}
            />
          </>
        ) : (
          <>
            <PadButton
              label="Pass"
              onDown={() => {
                overlay.pass = true;
              }}
              onUp={() => undefined}
            />
            <PadButton
              label="Shoot"
              onDown={() => {
                overlay.shoot = true;
              }}
              onUp={() => undefined}
            />
            <PadButton
              label="Header"
              onDown={() => {
                overlay.jump = true;
              }}
              onUp={() => undefined}
            />
          </>
        )}
      </div>
    </div>
  );
}
