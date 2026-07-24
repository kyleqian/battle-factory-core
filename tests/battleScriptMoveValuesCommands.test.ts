import { describe, expect, it } from "vitest";
import commandHandlerData from "../src/data/gen/battle-script-command-handlers.json" with { type: "json" };
import lexicalFactData from "../src/data/gen/battle-script-handler-lexical-facts.json" with { type: "json" };
import observationData from "../src/data/gen/battle-script-opcode-observations.json" with { type: "json" };
import {
  createBattleScriptControlHandlers,
  createBattleScriptMachine,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";
import {
  createBattleScriptMoveValuesCommandHandlers,
  type BattleScriptMoveValuesRulesContext,
} from "../src/engine/battleScriptMoveValuesCommands.ts";
import {
  createBattleScriptRuleCommandHandlers,
  type BattleScriptMultiHitRulesContext,
} from "../src/engine/battleScriptRuleCommands.ts";
import {
  createBattleScriptSourceCommandHandlers,
} from "../src/engine/battleScriptSourceCommands.ts";
import {
  loadBattleScriptProgram,
  type BattleScriptInstruction,
  type BattleScriptProgram,
} from "../src/engine/battleScriptProgram.ts";

type CommandHandlerCatalog = {
  slots: Array<{
    index: number;
    opcode: string;
    enum: { file: string; line: number; raw: string };
    table: {
      rowIndex: number;
      line: number;
      handlerExpression: string;
    };
    handler: {
      symbol: string;
      definition: { startLine: number; endLine: number };
    };
  }>;
};

type LexicalFactCatalog = {
  handlers: Array<{
    slot: { index: number; opcode: string };
    symbol: string;
    source: {
      file: string;
      fileSha256: string;
      startLine: number;
      endLine: number;
    };
    rawLines: Array<{ line: number; raw: string }>;
    instructionPointerFacts: {
      reads: Array<unknown>;
      advanceExpressions: Array<{
        line: number;
        operation: string;
        statementRaw: string;
      }>;
    };
    directlyCalledSymbolCandidates: Array<{
      line: number;
      symbol: string;
      rawArguments: string;
    }>;
  }>;
};

type ObservationCatalog = {
  instructionStarts: Array<{
    index: number;
    opcode: { id: number; name: string };
    sourceInvocation: {
      label: string;
      line: number;
      mnemonic: string;
      actualOperands: string[];
      macro: { declarationLine: number; parameterBindings: unknown[] };
    };
    opcodeEmission: {
      directive: string;
      expressions: string[];
      macroEmission: {
        macro: string;
        line: number;
        wrapperPath: string[];
      };
    };
    operandWidths: number[];
  }>;
};

type FixtureRules = BattleScriptMoveValuesRulesContext & Readonly<{
  marker: "move-values";
  party: readonly Readonly<{ species: string; hp: number }>[];
  unrelatedFlags: number;
}>;

type CombinedRules = FixtureRules & BattleScriptMultiHitRulesContext;

const commandHandlers = commandHandlerData as CommandHandlerCatalog;
const lexicalFacts = lexicalFactData as LexicalFactCatalog;
const observations = observationData as ObservationCatalog;
const program = loadBattleScriptProgram();

function rules(
  overrides: Partial<BattleScriptMoveValuesRulesContext> = {},
): FixtureRules {
  return Object.freeze({
    moveResultFlags: 0xf3,
    dmgMultiplier: 7,
    critMultiplier: 9,
    moveEffectByte: 0xe1,
    missType: 5,
    hitMarker: 0xffffffff,
    marker: "move-values",
    party: Object.freeze([
      Object.freeze({ species: "ONIX", hp: 91 }),
      Object.freeze({ species: "MAGBY", hp: 104 }),
    ]),
    unrelatedFlags: 0xa5a55a5a,
    ...overrides,
  });
}

function occurrences(): readonly BattleScriptInstruction[] {
  return program.instructions.filter(
    (instruction) => instruction.opcodeName === "B_SCR_OP_MOVEVALUESCLEANUP",
  );
}

function stateAt(
  target: BattleScriptInstruction,
  initialRules = rules(),
): BattleScriptMachineState<FixtureRules> {
  const initial = createBattleScriptMachine(
    program,
    target.source.label,
    initialRules,
    0x12345678,
  );
  return Object.freeze({ ...initial, programCounter: target.programCounter });
}

function programWithInstruction(
  target: BattleScriptInstruction,
  replacement: BattleScriptInstruction,
): BattleScriptProgram {
  return Object.freeze({
    ...program,
    instructions: Object.freeze(program.instructions.map((instruction) =>
      instruction.programCounter === target.programCounter
        ? replacement
        : instruction
    )),
  });
}

describe("source-mapped Battle Script MOVEVALUESCLEANUP rule command", () => {
  it("pins opcode/table, Cmd handler, MoveValuesCleanUp helper call, and one-byte macro provenance", () => {
    const slot = commandHandlers.slots.find(
      (candidate) => candidate.opcode === "B_SCR_OP_MOVEVALUESCLEANUP",
    );
    expect(slot).toMatchObject({
      index: 37,
      opcode: "B_SCR_OP_MOVEVALUESCLEANUP",
      enum: {
        file: "include/constants/battle_script_commands.h",
        line: 43,
        raw: "    B_SCR_OP_MOVEVALUESCLEANUP,",
      },
      table: {
        rowIndex: 37,
        line: 368,
        handlerExpression: "Cmd_movevaluescleanup",
      },
      handler: {
        symbol: "Cmd_movevaluescleanup",
        definition: { startLine: 3632, endLine: 3636 },
      },
    });

    const facts = lexicalFacts.handlers.find(
      (candidate) => candidate.slot.opcode === "B_SCR_OP_MOVEVALUESCLEANUP",
    )!;
    expect(facts.source).toMatchObject({
      file: "src/battle_script_commands.c",
      fileSha256: "e0847cd2aa83ee5e18134c32baad348b7c763095cf59efa33da67c4a4e90120c",
      startLine: 3632,
      endLine: 3636,
    });
    expect(facts.rawLines).toEqual([
      { line: 3632, raw: "static void Cmd_movevaluescleanup(void)" },
      { line: 3633, raw: "{" },
      { line: 3634, raw: "    MoveValuesCleanUp();" },
      { line: 3635, raw: "    gBattlescriptCurrInstr += 1;" },
      { line: 3636, raw: "}" },
    ]);
    expect(facts.directlyCalledSymbolCandidates).toMatchObject([
      {
        line: 3632,
        symbol: "Cmd_movevaluescleanup",
        rawArguments: "void",
      },
      {
        line: 3634,
        symbol: "MoveValuesCleanUp",
        rawArguments: "",
      },
    ]);
    expect(facts.instructionPointerFacts.reads).toEqual([]);
    expect(facts.instructionPointerFacts.advanceExpressions).toMatchObject([
      {
        line: 3635,
        operation: "compoundAssignment",
        statementRaw: "gBattlescriptCurrInstr += 1;",
      },
    ]);

    for (const instruction of occurrences()) {
      expect(instruction).toMatchObject({
        opcodeId: 37,
        opcodeName: "B_SCR_OP_MOVEVALUESCLEANUP",
        dispatcher: "Cmd_movevaluescleanup",
        operands: [],
        source: {
          invocationMnemonic: "movevaluescleanup",
          invocationMacroLine: 198,
          sourceMacro: "movevaluescleanup",
          sourceMacroLine: 199,
          wrapperPath: ["movevaluescleanup"],
        },
      });
    }
  });

  it("pins all six real zero-operand generated instruction starts", () => {
    expect(observations.instructionStarts
      .filter((start) => start.opcode.id === 37)
      .map((start) => ({
        index: start.index,
        label: start.sourceInvocation.label,
        line: start.sourceInvocation.line,
        mnemonic: start.sourceInvocation.mnemonic,
        actualOperands: start.sourceInvocation.actualOperands,
        declarationLine: start.sourceInvocation.macro.declarationLine,
        parameterBindings: start.sourceInvocation.macro.parameterBindings,
        directive: start.opcodeEmission.directive,
        expressions: start.opcodeEmission.expressions,
        emissionLine: start.opcodeEmission.macroEmission.line,
        wrapperPath: start.opcodeEmission.macroEmission.wrapperPath,
        operandWidths: start.operandWidths,
      }))).toEqual([
      {
        index: 116,
        label: "BattleScript_ExplosionLoop",
        line: 389,
        mnemonic: "movevaluescleanup",
        actualOperands: [],
        declarationLine: 198,
        parameterBindings: [],
        directive: ".byte",
        expressions: ["B_SCR_OP_MOVEVALUESCLEANUP"],
        emissionLine: 199,
        wrapperPath: ["movevaluescleanup"],
        operandWidths: [],
      },
      {
        index: 292,
        label: "BattleScript_DoMultiHit",
        line: 618,
        mnemonic: "movevaluescleanup",
        actualOperands: [],
        declarationLine: 198,
        parameterBindings: [],
        directive: ".byte",
        expressions: ["B_SCR_OP_MOVEVALUESCLEANUP"],
        emissionLine: 199,
        wrapperPath: ["movevaluescleanup"],
        operandWidths: [],
      },
      {
        index: 911,
        label: "BattleScript_DoTripleKickAttack",
        line: 1398,
        mnemonic: "movevaluescleanup",
        actualOperands: [],
        declarationLine: 198,
        parameterBindings: [],
        directive: ".byte",
        expressions: ["B_SCR_OP_MOVEVALUESCLEANUP"],
        emissionLine: 199,
        wrapperPath: ["movevaluescleanup"],
        operandWidths: [],
      },
      {
        index: 1262,
        label: "BattleScript_HitsAllWithUndergroundBonusLoop",
        line: 1840,
        mnemonic: "movevaluescleanup",
        actualOperands: [],
        declarationLine: 198,
        parameterBindings: [],
        directive: ".byte",
        expressions: ["B_SCR_OP_MOVEVALUESCLEANUP"],
        emissionLine: 199,
        wrapperPath: ["movevaluescleanup"],
        operandWidths: [],
      },
      {
        index: 1352,
        label: "BattleScript_BeatUpLoop",
        line: 1948,
        mnemonic: "movevaluescleanup",
        actualOperands: [],
        declarationLine: 198,
        parameterBindings: [],
        directive: ".byte",
        expressions: ["B_SCR_OP_MOVEVALUESCLEANUP"],
        emissionLine: 199,
        wrapperPath: ["movevaluescleanup"],
        operandWidths: [],
      },
      {
        index: 1843,
        label: "BattleScript_TeeterDanceLoop",
        line: 2577,
        mnemonic: "movevaluescleanup",
        actualOperands: [],
        declarationLine: 198,
        parameterBindings: [],
        directive: ".byte",
        expressions: ["B_SCR_OP_MOVEVALUESCLEANUP"],
        emissionLine: 199,
        wrapperPath: ["movevaluescleanup"],
        operandWidths: [],
      },
    ]);
    expect(occurrences().map((instruction) => instruction.programCounter)).toEqual([
      116, 292, 911, 1262, 1352, 1843,
    ]);
  });

  it("resets the five move values, clears exactly bits 6 and 14, and advances once", () => {
    for (const target of occurrences()) {
      const initial = stateAt(target);
      const result = stepBattleScriptMachine(
        program,
        initial,
        createBattleScriptMoveValuesCommandHandlers(program),
      );

      expect(result.kind).toBe("advanced");
      expect(result.state.programCounter).toBe(target.programCounter + 1);
      expect(result.state.instructionsExecuted).toBe(1);
      expect(result.state.rulesContext).toMatchObject({
        moveResultFlags: 0,
        dmgMultiplier: 1,
        critMultiplier: 1,
        moveEffectByte: 0,
        missType: 0,
        hitMarker: 0xffffbfbf,
      });
      for (let bit = 0; bit < 32; bit += 1) {
        const isSet = (
          result.state.rulesContext.hitMarker & (2 ** bit)
        ) !== 0;
        expect(isSet, `hit-marker bit ${bit}`).toBe(bit !== 6 && bit !== 14);
      }
    }
  });

  it("deeply preserves unrelated rules and all scheduler/RNG/event identities", () => {
    const target = occurrences()[0]!;
    const initialRules = rules();
    const initial = stateAt(target, initialRules);
    const result = stepBattleScriptMachine(
      program,
      initial,
      createBattleScriptMoveValuesCommandHandlers(program),
    );

    expect(result.state.rulesContext).not.toBe(initialRules);
    expect(Object.isFrozen(result.state.rulesContext)).toBe(true);
    expect(result.state.rulesContext.marker).toBe(initialRules.marker);
    expect(result.state.rulesContext.unrelatedFlags).toBe(initialRules.unrelatedFlags);
    expect(result.state.rulesContext.party).toBe(initialRules.party);
    expect(result.state.rulesContext.party[0]).toBe(initialRules.party[0]);
    expect(initial.rulesContext).toBe(initialRules);
    expect(initialRules).toEqual(rules());
    expect(result.state.scheduler).toBe(initial.scheduler);
    expect(result.state.rng).toBe(initial.rng);
    expect(result.state.events).toBe(initial.events);
    expect(result.state.rng.calls).toBe(0);
    expect(result.state.events).toHaveLength(0);
  });

  it("is idempotent and deterministically replays without RNG or semantic events", () => {
    const target = occurrences()[2]!;
    const execute = (initialRules: FixtureRules) => stepBattleScriptMachine(
      program,
      stateAt(target, initialRules),
      createBattleScriptMoveValuesCommandHandlers(program),
    ).state;

    const first = execute(rules());
    const replay = execute(rules());
    const repeated = execute(first.rulesContext);
    expect(replay).toEqual(first);
    expect(repeated.rulesContext).toEqual(first.rulesContext);
    expect(repeated.rng).toEqual(first.rng);
    expect(repeated.rng.calls).toBe(0);
    expect(repeated.events).toEqual([]);
  });

  it("structured-halts an impossible operand-bearing instruction without side effects", () => {
    const target = occurrences()[0]!;
    const borrowedOperand = program.instructions.find(
      (instruction) => instruction.operands.length > 0,
    )!.operands[0]!;
    const malformed = Object.freeze({
      ...target,
      operands: Object.freeze([borrowedOperand]),
    });
    const malformedProgram = programWithInstruction(target, malformed);
    const initial = stateAt(target);
    const result = stepBattleScriptMachine(
      malformedProgram,
      initial,
      createBattleScriptMoveValuesCommandHandlers(program),
    );

    expect(result.kind).toBe("halted");
    expect(result.state.haltReason).toEqual({
      kind: "invalid-source-operand",
      programCounter: target.programCounter,
      opcodeId: 37,
      opcodeName: "B_SCR_OP_MOVEVALUESCLEANUP",
      operandExpression: borrowedOperand.expression,
      expected: "none",
      received: "1 operands",
    });
    expect(result.state.rulesContext).toBe(initial.rulesContext);
    expect(result.state.scheduler).toBe(initial.scheduler);
    expect(result.state.rng).toBe(initial.rng);
    expect(result.state.events).toBe(initial.events);
  });

  it("composes the existing twenty supported IDs with opcode 37 to exactly twenty-one", () => {
    const combinedRules: CombinedRules = Object.freeze({
      ...rules(),
      multiHitCounter: 3,
    });
    const sourceHandlers = createBattleScriptSourceCommandHandlers<CombinedRules>(
      program,
      Object.freeze({
        isControllerIdle: () => true,
        prepareMessage: (_context, operand) => Object.freeze({
          kind: "message" as const,
          messageId: operand.expression,
          substitutions: Object.freeze([]),
        }),
        prepareSelectionMessage: () => null,
        prepareSelectionMessageFromTable: () => null,
        resolveAttackerBattler: () => null,
        resolveBattlerForBattleScript: () => null,
        resolveHalfwordOperand: () => 1,
      }),
    );
    const composed = Object.freeze({
      ...createBattleScriptControlHandlers<CombinedRules>(program),
      ...sourceHandlers,
      ...createBattleScriptRuleCommandHandlers<CombinedRules>(
        program,
        () => combinedRules.multiHitCounter,
      ),
      ...createBattleScriptMoveValuesCommandHandlers<CombinedRules>(program),
    });

    expect(Object.keys(composed).map(Number).sort((left, right) => left - right)).toEqual([
      16, 17, 18, 20, 37, 38, 39, 40, 57, 58, 60, 61, 62, 65, 84, 85, 86, 98, 111, 131, 141,
    ]);
  });
});
