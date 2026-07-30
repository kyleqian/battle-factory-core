import { advanceRngValue } from "./rng.ts";
import type {
  BattleScriptBattlerId,
  BattleScriptEventProvenance,
  BattleScriptSelectionMessageSnapshot,
  BattleScriptSemanticEvent,
  BattleScriptSemanticEventPayload,
} from "./battleScriptEvents.ts";
import type {
  BattleScriptInstruction,
  BattleScriptProgram,
} from "./battleScriptProgram.ts";
import { resolveBattleScriptLabel } from "./battleScriptProgram.ts";

export type BattleScriptHaltReason =
  | Readonly<{
    kind: "terminal";
    programCounter: number;
    opcodeId: number;
    opcodeName: string;
  }>
  | Readonly<{
    /**
     * `Cmd_end3` (`battle_script_commands.c:3966-3973`, `docs/end3-design.md`
     * §1.3/§2.3): deliberately NOT `"terminal"` -- `end3` pops the caller's
     * script cursor AND the external `battleCallbackStack`, but unlike
     * `end`/`end2` never sets `gCurrentActionFuncId = B_ACTION_TRY_FINISH`.
     * This machine has no notion of the callback stack itself (it lives at
     * orchestration level, `battleEndTurnOrchestration.ts`'s
     * `runPushCursorAndCallbackTickScript`) -- this halt only marks "an
     * END3 opcode was reached"; the caller that pushed the matching frame
     * is the only one that may consume it.
     */
    kind: "end3";
    programCounter: number;
    opcodeId: number;
    opcodeName: string;
  }>
  | Readonly<{
    /**
     * `Cmd_openpartyscreen`'s player-side branch (`PlayerHandleChoosePokemon`,
     * `docs/forced-switch-ground-truth.md` §3/§4 slice 10): a real, human-
     * timescale decision this opcode-machine layer cannot resolve
     * synchronously (unlike the AI/trainer side's own
     * `GetMostSuitableMonToSwitchInto` scoring, which advances immediately).
     * Distinct from `unsupported-branch` -- this is a genuine, intentional
     * halt naming the legal replacement slots, not a not-yet-modeled branch;
     * a caller resumes by writing the chosen index into
     * `monToSwitchIntoId[battler]` and re-stepping from this same program
     * counter (`battleScriptFaintedActionsOrchestration.ts`'s
     * `resumeBattleScriptFaintedActionsAfterPlayerChoice`).
     */
    kind: "player-choice-required";
    programCounter: number;
    opcodeId: number;
    opcodeName: string;
    battler: BattleScriptBattlerId;
    /** The fainted battler's own (now-vacated) party slot -- never itself legal. */
    faintedPartyIndex: number;
    /** Bench slots that are alive (hp>0), non-egg, and not `faintedPartyIndex`. */
    legalPartyIndexes: readonly number[];
  }>
  | Readonly<{
    kind: "unsupported-opcode";
    programCounter: number;
    opcodeId: number;
    opcodeName: string;
    dispatcher: string;
  }>
  | Readonly<{
    kind: "unsupported-branch";
    programCounter: number;
    opcodeId: number;
    opcodeName: string;
    /** The source construct this branch would execute, e.g. "Snatch redirect loop". */
    sourceConstruct: string;
    sourceFile: string;
    sourceLine: number;
  }>
  | Readonly<{
    kind: "instruction-budget";
    programCounter: number;
    budget: number;
  }>
  | Readonly<{
    kind: "invalid-program-counter";
    programCounter: number;
  }>
  | Readonly<{
    kind: "invalid-control-target";
    programCounter: number;
    expression: string;
  }>
  | Readonly<{
    kind: "invalid-source-operand";
    programCounter: number;
    opcodeId: number;
    opcodeName: string;
    operandExpression: string;
    expected: "none" | "u8" | "u16" | "u32" | "u16-table-pointer";
    received: string;
  }>
  | Readonly<{
    kind: "invalid-source-battler";
    programCounter: number;
    opcodeId: number;
    opcodeName: string;
    received: string;
  }>
  | Readonly<{
    kind: "invalid-source-snapshot";
    programCounter: number;
    opcodeId: number;
    opcodeName: string;
    received: string;
  }>
  | Readonly<{
    kind: "return-stack-underflow";
    programCounter: number;
  }>;

export type BattleScriptRngLedgerEntry = Readonly<{
  call: number;
  reason: string;
  before: number;
  after: number;
  randomValue: number;
  provenance: Omit<BattleScriptEventProvenance, "instructionExecution">;
}>;

export type BattleScriptRngState = Readonly<{
  value: number;
  calls: number;
  ledger: readonly BattleScriptRngLedgerEntry[];
}>;

export type BattleScriptSchedulerState = Readonly<{
  messageDisplayActive: boolean;
  pauseCounterBattle: number;
  activeBattler: BattleScriptBattlerId | null;
  pendingControllerBattlers: readonly BattleScriptBattlerId[];
}>;

