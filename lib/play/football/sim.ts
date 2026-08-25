import type { PlayIntent } from "@/lib/play/input";
import { dist2 } from "@/lib/play/aabb";
import { LOCO_TO_CLIP } from "@/lib/play/clips";

export type FootballTeamId = "home" | "away";
export type FootballRole = "gk" | "def" | "mid" | "fwd";
export type FootballPhase = "kickoff" | "play" | "goal" | "fulltime";
export type FootballGait =
  | "idle"
  | "walk"
  | "jog"
  | "sprint"
  | "jumpStart"
  | "jumpLoop"
  | "jumpLand"
  | "interact"
  | "roll"
  | "hit"
  | "dance";

export type FootballPlayer = {
  id: string;
  name: string;
  team: FootballTeamId;
  role: FootballRole;
  x: number;
  z: number;
  y: number;
  vy: number;
  yaw: number;
  gait: FootballGait;
  isUser: boolean;
  number: number;
  actionTimer: number;
};

export type FootballState = {
  phase: FootballPhase;
  clock: number;
  phaseTimer: number;
  scoreHome: number;
  scoreAway: number;
  userTeam: FootballTeamId;
  ballX: number;
  ballY: number;
  ballZ: number;
  ballVx: number;
  ballVy: number;
  ballVz: number;
  lastScorer: FootballTeamId | null;
  lastTouch: FootballTeamId | null;
  event: string;
  players: FootballPlayer[];
};

export type FootballHud = {
  title: string;
  home: string;
  away: string;
  scoreHome: number;
  scoreAway: number;
  clock: string;
  event: string;
  hint: string;
  phase: FootballPhase;
  userTeam: FootballTeamId;
  userClip: string;
  fieldClips: string;
};

export const PITCH = {
  halfX: 24,
  halfZ: 15,
  goalHalfZ: 3.6,
  goalX: 24,
  ballRadius: 0.22,
  playerRadius: 0.48,
} as const;

export const MATCH_SECONDS = 90;
export const WIN_SCORE = 3;

export const FOOTBALL_TEAMS = {
  home: { id: "home" as const, name: "Harbor Rovers", main: 0x0f6f73, joints: 0xf2efe4 },
  away: { id: "away" as const, name: "Milltown Athletic", main: 0xd89a1a, joints: 0x1c1915 },
};

export const FOOTBALL_KITS = {
  home: { main: FOOTBALL_TEAMS.home.main, joints: FOOTBALL_TEAMS.home.joints },
  away: { main: FOOTBALL_TEAMS.away.main, joints: FOOTBALL_TEAMS.away.joints },
};

const FORMATION: Array<{
  id: string;
  name: string;
  team: FootballTeamId;
  role: FootballRole;
  number: number;
  x: number;
  z: number;
}> = [
  { id: "h-gk", name: "Rafi Quinn", team: "home", role: "gk", number: 1, x: -21.5, z: 0 },
  { id: "h-dl", name: "Ivo Park", team: "home", role: "def", number: 4, x: -12, z: -6 },
  { id: "h-dr", name: "Sable Wren", team: "home", role: "def", number: 5, x: -12, z: 6 },
  { id: "h-m", name: "Theo Marsh", team: "home", role: "mid", number: 8, x: -6, z: 0 },
  { id: "h-st", name: "Mira Solano", team: "home", role: "fwd", number: 9, x: -2.5, z: 1.2 },
  { id: "a-gk", name: "Nessa Cole", team: "away", role: "gk", number: 1, x: 21.5, z: 0 },
  { id: "a-dl", name: "Bram Holt", team: "away", role: "def", number: 3, x: 12, z: 6 },
  { id: "a-dr", name: "Kade Voss", team: "away", role: "def", number: 6, x: 12, z: -6 },
  { id: "a-m", name: "Yuna Pell", team: "away", role: "mid", number: 10, x: 6, z: 0 },
  { id: "a-st", name: "Orrin Vale", team: "away", role: "fwd", number: 11, x: 2.5, z: -1 },
];

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function formatClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function makePlayers(userTeam: FootballTeamId): FootballPlayer[] {
  const userId = userTeam === "home" ? "h-st" : "a-st";
  return FORMATION.map((row) => ({
    id: row.id,
    name: row.name,
    team: row.team,
    role: row.role,
    x: row.x,
    z: row.z,
    y: 0,
    vy: 0,
    yaw: row.team === "home" ? Math.PI / 2 : -Math.PI / 2,
    gait: "idle",
    isUser: row.id === userId,
    number: row.number,
    actionTimer: 0,
  }));
}

