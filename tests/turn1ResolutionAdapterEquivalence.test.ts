import { describe, expect, it } from "vitest";
import { rentalMoveset } from "../src/engine/battleSetup.ts";
import {
  isTurn1NextCommandLifecycleActive,
  isTurn1NextCommandHandoffReady,
  resolveTurn1CompletedResolutionNextCommandHandoff,
  turn1PresentationEpochElapsedSinceReset,
} from "../src/engine/turn1ResolutionAdapter.ts";
import {
  isTurn1ChooseActionBounceReset,
  turn1ChooseActionResetElapsed,
} from "../src/engine/turn1ChooseActionReset.ts";

describe("turn1ResolutionAdapter: #39 completed-turn-1/next-command handoff proof", () => {
  it("publishes the canonical PP, persisted slot, field HP, and settled/input-ready facts", () => {
    const handoff = resolveTurn1CompletedResolutionNextCommandHandoff(517);

    expect(handoff.playerPp).toEqual([9, 20, 20, 10]);
    expect(handoff.persistedMoveSlot).toBe(0);
    expect(handoff.hp).toEqual({ player: 117, opponent: 101 });
    expect(handoff.nextCommand).toEqual({ redraw: "settled", input: "ready" });
    expect(isTurn1NextCommandHandoffReady(handoff)).toBe(true);
    expect(isTurn1NextCommandHandoffReady(null)).toBe(false);
  });

  it("derives the one ROCK_SLIDE use from the canonical ONIX moveset", () => {
    const [rockSlide, bind, dragonBreath, sandstorm] = rentalMoveset("ONIX").maxPP;
    expect(resolveTurn1CompletedResolutionNextCommandHandoff(0).playerPp).toEqual([
      rockSlide - 1,
      bind,
      dragonBreath,
      sandstorm,
    ]);
  });

  it("owns a runtime-relative HandleInputChooseAction/DoBounceEffect epoch, not a later reopen", () => {
    const handoff = resolveTurn1CompletedResolutionNextCommandHandoff(517);

    expect(handoff.presentationEpoch).toEqual({
      owner: "HandleInputChooseAction",
      reset: "DoBounceEffect",
      elapsed: 517,
      mon: { seed: 192, delta: 7, amplitude: 1 },
      healthbox: { seed: 128, delta: 7, amplitude: 1 },
    });
    expect(turn1PresentationEpochElapsedSinceReset(handoff, 517)).toBe(0);
    expect(turn1PresentationEpochElapsedSinceReset(handoff, 524)).toBe(7);
  });

  it("publishes at the source reset and activates only for the later command lifecycle", () => {
    const handoff = resolveTurn1CompletedResolutionNextCommandHandoff(1308);

    expect(turn1ChooseActionResetElapsed(879)).toBe(1308);
    expect(isTurn1ChooseActionBounceReset(879, 1307)).toBe(false);
    expect(isTurn1ChooseActionBounceReset(879, 1308)).toBe(true);
    expect(isTurn1NextCommandLifecycleActive(handoff, 847)).toBe(false);
    expect(isTurn1NextCommandLifecycleActive(handoff, 1861)).toBe(true);
    // A same-turn B-close/A-reopen gets a new UI open elapsed but cannot
    // overwrite the receipt's immutable completed-turn epoch.
    expect(isTurn1NextCommandLifecycleActive(handoff, 1870)).toBe(true);
    expect(handoff.presentationEpoch.elapsed).toBe(1308);
  });

  it("freezes every owner-facing nested fact", () => {
    const handoff = resolveTurn1CompletedResolutionNextCommandHandoff(517);

    expect(Object.isFrozen(handoff)).toBe(true);
    expect(Object.isFrozen(handoff.playerPp)).toBe(true);
    expect(Object.isFrozen(handoff.hp)).toBe(true);
    expect(Object.isFrozen(handoff.presentationEpoch)).toBe(true);
    expect(Object.isFrozen(handoff.presentationEpoch.mon)).toBe(true);
    expect(Object.isFrozen(handoff.presentationEpoch.healthbox)).toBe(true);
    expect(Object.isFrozen(handoff.nextCommand)).toBe(true);
  });
});
