import type {
  BattleScriptBattlerId,
  BattleScriptSelectionMessageSnapshot,
  BattleScriptSemanticEventPayload,
} from "./battleScriptEvents.ts";
import {
  advanceBattleScriptInstruction,
  createBattleScriptSelectionMessageSnapshot,
  createBattleScriptSchedulerState,
  isBattleScriptBattlerId,
  markBattleScriptControllerPending,
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

export type BattleScriptHalfwordResolverPort<RulesContext extends object> = (
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
  operand: BattleScriptOperand,
) => number | null;

export type BattleScriptAttackerResolverPort<RulesContext extends object> = (
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
) => BattleScriptBattlerId | null;

/** Typed boundary for Emerald's GetBattlerForBattleScript(u8 selector). */
export type BattleScriptBattlerSelectorResolverPort<RulesContext extends object> = (
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
  selectorOperand: BattleScriptOperand,
) => BattleScriptBattlerId | null;

export type BattleScriptSelectionMessagePreparation = Readonly<{
  attacker: BattleScriptBattlerId;
  stringId: number;
  snapshot: BattleScriptSelectionMessageSnapshot;
}>;

export type BattleScriptSelectionMessagePreparationPort<RulesContext extends object> = (
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
  stringIdOperand: BattleScriptOperand,
) => BattleScriptSelectionMessagePreparation | null;

/** Resolves a source u16-table pointer plus MULTISTRING_CHOOSER. */
export type BattleScriptSelectionMessageFromTablePreparationPort<RulesContext extends object> = (
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
  stringTablePointerOperand: BattleScriptOperand,
) => BattleScriptSelectionMessagePreparation | null;

export type BattleScriptSourceCommandPorts<RulesContext extends object> = Readonly<{
  isControllerIdle: BattleScriptControllerIdlePort<RulesContext>;
  prepareMessage: BattleScriptMessagePreparationPort<RulesContext>;
  prepareSelectionMessage: BattleScriptSelectionMessagePreparationPort<RulesContext>;
  prepareSelectionMessageFromTable: BattleScriptSelectionMessageFromTablePreparationPort<RulesContext>;
  resolveAttackerBattler: BattleScriptAttackerResolverPort<RulesContext>;
  resolveBattlerForBattleScript: BattleScriptBattlerSelectorResolverPort<RulesContext>;
  resolveHalfwordOperand: BattleScriptHalfwordResolverPort<RulesContext>;
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

function unavailableHalfwordReason<RulesContext extends object>(
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
  operand: BattleScriptOperand,
): BattleScriptBlockReason {
  return Object.freeze({
    kind: "source-context-unavailable",
    programCounter: context.state.programCounter,
    opcodeId: context.instruction.opcodeId,
    opcodeName: context.instruction.opcodeName,
    port: "resolve-halfword",
    operandExpression: operand.expression,
  });
}

function unavailableAttackerReason<RulesContext extends object>(
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
): BattleScriptBlockReason {
  return Object.freeze({
    kind: "source-context-unavailable",
    programCounter: context.state.programCounter,
    opcodeId: context.instruction.opcodeId,
    opcodeName: context.instruction.opcodeName,
    port: "resolve-attacker",
    operandExpression: "gBattlerAttacker",
  });
}

function unavailableBattlerSelectorReason<RulesContext extends object>(
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

function unavailableSelectionMessageReason<RulesContext extends object>(
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
  operand: BattleScriptOperand,
): BattleScriptBlockReason {
  return Object.freeze({
    kind: "source-context-unavailable",
    programCounter: context.state.programCounter,
    opcodeId: context.instruction.opcodeId,
    opcodeName: context.instruction.opcodeName,
    port: "prepare-selection-message",
    operandExpression: operand.expression,
  });
}

function unavailableSelectionMessageFromTableReason<RulesContext extends object>(
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
  operand: BattleScriptOperand,
): BattleScriptBlockReason {
  return Object.freeze({
    kind: "source-context-unavailable",
    programCounter: context.state.programCounter,
    opcodeId: context.instruction.opcodeId,
    opcodeName: context.instruction.opcodeName,
    port: "prepare-selection-message-from-table",
    operandExpression: operand.expression,
  });
}

function invalidSourceOperandReason<RulesContext extends object>(
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
  operandExpression: string,
  expected: "u8" | "u16" | "u16-table-pointer",
  received: string,
): BattleScriptHaltReason {
  return Object.freeze({
    kind: "invalid-source-operand",
    programCounter: context.state.programCounter,
    opcodeId: context.instruction.opcodeId,
    opcodeName: context.instruction.opcodeName,
    operandExpression,
    expected,
    received,
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

function haltForInvalidOperand<RulesContext extends object>(
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
  operandExpression: string,
  received: string,
  expected: "u8" | "u16" | "u16-table-pointer" = "u16",
): BattleScriptCommandTransition<RulesContext> {
  return transitionBattleScriptCommand(
    context,
    Object.freeze({
      kind: "halt",
      reason: invalidSourceOperandReason(context, operandExpression, expected, received),
    }),
  );
}

function haltForInvalidBattler<RulesContext extends object>(
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
  received: unknown,
): BattleScriptCommandTransition<RulesContext> {
  return transitionBattleScriptCommand(
    context,
    Object.freeze({
      kind: "halt",
      reason: Object.freeze({
        kind: "invalid-source-battler",
        programCounter: context.state.programCounter,
        opcodeId: context.instruction.opcodeId,
        opcodeName: context.instruction.opcodeName,
        received: String(received),
      }),
    }),
  );
}

function haltForInvalidSnapshot<RulesContext extends object>(
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
  error: unknown,
): BattleScriptCommandTransition<RulesContext> {
  return transitionBattleScriptCommand(
    context,
    Object.freeze({
      kind: "halt",
      reason: Object.freeze({
        kind: "invalid-source-snapshot",
        programCounter: context.state.programCounter,
        opcodeId: context.instruction.opcodeId,
        opcodeName: context.instruction.opcodeName,
        received: error instanceof Error ? error.message : String(error),
      }),
    }),
  );
}

type HalfwordOperandResult<RulesContext extends object> =
  | Readonly<{ kind: "operand"; operand: BattleScriptOperand }>
  | Readonly<{ kind: "transition"; transition: BattleScriptCommandTransition<RulesContext> }>;

type ByteOperandResult<RulesContext extends object> =
  | Readonly<{ kind: "operand"; operand: BattleScriptOperand }>
  | Readonly<{ kind: "transition"; transition: BattleScriptCommandTransition<RulesContext> }>;

type PointerOperandResult<RulesContext extends object> =
  | Readonly<{ kind: "operand"; operand: BattleScriptOperand }>
  | Readonly<{ kind: "transition"; transition: BattleScriptCommandTransition<RulesContext> }>;

function requireSingleU16TablePointerOperand<RulesContext extends object>(
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
): PointerOperandResult<RulesContext> {
  const [operand] = context.instruction.operands;
  if (!operand || operand.widthBytes !== 4 || context.instruction.operands.length !== 1) {
    return Object.freeze({
      kind: "transition",
      transition: haltForInvalidOperand(
        context,
        operand?.expression ?? "<missing>",
        `${context.instruction.operands.length} operands; width ${operand?.widthBytes ?? "<missing>"}`,
        "u16-table-pointer",
      ),
    });
  }
  return Object.freeze({ kind: "operand", operand });
}

function requireSingleHalfwordOperand<RulesContext extends object>(
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
): HalfwordOperandResult<RulesContext> {
  const [operand] = context.instruction.operands;
  if (!operand || operand.widthBytes !== 2 || context.instruction.operands.length !== 1) {
    return Object.freeze({
      kind: "transition",
      transition: haltForInvalidOperand(
        context,
        operand?.expression ?? "<missing>",
        `${context.instruction.operands.length} operands; width ${operand?.widthBytes ?? "<missing>"}`,
      ),
    });
  }
  return Object.freeze({ kind: "operand", operand });
}

function requireSingleByteOperand<RulesContext extends object>(
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
): ByteOperandResult<RulesContext> {
  const [operand] = context.instruction.operands;
  if (!operand || operand.widthBytes !== 1 || context.instruction.operands.length !== 1) {
    return Object.freeze({
      kind: "transition",
      transition: haltForInvalidOperand(
        context,
        operand?.expression ?? "<missing>",
        `${context.instruction.operands.length} operands; width ${operand?.widthBytes ?? "<missing>"}`,
        "u8",
      ),
    });
  }
  return Object.freeze({ kind: "operand", operand });
}

type ResolvedHalfwordResult<RulesContext extends object> =
  | Readonly<{ kind: "resolved"; value: number }>
  | Readonly<{ kind: "transition"; transition: BattleScriptCommandTransition<RulesContext> }>;

function resolveHalfwordOperand<RulesContext extends object>(
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
  ports: BattleScriptSourceCommandPorts<RulesContext>,
): ResolvedHalfwordResult<RulesContext> {
  const required = requireSingleHalfwordOperand(context);
  if (required.kind === "transition") return required;
  const value = ports.resolveHalfwordOperand(context, required.operand);
  if (value === null) {
    return Object.freeze({
      kind: "transition",
      transition: blockBattleScriptCommand(
        context,
        unavailableHalfwordReason(context, required.operand),
      ),
    });
  }
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffff) {
    return Object.freeze({
      kind: "transition",
      transition: haltForInvalidOperand(
        context,
        required.operand.expression,
        String(value),
      ),
    });
  }
  return Object.freeze({ kind: "resolved", value });
}

function incrementPauseCounter<RulesContext extends object>(
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
): number {
  return (context.state.scheduler.pauseCounterBattle + 1) & 0xffff;
}

function schedulerWith<RulesContext extends object>(
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
  changes: Readonly<{
    messageDisplayActive?: boolean;
    pauseCounterBattle?: number;
    activeBattler?: BattleScriptBattlerId | null;
    pendingControllerBattlers?: readonly BattleScriptBattlerId[];
  }>,
) {
  return createBattleScriptSchedulerState({
    messageDisplayActive:
      changes.messageDisplayActive ?? context.state.scheduler.messageDisplayActive,
    pauseCounterBattle:
      changes.pauseCounterBattle ?? context.state.scheduler.pauseCounterBattle,
    activeBattler:
      changes.activeBattler === undefined
        ? context.state.scheduler.activeBattler
        : changes.activeBattler,
    pendingControllerBattlers:
      changes.pendingControllerBattlers
      ?? context.state.scheduler.pendingControllerBattlers,
  });
}

function emitPreparedSelectionMessage<RulesContext extends object>(
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
  sourceOperand: BattleScriptOperand,
  preparation: BattleScriptSelectionMessagePreparation,
): BattleScriptCommandTransition<RulesContext> {
  if (
    !Number.isSafeInteger(preparation.stringId)
    || preparation.stringId < 0
    || preparation.stringId > 0xffff
  ) {
    return haltForInvalidOperand(
      context,
      sourceOperand.expression,
      String(preparation.stringId),
    );
  }
  if (!isBattleScriptBattlerId(preparation.attacker)) {
    return haltForInvalidBattler(context, preparation.attacker);
  }

  let snapshot: BattleScriptSelectionMessageSnapshot;
  try {
    snapshot = createBattleScriptSelectionMessageSnapshot(preparation.snapshot);
  } catch (error) {
    return haltForInvalidSnapshot(context, error);
  }
  const scheduler = markBattleScriptControllerPending(
    schedulerWith(context, {
      messageDisplayActive: true,
      activeBattler: preparation.attacker,
    }),
    preparation.attacker,
  );
  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "advance" }),
    {
      scheduler,
      events: Object.freeze([
        Object.freeze({
          kind: "selection-message",
          audience: "player-only",
          battler: preparation.attacker,
          stringId: preparation.stringId,
          snapshot,
        }),
      ]),
    },
  );
}

function emitAudioControllerEvent<RulesContext extends object>(
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
  ports: BattleScriptSourceCommandPorts<RulesContext>,
  kind: "play-se" | "play-fanfare",
): BattleScriptCommandTransition<RulesContext> {
  const resolved = resolveHalfwordOperand(context, ports);
  if (resolved.kind === "transition") return resolved.transition;
  const attacker = ports.resolveAttackerBattler(context);
  if (attacker === null) {
    return blockBattleScriptCommand(context, unavailableAttackerReason(context));
  }
  if (!isBattleScriptBattlerId(attacker)) {
    return haltForInvalidBattler(context, attacker);
  }
  const scheduler = markBattleScriptControllerPending(
    schedulerWith(context, { activeBattler: attacker }),
    attacker,
  );
  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "advance" }),
    {
      scheduler,
      events: Object.freeze([
        Object.freeze({ kind, battler: attacker, songId: resolved.value }),
      ]),
    },
  );
}

