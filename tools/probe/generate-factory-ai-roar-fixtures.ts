import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Segment = Readonly<{ frames: number; buttons: readonly string[] }>;

const outputDir = process.argv[2] ?? "tools/battle-lab";

function mash(repetitions: number): Segment[] {
  return Array.from({ length: repetitions }, () => [
    { frames: 2, buttons: ["A"] } as const,
    { frames: 18, buttons: [] } as const,
  ]).flat();
}

function scenario(tailRepetitions: number) {
  const segments: Segment[] = [
    { frames: 2, buttons: ["A"] },
    { frames: 30, buttons: [] },
    ...mash(25),
    { frames: 2, buttons: ["DOWN"] },
    { frames: 10, buttons: [] },
    { frames: 2, buttons: ["A"] },
    { frames: 10, buttons: [] },
    { frames: 2, buttons: ["A"] },
    { frames: 300, buttons: [] },
    { frames: 2, buttons: ["A"] },
    { frames: 30, buttons: [] },
    { frames: 2, buttons: ["A"] },
    ...mash(30),
    { frames: 2, buttons: ["DOWN"] },
    { frames: 10, buttons: [] },
    { frames: 2, buttons: ["DOWN"] },
    { frames: 10, buttons: [] },
    { frames: 2, buttons: ["A"] },
    { frames: 10, buttons: [] },
    { frames: 2, buttons: ["A"] },
    { frames: 300, buttons: [] },
    { frames: 2, buttons: ["A"] },
    { frames: 30, buttons: [] },
    { frames: 2, buttons: ["A"] },
    ...mash(tailRepetitions),
  ];
  const totalFrames = segments.reduce((sum, segment) => sum + segment.frames, 0);
  const captureFrames = Array.from(
    { length: Math.floor(totalFrames / 20) + 1 },
    (_, index) => Math.min(index * 20, totalFrames - 1),
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
    seed: 1,
    overrides: {
      parties: {
        player: [
          { species: 241, moves: [153, 153, 153, 153] },
          { species: 241, moves: [153, 153, 153, 153] },
          { species: 200, moves: [233, 233, 233, 233] },
        ],
        opponent: [
          { species: 129, level: 5, moves: [113, 113, 113, 113] },
          { species: 362, moves: [46, 113, 113, 113] },
          { species: 1, moves: [33, 33, 33, 33] },
        ],
      },
    },
    trace: { segments, captureFrames },
  };
}

mkdirSync(outputDir, { recursive: true });
for (const [role, repetitions] of [["control", 20], ["reach", 60]] as const) {
  const path = join(outputDir, `mechanic-factory-ai-roar-${role}-off.json`);
  writeFileSync(path, `${JSON.stringify(scenario(repetitions), null, 2)}\n`);
  console.log(path);
}
