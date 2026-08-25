export type PlayIntent = {
  axisX: number;
  axisZ: number;
  sprint: boolean;
  crouch: boolean;
  jump: boolean;
  header: boolean;
  interact: boolean;
  punch: boolean;
  pass: boolean;
  shoot: boolean;
  pause: boolean;
  restart: boolean;
};

export type TouchOverlay = {
  axisX: number;
  axisZ: number;
  sprint: boolean;
  crouch: boolean;
  jump: boolean;
  interact: boolean;
  punch: boolean;
  pass: boolean;
  shoot: boolean;
};

export function createTouchOverlay(): TouchOverlay {
  return {
    axisX: 0,
    axisZ: 0,
    sprint: false,
    crouch: false,
    jump: false,
    interact: false,
    punch: false,
    pass: false,
    shoot: false,
  };
}

/** Consume one-shot touch edges so they fire once per press. */
export function consumeTouchEdges(overlay: TouchOverlay): void {
  overlay.jump = false;
  overlay.interact = false;
  overlay.punch = false;
  overlay.pass = false;
  overlay.shoot = false;
}

export type KeyTracker = {
  read(): PlayIntent;
  dispose(): void;
};

const MOVE_KEYS: Record<string, { x?: number; z?: number }> = {
  KeyW: { z: 1 },
  ArrowUp: { z: 1 },
  KeyS: { z: -1 },
  ArrowDown: { z: -1 },
  KeyA: { x: -1 },
  ArrowLeft: { x: -1 },
  KeyD: { x: 1 },
  ArrowRight: { x: 1 },
};

export function createKeyTracker(
  target: Window,
  overlay?: TouchOverlay
): KeyTracker {
  const down = new Set<string>();
  const edge = new Set<string>();

  const onDown = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (e.repeat) return;
    if (e.code === "Space" || e.code.startsWith("Arrow") || e.code === "Escape") {
      e.preventDefault();
    }
    down.add(e.code);
    edge.add(e.code);
  };
  const onUp = (e: KeyboardEvent) => {
    down.delete(e.code);
  };
  const onBlur = () => down.clear();

  target.addEventListener("keydown", onDown);
  target.addEventListener("keyup", onUp);
  target.addEventListener("blur", onBlur);

  return {
    read() {
      let axisX = overlay?.axisX ?? 0;
      let axisZ = overlay?.axisZ ?? 0;
      for (const code of down) {
        const delta = MOVE_KEYS[code];
        if (!delta) continue;
        axisX += delta.x ?? 0;
        axisZ += delta.z ?? 0;
      }
      const len = Math.hypot(axisX, axisZ);
      if (len > 1) {
        axisX /= len;
        axisZ /= len;
      }
      const intent: PlayIntent = {
        axisX,
        axisZ,
        sprint: down.has("ShiftLeft") || down.has("ShiftRight") || Boolean(overlay?.sprint),
        crouch: down.has("KeyC") || down.has("ControlLeft") || Boolean(overlay?.crouch),
        jump: edge.has("Space") || Boolean(overlay?.jump),
        header: edge.has("KeyC") || Boolean(overlay?.jump),
        interact: edge.has("KeyE") || Boolean(overlay?.interact),
        punch: edge.has("KeyF") || Boolean(overlay?.punch),
        pass: edge.has("KeyF") || Boolean(overlay?.pass),
        shoot: edge.has("Space") || edge.has("KeyJ") || Boolean(overlay?.shoot),
        pause: edge.has("Escape") || edge.has("KeyP"),
        restart: edge.has("KeyR"),
      };
      edge.clear();
      if (overlay) consumeTouchEdges(overlay);
      return intent;
    },
    dispose() {
      target.removeEventListener("keydown", onDown);
      target.removeEventListener("keyup", onUp);
      target.removeEventListener("blur", onBlur);
      down.clear();
      edge.clear();
    },
  };
}
