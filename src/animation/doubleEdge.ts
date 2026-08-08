/**
 * Complete source-relative `Move_DOUBLE_EDGE` visual body, RAM-truth.
 *
 * Ages are RAM ages relative to the move-owned window: player-back starts at
 * frame 80, opponent-front at frame 84, so BOTH orientations share the same
 * ages and differ only in the battler geometry and the mirrored x offsets
 * (measured: player-back window 80..220 = 141 frames, opponent-front 84..224 =
 * 141 frames, both re-run byte-identical twice each — see the staging ledger
 * and `tools/compare/evidence/double-edge-changemap-*.txt`).
 *
 * This file was originally shipped as dead code by a failed promotion round
 * (nothing imported it, no test pinned it). Every field has been re-derived
 * from a fresh two-orientation probe. What survived validation: the elliptical
 * lunge via the shared `wrap` port (ages 31-62, two loops of the 18/6/2/4
 * profile), the attacker slide-to-offset +20 and slide-to-original via the
 * shared `slideMon` ports, the `ShakeMonInPlace(4,0,12,1)` x2 toggling via the
 * shared `shakeMonInPlace` port (tick base age 79, active ages 80-101), the
 * `attackerWhiteCoefficient` (complex palette blend, white at ages 4-7 and
 * 13-18) and the `bgWhiteCoefficient` curve (F_PAL_BG 16 at ages 63-82, then
 * 16-2*(1+floor((age-83)/4)) to 0 at 111). What had to be corrected:
 *
 * 1. **The rotation-derived y2 belongs to whichever battler is on the PLAYER
 *    side, not to the attacker.** `AnimTask_RotateMonSpriteToSide` calls
 *    `SetBattlerSpriteYOffsetFromRotation` only when `data[7]` (battler side is
 *    player). In the player-back orientation the attacker gets it; in the
 *    opponent-front orientation the TARGET gets it (probe: opponent-front
 *    attacker y2 stays 0 through the whole rotate block while the target's y2
 *    tracks |c|>>3). The dead code applied it to the attacker unconditionally.
 * 2. **The restore pass rotation sign.** The task seeds `data[3]` at
 *    `duration * increment = 8 * -256 = -2048`, then negates it AND the
 *    per-step increment for the player side, so the player side accumulates
 *    +256 per step from +2048: rotation 2304, 2560, ..., 3840 (index 9..15).
 *    The dead code computed `-2048 + step*256`, which has the wrong sign for
 *    the player side (probe age 119 player attacker matrix [249,-56,56,249] =
 *    rotation 2304, not -1792). The opponent side accumulates -2304..-3840.
 *    Both restore the matrix to identity on their final (8th) step, so the
 *    matrix is identity at age 126 but the player-side y2 stays at 12 (the
 *    |c|>>3 of the transient rotation-4096 write).
 * 3. **The slide mirrors were hardcoded.** The attacker holds +20/-20 and the
 *    target holds +31/-32 by side; the two slide-to-original sprites also take
 *    the held x2 and the player-side y2 (12, from the rotate block) as their
 *    `currentX2`/`currentY2`.
 * 4. The target's own y2 before/after its rotate window and the attacker's y2
 *    during ages 127-131 (the slide-to-original drives BOTH axes back).
 *
 * The shake task drives x2 only (yOffset 0), so y2 during ages 80-100 is purely
 * the rotation-derived |c|>>3, not a shake contribution. The draw case must
 * supply the ONIX front-idle x2=1 before the target slide (a species idle, not
 * move state — same convention as `counter.ts`).
 */
import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import { shakeMonInPlaceOffsetAtTick } from "./shakeMonInPlace.ts";
import {
  slideMonToOffsetAtTick,
  slideMonToOriginalPosAtTick,
} from "./slideMon.ts";
import { wrapEllipticalOffsetAtAge } from "./wrap.ts";

export type DoubleEdgeSide = "player" | "opponent";

export interface DoubleEdgeMatrix {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
}

