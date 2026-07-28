import { describe, expect, it } from "vitest";
import {
  BATTLE_ACTION_FINISHED_HITMARKER_CLEAR_MASK,
  handleBattleActionFinished,
} from "../src/engine/battleActionFinished.ts";
import {
  createBattleScriptRngState,
  createBattleScriptSchedulerState,
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";
import {
  createBattleScriptRulesContext,
  type BattleScriptRulesContext,
} from "../src/engine/battleScriptRulesContext.ts";
import { BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS } from "../src/engine/battleScriptSourceConstants.ts";
import { createFactoryFullTurnBattleState } from "../src/engine/factoryBattleScriptFullTurnDecision.ts";

function baseRulesContext(): BattleScriptRulesContext {
  return createFactoryFullTurnBattleState({
    requestId: 1,
    rngSeed: 1,
    player: {
      species: 95,
      moveId: 157,
      attack: 51,
      defense: 187,
      spAttack: 36,
      spDefense: 72,
      speed: 76,
      hp: 117,
    },
    trainer: {
      species: 140,
      moveId: 28,
      attack: 118,
      defense: 96,
      spAttack: 93,
      spDefense: 51,
      speed: 61,
      hp: 91,
    },
  }).rules.rulesContext;
}

describe("HandleAction_ActionFinished source boundary", () => {
  it("clears every represented per-action field while preserving unrelated state", () => {
    const base = baseRulesContext();
    const battlers = base.battlers.map((battler) => ({
      ...battler,
      lightningRodRedirected: 1 as const,
      ppNotAffectedByPressure: 1 as const,
      specialStatus: {
        restoredBattlerSprite: 1 as const,
        physicalDmg: 44,
        specialDmg: 55,
      },
    })) as unknown as BattleScriptRulesContext["battlers"];
    const rulesContext = createBattleScriptRulesContext({
      ...base,
      battlers,
      currentMove: 157,
      currentMovePosition: 0,
      chosenMove: 157,
      battleMoveDamage: 28,
      moveResultFlags: 0xff,
      hitMarker: (
        BATTLE_ACTION_FINISHED_HITMARKER_CLEAR_MASK
        | BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS
      ) >>> 0,
      animTurn: 3,
      animTargetsHit: 2,
      dynamicMoveType: 17,
      dynamicBasePower: 200,
      moveendState: 9,
      multiHitEffect: 7,
      battleCommunication0: 3,
      battleCommunication1: 4,
      monToSwitchIntoId: [2, 3, 4, 5],
      moveHistory: {
        ...base.moveHistory,
        lastLandedMoves: [157, 28, 70, 52],
        lastHitByType: [5, 4, 3, 2],
      },
    });
    const state: BattleScriptMachineState<BattleScriptRulesContext> =
      Object.freeze({
        programCounter: 12,
        callStack: Object.freeze([100, 200]),
        instructionsExecuted: 9,
        haltReason: null,
        scheduler: createBattleScriptSchedulerState(),
        rulesContext,
        rng: createBattleScriptRngState(1),
        events: Object.freeze([]),
      });

    const result = handleBattleActionFinished(state, 0);
    expect(result.callStack).toEqual([]);
    expect(result.rulesContext).toMatchObject({
      currentTurnActionNumber: 1,
      hitMarker: BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS,
      currentMove: 0,
      currentMoveEffect: 0,
      currentMovePower: 0,
      battleMoveDamage: 0,
      moveResultFlags: 0,
      animTurn: 0,
      animTargetsHit: 0,
      dynamicMoveType: 0,
      dynamicBasePower: 0,
      moveendState: 0,
      multiHitEffect: 0,
      // Source clears communication slots 3/4, which are not represented;
      // the modeled slots 0/1 are unrelated and must survive.
      battleCommunication0: 3,
      battleCommunication1: 4,
      chosenMove: 157,
    });
    expect(result.rulesContext.monToSwitchIntoId).toEqual([6, 3, 4, 5]);
    expect(result.rulesContext.moveHistory.lastLandedMoves).toEqual([
      0,
      28,
      70,
      52,
    ]);
    expect(result.rulesContext.moveHistory.lastHitByType).toEqual([
      0,
      4,
      3,
      2,
    ]);
    for (const battler of result.rulesContext.battlers.slice(0, 2)) {
      expect(battler).toMatchObject({
        lightningRodRedirected: 0,
        ppNotAffectedByPressure: 0,
        specialStatus: {
          restoredBattlerSprite: 0,
          physicalDmg: 0,
          specialDmg: 0,
        },
      });
    }
    // SpecialStatusesClear iterates only to gBattlersCount (2 in singles).
    expect(result.rulesContext.battlers[2]).toMatchObject({
      lightningRodRedirected: 1,
      ppNotAffectedByPressure: 1,
      specialStatus: {
        restoredBattlerSprite: 1,
        physicalDmg: 44,
        specialDmg: 55,
      },
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.rulesContext)).toBe(true);
  });
});
