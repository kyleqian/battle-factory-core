import { describe, expect, it } from "vitest";
import { currentPPForActiveMon } from "../src/engine/battleMenu.ts";
import { rentalMoveset } from "../src/engine/battleSetup.ts";
import {
  isTurn7NextCommandHandoffReady,
  resolveTurn7CompletedResolutionNextCommandHandoff,
  resolveTurn7LatestCompletedCommandHandoff,
} from "../src/engine/turn7ResolutionAdapter.ts";

describe("turn7ResolutionAdapter: #39 completed-turn-7/next-command handoff proof", () => {
  it("normalizes every legacy receipt fact into the generic handoff", () => {
    const legacy = resolveTurn7CompletedResolutionNextCommandHandoff();
    const generic = resolveTurn7LatestCompletedCommandHandoff();

    expect(generic.playerPp).toEqual(legacy.playerPp);
    expect(generic.persistedMoveSlot).toBe(legacy.persistedMoveSlot);
    expect(generic.nextCommand).toEqual(legacy.nextCommand);
  });

  it("publishes the same settled redraw/input-ready facts that the old reopen guard supplied", () => {
    const handoff = resolveTurn7CompletedResolutionNextCommandHandoff();

    expect(handoff.nextCommand).toEqual({ redraw: "settled", input: "ready" });
    expect(isTurn7NextCommandHandoffReady(handoff)).toBe(true);
    expect(isTurn7NextCommandHandoffReady(null)).toBe(false);
  });

  it("publishes the persisted ROCK_SLIDE slot required by the turn-8 FIGHT dispatcher", () => {
    expect(resolveTurn7CompletedResolutionNextCommandHandoff().persistedMoveSlot).toBe(0);
  });

  it("owns exactly the live turn-7 PP receipt without depending on staged move composition", () => {
    const onix = rentalMoveset("ONIX");
    const handoff = resolveTurn7CompletedResolutionNextCommandHandoff();
    const liveReceipt = currentPPForActiveMon(onix, resolveTurn7LatestCompletedCommandHandoff());

    expect(liveReceipt).toEqual([4, 20, 19, 10]);
    expect(handoff.playerPp).toEqual(liveReceipt);
    expect(handoff.playerPp).toEqual([4, 20, 19, 10]);
    expect(Object.isFrozen(handoff)).toBe(true);
    expect(Object.isFrozen(handoff.playerPp)).toBe(true);
    expect(Object.isFrozen(handoff.nextCommand)).toBe(true);
  });

  it("identifies slot 0 as the canonical handoff fact while the menu keeps generic slots generic", () => {
    const genericMoveset = {
      moveIds: [157, 349, 288, 201],
      maxPP: [10, 15, 20, 10],
    } as const;
    const liveReceipt = currentPPForActiveMon(genericMoveset, resolveTurn7LatestCompletedCommandHandoff());

    expect(liveReceipt).toEqual([4, 15, 19, 10]);
    expect(resolveTurn7CompletedResolutionNextCommandHandoff().playerPp[0]).toBe(liveReceipt[0]);
  });
});
