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
  type BattleScriptBattlerSelectorResolverPort,
} from "../src/engine/battleScriptSourceCommands.ts";
import {
  loadBattleScriptProgram,
  type BattleScriptInstruction,
} from "../src/engine/battleScriptProgram.ts";

const program = loadBattleScriptProgram();
const rules = Object.freeze({
  marker: "faint-cry-controller-neutral",
  multiHitCounter: 2,
  moveResultFlags: 0,
  moveEffectByte: 0,
  missType: 0,
  critMultiplier: 1,
  dmgMultiplier: 1,
  hitMarker: 0,
});
type FixtureRules = typeof rules;

const faintCryStarts = program.instructions.filter(
  (instruction) => instruction.opcodeName === "B_SCR_OP_PLAYFAINTCRY",
);
const faintCry = faintCryStarts[0]!;

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
  resolveBattlerForBattleScript: BattleScriptBattlerSelectorResolverPort<FixtureRules>,
  isControllerIdle: () => boolean = () => {
    throw new Error("PLAYFAINTCRY must not consult controller-idle");
  },
) {
  return createBattleScriptSourceCommandHandlers(program, Object.freeze({
    isControllerIdle,
    prepareMessage: () => null,
    preparePrimaryStatusAnimation: () => null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => null,
    resolveBattlerAtPosition: () => null,
    resolveBattlerForBattleScript,
    resolveHalfwordOperand: () => null,
  }));
}

