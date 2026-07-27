// MOVE_FUTURE_SIGHT's own animation body (`FutureSight`,
// `battle_anim_scripts.s:4753-4767`, the `blend_color_cycle` group-A
// sibling closest to already-`exact` MOVE_GROWTH): `monbg ANIM_ATK_PARTNER`,
// `call SetPsychicBackground`, `setalpha 8, 8`, `blend_color_cycle` (attacker,
// delay=0, numBlends=2, 0->8, WHITE - identical argv to GROWTH's own),
// `createvisualtask AnimTask_ScaleMonAndRestore, 5, -4, -4, 15, ANIM_ATTACKER,
// 1` (already-proven `scaleMonAndRestoreAtAge` from `src/animation/bind.ts`),
// `clearmonbg`/`blendoff`, then (after the shared `FutureSightContinue` tail)
// `call UnsetPsychicBackground`. Unlike CONFUSION/PSYCHIC, FUTURE_SIGHT never
// touches the target at all - no `AnimTask_ShakeMon`/`AnimTask_ShakeMon2`, so
// this move's whole animation is attacker-self plus a background swap.
//
// The genuinely new mechanism this move needs (per the `blend_color_cycle`
// family map) is `SetPsychicBackground`/`UnsetPsychicBackground`'s own
// `AnimTask_SetPsychicBackground` (`battle_anim_effects_3.c:1372-1396`): a
// BG-palette-2 11-entry ring rotation (`GetBattleBgPaletteNum()` returns the
// constant 2 outside Contests, `battle_anim_mons.c:1024-1029` - no runtime
// dependency), one rotate-right step every 4 ticks, plus the two ordinary
// `fadetobg`/`restorebg` black-cover transitions (already-proven generic
// mechanism, e.g. MOVE_EXTREME_SPEED) that bracket it.
//
// RAM-probed directly (`tools/probe/dump-future-sight-psychicbg.py` against
// `tools/battle-lab/mechanic-future-sight-kadabra-onix.json`, ticks 60-200):
// with age 0 defined as the tick `fadetobg BG_PSYCHIC`'s own fade-out begins
// (oracle tick 77 in that fixture), REG_BLDY ramps 0->16 over ages 0-16,
// holds at 16 through age 19, the new BG loads and its rotation task starts
// under this full black cover (first rotated palette row observed at age
// 21, then every 4 ages), and REG_BLDY ramps back 16->0 over ages 20-35
// (value = 35-age), revealing BG_PSYCHIC. The attacker's own
// blend_color_cycle/ScaleMonAndRestore pair starts at age 37 (oracle tick
// 114). `UnsetPsychicBackground`'s own restorebg/fade pair starts ramping
// REG_BLDY 0->16 over ages 73-89, holds at 16 through age 93 -
// `gPlttBufferFaded`'s BG palette 2 row is already back to its pre-move
// default under this second black cover by age 92, confirming `restorebg`
// swaps the palette/tilemap reference before the visual fade, not after -
// and ramps back down 16->0 over ages 94-109 (value = 109-age), revealing
// the restored default battle background. The two holds are NOT symmetric
// (4 ticks for the first, 5 for the second) - RAM-probed, not assumed.
import {
  blendColorCycleObjYAtAge,
  type BlendColorCycleTiming,
} from "./blendColorCycle.ts";
import {
  scaleMonAndRestoreAtAge,
  type ScaleMonAndRestoreParameters,
} from "./bind.ts";
import {
  psychicBgFadeRampAtLocalAge,
  psychicBgRotationCountAtAge,
  psychicBgPaletteRowAtAge,
} from "./psychicBackground.ts";
import type { RgbColor } from "../engine/bg.ts";

export const FUTURE_SIGHT_BLEND_TIMING: Readonly<BlendColorCycleTiming> =
  Object.freeze({
    legs: [
      Object.freeze({ startY: 0, targetY: 8 }),
      Object.freeze({ startY: 8, targetY: 0 }),
    ],
    deltaY: 2,
  });

export const FUTURE_SIGHT_SCALE_PARAMS: Readonly<ScaleMonAndRestoreParameters> =
  Object.freeze({ xDelta: -4, yDelta: -4, duration: 15 });

/** Ticks since `fadetobg BG_PSYCHIC`'s own creation tick (oracle tick 77 in the RAM-probed fixture). */
export const FUTURE_SIGHT_ATTACKER_EFFECT_START_AGE = 37;

