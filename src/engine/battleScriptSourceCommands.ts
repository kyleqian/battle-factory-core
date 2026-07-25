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
import { BATTLE_SCRIPT_STATUS2_MASKS } from "./battleScriptSourceConstants.ts";

export type BattleScriptMessagePayload = Extract<
  BattleScriptSemanticEventPayload,
  Readonly<{ kind: "message" }>
>;

type BattleScriptSelectedBattlerControllerEventPayload = Extract<
  BattleScriptSemanticEventPayload,
  Readonly<{
    kind:
      | "play-faint-cry"
      | "faint-animation"
      | "hide-party-status-summary"
      | "draw-party-status-summary"
      | "set-battler-sprite-visibility";
  }>
>;

type BattleScriptTrainerSlideEventPayload = Extract<
  BattleScriptSemanticEventPayload,
  Readonly<{ kind: "trainer-slide-in" | "trainer-slide-out" }>
>;

export type BattleScriptStatusAnimationReceipt = Extract<
  BattleScriptSemanticEventPayload,
  Readonly<{ kind: "status-animation" }>
>;

export type BattleScriptStatusAnimationRequest =
  | Readonly<{ kind: "live-status1" }>
  | Readonly<{ kind: "masked-live-status2"; wantedMask: number }>
  | Readonly<{ kind: "explicit-status"; isStatus2: number; status: number }>;

export type BattleScriptStatusAnimationPreparation =
  | Readonly<{
    kind: "emit";
    receipt: BattleScriptStatusAnimationReceipt;
  }>
  | Readonly<{
    kind: "suppress";
  }>;

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

/** Typed boundary for Emerald's GetBattlerAtPosition(u8 position). */
export type BattleScriptBattlerPositionResolverPort<RulesContext extends object> = (
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
  positionOperand: BattleScriptOperand,
) => BattleScriptBattlerId | null;

/**
 * Rules-owned boundary for the status-animation family's status/predicate snapshot.
 * The port returns either the exact frozen receipt to enqueue or suppression;
 * the interpreter does not inspect status, substitute, semi-invulnerability,
 * hit-marker, or any other battle-rule field.
 */
export type BattleScriptStatusAnimationPreparationPort<
  RulesContext extends object,
> = (
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
  battler: BattleScriptBattlerId,
  request: BattleScriptStatusAnimationRequest,
) => BattleScriptStatusAnimationPreparation | null;

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
  prepareStatusAnimation: BattleScriptStatusAnimationPreparationPort<RulesContext>;
  resolveAttackerBattler: BattleScriptAttackerResolverPort<RulesContext>;
  resolveBattlerAtPosition: BattleScriptBattlerPositionResolverPort<RulesContext>;
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

function unavailableBattlerPositionReason<RulesContext extends object>(
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
  operand: BattleScriptOperand,
): BattleScriptBlockReason {
  return Object.freeze({
    kind: "source-context-unavailable",
    programCounter: context.state.programCounter,
    opcodeId: context.instruction.opcodeId,
    opcodeName: context.instruction.opcodeName,
    port: "resolve-battler-at-position",
    operandExpression: operand.expression,
  });
}

function unavailableStatusAnimationReason<RulesContext extends object>(
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
  operand: BattleScriptOperand,
): BattleScriptBlockReason {
  return Object.freeze({
    kind: "source-context-unavailable",
    programCounter: context.state.programCounter,
    opcodeId: context.instruction.opcodeId,
    opcodeName: context.instruction.opcodeName,
    port: "prepare-status-animation",
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
  expected: "none" | "u8" | "u16" | "u32" | "u16-table-pointer",
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
  expected: "none" | "u8" | "u16" | "u32" | "u16-table-pointer" = "u16",
): BattleScriptCommandTransition<RulesContext> {
  return transitionBattleScriptCommand(
    context,
    Object.freeze({
      kind: "halt",
      reason: invalidSourceOperandReason(context, operandExpression, expected, received),
    }),
  );
}

function requireNoOperands<RulesContext extends object>(
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
): BattleScriptCommandTransition<RulesContext> | null {
  if (context.instruction.operands.length === 0) return null;
  return haltForInvalidOperand(
    context,
    context.instruction.operands[0]?.expression ?? "<none>",
    `${context.instruction.operands.length} operands`,
    "none",
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

function emitSelectedBattlerControllerEvent<RulesContext extends object>(
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
  ports: BattleScriptSourceCommandPorts<RulesContext>,
  createEvent: (
    battler: BattleScriptBattlerId,
  ) => BattleScriptSelectedBattlerControllerEventPayload,
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
        Object.freeze(createEvent(battler)),
      ]),
    },
  );
}

