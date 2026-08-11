import { describe, expect, it } from "vitest";
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
  type BattleScriptSelectionMessageFromTablePreparationPort,
  type BattleScriptSelectionMessagePreparationPort,
} from "../src/engine/battleScriptSourceCommands.ts";
import {
  loadBattleScriptProgram,
  type BattleScriptInstruction,
} from "../src/engine/battleScriptProgram.ts";

const program = loadBattleScriptProgram();
const target = program.instructions[2230]!;
const directTarget = program.instructions[2232]!;
const rules = Object.freeze({
  marker: "table-selection-message-neutral",
  nested: Object.freeze(["rules"]),
  multiHitCounter: 2,
  multiHitStringCounter: 0,
  battlers: [],
  moveResultFlags: 0,
  moveEffectByte: 0,
  missType: 0,
  critMultiplier: 1,
  dmgMultiplier: 1,
  hitMarker: 0,
});
type FixtureRules = typeof rules;

const rawSnapshot = () => ({
  currentMove: 0,
  originallyUsedMove: 0,
  lastItem: 213,
  lastAbility: 23,
  scriptingBattler: 2 as const,
  scriptPartyIndex: 1,
  battlerAbilities: [9, 22, 65, 0] as [number, number, number, number],
  textBuffers: [
    ["B_BUFF_MON_NICK", "attacker"],
    ["B_BUFF_STRING", "escape"],
    ["B_BUFF_ITEM", "last"],
  ] as [string[], string[], string[]],
});

function stateAt(
  instruction: BattleScriptInstruction = target,
  scheduler = createBattleScriptSchedulerState(),
): BattleScriptMachineState<FixtureRules> {
  const initial = createBattleScriptMachine(
    program,
    instruction.source.label,
    rules,
    0x89abcdef,
    scheduler,
  );
  return Object.freeze({ ...initial, programCounter: instruction.programCounter });
}

function handlers(
  prepareSelectionMessageFromTable: BattleScriptSelectionMessageFromTablePreparationPort<FixtureRules>,
  onIdle: () => boolean = () => true,
  prepareSelectionMessage: BattleScriptSelectionMessagePreparationPort<FixtureRules> = () => null,
) {
  return createBattleScriptSourceCommandHandlers(program, Object.freeze({
    isControllerIdle: onIdle,
    prepareMessage: () => null,
    prepareStatusAnimation: () => null,
    prepareSelectionMessage,
    prepareSelectionMessageFromTable,
    resolveAttackerBattler: () => null,
    resolveBattlerAtPosition: () => null,
    resolveBattlerForBattleScript: () => null,
    resolveHalfwordOperand: () => null,
  }));
}

