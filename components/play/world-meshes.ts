import type { Scene } from "three";
import type { CityData } from "@/lib/play/openworld/city";
import { CITY_CELL, CITY_RANGE, ROAD_HALF } from "@/lib/play/openworld/city";
import { PITCH } from "@/lib/play/football/sim";

type Three = typeof import("three");

export function addCinderBayCity(THREE: Three, scene: Scene, city: CityData): void {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY_CELL * 7, CITY_CELL * 7),
    new THREE.MeshStandardMaterial({ color: 0x6b5340, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const sidewalk = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY_CELL * 5.4, CITY_CELL * 5.4),
    new THREE.MeshStandardMaterial({ color: 0xb89a72, roughness: 1 })
  );
  sidewalk.rotation.x = -Math.PI / 2;
  sidewalk.position.y = 0.01;
  sidewalk.receiveShadow = true;
  scene.add(sidewalk);

  for (let i = -CITY_RANGE; i <= CITY_RANGE; i++) {
    const roadZ = new THREE.Mesh(
      new THREE.PlaneGeometry(CITY_CELL * 5.6, ROAD_HALF * 2),
      new THREE.MeshStandardMaterial({ color: 0x3a342c, roughness: 1 })
    );
    roadZ.rotation.x = -Math.PI / 2;
    roadZ.position.set(0, 0.02, i * CITY_CELL);
    scene.add(roadZ);
    const roadX = new THREE.Mesh(
      new THREE.PlaneGeometry(ROAD_HALF * 2, CITY_CELL * 5.6),
      new THREE.MeshStandardMaterial({ color: 0x3a342c, roughness: 1 })
    );
    roadX.rotation.x = -Math.PI / 2;
    roadX.position.set(i * CITY_CELL, 0.02, 0);
    scene.add(roadX);
  }

  const park = new THREE.Mesh(
    new THREE.PlaneGeometry(
      city.park.maxX - city.park.minX,
      city.park.maxZ - city.park.minZ
    ),
    new THREE.MeshStandardMaterial({ color: 0x6a8a4a, roughness: 1 })
  );
  park.rotation.x = -Math.PI / 2;
  park.position.set(
    (city.park.minX + city.park.maxX) / 2,
    0.03,
    (city.park.minZ + city.park.maxZ) / 2
  );
  scene.add(park);

  for (const tree of [
    [-6, -5],
    [7, 4],
    [-4, 8],
    [5, -7],
  ] as const) {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.22, 1.2, 6),
      new THREE.MeshStandardMaterial({ color: 0x5c4030 })
    );
    trunk.position.set(tree[0], 0.6, tree[1]);
    const crown = new THREE.Mesh(
      new THREE.ConeGeometry(1.4, 2.4, 7),
      new THREE.MeshStandardMaterial({ color: 0x3d6b32 })
    );
    crown.position.set(tree[0], 2.1, tree[1]);
    scene.add(trunk, crown);
  }

  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(
      city.water.maxX - city.water.minX,
      city.water.maxZ - city.water.minZ
    ),
    new THREE.MeshStandardMaterial({
      color: 0x2a7a86,
      roughness: 0.25,
      metalness: 0.1,
    })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(
    (city.water.minX + city.water.maxX) / 2,
    0.0,
    (city.water.minZ + city.water.maxZ) / 2
  );
  scene.add(water);

  const pier = new THREE.Mesh(
    new THREE.BoxGeometry(18, 0.35, 10),
    new THREE.MeshStandardMaterial({ color: 0x8a5a32 })
  );
  pier.position.set(0, 0.15, CITY_CELL * 2 + 4);
  scene.add(pier);

  const mast = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 16, 0.45),
    new THREE.MeshStandardMaterial({ color: 0xd06a1a })
  );
  mast.position.set(-6, 8, CITY_CELL * 2 + 6);
  const arm = new THREE.Mesh(
    new THREE.BoxGeometry(12, 0.4, 0.4),
    new THREE.MeshStandardMaterial({ color: 0xe07a22 })
  );
  arm.position.set(0, 15.4, CITY_CELL * 2 + 6);
  scene.add(mast, arm);

  for (const stall of [
    [-4, 2],
    [2, -3],
    [6, 4],
  ] as const) {
    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.12, 2.4),
      new THREE.MeshStandardMaterial({ color: 0xc43c28 })
    );
    awning.position.set(stall[0], 2.2, stall[1]);
    const postL = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 2.2, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x4a3020 })
    );
    postL.position.set(stall[0] - 1.4, 1.1, stall[1]);
    scene.add(awning, postL);
  }

  for (const building of city.buildings) {
    const w = building.aabb.maxX - building.aabb.minX;
    const d = building.aabb.maxZ - building.aabb.minZ;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, building.height, d),
      new THREE.MeshStandardMaterial({ color: building.color, roughness: 0.85 })
    );
    mesh.position.set(
      (building.aabb.minX + building.aabb.maxX) / 2,
      building.height / 2,
      (building.aabb.minZ + building.aabb.maxZ) / 2
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }

  const drop = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.6, 0.12, 20),
    new THREE.MeshStandardMaterial({ color: 0xffc480, emissive: 0x663300 })
  );
  drop.position.set(city.bagDrop.x, 0.08, city.bagDrop.z);
  scene.add(drop);

  const garage = new THREE.Mesh(
    new THREE.BoxGeometry(6, 0.1, 5),
    new THREE.MeshStandardMaterial({ color: 0x3d6b9a, emissive: 0x102030 })
  );
  garage.position.set(city.garage.x, 0.06, city.garage.z);
  scene.add(garage);
}

