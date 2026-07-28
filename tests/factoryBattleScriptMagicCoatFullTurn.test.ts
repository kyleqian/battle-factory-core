import { describe, expect, it } from "vitest";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";

const MAGIC_COAT = 277;
const TAIL_WHIP = 39;
const PLAYER_MAGIC_COAT = Object.freeze({
  kind: "use-move" as const, moveSlot: 0 as const, targetBattler: 1 as const,
});
const TRAINER_TAIL_WHIP = Object.freeze({
  kind: "use-move" as const, moveSlot: 0 as const, targetBattler: 0 as const,
});

function config(playerSpeed = 100, trainerSpeed = 50): FactoryFullTurnConfig {
  return {
    requestId: 1,
    rngSeed: 1,
    player: {
      species: 325, moveId: MAGIC_COAT,
      moves: [MAGIC_COAT, MAGIC_COAT, MAGIC_COAT, MAGIC_COAT],
      pp: [15, 15, 15, 15], attack: 50, defense: 100,
      spAttack: 50, spDefense: 100, speed: playerSpeed, hp: 1000,
      types: ["TYPE_PSYCHIC", "TYPE_PSYCHIC"],
    },
    trainer: {
      species: 95, moveId: TAIL_WHIP,
      moves: [TAIL_WHIP, TAIL_WHIP, TAIL_WHIP, TAIL_WHIP],
      pp: [30, 30, 30, 30], attack: 50, defense: 100,
      spAttack: 50, spDefense: 100, speed: trainerSpeed, hp: 1000,
      types: ["TYPE_ROCK", "TYPE_GROUND"],
    },
  };
}

function runTurn(source: ReturnType<typeof createFactoryFullTurnBattleState>) {
  const afterPlayer = submitFactoryFullTurnDecision(source, {
    requestId: 1, side: "player", decision: PLAYER_MAGIC_COAT,
  });
  if (afterPlayer.kind !== "decision-required") throw new Error("expected trainer command");
  return submitFactoryFullTurnDecision(afterPlayer.state, {
    requestId: afterPlayer.nextRequest.requestId,
    side: "trainer",
    decision: TRAINER_TAIL_WHIP,
  });
}

describe("Factory full-turn Magic Coat reflection", () => {
  it("executes Magic Coat -> reflected Tail Whip through the shared canceler and cleans the turn", () => {
    const result = runTurn(createFactoryFullTurnBattleState(config()));
    if (result.kind !== "decision-required") {
      throw new Error(`expected next command, got ${JSON.stringify(result)}`);
    }
    const rules = result.state.rules.rulesContext;
    expect(rules.battlers[0].pp).toEqual([14, 15, 15, 15]);
    expect(rules.battlers[1].pp).toEqual([29, 30, 30, 30]);
    expect(rules.battlers[0].statStages[2]).toBe(6);
    expect(rules.battlers[1].statStages[2]).toBe(5);
    expect(rules.battlers.slice(0, 2).map(({ bounceMove, ppNotAffectedByPressure }) => ({
      bounceMove, ppNotAffectedByPressure,
    }))).toEqual([
      { bounceMove: 0, ppNotAffectedByPressure: 0 },
      { bounceMove: 0, ppNotAffectedByPressure: 0 },
    ]);

    expect(result.events.map(({ payload }) =>
      payload.kind === "message" ? `${payload.kind}:${payload.messageId}` : payload.kind
    )).toEqual([
      "message:STRINGID_USEDMOVE",
      "set-battler-pp-data",
      "animation",
      "message:STRINGID_PKMNSHROUDEDITSELF",
      "set-battler-sprite-visibility",
      "message:STRINGID_USEDMOVE",
      "set-battler-pp-data",
      "message:STRINGID_PKMNMOVEBOUNCED",
      "stat-stage-change",
      "animation",
      "animation",
      "message:STRINGID_DEFENDERSSTATFELL",
      "set-battler-sprite-visibility",
      "set-battler-sprite-visibility",
    ]);
  });
});
