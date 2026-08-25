import {
  AnimationMixer,
  Group,
  LoopOnce,
  LoopRepeat,
  type AnimationAction,
  type AnimationClip,
  type Bone,
  type Object3D,
  type Scene,
  type SkinnedMesh,
} from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
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

/** Each spawn parses a fresh GLB so mixers never share a skeleton or clip. */
export async function loadKernelGltf(): Promise<GLTF> {
  const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
  if (!kernelBuffer) {
    const res = await fetch(QUATERNIUS_STANDARD_PUBLIC_PATH);
    if (!res.ok) throw new Error(`Failed to load kernel (${res.status})`);
    kernelBuffer = await res.arrayBuffer();
  }
  return new GLTFLoader().parseAsync(kernelBuffer.slice(0), "/quaternius/");
}

export function cloneKernelGraph(gltf: GLTF): { scene: Object3D; clips: AnimationClip[] } {
  const scene = cloneSkinned(gltf.scene);
  scene.traverse((obj) => {
    const mesh = obj as SkinnedMesh;
    if (!mesh.isSkinnedMesh) return;
    mesh.geometry = mesh.geometry.clone();
    mesh.bind(mesh.skeleton, mesh.bindMatrix);
    mesh.frustumCulled = false;
  });
  return {
    scene,
    clips: gltf.animations.map((clip) => clip.clone()),
  };
}

export class KernelPawn {
  readonly group: Group;
  readonly mixer: AnimationMixer;
  private readonly actions = new Map<string, AnimationAction>();
  private current: LocoClip | null = null;

  constructor(
    _THREE: typeof import("three"),
    gltf: GLTF,
    kit: { main: number; joints: number }
  ) {
    this.group = new Group();
    const model = gltf.scene;
    model.traverse((obj) => {
      const mesh = obj as SkinnedMesh;
      if (mesh.isSkinnedMesh) {
        mesh.geometry = mesh.geometry.clone();
        mesh.bind(mesh.skeleton, mesh.bindMatrix);
        mesh.frustumCulled = false;
      }
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
      if (mesh.isSkinnedMesh) mesh.bind(mesh.skeleton, mesh.bindMatrix);
    });
    this.group.add(model);
    this.mixer = new AnimationMixer(model);
    const needed = new Set<string>(Object.values(LOCO_TO_CLIP));
    for (const clip of gltf.animations) {
      if (!needed.has(clip.name)) continue;
      this.actions.set(clip.name, this.mixer.clipAction(clip.clone()));
    }
  }

  static async spawn(
    THREE: typeof import("three"),
    kit: { main: number; joints: number }
  ): Promise<KernelPawn> {
    return new KernelPawn(THREE, await loadKernelGltf(), kit);
  }

  get clipName(): string {
    return this.current ? LOCO_TO_CLIP[this.current] : "A_TPose";
  }

  get actionTime(): number {
    if (!this.current) return 0;
    return this.actions.get(LOCO_TO_CLIP[this.current])?.time ?? 0;
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
    next.paused = false;
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
    if (this.current && LOOPING.has(this.current)) {
      const action = this.actions.get(LOCO_TO_CLIP[this.current]);
      if (action) {
        action.paused = false;
        action.enabled = true;
        action.clampWhenFinished = false;
        action.setLoop(LoopRepeat, Infinity);
        if (action.getEffectiveWeight() < 0.5) action.setEffectiveWeight(1);
      }
    }
    this.mixer.update(dt);
  }

  bones(): Bone[] {
    const out: Bone[] = [];
    this.group.traverse((obj) => {
      const bone = obj as Bone;
      if (bone.isBone) out.push(bone);
    });
    return out;
  }

  /** Copy local bone TRS from another pawn. Used to verify clone skinning. */
  copyBonesFrom(source: KernelPawn): void {
    const src = new Map(source.bones().map((bone) => [bone.name, bone]));
    for (const bone of this.bones()) {
      const from = src.get(bone.name);
      if (!from) continue;
      bone.position.copy(from.position);
      bone.quaternion.copy(from.quaternion);
      bone.scale.copy(from.scale);
    }
  }

  dispose(): void {
    this.mixer.stopAllAction();
    this.group.removeFromParent();
  }
}
