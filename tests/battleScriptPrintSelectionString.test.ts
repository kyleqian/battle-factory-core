import { describe, expect, it } from "vitest";
import commandHandlerData from "../src/data/gen/battle-script-command-handlers.json" with { type: "json" };
import lexicalFactData from "../src/data/gen/battle-script-handler-lexical-facts.json" with { type: "json" };
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
  type BattleScriptSelectionMessagePreparationPort,
} from "../src/engine/battleScriptSourceCommands.ts";
import {
  loadBattleScriptProgram,
  type BattleScriptInstruction,
} from "../src/engine/battleScriptProgram.ts";

const program = loadBattleScriptProgram();
const target = program.instructions[2232]!;
const rules = Object.freeze({
  marker: "selection-message-neutral",
  nested: Object.freeze(["rules"]),
});
type FixtureRules = typeof rules;

const rawSnapshot = () => ({
  currentMove: 89,
  originallyUsedMove: 89,
  lastItem: 1,
  lastAbility: 9,
  scriptingBattler: 0 as const,
  scriptPartyIndex: 2,
  battlerAbilities: [9, 22, 65, 0] as [number, number, number, number],
  textBuffers: [
    ["B_BUFF_MON_NICK", "attacker"],
    ["B_BUFF_MOVE", "selected"],
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
    0x12345678,
    scheduler,
  );
  return Object.freeze({ ...initial, programCounter: instruction.programCounter });
}

function handlers(
  prepareSelectionMessage: BattleScriptSelectionMessagePreparationPort<FixtureRules>,
  onIdle: () => boolean = () => {
    throw new Error("opcode 17 must not consult controller-idle");
  },
) {
  return createBattleScriptSourceCommandHandlers(program, Object.freeze({
    isControllerIdle: onIdle,
    prepareMessage: () => null,
    prepareSelectionMessage,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => null,
    resolveBattlerAtPosition: () => null,
    resolveBattlerForBattleScript: () => null,
    resolveHalfwordOperand: () => null,
  }));
}

describe("source-exact B_SCR_OP_PRINTSELECTIONSTRING", () => {
  it("pins opcode 17's table/handler/macro provenance, unconditional body, and all ten direct starts", () => {
    const slots = (commandHandlerData as {
      slots: Array<{
        index: number;
        opcode: string;
        table: { rowIndex: number; handlerExpression: string };
        handler: { symbol: string; definition: { startLine: number; endLine: number } };
      }>;
    }).slots;
    expect(slots[17]).toMatchObject({
      index: 17,
      opcode: "B_SCR_OP_PRINTSELECTIONSTRING",
      table: { rowIndex: 17, handlerExpression: "Cmd_printselectionstring" },
      handler: {
        symbol: "Cmd_printselectionstring",
        definition: { startLine: 2148, endLine: 2157 },
      },
    });

    const facts = (lexicalFactData as {
      handlers: Array<{ symbol: string; rawLines: Array<{ raw: string }> }>;
    }).handlers.find((candidate) => candidate.symbol === "Cmd_printselectionstring")!;
    expect(facts.rawLines.map((line) => line.raw)).toEqual([
      "static void Cmd_printselectionstring(void)",
      "{",
      "    gActiveBattler = gBattlerAttacker;",
      "",
      "    BtlController_EmitPrintSelectionString(B_COMM_TO_CONTROLLER, T2_READ_16(gBattlescriptCurrInstr + 1));",
      "    MarkBattlerForControllerExec(gActiveBattler);",
      "",
      "    gBattlescriptCurrInstr += 3;",
      "    gBattleCommunication[MSG_DISPLAY] = 1;",
      "}",
    ]);
    expect(facts.rawLines.every((line) => !line.raw.includes("gBattleControllerExecFlags"))).toBe(true);

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
    }).instructionStarts.filter((start) => start.opcode.id === 17);
    expect(starts.map((start) => [
      start.index,
      start.sourceInvocation.label,
      start.sourceInvocation.actualOperands[0],
    ])).toEqual([
      [2232, "BattleScript_PrintFullBox", "STRINGID_BOXISFULL"],
      [2449, "BattleScript_SelectingDisabledMove", "STRINGID_PKMNMOVEISDISABLED"],
      [2590, "BattleScript_NoMovesLeft", "STRINGID_PKMNHASNOMOVESLEFT"],
      [2592, "BattleScript_SelectingMoveWithNoPP", "STRINGID_NOPPLEFT"],
      [2599, "BattleScript_SelectingTormentedMove", "STRINGID_PKMNCANTUSEMOVETORMENT"],
      [2606, "BattleScript_SelectingNotAllowedMoveTaunt", "STRINGID_PKMNCANTUSEMOVETAUNT"],
      [2662, "BattleScript_SelectingImprisonedMove", "STRINGID_PKMNCANTUSEMOVESEALED"],
      [3165, "BattleScript_SelectingNotAllowedMoveChoiceItem", "STRINGID_ITEMALLOWSONLYYMOVE"],
      [3194, "BattleScript_ActionSelectionItemsCantBeUsed", "STRINGID_ITEMSCANTBEUSEDNOW"],
      [3295, "BattleScript_AskIfWantsToForfeitMatch", "STRINGID_QUESTIONFORFEITMATCH"],
    ]);
    for (const start of starts) {
      expect(start.sourceInvocation).toMatchObject({
        mnemonic: "printselectionstring",
        macro: { declarationLine: 75 },
      });
      expect(start.operandWidths).toEqual([2]);
      expect(start.operandEmissions).toEqual([
        expect.objectContaining({
          directive: ".2byte",
          macroEmission: {
            macro: "printselectionstring",
            line: 77,
            wrapperPath: ["printselectionstring"],
          },
        }),
      ]);
    }
  });

  it("preserves frozen empty scheduler defaults and validates controller sets", () => {
    const scheduler = createBattleScriptSchedulerState();
    expect(scheduler).toEqual({
      messageDisplayActive: false,
      pauseCounterBattle: 0,
      activeBattler: null,
      pendingControllerBattlers: [],
    });
    expect(Object.isFrozen(scheduler)).toBe(true);
    expect(Object.isFrozen(scheduler.pendingControllerBattlers)).toBe(true);
    expect(() => createBattleScriptSchedulerState({
      pendingControllerBattlers: [0, 0],
    })).toThrow(/must be unique/);
    expect(() => createBattleScriptSchedulerState({
      activeBattler: 4 as never,
    })).toThrow(/active battler/);
    expect(() => createBattleScriptSchedulerState({
      pendingControllerBattlers: [-1 as never],
    })).toThrow(/pending controller battler/);
  });

  it("unconditionally prepares, activates, queues, advances, latches, and emits one deeply frozen event", () => {
    let idleCalls = 0;
    let receivedOperand: unknown;
    const snapshot = rawSnapshot();
    const initial = stateAt(target, createBattleScriptSchedulerState({
      activeBattler: 3,
      pendingControllerBattlers: [0, 2],
      pauseCounterBattle: 7,
    }));
    const result = stepBattleScriptMachine(
      program,
      initial,
      handlers(
        (context, operand) => {
          receivedOperand = operand;
          expect(context.state).toBe(initial);
          return {
            attacker: 0,
            stringId: 481,
            snapshot,
          };
        },
        () => {
          idleCalls += 1;
          return false;
        },
      ),
    );

    expect(result.kind).toBe("advanced");
    expect(idleCalls).toBe(0);
    expect(receivedOperand).toBe(target.operands[0]);
    expect(result.state.programCounter).toBe(target.programCounter + 1);
    expect(result.state.scheduler).toEqual({
      messageDisplayActive: true,
      pauseCounterBattle: 7,
      activeBattler: 0,
      pendingControllerBattlers: [0, 2],
    });
    expect(result.state.rulesContext).toBe(initial.rulesContext);
    expect(result.state.rng).toBe(initial.rng);
    expect(result.state.events).toEqual([{
      kind: "selection-message",
      audience: "player-only",
      battler: 0,
      stringId: 481,
      snapshot,
      sequence: 1,
      provenance: {
        programCounter: 2232,
        opcodeId: 17,
        opcodeName: "B_SCR_OP_PRINTSELECTIONSTRING",
        dispatcher: "Cmd_printselectionstring",
        sourceLabel: "BattleScript_PrintFullBox",
        sourceStatementLine: 3085,
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
    expect(event.snapshot.battlerAbilities).not.toBe(snapshot.battlerAbilities);
    expect(event.snapshot.textBuffers[0]).not.toBe(snapshot.textBuffers[0]);
    expect(snapshot.battlerAbilities).toEqual([9, 22, 65, 0]);
    expect(initial.scheduler).toEqual({
      messageDisplayActive: false,
      pauseCounterBattle: 7,
      activeBattler: 3,
      pendingControllerBattlers: [0, 2],
    });
  });

  it("identity-blocks on null source context before any scheduler, event, rules, or RNG mutation", () => {
    const initial = stateAt();
    const result = stepBattleScriptMachine(program, initial, handlers(() => null));
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") throw new Error("expected blocked opcode 17");
    expect(result.reason).toEqual({
      kind: "source-context-unavailable",
      programCounter: 2232,
      opcodeId: 17,
      opcodeName: "B_SCR_OP_PRINTSELECTIONSTRING",
      port: "prepare-selection-message",
      operandExpression: "STRINGID_BOXISFULL",
    });
    expect(result.state).toBe(initial);
  });

  it.each([-1, 0x10000, 1.5, Number.NaN])(
    "structured-halts malformed resolved u16 %s without effects",
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
        programCounter: 2232,
        opcodeId: 17,
        opcodeName: "B_SCR_OP_PRINTSELECTIONSTRING",
        operandExpression: "STRINGID_BOXISFULL",
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
    "structured-halts malformed attacker battler %s without effects",
    (attacker) => {
      const initial = stateAt();
      const result = stepBattleScriptMachine(
        program,
        initial,
        handlers(() => ({
          attacker: attacker as 0,
          stringId: 481,
          snapshot: rawSnapshot(),
        })),
      );
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toEqual({
        kind: "invalid-source-battler",
        programCounter: 2232,
        opcodeId: 17,
        opcodeName: "B_SCR_OP_PRINTSELECTIONSTRING",
        received: String(attacker),
      });
      expect(result.state.scheduler).toBe(initial.scheduler);
      expect(result.state.events).toBe(initial.events);
    },
  );

  it("structured-halts malformed instruction shape before consulting source context", () => {
    let preparationCalls = 0;
    for (const operands of [
      Object.freeze([]),
      Object.freeze([{ ...target.operands[0]!, widthBytes: 1 as const }]),
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
          preparationCalls += 1;
          return null;
        }),
      );
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toMatchObject({
        kind: "invalid-source-operand",
        programCounter: 2232,
        opcodeId: 17,
        expected: "u16",
      });
      expect(result.state.scheduler).toBe(initial.scheduler);
      expect(result.state.events).toBe(initial.events);
    }
    expect(preparationCalls).toBe(0);
  });

  it("replays deterministically with scheduler/rules/RNG isolation while preserving opcode 17 semantics", () => {
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
    const sourceHandlers = handlers(() => null);
    expect(Object.keys(sourceHandlers).map(Number).sort((a, b) => a - b)).toEqual([
      16, 17, 18, 20, 57, 58, 83, 84, 85, 86, 98, 111, 131, 248,
    ]);
    expect(sourceHandlers[17]).toBeDefined();
  });

  it("acknowledges only the named pending battler, idempotently, without clearing MSG_DISPLAY", () => {
    const initial = createBattleScriptSchedulerState({
      messageDisplayActive: true,
      pauseCounterBattle: 11,
      activeBattler: 0,
      pendingControllerBattlers: [0, 2],
    });
    expect(acknowledgeBattleScriptController(initial, 1)).toBe(initial);
    const acknowledged = acknowledgeBattleScriptController(initial, 0);
    expect(acknowledged).toEqual({
      messageDisplayActive: true,
      pauseCounterBattle: 11,
      activeBattler: 0,
      pendingControllerBattlers: [2],
    });
    expect(Object.isFrozen(acknowledged)).toBe(true);
    expect(Object.isFrozen(acknowledged.pendingControllerBattlers)).toBe(true);
    expect(acknowledgeBattleScriptController(acknowledged, 0)).toBe(acknowledged);
    expect(initial.pendingControllerBattlers).toEqual([0, 2]);
  });
});
