import { describe, expect, it } from "vitest";
import { currentPPForActiveMon } from "../src/engine/battleMenu.ts";
import { rentalMoveset } from "../src/engine/battleSetup.ts";
import { resolveTurn5CompletedResolutionNextCommandHandoff } from "../src/engine/turn5ResolutionAdapter.ts";
import { resolveTurn6CompletedResolutionNextCommandHandoff } from "../src/engine/turn6ResolutionAdapter.ts";
import { resolveTurn7CompletedResolutionNextCommandHandoff } from "../src/engine/turn7ResolutionAdapter.ts";
import { resolveTurn8CompletedResolutionNextCommandHandoff } from "../src/engine/turn8ResolutionAdapter.ts";
import {
  isTurn9NextCommandHandoffReady,
  resolveTurn9CompletedResolutionNextCommandHandoff,
} from "../src/engine/turn9ResolutionAdapter.ts";

describe("turn9ResolutionAdapter: #39 completed-turn-9/next-command handoff proof", () => {
  it("publishes the same settled redraw/input-ready facts that the old reopen guard supplies", () => {
    const handoff = resolveTurn9CompletedResolutionNextCommandHandoff();

    expect(handoff.nextCommand).toEqual({ redraw: "settled", input: "ready" });
    expect(isTurn9NextCommandHandoffReady(handoff)).toBe(true);
    expect(isTurn9NextCommandHandoffReady(null)).toBe(false);
  });

  it("publishes the persisted ROCK_SLIDE slot required by the turn-10 FIGHT dispatcher", () => {
    expect(resolveTurn9CompletedResolutionNextCommandHandoff().persistedMoveSlot).toBe(0);
  });

  it("owns exactly the completed turn-9 PP receipt consumed by the live submenu without staged move composition", () => {
    const onix = rentalMoveset("ONIX");
    const handoff = resolveTurn9CompletedResolutionNextCommandHandoff();
    const liveReceipt = currentPPForActiveMon(
      onix,
      true, true, true, true,
      resolveTurn5CompletedResolutionNextCommandHandoff(),
      resolveTurn6CompletedResolutionNextCommandHandoff(),
      resolveTurn7CompletedResolutionNextCommandHandoff(),
      resolveTurn8CompletedResolutionNextCommandHandoff(),
      handoff,
    );

    expect(liveReceipt).toEqual([3, 19, 19, 10]);
    expect(handoff.playerPp).toEqual(liveReceipt);
    expect(handoff.playerPp).toEqual([3, 19, 19, 10]);
    expect(Object.isFrozen(handoff)).toBe(true);
    expect(Object.isFrozen(handoff.playerPp)).toBe(true);
    expect(Object.isFrozen(handoff.nextCommand)).toBe(true);
  });

  it("identifies slot 0 as the canonical handoff fact while the menu keeps generic slots generic", () => {
    const genericMoveset = {
      moveIds: [157, 20, 288, 201],
      maxPP: [10, 15, 20, 10],
    } as const;
    const liveReceipt = currentPPForActiveMon(
      genericMoveset,
      true, true, true, true,
      resolveTurn5CompletedResolutionNextCommandHandoff(),
      resolveTurn6CompletedResolutionNextCommandHandoff(),
      resolveTurn7CompletedResolutionNextCommandHandoff(),
      resolveTurn8CompletedResolutionNextCommandHandoff(),
      resolveTurn9CompletedResolutionNextCommandHandoff(),
    );

    expect(liveReceipt).toEqual([3, 14, 19, 10]);
    expect(liveReceipt[0]).toBe(genericMoveset.maxPP[0] - 7);
    expect(resolveTurn9CompletedResolutionNextCommandHandoff().playerPp[0]).toBe(3);
  });
});