export function createFootballState(userTeam: FootballTeamId = "home"): FootballState {
  return {
    phase: "kickoff",
    clock: MATCH_SECONDS,
    phaseTimer: 1.6,
    scoreHome: 0,
    scoreAway: 0,
    userTeam,
    ballX: 0,
    ballY: PITCH.ballRadius,
    ballZ: 0,
    ballVx: 0,
    ballVy: 0,
    ballVz: 0,
    lastScorer: null,
    lastTouch: null,
    event: "Kickoff · Harbor Rovers vs Milltown Athletic",
    players: makePlayers(userTeam),
  };
}

function resetPositions(state: FootballState, kickoffTeam: FootballTeamId): void {
  for (const row of FORMATION) {
    const player = state.players.find((p) => p.id === row.id);
    if (!player) continue;
    player.x = row.x;
    player.z = row.z;
    player.y = 0;
    player.vy = 0;
    player.yaw = row.team === "home" ? Math.PI / 2 : -Math.PI / 2;
    player.gait = "idle";
    player.actionTimer = 0;
  }
  state.ballX = kickoffTeam === "home" ? -0.8 : 0.8;
  state.ballY = PITCH.ballRadius;
  state.ballZ = 0;
  state.ballVx = 0;
  state.ballVy = 0;
  state.ballVz = 0;
}

function homeBase(player: FootballPlayer): { x: number; z: number } {
  const row = FORMATION.find((item) => item.id === player.id);
  return { x: row?.x ?? 0, z: row?.z ?? 0 };
}

function nearestTeammate(state: FootballState, player: FootballPlayer): FootballPlayer | null {
  let best: FootballPlayer | null = null;
  let bestD = Infinity;
  for (const other of state.players) {
    if (other.team !== player.team || other.id === player.id) continue;
    const d = dist2(player.x, player.z, other.x, other.z);
    if (d < bestD) {
      best = other;
      bestD = d;
    }
  }
  return best;
}

function applyGravity(player: FootballPlayer, dt: number): void {
  player.vy -= 18 * dt;
  player.y += player.vy * dt;
  if (player.y <= 0) {
    const wasAir = player.y + player.vy * dt > 0 || player.gait.startsWith("jump");
    player.y = 0;
    player.vy = 0;
    if (wasAir && player.gait !== "interact" && player.gait !== "roll" && player.gait !== "dance") {
      if (player.gait === "jumpLoop" || player.gait === "jumpStart") {
        player.gait = "jumpLand";
        player.actionTimer = 0.28;
      }
    }
  } else if (player.gait === "jumpStart" && player.vy < 1.1) {
    player.gait = "jumpLoop";
  }
}

function movePlayer(
  player: FootballPlayer,
  tx: number,
  tz: number,
  sprint: boolean,
  dt: number
): void {
  if (player.actionTimer > 0 && (player.gait === "interact" || player.gait === "roll" || player.gait === "dance")) {
    return;
  }
  const dx = tx - player.x;
  const dz = tz - player.z;
  const len = Math.hypot(dx, dz);
  if (len < 0.08) {
    if (player.y <= 0 && player.actionTimer <= 0) player.gait = "idle";
    return;
  }
  const speed = sprint ? 7.2 : player.role === "gk" ? 3.4 : 5.1;
  const step = Math.min(len, speed * dt);
  player.x += (dx / len) * step;
  player.z += (dz / len) * step;
  player.x = clamp(player.x, -PITCH.halfX + 0.4, PITCH.halfX - 0.4);
  player.z = clamp(player.z, -PITCH.halfZ + 0.4, PITCH.halfZ - 0.4);
  player.yaw = Math.atan2(dx, dz);
  if (player.y <= 0 && player.actionTimer <= 0) {
    player.gait = sprint ? "sprint" : speed > 4.2 ? "jog" : "walk";
  }
}