export function createVehicleMesh(
  THREE: Three,
  kind: "scooter" | "hatch" | "coupe" | "chase"
): import("three").Group {
  const car = new THREE.Group();
  if (kind === "scooter") {
    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.12, 1.5),
      new THREE.MeshStandardMaterial({ color: 0xd23a2a, roughness: 0.5 })
    );
    deck.position.y = 0.28;
    const stem = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.9, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    stem.position.set(0, 0.7, 0.55);
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.08, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x111111 })
    );
    bar.position.set(0, 1.12, 0.55);
    car.add(deck, stem, bar);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    for (const z of [0.55, -0.55]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.12, 10), tireMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(0, 0.22, z);
      car.add(wheel);
    }
    return car;
  }

  const palette =
    kind === "coupe" ? 0xe2b03a : kind === "chase" ? 0x1c3d66 : 0xcfd4d8;
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(kind === "coupe" ? 1.7 : 1.55, 0.55, kind === "coupe" ? 3.5 : 3.1),
    new THREE.MeshStandardMaterial({ color: palette, roughness: 0.45, metalness: 0.15 })
  );
  body.position.y = 0.55;
  body.castShadow = true;
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.5, 1.4),
    new THREE.MeshStandardMaterial({ color: 0x1c2830, roughness: 0.3, metalness: 0.2 })
  );
  cabin.position.set(0, 1.02, -0.1);
  car.add(body, cabin);
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
  for (const [x, z] of [
    [-0.8, 1.05],
    [0.8, 1.05],
    [-0.8, -1.05],
    [0.8, -1.05],
  ] as const) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.26, 10), tireMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.3, z);
    car.add(wheel);
  }
  return car;
}

export function createBag(THREE: Three): import("three").Mesh {
  const bag = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.4, 0.7),
    new THREE.MeshStandardMaterial({
      color: 0x5a3a1c,
      emissive: 0x3a1a00,
      roughness: 0.8,
    })
  );
  bag.position.y = 0.22;
  bag.castShadow = true;
  return bag;
}

export function addFootballPitch(THREE: Three, scene: Scene): void {
  const field = new THREE.Mesh(
    new THREE.PlaneGeometry(PITCH.halfX * 2 + 8, PITCH.halfZ * 2 + 8),
    new THREE.MeshStandardMaterial({ color: 0x1f5c2c, roughness: 1 })
  );
  field.rotation.x = -Math.PI / 2;
  field.receiveShadow = true;
  scene.add(field);

  const stripeMat = new THREE.MeshStandardMaterial({ color: 0x267a38 });
  for (let i = -4; i <= 4; i++) {
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(4.8, PITCH.halfZ * 2), stripeMat);
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(i * 5.4, 0.01, 0);
    scene.add(stripe);
  }

  const lineMat = new THREE.MeshBasicMaterial({ color: 0xf5f5f0 });
  const addLine = (w: number, d: number, x: number, z: number) => {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lineMat);
    line.rotation.x = -Math.PI / 2;
    line.position.set(x, 0.03, z);
    scene.add(line);
  };
  addLine(PITCH.halfX * 2, 0.12, 0, PITCH.halfZ);
  addLine(PITCH.halfX * 2, 0.12, 0, -PITCH.halfZ);
  addLine(0.12, PITCH.halfZ * 2, PITCH.halfX, 0);
  addLine(0.12, PITCH.halfZ * 2, -PITCH.halfX, 0);
  addLine(0.12, PITCH.halfZ * 2, 0, 0);
  const circle = new THREE.Mesh(new THREE.RingGeometry(3.6, 3.75, 32), lineMat);
  circle.rotation.x = -Math.PI / 2;
  circle.position.y = 0.03;
  scene.add(circle);

  for (const side of [-1, 1]) {
    const postMat = new THREE.MeshStandardMaterial({ color: 0xf4f4f4 });
    for (const z of [-PITCH.goalHalfZ, PITCH.goalHalfZ]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.2, 0.12), postMat);
      post.position.set(side * PITCH.goalX, 1.1, z);
      scene.add(post);
    }
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, PITCH.goalHalfZ * 2), postMat);
    bar.position.set(side * PITCH.goalX, 2.2, 0);
    scene.add(bar);
    const net = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 2.1, PITCH.goalHalfZ * 2),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.12,
      })
    );
    net.position.set(side * (PITCH.goalX + 0.85), 1.05, 0);
    scene.add(net);
  }

  for (const side of [-1, 1]) {
    for (const z of [-18, 0, 18]) {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x9aa3ad })
      );
      pole.position.set(side * 32, 4, z);
      const lamp = new THREE.Mesh(
        new THREE.SphereGeometry(0.55, 8, 8),
        new THREE.MeshStandardMaterial({
          color: 0xfff2c4,
          emissive: 0xffe08a,
          emissiveIntensity: 1.4,
        })
      );
      lamp.position.set(side * 32, 8.2, z);
      scene.add(pole, lamp);
    }
  }
}

export function createBall(THREE: Three): import("three").Mesh {
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(PITCH.ballRadius, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0xf4f4f4, roughness: 0.4 })
  );
  ball.castShadow = true;
  return ball;
}
