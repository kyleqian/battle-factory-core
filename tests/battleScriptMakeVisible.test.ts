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
  marker: "make-visible-controller-neutral",
  multiHitCounter: 2,
  moveResultFlags: 0,
  moveEffectByte: 0,
  missType: 0,
  critMultiplier: 1,
  dmgMultiplier: 1,
  hitMarker: 0,
});
type FixtureRules = typeof rules;

const makeVisibleStarts = program.instructions.filter(
  (instruction) => instruction.opcodeName === "B_SCR_OP_MAKEVISIBLE",
);
const makeVisible = makeVisibleStarts[0]!;

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
    throw new Error("MAKEVISIBLE must not consult controller-idle");
  },
) {
  return createBattleScriptSourceCommandHandlers(program, Object.freeze({
    isControllerIdle,
    prepareMessage: () => null,
    prepareStatusAnimation: () => null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => null,
    resolveBattlerAtPosition: () => null,
    resolveBattlerForBattleScript,
    resolveHalfwordOperand: () => null,
  }));
}

describe("source-exact Battle Script MAKEVISIBLE controller command", () => {
  it("pins authoritative slot 111, handler body, two-byte advance, and direct u8 macro provenance", () => {
    const slot = (commandHandlerData as {
      slots: Array<{
        index: number;
        opcode: string;
        table: { rowIndex: number; handlerExpression: string };
        handler: { symbol: string; definition: { startLine: number; endLine: number } };
      }>;
    }).slots[111];
    expect(slot).toMatchObject({
      index: 111,
      opcode: "B_SCR_OP_MAKEVISIBLE",
      table: { rowIndex: 111, handlerExpression: "Cmd_makevisible" },
      handler: {
        symbol: "Cmd_makevisible",
        definition: { startLine: 6217, endLine: 6224 },
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
    }).handlers.find((candidate) => candidate.symbol === "Cmd_makevisible");
    expect(fact).toMatchObject({
      source: {
        fileSha256: "e0847cd2aa83ee5e18134c32baad348b7c763095cf59efa33da67c4a4e90120c",
        definitionTextSha256: "60605fc2d636ea15ebef880cb9c28c047dca193f4cac5600ff47f3e9333cc62b",
      },
      rawLines: [
        { raw: "static void Cmd_makevisible(void)" },
        { raw: "{" },
        { raw: "    gActiveBattler = GetBattlerForBattleScript(gBattlescriptCurrInstr[1]);" },
        { raw: "    BtlController_EmitSpriteInvisibility(B_COMM_TO_CONTROLLER, FALSE);" },
        { raw: "    MarkBattlerForControllerExec(gActiveBattler);" },
        { raw: "" },
        { raw: "    gBattlescriptCurrInstr += 2;" },
        { raw: "}" },
      ],
      instructionPointerFacts: {
        advanceExpressions: [{ statementRaw: "gBattlescriptCurrInstr += 2;" }],
      },
    });
  });

  it("pins all five catalogued evidence starts while keeping RETURNTOBALL excluded", () => {
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
    }).instructionStarts.filter((start) => start.opcode.id === 88 || start.opcode.id === 111);
    expect(starts.map((start) => [
      start.index,
      start.sourceInvocation.line,
      start.sourceInvocation.mnemonic,
      start.sourceInvocation.label,
      start.sourceInvocation.actualOperands[0],
    ])).toEqual([
      [1161, 1706, "returntoball", "BattleScript_EffectBatonPass", "BS_ATTACKER"],
      [2427, 3328, "returntoball", "BattleScript_SuccessForceOut", "BS_TARGET"],
      [2820, 3884, "makevisible", "BattleScript_YawnMakesAsleep", "BS_EFFECT_BATTLER"],
      [3227, 4473, "makevisible", "BattleScript_ArenaDoJudgment", "BS_PLAYER1"],
      [3229, 4475, "makevisible", "BattleScript_ArenaDoJudgment", "BS_OPPONENT1"],
    ]);

    const makeVisibleObservations = starts.filter((start) => start.opcode.id === 111);
    for (const start of makeVisibleObservations) {
      expect(start.sourceInvocation.macro.declarationLine).toBe(628);
      expect(start.operandWidths).toEqual([1]);
      expect(start.operandEmissions).toEqual([
        expect.objectContaining({
          directive: ".byte",
          macroEmission: {
            macro: "makevisible",
            line: 630,
            wrapperPath: ["makevisible"],
          },
        }),
      ]);
    }
  });

  it("executes every MAKEVISIBLE start and selector variant through the typed resolver", () => {
    expect(makeVisibleStarts).toHaveLength(3);
    const expectedSelectors = ["BS_EFFECT_BATTLER", "BS_PLAYER1", "BS_OPPONENT1"];
    const resolvedBattlers = [2, 0, 1] as const;
    for (const [index, target] of makeVisibleStarts.entries()) {
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
        kind: "set-battler-sprite-visibility",
        battler,
        invisible: false,
        sequence: 1,
        provenance: {
          programCounter: target.programCounter,
          opcodeId: 111,
          opcodeName: "B_SCR_OP_MAKEVISIBLE",
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
      Object.freeze([{ ...makeVisible.operands[0]!, widthBytes: 2 as const }]),
      Object.freeze([makeVisible.operands[0]!, makeVisible.operands[0]!]),
    ]) {
      const malformed = Object.freeze({ ...makeVisible, operands });
      const malformedProgram = Object.freeze({
        ...program,
        instructions: Object.freeze(program.instructions.map((instruction) =>
          instruction.programCounter === makeVisible.programCounter ? malformed : instruction
        )),
      });
      const result = stepBattleScriptMachine(
        malformedProgram,
        stateAt(makeVisible),
        handlers(() => {
          resolverCalls += 1;
          return 0;
        }),
      );
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toMatchObject({
        kind: "invalid-source-operand",
        opcodeId: 111,
        expected: "u8",
      });
      expect(result.state.events).toEqual([]);
    }
    expect(resolverCalls).toBe(0);
  });

  it("identity-blocks when GetBattlerForBattleScript context is unavailable", () => {
    const initial = stateAt(makeVisible);
    const result = stepBattleScriptMachine(program, initial, handlers(() => null));
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") throw new Error("expected selector block");
    expect(result.reason).toEqual({
      kind: "source-context-unavailable",
      programCounter: makeVisible.programCounter,
      opcodeId: 111,
      opcodeName: "B_SCR_OP_MAKEVISIBLE",
      port: "resolve-battler-for-battle-script",
      operandExpression: "BS_EFFECT_BATTLER",
    });
    expect(result.state).toBe(initial);
  });

  it.each([-1, 4, 1.5, Number.NaN])(
    "structured-halts malformed resolved battler %s without effects",
    (battler) => {
      const initial = stateAt(makeVisible);
      const result = stepBattleScriptMachine(
        program,
        initial,
        handlers(() => battler as 0),
      );
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toEqual({
        kind: "invalid-source-battler",
        programCounter: makeVisible.programCounter,
        opcodeId: 111,
        opcodeName: "B_SCR_OP_MAKEVISIBLE",
        received: String(battler),
      });
      expect(result.state.scheduler).toBe(initial.scheduler);
      expect(result.state.events).toBe(initial.events);
      expect(result.state.rulesContext).toBe(initial.rulesContext);
      expect(result.state.rng).toBe(initial.rng);
    },
  );

  it("dispatches while controllers are non-idle and preserves pending ownership", () => {
    const initial = stateAt(makeVisible, createBattleScriptSchedulerState({
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

  it("uses the existing acknowledgement boundary without visibility or presence state", () => {
    const result = stepBattleScriptMachine(
      program,
      stateAt(makeVisible, createBattleScriptSchedulerState({
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

  it("replays deterministically and composes to exactly twenty-eight supported IDs", () => {
    const makeResult = () => stepBattleScriptMachine(
      program,
      stateAt(makeVisible),
      handlers(() => 3),
    );
    expect(makeResult()).toEqual(makeResult());

    const sourceHandlers = handlers(() => 0);
    expect(Object.keys(sourceHandlers).map(Number).sort((left, right) => left - right)).toEqual([
      10, 16, 17, 18, 20, 26, 57, 58, 83, 84, 85, 86, 97, 98, 100, 101, 102, 111, 131, 248,
    ]);
    expect(sourceHandlers[88]).toBeUndefined();
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
