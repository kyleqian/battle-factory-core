import { describe, expect, it } from "vitest";
import type {
  BattleScriptSemanticEventPayload,
} from "../src/engine/battleScriptEvents.ts";
import {
  createBattleScriptControlHandlers,
  createBattleScriptMachine,
  drawBattleScriptRng,
  runBattleScriptMachine,
  stepBattleScriptMachine,
  transitionBattleScriptCommand,
  type BattleScriptCommandTransition,
  type BattleScriptOpcodeHandlers,
} from "../src/engine/battleScriptMachine.ts";
import { replayBattleScriptPresentation } from "../src/engine/battleScriptPresentation.ts";
import {
  loadBattleScriptProgram,
  resolveBattleScriptLabel,
} from "../src/engine/battleScriptProgram.ts";

const program = loadBattleScriptProgram();

type FixtureRules = Readonly<{
  activeBattler: number;
  hp: readonly [number, number];
}>;

function rules(playerHp = 100, opponentHp = 100): FixtureRules {
  return Object.freeze({
    activeBattler: 0,
    hp: Object.freeze([playerHp, opponentHp]) as readonly [number, number],
  });
}

function syntheticEvents(): readonly BattleScriptSemanticEventPayload[] {
  return Object.freeze([
    Object.freeze({
      kind: "message" as const,
      messageId: "STRINGID_SYNTHETIC",
      substitutions: Object.freeze(["attacker", "move"]),
    }),
    Object.freeze({ kind: "hp-change" as const, battler: 1, from: 100, to: 73 }),
    Object.freeze({ kind: "status-change" as const, battler: 1, from: "none", to: "poison" }),
    Object.freeze({
      kind: "stat-stage-change" as const,
      battler: 1,
      stat: "accuracy" as const,
      from: 6,
      to: 5,
    }),
    Object.freeze({
      kind: "animation" as const,
      animationId: "B_ANIM_SYNTHETIC",
      battler: 1,
      arguments: Object.freeze(["arg0"]),
    }),
    Object.freeze({
      kind: "switch" as const,
      side: "opponent" as const,
      fromPartyIndex: 0,
      toPartyIndex: 1,
    }),
    Object.freeze({ kind: "outcome" as const, outcome: "player-win" as const }),
  ]);
}

function createSyntheticExecution() {
  const initial = createBattleScriptMachine(
    program,
    "BattleScript_EffectHit",
    rules(),
    0x12345678,
  );
  const instruction = program.instructions[initial.programCounter]!;
  let capturedTransition: BattleScriptCommandTransition<FixtureRules> | undefined;
  const handlers: BattleScriptOpcodeHandlers<FixtureRules> = Object.freeze({
    [instruction.opcodeId]: (context) => {
      const first = drawBattleScriptRng(context.state.rng, context.instruction, "synthetic:first");
      const second = drawBattleScriptRng(first.rng, context.instruction, "synthetic:second");
      capturedTransition = transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "advance" }),
        {
          rulesContext: rules(100, 73),
          rng: second.rng,
          events: syntheticEvents(),
        },
      );
      return capturedTransition;
    },
  });
  const result = stepBattleScriptMachine(program, initial, handlers);
  return { initial, handlers, result, capturedTransition };
}