export interface DoubleEdgeState {
  readonly active: boolean;
  readonly impactLoaded: boolean;
  readonly attackerOffset: Readonly<{ x2: number; y2: number }>;
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  readonly attackerTransform: Readonly<{
    active: boolean;
    matrix: DoubleEdgeMatrix;
  }>;
  readonly targetTransform: Readonly<{
    active: boolean;
    matrix: DoubleEdgeMatrix;
  }>;
  readonly attackerWhiteCoefficient: number;
  readonly bgWhiteCoefficient: number;
  readonly hitsplat: Readonly<{ x: number; y: number }> | null;
  readonly slideToOffsetCount: number;
  readonly slideToOriginalCount: number;
  readonly rotateTaskCount: number;
  readonly shakeTaskCount: number;
  readonly ellipseTaskActive: boolean;
  readonly sound:
    | "SE_M_SWIFT"
    | "SE_M_SWAGGER"
    | "SE_M_MEGA_KICK2"
    | null;
  readonly soundPanSide: DoubleEdgeSide | null;
}

export const DOUBLE_EDGE_FRAME_COUNT = 141;
const IDENTITY: DoubleEdgeMatrix = { a: 256, b: 0, c: 0, d: 256 };

/** RAM age of `SE_M_SWIFT` (pan attacker). */
export const SE_M_SWIFT_AGE = 4;
/** RAM age of the first `SE_M_SWAGGER` (pan attacker). */
export const SE_M_SWAGGER_AGE = 32;
/** RAM age of `SE_M_MEGA_KICK2` (pan target) / the first hitsplat. */
export const HITSPLAT_AGE = 70;
/** First RAM age of the attacker white complex-palette-blend window. */
export const ATTACKER_WHITE_FIRST_AGE = 4;
/** Last RAM age of the first attacker white window. */
export const ATTACKER_WHITE_LAST_AGE = 7;
/** First RAM age of the second attacker white window. */
export const ATTACKER_WHITE2_FIRST_AGE = 13;
/** Last RAM age of the second attacker white window. */
export const ATTACKER_WHITE2_LAST_AGE = 18;
/** RAM age `simple_palette_blend F_PAL_BG` first writes full white (16). */
export const BG_WHITE_FIRST_AGE = 63;
/** RAM age the F_PAL_BG white starts ramping back down. */
export const BG_WHITE_RAMP_FIRST_AGE = 83;
/** RAM age the F_PAL_BG white reaches 0. */
export const BG_WHITE_CLEAR_AGE = 111;
/** First RAM age of the elliptical lunge's first visible tick. */
export const ELLIPSE_FIRST_AGE = 32;
/** Last RAM age the lunge writes a nonzero offset (task self-destroys at 62). */
export const ELLIPSE_LAST_AGE = 61;
/** RAM age `SlideMonToOffset(0,20,0,0,4)` starts driving the attacker x2. */
export const ATTACKER_SLIDE_FIRST_AGE = 63;
/** RAM age `SlideMonToOffset(1,-32,0,0,3)` starts driving the target x2. */
export const TARGET_SLIDE_FIRST_AGE = 70;
/** RAM age the forward `AnimTask_RotateMonSpriteToSide` runs its first step. */
export const ROTATE_FIRST_AGE = 80;
/** RAM age the forward rotation reaches its 8th step (rotation 2048/-2048). */
export const ROTATE_LAST_AGE = 87;
/** RAM age the restore `AnimTask_RotateMonSpriteToSide` runs its first step. */
export const RESTORE_FIRST_AGE = 119;
/** RAM age the restore task resets the matrix to identity (y2 stays 12). */
export const RESTORE_RESET_AGE = 126;
/** First RAM age of the `ShakeMonInPlace(4,0,12,1)` x2 toggling. */
export const SHAKE_FIRST_AGE = 80;
/** Last RAM age the shake task runs (x2 restored at 101). */
export const SHAKE_LAST_AGE = 100;
/** RAM age `SlideMonToOriginalPos(0,0,5)` starts driving the attacker back. */
export const ATTACKER_ORIGIN_FIRST_AGE = 127;
/** RAM age `SlideMonToOriginalPos(1,0,7)` starts driving the target back. */
export const TARGET_ORIGIN_FIRST_AGE = 132;

const ATTACKER_SLIDE_DURATION = 4;
const TARGET_SLIDE_DURATION = 3;
const ATTACKER_ORIGIN_DURATION = 5;
const TARGET_ORIGIN_DURATION = 7;

