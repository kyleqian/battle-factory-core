// Disposable: bisect window-1 (attacker shake/tint) and window-2 (target
// shake/scale) lag offsets against an already-populated scratch dir (no
// re-invoking mgba). Usage:
//   npx tsx tools/compare/scratch/confusion-lag-bisect.ts <scratchDir>
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  confusionAttackerEffectAtAge,
  confusionTargetEffectAtAge,
  confusionBgBldyAtAge,
  confusionBgIsPsychic,
  confusionBgPaletteRowAtAge,
} from "../../../src/engine/confusion.ts";

const scratch = process.argv[2]!;
const probe = JSON.parse(readFileSync(join(scratch, "probe.json"), "utf8")) as {
  frames: { frame: number; playerSprite: { x2: number; matrix: { a: number; d: number } }; opponentSprite: { x2: number; matrix: { a: number; d: number } } }[];
};
const byFrame = new Map(probe.frames.map((f) => [f.frame, f]));

console.log("--- window1 (attacker) x2 bisect ---");
for (const shakeShift of [-1, 0, 1]) {
  const results: string[] = [];
  for (const frame of [118, 119, 120, 121, 122, 136]) {
    const age = frame - 81;
    const oracleX2 = byFrame.get(frame)!.playerSprite.x2;
    const local = age - 37;
    const mine = confusionAttackerEffectAtAge(age + shakeShift).attackerX2;
    results.push(`f${frame}:oracle=${oracleX2},mine=${mine}${oracleX2 === mine ? "" : " MISMATCH"}`);
  }
  console.log(`shakeShift=${shakeShift}:`, results.join(" "));
}

console.log("--- window2 (target) x2 bisect ---");
for (const shakeShift of [-1, 0, 1]) {
  const results: string[] = [];
  for (const frame of [146, 147, 148, 149, 150, 151, 174, 175]) {
    const oracleX2 = byFrame.get(frame)!.opponentSprite.x2;
    const age = frame - 81;
    const mine = confusionTargetEffectAtAge(age + shakeShift).targetX2;
    results.push(`f${frame}:oracle=${oracleX2},mine=${mine}${oracleX2 === mine ? "" : " MISMATCH"}`);
  }
  console.log(`shakeShift=${shakeShift}:`, results.join(" "));
}

console.log("--- window2 (target) scale (matrix a) bisect ---");
for (const scaleShift of [-2, -1, 0, 1]) {
  const results: string[] = [];
  for (const frame of [146, 147, 148, 149, 150, 160, 175]) {
    const oracleA = byFrame.get(frame)!.opponentSprite.matrix.a;
    const age = frame - 81;
    const mine = confusionTargetEffectAtAge(age + scaleShift).targetScale.xScale;
    results.push(`f${frame}:oracle=${oracleA},mine=${mine}${oracleA === mine ? "" : " MISMATCH"}`);
  }
  console.log(`scaleShift=${scaleShift}:`, results.join(" "));
}
