import { describe, expect, it } from "vitest";
import {
  ACTION_MENU_BLANK_END_OFFSET,
  ACTION_MENU_BLANK_START_OFFSET,
  ACTION_MENU_REVEAL_OFFSET,
  BATTLE2_ACTION_MENU_MODEL,
  actionMenuBounceTick,
  actionMenuInputReady,
  advanceBattle2PreTurnRng,
  battle2PreTurnRngCalls,
} from "../src/engine/battle2ActionMenu.ts";
import {
  INITIAL_BATTLE_SCENE_STATE,
  KABUTO_SENDOUT_BATTLER,
  ONIX_MENU_BATTLER,
  TICK0,
  sendOutHandoffTick,
} from "../src/engine/battleScene.ts";
import { CLOSED_FIGHT_SUBMENU_STATE } from "../src/engine/battleMenu.ts";
import { createInitialState, tick, type EngineState } from "../src/engine/core.ts";

describe("Battle 2 first action-menu controller boundaries", () => {
  const canonicalHandoff = 32570;

  it("pins the corrected six-frame blank and atomic input-ready reveal", () => {
    expect(ACTION_MENU_BLANK_START_OFFSET).toBe(325);
    expect(ACTION_MENU_BLANK_END_OFFSET).toBe(330);
    expect(ACTION_MENU_REVEAL_OFFSET).toBe(331);
    expect(canonicalHandoff + ACTION_MENU_BLANK_START_OFFSET).toBe(32895);
    expect(canonicalHandoff + ACTION_MENU_BLANK_END_OFFSET).toBe(32900);
    expect(canonicalHandoff + ACTION_MENU_REVEAL_OFFSET).toBe(32901);
    expect(actionMenuInputReady(32900, canonicalHandoff)).toBe(false);
    expect(actionMenuInputReady(32901, canonicalHandoff)).toBe(true);
  });

  it("restarts the shared Battle-1 bounce generator at the atomic reveal", () => {
    expect(actionMenuBounceTick(32901, canonicalHandoff)).toBe(1748);
    expect(actionMenuBounceTick(32902, canonicalHandoff)).toBe(1749);
  });
});
describe("Battle 2 encounter-driven menu model", () => {
  it("composes JENSON's KABUTO against the healed rental ONIX", () => {
    expect(BATTLE2_ACTION_MENU_MODEL).toEqual({
      encounter: "jenson",
      promptBattler: "ONIX",
      options: ["FIGHT", "BAG", "POKéMON", "RUN"],
      cursor: 0,
      player: {
        species: 95,
        name: "ONIX",
        level: 50,
        hp: 117,
        maxHP: 117,
        gender: "male",
      },
      opponent: {
        species: 140,
        name: "KABUTO",
        level: 50,
        hp: 91,
        maxHP: 91,
        gender: "male",
      },
    });
    expect(ONIX_MENU_BATTLER).toBe(BATTLE2_ACTION_MENU_MODEL.player);
    expect(KABUTO_SENDOUT_BATTLER).toBe(BATTLE2_ACTION_MENU_MODEL.opponent);
  });
});

describe("Battle 2 pre-first-turn RNG and exec state", () => {
  const seed = 812598902;
  const localPressTick = 1326;
  const handoffTick = sendOutHandoffTick(localPressTick, "jenson");

  it("pins the on-demand +1/+2/+5 calls and endpoint value", () => {
    expect(handoffTick).toBe(1365);
    expect(battle2PreTurnRngCalls(handoffTick + 323, handoffTick)).toBe(0);
    expect(battle2PreTurnRngCalls(handoffTick + 324, handoffTick)).toBe(1);
    expect(battle2PreTurnRngCalls(handoffTick + 327, handoffTick)).toBe(1);
    expect(battle2PreTurnRngCalls(handoffTick + 328, handoffTick)).toBe(3);
    expect(battle2PreTurnRngCalls(handoffTick + 329, handoffTick)).toBe(3);
    expect(battle2PreTurnRngCalls(handoffTick + 330, handoffTick)).toBe(8);
    expect(advanceBattle2PreTurnRng(seed, 1)).toBe(4229780657);
    expect(advanceBattle2PreTurnRng(seed, 3)).toBe(2960830979);
    expect(advanceBattle2PreTurnRng(seed, 8)).toBe(3530724670);
  });

  it("advances only on demand in core and raises execFlags at reveal", () => {
    const atTick = handoffTick + 323;
    let state: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      rngValue: seed,
      battleControllerExecFlags: 0,
      battleScene: {
        ...INITIAL_BATTLE_SCENE_STATE,
        encounter: "jenson",
        elapsed: atTick - TICK0,
        sendOutPressElapsed: localPressTick - TICK0,
      },
    };

    state = tick(state, new Set());
    expect(state.rngValue).toBe(4229780657);
    expect(state.battleControllerExecFlags).toBe(0);
    for (let i = 0; i < 4; i += 1) state = tick(state, new Set());
    expect(state.rngValue).toBe(2960830979);
    for (let i = 0; i < 2; i += 1) state = tick(state, new Set());
    expect(state.rngValue).toBe(3530724670);
    expect(state.battleControllerExecFlags).toBe(0);
    state = tick(state, new Set());
    expect(state.rngValue).toBe(3530724670);
    expect(state.battleControllerExecFlags).toBe(1);
    expect(state.battleScene?.fightSubmenu).toEqual(CLOSED_FIGHT_SUBMENU_STATE);
  });
});
