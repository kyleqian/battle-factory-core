import { describe, expect, it, vi } from "vitest";
import commandHandlerData from "../src/data/gen/battle-script-command-handlers.json" with { type: "json" };
import lexicalFactData from "../src/data/gen/battle-script-handler-lexical-facts.json" with { type: "json" };
import observationData from "../src/data/gen/battle-script-opcode-observations.json" with { type: "json" };
import {
  acknowledgeBattleScriptController,
  createBattleScriptMachine,
  createBattleScriptSchedulerState,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
  type BattleScriptOpcodeHandlerContext,
} from "../src/engine/battleScriptMachine.ts";
import {
  createBattleScriptSourceCommandHandlers,
  type BattleScriptBattlerSelectorResolverPort,
  type BattleScriptStatusAnimationPreparationPort,
  type BattleScriptStatusAnimationReceipt,
} from "../src/engine/battleScriptSourceCommands.ts";
import {
  loadBattleScriptProgram,
  type BattleScriptInstruction,
  type BattleScriptProgram,
} from "../src/engine/battleScriptProgram.ts";

const program = loadBattleScriptProgram();
const rules = Object.freeze({ marker: "status-animation-rules-owned" });
type FixtureRules = typeof rules;
const starts = [804, 847, 2708, 2721, 2733, 2745, 2809, 2815, 2822, 2826, 2830, 2834, 2841];

function stateAt(
  instruction: BattleScriptInstruction,
  scheduler = createBattleScriptSchedulerState(),
): BattleScriptMachineState<FixtureRules> {
  const initial = createBattleScriptMachine(program, instruction.source.label, rules, 0x12345678, scheduler);
  return Object.freeze({ ...initial, programCounter: instruction.programCounter });
}

function receipt(battler: 0 | 1 | 2 | 3, status = 0x80): BattleScriptStatusAnimationReceipt {
  return Object.freeze({
    kind: "status-animation",
    battler,
    isStatus2: 0,
    status,
  });
}

function handlers(
  idle: boolean,
  resolve: BattleScriptBattlerSelectorResolverPort<FixtureRules>,
  prepare: BattleScriptStatusAnimationPreparationPort<FixtureRules>,
  selectedProgram: BattleScriptProgram = program,
) {
  return createBattleScriptSourceCommandHandlers(selectedProgram, Object.freeze({
    isControllerIdle: () => idle,
    prepareMessage: () => null,
    prepareStatusAnimation: prepare,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => null,
    resolveBattlerAtPosition: () => null,
    resolveBattlerForBattleScript: resolve,
    resolveHalfwordOperand: () => null,
  }));
}

