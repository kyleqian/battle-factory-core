import { describe, expect, it, vi } from "vitest";
import commandHandlerData from "../src/data/gen/battle-script-command-handlers.json" with { type: "json" };
import lexicalFactData from "../src/data/gen/battle-script-handler-lexical-facts.json" with { type: "json" };
import observationData from "../src/data/gen/battle-script-opcode-observations.json" with { type: "json" };
import {
  acknowledgeBattleScriptController,
  createBattleScriptControlHandlers,
  createBattleScriptMachine,
  createBattleScriptSchedulerState,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";
import { createBattleScriptMoveValuesCommandHandlers } from "../src/engine/battleScriptMoveValuesCommands.ts";
import { createBattleScriptRuleCommandHandlers } from "../src/engine/battleScriptRuleCommands.ts";
import {
  createBattleScriptSourceCommandHandlers,
  type BattleScriptBattlerPositionResolverPort,
} from "../src/engine/battleScriptSourceCommands.ts";
import {
  loadBattleScriptProgram,
  type BattleScriptInstruction,
  type BattleScriptProgram,
} from "../src/engine/battleScriptProgram.ts";

const program = loadBattleScriptProgram();
const rules = Object.freeze({
  marker: "trainer-slide-receipt-only",
  multiHitCounter: 2,
  moveResultFlags: 0,
  moveEffectByte: 0,
  missType: 0,
  critMultiplier: 1,
  dmgMultiplier: 1,
  hitMarker: 0,
});
type FixtureRules = typeof rules;

const commands = [
  {
    id: 83,
    name: "B_SCR_OP_TRAINERSLIDEIN",
    symbol: "Cmd_trainerslidein",
    kind: "trainer-slide-in",
    definitionHash: "db90774b98e31fa499591246713b292079fc1eae67294638caca215f82470056",
    lines: [5301, 5308],
  },
  {
    id: 248,
    name: "B_SCR_OP_TRAINERSLIDEOUT",
    symbol: "Cmd_trainerslideout",
    kind: "trainer-slide-out",
    definitionHash: "03bb6dd9578fdbbb176eab1571ecda3026d730f03b9dd01cdd2e6835ea4986e5",
    lines: [10319, 10326],
  },
] as const;

function stateAt(
  instruction: BattleScriptInstruction,
  scheduler = createBattleScriptSchedulerState(),
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

function handlers(
  resolveBattlerAtPosition: BattleScriptBattlerPositionResolverPort<FixtureRules>,
  selectedProgram: BattleScriptProgram = program,
) {
  return createBattleScriptSourceCommandHandlers(selectedProgram, Object.freeze({
    isControllerIdle: () => {
      throw new Error("trainer-slide receipts must not consult controller-idle");
    },
    prepareMessage: () => null,
    prepareStatusAnimation: () => null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => null,
    resolveBattlerAtPosition,
    resolveBattlerForBattleScript: () => {
      throw new Error("trainer-slide receipts must not use the BattleScript selector port");
    },
    resolveHalfwordOperand: () => null,
  }));
}

describe("source-exact TRAINERSLIDEIN / TRAINERSLIDEOUT controller receipts", () => {
  it("pins both opcode slots, handlers, source hashes, and exact two-byte bodies", () => {
    const slots = (commandHandlerData as {
      slots: Array<{
        index: number;
        opcode: string;
        table: { rowIndex: number; handlerExpression: string };
        handler: { symbol: string; definition: { startLine: number; endLine: number } };
      }>;
    }).slots;
    const facts = (lexicalFactData as {
      handlers: Array<{
        symbol: string;
        source: { fileSha256: string; definitionTextSha256: string };
        rawLines: Array<{ raw: string }>;
        instructionPointerFacts: {
          reads: Array<{ accessExpression: string }>;
          advanceExpressions: Array<{ statementRaw: string }>;
        };
      }>;
    }).handlers;

    for (const command of commands) {
      expect(slots[command.id]).toMatchObject({
        index: command.id,
        opcode: command.name,
        table: { rowIndex: command.id, handlerExpression: command.symbol },
        handler: {
          symbol: command.symbol,
          definition: { startLine: command.lines[0], endLine: command.lines[1] },
        },
      });
      const fact = facts.find((candidate) => candidate.symbol === command.symbol);
      expect(fact).toMatchObject({
        source: {
          fileSha256: "e0847cd2aa83ee5e18134c32baad348b7c763095cf59efa33da67c4a4e90120c",
          definitionTextSha256: command.definitionHash,
        },
        instructionPointerFacts: {
          reads: [{ accessExpression: "gBattlescriptCurrInstr[1]" }],
          advanceExpressions: [{ statementRaw: "gBattlescriptCurrInstr += 2;" }],
        },
      });
      expect(fact?.rawLines.some(({ raw }) =>
        raw.includes("GetBattlerAtPosition(gBattlescriptCurrInstr[1])")
      )).toBe(true);
      expect(fact?.rawLines.some(({ raw }) => raw.includes("GetBattlerForBattleScript"))).toBe(false);
    }
  });

  it("pins every generated start and its single u8 operand; Wally's scripts_2 start is outside this program", () => {
    const starts = (observationData as {
      instructionStarts: Array<{
        index: number;
        opcode: { id: number };
        sourceInvocation: { line: number; actualOperands: string[] };
        operandWidths: number[];
      }>;
    }).instructionStarts;
    const slideIn = starts.filter((start) => start.opcode.id === 83);
    const slideOut = starts.filter((start) => start.opcode.id === 248);
    expect(slideIn.map((start) => start.index)).toEqual([
      2115, 2121, 2146, 2153, 2161, 2166, 2183, 2188, 2200, 2206,
    ]);
    expect(slideIn.map((start) => start.sourceInvocation.line)).toEqual([
      2927, 2933, 2966, 2974, 2985, 2990, 3013, 3018, 3035, 3041,
    ]);
    expect(slideOut.map((start) => start.index)).toEqual([
      2119, 2151, 2164, 2186, 2204,
    ]);
    expect(slideOut.map((start) => start.sourceInvocation.line)).toEqual([
      2931, 2972, 2988, 3016, 3039,
    ]);
    expect(slideIn.every((start) => start.operandWidths.join() === "1")).toBe(true);
    expect(slideOut.every((start) => start.operandWidths.join() === "1")).toBe(true);
    expect(slideIn.map((start) => start.sourceInvocation.actualOperands[0])).not.toContain("BS_TARGET");
    expect(program.instructions.filter((instruction) => instruction.opcodeId === 83)).toHaveLength(10);
  });

  it("resolves every start through only the position port and emits one distinct frozen receipt", () => {
    for (const command of commands) {
      const starts = program.instructions.filter((instruction) => instruction.opcodeId === command.id);
      for (const [index, instruction] of starts.entries()) {
        const battler = (index % 4) as 0 | 1 | 2 | 3;
        const resolver = vi.fn<BattleScriptBattlerPositionResolverPort<FixtureRules>>(() => battler);
        const initial = stateAt(instruction, createBattleScriptSchedulerState({
          messageDisplayActive: true,
          pauseCounterBattle: 9,
          activeBattler: 3,
          pendingControllerBattlers: battler === 1 ? [0] : [1],
        }));
        const result = stepBattleScriptMachine(program, initial, handlers(resolver));
        expect(result.kind).toBe("advanced");
        expect(resolver).toHaveBeenCalledOnce();
        expect(resolver.mock.calls[0]?.[1]).toBe(instruction.operands[0]);
        expect(result.state.programCounter).toBe(instruction.programCounter + 1);
        expect(result.state.scheduler.activeBattler).toBe(battler);
        expect(result.state.scheduler.pendingControllerBattlers).toContain(battler);
        expect(result.state.events).toHaveLength(1);
        expect(result.state.events[0]).toMatchObject({
          kind: command.kind,
          battler,
          sequence: 1,
          provenance: {
            programCounter: instruction.programCounter,
            opcodeId: command.id,
            opcodeName: command.name,
            instructionExecution: 1,
          },
        });
        expect(Object.isFrozen(result.state.events)).toBe(true);
        expect(Object.isFrozen(result.state.events[0])).toBe(true);
        expect(Object.isFrozen(result.state.events[0]!.provenance)).toBe(true);
        expect(result.state.rulesContext).toBe(initial.rulesContext);
        expect(result.state.rng).toBe(initial.rng);
      }
    }
  });

  it("requires exactly one u8 operand before resolving either command", () => {
    for (const command of commands) {
      const instruction = program.instructions.find((candidate) => candidate.opcodeId === command.id)!;
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
        const resolver = vi.fn<BattleScriptBattlerPositionResolverPort<FixtureRules>>(() => 0);
        const result = stepBattleScriptMachine(
          malformedProgram,
          stateAt(instruction),
          handlers(resolver, malformedProgram),
        );
        expect(result.kind).toBe("halted");
        expect(result.state.haltReason).toMatchObject({
          kind: "invalid-source-operand",
          opcodeId: command.id,
          expected: "u8",
        });
        expect(result.state.events).toEqual([]);
        expect(resolver).not.toHaveBeenCalled();
      }
    }
  });

  it("identity-blocks unavailable position context for both commands", () => {
    for (const command of commands) {
      const instruction = program.instructions.find((candidate) => candidate.opcodeId === command.id)!;
      const initial = stateAt(instruction);
      const result = stepBattleScriptMachine(program, initial, handlers(() => null));
      expect(result.kind).toBe("blocked");
      if (result.kind !== "blocked") throw new Error("expected position block");
      expect(result.reason).toEqual({
        kind: "source-context-unavailable",
        programCounter: instruction.programCounter,
        opcodeId: command.id,
        opcodeName: command.name,
        port: "resolve-battler-at-position",
        operandExpression: instruction.operands[0]!.expression,
      });
      expect(result.state).toBe(initial);
    }
  });

  it.each([-1, 4, 1.5, Number.NaN])(
    "halts invalid resolved battler %s without effects",
    (battler) => {
      for (const command of commands) {
        const instruction = program.instructions.find((candidate) => candidate.opcodeId === command.id)!;
        const initial = stateAt(instruction);
        const result = stepBattleScriptMachine(
          program,
          initial,
          handlers(() => battler as 0),
        );
        expect(result.kind).toBe("halted");
        expect(result.state.haltReason).toMatchObject({
          kind: "invalid-source-battler",
          opcodeId: command.id,
          received: String(battler),
        });
        expect(result.state.scheduler).toBe(initial.scheduler);
        expect(result.state.events).toBe(initial.events);
        expect(result.state.rulesContext).toBe(initial.rulesContext);
        expect(result.state.rng).toBe(initial.rng);
      }
    },
  );

  it("starts controller work without an idle guard and acknowledges receipt, not animation completion", () => {
    for (const command of commands) {
      const instruction = program.instructions.find((candidate) => candidate.opcodeId === command.id)!;
      const initial = stateAt(instruction, createBattleScriptSchedulerState({
        activeBattler: 3,
        pendingControllerBattlers: [0, 2],
      }));
      const result = stepBattleScriptMachine(program, initial, handlers(() => 1));
      expect(result.kind).toBe("advanced");
      expect(result.state.scheduler).toEqual({
        messageDisplayActive: false,
        pauseCounterBattle: 0,
        activeBattler: 1,
        pendingControllerBattlers: [0, 2, 1],
      });
      expect(acknowledgeBattleScriptController(result.state.scheduler, 3))
        .toBe(result.state.scheduler);
      const acknowledged = acknowledgeBattleScriptController(result.state.scheduler, 1);
      expect(acknowledged.pendingControllerBattlers).toEqual([0, 2]);
      expect(Object.keys(acknowledged).sort()).toEqual([
        "activeBattler",
        "messageDisplayActive",
        "pauseCounterBattle",
        "pendingControllerBattlers",
      ]);
    }
  });

  it("replays immutably with rules/RNG identity and composes to exactly twenty-eight handlers", () => {
    const instruction = program.instructions.find((candidate) => candidate.opcodeId === 83)!;
    const makeResult = () => stepBattleScriptMachine(program, stateAt(instruction), handlers(() => 2));
    expect(makeResult()).toEqual(makeResult());

    const sourceHandlers = handlers(() => 0);
    expect(Object.keys(sourceHandlers).map(Number).sort((left, right) => left - right)).toEqual([
      10, 16, 17, 18, 20, 26, 57, 58, 83, 84, 85, 86, 97, 98, 100, 101, 102, 111, 131, 248,
    ]);
    const composed = Object.freeze({
      ...createBattleScriptControlHandlers<FixtureRules>(program),
      ...sourceHandlers,
      ...createBattleScriptRuleCommandHandlers<FixtureRules>(
        program,
        () => rules.multiHitCounter,
      ),
      ...createBattleScriptMoveValuesCommandHandlers<FixtureRules>(program),
    });
    expect(Object.keys(composed).map(Number).sort((left, right) => left - right)).toEqual([
      10, 16, 17, 18, 20, 26, 37, 38, 39, 40, 57, 58, 60, 61, 62, 65, 83, 84, 85, 86, 97, 98, 100, 101, 102, 111, 131, 141, 248,
    ]);
  });
});
