import { describe, expect, it } from "vitest";
import { currentPPForActiveMon } from "../src/engine/battleMenu.ts";
import { rentalMoveset } from "../src/engine/battleSetup.ts";
import {
  isTurn6NextCommandHandoffReady,
  resolveTurn6CompletedResolutionNextCommandHandoff,
  resolveTurn6LatestCompletedCommandHandoff,
} from "../src/engine/turn6ResolutionAdapter.ts";

describe("turn6ResolutionAdapter: #39 completed-turn-6/next-command handoff proof", () => {
  it("normalizes every legacy receipt fact into the generic handoff", () => {
    const legacy = resolveTurn6CompletedResolutionNextCommandHandoff();
    const generic = resolveTurn6LatestCompletedCommandHandoff();

    expect(generic.playerPp).toEqual(legacy.playerPp);
    expect(generic.persistedMoveSlot).toBe(legacy.persistedMoveSlot);
    expect(generic.nextCommand).toEqual(legacy.nextCommand);
  });

  it("publishes the same settled redraw/input-ready facts that the old reopen guard supplied", () => {
    const handoff = resolveTurn6CompletedResolutionNextCommandHandoff();

    expect(handoff.nextCommand).toEqual({ redraw: "settled", input: "ready" });
    expect(isTurn6NextCommandHandoffReady(handoff)).toBe(true);
    expect(isTurn6NextCommandHandoffReady(null)).toBe(false);
  });

  it("publishes the persisted ROCK_SLIDE slot required by the turn-7 FIGHT dispatcher", () => {
    expect(resolveTurn6CompletedResolutionNextCommandHandoff().persistedMoveSlot).toBe(0);
  });

  it("owns exactly the completed turn-6 PP receipt without depending on staged move composition", () => {
    const onix = rentalMoveset("ONIX");
    const handoff = resolveTurn6CompletedResolutionNextCommandHandoff();
    const liveReceipt = currentPPForActiveMon(onix, resolveTurn6LatestCompletedCommandHandoff());

    expect(liveReceipt).toEqual([5, 20, 19, 10]);
    expect(handoff.playerPp).toEqual(liveReceipt);
    expect(handoff.playerPp).toEqual([5, 20, 19, 10]);
    expect(Object.isFrozen(handoff)).toBe(true);
    expect(Object.isFrozen(handoff.playerPp)).toBe(true);
    expect(Object.isFrozen(handoff.nextCommand)).toBe(true);
  });

  it("identifies slot 0 as the canonical handoff fact while the menu keeps generic slots generic", () => {
    const genericMoveset = {
      moveIds: [157, 349, 288, 201],
      maxPP: [10, 15, 20, 10],
    } as const;
    const liveReceipt = currentPPForActiveMon(genericMoveset, resolveTurn6LatestCompletedCommandHandoff());

    expect(liveReceipt).toEqual([5, 15, 19, 10]);
    expect(resolveTurn6CompletedResolutionNextCommandHandoff().playerPp[0]).toBe(liveReceipt[0]);
  });
});
