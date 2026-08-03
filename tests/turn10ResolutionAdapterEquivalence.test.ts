import { describe, expect, it } from "vitest";
import { currentPPForActiveMon } from "../src/engine/battleMenu.ts";
import { rentalMoveset } from "../src/engine/battleSetup.ts";
import {
  isTurn10NextCommandHandoffReady,
  resolveTurn10CompletedResolutionNextCommandHandoff,
  resolveTurn10LatestCompletedCommandHandoff,
} from "../src/engine/turn10ResolutionAdapter.ts";

describe("turn10ResolutionAdapter: #39 completed-turn-10/next-command handoff proof", () => {
  it("normalizes every legacy receipt fact into the generic handoff", () => {
    const legacy = resolveTurn10CompletedResolutionNextCommandHandoff();
    const generic = resolveTurn10LatestCompletedCommandHandoff();

    expect(generic.playerPp).toEqual(legacy.playerPp);
    expect(generic.persistedMoveSlot).toBe(legacy.persistedMoveSlot);
    expect(generic.nextCommand).toEqual(legacy.nextCommand);
  });

  it("publishes the same settled redraw/input-ready facts that the old reopen guard supplies", () => {
    const handoff = resolveTurn10CompletedResolutionNextCommandHandoff();

    expect(handoff.nextCommand).toEqual({ redraw: "settled", input: "ready" });
    expect(isTurn10NextCommandHandoffReady(handoff)).toBe(true);
    expect(isTurn10NextCommandHandoffReady(null)).toBe(false);
  });

  it("publishes the persisted ROCK_SLIDE slot required by the turn-11 FIGHT dispatcher", () => {
    expect(resolveTurn10CompletedResolutionNextCommandHandoff().persistedMoveSlot).toBe(0);
  });

  it("owns exactly the completed turn-10 PP receipt consumed by the live submenu without staged move composition", () => {
    const onix = rentalMoveset("ONIX");
    const handoff = resolveTurn10CompletedResolutionNextCommandHandoff();
    const liveReceipt = currentPPForActiveMon(onix, resolveTurn10LatestCompletedCommandHandoff());

    expect(liveReceipt).toEqual([2, 19, 19, 10]);
    expect(handoff.playerPp).toEqual(liveReceipt);
    expect(handoff.playerPp).toEqual([2, 19, 19, 10]);
    expect(Object.isFrozen(handoff)).toBe(true);
    expect(Object.isFrozen(handoff.playerPp)).toBe(true);
    expect(Object.isFrozen(handoff.nextCommand)).toBe(true);
  });

  it("identifies slot 0 as the canonical handoff fact while the menu keeps generic slots generic", () => {
    const genericMoveset = {
      moveIds: [157, 20, 288, 201],
      maxPP: [10, 15, 20, 10],
    } as const;
    const liveReceipt = currentPPForActiveMon(genericMoveset, resolveTurn10LatestCompletedCommandHandoff());

    expect(liveReceipt).toEqual([2, 14, 19, 10]);
    expect(liveReceipt[0]).toBe(genericMoveset.maxPP[0] - 8);
    expect(resolveTurn10CompletedResolutionNextCommandHandoff().playerPp[0]).toBe(2);
  });
});
