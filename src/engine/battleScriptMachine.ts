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
    kind: "unsupported-opcode";
    programCounter: number;
    opcodeId: number;
    opcodeName: string;
    dispatcher: string;
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
    kind: "return-stack-underflow";
    programCounter: number;
  }>;

export type BattleScriptMachineState = Readonly<{
  programCounter: number;
  callStack: readonly number[];
  instructionsExecuted: number;
  haltReason: BattleScriptHaltReason | null;
}>;

export type BattleScriptControlDirective =
  | Readonly<{ kind: "advance" }>
  | Readonly<{ kind: "jump"; programCounter: number }>
  | Readonly<{ kind: "call"; programCounter: number }>
  | Readonly<{ kind: "return" }>
  | Readonly<{ kind: "halt"; reason: BattleScriptHaltReason }>;

export type BattleScriptOpcodeHandlerContext = Readonly<{
  program: BattleScriptProgram;
  instruction: BattleScriptInstruction;
  state: BattleScriptMachineState;
}>;

export type BattleScriptOpcodeHandler = (
  context: BattleScriptOpcodeHandlerContext,
) => BattleScriptControlDirective;

export type BattleScriptOpcodeHandlers = Readonly<Record<number, BattleScriptOpcodeHandler>>;

export type BattleScriptStepResult =
  | Readonly<{ kind: "advanced"; state: BattleScriptMachineState; instruction: BattleScriptInstruction }>
  | Readonly<{ kind: "halted"; state: BattleScriptMachineState; instruction?: BattleScriptInstruction }>
  | Readonly<{ kind: "unsupported"; state: BattleScriptMachineState; instruction: BattleScriptInstruction }>;

export type BattleScriptRunResult =
  | Readonly<{ kind: "halted"; state: BattleScriptMachineState }>
  | Readonly<{ kind: "unsupported"; state: BattleScriptMachineState; instruction: BattleScriptInstruction }>
  | Readonly<{ kind: "budget-exhausted"; state: BattleScriptMachineState }>;

export type BattleScriptMachineInspection = Readonly<{
  programCounter: number;
  callStack: readonly number[];
  instructionsExecuted: number;
  haltReason: BattleScriptHaltReason | null;
  currentInstruction: BattleScriptInstruction | null;
  labels: readonly string[];
}>;

const ADVANCE = Object.freeze({ kind: "advance" as const });
const RETURN = Object.freeze({ kind: "return" as const });

function freezeState(
  programCounter: number,
  callStack: readonly number[],
  instructionsExecuted: number,
  haltReason: BattleScriptHaltReason | null,
): BattleScriptMachineState {
  return Object.freeze({
    programCounter,
    callStack: Object.freeze([...callStack]),
    instructionsExecuted,
    haltReason,
  });
}

function haltState(
  state: BattleScriptMachineState,
  reason: BattleScriptHaltReason,
  instructionWasExecuted: boolean,
): BattleScriptMachineState {
  return freezeState(
    state.programCounter,
    state.callStack,
    state.instructionsExecuted + (instructionWasExecuted ? 1 : 0),
    Object.freeze(reason),
  );
}

export function createBattleScriptMachine(
  program: BattleScriptProgram,
  entryLabel: string,
): BattleScriptMachineState {
  const entry = resolveBattleScriptLabel(program, entryLabel);
  if (!entry) throw new Error(`unknown Battle Script entry label ${entryLabel}`);
  return freezeState(entry.programCounter, [], 0, null);
}

