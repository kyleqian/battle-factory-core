import { describe, expect, it } from "vitest";
import { getMonGender } from "../src/engine/monGender.ts";
import { natureFromPersonality } from "../src/engine/opponentGen.ts";
import {
  BATTLE2_TURN1_KERNEL_CONFIG,
  createBattle2CommandAdapterCommand,
} from "../src/engine/battle2CommandAdapter.ts";
import { BATTLE2_ACTION_MENU_MODEL } from "../src/engine/battleScene.ts";
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

  it("FINDING 2 fixed: the production kernel config now carries the real RAM-probed personalities and derives 'male'/'male', not the personality-less default's 'female'/'female'", () => {
    expect(BATTLE2_TURN1_KERNEL_CONFIG.player.personality).toBe(1205102525);
    expect(BATTLE2_TURN1_KERNEL_CONFIG.trainer.personality).toBe(2507133325);
    // The personality-less default this config used to fall back to (pre-flip
    // gap) would have derived female for both -- keep that contrast on record.
    expect(getMonGender(127, 0)).toBe("female");
    expect(getMonGender(31, 0)).toBe("female");
  });

  it("FINDING 1 fixed: the production kernel config now carries the real player bench (MAGBY 138/138 at partyIndex 1, BAYLEEF 153/153 at partyIndex 2), so the live command adapter derives both switch decisions from kernel data instead of a battleScene.ts literal", () => {
    // docs/battle2-party-ground-truth.md §4: legalCommandDecisions admits a
    // switch iff partyIndex !== active && species !== 0 && !isEgg && hp !== 0.
    expect(BATTLE2_TURN1_KERNEL_CONFIG.playerBenchHp).toEqual([138, 153]);
    const command = createBattle2CommandAdapterCommand();
    expect(
      command.request.legalDecisions.filter((decision) => decision.kind === "switch"),
    ).toEqual([
      { kind: "switch", partyIndex: 1 },
      { kind: "switch", partyIndex: 2 },
    ]);
  });
});
