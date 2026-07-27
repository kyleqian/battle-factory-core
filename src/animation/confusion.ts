// MOVE_CONFUSION's own animation body (`Move_CONFUSION`,
// `battle_anim_scripts.s:4716-4730`, the `blend_color_cycle` group-A
// sibling closest to already-ported MOVE_FUTURE_SIGHT/MOVE_GROWTH):
// `monbg ANIM_DEF_PARTNER`, `call SetPsychicBackground`, `setalpha 8, 8`,
// then TWO sequential simultaneous-task windows, not one -
//   window 1 (attacker): `createvisualtask AnimTask_ShakeMon2, 2,
//     ANIM_ATTACKER, 1, 0, 10, 1` + `blend_color_cycle` (identical argv to
//     GROWTH/FUTURE_SIGHT's own: delay=0, numBlends=2, 0->8, WHITE),
//     created together, `waitforvisualfinish` blocks on BOTH;
//   window 2 (target): `createvisualtask AnimTask_ShakeMon, 2, ANIM_TARGET,
//     3, 0, 15, 1` + `createvisualtask AnimTask_ScaleMonAndRestore, 5, -4,
//     -4, 15, ANIM_TARGET, 1` (same xDelta/yDelta/duration as FUTURE_SIGHT's
//     own attacker scale, applied to the TARGET here - `scaleMonAndRestore
//     AtAge` from `src/animation/bind.ts` is side-agnostic), created together
//     once window 1's tasks are gone, `waitforvisualfinish` blocks on both.
// Then `clearmonbg`/`blendoff`, `delay 1`, `call UnsetPsychicBackground`.
// Unlike FUTURE_SIGHT, CONFUSION's scale lands on the TARGET (the BIND
// target-squeeze precedent rendered exact there, unlike FUTURE_SIGHT's own
// still-open attacker-side scale residual, defect A - out of this move's
// scope, tracked separately) and composes TWO simultaneous-task windows
// instead of one, the real per-move risk this port exists to check.
//
// RAM-probed directly (`tools/battle-lab/mechanic-confusion-kadabra-onix.
// json`, same KADABRA/ONIX pair as FUTURE_SIGHT - `FRONTIER_MON_KADABRA_1`
// carries both moves, so no new sprite extraction was needed) via the
// already-committed generic probe (`tools/probe/run-battle-lab-rgb.py`,
// no new probe script) - ages below are ticks since `fadetobg BG_PSYCHIC`'s
// own creation tick (oracle tick 81 in this fixture, the same age-0
// convention `futureSight.ts` uses): fade 1 (`SetPsychicBackground`'s own
// black-cover ramp) is BYTE-IDENTICAL in shape to FUTURE_SIGHT's own
// (ramp 0->16 ages 0-16, hold ages 16-19, ramp 16->0 ages 19-35 - same
// `SetPsychicBackground` subroutine, unsurprising). Window 1 (attacker
// shake+blend) is created at age 37 - the SAME age FUTURE_SIGHT's own
// attacker effect starts at, since the script's own choreography up to
// that point (`monbg`/`call SetPsychicBackground`/`setalpha`/
// `createvisualtask`/`blend_color_cycle`) is identical modulo the extra
// `createvisualtask AnimTask_ShakeMon2` (created the SAME tick as the
// blend, adds no extra delay). Window 2 (target shake+scale) is created at
// age 65 (oracle tick 146), the tick window 1's own longer-lived task
// (`blend_color_cycle`, ~27 ticks, matching GROWTH/FUTURE_SIGHT's own
// documented duration) releases `waitforvisualfinish`. Fade 2
// (`UnsetPsychicBackground`'s own black-cover ramp) starts at age 101
// (oracle tick 182, RAM: `REG_BLDCNT` reads 0xe8 again there) - later than
// FUTURE_SIGHT's own age 73 because window 2's own longer-lived task
// (`AnimTask_ShakeMon`, ~29 ticks) and the script's own `blendoff`/`delay 1`
// run first - but the SAME rampup/hold/rampdown shape (16/20/36 ticks
// relative to its own start) as FUTURE_SIGHT's fade 2. The BG-palette-2
// rotation ring (`SetPsychicBackground_Step`, `psychicBackground.ts`) also
// carries FUTURE_SIGHT's own rung-6 finding: a single +2-tick pause, here
// at breakpoint age 97 (not 69 - CONFUSION's own later blendoff gap,
// ages 95-100 vs FUTURE_SIGHT's 67-72), directly RAM-confirmed against the
// raw `bgPalette2Faded` row (steps cleanly every 4 ages 21->93, then jumps
// 93->99 instead of 93->97, resumes clean +4 cadence permanently shifted).
import { blendColorCycleObjYAtAge } from "./blendColorCycle.ts";
import { scaleMonAndRestoreAtAge } from "./bind.ts";
import { shakeMon2OffsetAtTick } from "./shakeMon2.ts";
import { shakeMonOffsetAtTick } from "./shakeMon.ts";
import {
  FUTURE_SIGHT_BLEND_TIMING,
  FUTURE_SIGHT_SCALE_PARAMS,
} from "./futureSight.ts";
import {
  psychicBgFadeRampAtLocalAge,
  psychicBgRotationCountAtAge,
  psychicBgPaletteRowAtAge,
} from "./psychicBackground.ts";
import type { RgbColor } from "../engine/bg.ts";

