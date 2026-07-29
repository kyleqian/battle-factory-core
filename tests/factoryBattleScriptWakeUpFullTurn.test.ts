import { describe, expect, it } from "vitest";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";

const TACKLE = 33;
const SPLASH = 150;

const PLAYER_TACKLE = Object.freeze({
  kind: "use-move" as const,
  moveSlot: 0 as const,
  targetBattler: 1 as const,
});
const TRAINER_SPLASH = Object.freeze({
  kind: "use-move" as const,
  moveSlot: 0 as const,
  targetBattler: 1 as const,
});

function config(): FactoryFullTurnConfig {
  return {
    requestId: 1,
    rngSeed: 1,
    player: {
      species: 64,
      moveId: TACKLE,
      moves: [TACKLE, 0, 0, 0],
      pp: [35, 0, 0, 0],
      attack: 120,
      defense: 100,
      spAttack: 80,
      spDefense: 100,
      speed: 100,
      hp: 500,
      status1: 1,
    },
    trainer: {
      species: 129,
      moveId: SPLASH,
      moves: [SPLASH, 0, 0, 0],
      pp: [40, 0, 0, 0],
      attack: 20,
      defense: 100,
      spAttack: 20,
      spDefense: 100,
      speed: 50,
      hp: 500,
    },
  };
}

describe("Factory full-turn sleep expiry", () => {
  it("wakes, prints the source-selected message, updates status, returns to attackcanceler, and executes the chosen move to completion", () => {
    const initial = createFactoryFullTurnBattleState(config());
    const afterPlayer = submitFactoryFullTurnDecision(initial, {
      requestId: 1,
      side: "player",
      decision: PLAYER_TACKLE,
    });
    if (afterPlayer.kind !== "decision-required") {
      throw new Error("expected trainer command after player selection");
    }

    const completedTurn = submitFactoryFullTurnDecision(afterPlayer.state, {
      requestId: 2,
      side: "trainer",
      decision: TRAINER_SPLASH,
    });
    if (completedTurn.kind !== "decision-required") {
      throw new Error("expected the next turn's player command");
    }

    const rules = completedTurn.state.rules.rulesContext;
    expect(rules.battlers[0].status1).toBe(0);
    expect(rules.party.player[0].status1).toBe(0);
    expect(rules.battlers[0].pp).toEqual([34, 0, 0, 0]);
    expect(rules.party.player[0].pp).toEqual([34, 0, 0, 0]);
    expect(rules.battlers[1].hp).toBeLessThan(500);
    expect(completedTurn.events).toContainEqual(expect.objectContaining({
      payload: {
        kind: "set-battler-status-data",
        battler: 0,
        status1: 0,
      },
    }));
    expect(completedTurn.events).toContainEqual(expect.objectContaining({
      provenance: expect.objectContaining({
        sourceLabel: "BattleScript_MoveUsedWokeUp",
        opcodeName: "B_SCR_OP_PRINTFROMTABLE",
      }),
      payload: {
        kind: "message",
        messageId: "STRINGID_PKMNWOKEUP",
        substitutions: [],
      },
    }));
    expect(completedTurn.events).toContainEqual(expect.objectContaining({
      provenance: expect.objectContaining({
        sourceLabel: "BattleScript_MoveUsedWokeUp",
        opcodeName: "B_SCR_OP_UPDATESTATUSICON",
      }),
      payload: {
        kind: "status-icon-update",
        battler: 0,
        status1: 0,
        status2: 0,
      },
    }));
    expect(completedTurn.events).toContainEqual(expect.objectContaining({
      payload: expect.objectContaining({
        kind: "message",
        messageId: "STRINGID_USEDMOVE",
      }),
    }));
  });
});
