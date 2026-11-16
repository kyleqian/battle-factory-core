import { describe, expect, it } from "vitest";
import {
  advanceBattleSceneForcedPartySelect,
  beginBattleSceneFollowingResolution,
  beginBattleSceneForcedPartySelect,
  createBattleSceneResolutionOwner,
  storeBattleSceneFollowingResolutionMenuRedraw,
} from "../src/engine/battleSceneResolutionOwner.ts";
import {
  CANONICAL_FORCED_SWITCH_PARTY,
  CANONICAL_FORCED_SWITCH_RENTAL_RECORDS,
  PARTY_ENTRY_FADE_OUT_START,
} from "../src/engine/partySelect.ts";
import { canonicalOpponentFlyResolution } from "../src/engine/turn15FlyResolutionAdapter.ts";
import { canonicalFirePunchResolution } from "../src/engine/turn16FirePunchResolutionAdapter.ts";

describe("exact battle-scene semantic resolution owner", () => {
  it("keeps the retained charge identity and owns only its published forced request", () => {
    const resolution = canonicalOpponentFlyResolution().strikeResolution;
    const owner = beginBattleSceneForcedPartySelect(
      createBattleSceneResolutionOwner(resolution),
      CANONICAL_FORCED_SWITCH_RENTAL_RECORDS,
      CANONICAL_FORCED_SWITCH_PARTY,
    );
    expect(owner.resolution).toBe(resolution);
    expect(owner.resolution.resolutionId)
      .toBe(canonicalOpponentFlyResolution().chargeResolution.resolutionId);
    expect(owner.forcedPartySelect?.request).toEqual(resolution.forcedRequest);
    expect(Object.isFrozen(owner)).toBe(true);
  });

  it("anchors selector presentation to the dismiss edge, independent of prior idle time", () => {
    const create = () => beginBattleSceneForcedPartySelect(
      createBattleSceneResolutionOwner(
        canonicalOpponentFlyResolution().strikeResolution,
      ),
      CANONICAL_FORCED_SWITCH_RENTAL_RECORDS,
      CANONICAL_FORCED_SWITCH_PARTY,
    );
    let immediate = create();
    let delayed = create();
    // Prior battle-message idle is deliberately absent from the owner. Once
    // either dismiss edge creates it, both selectors have the same clock.
    for (let i = 0; i < PARTY_ENTRY_FADE_OUT_START; i += 1) {
      immediate = advanceBattleSceneForcedPartySelect(immediate, new Set());
      delayed = advanceBattleSceneForcedPartySelect(delayed, new Set());
    }
    expect(delayed.forcedPartySelect).toEqual(immediate.forcedPartySelect);
    expect(delayed.forcedPartySelect?.elapsed).toBe(PARTY_ENTRY_FADE_OUT_START);
  });

  it("owns an immutable following resolution and its relative redraw edge without replacing the forced request owner", () => {
    let owner = beginBattleSceneForcedPartySelect(
      createBattleSceneResolutionOwner(
        canonicalOpponentFlyResolution().strikeResolution,
      ),
      CANONICAL_FORCED_SWITCH_RENTAL_RECORDS,
      CANONICAL_FORCED_SWITCH_PARTY,
    );
    owner = {
      ...owner,
      forcedPartySelect: {
        ...owner.forcedPartySelect!,
        sendOutElapsed: 311,
      },
    };
    owner = beginBattleSceneFollowingResolution(
      owner,
      canonicalFirePunchResolution().resolution,
      20_774 - 1_750,
    );
    const resolution = owner.followingPresentation!.resolution;
    expect(resolution).toBe(canonicalFirePunchResolution().resolution);
    expect(owner.resolution).toBe(canonicalOpponentFlyResolution().strikeResolution);
    expect(owner.forcedPartySelect?.request).toEqual(owner.resolution.forcedRequest);
    expect(owner.followingPresentation).toMatchObject({
      confirmElapsed: 20_774 - 1_750,
      menuRedrawElapsed: null,
    });

    owner = storeBattleSceneFollowingResolutionMenuRedraw(
      owner,
      21_725 - 1_750,
    );
    expect(owner.followingPresentation?.resolution).toBe(resolution);
    expect(owner.followingPresentation?.menuRedrawElapsed).toBe(21_725 - 1_750);
    expect(Object.isFrozen(owner)).toBe(true);
    expect(Object.isFrozen(owner.followingPresentation)).toBe(true);
  });
});
