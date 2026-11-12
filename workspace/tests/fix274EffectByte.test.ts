import { describe, expect, it } from "vitest";
import { handleBattleActionFinished } from "../src/engine/battleActionFinished.ts";
import {
  createBattleScriptRngState,
  createBattleScriptSchedulerState,
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";
import {
  createBattleScriptRulesContext,
  type BattleScriptRulesContext,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";

/**
 * fix274 / ISSUES #209: `HandleAction_ActionFinished` (battle_util.c:658-683)
 * zeroes gBattleCommunication[3] (MOVE_EFFECT_BYTE) after every action. A move
 * that sets the byte and then misses (accuracycheck jumps past
 * seteffectwithchance) must not leave it armed for a later action.
 */
const THUNDER = 87;
const TACKLE = 33;
const MOVE_EFFECT_PARALYSIS = 5;

function mon(species: number, move: number, speed: number) {
  return Object.freeze({
    species,
    moveId: move,
    moves: [move, 0, 0, 0] as const,
    pp: [10, 0, 0, 0] as const,
    ability: 0,
    item: 0,
    friendship: 0,
    attack: 90,
    defense: 130,
    spAttack: 55,
    spDefense: 65,
    speed,
    hp: 999,
    maxHp: 999,
    types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
  });
}

function scenario(rngSeed: number): FactoryFullTurnConfig {
  return Object.freeze({
    requestId: 1,
    rngSeed,
    player: mon(95, THUNDER, 40),
    trainer: mon(19, TACKLE, 100),
  });
}

function playTurn(rngSeed: number) {
  const afterPlayer = submitFactoryFullTurnDecision(
    createFactoryFullTurnBattleState(scenario(rngSeed)),
    { requestId: 1, side: "player", decision: { kind: "use-move", moveSlot: 0, targetBattler: 1 } },
  );
  const afterTrainer = submitFactoryFullTurnDecision(afterPlayer.state, {
    requestId: 2,
    side: "trainer",
    decision: { kind: "use-move", moveSlot: 0, targetBattler: 0 },
  });
  return afterTrainer.state.rules.rulesContext;
}

describe("fix274 #209: MOVE_EFFECT_BYTE is cleared at action finish", () => {
  it("handleBattleActionFinished zeroes the effect byte", () => {
    const base = playTurn(1);
    const rulesContext = createBattleScriptRulesContext({
      ...base,
      moveEffectByte: MOVE_EFFECT_PARALYSIS,
    });
    const state: BattleScriptMachineState<BattleScriptRulesContext> = Object.freeze({
      programCounter: 0,
      callStack: Object.freeze([]),
      instructionsExecuted: 0,
      haltReason: null,
      scheduler: createBattleScriptSchedulerState(),
      rulesContext,
      rng: createBattleScriptRngState(1),
      events: Object.freeze([]),
    });
    expect(handleBattleActionFinished(state, 1).rulesContext.moveEffectByte).toBe(0);
  });

  it.each([2, 3, 11, 12])(
    "a Thunder miss by the second mover leaves no armed effect byte (rng seed %i)",
    (rngSeed) => {
      const rules = playTurn(rngSeed);
      // Thunder missed (the 999-hp trainer is untouched), so seteffectwithchance never ran.
      expect(rules.battlers[1].hp).toBe(999);
      expect(rules.moveEffectByte).toBe(0);
    },
  );
});