/**
 * The affine matrix written by `SetSpriteRotScale(sprite, 0x100, 0x100, rot)`
 * for a rotation value `rot` (GBA unit: index = rot >> 8 into the 256-entry
 * sine table, matrix = [cos, -sin, sin, cos]).
 */
function rotateMatrix(rotation: number): DoubleEdgeMatrix {
  const index = (rotation >> 8) & 0xff;
  const sin = GBA_SINE_TABLE_256[index]!;
  const cos = GBA_SINE_TABLE_256[(index + 64) & 0xff]!;
  return { a: cos, b: -sin, c: sin, d: cos };
}

/**
 * `AnimTask_RotateMonSpriteToSide(8, -256, battler, restore)` accumulator at a
 * RAM age, per the probe's task data[3]:
 * - forward (restore 0): data[3] starts 0 and adds +256 per step on the player
 *   side / -256 on the opponent side (data[4] is negated for the player side):
 *   rotation 256..2048 at ages 80-87.
 * - restore (restore 1): data[3] starts 8*-256 = -2048, negated to +2048 on
 *   the player side; step adds +256 (player) / -256 (opponent): rotation
 *   2304..3840 at ages 119-125, then 4096 on the reset step (age 126).
 */
function battlerRotation(age: number, side: DoubleEdgeSide): number {
  const sign = side === "player" ? 1 : -1;
  if (age >= ROTATE_FIRST_AGE && age <= ROTATE_LAST_AGE) {
    return (age - ROTATE_FIRST_AGE + 1) * 256 * sign;
  }
  if (age > ROTATE_LAST_AGE && age < RESTORE_FIRST_AGE) {
    return 8 * 256 * sign;
  }
  if (age >= RESTORE_FIRST_AGE && age < RESTORE_RESET_AGE) {
    return (8 + (age - RESTORE_FIRST_AGE + 1)) * 256 * sign;
  }
  return 0;
}

function transformAtAge(
  age: number,
  side: DoubleEdgeSide,
): { active: boolean; matrix: DoubleEdgeMatrix } {
  if (age >= ROTATE_FIRST_AGE && age < RESTORE_RESET_AGE) {
    const rotation = battlerRotation(age, side);
    return { active: true, matrix: rotateMatrix(rotation) };
  }
  return { active: false, matrix: IDENTITY };
}

/**
 * `SetBattlerSpriteYOffsetFromRotation`: y2 = |matrix.c| >> 3, applied only to
 * the player-side battler. The reset step (age 126) writes rotation 4096 first
 * (c = sin(16) ≈ 98 -> y2 = 12) and resets the matrix afterwards, so the y2
 * persists at 12 while the matrix is identity.
 */
function rotateY2AtAge(age: number, side: DoubleEdgeSide): number {
  if (side !== "player") return 0;
  if (age < ROTATE_FIRST_AGE) return 0;
  if (age >= RESTORE_RESET_AGE) return 12;
  return Math.abs(rotateMatrix(battlerRotation(age, side)).c) >> 3;
}

/** The attacker's held x2 after `SlideMonToOffset(0,20,0,0,4)` (mirrored). */
function attackerHeldX2(attackerSide: DoubleEdgeSide): number {
  return slideMonToOffsetAtTick(
    {
      battlerSide: attackerSide,
      targetXOffset: 20,
      targetYOffset: 0,
      mirrorVertical: false,
      durationTicks: ATTACKER_SLIDE_DURATION,
    },
    ATTACKER_SLIDE_DURATION,
  ).x2;
}

/** The target's held x2 after `SlideMonToOffset(1,-32,0,0,3)` (mirrored). */
function targetHeldX2(targetSide: DoubleEdgeSide): number {
  return slideMonToOffsetAtTick(
    {
      battlerSide: targetSide,
      targetXOffset: -32,
      targetYOffset: 0,
      mirrorVertical: false,
      durationTicks: TARGET_SLIDE_DURATION,
    },
    TARGET_SLIDE_DURATION,
  ).x2;
}

/** `ShakeMonInPlace(4,0,12,1)` x2 contribution (y2 always 0). */
function shakeX2(age: number): number {
  if (age < SHAKE_FIRST_AGE || age > SHAKE_FIRST_AGE + 21) return 0;
  return shakeMonInPlaceOffsetAtTick(4, 0, 12, 1, age - 79).x2;
}

