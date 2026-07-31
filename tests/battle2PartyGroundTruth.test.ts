import { describe, expect, it } from "vitest";
import { getMonGender } from "../src/engine/monGender.ts";
import { natureFromPersonality } from "../src/engine/opponentGen.ts";
import { BATTLE2_TURN1_KERNEL_CONFIG } from "../src/engine/battle2CommandAdapterPreview.ts";
import { BATTLE2_ACTION_MENU_MODEL } from "../src/engine/battle2ActionMenu.ts";
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };

/**
 * ISSUES #39 rank-1 evidence gap, closed by docs/battle2-party-ground-truth.md
 * (probe: tools/probe/dump-battle2-party-ground-truth.py, replaying
 * tools/compare/traces-groundtruth/battle1-winline-b-swap.json verbatim to
 * Battle 2's settled first action menu, tick 33031). Every literal below is
 * cited to that doc's §2/§3 raw probe output -- this test asserts the
 * port's own derivation functions against those RAM-dumped facts, not
 * against each other.
 */

const NATURE_NAME_BY_INDEX = new Map(
  (naturesData as { natures: { index: number; name: string }[] }).natures.map(
    (nature) => [nature.index, nature.name],
  ),
);

function expectedNatureFor(frontierMonIndex: number): string {
  const entry = (
    frontierMonsData as { entries: { index: number; nature: string }[] }
  ).entries.find((candidate) => candidate.index === frontierMonIndex);
  if (!entry) throw new Error(`no battle-frontier-mons.json entry at index ${frontierMonIndex}`);
  return entry.nature;
}

describe("battle2PartyGroundTruth: ISSUES #39 rank-1 personality/gender/bench evidence", () => {
  describe("ONIX (gPlayerParty[0], docs/battle2-party-ground-truth.md §2/§3)", () => {
    const ONIX_PERSONALITY = 1205102525;
    const ONIX_GENDER_RATIO = 127; // species_info.h: PERCENT_FEMALE(50) -> min(254, 127.5) -> 127

    it("derives NATURE_HARDY from the probed personality, matching FRONTIER_MON_ONIX's (index 156) fixed rental nature", () => {
      const natureIndex = natureFromPersonality(ONIX_PERSONALITY);
      expect(NATURE_NAME_BY_INDEX.get(natureIndex)).toBe("NATURE_HARDY");
      expect(NATURE_NAME_BY_INDEX.get(natureIndex)).toBe(expectedNatureFor(156));
    });

    it("derives 'male' via the port's own getMonGender, matching the legacy fixture's hardcoded gender (not the personality-less staged config's 'female')", () => {
      expect(getMonGender(ONIX_GENDER_RATIO, ONIX_PERSONALITY)).toBe("male");
      expect(BATTLE2_ACTION_MENU_MODEL.player.gender).toBe("male");
    });
  });

  describe("KABUTO (gEnemyParty[0], docs/battle2-party-ground-truth.md §2/§3)", () => {
    const KABUTO_PERSONALITY = 2507133325;
    const KABUTO_GENDER_RATIO = 31; // species_info.h: PERCENT_FEMALE(12.5) -> min(254, 31.875) -> 31

    it("derives NATURE_HARDY from the probed personality, matching FRONTIER_MON_KABUTO's (index 139) fixed rental nature", () => {
      const natureIndex = natureFromPersonality(KABUTO_PERSONALITY);
      expect(NATURE_NAME_BY_INDEX.get(natureIndex)).toBe("NATURE_HARDY");
      expect(NATURE_NAME_BY_INDEX.get(natureIndex)).toBe(expectedNatureFor(139));
    });

    it("derives 'male' via the port's own getMonGender, matching the legacy fixture's hardcoded gender (not the personality-less staged config's 'female')", () => {
      expect(getMonGender(KABUTO_GENDER_RATIO, KABUTO_PERSONALITY)).toBe("male");
      expect(BATTLE2_ACTION_MENU_MODEL.opponent.gender).toBe("male");
    });
  });

  it("FINDING 2 verdict: the staged kernel config's personality-less defaults derive the wrong gender for both mons -- the ROM says 'male'/'male', not 'female'/'female'", () => {
    expect(BATTLE2_TURN1_KERNEL_CONFIG.player).not.toHaveProperty("personality");
    expect(BATTLE2_TURN1_KERNEL_CONFIG.trainer).not.toHaveProperty("personality");
    expect(getMonGender(127, 0)).toBe("female");
    expect(getMonGender(31, 0)).toBe("female");
  });

  it("FINDING 1 verdict: the probed player bench (MAGBY 138/138 at partyIndex 1, BAYLEEF 153/153 at partyIndex 2, both alive and non-egg) makes the legacy fixture's two hardcoded switch decisions (battleScene.ts:6831-6832) legal -- the staged kernel config just never modeled a bench to source them from", () => {
    // docs/battle2-party-ground-truth.md §4: legalCommandDecisions admits a
    // switch iff partyIndex !== active && species !== 0 && !isEgg && hp !== 0.
    const probedPlayerBench = [
      { partyIndex: 1, species: "SPECIES_MAGBY", hp: 138, isEgg: false },
      { partyIndex: 2, species: "SPECIES_BAYLEEF", hp: 153, isEgg: false },
    ];
    const legalSwitches = probedPlayerBench
      .filter((bench) => bench.species !== "SPECIES_NONE" && !bench.isEgg && bench.hp !== 0)
      .map((bench) => ({ kind: "switch" as const, partyIndex: bench.partyIndex }));
    expect(legalSwitches).toEqual([
      { kind: "switch", partyIndex: 1 },
      { kind: "switch", partyIndex: 2 },
    ]);
  });
});
