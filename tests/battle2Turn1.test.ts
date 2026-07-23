import { describe, expect, it } from "vitest";
import { advanceRngValue } from "../src/engine/rng.ts";
import {
  BATTLE2_ROCK_SLIDE_DAMAGE,
  BATTLE2_TURN1_LAST_ONIX_FRAME_DELAY,
  BATTLE2_TURN1_OPPONENT_HANDOFF_DELAY,
  battle2RockSlideDamage,
  battle2RockSlideMechanismPressTick,
  battle2Turn1Order,
  battle2Turn1RngCalls,
  battle2Turn1State,
} from "../src/engine/battle2Turn1.ts";

const CONFIRM = 33071;

describe("Battle 2 turn 1: ONIX ROCK SLIDE through the opponent handoff", () => {
  it("rebases the proven Battle-1 animation clock onto the canonical confirm", () => {
    expect(battle2RockSlideMechanismPressTick(CONFIRM)).toBe(32691);
    expect(battle2Turn1State(CONFIRM, CONFIRM).age).toBe(0);
  });

  it("orders ONIX (speed 76) before KABUTO (speed 61) without a tie draw", () => {
    expect(battle2Turn1Order()).toEqual([0, 1]);
  });

  it("commits ROCK SLIDE PP 10->9 at frame 33107", () => {
    expect(battle2Turn1State(33106, CONFIRM).onixRockSlidePp).toBe(10);
    expect(battle2Turn1State(33107, CONFIRM).onixRockSlidePp).toBe(9);
  });

  it("consumes accuracy, spread, and non-proc secondary RNG only", () => {
    expect(battle2Turn1RngCalls(33081, CONFIRM)).toBe(0);
    expect(battle2Turn1RngCalls(33082, CONFIRM)).toBe(1);
    expect(battle2Turn1RngCalls(33108, CONFIRM)).toBe(1);
    expect(battle2Turn1RngCalls(33109, CONFIRM)).toBe(2);
    expect(battle2Turn1RngCalls(33322, CONFIRM)).toBe(2);
    expect(battle2Turn1RngCalls(33323, CONFIRM)).toBe(3);

    let rng = 3530724670;
    const values: number[] = [];
    for (let i = 0; i < 3; i += 1) {
      rng = advanceRngValue(rng);
      values.push(rng);
    }
    expect(values).toEqual([2956382169, 2508258776, 575948139]);
  });

  it("derives 19 base -> 28 STAB damage, noncritical through BATTLE ARMOR", () => {
    expect(battle2RockSlideDamage()).toEqual({
      base: 19,
      afterStab: 28,
      final: BATTLE2_ROCK_SLIDE_DAMAGE,
      isCritical: false,
    });
    expect(battle2Turn1State(33108, CONFIRM).moveDamage).toBe(19);
    expect(battle2Turn1State(33109, CONFIRM).moveDamage).toBe(28);
  });

  it("drains KABUTO's displayed bar 91->63 before the stable HP commit", () => {
    expect(battle2Turn1State(33288, CONFIRM).kabutoDisplayHp).toBe(91);
    expect(battle2Turn1State(33289, CONFIRM).kabutoDisplayHp).toBe(90);
    expect(battle2Turn1State(33316, CONFIRM).kabutoDisplayHp).toBe(63);
    expect(battle2Turn1State(33317, CONFIRM).kabutoHp).toBe(91);
    expect(battle2Turn1State(33318, CONFIRM).kabutoHp).toBe(63);
  });

  it("records a non-flinch and stops ONIX ownership one frame before KABUTO", () => {
    const lastOnix = battle2Turn1State(CONFIRM + BATTLE2_TURN1_LAST_ONIX_FRAME_DELAY, CONFIRM);
    expect(lastOnix).toMatchObject({
      attacker: 0,
      currentMove: 157,
      secondaryChecked: true,
      flinched: false,
      opponentHandoffReady: false,
    });
    expect(
      battle2Turn1State(CONFIRM + BATTLE2_TURN1_OPPONENT_HANDOFF_DELAY, CONFIRM)
        .opponentHandoffReady,
    ).toBe(true);
  });
});
