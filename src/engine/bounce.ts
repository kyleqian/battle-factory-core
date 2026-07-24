export type BounceTurn = "charge" | "strike";

export interface BounceBall {
  readonly a: number;
  readonly d: number;
  readonly y2: number;
}

export interface BouncePresentationState {
  readonly turn: BounceTurn;
  readonly attackerInvisible: boolean;
  readonly ball: BounceBall | null;
  readonly impactVisible: boolean;
  readonly targetTaskOwnsY2: boolean;
  readonly targetBaseOffsetReset: boolean;
  readonly targetShakeY2: number;
}

export interface BounceElectricitySprite {
  readonly x: number;
  readonly y: number;
  readonly frame: 0 | 1 | 2;
  readonly hFlip: boolean;
  readonly vFlip: boolean;
}

const ELECTRICITY_SPAWNS = [
  { x: 5, y: 0, frame: 0 },
  { x: -5, y: 10, frame: 1 },
  { x: 15, y: 20, frame: 2 },
  { x: -15, y: -10, frame: 0 },
  { x: 25, y: 0, frame: 1 },
  { x: -8, y: 8, frame: 2 },
  { x: 2, y: -8, frame: 0 },
  { x: -20, y: 15, frame: 1 },
] as const;

/**
 * Source `ElectricityEffect`: eight 16x16 sprites, delayed two animation
 * script ticks apart. The controller's animation-script scheduler exposes
 * those as four video frames here; `WaitAnimForDuration(5)` contributes six
 * displayed OAM frames.
 */
export function bounceParalysisElectricityAtAge(
  age: number,
  firstDisplayedAge: number,
  targetCenter: Readonly<{ x: number; y: number }>,
): readonly BounceElectricitySprite[] {
  return ELECTRICITY_SPAWNS.flatMap((spawn, index) => {
    const localAge = age - firstDisplayedAge - index * 4;
    if (localAge < 0 || localAge > 5) return [];
    return [{
      x: targetCenter.x + spawn.x - 8,
      y: targetCenter.y + spawn.y - 8,
      frame: spawn.frame,
      hFlip: spawn.frame === 1,
      vFlip: spawn.frame === 2,
    }];
  });
}

/** Displayed `AnimTask_ShakeMon2(ANIM_ATTACKER,1,0,10,1)` x2. */
export function bounceParalysisShakeX2AtAge(
  age: number,
  firstDisplayedAge: number,
): number {
  const localAge = age - firstDisplayedAge;
  if (localAge < 0 || localAge >= 21) return 0;
  if (localAge === 0) return 1;
  return Math.floor((localAge + 1) / 2) % 2 === 1 ? -1 : 1;
}

/**
 * Source `sAffineAnim_BounceBallShrink`, sampled after the first displayed
 * callback. The table is independently pinned by final sprite/OAM state from
 * the legal Level-50 SPOINK stage; it is not FLY's later acceleration phase.
 */
export const BOUNCE_CHARGE_BALL: readonly BounceBall[] = Object.freeze([
  { a: 1170, d: 256, y2: 0 },
  { a: 682, d: 256, y2: 0 },
  { a: 481, d: 256, y2: 0 },
  { a: 372, d: 256, y2: 0 },
  { a: 303, d: 256, y2: 0 },
  { a: 256, d: 256, y2: 0 },
  { a: 256, d: 292, y2: 0 },
  { a: 256, d: 341, y2: 0 },
  { a: 256, d: 409, y2: 0 },
  { a: 256, d: 512, y2: 0 },
  { a: 256, d: 682, y2: 0 },
  { a: 277, d: 682, y2: 0 },
  { a: 303, d: 682, y2: 0 },
  { a: 334, d: 682, y2: 0 },
  { a: 372, d: 682, y2: 0 },
  { a: 420, d: 682, y2: 0 },
  { a: 481, d: 682, y2: 0 },
  { a: 564, d: 682, y2: 0 },
  { a: 682, d: 862, y2: 0 },
  { a: 862, d: 1170, y2: 0 },
  { a: 1170, d: 1820, y2: 0 },
  { a: 1820, d: 4096, y2: 0 },
  { a: 4096, d: -16384, y2: 0 },
  { a: 4096, d: -16384, y2: 0 },
]);

const BOUNCE_STRIKE_FIRST_Y2 = -102;
const BOUNCE_STRIKE_LAST_AGE = 23;
const BOUNCE_IMPACT_FIRST_AGE = 9;
const BOUNCE_IMPACT_LAST_AGE = 17;
const BOUNCE_TARGET_TASK_LAST_AGE = 29;
const BOUNCE_SHAKE_AGES: ReadonlySet<number> =
  new Set([11, 12, 15, 16, 19, 20, 23, 24, 27, 28]);

/**
 * Source `AnimBounceBallLand`: begin 32 px above the screen, descend 10 px
 * per callback, overshoot the target by 8 px, then rebound upward until the
 * 64 px affine-double object is wholly offscreen.
 */
export function bounceStrikeBallAtAge(age: number): BounceBall | null {
  if (age < 0 || age > BOUNCE_STRIKE_LAST_AGE) return null;
  const descentAge = Math.min(age, 11);
  const y2 = age <= 11
    ? BOUNCE_STRIKE_FIRST_Y2 + descentAge * 10
    : 8 - (age - 11) * 10;
  return { a: 409, d: 256, y2 };
}

export function bouncePresentationAtAge(
  turn: BounceTurn,
  age: number,
  strikeEffectDelay = 0,
  strikeAttackerRestoreAge = Number.POSITIVE_INFINITY,
): BouncePresentationState {
  if (turn === "charge") {
    return {
      turn,
      attackerInvisible: age >= 0,
      ball: BOUNCE_CHARGE_BALL[age] ?? null,
      impactVisible: false,
      targetTaskOwnsY2: false,
      targetBaseOffsetReset: false,
      targetShakeY2: 0,
    };
  }
  const ball = bounceStrikeBallAtAge(age);
  const effectAge = age - strikeEffectDelay;
  return {
    turn,
    attackerInvisible:
      age < 0
      || (ball !== null && age < strikeAttackerRestoreAge),
    ball,
    impactVisible:
      effectAge >= BOUNCE_IMPACT_FIRST_AGE
      && effectAge <= BOUNCE_IMPACT_LAST_AGE,
    targetTaskOwnsY2:
      effectAge >= BOUNCE_IMPACT_FIRST_AGE
      && effectAge <= BOUNCE_TARGET_TASK_LAST_AGE,
    targetBaseOffsetReset: effectAge >= BOUNCE_IMPACT_FIRST_AGE,
    targetShakeY2: BOUNCE_SHAKE_AGES.has(effectAge) ? 5 : 0,
  };
}
