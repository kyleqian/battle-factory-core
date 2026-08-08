import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Live-verification fixture pair for AI_CV_Curse
// (`data/battle_ai_scripts.s:1870-1892`, EFFECT_CURSE). The handler splits on
// the AI user's OWN type: a Ghost-type user jumps straight to Curse4 (an
// HP>80 gate scoring 0, HP<=80 scoring -1, zero draws); a non-Ghost user
// falls into the three-DEF-band ladder whose three `if_random_less_than 128`
// sites each draw once and score +1 on a roll >= 128. Both carriers are real
// Level-50 Factory rentals from the frontier corpus:
//   - control: Snorlax (FRONTIER_MON_SNORLAX_2, pure Normal) -- the three-roll
//     ladder, every decision draws setup 4 + curse 3 + tie 1 = 8.
//   - reach:   Dusclops (FRONTIER_MON_DUSCLOPS_4, pure Ghost) -- the Curse4
//     HP gate, every decision draws setup 4 + tie 1 = 5.
// The pair differs ONLY in the AI user's species/typing; both get the same
// [Curse, Splash, Splash, Splash] moveset and the same Vaporeon target.

type Segment = Readonly<{ frames: number; buttons: readonly string[] }>;

const outputDir = process.argv[2] ?? "tools/battle-lab";
const seed = Number(process.argv[3] ?? 1);

function mash(repetitions: number): Segment[] {
  return Array.from({ length: repetitions }, () => [
    { frames: 2, buttons: ["A"] } as const,
    { frames: 18, buttons: [] } as const,
  ]).flat();
}

function scenario(aiUserSpecies: number) {
  const segments: Segment[] = [
    { frames: 2, buttons: ["A"] },
    { frames: 30, buttons: [] },
    ...mash(52),
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
          { species: 134, moves: [233, 233, 233, 233] },
          { species: 1, moves: [33, 33, 33, 33] },
          { species: 1, moves: [33, 33, 33, 33] },
        ],
        opponent: [
          { species: 129, level: 5, moves: [150, 150, 150, 150] },
          { species: aiUserSpecies, moves: [174, 150, 150, 150] },
          { species: 1, moves: [33, 33, 33, 33] },
        ],
      },
    },
    trace: { segments, captureFrames },
  };
}

mkdirSync(outputDir, { recursive: true });
for (const [role, aiUserSpecies] of [
  ["control", 143], // Snorlax (pure Normal) -- three-roll DEF ladder, 8 draws
  ["reach", 362],   // Dusclops (pure Ghost) -- Curse4 HP gate, 5 draws
] as const) {
  const path = join(outputDir, `mechanic-factory-ai-cv-curse-${role}-off.json`);
  writeFileSync(path, `${JSON.stringify(scenario(aiUserSpecies), null, 2)}\n`);
  console.log(path);
}
