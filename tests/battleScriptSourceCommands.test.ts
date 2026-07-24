import { describe, expect, it } from "vitest";
import commandHandlerData from "../src/data/gen/battle-script-command-handlers.json" with { type: "json" };
import lexicalFactData from "../src/data/gen/battle-script-handler-lexical-facts.json" with { type: "json" };
import {
  createBattleScriptControlHandlers,
  createBattleScriptMachine,
  runBattleScriptMachine,
  stepBattleScriptMachine,
  transitionBattleScriptCommand,
  type BattleScriptMachineState,
  type BattleScriptOpcodeHandlers,
} from "../src/engine/battleScriptMachine.ts";
import {
  createBattleScriptSourceCommandHandlers,
  type BattleScriptMessagePreparationPort,
} from "../src/engine/battleScriptSourceCommands.ts";
import {
  loadBattleScriptProgram,
  type BattleScriptInstruction,
} from "../src/engine/battleScriptProgram.ts";

type CommandHandlerSlot = {
  index: number;
  opcode: string;
  table: { rowIndex: number; handlerExpression: string };
  handler: {
    symbol: string;
    definition: { startLine: number; endLine: number };
  };
};
type LexicalHandler = {
  slot: { index: number; opcode: string };
  symbol: string;
  rawLines: Array<{ line: number; raw: string }>;
  instructionPointerFacts: {
    reads: Array<{ line: number; statementRaw: string }>;
    advanceExpressions: Array<{ line: number; operation: string; statementRaw: string }>;
  };
  directlyCalledSymbolCandidates: Array<{ line: number; symbol: string; rawArguments: string }>;
  globalOrConstantLikeReferences: Array<{ line: number; token: string }>;
};

const commandHandlers = commandHandlerData as { slots: CommandHandlerSlot[] };
const lexicalFacts = lexicalFactData as { handlers: LexicalHandler[] };
const program = loadBattleScriptProgram();

type FixtureRules = Readonly<{
  attacker: string;
  marker: "source-command-neutral";
}>;

const rules: FixtureRules = Object.freeze({
  attacker: "ONIX",
  marker: "source-command-neutral",
});

function instruction(opcodeName: string, occurrence = 0): BattleScriptInstruction {
  const matches = program.instructions.filter((candidate) => candidate.opcodeName === opcodeName);
  const found = matches[occurrence];
  if (!found) throw new Error(`missing committed ${opcodeName} occurrence ${occurrence}`);
  return found;
}

function stateAt(
  target: BattleScriptInstruction,
): BattleScriptMachineState<FixtureRules> {
  const initial = createBattleScriptMachine(
    program,
    target.source.label,
    rules,
    0x12345678,
  );
  return Object.freeze({
    ...initial,
    programCounter: target.programCounter,
  });
}

function sourceHandlers(
  idle: boolean,
  prepareMessage: BattleScriptMessagePreparationPort<FixtureRules> = (
    context,
    operand,
  ) => Object.freeze({
    kind: "message" as const,
    messageId: operand.expression,
    substitutions: Object.freeze([context.state.rulesContext.attacker]),
  }),
) {
  return createBattleScriptSourceCommandHandlers(program, Object.freeze({
    isControllerIdle: () => idle,
    prepareMessage,
  }));
}

function composedHandlers(
  idle: boolean,
  prepareMessage?: BattleScriptMessagePreparationPort<FixtureRules>,
): BattleScriptOpcodeHandlers<FixtureRules> {
  return Object.freeze({
    ...createBattleScriptControlHandlers<FixtureRules>(program),
    ...sourceHandlers(idle, prepareMessage),
  });
}