function userControl(player: FootballPlayer, intent: PlayIntent, dt: number, camYaw: number): void {
  if (player.actionTimer > 0 && player.gait === "interact") return;
  const moving = Math.hypot(intent.axisX, intent.axisZ) > 0.05;
  if (moving) {
    const sin = Math.sin(camYaw);
    const cos = Math.cos(camYaw);
    const dx = intent.axisX * cos + intent.axisZ * sin;
    const dz = -intent.axisX * sin + intent.axisZ * cos;
    const yaw = Math.atan2(dx, dz);
    const speed = intent.sprint ? 7.4 : 5.0;
    player.yaw = yaw;
    player.x = clamp(player.x + Math.sin(yaw) * speed * dt, -PITCH.halfX + 0.4, PITCH.halfX - 0.4);
    player.z = clamp(player.z + Math.cos(yaw) * speed * dt, -PITCH.halfZ + 0.4, PITCH.halfZ - 0.4);
    if (player.y <= 0 && player.actionTimer <= 0) {
      player.gait = intent.sprint ? "sprint" : "jog";
    }
  } else if (player.y <= 0 && player.actionTimer <= 0) {
    player.gait = "idle";
  }
  if (intent.header && player.y <= 0) {
    player.vy = 6.2;
    player.gait = "jumpStart";
  }
}

function strikeBall(
  state: FootballState,
  player: FootballPlayer,
  power: number,
  aimX: number,
  aimZ: number,
  lift = 0.08
): void {
  const len = Math.hypot(aimX, aimZ) || 1;
  state.ballVx = (aimX / len) * power;
  state.ballVz = (aimZ / len) * power;
  state.ballVy = power * lift;
  state.lastTouch = player.team;
  player.gait = "interact";
  player.actionTimer = 0.45;
}

function aiThink(state: FootballState, player: FootballPlayer, dt: number): void {
  const attackDir = player.team === "home" ? 1 : -1;
  const goalX = attackDir * PITCH.goalX;
  const base = homeBase(player);
  const toBall = Math.sqrt(dist2(player.x, player.z, state.ballX, state.ballZ));
  const closest = [...state.players]
    .filter((p) => p.team === player.team)
    .sort(
      (a, b) =>
        dist2(a.x, a.z, state.ballX, state.ballZ) - dist2(b.x, b.z, state.ballX, state.ballZ)
    )[0];
  const onBall = closest?.id === player.id;
  const phase = state.clock * 2.2 + player.number * 0.85;
  const wobbleX = Math.sin(phase) * 2.4;
  const wobbleZ = Math.cos(phase * 0.82) * 1.8;

  if (player.role === "gk") {
    const tz = clamp(state.ballZ * 0.7 + Math.sin(state.clock * 1.6) * 1.1, -4.5, 4.5);
    const tx = player.team === "home" ? -21.2 : 21.2;
    movePlayer(player, tx, tz, toBall < 8, dt);
    const shotIncoming =
      (player.team === "home" ? state.ballVx < -6 : state.ballVx > 6) && toBall < 7;
    if (shotIncoming) {
      player.gait = "roll";
      player.actionTimer = 0.7;
      if (toBall < 2.8) {
        state.ballVx *= -0.45;
        state.ballVz += (Math.random() - 0.5) * 4;
        state.event = "Save!";
      }
    } else if (toBall < 2.2) {
      strikeBall(state, player, 10, -attackDir * 0.15 + attackDir, (Math.random() - 0.5) * 0.5);
    }
    return;
  }

  if (onBall) {
    const tx = state.ballX + attackDir * 0.55;
    const tz = state.ballZ;
    movePlayer(player, tx, tz, true, dt);
    if (toBall < 1.35 && player.actionTimer <= 0) {
      const inBox = Math.abs(state.ballX - goalX) < 11;
      if (inBox) {
        strikeBall(state, player, 13.8, goalX - player.x, 0 - player.z + (Math.random() - 0.5) * 1.6, 0.1);
      } else {
        const mate = nearestTeammate(state, player);
        if (mate) strikeBall(state, player, 9.2, mate.x - player.x, mate.z - player.z, 0.04);
        else strikeBall(state, player, 8.4, goalX - player.x, -player.z, 0.06);
      }
    }
    return;
  }

  const press = toBall < 16;
  const supportX = press
    ? state.ballX * 0.62 + base.x * 0.38 + wobbleX * 0.4
    : base.x * 0.48 + state.ballX * 0.52 + wobbleX;
  const supportZ = press
    ? state.ballZ * 0.68 + base.z * 0.32 + wobbleZ * 0.4
    : base.z * 0.5 + state.ballZ * 0.5 + wobbleZ;
  movePlayer(player, supportX, supportZ, toBall < 12, dt);
}