/** Ticks since `fadetobg BG_PSYCHIC`'s own creation tick (oracle tick 81 in the RAM-probed fixture) - same age-0 convention as `futureSight.ts`. */
export const CONFUSION_WINDOW1_START_AGE = 37;
export const CONFUSION_WINDOW2_START_AGE = 65;

const ATTACKER_SHAKE2 = { xOffset: 1, yOffset: 0, numTimes: 10, frameDelay: 1 } as const;
const TARGET_SHAKE = { xOffset: 3, yOffset: 0, numTimes: 15, frameDelay: 1 } as const;

const FADE_1_RAMPUP_END_AGE = 16;
const FADE_1_HOLD_END_AGE = 19;
const FADE_1_RAMPDOWN_END_AGE = 35;
const FADE_2_RAMPUP_START_AGE = 101;
const FADE_2_RAMPUP_END_REL = 16;
const FADE_2_HOLD_END_REL = 20;
const FADE_2_RAMPDOWN_END_REL = 36;
const ROTATION_PAUSE_BREAKPOINT_AGE = 97;
const ROTATION_PAUSE_EXTRA_TICKS = 2;
const BG_IS_PSYCHIC_START_AGE = FADE_1_HOLD_END_AGE + 1;
const BG_IS_PSYCHIC_END_AGE = FADE_2_RAMPUP_START_AGE + FADE_2_RAMPUP_END_REL + 2;

/** `REG_BLDY` (0-16) at a given age - same shape as `futureSightBgBldyAtAge`, this move's own RAM-probed fade-2 start age. */
export function confusionBgBldyAtAge(age: number): number {
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
    FADE_2_RAMPUP_END_REL,
    FADE_2_HOLD_END_REL,
    FADE_2_RAMPDOWN_END_REL,
  );
}

/** Whether BG_PSYCHIC (vs the default battle background) is the tileset/tilemap/palette in effect - same "2 ticks into the second hold" RAM-probed convention as FUTURE_SIGHT. */
export function confusionBgIsPsychic(age: number): boolean {
  return age >= BG_IS_PSYCHIC_START_AGE && age <= BG_IS_PSYCHIC_END_AGE;
}

/** `SetPsychicBackground_Step`'s own rotate-right-by-1 of BG palette 2's entries 1-11, this move's own RAM-probed pause breakpoint. */
export function confusionBgPaletteRowAtAge(
  basePalette: readonly Readonly<RgbColor>[],
  age: number,
): Readonly<RgbColor>[] {
  return psychicBgPaletteRowAtAge(
    basePalette,
    psychicBgRotationCountAtAge(age, ROTATION_PAUSE_BREAKPOINT_AGE, ROTATION_PAUSE_EXTRA_TICKS),
  );
}

export interface ConfusionAttackerEffect {
  readonly attackerObjY: number;
  readonly attackerX2: number;
}

/**
 * `age` is ticks since `fadetobg BG_PSYCHIC`'s own creation tick (this
 * move's single shared age reference; see module doc). The shake uses the
 * same "+1, guard age<creationAge" creation-anchor idiom already
 * established for `AnimTask_ShakeMon2` at every other call site
 * (`dragonBreath.ts`/`blazeKick.ts`, `tests/shakeMon2.test.ts`'s own module
 * doc: "by the FIRST RAM tick this task's callback is observed, x2 ALREADY
 * reads the FIRST FLIP's result") - RAM-confirmed directly for this move
 * too (probe ages 118-119 read the sequence's own index-1 value, not
 * index-0). `blend_color_cycle` needs no such offset (GROWTH/FUTURE_SIGHT
 * precedent: `blendColorCycleObjYAtAge` is already RAM-tick-correct as-is).
 */
