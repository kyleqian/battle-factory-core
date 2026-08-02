import { describe, expect, it } from "vitest";
import { currentPPForActiveMon } from "../src/engine/battleMenu.ts";
import { resolveTurn1CompletedResolutionNextCommandHandoff } from "../src/engine/turn1ResolutionAdapter.ts";
import { resolveTurn2CompletedResolutionNextCommandHandoff } from "../src/engine/turn2ResolutionAdapter.ts";
import { resolveTurn3CompletedResolutionNextCommandHandoff } from "../src/engine/turn3ResolutionAdapter.ts";
import { resolveTurn4CompletedResolutionNextCommandHandoff } from "../src/engine/turn4ResolutionAdapter.ts";
import { rentalMoveset } from "../src/engine/battleSetup.ts";
import { resolveTurn5CompletedResolutionNextCommandHandoff } from "../src/engine/turn5ResolutionAdapter.ts";
import {
  isTurn6NextCommandHandoffReady,
  resolveTurn6CompletedResolutionNextCommandHandoff,
} from "../src/engine/turn6ResolutionAdapter.ts";

describe("turn6ResolutionAdapter: #39 completed-turn-6/next-command handoff proof", () => {
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
    const turn5Handoff = resolveTurn5CompletedResolutionNextCommandHandoff();
    const handoff = resolveTurn6CompletedResolutionNextCommandHandoff();
    const liveReceipt = currentPPForActiveMon(
      onix,
      resolveTurn1CompletedResolutionNextCommandHandoff(1308), resolveTurn2CompletedResolutionNextCommandHandoff(2197), resolveTurn3CompletedResolutionNextCommandHandoff(3172), resolveTurn4CompletedResolutionNextCommandHandoff(4312),
      turn5Handoff,
      handoff,
    );

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
    const liveReceipt = currentPPForActiveMon(
      genericMoveset,
      resolveTurn1CompletedResolutionNextCommandHandoff(1308), resolveTurn2CompletedResolutionNextCommandHandoff(2197), resolveTurn3CompletedResolutionNextCommandHandoff(3172), resolveTurn4CompletedResolutionNextCommandHandoff(4312),
      resolveTurn5CompletedResolutionNextCommandHandoff(),
      resolveTurn6CompletedResolutionNextCommandHandoff(),
    );

    expect(liveReceipt).toEqual([5, 15, 19, 10]);
    expect(resolveTurn6CompletedResolutionNextCommandHandoff().playerPp[0]).toBe(liveReceipt[0]);
  });
});