export type BattleScriptMachineState<RulesContext extends object> = Readonly<{
  programCounter: number;
  callStack: readonly number[];
  instructionsExecuted: number;
  haltReason: BattleScriptHaltReason | null;
  scheduler: BattleScriptSchedulerState;
  rulesContext: RulesContext;
  rng: BattleScriptRngState;
  events: readonly BattleScriptSemanticEvent[];
}>;

export type BattleScriptControlDirective =
  | Readonly<{ kind: "advance" }>
  | Readonly<{ kind: "jump"; programCounter: number }>
  | Readonly<{ kind: "call"; programCounter: number }>
  | Readonly<{ kind: "call-current"; programCounter: number }>
  /**
   * BattleScriptPush(BS_ptr) followed by an unrelated jump -- ChangeStatBuffs'
   * own Mist/Clear Body/White Smoke/Keen Eye/Hyper Cutter branches
   * (battle_script_commands.c:6937-7098) push an EXPLICIT operand-derived
   * pointer (the calling statbuffchange instruction's own jumpptr operand),
   * not "the instruction right after this one" -- distinct from "call"/
   * "call-current", whose return address is always derived from the current
   * program counter.
   */
  | Readonly<{ kind: "call-explicit"; programCounter: number; returnProgramCounter: number }>
  /** BattleScriptPop followed by an unrelated jump (tryfaintmon_spikes). */
  | Readonly<{ kind: "jump-pop"; programCounter: number }>
  /**
   * Source performs multiple consecutive `BattleScriptPush` calls before
   * selecting a new cursor. Entries are appended in source push order, so the
   * final entry is the first one popped by `return`.
   */
  | Readonly<{ kind: "call-stack"; programCounter: number; returnProgramCounters: readonly number[] }>
  | Readonly<{ kind: "return" }>
  | Readonly<{ kind: "controller-return" }>
  | Readonly<{ kind: "scheduler-progress" }>
  | Readonly<{ kind: "block"; reason: BattleScriptBlockReason }>
  | Readonly<{ kind: "halt"; reason: BattleScriptHaltReason }>;

export type BattleScriptBlockReason =
  | Readonly<{
    kind: "controller-busy";
    programCounter: number;
    opcodeId: number;
    opcodeName: string;
  }>
  | Readonly<{
    kind: "source-context-unavailable";
    programCounter: number;
    opcodeId: number;
    opcodeName: string;
    port:
      | "prepare-message"
      | "prepare-selection-message"
      | "prepare-selection-message-from-table"
      | "resolve-attacker"
      | "resolve-battler-at-position"
      | "resolve-battler-for-battle-script"
      | "prepare-status-animation"
      | "resolve-byte"
      | "resolve-halfword";
    operandExpression: string;
  }>;

export type BattleScriptOpcodeHandlerContext<RulesContext extends object> = Readonly<{
  program: BattleScriptProgram;
  instruction: BattleScriptInstruction;
  state: BattleScriptMachineState<RulesContext>;
}>;

export type BattleScriptCommandTransition<RulesContext extends object> = Readonly<{
  control: BattleScriptControlDirective;
  scheduler: BattleScriptSchedulerState;
  rulesContext: RulesContext;
  rng: BattleScriptRngState;
  events: readonly BattleScriptSemanticEventPayload[];
}>;

export type BattleScriptOpcodeHandler<RulesContext extends object> = (
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
) => BattleScriptCommandTransition<RulesContext>;

export type BattleScriptOpcodeHandlers<RulesContext extends object> = Readonly<
  Record<number, BattleScriptOpcodeHandler<RulesContext>>
>;

export type BattleScriptStepResult<RulesContext extends object> =
  | Readonly<{ kind: "advanced"; state: BattleScriptMachineState<RulesContext>; instruction: BattleScriptInstruction }>
  | Readonly<{ kind: "scheduler-progressed"; state: BattleScriptMachineState<RulesContext>; instruction: BattleScriptInstruction }>
  | Readonly<{ kind: "blocked"; state: BattleScriptMachineState<RulesContext>; instruction: BattleScriptInstruction; reason: BattleScriptBlockReason }>
  | Readonly<{ kind: "halted"; state: BattleScriptMachineState<RulesContext>; instruction?: BattleScriptInstruction }>
  | Readonly<{ kind: "unsupported"; state: BattleScriptMachineState<RulesContext>; instruction: BattleScriptInstruction }>;

export type BattleScriptRunResult<RulesContext extends object> =
  | Readonly<{ kind: "blocked"; state: BattleScriptMachineState<RulesContext>; instruction: BattleScriptInstruction; reason: BattleScriptBlockReason }>
  | Readonly<{ kind: "halted"; state: BattleScriptMachineState<RulesContext> }>
  | Readonly<{ kind: "unsupported"; state: BattleScriptMachineState<RulesContext>; instruction: BattleScriptInstruction }>
  | Readonly<{ kind: "budget-exhausted"; state: BattleScriptMachineState<RulesContext> }>;

