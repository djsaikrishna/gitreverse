import type { Aabb2 } from "@/lib/play/aabb";

export const CITY_CELL = 32;
export const CITY_RANGE = 2;
export const ROAD_HALF = 5;
export const PLAYER_RADIUS = 0.42;
export const VEHICLE_RADIUS = 1.35;
export const SCOOTER_RADIUS = 0.7;

export type DistrictId = "wharf" | "market" | "ridge";

export type Landmark = {
  id: DistrictId;
  name: string;
  x: number;
  z: number;
};

export type BuildingSpec = {
  id: string;
  aabb: Aabb2;
  height: number;
  color: number;
  accent: number;
  kind: "block" | "market" | "ridge" | "warehouse";
};

export type VehicleSpawn = {
  id: string;
  kind: "scooter" | "hatch" | "coupe" | "chase";
  x: number;
  z: number;
  yaw: number;
};

export type CityData = {
  buildings: BuildingSpec[];
  solids: Aabb2[];
  landmarks: Landmark[];
  park: Aabb2;
  water: Aabb2;
  bag: { x: number; z: number };
  bagDrop: { x: number; z: number };
  garage: { x: number; z: number };
  playerSpawn: { x: number; z: number; yaw: number };
  vehicles: VehicleSpawn[];
  npcSpawns: Array<{
    id: string;
    faction: "civilian" | "warden" | "dock" | "hill";
    x: number;
    z: number;
    yaw: number;
  }>;
  roadLoops: Array<Array<{ x: number; z: number }>>;
};

const WHARF_COLORS = [0xb56a4e, 0xc4a574, 0x8a6a4a];
const MARKET_COLORS = [0xd9c4a8, 0xcfc3b0, 0xe0b070];
const RIDGE_COLORS = [0x8ea7a1, 0xc5b89a, 0xa8b8c0];

function cellCenter(ix: number, iz: number): { x: number; z: number } {
  return { x: ix * CITY_CELL, z: iz * CITY_CELL };
}

function plotAabb(ix: number, iz: number, inset: number): Aabb2 {
  const { x, z } = cellCenter(ix, iz);
  const half = CITY_CELL / 2 - ROAD_HALF - inset;
  return { minX: x - half, maxX: x + half, minZ: z - half, maxZ: z + half };
}

function hash(ix: number, iz: number): number {
  return Math.abs((ix * 73856093) ^ (iz * 19349663)) >>> 0;
}

function districtOf(iz: number): DistrictId {
  if (iz >= 1) return "wharf";
  if (iz <= -1) return "ridge";
  return "market";
}

export function buildCinderBay(): CityData {
  const buildings: BuildingSpec[] = [];
  const landmarks: Landmark[] = [
    { id: "market", name: "Market Cut", x: 0, z: 0 },
    { id: "ridge", name: "Ridge Hill", x: 0, z: -2 * CITY_CELL },
    { id: "wharf", name: "Iron Wharf", x: 0, z: 2 * CITY_CELL },
  ];

  for (let ix = -CITY_RANGE; ix <= CITY_RANGE; ix++) {
    for (let iz = -CITY_RANGE; iz <= CITY_RANGE; iz++) {
      if (ix === 0 && iz === 0) continue;
      if (ix === 0 && iz === 2) continue;
      const h = hash(ix, iz);
      const district = districtOf(iz);
      const inset = 1.3 + ((h >> 3) % 3) * 0.3;
      const colors =
        district === "wharf" ? WHARF_COLORS : district === "ridge" ? RIDGE_COLORS : MARKET_COLORS;
      const kind =
        district === "ridge" ? "ridge" : district === "market" ? "market" : "warehouse";
      const height =
        district === "ridge" ? 11 + (h % 8) : district === "market" ? 6 + (h % 5) : 7 + (h % 6);
      buildings.push({
        id: `b-${ix}-${iz}`,
        aabb: plotAabb(ix, iz, inset),
        height,
        color: colors[h % colors.length]!,
        accent: 0x2c241c,
        kind,
      });
    }
  }

  const park: Aabb2 = {
    minX: -CITY_CELL / 2 + ROAD_HALF,
    maxX: CITY_CELL / 2 - ROAD_HALF,
    minZ: -CITY_CELL / 2 + ROAD_HALF,
    maxZ: CITY_CELL / 2 - ROAD_HALF,
  };

  const water: Aabb2 = {
    minX: -CITY_CELL * 2.6,
    maxX: CITY_CELL * 2.6,
    minZ: CITY_CELL * 2 + 10,
    maxZ: CITY_CELL * 2 + 38,
  };

  const bag = { x: 4, z: CITY_CELL * 2 + 6 };
  const bagDrop = { x: 8, z: 6 };
  const garage = { x: -10, z: CITY_CELL * 2 - 8 };
  const playerSpawn = { x: 8, z: CITY_CELL * 2 - 10, yaw: Math.PI };

  const vehicles: VehicleSpawn[] = [
    { id: "scooter", kind: "scooter", x: 14, z: 2, yaw: 0.2 },
    { id: "hatch", kind: "hatch", x: -18, z: 12, yaw: 1.2 },
    { id: "coupe", kind: "coupe", x: 6, z: -CITY_CELL * 2 + 14, yaw: 0 },
    { id: "chase", kind: "chase", x: -40, z: CITY_CELL * 2, yaw: 0 },
  ];

  const roadLoops: Array<Array<{ x: number; z: number }>> = [];
  for (const ring of [1, 2]) {
    const s = ring * CITY_CELL;
    roadLoops.push([
      { x: -s, z: -s },
      { x: s, z: -s },
      { x: s, z: s },
      { x: -s, z: s },
    ]);
  }

  const npcSpawns: CityData["npcSpawns"] = [
    { id: "dock-a", faction: "dock", x: 12, z: CITY_CELL * 2 - 6, yaw: Math.PI },
    { id: "dock-b", faction: "dock", x: -4, z: CITY_CELL * 2 - 2, yaw: 0.4 },
    { id: "warden-a", faction: "warden", x: 4, z: 10, yaw: 0.2 },
    { id: "warden-b", faction: "warden", x: -8, z: -6, yaw: 1.2 },
    { id: "hill-a", faction: "hill", x: 10, z: -CITY_CELL * 2 + 10, yaw: 0.5 },
    { id: "civ-a", faction: "civilian", x: CITY_CELL, z: 0, yaw: 0 },
    { id: "civ-b", faction: "civilian", x: -CITY_CELL, z: CITY_CELL, yaw: 1 },
    { id: "civ-c", faction: "civilian", x: CITY_CELL, z: -CITY_CELL, yaw: 2 },
  ];

  return {
    buildings,
    solids: buildings.map((b) => b.aabb),
    landmarks,
    park,
    water,
    bag,
    bagDrop,
    garage,
    playerSpawn,
    vehicles,
    npcSpawns,
    roadLoops,
  };
}

export function landmarkById(city: CityData, id: DistrictId): Landmark {
  const found = city.landmarks.find((item) => item.id === id);
  if (!found) throw new Error(`Missing landmark ${id}`);
  return found;
}
