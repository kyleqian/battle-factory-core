// Turn 17's pre-animation dispatch, expressed only as ages from the stored
// FIRE_PUNCH confirmation edge. Source/RAM ground truth:
// docs/turn17-notes.md §§2-4 and the committed full per-tick RAM dump.

import { advanceRngValue } from "./rng.ts";

export const TURN17_MURKROW_OWNS_AGE = 5;
export const TURN17_FAINT_ATTACK_CURRENT_MOVE_AGE = 6;
export const TURN17_FAINT_ATTACK_CRIT_ROLL_AGE = 42;
export const TURN17_FAINT_ATTACK_DAMAGE_ROLL_AGE = 45;
export const TURN17_FAINT_ATTACK_ANIMATION_AGE = 52;

export const TURN17_RNG_BEFORE_CRIT = 1239728170;
export const TURN17_RNG_AFTER_CRIT = advanceRngValue(TURN17_RNG_BEFORE_CRIT);
export const TURN17_RNG_AFTER_DAMAGE = advanceRngValue(TURN17_RNG_AFTER_CRIT);

export interface Turn17DispatchState {
  attacker: "MAGBY" | "MURKROW";
  currentMove: "FAINT_ATTACK" | null;
  criticalHit: boolean;
  damage: number;
  rngCallsConsumed: 0 | 1 | 2;
  rngValue: number;
  animationOwned: boolean;
}

/**
 * The selected moves hand off to the faster MURKROW, then run
 * FAINT_ATTACK's always-hit path: no accuracy draw, one crit draw, and one
 * damage-variance draw. Rendering ownership begins only at age 52.
 */
export function turn17DispatchState(age: number): Turn17DispatchState {
  const critConsumed = age >= TURN17_FAINT_ATTACK_CRIT_ROLL_AGE;
  const damageConsumed = age >= TURN17_FAINT_ATTACK_DAMAGE_ROLL_AGE;
  return {
    attacker: age >= TURN17_MURKROW_OWNS_AGE ? "MURKROW" : "MAGBY",
    currentMove: age >= TURN17_FAINT_ATTACK_CURRENT_MOVE_AGE ? "FAINT_ATTACK" : null,
    criticalHit: false,
    damage: damageConsumed ? 52 : 0,
    rngCallsConsumed: damageConsumed ? 2 : critConsumed ? 1 : 0,
    rngValue: damageConsumed
      ? TURN17_RNG_AFTER_DAMAGE
      : critConsumed
        ? TURN17_RNG_AFTER_CRIT
        : TURN17_RNG_BEFORE_CRIT,
    animationOwned: age >= TURN17_FAINT_ATTACK_ANIMATION_AGE,
  };
}