export type BattleScriptMachineInspection = Readonly<{
  programCounter: number;
  callStack: readonly number[];
  instructionsExecuted: number;
  haltReason: BattleScriptHaltReason | null;
  currentInstruction: BattleScriptInstruction | null;
  labels: readonly string[];
  scheduler: BattleScriptSchedulerState;
  rngCalls: number;
  eventCount: number;
}>;

const ADVANCE = Object.freeze({ kind: "advance" as const });
const RETURN = Object.freeze({ kind: "return" as const });

function instructionProvenance(
  instruction: BattleScriptInstruction,
): Omit<BattleScriptEventProvenance, "instructionExecution"> {
  return Object.freeze({
    programCounter: instruction.programCounter,
    opcodeId: instruction.opcodeId,
    opcodeName: instruction.opcodeName,
    dispatcher: instruction.dispatcher,
    sourceLabel: instruction.source.label,
    sourceStatementLine: instruction.source.statementLine,
  });
}

export function createBattleScriptRngState(seed: number): BattleScriptRngState {
  if (!Number.isSafeInteger(seed) || seed < 0) {
    throw new Error(`Battle Script RNG seed must be a non-negative safe integer, got ${seed}`);
  }
  return Object.freeze({
    value: seed >>> 0,
    calls: 0,
    ledger: Object.freeze([]),
  });
}

export function createBattleScriptSchedulerState(
  initial: Readonly<{
    messageDisplayActive?: boolean;
    pauseCounterBattle?: number;
    activeBattler?: BattleScriptBattlerId | null;
    pendingControllerBattlers?: readonly BattleScriptBattlerId[];
  }> = {},
): BattleScriptSchedulerState {
  const messageDisplayActive = initial.messageDisplayActive ?? false;
  const pauseCounterBattle = initial.pauseCounterBattle ?? 0;
  const activeBattler = initial.activeBattler ?? null;
  const pendingControllerBattlers = initial.pendingControllerBattlers ?? [];
  if (typeof messageDisplayActive !== "boolean") {
    throw new Error("Battle Script MSG_DISPLAY state must be boolean");
  }
  if (
    !Number.isSafeInteger(pauseCounterBattle)
    || pauseCounterBattle < 0
    || pauseCounterBattle > 0xffff
  ) {
    throw new Error(
      `Battle Script gPauseCounterBattle must be a u16, got ${pauseCounterBattle}`,
    );
  }
  if (activeBattler !== null && !isBattleScriptBattlerId(activeBattler)) {
    throw new Error(`Battle Script active battler must be 0..3 or null, got ${activeBattler}`);
  }
  const seen = new Set<number>();
  for (const battler of pendingControllerBattlers) {
    if (!isBattleScriptBattlerId(battler)) {
      throw new Error(`Battle Script pending controller battler must be 0..3, got ${battler}`);
    }
    if (seen.has(battler)) {
      throw new Error(`Battle Script pending controller battlers must be unique, got ${battler} twice`);
    }
    seen.add(battler);
  }
  return Object.freeze({
    messageDisplayActive,
    pauseCounterBattle,
    activeBattler,
    pendingControllerBattlers: Object.freeze([...pendingControllerBattlers]),
  });
}

export function isBattleScriptBattlerId(value: unknown): value is BattleScriptBattlerId {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) < 4;
}

export function markBattleScriptControllerPending(
  scheduler: BattleScriptSchedulerState,
  battler: BattleScriptBattlerId,
): BattleScriptSchedulerState {
  assertFrozenSchedulerState(scheduler);
  if (!isBattleScriptBattlerId(battler)) {
    throw new Error(`Battle Script controller battler must be 0..3, got ${battler}`);
  }
  if (scheduler.pendingControllerBattlers.includes(battler)) return scheduler;
  return createBattleScriptSchedulerState({
    ...scheduler,
    pendingControllerBattlers: [...scheduler.pendingControllerBattlers, battler],
  });
}

/**
 * Explicit controller completion boundary. Acknowledgement never advances a
 * script instruction and never clears MSG_DISPLAY; WAITSTATE/WAITMESSAGE keep
 * ownership of those source behaviors.
 */
export function acknowledgeBattleScriptController(
  scheduler: BattleScriptSchedulerState,
  battler: BattleScriptBattlerId,
): BattleScriptSchedulerState {
  assertFrozenSchedulerState(scheduler);
  if (!isBattleScriptBattlerId(battler)) {
    throw new Error(`Battle Script controller battler must be 0..3, got ${battler}`);
  }
  if (!scheduler.pendingControllerBattlers.includes(battler)) return scheduler;
  return createBattleScriptSchedulerState({
    ...scheduler,
    pendingControllerBattlers: scheduler.pendingControllerBattlers.filter(
      (candidate) => candidate !== battler,
    ),
  });
}

