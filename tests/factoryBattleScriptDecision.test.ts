import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  createBattleState,
  parseBattleState,
  serializeBattleState,
  type BattleState,
} from "../src/engine/battleDecisionBoundary.ts";
import {
  createFactoryAsleepMoveBattleState,
  reduceFactoryAsleepMoveDecision,
  submitFactoryAsleepMoveDecision,
  type FactoryAsleepMoveConfig,
  type FactoryBattleScriptDecisionRules,
} from "../src/engine/factoryBattleScriptDecision.ts";
import {
  submitFactoryAiMaskZeroDecision,
  type FactoryAiMaskZeroView,
} from "../src/engine/factoryAiDecisionPolicy.ts";
import {
  acknowledgeBattleScriptMachineController,
  createBattleScriptMachine,
  createBattleScriptSchedulerState,
} from "../src/engine/battleScriptMachine.ts";
import {
  loadBattleScriptProgram,
  resolveBattleScriptLabel,
} from "../src/engine/battleScriptProgram.ts";
import {
  BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE,
} from "../src/engine/battleScriptSourceConstants.ts";

const program = loadBattleScriptProgram();
const config: FactoryAsleepMoveConfig = {
  playerSetId: 15,
  trainerSetId: 291,
  commandSide: "player",
  playerHp: 110,
  trainerHp: 135,
  sleepTurns: 4,
  rngSeed: 0xf4c9_6838,
  requestId: 41,
};
const submission = {
  requestId: 41,
  side: "player",
  decision: { kind: "use-move", moveSlot: 1, targetBattler: 0 },
} as const;
const trainerConfig: FactoryAsleepMoveConfig = {
  ...config,
  commandSide: "trainer",
  sleepTurns: 4,
  rngSeed: 1,
  requestId: 73,
};
const trainerAiView: FactoryAiMaskZeroView = Object.freeze({
  schema: "factory-ai-view/v1",
  mode: "factory-level-50-singles",
  active: Object.freeze({ aiBattler: 1, targetBattler: 0 }),
  factory: Object.freeze({
    levelMode: 0,
    battleMode: 0,
    factoryWinStreak: 0,
    trainerOpponentId: 50,
  }),
  moves: Object.freeze([85, 86, 69, 273] as const),
});

function initial() {
  return createFactoryAsleepMoveBattleState(config);
}

function assertDeepFrozen(value: unknown, seen = new Set<object>()): void {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  expect(Object.isFrozen(value)).toBe(true);
  for (const child of Object.values(value)) assertDeepFrozen(child, seen);
}

