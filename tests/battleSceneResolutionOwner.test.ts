import { describe, expect, it } from "vitest";
import {
  advanceBattleSceneForcedPartySelect,
  beginBattleSceneForcedPartySelect,
  createBattleSceneResolutionOwner,
} from "../src/engine/battleSceneResolutionOwner.ts";
import {
  CANONICAL_FORCED_SWITCH_PARTY,
  CANONICAL_FORCED_SWITCH_RENTAL_RECORDS,
  PARTY_ENTRY_FADE_OUT_START,
} from "../src/engine/partySelect.ts";
import { CANONICAL_OPPONENT_FLY_RESOLUTION } from "../src/engine/turn15FlyResolutionAdapter.ts";

describe("exact battle-scene semantic resolution owner", () => {
  it("keeps the retained charge identity and owns only its published forced request", () => {
    const resolution = CANONICAL_OPPONENT_FLY_RESOLUTION.strikeResolution;
    const owner = beginBattleSceneForcedPartySelect(
      createBattleSceneResolutionOwner(resolution),
      CANONICAL_FORCED_SWITCH_RENTAL_RECORDS,
      CANONICAL_FORCED_SWITCH_PARTY,
    );
    expect(owner.resolution).toBe(resolution);
    expect(owner.resolution.resolutionId)
      .toBe(CANONICAL_OPPONENT_FLY_RESOLUTION.chargeResolution.resolutionId);
    expect(owner.forcedPartySelect?.request).toEqual(resolution.forcedRequest);
    expect(Object.isFrozen(owner)).toBe(true);
  });

  it("anchors selector presentation to the dismiss edge, independent of prior idle time", () => {
    const create = () => beginBattleSceneForcedPartySelect(
      createBattleSceneResolutionOwner(
        CANONICAL_OPPONENT_FLY_RESOLUTION.strikeResolution,
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
});