/**
 * Applies one presentation/controller acknowledgement to a complete machine
 * state. Only scheduler state may change; rules, RNG, events, stacks, and the
 * current instruction remain identity-preserved.
 */
export function acknowledgeBattleScriptMachineController<
  RulesContext extends object,
>(
  state: BattleScriptMachineState<RulesContext>,
  battler: BattleScriptBattlerId,
): BattleScriptMachineState<RulesContext> {
  const scheduler = acknowledgeBattleScriptController(state.scheduler, battler);
  if (scheduler === state.scheduler) return state;
  return Object.freeze({ ...state, scheduler });
}

export function drawBattleScriptRng(
  rng: BattleScriptRngState,
  instruction: BattleScriptInstruction,
  reason: string,
): Readonly<{ rng: BattleScriptRngState; randomValue: number }> {
  if (reason.length === 0) throw new Error("Battle Script RNG reason must not be empty");
  const after = advanceRngValue(rng.value);
  const randomValue = (after >>> 16) & 0xffff;
  const entry: BattleScriptRngLedgerEntry = Object.freeze({
    call: rng.calls + 1,
    reason,
    before: rng.value,
    after,
    randomValue,
    provenance: instructionProvenance(instruction),
  });
  return Object.freeze({
    rng: Object.freeze({
      value: after,
      calls: rng.calls + 1,
      ledger: Object.freeze([...rng.ledger, entry]),
    }),
    randomValue,
  });
}

function assertFrozenRngState(rng: BattleScriptRngState): void {
  if (
    !Object.isFrozen(rng)
    || !Object.isFrozen(rng.ledger)
    || rng.ledger.some(
      (entry) => !Object.isFrozen(entry) || !Object.isFrozen(entry.provenance),
    )
  ) {
    throw new Error("Battle Script RNG state and ledger must be frozen");
  }
}

function assertFrozenRulesContext(rulesContext: object): void {
  if (!Object.isFrozen(rulesContext)) {
    throw new Error("Battle Script rules context must be frozen");
  }
}

function assertFrozenSchedulerState(scheduler: BattleScriptSchedulerState): void {
  if (
    !Object.isFrozen(scheduler)
    || !Object.isFrozen(scheduler.pendingControllerBattlers)
    || typeof scheduler.messageDisplayActive !== "boolean"
    || !Number.isSafeInteger(scheduler.pauseCounterBattle)
    || scheduler.pauseCounterBattle < 0
    || scheduler.pauseCounterBattle > 0xffff
    || (scheduler.activeBattler !== null && !isBattleScriptBattlerId(scheduler.activeBattler))
    || scheduler.pendingControllerBattlers.some(
      (battler, index) =>
        !isBattleScriptBattlerId(battler)
        || scheduler.pendingControllerBattlers.indexOf(battler) !== index,
    )
  ) {
    throw new Error(
      "Battle Script scheduler state must be frozen with valid controller state and a u16 pause counter",
    );
  }
}

function freezeState<RulesContext extends object>(
  programCounter: number,
  callStack: readonly number[],
  instructionsExecuted: number,
  haltReason: BattleScriptHaltReason | null,
  scheduler: BattleScriptSchedulerState,
  rulesContext: RulesContext,
  rng: BattleScriptRngState,
  events: readonly BattleScriptSemanticEvent[],
): BattleScriptMachineState<RulesContext> {
  assertFrozenSchedulerState(scheduler);
  assertFrozenRulesContext(rulesContext);
  assertFrozenRngState(rng);
  if (!Object.isFrozen(events)) {
    throw new Error("Battle Script semantic event stream must be frozen");
  }
  return Object.freeze({
    programCounter,
    callStack: Object.isFrozen(callStack)
      ? callStack
      : Object.freeze([...callStack]),
    instructionsExecuted,
    haltReason,
    scheduler,
    rulesContext,
    rng,
    events,
  });
}

function haltState<RulesContext extends object>(
  state: BattleScriptMachineState<RulesContext>,
  reason: BattleScriptHaltReason,
  instructionWasExecuted: boolean,
): BattleScriptMachineState<RulesContext> {
  return freezeState(
    state.programCounter,
    state.callStack,
    state.instructionsExecuted + (instructionWasExecuted ? 1 : 0),
    Object.freeze(reason),
    state.scheduler,
    state.rulesContext,
    state.rng,
    state.events,
  );
}

export function createBattleScriptMachine<RulesContext extends object>(
  program: BattleScriptProgram,
  entryLabel: string,
  rulesContext: RulesContext,
  rngSeed: number,
  scheduler: BattleScriptSchedulerState = createBattleScriptSchedulerState(),
): BattleScriptMachineState<RulesContext> {
  const entry = resolveBattleScriptLabel(program, entryLabel);
  if (!entry) throw new Error(`unknown Battle Script entry label ${entryLabel}`);
  assertFrozenRulesContext(rulesContext);
  return freezeState(
    entry.programCounter,
    [],
    0,
    null,
    scheduler,
    rulesContext,
    createBattleScriptRngState(rngSeed),
    Object.freeze([]),
  );
}

