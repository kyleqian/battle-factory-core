/**
 * Source port of `HandleAction_ActionFinished`
 * (`reference/pokeemerald/src/battle_util.c:658-683`).
 *
 * This is an action-controller boundary, not a Battle Script opcode. It runs
 * only after the acting move and its fainted-mon orchestration have completed.
 * Every source field represented by `BattleScriptRulesContext` is reset here
 * in one place, including the represented portion of `SpecialStatusesClear`.
 *
 * Source-owned fields not represented by the rules context are deliberately
 * not guessed:
 * - `gCurrentActionFuncId` and `gActionsByTurnOrder[]`;
 * - `gBattleCommunication[3]` and `[4]` (only slots 0/1 exist in the current
 *   context);
 * - `SpecialStatus::{statLowered,intimidatedMon,traced,
 *   faintedHasReplacement,focusBanded,shellBellDmg,physicalBattlerId,
 *   specialBattlerId}`. The represented `lightningRodRedirected`,
 *   `restoredBattlerSprite`, `ppNotAffectedByPressure`, `physicalDmg`, and
 *   `specialDmg` fields are cleared below.
 *
 * The Battle Script machine's `callStack` is the representation of
 * `gBattleResources->battleScriptsStack->size`, so resetting it belongs to
 * this same helper rather than a later presentation or orchestration patch.
 */
import type { BattleScriptBattlerId } from "./battleScriptEvents.ts";
import type { BattleScriptMachineState } from "./battleScriptMachine.ts";
import type {
  BattleScriptMoveEndHalfwords,
  BattleScriptRulesBattlerState,
  BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";
import {
  BATTLE_SCRIPT_HITMARKER_ATTACKSTRING_PRINTED,
  BATTLE_SCRIPT_HITMARKER_CHARGING,
  BATTLE_SCRIPT_HITMARKER_DESTINYBOND,
  BATTLE_SCRIPT_HITMARKER_IGNORE_ON_AIR,
  BATTLE_SCRIPT_HITMARKER_IGNORE_SUBSTITUTE,
  BATTLE_SCRIPT_HITMARKER_IGNORE_UNDERGROUND,
  BATTLE_SCRIPT_HITMARKER_IGNORE_UNDERWATER,
  BATTLE_SCRIPT_HITMARKER_NO_PPDEDUCT,
  BATTLE_SCRIPT_HITMARKER_OBEYS,
  BATTLE_SCRIPT_HITMARKER_PASSIVE_HP_UPDATE,
  BATTLE_SCRIPT_HITMARKER_SYNCHRONIZE_EFFECT,
} from "./battleScriptSourceConstants.ts";

// include/constants/battle.h:181,190,203. These source bits are not exported
// elsewhere because no registered opcode currently reads or writes them.
const HITMARKER_WAKE_UP_CLEAR = 1 << 4;
const HITMARKER_STATUS_ABILITY_EFFECT = 1 << 13;
const HITMARKER_NEVER_SET = 1 << 26;

export const BATTLE_ACTION_FINISHED_HITMARKER_CLEAR_MASK = (
  HITMARKER_WAKE_UP_CLEAR
  | BATTLE_SCRIPT_HITMARKER_DESTINYBOND
  | BATTLE_SCRIPT_HITMARKER_IGNORE_SUBSTITUTE
  | BATTLE_SCRIPT_HITMARKER_ATTACKSTRING_PRINTED
  | BATTLE_SCRIPT_HITMARKER_NO_PPDEDUCT
  | HITMARKER_STATUS_ABILITY_EFFECT
  | BATTLE_SCRIPT_HITMARKER_SYNCHRONIZE_EFFECT
  | BATTLE_SCRIPT_HITMARKER_IGNORE_ON_AIR
  | BATTLE_SCRIPT_HITMARKER_IGNORE_UNDERGROUND
  | BATTLE_SCRIPT_HITMARKER_IGNORE_UNDERWATER
  | BATTLE_SCRIPT_HITMARKER_PASSIVE_HP_UPDATE
  | BATTLE_SCRIPT_HITMARKER_OBEYS
  | HITMARKER_NEVER_SET
  | BATTLE_SCRIPT_HITMARKER_CHARGING
) >>> 0;

function clearRepresentedSpecialStatus(
  battler: BattleScriptRulesBattlerState,
): BattleScriptRulesBattlerState {
  return Object.freeze({
    ...battler,
    ...(battler.lightningRodRedirected === undefined
      ? {}
      : { lightningRodRedirected: 0 as const }),
    ppNotAffectedByPressure: 0,
    specialStatus: Object.freeze({
      restoredBattlerSprite: 0,
      physicalDmg: 0,
      specialDmg: 0,
    }),
  });
}

function replaceAt(
  values: BattleScriptMoveEndHalfwords,
  index: BattleScriptBattlerId,
  value: number,
): BattleScriptMoveEndHalfwords {
  const next = [...values];
  next[index] = value;
  return Object.freeze(next) as unknown as BattleScriptMoveEndHalfwords;
}

export function handleBattleActionFinished(
  state: BattleScriptMachineState<BattleScriptRulesContext>,
  actingBattler: BattleScriptBattlerId,
): BattleScriptMachineState<BattleScriptRulesContext> {
  const rules = state.rulesContext;
  if (actingBattler >= rules.battleTopology.battlersCount) {
    throw new Error(
      `HandleAction_ActionFinished acting battler ${actingBattler} is outside gBattlersCount ${rules.battleTopology.battlersCount}`,
    );
  }

  const battlers = rules.battlers.map((battler, index) =>
    index < rules.battleTopology.battlersCount
      ? clearRepresentedSpecialStatus(battler)
      : battler
  ) as unknown as BattleScriptRulesContext["battlers"];
  const monToSwitchIntoId = replaceAt(
    rules.monToSwitchIntoId,
    actingBattler,
    6, // PARTY_SIZE, the source's undecided sentinel.
  ) as BattleScriptRulesContext["monToSwitchIntoId"];
  const moveHistory = Object.freeze({
    ...rules.moveHistory,
    lastLandedMoves: replaceAt(
      rules.moveHistory.lastLandedMoves,
      actingBattler,
      0,
    ),
    lastHitByType: replaceAt(
      rules.moveHistory.lastHitByType,
      actingBattler,
      0,
    ),
  });

  return Object.freeze({
    ...state,
    callStack: Object.freeze([]),
    rulesContext: Object.freeze({
      ...rules,
      battlers: Object.freeze(battlers),
      monToSwitchIntoId,
      currentTurnActionNumber: rules.currentTurnActionNumber + 1,
      hitMarker: (
        rules.hitMarker & ~BATTLE_ACTION_FINISHED_HITMARKER_CLEAR_MASK
      ) >>> 0,
      currentMove: 0,
      currentMoveEffect: 0,
      currentMovePower: 0,
      battleMoveDamage: 0,
      moveResultFlags: 0,
      animTurn: 0,
      animTargetsHit: 0,
      moveHistory,
      dynamicMoveType: 0,
      dynamicBasePower: 0,
      moveendState: 0,
      multiHitEffect: 0,
    }),
  });
}
