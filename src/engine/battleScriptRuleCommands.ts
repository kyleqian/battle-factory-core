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
import { resolveBattleScriptLabel } from "./battleScriptProgram.ts";

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
 * Source-mapped multi-hit rules mutations: Cmd_setmultihit and
 * Cmd_decrementmultihit.
 *
 * The byte-expression resolver is an injected source-context boundary. This
 * handler never parses assembly expressions or pointer addresses. Conditional
 * control resolves only through the program's typed source labels.
 */
export function createBattleScriptRuleCommandHandlers<
  RulesContext extends BattleScriptMultiHitRulesContext,
>(
  program: BattleScriptProgram,
  resolveByteOperand: BattleScriptByteResolverPort<RulesContext>,
): BattleScriptOpcodeHandlers<RulesContext> {
  const handlers: Record<number, BattleScriptOpcodeHandler<RulesContext>> =
    Object.create(null) as Record<number, BattleScriptOpcodeHandler<RulesContext>>;
  const install = (
    opcodeName: string,
    handler: BattleScriptOpcodeHandler<RulesContext>,
  ) => {
    const instruction = program.instructions.find(
      (candidate) => candidate.opcodeName === opcodeName,
    );
    if (!instruction) {
      throw new Error(`committed Battle Script program does not emit ${opcodeName}`);
    }
    handlers[instruction.opcodeId] = handler;
  };

  install("B_SCR_OP_SETMULTIHIT", (context) => {
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
  });

  install("B_SCR_OP_DECREMENTMULTIHIT", (context) => {
    const multiHitCounter = (context.state.rulesContext.multiHitCounter - 1) & 0xff;
    const rulesContext = Object.freeze({
      ...context.state.rulesContext,
      multiHitCounter,
    }) as RulesContext;
    if (multiHitCounter === 0) {
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "advance" }),
        { rulesContext },
      );
    }

    const [operand] = context.instruction.operands;
    const target = operand?.widthBytes === 4
      ? resolveBattleScriptLabel(context.program, operand.expression)
      : undefined;
    const control = !operand || !target || context.instruction.operands.length !== 1
      ? Object.freeze({
        kind: "halt" as const,
        reason: Object.freeze({
          kind: "invalid-control-target" as const,
          programCounter: context.state.programCounter,
          expression: operand?.expression ?? "<missing>",
        }),
      })
      : Object.freeze({
        kind: "jump" as const,
        programCounter: target.programCounter,
      });
    return transitionBattleScriptCommand(context, control, { rulesContext });
  });

  return Object.freeze(handlers);
}
