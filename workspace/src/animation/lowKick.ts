import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import {
  slideMonToOffsetAtTick,
  slideMonToOriginalPosAtTick,
} from "./slideMon.ts";

export type LowKickSide = "player" | "opponent";

export interface LowKickMatrix {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
}

export interface LowKickSprite {
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
}

export interface LowKickState {
  readonly active: boolean;
  readonly handsAndFeetLoaded: boolean;
  readonly impactLoaded: boolean;
  readonly attackerOffset: Readonly<{ x2: number; y2: number }>;
  readonly slidingFoot: LowKickSprite | null;
  readonly hitsplat: Readonly<{ x: number; y: number }> | null;
  readonly targetTransform: Readonly<{
    active: boolean;
    y2: number;
    matrix: LowKickMatrix;
  }>;
  readonly sound: "SE_M_VITAL_THROW2" | null;
  readonly soundPanSide: LowKickSide | null;
}

export const LOW_KICK_FRAME_COUNT = 33;
const IDENTITY: LowKickMatrix = { a: 256, b: 0, c: 0, d: 256 };

function rotateMatrix(rotation: number): LowKickMatrix {
  const index = (rotation >> 8) & 0xff;
  const sin = GBA_SINE_TABLE_256[index]!;
  const cos = GBA_SINE_TABLE_256[(index + 64) & 0xff]!;
  return { a: cos, b: -sin, c: sin, d: cos };
}

function targetRotation(
  age: number,
  targetSide: LowKickSide,
): { active: boolean; y2: number; matrix: LowKickMatrix } {
  if (age < 13 || age > 23) {
    return { active: false, y2: 0, matrix: IDENTITY };
  }
  const step = age <= 18 ? age - 12 : 24 - age;
  const rotation = step * 384 * (targetSide === "player" ? -1 : 1);
  const matrix = rotateMatrix(rotation);
  return {
    active: true,
    y2: targetSide === "player" ? Math.abs(matrix.c) >> 3 : 0,
    matrix,
  };
}

function attackerOffset(
  age: number,
  attackerSide: LowKickSide,
): { x2: number; y2: number } {
  if (age < 7) return { x2: 0, y2: 0 };
  if (age <= 24) {
    return slideMonToOffsetAtTick({
      battlerSide: attackerSide,
      targetXOffset: 20,
      targetYOffset: 0,
      mirrorVertical: false,
      durationTicks: 4,
    }, age - 7);
  }
  if (age <= 28) {
    const currentX2 = attackerSide === "player" ? 20 : -20;
    return slideMonToOriginalPosAtTick({
      currentX2,
      currentY2: 0,
      axisSnapMode: 1,
      durationTicks: 4,
    }, age - 25);
  }
  return { x2: 0, y2: 0 };
}

/** Pure source-relative `Move_LOW_KICK`; no gameplay fields are read. */
export function lowKickAtAge(
  age: number,
  attackerSide: LowKickSide,
  targetSide: LowKickSide,
  targetCenter: Readonly<{ x: number; y: number }>,
): LowKickState {
  const targetSign = targetSide === "opponent" ? -1 : 1;
  const footAge = age - 7;
  return {
    active: age >= 0 && age < LOW_KICK_FRAME_COUNT - 1,
    handsAndFeetLoaded: age >= 1 && age < LOW_KICK_FRAME_COUNT - 1,
    impactLoaded: age >= 4 && age < LOW_KICK_FRAME_COUNT - 1,
    attackerOffset: attackerOffset(age, attackerSide),
    slidingFoot: footAge >= 0 && footAge < 8
      ? {
          x: targetCenter.x + targetSign * 24,
          y: targetCenter.y + 28,
          x2: -targetSign * 5 * (footAge + 1),
          y2: 0,
        }
      : null,
    hitsplat: age >= 13 && age < 23
      ? {
          x: targetCenter.x + targetSign * 8,
          y: targetCenter.y + 8,
        }
      : null,
    targetTransform: targetRotation(age, targetSide),
    sound: age === 13 ? "SE_M_VITAL_THROW2" : null,
    soundPanSide: age === 13 ? targetSide : null,
  };
}
