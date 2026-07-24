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
  type BattleScriptAttackerResolverPort,
  type BattleScriptHalfwordResolverPort,
} from "../src/engine/battleScriptSourceCommands.ts";
import {
  loadBattleScriptProgram,
  type BattleScriptInstruction,
} from "../src/engine/battleScriptProgram.ts";

const program = loadBattleScriptProgram();
const rules = Object.freeze({
  marker: "audio-controller-neutral",
  multiHitCounter: 2,
  moveResultFlags: 0,
  moveEffectByte: 0,
  missType: 0,
  critMultiplier: 1,
  dmgMultiplier: 1,
  hitMarker: 0,
});
type FixtureRules = typeof rules;

const audioStarts = program.instructions.filter(
  (instruction) =>
    instruction.opcodeName === "B_SCR_OP_PLAYSE"
    || instruction.opcodeName === "B_SCR_OP_FANFARE",
);
const playSe = audioStarts.find((instruction) => instruction.opcodeName === "B_SCR_OP_PLAYSE")!;
const fanfare = audioStarts.find((instruction) => instruction.opcodeName === "B_SCR_OP_FANFARE")!;

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
  resolveHalfwordOperand: BattleScriptHalfwordResolverPort<FixtureRules>,
  resolveAttackerBattler: BattleScriptAttackerResolverPort<FixtureRules> = () => 0,
  isControllerIdle: () => boolean = () => {
    throw new Error("audio opcodes must not consult controller-idle");
  },
) {
  return createBattleScriptSourceCommandHandlers(program, Object.freeze({
    isControllerIdle,
    prepareMessage: () => null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler,
    resolveHalfwordOperand,
  }));
}

