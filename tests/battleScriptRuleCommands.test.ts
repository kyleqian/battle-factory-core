import { describe, expect, it, vi } from "vitest";
import commandHandlerData from "../src/data/gen/battle-script-command-handlers.json" with { type: "json" };
import lexicalFactData from "../src/data/gen/battle-script-handler-lexical-facts.json" with { type: "json" };
import {
  createBattleScriptControlHandlers,
  createBattleScriptMachine,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
  type BattleScriptOpcodeHandlers,
} from "../src/engine/battleScriptMachine.ts";
import {
  createBattleScriptRuleCommandHandlers,
  type BattleScriptByteResolverPort,
} from "../src/engine/battleScriptRuleCommands.ts";
import {
  createBattleScriptSourceCommandHandlers,
} from "../src/engine/battleScriptSourceCommands.ts";
import {
  loadBattleScriptProgram,
  resolveBattleScriptLabel,
  type BattleScriptInstruction,
} from "../src/engine/battleScriptProgram.ts";

type CommandHandlerCatalog = {
  slots: Array<{
    index: number;
    opcode: string;
    table: { rowIndex: number; line: number; handlerExpression: string };
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
    rawLines: Array<{ line: number; raw: string }>;
    instructionPointerFacts: {
      reads: Array<{ line: number; accessExpression: string; statementRaw: string }>;
      advanceExpressions: Array<{ line: number; operation: string; statementRaw: string }>;
    };
    globalOrConstantLikeReferences: Array<{ line: number; token: string }>;
  }>;
};

const commandHandlers = commandHandlerData as CommandHandlerCatalog;
const lexicalFacts = lexicalFactData as LexicalFactCatalog;
const program = loadBattleScriptProgram();

type FixtureRules = Readonly<{
  multiHitCounter: number;
  marker: "rule-command";
  party: readonly string[];
}>;

function rules(multiHitCounter = 9): FixtureRules {
  return Object.freeze({
    multiHitCounter,
    marker: "rule-command",
    party: Object.freeze(["ONIX", "MAGBY"]),
  });
}

function occurrences(): readonly BattleScriptInstruction[] {
  return program.instructions.filter(
    (instruction) => instruction.opcodeName === "B_SCR_OP_SETMULTIHIT",
  );
}

