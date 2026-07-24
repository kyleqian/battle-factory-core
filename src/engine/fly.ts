import { shakeMonOffsetAtTick } from "./shakeMon.ts";

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
  /**
   * `AnimTask_ShakeMon` has begun writing the target sprite's `x2`.
   * While `monbg` owns the target, `Task_UpdateMonBg` mirrors that live
   * offset into BG scroll; after `clearmonbg`, the restored OBJ retains the
   * task's final zero rather than an older idle-animation offset.
   */
  readonly targetTaskOwnsX2: boolean;
  readonly targetShakeX2: number;
  readonly impactVisible: boolean;
  /**
   * Source `SortSprites` keeps a persistent order and insertion-sorts equal
   * priority sprites using the prior final-OAM Y. In the player trajectory,
   * the newly-created hitsplat precedes the still-live ball on their first
   * displayed overlap; the opponent trajectory retains ball precedence.
   */
  readonly impactWinsBallOamTie: boolean;
}

/**
 * Source `sAffineAnim_FlyBallUp`, followed by the acceleration in
 * `AnimFlyBallUp_Step`. Age zero is the first displayed callback result.
 * Layer/terrain occlusion is intentionally presentation-owned rather than
 * baked into this source-state table.
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

/**
 * `AnimTask_ShakeMon(ANIM_TARGET,6,0,8,1)` (`FlyUnleash`,
 * `battle_anim_scripts.s:6418`) is created in the SAME script-command batch
 * as the hitsplat (zero `delay` between `create_basic_hitsplat_sprite` and
 * the `createvisualtask`, both executed inside one `RunAnimScriptCommand`
 * do-while pass per `battle_anim.c`), so its creation display age is
 * `FLY_IMPACT_FIRST_AGE`, same as the hitsplat's own first-visible age.
 *
 * RAM-probe evidence (both strike comparators,
 * `dump-fly-shakemon-tasks.py`): at the task's OWN first observable RAM
 * tick, `data[1]` (numTimes) already reads one less than the source's
 * `AnimTask_ShakeMon`, this call site's task priority (5, vs QUICK_ATTACK's
 * 2) causes `InsertTask` to place it AFTER the calling controller task's
 * current position in `RunTasks`'s same-frame traversal, so `RunTasks`
 * revisits and steps it a second time before that frame ever renders,
 * collapsing the port's tick 0 (the creation-time synchronous self-call,
 * x2 still holds `xOffset`) and tick 1 (the first regular toggle, back to
 * zero) into one displayed tick. Every later tick is a normal 1:1 step.
 * QUICK_ATTACK's priority-2 call site does not trigger this: its own
 * tick 0 is directly visible (`tests/shakeMon.test.ts`).
 */
const FLY_SHAKE_CREATION_AGE = FLY_IMPACT_FIRST_AGE;

function truncDiv(numerator: number, denominator: number): number {
  return Math.trunc(numerator / denominator);
}

/**
 * `InitAnimLinearTranslation` stores magnitude in Q8.8 and reserves bit 0
 * as the direction flag: positive deltas clear it, negative deltas set it.
 * That parity coercion is observable when an otherwise-odd positive step
 * crosses an integer boundary.
 */
function linearDeltaQ8(start: number, end: number): number {
  const distance = end - start;
  const magnitude = truncDiv(
    Math.abs(distance) * 256,
    FLY_STRIKE_DURATION,
  );
  return distance < 0 ? -(magnitude | 1) : magnitude & ~1;
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
  const xStep = linearDeltaQ8(startX, targetCenter.x);
  const yStep = linearDeltaQ8(startY, targetCenter.y);
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
      targetTaskOwnsX2: false,
      targetShakeX2: 0,
      impactVisible: false,
      impactWinsBallOamTie: false,
    };
  }
  const strikeBall = flyStrikeBallAtAge(age, attackerSide, targetCenter);
  return {
    turn,
    // FlyUnleash begins while the first-turn STATUS3_ON_AIR hide is still
    // active. AnimFlyBallAttack clears that hide only when its translated
    // ball leaves the screen, so the attacker stays absent during the
    // pre-spawn script lead-in as well as the ball's visible lifetime.
    attackerInvisible: age < 0 || strikeBall !== null,
    chargeBall: null,
    strikeBall,
    targetTaskOwnsX2: age >= FLY_IMPACT_FIRST_AGE,
    // +1: skip the port's tick 0, collapsed into the creation tick itself
    // by the same-frame double-step documented on FLY_SHAKE_CREATION_AGE.
    // Guard age < creationAge explicitly: shakeMonOffsetAtTick's own
    // tick-0 (nonzero) would otherwise leak into the +1 shift's tick -1.
    targetShakeX2: age < FLY_SHAKE_CREATION_AGE
      ? 0
      : shakeMonOffsetAtTick(6, 0, 8, 1, age - FLY_SHAKE_CREATION_AGE + 1).x2,
    impactVisible:
      age >= FLY_IMPACT_FIRST_AGE && age <= FLY_IMPACT_LAST_AGE,
    impactWinsBallOamTie:
      attackerSide === "player" && age === FLY_IMPACT_FIRST_AGE,
  };
}
