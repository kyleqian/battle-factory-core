import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Live-verification fixture pair for AI_CV_DragonDance
// (`data/battle_ai_scripts.s:2603-2614`, EFFECT_DRAGON_DANCE). The handler
// discriminates on `if_target_faster`: a target STRICTLY faster than the AI
// user jumps straight to AI_CV_DragonDance2's single `if_random_less_than 128`
// roll (+1 on a roll >= 128, 0 otherwise); a target that is NOT faster exits
// via the `if_hp_more_than AI_USER, 50` zero at full HP (no roll at all, score
// 0). The pair differs ONLY in the player-lead species' Speed (chosen at
// fixture build time -- no staged transient state at all): the same Gyarados
// AI user is either outsped by the target (reach) or outspeeds it (control).
// Both carriers are real Level-50 Factory rentals from the frontier corpus:
//   - AI user: Gyarados (FRONTIER_MON_GYARADOS_1, pure Intimidate).
//   - reach:   Crobat (base Speed 130 -- strictly faster than Gyarados).
//   - control: Shuckle (base Speed 5 -- strictly slower than Gyarados).
// Both targets are single-ability species, so AI_CheckBadMove's per-slot
// soundproof ability guess never draws.

type Segment = Readonly<{ frames: number; buttons: readonly string[] }>;

const outputDir = process.argv[2] ?? "tools/battle-lab";
const seed = Number(process.argv[3] ?? 1);

function mash(repetitions: number): Segment[] {
  return Array.from({ length: repetitions }, () => [
    { frames: 2, buttons: ["A"] } as const,
    { frames: 18, buttons: [] } as const,
  ]).flat();
}

function scenario(playerLead: number) {
  const segments: Segment[] = [
    { frames: 2, buttons: ["A"] },
    { frames: 30, buttons: [] },
    ...mash(96),
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
          { species: playerLead, moves: [233, 233, 233, 233] },
          { species: 1, moves: [33, 33, 33, 33] },
          { species: 1, moves: [33, 33, 33, 33] },
        ],
        opponent: [
          { species: 129, level: 5, moves: [150, 150, 150, 150] },
          { species: 130, moves: [349, 150, 150, 150] },
          { species: 1, moves: [33, 33, 33, 33] },
        ],
      },
    },
    trace: { segments, captureFrames },
  };
}

mkdirSync(outputDir, { recursive: true });
for (const [role, playerLead] of [
  ["control", 213], // Shuckle (Speed 5) -- target NOT faster: HP>50 exits, zero rolls
  ["reach", 169],   // Crobat (Speed 130) -- target faster: DragonDance2's <128 roll
] as const) {
  const path = join(outputDir, `mechanic-factory-ai-cv-dragondance-${role}-off.json`);
  writeFileSync(path, `${JSON.stringify(scenario(playerLead), null, 2)}\n`);
  console.log(path);
}
