import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Generator for the AI_CV_BrickBreak reach/control fixture pair.
//
// The handler's single gate is target-side Reflect (battle_ai_scripts.s:2457).
// The target side is battler 0 -- the player's own side -- so the PLAYER must
// stage Reflect with a real move. The AI is the fast lead (Alakazam, base
// speed 120 > Vaporeon's 65) so that on turn 1 the AI moves BEFORE the
// player's Reflect lands; a turn-1 BrickBreak therefore never breaks the
// screen the player sets later that same turn. Turn 2's AI decision then sees
// target-side Reflect up (reach); turn 1's sees it clear (control).
//
//   control fixture: player Vaporeon [Splash x4]  -- Reflect never goes up
//   reach   fixture: player Vaporeon [Reflect x4] -- Reflect up by turn 2

type Segment = Readonly<{ frames: number; buttons: readonly string[] }>;

const outputDir = process.argv[2] ?? "tools/battle-lab";
const seed = Number(process.argv[3] ?? 1);

function mash(repetitions: number): Segment[] {
  return Array.from({ length: repetitions }, () => [
    { frames: 2, buttons: ["A"] } as const,
    { frames: 18, buttons: [] } as const,
  ]).flat();
}

function scenario(playerMove: number) {
  const segments: Segment[] = [
    { frames: 2, buttons: ["A"] },
    { frames: 30, buttons: [] },
    ...mash(60),
  ];
  const totalFrames = segments.reduce((sum, segment) => sum + segment.frames, 0);
  const captureFrames = Array.from(
    { length: Math.floor(totalFrames / 50) + 1 },
    (_, index) => Math.min(index * 50, totalFrames - 1),
  );
  if (captureFrames.at(-1) !== totalFrames - 1) captureFrames.push(totalFrames - 1);

  return {
    schemaVersion: 1,
    mode: "mechanicLab",
    profile: "battle-scene-off",
    level: 50,
    challengeNum: 7,
    battleNum: 1,
    trainerId: 222,
    playerSetIds: [659, 675, 402],
    opponentSetIds: [460, 648, 540],
    seed,
    overrides: {
      parties: {
        player: [
          { species: 134, moves: [playerMove, playerMove, playerMove, playerMove] },
          { species: 1, moves: [33, 33, 33, 33] },
          { species: 1, moves: [33, 33, 33, 33] },
        ],
        opponent: [
          { species: 65, moves: [280, 150, 150, 150] },
          { species: 1, moves: [33, 33, 33, 33] },
          { species: 1, moves: [33, 33, 33, 33] },
        ],
      },
    },
    trace: { segments, captureFrames },
  };
}

mkdirSync(outputDir, { recursive: true });
for (const [role, playerMove] of [
  ["control", 150], // MOVE_SPLASH -- target side never gets Reflect
  ["reach", 115], // MOVE_REFLECT -- target side Reflect up from turn 2
] as const) {
  const path = join(outputDir, `mechanic-factory-ai-cv-brickbreak-${role}-off.json`);
  writeFileSync(path, `${JSON.stringify(scenario(playerMove), null, 2)}\n`);
  console.log(path);
}