function emitFaintCryControllerEvent<RulesContext extends object>(
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
  ports: BattleScriptSourceCommandPorts<RulesContext>,
): BattleScriptCommandTransition<RulesContext> {
  const required = requireSingleByteOperand(context);
  if (required.kind === "transition") return required.transition;
  const battler = ports.resolveBattlerForBattleScript(context, required.operand);
  if (battler === null) {
    return blockBattleScriptCommand(
      context,
      unavailableBattlerSelectorReason(context, required.operand),
    );
  }
  if (!isBattleScriptBattlerId(battler)) {
    return haltForInvalidBattler(context, battler);
  }
  const scheduler = markBattleScriptControllerPending(
    schedulerWith(context, { activeBattler: battler }),
    battler,
  );
  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "advance" }),
    {
      scheduler,
      events: Object.freeze([
        Object.freeze({ kind: "play-faint-cry", battler }),
      ]),
    },
  );
}

function emitHidePartyStatusSummaryControllerEvent<RulesContext extends object>(
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
  ports: BattleScriptSourceCommandPorts<RulesContext>,
): BattleScriptCommandTransition<RulesContext> {
  const required = requireSingleByteOperand(context);
  if (required.kind === "transition") return required.transition;
  const battler = ports.resolveBattlerForBattleScript(context, required.operand);
  if (battler === null) {
    return blockBattleScriptCommand(
      context,
      unavailableBattlerSelectorReason(context, required.operand),
    );
  }
  if (!isBattleScriptBattlerId(battler)) {
    return haltForInvalidBattler(context, battler);
  }
  const scheduler = markBattleScriptControllerPending(
    schedulerWith(context, { activeBattler: battler }),
    battler,
  );
  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "advance" }),
    {
      scheduler,
      events: Object.freeze([
        Object.freeze({ kind: "hide-party-status-summary", battler }),
      ]),
    },
  );
}

