export type PlayGameId = "openworld" | "football";

export type PlayGameCard = {
  id: PlayGameId;
  href: `/${string}`;
  title: string;
  tagline: string;
  setting: string;
  howToPlay: string[];
};

/** Original demos generated from the Cinder Bay / Floodlight Eleven reverse prompts. */
export const PLAY_GAMES: PlayGameCard[] = [
  {
    id: "openworld",
    href: "/play/openworld",
    title: "Cinder Bay",
    tagline: "Sunbaked port-city crime sandbox. One district you can finish.",
    setting:
      "Cinder Bay. Neighborhoods: Iron Wharf, Ridge Hill, and Market Cut. You are hustler Jax Vane. Boost scooters, cheap hatches, and a parked coupe. Harbor Wardens keep the heat.",
    howToPlay: [
      "WASD move. Shift sprint. Space jump. C crouch. Mouse drag orbits the camera. Esc pauses.",
      "Mission 1: grab the bag on Iron Wharf (E) and drop it at Market Cut.",
      "Mission 2: shake the chasing Warden car. Open a gap or lose them around Ridge Hill.",
      "Mission 3: steal the parked coupe on Ridge Hill and bring it home to the Iron Wharf garage.",
      "E enters or exits vehicles (Sitting_Enter → Driving_Loop → Sitting_Exit). F punches. Touch buttons work on phones.",
    ],
  },
  {
    id: "football",
    href: "/play/football",
    title: "Floodlight Eleven",
    tagline: "Floodlit five-a-side with kickoff, shots, saves, and a final whistle.",
    setting:
      "Harbor Rovers (teal) versus Milltown Athletic (amber). Pick a kit on the start screen. You control that side's number 9. Broadcast camera follows the ball.",
    howToPlay: [
      "Start screen: pick Harbor Rovers or Milltown Athletic.",
      "WASD move. Shift sprint. F pass to a teammate. Space shoot at goal. C jumps for headers.",
      "Strikes play Interact (this kernel has no Kick clip). Headers use Jump_*. Keepers dive with Roll.",
      "Kickoff, play, goal, restart, then a whistle at 90 seconds or first to 3. R restarts. Esc pauses.",
    ],
  },
];

export function playGameById(id: PlayGameId): PlayGameCard {
  const game = PLAY_GAMES.find((item) => item.id === id);
  if (!game) throw new Error(`Unknown play game ${id}`);
  return game;
}

export const PLAY_FORBIDDEN_IP = [
  "gta",
  "grand theft auto",
  "san andreas",
  "grove street",
  "los santos",
  "carl johnson",
  "rockstar",
  "fifa",
  "ea sports",
  "ea fc",
  "fc 2025",
  "fc25",
  "ultimate team",
  "harborline",
  "cinder athletic",
  "rookhaven",
] as const;
