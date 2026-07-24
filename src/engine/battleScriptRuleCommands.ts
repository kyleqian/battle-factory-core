import {
  transitionBattleScriptCommand,
  type BattleScriptBlockReason,
  type BattleScriptCommandTransition,
  type BattleScriptHaltReason,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlerContext,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import type {
  BattleScriptOperand,
  BattleScriptProgram,
} from "./battleScriptProgram.ts";

export type BattleScriptMultiHitRulesContext = Readonly<{
  multiHitCounter: number;
}>;

export type BattleScriptByteResolverPort<
  RulesContext extends BattleScriptMultiHitRulesContext,
> = (
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
  operand: BattleScriptOperand,
) => number | null;

function invalidSourceOperandReason<
  RulesContext extends BattleScriptMultiHitRulesContext,
>(
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
  operandExpression: string,
  received: string,
): BattleScriptHaltReason {
  return Object.freeze({
    kind: "invalid-source-operand",
    programCounter: context.state.programCounter,
    opcodeId: context.instruction.opcodeId,
    opcodeName: context.instruction.opcodeName,
    operandExpression,
    expected: "u8",
    received,
  });
}

function haltForInvalidOperand<
  RulesContext extends BattleScriptMultiHitRulesContext,
>(
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
  operandExpression: string,
  received: string,
): BattleScriptCommandTransition<RulesContext> {
  return transitionBattleScriptCommand(
    context,
    Object.freeze({
      kind: "halt",
      reason: invalidSourceOperandReason(context, operandExpression, received),
    }),
  );
}

function unavailableByteReason<
  RulesContext extends BattleScriptMultiHitRulesContext,
>(
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
  operand: BattleScriptOperand,
): BattleScriptBlockReason {
  return Object.freeze({
    kind: "source-context-unavailable",
    programCounter: context.state.programCounter,
    opcodeId: context.instruction.opcodeId,
    opcodeName: context.instruction.opcodeName,
    port: "resolve-byte",
    operandExpression: operand.expression,
  });
}

/**
 * First source-mapped rules mutation: Cmd_setmultihit.
 *
 * The byte-expression resolver is an injected source-context boundary. This
 * handler neither parses assembly expressions nor owns decrement/loop logic.
 */
export function createBattleScriptRuleCommandHandlers<
  RulesContext extends BattleScriptMultiHitRulesContext,
>(
  program: BattleScriptProgram,
  resolveByteOperand: BattleScriptByteResolverPort<RulesContext>,
): BattleScriptOpcodeHandlers<RulesContext> {
  const handlers: Record<number, BattleScriptOpcodeHandler<RulesContext>> =
    Object.create(null) as Record<number, BattleScriptOpcodeHandler<RulesContext>>;
  const instruction = program.instructions.find(
    (candidate) => candidate.opcodeName === "B_SCR_OP_SETMULTIHIT",
  );
  if (!instruction) {
    throw new Error("committed Battle Script program does not emit B_SCR_OP_SETMULTIHIT");
  }

  handlers[instruction.opcodeId] = (context) => {
    const [operand] = context.instruction.operands;
    if (!operand || operand.widthBytes !== 1 || context.instruction.operands.length !== 1) {
      return haltForInvalidOperand(
        context,
        operand?.expression ?? "<missing>",
        `${context.instruction.operands.length} operands; width ${operand?.widthBytes ?? "<missing>"}`,
      );
    }

    const value = resolveByteOperand(context, operand);
    if (value === null) {
      return transitionBattleScriptCommand(
        context,
        Object.freeze({
          kind: "block",
          reason: unavailableByteReason(context, operand),
        }),
      );
    }
    if (!Number.isSafeInteger(value) || value < 0 || value > 0xff) {
      return haltForInvalidOperand(context, operand.expression, String(value));
    }

    const rulesContext = Object.freeze({
      ...context.state.rulesContext,
      multiHitCounter: value,
    }) as RulesContext;
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      { rulesContext },
    );
  };

  return Object.freeze(handlers);
}
