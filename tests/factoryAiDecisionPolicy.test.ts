import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  createBattleCommandRequest,
  createBattleForcedSwitchRequest,
  createBattleState,
  serializeBattleState,
  type BattleDecisionReducer,
  type BattleJsonObject,
  type BattleState,
} from "../src/engine/battleDecisionBoundary.ts";
import {
  chooseFactoryAiMaskZeroDecision,
  submitFactoryAiMaskZeroDecision,
  type FactoryAiMaskZeroView,
} from "../src/engine/factoryAiDecisionPolicy.ts";

const request = createBattleCommandRequest({
  kind: "command",
  requestId: 73,
  side: "trainer",
  battler: 1,
  // FRONTIER_MON_PLUSLE_2: Wish is MOVE_TARGET_USER, unlike slot 1.
  legalDecisions: [
    { kind: "use-move", moveSlot: 1, targetBattler: 0 },
    { kind: "use-move", moveSlot: 3, targetBattler: 1 },
  ],
});

const view: FactoryAiMaskZeroView = Object.freeze({
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

function choose(
  changes: Readonly<{
    view?: FactoryAiMaskZeroView;
    request?: typeof request;
    rng?: Readonly<{ value: number; calls: number }>;
  }> = {},
) {
  return chooseFactoryAiMaskZeroDecision({
    view: changes.view ?? view,
    request: changes.request ?? request,
    rng: changes.rng ?? { value: 0x1234_5678, calls: 0 },
  });
}

function assertDeepFrozen(value: unknown, seen = new Set<object>()): void {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  expect(Object.isFrozen(value)).toBe(true);
  for (const child of Object.values(value)) assertDeepFrozen(child, seen);
}

describe("source-faithful minimal Factory AI mask-0 decision policy", () => {
  it("consumes all four setup draws and the mandatory tie draw in source order", () => {
    const ambient = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("ambient randomness is forbidden");
    });
    try {
      const result = choose();

      expect(ambient).not.toHaveBeenCalled();
      expect(result.rng).toEqual({ value: 0x2684_ad1f, calls: 5 });
      expect(result.trace.draws).toEqual([
        {
          ordinal: 1,
          reason: "setup-simulated-rng-slot-0",
          kind: "setup-simulated-rng",
          moveSlot: 0,
          before: { value: 0x1234_5678, calls: 0 },
          after: { value: 0x0b71_c18b, calls: 1 },
          rawRngValue: 0x0b71_c18b,
          randomValue: 2929,
          simulatedRng: 99,
        },
        {
          ordinal: 2,
          reason: "setup-simulated-rng-slot-1",
          kind: "setup-simulated-rng",
          moveSlot: 1,
          before: { value: 0x0b71_c18b, calls: 1 },
          after: { value: 0x84ea_22a2, calls: 2 },
          rawRngValue: 0x84ea_22a2,
          randomValue: 34026,
          simulatedRng: 90,
        },
        {
          ordinal: 3,
          reason: "setup-simulated-rng-slot-2",
          kind: "setup-simulated-rng",
          moveSlot: 2,
          before: { value: 0x84ea_22a2, calls: 2 },
          after: { value: 0xd98a_7b6d, calls: 3 },
          rawRngValue: 0xd98a_7b6d,
          randomValue: 55690,
          simulatedRng: 90,
        },
        {
          ordinal: 4,
          reason: "setup-simulated-rng-slot-3",
          kind: "setup-simulated-rng",
          moveSlot: 3,
          before: { value: 0xd98a_7b6d, calls: 3 },
          after: { value: 0xf4e0_23dc, calls: 4 },
          rawRngValue: 0xf4e0_23dc,
          randomValue: 62688,
          simulatedRng: 100,
        },
        {
          ordinal: 5,
          reason: "best-move-tie-selection",
          kind: "best-move-tie",
          before: { value: 0xf4e0_23dc, calls: 4 },
          after: { value: 0x2684_ad1f, calls: 5 },
          rawRngValue: 0x2684_ad1f,
          randomValue: 9860,
        },
      ]);
      expect(result.trace.slotScores).toEqual([
        {
          moveSlot: 0,
          moveId: 85,
          legal: false,
          initialScore: 100,
          finalScore: 0,
        },
        {
          moveSlot: 1,
          moveId: 86,
          legal: true,
          initialScore: 100,
          finalScore: 100,
        },
        {
          moveSlot: 2,
          moveId: 69,
          legal: false,
          initialScore: 100,
          finalScore: 0,
        },
        {
          moveSlot: 3,
          moveId: 273,
          legal: true,
          initialScore: 100,
          finalScore: 100,
        },
      ]);
      expect(result.trace).toMatchObject({
        schema: "factory-ai-trace/v1",
        phase: "choose-move",
        mask: 0,
        maskSelection: {
          branch: {
            id: "challengeBelow2",
            flags: [],
            mask: 0,
          },
        },
        executedScoringScripts: [],
        bestMoveSlots: [1, 3],
        tie: {
          modulus: 2,
          index: 0,
          chosenDecision: {
            kind: "use-move",
            moveSlot: 1,
            targetBattler: 0,
          },
        },
      });
      expect(result.submission).toEqual({
        requestId: 73,
        side: "trainer",
        decision: { kind: "use-move", moveSlot: 1, targetBattler: 0 },
      });
      assertDeepFrozen(result);
    } finally {
      ambient.mockRestore();
    }
  });

  it("uses only the kernel legal list and still draws a tie with one best move", () => {
    const onlySlotThree = createBattleCommandRequest({
      kind: "command",
      requestId: 74,
      side: "trainer",
      battler: 1,
      legalDecisions: [
        { kind: "use-move", moveSlot: 3, targetBattler: 1 },
      ],
    });
    const result = choose({ request: onlySlotThree as typeof request });

    expect(result.trace.slotScores.map(({ legal }) => legal)).toEqual([
      false,
      false,
      false,
      true,
    ]);
    expect(result.trace.bestMoveSlots).toEqual([3]);
    expect(result.trace.tie).toEqual({
      modulus: 1,
      index: 0,
      chosenDecision: {
        kind: "use-move",
        moveSlot: 3,
        targetBattler: 1,
      },
    });
    expect(result.trace.draws).toHaveLength(5);
    expect(result.rng.calls).toBe(5);
  });

  it("normalizes caller input for canonical serialization and deterministic replay", () => {
    const reorderedView = JSON.parse(JSON.stringify({
      moves: [85, 86, 69, 273],
      factory: {
        trainerOpponentId: 50,
        factoryWinStreak: 0,
        battleMode: 0,
        levelMode: 0,
      },
      active: { targetBattler: 0, aiBattler: 1 },
      mode: "factory-level-50-singles",
      schema: "factory-ai-view/v1",
    }));
    const reorderedRequest = JSON.parse(JSON.stringify({
      legalDecisions: [
        { targetBattler: 0, moveSlot: 1, kind: "use-move" },
        { targetBattler: 1, moveSlot: 3, kind: "use-move" },
      ],
      battler: 1,
      side: "trainer",
      requestId: 73,
      kind: "command",
    }));
    const replay = chooseFactoryAiMaskZeroDecision({
      rng: JSON.parse('{"calls":0,"value":305419896}'),
      request: reorderedRequest,
      view: reorderedView,
    });
    const first = choose();

    expect(replay).toEqual(first);
    expect(JSON.stringify(replay)).toBe(JSON.stringify(first));
    expect(choose()).toEqual(first);
  });

  it("does not retain mutable caller inputs and returns a recursively frozen trace", () => {
    const mutableView = structuredClone(view) as unknown as {
      schema: "factory-ai-view/v1";
      mode: "factory-level-50-singles";
      active: { aiBattler: 1; targetBattler: 0 };
      factory: {
        levelMode: 0;
        battleMode: 0;
        factoryWinStreak: number;
        trainerOpponentId: number;
      };
      moves: [number, number, number, number];
    };
    const result = choose({ view: mutableView });
    mutableView.factory.factoryWinStreak = 28;
    mutableView.moves[1] = 0;

    expect(result.trace.maskSelection.inputs.factoryWinStreak).toBe(0);
    expect(result.trace.slotScores[1]).toMatchObject({
      moveId: 86,
      legal: true,
    });
    assertDeepFrozen(result);
  });

  it.each([
    ["mask 1", { factory: { ...view.factory, factoryWinStreak: 14 } }, /mask 1/],
    ["mask 7", { factory: { ...view.factory, factoryWinStreak: 28 } }, /mask 7/],
    ["Frontier Brain", { factory: { ...view.factory, trainerOpponentId: 1022 } }, /frontierBrain/],
    ["Tent mask 0", { factory: { ...view.factory, levelMode: 2 } }, /Level-50/],
    ["Open Level", { factory: { ...view.factory, levelMode: 1 } }, /Level-50/],
    ["doubles", { factory: { ...view.factory, battleMode: 1 } }, /singles/],
  ] as const)("rejects unsupported %s views", (_name, changes, message) => {
    expect(() =>
      choose({
        view: {
          ...view,
          ...changes,
        } as FactoryAiMaskZeroView,
      })).toThrow(message);
  });

  it("rejects unsupported requests and malformed views, RNG, and top-level inputs", () => {
    const switchRequest = createBattleCommandRequest({
      kind: "command",
      requestId: 75,
      side: "trainer",
      battler: 1,
      legalDecisions: [
        { kind: "use-move", moveSlot: 1, targetBattler: 0 },
        { kind: "switch", partyIndex: 2 },
      ],
    });
    const playerRequest = createBattleCommandRequest({
      kind: "command",
      requestId: 76,
      side: "player",
      battler: 0,
      legalDecisions: [
        { kind: "use-move", moveSlot: 1, targetBattler: 1 },
      ],
    });
    const moveNoneRequest = createBattleCommandRequest({
      kind: "command",
      requestId: 77,
      side: "trainer",
      battler: 1,
      legalDecisions: [
        { kind: "use-move", moveSlot: 0, targetBattler: 0 },
      ],
    });
    for (const [invalid, message] of [
      [
        { view, request: switchRequest, rng: { value: 0, calls: 0 } },
        /switch action prechecks/,
      ],
      [
        { view, request: playerRequest, rng: { value: 0, calls: 0 } },
        /trainer battler-1/,
      ],
      [
        {
          view: { ...view, moves: [0, 86, 69, 273] },
          request: moveNoneRequest,
          rng: { value: 0, calls: 0 },
        },
        /MOVE_NONE/,
      ],
      [
        {
          view: { ...view, active: { aiBattler: 0, targetBattler: 1 } },
          request,
          rng: { value: 0, calls: 0 },
        },
        /trainer battler 1/,
      ],
      [
        { view: { ...view, moves: [85, 86, 69] }, request, rng: { value: 0, calls: 0 } },
        /four-slot tuple/,
      ],
      [
        { view, request, rng: { value: -1, calls: 0 } },
        /RNG.value/,
      ],
      [
        { view, request, rng: { value: 0, calls: -1 } },
        /RNG.calls/,
      ],
      [
        { view, request, rng: { value: 0, calls: 0 }, extra: true },
        /exactly keys/,
      ],
    ] as const) {
      expect(() =>
        chooseFactoryAiMaskZeroDecision(invalid as never)).toThrow(message);
    }

    const forced = createBattleForcedSwitchRequest({
      kind: "forced-switch",
      requestId: 78,
      side: "trainer",
      battler: 1,
      faintedPartyIndex: 0,
      legalPartyIndexes: [1, 2],
    });
    expect(() =>
      chooseFactoryAiMaskZeroDecision({
        view,
        request: forced as never,
        rng: { value: 0, calls: 0 },
      })).toThrow(/command requests/);

    const duplicateSlotRequest = createBattleCommandRequest({
      kind: "command",
      requestId: 79,
      side: "trainer",
      battler: 1,
      legalDecisions: [
        { kind: "use-move", moveSlot: 3, targetBattler: 0 },
        { kind: "use-move", moveSlot: 3, targetBattler: 1 },
      ],
    });
    expect(() =>
      choose({
        request: duplicateSlotRequest as typeof request,
      })).toThrow(/ambiguous duplicate decisions/);
  });
});

