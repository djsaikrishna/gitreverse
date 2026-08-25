import type { PlayIntent } from "@/lib/play/input";
import { dist2, resolveCircle } from "@/lib/play/aabb";
import {
  PLAYER_RADIUS,
  SCOOTER_RADIUS,
  VEHICLE_RADIUS,
  buildCinderBay,
  type CityData,
} from "@/lib/play/openworld/city";

export type Gait =
  | "idle"
  | "walk"
  | "jog"
  | "sprint"
  | "jumpStart"
  | "jumpLoop"
  | "jumpLand"
  | "crouch"
  | "crouchWalk"
  | "drive"
  | "sit"
  | "sitEnter"
  | "sitExit"
  | "interact"
  | "talk"
  | "punch"
  | "punchCross";

export type NpcFaction = "civilian" | "warden" | "dock" | "hill";
export type VehicleKind = "scooter" | "hatch" | "coupe" | "chase";
export type MissionId = "bag" | "tail" | "coupe" | "done";

export type OpenWorldNpc = {
  id: string;
  faction: NpcFaction;
  x: number;
  z: number;
  yaw: number;
  gait: Gait;
  waypoint: number;
  loop: number;
};

export type OpenWorldVehicle = {
  id: string;
  kind: VehicleKind;
  x: number;
  z: number;
  yaw: number;
  speed: number;
  occupied: boolean;
};

export type OpenWorldState = {
  playerX: number;
  playerY: number;
  playerZ: number;
  playerYaw: number;
  playerGait: Gait;
  vy: number;
  grounded: boolean;
  vehicleId: string | null;
  bagHeld: boolean;
  wanted: number;
  wantedCooldown: number;
  loseTimer: number;
  mission: MissionId;
  missionHint: string;
  actionTimer: number;
  punchFlip: boolean;
  vehicles: OpenWorldVehicle[];
  bag: { x: number; z: number; taken: boolean };
  npcs: OpenWorldNpc[];
};

export type OpenWorldHud = {
  title: string;
  district: string;
  mission: string;
  wanted: number;
  inVehicle: boolean;
  vehicleKind: string | null;
  speed: number;
  hint: string;
  done: boolean;
  gait: Gait;
};

const WALK_SPEED = 2.45;
const JOG_SPEED = 4.6;
const SPRINT_SPEED = 7.4;
const CROUCH_SPEED = 1.55;
const JUMP_V = 6.6;
const GRAVITY = 18;

function vehicleRadius(kind: VehicleKind): number {
  return kind === "scooter" ? SCOOTER_RADIUS : VEHICLE_RADIUS;
}

function vehicleAccel(kind: VehicleKind): { accel: number; max: number; steer: number } {
  if (kind === "scooter") return { accel: 18, max: 14, steer: 2.8 };
  if (kind === "coupe") return { accel: 20, max: 22, steer: 2.0 };
  if (kind === "chase") return { accel: 17, max: 19, steer: 2.2 };
  return { accel: 14, max: 16, steer: 2.3 };
}

export function missionHint(mission: MissionId): string {
  if (mission === "bag")
    return "Deliver a bag: pick it up on Iron Wharf, then drop it at Market Cut.";
  if (mission === "tail")
    return "Shake a tail: lose the Harbor Warden car. Put distance on them around Ridge Hill.";
  if (mission === "coupe")
    return "Boost the parked coupe on Ridge Hill and bring it home to the Iron Wharf garage.";
  return "District done. Keep roaming Cinder Bay.";
}

export function districtAt(x: number, z: number): string {
  if (z > 24) return "Iron Wharf";
  if (z < -24) return "Ridge Hill";
  return "Market Cut";
}

export function createOpenWorldState(city: CityData = buildCinderBay()): OpenWorldState {
  return {
    playerX: city.playerSpawn.x,
    playerY: 0,
    playerZ: city.playerSpawn.z,
    playerYaw: city.playerSpawn.yaw,
    playerGait: "idle",
    vy: 0,
    grounded: true,
    vehicleId: null,
    bagHeld: false,
    wanted: 0,
    wantedCooldown: 0,
    loseTimer: 0,
    mission: "bag",
    missionHint: missionHint("bag"),
    actionTimer: 0,
    punchFlip: false,
    vehicles: city.vehicles.map((spawn) => ({
      id: spawn.id,
      kind: spawn.kind,
      x: spawn.x,
      z: spawn.z,
      yaw: spawn.yaw,
      speed: 0,
      occupied: false,
    })),
    bag: { x: city.bag.x, z: city.bag.z, taken: false },
    npcs: city.npcSpawns.map((spawn, i) => ({
      id: spawn.id,
      faction: spawn.faction,
      x: spawn.x,
      z: spawn.z,
      yaw: spawn.yaw,
      gait: "idle",
      waypoint: i % 4,
      loop: i % city.roadLoops.length,
    })),
  };
}

