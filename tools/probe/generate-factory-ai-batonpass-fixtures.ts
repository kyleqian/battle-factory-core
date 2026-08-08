import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Button = "A" | "RIGHT";
type Segment = Readonly<{ frames: number; buttons: readonly Button[] }>;
type ControllerEvent = Readonly<{ frame: number; buttons: readonly Button[] }>;

const outputDir = process.argv[2] ?? "tools/battle-lab";
const seed = Number(process.argv[3] ?? 3);

/**
 * Exact input edges reconstructed from the committed Psych Up fixture's
 * two-frame press / explicit settle cadence. They acknowledge the relay's
 * faint/switch text, select Seismic Toss twice, then move once to the status
 * slot and confirm it. There is intentionally no broad A mash or player-menu
 * input after the status move: the following AI window is the receipt.
 */
const CONTROLLER_EVENTS = [
  { frame: 0, buttons: ["A"] },
  { frame: 32, buttons: ["A"] },
  { frame: 212, buttons: ["A"] },
  { frame: 320, buttons: ["A"] },
  { frame: 620, buttons: ["A"] },
  { frame: 680, buttons: ["A"] },
  { frame: 1200, buttons: ["A"] },
  { frame: 1260, buttons: ["A"] },
  { frame: 1800, buttons: ["A"] },
  { frame: 1860, buttons: ["RIGHT"] },
  { frame: 1880, buttons: ["A"] },
  // These are message acknowledgements only. The player has already selected
  // Swagger/Confuse Ray, so the next scored decision requires no second menu.
  { frame: 2600, buttons: ["A"] },
  { frame: 2660, buttons: ["A"] },
] as const satisfies readonly ControllerEvent[];

function explicitControllerTimeline(events: readonly ControllerEvent[], finalFrame = 3300): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;
  for (const event of events) {
    if (event.frame < cursor) throw new Error(`controller event ${event.frame} precedes ${cursor}`);
    if (event.frame > cursor) segments.push({ frames: event.frame - cursor, buttons: [] });
    segments.push({ frames: 2, buttons: event.buttons });
    cursor = event.frame + 2;
  }
  if (finalFrame <= cursor) throw new Error(`final frame ${finalFrame} must exceed ${cursor}`);
  segments.push({ frames: finalFrame - cursor, buttons: [] });
  return segments;
}

function scenario(role: "reach" | "control") {
  const statusMove = role === "reach" ? 207 : 109; // Swagger / Confuse Ray
  const segments = explicitControllerTimeline(CONTROLLER_EVENTS);
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
          // Machoke's real level-up Seismic Toss produces 50 damage at level
          // 50. Swagger reaches Aipom's single Attack stage 8; Confuse Ray is
          // the real-action control and leaves every Aipom stat neutral.
          { species: 67, moves: [69, statusMove, 10, 10] },
          { species: 1, moves: [33, 33, 33, 33] },
          { species: 1, moves: [33, 33, 33, 33] },
        ],
        opponent: [
          { species: 129, level: 5, moves: [150, 150, 150, 150] },
          // Aipom learns both Scratch and Baton Pass; its one genuine
          // Baton Pass slot is scored by the production Factory AI.
          { species: 190, moves: [226, 10, 10, 10] },
          { species: 1, moves: [33, 33, 33, 33] },
        ],
      },
    },
    trace: { segments, captureFrames },
  };
}

mkdirSync(outputDir, { recursive: true });
for (const role of ["reach", "control"] as const) {
  const path = join(outputDir, `mechanic-factory-ai-cv-batonpass-${role}-off.json`);
  writeFileSync(path, `${JSON.stringify(scenario(role), null, 2)}\n`);
  console.log(path);
}
