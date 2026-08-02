import { describe, expect, it } from "vitest";
import {
  createLatestCompletedCommandHandoff,
  isLatestCompletedCommandHandoffReady,
  projectLatestCompletedCommandPp,
} from "../src/engine/nextCommandHandoff.ts";

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
});