function targetFromFirstOperand(
  context: BattleScriptOpcodeHandlerContext,
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

function callTargetFromFirstOperand(
  context: BattleScriptOpcodeHandlerContext,
): BattleScriptControlDirective {
  const target = targetFromFirstOperand(context);
  return target.kind === "jump"
    ? Object.freeze({ kind: "call", programCounter: target.programCounter })
    : target;
}

function terminal(context: BattleScriptOpcodeHandlerContext): BattleScriptControlDirective {
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

/**
 * Source-safe control subset verified in battle_script_commands.c:
 * Cmd_goto, Cmd_return, Cmd_end, Cmd_end2, and Cmd_call.
 *
 * END/END2 expose only their common "finish this action" control boundary.
 * Their battle-state side effects are intentionally absent. END3 is omitted:
 * it also manipulates the external battle-callback stack and is not equivalent
 * to either terminal command in this pure machine.
 */
export function createBattleScriptControlHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers {
  const handlers: Record<number, BattleScriptOpcodeHandler> = Object.create(null) as Record<number, BattleScriptOpcodeHandler>;
  const install = (opcodeName: string, handler: BattleScriptOpcodeHandler) => {
    const opcode = program.instructions.find((instruction) => instruction.opcodeName === opcodeName);
    if (!opcode) throw new Error(`committed Battle Script program does not emit ${opcodeName}`);
    handlers[opcode.opcodeId] = handler;
  };

  install("B_SCR_OP_GOTO", targetFromFirstOperand);
  install("B_SCR_OP_RETURN", () => RETURN);
  install("B_SCR_OP_END", terminal);
  install("B_SCR_OP_END2", terminal);
  install("B_SCR_OP_CALL", callTargetFromFirstOperand);
  return Object.freeze(handlers);
}

export function stepBattleScriptMachine(
  program: BattleScriptProgram,
  state: BattleScriptMachineState,
  handlers: BattleScriptOpcodeHandlers,
): BattleScriptStepResult {
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

  const directive = handler(Object.freeze({ program, instruction, state }));
  let next: BattleScriptMachineState;
  switch (directive.kind) {
    case "advance":
      next = freezeState(state.programCounter + 1, state.callStack, state.instructionsExecuted + 1, null);
      break;
    case "jump":
      next = freezeState(directive.programCounter, state.callStack, state.instructionsExecuted + 1, null);
      break;
    case "call":
      next = freezeState(
        directive.programCounter,
        [...state.callStack, state.programCounter + 1],
        state.instructionsExecuted + 1,
        null,
      );
      break;
    case "return": {
      const returnAddress = state.callStack.at(-1);
      next = returnAddress === undefined
        ? haltState(state, {
          kind: "return-stack-underflow",
          programCounter: state.programCounter,
        }, true)
        : freezeState(
          returnAddress,
          state.callStack.slice(0, -1),
          state.instructionsExecuted + 1,
          null,
        );
      break;
    }
    case "halt":
      next = haltState(state, directive.reason, true);
      break;
  }
  return Object.freeze({
    kind: next.haltReason ? "halted" : "advanced",
    state: next,
    instruction,
  });
}

export function runBattleScriptMachine(
  program: BattleScriptProgram,
  initialState: BattleScriptMachineState,
  handlers: BattleScriptOpcodeHandlers,
  instructionBudget: number,
): BattleScriptRunResult {
  if (!Number.isSafeInteger(instructionBudget) || instructionBudget < 1) {
    throw new Error(`instruction budget must be a positive safe integer, got ${instructionBudget}`);
  }

  let state = initialState;
  for (let consumed = 0; consumed < instructionBudget; consumed++) {
    const result = stepBattleScriptMachine(program, state, handlers);
    state = result.state;
    if (result.kind === "unsupported") {
      return Object.freeze({ kind: "unsupported", state, instruction: result.instruction });
    }
    if (result.kind === "halted") return Object.freeze({ kind: "halted", state });
  }

  const budgetState = haltState(state, {
    kind: "instruction-budget",
    programCounter: state.programCounter,
    budget: instructionBudget,
  }, false);
  return Object.freeze({ kind: "budget-exhausted", state: budgetState });
}

export function inspectBattleScriptMachine(
  program: BattleScriptProgram,
  state: BattleScriptMachineState,
): BattleScriptMachineInspection {
  return Object.freeze({
    programCounter: state.programCounter,
    callStack: Object.freeze([...state.callStack]),
    instructionsExecuted: state.instructionsExecuted,
    haltReason: state.haltReason,
    currentInstruction: program.instructions[state.programCounter] ?? null,
    labels: program.labelsAtProgramCounter[state.programCounter] ?? Object.freeze([]),
  });
}

export const advanceBattleScriptInstruction = (): BattleScriptControlDirective => ADVANCE;