describe("source-exact Battle Script PLAYSE/FANFARE controller family", () => {
  it("pins opcode/table/handler bodies and direct one-u16 macro provenance", () => {
    const slots = (commandHandlerData as {
      slots: Array<{
        index: number;
        opcode: string;
        table: { rowIndex: number; handlerExpression: string };
        handler: { symbol: string; definition: { startLine: number; endLine: number } };
      }>;
    }).slots;
    expect(slots[84]).toMatchObject({
      index: 84,
      opcode: "B_SCR_OP_PLAYSE",
      table: { rowIndex: 84, handlerExpression: "Cmd_playse" },
      handler: {
        symbol: "Cmd_playse",
        definition: { startLine: 5310, endLine: 5317 },
      },
    });
    expect(slots[85]).toMatchObject({
      index: 85,
      opcode: "B_SCR_OP_FANFARE",
      table: { rowIndex: 85, handlerExpression: "Cmd_fanfare" },
      handler: {
        symbol: "Cmd_fanfare",
        definition: { startLine: 5319, endLine: 5326 },
      },
    });

    const facts = (lexicalFactData as {
      handlers: Array<{
        symbol: string;
        source: { fileSha256: string };
        rawLines: Array<{ raw: string }>;
      }>;
    }).handlers;
    expect(facts.find((candidate) => candidate.symbol === "Cmd_playse")).toMatchObject({
      source: {
        fileSha256: "e0847cd2aa83ee5e18134c32baad348b7c763095cf59efa33da67c4a4e90120c",
      },
      rawLines: [
        { raw: "static void Cmd_playse(void)" },
        { raw: "{" },
        { raw: "    gActiveBattler = gBattlerAttacker;" },
        { raw: "    BtlController_EmitPlaySE(B_COMM_TO_CONTROLLER, T2_READ_16(gBattlescriptCurrInstr + 1));" },
        { raw: "    MarkBattlerForControllerExec(gActiveBattler);" },
        { raw: "" },
        { raw: "    gBattlescriptCurrInstr += 3;" },
        { raw: "}" },
      ],
    });
    expect(facts.find((candidate) => candidate.symbol === "Cmd_fanfare")).toMatchObject({
      source: {
        fileSha256: "e0847cd2aa83ee5e18134c32baad348b7c763095cf59efa33da67c4a4e90120c",
      },
      rawLines: [
        { raw: "static void Cmd_fanfare(void)" },
        { raw: "{" },
        { raw: "    gActiveBattler = gBattlerAttacker;" },
        { raw: "    BtlController_EmitPlayFanfareOrBGM(B_COMM_TO_CONTROLLER, T2_READ_16(gBattlescriptCurrInstr + 1), FALSE);" },
        { raw: "    MarkBattlerForControllerExec(gActiveBattler);" },
        { raw: "" },
        { raw: "    gBattlescriptCurrInstr += 3;" },
        { raw: "}" },
      ],
    });

    const starts = (observationData as {
      instructionStarts: Array<{
        index: number;
        opcode: { id: number; name: string };
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
    }).instructionStarts.filter((start) => start.opcode.id === 84 || start.opcode.id === 85);
    expect(starts.map((start) => [
      start.index,
      start.sourceInvocation.line,
      start.sourceInvocation.label,
      start.sourceInvocation.actualOperands[0],
    ])).toEqual([
      [2294, 3156, "BattleScript_LevelUp", "MUS_LEVEL_UP"],
      [2318, 3184, "BattleScript_LearnedNewMove", "MUS_LEVEL_UP"],
      [3210, 4451, "BattleScript_ArenaTurnBeginning", "SE_ARENA_TIMEUP1"],
      [3212, 4453, "BattleScript_ArenaTurnBeginning", "SE_ARENA_TIMEUP1"],
      [3220, 4464, "BattleScript_ArenaNothingDecided", "SE_DING_DONG"],
      [3232, 4478, "BattleScript_ArenaDoJudgment", "SE_ARENA_TIMEUP1"],
      [3234, 4480, "BattleScript_ArenaDoJudgment", "SE_ARENA_TIMEUP1"],
    ]);
    for (const start of starts) {
      const fanfareStart = start.opcode.id === 85;
      expect(start.sourceInvocation).toMatchObject({
        mnemonic: fanfareStart ? "fanfare" : "playse",
        macro: { declarationLine: fanfareStart ? 503 : 498 },
      });
      expect(start.operandWidths).toEqual([2]);
      expect(start.operandEmissions).toEqual([
        expect.objectContaining({
          directive: ".2byte",
          macroEmission: {
            macro: fanfareStart ? "fanfare" : "playse",
            line: fanfareStart ? 505 : 500,
            wrapperPath: [fanfareStart ? "fanfare" : "playse"],
          },
        }),
      ]);
    }
  });

  it("executes every catalogued start through one attacker-owned immutable event", () => {
    for (const [index, target] of audioStarts.entries()) {
      const songId = target.operands[0]!.expression === "MUS_LEVEL_UP"
        ? 0x016f
        : target.operands[0]!.expression === "SE_DING_DONG"
          ? 0x009e
          : 0x00f0;
      const battler = (index % 4) as 0 | 1 | 2 | 3;
      const initial = stateAt(target, createBattleScriptSchedulerState({
        messageDisplayActive: true,
        pauseCounterBattle: 9,
        activeBattler: 3,
        pendingControllerBattlers: battler === 1 ? [0] : [1],
      }));
      let receivedOperand: unknown;
      const result = stepBattleScriptMachine(
        program,
        initial,
        handlers((_context, operand) => {
          receivedOperand = operand;
          return songId;
        }, () => battler),
      );
      expect(result.kind).toBe("advanced");
      expect(receivedOperand).toBe(target.operands[0]);
      expect(result.state.programCounter).toBe(target.programCounter + 1);
      expect(result.state.scheduler).toEqual({
        messageDisplayActive: true,
        pauseCounterBattle: 9,
        activeBattler: battler,
        pendingControllerBattlers: battler === 1 ? [0, 1] : [1, battler],
      });
      expect(result.state.events).toEqual([{
        kind: target.opcodeId === 84 ? "play-se" : "play-fanfare",
        battler,
        songId,
        sequence: 1,
        provenance: {
          programCounter: target.programCounter,
          opcodeId: target.opcodeId,
          opcodeName: target.opcodeName,
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
      expect(initial.scheduler.activeBattler).toBe(3);
    }
  });

  it("keeps PLAYSE and FANFARE distinct and never consults the local idle gate", () => {
    const seResult = stepBattleScriptMachine(program, stateAt(playSe), handlers(() => 0xffff));
    const fanfareResult = stepBattleScriptMachine(program, stateAt(fanfare), handlers(() => 0));
    expect(seResult.kind).toBe("advanced");
    expect(fanfareResult.kind).toBe("advanced");
    expect(seResult.state.events[0]).toMatchObject({ kind: "play-se", songId: 0xffff });
    expect(fanfareResult.state.events[0]).toMatchObject({ kind: "play-fanfare", songId: 0 });
  });

  it("requires exactly one two-byte operand before consulting either source port", () => {
    let halfwordCalls = 0;
    let attackerCalls = 0;
    for (const operands of [
      Object.freeze([]),
      Object.freeze([{ ...playSe.operands[0]!, widthBytes: 1 as const }]),
      Object.freeze([playSe.operands[0]!, playSe.operands[0]!]),
    ]) {
      const malformed = Object.freeze({ ...playSe, operands });
      const malformedProgram = Object.freeze({
        ...program,
        instructions: Object.freeze(program.instructions.map((instruction) =>
          instruction.programCounter === playSe.programCounter ? malformed : instruction
        )),
      });
      const result = stepBattleScriptMachine(
        malformedProgram,
        stateAt(playSe),
        handlers(() => {
          halfwordCalls += 1;
          return 1;
        }, () => {
          attackerCalls += 1;
          return 0;
        }),
      );
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toMatchObject({
        kind: "invalid-source-operand",
        opcodeId: 84,
        expected: "u16",
      });
      expect(result.state.events).toEqual([]);
    }
    expect(halfwordCalls).toBe(0);
    expect(attackerCalls).toBe(0);
  });

  it("identity-blocks when song or attacker source context is unavailable", () => {
    const initial = stateAt(playSe);
    const missingSong = stepBattleScriptMachine(program, initial, handlers(() => null));
    expect(missingSong.kind).toBe("blocked");
    if (missingSong.kind !== "blocked") throw new Error("expected missing-song block");
    expect(missingSong.reason).toEqual({
      kind: "source-context-unavailable",
      programCounter: playSe.programCounter,
      opcodeId: 84,
      opcodeName: "B_SCR_OP_PLAYSE",
      port: "resolve-halfword",
      operandExpression: "SE_ARENA_TIMEUP1",
    });
    expect(missingSong.state).toBe(initial);

    const missingAttacker = stepBattleScriptMachine(
      program,
      initial,
      handlers(() => 1, () => null),
    );
    expect(missingAttacker.kind).toBe("blocked");
    if (missingAttacker.kind !== "blocked") throw new Error("expected missing-attacker block");
    expect(missingAttacker.reason).toEqual({
      kind: "source-context-unavailable",
      programCounter: playSe.programCounter,
      opcodeId: 84,
      opcodeName: "B_SCR_OP_PLAYSE",
      port: "resolve-attacker",
      operandExpression: "gBattlerAttacker",
    });
    expect(missingAttacker.state).toBe(initial);
  });

  it.each([-1, 0x10000, 1.5, Number.NaN])(
    "structured-halts malformed resolved song u16 %s without effects",
    (songId) => {
      const initial = stateAt(fanfare);
      const result = stepBattleScriptMachine(program, initial, handlers(() => songId));
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toEqual({
        kind: "invalid-source-operand",
        programCounter: fanfare.programCounter,
        opcodeId: 85,
        opcodeName: "B_SCR_OP_FANFARE",
        operandExpression: "MUS_LEVEL_UP",
        expected: "u16",
        received: String(songId),
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
      const initial = stateAt(fanfare);
      const result = stepBattleScriptMachine(
        program,
        initial,
        handlers(() => 1, () => attacker as 0),
      );
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toEqual({
        kind: "invalid-source-battler",
        programCounter: fanfare.programCounter,
        opcodeId: 85,
        opcodeName: "B_SCR_OP_FANFARE",
        received: String(attacker),
      });
      expect(result.state.scheduler).toBe(initial.scheduler);
      expect(result.state.rulesContext).toBe(initial.rulesContext);
      expect(result.state.rng).toBe(initial.rng);
      expect(result.state.events).toBe(initial.events);
    },
  );

  it("acknowledges command receipt immediately and only for the attacker", () => {
    const result = stepBattleScriptMachine(
      program,
      stateAt(playSe, createBattleScriptSchedulerState({
        activeBattler: 3,
        pendingControllerBattlers: [0],
      })),
      handlers(() => 0x1234, () => 2),
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
    expect(acknowledgeBattleScriptController(acknowledged, 2)).toBe(acknowledged);
    expect(result.state.scheduler.pendingControllerBattlers).toEqual([0, 2]);
  });

  it("replays deterministically and composes to exactly eighteen supported IDs", () => {
    const makeResult = () => stepBattleScriptMachine(
      program,
      stateAt(fanfare),
      handlers(() => 0x55aa, () => 3),
    );
    expect(makeResult()).toEqual(makeResult());

    const sourceHandlers = handlers(() => 1);
    expect(Object.keys(sourceHandlers).map(Number).sort((left, right) => left - right)).toEqual([
      16, 17, 18, 20, 57, 58, 84, 85, 131,
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
      16, 17, 18, 20, 37, 38, 39, 40, 57, 58, 60, 61, 62, 65, 84, 85, 131, 141,
    ]);
  });
});
