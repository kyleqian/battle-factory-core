import { describe, expect, it } from "vitest";
import {
  createLatestCompletedCommandHandoff,
  isLatestCompletedCommandHandoffReady,
  projectLatestCompletedCommandPp,
} from "../src/engine/nextCommandHandoff.ts";
import { createFightCommandPresentation } from "../src/engine/fightCommandPresentation.ts";

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
      upcoming: {
        firstTextStartDelay: 13,
        moves: [{
          user: "opponent", target: "player", move: "FEATHER_DANCE",
          text: { lines: ["Foe PIDGEOTTO used", "FEATHERDANCE!"] },
        }],
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
    expect(Object.isFrozen(handoff.content!.upcoming!.moves)).toBe(true);
  });
});
