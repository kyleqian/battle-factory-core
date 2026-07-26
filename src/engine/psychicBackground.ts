// Shared `SetPsychicBackground`/`UnsetPsychicBackground` plumbing
// (`battle_anim_effects_3.c:1372-1396`) reused by every `blend_color_cycle`
// group-A sibling that calls it (`MOVE_FUTURE_SIGHT`, `MOVE_CONFUSION` -
// `futureSight.ts`'s own module doc has the full RAM-probed derivation of
// the shape below). Each move anchors its own age-0 at its own
// `fadetobg BG_PSYCHIC` creation tick and RAM-probes its own fade-2/
// rotation-pause start ages, since those depend on how long that move's
// own attacker/target task composition takes before `call
// UnsetPsychicBackground` - only the RAMP SHAPE and RING mechanics
// (confirmed byte-identical between the two ported siblings) are shared,
// not the absolute ages.
import type { RgbColor } from "./bg.ts";

export const PSYCHIC_BG_ROTATION_RING_SIZE = 11;
export const PSYCHIC_BG_ROTATION_FIRST_APPLIED_AGE = 21;
export const PSYCHIC_BG_ROTATION_INTERVAL = 4;

/** One up-hold-down `REG_BLDY` triangle, `localAge` relative to the fade's own start (value 0 there). */
export function psychicBgFadeRampAtLocalAge(
  localAge: number,
  rampUpEndAge: number,
  holdEndAge: number,
  rampDownEndAge: number,
): number {
  if (localAge < 0) return 0;
  if (localAge <= rampUpEndAge) return localAge;
  if (localAge <= holdEndAge) return 16;
  if (localAge <= rampDownEndAge) return Math.max(0, rampDownEndAge - localAge);
  return 0;
}

/**
 * `SetPsychicBackground_Step`'s own rotate-right-by-1 step count at `age`,
 * `PSYCHIC_BG_ROTATION_INTERVAL`-tick cadence from
 * `PSYCHIC_BG_ROTATION_FIRST_APPLIED_AGE`, with a single RAM-probed pause
 * (`pauseExtraTicks` extra ticks) at `pauseBreakpointAge` - the rung-6
 * MOVE_FUTURE_SIGHT finding (a whole-cadence hold spanning the gap between
 * the attacker/target task composition's own `blendoff` and
 * `UnsetPsychicBackground`'s own fade setup). Both group-A siblings ported
 * so far confirm the SAME mechanism (a single +2-tick pause landing on
 * whichever scheduled step falls inside that move's own blendoff gap) with
 * different per-move breakpoint ages, since the gap's position depends on
 * how long that move's own task composition runs.
 */
export function psychicBgRotationCountAtAge(
  age: number,
  pauseBreakpointAge: number,
  pauseExtraTicks: number,
): number {
  if (age < PSYCHIC_BG_ROTATION_FIRST_APPLIED_AGE) return 0;
  const effectiveAge = age < pauseBreakpointAge ? age : age - pauseExtraTicks;
  return (
    Math.floor(
      (effectiveAge - PSYCHIC_BG_ROTATION_FIRST_APPLIED_AGE)
        / PSYCHIC_BG_ROTATION_INTERVAL,
    ) + 1
  );
}

/** BG palette 2's entries 1-11 rotated right by `rotationCount` (mod the 11-entry ring). */
export function psychicBgPaletteRowAtAge(
  basePalette: readonly Readonly<RgbColor>[],
  rotationCount: number,
): Readonly<RgbColor>[] {
  const n = rotationCount % PSYCHIC_BG_ROTATION_RING_SIZE;
  if (n === 0) return basePalette.slice();
  const ring = basePalette.slice(1, 1 + PSYCHIC_BG_ROTATION_RING_SIZE);
  const rotated = ring
    .slice(PSYCHIC_BG_ROTATION_RING_SIZE - n)
    .concat(ring.slice(0, PSYCHIC_BG_ROTATION_RING_SIZE - n));
  return [basePalette[0]!, ...rotated, ...basePalette.slice(1 + PSYCHIC_BG_ROTATION_RING_SIZE)];
}
