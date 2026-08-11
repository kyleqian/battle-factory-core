import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

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
          { species: playerLead, moves: [233, 233, 233, 233] },
          { species: 1, moves: [33, 33, 33, 33] },
          { species: 1, moves: [33, 33, 33, 33] },
        ],
        opponent: [
          { species: 129, level: 5, moves: [150, 150, 150, 150] },
          { species: 136, moves: [315, 150, 150, 150] },
          { species: 1, moves: [33, 33, 33, 33] },
        ],
      },
    },
    trace: { segments, captureFrames },
  };
}

mkdirSync(outputDir, { recursive: true });
for (const [role, playerLead] of [
  ["control", 113], // Chansey (Normal) -- Fire is neutral: both effectiveness gates fall through
  ["reach", 134],   // Vaporeon (Water) -- Fire is x0.5: jumps straight to ScoreDown1
] as const) {
  const path = join(outputDir, `mechanic-factory-ai-cv-overheat-${role}-off.json`);
  writeFileSync(path, `${JSON.stringify(scenario(playerLead), null, 2)}\n`);
  console.log(path);
}