function decrementOccurrences(): readonly BattleScriptInstruction[] {
  return program.instructions.filter(
    (instruction) => instruction.opcodeName === "B_SCR_OP_DECREMENTMULTIHIT",
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

function handlers(
  resolveByteOperand: BattleScriptByteResolverPort<FixtureRules>,
): BattleScriptOpcodeHandlers<FixtureRules> {
  return createBattleScriptRuleCommandHandlers(program, resolveByteOperand);
}

function literalResolver(
  _context: Parameters<BattleScriptByteResolverPort<FixtureRules>>[0],
  operand: Parameters<BattleScriptByteResolverPort<FixtureRules>>[1],
): number | null {
  const known: Readonly<Record<string, number>> = Object.freeze({ "1": 1, "2": 2, "3": 3 });
  return known[operand.expression] ?? null;
}

describe("source-mapped Battle Script SETMULTIHIT rule command", () => {
  it("pins opcode 38, Cmd_setmultihit, its exact body, and macro provenance", () => {
    const slot = commandHandlers.slots.find(
      (candidate) => candidate.opcode === "B_SCR_OP_SETMULTIHIT",
    );
    expect(slot).toMatchObject({
      index: 38,
      opcode: "B_SCR_OP_SETMULTIHIT",
      table: { rowIndex: 38, line: 369, handlerExpression: "Cmd_setmultihit" },
      handler: {
        symbol: "Cmd_setmultihit",
        definition: { startLine: 3638, endLine: 3642 },
      },
    });

    const facts = lexicalFacts.handlers.find(
      (candidate) => candidate.slot.opcode === "B_SCR_OP_SETMULTIHIT",
    )!;
    expect(facts.rawLines).toEqual([
      { line: 3638, raw: "static void Cmd_setmultihit(void)" },
      { line: 3639, raw: "{" },
      { line: 3640, raw: "    gMultiHitCounter = gBattlescriptCurrInstr[1];" },
      { line: 3641, raw: "    gBattlescriptCurrInstr += 2;" },
      { line: 3642, raw: "}" },
    ]);
    expect(facts.instructionPointerFacts.reads).toMatchObject([
      {
        line: 3640,
        accessExpression: "gBattlescriptCurrInstr[1]",
        statementRaw: "gMultiHitCounter = gBattlescriptCurrInstr[1];",
      },
    ]);
    expect(facts.instructionPointerFacts.advanceExpressions).toMatchObject([
      {
        line: 3641,
        operation: "compoundAssignment",
        statementRaw: "gBattlescriptCurrInstr += 2;",
      },
    ]);
    expect(facts.globalOrConstantLikeReferences.map((entry) => entry.token)).toEqual([
      "gMultiHitCounter",
      "gBattlescriptCurrInstr",
      "gBattlescriptCurrInstr",
    ]);

    for (const instruction of occurrences()) {
      expect(instruction).toMatchObject({
        opcodeId: 38,
        dispatcher: "Cmd_setmultihit",
        operands: [{
          widthBytes: 1,
          sourceMacro: "setmultihit",
          sourceMacroLine: 204,
          wrapperPath: ["setmultihit"],
        }],
        source: {
          invocationMnemonic: "setmultihit",
          invocationMacroLine: 202,
          sourceMacro: "setmultihit",
          sourceMacroLine: 203,
          wrapperPath: ["setmultihit"],
        },
      });
    }
  });

  it("pins all and only three source-real invocations with values 3, 1, and 2", () => {
    expect(occurrences().map((instruction) => ({
      programCounter: instruction.programCounter,
      label: instruction.source.label,
      statementLine: instruction.source.statementLine,
      expression: instruction.operands[0]!.expression,
    }))).toEqual([
      {
        programCounter: 905,
        label: "BattleScript_EffectTripleKick",
        statementLine: 1390,
        expression: "3",
      },
      {
        programCounter: 2238,
        label: "BattleScript_ActionSwitch",
        statementLine: 3093,
        expression: "1",
      },
      {
        programCounter: 2240,
        label: "BattleScript_PursuitSwitchDmgSetMultihit",
        statementLine: 3096,
        expression: "2",
      },
    ]);

    for (const target of occurrences()) {
      const initial = stateAt(target);
      const result = stepBattleScriptMachine(program, initial, handlers(literalResolver));
      expect(result.kind).toBe("advanced");
      expect(result.state.rulesContext.multiHitCounter).toBe(
        Number(target.operands[0]!.expression),
      );
    }
  });

  it.each([0, 255])("accepts the u8 boundary %i without parsing the expression", (value) => {
    const target = occurrences()[0]!;
    const resolver = vi.fn<BattleScriptByteResolverPort<FixtureRules>>(() => value);
    const initial = stateAt(target);
    const result = stepBattleScriptMachine(program, initial, handlers(resolver));

    expect(result.kind).toBe("advanced");
    expect(resolver).toHaveBeenCalledOnce();
    expect(resolver.mock.calls[0]![1]).toBe(target.operands[0]);
    expect(result.state.rulesContext).toEqual({ ...initial.rulesContext, multiHitCounter: value });
    expect(Object.isFrozen(result.state.rulesContext)).toBe(true);
  });

  it("updates only frozen rules state and preserves scheduler, RNG, events, and nested input", () => {
    const target = occurrences()[0]!;
    const initialRules = rules(77);
    const initial = stateAt(target, initialRules);
    const result = stepBattleScriptMachine(program, initial, handlers(() => 3));

    expect(result.kind).toBe("advanced");
    expect(result.state.programCounter).toBe(initial.programCounter + 1);
    expect(result.state.instructionsExecuted).toBe(1);
    expect(result.state.rulesContext).not.toBe(initial.rulesContext);
    expect(result.state.rulesContext.party).toBe(initial.rulesContext.party);
    expect(result.state.rulesContext).toEqual({ ...initialRules, multiHitCounter: 3 });
    expect(initial.rulesContext).toBe(initialRules);
    expect(initial.rulesContext.multiHitCounter).toBe(77);
    expect(result.state.scheduler).toBe(initial.scheduler);
    expect(result.state.rng).toBe(initial.rng);
    expect(result.state.events).toBe(initial.events);
    expect(result.state.rng.calls).toBe(0);
    expect(result.state.events).toHaveLength(0);
  });

  it("identity-blocks with a resolve-byte reason when source context is unavailable", () => {
    const target = occurrences()[1]!;
    const initial = stateAt(target);
    const result = stepBattleScriptMachine(program, initial, handlers(() => null));

    expect(result.kind).toBe("blocked");
    expect(result.state).toBe(initial);
    if (result.kind !== "blocked") throw new Error("expected blocked result");
    expect(result.reason).toEqual({
      kind: "source-context-unavailable",
      programCounter: target.programCounter,
      opcodeId: 38,
      opcodeName: "B_SCR_OP_SETMULTIHIT",
      port: "resolve-byte",
      operandExpression: "1",
    });
    expect(result.state.rulesContext).toBe(initial.rulesContext);
    expect(result.state.scheduler).toBe(initial.scheduler);
    expect(result.state.rng).toBe(initial.rng);
    expect(result.state.events).toBe(initial.events);
  });

  it.each([
    [256, "256"],
    [-1, "-1"],
    [1.5, "1.5"],
    [Number.NaN, "NaN"],
  ])("structured-halts a non-u8 resolved value %s", (value, received) => {
    const target = occurrences()[2]!;
    const initial = stateAt(target);
    const result = stepBattleScriptMachine(program, initial, handlers(() => value));

    expect(result.kind).toBe("halted");
    expect(result.state.haltReason).toEqual({
      kind: "invalid-source-operand",
      programCounter: target.programCounter,
      opcodeId: 38,
      opcodeName: "B_SCR_OP_SETMULTIHIT",
      operandExpression: "2",
      expected: "u8",
      received,
    });
    expect(result.state.rulesContext).toBe(initial.rulesContext);
    expect(result.state.scheduler).toBe(initial.scheduler);
    expect(result.state.rng).toBe(initial.rng);
    expect(result.state.events).toBe(initial.events);
  });

  it("structured-halts malformed operands before calling the source port", () => {
    const target = occurrences()[0]!;
    const resolver = vi.fn<BattleScriptByteResolverPort<FixtureRules>>(() => 3);
    const ruleHandlers = handlers(resolver);
    const malformed = [
      Object.freeze({ ...target, operands: Object.freeze([]) }),
      Object.freeze({
        ...target,
        operands: Object.freeze([
          Object.freeze({ ...target.operands[0]!, widthBytes: 2 as const }),
        ]),
      }),
      Object.freeze({
        ...target,
        operands: Object.freeze([target.operands[0]!, target.operands[0]!]),
      }),
    ];

    expect(malformed.map((instruction) =>
      ruleHandlers[38]!(Object.freeze({
        program,
        instruction,
        state: stateAt(target),
      })).control
    )).toEqual([
      {
        kind: "halt",
        reason: expect.objectContaining({
          kind: "invalid-source-operand",
          expected: "u8",
          operandExpression: "<missing>",
          received: "0 operands; width <missing>",
        }),
      },
      {
        kind: "halt",
        reason: expect.objectContaining({
          kind: "invalid-source-operand",
          expected: "u8",
          operandExpression: "3",
          received: "1 operands; width 2",
        }),
      },
      {
        kind: "halt",
        reason: expect.objectContaining({
          kind: "invalid-source-operand",
          expected: "u8",
          operandExpression: "3",
          received: "2 operands; width 1",
        }),
      },
    ]);
    expect(resolver).not.toHaveBeenCalled();
  });

  it("does not silently parse an arbitrary source expression", () => {
    const target = occurrences()[0]!;
    const arbitraryOperand = Object.freeze({
      ...target.operands[0]!,
      expression: "MULTI_HIT_COUNT + 1",
    });
    const arbitraryInstruction = Object.freeze({
      ...target,
      operands: Object.freeze([arbitraryOperand]),
    });
    const initial = stateAt(target);
    const resolver = vi.fn<BattleScriptByteResolverPort<FixtureRules>>(
      (_context, operand) => operand.expression === "3" ? 3 : null,
    );
    const transition = handlers(resolver)[38]!(Object.freeze({
      program,
      instruction: arbitraryInstruction,
      state: initial,
    }));

    expect(resolver).toHaveBeenCalledWith(expect.anything(), arbitraryOperand);
    expect(transition.control).toEqual({
      kind: "block",
      reason: {
        kind: "source-context-unavailable",
        programCounter: target.programCounter,
        opcodeId: 38,
        opcodeName: "B_SCR_OP_SETMULTIHIT",
        port: "resolve-byte",
        operandExpression: "MULTI_HIT_COUNT + 1",
      },
    });
    expect(transition.rulesContext).toBe(initial.rulesContext);
  });

  it("replays deterministically and composes to exactly twelve supported IDs in tests", () => {
    const target = occurrences()[0]!;
    const execute = () => stepBattleScriptMachine(
      program,
      stateAt(target),
      handlers(literalResolver),
    ).state;
    expect(execute()).toEqual(execute());

    const sourceHandlers = createBattleScriptSourceCommandHandlers<FixtureRules>(
      program,
      Object.freeze({
        isControllerIdle: () => true,
        prepareMessage: (_context, operand) => Object.freeze({
          kind: "message" as const,
          messageId: operand.expression,
          substitutions: Object.freeze([]),
        }),
        resolveHalfwordOperand: () => 1,
      }),
    );
    const composed = Object.freeze({
      ...createBattleScriptControlHandlers<FixtureRules>(program),
      ...sourceHandlers,
      ...handlers(literalResolver),
    });
    expect(Object.keys(composed).map(Number).sort((left, right) => left - right)).toEqual([
      16, 18, 38, 39, 40, 57, 58, 60, 61, 62, 65, 131,
    ]);
  });
});

describe("source-mapped Battle Script DECREMENTMULTIHIT rule command", () => {
  it("pins opcode 39, Cmd_decrementmultihit, its exact body, and macro provenance", () => {
    const slot = commandHandlers.slots.find(
      (candidate) => candidate.opcode === "B_SCR_OP_DECREMENTMULTIHIT",
    );
    expect(slot).toMatchObject({
      index: 39,
      opcode: "B_SCR_OP_DECREMENTMULTIHIT",
      table: {
        rowIndex: 39,
        line: 370,
        handlerExpression: "Cmd_decrementmultihit",
      },
      handler: {
        symbol: "Cmd_decrementmultihit",
        definition: { startLine: 3644, endLine: 3650 },
      },
    });

    const facts = lexicalFacts.handlers.find(
      (candidate) => candidate.slot.opcode === "B_SCR_OP_DECREMENTMULTIHIT",
    )!;
    expect(facts.rawLines).toEqual([
      { line: 3644, raw: "static void Cmd_decrementmultihit(void)" },
      { line: 3645, raw: "{" },
      { line: 3646, raw: "    if (--gMultiHitCounter == 0)" },
      { line: 3647, raw: "        gBattlescriptCurrInstr += 5;" },
      { line: 3648, raw: "    else" },
      {
        line: 3649,
        raw: "        gBattlescriptCurrInstr = T2_READ_PTR(gBattlescriptCurrInstr + 1);",
      },
      { line: 3650, raw: "}" },
    ]);
    expect(facts.instructionPointerFacts.advanceExpressions).toMatchObject([
      {
        line: 3647,
        operation: "compoundAssignment",
        statementRaw: "if (--gMultiHitCounter == 0)\n        gBattlescriptCurrInstr += 5;",
      },
    ]);
    expect(facts.globalOrConstantLikeReferences.map((entry) => entry.token)).toEqual([
      "gMultiHitCounter",
      "gBattlescriptCurrInstr",
      "gBattlescriptCurrInstr",
      "T2_READ_PTR",
      "gBattlescriptCurrInstr",
    ]);

    for (const instruction of decrementOccurrences()) {
      expect(instruction).toMatchObject({
        opcodeId: 39,
        dispatcher: "Cmd_decrementmultihit",
        operands: [{
          widthBytes: 4,
          sourceMacro: "decrementmultihit",
          sourceMacroLine: 209,
          wrapperPath: ["decrementmultihit"],
        }],
        source: {
          invocationMnemonic: "decrementmultihit",
          invocationMacroLine: 207,
          sourceMacro: "decrementmultihit",
          sourceMacroLine: 208,
          wrapperPath: ["decrementmultihit"],
        },
      });
    }
  });

  it("pins all and only three real occurrences and their exact typed target labels", () => {
    expect(decrementOccurrences().map((instruction) => {
      const target = resolveBattleScriptLabel(program, instruction.operands[0]!.expression);
      return {
        programCounter: instruction.programCounter,
        label: instruction.source.label,
        statementLine: instruction.source.statementLine,
        targetLabel: instruction.operands[0]!.expression,
        targetProgramCounter: target?.programCounter,
      };
    })).toEqual([
      {
        programCounter: 314,
        label: "BattleScript_DoMultiHit",
        statementLine: 639,
        targetLabel: "BattleScript_MultiHitLoop",
        targetProgramCounter: 288,
      },
      {
        programCounter: 934,
        label: "BattleScript_DoTripleKickAttack",
        statementLine: 1420,
        targetLabel: "BattleScript_TripleKickLoop",
        targetProgramCounter: 906,
      },
      {
        programCounter: 2246,
        label: "BattleScript_DoSwitchOut",
        statementLine: 3104,
        targetLabel: "BattleScript_PursuitSwitchDmgLoop",
        targetProgramCounter: 2241,
      },
    ]);
  });

  it.each([
    [1, 0, "fallthrough"],
    [2, 1, "jump"],
    [3, 2, "jump"],
  ] as const)("pre-decrements count %i to %i and takes the exact source branch", (
    count,
    expectedCount,
    branch,
  ) => {
    for (const instruction of decrementOccurrences()) {
      const initial = stateAt(instruction, rules(count));
      const result = stepBattleScriptMachine(program, initial, handlers(literalResolver));

      expect(result.kind).toBe("advanced");
      expect(result.state.rulesContext.multiHitCounter).toBe(expectedCount);
      expect(result.state.programCounter).toBe(
        branch === "fallthrough"
          ? instruction.programCounter + 1
          : resolveBattleScriptLabel(program, instruction.operands[0]!.expression)!.programCounter,
      );
      expect(result.state.rulesContext).not.toBe(initial.rulesContext);
      expect(Object.isFrozen(result.state.rulesContext)).toBe(true);
    }
  });

  it("wraps zero to 255 and jumps without changing scheduler, RNG, or event identities", () => {
    const instruction = decrementOccurrences()[0]!;
    const initial = stateAt(instruction, rules(0));
    const result = stepBattleScriptMachine(program, initial, handlers(literalResolver));

    expect(result.kind).toBe("advanced");
    expect(result.state.rulesContext).toEqual({
      ...initial.rulesContext,
      multiHitCounter: 255,
    });
    expect(result.state.programCounter).toBe(
      resolveBattleScriptLabel(program, "BattleScript_MultiHitLoop")!.programCounter,
    );
    expect(result.state.scheduler).toBe(initial.scheduler);
    expect(result.state.rng).toBe(initial.rng);
    expect(result.state.events).toBe(initial.events);
    expect(result.state.rng.calls).toBe(0);
  });

  it("repeats the same deterministic decrement-and-branch behavior", () => {
    const instruction = decrementOccurrences()[1]!;
    const execute = (count: number) => {
      const initial = stateAt(instruction, rules(count));
      return handlers(literalResolver)[39]!(Object.freeze({
        program,
        instruction,
        state: initial,
      }));
    };

    const first = execute(3);
    const repeated = execute(first.rulesContext.multiHitCounter);
    expect(execute(3)).toEqual(first);
    expect(first.rulesContext.multiHitCounter).toBe(2);
    expect(repeated.rulesContext.multiHitCounter).toBe(1);
    expect(first.control).toEqual(repeated.control);
    expect(first.control).toEqual({
      kind: "jump",
      programCounter: resolveBattleScriptLabel(program, "BattleScript_TripleKickLoop")!
        .programCounter,
    });
  });

  it("fallthrough at one ignores the unused label operand exactly like the source condition", () => {
    const instruction = decrementOccurrences()[0]!;
    const malformed = Object.freeze({
      ...instruction,
      operands: Object.freeze([]),
    });
    const initial = stateAt(instruction, rules(1));
    const transition = handlers(literalResolver)[39]!(Object.freeze({
      program,
      instruction: malformed,
      state: initial,
    }));

    expect(transition.control).toEqual({ kind: "advance" });
    expect(transition.rulesContext).toEqual({ ...initial.rulesContext, multiHitCounter: 0 });
  });

  it.each([
    ["missing operand", Object.freeze([]), "<missing>"],
    [
      "wrong-width operand",
      Object.freeze([
        Object.freeze({ ...decrementOccurrences()[0]!.operands[0]!, widthBytes: 2 as const }),
      ]),
      "BattleScript_MultiHitLoop",
    ],
    [
      "extra operand",
      Object.freeze([
        decrementOccurrences()[0]!.operands[0]!,
        decrementOccurrences()[0]!.operands[0]!,
      ]),
      "BattleScript_MultiHitLoop",
    ],
    [
      "unknown target",
      Object.freeze([
        Object.freeze({
          ...decrementOccurrences()[0]!.operands[0]!,
          expression: "BattleScript_NotARealLabel",
        }),
      ]),
      "BattleScript_NotARealLabel",
    ],
  ] as const)("structured-halts a %s after preserving the source-first decrement", (
    _description,
    operands,
    expression,
  ) => {
    const instruction = decrementOccurrences()[0]!;
    const malformed = Object.freeze({ ...instruction, operands });
    const initial = stateAt(instruction, rules(2));
    const transition = handlers(literalResolver)[39]!(Object.freeze({
      program,
      instruction: malformed,
      state: initial,
    }));

    expect(transition.control).toEqual({
      kind: "halt",
      reason: {
        kind: "invalid-control-target",
        programCounter: instruction.programCounter,
        expression,
      },
    });
    expect(transition.rulesContext).not.toBe(initial.rulesContext);
    expect(transition.rulesContext.multiHitCounter).toBe(1);
    expect(Object.isFrozen(transition.rulesContext)).toBe(true);
    expect(transition.scheduler).toBe(initial.scheduler);
    expect(transition.rng).toBe(initial.rng);
    expect(transition.events).toEqual([]);
  });

  it("keeps the new frozen rules snapshot when an unknown target halts through the machine", () => {
    const instruction = decrementOccurrences()[2]!;
    const unknownTarget = Object.freeze({
      ...instruction,
      operands: Object.freeze([
        Object.freeze({
          ...instruction.operands[0]!,
          expression: "BattleScript_NotARealLabel",
        }),
      ]),
    });
    const initial = stateAt(instruction, rules(3));
    const transition = handlers(literalResolver)[39]!(Object.freeze({
      program,
      instruction: unknownTarget,
      state: initial,
    }));
    const result = stepBattleScriptMachine(
      Object.freeze({
        ...program,
        instructions: Object.freeze(program.instructions.map((candidate) =>
          candidate.programCounter === instruction.programCounter ? unknownTarget : candidate
        )),
      }),
      initial,
      Object.freeze({ 39: () => transition }),
    );

    expect(result.kind).toBe("halted");
    expect(result.state.haltReason).toEqual({
      kind: "invalid-control-target",
      programCounter: instruction.programCounter,
      expression: "BattleScript_NotARealLabel",
    });
    expect(result.state.rulesContext).toBe(transition.rulesContext);
    expect(result.state.rulesContext).not.toBe(initial.rulesContext);
    expect(result.state.rulesContext.multiHitCounter).toBe(2);
    expect(result.state.scheduler).toBe(initial.scheduler);
    expect(result.state.rng).toBe(initial.rng);
    expect(result.state.events).toBe(initial.events);
  });
});
