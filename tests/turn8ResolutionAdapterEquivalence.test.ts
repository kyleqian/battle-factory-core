import { describe, expect, it } from "vitest";
import { currentPPForActiveMon } from "../src/engine/battleMenu.ts";
import { resolveTurn1CompletedResolutionNextCommandHandoff } from "../src/engine/turn1ResolutionAdapter.ts";
import { resolveTurn2CompletedResolutionNextCommandHandoff } from "../src/engine/turn2ResolutionAdapter.ts";
import { rentalMoveset } from "../src/engine/battleSetup.ts";
import { resolveTurn5CompletedResolutionNextCommandHandoff } from "../src/engine/turn5ResolutionAdapter.ts";
import { resolveTurn6CompletedResolutionNextCommandHandoff } from "../src/engine/turn6ResolutionAdapter.ts";
import { resolveTurn7CompletedResolutionNextCommandHandoff } from "../src/engine/turn7ResolutionAdapter.ts";
import {
  isTurn8NextCommandHandoffReady,
  resolveTurn8CompletedResolutionNextCommandHandoff,
} from "../src/engine/turn8ResolutionAdapter.ts";

describe("turn8ResolutionAdapter: #39 completed-turn-8/next-command handoff proof", () => {
  it("publishes the same settled redraw/input-ready facts that the old reopen guard supplies", () => {
    const handoff = resolveTurn8CompletedResolutionNextCommandHandoff();

    expect(handoff.nextCommand).toEqual({ redraw: "settled", input: "ready" });
    expect(isTurn8NextCommandHandoffReady(handoff)).toBe(true);
    expect(isTurn8NextCommandHandoffReady(null)).toBe(false);
  });

  it("publishes the persisted BIND slot required by the turn-9 FIGHT dispatcher", () => {
    expect(resolveTurn8CompletedResolutionNextCommandHandoff().persistedMoveSlot).toBe(1);
  });

  it("owns exactly the completed turn-8 PP receipt consumed by the live submenu without staged move composition", () => {
    const onix = rentalMoveset("ONIX");
    const handoff = resolveTurn8CompletedResolutionNextCommandHandoff();
    const liveReceipt = currentPPForActiveMon(
      onix,
      resolveTurn1CompletedResolutionNextCommandHandoff(1308), resolveTurn2CompletedResolutionNextCommandHandoff(2197), true, true,
      resolveTurn5CompletedResolutionNextCommandHandoff(),
      resolveTurn6CompletedResolutionNextCommandHandoff(),
      resolveTurn7CompletedResolutionNextCommandHandoff(),
      handoff,
    );

    expect(liveReceipt).toEqual([4, 19, 19, 10]);
    expect(handoff.playerPp).toEqual(liveReceipt);
    expect(handoff.playerPp).toEqual([4, 19, 19, 10]);
    expect(Object.isFrozen(handoff)).toBe(true);
    expect(Object.isFrozen(handoff.playerPp)).toBe(true);
    expect(Object.isFrozen(handoff.nextCommand)).toBe(true);
  });

  it("identifies slot 1 as the canonical handoff fact while the menu keeps generic slots generic", () => {
    const genericMoveset = {
      moveIds: [157, 20, 288, 201],
      maxPP: [10, 15, 20, 10],
    } as const;
    const liveReceipt = currentPPForActiveMon(
      genericMoveset,
      resolveTurn1CompletedResolutionNextCommandHandoff(1308), resolveTurn2CompletedResolutionNextCommandHandoff(2197), true, true,
      resolveTurn5CompletedResolutionNextCommandHandoff(),
      resolveTurn6CompletedResolutionNextCommandHandoff(),
      resolveTurn7CompletedResolutionNextCommandHandoff(),
      resolveTurn8CompletedResolutionNextCommandHandoff(),
    );

    expect(liveReceipt).toEqual([4, 14, 19, 10]);
    expect(liveReceipt[1]).toBe(genericMoveset.maxPP[1] - 1);
    expect(resolveTurn8CompletedResolutionNextCommandHandoff().playerPp[1]).toBe(19);
  });
});