describe("source-exact B_SCR_OP_PRINTSELECTIONSTRINGFROMTABLE", () => {
  it("pins opcode, table, handler, macro, chooser body, and the sole four-byte source start", () => {
    const slots = (commandHandlerData as {
      slots: Array<{
        index: number;
        opcode: string;
        table: { rowIndex: number; handlerExpression: string };
        handler: { symbol: string; definition: { startLine: number; endLine: number } };
      }>;
    }).slots;
    expect(slots[20]).toMatchObject({
      index: 20,
      opcode: "B_SCR_OP_PRINTSELECTIONSTRINGFROMTABLE",
      table: {
        rowIndex: 20,
        handlerExpression: "Cmd_printselectionstringfromtable",
      },
      handler: {
        symbol: "Cmd_printselectionstringfromtable",
        definition: { startLine: 2194, endLine: 2208 },
      },
    });

    const facts = (lexicalFactData as {
      handlers: Array<{ symbol: string; rawLines: Array<{ raw: string }> }>;
    }).handlers.find(
      (candidate) => candidate.symbol === "Cmd_printselectionstringfromtable",
    )!;
    expect(facts.rawLines.map((line) => line.raw)).toEqual([
      "static void Cmd_printselectionstringfromtable(void)",
      "{",
      "    if (gBattleControllerExecFlags == 0)",
      "    {",
      "        const u16 *ptr = (const u16 *) T1_READ_PTR(gBattlescriptCurrInstr + 1);",
      "        ptr += gBattleCommunication[MULTISTRING_CHOOSER];",
      "",
      "        gActiveBattler = gBattlerAttacker;",
      "        BtlController_EmitPrintSelectionString(B_COMM_TO_CONTROLLER, *ptr);",
      "        MarkBattlerForControllerExec(gActiveBattler);",
      "",
      "        gBattlescriptCurrInstr += 5;",
      "        gBattleCommunication[MSG_DISPLAY] = 1;",
      "    }",
      "}",
    ]);

    const starts = (observationData as {
      instructionStarts: Array<{
        index: number;
        opcode: { id: number; name: string };
        sourceInvocation: {
          label: string;
          mnemonic: string;
          actualOperands: string[];
          macro: { declarationLine: number };
        };
        operandWidths: number[];
        operandEmissions: Array<{
          directive: string;
          macroEmission: { macro: string; line: number; wrapperPath: string[] };
        }>;
      }>;
    }).instructionStarts.filter((start) => start.opcode.id === 20);
    expect(starts).toHaveLength(1);
    expect(starts[0]).toMatchObject({
      index: 2230,
      opcode: {
        id: 20,
        name: "B_SCR_OP_PRINTSELECTIONSTRINGFROMTABLE",
      },
      sourceInvocation: {
        label: "BattleScript_PrintCantEscapeFromBattle",
        mnemonic: "printselectionstringfromtable",
        actualOperands: ["gNoEscapeStringIds"],
        macro: { declarationLine: 90 },
      },
      operandWidths: [4],
      operandEmissions: [{
        directive: ".4byte",
        macroEmission: {
          macro: "printselectionstringfromtable",
          line: 92,
          wrapperPath: ["printselectionstringfromtable"],
        },
      }],
    });
    expect(target.operands).toEqual([
      expect.objectContaining({
        widthBytes: 4,
        expression: "gNoEscapeStringIds",
      }),
    ]);
    expect(directTarget).toMatchObject({
      opcodeId: 17,
      opcodeName: "B_SCR_OP_PRINTSELECTIONSTRING",
      operands: [expect.objectContaining({ widthBytes: 2 })],
    });
  });

  it("identity-blocks at the local busy gate before operand validation or source context", () => {
    let sourceCalls = 0;
    const malformed = Object.freeze({
      ...target,
      operands: Object.freeze([{ ...target.operands[0]!, widthBytes: 2 as const }]),
    });
    const malformedProgram = Object.freeze({
      ...program,
      instructions: Object.freeze(program.instructions.map((instruction) =>
        instruction.programCounter === target.programCounter ? malformed : instruction
      )),
    });
    const initial = stateAt();
    const result = stepBattleScriptMachine(
      malformedProgram,
      initial,
      handlers(() => {
        sourceCalls += 1;
        return null;
      }, () => false),
    );
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") throw new Error("expected busy block");
    expect(result.reason).toEqual({
      kind: "controller-busy",
      programCounter: 2230,
      opcodeId: 20,
      opcodeName: "B_SCR_OP_PRINTSELECTIONSTRINGFROMTABLE",
    });
    expect(result.state).toBe(initial);
    expect(sourceCalls).toBe(0);
  });

  it("identity-blocks when the typed table/chooser source context is unavailable", () => {
    const initial = stateAt();
    const result = stepBattleScriptMachine(program, initial, handlers(() => null));
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") throw new Error("expected source-context block");
    expect(result.reason).toEqual({
      kind: "source-context-unavailable",
      programCounter: 2230,
      opcodeId: 20,
      opcodeName: "B_SCR_OP_PRINTSELECTIONSTRINGFROMTABLE",
      port: "prepare-selection-message-from-table",
      operandExpression: "gNoEscapeStringIds",
    });
    expect(result.state).toBe(initial);
  });

  it("resolves the table/chooser port and reuses frozen player-only controller semantics", () => {
    let receivedOperand: unknown;
    const snapshot = rawSnapshot();
    const initial = stateAt(target, createBattleScriptSchedulerState({
      activeBattler: 3,
      pendingControllerBattlers: [0],
      pauseCounterBattle: 9,
    }));
    const result = stepBattleScriptMachine(
      program,
      initial,
      handlers((context, operand) => {
        expect(context.state).toBe(initial);
        receivedOperand = operand;
        return { attacker: 2, stringId: 143, snapshot };
      }),
    );
    expect(result.kind).toBe("advanced");
    expect(receivedOperand).toBe(target.operands[0]);
    expect(result.state.programCounter).toBe(2231);
    expect(result.state.scheduler).toEqual({
      messageDisplayActive: true,
      pauseCounterBattle: 9,
      activeBattler: 2,
      pendingControllerBattlers: [0, 2],
    });
    expect(result.state.rulesContext).toBe(initial.rulesContext);
    expect(result.state.rng).toBe(initial.rng);
    expect(result.state.events).toEqual([{
      kind: "selection-message",
      audience: "player-only",
      battler: 2,
      stringId: 143,
      snapshot,
      sequence: 1,
      provenance: {
        programCounter: 2230,
        opcodeId: 20,
        opcodeName: "B_SCR_OP_PRINTSELECTIONSTRINGFROMTABLE",
        dispatcher: "Cmd_printselectionstringfromtable",
        sourceLabel: "BattleScript_PrintCantEscapeFromBattle",
        sourceStatementLine: 3081,
        instructionExecution: 1,
      },
    }]);
    const event = result.state.events[0]!;
    if (event.kind !== "selection-message") throw new Error("expected selection message");
    expect(Object.isFrozen(event)).toBe(true);
    expect(Object.isFrozen(event.provenance)).toBe(true);
    expect(Object.isFrozen(event.snapshot)).toBe(true);
    expect(Object.isFrozen(event.snapshot.battlerAbilities)).toBe(true);
    expect(Object.isFrozen(event.snapshot.textBuffers)).toBe(true);
    expect(event.snapshot.textBuffers.every(Object.isFrozen)).toBe(true);
    expect(event.snapshot).not.toBe(snapshot);
    expect(event.snapshot.textBuffers[0]).not.toBe(snapshot.textBuffers[0]);
    snapshot.textBuffers[0].push("mutated-after-dispatch");
    expect(event.snapshot.textBuffers[0]).toEqual(["B_BUFF_MON_NICK", "attacker"]);

    const acknowledged = acknowledgeBattleScriptController(result.state.scheduler, 2);
    expect(acknowledged).toEqual({
      messageDisplayActive: true,
      pauseCounterBattle: 9,
      activeBattler: 2,
      pendingControllerBattlers: [0],
    });
    expect(acknowledgeBattleScriptController(acknowledged, 2)).toBe(acknowledged);
  });

  it("structured-halts malformed pointer shapes before consulting source context", () => {
    let sourceCalls = 0;
    for (const operands of [
      Object.freeze([]),
      Object.freeze([{ ...target.operands[0]!, widthBytes: 2 as const }]),
      Object.freeze([target.operands[0]!, target.operands[0]!]),
    ]) {
      const malformed = Object.freeze({ ...target, operands });
      const malformedProgram = Object.freeze({
        ...program,
        instructions: Object.freeze(program.instructions.map((instruction) =>
          instruction.programCounter === target.programCounter ? malformed : instruction
        )),
      });
      const initial = stateAt();
      const result = stepBattleScriptMachine(
        malformedProgram,
        initial,
        handlers(() => {
          sourceCalls += 1;
          return null;
        }),
      );
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toMatchObject({
        kind: "invalid-source-operand",
        programCounter: 2230,
        opcodeId: 20,
        expected: "u16-table-pointer",
      });
      expect(result.state.scheduler).toBe(initial.scheduler);
      expect(result.state.rulesContext).toBe(initial.rulesContext);
      expect(result.state.rng).toBe(initial.rng);
      expect(result.state.events).toBe(initial.events);
    }
    expect(sourceCalls).toBe(0);
  });

  it.each([-1, 0x10000, 1.5, Number.NaN])(
    "structured-halts malformed chosen u16 %s before mutation",
    (stringId) => {
      const initial = stateAt();
      const result = stepBattleScriptMachine(
        program,
        initial,
        handlers(() => ({
          attacker: 0,
          stringId,
          snapshot: rawSnapshot(),
        })),
      );
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toEqual({
        kind: "invalid-source-operand",
        programCounter: 2230,
        opcodeId: 20,
        opcodeName: "B_SCR_OP_PRINTSELECTIONSTRINGFROMTABLE",
        operandExpression: "gNoEscapeStringIds",
        expected: "u16",
        received: String(stringId),
      });
      expect(result.state.scheduler).toBe(initial.scheduler);
      expect(result.state.rulesContext).toBe(initial.rulesContext);
      expect(result.state.rng).toBe(initial.rng);
      expect(result.state.events).toBe(initial.events);
    },
  );

  it.each([-1, 4, 1.5, Number.NaN])(
    "structured-halts malformed attacker battler %s before mutation",
    (attacker) => {
      const initial = stateAt();
      const result = stepBattleScriptMachine(
        program,
        initial,
        handlers(() => ({
          attacker: attacker as 0,
          stringId: 143,
          snapshot: rawSnapshot(),
        })),
      );
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toMatchObject({
        kind: "invalid-source-battler",
        programCounter: 2230,
        opcodeId: 20,
        received: String(attacker),
      });
      expect(result.state.scheduler).toBe(initial.scheduler);
      expect(result.state.events).toBe(initial.events);
    },
  );

  it("structured-halts malformed named snapshots before mutation", () => {
    const malformed = rawSnapshot();
    malformed.textBuffers = [[], []] as never;
    const initial = stateAt();
    const result = stepBattleScriptMachine(
      program,
      initial,
      handlers(() => ({
        attacker: 0,
        stringId: 143,
        snapshot: malformed,
      })),
    );
    expect(result.kind).toBe("halted");
    expect(result.state.haltReason).toMatchObject({
      kind: "invalid-source-snapshot",
      programCounter: 2230,
      opcodeId: 20,
      received: "selection textBuffers must contain exactly three buffers",
    });
    expect(result.state.scheduler).toBe(initial.scheduler);
    expect(result.state.rulesContext).toBe(initial.rulesContext);
    expect(result.state.rng).toBe(initial.rng);
    expect(result.state.events).toBe(initial.events);
  });

  it("replays deterministically and composes to exactly thirty-one supported IDs", () => {
    const makeResult = () => stepBattleScriptMachine(
      program,
      stateAt(),
      handlers(() => ({
        attacker: 2,
        stringId: 0xffff,
        snapshot: rawSnapshot(),
      })),
    );
    expect(makeResult()).toEqual(makeResult());

    const composed = Object.freeze({
      ...createBattleScriptControlHandlers<FixtureRules>(program),
      ...handlers(() => null),
      ...createBattleScriptRuleCommandHandlers<FixtureRules>(
        program,
        () => rules.multiHitCounter,
      ),
      ...createBattleScriptMoveValuesCommandHandlers<FixtureRules>(program),
    });
    expect(Object.keys(composed).map(Number).sort((left, right) => left - right)).toEqual([
      10, 16, 17, 18, 20, 26, 37, 38, 39, 40, 57, 58, 60, 61, 62, 63, 65, 83, 84, 85, 86, 97, 98, 100, 101, 102, 111, 131, 141, 142, 227, 248,
    ]);
  });

  it("does not regress opcode 17's ungated direct-u16 path", () => {
    let idleCalls = 0;
    let tableCalls = 0;
    let directCalls = 0;
    const initial = stateAt(directTarget);
    const result = stepBattleScriptMachine(
      program,
      initial,
      handlers(
        () => {
          tableCalls += 1;
          return null;
        },
        () => {
          idleCalls += 1;
          return false;
        },
        (_context, operand) => {
          directCalls += 1;
          expect(operand).toBe(directTarget.operands[0]);
          return {
            attacker: 0,
            stringId: 481,
            snapshot: rawSnapshot(),
          };
        },
      ),
    );
    expect(result.kind).toBe("advanced");
    expect(result.state.programCounter).toBe(2233);
    expect(result.state.events[0]).toMatchObject({
      kind: "selection-message",
      stringId: 481,
      provenance: { opcodeId: 17 },
    });
    expect({ idleCalls, tableCalls, directCalls }).toEqual({
      idleCalls: 0,
      tableCalls: 0,
      directCalls: 1,
    });
  });
});
