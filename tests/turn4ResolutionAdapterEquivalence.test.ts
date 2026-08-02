import { describe, expect, it } from "vitest";
import { rentalMoveset } from "../src/engine/battleSetup.ts";
import {
  isTurn4NextCommandHandoffReady,
  isTurn4NextCommandLifecycleActive,
  resolveTurn4CompletedResolutionNextCommandHandoff,
  turn4PresentationEpochElapsedSinceReset,
} from "../src/engine/turn4ResolutionAdapter.ts";
import {
  isTurn4ChooseActionBounceReset,
  turn4ChooseActionResetElapsed,
} from "../src/engine/turn4ChooseActionReset.ts";

describe("turn4ResolutionAdapter: #39 completed-turn-4/next-command handoff proof", () => {
  it("publishes canonical PP, persisted slot, field HP, and settled/input-ready facts", () => {
    const handoff = resolveTurn4CompletedResolutionNextCommandHandoff(4312);

    expect(handoff.playerPp).toEqual([7, 20, 19, 10]);
    expect(handoff.persistedMoveSlot).toBe(0);
    expect(handoff.hp).toEqual({ player: 88, opponent: 1 });
    expect(handoff.nextCommand).toEqual({ redraw: "settled", input: "ready" });
    expect(isTurn4NextCommandHandoffReady(handoff)).toBe(true);
    expect(isTurn4NextCommandHandoffReady(null)).toBe(false);
  });

  it("derives the third ROCK_SLIDE and prior DRAGON_BREATH uses from the canonical ONIX moveset", () => {
    const [rockSlide, bind, dragonBreath, sandstorm] = rentalMoveset("ONIX").maxPP;
    expect(resolveTurn4CompletedResolutionNextCommandHandoff(0).playerPp).toEqual([
      rockSlide - 3,
      bind,
      dragonBreath - 1,
      sandstorm,
    ]);
  });

  it("owns the runtime-relative 4312 reset epoch rather than the later turn-5 submenu reopen", () => {
    const handoff = resolveTurn4CompletedResolutionNextCommandHandoff(4312);

    expect(handoff.presentationEpoch).toEqual({
      owner: "HandleInputChooseAction",
      reset: "DoBounceEffect",
      elapsed: 4312,
      mon: { seed: 192, delta: 7, amplitude: 1 },
      healthbox: { seed: 128, delta: 7, amplitude: 1 },
    });
    expect(turn4PresentationEpochElapsedSinceReset(handoff, 4312)).toBe(0);
    expect(turn4PresentationEpochElapsedSinceReset(handoff, 4319)).toBe(7);
  });

  it("publishes only at the accepted choose-action reset and survives a later submenu reopen", () => {
    const handoff = resolveTurn4CompletedResolutionNextCommandHandoff(4312);

    expect(turn4ChooseActionResetElapsed(3885)).toBe(4312);
    expect(isTurn4ChooseActionBounceReset(3885, 4311)).toBe(false);
    expect(isTurn4ChooseActionBounceReset(3885, 4312)).toBe(true);
    expect(isTurn4NextCommandLifecycleActive(handoff, 3853)).toBe(false);
    expect(isTurn4NextCommandLifecycleActive(handoff, 4887)).toBe(true);
    // A same-turn B-close/A-reopen changes UI elapsed only; it cannot write a
    // fresh epoch over the immutable completed-turn receipt.
    expect(isTurn4NextCommandLifecycleActive(handoff, 4896)).toBe(true);
    expect(handoff.presentationEpoch.elapsed).toBe(4312);
  });

  it("freezes every owner-facing nested fact", () => {
    const handoff = resolveTurn4CompletedResolutionNextCommandHandoff(4312);

    expect(Object.isFrozen(handoff)).toBe(true);
    expect(Object.isFrozen(handoff.playerPp)).toBe(true);
    expect(Object.isFrozen(handoff.hp)).toBe(true);
    expect(Object.isFrozen(handoff.presentationEpoch)).toBe(true);
    expect(Object.isFrozen(handoff.presentationEpoch.mon)).toBe(true);
    expect(Object.isFrozen(handoff.presentationEpoch.healthbox)).toBe(true);
    expect(Object.isFrozen(handoff.nextCommand)).toBe(true);
  });
});
