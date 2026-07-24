import {
  transitionBattleScriptCommand,
  type BattleScriptCommandTransition,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlerContext,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import type { BattleScriptProgram } from "./battleScriptProgram.ts";

export type BattleScriptMoveValuesRulesContext = Readonly<{
  moveResultFlags: number;
  dmgMultiplier: number;
  critMultiplier: number;
  moveEffectByte: number;
  missType: number;
  hitMarker: number;
}>;

const HITMARKER_DESTINYBOND = 1 << 6;
const HITMARKER_SYNCHRONIZE_EFFECT = 1 << 14;
const MOVE_VALUES_CLEANUP_HITMARKER_MASK =
  HITMARKER_DESTINYBOND | HITMARKER_SYNCHRONIZE_EFFECT;

/**
 * Immutable equivalent of MoveValuesCleanUp
 * (reference/pokeemerald/src/battle_script_commands.c:3621-3630).
 *
 * Battle communication is represented by its two named values rather than a
 * writable byte array. Every unrelated rule field and nested value is carried
 * forward by identity.
 */
export function cleanUpBattleScriptMoveValues<
  RulesContext extends BattleScriptMoveValuesRulesContext,
>(rulesContext: RulesContext): RulesContext {
  return Object.freeze({
    ...rulesContext,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: (
      rulesContext.hitMarker & ~MOVE_VALUES_CLEANUP_HITMARKER_MASK
    ) >>> 0,
  }) as RulesContext;
}

function haltForUnexpectedOperands<
  RulesContext extends BattleScriptMoveValuesRulesContext,
>(
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
): BattleScriptCommandTransition<RulesContext> {
  const [operand] = context.instruction.operands;
  return transitionBattleScriptCommand(
    context,
    Object.freeze({
      kind: "halt",
      reason: Object.freeze({
        kind: "invalid-source-operand",
        programCounter: context.state.programCounter,
        opcodeId: context.instruction.opcodeId,
        opcodeName: context.instruction.opcodeName,
        operandExpression: operand?.expression ?? "<none>",
        expected: "none",
        received: `${context.instruction.operands.length} operands`,
      }),
    }),
  );
}

/**
 * Source-mapped Cmd_movevaluescleanup handler. The source command has no
 * operands, calls MoveValuesCleanUp, and advances by its one opcode byte.
 */
export function createBattleScriptMoveValuesCommandHandlers<
  RulesContext extends BattleScriptMoveValuesRulesContext,
>(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<RulesContext> {
  const instruction = program.instructions.find(
    (candidate) => candidate.opcodeName === "B_SCR_OP_MOVEVALUESCLEANUP",
  );
  if (!instruction) {
    throw new Error(
      "committed Battle Script program does not emit B_SCR_OP_MOVEVALUESCLEANUP",
    );
  }

  const handler: BattleScriptOpcodeHandler<RulesContext> = (context) => {
    if (context.instruction.operands.length !== 0) {
      return haltForUnexpectedOperands(context);
    }
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      {
        rulesContext: cleanUpBattleScriptMoveValues(
          context.state.rulesContext,
        ),
      },
    );
  };

  return Object.freeze({ [instruction.opcodeId]: handler });
}
