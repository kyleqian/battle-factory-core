/**
 * `B_SCR_OP_ROLLOUTDAMAGECALCULATION` /
 * `Cmd_rolloutdamagecalculation` (`battle_script_commands.c:8536-8569`).
 *
 * This operandless command owns Rollout/Ice Ball's attacker-local five-hit
 * timer, initial timer value, multi-turn status, locked move, and escalating
 * dynamic power. A miss or other no-effect result cancels the active
 * multi-turn state and transfers directly to `BattleScript_MoveMissedPause`.
 */
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import {
  resolveBattleScriptLabel,
  type BattleScriptProgram,
} from "./battleScriptProgram.ts";
import {
  BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT,
  type BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";
import { requireBattlerRole } from "./battleScriptHitChainOpcode.ts";
import { cancelBattleScriptMultiTurnMoves } from "./battleScriptMultiTurnCancellation.ts";
import { BATTLE_SCRIPT_STATUS2_MASKS } from "./battleScriptSourceConstants.ts";

const ROLLOUT_HIT_COUNT = 5;

const rolloutDamageCalculationHandler: BattleScriptOpcodeHandler<BattleScriptRulesContext> = (
  context,
) => {
  const rulesContext = context.state.rulesContext;
  const attacker = requireBattlerRole(rulesContext, "attacker");

  if ((rulesContext.moveResultFlags & BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT) !== 0) {
    const cancelled = cancelBattleScriptMultiTurnMoves(rulesContext, attacker);
    const missedPause = resolveBattleScriptLabel(context.program, "BattleScript_MoveMissedPause");
    if (!missedPause) {
      throw new Error("Cmd_rolloutdamagecalculation requires BattleScript_MoveMissedPause");
    }
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "jump", programCounter: missedPause.programCounter }),
      { rulesContext: cancelled.rulesContext },
    );
  }

  const sourceAttacker = rulesContext.battlers[attacker];
  const firstHit = (
    sourceAttacker.status2
    & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS
  ) === 0;
  const timerBeforeDecrement = firstHit
    ? ROLLOUT_HIT_COUNT
    : sourceAttacker.rolloutTimer;
  if (timerBeforeDecrement === 0) {
    throw new Error(
      "Cmd_rolloutdamagecalculation found STATUS2_MULTIPLETURNS with a zero rolloutTimer",
    );
  }
  const rolloutTimer = timerBeforeDecrement - 1;
  const status2WithLock = firstHit
    ? (
      sourceAttacker.status2
      | BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS
    ) >>> 0
    : sourceAttacker.status2;
  const status2 = rolloutTimer === 0
    ? (
      status2WithLock
      & ~BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS
    ) >>> 0
    : status2WithLock;
  const nextAttacker = Object.freeze({
    ...sourceAttacker,
    rolloutTimer,
    status2,
  });
  const battlers = Object.freeze(
    rulesContext.battlers.map((battler, index) =>
      index === attacker ? nextAttacker : battler
    ),
  ) as unknown as BattleScriptRulesContext["battlers"];
  const lockedMoves = firstHit
    ? Object.freeze(
      rulesContext.lockedMoves.map((move, index) =>
        index === attacker ? rulesContext.currentMove : move
      ),
    ) as unknown as BattleScriptRulesContext["lockedMoves"]
    : rulesContext.lockedMoves;
  const rolloutTimerStartValues = firstHit
    ? Object.freeze(
      rulesContext.rolloutTimerStartValues.map((value, index) =>
        index === attacker ? ROLLOUT_HIT_COUNT : value
      ),
    ) as unknown as BattleScriptRulesContext["rolloutTimerStartValues"]
    : rulesContext.rolloutTimerStartValues;
  const successfulHits = ROLLOUT_HIT_COUNT - rolloutTimer;
  let dynamicBasePower = rulesContext.currentMovePower * (2 ** (successfulHits - 1));
  if (
    (
      nextAttacker.status2
      & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_DEFENSE_CURL
    ) !== 0
  ) {
    dynamicBasePower *= 2;
  }

  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "advance" }),
    {
      rulesContext: Object.freeze({
        ...rulesContext,
        battlers,
        lockedMoves,
        rolloutTimerStartValues,
        dynamicBasePower,
      }),
    },
  );
};

export function createBattleScriptRolloutOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instructions = program.instructions.filter(
    (instruction) =>
      instruction.opcodeName === "B_SCR_OP_ROLLOUTDAMAGECALCULATION",
  );
  if (instructions.length !== 1) {
    throw new Error(
      `B_SCR_OP_ROLLOUTDAMAGECALCULATION requires exactly 1 concrete start, got ${instructions.length}`,
    );
  }
  const [instruction] = instructions;
  if (
    instruction!.opcodeId !== 0xb3
    || instruction!.dispatcher !== "Cmd_rolloutdamagecalculation"
    || instruction!.operands.length !== 0
  ) {
    throw new Error(
      `invalid B_SCR_OP_ROLLOUTDAMAGECALCULATION shape at program counter ${instruction!.programCounter}`,
    );
  }
  return Object.freeze({
    [instruction!.opcodeId]: rolloutDamageCalculationHandler,
  });
}
