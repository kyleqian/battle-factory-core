import {
  drawBattleScriptRng,
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
import type { BattleScriptBattlerSelectorResolverPort } from "./battleScriptSourceCommands.ts";

export type BattleScriptMultiHitRulesContext = Readonly<{
  multiHitCounter: number;
  multiHitStringCounter: number;
  battlers: readonly Readonly<{ hp: number }>[];
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

function unavailableBattlerReason<
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
    port: "resolve-battler-for-battle-script",
    operandExpression: operand.expression,
  });
}

/**
 * Source-mapped multi-hit rules mutations: Cmd_setmultihit,
 * Cmd_decrementmultihit, Cmd_setmultihitcounter, Cmd_initmultihitstring, and
 * Cmd_jumpifhasnohp (docs/roar-multihit-registration-scout.md §4 rungs 2-3).
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
  resolveBattlerForBattleScript: BattleScriptBattlerSelectorResolverPort<RulesContext> = () => null,
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

  install("B_SCR_OP_SETMULTIHITCOUNTER", (context) => {
    const [operand] = context.instruction.operands;
    if (!operand || operand.widthBytes !== 1 || context.instruction.operands.length !== 1) {
      return haltForInvalidOperand(
        context,
        operand?.expression ?? "<missing>",
        `${context.instruction.operands.length} operands; width ${operand?.widthBytes ?? "<missing>"}`,
      );
    }

    const resolvedValue = resolveByteOperand(context, operand);
    if (resolvedValue === null) {
      return transitionBattleScriptCommand(
        context,
        Object.freeze({
          kind: "block",
          reason: unavailableByteReason(context, operand),
        }),
      );
    }
    if (
      !Number.isSafeInteger(resolvedValue)
      || resolvedValue < 0
      || resolvedValue > 0xff
    ) {
      return haltForInvalidOperand(
        context,
        operand.expression,
        String(resolvedValue),
      );
    }

    let multiHitCounter = resolvedValue;
    let rng = context.state.rng;
    if (multiHitCounter === 0) {
      const initial = drawBattleScriptRng(
        rng,
        context.instruction,
        "setmultihitcounter:initial",
      );
      rng = initial.rng;
      multiHitCounter = initial.randomValue & 3;
      if (multiHitCounter > 1) {
        const reroll = drawBattleScriptRng(
          rng,
          context.instruction,
          "setmultihitcounter:reroll",
        );
        rng = reroll.rng;
        multiHitCounter = (reroll.randomValue & 3) + 2;
      } else {
        multiHitCounter += 2;
      }
    }

    const rulesContext = Object.freeze({
      ...context.state.rulesContext,
      multiHitCounter,
    }) as RulesContext;
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      { rulesContext, rng },
    );
  });

  /**
   * `Cmd_initmultihitstring` (`battle_script_commands.c:7157-7161`):
   * `PREPARE_BYTE_NUMBER_BUFFER(gBattleScripting.multihitString, 1, 0)`, a
   * zero-operand text-formatting buffer init that zeroes `multihitString[4]`
   * (aka `sMULTIHIT_STRING + 4`, Triple Kick's own hits-landed counter) as
   * its `number` argument. PROGRESS 525 widened `Cmd_addbyte` to write this
   * counter (`battleScriptDamagingWeatherOpcode.ts`'s `multiHitStringCounter`
   * field) and docs/roar-multihit-registration-scout.md §4 rung 8 widens
   * `Cmd_jumpifbyte` to read it (`battleScriptJumpifbyteOpcode.ts`) -- this
   * opcode's own zeroing write is real now that both a writer and a reader
   * exist, not dead state. Every effect that calls `initmultihitstring`
   * (MULTI_HIT/DOUBLE_HIT/TWINEEDLE too) gets this reset harmlessly: only
   * Triple Kick's own script ever reads the counter back.
   */
  install("B_SCR_OP_INITMULTIHITSTRING", (context) => {
    const rulesContext = Object.freeze({
      ...context.state.rulesContext,
      multiHitStringCounter: 0,
    }) as RulesContext;
    return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }), { rulesContext });
  });

  /**
   * `Cmd_jumpifhasnohp` (`battle_script_commands.c:9609-9617`): resolve the
   * selector battler, jump on `hp === 0`, else fall through. No RNG, no
   * writes.
   */
  install("B_SCR_OP_JUMPIFHASNOHP", (context) => {
    const [battlerOperand, ptrOperand] = context.instruction.operands;
    if (
      !battlerOperand
      || !ptrOperand
      || context.instruction.operands.length !== 2
      || battlerOperand.widthBytes !== 1
      || ptrOperand.widthBytes !== 4
    ) {
      return haltForInvalidOperand(
        context,
        battlerOperand?.expression ?? "<missing>",
        `${context.instruction.operands.length} operands; width ${battlerOperand?.widthBytes ?? "<missing>"}`,
      );
    }

    const battler = resolveBattlerForBattleScript(context, battlerOperand);
    if (battler === null) {
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "block", reason: unavailableBattlerReason(context, battlerOperand) }),
      );
    }

    if (context.state.rulesContext.battlers[battler]!.hp !== 0) {
      return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
    }
    const target = resolveBattleScriptLabel(context.program, ptrOperand.expression);
    if (!target) throw new Error(`Cmd_jumpifhasnohp: unresolved jump target ${ptrOperand.expression}`);
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "jump", programCounter: target.programCounter }),
    );
  });

  return Object.freeze(handlers);
}
