import { describe, expect, it, vi } from "vitest";
import commandHandlerData from "../src/data/gen/battle-script-command-handlers.json" with { type: "json" };
import lexicalFactData from "../src/data/gen/battle-script-handler-lexical-facts.json" with { type: "json" };
import macroData from "../src/data/gen/battle-script-macro-emissions.json" with { type: "json" };
import observationData from "../src/data/gen/battle-script-opcode-observations.json" with { type: "json" };
import {
  acknowledgeBattleScriptController,
  createBattleScriptMachine,
  createBattleScriptSchedulerState,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";
import {
  createBattleScriptSourceCommandHandlers,
  type BattleScriptBattlerSelectorResolverPort,
  type BattleScriptStatusAnimationPreparationPort,
  type BattleScriptStatusAnimationReceipt,
  type BattleScriptStatusAnimationRequest,
} from "../src/engine/battleScriptSourceCommands.ts";
import {
  loadBattleScriptProgram,
  type BattleScriptInstruction,
  type BattleScriptProgram,
} from "../src/engine/battleScriptProgram.ts";

const program = loadBattleScriptProgram();
const rules = Object.freeze({ marker: "volatile-status-rules-owned" });
type FixtureRules = typeof rules;
const status2Starts = [2760, 2792, 2799, 2803, 3033];
const chosenStarts = [2754, 2851];

function stateAt(
  instruction: BattleScriptInstruction,
  scheduler = createBattleScriptSchedulerState(),
): BattleScriptMachineState<FixtureRules> {
  const initial = createBattleScriptMachine(
    program,
    instruction.source.label,
    rules,
    0x89ab_cdef,
    scheduler,
  );
  return Object.freeze({ ...initial, programCounter: instruction.programCounter });
}

function receipt(
  battler: 0 | 1 | 2 | 3,
  isStatus2: number,
  status: number,
): BattleScriptStatusAnimationReceipt {
  return Object.freeze({ kind: "status-animation", battler, isStatus2, status });
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
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    prepareStatusAnimation: prepare,
    resolveAttackerBattler: () => null,
    resolveBattlerAtPosition: () => null,
    resolveBattlerForBattleScript: resolve,
    resolveHalfwordOperand: () => null,
  }));
}

function replaceInstruction(
  original: BattleScriptInstruction,
  replacement: BattleScriptInstruction,
): BattleScriptProgram {
  return Object.freeze({
    ...program,
    instructions: Object.freeze(program.instructions.map((candidate) =>
      candidate.programCounter === original.programCounter ? replacement : candidate
    )),
  });
}