function occupiedVehicle(state: OpenWorldState): OpenWorldVehicle | null {
  if (!state.vehicleId) return null;
  return state.vehicles.find((v) => v.id === state.vehicleId) ?? null;
}

function nearestVehicle(state: OpenWorldState, maxDist: number): OpenWorldVehicle | null {
  let best: OpenWorldVehicle | null = null;
  let bestD = maxDist * maxDist;
  for (const vehicle of state.vehicles) {
    if (vehicle.kind === "chase") continue;
    const d = dist2(state.playerX, state.playerZ, vehicle.x, vehicle.z);
    if (d < bestD) {
      best = vehicle;
      bestD = d;
    }
  }
  return best;
}

function raiseWanted(state: OpenWorldState, amount: number): void {
  state.wanted = Math.min(3, state.wanted + amount);
  state.wantedCooldown = 1.4;
}

function moveOnFoot(
  state: OpenWorldState,
  city: CityData,
  intent: PlayIntent,
  dt: number,
  camYaw: number
): void {
  if (state.playerGait === "sitEnter" || state.playerGait === "sitExit") return;

  const moving = Math.hypot(intent.axisX, intent.axisZ) > 0.05;
  if (moving) {
    const sin = Math.sin(camYaw);
    const cos = Math.cos(camYaw);
    const dx = intent.axisX * cos + intent.axisZ * sin;
    const dz = -intent.axisX * sin + intent.axisZ * cos;
    const yaw = Math.atan2(dx, dz);
    state.playerYaw = yaw;
    const speed = intent.crouch
      ? CROUCH_SPEED
      : intent.sprint
        ? SPRINT_SPEED
        : Math.hypot(intent.axisX, intent.axisZ) > 0.85
          ? JOG_SPEED
          : WALK_SPEED;
    const next = resolveCircle(
      state.playerX + Math.sin(yaw) * speed * dt,
      state.playerZ + Math.cos(yaw) * speed * dt,
      PLAYER_RADIUS,
      city.solids
    );
    state.playerX = next.x;
    state.playerZ = next.z;
    if (!state.grounded) {
      state.playerGait = state.vy > 0.4 ? "jumpStart" : "jumpLoop";
    } else if (state.actionTimer > 0) {
      /* keep punch / interact */
    } else if (intent.crouch) {
      state.playerGait = "crouchWalk";
    } else {
      state.playerGait = intent.sprint ? "sprint" : speed > 3.2 ? "jog" : "walk";
    }
  } else if (state.grounded && state.actionTimer <= 0) {
    state.playerGait = intent.crouch ? "crouch" : "idle";
  }

  if (intent.jump && state.grounded && !intent.crouch) {
    state.vy = JUMP_V;
    state.grounded = false;
    state.playerGait = "jumpStart";
  }
  state.vy -= GRAVITY * dt;
  state.playerY += state.vy * dt;
  if (state.playerY <= 0) {
    const wasAir = !state.grounded;
    state.playerY = 0;
    state.vy = 0;
    state.grounded = true;
    if (wasAir) {
      state.playerGait = "jumpLand";
      state.actionTimer = 0.28;
    }
  } else if (!state.grounded && state.playerGait === "jumpStart" && state.vy < 1.2) {
    state.playerGait = "jumpLoop";
  }
}

