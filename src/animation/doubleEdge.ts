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

function rotateMatrix(rotation: number): DoubleEdgeMatrix {
  const index = (rotation >> 8) & 0xff;
  const sin = GBA_SINE_TABLE_256[index]!;
  const cos = GBA_SINE_TABLE_256[(index + 64) & 0xff]!;
  return { a: cos, b: -sin, c: sin, d: cos };
}

/**
 * `AnimTask_RotateMonSpriteToSide(8, -256, battler, 0/1)`.
 *
 * The task runs one step per animation tick; each step adds `data[4]` (the
 * per-battler rotation increment, negated for the player side per `data[7]`)
 * to the rotation accumulator and writes the affine matrix. The first pass
 * (`restore=0`) runs 8 steps from 0; the second (`restore=1`) seeds the
 * accumulator at `8 * -256` (negated for the player side) and continues 8
 * more steps before resetting the matrix.
 */
function battlerRotation(
  step: number,
  side: DoubleEdgeSide,
  restore: boolean,
): number {
  if (restore) {
    return 8 * -256 + step * 256 * (side === "player" ? 1 : -1);
  }
  return step * 256 * (side === "player" ? 1 : -1);
}

function rotateWindow(
  age: number,
  startAge: number,
  duration: number,
  restore: boolean,
  side: DoubleEdgeSide,
): { active: boolean; matrix: DoubleEdgeMatrix } {
  const step = age - startAge + 1;
  if (step < 1 || step > duration) {
    return { active: false, matrix: IDENTITY };
  }
  return {
    active: true,
    matrix: rotateMatrix(battlerRotation(step, side, restore)),
  };
}

/**
 * `SetBattlerSpriteYOffsetFromRotation`: only the player-side battler gets the
 * `|c| >> 3` y offset; the opponent-side battler keeps its base y2.
 */
function battlerRotateY2(matrix: DoubleEdgeMatrix, side: DoubleEdgeSide): number {
  if (side !== "player") return 0;
  return Math.abs(matrix.c) >> 3;
}

function attackerOffset(
  age: number,
  attackerSide: DoubleEdgeSide,
): { x2: number; y2: number } {
  // TranslateMonEllipticalRespectSide(18, 6, 2, 4) at ages 31..62, then the
  // +20 slide-to-offset at 63..66 freezes at x2=20. The attacker keeps 20
  // through the rotate/shake block and slides back to 0 at 127..131.
  if (age >= 31 && age <= 62) {
    return wrapEllipticalOffsetAtAge(
      age - 31,
      attackerSide,
      { xRadius: 18, yRadius: 6, loops: 2, speed: 4 },
    );
  }
  if (age >= 63 && age <= 100) {
    const slide = slideMonToOffsetAtTick({
      battlerSide: attackerSide,
      targetXOffset: 20,
      targetYOffset: 0,
      mirrorVertical: false,
      durationTicks: 4,
    }, age - 63);
    return { x2: slide.x2, y2: 0 };
  }
  if (age >= 101 && age <= 126) {
    return { x2: 20, y2: 6 };
  }
  if (age >= 127 && age <= 131) {
    return slideMonToOriginalPosAtTick({
      currentX2: 20,
      currentY2: 12,
      axisSnapMode: 0,
      durationTicks: 5,
    }, age - 127);
  }
  return { x2: 0, y2: 0 };
}

function targetOffset(
  age: number,
  targetSide: DoubleEdgeSide,
): { x2: number; y2: number } {
  // Target slide-to-offset -32 (mirrored to +32 for the opponent side) at
  // ages 70..72 freezes at x2=31 through the shake, then slides back at
  // 132..138.
  if (age >= 70 && age <= 100) {
    const slide = slideMonToOffsetAtTick({
      battlerSide: targetSide,
      targetXOffset: -32,
      targetYOffset: 0,
      mirrorVertical: false,
      durationTicks: 3,
    }, age - 70);
    return { x2: slide.x2, y2: 0 };
  }
  if (age >= 101 && age <= 131) {
    return { x2: 31, y2: 0 };
  }
  if (age >= 132 && age <= 138) {
    return slideMonToOriginalPosAtTick({
      currentX2: 31,
      currentY2: 0,
      axisSnapMode: 0,
      durationTicks: 7,
    }, age - 132);
  }
  return { x2: 0, y2: 0 };
}

function shakeOffset(age: number): { x2: number; y2: number } {
  // AnimTask_ShakeMonInPlace(4, 0, 12, 1): the initializer runs its first
  // step at creation and the task dispatcher runs another step in the same
  // frame, so the displayed sequence starts one helper entry in.
  if (age < 80 || age > 101) return { x2: 0, y2: 0 };
  return shakeMonInPlaceOffsetAtTick(4, 0, 12, 1, age - 79);
}

