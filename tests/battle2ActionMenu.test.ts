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
import {
  CLOSED_FIGHT_SUBMENU_STATE,
  FIGHT_SUBMENU_CLOSE_DELAY,
  FIGHT_SUBMENU_OPEN_DELAY,
} from "../src/engine/battleMenu.ts";
import { rentalMoveset } from "../src/engine/battleSetup.ts";
import { buildFightMoveset } from "../src/engine/fightSubmenuText.ts";
import { ANCHOR_DRAFT_SCREEN_STATE } from "../src/engine/factoryDraftScreen.ts";
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

describe("Battle 2 FIGHT submenu interaction", () => {
  const localPressTick = 1326;
  const handoffTick = sendOutHandoffTick(localPressTick, "jenson");

  function battle2StateBefore(sceneT: number): EngineState {
    return {
      ...createInitialState(),
      rngMode: "frontierBattle",
      draftScreen: {
        ...ANCHOR_DRAFT_SCREEN_STATE,
        selectedIds: [1, 2, 3, 0, 0, 0],
      },
      battleScene: {
        ...INITIAL_BATTLE_SCENE_STATE,
        encounter: "jenson",
        elapsed: sceneT - TICK0 - 1,
        sendOutPressElapsed: localPressTick - TICK0,
      },
    };
  }

  it("rejects A before the corrected reveal and accepts it at the input-ready edge", () => {
    const early = tick(battle2StateBefore(handoffTick + 330), new Set(["A"]));
    expect(early.battleScene?.fightSubmenu.openElapsed).toBeNull();

    const accepted = tick(battle2StateBefore(handoffTick + 331), new Set(["A"]));
    expect(accepted.battleScene?.fightSubmenu.openElapsed).toBe(handoffTick + 331 - TICK0);
    expect(accepted.battleScene?.fightSubmenu.cursor).toBe(0);
    expect(accepted.battleScene?.fightSubmenu.displayCursor).toBe(0);
  });

  it("opens with ONIX's live four-move set and full Battle-2 PP", () => {
    const state = tick(battle2StateBefore(handoffTick + 331), new Set(["A"]));
    const submenu = state.battleScene!.fightSubmenu;
    const onix = rentalMoveset("ONIX");
    expect(submenu.activeMonMoveset).toEqual(onix);
    expect(buildFightMoveset(onix.moveIds, onix.maxPP).map((move) => [
      move.name,
      move.currentPP,
      move.maxPP,
    ])).toEqual([
      ["ROCK SLIDE", 10, 10],
      ["BIND", 20, 20],
      ["DRAGONBREATH", 20, 20],
      ["SANDSTORM", 10, 10],
    ]);
    expect(TICK0 + submenu.openElapsed! + FIGHT_SUBMENU_OPEN_DELAY)
      .toBe(handoffTick + 336);
  });

  it("lags a row navigation draw by one tick and B-closes to the same action epoch", () => {
    let state = tick(battle2StateBefore(handoffTick + 331), new Set(["A"]));
    for (let i = 0; i < FIGHT_SUBMENU_OPEN_DELAY; i += 1) state = tick(state, new Set());
    state = tick(state, new Set(["DOWN"]));
    expect(state.battleScene?.fightSubmenu.cursor).toBe(2);
    expect(state.battleScene?.fightSubmenu.displayCursor).toBe(0);
    state = tick(state, new Set());
    expect(state.battleScene?.fightSubmenu.displayCursor).toBe(2);
    state = tick(state, new Set(["B"]));
    const closed = state.battleScene!.fightSubmenu;
    expect(closed.closeElapsed).not.toBeNull();
    expect(closed.confirmElapsed).toBeNull();
    for (let i = 0; i < FIGHT_SUBMENU_CLOSE_DELAY; i += 1) state = tick(state, new Set());
    expect(state.battleScene?.fightSubmenu.closeElapsed).toBe(closed.closeElapsed);
    expect(state.battleScene?.turn1Resolved).toBe(false);
    expect(state.battleScene?.fightSubmenu.cursor).toBe(2);
  });
});