export function confusionAttackerEffectAtAge(age: number): ConfusionAttackerEffect {
  const local = age - CONFUSION_WINDOW1_START_AGE;
  return {
    attackerObjY: blendColorCycleObjYAtAge(local, FUTURE_SIGHT_BLEND_TIMING),
    attackerX2: local < 0 ? 0 : shakeMon2OffsetAtTick(
      ATTACKER_SHAKE2.xOffset,
      ATTACKER_SHAKE2.yOffset,
      ATTACKER_SHAKE2.numTimes,
      ATTACKER_SHAKE2.frameDelay,
      local + 1,
    ).x2,
  };
}

/**
 * Display-layer boundary fix (RAM-probed this session,
 * `tools/compare/scratch/confusion-boundary-instrument.ts` against
 * `dump-scale-window-oam-scanline.py`): `confusionAttackerEffectAtAge`'s own
 * "+1" is a RAM-SAMPLE-alignment idiom only (RAM never observes the shake
 * task's raw pre-flip creation value, `shakeMon2Sequence`'s own index 0 -
 * RAM always reads index 1 by the first tick the task's callback is
 * observed). The OAM shadow is a DIFFERENT, earlier read: at the task's own
 * creation tick, the OAM already shows index 0 directly (RAM-confirmed: real
 * `oamX` extra reads `+1` = `xOffset` at the exact creation tick, not `0`
 * "not yet active" NOR `-1` = index 1's value), for exactly that one tick,
 * before the steady one-tick OAM-copy lag (index 1 from the NEXT tick
 * onward) takes over. Composed with the generic one-tick framebuffer-capture
 * lag already established everywhere else in this codebase, the DISPLAYED
 * pixel at `displayAge` is `shakeMon2Sequence[displayAge - START_AGE - 1]`
 * directly (`shakeMon2OffsetAtTick`'s own `tick<0` clamp handles "not yet
 * created" - no separate guard needed, and critically no "+1" skip: the
 * skip belongs only to RAM-sample alignment, not this display formula).
 */
export function confusionAttackerShakeDisplayX2(displayAge: number): number {
  return shakeMon2OffsetAtTick(
    ATTACKER_SHAKE2.xOffset,
    ATTACKER_SHAKE2.yOffset,
    ATTACKER_SHAKE2.numTimes,
    ATTACKER_SHAKE2.frameDelay,
    displayAge - CONFUSION_WINDOW1_START_AGE - 1,
  ).x2;
}

export interface ConfusionTargetEffect {
  readonly targetScale: Readonly<{ readonly active: boolean; readonly xScale: number; readonly yScale: number }>;
  readonly targetX2: number;
}

/**
 * `age` is ticks since `fadetobg BG_PSYCHIC`'s own creation tick (this
 * move's single shared age reference; see module doc). `scaleMonAndRestore
 * AtAge` is already RAM-tick-correct as-is (its own `step = age + 1`
 * internal formula, confirmed directly against the probe: local age 0
 * already reads the first-decremented matrix value). The shake uses the
 * same "+1, guard age<creationAge" idiom as the attacker's own
 * `AnimTask_ShakeMon2` above - RAM-confirmed directly for `AnimTask_
 * ShakeMon` too (probe ages 146-147 read the sequence's own index-1 value).
 */
export function confusionTargetEffectAtAge(age: number): ConfusionTargetEffect {
  const local = age - CONFUSION_WINDOW2_START_AGE;
  return {
    targetScale: scaleMonAndRestoreAtAge(local, FUTURE_SIGHT_SCALE_PARAMS),
    targetX2: local < 0 ? 0 : shakeMonOffsetAtTick(
      TARGET_SHAKE.xOffset,
      TARGET_SHAKE.yOffset,
      TARGET_SHAKE.numTimes,
      TARGET_SHAKE.frameDelay,
      local + 1,
    ).x2,
  };
}

/**
 * Display-layer counterpart to the RAM-sample-aligned target shake above.
 * The creation tick is asymmetric: `AnimTask_ShakeMon` writes `xOffset`
 * before its synchronous first step clears it, so the OAM shadow captures
 * the raw +3 creation value even though the first readable post-task RAM
 * sample is already 0. After that one tick, the established OAM-copy plus
 * framebuffer lag is the ordinary two ticks. Fresh
 * `dump-scale-window-oam-scanline.py` evidence: oracle tick 146 has
 * `x2=0` but `oamExtra=3`; the dense framebuffer displays that +3 at tick
 * 147. Querying the literal source sequence at
 * `displayAge - startAge - 1` preserves both facts without a frame patch.
 */
export function confusionTargetShakeDisplayX2(displayAge: number): number {
  return shakeMonOffsetAtTick(
    TARGET_SHAKE.xOffset,
    TARGET_SHAKE.yOffset,
    TARGET_SHAKE.numTimes,
    TARGET_SHAKE.frameDelay,
    displayAge - CONFUSION_WINDOW2_START_AGE - 1,
  ).x2;
}
