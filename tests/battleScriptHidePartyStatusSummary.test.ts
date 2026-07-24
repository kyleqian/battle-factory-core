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
  marker: "hide-party-status-summary-controller-neutral",
  multiHitCounter: 2,
  moveResultFlags: 0,
  moveEffectByte: 0,
  missType: 0,
  critMultiplier: 1,
  dmgMultiplier: 1,
  hitMarker: 0,
});
type FixtureRules = typeof rules;

const starts = program.instructions.filter(
  (instruction) => instruction.opcodeName === "B_SCR_OP_HIDEPARTYSTATUSSUMMARY",
);
const command = starts[0]!;

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
    throw new Error("HIDEPARTYSTATUSSUMMARY must not consult controller-idle");
  },
) {
  return createBattleScriptSourceCommandHandlers(program, Object.freeze({
    isControllerIdle,
    prepareMessage: () => null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => null,
    resolveBattlerForBattleScript,
    resolveHalfwordOperand: () => null,
  }));
}

describe("source-exact Battle Script HIDEPARTYSTATUSSUMMARY controller command", () => {
  it("pins authoritative slot 98, handler body, two-byte advance, and direct u8 macro provenance", () => {
    const slot = (commandHandlerData as {
      slots: Array<{
        index: number;
        opcode: string;
        table: { rowIndex: number; handlerExpression: string };
        handler: { symbol: string; definition: { startLine: number; endLine: number } };
      }>;
    }).slots[98];
    expect(slot).toMatchObject({
      index: 98,
      opcode: "B_SCR_OP_HIDEPARTYSTATUSSUMMARY",
      table: { rowIndex: 98, handlerExpression: "Cmd_hidepartystatussummary" },
      handler: {
        symbol: "Cmd_hidepartystatussummary",
        definition: { startLine: 5734, endLine: 5741 },
      },
    });

    const fact = (lexicalFactData as {
      handlers: Array<{
        symbol: string;
        source: { fileSha256: string; definitionTextSha256: string };
        rawLines: Array<{ raw: string }>;
        instructionPointerFacts: {
          advanceExpressions: Array<{ statementRaw: string }>;
        };
      }>;
    }).handlers.find((candidate) => candidate.symbol === "Cmd_hidepartystatussummary");
    expect(fact).toMatchObject({
      source: {
        fileSha256: "e0847cd2aa83ee5e18134c32baad348b7c763095cf59efa33da67c4a4e90120c",
        definitionTextSha256: "2d7325fa02dee3f401a8cd25b2e5def8a13c4de94aedf847282f1120baf6f707",
      },
      rawLines: [
        { raw: "static void Cmd_hidepartystatussummary(void)" },
        { raw: "{" },
        { raw: "    gActiveBattler = GetBattlerForBattleScript(gBattlescriptCurrInstr[1]);" },
        { raw: "    BtlController_EmitHidePartyStatusSummary(B_COMM_TO_CONTROLLER);" },
        { raw: "    MarkBattlerForControllerExec(gActiveBattler);" },
        { raw: "" },
        { raw: "    gBattlescriptCurrInstr += 2;" },
        { raw: "}" },
      ],
      instructionPointerFacts: {
        advanceExpressions: [{ statementRaw: "gBattlescriptCurrInstr += 2;" }],
      },
    });

    const observations = (observationData as {
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
    }).instructionStarts.filter((start) => start.opcode.id === 98);
    expect(observations.map((start) => [
      start.index,
      start.sourceInvocation.line,
      start.sourceInvocation.label,
      start.sourceInvocation.actualOperands[0],
    ])).toEqual([
      [2077, 2878, "BattleScript_FaintedMonTryChoose", "BS_ATTACKER"],
      [2087, 2889, "BattleScript_FaintedMonSendOutNew", "BS_FAINTED"],
      [2105, 2912, "BattleScript_LinkHandleFaintedMonLoop", "BS_FAINTED"],
      [2257, 3115, "BattleScript_DoSwitchOut", "BS_ATTACKER"],
    ]);
    for (const start of observations) {
      expect(start.sourceInvocation).toMatchObject({
        mnemonic: "hidepartystatussummary",
        macro: { declarationLine: 567 },
      });
      expect(start.operandWidths).toEqual([1]);
      expect(start.operandEmissions).toEqual([
        expect.objectContaining({
          directive: ".byte",
          macroEmission: {
            macro: "hidepartystatussummary",
            line: 569,
            wrapperPath: ["hidepartystatussummary"],
          },
        }),
      ]);
    }
  });

  it("executes all four starts and both selector forms through the typed resolver", () => {
    expect(starts).toHaveLength(4);
    const expectedSelectors = ["BS_ATTACKER", "BS_FAINTED", "BS_FAINTED", "BS_ATTACKER"];
    const resolvedBattlers = [1, 2, 3, 0] as const;
    for (const [index, target] of starts.entries()) {
      const battler = resolvedBattlers[index]!;
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
      expect(target.operands[0]?.expression).toBe(expectedSelectors[index]);
      expect(1 + target.operands.reduce((sum, operand) => sum + operand.widthBytes, 0)).toBe(2);
      expect(result.state.programCounter).toBe(target.programCounter + 1);
      expect(result.state.scheduler).toEqual({
        messageDisplayActive: true,
        pauseCounterBattle: 7,
        activeBattler: battler,
        pendingControllerBattlers: battler === 1 ? [0, 1] : [1, battler],
      });
      expect(result.state.events).toEqual([{
        kind: "hide-party-status-summary",
        battler,
        sequence: 1,
        provenance: {
          programCounter: target.programCounter,
          opcodeId: 98,
          opcodeName: "B_SCR_OP_HIDEPARTYSTATUSSUMMARY",
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
      Object.freeze([{ ...command.operands[0]!, widthBytes: 2 as const }]),
      Object.freeze([command.operands[0]!, command.operands[0]!]),
    ]) {
      const malformed = Object.freeze({ ...command, operands });
      const malformedProgram = Object.freeze({
        ...program,
        instructions: Object.freeze(program.instructions.map((instruction) =>
          instruction.programCounter === command.programCounter ? malformed : instruction
        )),
      });
      const result = stepBattleScriptMachine(
        malformedProgram,
        stateAt(command),
        handlers(() => {
          resolverCalls += 1;
          return 0;
        }),
      );
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toMatchObject({
        kind: "invalid-source-operand",
        opcodeId: 98,
        expected: "u8",
      });
      expect(result.state.events).toEqual([]);
    }
    expect(resolverCalls).toBe(0);
  });

  it("identity-blocks when selector context is unavailable", () => {
    const initial = stateAt(command);
    const result = stepBattleScriptMachine(program, initial, handlers(() => null));
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") throw new Error("expected selector block");
    expect(result.reason).toEqual({
      kind: "source-context-unavailable",
      programCounter: command.programCounter,
      opcodeId: 98,
      opcodeName: "B_SCR_OP_HIDEPARTYSTATUSSUMMARY",
      port: "resolve-battler-for-battle-script",
      operandExpression: "BS_ATTACKER",
    });
    expect(result.state).toBe(initial);
  });

  it.each([-1, 4, 1.5, Number.NaN])(
    "structured-halts malformed resolved battler %s without effects",
    (battler) => {
      const initial = stateAt(command);
      const result = stepBattleScriptMachine(
        program,
        initial,
        handlers(() => battler as 0),
      );
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toEqual({
        kind: "invalid-source-battler",
        programCounter: command.programCounter,
        opcodeId: 98,
        opcodeName: "B_SCR_OP_HIDEPARTYSTATUSSUMMARY",
        received: String(battler),
      });
      expect(result.state.scheduler).toBe(initial.scheduler);
      expect(result.state.events).toBe(initial.events);
      expect(result.state.rulesContext).toBe(initial.rulesContext);
      expect(result.state.rng).toBe(initial.rng);
    },
  );

  it("dispatches without an idle guard and preserves existing pending ownership", () => {
    const initial = stateAt(command, createBattleScriptSchedulerState({
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

  it("acknowledges receipt/task kickoff without tray completion state", () => {
    const result = stepBattleScriptMachine(
      program,
      stateAt(command, createBattleScriptSchedulerState({
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

  it("replays deterministically and composes to exactly twenty-one supported IDs", () => {
    const makeResult = () => stepBattleScriptMachine(
      program,
      stateAt(command),
      handlers(() => 3),
    );
    expect(makeResult()).toEqual(makeResult());

    const sourceHandlers = handlers(() => 0);
    expect(Object.keys(sourceHandlers).map(Number).sort((left, right) => left - right)).toEqual([
      16, 17, 18, 20, 57, 58, 84, 85, 86, 98, 111, 131,
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
      16, 17, 18, 20, 37, 38, 39, 40, 57, 58, 60, 61, 62, 65, 84, 85, 86, 98, 111, 131, 141,
    ]);
  });
});
