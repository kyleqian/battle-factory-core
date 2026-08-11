import type { BattleScriptBattlerId } from "./battleScriptEvents.ts";
import { isBattleScriptBattlerId } from "./battleScriptMachine.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";
import {
  BATTLE_SCRIPT_STATUS2_MASKS,
  BATTLE_SCRIPT_STATUS3_SEMI_INVULNERABLE,
} from "./battleScriptSourceConstants.ts";

export type BattleScriptCancellationFieldEffect = Readonly<{
  before: number;
  after: number;
}>;

export type BattleScriptCancelMultiTurnMovesReceipt = Readonly<{
  battler: BattleScriptBattlerId;
  status2: BattleScriptCancellationFieldEffect;
  status3: BattleScriptCancellationFieldEffect;
  rolloutTimer: BattleScriptCancellationFieldEffect;
  furyCutterCounter: BattleScriptCancellationFieldEffect;
}>;

export type BattleScriptCancelMultiTurnMovesResult = Readonly<{
  rulesContext: BattleScriptRulesContext;
  receipt: BattleScriptCancelMultiTurnMovesReceipt;
}>;

export const BATTLE_SCRIPT_CANCEL_MULTI_TURN_STATUS2_MASK = (
  BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS
  | BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_LOCK_CONFUSE
  | BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_UPROAR
  | BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_BIDE
) >>> 0;

function fieldEffect(
  before: number,
  after: number,
): BattleScriptCancellationFieldEffect {
  return Object.freeze({ before, after });
}

/**
 * Pure source helper matching CancelMultiTurnMoves in battle_util.c.
 *
 * This is shared rules plumbing only. It does not select a canceler phase,
 * loop AtkCanceler_UnableToUseMove, or execute ATTACKCANCELER opcode 0.
 */
export function cancelBattleScriptMultiTurnMoves(
  rulesContext: BattleScriptRulesContext,
  battler: BattleScriptBattlerId,
): BattleScriptCancelMultiTurnMovesResult {
  if (!isBattleScriptBattlerId(battler)) {
    throw new Error(`CancelMultiTurnMoves battler must be a battler id 0..3, got ${battler}`);
  }

  const sourceBattler = rulesContext.battlers[battler];
  const nextStatus2 = (
    sourceBattler.status2
    & ~BATTLE_SCRIPT_CANCEL_MULTI_TURN_STATUS2_MASK
  ) >>> 0;
  const nextStatus3 = (
    sourceBattler.status3
    & ~BATTLE_SCRIPT_STATUS3_SEMI_INVULNERABLE
  ) >>> 0;
  const changed = (
    nextStatus2 !== sourceBattler.status2
    || nextStatus3 !== sourceBattler.status3
    || sourceBattler.rolloutTimer !== 0
    || sourceBattler.furyCutterCounter !== 0
  );
  const nextBattler = changed
    ? Object.freeze({
      ...sourceBattler,
      status2: nextStatus2,
      status3: nextStatus3,
      rolloutTimer: 0,
      furyCutterCounter: 0,
    })
    : sourceBattler;
  const nextBattlers = changed
    ? Object.freeze(
      rulesContext.battlers.map((candidate, index) => (
        index === battler ? nextBattler : candidate
      )),
    ) as unknown as BattleScriptRulesContext["battlers"]
    : rulesContext.battlers;
  const nextRulesContext = changed
    ? Object.freeze({ ...rulesContext, battlers: nextBattlers })
    : rulesContext;

  return Object.freeze({
    rulesContext: nextRulesContext,
    receipt: Object.freeze({
      battler,
      status2: fieldEffect(sourceBattler.status2, nextStatus2),
      status3: fieldEffect(sourceBattler.status3, nextStatus3),
      rolloutTimer: fieldEffect(sourceBattler.rolloutTimer, 0),
      furyCutterCounter: fieldEffect(sourceBattler.furyCutterCounter, 0),
    }),
  });
}