/**
 * The reducer's RAM-truth `ShakeMonInPlace(4,0,12,1)` x2 at a RAM age
 * (tick base age 79, active ages 80-101, restore to 0 at 101).
 */
export function doubleEdgeRamShakeX2(ramAge: number): number {
  if (ramAge < SHAKE_FIRST_AGE || ramAge > SHAKE_FIRST_AGE + 21) return 0;
  return shakeMonInPlaceOffsetAtTick(4, 0, 12, 1, ramAge - 79).x2;
}

/**
 * The `ShakeMonInPlace` x2 as DISPLAYED, measured on this move's own change
 * maps. The task's per-frame writes reach pixels one two-frame PAIR late: the
 * RAM value written at the even ages of each pair (80,82,...,100) displays for
 * the following two frames (displayed ages 81..102), and the RAM odd-age
 * writes are lost, so the displayed value at display age `A` is the RAM pair
 * containing `A - 1`. The RAM age-101 restore to 0 therefore shows at
 * displayed age 103. (This is why "the shake is RAM+1" fit every player-back
 * frame but one opponent-front toggle contradicted it - the pair-aligned rule
 * is exact on both.)
 */
export function doubleEdgeDisplayedShakeX2(displayAge: number): number {
  return doubleEdgeRamShakeX2(2 * Math.floor((displayAge - 1) / 2));
}

function attackerOffsetAtAge(
  age: number,
  attackerSide: DoubleEdgeSide,
): { x2: number; y2: number } {
  if (age >= ELLIPSE_FIRST_AGE - 1 && age <= ELLIPSE_LAST_AGE + 1) {
    return wrapEllipticalOffsetAtAge(
      age - (ELLIPSE_FIRST_AGE - 1),
      attackerSide,
      { xRadius: 18, yRadius: 6, loops: 2, speed: 4 },
    );
  }
  if (age >= ATTACKER_SLIDE_FIRST_AGE && age < ATTACKER_ORIGIN_FIRST_AGE) {
    const slide = slideMonToOffsetAtTick(
      {
        battlerSide: attackerSide,
        targetXOffset: 20,
        targetYOffset: 0,
        mirrorVertical: false,
        durationTicks: ATTACKER_SLIDE_DURATION,
      },
      age - ATTACKER_SLIDE_FIRST_AGE,
    );
    return {
      x2: slide.x2 + shakeX2(age),
      y2: rotateY2AtAge(age, attackerSide),
    };
  }
  if (age >= ATTACKER_ORIGIN_FIRST_AGE && age < ATTACKER_ORIGIN_FIRST_AGE + ATTACKER_ORIGIN_DURATION) {
    const slide = slideMonToOriginalPosAtTick(
      {
        currentX2: attackerHeldX2(attackerSide),
        currentY2: attackerSide === "player" ? 12 : 0,
        axisSnapMode: 0,
        durationTicks: ATTACKER_ORIGIN_DURATION,
      },
      age - ATTACKER_ORIGIN_FIRST_AGE,
    );
    return { x2: slide.x2, y2: slide.y2 };
  }
  return { x2: 0, y2: 0 };
}

function targetOffsetAtAge(
  age: number,
  targetSide: DoubleEdgeSide,
): { x2: number; y2: number } {
  if (age >= TARGET_SLIDE_FIRST_AGE && age < TARGET_ORIGIN_FIRST_AGE) {
    const slide = slideMonToOffsetAtTick(
      {
        battlerSide: targetSide,
        targetXOffset: -32,
        targetYOffset: 0,
        mirrorVertical: false,
        durationTicks: TARGET_SLIDE_DURATION,
      },
      age - TARGET_SLIDE_FIRST_AGE,
    );
    return {
      x2: slide.x2 + shakeX2(age),
      y2: rotateY2AtAge(age, targetSide),
    };
  }
  if (age >= TARGET_ORIGIN_FIRST_AGE && age < TARGET_ORIGIN_FIRST_AGE + TARGET_ORIGIN_DURATION) {
    const slide = slideMonToOriginalPosAtTick(
      {
        currentX2: targetHeldX2(targetSide),
        currentY2: targetSide === "player" ? 12 : 0,
        axisSnapMode: 0,
        durationTicks: TARGET_ORIGIN_DURATION,
      },
      age - TARGET_ORIGIN_FIRST_AGE,
    );
    return { x2: slide.x2, y2: slide.y2 };
  }
  return { x2: 0, y2: 0 };
}

