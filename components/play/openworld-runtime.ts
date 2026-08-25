import * as THREE from "three";
import { createKeyTracker, type TouchOverlay } from "@/lib/play/input";
import { buildCinderBay } from "@/lib/play/openworld/city";
import {
  createOpenWorldState,
  openWorldHud,
  stepOpenWorld,
  type Gait,
  type OpenWorldHud,
} from "@/lib/play/openworld/sim";
import type { LocoClip } from "@/lib/play/clips";
import { KernelPawn, loadKernelGltf } from "@/components/play/kernel-pawn";
import {
  addCinderBayCity,
  createBag,
  createVehicleMesh,
} from "@/components/play/world-meshes";

export type OpenWorldHandle = {
  dispose: () => void;
};

const NPC_KITS: Record<string, { main: number; joints: number }> = {
  civilian: { main: 0xb08968, joints: 0x4a3728 },
  warden: { main: 0x1c3d66, joints: 0xd4c48a },
  dock: { main: 0xc45c2c, joints: 0x2a1810 },
  hill: { main: 0x6a7c78, joints: 0xe8dcc8 },
};

function gaitToLoco(gait: Gait): LocoClip {
  return gait;
}

export async function bootOpenWorld(
  canvas: HTMLCanvasElement,
  opts: {
    overlay: TouchOverlay;
    onHud: (hud: OpenWorldHud) => void;
    isPlaying: () => boolean;
  }
): Promise<OpenWorldHandle> {
  const city = buildCinderBay();
  const state = createOpenWorldState(city);
  const keys = createKeyTracker(window, opts.overlay);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0c98a);
  scene.fog = new THREE.Fog(0xf0c98a, 40, 140);

  const camera = new THREE.PerspectiveCamera(
    50,
    Math.max(1, canvas.clientWidth) / Math.max(1, canvas.clientHeight),
    0.1,
    220
  );
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;

  scene.add(new THREE.HemisphereLight(0xfff1c9, 0x6b4a32, 1.05));
  const sun = new THREE.DirectionalLight(0xffe0a8, 1.45);
  sun.position.set(18, 28, 12);
  sun.castShadow = true;
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xffffff, 0.2));

  addCinderBayCity(THREE, scene, city);

  const gltf = await loadKernelGltf();
  const hero = new KernelPawn(THREE, gltf, { main: 0xc45c28, joints: 0x1e140e });
  hero.addTo(scene);
  hero.play("idle");

  const npcPawns = state.npcs.map((npc) => {
    const pawn = new KernelPawn(THREE, gltf, NPC_KITS[npc.faction] ?? NPC_KITS.civilian!);
    pawn.addTo(scene);
    pawn.play("walk");
    return { npc, pawn };
  });

  const vehicleMeshes = state.vehicles.map((vehicle) => {
    const mesh = createVehicleMesh(THREE, vehicle.kind);
    scene.add(mesh);
    return { vehicle, mesh };
  });

  const bag = createBag(THREE);
  scene.add(bag);

  let orbitYaw = 0;
  let orbitPitch = 0.28;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  const onDown = (e: PointerEvent) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (!dragging) return;
    orbitYaw -= (e.clientX - lastX) * 0.005;
    orbitPitch = Math.max(-0.1, Math.min(0.7, orbitPitch + (e.clientY - lastY) * 0.004));
    lastX = e.clientX;
    lastY = e.clientY;
  };
  const onUp = () => {
    dragging = false;
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);

  const onResize = () => {
    const w = Math.max(1, canvas.clientWidth);
    const h = Math.max(1, canvas.clientHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  };
  window.addEventListener("resize", onResize);
  onResize();

  const clock = new THREE.Clock();
  let frame = 0;
  let disposed = false;
  const tick = () => {
    if (disposed) return;
    frame = requestAnimationFrame(tick);
    const dt = Math.min(0.05, clock.getDelta());
    const intent = keys.read();
    const camYaw = Math.atan2(
      state.playerX - camera.position.x,
      state.playerZ - camera.position.z
    );
    if (opts.isPlaying()) {
      stepOpenWorld(state, city, intent, dt, camYaw);
    }
    hero.play(gaitToLoco(state.playerGait));
    hero.setPose(state.playerX, state.playerY, state.playerZ, state.playerYaw);
    hero.update(dt);

    for (const { npc, pawn } of npcPawns) {
      pawn.play(gaitToLoco(npc.gait));
      pawn.setPose(npc.x, 0, npc.z, npc.yaw);
      pawn.update(dt);
    }
    for (const { vehicle, mesh } of vehicleMeshes) {
      mesh.position.set(vehicle.x, 0, vehicle.z);
      mesh.rotation.y = vehicle.yaw;
      mesh.visible = vehicle.kind !== "chase" || state.mission === "tail";
    }
    bag.position.set(state.bag.x, state.bagHeld ? 0.85 : 0.22, state.bag.z);
    bag.visible = !state.bag.taken || state.bagHeld;

    const dist = state.vehicleId ? 9.2 : 6.5;
    const height = state.vehicleId ? 3.4 : 2.25;
    const yaw = state.playerYaw + orbitYaw;
    camera.position.lerp(
      new THREE.Vector3(
        state.playerX - Math.sin(yaw) * dist * Math.cos(orbitPitch),
        state.playerY + height + Math.sin(orbitPitch) * 2.4,
        state.playerZ - Math.cos(yaw) * dist * Math.cos(orbitPitch)
      ),
      0.12
    );
    camera.lookAt(state.playerX, state.playerY + 1.15, state.playerZ);
    renderer.render(scene, camera);
    opts.onHud(openWorldHud(state));
  };
  tick();

  return {
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      keys.dispose();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
    },
  };
}
