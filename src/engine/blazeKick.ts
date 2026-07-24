/**
 * Source-relative presentation facts for `Move_BLAZE_KICK`.
 *
 * Age zero is the first displayed `monbg ANIM_TARGET` frame. The seven
 * `gFireSpreadSpriteTemplate` instances are the shared `FireSpreadEffect`
 * source component also used by FIRE PUNCH. Damage, burn, and controller
 * progression are intentionally outside this reducer.
 */

export interface BlazeKickFireSpreadSprite {
  readonly index: number;
  readonly centerX: number;
  readonly centerY: number;
  readonly sheetFrame: 1 | 2 | 3;
}

export interface BlazeKickAnimationState {
  readonly targetOnMonBg: boolean;
  readonly alpha: Readonly<{ eva: 12; evb: 8 }> | null;
  readonly targetX2: number;
  readonly hitsplatVisible: boolean;
  readonly spinningFootVisible: boolean;
  readonly fireSpread: readonly BlazeKickFireSpreadSprite[];
}

export const BLAZE_KICK_MOVE_BODY_FIRST_AGE = 0;
export const BLAZE_KICK_MOVE_BODY_LAST_AGE = 77;
export const BLAZE_KICK_FIRE_SPREAD_FIRST_AGE = 35;
export const BLAZE_KICK_FIRE_SPREAD_LAST_AGE = 75;

const FIRE_SPREAD_VELOCITIES = [
  [192, 176],
  [-192, 240],
  [192, -160],
  [-192, -112],
  [160, 48],
  [-224, -32],
  [112, -128],
] as const;

export function blazeKickFireSpreadAtAge(
  age: number,
  targetCenter: Readonly<{ x: number; y: number }>,
): readonly BlazeKickFireSpreadSprite[] {
  const callbackAge = age - BLAZE_KICK_FIRE_SPREAD_FIRST_AGE;
  if (callbackAge < 0 || callbackAge > 40) return [];
  // The final captured sprite is the callback's 40th state held for the
  // destruction pass; it does not execute a 41st translation.
  const translationSteps = Math.min(callbackAge + 1, 40);
  return FIRE_SPREAD_VELOCITIES.map(([velocityX, velocityY], index) => ({
    index,
    centerX: targetCenter.x + ((velocityX * translationSteps) >> 8),
    centerY: targetCenter.y + 10 + ((velocityY * translationSteps) >> 8),
    sheetFrame: (1 + (Math.floor((callbackAge + 1) / 4) % 3)) as 1 | 2 | 3,
  }));
}

export function blazeKickAnimationAtAge(
  age: number,
  targetCenter: Readonly<{ x: number; y: number }>,
): BlazeKickAnimationState {
  const shakeAge = age - BLAZE_KICK_FIRE_SPREAD_FIRST_AGE;
  return {
    targetOnMonBg: age >= 0 && age < 77,
    alpha: age >= 3 && age < 77 ? { eva: 12, evb: 8 } : null,
    targetX2:
      shakeAge >= 0 && shakeAge < 26
        ? Math.floor(shakeAge / 2) % 2 === 0 ? -3 : 3
        : 0,
    hitsplatVisible: age >= 35 && age <= 43,
    spinningFootVisible: age >= 3 && age <= 55,
    fireSpread: blazeKickFireSpreadAtAge(age, targetCenter),
  };
}
