import { describe, expect, it } from "vitest";
import { rentalMoveset } from "../src/engine/battleSetup.ts";
import { resolveTurn3LatestCompletedCommandHandoff } from "../src/engine/turn3ResolutionAdapter.ts";
import {
  isTurn4NextCommandHandoffReady,
  isTurn4NextCommandLifecycleActive,
  resolveTurn4CompletedResolutionNextCommandHandoff,
  resolveTurn4LatestCompletedCommandHandoff,
  turn4CompletedResolutionNextCommandHandoffFromLatest,
  turn4PresentationEpochElapsedSinceReset,
} from "../src/engine/turn4ResolutionAdapter.ts";
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
  isTurn4ChooseActionBounceReset,
  turn4ChooseActionResetElapsed,
} from "../src/engine/turn4ChooseActionReset.ts";

const TURN3_PRIOR_LATEST = resolveTurn3LatestCompletedCommandHandoff(3172);

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

  it("carries slot 0, field facts, ENDEAVOR/ROCK_SLIDE routing, and the immutable epoch through generic content", () => {
    const legacy = resolveTurn4CompletedResolutionNextCommandHandoff(4312);
    const latest = resolveTurn4LatestCompletedCommandHandoff(4312, TURN3_PRIOR_LATEST);
    const content = latest.content;
    if (content === undefined) throw new Error("turn-4 generic receipt has no content");

    expect(isLatestCompletedCommandHandoffReady(latest)).toBe(true);
    expect(latest.playerPp).toEqual(TURN3_PRIOR_LATEST.playerPp);
    expect(latest.persistedMoveSlot).toBe(0);
    expect(content.field.player.hp.current).toBe(88);
    expect(content.field.opponent.hp.current).toBe(1);
    expect(content.presentationEpoch).toEqual(legacy.presentationEpoch);
    expect(content.upcoming?.moves).toMatchObject([
      { user: "opponent", target: "player", move: "ENDEAVOR" },
      { user: "player", target: "opponent", move: "ROCK_SLIDE", hpChange: { from: 1, to: 0 } },
    ]);
    expect(latestCompletedCommandPresentationEpochElapsedSinceReset(latest, 4319)).toBe(7);
    expect(turn4CompletedResolutionNextCommandHandoffFromLatest(latest)).toEqual({
      ...legacy,
      playerPp: TURN3_PRIOR_LATEST.playerPp,
    });
    expect(Object.isFrozen(content.presentationEpoch)).toBe(true);
    expect(Object.isFrozen(content.presentationEpoch!.mon)).toBe(true);
    expect(Object.isFrozen(content.upcoming?.moves)).toBe(true);
  });

  it("derives every turn-5 bounce and kickoff clock from turn-4 content's semantic epoch", () => {
    const latest = resolveTurn4LatestCompletedCommandHandoff(4312, TURN3_PRIOR_LATEST);
    const content = latest.content;
    if (content === undefined) throw new Error("turn-4 generic receipt has no content");

    expect(fightCommandSettledBounceEpochTick(content, 4319)).toBe(1748 + 7);
    expect(fightCommandSubmenuBounceEpochTick(content, 4319)).toBe(1748 + (4319 - 4312) - 236);
    expect(fightCommandKickoffBounceEpochTick(content, 4323, 4322))
      .toBe(1748 + (4323 - 4312) - 236);
    expect(fightCommandKickoffBounceEpochTick(content, 4326, 4322))
      .toBe(1748 + (4322 - 236 - 4312));
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

    const latest = resolveTurn4LatestCompletedCommandHandoff(4312, TURN3_PRIOR_LATEST);
    expect(isLatestCompletedCommandLifecycleActive(latest, 3853)).toBe(false);
    expect(isLatestCompletedCommandLifecycleActive(latest, 4887)).toBe(true);
    expect(isLatestCompletedCommandLifecycleActive(latest, 4896)).toBe(true);
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

  it("pins playerPp/persistedMoveSlot from the prior latest handoff while content stays turn-4 fresh (turn4-fold-pp-freshness-design.md §3.3)", () => {
    const latest = resolveTurn4LatestCompletedCommandHandoff(4312, TURN3_PRIOR_LATEST);
    const content = latest.content;
    if (content === undefined) throw new Error("turn-4 generic receipt has no content");

    expect(latest.playerPp).toEqual(TURN3_PRIOR_LATEST.playerPp);
    expect(latest.persistedMoveSlot).toBe(TURN3_PRIOR_LATEST.persistedMoveSlot);
    expect(latest.playerPp).not.toEqual(
      resolveTurn4CompletedResolutionNextCommandHandoff(4312).playerPp,
    );
    expect(content.field.player.hp.current).toBe(88);
  });
});