/**
 * Pure source-relative `Move_DOUBLE_EDGE` reducer.
 *
 * `age=0` is the first frame with the move script active; `age=140` is the
 * first inactive cleanup. The attacker OBJ palette white blend (`complex`
 * blend_y1=10 / blend_y2=0, delay=4, two blends) displays at ages 4-7 and
 * 13-18; the F_PAL_BG flat-white blend displays at 63-82 and ramps 16->0
 * (delay=2) across 83-110.
 */
export function doubleEdgeAtAge(
  age: number,
  attackerSide: DoubleEdgeSide,
  targetSide: DoubleEdgeSide,
  targetCenter: Readonly<{ x: number; y: number }>,
): DoubleEdgeState {
  const firstRotate = age >= 80 && age <= 87;
  const restoreRotate = age >= 119 && age <= 126;
  const attackerMatrix = firstRotate
    ? rotateWindow(age, 80, 8, false, attackerSide)
    : restoreRotate
      ? rotateWindow(age, 119, 8, true, attackerSide)
      : age >= 88 && age <= 118
        ? { active: true, matrix: rotateMatrix(8 * 256 * (attackerSide === "player" ? 1 : -1)) }
        : { active: false, matrix: IDENTITY };
  const targetMatrix = firstRotate
    ? rotateWindow(age, 80, 8, false, targetSide)
    : restoreRotate
      ? rotateWindow(age, 119, 8, true, targetSide)
      : age >= 88 && age <= 118
        ? { active: true, matrix: rotateMatrix(8 * -256 * (targetSide === "player" ? 1 : -1)) }
        : { active: false, matrix: IDENTITY };

  const shake = shakeOffset(age);
  const baseAttacker = attackerOffset(age, attackerSide);
  const baseTarget = targetOffset(age, targetSide);
  // The shake task runs on top of the current sprite x2 during 80..101 and
  // restores to the base at 101; the attacker additionally carries the
  // rotate-derived y2 (`|c|>>3`) from 87 onward through the restore pass.
  const attackerShake = age >= 80 && age <= 100
    ? { x2: baseAttacker.x2 + shake.x2, y2: baseAttacker.y2 + shake.y2 }
    : age >= 87 && age <= 126
      ? { x2: baseAttacker.x2, y2: Math.max(baseAttacker.y2, battlerRotateY2(attackerMatrix.matrix, attackerSide)) }
      : baseAttacker;
  const targetShake = age >= 80 && age <= 100
    ? { x2: baseTarget.x2 + shake.x2, y2: baseTarget.y2 + shake.y2 }
    : baseTarget;

  const bgWhiteCoefficient =
    age < 63
      ? 0
      : age <= 82
        ? 16
        : age <= 110
          ? 16 - 2 * (1 + Math.floor((age - 83) / 4))
          : 0;

  return {
    active: age >= 0 && age < DOUBLE_EDGE_FRAME_COUNT - 1,
    impactLoaded: age >= 0 && age < DOUBLE_EDGE_FRAME_COUNT - 1,
    attackerOffset: attackerShake,
    targetOffset: targetShake,
    attackerTransform: attackerMatrix,
    targetTransform: targetMatrix,
    attackerWhiteCoefficient:
      (age >= 4 && age <= 7) || (age >= 13 && age <= 18) ? 10 : 0,
    bgWhiteCoefficient,
    hitsplat: age >= 70 && age <= 78
      ? {
          x: targetCenter.x + (targetSide === "player" ? 10 : -10),
          y: targetCenter.y,
        }
      : null,
    slideToOffsetCount:
      Number(age >= 63 && age <= 67) + Number(age >= 70 && age <= 73),
    slideToOriginalCount:
      Number(age >= 127 && age <= 131) + Number(age >= 132 && age <= 138),
    rotateTaskCount:
      Number(firstRotate) * 2 + Number(restoreRotate) * 2,
    shakeTaskCount: Number(age >= 80 && age <= 100) * 2,
    ellipseTaskActive: age >= 31 && age <= 62,
    sound: age === 4
      ? "SE_M_SWIFT"
      : age === 32
        ? "SE_M_SWAGGER"
        : age === 70
          ? "SE_M_MEGA_KICK2"
          : null,
    soundPanSide: age === 4
      ? attackerSide
      : age === 32
        ? attackerSide
        : age === 70
          ? targetSide
          : null,
  };
}