type FixtureRules = BattleJsonObject & Readonly<{
  acceptedMoveSlot: number | null;
}>;

describe("Factory AI composition through BattleDecisionBoundary", () => {
  it("selects a real Factory self-targeting Wish slot and preserves its kernel target through submission", () => {
    const state = createBattleState({
      rules: { acceptedMoveSlot: null },
      rngSeed: 1,
      request,
    }) as BattleState<FixtureRules>;
    const reducer: BattleDecisionReducer<FixtureRules> = (context) => {
      expect(context.decision).toEqual({
        kind: "use-move",
        moveSlot: 3,
        targetBattler: 1,
      });
      expect(context.rng.snapshot()).toEqual({
        value: 0x79e3_9ac4,
        calls: 5,
      });
      return {
        rules: { acceptedMoveSlot: 3 },
        events: [],
        boundary: { kind: "terminal", outcome: "player-win" },
      };
    };

    const composed = submitFactoryAiMaskZeroDecision(state, view, reducer);

    expect(composed.trace.bestMoveSlots).toEqual([1, 3]);
    expect(composed.trace.tie).toMatchObject({
      modulus: 2,
      index: 1,
      chosenDecision: {
        kind: "use-move",
        moveSlot: 3,
        targetBattler: 1,
      },
    });
    expect(composed.submission).toEqual({
      requestId: 73,
      side: "trainer",
      decision: { kind: "use-move", moveSlot: 3, targetBattler: 1 },
    });
    expect(composed.transition.state.rng).toEqual({
      value: 0x79e3_9ac4,
      calls: 5,
    });
    assertDeepFrozen(composed);
  });

  it("submits the AI decision through the published boundary, synchronizes all draws, and reaches the next request", () => {
    const state = createBattleState({
      rules: { acceptedMoveSlot: null },
      rngSeed: 0x1234_5678,
      request,
    }) as BattleState<FixtureRules>;
    const reducer: BattleDecisionReducer<FixtureRules> = (context) => {
      expect(context.request).toEqual(request);
      expect(context.decision).toEqual({
        kind: "use-move",
        moveSlot: 1,
        targetBattler: 0,
      });
      expect(context.rng.snapshot()).toEqual({
        value: 0x2684_ad1f,
        calls: 5,
      });
      expect(context.rng.draw("post-choice-rules-draw")).toBe(38967);
      return {
        rules: { acceptedMoveSlot: context.decision.kind === "use-move"
          ? context.decision.moveSlot
          : null },
        events: [],
        boundary: {
          kind: "decision-required",
          request: {
            kind: "command",
            requestId: 74,
            side: "player",
            battler: 0,
            legalDecisions: [
              { kind: "use-move", moveSlot: 0, targetBattler: 1 },
            ],
          },
        },
      };
    };

    const composed = submitFactoryAiMaskZeroDecision(state, view, reducer);

    expect(composed.submission).toEqual({
      requestId: 73,
      side: "trainer",
      decision: { kind: "use-move", moveSlot: 1, targetBattler: 0 },
    });
    expect(composed.rng).toEqual({ value: 0x2684_ad1f, calls: 5 });
    expect(composed.transition).toMatchObject({
      kind: "decision-required",
      state: {
        revision: 1,
        rules: { acceptedMoveSlot: 1 },
        rng: { value: 0x9837_88a6, calls: 6 },
      },
      nextRequest: {
        requestId: 74,
        side: "player",
      },
    });
    expect(state.rng).toEqual({ value: 0x1234_5678, calls: 0 });
    assertDeepFrozen(composed);
  });

  it("replays the identical composed transition from canonical BattleState serialization", () => {
    const state = createBattleState({
      rules: { acceptedMoveSlot: null },
      rngSeed: 0x1234_5678,
      request,
    }) as BattleState<FixtureRules>;
    const reducer: BattleDecisionReducer<FixtureRules> = (context) => ({
      rules: {
        acceptedMoveSlot: context.decision.kind === "use-move"
          ? context.decision.moveSlot
          : null,
      },
      events: [],
      boundary: { kind: "terminal", outcome: "player-win" },
    });
    const restored = JSON.parse(
      serializeBattleState(state),
    ) as BattleState<FixtureRules>;

    const first = submitFactoryAiMaskZeroDecision(state, view, reducer);
    const replay = submitFactoryAiMaskZeroDecision(restored, view, reducer);

    expect(replay).toEqual(first);
    expect(serializeBattleState(replay.transition.state)).toBe(
      serializeBattleState(first.transition.state),
    );
    expect(first.transition).toMatchObject({
      kind: "terminal",
      outcome: "player-win",
      state: { rng: { value: 0x2684_ad1f, calls: 5 } },
    });
  });

  it("rejects forced-switch and non-decision boundaries before policy execution", () => {
    const forced = createBattleState({
      rules: { acceptedMoveSlot: null },
      rngSeed: 0,
      request: createBattleForcedSwitchRequest({
        kind: "forced-switch",
        requestId: 80,
        side: "trainer",
        battler: 1,
        faintedPartyIndex: 0,
        legalPartyIndexes: [1],
      }),
    }) as BattleState<FixtureRules>;
    const reducer: BattleDecisionReducer<FixtureRules> = () => {
      throw new Error("must not run");
    };
    expect(() =>
      submitFactoryAiMaskZeroDecision(forced, view, reducer)).toThrow(
        /forced switches/,
      );

    const terminal = {
      ...forced,
      boundary: Object.freeze({
        kind: "terminal" as const,
        outcome: "trainer-win" as const,
      }),
    };
    expect(() =>
      submitFactoryAiMaskZeroDecision(terminal, view, reducer)).toThrow(
        /current Battle decision request/,
      );
  });

  it("keeps the policy and composition seam outside presentation, browser, oracle, and emulator layers", () => {
    const source = readFileSync(
      new URL("../src/engine/factoryAiDecisionPolicy.ts", import.meta.url),
      "utf8",
    );
    expect(source).toContain("submitBattleDecision(");
    expect(source).toContain("selectFactoryAiMask(");
    for (const forbidden of [
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
  });
});