describe("source-mapped Battle Script scheduler commands", () => {
  it("pins the exact catalog handlers, source bodies, macros, IDs, and committed operands", () => {
    expect(program.instructions).toHaveLength(3306);

    const expected = [
      ["B_SCR_OP_PRINTSTRING", 16, "Cmd_printstring", 2137, 2146],
      ["B_SCR_OP_WAITMESSAGE", 18, "Cmd_waitmessage", 2159, 2178],
      ["B_SCR_OP_PAUSE", 57, "Cmd_pause", 3914, 3925],
      ["B_SCR_OP_WAITSTATE", 58, "Cmd_waitstate", 3927, 3931],
      ["B_SCR_OP_NOP", 131, "Cmd_nop", 6796, 6799],
    ] as const;
    for (const [opcodeName, opcodeId, symbol, startLine, endLine] of expected) {
      const slot = commandHandlers.slots.find((candidate) => candidate.opcode === opcodeName)!;
      expect(slot).toMatchObject({
        index: opcodeId,
        opcode: opcodeName,
        table: { rowIndex: opcodeId, handlerExpression: symbol },
        handler: { symbol, definition: { startLine, endLine } },
      });
      const facts = lexicalFacts.handlers.find((candidate) => candidate.slot.opcode === opcodeName)!;
      expect(facts).toMatchObject({
        slot: { index: opcodeId, opcode: opcodeName },
        symbol,
      });
      expect(facts.rawLines[0]).toEqual({ line: startLine, raw: `static void ${symbol}(void)` });
      expect(facts.rawLines.at(-1)).toEqual({ line: endLine, raw: "}" });
    }

    const sourceBody = (symbol: string) =>
      lexicalFacts.handlers.find((candidate) => candidate.symbol === symbol)!.rawLines.map(
        (entry) => entry.raw,
      );
    expect(sourceBody("Cmd_nop")).toEqual([
      "static void Cmd_nop(void)",
      "{",
      "    gBattlescriptCurrInstr++;",
      "}",
    ]);
    expect(sourceBody("Cmd_waitstate")).toEqual([
      "static void Cmd_waitstate(void)",
      "{",
      "    if (gBattleControllerExecFlags == 0)",
      "        gBattlescriptCurrInstr++;",
      "}",
    ]);
    expect(sourceBody("Cmd_printstring")).toEqual([
      "static void Cmd_printstring(void)",
      "{",
      "    if (gBattleControllerExecFlags == 0)",
      "    {",
      "        u16 var = T2_READ_16(gBattlescriptCurrInstr + 1);",
      "        PrepareStringBattle(var, gBattlerAttacker);",
      "        gBattlescriptCurrInstr += 3;",
      "        gBattleCommunication[MSG_DISPLAY] = 1;",
      "    }",
      "}",
    ]);
    expect(sourceBody("Cmd_pause")).toContain("        if (++gPauseCounterBattle >= value)");
    expect(sourceBody("Cmd_waitmessage")).toContain("        if (!gBattleCommunication[MSG_DISPLAY])");
    expect(sourceBody("Cmd_waitmessage")).toContain("            if (++gPauseCounterBattle >= toWait)");

    const nop = instruction("B_SCR_OP_NOP");
    expect(nop).toMatchObject({
      programCounter: 1450,
      opcodeId: 131,
      dispatcher: "Cmd_nop",
      operands: [],
      source: {
        label: "BattleScript_UproarHit",
        statementLine: 2080,
        invocationMnemonic: "nop",
        invocationMacroLine: 721,
        sourceMacroLine: 722,
      },
    });

    const waitstate = instruction("B_SCR_OP_WAITSTATE");
    expect(waitstate).toMatchObject({
      programCounter: 16,
      opcodeId: 58,
      dispatcher: "Cmd_waitstate",
      operands: [],
      source: {
        label: "BattleScript_HitFromAtkAnimation",
        statementLine: 258,
        invocationMnemonic: "waitstate",
        invocationMacroLine: 331,
        sourceMacroLine: 332,
      },
    });

    const printstring = instruction("B_SCR_OP_PRINTSTRING");
    expect(printstring).toMatchObject({
      programCounter: 52,
      opcodeId: 16,
      dispatcher: "Cmd_printstring",
      operands: [{
        widthBytes: 2,
        expression: "STRINGID_PKMNALREADYASLEEP",
        sourceMacro: "printstring",
        sourceMacroLine: 72,
        wrapperPath: ["printstring"],
      }],
      source: {
        label: "BattleScript_AlreadyAsleep",
        statementLine: 303,
        invocationMnemonic: "printstring",
        invocationMacroLine: 70,
        sourceMacroLine: 71,
      },
    });

    const printFacts = lexicalFacts.handlers.find((candidate) => candidate.symbol === "Cmd_printstring")!;
    expect(printFacts.instructionPointerFacts.reads).toContainEqual(expect.objectContaining({
      line: 2141,
      statementRaw: "u16 var = T2_READ_16(gBattlescriptCurrInstr + 1);",
    }));
    expect(printFacts.instructionPointerFacts.advanceExpressions).toContainEqual(expect.objectContaining({
      line: 2143,
      operation: "compoundAssignment",
      statementRaw: "gBattlescriptCurrInstr += 3;",
    }));
    expect(printFacts.directlyCalledSymbolCandidates).toContainEqual(expect.objectContaining({
      line: 2142,
      symbol: "PrepareStringBattle",
      rawArguments: "var, gBattlerAttacker",
    }));
    expect(printFacts.globalOrConstantLikeReferences).toContainEqual(expect.objectContaining({
      line: 2139,
      token: "gBattleControllerExecFlags",
    }));
  });

  it("composes exactly NOP, WAITSTATE, and PRINTSTRING with the five existing controls", () => {
    expect(Object.keys(sourceHandlers(true)).map(Number).sort((left, right) => left - right)).toEqual([
      16,
      58,
      131,
    ]);
    expect(Object.keys(composedHandlers(true)).map(Number).sort((left, right) => left - right)).toEqual([
      16,
      40,
      58,
      60,
      61,
      62,
      65,
      131,
    ]);
    expect(composedHandlers(true)[18]).toBeUndefined();
    expect(composedHandlers(true)[57]).toBeUndefined();
  });

  it("advances NOP and ready WAITSTATE without touching rules, RNG, or events", () => {
    for (const target of [instruction("B_SCR_OP_NOP"), instruction("B_SCR_OP_WAITSTATE")]) {
      const initial = stateAt(target);
      const result = stepBattleScriptMachine(program, initial, composedHandlers(true));
      expect(result.kind).toBe("advanced");
      expect(result.state.programCounter).toBe(initial.programCounter + 1);
      expect(result.state.instructionsExecuted).toBe(1);
      expect(result.state.haltReason).toBeNull();
      expect(result.state.rulesContext).toBe(initial.rulesContext);
      expect(result.state.rng).toBe(initial.rng);
      expect(result.state.events).toBe(initial.events);
      expect(initial.instructionsExecuted).toBe(0);
    }
  });

  it("yields busy WAITSTATE and PRINTSTRING by state identity without consuming budget", () => {
    let preparationCalls = 0;
    const handlers = composedHandlers(false, () => {
      preparationCalls += 1;
      return Object.freeze({
        kind: "message",
        messageId: "SHOULD_NOT_BE_PREPARED",
        substitutions: Object.freeze([]),
      });
    });

    for (const target of [instruction("B_SCR_OP_WAITSTATE"), instruction("B_SCR_OP_PRINTSTRING")]) {
      const initial = stateAt(target);
      const step = stepBattleScriptMachine(program, initial, handlers);
      expect(step.kind).toBe("blocked");
      if (step.kind !== "blocked") throw new Error("expected blocked source command");
      expect(step.reason).toEqual({
        kind: "controller-busy",
        programCounter: target.programCounter,
        opcodeId: target.opcodeId,
        opcodeName: target.opcodeName,
      });
      expect(step.state).toBe(initial);
      expect(step.state).toMatchObject({
        programCounter: target.programCounter,
        instructionsExecuted: 0,
        haltReason: null,
      });
      expect(step.state.rulesContext).toBe(initial.rulesContext);
      expect(step.state.rng).toBe(initial.rng);
      expect(step.state.events).toBe(initial.events);

      for (const budget of [1, 7]) {
        const run = runBattleScriptMachine(program, initial, handlers, budget);
        expect(run.kind).toBe("blocked");
        expect(run.state).toBe(initial);
        expect(run.state.instructionsExecuted).toBe(0);
        expect(run.state.haltReason).toBeNull();
      }
    }
    expect(preparationCalls).toBe(0);
  });

  it("prepares PRINTSTRING from its exact halfword operand and emits one provenance-stamped event", () => {
    const target = instruction("B_SCR_OP_PRINTSTRING");
    const initial = stateAt(target);
    let receivedOperand: unknown;
    const handlers = composedHandlers(true, (context, operand) => {
      receivedOperand = operand;
      return Object.freeze({
        kind: "message",
        messageId: operand.expression,
        substitutions: Object.freeze([context.state.rulesContext.attacker]),
      });
    });

    const first = stepBattleScriptMachine(program, initial, handlers);
    const replay = stepBattleScriptMachine(program, stateAt(target), handlers);
    expect(first).toEqual(replay);
    expect(first.kind).toBe("advanced");
    expect(receivedOperand).toBe(target.operands[0]);
    expect(first.state.programCounter).toBe(target.programCounter + 1);
    expect(first.state.instructionsExecuted).toBe(1);
    expect(first.state.rulesContext).toBe(initial.rulesContext);
    expect(first.state.rng).toBe(initial.rng);
    expect(first.state.events).toHaveLength(1);
    expect(first.state.events[0]).toEqual({
      kind: "message",
      messageId: "STRINGID_PKMNALREADYASLEEP",
      substitutions: ["ONIX"],
      sequence: 1,
      provenance: {
        programCounter: 52,
        opcodeId: 16,
        opcodeName: "B_SCR_OP_PRINTSTRING",
        dispatcher: "Cmd_printstring",
        sourceLabel: "BattleScript_AlreadyAsleep",
        sourceStatementLine: 303,
        instructionExecution: 1,
      },
    });
    expect(Object.isFrozen(first.state.events[0])).toBe(true);
    expect(Object.isFrozen(first.state.events[0]!.provenance)).toBe(true);
  });

  it("yields PRINTSTRING when the injected source context cannot prepare its message", () => {
    const target = instruction("B_SCR_OP_PRINTSTRING");
    const initial = stateAt(target);
    const result = stepBattleScriptMachine(
      program,
      initial,
      composedHandlers(true, () => null),
    );
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") throw new Error("expected unavailable message to block");
    expect(result.reason).toEqual({
      kind: "source-context-unavailable",
      programCounter: 52,
      opcodeId: 16,
      opcodeName: "B_SCR_OP_PRINTSTRING",
      port: "prepare-message",
      operandExpression: "STRINGID_PKMNALREADYASLEEP",
    });
    expect(result.state).toBe(initial);
  });

  it("keeps WAITMESSAGE and PAUSE structured-unsupported with the composed family", () => {
    for (const opcodeName of ["B_SCR_OP_WAITMESSAGE", "B_SCR_OP_PAUSE"]) {
      const target = instruction(opcodeName);
      const initial = stateAt(target);
      const result = stepBattleScriptMachine(program, initial, composedHandlers(true));
      expect(result.kind).toBe("unsupported");
      expect(result.state.instructionsExecuted).toBe(0);
      expect(result.state.haltReason).toMatchObject({
        kind: "unsupported-opcode",
        opcodeId: target.opcodeId,
        opcodeName,
      });
      expect(result.state.rulesContext).toBe(initial.rulesContext);
      expect(result.state.rng).toBe(initial.rng);
      expect(result.state.events).toBe(initial.events);
    }
  });

  it("rejects any injected blocked transition that attempts a logical side effect", () => {
    const target = instruction("B_SCR_OP_WAITSTATE");
    const initial = stateAt(target);
    const malicious: BattleScriptOpcodeHandlers<FixtureRules> = Object.freeze({
      [target.opcodeId]: (context) => transitionBattleScriptCommand(
        context,
        Object.freeze({
          kind: "block",
          reason: Object.freeze({
            kind: "controller-busy",
            programCounter: target.programCounter,
            opcodeId: target.opcodeId,
            opcodeName: target.opcodeName,
          }),
        }),
        {
          rulesContext: Object.freeze({
            attacker: "MUTATED",
            marker: "source-command-neutral",
          }),
        },
      ),
    });
    expect(() => stepBattleScriptMachine(program, initial, malicious)).toThrow(
      /blocked Battle Script transition must preserve rules, RNG, and events/,
    );
    expect(initial.rulesContext).toBe(rules);
    expect(initial.instructionsExecuted).toBe(0);
  });
});
