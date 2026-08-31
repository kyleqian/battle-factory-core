/**
 * Source-relative MOVE_SAFEGUARD presentation reducer.
 *
 * This module owns only the visual script body's Guard Ring sprites, monbg
 * handoff, alpha registers, and BlendColorCycle palette program. Side-status
 * protection, turn progression, battle RNG, and controller state remain in
 * the battle engine.
 */

import {
  blendColorCycleBgYAtAge,
  blendColorCycleObjYAtAge,
  type BlendColorCycleTiming,
} from "./blendColorCycle.ts";

export type SafeguardSide = "player" | "opponent";

export const SAFEGUARD_RING_BIRTH_AGES = [7, 13, 19] as const;
export const SAFEGUARD_RING_DURATION = 13;
export const SAFEGUARD_RING_Q8_DELTA_Y = 1417;
export const SAFEGUARD_BLEND_FIRST_AGE = 34;
export const SAFEGUARD_BLEND_FIRST_VISIBLE_AGE = 36;
export const SAFEGUARD_BLEND_LAST_TASK_AGE = 64;
export const SAFEGUARD_FIRST_INACTIVE_AGE = 70;

const BLEND_TIMING: BlendColorCycleTiming = {
  legs: [{ startY: 0, targetY: 10 }, { startY: 10, targetY: 0 }],
  deltaY: 2,
};

export interface SafeguardAnimationProfile {
  /** Ordinary lowest-free allocator results captured at the presentation seam. */
  readonly ringSlots: readonly [number, number, number];
  /** `GetBattlerSpriteSubpriority(attacker) - 2`, not a species property. */
  readonly ringSubpriority: number;
}

export interface SafeguardRingSprite {
  readonly index: number;
  readonly slot: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly subpriority: number;
  readonly affineMode: "double";
  readonly objMode: "blend";
  readonly matrix: readonly [number, number, number, number];
  readonly callback: "AnimTranslateLinear_WithFollowup" | "DestroyAnimSprite";
  readonly data: readonly [number, number, number, number, number, number, number, number];
}

export interface SafeguardState {
  readonly active: boolean;
  readonly scriptActive: boolean;
  readonly sourceOffset: number | null;
  readonly sourceWait: number;
  readonly rings: readonly SafeguardRingSprite[];
  readonly monBg: Readonly<{
    readonly active: boolean;
    readonly clearing: boolean;
  }>;
  readonly alpha: Readonly<{ readonly eva: number; readonly evb: number }> | null;
  readonly blend: Readonly<{
    readonly taskActive: boolean;
    readonly bgY: number;
    readonly objY: number;
  }>;
  readonly resources: Readonly<{
    readonly tag: 10244;
    readonly loaded: boolean;
    readonly paletteTransferred: boolean;
  }>;
}

function sourceOffsetAtAge(age: number): number | null {
  if (age === 0) return 0;
  if (age >= 1 && age <= 3) return 3;
  if (age >= 4 && age <= 6) return 5;
  if (age >= 7 && age <= 12) return 21;
  if (age >= 13 && age <= 18) return 30;
  if (age >= 19 && age <= 33) return 37;
  if (age >= 34 && age <= 65) return 61;
  if (age >= 66 && age <= SAFEGUARD_FIRST_INACTIVE_AGE) return 65;
  return null;
}

function sourceWaitAtAge(age: number): number {
  if (age === 1 || age === 4) return 1;
  if (age === 7 || age === 13) return 4;
  if (age === 8 || age === 14) return 3;
  if (age === 9 || age === 15) return 2;
  if (age === 10 || age === 16) return 1;
  // The terminal inactive capture retains the script's final `wait 1`.
  return age >= 19 && age <= SAFEGUARD_FIRST_INACTIVE_AGE ? 1 : 0;
}

function ringAtAge(
  age: number,
  index: number,
  attackerCenter: Readonly<{ x: number; y: number }>,
  profile: Readonly<SafeguardAnimationProfile>,
): SafeguardRingSprite | null {
  const birthAge = SAFEGUARD_RING_BIRTH_AGES[index]!;
  const localAge = age - birthAge;
  if (localAge < 0 || localAge > SAFEGUARD_RING_DURATION) return null;
  const callbacks = Math.min(localAge + 1, SAFEGUARD_RING_DURATION);
  const accumulator = SAFEGUARD_RING_Q8_DELTA_Y * callbacks;
  const y2 = -Math.trunc(accumulator / 256);
  const complete = localAge === SAFEGUARD_RING_DURATION;
  return {
    index,
    slot: profile.ringSlots[index]!,
    x: attackerCenter.x,
    y: attackerCenter.y + 40,
    x2: 0,
    y2,
    subpriority: profile.ringSubpriority,
    affineMode: "double",
    objMode: "blend",
    matrix: [256, 0, 0, 256],
    callback: complete ? "DestroyAnimSprite" : "AnimTranslateLinear_WithFollowup",
    data: [
      Math.max(0, 12 - localAge),
      0,
      SAFEGUARD_RING_Q8_DELTA_Y,
      0,
      accumulator,
      0,
      15357,
      2058,
    ],
  };
}

/**
 * Pure port of Move_SAFEGUARD's literal three Guard Ring creates, its
 * `monbg`/`setalpha` setup, and `blend_color_cycle F_PAL_ATK_SIDE` cleanup.
 * `age=0` is the first pointer-owned Move_SAFEGUARD row.
 */
export function safeguardAtAge(
  age: number,
  attackerCenter: Readonly<{ x: number; y: number }>,
  profile: Readonly<SafeguardAnimationProfile>,
): SafeguardState {
  const rings: SafeguardRingSprite[] = [];
  for (let index = 0; index < SAFEGUARD_RING_BIRTH_AGES.length; index += 1) {
    const ring = ringAtAge(age, index, attackerCenter, profile);
    if (ring) rings.push(ring);
  }
  const blendAge = age - SAFEGUARD_BLEND_FIRST_VISIBLE_AGE;
  return {
    active: age >= 0 && age <= SAFEGUARD_FIRST_INACTIVE_AGE,
    scriptActive: age >= 0 && age < SAFEGUARD_FIRST_INACTIVE_AGE,
    sourceOffset: sourceOffsetAtAge(age),
    sourceWait: sourceWaitAtAge(age),
    rings,
    monBg: {
      active: age >= 4 && age <= 68,
      clearing: age >= 66 && age <= 68,
    },
    alpha: age >= 7 && age <= 65 ? { eva: 8, evb: 8 } : null,
    blend: {
      taskActive: age >= SAFEGUARD_BLEND_FIRST_AGE && age <= SAFEGUARD_BLEND_LAST_TASK_AGE,
      bgY: blendColorCycleBgYAtAge(blendAge, BLEND_TIMING).bgY,
      objY: blendColorCycleObjYAtAge(blendAge, BLEND_TIMING),
    },
    resources: {
      tag: 10244,
      loaded: age >= 1 && age < SAFEGUARD_FIRST_INACTIVE_AGE,
      // `LoadCompressedSpritePalette` changes RAM at age 1, then the next
      // normal palette transfer exposes it at age 2.
      paletteTransferred: age >= 2 && age < SAFEGUARD_FIRST_INACTIVE_AGE,
    },
  };
}