describe("source-exact STATUS2ANIMATION and CHOSENSTATUSANIMATION receipts", () => {
  it("pins handler identities, hashes, shared predicates, transport arguments, and advances", () => {
    const slots = (commandHandlerData as {
      slots: Array<{
        index: number;
        opcode: string;
        table: { handlerExpression: string };
        handler: { definition: { startLine: number; endLine: number } };
      }>;
    }).slots;
    expect(slots[101]).toMatchObject({
      index: 101,
      opcode: "B_SCR_OP_STATUS2ANIMATION",
      table: { handlerExpression: "Cmd_status2animation" },
      handler: { definition: { startLine: 5769, endLine: 5786 } },
    });
    expect(slots[102]).toMatchObject({
      index: 102,
      opcode: "B_SCR_OP_CHOSENSTATUSANIMATION",
      table: { handlerExpression: "Cmd_chosenstatusanimation" },
      handler: { definition: { startLine: 5788, endLine: 5805 } },
    });

    const facts = (lexicalFactData as {
      handlers: Array<{
        symbol: string;
        source: { fileSha256: string; definitionTextSha256: string };
        rawLines: Array<{ raw: string }>;
        instructionPointerFacts: { advanceExpressions: Array<{ statementRaw: string }> };
      }>;
    }).handlers;
    const expected = [
      ["Cmd_status2animation", "8fec336dae0b5ada2c3e2b5fc475fc0762098c9cd2774f6808dfdd9e6675d781", "gBattlescriptCurrInstr += 6;"],
      ["Cmd_chosenstatusanimation", "033b302b866ee39e0b9d5706c72cec285d22639e84521d06893b69a92297c430", "gBattlescriptCurrInstr += 7;"],
    ] as const;
    for (const [symbol, hash, advance] of expected) {
      const fact = facts.find((candidate) => candidate.symbol === symbol)!;
      expect(fact.source).toEqual({
        file: "src/battle_script_commands.c",
        fileSha256: "e0847cd2aa83ee5e18134c32baad348b7c763095cf59efa33da67c4a4e90120c",
        startLine: symbol === "Cmd_status2animation" ? 5769 : 5788,
        openingBraceLine: symbol === "Cmd_status2animation" ? 5770 : 5789,
        endLine: symbol === "Cmd_status2animation" ? 5786 : 5805,
        signatureLine: symbol === "Cmd_status2animation" ? 5769 : 5788,
        signatureRaw: `static void ${symbol}(void)`,
        definitionTextSha256: hash,
      });
      expect(fact.instructionPointerFacts.advanceExpressions).toEqual([
        expect.objectContaining({ statementRaw: advance }),
      ]);
      const body = fact.rawLines.map(({ raw }) => raw).join("\n");
      for (const token of [
        "gBattleControllerExecFlags == 0",
        "GetBattlerForBattleScript(gBattlescriptCurrInstr[1])",
        "STATUS3_SEMI_INVULNERABLE",
        "substituteHP == 0",
        "HITMARKER_NO_ANIMATIONS",
        "MarkBattlerForControllerExec(gActiveBattler)",
      ]) expect(body).toContain(token);
    }
    expect(facts.find(({ symbol }) => symbol === "Cmd_status2animation")!.rawLines
      .map(({ raw }) => raw).join("\n")).toContain(
        "gBattleMons[gActiveBattler].status2 & wantedToAnimate",
      );
    expect(facts.find(({ symbol }) => symbol === "Cmd_chosenstatusanimation")!.rawLines
      .map(({ raw }) => raw).join("\n")).toContain(
        "gBattlescriptCurrInstr[2], wantedStatus",
      );
  });

  it("pins all 5+2 starts, selector/byte/u32 widths, and .4byte little-endian source layout", () => {
    const observations = observationData as {
      opcodes: Array<{
        slot: { id: number };
        observedInstructionCount: number;
        observedInstructionStartIndexes: number[];
        observedOperandWidthSequences: Array<{ operandWidths: number[]; occurrenceCount: number }>;
      }>;
    };
    expect(observations.opcodes.find(({ slot }) => slot.id === 101)).toMatchObject({
      observedInstructionCount: 5,
      observedInstructionStartIndexes: status2Starts,
      observedOperandWidthSequences: [{ operandWidths: [1, 4], occurrenceCount: 5 }],
    });
    expect(observations.opcodes.find(({ slot }) => slot.id === 102)).toMatchObject({
      observedInstructionCount: 2,
      observedInstructionStartIndexes: chosenStarts,
      observedOperandWidthSequences: [{ operandWidths: [1, 1, 4], occurrenceCount: 2 }],
    });
    const macros = (macroData as {
      macros: Array<{
        name: string;
        sourceStatements: Array<{ directive?: string; expressions?: string[] }>;
      }>;
    }).macros;
    expect(macros.find(({ name }) => name === "status2animation")!.sourceStatements
      .map(({ directive }) => directive)).toEqual([".byte", ".byte", ".4byte"]);
    expect(macros.find(({ name }) => name === "chosenstatusanimation")!.sourceStatements
      .map(({ directive }) => directive)).toEqual([".byte", ".byte", ".byte", ".4byte"]);
  });

  it("decodes and executes every observed masked and explicit start without conflating them", () => {
    const expectedMasks = [0x7, 0x000f_0000, 0x0800_0000, 0x1000_0000, 0x000f_0000];
    for (const [index, wantedMask] of status2Starts.map((start, index) => [start, expectedMasks[index]!] as const)) {
      const instruction = program.instructions[index]!;
      const prepare = vi.fn<BattleScriptStatusAnimationPreparationPort<FixtureRules>>(
        (_context, battler, request) => {
          expect(request).toEqual({ kind: "masked-live-status2", wantedMask });
          return Object.freeze({ kind: "emit", receipt: receipt(battler, 1, wantedMask & 4) });
        },
      );
      const result = stepBattleScriptMachine(program, stateAt(instruction), handlers(true, () => 1, prepare));
      expect(result.kind).toBe("advanced");
      expect(result.state.events.at(-1)).toMatchObject({ isStatus2: 1, status: wantedMask & 4 });
      expect(prepare).toHaveBeenCalledOnce();
    }
    for (const index of chosenStarts) {
      const instruction = program.instructions[index]!;
      const prepare = vi.fn<BattleScriptStatusAnimationPreparationPort<FixtureRules>>(
        (_context, battler, request) => {
          expect(request).toEqual({ kind: "explicit-status", isStatus2: 1, status: 7 });
          return Object.freeze({ kind: "emit", receipt: receipt(battler, 1, 7) });
        },
      );
      const result = stepBattleScriptMachine(program, stateAt(instruction), handlers(true, () => 1, prepare));
      expect(result.kind).toBe("advanced");
      expect(result.state.events.at(-1)).toMatchObject({ isStatus2: 1, status: 7 });
    }
  });

  it("preserves an explicit raw u8 and full u32 while masked-live status may be a subset", () => {
    const original = program.instructions[chosenStarts[0]!]!;
    const changed = Object.freeze({
      ...original,
      operands: Object.freeze([
        original.operands[0]!,
        Object.freeze({ ...original.operands[1]!, expression: "0x7e" }),
        Object.freeze({ ...original.operands[2]!, expression: "0x78563412" }),
      ]),
    });
    const changedProgram = replaceInstruction(original, changed);
    const prepare = vi.fn<BattleScriptStatusAnimationPreparationPort<FixtureRules>>(
      (_context, battler, request) => {
        expect(request).toEqual({
          kind: "explicit-status",
          isStatus2: 0x7e,
          status: 0x7856_3412,
        });
        return Object.freeze({ kind: "emit", receipt: receipt(battler, 0x7e, 0x7856_3412) });
      },
    );
    const result = stepBattleScriptMachine(
      changedProgram,
      stateAt(original),
      handlers(true, () => 2, prepare, changedProgram),
    );
    expect(result.state.events.at(-1)).toMatchObject({ isStatus2: 0x7e, status: 0x7856_3412 });
  });

  it("checks controller idle before decoding, resolving, or preparing", () => {
    for (const index of [status2Starts[0]!, chosenStarts[0]!]) {
      const instruction = program.instructions[index]!;
      const resolve = vi.fn<BattleScriptBattlerSelectorResolverPort<FixtureRules>>(() => 0);
      const prepare = vi.fn<BattleScriptStatusAnimationPreparationPort<FixtureRules>>();
      const initial = stateAt(instruction);
      const result = stepBattleScriptMachine(program, initial, handlers(false, resolve, prepare));
      expect(result.kind).toBe("blocked");
      expect(result.state).toBe(initial);
      expect(resolve).not.toHaveBeenCalled();
      expect(prepare).not.toHaveBeenCalled();
    }
  });

  it("identity-blocks unavailable selector/preparation and halts invalid battlers", () => {
    const instruction = program.instructions[status2Starts[0]!]!;
    const initial = stateAt(instruction);
    const selectorUnavailable = stepBattleScriptMachine(
      program,
      initial,
      handlers(true, () => null, () => {
        throw new Error("must not prepare");
      }),
    );
    expect(selectorUnavailable.kind).toBe("blocked");
    expect(selectorUnavailable.state).toBe(initial);
    const prepare = vi.fn<BattleScriptStatusAnimationPreparationPort<FixtureRules>>();
    const invalid = stepBattleScriptMachine(program, initial, handlers(true, () => 9 as never, prepare));
    expect(invalid.kind).toBe("halted");
    expect(prepare).not.toHaveBeenCalled();
    const unavailable = stepBattleScriptMachine(program, initial, handlers(true, () => 0, () => null));
    expect(unavailable.kind).toBe("blocked");
    expect(unavailable.state).toBe(initial);
    if (unavailable.kind === "blocked") {
      expect(unavailable.reason).toMatchObject({ port: "prepare-status-animation" });
    }
  });

  it("suppresses with fixed advance and active-battler bookkeeping but no pending/event", () => {
    for (const index of [status2Starts[2]!, chosenStarts[1]!]) {
      const instruction = program.instructions[index]!;
      const initial = stateAt(instruction, createBattleScriptSchedulerState({
        messageDisplayActive: true,
        pauseCounterBattle: 9,
        activeBattler: 3,
        pendingControllerBattlers: [2],
      }));
      const result = stepBattleScriptMachine(
        program,
        initial,
        handlers(true, () => 1, () => Object.freeze({ kind: "suppress" })),
      );
      expect(result.kind).toBe("advanced");
      expect(result.state.programCounter).toBe(instruction.programCounter + 1);
      expect(result.state.scheduler).toMatchObject({
        activeBattler: 1,
        pendingControllerBattlers: [2],
        messageDisplayActive: true,
        pauseCounterBattle: 9,
      });
      expect(result.state.events).toBe(initial.events);
      expect(result.state.rulesContext).toBe(initial.rulesContext);
      expect(result.state.rng).toBe(initial.rng);
    }
  });

  it("emits, remains pending until ack, and preserves rules/RNG ownership", () => {
    const instruction = program.instructions[status2Starts[0]!]!;
    const exact = receipt(0, 1, 4);
    const result = stepBattleScriptMachine(
      program,
      stateAt(instruction),
      handlers(true, () => 0, () => Object.freeze({ kind: "emit", receipt: exact })),
    );
    expect(result.kind).toBe("advanced");
    expect(result.state.scheduler).toMatchObject({
      activeBattler: 0,
      pendingControllerBattlers: [0],
    });
    expect(result.state.events.at(-1)).toMatchObject({
      ...exact,
      provenance: { opcodeId: 101, opcodeName: "B_SCR_OP_STATUS2ANIMATION" },
    });
    expect(result.state.rulesContext).toBe(rules);
    expect(result.state.rng).toMatchObject({ value: 0x89ab_cdef, calls: 0, ledger: [] });
    const acknowledged = acknowledgeBattleScriptController(result.state.scheduler, 0);
    expect(acknowledged.pendingControllerBattlers).toEqual([]);
    expect(result.state.scheduler.pendingControllerBattlers).toEqual([0]);
  });

  it("rejects mutable, mismatched, out-of-mask, and malformed receipts", () => {
    const cases: Array<{
      index: number;
      prepare: BattleScriptStatusAnimationPreparationPort<FixtureRules>;
    }> = [
      { index: status2Starts[0]!, prepare: () => ({ kind: "suppress" }) },
      {
        index: status2Starts[0]!,
        prepare: () => Object.freeze({ kind: "emit", receipt: receipt(0, 0, 4) }),
      },
      {
        index: status2Starts[0]!,
        prepare: () => Object.freeze({ kind: "emit", receipt: receipt(0, 1, 8) }),
      },
      {
        index: chosenStarts[0]!,
        prepare: () => Object.freeze({ kind: "emit", receipt: receipt(0, 1, 6) }),
      },
      {
        index: chosenStarts[0]!,
        prepare: () => Object.freeze({
          kind: "emit",
          receipt: Object.freeze({ ...receipt(0, 1, 7), isStatus2: 256 }),
        }),
      },
    ];
    for (const { index, prepare } of cases) {
      const instruction = program.instructions[index]!;
      const result = stepBattleScriptMachine(program, stateAt(instruction), handlers(true, () => 0, prepare));
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toMatchObject({ kind: "invalid-source-snapshot" });
    }
  });

  it("halts malformed widths/counts and undecodable numeric expressions before external ports", () => {
    for (const index of [status2Starts[0]!, chosenStarts[0]!]) {
      const original = program.instructions[index]!;
      const mutations = [
        Object.freeze({ ...original, operands: Object.freeze([]) }),
        Object.freeze({
          ...original,
          operands: Object.freeze(original.operands.map((operand, operandIndex) =>
            operandIndex === original.operands.length - 1
              ? Object.freeze({ ...operand, widthBytes: 2 as const })
              : operand
          )),
        }),
        Object.freeze({
          ...original,
          operands: Object.freeze(original.operands.map((operand, operandIndex) =>
            operandIndex === original.operands.length - 1
              ? Object.freeze({ ...operand, expression: "NOT_A_PINNED_STATUS" })
              : operand
          )),
        }),
      ];
      for (const malformed of mutations) {
        const malformedProgram = replaceInstruction(original, malformed);
        const resolve = vi.fn<BattleScriptBattlerSelectorResolverPort<FixtureRules>>(() => 0);
        const prepare = vi.fn<BattleScriptStatusAnimationPreparationPort<FixtureRules>>();
        const result = stepBattleScriptMachine(
          malformedProgram,
          stateAt(original),
          handlers(true, resolve, prepare, malformedProgram),
        );
        expect(result.kind).toBe("halted");
        expect(result.state.haltReason).toMatchObject({ kind: "invalid-source-operand" });
        expect(resolve).not.toHaveBeenCalled();
        expect(prepare).not.toHaveBeenCalled();
      }
    }
  });

  it("replays deterministically and keeps requests/receipts frozen across exact composition", () => {
    const instruction = program.instructions[status2Starts[4]!]!;
    const requests: BattleScriptStatusAnimationRequest[] = [];
    const run = () => stepBattleScriptMachine(
      program,
      stateAt(instruction),
      handlers(true, () => 3, (_context, battler, request) => {
        expect(Object.isFrozen(request)).toBe(true);
        requests.push(request);
        return Object.freeze({ kind: "emit", receipt: receipt(battler, 1, 0x0005_0000) });
      }),
    );
    const first = run();
    const second = run();
    expect(first).toEqual(second);
    expect(requests).toEqual([
      { kind: "masked-live-status2", wantedMask: 0x000f_0000 },
      { kind: "masked-live-status2", wantedMask: 0x000f_0000 },
    ]);
    const selected = handlers(true, () => 0, () => Object.freeze({ kind: "suppress" }));
    expect(Object.keys(selected).map(Number).filter((id) => [100, 101, 102].includes(id))).toEqual([
      100,
      101,
      102,
    ]);
  });
});
