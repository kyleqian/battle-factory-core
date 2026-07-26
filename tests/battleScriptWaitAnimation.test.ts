import { describe, expect, it } from "vitest";
import commandHandlerData from "../src/data/gen/battle-script-command-handlers.json" with { type: "json" };
import lexicalFactData from "../src/data/gen/battle-script-handler-lexical-facts.json" with { type: "json" };
import observationData from "../src/data/gen/battle-script-opcode-observations.json" with { type: "json" };
import {
  createBattleScriptControlHandlers,
  createBattleScriptMachine,
  createBattleScriptSchedulerState,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";
import { createBattleScriptMoveValuesCommandHandlers } from "../src/engine/battleScriptMoveValuesCommands.ts";
import { createBattleScriptRuleCommandHandlers } from "../src/engine/battleScriptRuleCommands.ts";
import { createBattleScriptSourceCommandHandlers } from "../src/engine/battleScriptSourceCommands.ts";
import {
  loadBattleScriptProgram,
  type BattleScriptInstruction,
  type BattleScriptProgram,
} from "../src/engine/battleScriptProgram.ts";

const program = loadBattleScriptProgram();
const rules = Object.freeze({
  marker: "waitanimation-controller-barrier-only",
  multiHitCounter: 2,
  moveResultFlags: 0,
  moveEffectByte: 0,
  missType: 0,
  critMultiplier: 1,
  dmgMultiplier: 1,
  hitMarker: 0,
});
type FixtureRules = typeof rules;

const expectedStartIndexes = [
  13, 46, 74, 115, 147, 165, 208, 238, 252, 261, 300, 335, 346, 366, 441,
  510, 520, 537, 563, 580, 597, 615, 667, 701, 709, 721, 729, 740, 776, 786,
  815, 826, 836, 855, 864, 876, 886, 921, 960, 974, 994, 1019, 1031, 1040,
  1050, 1059, 1090, 1120, 1156, 1196, 1218, 1229, 1275, 1306, 1341, 1360,
  1410, 1417, 1457, 1501, 1512, 1536, 1556, 1608, 1624, 1634, 1643, 1654,
  1666, 1675, 1681, 1690, 1701, 1710, 1728, 1756, 1787, 1796, 1805, 1815,
  1824, 1853, 1887, 1904, 1931, 1953, 1973, 1998, 2017, 2274, 2408, 2425,
] as const;

function stateAt(
  instruction: BattleScriptInstruction,
  scheduler = createBattleScriptSchedulerState({
    messageDisplayActive: true,
    pauseCounterBattle: 9,
    activeBattler: 3,
    pendingControllerBattlers: [0, 2],
  }),
): BattleScriptMachineState<FixtureRules> {
  const initial = createBattleScriptMachine(
    program,
    instruction.source.label,
    rules,
    0x12345678,
    scheduler,
  );
  return Object.freeze({ ...initial, programCounter: instruction.programCounter });
}

function sourceHandlers(idle: boolean, selectedProgram: BattleScriptProgram = program) {
  return createBattleScriptSourceCommandHandlers(selectedProgram, Object.freeze({
    isControllerIdle: () => idle,
    prepareMessage: () => null,
    prepareStatusAnimation: () => null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => null,
    resolveBattlerAtPosition: () => null,
    resolveBattlerForBattleScript: () => null,
    resolveHalfwordOperand: () => null,
  }));
}

describe("source-exact WAITANIMATION controller-idle barrier", () => {
  it("pins opcode 10, Cmd_waitanimation, and the exact source hashes/body", () => {
    const slot = (commandHandlerData as {
      source: { dispatchTable: { sha256: string } };
      slots: Array<{
        index: number;
        opcode: string;
        table: { rowIndex: number; handlerExpression: string };
        handler: { symbol: string; definition: { startLine: number; endLine: number } };
      }>;
    }).slots[10]!;
    expect((commandHandlerData as {
      source: { dispatchTable: { sha256: string } };
    }).source.dispatchTable.sha256).toBe(
      "e0847cd2aa83ee5e18134c32baad348b7c763095cf59efa33da67c4a4e90120c",
    );
    expect(slot).toMatchObject({
      index: 10,
      opcode: "B_SCR_OP_WAITANIMATION",
      table: { rowIndex: 10, handlerExpression: "Cmd_waitanimation" },
      handler: {
        symbol: "Cmd_waitanimation",
        definition: { startLine: 1801, endLine: 1805 },
      },
    });

    const fact = (lexicalFactData as {
      handlers: Array<{
        symbol: string;
        source: { fileSha256: string; definitionTextSha256: string };
        rawLines: Array<{ raw: string }>;
        instructionPointerFacts: {
          reads: unknown[];
          writes: unknown[];
          advanceExpressions: Array<{ statementRaw: string }>;
        };
      }>;
    }).handlers.find((candidate) => candidate.symbol === "Cmd_waitanimation")!;
    expect(fact.source).toMatchObject({
      fileSha256: "e0847cd2aa83ee5e18134c32baad348b7c763095cf59efa33da67c4a4e90120c",
      definitionTextSha256: "8d0a0f4f509319c82f1cbf2749e8dff064442e92694b8d48eb5082cd04a5f282",
    });
    expect(fact.rawLines.map(({ raw }) => raw)).toEqual([
      "static void Cmd_waitanimation(void)",
      "{",
      "    if (gBattleControllerExecFlags == 0)",
      "        gBattlescriptCurrInstr++;",
      "}",
    ]);
    expect(fact.instructionPointerFacts).toMatchObject({
      reads: [],
      writes: [],
      advanceExpressions: [{
        statementRaw: "if (gBattleControllerExecFlags == 0)\n        gBattlescriptCurrInstr++;",
      }],
    });
  });

  it("pins every one of the 92 generated starts and every zero-width operand sequence", () => {
    const observations = observationData as {
      opcodes: Array<{
        slot: { id: number; name: string };
        observedInstructionCount: number;
        observedInstructionStartIndexes: number[];
        observedOperandWidthSequences: Array<{
          operandWidths: number[];
          occurrenceCount: number;
          instructionStartIndexes: number[];
        }>;
      }>;
      instructionStarts: Array<{
        index: number;
        opcode: { id: number; name: string };
        operandWidths: number[];
      }>;
    };
    const opcode = observations.opcodes.find(({ slot }) => slot.id === 10)!;
    const starts = observations.instructionStarts.filter(({ opcode: seen }) => seen.id === 10);
    expect(opcode).toMatchObject({
      slot: { id: 10, name: "B_SCR_OP_WAITANIMATION" },
      observedInstructionCount: 92,
      observedInstructionStartIndexes: expectedStartIndexes,
      observedOperandWidthSequences: [{
        operandWidths: [],
        occurrenceCount: 92,
        instructionStartIndexes: expectedStartIndexes,
      }],
    });
    expect(starts.map(({ index }) => index)).toEqual(expectedStartIndexes);
    expect(starts.every(({ operandWidths }) => operandWidths.length === 0)).toBe(true);
    const compiledStarts = program.instructions.filter(({ opcodeId }) => opcodeId === 10);
    expect(compiledStarts.map(({ programCounter }) => programCounter)).toEqual(expectedStartIndexes);
    expect(compiledStarts.every(({ operands }) => operands.length === 0)).toBe(true);
  });

  it("advances every start by one instruction while idle with total state identity", () => {
    for (const instruction of program.instructions.filter(({ opcodeId }) => opcodeId === 10)) {
      const initial = stateAt(instruction);
      const result = stepBattleScriptMachine(program, initial, sourceHandlers(true));
      expect(result.kind).toBe("advanced");
      expect(result.state.programCounter).toBe(instruction.programCounter + 1);
      expect(result.state.instructionsExecuted).toBe(1);
      expect(result.state.scheduler).toBe(initial.scheduler);
      expect(result.state.events).toBe(initial.events);
      expect(result.state.rulesContext).toBe(initial.rulesContext);
      expect(result.state.rng).toBe(initial.rng);
    }
  });

  it("identity-blocks while busy and retries the same instruction once idle", () => {
    const instruction = program.instructions.find(({ opcodeId }) => opcodeId === 10)!;
    const initial = stateAt(instruction);
    const blocked = stepBattleScriptMachine(program, initial, sourceHandlers(false));
    expect(blocked.kind).toBe("blocked");
    if (blocked.kind !== "blocked") throw new Error("expected WAITANIMATION to block");
    expect(blocked.reason).toEqual({
      kind: "controller-busy",
      programCounter: instruction.programCounter,
      opcodeId: 10,
      opcodeName: "B_SCR_OP_WAITANIMATION",
    });
    expect(blocked.state).toBe(initial);

    const retried = stepBattleScriptMachine(program, blocked.state, sourceHandlers(true));
    expect(retried.kind).toBe("advanced");
    expect(retried.state.programCounter).toBe(instruction.programCounter + 1);
    expect(retried.state.scheduler).toBe(initial.scheduler);
    expect(retried.state.events).toBe(initial.events);
    expect(retried.state.rulesContext).toBe(initial.rulesContext);
    expect(retried.state.rng).toBe(initial.rng);
  });

  it("halts malformed synthetic operands before consulting controller readiness", () => {
    const instruction = program.instructions.find(({ opcodeId }) => opcodeId === 10)!;
    const malformedInstruction = Object.freeze({
      ...instruction,
      operands: Object.freeze([{
        widthBytes: 1 as const,
        expression: "SYNTHETIC_OPERAND",
        sourceMacro: "waitanimation",
        sourceMacroLine: 45,
        wrapperPath: Object.freeze(["waitanimation"]),
      }]),
    });
    const malformedProgram = Object.freeze({
      ...program,
      instructions: Object.freeze(program.instructions.map((candidate) =>
        candidate.programCounter === instruction.programCounter
          ? malformedInstruction
          : candidate
      )),
    });
    const initial = stateAt(instruction);
    const result = stepBattleScriptMachine(
      malformedProgram,
      initial,
      sourceHandlers(false, malformedProgram),
    );
    expect(result.kind).toBe("halted");
    expect(result.state.haltReason).toEqual({
      kind: "invalid-source-operand",
      programCounter: instruction.programCounter,
      opcodeId: 10,
      opcodeName: "B_SCR_OP_WAITANIMATION",
      operandExpression: "SYNTHETIC_OPERAND",
      expected: "none",
      received: "1 operands",
    });
    expect(result.state.scheduler).toBe(initial.scheduler);
    expect(result.state.events).toEqual([]);
    expect(result.state.rulesContext).toBe(rules);
    expect(result.state.rng.calls).toBe(0);
  });

  it("replays deterministically and composes to exactly twenty-nine supported handlers", () => {
    const instruction = program.instructions.find(({ opcodeId }) => opcodeId === 10)!;
    const replay = () => stepBattleScriptMachine(program, stateAt(instruction), sourceHandlers(true));
    expect(replay()).toEqual(replay());

    expect(Object.keys(sourceHandlers(true)).map(Number).sort((a, b) => a - b)).toEqual([
      10, 16, 17, 18, 20, 26, 57, 58, 83, 84, 85, 86, 97, 98, 100, 101, 102, 111, 131, 248,
    ]);
    const composed = Object.freeze({
      ...createBattleScriptControlHandlers<FixtureRules>(program),
      ...sourceHandlers(true),
      ...createBattleScriptRuleCommandHandlers<FixtureRules>(
        program,
        () => rules.multiHitCounter,
      ),
      ...createBattleScriptMoveValuesCommandHandlers<FixtureRules>(program),
    });
    expect(Object.keys(composed).map(Number).sort((a, b) => a - b)).toEqual([
      10, 16, 17, 18, 20, 26, 37, 38, 39, 40, 57, 58, 60, 61, 62, 63, 65, 83, 84, 85,
      86, 97, 98, 100, 101, 102, 111, 131, 141, 248,
    ]);
  });
});
