import { describe, expect, it } from "vitest";
import { advanceRngValue } from "../src/engine/rng.ts";
import {
  INITIAL_BATTLE_SCENE_STATE,
  TICK0,
  sendOutHandoffTick,
} from "../src/engine/battleScene.ts";
import { ANCHOR_DRAFT_SCREEN_STATE } from "../src/engine/factoryDraftScreen.ts";
import { createInitialState, tick, type EngineState } from "../src/engine/core.ts";
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

  it("registers the live second A edge and advances core RNG/state through 33331-equivalent", () => {
    const sendOutPress = 1326;
    const handoff = sendOutHandoffTick(sendOutPress, "jenson");
    const openTick = handoff + 461;
    const confirmTick = openTick + 40;
    let state: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      rngValue: 3530724670,
      draftScreen: {
        ...ANCHOR_DRAFT_SCREEN_STATE,
        selectedIds: [1, 2, 3, 0, 0, 0],
      },
      battleScene: {
        ...INITIAL_BATTLE_SCENE_STATE,
        encounter: "jenson",
        elapsed: openTick - TICK0 - 1,
        sendOutPressElapsed: sendOutPress - TICK0,
      },
    };

    state = tick(state, new Set(["A"]));
    for (let i = 0; i < 39; i += 1) state = tick(state, new Set());
    state = tick(state, new Set(["A"]));
    expect(TICK0 + state.battleScene!.fightSubmenu.confirmElapsed!).toBe(confirmTick);
    expect(state.battle2Turn1).toMatchObject({
      age: 0,
      currentMove: 0,
      onixRockSlidePp: 10,
      rngCalls: 0,
    });

    for (let i = 0; i < 260; i += 1) state = tick(state, new Set());
    expect(state.rngValue).toBe(575948139);
    expect(state.battle2Turn1).toMatchObject({
      age: 260,
      attacker: 0,
      currentMove: 157,
      onixRockSlidePp: 9,
      moveDamage: 28,
      kabutoDisplayHp: 63,
      kabutoHp: 63,
      secondaryChecked: true,
      flinched: false,
      opponentHandoffReady: false,
    });
  });
});
