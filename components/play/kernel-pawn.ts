import {
  AnimationMixer,
  LoopOnce,
  LoopRepeat,
  type AnimationAction,
  type Group,
  type Object3D,
  type Scene,
} from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { QUATERNIUS_STANDARD_PUBLIC_PATH } from "@/lib/quaternius-kernel";
import { KERNEL_FADE, LOCO_TO_CLIP, type LocoClip } from "@/lib/play/clips";

export type { LocoClip };
export { KERNEL_FADE, LOCO_TO_CLIP };

const LOOPING: ReadonlySet<LocoClip> = new Set([
  "idle",
  "walk",
  "jog",
  "sprint",
  "jumpLoop",
  "crouch",
  "crouchWalk",
  "drive",
  "sit",
  "talk",
  "dance",
]);

let kernelBuffer: ArrayBuffer | null = null;

/** Each call parses a fresh GLTF so mixers never share a skeleton. */
export async function loadKernelGltf(): Promise<GLTF> {
  const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
  const loader = new GLTFLoader();
  if (!kernelBuffer) {
    const res = await fetch(QUATERNIUS_STANDARD_PUBLIC_PATH);
    if (!res.ok) throw new Error(`Failed to load kernel (${res.status})`);
    kernelBuffer = await res.arrayBuffer();
  }
  return loader.parseAsync(kernelBuffer.slice(0), "/quaternius/");
}

export class KernelPawn {
  readonly group: Group;
  readonly mixer: AnimationMixer;
  private readonly actions = new Map<string, AnimationAction>();
  private current: LocoClip | null = null;

  constructor(
    THREE: typeof import("three"),
    gltf: GLTF,
    kit: { main: number; joints: number }
  ) {
    this.group = new THREE.Group();
    const model = gltf.scene as Object3D;
    model.traverse((obj) => {
      const mesh = obj as import("three").SkinnedMesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      const source = mesh.material;
      const list = Array.isArray(source) ? source : [source];
      const cloned = list.map((mat) => {
        const next = mat.clone();
        const std = next as import("three").MeshStandardMaterial;
        const name = (mat.name || "").toLowerCase();
        if ("color" in std && std.color) {
          if (name.includes("joint")) std.color.setHex(kit.joints);
          else std.color.setHex(kit.main);
        }
        return next;
      });
      mesh.material = cloned.length === 1 ? cloned[0]! : cloned;
    });
    this.group.add(model);
    const armature = model.getObjectByName("Armature") ?? model;
    this.mixer = new AnimationMixer(armature);
    const needed = new Set<string>(Object.values(LOCO_TO_CLIP));
    for (const clip of gltf.animations) {
      if (!needed.has(clip.name)) continue;
      this.actions.set(clip.name, this.mixer.clipAction(clip));
    }
  }

  static async spawn(
    THREE: typeof import("three"),
    kit: { main: number; joints: number }
  ): Promise<KernelPawn> {
    return new KernelPawn(THREE, await loadKernelGltf(), kit);
  }

  play(loco: LocoClip, fade = KERNEL_FADE): void {
    if (this.current === loco) return;
    const clipName = LOCO_TO_CLIP[loco];
    const next = this.actions.get(clipName);
    if (!next) return;
    const prev =
      this.current != null
        ? this.actions.get(LOCO_TO_CLIP[this.current])
        : undefined;
    if (prev && prev !== next) prev.fadeOut(fade);
    next.reset();
    next.setLoop(LOOPING.has(loco) ? LoopRepeat : LoopOnce, Infinity);
    next.clampWhenFinished = !LOOPING.has(loco);
    next.timeScale =
      loco === "jumpStart" || loco === "jumpLand" || loco === "interact" ? 1.35 : 1;
    next.enabled = true;
    next.setEffectiveWeight(1);
    next.fadeIn(this.current ? fade : 0).play();
    this.current = loco;
  }

  setPose(x: number, y: number, z: number, yaw: number): void {
    this.group.position.set(x, y, z);
    this.group.rotation.y = yaw;
  }

  update(dt: number): void {
    this.mixer.update(dt);
  }

  addTo(scene: Scene): void {
    scene.add(this.group);
  }

  dispose(): void {
    this.mixer.stopAllAction();
    this.group.removeFromParent();
  }
}