function emitTrainerSlideControllerEvent<RulesContext extends object>(
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
  ports: BattleScriptSourceCommandPorts<RulesContext>,
  kind: "trainer-slide-in" | "trainer-slide-out",
): BattleScriptCommandTransition<RulesContext> {
  const required = requireSingleByteOperand(context);
  if (required.kind === "transition") return required.transition;
  const battler = ports.resolveBattlerAtPosition(context, required.operand);
  if (battler === null) {
    return blockBattleScriptCommand(
      context,
      unavailableBattlerPositionReason(context, required.operand),
    );
  }
  if (!isBattleScriptBattlerId(battler)) {
    return haltForInvalidBattler(context, battler);
  }
  const scheduler = markBattleScriptControllerPending(
    schedulerWith(context, { activeBattler: battler }),
    battler,
  );
  const event: BattleScriptTrainerSlideEventPayload = Object.freeze({
    kind,
    battler,
  });
  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "advance" }),
    {
      scheduler,
      events: Object.freeze([event]),
    },
  );
}

function decodeStatusAnimationInteger(
  expression: string,
  maximum: number,
): number | null {
  const constant = BATTLE_SCRIPT_STATUS2_MASKS[
    expression as keyof typeof BATTLE_SCRIPT_STATUS2_MASKS
  ];
  if (constant !== undefined && constant <= maximum) return constant;
  if (!/^(?:0[xX][0-9a-fA-F]+|[0-9]+)$/.test(expression)) return null;
  const value = Number(expression);
  return Number.isSafeInteger(value) && value >= 0 && value <= maximum ? value : null;
}

type StatusAnimationOperandsResult<RulesContext extends object> =
  | Readonly<{
    kind: "operands";
    selector: BattleScriptOperand;
    request: BattleScriptStatusAnimationRequest;
  }>
  | Readonly<{
    kind: "transition";
    transition: BattleScriptCommandTransition<RulesContext>;
  }>;

function requireStatusAnimationOperands<RulesContext extends object>(
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
  requestKind: BattleScriptStatusAnimationRequest["kind"],
): StatusAnimationOperandsResult<RulesContext> {
  const operands = context.instruction.operands;
  const selector = operands[0];
  const expectedWidths = requestKind === "live-status1"
    ? [1]
    : requestKind === "masked-live-status2"
    ? [1, 4]
    : [1, 1, 4];
  if (
    operands.length !== expectedWidths.length
    || expectedWidths.some((width, index) => operands[index]?.widthBytes !== width)
  ) {
    return Object.freeze({
      kind: "transition",
      transition: haltForInvalidOperand(
        context,
        selector?.expression ?? "<missing>",
        `${operands.length} operands; widths ${operands.map(({ widthBytes }) => widthBytes).join(",") || "<missing>"}`,
        "u8",
      ),
    });
  }
  if (!selector) throw new Error("validated status-animation selector is missing");
  if (requestKind === "live-status1") {
    return Object.freeze({
      kind: "operands",
      selector,
      request: Object.freeze({ kind: "live-status1" }),
    });
  }
  if (requestKind === "masked-live-status2") {
    const wantedMask = decodeStatusAnimationInteger(operands[1]!.expression, 0xffff_ffff);
    if (wantedMask === null) {
      return Object.freeze({
        kind: "transition",
        transition: haltForInvalidOperand(
          context,
          operands[1]!.expression,
          operands[1]!.expression,
          "u32",
        ),
      });
    }
    return Object.freeze({
      kind: "operands",
      selector,
      request: Object.freeze({ kind: "masked-live-status2", wantedMask }),
    });
  }
  const isStatus2 = decodeStatusAnimationInteger(operands[1]!.expression, 0xff);
  const status = decodeStatusAnimationInteger(operands[2]!.expression, 0xffff_ffff);
  if (isStatus2 === null || status === null) {
    const invalid = isStatus2 === null ? operands[1]! : operands[2]!;
    return Object.freeze({
      kind: "transition",
      transition: haltForInvalidOperand(
        context,
        invalid.expression,
        invalid.expression,
        invalid.widthBytes === 1 ? "u8" : "u32",
      ),
    });
  }
  return Object.freeze({
    kind: "operands",
    selector,
    request: Object.freeze({ kind: "explicit-status", isStatus2, status }),
  });
}