function targetFromFirstOperand<RulesContext extends object>(
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
): BattleScriptControlDirective {
  const operand = context.instruction.operands[0];
  const entry = operand?.widthBytes === 4
    ? resolveBattleScriptLabel(context.program, operand.expression)
    : undefined;
  if (!operand || !entry || context.instruction.operands.length !== 1) {
    return Object.freeze({
      kind: "halt",
      reason: Object.freeze({
        kind: "invalid-control-target",
        programCounter: context.state.programCounter,
        expression: operand?.expression ?? "<missing>",
      }),
    });
  }
  return Object.freeze({ kind: "jump", programCounter: entry.programCounter });
}

function callTargetFromFirstOperand<RulesContext extends object>(
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
): BattleScriptControlDirective {
  const target = targetFromFirstOperand(context);
  return target.kind === "jump"
    ? Object.freeze({ kind: "call", programCounter: target.programCounter })
    : target;
}

function terminal<RulesContext extends object>(
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
): BattleScriptControlDirective {
  return Object.freeze({
    kind: "halt",
    reason: Object.freeze({
      kind: "terminal",
      programCounter: context.state.programCounter,
      opcodeId: context.instruction.opcodeId,
      opcodeName: context.instruction.opcodeName,
    }),
  });
}

function end3<RulesContext extends object>(
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
): BattleScriptControlDirective {
  return Object.freeze({
    kind: "halt",
    reason: Object.freeze({
      kind: "end3",
      programCounter: context.state.programCounter,
      opcodeId: context.instruction.opcodeId,
      opcodeName: context.instruction.opcodeName,
    }),
  });
}

export function transitionBattleScriptCommand<RulesContext extends object>(
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
  control: BattleScriptControlDirective,
  changes: Readonly<{
    scheduler?: BattleScriptSchedulerState;
    rulesContext?: RulesContext;
    rng?: BattleScriptRngState;
    events?: readonly BattleScriptSemanticEventPayload[];
  }> = {},
): BattleScriptCommandTransition<RulesContext> {
  const rulesContext = changes.rulesContext ?? context.state.rulesContext;
  const scheduler = changes.scheduler ?? context.state.scheduler;
  assertFrozenSchedulerState(scheduler);
  assertFrozenRulesContext(rulesContext);
  return Object.freeze({
    control,
    scheduler,
    rulesContext,
    rng: changes.rng ?? context.state.rng,
    events: Object.freeze([...(changes.events ?? [])]),
  });
}

/**
 * Source-safe control subset verified in battle_script_commands.c:
 * Cmd_goto, Cmd_return, Cmd_end, Cmd_end2, Cmd_end3, and Cmd_call.
 *
 * END/END2 expose only their common "finish this action" control boundary.
 * Their battle-state side effects are intentionally absent. END3 gets its
 * OWN halt kind (`"end3"`, not `"terminal"`) -- it never sets
 * `gCurrentActionFuncId = B_ACTION_TRY_FINISH` the way end/end2 do, and its
 * external-callback-stack pop is orchestration-level state this pure
 * machine doesn't hold (`docs/end3-design.md` §2.2/§2.3).
 */