function emitMakeVisibleControllerEvent<RulesContext extends object>(
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
  ports: BattleScriptSourceCommandPorts<RulesContext>,
): BattleScriptCommandTransition<RulesContext> {
  const required = requireSingleByteOperand(context);
  if (required.kind === "transition") return required.transition;
  const battler = ports.resolveBattlerForBattleScript(context, required.operand);
  if (battler === null) {
    return blockBattleScriptCommand(
      context,
      unavailableBattlerSelectorReason(context, required.operand),
    );
  }
  if (!isBattleScriptBattlerId(battler)) {
    return haltForInvalidBattler(context, battler);
  }
  const scheduler = markBattleScriptControllerPending(
    schedulerWith(context, { activeBattler: battler }),
    battler,
  );
  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "advance" }),
    {
      scheduler,
      events: Object.freeze([
        Object.freeze({
          kind: "set-battler-sprite-visibility",
          battler,
          invisible: false,
        }),
      ]),
    },
  );
}

/**
 * First source-mapped scheduler family:
 * Cmd_nop, Cmd_waitstate, Cmd_printstring, Cmd_printselectionstring,
 * Cmd_printselectionstringfromtable, Cmd_waitmessage, Cmd_pause, Cmd_playse,
 * Cmd_fanfare, Cmd_playfaintcry, Cmd_hidepartystatussummary, and
 * Cmd_makevisible.
 *
 * Controller readiness, source-context string preparation, and exact u16
 * operand resolution are injected logical ports. MSG_DISPLAY and the shared
 * gPauseCounterBattle are immutable scheduler state; they never live in
 * presentation or rules state.
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
    const required = requireSingleHalfwordOperand(context);
    if (required.kind === "transition") return required.transition;
    const message = ports.prepareMessage(context, required.operand);
    return message === null
      ? blockBattleScriptCommand(
        context,
        unavailableMessageReason(context, required.operand),
      )
      : transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "advance" }),
        {
          scheduler: schedulerWith(context, { messageDisplayActive: true }),
          events: Object.freeze([message]),
        },
      );
  });
  installHandler(program, handlers, "B_SCR_OP_PRINTSELECTIONSTRING", (context) => {
    const required = requireSingleHalfwordOperand(context);
    if (required.kind === "transition") return required.transition;
    const preparation = ports.prepareSelectionMessage(context, required.operand);
    if (preparation === null) {
      return blockBattleScriptCommand(
        context,
        unavailableSelectionMessageReason(context, required.operand),
      );
    }
    return emitPreparedSelectionMessage(context, required.operand, preparation);
  });
  installHandler(program, handlers, "B_SCR_OP_PRINTSELECTIONSTRINGFROMTABLE", (context) => {
    if (!ports.isControllerIdle(context)) {
      return blockBattleScriptCommand(context, controllerBusyReason(context));
    }
    const required = requireSingleU16TablePointerOperand(context);
    if (required.kind === "transition") return required.transition;
    const preparation = ports.prepareSelectionMessageFromTable(
      context,
      required.operand,
    );
    if (preparation === null) {
      return blockBattleScriptCommand(
        context,
        unavailableSelectionMessageFromTableReason(context, required.operand),
      );
    }
    return emitPreparedSelectionMessage(context, required.operand, preparation);
  });
  installHandler(program, handlers, "B_SCR_OP_PLAYSE", (context) =>
    emitAudioControllerEvent(context, ports, "play-se"));
  installHandler(program, handlers, "B_SCR_OP_FANFARE", (context) =>
    emitAudioControllerEvent(context, ports, "play-fanfare"));
  installHandler(program, handlers, "B_SCR_OP_PLAYFAINTCRY", (context) =>
    emitFaintCryControllerEvent(context, ports));
  installHandler(program, handlers, "B_SCR_OP_HIDEPARTYSTATUSSUMMARY", (context) =>
    emitHidePartyStatusSummaryControllerEvent(context, ports));
  installHandler(program, handlers, "B_SCR_OP_MAKEVISIBLE", (context) =>
    emitMakeVisibleControllerEvent(context, ports));
  installHandler(program, handlers, "B_SCR_OP_WAITMESSAGE", (context) => {
    if (!ports.isControllerIdle(context)) {
      return blockBattleScriptCommand(context, controllerBusyReason(context));
    }
    if (!context.state.scheduler.messageDisplayActive) {
      return advanceBattleScriptInstruction(context);
    }
    const resolved = resolveHalfwordOperand(context, ports);
    if (resolved.kind === "transition") return resolved.transition;
    const pauseCounterBattle = incrementPauseCounter(context);
    return pauseCounterBattle >= resolved.value
      ? transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "advance" }),
        {
          scheduler: schedulerWith(context, {
            messageDisplayActive: false,
            pauseCounterBattle: 0,
          }),
        },
      )
      : transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "scheduler-progress" }),
        {
          scheduler: schedulerWith(context, { pauseCounterBattle }),
        },
      );
  });
  installHandler(program, handlers, "B_SCR_OP_PAUSE", (context) => {
    if (!ports.isControllerIdle(context)) {
      return blockBattleScriptCommand(context, controllerBusyReason(context));
    }
    const resolved = resolveHalfwordOperand(context, ports);
    if (resolved.kind === "transition") return resolved.transition;
    const pauseCounterBattle = incrementPauseCounter(context);
    return pauseCounterBattle >= resolved.value
      ? transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "advance" }),
        {
          scheduler: schedulerWith(context, { pauseCounterBattle: 0 }),
        },
      )
      : transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "scheduler-progress" }),
        {
          scheduler: schedulerWith(context, { pauseCounterBattle }),
        },
      );
  });

  return Object.freeze(handlers);
}
