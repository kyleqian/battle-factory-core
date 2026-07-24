import { describe, expect, it, vi } from "vitest";
import {
  createBattleCommandRequest,
  createBattleForcedSwitchRequest,
  createBattleState,
  parseBattleState,
  serializeBattleState,
  submitBattleDecision,
  type BattleBoundary,
  type BattleDecisionReducer,
  type BattleDecisionSubmission,
  type BattleJsonObject,
  type BattleState,
} from "../src/engine/battleDecisionBoundary.ts";
import { advanceRngValue } from "../src/engine/rng.ts";

type FixtureRules = BattleJsonObject & Readonly<{
  activePartyIndexes: Readonly<{
    player: number;
    trainer: number;
  }>;
  submittedSides: readonly string[];
}>;

function playerRequest(requestId = 7) {
  return createBattleCommandRequest({
    kind: "command",
    requestId,
    side: "player",
    battler: 0,
    legalDecisions: [
      { kind: "use-move", moveSlot: 0, targetBattler: 1 },
      { kind: "use-move", moveSlot: 2, targetBattler: 1 },
      { kind: "switch", partyIndex: 1 },
    ],
  });
}

function trainerRequest(requestId = 8) {
  return createBattleCommandRequest({
    kind: "command",
    requestId,
    side: "trainer",
    battler: 1,
    legalDecisions: [
      { kind: "use-move", moveSlot: 1, targetBattler: 0 },
      { kind: "switch", partyIndex: 2 },
    ],
  });
}

function forcedPlayerRequest(requestId = 9) {
  return createBattleForcedSwitchRequest({
    kind: "forced-switch",
    requestId,
    side: "player",
    battler: 0,
    faintedPartyIndex: 0,
    legalPartyIndexes: [1, 2],
  });
}

function fixtureState(): BattleState<FixtureRules> {
  return createBattleState({
    rngSeed: 0x1234_5678,
    rules: {
      activePartyIndexes: { player: 0, trainer: 0 },
      submittedSides: [],
    },
    request: playerRequest(),
  }) as BattleState<FixtureRules>;
}

function nextBoundary(): BattleBoundary {
  return {
    kind: "decision-required",
    request: trainerRequest(),
  };
}

const acceptPlayer: BattleDecisionReducer<FixtureRules> = (context) => ({
  rules: {
    ...context.rules,
    submittedSides: [...context.rules.submittedSides, context.request.side],
  },
  events: [
    {
      kind: "message",
      messageId: "PLAYER_COMMAND_ACCEPTED",
      substitutions: ["player"],
    },
    {
      kind: "animation",
      animationId: "COMMAND_READY",
      battler: 0,
      arguments: ["move-slot-0"],
    },
  ],
  boundary: nextBoundary(),
});