export function createBattleScriptControlHandlers<RulesContext extends object>(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<RulesContext> {
  const handlers: Record<number, BattleScriptOpcodeHandler<RulesContext>> = Object.create(null) as Record<
    number,
    BattleScriptOpcodeHandler<RulesContext>
  >;
  const install = (opcodeName: string, handler: BattleScriptOpcodeHandler<RulesContext>) => {
    const opcode = program.instructions.find((instruction) => instruction.opcodeName === opcodeName);
    if (!opcode) throw new Error(`committed Battle Script program does not emit ${opcodeName}`);
    handlers[opcode.opcodeId] = handler;
  };

  install("B_SCR_OP_GOTO", (context) =>
    transitionBattleScriptCommand(context, targetFromFirstOperand(context)));
  install("B_SCR_OP_RETURN", (context) =>
    transitionBattleScriptCommand(context, RETURN));
  install("B_SCR_OP_END", (context) =>
    transitionBattleScriptCommand(context, terminal(context)));
  install("B_SCR_OP_END2", (context) =>
    transitionBattleScriptCommand(context, terminal(context)));
  install("B_SCR_OP_END3", (context) =>
    transitionBattleScriptCommand(context, end3(context)));
  install("B_SCR_OP_CALL", (context) =>
    transitionBattleScriptCommand(context, callTargetFromFirstOperand(context)));
  return Object.freeze(handlers);
}

function assertRngTransition(previous: BattleScriptRngState, next: BattleScriptRngState): void {
  assertFrozenRngState(next);
  if (next.calls !== next.ledger.length || next.calls < previous.calls) {
    throw new Error("Battle Script RNG ledger/call count is inconsistent");
  }
  for (let index = 0; index < previous.ledger.length; index += 1) {
    if (next.ledger[index] !== previous.ledger[index]) {
      throw new Error("Battle Script RNG transition rewrote existing ledger history");
    }
  }
  let value = previous.value;
  for (let index = previous.calls; index < next.calls; index += 1) {
    const entry = next.ledger[index]!;
    const expected = advanceRngValue(value);
    if (
      entry.call !== index + 1
      || entry.reason.length === 0
      || entry.before !== value
      || entry.after !== expected
      || entry.randomValue !== ((expected >>> 16) & 0xffff)
    ) {
      throw new Error(`Battle Script RNG ledger entry ${index + 1} is not a deterministic LCG draw`);
    }
    value = expected;
  }
  if (next.value !== value) {
    throw new Error("Battle Script RNG value does not match its ledger");
  }
}

function freezeEventPayload(
  payload: BattleScriptSemanticEventPayload,
): BattleScriptSemanticEventPayload {
  switch (payload.kind) {
    case "message":
      return Object.freeze({ ...payload, substitutions: Object.freeze([...payload.substitutions]) });
    case "selection-message":
      return Object.freeze({
        ...payload,
        snapshot: createBattleScriptSelectionMessageSnapshot(payload.snapshot),
      });
    case "set-battler-moves-pp-data":
      return Object.freeze({
        ...payload,
        moves: Object.freeze([...payload.moves]) as unknown as typeof payload.moves,
        pp: Object.freeze([...payload.pp]) as unknown as typeof payload.pp,
      });
    case "play-se":
    case "play-fanfare":
    case "play-faint-cry":
    case "faint-animation":
    case "hide-party-status-summary":
    case "draw-party-status-summary":
    case "set-battler-sprite-visibility":
    case "set-battler-status-data":
    case "set-party-status-data":
    case "status-icon-update":
    case "set-battler-pp-data":
    case "reset-action-move-selection":
    case "set-battler-item":
    case "game-stat-increment":
    case "trainer-slide-in":
    case "trainer-slide-out":
    case "status-animation":
    case "health-bar-update":
      return payload.kind === "game-stat-increment"
        ? Object.freeze({
          ...payload,
          gameStat: Object.freeze({ ...payload.gameStat }),
        })
        : Object.freeze({ ...payload });
    case "animation":
      return Object.freeze({ ...payload, arguments: Object.freeze([...payload.arguments]) });
    case "hp-change":
    case "status-change":
    case "stat-stage-change":
    case "switch":
    case "switch-in-animation":
    case "outcome":
      return Object.freeze({ ...payload });
  }
}

function assertIntegerInRange(
  value: number,
  maximum: number,
  field: string,
): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > maximum) {
    throw new Error(`${field} must be an unsigned integer <= ${maximum}, got ${value}`);
  }
}

export function createBattleScriptSelectionMessageSnapshot(
  snapshot: BattleScriptSelectionMessageSnapshot,
): BattleScriptSelectionMessageSnapshot {
  assertIntegerInRange(snapshot.currentMove, 0xffff, "selection currentMove");
  assertIntegerInRange(snapshot.originallyUsedMove, 0xffff, "selection originallyUsedMove");
  assertIntegerInRange(snapshot.lastItem, 0xffff, "selection lastItem");
  assertIntegerInRange(snapshot.lastAbility, 0xff, "selection lastAbility");
  if (!isBattleScriptBattlerId(snapshot.scriptingBattler)) {
    throw new Error(`selection scriptingBattler must be 0..3, got ${snapshot.scriptingBattler}`);
  }
  assertIntegerInRange(snapshot.scriptPartyIndex, 0xff, "selection scriptPartyIndex");
  if (!Array.isArray(snapshot.battlerAbilities) || snapshot.battlerAbilities.length !== 4) {
    throw new Error("selection battlerAbilities must contain exactly four entries");
  }
  for (const ability of snapshot.battlerAbilities) {
    assertIntegerInRange(ability, 0xff, "selection battler ability");
  }
  if (!Array.isArray(snapshot.textBuffers) || snapshot.textBuffers.length !== 3) {
    throw new Error("selection textBuffers must contain exactly three buffers");
  }
  const textBuffers = snapshot.textBuffers.map((buffer) => {
    if (!Array.isArray(buffer) || buffer.some((token) => typeof token !== "string")) {
      throw new Error("selection text buffers must contain semantic string tokens");
    }
    return Object.freeze([...buffer]);
  }) as unknown as BattleScriptSelectionMessageSnapshot["textBuffers"];
  return Object.freeze({
    currentMove: snapshot.currentMove,
    originallyUsedMove: snapshot.originallyUsedMove,
    lastItem: snapshot.lastItem,
    lastAbility: snapshot.lastAbility,
    scriptingBattler: snapshot.scriptingBattler,
    scriptPartyIndex: snapshot.scriptPartyIndex,
    battlerAbilities: Object.freeze(
      [...snapshot.battlerAbilities],
    ) as unknown as BattleScriptSelectionMessageSnapshot["battlerAbilities"],
    textBuffers: Object.freeze(textBuffers),
  });
}

