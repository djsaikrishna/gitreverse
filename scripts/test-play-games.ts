import assert from "node:assert/strict";
import test from "node:test";
import { PLAY_FORBIDDEN_IP, PLAY_GAMES } from "../lib/play/catalog";
import { LOCO_TO_CLIP } from "../lib/play/clips";
import { GAME_ACTION_TO_CLIP, resolveGameClip } from "../lib/quaternius-kernel";
import { buildCinderBay } from "../lib/play/openworld/city";
import {
  createOpenWorldState,
  districtAt,
  stepOpenWorld,
} from "../lib/play/openworld/sim";
import { createKeyTracker, createTouchOverlay } from "../lib/play/input";
import {
  FOOTBALL_TEAMS,
  PITCH,
  createFootballState,
  stepFootball,
} from "../lib/play/football/sim";

function catalogText(): string {
  return PLAY_GAMES.map((g) => `${g.title}\n${g.tagline}\n${g.setting}\n${g.howToPlay.join("\n")}`).join(
    "\n"
  );
}

test("play catalog uses Cinder Bay and Floodlight Eleven without licensed IP", () => {
  const titles = PLAY_GAMES.map((g) => g.title);
  assert.deepEqual(titles, ["Cinder Bay", "Floodlight Eleven"]);
  const blob = catalogText().toLowerCase();
  for (const phrase of PLAY_FORBIDDEN_IP) {
    assert.equal(blob.includes(phrase), false, `forbidden IP leaked: ${phrase}`);
  }
  assert.match(catalogText(), /Iron Wharf/);
  assert.match(catalogText(), /Ridge Hill/);
  assert.match(catalogText(), /Market Cut/);
  assert.match(catalogText(), /Harbor Rovers/);
  assert.match(catalogText(), /Milltown Athletic/);
});

test("kernel clip map uses Interact for football strikes, not Punch_Jab or Sword_Attack", () => {
  assert.equal(resolveGameClip("pass"), "Interact");
  assert.equal(resolveGameClip("shot"), "Interact");
  assert.equal(resolveGameClip("tackle"), "Interact");
  assert.equal(LOCO_TO_CLIP.interact, "Interact");
  assert.equal(LOCO_TO_CLIP.punch, "Punch_Jab");
  assert.notEqual(LOCO_TO_CLIP.interact, "Punch_Jab");
  assert.notEqual(GAME_ACTION_TO_CLIP.shot, "Sword_Attack");
});

test("Cinder Bay bag delivery then tail then coupe home", () => {
  const city = buildCinderBay();
  const state = createOpenWorldState(city);
  assert.equal(districtAt(state.playerX, state.playerZ), "Iron Wharf");
  assert.ok(city.landmarks.some((l) => l.name === "Iron Wharf"));
  assert.ok(city.landmarks.some((l) => l.name === "Ridge Hill"));
  assert.ok(city.landmarks.some((l) => l.name === "Market Cut"));

  state.playerX = city.bag.x;
  state.playerZ = city.bag.z;
  stepOpenWorld(
    state,
    city,
    {
      axisX: 0,
      axisZ: 0,
      sprint: false,
      crouch: false,
      jump: false,
      header: false,
      interact: true,
      punch: false,
      pass: false,
      shoot: false,
      pause: false,
      restart: false,
    },
    0.05,
    0
  );
  assert.equal(state.bagHeld, true);

  state.playerX = city.bagDrop.x;
  state.playerZ = city.bagDrop.z;
  stepOpenWorld(
    state,
    city,
    {
      axisX: 0,
      axisZ: 0,
      sprint: false,
      crouch: false,
      jump: false,
      header: false,
      interact: true,
      punch: false,
      pass: false,
      shoot: false,
      pause: false,
      restart: false,
    },
    0.05,
    0
  );
  assert.equal(state.mission, "tail");

  const chase = state.vehicles.find((v) => v.kind === "chase")!;
  chase.x = state.playerX + 80;
  chase.z = state.playerZ;
  for (let i = 0; i < 80; i++) {
    stepOpenWorld(
      state,
      city,
      {
        axisX: 0,
        axisZ: 0,
        sprint: false,
        crouch: false,
        jump: false,
        header: false,
        interact: false,
        punch: false,
        pass: false,
        shoot: false,
        pause: false,
        restart: false,
      },
      0.05,
      0
    );
  }
  assert.equal(state.mission, "coupe");

  const coupe = state.vehicles.find((v) => v.kind === "coupe")!;
  state.playerX = coupe.x;
  state.playerZ = coupe.z;
  stepOpenWorld(
    state,
    city,
    {
      axisX: 0,
      axisZ: 0,
      sprint: false,
      crouch: false,
      jump: false,
      header: false,
      interact: true,
      punch: false,
      pass: false,
      shoot: false,
      pause: false,
      restart: false,
    },
    0.05,
    0
  );
  assert.equal(state.vehicleId, "coupe");
  state.actionTimer = 0;
  state.playerGait = "drive";
  coupe.x = city.garage.x;
  coupe.z = city.garage.z;
  state.playerX = city.garage.x;
  state.playerZ = city.garage.z;
  stepOpenWorld(
    state,
    city,
    {
      axisX: 0,
      axisZ: 0,
      sprint: false,
      crouch: false,
      jump: false,
      header: false,
      interact: false,
      punch: false,
      pass: false,
      shoot: false,
      pause: false,
      restart: false,
    },
    0.05,
    0
  );
  assert.equal(state.mission, "done");
});

