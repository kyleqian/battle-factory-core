import { blendColorCycleObjYAtAge } from "./blendColorCycle.ts";
import { shakeMon2OffsetAtTick } from "./shakeMon2.ts";

/** Pointer ages measured from the first in-bounds `Move_NIGHT_SHADE` frame. */
export const NIGHT_SHADE_CLONE_START_AGE = 55;
export const NIGHT_SHADE_TARGET_EFFECT_START_AGE = 127;
export const NIGHT_SHADE_CLONE_RESET_AGE = 182;
export const NIGHT_SHADE_CLONE_DISPLAY_END_AGE = 182;
export const NIGHT_SHADE_FRAME_COUNT = 228;

const TARGET_BLEND = Object.freeze({
  legs: [
    Object.freeze({ startY: 0, targetY: 13 }),
    Object.freeze({ startY: 13, targetY: 0 }),
  ],
  deltaY: 2,
});

const FADE_BLDY: readonly number[] = [
  0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
  16, 16, 16, 16, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3,
  2, 1, 0,
];

export function nightShadeBackgroundBldy(age: number): number {
  return FADE_BLDY[age - 3] ?? FADE_BLDY[age - 187] ?? 0;
}

export function nightShadeBackgroundIsGhost(age: number): boolean {
  return age >= 22 && age <= 207;
}

export interface NightShadeState {
  readonly age: number;
  readonly active: boolean;
  readonly cloneTaskActive: boolean;
  readonly cloneMatrix: number;
  readonly cloneAlpha: Readonly<{ eva: number; evb: number }>;
  readonly targetX2: number;
  readonly targetBlackCoeff: number;
}

/** Pure port of the task/script timing; display latches are named inline. */
export function nightShadeAtAge(age: number): NightShadeState {
  const cloneTaskActive = age >= NIGHT_SHADE_CLONE_START_AGE
    && age < NIGHT_SHADE_CLONE_RESET_AGE;
  // Creation's SetSpriteRotScale reaches hardware in one transfer. Later
  // Step2 writes and ResetSpriteRotScale reach scanout after two transfers.
  let cloneMatrix = 256;
  if (age >= NIGHT_SHADE_CLONE_START_AGE + 1 && age < 169) cloneMatrix = 128;
  else if (age >= 169 && age <= 184) cloneMatrix = 136 + (age - 169) * 8;
  const alphaStep = age >= 58 && age <= NIGHT_SHADE_CLONE_DISPLAY_END_AGE
    ? Math.min(9, Math.floor((age - NIGHT_SHADE_CLONE_START_AGE) / 3))
    : 0;
  const cloneAlpha = alphaStep === 0
    ? Object.freeze({ eva: 0, evb: age >= NIGHT_SHADE_CLONE_START_AGE && age < 183 ? 16 : 0 })
    : Object.freeze({ eva: alphaStep, evb: 16 - alphaStep });
  // AnimTask_ShakeMon2's synchronous first flip is RAM age 127. Night
  // Shade's own bilateral maps show its OAM position at RAM+2.
  const targetX2 = shakeMon2OffsetAtTick(
    2, 0, 12, 1,
    age - NIGHT_SHADE_TARGET_EFFECT_START_AGE - 1,
  ).x2;
  const targetBlackCoeff = blendColorCycleObjYAtAge(
    age - NIGHT_SHADE_TARGET_EFFECT_START_AGE - 1,
    TARGET_BLEND,
  );
  return {
    age,
    active: age >= 0 && age < NIGHT_SHADE_FRAME_COUNT,
    cloneTaskActive,
    cloneMatrix,
    cloneAlpha,
    targetX2,
    targetBlackCoeff,
  };
}
