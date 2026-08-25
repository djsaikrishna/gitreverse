/** Gameplay gait → Quaternius clip. A_TPose is bind pose only and is never mapped here. */
export const LOCO_TO_CLIP = {
  idle: "Idle_Loop",
  walk: "Walk_Loop",
  jog: "Jog_Fwd_Loop",
  sprint: "Sprint_Loop",
  jumpStart: "Jump_Start",
  jumpLoop: "Jump_Loop",
  jumpLand: "Jump_Land",
  crouch: "Crouch_Idle_Loop",
  crouchWalk: "Crouch_Fwd_Loop",
  drive: "Driving_Loop",
  sit: "Sitting_Idle_Loop",
  sitEnter: "Sitting_Enter",
  sitExit: "Sitting_Exit",
  interact: "Interact",
  talk: "Idle_Talking_Loop",
  punch: "Punch_Jab",
  punchCross: "Punch_Cross",
  roll: "Roll",
  hit: "Hit_Chest",
  dance: "Dance_Loop",
} as const;

export type LocoClip = keyof typeof LOCO_TO_CLIP;

export const KERNEL_FADE = 0.18;
