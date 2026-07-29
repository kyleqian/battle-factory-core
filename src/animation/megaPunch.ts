import { shakeMon2OffsetAtTick } from "./shakeMon2.ts";

export type MegaPunchSide = "player" | "opponent";

export interface MegaPunchAffineMatrix {
  readonly pa: number;
  readonly pb: number;
  readonly pc: number;
  readonly pd: number;
}

export interface MegaPunchState {
  readonly active: boolean;
  readonly impactLoaded: boolean;
  readonly handsAndFeetLoaded: boolean;
  readonly targetOnMonBg: boolean;
  readonly alpha: Readonly<{ eva: 12; evb: 8 }> | null;
  readonly background: Readonly<{
    variant: MegaPunchSide;
    impact: boolean;
    blackCoefficient: number;
    restoreBldy: number;
  }>;
  readonly targetWhiteCoefficient: number;
  readonly battlerBlackCoefficient: number;
  readonly fist: Readonly<{
    x: number;
    y: number;
    variant: 0;
    matrix: MegaPunchAffineMatrix;
  }> | null;
  readonly hitsplatVisible: boolean;
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  readonly sound: "SE_M_MEGA_KICK" | "SE_M_VITAL_THROW2" | null;
  readonly soundPanSide: MegaPunchSide | null;
}

export const MEGA_PUNCH_FRAME_COUNT = 160;
export const MEGA_PUNCH_FIST_FIRST_AGE = 14;
export const MEGA_PUNCH_IMPACT_FIRST_AGE = 71;

/**
 * `sAffineAnim_MegaPunchKick`: Q8.8 scale -4 and rotation +20 for 51
 * scheduler callbacks. mGBA's HLE ObjAffineSet uses real trig before signed
 * word truncation, matching the established Blaze Kick affine component.
 */
export function megaPunchFistMatrixAtAge(
  age: number,
): MegaPunchAffineMatrix | null {
  if (age < MEGA_PUNCH_FIST_FIRST_AGE || age > 87) return null;
  if (age >= 65) return { pa: 256, pb: 0, pc: 0, pd: 256 };
  const step = age - MEGA_PUNCH_FIST_FIRST_AGE + 1;
  const scaleAccumulator = 256 - step * 4;
  const inverseScale = Math.trunc(0x10000 / scaleAccumulator);
  const radians = ((step * 20) & 0xff) * 2 * Math.PI / 256;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return {
    pa: Math.trunc(inverseScale * cosine),
    pb: Math.trunc(-inverseScale * sine),
    pc: Math.trunc(inverseScale * sine),
    pd: Math.trunc(inverseScale * cosine),
  };
}

function fieldBlackCoefficient(age: number): number {
  if (age < 16) return 0;
  return Math.min(16, 2 + 2 * Math.floor((age - 16) / 2));
}

function targetWhiteCoefficient(age: number): number {
  if (age < 19 || age >= 72) return 0;
  return Math.min(7, 1 + Math.floor((age - 19) / 3));
}

function restoreBldy(age: number): number {
  if (age < 122) return 0;
  if (age <= 137) return age - 121;
  if (age <= 141) return 16;
  if (age <= 157) return 157 - age;
  return 0;
}

/** Pure source-relative `Move_MEGA_PUNCH`; damage and RNG remain gameplay-owned. */
export function megaPunchAtAge(
  age: number,
  targetSide: MegaPunchSide,
  targetCenter: Readonly<{ x: number; y: number }>,
): MegaPunchState {
  const fistMatrix = megaPunchFistMatrixAtAge(age);
  const impact = age >= MEGA_PUNCH_IMPACT_FIRST_AGE && age < 142;
  const complexBlack = age >= 72 && age <= 74 ? 8 : 0;
  return {
    active: age >= 0 && age < MEGA_PUNCH_FRAME_COUNT - 1,
    impactLoaded: age >= 1 && age < MEGA_PUNCH_FRAME_COUNT - 1,
    handsAndFeetLoaded: age >= 2 && age < MEGA_PUNCH_FRAME_COUNT - 1,
    targetOnMonBg: age >= 3 && age < 114,
    alpha: age >= 15 && age < 114 ? { eva: 12, evb: 8 } : null,
    background: {
      variant: targetSide,
      impact,
      blackCoefficient: impact
        ? complexBlack
        : age < MEGA_PUNCH_IMPACT_FIRST_AGE
          ? fieldBlackCoefficient(age)
          : 0,
      restoreBldy: restoreBldy(age),
    },
    targetWhiteCoefficient: targetWhiteCoefficient(age),
    battlerBlackCoefficient: complexBlack,
    fist: fistMatrix
      ? { x: targetCenter.x, y: targetCenter.y, variant: 0, matrix: fistMatrix }
      : null,
    hitsplatVisible: age >= MEGA_PUNCH_IMPACT_FIRST_AGE && age <= 79,
    targetOffset: age < MEGA_PUNCH_IMPACT_FIRST_AGE
      ? { x2: 0, y2: 0 }
      : shakeMon2OffsetAtTick(
          4,
          0,
          22,
          1,
          age - MEGA_PUNCH_IMPACT_FIRST_AGE + 1,
        ),
    sound: age === 14
      ? "SE_M_MEGA_KICK"
      : age === MEGA_PUNCH_IMPACT_FIRST_AGE
        ? "SE_M_VITAL_THROW2"
        : null,
    soundPanSide: age === 14 || age === MEGA_PUNCH_IMPACT_FIRST_AGE
      ? targetSide
      : null,
  };
}