describe("source-exact STATUSANIMATION primary-status receipt", () => {
  it("pins opcode 100, Cmd_statusanimation provenance, predicates, and exact two-byte advance", () => {
    const slot = (commandHandlerData as {
      slots: Array<{
        index: number;
        opcode: string;
        table: { rowIndex: number; handlerExpression: string };
        handler: { symbol: string; definition: { startLine: number; endLine: number } };
      }>;
    }).slots[100]!;
    expect(slot).toMatchObject({
      index: 100,
      opcode: "B_SCR_OP_STATUSANIMATION",
      table: { rowIndex: 100, handlerExpression: "Cmd_statusanimation" },
      handler: { symbol: "Cmd_statusanimation", definition: { startLine: 5753, endLine: 5767 } },
    });
    const fact = (lexicalFactData as {
      handlers: Array<{
        symbol: string;
        source: { fileSha256: string; definitionTextSha256: string };
        rawLines: Array<{ raw: string }>;
        instructionPointerFacts: {
          reads: Array<{ accessExpression: string }>;
          advanceExpressions: Array<{ statementRaw: string }>;
        };
      }>;
    }).handlers.find(({ symbol }) => symbol === "Cmd_statusanimation")!;
    expect(fact.source).toMatchObject({
      fileSha256: "e0847cd2aa83ee5e18134c32baad348b7c763095cf59efa33da67c4a4e90120c",
      definitionTextSha256: "32b0e911465c8133751e9d35babd513cc4c5f71df919c08b24eda4c41e38f792",
    });
    expect(fact.instructionPointerFacts).toMatchObject({
      reads: [{ accessExpression: "gBattlescriptCurrInstr[1]" }],
      advanceExpressions: [{ statementRaw: "gBattlescriptCurrInstr += 2;" }],
    });
    const body = fact.rawLines.map(({ raw }) => raw).join("\n");
    for (const sourceToken of [
      "gBattleControllerExecFlags == 0",
      "GetBattlerForBattleScript(gBattlescriptCurrInstr[1])",
      "STATUS3_SEMI_INVULNERABLE",
      "substituteHP == 0",
      "HITMARKER_NO_ANIMATIONS",
      "BtlController_EmitStatusAnimation(B_COMM_TO_CONTROLLER, FALSE",
      "gBattleMons[gActiveBattler].status1",
      "MarkBattlerForControllerExec(gActiveBattler)",
    ]) expect(body).toContain(sourceToken);
  });

  it("pins all 13 generated starts, selectors, and one-byte operands", () => {
    const observations = observationData as {
      opcodes: Array<{
        slot: { id: number };
        observedInstructionCount: number;
        observedInstructionStartIndexes: number[];
        observedOperandWidthSequences: Array<{ operandWidths: number[]; occurrenceCount: number }>;
      }>;
      instructionStarts: Array<{
        index: number;
        opcode: { id: number };
        operandWidths: number[];
        sourceInvocation: { actualOperands: string[] };
      }>;
    };
    expect(observations.opcodes.find(({ slot }) => slot.id === 100)).toMatchObject({
      observedInstructionCount: 13,
      observedInstructionStartIndexes: starts,
      observedOperandWidthSequences: [{ operandWidths: [1], occurrenceCount: 13 }],
    });
    const emitted = observations.instructionStarts.filter(({ opcode }) => opcode.id === 100);
    expect(emitted.map(({ index }) => index)).toEqual(starts);
    expect(emitted.every(({ operandWidths }) => operandWidths.join() === "1")).toBe(true);
    expect(new Set(emitted.map(({ sourceInvocation }) => sourceInvocation.actualOperands[0]))).toEqual(
      new Set(["BS_ATTACKER", "BS_EFFECT_BATTLER"]),
    );
  });

  it("consults idle first and identity-blocks busy without resolving or preparing", () => {
    const instruction = program.instructions[starts[0]!]!;
    const resolve = vi.fn<BattleScriptBattlerSelectorResolverPort<FixtureRules>>(() => 1);
    const prepare = vi.fn<BattleScriptStatusAnimationPreparationPort<FixtureRules>>(() =>
      Object.freeze({ kind: "emit", receipt: receipt(1) })
    );
    const initial = stateAt(instruction);
    const result = stepBattleScriptMachine(program, initial, handlers(false, resolve, prepare));
    expect(result.kind).toBe("blocked");
    expect(result.state).toBe(initial);
    expect(resolve).not.toHaveBeenCalled();
    expect(prepare).not.toHaveBeenCalled();
  });

  it("resolves through GetBattlerForBattleScript and blocks unavailable context by identity", () => {
    const instruction = program.instructions[starts[6]!]!;
    const initial = stateAt(instruction);
    const result = stepBattleScriptMachine(
      program,
      initial,
      handlers(true, () => null, () => {
        throw new Error("must not prepare without a battler");
      }),
    );
    expect(result.kind).toBe("blocked");
    expect(result.state).toBe(initial);
    if (result.kind !== "blocked") throw new Error("expected selector block");
    expect(result.reason).toMatchObject({
      kind: "source-context-unavailable",
      port: "resolve-battler-for-battle-script",
      operandExpression: "BS_EFFECT_BATTLER",
    });
  });

  it("halts an invalid resolved battler and never calls the rules port", () => {
    const instruction = program.instructions[starts[0]!]!;
    const prepare = vi.fn<BattleScriptStatusAnimationPreparationPort<FixtureRules>>();
    const result = stepBattleScriptMachine(
      program,
      stateAt(instruction),
      handlers(true, () => 4 as never, prepare),
    );
    expect(result.kind).toBe("halted");
    expect(result.state.haltReason).toMatchObject({ kind: "invalid-source-battler", received: "4" });
    expect(prepare).not.toHaveBeenCalled();
  });

  it("emits the exact frozen primary-status receipt, marks pending, and owns no rules/RNG mutation", () => {
    const instruction = program.instructions[starts[12]!]!;
    const exactReceipt = receipt(1, 0x380);
    const preparation = Object.freeze({ kind: "emit" as const, receipt: exactReceipt });
    const prepare = vi.fn<BattleScriptStatusAnimationPreparationPort<FixtureRules>>(
      (_context, battler, request) => {
        expect(battler).toBe(1);
        expect(request).toEqual({ kind: "live-status1" });
        expect(Object.isFrozen(request)).toBe(true);
        return preparation;
      },
    );
    const selectedHandlers = handlers(true, () => 1, prepare);
    const initial = stateAt(instruction, createBattleScriptSchedulerState({
      messageDisplayActive: true,
      pauseCounterBattle: 7,
      activeBattler: 0,
      pendingControllerBattlers: [2],
    }));
    const context: BattleScriptOpcodeHandlerContext<FixtureRules> = Object.freeze({
      program,
      instruction,
      state: initial,
    });
    expect(selectedHandlers[100]!(context).events[0]).toBe(exactReceipt);
    expect(prepare).toHaveBeenCalledOnce();
    const result = stepBattleScriptMachine(program, initial, selectedHandlers);
    expect(result.kind).toBe("advanced");
    expect(result.state.programCounter).toBe(instruction.programCounter + 1);
    expect(result.state.scheduler).toMatchObject({
      activeBattler: 1,
      pendingControllerBattlers: [2, 1],
    });
    expect(result.state.events[0]).toMatchObject({
      ...exactReceipt,
      sequence: 1,
      provenance: {
        programCounter: instruction.programCounter,
        opcodeId: 100,
        opcodeName: "B_SCR_OP_STATUSANIMATION",
        instructionExecution: 1,
      },
    });
    expect(Object.isFrozen(result.state.events[0])).toBe(true);
    expect(result.state.rulesContext).toBe(initial.rulesContext);
    expect(result.state.rng).toBe(initial.rng);
  });

  it("advances on frozen suppression, updates only active battler, and emits nothing", () => {
    const instruction = program.instructions[starts[8]!]!;
    const initial = stateAt(instruction, createBattleScriptSchedulerState({
      messageDisplayActive: true,
      pauseCounterBattle: 4,
      activeBattler: 3,
      pendingControllerBattlers: [0],
    }));
    const result = stepBattleScriptMachine(
      program,
      initial,
      handlers(true, () => 1, () => Object.freeze({ kind: "suppress" })),
    );
    expect(result.kind).toBe("advanced");
    expect(result.state.programCounter).toBe(instruction.programCounter + 1);
    expect(result.state.scheduler).toMatchObject({
      messageDisplayActive: true,
      pauseCounterBattle: 4,
      activeBattler: 1,
      pendingControllerBattlers: [0],
    });
    expect(result.state.events).toBe(initial.events);
    expect(result.state.rulesContext).toBe(initial.rulesContext);
    expect(result.state.rng).toBe(initial.rng);
  });

  it("blocks unavailable rules preparation and rejects mutable or malformed receipts", () => {
    const instruction = program.instructions[starts[0]!]!;
    const initial = stateAt(instruction);
    const unavailable = stepBattleScriptMachine(program, initial, handlers(true, () => 0, () => null));
    expect(unavailable.kind).toBe("blocked");
    expect(unavailable.state).toBe(initial);
    if (unavailable.kind !== "blocked") throw new Error("expected preparation block");
    expect(unavailable.reason).toMatchObject({ port: "prepare-status-animation" });

    for (const prepare of [
      () => ({ kind: "suppress" as const }),
      () => Object.freeze({ kind: "emit" as const, receipt: { ...receipt(0), battler: 1 as const } }),
      () => Object.freeze({ kind: "emit" as const, receipt: Object.freeze({ ...receipt(0), status: -1 }) }),
    ]) {
      const invalid = stepBattleScriptMachine(program, initial, handlers(true, () => 0, prepare));
      expect(invalid.kind).toBe("halted");
      expect(invalid.state.haltReason).toMatchObject({ kind: "invalid-source-snapshot" });
    }
  });

  it("keeps pending until explicit acknowledgement and then retries a following idle gate", () => {
    const instruction = program.instructions[starts[0]!]!;
    const emitted = stepBattleScriptMachine(
      program,
      stateAt(instruction),
      handlers(true, () => 0, () => Object.freeze({ kind: "emit", receipt: receipt(0) })),
    );
    expect(emitted.state.scheduler.pendingControllerBattlers).toEqual([0]);
    const acknowledged = acknowledgeBattleScriptController(emitted.state.scheduler, 0);
    expect(acknowledged.pendingControllerBattlers).toEqual([]);
    expect(emitted.state.scheduler.pendingControllerBattlers).toEqual([0]);
  });

  it("replays deterministically with equal state and frozen event identity boundaries", () => {
    const instruction = program.instructions[starts[11]!]!;
    const run = () => stepBattleScriptMachine(
      program,
      stateAt(instruction),
      handlers(true, () => 1, () =>
        Object.freeze({ kind: "emit", receipt: receipt(1, 0x40) })
      ),
    );
    const first = run();
    const second = run();
    expect(first).toEqual(second);
    expect(first.state.rulesContext).toBe(rules);
    expect(second.state.rulesContext).toBe(rules);
    expect(first.state.events).not.toBe(second.state.events);
  });

  it("halts malformed encodings before selector or rules preparation", () => {
    const instruction = program.instructions[starts[0]!]!;
    for (const operands of [
      Object.freeze([]),
      Object.freeze([{ ...instruction.operands[0]!, widthBytes: 2 as const }]),
      Object.freeze([instruction.operands[0]!, instruction.operands[0]!]),
    ]) {
      const malformed = Object.freeze({ ...instruction, operands });
      const malformedProgram = Object.freeze({
        ...program,
        instructions: Object.freeze(program.instructions.map((candidate) =>
          candidate.programCounter === instruction.programCounter ? malformed : candidate
        )),
      });
      const resolve = vi.fn<BattleScriptBattlerSelectorResolverPort<FixtureRules>>(() => 0);
      const prepare = vi.fn<BattleScriptStatusAnimationPreparationPort<FixtureRules>>();
      const result = stepBattleScriptMachine(
        malformedProgram,
        stateAt(instruction),
        handlers(true, resolve, prepare, malformedProgram),
      );
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toMatchObject({
        kind: "invalid-source-operand",
        opcodeId: 100,
        expected: "u8",
      });
      expect(resolve).not.toHaveBeenCalled();
      expect(prepare).not.toHaveBeenCalled();
    }
  });

  it("composes all three status receipt opcodes exactly once with no visual handler", () => {
    const selected = handlers(true, () => 0, () => Object.freeze({ kind: "suppress" }));
    expect(Object.keys(selected).map(Number).filter((id) => [100, 101, 102].includes(id))).toEqual([
      100,
      101,
      102,
    ]);
    expect(selected[100]).toBeTypeOf("function");
    expect(selected[101]).toBeTypeOf("function");
    expect(selected[102]).toBeTypeOf("function");
  });
});