function stepBall(state: FootballState, dt: number): boolean {
  state.ballVy -= 18 * dt;
  state.ballX += state.ballVx * dt;
  state.ballY += state.ballVy * dt;
  state.ballZ += state.ballVz * dt;
  state.ballVx *= 0.985;
  state.ballVz *= 0.985;
  if (state.ballY < PITCH.ballRadius) {
    state.ballY = PITCH.ballRadius;
    state.ballVy *= -0.35;
    if (Math.abs(state.ballVy) < 0.6) state.ballVy = 0;
    state.ballVx *= 0.92;
    state.ballVz *= 0.92;
  }

  for (const player of state.players) {
    const d = Math.sqrt(dist2(player.x, player.z, state.ballX, state.ballZ));
    const min = PITCH.playerRadius + PITCH.ballRadius;
    if (d < min && d > 1e-4) {
      const nx = (state.ballX - player.x) / d;
      const nz = (state.ballZ - player.z) / d;
      state.ballX = player.x + nx * min;
      state.ballZ = player.z + nz * min;
      state.ballVx += nx * 2.4;
      state.ballVz += nz * 2.4;
    }
  }

  if (Math.abs(state.ballZ) > PITCH.halfZ) {
    state.ballZ = clamp(state.ballZ, -PITCH.halfZ, PITCH.halfZ);
    state.ballVz *= -0.4;
  }

  const inGoalZ = Math.abs(state.ballZ) <= PITCH.goalHalfZ;
  if (state.ballX > PITCH.goalX && inGoalZ) {
    finishGoal(state, "home");
    return true;
  }
  if (state.ballX < -PITCH.goalX && inGoalZ) {
    finishGoal(state, "away");
    return true;
  }
  if (Math.abs(state.ballX) > PITCH.halfX) {
    state.ballX = clamp(state.ballX, -PITCH.halfX, PITCH.halfX);
    state.ballVx *= -0.25;
  }
  return false;
}

function finishGoal(state: FootballState, team: FootballTeamId): void {
  if (team === "home") state.scoreHome += 1;
  else state.scoreAway += 1;
  state.lastScorer = team;
  state.phase = "goal";
  state.phaseTimer = 2.2;
  state.event = team === "home" ? "GOAL · Harbor Rovers" : "GOAL · Milltown Athletic";
  state.ballVx = 0;
  state.ballVz = 0;
  state.ballVy = 0;
  for (const player of state.players) {
    player.gait = player.team === team ? "dance" : "hit";
    player.actionTimer = 2;
  }
}

