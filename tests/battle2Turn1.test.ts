import { describe, expect, it } from "vitest";
import { advanceRngValue } from "../src/engine/rng.ts";
import {
  BATTLE2_ROCK_SLIDE_REUSE_SHIFT,
  INITIAL_BATTLE_SCENE_STATE,
  TICK0,
  battle2RockSlideMechanismPressTick,
  battle2Turn1RngCalls,
  sendOutHandoffTick,
} from "../src/engine/battleScene.ts";
import { ANCHOR_DRAFT_SCREEN_STATE } from "../src/engine/factoryDraftScreen.ts";
import { createInitialState, tick, type EngineState } from "../src/engine/core.ts";

const CONFIRM = 33071;

describe("Battle 2 turn 1: ONIX ROCK SLIDE mechanism/RNG timing (formerly battle2Turn1.ts, retired at the #39 rank-1 flip)", () => {
  it("rebases the proven Battle-1 animation clock onto the canonical confirm", () => {
    expect(BATTLE2_ROCK_SLIDE_REUSE_SHIFT).toBe(380);
    expect(battle2RockSlideMechanismPressTick(CONFIRM)).toBe(32691);
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

  it("registers the live second A edge and advances core RNG through 33331-equivalent", () => {
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
    expect(state.rngValue).toBe(3530724670);

    for (let i = 0; i < 260; i += 1) state = tick(state, new Set());
    expect(state.rngValue).toBe(575948139);
  });
});