function executeStatusAnimation<RulesContext extends object>(
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
  ports: BattleScriptSourceCommandPorts<RulesContext>,
  requestKind: BattleScriptStatusAnimationRequest["kind"],
): BattleScriptCommandTransition<RulesContext> {
  if (!ports.isControllerIdle(context)) {
    return blockBattleScriptCommand(context, controllerBusyReason(context));
  }
  const required = requireStatusAnimationOperands(context, requestKind);
  if (required.kind === "transition") return required.transition;
  const battler = ports.resolveBattlerForBattleScript(context, required.selector);
  if (battler === null) {
    return blockBattleScriptCommand(
      context,
      unavailableBattlerSelectorReason(context, required.selector),
    );
  }
  if (!isBattleScriptBattlerId(battler)) {
    return haltForInvalidBattler(context, battler);
  }
  const preparation = ports.prepareStatusAnimation(context, battler, required.request);
  if (preparation === null) {
    return blockBattleScriptCommand(
      context,
      unavailableStatusAnimationReason(context, required.selector),
    );
  }
  if (
    (preparation.kind !== "emit" && preparation.kind !== "suppress")
    || !Object.isFrozen(preparation)
    || (
      preparation.kind === "emit"
      && (
        typeof preparation.receipt !== "object"
        || preparation.receipt === null
        || !Object.isFrozen(preparation.receipt)
      )
    )
  ) {
    return haltForInvalidSnapshot(
      context,
      "status-animation preparation and receipt must be frozen",
    );
  }
  const baseScheduler = schedulerWith(context, { activeBattler: battler });
  if (preparation.kind === "suppress") {
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      { scheduler: baseScheduler },
    );
  }
  const { receipt } = preparation;
  if (
    receipt.kind !== "status-animation"
    || receipt.battler !== battler
    || !Number.isSafeInteger(receipt.isStatus2)
    || receipt.isStatus2 < 0
    || receipt.isStatus2 > 0xff
    || !Number.isSafeInteger(receipt.status)
    || receipt.status < 0
    || receipt.status > 0xffff_ffff
  ) {
    return haltForInvalidSnapshot(context, "invalid status-animation receipt");
  }
  const requestMatchesReceipt =
    required.request.kind === "live-status1"
      ? receipt.isStatus2 === 0
      : required.request.kind === "masked-live-status2"
      ? (
        receipt.isStatus2 === 1
        && ((receipt.status >>> 0) & (~required.request.wantedMask >>> 0)) === 0
      )
      : (
        receipt.isStatus2 === required.request.isStatus2
        && receipt.status === required.request.status
      );
  if (!requestMatchesReceipt) {
    return haltForInvalidSnapshot(context, "status-animation receipt does not match request");
  }
  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "advance" }),
    {
      scheduler: markBattleScriptControllerPending(baseScheduler, battler),
      events: Object.freeze([receipt]),
    },
  );
}

/**
 * First source-mapped scheduler family:
 * Cmd_nop, Cmd_waitanimation, Cmd_waitstate, Cmd_printstring, Cmd_printselectionstring,
 * Cmd_printselectionstringfromtable, Cmd_waitmessage, Cmd_pause, Cmd_playse,
 * Cmd_fanfare, Cmd_playfaintcry, Cmd_dofaintanimation, Cmd_hidepartystatussummary, and
 * Cmd_makevisible, Cmd_trainerslidein, Cmd_trainerslideout, and
 * Cmd_statusanimation, Cmd_status2animation, and Cmd_chosenstatusanimation.
 *
 * Cmd_dofaintanimation (battle_script_commands.c:3052-3060) is a controller
 * FaintAnimation emit only -- no gBattleMons/RNG touch -- so it reuses this
 * same selected-battler-event shape exactly like Cmd_playfaintcry.
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
  installHandler(program, handlers, "B_SCR_OP_WAITANIMATION", (context) => {
    const malformed = requireNoOperands(context);
    if (malformed) return malformed;
    return ports.isControllerIdle(context)
      ? advanceBattleScriptInstruction(context)
      : blockBattleScriptCommand(context, controllerBusyReason(context));
  });
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
    emitSelectedBattlerControllerEvent(
      context,
      ports,
      (battler) => ({ kind: "play-faint-cry", battler }),
    ));
  installHandler(program, handlers, "B_SCR_OP_DOFAINTANIMATION", (context) =>
    emitSelectedBattlerControllerEvent(
      context,
      ports,
      (battler) => ({ kind: "faint-animation", battler }),
    ));
  installHandler(program, handlers, "B_SCR_OP_HIDEPARTYSTATUSSUMMARY", (context) =>
    emitSelectedBattlerControllerEvent(
      context,
      ports,
      (battler) => ({ kind: "hide-party-status-summary", battler }),
    ));
  installHandler(program, handlers, "B_SCR_OP_DRAWPARTYSTATUSSUMMARY", (context) =>
    emitSelectedBattlerControllerEvent(
      context,
      ports,
      (battler) => ({ kind: "draw-party-status-summary", battler }),
    ));
  installHandler(program, handlers, "B_SCR_OP_MAKEVISIBLE", (context) =>
    emitSelectedBattlerControllerEvent(
      context,
      ports,
      (battler) => ({
        kind: "set-battler-sprite-visibility",
        battler,
        invisible: false,
      }),
    ));
  installHandler(program, handlers, "B_SCR_OP_TRAINERSLIDEIN", (context) =>
    emitTrainerSlideControllerEvent(context, ports, "trainer-slide-in"));
  installHandler(program, handlers, "B_SCR_OP_TRAINERSLIDEOUT", (context) =>
    emitTrainerSlideControllerEvent(context, ports, "trainer-slide-out"));
  installHandler(program, handlers, "B_SCR_OP_STATUSANIMATION", (context) =>
    executeStatusAnimation(context, ports, "live-status1"));
  installHandler(program, handlers, "B_SCR_OP_STATUS2ANIMATION", (context) =>
    executeStatusAnimation(context, ports, "masked-live-status2"));
  installHandler(program, handlers, "B_SCR_OP_CHOSENSTATUSANIMATION", (context) =>
    executeStatusAnimation(context, ports, "explicit-status"));
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
