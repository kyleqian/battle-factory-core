import { describe, expect, it } from "vitest";
import {
  consumeNextCommandReopenGuard,
  createNextCommandReopenGuard,
  createLatestCompletedCommandHandoff,
  isLatestCompletedCommandHandoffReady,
  isLatestCompletedCommandLifecycleActive,
  latestCompletedCommandPresentationEpoch,
  latestCompletedCommandPresentationEpochElapsedSinceReset,
  projectLatestCompletedCommandPp,
  withNextCommandReopenGuard,
} from "../src/engine/nextCommandHandoff.ts";
import { createFightCommandPresentation } from "../src/engine/fightCommandPresentation.ts";
import { createBattleSceneResolutionOwner } from "../src/engine/battleSceneResolutionOwner.ts";
import { CANONICAL_OPPONENT_FLY_RESOLUTION } from "../src/engine/turn15FlyResolutionAdapter.ts";

describe("LatestCompletedCommandHandoff", () => {
  it("publishes an immutable canonical PP tuple, persisted slot, and readiness receipt", () => {
    const sourcePp: [number, number, number, number] = [6, 20, 19, 10];
    const handoff = createLatestCompletedCommandHandoff({
      playerPp: sourcePp,
      persistedMoveSlot: 2,
      nextCommand: { redraw: "settled", input: "ready" },
    });

    sourcePp[2] = 0;
    expect(handoff).toEqual({
      playerPp: [6, 20, 19, 10],
      persistedMoveSlot: 2,
      nextCommand: { redraw: "settled", input: "ready" },
    });
    expect(Object.isFrozen(handoff)).toBe(true);
    expect(Object.isFrozen(handoff.playerPp)).toBe(true);
    expect(Object.isFrozen(handoff.nextCommand)).toBe(true);
  });

  it("requires both settled redraw and ready input", () => {
    const handoff = createLatestCompletedCommandHandoff({
      playerPp: [6, 20, 19, 10],
      persistedMoveSlot: 0,
      nextCommand: { redraw: "settled", input: "ready" },
    });

    expect(isLatestCompletedCommandHandoffReady(handoff)).toBe(true);
    expect(isLatestCompletedCommandHandoffReady(null)).toBe(false);
    expect(isLatestCompletedCommandHandoffReady(undefined)).toBe(false);
  });

  it("projects canonical PP uses onto the active moveset and carries the persisted slot", () => {
    const handoff = createLatestCompletedCommandHandoff({
      playerPp: [5, 20, 19, 10],
      persistedMoveSlot: 0,
      nextCommand: { redraw: "settled", input: "ready" },
    });

    expect(projectLatestCompletedCommandPp(
      [15, 15, 25, 5],
      [10, 20, 20, 10],
      handoff,
    )).toEqual({
      playerPp: [10, 15, 24, 5],
      persistedMoveSlot: 0,
    });
    expect(projectLatestCompletedCommandPp(
      [15, 15, 25, 5],
      [10, 20, 20, 10],
      null,
    )).toBeNull();
  });

  it("carries an immutable semantic content view without deriving it from the PP tuple", () => {
    const retainedOwner = createBattleSceneResolutionOwner(
      CANONICAL_OPPONENT_FLY_RESOLUTION.strikeResolution,
    );
    const content = createFightCommandPresentation({
      field: {
        player: {
          species: "ONIX", displayName: "ONIX", level: 50, gender: "male", status: "none",
          hp: { current: 31, max: 117 }, attackStage: 4,
        },
        opponent: {
          species: "PIDGEOTTO", displayName: "PIDGEOTTO", level: 50, gender: "male", status: "none",
          hp: { current: 113, max: 156 }, attackStage: 6,
        },
      },
      bounce: {
        actionMenuRedrawTick: 8122,
        idleBounceEpochTick: 1748,
        fightSubmenuTickOffset: -2,
        kickoff: {
          freezeAfterConfirmTicks: 3,
          preFreezeTickOffset: -2,
          frozenBounceTick: 8122,
        },
      },
      presentationEpoch: {
        owner: "HandleInputChooseAction",
        reset: "DoBounceEffect",
        elapsed: 1308,
        mon: { seed: 192, delta: 7, amplitude: 1 },
        healthbox: { seed: 128, delta: 7, amplitude: 1 },
      },
      upcoming: {
        firstTextStartDelay: 13,
        moves: [{
          user: "opponent", target: "player", move: "FEATHER_DANCE",
          text: { lines: ["Foe PIDGEOTTO used", "FEATHERDANCE!"] },
        }],
      },
      retainedResolution: {
        owner: retainedOwner,
        segments: retainedOwner.resolution.segments,
      },
    });
    const handoff = createLatestCompletedCommandHandoff({
      playerPp: [5, 20, 19, 10],
      persistedMoveSlot: 0,
      nextCommand: { redraw: "settled", input: "ready" },
      content,
    });

    expect(handoff.content).toEqual(content);
    expect(handoff.content).not.toBe(content);
    expect(Object.isFrozen(handoff.content)).toBe(true);
    expect(Object.isFrozen(handoff.content!.field.player.hp)).toBe(true);
    expect(Object.isFrozen(handoff.content!.presentationEpoch)).toBe(true);
    expect(Object.isFrozen(handoff.content!.presentationEpoch!.mon)).toBe(true);
    expect(Object.isFrozen(handoff.content!.upcoming!.moves)).toBe(true);
    expect(handoff.content!.retainedResolution!.owner).toBe(retainedOwner);
    expect(handoff.content!.retainedResolution!.segments)
      .toBe(retainedOwner.resolution.segments);
  });

  it("treats optional epoch presence as semantic content for lifecycle age", () => {
    const handoff = createLatestCompletedCommandHandoff({
      playerPp: [9, 20, 20, 10],
      persistedMoveSlot: 0,
      nextCommand: { redraw: "settled", input: "ready" },
      content: createFightCommandPresentation({
        field: {
          player: {
            species: "ONIX", displayName: "ONIX", level: 50, gender: "male", status: "none",
            hp: { current: 117, max: 117 }, attackStage: 6,
          },
          opponent: {
            species: "GROVYLE", displayName: "GROVYLE", level: 50, gender: "male", status: "none",
            hp: { current: 101, max: 143 }, attackStage: 6,
          },
        },
        bounce: {
          actionMenuRedrawTick: 1308,
          idleBounceEpochTick: 1748,
          fightSubmenuTickOffset: -2,
          kickoff: {
            freezeAfterConfirmTicks: 9,
            preFreezeTickOffset: -2,
            frozenBounceEpochTick: 2119,
          },
        },
        presentationEpoch: {
          owner: "HandleInputChooseAction",
          reset: "DoBounceEffect",
          elapsed: 1308,
          mon: { seed: 192, delta: 7, amplitude: 1 },
          healthbox: { seed: 128, delta: 7, amplitude: 1 },
        },
        upcoming: null,
      }),
    });

    expect(latestCompletedCommandPresentationEpoch(handoff)?.elapsed).toBe(1308);
    expect(latestCompletedCommandPresentationEpochElapsedSinceReset(handoff, 1861)).toBe(553);
    expect(isLatestCompletedCommandLifecycleActive(handoff, 1308)).toBe(false);
    expect(isLatestCompletedCommandLifecycleActive(handoff, 1861)).toBe(true);
  });

  it("rejects retained segments that do not belong to the supplied owner", () => {
    const owner = createBattleSceneResolutionOwner(
      CANONICAL_OPPONENT_FLY_RESOLUTION.chargeResolution,
    );
    const foreignOwner = createBattleSceneResolutionOwner(
      CANONICAL_OPPONENT_FLY_RESOLUTION.strikeResolution,
    );
    expect(() => createFightCommandPresentation({
      field: {
        player: {
          species: "ONIX", displayName: "ONIX", level: 50, gender: "male", status: "none",
          hp: { current: 4, max: 117 }, attackStage: 0,
        },
        opponent: {
          species: "MURKROW", displayName: "MURKROW", level: 50, gender: "male", status: "none",
          hp: { current: 142, max: 142 }, attackStage: 6,
        },
      },
      bounce: {
        actionMenuRedrawTick: 291,
        idleBounceEpochTick: 1748,
        fightSubmenuTickOffset: -2,
        kickoff: {
          freezeAfterConfirmTicks: 3,
          preFreezeTickOffset: -2,
          frozenBounceTick: 291,
        },
      },
      upcoming: null,
      retainedResolution: { owner, segments: foreignOwner.resolution.segments },
    })).toThrow("retained resolution segments must belong to their owner");
  });

  it("consumes a semantic reopen guard only at its confirmation-relative source edge and atomically returns its successor", () => {
    const successor = createLatestCompletedCommandHandoff({
      playerPp: [5, 20, 19, 10],
      persistedMoveSlot: 0,
      nextCommand: { redraw: "settled", input: "ready" },
    });
    const guard = createNextCommandReopenGuard({
      minimumConfirmElapsed: 12,
      successor: { handoff: successor },
    });
    const owner = withNextCommandReopenGuard(
      createLatestCompletedCommandHandoff({
        playerPp: [6, 20, 19, 10],
        persistedMoveSlot: 0,
        nextCommand: { redraw: "settled", input: "ready" },
      }),
      guard,
    );

    expect(Object.isFrozen(owner.reopenGuard)).toBe(true);
    expect(consumeNextCommandReopenGuard(
      owner.reopenGuard!,
      null,
      { confirmElapsed: 100 },
      new Set(["A"]),
      111,
    )).toBeNull();
    expect(consumeNextCommandReopenGuard(
      owner.reopenGuard!,
      null,
      { confirmElapsed: 100 },
      new Set(["A"]),
      112,
    )).toEqual({ handoff: successor, resolutionOwner: null });
  });

  it("requires the retained content segment and any automatic-switch continuation without using a command identity", () => {
    const chargeOwner = createBattleSceneResolutionOwner(
      CANONICAL_OPPONENT_FLY_RESOLUTION.chargeResolution,
    );
    const guard = createNextCommandReopenGuard({
      minimumConfirmElapsed: 0,
      minimumOpponentFaintContinuationElapsed: 3,
      requiredActiveResolutionSegment: chargeOwner.resolution.segments[0]!,
      successor: { resolutionOwner: chargeOwner },
    });

    expect(consumeNextCommandReopenGuard(
      guard,
      chargeOwner,
      { confirmElapsed: 100 },
      new Set(["A"]),
      100,
      2,
    )).toBeNull();
    expect(consumeNextCommandReopenGuard(
      guard,
      chargeOwner,
      { confirmElapsed: 100 },
      new Set(["A"]),
      100,
      3,
    )).toEqual({ handoff: null, resolutionOwner: chargeOwner });
  });
});