describe("Factory asleep move decision-to-machine vertical slice", () => {
  it("constructs the validated immutable Level-50 singles request from real Factory sets", () => {
    const mutable = { ...config };
    const state = createFactoryAsleepMoveBattleState(mutable);
    mutable.playerHp = 1;
    mutable.sleepTurns = 7;

    expect(state).toMatchObject({
      schemaVersion: 1,
      revision: 0,
      rng: { value: 0xf4c9_6838, calls: 0 },
      boundary: {
        kind: "decision-required",
        request: {
          kind: "command",
          requestId: 41,
          side: "player",
          battler: 0,
          legalDecisions: [
            { kind: "use-move", moveSlot: 0, targetBattler: 1 },
            { kind: "use-move", moveSlot: 1, targetBattler: 0 },
            { kind: "use-move", moveSlot: 2, targetBattler: 0 },
            { kind: "use-move", moveSlot: 3, targetBattler: 1 },
          ],
        },
      },
      rules: {
        adapter: "factory-asleep-move/v1",
        phase: "awaiting-command",
        factory: {
          level: 50,
          playerSetId: 15,
          trainerSetId: 291,
          playerSpecies: "SPECIES_TYROGUE",
          trainerSpecies: "SPECIES_PLUSLE",
        },
        selectedMove: null,
        rulesContext: {
          currentMove: 0,
          atkCancelerTracker: 0,
          absentBattlerFlags: 12,
        },
      },
    });
    assertDeepFrozen(state);
    expect(state.rules.rulesContext.battlers[0]).toMatchObject({
      ability: 62,
      hp: 110,
      item: 196,
      moves: [183, 182, 104, 263],
      pp: [30, 10, 15, 20],
      statStages: [6, 6, 6, 6, 6, 6, 6, 6],
      status1: 4,
    });
    expect(state.rules.rulesContext.battlers[1]).toMatchObject({
      ability: 57,
      hp: 135,
      item: 171,
      moves: [85, 86, 69, 273],
      pp: [15, 20, 20, 10],
      statStages: [6, 6, 6, 6, 6, 6, 6, 6],
    });
  });

  it("constructs the trainer-owned asleep request with source-derived singles targets", () => {
    const state = createFactoryAsleepMoveBattleState(trainerConfig);

    expect(state.boundary).toEqual({
      kind: "decision-required",
      request: {
        kind: "command",
        requestId: 73,
        side: "trainer",
        battler: 1,
        legalDecisions: [
          { kind: "use-move", moveSlot: 0, targetBattler: 0 },
          { kind: "use-move", moveSlot: 1, targetBattler: 0 },
          { kind: "use-move", moveSlot: 2, targetBattler: 0 },
          { kind: "use-move", moveSlot: 3, targetBattler: 1 },
        ],
      },
    });
    expect(state.rules.rulesContext).toMatchObject({
      selectorRoles: {
        attacker: 1,
        target: 0,
        effectBattler: 0,
      },
      scriptingBattler: 1,
    });
    expect(state.rules.rulesContext.battlers[0]).toMatchObject({
      status1: 0,
      moves: [183, 182, 104, 263],
    });
    expect(state.rules.rulesContext.battlers[1]).toMatchObject({
      status1: 4,
      moves: [85, 86, 69, 273],
      pp: [15, 20, 20, 10],
    });
    assertDeepFrozen(state);
  });

  it("pins the real source labels and executed opcode path without registering opcode 0", () => {
    const entry = resolveBattleScriptLabel(program, "BattleScript_MoveUsedIsAsleep")!;
    const moveEnd = resolveBattleScriptLabel(program, "BattleScript_MoveEnd")!;
    expect(entry.sourceLine).toBe(3717);
    expect(program.instructions.slice(entry.programCounter, entry.programCounter + 4).map(
      ({ opcodeId, opcodeName, source }) => [
        opcodeId,
        opcodeName,
        source.statementLine,
      ],
    )).toEqual([
      [16, "B_SCR_OP_PRINTSTRING", 3718],
      [18, "B_SCR_OP_WAITMESSAGE", 3719],
      [100, "B_SCR_OP_STATUSANIMATION", 3720],
      [40, "B_SCR_OP_GOTO", 3721],
    ]);
    expect(program.instructions[moveEnd.programCounter]).toMatchObject({
      opcodeId: 46,
      opcodeName: "B_SCR_OP_SETBYTE",
      dispatcher: "Cmd_setbyte",
      source: { label: "BattleScript_MoveEnd", statementLine: 268 },
    });
    expect(program.instructions[moveEnd.programCounter + 1]).toMatchObject({
      opcodeId: 73,
      opcodeName: "B_SCR_OP_MOVEEND",
      dispatcher: "Cmd_moveend",
      source: { label: "BattleScript_MoveEnd", statementLine: 268 },
    });
    const protect = resolveBattleScriptLabel(
      program,
      "BattleScript_EffectProtect",
    )!;
    expect(program.instructions[protect.programCounter]).toMatchObject({
      opcodeId: 0,
      opcodeName: "B_SCR_OP_ATTACKCANCELER",
    });
  });

  it("submits one legal PROTECT choice, executes message then status animation, and stops honestly", () => {
    const ambient = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("ambient randomness is forbidden");
    });
    try {
      const state = initial();
      const result = submitFactoryAsleepMoveDecision(state, submission);
      expect(ambient).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        kind: "machine-barrier",
        barrier: {
          kind: "battle-script",
          entryLabel: "BattleScript_MoveUsedIsAsleep",
          opcodeId: 73,
          opcodeName: "B_SCR_OP_MOVEEND",
          dispatcher: "Cmd_moveend",
          instructionsExecuted: 68,
        },
        events: [
          {
            sequence: 0,
            payload: {
              kind: "message",
              messageId: "STRINGID_PKMNFASTASLEEP",
              substitutions: ["TYROGUE"],
            },
          },
          {
            sequence: 1,
            payload: {
              kind: "status-animation",
              battler: 0,
              isStatus2: 0,
              status: 3,
            },
          },
        ],
      });
      expect(result.state).toMatchObject({
        revision: 1,
        nextEventSequence: 2,
        rng: { value: 0xf4c9_6838, calls: 0 },
        rules: {
          phase: "move-end-barrier",
          selectedMove: {
            slot: 1,
            moveId: 182,
            entryScript: "BattleScript_EffectProtect",
          },
          rulesContext: {
            currentMove: 182,
            currentMovePosition: 1,
            atkCancelerTracker: 2,
            hitMarker: BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE,
            moveendState: 0,
          },
        },
      });
      expect(result.state.rules.rulesContext.battlers[0]).toMatchObject({
        status1: 3,
        pp: [30, 10, 15, 20],
      });
      expect(state.rules.rulesContext.battlers[0].status1).toBe(4);
      expect(state.rules.rulesContext.currentMove).toBe(0);
      expect(state.rng).toEqual({ value: 0xf4c9_6838, calls: 0 });
      assertDeepFrozen(result);
    } finally {
      ambient.mockRestore();
    }
  });

  it("drives trainer Wish from mask-0 AI through the same asleep script machine without splitting RNG", () => {
    const ambient = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("ambient randomness is forbidden");
    });
    try {
      const state = createFactoryAsleepMoveBattleState(trainerConfig);
      const result = submitFactoryAiMaskZeroDecision(
        state,
        trainerAiView,
        reduceFactoryAsleepMoveDecision,
      );

      expect(ambient).not.toHaveBeenCalled();
      expect(result.trace.draws).toHaveLength(5);
      expect(result.trace.draws[0]).toMatchObject({
        ordinal: 1,
        before: { value: 1, calls: 0 },
      });
      expect(result.trace.draws[4]).toMatchObject({
        ordinal: 5,
        after: { value: 0x79e3_9ac4, calls: 5 },
      });
      expect(result.submission).toEqual({
        requestId: 73,
        side: "trainer",
        decision: { kind: "use-move", moveSlot: 3, targetBattler: 1 },
      });
      expect(result.rng).toEqual({ value: 0x79e3_9ac4, calls: 5 });
      expect(result.transition).toMatchObject({
        kind: "machine-barrier",
        barrier: {
          kind: "battle-script",
          entryLabel: "BattleScript_MoveUsedIsAsleep",
          opcodeId: 73,
          opcodeName: "B_SCR_OP_MOVEEND",
          dispatcher: "Cmd_moveend",
          instructionsExecuted: 68,
        },
        events: [
          {
            sequence: 0,
            payload: {
              kind: "message",
              messageId: "STRINGID_PKMNFASTASLEEP",
              substitutions: ["PLUSLE"],
            },
          },
          {
            sequence: 1,
            payload: {
              kind: "status-animation",
              battler: 1,
              isStatus2: 0,
              status: 3,
            },
          },
        ],
        state: {
          revision: 1,
          nextEventSequence: 2,
          rng: { value: 0x79e3_9ac4, calls: 5 },
          rules: {
            phase: "move-end-barrier",
            selectedMove: {
              slot: 3,
              moveId: 273,
              entryScript: "BattleScript_EffectWish",
            },
            rulesContext: {
              selectorRoles: {
                attacker: 1,
                target: 1,
                effectBattler: 1,
              },
              currentMove: 273,
              currentMovePosition: 3,
              atkCancelerTracker: 2,
              hitMarker: BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE,
              moveendState: 0,
            },
          },
        },
      });
      expect(result.transition.state.rng).toEqual(result.rng);
      expect(result.transition.state.rules.rulesContext.battlers[1]).toMatchObject({
        status1: 3,
        pp: [15, 20, 20, 10],
      });
      expect(state.rng).toEqual({ value: 1, calls: 0 });
      expect(state.rules.rulesContext.battlers[1].status1).toBe(4);
      assertDeepFrozen(result);
    } finally {
      ambient.mockRestore();
    }
  });

  it("canonically replays the trainer AI-to-machine transition", () => {
    const state = createFactoryAsleepMoveBattleState(trainerConfig);
    const restored = parseBattleState(
      serializeBattleState(state),
    ) as BattleState<FactoryBattleScriptDecisionRules>;

    const first = submitFactoryAiMaskZeroDecision(
      state,
      trainerAiView,
      reduceFactoryAsleepMoveDecision,
    );
    const replay = submitFactoryAiMaskZeroDecision(
      restored,
      trainerAiView,
      reduceFactoryAsleepMoveDecision,
    );

    expect(replay).toEqual(first);
    expect(serializeBattleState(replay.transition.state)).toBe(
      serializeBattleState(first.transition.state),
    );
  });

  it("canonical parse/serialize replay reproduces the identical transition", () => {
    const state = initial();
    const restored = parseBattleState(
      serializeBattleState(state),
    ) as BattleState<FactoryBattleScriptDecisionRules>;
    const first = submitFactoryAsleepMoveDecision(state, submission);
    const replay = submitFactoryAsleepMoveDecision(restored, submission);

    expect(replay).toEqual(first);
    expect(serializeBattleState(replay.state)).toBe(
      serializeBattleState(first.state),
    );
    expect(parseBattleState(serializeBattleState(first.state))).toEqual(first.state);
  });

  it("rejects invalid config, decision, request phase, and staged rules", () => {
    for (const invalid of [
      { ...config, playerSetId: 273 },
      { ...config, trainerSetId: 290 },
      { ...config, commandSide: "spectator" },
      { ...config, playerHp: 0 },
      { ...config, trainerHp: 0 },
      { ...config, sleepTurns: 1 },
      { ...config, sleepTurns: 8 },
      { ...config, rngSeed: -1 },
      { ...config, requestId: 0x1_0000_0000 },
      { ...config, extra: true },
    ]) {
      expect(() =>
        createFactoryAsleepMoveBattleState(
          invalid as unknown as FactoryAsleepMoveConfig,
        )).toThrow();
    }
    expect(() =>
      submitFactoryAsleepMoveDecision(initial(), {
        ...submission,
        decision: { kind: "use-move", moveSlot: 1, targetBattler: 1 },
      })).toThrow();
    expect(() =>
      submitFactoryAsleepMoveDecision(initial(), {
        ...submission,
        decision: { kind: "switch", partyIndex: 1 },
      })).toThrow();

    const source = initial();
    const badPhase = createBattleState({
      rules: {
        ...source.rules,
        phase: "move-end-barrier",
      } as FactoryBattleScriptDecisionRules,
      rngSeed: source.rng.value,
      request: source.boundary.kind === "decision-required"
        ? source.boundary.request
        : (() => {
          throw new Error("expected request");
        })(),
    });
    expect(() =>
      submitFactoryAsleepMoveDecision(
        badPhase as BattleState<FactoryBattleScriptDecisionRules>,
        submission,
      )).toThrow(/awaiting-command phase/);

    const badRules = createBattleState({
      rules: {
        ...source.rules,
        rulesContext: {
          ...source.rules.rulesContext,
          currentMove: 182,
        },
      } as FactoryBattleScriptDecisionRules,
      rngSeed: source.rng.value,
      request: source.boundary.kind === "decision-required"
        ? source.boundary.request
        : (() => {
          throw new Error("expected request");
        })(),
    });
    expect(() =>
      submitFactoryAsleepMoveDecision(
        badRules as BattleState<FactoryBattleScriptDecisionRules>,
        submission,
      )).toThrow(/invalid staged singles phase/);
  });

  it("acknowledges only scheduler ownership while preserving machine rules, RNG, events, and cursor", () => {
    const rules = Object.freeze({ marker: "immutable-rules" });
    const state = createBattleScriptMachine(
      program,
      "BattleScript_MoveUsedIsAsleep",
      rules,
      0x1234_5678,
      createBattleScriptSchedulerState({
        messageDisplayActive: true,
        pauseCounterBattle: 7,
        activeBattler: 0,
        pendingControllerBattlers: [0],
      }),
    );
    const acknowledged = acknowledgeBattleScriptMachineController(state, 0);

    expect(acknowledged).not.toBe(state);
    expect(acknowledged.scheduler.pendingControllerBattlers).toEqual([]);
    expect(acknowledged.programCounter).toBe(state.programCounter);
    expect(acknowledged.callStack).toBe(state.callStack);
    expect(acknowledged.rulesContext).toBe(state.rulesContext);
    expect(acknowledged.rng).toBe(state.rng);
    expect(acknowledged.events).toBe(state.events);
    expect(acknowledgeBattleScriptMachineController(acknowledged, 0)).toBe(
      acknowledged,
    );
    assertDeepFrozen(acknowledged);
  });

  it("keeps the production adapter outside presentation, browser, oracle, and emulator layers", () => {
    const source = readFileSync(
      new URL("../src/engine/factoryBattleScriptDecision.ts", import.meta.url),
      "utf8",
    );
    for (const forbidden of [
      "./factoryAiDecisionPolicy.ts",
      "./core.ts",
      "./battleScene.ts",
      "Render",
      "document.",
      "window.",
      "Date.",
      "setTimeout",
      "Math.random",
      "oracle",
      "mgba",
      "emulator",
    ]) {
      expect(source).not.toContain(forbidden);
    }
    expect(source).not.toMatch(/handlers\\s*\\[\\s*0\\s*\\]/);
    expect(source).not.toMatch(/handlers\\s*\\[\\s*73\\s*\\]/);
  });
});
