import { describe, expect, it } from "vitest";
import commandHandlerData from "../src/data/gen/battle-script-command-handlers.json" with { type: "json" };
import lexicalFactData from "../src/data/gen/battle-script-handler-lexical-facts.json" with { type: "json" };
import {
  createBattleScriptControlHandlers,
  createBattleScriptMachine,
  createBattleScriptSchedulerState,
  runBattleScriptMachine,
  stepBattleScriptMachine,
  transitionBattleScriptCommand,
  type BattleScriptMachineState,
  type BattleScriptOpcodeHandlers,
} from "../src/engine/battleScriptMachine.ts";
import {
  createBattleScriptSourceCommandHandlers,
  type BattleScriptHalfwordResolverPort,
  type BattleScriptMessagePreparationPort,
  type BattleScriptSelectionMessagePreparationPort,
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

const selectionSnapshot = Object.freeze({
  currentMove: 89,
  originallyUsedMove: 89,
  lastItem: 1,
  lastAbility: 9,
  scriptingBattler: 0 as const,
  scriptPartyIndex: 2,
  battlerAbilities: Object.freeze([9, 22, 65, 0]) as readonly [number, number, number, number],
  textBuffers: Object.freeze([
    Object.freeze(["attacker"]),
    Object.freeze(["move"]),
    Object.freeze(["item"]),
  ]) as readonly [readonly string[], readonly string[], readonly string[]],
});

function instruction(opcodeName: string, occurrence = 0): BattleScriptInstruction {
  const matches = program.instructions.filter((candidate) => candidate.opcodeName === opcodeName);
  const found = matches[occurrence];
  if (!found) throw new Error(`missing committed ${opcodeName} occurrence ${occurrence}`);
  return found;
}

function stateAt(
  target: BattleScriptInstruction,
  scheduler: Readonly<{
    messageDisplayActive?: boolean;
    pauseCounterBattle?: number;
  }> = {},
): BattleScriptMachineState<FixtureRules> {
  const initial = createBattleScriptMachine(
    program,
    target.source.label,
    rules,
    0x12345678,
    createBattleScriptSchedulerState(scheduler),
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
  resolveHalfwordOperand: BattleScriptHalfwordResolverPort<FixtureRules> = () => 3,
  prepareSelectionMessage: BattleScriptSelectionMessagePreparationPort<FixtureRules> = (
    _context,
    operand,
  ) => Object.freeze({
    attacker: 0,
    stringId: operand.expression.length,
    snapshot: selectionSnapshot,
  }),
) {
  return createBattleScriptSourceCommandHandlers(program, Object.freeze({
    isControllerIdle: () => idle,
    prepareMessage,
    prepareSelectionMessage,
    resolveHalfwordOperand,
  }));
}

function composedHandlers(
  idle: boolean,
  prepareMessage?: BattleScriptMessagePreparationPort<FixtureRules>,
  resolveHalfwordOperand?: BattleScriptHalfwordResolverPort<FixtureRules>,
  prepareSelectionMessage?: BattleScriptSelectionMessagePreparationPort<FixtureRules>,
): BattleScriptOpcodeHandlers<FixtureRules> {
  return Object.freeze({
    ...createBattleScriptControlHandlers<FixtureRules>(program),
    ...sourceHandlers(idle, prepareMessage, resolveHalfwordOperand, prepareSelectionMessage),
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

    const pause = instruction("B_SCR_OP_PAUSE");
    expect(pause).toMatchObject({
      programCounter: 31,
      opcodeId: 57,
      dispatcher: "Cmd_pause",
      operands: [{
        widthBytes: 2,
        expression: "B_WAIT_TIME_SHORT",
        sourceMacro: "pause",
        sourceMacroLine: 328,
        wrapperPath: ["pause"],
      }],
      source: {
        label: "BattleScript_MoveMissedPause",
        statementLine: 277,
        invocationMnemonic: "pause",
        invocationMacroLine: 326,
        sourceMacroLine: 327,
      },
    });

    const waitmessage = instruction("B_SCR_OP_WAITMESSAGE");
    expect(waitmessage).toMatchObject({
      programCounter: 20,
      opcodeId: 18,
      dispatcher: "Cmd_waitmessage",
      operands: [{
        widthBytes: 2,
        expression: "B_WAIT_TIME_LONG",
        sourceMacro: "waitmessage",
        sourceMacroLine: 82,
        wrapperPath: ["waitmessage"],
      }],
      source: {
        label: "BattleScript_HitFromAtkAnimation",
        statementLine: 262,
        invocationMnemonic: "waitmessage",
        invocationMacroLine: 80,
        sourceMacroLine: 81,
      },
    });

    const waitFacts = lexicalFacts.handlers.find((candidate) => candidate.symbol === "Cmd_waitmessage")!;
    expect(waitFacts.instructionPointerFacts.reads).toContainEqual(expect.objectContaining({
      line: 2169,
      statementRaw: "u16 toWait = T2_READ_16(gBattlescriptCurrInstr + 1);",
    }));
    expect(waitFacts.globalOrConstantLikeReferences).toEqual(expect.arrayContaining([
      expect.objectContaining({ line: 2163, token: "MSG_DISPLAY" }),
      expect.objectContaining({ line: 2170, token: "gPauseCounterBattle" }),
    ]));

    const pauseFacts = lexicalFacts.handlers.find((candidate) => candidate.symbol === "Cmd_pause")!;
    expect(pauseFacts.instructionPointerFacts.reads).toContainEqual(expect.objectContaining({
      line: 3918,
      statementRaw: "u16 value = T2_READ_16(gBattlescriptCurrInstr + 1);",
    }));
    expect(pauseFacts.globalOrConstantLikeReferences).toContainEqual(expect.objectContaining({
      line: 3919,
      token: "gPauseCounterBattle",
    }));
  });

  it("composes exactly the six scheduler commands with the five existing controls", () => {
    expect(Object.keys(sourceHandlers(true)).map(Number).sort((left, right) => left - right)).toEqual([
      16,
      17,
      18,
      57,
      58,
      131,
    ]);
    expect(Object.keys(composedHandlers(true)).map(Number).sort((left, right) => left - right)).toEqual([
      16,
      17,
      18,
      40,
      57,
      58,
      60,
      61,
      62,
      65,
      131,
    ]);
  });

  it("advances NOP and ready WAITSTATE without touching rules, RNG, or events", () => {
    for (const target of [instruction("B_SCR_OP_NOP"), instruction("B_SCR_OP_WAITSTATE")]) {
      const initial = stateAt(target);
      const result = stepBattleScriptMachine(program, initial, composedHandlers(true));
      expect(result.kind).toBe("advanced");
      expect(result.state.programCounter).toBe(initial.programCounter + 1);
      expect(result.state.instructionsExecuted).toBe(1);
      expect(result.state.haltReason).toBeNull();
      expect(result.state.scheduler).toBe(initial.scheduler);
      expect(result.state.rulesContext).toBe(initial.rulesContext);
      expect(result.state.rng).toBe(initial.rng);
      expect(result.state.events).toBe(initial.events);
      expect(initial.instructionsExecuted).toBe(0);
    }
  });

  it("identity-blocks every controller-gated command while busy without resolving source context", () => {
    let preparationCalls = 0;
    let resolverCalls = 0;
    const handlers = composedHandlers(
      false,
      () => {
        preparationCalls += 1;
        return Object.freeze({
          kind: "message",
          messageId: "SHOULD_NOT_BE_PREPARED",
          substitutions: Object.freeze([]),
        });
      },
      () => {
        resolverCalls += 1;
        return 3;
      },
    );

    for (const target of [
      instruction("B_SCR_OP_WAITSTATE"),
      instruction("B_SCR_OP_PRINTSTRING"),
      instruction("B_SCR_OP_WAITMESSAGE"),
      instruction("B_SCR_OP_PAUSE"),
    ]) {
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
      expect(step.state.scheduler).toBe(initial.scheduler);
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
    expect(resolverCalls).toBe(0);
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
    expect(first.state.scheduler).toMatchObject({
      messageDisplayActive: true,
      pauseCounterBattle: 0,
    });
    expect(Object.isFrozen(first.state.scheduler)).toBe(true);
    expect(initial.scheduler).toMatchObject({
      messageDisplayActive: false,
      pauseCounterBattle: 0,
    });
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

  it("runs the real PRINTSTRING-to-WAITMESSAGE lifecycle and preserves logical identities", () => {
    const print = instruction("B_SCR_OP_PRINTSTRING");
    const wait = instruction("B_SCR_OP_WAITMESSAGE", 3);
    expect(wait.programCounter).toBe(print.programCounter + 1);
    expect(wait.source).toMatchObject({
      label: "BattleScript_AlreadyAsleep",
      statementLine: 304,
    });
    const handlers = composedHandlers(true, undefined, () => 2);
    const initial = stateAt(print);

    const printed = stepBattleScriptMachine(program, initial, handlers);
    expect(printed.kind).toBe("advanced");
    expect(printed.state.programCounter).toBe(wait.programCounter);
    expect(printed.state.scheduler).toMatchObject({
      messageDisplayActive: true,
      pauseCounterBattle: 0,
    });

    const firstWait = stepBattleScriptMachine(program, printed.state, handlers);
    expect(firstWait.kind).toBe("scheduler-progressed");
    expect(firstWait.state.programCounter).toBe(wait.programCounter);
    expect(firstWait.state.instructionsExecuted).toBe(2);
    expect(firstWait.state.scheduler).toMatchObject({
      messageDisplayActive: true,
      pauseCounterBattle: 1,
    });
    expect(firstWait.state.rulesContext).toBe(printed.state.rulesContext);
    expect(firstWait.state.rng).toBe(printed.state.rng);
    expect(firstWait.state.events).toBe(printed.state.events);

    const completed = stepBattleScriptMachine(program, firstWait.state, handlers);
    expect(completed.kind).toBe("advanced");
    expect(completed.state.programCounter).toBe(wait.programCounter + 1);
    expect(completed.state.instructionsExecuted).toBe(3);
    expect(completed.state.scheduler).toMatchObject({
      messageDisplayActive: false,
      pauseCounterBattle: 0,
    });
    expect(completed.state.rulesContext).toBe(printed.state.rulesContext);
    expect(completed.state.rng).toBe(printed.state.rng);
    expect(completed.state.events).toBe(printed.state.events);
    expect(initial.scheduler).toMatchObject({
      messageDisplayActive: false,
      pauseCounterBattle: 0,
    });
  });

  it("advances idle WAITMESSAGE immediately when display is inactive without reading its operand", () => {
    const target = instruction("B_SCR_OP_WAITMESSAGE");
    const initial = stateAt(target, {
      messageDisplayActive: false,
      pauseCounterBattle: 7,
    });
    let resolverCalls = 0;
    const result = stepBattleScriptMachine(
      program,
      initial,
      composedHandlers(true, undefined, () => {
        resolverCalls += 1;
        return null;
      }),
    );
    expect(result.kind).toBe("advanced");
    expect(result.state.programCounter).toBe(target.programCounter + 1);
    expect(result.state.scheduler).toBe(initial.scheduler);
    expect(result.state.scheduler.pauseCounterBattle).toBe(7);
    expect(resolverCalls).toBe(0);
  });

  it("uses one shared u16 pause counter and resets it at both exact threshold boundaries", () => {
    const pause = instruction("B_SCR_OP_PAUSE");
    const wait = instruction("B_SCR_OP_WAITMESSAGE");
    const handlers = composedHandlers(true, undefined, (context, operand) => {
      expect(context.instruction.operands[0]).toBe(operand);
      return 3;
    });

    const pauseInitial = stateAt(pause, { pauseCounterBattle: 1 });
    const pauseBelow = stepBattleScriptMachine(program, pauseInitial, handlers);
    expect(pauseBelow.kind).toBe("scheduler-progressed");
    expect(pauseBelow.state.programCounter).toBe(pause.programCounter);
    expect(pauseBelow.state.scheduler).toMatchObject({
      messageDisplayActive: false,
      pauseCounterBattle: 2,
    });
    const pauseAt = stepBattleScriptMachine(program, pauseBelow.state, handlers);
    expect(pauseAt.kind).toBe("advanced");
    expect(pauseAt.state.scheduler).toMatchObject({
      messageDisplayActive: false,
      pauseCounterBattle: 0,
    });

    const waitInitial = stateAt(wait, {
      messageDisplayActive: true,
      pauseCounterBattle: 2,
    });
    const waitAt = stepBattleScriptMachine(program, waitInitial, handlers);
    expect(waitAt.kind).toBe("advanced");
    expect(waitAt.state.programCounter).toBe(wait.programCounter + 1);
    expect(waitAt.state.scheduler).toMatchObject({
      messageDisplayActive: false,
      pauseCounterBattle: 0,
    });
    expect(pauseInitial.scheduler.pauseCounterBattle).toBe(1);
    expect(waitInitial.scheduler).toMatchObject({
      messageDisplayActive: true,
      pauseCounterBattle: 2,
    });
  });

  it("wraps the source u16 pause counter before comparing the threshold", () => {
    const pause = instruction("B_SCR_OP_PAUSE");
    const initial = stateAt(pause, { pauseCounterBattle: 0xffff });
    const result = stepBattleScriptMachine(
      program,
      initial,
      composedHandlers(true, undefined, () => 1),
    );
    expect(result.kind).toBe("scheduler-progressed");
    expect(result.state.programCounter).toBe(pause.programCounter);
    expect(result.state.scheduler).toMatchObject({
      messageDisplayActive: false,
      pauseCounterBattle: 0,
    });
    expect(initial.scheduler.pauseCounterBattle).toBe(0xffff);
  });

  it("distinguishes valid zero, invalid values, and unavailable halfword source operands", () => {
    const pause = instruction("B_SCR_OP_PAUSE");
    const zeroInitial = stateAt(pause);
    const zero = stepBattleScriptMachine(
      program,
      zeroInitial,
      composedHandlers(true, undefined, () => 0),
    );
    expect(zero.kind).toBe("advanced");
    expect(zero.state.programCounter).toBe(pause.programCounter + 1);
    expect(zero.state.scheduler.pauseCounterBattle).toBe(0);

    for (const invalid of [-1, 0x10000, 1.5, Number.NaN]) {
      const initial = stateAt(pause);
      const result = stepBattleScriptMachine(
        program,
        initial,
        composedHandlers(true, undefined, () => invalid),
      );
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toEqual({
        kind: "invalid-source-operand",
        programCounter: pause.programCounter,
        opcodeId: 57,
        opcodeName: "B_SCR_OP_PAUSE",
        operandExpression: "B_WAIT_TIME_SHORT",
        expected: "u16",
        received: String(invalid),
      });
      expect(result.state.scheduler).toBe(initial.scheduler);
      expect(result.state.rulesContext).toBe(initial.rulesContext);
      expect(result.state.rng).toBe(initial.rng);
      expect(result.state.events).toBe(initial.events);
    }

    for (const target of [
      pause,
      instruction("B_SCR_OP_WAITMESSAGE"),
    ]) {
      const initial = stateAt(target, {
        messageDisplayActive: target.opcodeName === "B_SCR_OP_WAITMESSAGE",
      });
      const result = stepBattleScriptMachine(
        program,
        initial,
        composedHandlers(true, undefined, () => null),
      );
      expect(result.kind).toBe("blocked");
      if (result.kind !== "blocked") throw new Error("expected unavailable operand block");
      expect(result.state).toBe(initial);
      expect(result.reason).toEqual({
        kind: "source-context-unavailable",
        programCounter: target.programCounter,
        opcodeId: target.opcodeId,
        opcodeName: target.opcodeName,
        port: "resolve-halfword",
        operandExpression: target.operands[0]!.expression,
      });
    }
  });

  it("counts same-PC scheduler progress against the run budget without hidden effects", () => {
    const pause = instruction("B_SCR_OP_PAUSE");
    const initial = stateAt(pause);
    const result = runBattleScriptMachine(
      program,
      initial,
      composedHandlers(true, undefined, () => 10),
      4,
    );
    expect(result.kind).toBe("budget-exhausted");
    expect(result.state.programCounter).toBe(pause.programCounter);
    expect(result.state.instructionsExecuted).toBe(4);
    expect(result.state.haltReason).toEqual({
      kind: "instruction-budget",
      programCounter: pause.programCounter,
      budget: 4,
    });
    expect(result.state.scheduler).toMatchObject({
      messageDisplayActive: false,
      pauseCounterBattle: 4,
    });
    expect(Object.isFrozen(result.state)).toBe(true);
    expect(Object.isFrozen(result.state.scheduler)).toBe(true);
    expect(result.state.rulesContext).toBe(initial.rulesContext);
    expect(result.state.rng).toBe(initial.rng);
    expect(result.state.events).toBe(initial.events);
    expect(initial.scheduler.pauseCounterBattle).toBe(0);
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

  it("rejects same-PC scheduler progress that attempts rules, RNG, or event effects", () => {
    const target = instruction("B_SCR_OP_PAUSE");
    const initial = stateAt(target);
    const malicious: BattleScriptOpcodeHandlers<FixtureRules> = Object.freeze({
      [target.opcodeId]: (context) => transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "scheduler-progress" }),
        {
          scheduler: createBattleScriptSchedulerState({ pauseCounterBattle: 1 }),
          rulesContext: Object.freeze({
            attacker: "MUTATED",
            marker: "source-command-neutral",
          }),
        },
      ),
    });
    expect(() => stepBattleScriptMachine(program, initial, malicious)).toThrow(
      /scheduler-progress Battle Script transition may update only scheduler state/,
    );
    expect(initial.scheduler.pauseCounterBattle).toBe(0);
    expect(initial.rulesContext).toBe(rules);
    expect(initial.rng.calls).toBe(0);
    expect(initial.events).toEqual([]);
  });
});
