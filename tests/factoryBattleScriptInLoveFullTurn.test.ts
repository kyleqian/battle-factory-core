import { describe, expect, it } from "vitest";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE } from "../src/engine/battleScriptSourceConstants.ts";

const TACKLE = 33;
const ATTRACT = 213;

function config(rngSeed: number): FactoryFullTurnConfig {
  return {
    requestId: 1,
    rngSeed,
    player: {
      species: 29, // Nidoran♀: fixed female
      moveId: TACKLE,
      moves: [TACKLE, 0, 0, 0],
      pp: [35, 0, 0, 0],
      attack: 100,
      defense: 100,
      spAttack: 80,
      spDefense: 100,
      speed: 50,
      hp: 500,
    },
    trainer: {
      species: 32, // Nidoran♂: fixed male
      moveId: ATTRACT,
      moves: [ATTRACT, 0, 0, 0],
      pp: [15, 0, 0, 0],
      attack: 80,
      defense: 100,
      spAttack: 80,
      spDefense: 100,
      speed: 100,
      hp: 500,
    },
  };
}

function runTurn(rngSeed: number) {
  const initial = createFactoryFullTurnBattleState(config(rngSeed));
  const afterPlayer = submitFactoryFullTurnDecision(initial, {
    requestId: 1,
    side: "player",
    decision: { kind: "use-move", moveSlot: 0, targetBattler: 1 },
  });
  if (afterPlayer.kind !== "decision-required") {
    throw new Error("expected trainer command after player selection");
  }
  return submitFactoryFullTurnDecision(afterPlayer.state, {
    requestId: 2,
    side: "trainer",
    decision: { kind: "use-move", moveSlot: 0, targetBattler: 0 },
  });
}

describe("Factory full-turn infatuation immobilization", () => {
  it("returns from the in-love prelude to the explicit cant-attack script and completes MoveEnd without executing the chosen move", () => {
    const completedTurn = runTurn(0);
    if (completedTurn.kind !== "decision-required") {
      throw new Error("expected the next turn's player command");
    }

    const rules = completedTurn.state.rules.rulesContext;
    expect(rules.battlers[0].status2 & 0x000f_0000).toBe(1 << 17);
    expect(rules.battlers[0].pp).toEqual([35, 0, 0, 0]);
    expect(rules.party.player[0].pp).toEqual([35, 0, 0, 0]);
    expect(rules.battlers[1].pp).toEqual([14, 0, 0, 0]);
    expect(rules.battlers[1].hp).toBe(500);

    const messageIds = completedTurn.events.flatMap(({ payload }) =>
      payload.kind === "message" ? [payload.messageId] : []
    );
    expect(messageIds).toEqual([
      "STRINGID_USEDMOVE",
      "STRINGID_PKMNFELLINLOVE",
      "STRINGID_PKMNINLOVE",
      "STRINGID_PKMNIMMOBILIZEDBYLOVE",
    ]);
    const immobilized = completedTurn.events.find(({ payload }) =>
      payload.kind === "message"
      && payload.messageId === "STRINGID_PKMNIMMOBILIZEDBYLOVE"
    );
    expect(immobilized).toMatchObject({
      provenance: {
        sourceLabel: "BattleScript_MoveUsedIsInLoveCantAttack",
        opcodeName: "B_SCR_OP_PRINTSTRING",
      },
    });
    expect(
      rules.hitMarker & BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE
    ).toBe(BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE);
    expect(rules.currentMove).toBe(0);
  });
});