function appendEvents(
  prior: readonly BattleScriptSemanticEvent[],
  payloads: readonly BattleScriptSemanticEventPayload[],
  instruction: BattleScriptInstruction,
  instructionExecution: number,
): readonly BattleScriptSemanticEvent[] {
  if (payloads.length === 0) return prior;
  const provenance: BattleScriptEventProvenance = Object.freeze({
    ...instructionProvenance(instruction),
    instructionExecution,
  });
  const appended = payloads.map((rawPayload, index) => {
    const payload = freezeEventPayload(rawPayload);
    return Object.freeze({
      ...payload,
      sequence: prior.length + index + 1,
      provenance,
    }) as BattleScriptSemanticEvent;
  });
  return Object.freeze([...prior, ...appended]);
}

export function stepBattleScriptMachine<RulesContext extends object>(
  program: BattleScriptProgram,
  state: BattleScriptMachineState<RulesContext>,
  handlers: BattleScriptOpcodeHandlers<RulesContext>,
): BattleScriptStepResult<RulesContext> {
  if (state.haltReason) return Object.freeze({ kind: "halted", state });

  const instruction = program.instructions[state.programCounter];
  if (!instruction) {
    const next = haltState(state, {
      kind: "invalid-program-counter",
      programCounter: state.programCounter,
    }, false);
    return Object.freeze({ kind: "halted", state: next });
  }

  const handler = handlers[instruction.opcodeId];
  if (!handler) {
    const next = haltState(state, {
      kind: "unsupported-opcode",
      programCounter: state.programCounter,
      opcodeId: instruction.opcodeId,
      opcodeName: instruction.opcodeName,
      dispatcher: instruction.dispatcher,
    }, false);
    return Object.freeze({ kind: "unsupported", state: next, instruction });
  }

  const transition = handler(Object.freeze({ program, instruction, state }));
  assertFrozenSchedulerState(transition.scheduler);
  assertFrozenRulesContext(transition.rulesContext);
  assertRngTransition(state.rng, transition.rng);
  if (transition.control.kind === "block") {
    if (
      transition.rulesContext !== state.rulesContext
      || transition.scheduler !== state.scheduler
      || transition.rng !== state.rng
      || transition.events.length !== 0
    ) {
      throw new Error("blocked Battle Script transition must preserve rules, RNG, and events");
    }
    return Object.freeze({
      kind: "blocked",
      state,
      instruction,
      reason: Object.freeze(transition.control.reason),
    });
  }
  if (transition.control.kind === "scheduler-progress") {
    if (
      transition.scheduler === state.scheduler
      || transition.rulesContext !== state.rulesContext
      || transition.rng !== state.rng
      || transition.events.length !== 0
    ) {
      throw new Error(
        "scheduler-progress Battle Script transition may update only scheduler state",
      );
    }
    const next = freezeState(
      state.programCounter,
      state.callStack,
      state.instructionsExecuted + 1,
      null,
      transition.scheduler,
      state.rulesContext,
      state.rng,
      state.events,
    );
    return Object.freeze({
      kind: "scheduler-progressed",
      state: next,
      instruction,
    });
  }
  if (transition.control.kind === "controller-return") {
    const activeBattler = transition.scheduler.activeBattler;
    if (
      state.scheduler.pendingControllerBattlers.length !== 0
      || transition.scheduler.messageDisplayActive !== state.scheduler.messageDisplayActive
      || transition.scheduler.pauseCounterBattle !== state.scheduler.pauseCounterBattle
      || activeBattler === null
      || transition.scheduler.pendingControllerBattlers.length !== 1
      || transition.scheduler.pendingControllerBattlers[0] !== activeBattler
      || transition.events.length !== 1
      || !("battler" in transition.events[0]!)
      || transition.events[0].battler !== activeBattler
    ) {
      throw new Error(
        "controller-return Battle Script transition must emit one active-battler event and mark exactly that idle battler pending",
      );
    }
    const events = appendEvents(
      state.events,
      transition.events,
      instruction,
      state.instructionsExecuted + 1,
    );
    const next = freezeState(
      state.programCounter,
      state.callStack,
      state.instructionsExecuted + 1,
      null,
      transition.scheduler,
      transition.rulesContext,
      transition.rng,
      events,
    );
    return Object.freeze({
      kind: "advanced",
      state: next,
      instruction,
    });
  }
  const events = appendEvents(
    state.events,
    transition.events,
    instruction,
    state.instructionsExecuted + 1,
  );

  let next: BattleScriptMachineState<RulesContext>;
  switch (transition.control.kind) {
    case "advance":
      next = freezeState(
        state.programCounter + 1,
        state.callStack,
        state.instructionsExecuted + 1,
        null,
        transition.scheduler,
        transition.rulesContext,
        transition.rng,
        events,
      );
      break;
    case "jump":
      next = freezeState(
        transition.control.programCounter,
        state.callStack,
        state.instructionsExecuted + 1,
        null,
        transition.scheduler,
        transition.rulesContext,
        transition.rng,
        events,
      );
      break;
    case "call":
      next = freezeState(
        transition.control.programCounter,
        [...state.callStack, state.programCounter + 1],
        state.instructionsExecuted + 1,
        null,
        transition.scheduler,
        transition.rulesContext,
        transition.rng,
        events,
      );
      break;
    case "call-current":
      next = freezeState(
        transition.control.programCounter,
        [...state.callStack, state.programCounter],
        state.instructionsExecuted + 1,
        null,
        transition.scheduler,
        transition.rulesContext,
        transition.rng,
        events,
      );
      break;
    case "call-explicit":
      next = freezeState(
        transition.control.programCounter,
        [...state.callStack, transition.control.returnProgramCounter],
        state.instructionsExecuted + 1,
        null,
        transition.scheduler,
        transition.rulesContext,
        transition.rng,
        events,
      );
      break;
    case "jump-pop":
      next = freezeState(
        transition.control.programCounter,
        state.callStack.slice(0, -1),
        state.instructionsExecuted + 1,
        null,
        transition.scheduler,
        transition.rulesContext,
        transition.rng,
        events,
      );
      break;
    case "call-stack":
      next = freezeState(
        transition.control.programCounter,
        [...state.callStack, ...transition.control.returnProgramCounters],
        state.instructionsExecuted + 1,
        null,
        transition.scheduler,
        transition.rulesContext,
        transition.rng,
        events,
      );
      break;
    case "return": {
      const returnAddress = state.callStack.at(-1);
      next = returnAddress === undefined
        ? freezeState(
          state.programCounter,
          state.callStack,
          state.instructionsExecuted + 1,
          Object.freeze({
            kind: "return-stack-underflow",
            programCounter: state.programCounter,
          }),
          transition.scheduler,
          transition.rulesContext,
          transition.rng,
          events,
        )
        : freezeState(
          returnAddress,
          state.callStack.slice(0, -1),
          state.instructionsExecuted + 1,
          null,
          transition.scheduler,
          transition.rulesContext,
          transition.rng,
          events,
        );
      break;
    }
    case "halt":
      next = freezeState(
        state.programCounter,
        state.callStack,
        state.instructionsExecuted + 1,
        Object.freeze(transition.control.reason),
        transition.scheduler,
        transition.rulesContext,
        transition.rng,
        events,
      );
      break;
  }
  return Object.freeze({
    kind: next.haltReason ? "halted" : "advanced",
    state: next,
    instruction,
  });
}

