export type Aabb2 = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export function pointInAabb(x: number, z: number, box: Aabb2): boolean {
  return x >= box.minX && x <= box.maxX && z >= box.minZ && z <= box.maxZ;
}

export function circleHitsAabb(
  x: number,
  z: number,
  radius: number,
  box: Aabb2
): boolean {
  const cx = Math.min(box.maxX, Math.max(box.minX, x));
  const cz = Math.min(box.maxZ, Math.max(box.minZ, z));
  const dx = x - cx;
  const dz = z - cz;
  return dx * dx + dz * dz < radius * radius;
}

/** Push a circle out of solid AABBs. Returns the resolved position. */
export function resolveCircle(
  x: number,
  z: number,
  radius: number,
  solids: readonly Aabb2[]
): { x: number; z: number } {
  let px = x;
  let pz = z;
  for (const box of solids) {
    if (!circleHitsAabb(px, pz, radius, box)) continue;
    const cx = Math.min(box.maxX, Math.max(box.minX, px));
    const cz = Math.min(box.maxZ, Math.max(box.minZ, pz));
    let dx = px - cx;
    let dz = pz - cz;
    const dist = Math.hypot(dx, dz);
    if (dist < 1e-6) {
      const left = Math.abs(px - box.minX);
      const right = Math.abs(box.maxX - px);
      const up = Math.abs(pz - box.minZ);
      const down = Math.abs(box.maxZ - pz);
      const m = Math.min(left, right, up, down);
      if (m === left) px = box.minX - radius;
      else if (m === right) px = box.maxX + radius;
      else if (m === up) pz = box.minZ - radius;
      else pz = box.maxZ + radius;
      continue;
    }
    const push = (radius - dist) / dist;
    px += dx * push;
    pz += dz * push;
  }
  return { x: px, z: pz };
}

export function dist2(ax: number, az: number, bx: number, bz: number): number {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
}