const FADE_1_RAMPUP_END_AGE = 16;
const FADE_1_HOLD_END_AGE = 19;
const FADE_1_RAMPDOWN_END_AGE = 35;
const FADE_2_RAMPUP_START_AGE = 73;
const FADE_2_RAMPUP_END_AGE = 89;
const FADE_2_HOLD_END_AGE = 93;
const FADE_2_RAMPDOWN_END_AGE = 109;

// RAM-probed (tools/probe/run-battle-lab-rgb.py's own `bgPalette2Faded`
// dump, re-run rung 6 against the same fixture, ages = frame-77): the
// rotation ring steps cleanly every 4 ages from 21 through 65 (12 steps),
// then holds for 6 ages instead of 4 (65->71, not 65->69) - exactly
// spanning the gap between the attacker blend_color_cycle/ScaleMonAndRestore
// pair's own `blendoff` (REG_BLDCNT/REG_BLDALPHA both read 0 ages 67-72) and
// `UnsetPsychicBackground`'s own fade setup (REG_BLDCNT reads 0xe8 again
// starting age 73, the same tick `futureSightBgBldyAtAge`'s second ramp-up
// already starts unlagged) - then resumes its clean 4-age cadence
// permanently shifted +2 (71, 75, 79, 83, 87, 91, ...). REG_BLDY's own
// ramp is untouched by this pause (RAM-exact against the existing formula
// through the whole window), so this is a rotation-cadence-only defect, not
// a darken-register one. `MOVE_CONFUSION` (`confusion.ts`) confirms the
// same +2/single-pause mechanism at its own later breakpoint age (97, that
// move's own blendoff gap) - the pause SHAPE is shared plumbing
// (`psychicBackground.ts`), only the breakpoint age is per-move.
const ROTATION_PAUSE_BREAKPOINT_AGE = 69;
const ROTATION_PAUSE_EXTRA_TICKS = 2;

/** `REG_BLDY` (0-16) at a given age - the black-cover cross-fade both `SetPsychicBackground` and `UnsetPsychicBackground` drive around the BG swap. The two holds are RAM-probed asymmetric (4 ticks, then 5). */
export function futureSightBgBldyAtAge(age: number): number {
  if (age < FADE_2_RAMPUP_START_AGE) {
    return psychicBgFadeRampAtLocalAge(
      age,
      FADE_1_RAMPUP_END_AGE,
      FADE_1_HOLD_END_AGE,
      FADE_1_RAMPDOWN_END_AGE,
    );
  }
  return psychicBgFadeRampAtLocalAge(
    age - FADE_2_RAMPUP_START_AGE,
    FADE_2_RAMPUP_END_AGE - FADE_2_RAMPUP_START_AGE,
    FADE_2_HOLD_END_AGE - FADE_2_RAMPUP_START_AGE,
    FADE_2_RAMPDOWN_END_AGE - FADE_2_RAMPUP_START_AGE,
  );
}

/** Whether BG_PSYCHIC (vs the default battle background) is the tileset/tilemap/palette in effect - true from the moment it loads under the first black cover through the moment `restorebg` swaps the reference back under the second (RAM-confirmed reverted by age 92, itself still within the second hold). */
export function futureSightBgIsPsychic(age: number): boolean {
  return age >= FADE_1_HOLD_END_AGE + 1 && age <= FADE_2_RAMPUP_END_AGE + 2;
}

/** `SetPsychicBackground_Step`'s own rotate-right-by-1 of BG palette 2's entries 1-11, applied `psychicBgRotationCountAtAge(age, ...)` times (mod the 11-entry ring). */
export function futureSightBgPaletteRowAtAge(
  basePalette: readonly Readonly<RgbColor>[],
  age: number,
): Readonly<RgbColor>[] {
  return psychicBgPaletteRowAtAge(
    basePalette,
    psychicBgRotationCountAtAge(age, ROTATION_PAUSE_BREAKPOINT_AGE, ROTATION_PAUSE_EXTRA_TICKS),
  );
}

export interface FutureSightAttackerEffect {
  readonly attackerObjY: number;
  readonly attackerScale: Readonly<{ readonly active: boolean; readonly xScale: number; readonly yScale: number }>;
}

/** `age` is ticks since `fadetobg BG_PSYCHIC`'s own creation tick (this move's single shared age reference; see module doc). */
export function futureSightAttackerEffectAtAge(age: number): FutureSightAttackerEffect {
  const local = age - FUTURE_SIGHT_ATTACKER_EFFECT_START_AGE;
  return {
    attackerObjY: blendColorCycleObjYAtAge(local, FUTURE_SIGHT_BLEND_TIMING),
    attackerScale: scaleMonAndRestoreAtAge(local, FUTURE_SIGHT_SCALE_PARAMS),
  };
}
