import { describe, expect, it } from "vitest";
import { rentalMoveset } from "../src/engine/battleSetup.ts";
import {
  isTurn3NextCommandHandoffReady,
  isTurn3NextCommandLifecycleActive,
  resolveTurn3CompletedResolutionNextCommandHandoff,
  resolveTurn3LatestCompletedCommandHandoff,
  turn3CompletedResolutionNextCommandHandoffFromLatest,
  turn3PresentationEpochElapsedSinceReset,
} from "../src/engine/turn3ResolutionAdapter.ts";
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
  isTurn3ChooseActionBounceReset,
  turn3ChooseActionResetElapsed,
} from "../src/engine/turn3ChooseActionReset.ts";

describe("turn3ResolutionAdapter: #39 completed-turn-3/next-command handoff proof", () => {
  it("publishes canonical PP, persisted slot, field HP, and settled/input-ready facts", () => {
    const handoff = resolveTurn3CompletedResolutionNextCommandHandoff(3172);

    expect(handoff.playerPp).toEqual([8, 20, 19, 10]);
    expect(handoff.persistedMoveSlot).toBe(0);
    expect(handoff.hp).toEqual({ player: 88, opponent: 41 });
    expect(handoff.nextCommand).toEqual({ redraw: "settled", input: "ready" });
    expect(isTurn3NextCommandHandoffReady(handoff)).toBe(true);
    expect(isTurn3NextCommandHandoffReady(null)).toBe(false);
  });

  it("derives the second ROCK_SLIDE and prior DRAGON_BREATH uses from the canonical ONIX moveset", () => {
    const [rockSlide, bind, dragonBreath, sandstorm] = rentalMoveset("ONIX").maxPP;
    expect(resolveTurn3CompletedResolutionNextCommandHandoff(0).playerPp).toEqual([
      rockSlide - 2,
      bind,
      dragonBreath - 1,
      sandstorm,
    ]);
  });

  it("owns the runtime-relative 3172 reset epoch rather than the later turn-4 submenu reopen", () => {
    const handoff = resolveTurn3CompletedResolutionNextCommandHandoff(3172);

    expect(handoff.presentationEpoch).toEqual({
      owner: "HandleInputChooseAction",
      reset: "DoBounceEffect",
      elapsed: 3172,
      mon: { seed: 192, delta: 7, amplitude: 1 },
      healthbox: { seed: 128, delta: 7, amplitude: 1 },
    });
    expect(turn3PresentationEpochElapsedSinceReset(handoff, 3172)).toBe(0);
    expect(turn3PresentationEpochElapsedSinceReset(handoff, 3179)).toBe(7);
  });

  it("carries slot 0, field facts, DOUBLE_TEAM/ROCK_SLIDE routing, and the immutable epoch through generic content", () => {
    const legacy = resolveTurn3CompletedResolutionNextCommandHandoff(3172);
    const latest = resolveTurn3LatestCompletedCommandHandoff(3172);
    const content = latest.content;
    if (content === undefined) throw new Error("turn-3 generic receipt has no content");

    expect(isLatestCompletedCommandHandoffReady(latest)).toBe(true);
    expect(latest.playerPp).toEqual(legacy.playerPp);
    expect(latest.persistedMoveSlot).toBe(0);
    expect(content.field.player.hp.current).toBe(88);
    expect(content.field.opponent.hp.current).toBe(41);
    expect(content.presentationEpoch).toEqual(legacy.presentationEpoch);
    expect(content.upcoming?.moves).toMatchObject([
      { user: "opponent", target: "opponent", move: "DOUBLE_TEAM" },
      { user: "player", target: "opponent", move: "ROCK_SLIDE", hpChange: { from: 41, to: 1 } },
    ]);
    expect(latestCompletedCommandPresentationEpochElapsedSinceReset(latest, 3179)).toBe(7);
    expect(turn3CompletedResolutionNextCommandHandoffFromLatest(latest)).toEqual(legacy);
    expect(Object.isFrozen(content.presentationEpoch)).toBe(true);
    expect(Object.isFrozen(content.presentationEpoch!.mon)).toBe(true);
    expect(Object.isFrozen(content.upcoming?.moves)).toBe(true);
  });

  it("derives every turn-4 bounce and kickoff clock from turn-3 content's semantic epoch", () => {
    const latest = resolveTurn3LatestCompletedCommandHandoff(3172);
    const content = latest.content;
    if (content === undefined) throw new Error("turn-3 generic receipt has no content");

    expect(fightCommandSettledBounceEpochTick(content, 3179)).toBe(1748 + 7);
    expect(fightCommandSubmenuBounceEpochTick(content, 3179)).toBe(1748 + (3179 - 3172) - 2);
    expect(fightCommandKickoffBounceEpochTick(content, 3183, 3182))
      .toBe(1748 + (3183 - 3172) - 2);
    expect(fightCommandKickoffBounceEpochTick(content, 3186, 3182))
      .toBe(1748 + (3182 - 13 - 3172));
  });

  it("publishes only at the accepted choose-action reset and survives a later submenu reopen", () => {
    const handoff = resolveTurn3CompletedResolutionNextCommandHandoff(3172);

    expect(turn3ChooseActionResetElapsed(2851)).toBe(3172);
    expect(isTurn3ChooseActionBounceReset(2851, 3171)).toBe(false);
    expect(isTurn3ChooseActionBounceReset(2851, 3172)).toBe(true);
    expect(isTurn3NextCommandLifecycleActive(handoff, 2807)).toBe(false);
    expect(isTurn3NextCommandLifecycleActive(handoff, 3853)).toBe(true);
    // A same-turn B-close/A-reopen changes UI elapsed only; it cannot write a
    // fresh epoch over the immutable completed-turn receipt.
    expect(isTurn3NextCommandLifecycleActive(handoff, 3862)).toBe(true);
    expect(handoff.presentationEpoch.elapsed).toBe(3172);

    const latest = resolveTurn3LatestCompletedCommandHandoff(3172);
    expect(isLatestCompletedCommandLifecycleActive(latest, 2807)).toBe(false);
    expect(isLatestCompletedCommandLifecycleActive(latest, 3853)).toBe(true);
    expect(isLatestCompletedCommandLifecycleActive(latest, 3862)).toBe(true);
  });

  it("freezes every owner-facing nested fact", () => {
    const handoff = resolveTurn3CompletedResolutionNextCommandHandoff(3172);

    expect(Object.isFrozen(handoff)).toBe(true);
    expect(Object.isFrozen(handoff.playerPp)).toBe(true);
    expect(Object.isFrozen(handoff.hp)).toBe(true);
    expect(Object.isFrozen(handoff.presentationEpoch)).toBe(true);
    expect(Object.isFrozen(handoff.presentationEpoch.mon)).toBe(true);
    expect(Object.isFrozen(handoff.presentationEpoch.healthbox)).toBe(true);
    expect(Object.isFrozen(handoff.nextCommand)).toBe(true);
  });
});
