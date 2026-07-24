import type {
  BattleScriptSemanticEventPayload,
} from "./battleScriptEvents.ts";
import {
  advanceBattleScriptInstruction,
  transitionBattleScriptCommand,
  type BattleScriptBlockReason,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlerContext,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import type {
  BattleScriptOperand,
  BattleScriptProgram,
} from "./battleScriptProgram.ts";

export type BattleScriptMessagePayload = Extract<
  BattleScriptSemanticEventPayload,
  Readonly<{ kind: "message" }>
>;

export type BattleScriptControllerIdlePort<RulesContext extends object> = (
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
) => boolean;

export type BattleScriptMessagePreparationPort<RulesContext extends object> = (
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
  stringIdOperand: BattleScriptOperand,
) => BattleScriptMessagePayload | null;

export type BattleScriptSourceCommandPorts<RulesContext extends object> = Readonly<{
  isControllerIdle: BattleScriptControllerIdlePort<RulesContext>;
  prepareMessage: BattleScriptMessagePreparationPort<RulesContext>;
}>;

function installHandler<RulesContext extends object>(
  program: BattleScriptProgram,
  handlers: Record<number, BattleScriptOpcodeHandler<RulesContext>>,
  opcodeName: string,
  handler: BattleScriptOpcodeHandler<RulesContext>,
): void {
  const instruction = program.instructions.find((candidate) => candidate.opcodeName === opcodeName);
  if (!instruction) throw new Error(`committed Battle Script program does not emit ${opcodeName}`);
  handlers[instruction.opcodeId] = handler;
}

function controllerBusyReason<RulesContext extends object>(
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
): BattleScriptBlockReason {
  return Object.freeze({
    kind: "controller-busy",
    programCounter: context.state.programCounter,
    opcodeId: context.instruction.opcodeId,
    opcodeName: context.instruction.opcodeName,
  });
}

function unavailableMessageReason<RulesContext extends object>(
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
  operand: BattleScriptOperand,
): BattleScriptBlockReason {
  return Object.freeze({
    kind: "source-context-unavailable",
    programCounter: context.state.programCounter,
    opcodeId: context.instruction.opcodeId,
    opcodeName: context.instruction.opcodeName,
    port: "prepare-message",
    operandExpression: operand.expression,
  });
}

function blockBattleScriptCommand<RulesContext extends object>(
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
  reason: BattleScriptBlockReason,
) {
  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "block", reason }),
  );
}

function requireSingleHalfwordOperand<RulesContext extends object>(
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
): BattleScriptOperand {
  const [operand] = context.instruction.operands;
  if (!operand || operand.widthBytes !== 2 || context.instruction.operands.length !== 1) {
    throw new Error(
      `${context.instruction.opcodeName} requires exactly one 2-byte source operand`,
    );
  }
  return operand;
}

/**
 * First source-mapped scheduler family:
 * Cmd_nop, Cmd_waitstate, and Cmd_printstring.
 *
 * Controller readiness and source-context string preparation are injected
 * logical ports. This layer emits a typed message event but does not own
 * controller/presentation state or message substitution.
 */
export function createBattleScriptSourceCommandHandlers<RulesContext extends object>(
  program: BattleScriptProgram,
  ports: BattleScriptSourceCommandPorts<RulesContext>,
): BattleScriptOpcodeHandlers<RulesContext> {
  const handlers: Record<number, BattleScriptOpcodeHandler<RulesContext>> = Object.create(null) as Record<
    number,
    BattleScriptOpcodeHandler<RulesContext>
  >;

  installHandler(program, handlers, "B_SCR_OP_NOP", advanceBattleScriptInstruction);
  installHandler(program, handlers, "B_SCR_OP_WAITSTATE", (context) =>
    ports.isControllerIdle(context)
      ? advanceBattleScriptInstruction(context)
      : blockBattleScriptCommand(context, controllerBusyReason(context)));
  installHandler(program, handlers, "B_SCR_OP_PRINTSTRING", (context) => {
    if (!ports.isControllerIdle(context)) {
      return blockBattleScriptCommand(context, controllerBusyReason(context));
    }
    const operand = requireSingleHalfwordOperand(context);
    const message = ports.prepareMessage(context, operand);
    return message === null
      ? blockBattleScriptCommand(context, unavailableMessageReason(context, operand))
      : transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "advance" }),
        { events: Object.freeze([message]) },
      );
  });

  return Object.freeze(handlers);
}
