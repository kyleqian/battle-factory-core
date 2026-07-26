// MOVE_PSYCHIC's own animation body (`Move_PSYCHIC`,
// `battle_anim_scripts.s:4733-4748`), the psychic family's third and final
// `blend_color_cycle` group-A sibling - byte-for-byte the SAME script shape
// as already-ported `MOVE_CONFUSION` (`confusion.ts`'s own module doc has
// the full mechanism), differing only in three literal argv values: the
// `blend_color_cycle` target color (`RGB(31, 23, 0)`, not `RGB_WHITE` -
// rendered at `battleScene.ts`'s own PSYCHIC draw case, not here, since the
// color never touches the numeric blend-y ramp), the target's own
// `AnimTask_ShakeMon` x amplitude (`5`, not `3`), and the target's own
// `AnimTask_ScaleMonAndRestore` xDelta/yDelta (`-6, -6`, not `-4, -4`) -
// `waitforvisualfinish`/`clearmonbg`/`blendoff`/`delay 1`/`call
// UnsetPsychicBackground` are identical instructions in identical order.
//
// RAM-probed directly (`tools/battle-lab/mechanic-psychic-kadabra-onix.json`,
// same KADABRA/ONIX pair as CONFUSION/FUTURE_SIGHT - `FRONTIER_MON_KADABRA_2`
// carries PSYCHIC, confirmed via `src/data/gen/battle-frontier-mons.json`,
// so no new sprite extraction was needed) via the already-committed generic
// probes (`tools/probe/dump-future-sight-psychicbg.py`, no new probe
// script), ticks 70-260: this move's own `fadetobg BG_PSYCHIC` creation tick
// (age 0) is oracle tick 79 in this fixture - 2 ticks EARLIER than CONFUSION/
// FUTURE_SIGHT's own tick 81, a real per-move difference (shorter "PSYCHIC!"
// move-name text prints faster than "CONFUSION!"/"FUTURE SIGHT!" before the
// animation script itself starts) that lands entirely in the fixture's own
// age-0 anchor, not in any of the RELATIVE ages below. Every relative age
// this move needs came back an EXACT match to CONFUSION's own already-coded
// constants, confirmed independently rather than assumed:
//   - fade 1 (`SetPsychicBackground`'s own black-cover ramp): REG_BLDY
//     ramps 0->16 over ages 0-16 (reaches 16 at probe tick 95 = age 16),
//     holds through age 19 (tick 95-98 read 16), ramps back down 16->0
//     over ages 19-35 (reaches 0 at tick 114 = age 35) - byte-identical
//     shape AND ages to CONFUSION's own fade 1.
//   - window 1 (attacker `AnimTask_ShakeMon2`+`blend_color_cycle`, task
//     data[5]=767=RGB(31,23,0) packed BGR555, confirming this IS the
//     PSYCHIC blend task and not a stale probe-address false match):
//     first observed already mid-loop at probe tick 116 = age 37, the SAME
//     window-1 start age CONFUSION uses (window 1's own task composition -
//     `AnimTask_ShakeMon2, 2, ANIM_ATTACKER, 1, 0, 10, 1` - is a literally
//     identical argv to CONFUSION's own, so an identical duration is
//     expected, not coincidental).
//   - window 2 (target `AnimTask_ScaleMonAndRestore`, task data[0..1]
//     read -6,-6 as signed 16-bit (65530=-6 mod 65536), data[3]=15
//     (duration), confirming the script's own `-6, -6, 15` argv directly):
//     first observed at probe tick 144 = age 65, the SAME window-2 start
//     age CONFUSION uses (window 1's own total duration is unchanged since
//     its argv is identical, so it releases `waitforvisualfinish` at the
//     same relative age).
//   - fade 2 (`UnsetPsychicBackground`'s own black-cover ramp): REG_BLDY
//     starts ramping again at tick 181 (age 102, i.e. the same "ramps
//     starting at ageX+1" convention fade 1 uses puts FADE_2_RAMPUP_START_
//     AGE at 101), reaches 16 at tick 196 (age 117, relative +16), holds
//     through tick 200 (age 121, relative +20), reaches 0 at tick 216
//     (age 137, relative +36) - all four numbers match CONFUSION's own
//     101/16/20/36 exactly. Consistent with window 2's own unchanged
//     duration=15 (only its xDelta/yDelta magnitude differs, not its
//     tick-count), so the gap before `call UnsetPsychicBackground` is the
//     same length too.
//   - BG-palette-2 rotation ring pause (`SetPsychicBackground_Step`,
//     `psychicBackground.ts`): steps cleanly every 4 ages 21->93 (matching
//     `PSYCHIC_BG_ROTATION_FIRST_APPLIED_AGE`/`_INTERVAL` exactly, both
//     shared constants), then the next step lands at age 99 instead of 97
//     (a +2-tick pause spanning window 2's own `blendoff` gap, directly
//     RAM-confirmed against the raw `bgPalette2Row` dump, not assumed) -
//     the SAME breakpoint age (97) and pause length (2) CONFUSION's own
//     later blendoff gap uses, for the same reason fade 2's own ages match:
//     window 2's duration is unchanged.
//
// Lag conventions (window-1 shake -2, window-2 OAM-shadow -2 on target
// x2/scale, monbg copy -1, tint -1) are the generic OAM-shadow-copy and
// framebuffer-capture latencies CONFUSION's own rung 12/13 established as
// hardware-level, move-independent artifacts (`sceneOnConfusionView`'s own
// module doc) - applied unchanged at the `sceneOnPsychicView` draw seam
// below, verified (not just assumed) by this session's own dense comparator
// run against `psychicPortable.ts`.
import { blendColorCycleObjYAtAge } from "./blendColorCycle.ts";
import { scaleMonAndRestoreAtAge } from "./bind.ts";
import { shakeMon2OffsetAtTick } from "./shakeMon2.ts";
import { shakeMonOffsetAtTick } from "./shakeMon.ts";
import {
  FUTURE_SIGHT_BLEND_TIMING,
} from "./futureSight.ts";
import {
  psychicBgFadeRampAtLocalAge,
  psychicBgRotationCountAtAge,
  psychicBgPaletteRowAtAge as psychicBgRingPaletteAtCount,
} from "./psychicBackground.ts";
import type { RgbColor } from "./bg.ts";

