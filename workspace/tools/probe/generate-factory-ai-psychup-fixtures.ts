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

// Once the relay is gone, keep advancing the real battle UI while periodically
// steering the move cursor back to slot 0.  This lets the first scored
// Psych Up decision happen before the player's next non-damaging setup move.
// The controller cadence is deliberately input-only; it does not stage any
// transient battle state or choose the opponent's move.
function postRelay(repetitions: number): Segment[] {
  return Array.from({ length: repetitions }, (_, index) => [
    {
      frames: 2,
      buttons: index % 5 === 1
        ? ["A"]
        : index % 5 === 2
          ? ["UP"]
          : index % 5 === 3
            ? ["A"]
            : [],
    } as const,
    { frames: 18, buttons: [] } as const,
  ]).flat();
}

function scenario(role: "control" | "reach") {
  // Swords Dance takes longer to return to the command menu than Focus
  // Energy, so the two legal twins use the same two-setup/Slash lifecycle
  // with only the UI settling count differing.
  const setupMoves = role === "reach"
    ? [14, 14, 163, 163] // Swords Dance, Swords Dance, Slash, Slash
    : [116, 116, 163, 163]; // Focus Energy, Focus Energy, Slash, Slash
  const setupMash = role === "reach" ? 46 : 36;
  const segments: Segment[] = [
    { frames: 2, buttons: ["A"] },
    { frames: 30, buttons: [] },
    ...mash(setupMash),
    // Move menu is a 2x2 grid: DOWN moves from Slash's slot 0 to slot 2.
    { frames: 2, buttons: ["DOWN"] },
    { frames: 18, buttons: [] },
    { frames: 2, buttons: ["A"] },
    ...postRelay(100),
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
          { species: 212, moves: setupMoves },
          { species: 1, moves: [33, 33, 33, 33] },
          { species: 1, moves: [33, 33, 33, 33] },
        ],
        opponent: [
          { species: 129, level: 5, moves: [150, 150, 150, 150] },
          // Golduck learns Scratch at level 1 and Psych Up at level 31.
          // Scratch x3 keeps every other slot source-legal and score-neutral
          // while leaving one genuine Psych Up candidate.
          { species: 55, moves: [244, 10, 10, 10] },
          { species: 1, moves: [33, 33, 33, 33] },
        ],
      },
    },
    trace: { segments, captureFrames },
  };
}

mkdirSync(outputDir, { recursive: true });
for (const role of ["control", "reach"] as const) {
  const path = join(outputDir, `mechanic-factory-ai-cv-psychup-${role}-off.json`);
  writeFileSync(path, `${JSON.stringify(scenario(role), null, 2)}\n`);
  console.log(path);
}
