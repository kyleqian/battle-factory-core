import { describe, expect, it } from "vitest";
import {
  TURN17_FAINT_ATTACK_ANIMATION_AGE,
  TURN17_FAINT_ATTACK_CRIT_ROLL_AGE,
  TURN17_FAINT_ATTACK_DAMAGE_ROLL_AGE,
  TURN17_FAINT_ATTACK_CURRENT_MOVE_AGE,
  TURN17_MURKROW_OWNS_AGE,
  turn17DispatchState,
} from "../src/engine/turn17.ts";

describe("turn 17 confirmation-relative dispatch", () => {
  it("pins MURKROW-first ownership and currentMove writes", () => {
    expect(turn17DispatchState(TURN17_MURKROW_OWNS_AGE - 1)).toMatchObject({
      attacker: "MAGBY",
      currentMove: null,
    });
    expect(turn17DispatchState(TURN17_MURKROW_OWNS_AGE).attacker).toBe("MURKROW");
    expect(turn17DispatchState(TURN17_FAINT_ATTACK_CURRENT_MOVE_AGE).currentMove).toBe("FAINT_ATTACK");
  });

  it("pins the no-accuracy RNG shape, no-crit result, and source/RAM 52 damage", () => {
    expect(turn17DispatchState(TURN17_FAINT_ATTACK_CRIT_ROLL_AGE - 1).rngCallsConsumed).toBe(0);
    expect(turn17DispatchState(TURN17_FAINT_ATTACK_CRIT_ROLL_AGE)).toMatchObject({
      criticalHit: false,
      rngCallsConsumed: 1,
      rngValue: 1936653909,
    });
    expect(turn17DispatchState(TURN17_FAINT_ATTACK_DAMAGE_ROLL_AGE)).toMatchObject({
      damage: 52,
      rngCallsConsumed: 2,
      rngValue: 1115590820,
    });
  });

  it("stops pre-animation ownership one tick before age 52", () => {
    expect(turn17DispatchState(TURN17_FAINT_ATTACK_ANIMATION_AGE - 1).animationOwned).toBe(false);
    expect(turn17DispatchState(TURN17_FAINT_ATTACK_ANIMATION_AGE).animationOwned).toBe(true);
  });
});