function moveDrivenVehicle(
  state: OpenWorldState,
  city: CityData,
  vehicle: OpenWorldVehicle,
  intent: PlayIntent,
  dt: number
): void {
  const stats = vehicleAccel(vehicle.kind);
  const throttle = intent.axisZ;
  if (throttle > 0.05) vehicle.speed += stats.accel * throttle * dt;
  else if (throttle < -0.05) vehicle.speed -= 20 * dt;
  else {
    const sign = Math.sign(vehicle.speed);
    vehicle.speed -= sign * 2.4 * dt;
    if (Math.sign(vehicle.speed) !== sign) vehicle.speed = 0;
  }
  vehicle.speed = Math.max(-stats.max * 0.45, Math.min(stats.max, vehicle.speed));
  const steer =
    intent.axisX * stats.steer * (0.35 + Math.min(1, Math.abs(vehicle.speed) / 7));
  vehicle.yaw -= steer * dt * Math.sign(vehicle.speed || 1);
  const slip = 0.12;
  const nx =
    vehicle.x +
    (Math.sin(vehicle.yaw) * (1 - slip) + Math.sin(vehicle.yaw - 0.4 * intent.axisX) * slip) *
      vehicle.speed *
      dt;
  const nz =
    vehicle.z +
    (Math.cos(vehicle.yaw) * (1 - slip) + Math.cos(vehicle.yaw - 0.4 * intent.axisX) * slip) *
      vehicle.speed *
      dt;
  const resolved = resolveCircle(nx, nz, vehicleRadius(vehicle.kind), city.solids);
  if (Math.hypot(resolved.x - nx, resolved.z - nz) > 0.02) {
    vehicle.speed *= 0.4;
  }
  vehicle.x = resolved.x;
  vehicle.z = resolved.z;
  state.playerX = vehicle.x;
  state.playerZ = vehicle.z;
  state.playerY = vehicle.kind === "scooter" ? 0.05 : 0.12;
  state.playerYaw = vehicle.yaw;
  if (state.actionTimer <= 0) {
    state.playerGait = Math.abs(vehicle.speed) > 0.35 ? "drive" : "sit";
  }
}

function driveChaseCar(state: OpenWorldState, city: CityData, dt: number): void {
  const chase = state.vehicles.find((v) => v.kind === "chase");
  if (!chase || state.mission !== "tail") return;
  const dx = state.playerX - chase.x;
  const dz = state.playerZ - chase.z;
  const len = Math.hypot(dx, dz) || 1;
  const targetYaw = Math.atan2(dx, dz);
  let delta = targetYaw - chase.yaw;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  chase.yaw += Math.max(-2.4 * dt, Math.min(2.4 * dt, delta));
  chase.speed = 12;
  const nx = chase.x + Math.sin(chase.yaw) * chase.speed * dt;
  const nz = chase.z + Math.cos(chase.yaw) * chase.speed * dt;
  const resolved = resolveCircle(nx, nz, VEHICLE_RADIUS, city.solids);
  chase.x = resolved.x;
  chase.z = resolved.z;

  if (len > 38) state.loseTimer += dt;
  else state.loseTimer = 0;
  if (state.loseTimer > 3.2) {
    state.mission = "coupe";
    state.missionHint = missionHint("coupe");
    state.wanted = 0;
    chase.speed = 0;
  }
}

function stepNpcs(state: OpenWorldState, city: CityData, dt: number): void {
  for (const npc of state.npcs) {
    const chase =
      state.wanted > 0 &&
      npc.faction === "warden" &&
      dist2(npc.x, npc.z, state.playerX, state.playerZ) < 70 * 70;
    let tx = npc.x;
    let tz = npc.z;
    if (chase) {
      tx = state.playerX;
      tz = state.playerZ;
    } else {
      const loop = city.roadLoops[npc.loop] ?? city.roadLoops[0]!;
      const wp = loop[npc.waypoint % loop.length]!;
      tx = wp.x;
      tz = wp.z;
      if (dist2(npc.x, npc.z, wp.x, wp.z) < 4) {
        npc.waypoint = (npc.waypoint + 1) % loop.length;
      }
    }
    const dx = tx - npc.x;
    const dz = tz - npc.z;
    const len = Math.hypot(dx, dz) || 1;
    const speed = chase ? JOG_SPEED : WALK_SPEED;
    npc.yaw = Math.atan2(dx, dz);
    const next = resolveCircle(
      npc.x + (dx / len) * speed * dt,
      npc.z + (dz / len) * speed * dt,
      PLAYER_RADIUS,
      city.solids
    );
    npc.x = next.x;
    npc.z = next.z;
    npc.gait = chase ? "jog" : "walk";
  }
}