describe("battle-level decision boundary ABI", () => {
  it("deep-clones and freezes caller-owned rules, requests, and nested arrays", () => {
    const mutableRules = {
      activePartyIndexes: { player: 0, trainer: 0 },
      submittedSides: [] as string[],
    };
    const mutableRequest = {
      kind: "command" as const,
      requestId: 7,
      side: "player" as const,
      battler: 0 as const,
      legalDecisions: [
        { kind: "use-move" as const, moveSlot: 0 as const, targetBattler: 1 as const },
      ],
    };
    const state = createBattleState({
      rngSeed: 0x1234_5678,
      rules: mutableRules,
      request: mutableRequest,
    });

    mutableRules.activePartyIndexes.player = 2;
    mutableRules.submittedSides.push("trainer");
    (mutableRequest.legalDecisions[0] as { moveSlot: number }).moveSlot = 3;

    expect(state.rules).toEqual({
      activePartyIndexes: { player: 0, trainer: 0 },
      submittedSides: [],
    });
    expect(state.boundary).toMatchObject({
      kind: "decision-required",
      request: {
        legalDecisions: [{ kind: "use-move", moveSlot: 0, targetBattler: 1 }],
      },
    });
    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state.rules)).toBe(true);
    expect(Object.isFrozen(state.rules.activePartyIndexes)).toBe(true);
    expect(Object.isFrozen(state.rules.submittedSides)).toBe(true);
    expect(Object.isFrozen(state.boundary)).toBe(true);
    if (state.boundary.kind !== "decision-required") throw new Error("expected request");
    expect(Object.isFrozen(state.boundary.request)).toBe(true);
    if (state.boundary.request.kind !== "command") throw new Error("expected command");
    expect(Object.isFrozen(state.boundary.request.legalDecisions)).toBe(true);
    expect(() => {
      (state.rules.activePartyIndexes as { player: number }).player = 5;
    }).toThrow();
  });

  it("uses canonical serialization and resumes the same deterministic transition", () => {
    const first = fixtureState();
    const reordered = JSON.stringify({
      boundary: first.boundary,
      rng: { calls: 0, value: 0x1234_5678 },
      rules: {
        submittedSides: [],
        activePartyIndexes: { trainer: 0, player: 0 },
      },
      nextEventSequence: 0,
      revision: 0,
      schemaVersion: 1,
    });
    const restored = parseBattleState(reordered) as BattleState<FixtureRules>;

    expect(serializeBattleState(first)).toBe(serializeBattleState(restored));
    const submission = {
      requestId: 7,
      side: "player",
      decision: { kind: "use-move", moveSlot: 0, targetBattler: 1 },
    } as const;
    const firstResult = submitBattleDecision(first, submission, acceptPlayer);
    const restoredResult = submitBattleDecision(restored, submission, acceptPlayer);

    expect(firstResult).toEqual(restoredResult);
    expect(serializeBattleState(firstResult.state)).toBe(
      serializeBattleState(restoredResult.state),
    );
    expect(parseBattleState(serializeBattleState(firstResult.state))).toEqual(
      firstResult.state,
    );
  });

  it.each([
    [
      "request id",
      {
        requestId: 6,
        side: "player",
        decision: { kind: "use-move", moveSlot: 0, targetBattler: 1 },
      },
    ],
    [
      "side",
      {
        requestId: 7,
        side: "trainer",
        decision: { kind: "use-move", moveSlot: 0, targetBattler: 1 },
      },
    ],
    [
      "legal move",
      {
        requestId: 7,
        side: "player",
        decision: { kind: "use-move", moveSlot: 1, targetBattler: 1 },
      },
    ],
    [
      "legal voluntary switch",
      {
        requestId: 7,
        side: "player",
        decision: { kind: "switch", partyIndex: 2 },
      },
    ],
  ])("rejects a submission that does not match the current %s", (_name, submission) => {
    expect(() =>
      submitBattleDecision(
        fixtureState(),
        submission as BattleDecisionSubmission,
        acceptPlayer,
      )).toThrow();
  });

  it("owns all RNG in returned state and never consults ambient randomness", () => {
    const ambient = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("ambient randomness is forbidden");
    });
    try {
      const reducer: BattleDecisionReducer<FixtureRules> = (context) => {
        const accuracy = context.rng.draw("accuracy");
        const damage = context.rng.draw("damage");
        return {
          rules: {
            ...context.rules,
            submittedSides: [`${accuracy}:${damage}`],
          },
          events: [],
          boundary: nextBoundary(),
        };
      };
      const initial = fixtureState();
      const result = submitBattleDecision(initial, {
        requestId: 7,
        side: "player",
        decision: { kind: "use-move", moveSlot: 0, targetBattler: 1 },
      }, reducer);
      const afterOne = advanceRngValue(0x1234_5678);
      const afterTwo = advanceRngValue(afterOne);

      expect(ambient).not.toHaveBeenCalled();
      expect(initial.rng).toEqual({ value: 0x1234_5678, calls: 0 });
      expect(result.state.rng).toEqual({ value: afterTwo, calls: 2 });
      expect(Object.isFrozen(result.state.rng)).toBe(true);
      expect(Object.hasOwn(result, "rng")).toBe(false);
    } finally {
      ambient.mockRestore();
    }
  });

  it("publishes legal player, trainer, voluntary-switch, and forced-switch shapes", () => {
    expect(playerRequest()).toEqual({
      kind: "command",
      requestId: 7,
      side: "player",
      battler: 0,
      legalDecisions: [
        { kind: "use-move", moveSlot: 0, targetBattler: 1 },
        { kind: "use-move", moveSlot: 2, targetBattler: 1 },
        { kind: "switch", partyIndex: 1 },
      ],
    });
    expect(trainerRequest()).toMatchObject({
      kind: "command",
      side: "trainer",
      battler: 1,
      legalDecisions: [
        { kind: "use-move", moveSlot: 1, targetBattler: 0 },
        { kind: "switch", partyIndex: 2 },
      ],
    });
    expect(forcedPlayerRequest()).toEqual({
      kind: "forced-switch",
      requestId: 9,
      side: "player",
      battler: 0,
      faintedPartyIndex: 0,
      legalPartyIndexes: [1, 2],
    });
    expect(createBattleForcedSwitchRequest({
      kind: "forced-switch",
      requestId: 10,
      side: "trainer",
      battler: 1,
      faintedPartyIndex: 2,
      legalPartyIndexes: [0, 1],
    })).toMatchObject({ side: "trainer", battler: 1 });

    expect(() => createBattleCommandRequest({
      kind: "command",
      requestId: 1,
      side: "player",
      battler: 1,
      legalDecisions: [{ kind: "use-move", moveSlot: 0, targetBattler: 1 }],
    })).toThrow(/must be 0 for the player side/);
    expect(() => createBattleForcedSwitchRequest({
      kind: "forced-switch",
      requestId: 1,
      side: "player",
      battler: 0,
      faintedPartyIndex: 1,
      legalPartyIndexes: [1],
    })).toThrow(/must not include fainted party index/);
  });

  it("keeps reducer semantic-event order with monotonic immutable sequence numbers", () => {
    const result = submitBattleDecision(fixtureState(), {
      requestId: 7,
      side: "player",
      decision: { kind: "use-move", moveSlot: 0, targetBattler: 1 },
    }, acceptPlayer);

    expect(result.events.map((event) => [event.sequence, event.payload.kind])).toEqual([
      [0, "message"],
      [1, "animation"],
    ]);
    expect(result.state.nextEventSequence).toBe(2);
    expect(Object.isFrozen(result.events)).toBe(true);
    expect(Object.isFrozen(result.events[0])).toBe(true);
    expect(Object.isFrozen(result.events[0]!.payload)).toBe(true);
    const message = result.events[0]!.payload;
    if (message.kind !== "message") throw new Error("expected message");
    expect(Object.isFrozen(message.substitutions)).toBe(true);
  });

  it("makes next-request and terminal outcomes mechanically exclusive", () => {
    const next = submitBattleDecision(fixtureState(), {
      requestId: 7,
      side: "player",
      decision: { kind: "use-move", moveSlot: 0, targetBattler: 1 },
    }, acceptPlayer);
    expect(next.kind).toBe("decision-required");
    expect(Object.hasOwn(next, "nextRequest")).toBe(true);
    expect(Object.hasOwn(next, "outcome")).toBe(false);
    expect(next.state.boundary.kind).toBe("decision-required");

    const terminal = submitBattleDecision(fixtureState(), {
      requestId: 7,
      side: "player",
      decision: { kind: "use-move", moveSlot: 0, targetBattler: 1 },
    }, (context) => ({
      rules: context.rules,
      events: [{ kind: "outcome", outcome: "player-win" }],
      boundary: { kind: "terminal", outcome: "player-win" },
    }));
    expect(terminal.kind).toBe("terminal");
    expect(Object.hasOwn(terminal, "outcome")).toBe(true);
    expect(Object.hasOwn(terminal, "nextRequest")).toBe(false);
    expect(terminal.state.boundary).toEqual({
      kind: "terminal",
      outcome: "player-win",
    });
    expect(() => submitBattleDecision(
      terminal.state,
      {
        requestId: 8,
        side: "trainer",
        decision: { kind: "use-move", moveSlot: 1, targetBattler: 0 },
      },
      acceptPlayer,
    )).toThrow(/already terminal/);
  });

  it("has no presentation acknowledgement in its rules submission ABI", () => {
    let reducerCalls = 0;
    const reducer: BattleDecisionReducer<FixtureRules> = (context) => {
      reducerCalls += 1;
      return {
        rules: context.rules,
        events: [],
        boundary: nextBoundary(),
      };
    };
    const acknowledgement = {
      requestId: 7,
      side: "player",
      decision: { kind: "acknowledge-presentation", eventSequence: 0 },
    };

    expect(() => submitBattleDecision(
      fixtureState(),
      acknowledgement as unknown as BattleDecisionSubmission,
      reducer,
    )).toThrow(/use-move or switch/);
    expect(reducerCalls).toBe(0);
    expect(fixtureState().rng).toEqual({ value: 0x1234_5678, calls: 0 });
  });

  it("rejects non-serializable state and reducer attempts to return RNG ownership", () => {
    expect(() => createBattleState({
      rngSeed: 0,
      rules: { invalid: Number.NaN },
      request: playerRequest(),
    })).toThrow(/finite JSON number/);

    expect(() => submitBattleDecision(
      fixtureState(),
      {
        requestId: 7,
        side: "player",
        decision: { kind: "use-move", moveSlot: 0, targetBattler: 1 },
      },
      (() => ({
        rules: fixtureState().rules,
        events: [],
        boundary: nextBoundary(),
        rng: { value: 1, calls: 1 },
      })) as unknown as BattleDecisionReducer<FixtureRules>,
    )).toThrow(/exactly keys boundary, events, rules/);
  });
});
