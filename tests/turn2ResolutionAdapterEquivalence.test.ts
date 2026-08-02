import { describe, expect, it } from "vitest";
import { rentalMoveset } from "../src/engine/battleSetup.ts";
import {
  isTurn2NextCommandHandoffReady,
  isTurn2NextCommandLifecycleActive,
  resolveTurn2CompletedResolutionNextCommandHandoff,
  resolveTurn2LatestCompletedCommandHandoff,
  turn2CompletedResolutionNextCommandHandoffFromLatest,
  turn2PresentationEpochElapsedSinceReset,
} from "../src/engine/turn2ResolutionAdapter.ts";
import {
  fightCommandKickoffBounceEpochTick,
  fightCommandSettledBounceEpochTick,
  fightCommandSubmenuBounceEpochTick,
} from "../src/engine/fightCommandPresentation.ts";
import {
  isLatestCompletedCommandHandoffReady,
  isLatestCompletedCommandLifecycleActive,
  latestCompletedCommandPresentationEpochElapsedSinceReset,
} from "../src/engine/nextCommandHandoff.ts";
import {
  isTurn2ChooseActionBounceReset,
  turn2ChooseActionResetElapsed,
} from "../src/engine/turn2ChooseActionReset.ts";

describe("turn2ResolutionAdapter: #39 completed-turn-2/next-command handoff proof", () => {
  it("publishes canonical PP, persisted slot, field HP, and settled/input-ready facts", () => {
    const handoff = resolveTurn2CompletedResolutionNextCommandHandoff(2197);

    expect(handoff.playerPp).toEqual([9, 20, 19, 10]);
    expect(handoff.persistedMoveSlot).toBe(2);
    expect(handoff.hp).toEqual({ player: 101, opponent: 88 });
    expect(handoff.nextCommand).toEqual({ redraw: "settled", input: "ready" });
    expect(isTurn2NextCommandHandoffReady(handoff)).toBe(true);
    expect(isTurn2NextCommandHandoffReady(null)).toBe(false);
  });

  it("derives the slot-2 DRAGON_BREATH use from the canonical ONIX moveset", () => {
    const [rockSlide, bind, dragonBreath, sandstorm] = rentalMoveset("ONIX").maxPP;
    expect(resolveTurn2CompletedResolutionNextCommandHandoff(0).playerPp).toEqual([
      rockSlide - 1,
      bind,
      dragonBreath - 1,
      sandstorm,
    ]);
  });

  it("owns the 3237 reset epoch rather than the later turn-3 submenu reopen", () => {
    const handoff = resolveTurn2CompletedResolutionNextCommandHandoff(2197);

    expect(handoff.presentationEpoch).toEqual({
      owner: "HandleInputChooseAction",
      reset: "DoBounceEffect",
      elapsed: 2197,
      mon: { seed: 192, delta: 7, amplitude: 1 },
      healthbox: { seed: 128, delta: 7, amplitude: 1 },
    });
    expect(turn2PresentationEpochElapsedSinceReset(handoff, 2197)).toBe(0);
    expect(turn2PresentationEpochElapsedSinceReset(handoff, 2204)).toBe(7);
  });

  it("carries slot 2, field facts, ENDEAVOR routing, and the immutable epoch through generic content", () => {
    const legacy = resolveTurn2CompletedResolutionNextCommandHandoff(2197);
    const latest = resolveTurn2LatestCompletedCommandHandoff(2197);
    const content = latest.content;
    if (content === undefined) throw new Error("turn-2 generic receipt has no content");

    expect(isLatestCompletedCommandHandoffReady(latest)).toBe(true);
    expect(latest.playerPp).toEqual(legacy.playerPp);
    expect(latest.persistedMoveSlot).toBe(2);
    expect(content.field.player.hp.current).toBe(101);
    expect(content.field.opponent.hp.current).toBe(88);
    expect(content.presentationEpoch).toEqual(legacy.presentationEpoch);
    expect(content.upcoming?.moves).toMatchObject([
      { user: "opponent", target: "player", move: "ENDEAVOR", hpChange: { from: 101, to: 88 } },
      { user: "player", target: "opponent", move: "ROCK_SLIDE", hpChange: { from: 88, to: 41 } },
    ]);
    expect(latestCompletedCommandPresentationEpochElapsedSinceReset(latest, 2204)).toBe(7);
    expect(turn2CompletedResolutionNextCommandHandoffFromLatest(latest)).toEqual(legacy);
    expect(Object.isFrozen(content.presentationEpoch)).toBe(true);
    expect(Object.isFrozen(content.presentationEpoch!.mon)).toBe(true);
    expect(Object.isFrozen(content.upcoming?.moves)).toBe(true);
  });

  it("derives every turn-3 bounce and kickoff clock from turn-2 content's semantic epoch", () => {
    const latest = resolveTurn2LatestCompletedCommandHandoff(2197);
    const content = latest.content;
    if (content === undefined) throw new Error("turn-2 generic receipt has no content");

    expect(fightCommandSettledBounceEpochTick(content, 2204)).toBe(1748 + 7);
    expect(fightCommandSubmenuBounceEpochTick(content, 2807)).toBe(1748 + (2807 - 2197) - 3);
    expect(fightCommandKickoffBounceEpochTick(content, 2849, 2847))
      .toBe(1748 + (2849 - 2197) - 3);
    expect(fightCommandKickoffBounceEpochTick(content, 2850, 2847))
      .toBe(1748 + (2847 + 9 - 2197) - 3);
  });

  it("publishes only at the accepted choose-action reset and survives a later submenu reopen", () => {
    const handoff = resolveTurn2CompletedResolutionNextCommandHandoff(2197);

    expect(turn2ChooseActionResetElapsed(1905)).toBe(2197);
    expect(isTurn2ChooseActionBounceReset(1905, 2196)).toBe(false);
    expect(isTurn2ChooseActionBounceReset(1905, 2197)).toBe(true);
    expect(isTurn2NextCommandLifecycleActive(handoff, 1861)).toBe(false);
    expect(isTurn2NextCommandLifecycleActive(handoff, 2807)).toBe(true);
    // A same-turn B-close/A-reopen changes UI elapsed only; it cannot write a
    // fresh epoch over the immutable completed-turn receipt.
    expect(isTurn2NextCommandLifecycleActive(handoff, 2816)).toBe(true);
    expect(handoff.presentationEpoch.elapsed).toBe(2197);

    const latest = resolveTurn2LatestCompletedCommandHandoff(2197);
    expect(isLatestCompletedCommandLifecycleActive(latest, 1861)).toBe(false);
    expect(isLatestCompletedCommandLifecycleActive(latest, 2807)).toBe(true);
    expect(isLatestCompletedCommandLifecycleActive(latest, 2816)).toBe(true);
  });

  it("freezes every owner-facing nested fact", () => {
    const handoff = resolveTurn2CompletedResolutionNextCommandHandoff(2197);

    expect(Object.isFrozen(handoff)).toBe(true);
    expect(Object.isFrozen(handoff.playerPp)).toBe(true);
    expect(Object.isFrozen(handoff.hp)).toBe(true);
    expect(Object.isFrozen(handoff.presentationEpoch)).toBe(true);
    expect(Object.isFrozen(handoff.presentationEpoch.mon)).toBe(true);
    expect(Object.isFrozen(handoff.presentationEpoch.healthbox)).toBe(true);
    expect(Object.isFrozen(handoff.nextCommand)).toBe(true);
  });
});