function bgWhiteCoefficientAtAge(age: number): number {
  if (age < BG_WHITE_FIRST_AGE) return 0;
  if (age <= BG_WHITE_FIRST_AGE + 19) return 16;
  if (age < BG_WHITE_CLEAR_AGE) {
    return 16 - 2 * (1 + Math.floor((age - BG_WHITE_RAMP_FIRST_AGE) / 4));
  }
  return 0;
}

/**
 * Pure source-relative `Move_DOUBLE_EDGE` reducer.
 *
 * `age=0` is the first frame with the move script active; `age=140` is the
 * first inactive cleanup. The attacker white `complex_palette_blend` shows at
 * ages 4-7 and 13-18; the F_PAL_BG flat-white blend shows at 63-82 and ramps
 * 16->0 across 83-110.
 */
export function doubleEdgeAtAge(
  age: number,
  attackerSide: DoubleEdgeSide,
  targetSide: DoubleEdgeSide,
  targetCenter: Readonly<{ x: number; y: number }>,
): DoubleEdgeState {
  const firstRotate = age >= ROTATE_FIRST_AGE && age < ROTATE_LAST_AGE;
  const restoreRotate = age >= RESTORE_FIRST_AGE && age < RESTORE_RESET_AGE;
  const hitSplatAge = age >= HITSPLAT_AGE && age <= HITSPLAT_AGE + 8;
  const shakeActive = age >= SHAKE_FIRST_AGE && age <= SHAKE_LAST_AGE;
  const ellipseActive = age >= ELLIPSE_FIRST_AGE && age <= ELLIPSE_LAST_AGE;

  return {
    active: age >= 0 && age < DOUBLE_EDGE_FRAME_COUNT - 1,
    impactLoaded: age >= 0 && age < DOUBLE_EDGE_FRAME_COUNT - 1,
    attackerOffset: attackerOffsetAtAge(age, attackerSide),
    targetOffset: targetOffsetAtAge(age, targetSide),
    attackerTransform: transformAtAge(age, attackerSide),
    targetTransform: transformAtAge(age, targetSide),
    attackerWhiteCoefficient:
      (age >= ATTACKER_WHITE_FIRST_AGE && age <= ATTACKER_WHITE_LAST_AGE) ||
      (age >= ATTACKER_WHITE2_FIRST_AGE && age <= ATTACKER_WHITE2_LAST_AGE)
        ? 10
        : 0,
    bgWhiteCoefficient: bgWhiteCoefficientAtAge(age),
    hitsplat: hitSplatAge
      ? {
          x: targetCenter.x + (targetSide === "player" ? 10 : -10),
          y: targetCenter.y,
        }
      : null,
    slideToOffsetCount:
      Number(age >= ATTACKER_SLIDE_FIRST_AGE && age <= ATTACKER_SLIDE_FIRST_AGE + 4) +
      Number(age >= TARGET_SLIDE_FIRST_AGE && age <= TARGET_SLIDE_FIRST_AGE + 3),
    slideToOriginalCount:
      Number(age >= ATTACKER_ORIGIN_FIRST_AGE && age <= ATTACKER_ORIGIN_FIRST_AGE + ATTACKER_ORIGIN_DURATION - 1) +
      Number(age >= TARGET_ORIGIN_FIRST_AGE && age <= TARGET_ORIGIN_FIRST_AGE + TARGET_ORIGIN_DURATION - 1),
    rotateTaskCount:
      Number(firstRotate) * 2 + Number(restoreRotate) * 2,
    shakeTaskCount: Number(shakeActive) * 2,
    ellipseTaskActive: ellipseActive,
    sound: age === SE_M_SWIFT_AGE
      ? "SE_M_SWIFT"
      : age === SE_M_SWAGGER_AGE
        ? "SE_M_SWAGGER"
        : age === HITSPLAT_AGE
          ? "SE_M_MEGA_KICK2"
          : null,
    soundPanSide: age === SE_M_SWIFT_AGE
      ? attackerSide
      : age === SE_M_SWAGGER_AGE
        ? attackerSide
        : age === HITSPLAT_AGE
          ? targetSide
          : null,
  };
}