test("Cinder Bay crouch and punch use kernel gaits", () => {
  const city = buildCinderBay();
  const crouched = createOpenWorldState(city);
  stepOpenWorld(
    crouched,
    city,
    {
      axisX: 0,
      axisZ: 0,
      sprint: false,
      crouch: true,
      jump: false,
      header: false,
      interact: false,
      punch: false,
      pass: false,
      shoot: false,
      pause: false,
      restart: false,
    },
    0.05,
    0
  );
  assert.equal(crouched.playerGait, "crouch");

  const punching = createOpenWorldState(city);
  stepOpenWorld(
    punching,
    city,
    {
      axisX: 0,
      axisZ: 0,
      sprint: false,
      crouch: false,
      jump: false,
      header: false,
      interact: false,
      punch: true,
      pass: false,
      shoot: false,
      pause: false,
      restart: false,
    },
    0.05,
    0
  );
  assert.ok(
    punching.playerGait === "punch" || punching.playerGait === "punchCross",
    punching.playerGait
  );
});

test("Floodlight Eleven AI keeps locomotion clips after kickoff", () => {
  const state = createFootballState("home");
  const idle = {
    axisX: 0,
    axisZ: 0,
    sprint: false,
    crouch: false,
    jump: false,
    header: false,
    interact: false,
    punch: false,
    pass: false,
    shoot: false,
    pause: false,
    restart: false,
  };
  for (let i = 0; i < 80; i++) {
    stepFootball(state, idle, 0.05, Math.PI / 2);
  }
  assert.equal(state.phase, "play");
  const moving = state.players.filter(
    (p) => !p.isUser && (p.gait === "walk" || p.gait === "jog" || p.gait === "sprint")
  );
  assert.ok(
    moving.length >= 4,
    `expected 4+ AI in locomotion, got ${state.players.map((p) => `${p.id}:${p.gait}`).join(" ")}`
  );
});

test("cloned kernel graphs play independent clips on separate skeletons", async () => {
  const { readFileSync } = await import("node:fs");
  const { AnimationMixer, LoopRepeat } = await import("three");
  const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
  const { cloneKernelGraph } = await import("../components/play/kernel-pawn");
  const { quaterniusStandardDiskPath } = await import("../lib/quaternius-kernel");
  const data = readFileSync(quaterniusStandardDiskPath());
  const ab = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  const gltf = await new Promise<import("three/examples/jsm/loaders/GLTFLoader.js").GLTF>(
    (resolve, reject) => {
      new GLTFLoader().parse(ab, "/quaternius/", resolve, reject);
    }
  );
  const a = cloneKernelGraph(gltf);
  const b = cloneKernelGraph(gltf);
  const boneA = a.scene.getObjectByName("pelvis");
  const boneB = b.scene.getObjectByName("pelvis");
  assert.ok(boneA && boneB);
  assert.notEqual(boneA.uuid, boneB.uuid);

  const mixA = new AnimationMixer(a.scene);
  const mixB = new AnimationMixer(b.scene);
  const idle = a.clips.find((c) => c.name === "Idle_Loop");
  const jog = b.clips.find((c) => c.name === "Jog_Fwd_Loop");
  assert.ok(idle && jog);
  mixA.clipAction(idle).setLoop(LoopRepeat, Infinity).play();
  mixB.clipAction(jog).setLoop(LoopRepeat, Infinity).play();
  for (let i = 0; i < 20; i++) {
    mixA.update(1 / 30);
    mixB.update(1 / 30);
  }
  assert.notEqual(boneA.quaternion.x.toFixed(4), boneB.quaternion.x.toFixed(4));
  assert.notEqual(boneA.quaternion.y.toFixed(4), boneB.quaternion.y.toFixed(4));
});

test("Floodlight Eleven kickoff, shot, goal, and whistle", () => {
  const state = createFootballState("home");
  assert.equal(FOOTBALL_TEAMS.home.name, "Harbor Rovers");
  assert.equal(FOOTBALL_TEAMS.away.name, "Milltown Athletic");
  assert.equal(state.phase, "kickoff");
  for (let i = 0; i < 40; i++) {
    stepFootball(
      state,
      {
        axisX: 0,
        axisZ: 0,
        sprint: false,
        crouch: false,
        jump: false,
        header: false,
        interact: false,
        punch: false,
        pass: false,
        shoot: false,
        pause: false,
        restart: false,
      },
      0.05,
      Math.PI / 2
    );
  }
  assert.equal(state.phase, "play");

  const user = state.players.find((p) => p.isUser)!;
  state.ballX = user.x + 0.6;
  state.ballZ = user.z;
  state.ballY = 0.22;
  stepFootball(
    state,
    {
      axisX: 0,
      axisZ: 0,
      sprint: true,
      crouch: false,
      jump: false,
      header: false,
      interact: false,
      punch: false,
      pass: false,
      shoot: true,
      pause: false,
      restart: false,
    },
    0.05,
    Math.PI / 2
  );
  assert.equal(user.gait, "interact");
  assert.ok(state.ballVx > 4);

  state.ballX = PITCH.goalX + 0.4;
  state.ballZ = 0;
  state.ballY = 0.22;
  state.ballVx = 4;
  stepFootball(
    state,
    {
      axisX: 0,
      axisZ: 0,
      sprint: false,
      crouch: false,
      jump: false,
      header: false,
      interact: false,
      punch: false,
      pass: false,
      shoot: false,
      pause: false,
      restart: false,
    },
    0.05,
    Math.PI / 2
  );
  assert.equal(state.phase, "goal");
  assert.equal(state.scoreHome, 1);

  const milltown = createFootballState("away");
  assert.equal(milltown.players.find((p) => p.isUser)?.team, "away");
});

test("touch overlay exists for on-screen controls", () => {
  const overlay = createTouchOverlay();
  overlay.axisZ = 1;
  overlay.shoot = true;
  assert.equal(typeof createKeyTracker, "function");
  assert.equal(overlay.axisZ, 1);
});