function userStrike(state: FootballState, user: FootballPlayer, intent: PlayIntent): void {
  const d = Math.sqrt(dist2(user.x, user.z, state.ballX, state.ballZ));
  if (d > 1.75) return;
  const goalX = user.team === "home" ? PITCH.goalX : -PITCH.goalX;
  if (intent.shoot) {
    const lift = state.ballY > 1.05 || user.y > 0.4 ? 0.02 : 0.1;
    strikeBall(state, user, intent.sprint ? 15.5 : 12.2, goalX - user.x, 0 - user.z, lift);
    if (user.y > 0.3 || state.ballY > 1.05) {
      user.gait = "jumpStart";
    }
    return;
  }
  if (intent.pass) {
    const mate = nearestTeammate(state, user);
    if (mate) strikeBall(state, user, 9.4, mate.x - user.x, mate.z - user.z, 0.03);
    else strikeBall(state, user, 8, Math.sin(user.yaw), Math.cos(user.yaw), 0.03);
  }
}

function maybeHeader(state: FootballState, user: FootballPlayer): void {
  if (user.y < 0.35 || state.ballY < 1.0) return;
  const d = Math.sqrt(dist2(user.x, user.z, state.ballX, state.ballZ));
  if (d > 1.4) return;
  const goalX = user.team === "home" ? PITCH.goalX : -PITCH.goalX;
  strikeBall(state, user, 11, goalX - user.x, state.ballZ * 0.15 - user.z, 0.02);
  user.gait = "jumpLoop";
}

export function stepFootball(
  state: FootballState,
  intent: PlayIntent,
  dt: number,
  camYaw: number
): void {
  const clamped = Math.min(0.05, Math.max(0, dt));
  if (intent.restart) {
    Object.assign(state, createFootballState(state.userTeam));
    return;
  }

  for (const player of state.players) {
    player.actionTimer = Math.max(0, player.actionTimer - clamped);
    applyGravity(player, clamped);
  }

  if (state.phase === "fulltime") return;

  if (state.phase === "kickoff" || state.phase === "goal") {
    state.phaseTimer -= clamped;
    if (state.phaseTimer <= 0) {
      if (state.phase === "goal") {
        if (state.scoreHome >= WIN_SCORE || state.scoreAway >= WIN_SCORE || state.clock <= 0) {
          whistleFullTime(state);
          return;
        }
        resetPositions(state, state.lastScorer === "home" ? "away" : "home");
      }
      state.phase = "play";
      state.event = "Play on";
    }
    return;
  }

  state.clock = Math.max(0, state.clock - clamped);
  const user = state.players.find((p) => p.isUser);
  if (user) {
    userControl(user, intent, clamped, camYaw);
    userStrike(state, user, intent);
    maybeHeader(state, user);
  }

  for (const player of state.players) {
    if (player.isUser) continue;
    if (player.actionTimer <= 0 && player.gait === "interact") player.gait = "jog";
    aiThink(state, player, clamped);
  }

  stepBall(state, clamped);

  if (state.phase === "play" && state.clock <= 0) {
    whistleFullTime(state);
  }
}

function whistleFullTime(state: FootballState): void {
  state.phase = "fulltime";
  const home = FOOTBALL_TEAMS.home.name;
  const away = FOOTBALL_TEAMS.away.name;
  state.event =
    state.scoreHome === state.scoreAway
      ? `Final whistle · draw ${state.scoreHome}-${state.scoreAway}`
      : state.scoreHome > state.scoreAway
        ? `Final whistle · ${home} win`
        : `Final whistle · ${away} win`;
}

export function footballHud(state: FootballState): FootballHud {
  const user = state.players.find((p) => p.isUser);
  const clips = [...new Set(state.players.map((p) => LOCO_TO_CLIP[p.gait] ?? p.gait))];
  return {
    title: "Floodlight Eleven",
    home: FOOTBALL_TEAMS.home.name,
    away: FOOTBALL_TEAMS.away.name,
    scoreHome: state.scoreHome,
    scoreAway: state.scoreAway,
    clock: formatClock(state.clock),
    event: state.event,
    hint:
      state.phase === "fulltime"
        ? "R to restart · Esc pause"
        : "WASD move · Shift sprint · F pass · Space shoot · C header · Esc pause",
    phase: state.phase,
    userTeam: state.userTeam,
    userClip: user ? LOCO_TO_CLIP[user.gait] ?? user.gait : "Idle_Loop",
    fieldClips: clips.join(" · "),
  };
}
