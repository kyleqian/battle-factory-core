export type FlySide = "player" | "opponent";
export type FlyTurn = "charge" | "strike";

export interface FlyChargeBall {
  readonly a: number;
  readonly d: number;
  readonly y2: number;
}

export interface FlyStrikeBall {
  readonly x: number;
  readonly y: number;
  readonly pa: number;
  readonly pb: number;
  readonly pc: number;
  readonly pd: number;
}

export interface FlyPresentationState {
  readonly turn: FlyTurn;
  readonly attackerInvisible: boolean;
  readonly chargeBall: FlyChargeBall | null;
  readonly strikeBall: FlyStrikeBall | null;
  readonly targetShakeX2: number;
  readonly impactVisible: boolean;
}

/**
 * Source `sAffineAnim_FlyBallUp`, followed by the acceleration in
 * `AnimFlyBallUp_Step`. Age zero is the first displayed callback result.
 * The first seven entries deliberately remain subject to ISSUES #34's
 * generic affine-sampler exclusion; this is source state, not a sampler fix.
 */
export const FLY_CHARGE_BALL: readonly FlyChargeBall[] = Object.freeze([
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
  { a: 273, d: 512, y2: 0 },
  { a: 292, d: 409, y2: 0 },
  { a: 315, d: 341, y2: -1 },
  { a: 341, d: 292, y2: -3 },
  { a: 372, d: 256, y2: -6 },
  { a: 409, d: 227, y2: -11 },
  { a: 455, d: 204, y2: -17 },
  { a: 512, d: 186, y2: -24 },
  { a: 585, d: 170, y2: -33 },
  { a: 682, d: 157, y2: -43 },
  { a: 682, d: 157, y2: -54 },
  { a: 682, d: 157, y2: -67 },
  { a: 682, d: 157, y2: -81 },
  { a: 682, d: 157, y2: -96 },
  { a: 682, d: 157, y2: -113 },
]);

const FLY_STRIKE_DURATION = 20;
const FLY_IMPACT_FIRST_AGE = 22;
const FLY_IMPACT_LAST_AGE = 30;
const FLY_SHAKE_AGES: ReadonlySet<number> =
  new Set([24, 25, 28, 29, 32, 33]);

function truncDiv(numerator: number, denominator: number): number {
  return Math.trunc(numerator / denominator);
}

/**
 * Source `InitAnimLinearTranslation` / `AnimTranslateLinear`. The ball begins
 * just outside the top-left or top-right screen edge, crosses the target's
 * source animation center in 20 callbacks, and keeps the same Q8.8 velocity
 * until it leaves the opposite edge.
 */
export function flyStrikeBallAtAge(
  age: number,
  attackerSide: FlySide,
  targetCenter: Readonly<{ x: number; y: number }>,
): FlyStrikeBall | null {
  if (age < 0) return null;
  const startX = attackerSide === "player" ? -32 : 272;
  const startY = -32;
  const xStep = truncDiv(
    (targetCenter.x - startX) * 256,
    FLY_STRIKE_DURATION,
  );
  const yStep = truncDiv(
    (targetCenter.y - startY) * 256,
    FLY_STRIKE_DURATION,
  );
  const callbacks = age + 1;
  const x = startX + truncDiv(xStep * callbacks, 256);
  const y = startY + truncDiv(yStep * callbacks, 256);
  if (x < -32 || x > 272 || y < -32 || y > 192) return null;
  return attackerSide === "player"
    ? { x, y, pa: 86, pb: -241, pc: 241, pd: 86 }
    : { x, y, pa: 142, pb: 212, pc: -212, pd: 142 };
}

export function flyPresentationAtAge(
  turn: FlyTurn,
  age: number,
  attackerSide: FlySide,
  attackerCenter: Readonly<{ x: number; y: number }>,
  targetCenter: Readonly<{ x: number; y: number }>,
): FlyPresentationState {
  if (turn === "charge") {
    const chargeBall = FLY_CHARGE_BALL[age] ?? null;
    return {
      turn,
      attackerInvisible: age >= 0,
      chargeBall:
        chargeBall && attackerCenter.y + chargeBall.y2 >= -32
          ? chargeBall
          : null,
      strikeBall: null,
      targetShakeX2: 0,
      impactVisible: false,
    };
  }
  const strikeBall = flyStrikeBallAtAge(age, attackerSide, targetCenter);
  return {
    turn,
    // FlyUnleash begins while the first-turn STATUS3_ON_AIR hide is still
    // active. AnimFlyBallAttack clears that hide only when its translated
    // ball leaves the screen, so the attacker stays absent during the
    // pre-spawn script lead-in as well as the ball's visible lifetime.
    attackerInvisible: age < 30,
    chargeBall: null,
    strikeBall,
    targetShakeX2: FLY_SHAKE_AGES.has(age) ? 6 : 0,
    impactVisible:
      age >= FLY_IMPACT_FIRST_AGE && age <= FLY_IMPACT_LAST_AGE,
  };
}