describe("source-exact Battle Script PLAYFAINTCRY controller command", () => {
  it("pins opcode/table/handler body and direct one-u8 macro provenance", () => {
    const slot = (commandHandlerData as {
      slots: Array<{
        index: number;
        opcode: string;
        table: { rowIndex: number; handlerExpression: string };
        handler: { symbol: string; definition: { startLine: number; endLine: number } };
      }>;
    }).slots[86];
    expect(slot).toMatchObject({
      index: 86,
      opcode: "B_SCR_OP_PLAYFAINTCRY",
      table: { rowIndex: 86, handlerExpression: "Cmd_playfaintcry" },
      handler: {
        symbol: "Cmd_playfaintcry",
        definition: { startLine: 5328, endLine: 5335 },
      },
    });

    const fact = (lexicalFactData as {
      handlers: Array<{
        symbol: string;
        source: { fileSha256: string; definitionTextSha256: string };
        rawLines: Array<{ raw: string }>;
      }>;
    }).handlers.find((candidate) => candidate.symbol === "Cmd_playfaintcry");
    expect(fact).toMatchObject({
      source: {
        fileSha256: "e0847cd2aa83ee5e18134c32baad348b7c763095cf59efa33da67c4a4e90120c",
        definitionTextSha256: "87108e81051b66269525fab8e097f569cdcc7870aa023562b2137cb187c7267e",
      },
      rawLines: [
        { raw: "static void Cmd_playfaintcry(void)" },
        { raw: "{" },
        { raw: "    gActiveBattler = GetBattlerForBattleScript(gBattlescriptCurrInstr[1]);" },
        { raw: "    BtlController_EmitFaintingCry(B_COMM_TO_CONTROLLER);" },
        { raw: "    MarkBattlerForControllerExec(gActiveBattler);" },
        { raw: "" },
        { raw: "    gBattlescriptCurrInstr += 2;" },
        { raw: "}" },
      ],
    });

    const starts = (observationData as {
      instructionStarts: Array<{
        index: number;
        opcode: { id: number };
        sourceInvocation: {
          label: string;
          line: number;
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
    }).instructionStarts.filter((start) => start.opcode.id === 86);
    expect(starts.map((start) => [
      start.index,
      start.sourceInvocation.line,
      start.sourceInvocation.label,
      start.sourceInvocation.actualOperands[0],
    ])).toEqual([
      [2021, 2810, "BattleScript_FaintAttacker", "BS_ATTACKER"],
      [2027, 2818, "BattleScript_FaintTarget", "BS_TARGET"],
      [3261, 4508, "BattleScript_ArenaDoJudgment", "BS_OPPONENT1"],
      [3273, 4522, "BattleScript_ArenaJudgmentPlayerLoses", "BS_PLAYER1"],
      [3285, 4536, "BattleScript_ArenaJudgmentDraw", "BS_PLAYER1"],
      [3289, 4540, "BattleScript_ArenaJudgmentDraw", "BS_OPPONENT1"],
    ]);
    for (const start of starts) {
      expect(start.sourceInvocation).toMatchObject({
        mnemonic: "playfaintcry",
        macro: { declarationLine: 508 },
      });
      expect(start.operandWidths).toEqual([1]);
      expect(start.operandEmissions).toEqual([
        expect.objectContaining({
          directive: ".byte",
          macroEmission: {
            macro: "playfaintcry",
            line: 510,
            wrapperPath: ["playfaintcry"],
          },
        }),
      ]);
    }
  });

  it("executes all six starts and selector variants through the typed resolver", () => {
    expect(faintCryStarts).toHaveLength(6);
    for (const [index, target] of faintCryStarts.entries()) {
      const battler = (index % 4) as 0 | 1 | 2 | 3;
      const initial = stateAt(target, createBattleScriptSchedulerState({
        messageDisplayActive: true,
        pauseCounterBattle: 7,
        activeBattler: 3,
        pendingControllerBattlers: battler === 1 ? [0] : [1],
      }));
      let receivedOperand: unknown;
      const result = stepBattleScriptMachine(
        program,
        initial,
        handlers((_context, operand) => {
          receivedOperand = operand;
          return battler;
        }),
      );
      expect(result.kind).toBe("advanced");
      expect(receivedOperand).toBe(target.operands[0]);
      expect(target.operands[0]?.expression).toBe(
        ["BS_ATTACKER", "BS_TARGET", "BS_OPPONENT1", "BS_PLAYER1", "BS_PLAYER1", "BS_OPPONENT1"][index],
      );
      expect(result.state.programCounter).toBe(target.programCounter + 1);
      expect(result.state.scheduler).toEqual({
        messageDisplayActive: true,
        pauseCounterBattle: 7,
        activeBattler: battler,
        pendingControllerBattlers: battler === 1 ? [0, 1] : [1, battler],
      });
      expect(result.state.events).toEqual([{
        kind: "play-faint-cry",
        battler,
        sequence: 1,
        provenance: {
          programCounter: target.programCounter,
          opcodeId: 86,
          opcodeName: "B_SCR_OP_PLAYFAINTCRY",
          dispatcher: target.dispatcher,
          sourceLabel: target.source.label,
          sourceStatementLine: target.source.statementLine,
          instructionExecution: 1,
        },
      }]);
      expect(Object.isFrozen(result.state.events)).toBe(true);
      expect(Object.isFrozen(result.state.events[0])).toBe(true);
      expect(Object.isFrozen(result.state.events[0]!.provenance)).toBe(true);
      expect(result.state.rulesContext).toBe(initial.rulesContext);
      expect(result.state.rng).toBe(initial.rng);
    }
  });

  it("requires exactly one one-byte selector before consulting the resolver", () => {
    let resolverCalls = 0;
    for (const operands of [
      Object.freeze([]),
      Object.freeze([{ ...faintCry.operands[0]!, widthBytes: 2 as const }]),
      Object.freeze([faintCry.operands[0]!, faintCry.operands[0]!]),
    ]) {
      const malformed = Object.freeze({ ...faintCry, operands });
      const malformedProgram = Object.freeze({
        ...program,
        instructions: Object.freeze(program.instructions.map((instruction) =>
          instruction.programCounter === faintCry.programCounter ? malformed : instruction
        )),
      });
      const result = stepBattleScriptMachine(
        malformedProgram,
        stateAt(faintCry),
        handlers(() => {
          resolverCalls += 1;
          return 0;
        }),
      );
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toMatchObject({
        kind: "invalid-source-operand",
        opcodeId: 86,
        expected: "u8",
      });
      expect(result.state.events).toEqual([]);
    }
    expect(resolverCalls).toBe(0);
  });

  it("identity-blocks when GetBattlerForBattleScript context is unavailable", () => {
    const initial = stateAt(faintCry);
    const result = stepBattleScriptMachine(program, initial, handlers(() => null));
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") throw new Error("expected selector block");
    expect(result.reason).toEqual({
      kind: "source-context-unavailable",
      programCounter: faintCry.programCounter,
      opcodeId: 86,
      opcodeName: "B_SCR_OP_PLAYFAINTCRY",
      port: "resolve-battler-for-battle-script",
      operandExpression: "BS_ATTACKER",
    });
    expect(result.state).toBe(initial);
  });

  it.each([-1, 4, 1.5, Number.NaN])(
    "structured-halts malformed resolved battler %s without effects",
    (battler) => {
      const initial = stateAt(faintCry);
      const result = stepBattleScriptMachine(
        program,
        initial,
        handlers(() => battler as 0),
      );
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toEqual({
        kind: "invalid-source-battler",
        programCounter: faintCry.programCounter,
        opcodeId: 86,
        opcodeName: "B_SCR_OP_PLAYFAINTCRY",
        received: String(battler),
      });
      expect(result.state.scheduler).toBe(initial.scheduler);
      expect(result.state.events).toBe(initial.events);
      expect(result.state.rulesContext).toBe(initial.rulesContext);
      expect(result.state.rng).toBe(initial.rng);
    },
  );

  it("dispatches while controllers are non-idle and preserves pending ownership", () => {
    const initial = stateAt(faintCry, createBattleScriptSchedulerState({
      activeBattler: 3,
      pendingControllerBattlers: [0, 2],
    }));
    const result = stepBattleScriptMachine(program, initial, handlers(() => 2));
    expect(result.kind).toBe("advanced");
    expect(result.state.scheduler).toEqual({
      messageDisplayActive: false,
      pauseCounterBattle: 0,
      activeBattler: 2,
      pendingControllerBattlers: [0, 2],
    });
    expect(initial.scheduler.activeBattler).toBe(3);
  });

  it("acknowledges command receipt immediately without cry-duration state", () => {
    const result = stepBattleScriptMachine(
      program,
      stateAt(faintCry, createBattleScriptSchedulerState({
        activeBattler: 3,
        pendingControllerBattlers: [0],
      })),
      handlers(() => 2),
    );
    expect(result.kind).toBe("advanced");
    expect(acknowledgeBattleScriptController(result.state.scheduler, 1))
      .toBe(result.state.scheduler);
    const acknowledged = acknowledgeBattleScriptController(result.state.scheduler, 2);
    expect(acknowledged).toEqual({
      messageDisplayActive: false,
      pauseCounterBattle: 0,
      activeBattler: 2,
      pendingControllerBattlers: [0],
    });
    expect(Object.keys(acknowledged).sort()).toEqual([
      "activeBattler",
      "messageDisplayActive",
      "pauseCounterBattle",
      "pendingControllerBattlers",
    ]);
    expect(acknowledgeBattleScriptController(acknowledged, 2)).toBe(acknowledged);
  });

  it("replays deterministically and composes to exactly twenty-five supported IDs", () => {
    const makeResult = () => stepBattleScriptMachine(
      program,
      stateAt(faintCry),
      handlers(() => 3),
    );
    expect(makeResult()).toEqual(makeResult());

    const sourceHandlers = handlers(() => 0);
    expect(Object.keys(sourceHandlers).map(Number).sort((left, right) => left - right)).toEqual([
      10, 16, 17, 18, 20, 57, 58, 83, 84, 85, 86, 98, 100, 111, 131, 248,
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
      10, 16, 17, 18, 20, 37, 38, 39, 40, 57, 58, 60, 61, 62, 65, 83, 84, 85, 86, 98, 100, 111, 131, 141, 248,
    ]);
  });
});
