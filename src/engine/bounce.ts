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
  readonly targetShakeY2: number;
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
const BOUNCE_SHAKE_AGES: ReadonlySet<number> =
  new Set([11, 12, 15, 16, 19, 20, 23]);

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
    targetTaskOwnsY2: effectAge >= BOUNCE_IMPACT_FIRST_AGE,
    targetShakeY2: BOUNCE_SHAKE_AGES.has(effectAge) ? 5 : 0,
  };
}
