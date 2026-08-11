import { shakeMon2OffsetAtTick } from "./shakeMon2.ts";

export type MegaPunchSide = "player" | "opponent";
export type MegaPunchKickVariant = 0 | 1;
export type MegaPunchKickSound =
  | "SE_M_MEGA_KICK"
  | "SE_M_VITAL_THROW2"
  | "SE_M_MEGA_KICK2";

export interface MegaPunchAffineMatrix {
  readonly pa: number;
  readonly pb: number;
  readonly pc: number;
  readonly pd: number;
}

export interface MegaPunchKickProfile {
  /** `gBattleAnimArgs[2]`: fist (0) for Punch, wide foot (1) for Kick. */
  readonly fistVariant: MegaPunchKickVariant;
  /** Fresh pointer-isolated receipt: setalpha's first RAM-visible age. */
  readonly alphaFirstAge: number;
  /** The move body's second source-owned sound cue. */
  readonly secondSound: Exclude<MegaPunchKickSound, "SE_M_MEGA_KICK">;
  readonly secondSoundAge: number;
}

export interface MegaPunchKickState {
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
    variant: MegaPunchKickVariant;
    matrix: MegaPunchAffineMatrix;
  }> | null;
  readonly hitsplatVisible: boolean;
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  readonly sound: MegaPunchKickSound | null;
  readonly soundPanSide: MegaPunchSide | null;
}

/** Alias retained for existing Move_MEGA_PUNCH consumers. */
export type MegaPunchState = MegaPunchKickState;

export const MEGA_PUNCH_FRAME_COUNT = 160;
export const MEGA_PUNCH_FIST_FIRST_AGE = 14;
export const MEGA_PUNCH_IMPACT_FIRST_AGE = 71;

export const MEGA_PUNCH_PROFILE: MegaPunchKickProfile = {
  fistVariant: 0,
  alphaFirstAge: 15,
  secondSound: "SE_M_VITAL_THROW2",
  secondSoundAge: MEGA_PUNCH_IMPACT_FIRST_AGE,
};

/**
 * Pointer-isolated Scene-ON Mega Kick receipt, both SUDOWOODO orientations:
 * `setalpha` appears at source age 14 and the extra `SE_M_MEGA_KICK2` lands
 * at age 66 before SetImpactBackground. The rest remains the shared body.
 */
export const MEGA_KICK_PROFILE: MegaPunchKickProfile = {
  fistVariant: 1,
  alphaFirstAge: 14,
  secondSound: "SE_M_MEGA_KICK2",
  secondSoundAge: 66,
};

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

/**
 * Pure source-relative Mega Punch/Kick body; damage and RNG stay gameplay-owned.
 * A move's profile is explicit so shared command shape never silently imports a
 * cue or latch from its sibling script.
 */
export function megaPunchKickAtAge(
  age: number,
  targetSide: MegaPunchSide,
  targetCenter: Readonly<{ x: number; y: number }>,
  profile: MegaPunchKickProfile,
): MegaPunchKickState {
  const fistMatrix = megaPunchFistMatrixAtAge(age);
  const impact = age >= MEGA_PUNCH_IMPACT_FIRST_AGE && age < 142;
  const complexBlack = age >= 72 && age <= 74 ? 8 : 0;
  return {
    active: age >= 0 && age < MEGA_PUNCH_FRAME_COUNT - 1,
    impactLoaded: age >= 1 && age < MEGA_PUNCH_FRAME_COUNT - 1,
    handsAndFeetLoaded: age >= 2 && age < MEGA_PUNCH_FRAME_COUNT - 1,
    targetOnMonBg: age >= 3 && age < 114,
    alpha: age >= profile.alphaFirstAge && age < 114 ? { eva: 12, evb: 8 } : null,
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
      ? {
          x: targetCenter.x,
          y: targetCenter.y,
          variant: profile.fistVariant,
          matrix: fistMatrix,
        }
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
      : age === profile.secondSoundAge
        ? profile.secondSound
        : null,
    soundPanSide: age === 14 || age === profile.secondSoundAge
      ? targetSide
      : null,
  };
}

/** Pure source-relative `Move_MEGA_PUNCH`; damage and RNG remain gameplay-owned. */
export function megaPunchAtAge(
  age: number,
  targetSide: MegaPunchSide,
  targetCenter: Readonly<{ x: number; y: number }>,
): MegaPunchState {
  return megaPunchKickAtAge(age, targetSide, targetCenter, MEGA_PUNCH_PROFILE);
}