describe("Battle Script rules-execution seam", () => {
  it("commits control, a frozen rules context, audited RNG, and typed events atomically", () => {
    const { initial, result, capturedTransition } = createSyntheticExecution();
    expect(result.kind).toBe("advanced");
    expect(Object.isFrozen(capturedTransition)).toBe(true);
    expect(Object.isFrozen(capturedTransition!.events)).toBe(true);
    expect(result.state.programCounter).toBe(initial.programCounter + 1);
    expect(result.state.rulesContext).toEqual(rules(100, 73));
    expect(result.state.rulesContext).not.toBe(initial.rulesContext);
    expect(Object.isFrozen(result.state.rulesContext)).toBe(true);
    expect(initial.rulesContext).toEqual(rules());
    expect(initial.rng).toMatchObject({ value: 0x12345678, calls: 0, ledger: [] });
    expect(result.state.rng).toMatchObject({ calls: 2 });
    expect(Object.isFrozen(result.state.rng)).toBe(true);
    expect(Object.isFrozen(result.state.rng.ledger)).toBe(true);
    expect(result.state.rng.ledger.map((entry) => [
      entry.call,
      entry.reason,
      entry.before,
      entry.after,
      entry.randomValue,
      entry.provenance.programCounter,
    ])).toEqual([
      [1, "synthetic:first", 0x12345678, 192004491, 2929, initial.programCounter],
      [2, "synthetic:second", 192004491, 2229936802, 34026, initial.programCounter],
    ]);

    expect(result.state.events.map((event) => event.kind)).toEqual([
      "message",
      "hp-change",
      "status-change",
      "stat-stage-change",
      "animation",
      "switch",
      "outcome",
    ]);
    expect(result.state.events.map((event) => event.sequence)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    for (const event of result.state.events) {
      expect(Object.isFrozen(event)).toBe(true);
      expect(event.provenance).toMatchObject({
        programCounter: initial.programCounter,
        opcodeId: program.instructions[initial.programCounter]!.opcodeId,
        opcodeName: "B_SCR_OP_JUMPIFHALFWORD",
        dispatcher: "Cmd_jumpifhalfword",
        sourceLabel: "BattleScript_EffectHit",
        instructionExecution: 1,
      });
    }
  });

  it("is deterministic from identical program, rules context, and RNG input", () => {
    const first = createSyntheticExecution().result.state;
    const second = createSyntheticExecution().result.state;
    expect(second).toEqual(first);
    expect(first.rulesContext).toEqual(second.rulesContext);
    expect(first.rng).toEqual(second.rng);
    expect(first.events).toEqual(second.events);
  });

  it("keeps all five source-safe control opcodes rules/RNG/event neutral", () => {
    const controls = createBattleScriptControlHandlers<FixtureRules>(program);
    const gotoInitial = createBattleScriptMachine(
      program,
      "BattleScript_StatUpEnd",
      rules(),
      0x89abcdef,
    );
    const goto = stepBattleScriptMachine(program, gotoInitial, controls);
    expect(goto.kind).toBe("advanced");
    expect(goto.state.rulesContext).toBe(gotoInitial.rulesContext);
    expect(goto.state.rng).toBe(gotoInitial.rng);
    expect(goto.state.events).toBe(gotoInitial.events);

    const callPc = program.instructions.findIndex(
      (instruction) => instruction.source.label === "BattleScript_SpikesOnAttacker"
        && instruction.source.statementLine === 3392,
    );
    const callInitial = Object.freeze({
      ...createBattleScriptMachine(program, "BattleScript_SpikesOnAttacker", rules(), 7),
      programCounter: callPc,
    });
    const call = stepBattleScriptMachine(program, callInitial, controls);
    expect(call.state.rulesContext).toBe(callInitial.rulesContext);
    expect(call.state.rng).toBe(callInitial.rng);
    expect(call.state.events).toBe(callInitial.events);

    const returnPc = resolveBattleScriptLabel(program, "BattleScript_PursuitDmgOnSwitchOutRet")!.programCounter;
    const returnInitial = Object.freeze({
      ...call.state,
      programCounter: returnPc,
    });
    const returned = stepBattleScriptMachine(program, returnInitial, controls);
    expect(returned.state.rulesContext).toBe(returnInitial.rulesContext);
    expect(returned.state.rng).toBe(returnInitial.rng);
    expect(returned.state.events).toBe(returnInitial.events);

    for (const label of ["BattleScript_BeatUpEnd", "BattleScript_FaintedMonEnd"]) {
      const terminalInitial = createBattleScriptMachine(program, label, rules(), 9);
      const terminal = stepBattleScriptMachine(program, terminalInitial, controls);
      expect(terminal.kind).toBe("halted");
      expect(terminal.state.rulesContext).toBe(terminalInitial.rulesContext);
      expect(terminal.state.rng).toBe(terminalInitial.rng);
      expect(terminal.state.events).toBe(terminalInitial.events);
    }
  });

  it("replays presentation without exposing or replacing rules context or RNG", () => {
    const execution = createSyntheticExecution().result.state;
    const presentation = Object.freeze({ seen: Object.freeze([]) as readonly string[], pacing: 3 });
    const replay = replayBattleScriptPresentation(
      execution,
      presentation,
      (state, event) => Object.freeze({
        ...state,
        seen: Object.freeze([...state.seen, `${event.sequence}:${event.kind}`]),
      }),
    );
    expect(replay.execution).toBe(execution);
    expect(replay.execution.rulesContext).toBe(execution.rulesContext);
    expect(replay.execution.rng).toBe(execution.rng);
    expect(replay.eventsConsumed).toBe(7);
    expect(replay.presentation).toEqual({
      pacing: 3,
      seen: [
        "1:message",
        "2:hp-change",
        "3:status-change",
        "4:stat-stage-change",
        "5:animation",
        "6:switch",
        "7:outcome",
      ],
    });
    expect(presentation).toEqual({ seen: [], pacing: 3 });
  });

  it("rejects unaccounted RNG mutation and unfrozen rules output", () => {
    const initial = createBattleScriptMachine(program, "BattleScript_EffectHit", rules(), 11);
    const instruction = program.instructions[initial.programCounter]!;
    const badRng: BattleScriptOpcodeHandlers<FixtureRules> = Object.freeze({
      [instruction.opcodeId]: (context) => transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "advance" }),
        {
          rng: Object.freeze({
            value: 12,
            calls: 0,
            ledger: Object.freeze([]),
          }),
        },
      ),
    });
    expect(() => stepBattleScriptMachine(program, initial, badRng)).toThrow(/does not match its ledger/);

    const badRules: BattleScriptOpcodeHandlers<FixtureRules> = Object.freeze({
      [instruction.opcodeId]: (context) => transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "advance" }),
        { rulesContext: { activeBattler: 0, hp: [100, 99] } },
      ),
    });
    expect(() => stepBattleScriptMachine(program, initial, badRules)).toThrow(/must be frozen/);
  });

  it("keeps unsupported and instruction-budget exits structured without hidden rules effects", () => {
    const initial = createBattleScriptMachine(program, "BattleScript_EffectHit", rules(), 13);
    const unsupported = stepBattleScriptMachine(
      program,
      initial,
      createBattleScriptControlHandlers<FixtureRules>(program),
    );
    expect(unsupported.kind).toBe("unsupported");
    expect(unsupported.state.haltReason).toMatchObject({
      kind: "unsupported-opcode",
      opcodeId: 42,
    });
    expect(unsupported.state.rulesContext).toBe(initial.rulesContext);
    expect(unsupported.state.rng).toBe(initial.rng);
    expect(unsupported.state.events).toBe(initial.events);

    const instruction = program.instructions[initial.programCounter]!;
    const loop: BattleScriptOpcodeHandlers<FixtureRules> = Object.freeze({
      [instruction.opcodeId]: (context) => transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "jump", programCounter: context.state.programCounter }),
      ),
    });
    const budget = runBattleScriptMachine(program, initial, loop, 3);
    expect(budget.kind).toBe("budget-exhausted");
    expect(budget.state.instructionsExecuted).toBe(3);
    expect(budget.state.haltReason).toEqual({
      kind: "instruction-budget",
      programCounter: initial.programCounter,
      budget: 3,
    });
    expect(budget.state.rulesContext).toBe(initial.rulesContext);
    expect(budget.state.rng).toBe(initial.rng);
    expect(budget.state.events).toBe(initial.events);
  });
});