function tryInteract(state: OpenWorldState, city: CityData, intent: PlayIntent): void {
  if (state.playerGait === "sitEnter" || state.playerGait === "sitExit") return;

  if (intent.interact) {
    const current = occupiedVehicle(state);
    if (current) {
      current.occupied = false;
      current.speed = 0;
      state.vehicleId = null;
      state.playerX = current.x + Math.cos(current.yaw) * 2.1;
      state.playerZ = current.z - Math.sin(current.yaw) * 2.1;
      state.playerY = 0;
      state.playerGait = "sitExit";
      state.actionTimer = 0.85;
      return;
    }
    const near = nearestVehicle(state, 3.2);
    if (near) {
      near.occupied = true;
      state.vehicleId = near.id;
      state.playerGait = "sitEnter";
      state.actionTimer = 1.05;
      if (state.mission === "coupe" && near.kind === "coupe") {
        state.missionHint = "Bring the coupe home to the Iron Wharf garage.";
      }
      return;
    }
    if (!state.bag.taken && dist2(state.playerX, state.playerZ, state.bag.x, state.bag.z) < 4.5) {
      state.bag.taken = true;
      state.bagHeld = true;
      state.playerGait = "interact";
      state.actionTimer = 0.7;
      state.missionHint = "Drop the bag at Market Cut (glowing pad).";
      return;
    }
    if (
      state.mission === "bag" &&
      state.bagHeld &&
      dist2(state.playerX, state.playerZ, city.bagDrop.x, city.bagDrop.z) < 9
    ) {
      state.bagHeld = false;
      state.mission = "tail";
      state.missionHint = missionHint("tail");
      state.wanted = Math.max(state.wanted, 1);
      const chase = state.vehicles.find((v) => v.kind === "chase");
      if (chase) {
        chase.x = state.playerX - Math.sin(state.playerYaw) * 18;
        chase.z = state.playerZ - Math.cos(state.playerYaw) * 18;
      }
      state.playerGait = "talk";
      state.actionTimer = 0.8;
      return;
    }
  }

  if (intent.punch && !state.vehicleId) {
    state.punchFlip = !state.punchFlip;
    state.playerGait = state.punchFlip ? "punch" : "punchCross";
    state.actionTimer = 0.42;
    for (const npc of state.npcs) {
      if (dist2(npc.x, npc.z, state.playerX, state.playerZ) > 2.2 * 2.2) continue;
      if (npc.faction === "warden") raiseWanted(state, 1);
    }
  }
}

export function stepOpenWorld(
  state: OpenWorldState,
  city: CityData,
  intent: PlayIntent,
  dt: number,
  camYaw: number
): void {
  const clamped = Math.min(0.05, Math.max(0, dt));
  const wasAction = state.actionTimer;
  state.actionTimer = Math.max(0, state.actionTimer - clamped);
  state.wantedCooldown = Math.max(0, state.wantedCooldown - clamped);

  if (wasAction > 0 && state.actionTimer <= 0) {
    if (state.playerGait === "sitEnter") state.playerGait = "drive";
    if (state.playerGait === "sitExit") state.playerGait = "idle";
  }

  tryInteract(state, city, intent);

  const vehicle = occupiedVehicle(state);
  if (vehicle && state.playerGait !== "sitEnter") {
    moveDrivenVehicle(state, city, vehicle, intent, clamped);
  } else if (!vehicle) {
    moveOnFoot(state, city, intent, clamped, camYaw);
  }

  if (state.bagHeld) {
    state.bag.x = state.playerX + Math.sin(state.playerYaw) * 0.7;
    state.bag.z = state.playerZ + Math.cos(state.playerYaw) * 0.7;
  }

  if (vehicle) {
    for (const npc of state.npcs) {
      if (npc.faction !== "warden") continue;
      if (
        dist2(vehicle.x, vehicle.z, npc.x, npc.z) < 2.6 * 2.6 &&
        Math.abs(vehicle.speed) > 5
      ) {
        raiseWanted(state, 1);
      }
    }
  }

  if (
    state.mission === "coupe" &&
    vehicle?.kind === "coupe" &&
    dist2(vehicle.x, vehicle.z, city.garage.x, city.garage.z) < 16
  ) {
    state.mission = "done";
    state.missionHint = missionHint("done");
  }

  driveChaseCar(state, city, clamped);
  stepNpcs(state, city, clamped);
}

export function openWorldHud(state: OpenWorldState): OpenWorldHud {
  const vehicle = occupiedVehicle(state);
  return {
    title: "Cinder Bay",
    district: districtAt(state.playerX, state.playerZ),
    mission: state.missionHint,
    wanted: state.wanted,
    inVehicle: Boolean(vehicle),
    vehicleKind: vehicle?.kind ?? null,
    speed: vehicle ? Math.abs(vehicle.speed) : 0,
    hint: vehicle
      ? "W/S throttle · A/D steer · E exit · Esc pause"
      : "WASD · Shift sprint · Space jump · C crouch · E interact · F punch · Esc pause",
    done: state.mission === "done",
    gait: state.playerGait,
  };
}
