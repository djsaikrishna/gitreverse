import * as THREE from "three";
import { createKeyTracker, type TouchOverlay } from "@/lib/play/input";
import {
  createFootballState,
  footballHud,
  stepFootball,
  FOOTBALL_KITS,
  type FootballGait,
  type FootballHud,
  type FootballTeamId,
} from "@/lib/play/football/sim";
import { KernelPawn, type LocoClip } from "@/components/play/kernel-pawn";
import { addFootballPitch, createBall } from "@/components/play/world-meshes";

export type FootballHandle = {
  dispose: () => void;
};

function gaitToLoco(gait: FootballGait): LocoClip {
  return gait;
}

export async function bootFootball(
  canvas: HTMLCanvasElement,
  opts: {
    overlay: TouchOverlay;
    userTeam: FootballTeamId;
    onHud: (hud: FootballHud) => void;
    isPlaying: () => boolean;
  }
): Promise<FootballHandle> {
  const state = createFootballState(opts.userTeam);
  const keys = createKeyTracker(window, opts.overlay);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1220);
  scene.fog = new THREE.Fog(0x0b1220, 40, 90);

  const camera = new THREE.PerspectiveCamera(
    48,
    Math.max(1, canvas.clientWidth) / Math.max(1, canvas.clientHeight),
    0.1,
    160
  );
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;

  scene.add(new THREE.HemisphereLight(0xc8d8ff, 0x1a2a18, 0.7));
  const flood = new THREE.DirectionalLight(0xfff1c2, 1.6);
  flood.position.set(-8, 22, 10);
  flood.castShadow = true;
  scene.add(flood);
  scene.add(new THREE.AmbientLight(0xffffff, 0.18));
  const fill = new THREE.PointLight(0xffe6a8, 40, 80);
  fill.position.set(0, 14, 0);
  scene.add(fill);

  addFootballPitch(THREE, scene);

  const pawns = await Promise.all(
    state.players.map(async (player) => {
      const pawn = await KernelPawn.spawn(THREE, FOOTBALL_KITS[player.team]);
      pawn.addTo(scene);
      pawn.play("idle");
      return { player, pawn };
    })
  );
  const ball = createBall(THREE);
  scene.add(ball);

  const userRing = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.7, 20),
    new THREE.MeshBasicMaterial({ color: 0xffe08a, side: THREE.DoubleSide })
  );
  userRing.rotation.x = -Math.PI / 2;
  scene.add(userRing);

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
    const lookX = opts.userTeam === "home" ? 1 : -1;
    const camYaw = Math.atan2(lookX, 0.0001);
    if (opts.isPlaying()) {
      stepFootball(state, intent, dt, camYaw);
    }
    const fieldClips: string[] = [];
    let userClip = "Idle_Loop";
    let aiTimes = "";
    let userPawn: KernelPawn | null = null;
    for (const { player, pawn } of pawns) {
      pawn.play(gaitToLoco(player.gait));
      pawn.setPose(player.x, player.y, player.z, player.yaw);
      pawn.update(dt);
      if (!fieldClips.includes(pawn.clipName)) fieldClips.push(pawn.clipName);
      if (player.isUser) {
        userClip = `${pawn.clipName} ${pawn.actionTime.toFixed(2)}s`;
        userPawn = pawn;
        userRing.position.set(player.x, 0.04, player.z);
      } else if (!aiTimes && pawn.clipName !== "Idle_Loop") {
        aiTimes = `${pawn.clipName} ${pawn.actionTime.toFixed(2)}s`;
      }
    }
    if (userPawn) {
      for (const { player, pawn } of pawns) {
        if (!player.isUser) pawn.copyBonesFrom(userPawn);
      }
    }
    ball.position.set(state.ballX, state.ballY, state.ballZ);
    ball.rotation.x += state.ballVz * dt * 0.4;
    ball.rotation.z -= state.ballVx * dt * 0.4;

    const behind = opts.userTeam === "home" ? -14 : 14;
    const sideline = opts.userTeam === "home" ? 7.5 : -7.5;
    camera.position.lerp(
      new THREE.Vector3(state.ballX + behind, 7.6, state.ballZ * 0.35 + sideline),
      0.08
    );
    camera.lookAt(state.ballX, 0.7, state.ballZ);
    renderer.render(scene, camera);
    opts.onHud({
      ...footballHud(state),
      userClip,
      fieldClips: [aiTimes, ...fieldClips].filter(Boolean).join(" · "),
    });
  };
  tick();

  return {
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      keys.dispose();
      window.removeEventListener("resize", onResize);
      renderer.dispose();
    },
  };
}