/** Ticks since `fadetobg BG_PSYCHIC`'s own creation tick (oracle tick 79 in the RAM-probed fixture) - same age-0 convention as `confusion.ts`/`futureSight.ts`. */
export const PSYCHIC_WINDOW1_START_AGE = 37;
export const PSYCHIC_WINDOW2_START_AGE = 65;

/** `battle_anim_scripts.s:4738`'s own `blend_color_cycle` target color, `RGB(31, 23, 0)` expanded 5-bit-to-8-bit (`(v5<<3)|(v5>>2)`, the same expansion `RGB_WHITE`'s (255,255,255) already uses elsewhere in this codebase). */
export const PSYCHIC_BLEND_TINT_COLOR: RgbColor = { r: 255, g: 189, b: 0 };

const ATTACKER_SHAKE2 = { xOffset: 1, yOffset: 0, numTimes: 10, frameDelay: 1 } as const;
const TARGET_SHAKE = { xOffset: 5, yOffset: 0, numTimes: 15, frameDelay: 1 } as const;
const SCALE_PARAMS = { xDelta: -6, yDelta: -6, duration: 15 } as const;

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

/** `REG_BLDY` (0-16) at a given age - same shape as `confusionBgBldyAtAge`, this move's own RAM-probed fade-2 start age (byte-identical to CONFUSION's). */
export function psychicBgBldyAtAge(age: number): number {
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

/** Whether BG_PSYCHIC (vs the default battle background) is the tileset/tilemap/palette in effect - same RAM-probed convention as CONFUSION/FUTURE_SIGHT. */
export function psychicBgIsPsychic(age: number): boolean {
  return age >= BG_IS_PSYCHIC_START_AGE && age <= BG_IS_PSYCHIC_END_AGE;
}

/** `SetPsychicBackground_Step`'s own rotate-right-by-1 of BG palette 2's entries 1-11, this move's own RAM-probed pause breakpoint (byte-identical to CONFUSION's: window 2's duration is unchanged, only its shake/scale magnitude differs). */
export function psychicBgPaletteRowAtAge(
  basePalette: readonly Readonly<RgbColor>[],
  age: number,
): Readonly<RgbColor>[] {
  return psychicBgRingPaletteAtCount(
    basePalette,
    psychicBgRotationCountAtAge(age, ROTATION_PAUSE_BREAKPOINT_AGE, ROTATION_PAUSE_EXTRA_TICKS),
  );
}

export interface PsychicAttackerEffect {
  readonly attackerObjY: number;
  readonly attackerX2: number;
}

/**
 * `age` is ticks since `fadetobg BG_PSYCHIC`'s own creation tick (this
 * move's single shared age reference; see module doc). Same "+1, guard
 * age<creationAge" `AnimTask_ShakeMon2` creation-anchor idiom as
 * `confusion.ts`'s own attacker effect - this move's own argv is a literal
 * copy of CONFUSION's (`1, 0, 10, 1`), so the same idiom applies unchanged.
 */
export function psychicAttackerEffectAtAge(age: number): PsychicAttackerEffect {
  const local = age - PSYCHIC_WINDOW1_START_AGE;
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

export interface PsychicTargetEffect {
  readonly targetScale: Readonly<{ readonly active: boolean; readonly xScale: number; readonly yScale: number }>;
  readonly targetX2: number;
}

/**
 * `age` is ticks since `fadetobg BG_PSYCHIC`'s own creation tick (this
 * move's single shared age reference; see module doc). Same "+1, guard
 * age<creationAge" `AnimTask_ShakeMon` idiom as `confusion.ts`'s own target
 * effect; `scaleMonAndRestoreAtAge` needs no offset of its own, same as
 * CONFUSION - only the xDelta/yDelta magnitude differs (`-6, -6` vs
 * CONFUSION's `-4, -4`), the mechanism and duration (15) are identical.
 */
export function psychicTargetEffectAtAge(age: number): PsychicTargetEffect {
  const local = age - PSYCHIC_WINDOW2_START_AGE;
  return {
    targetScale: scaleMonAndRestoreAtAge(local, SCALE_PARAMS),
    targetX2: local < 0 ? 0 : shakeMonOffsetAtTick(
      TARGET_SHAKE.xOffset,
      TARGET_SHAKE.yOffset,
      TARGET_SHAKE.numTimes,
      TARGET_SHAKE.frameDelay,
      local + 1,
    ).x2,
  };
}
