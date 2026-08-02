import { describe, expect, it } from "vitest";
import {
  createLatestCompletedCommandHandoff,
  isLatestCompletedCommandHandoffReady,
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
});
