import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Segment = Readonly<{ frames: number; buttons: readonly string[] }>;

const args = new Map<string, string>();
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index]!, process.argv[index + 1]!);
}

const outputDir = args.get("--out-dir") ?? "tools/battle-lab";
const controlReps = Number(args.get("--control-reps") ?? 70);
const reachReps = Number(args.get("--reach-reps") ?? 125);
if (![controlReps, reachReps].every(Number.isSafeInteger)) {
  throw new Error("mash repetition counts must be integers");
}

function mash(repetitions: number): Segment[] {
  return Array.from({ length: repetitions }, () => [
    { frames: 2, buttons: ["A"] } as const,
    { frames: 18, buttons: [] } as const,
  ]).flat();
}

function scenario(repetitions: number) {
  const segments: Segment[] = [
    { frames: 2, buttons: ["A"] },
    { frames: 30, buttons: [] },
    ...mash(repetitions),
  ];
  const totalFrames = segments.reduce((sum, segment) => sum + segment.frames, 0);
  const captureFrames = Array.from(
    { length: Math.floor(totalFrames / 100) + 1 },
    (_, index) => Math.min(index * 100, totalFrames - 1),
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
          { species: 241, moves: [233, 233, 233, 233] },
          { species: 1, moves: [33, 33, 33, 33] },
          { species: 1, moves: [33, 33, 33, 33] },
        ],
        opponent: [
          { species: 129, level: 5, moves: [113, 113, 113, 113] },
          { species: 362, moves: [133, 113, 113, 113] },
          { species: 1, moves: [33, 33, 33, 33] },
        ],
      },
    },
    trace: { segments, captureFrames },
  };
}

mkdirSync(outputDir, { recursive: true });
for (const [role, repetitions] of [["control", controlReps], ["reach", reachReps]] as const) {
  const path = join(outputDir, `mechanic-factory-ai-cbm-spdefup-${role}-off.json`);
  writeFileSync(path, `${JSON.stringify(scenario(repetitions), null, 2)}\n`);
  console.log(`${path}: ${repetitions} mash reps`);
}
