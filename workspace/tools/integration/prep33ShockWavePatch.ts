/**
 * prep33: the proposed src change for MOVE_SHOCK_WAVE, applied to a COPY of src/animation/shockWave.ts (src is never edited).
 *   1. shockWaveTimingFor derives the timing from the live geometry (attacker Y_PIC_OFFSET -> progressing-bolt destroy row; target
 *      BATTLER_COORD_Y -> lightning count) instead of the two hard-coded side tables; the tables stay as the fallback for side-only callers.
 *   2. shockWaveSourceAtAge takes the derived shakeStart instead of inferring it from `lightningStart === 153`.
 * usage: npx vite-node tools/integration/prep33ShockWavePatch.ts <out.ts>   (writes the patched copy; prints the unified-diff line count)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "../..");
export function patchedShockWaveSource(): string {
  let s = readFileSync(resolve(root, "src/animation/shockWave.ts"), "utf8");
  const swap = (from: string, to: string) => { if (!s.includes(from)) throw new Error(`patch anchor missing: ${from.slice(0, 60)}`); s = s.replace(from, to); };
  swap(`from "./gbaObjCompositor.ts"`, `from ${JSON.stringify(resolve(root, "src/animation/gbaObjCompositor.ts"))}`);
  swap(`export function shockWaveTimingFor(input: Readonly<Pick<ShockWaveLiveInputs, "attackerSide">>): ShockWaveTiming {
  return input.attackerSide === "player" ? PLAYER_TIMING : OPPONENT_TIMING;
}`, `export function shockWaveTimingFor(input: Readonly<Pick<ShockWaveLiveInputs, "attackerSide">> & Partial<Pick<ShockWaveLiveInputs, "attackerPictureOrigin" | "targetPictureOrigin" | "targetBattlePosition">>): ShockWaveTiming {
  if (!input.attackerPictureOrigin || !input.targetPictureOrigin || !input.targetBattlePosition) return input.attackerSide === "player" ? PLAYER_TIMING : OPPONENT_TIMING;
  // AnimTask_ShockWaveProgressingBolt from row 77 to its destroy row (live bolt count 0 in state 3); the lightning task is the next row.
  const s = [1, 0, 0, 0, 7, -1, input.attackerPictureOrigin.x, input.attackerPictureOrigin.y, 4, truncDiv(input.targetPictureOrigin.x - input.attackerPictureOrigin.x, 5), 0, 12];
  const live: number[] = [];
  let progressEnd = -1;
  for (let age = PROGRESSING_START; progressEnd < 0; age += 1) {
    for (let index = live.length - 1; index >= 0; index -= 1) if (age - live[index]! > 12) { live.splice(index, 1); s[3] -= 1; }
    if (s[0] === 1) {
      s[1] = 0; live.push(age); s[3] += 1;
      if ((s[5]! < 0 && s[7]! <= s[8]!) || (s[5]! > 0 && s[7]! >= s[8]!)) { s[2] += 1; s[0] = s[2] === 5 ? 3 : 2; } else s[7] += s[5]! * 8;
      if (s[11]) s[11] -= 1;
    } else if (s[0] === 2) {
      if (s[11]) s[11] -= 1;
      if (++s[1]! > 4) { s[1] = 0; if ((s[2]! & 1) !== 0) { s[7] = 4; s[8] = 68; s[5] = 1; } else { s[7] = 68; s[8] = 4; s[5] = -1; } s[0] = s[11] ? 4 : 1; }
    } else if (s[0] === 4) { if (s[11]) s[11] -= 1; else s[0] = 1; }
    else if (s[0] === 3 && s[3] === 0) progressEnd = age;
  }
  // AnimTask_ShockWaveLightning: one bolt every 2 rows from (BATTLER_COORD_Y + 32) reduced below 17 up to that bound; each lives 30 rows.
  const bound = input.targetBattlePosition.y + 32;
  let y = bound, count = 1;
  while (y > 16) y -= 32;
  while (y < bound) { y += 32; count += 1; }
  const lightningStart = progressEnd + 1, shakeStart = lightningStart + 2 * count + 30, clearStart = shakeStart + 67;
  return { lightningStart, shakeStart, clearStart, cleanupAge: clearStart + 4 };
}`);
  swap(`export function shockWaveSourceAtAge(age: number, lightningStart: number = PLAYER_TIMING.lightningStart): ShockWaveSourceCursor {
  assertAge(age);
  const shakeStart = lightningStart + (lightningStart === OPPONENT_TIMING.lightningStart ? 38 : 36);`, `export function shockWaveSourceAtAge(age: number, lightningStart: number = PLAYER_TIMING.lightningStart, derivedShakeStart?: number): ShockWaveSourceCursor {
  assertAge(age);
  const shakeStart = derivedShakeStart ?? lightningStart + (lightningStart === OPPONENT_TIMING.lightningStart ? 38 : 36);`);
  swap(`source = shockWaveSourceAtAge(age, timing.lightningStart), active`, `source = shockWaveSourceAtAge(age, timing.lightningStart, timing.shakeStart), active`);
  return s;
}
if (process.argv[2]) { writeFileSync(process.argv[2], patchedShockWaveSource()); console.log(`patched copy -> ${process.argv[2]}`); }