export function runBattleScriptMachine<RulesContext extends object>(
  program: BattleScriptProgram,
  initialState: BattleScriptMachineState<RulesContext>,
  handlers: BattleScriptOpcodeHandlers<RulesContext>,
  instructionBudget: number,
): BattleScriptRunResult<RulesContext> {
  if (!Number.isSafeInteger(instructionBudget) || instructionBudget < 1) {
    throw new Error(`instruction budget must be a positive safe integer, got ${instructionBudget}`);
  }

  let state = initialState;
  let consumed = 0;
  while (consumed < instructionBudget) {
    const result = stepBattleScriptMachine(program, state, handlers);
    state = result.state;
    if (result.kind === "blocked") {
      return Object.freeze({
        kind: "blocked",
        state,
        instruction: result.instruction,
        reason: result.reason,
      });
    }
    if (result.kind === "unsupported") {
      return Object.freeze({ kind: "unsupported", state, instruction: result.instruction });
    }
    if (result.kind === "halted") return Object.freeze({ kind: "halted", state });
    consumed += 1;
  }

  const budgetState = haltState(state, {
    kind: "instruction-budget",
    programCounter: state.programCounter,
    budget: instructionBudget,
  }, false);
  return Object.freeze({ kind: "budget-exhausted", state: budgetState });
}

export function inspectBattleScriptMachine<RulesContext extends object>(
  program: BattleScriptProgram,
  state: BattleScriptMachineState<RulesContext>,
): BattleScriptMachineInspection {
  return Object.freeze({
    programCounter: state.programCounter,
    callStack: Object.freeze([...state.callStack]),
    instructionsExecuted: state.instructionsExecuted,
    haltReason: state.haltReason,
    currentInstruction: program.instructions[state.programCounter] ?? null,
    labels: program.labelsAtProgramCounter[state.programCounter] ?? Object.freeze([]),
    scheduler: Object.freeze({ ...state.scheduler }),
    rngCalls: state.rng.calls,
    eventCount: state.events.length,
  });
}

export const advanceBattleScriptInstruction = <RulesContext extends object>(
  context: BattleScriptOpcodeHandlerContext<RulesContext>,
): BattleScriptCommandTransition<RulesContext> =>
  transitionBattleScriptCommand(context, ADVANCE);
