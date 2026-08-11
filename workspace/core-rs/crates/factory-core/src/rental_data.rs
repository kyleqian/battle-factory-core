//! Battle Factory initial-rental generation helpers, ported from
//! `src/engine/factoryRentalGeneration.ts` and `src/engine/opponentGen.ts`
//! (the TS engine is the spec: every value pinned in this module's tests
//! traces to a TS fixture, a `node`-evaluated TS call, or the
//! `reference/pokeemerald` citations those two modules already carry).
//! Data tables live in `gen_tables` (generated, never hand-edited); this
//! module holds the pure functions that consume them.

use crate::gen_tables::{
    self, FixedIvRow, RentalRange, FIXED_IVS, MAXIMUM_RENTAL_RANK, NUM_NATURES,
    RENTAL_RANGES_LEVEL50, RENTAL_RANK_THRESHOLDS,
};

/// `GetNatureFromPersonality` (`reference/pokeemerald/src/pokemon.c:5498-5501`):
/// `personality % NUM_NATURES`. Mirrors `natureFromPersonality`
/// (`src/engine/opponentGen.ts:67-69`).
#[must_use]
pub fn nature_from_personality(personality: u32) -> u8 {
    (personality % u32::from(NUM_NATURES)) as u8
}

/// `GetNumPastRentalsRank` (`reference/pokeemerald/src/battle_factory.c:868-886`):
/// thresholds are `<15, <22, <29, <36, <43`, otherwise `MAXIMUM_RENTAL_RANK`.
/// Mirrors `getFactoryRentalRank` (`src/engine/factoryRentalGeneration.ts`).
#[must_use]
pub fn get_factory_rental_rank(rents_count: u32) -> u8 {
    RENTAL_RANK_THRESHOLDS
        .iter()
        .position(|&threshold| rents_count < threshold)
        .map_or(MAXIMUM_RENTAL_RANK, |index| index as u8)
}

/// `GetFactoryMonId` range selection
/// (`reference/pokeemerald/src/battle_factory.c:829-866`). Challenge 0..6
/// optionally advances one range for better rentals; challenge >=7 is
/// pinned to range 7 regardless of `use_better_range`. Mirrors
/// `getLevel50FactoryRentalRange`.
#[must_use]
pub fn get_level50_factory_rental_range(challenge_num: u32, use_better_range: bool) -> (u16, u16) {
    let range_index = if challenge_num < 7 {
        challenge_num + u32::from(use_better_range)
    } else {
        7
    };
    let RentalRange { start, end } = RENTAL_RANGES_LEVEL50[range_index as usize];
    (start, end)
}

/// Draft-rental fixed IV selection
/// (`reference/pokeemerald/src/battle_factory_screen.c:1757-1771`). The
/// ordinary IV column is selected because this is not an opponent's last
/// battle (`reference/pokeemerald/src/battle_factory.c:739-756`). Returns
/// `None` where the TS `getLevel50InitialRentalFixedIv` throws (the
/// `challengeNum + useBetterRange` index falls outside the source-defined
/// 0..=7 row range).
#[must_use]
pub fn get_level50_initial_rental_fixed_iv(
    challenge_num: u32,
    use_better_range: bool,
) -> Option<u8> {
    let iv_index = challenge_num.checked_add(u32::from(use_better_range))?;
    let FixedIvRow { regular, .. } = *FIXED_IVS.get(iv_index as usize)?;
    Some(regular)
}

/// `CreateBoxMon`'s ability-slot rule
/// (`reference/pokeemerald/src/pokemon.c:2296-2300`): personality bit 0
/// selects the ability slot only when the species has a second ability;
/// otherwise slot 0. Mirrors `abilitySlotForPersonality`
/// (`src/engine/factoryRentalGeneration.ts`).
#[must_use]
pub fn ability_slot_for_personality(species_id: u16, personality: u32) -> u8 {
    if gen_tables::species_second_ability(species_id) == 0 {
        0
    } else {
        (personality & 1) as u8
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::gen_tables::FRONTIER_MONS;

    // --- table sizes ---

    #[test]
    fn frontier_mons_has_882_rows() {
        assert_eq!(FRONTIER_MONS.len(), 882);
    }

    #[test]
    fn held_item_by_table_id_has_63_rows() {
        assert_eq!(gen_tables::HELD_ITEM_BY_TABLE_ID.len(), 63);
    }

    #[test]
    fn num_natures_is_25() {
        assert_eq!(gen_tables::NUM_NATURES, 25);
    }

    #[test]
    fn rental_ranges_level50_has_8_rows() {
        assert_eq!(RENTAL_RANGES_LEVEL50.len(), 8);
    }

    #[test]
    fn fixed_ivs_has_8_rows() {
        assert_eq!(FIXED_IVS.len(), 8);
    }

    // --- row pins (cross-cited against tests/factoryRentalGeneration.test.ts
    // and src/data/gen/battle-frontier-mons.json) ---

    #[test]
    fn frontier_mon_110_is_grimer_pecha_berry_quirky() {
        // tests/factoryRentalGeneration.test.ts seed-0 challenge-0 pin: set
        // id 110 is SPECIES_GRIMER (id 88), itemTableId 39 -> item id 135
        // (BATTLE_FRONTIER_ITEM_PECHA_BERRY, src/data/gen/battle-frontier-held-items.json
        // entries[39]), nature NATURE_QUIRKY (src/data/gen/natures.json
        // entries[24].name === "NATURE_QUIRKY").
        let row = FRONTIER_MONS[110];
        assert_eq!(row.species_id, 88);
        assert_eq!(row.item_table_id, 39);
        assert_eq!(
            gen_tables::HELD_ITEM_BY_TABLE_ID[usize::from(row.item_table_id)],
            135
        );
        assert_eq!(row.nature, 24);
    }

    #[test]
    fn frontier_mon_155_matches_source_json_row() {
        // src/data/gen/battle-frontier-mons.json entries[155]:
        //   { "index": 155, "species": "SPECIES_POLIWHIRL", "itemTableId": 60,
        //     "nature": "NATURE_QUIRKY", ... }
        // SPECIES_POLIWHIRL id 61 (src/data/gen/species-stats.json), itemTableId
        // 60 -> item id 171 (BATTLE_FRONTIER_ITEM_PETAYA_BERRY,
        // src/data/gen/battle-frontier-held-items.json entries[60]).
        let row = FRONTIER_MONS[155];
        assert_eq!(row.species_id, 61);
        assert_eq!(row.item_table_id, 60);
        assert_eq!(
            gen_tables::HELD_ITEM_BY_TABLE_ID[usize::from(row.item_table_id)],
            171
        );
        assert_eq!(row.nature, 24);
    }

    // --- get_factory_rental_rank ---

    #[test]
    fn rental_rank_thresholds() {
        // src/data/gen/factory-round-policy.json .rentalSelection:
        //   rentalRankThresholds = [15, 22, 29, 36, 43], maximumRentalRank = 5.
        // Rank is the index of the first threshold > rentsCount, else 5.
        let cases: [(u32, u8); 7] = [
            (0, 0),
            (14, 0),
            (15, 1),
            (22, 2),
            (42, 4),
            (43, 5),
            (100, 5),
        ];
        for (rents_count, expected_rank) in cases {
            assert_eq!(
                get_factory_rental_rank(rents_count),
                expected_rank,
                "rents_count={rents_count}"
            );
        }
    }

    // --- get_level50_factory_rental_range ---

    #[test]
    fn level50_rental_range_rows() {
        // src/data/gen/factory-round-policy.json .rentalSelection.ranges.level50:
        //   [ {110,199}, {162,266}, {267,371}, {372,467}, {468,563},
        //     {564,659}, {660,755}, {372,849} ]
        // Normal range is ranges[challengeNum]; the better-range slot is
        // ranges[challengeNum + 1]. challengeNum >= 7 is pinned to ranges[7]
        // regardless of useBetterRange (battle_factory.c:829-866).
        let cases: [(u32, bool, (u16, u16)); 16] = [
            (0, false, (110, 199)),
            (0, true, (162, 266)),
            (1, false, (162, 266)),
            (1, true, (267, 371)),
            (2, false, (267, 371)),
            (2, true, (372, 467)),
            (3, false, (372, 467)),
            (3, true, (468, 563)),
            (4, false, (468, 563)),
            (4, true, (564, 659)),
            (5, false, (564, 659)),
            (5, true, (660, 755)),
            (6, false, (660, 755)),
            (6, true, (372, 849)),
            (7, false, (372, 849)),
            (7, true, (372, 849)),
        ];
        for (challenge_num, use_better_range, expected) in cases {
            assert_eq!(
                get_level50_factory_rental_range(challenge_num, use_better_range),
                expected,
                "challenge_num={challenge_num} use_better_range={use_better_range}"
            );
        }
    }

    // --- get_level50_initial_rental_fixed_iv ---

    #[test]
    fn level50_initial_rental_fixed_iv_rows() {
        // src/data/gen/factory-round-policy.json .rentalSelection.fixedIvs
        // (regular column; index = challengeNum + (useBetterRange ? 1 : 0)):
        //   [3, 6, 9, 12, 15, 21, 31, 31]
        // Index 8 (challengeNum 7 + better range) is out of the 0..=7 row
        // range: TS throws there, this port returns None
        // (battle_factory_screen.c:1757-1771).
        let cases: [(u32, bool, Option<u8>); 16] = [
            (0, false, Some(3)),
            (0, true, Some(6)),
            (1, false, Some(6)),
            (1, true, Some(9)),
            (2, false, Some(9)),
            (2, true, Some(12)),
            (3, false, Some(12)),
            (3, true, Some(15)),
            (4, false, Some(15)),
            (4, true, Some(21)),
            (5, false, Some(21)),
            (5, true, Some(31)),
            (6, false, Some(31)),
            (6, true, Some(31)),
            (7, false, Some(31)),
            (7, true, None),
        ];
        for (challenge_num, use_better_range, expected) in cases {
            assert_eq!(
                get_level50_initial_rental_fixed_iv(challenge_num, use_better_range),
                expected,
                "challenge_num={challenge_num} use_better_range={use_better_range}"
            );
        }
    }

    // --- ability_slot_for_personality ---

    #[test]
    fn ability_slot_single_ability_species_is_always_slot_0() {
        // SPECIES_BULBASAUR (id 1, src/data/gen/species-stats.json) has
        // abilities ["ABILITY_OVERGROW", "ABILITY_NONE"]; second ability id
        // 0 (src/data/gen/ability-item-hooks.json ABILITY_NONE) forces slot 0
        // regardless of personality parity.
        assert_eq!(gen_tables::species_second_ability(1), 0);
        assert_eq!(ability_slot_for_personality(1, 0), 0);
        assert_eq!(ability_slot_for_personality(1, 1), 0);
        assert_eq!(ability_slot_for_personality(1, 0xffff_ffff), 0);
    }

    #[test]
    fn ability_slot_dual_ability_species_follows_personality_parity() {
        // SPECIES_GRIMER (id 88) has abilities ["ABILITY_STENCH",
        // "ABILITY_STICKY_HOLD"]; ABILITY_STICKY_HOLD id 60
        // (src/data/gen/ability-item-hooks.json) is nonzero, so the slot is
        // personality & 1 (pokemon.c:2296-2300).
        assert_eq!(gen_tables::species_second_ability(88), 60);
        assert_eq!(ability_slot_for_personality(88, 0), 0);
        assert_eq!(ability_slot_for_personality(88, 1), 1);
        assert_eq!(ability_slot_for_personality(88, 1_234_567), 1);
        assert_eq!(ability_slot_for_personality(88, 1_234_568), 0);
    }

    // --- nature_from_personality ---

    #[test]
    fn nature_from_personality_matches_ts() {
        // Expected pairs generated from the real TS module (not
        // hand-computed) via:
        //   node --experimental-strip-types -e '
        //     import("./src/engine/opponentGen.ts").then((m) => {
        //       const inputs = [0, 1, 24, 25, 123456789, 0xffffffff];
        //       for (const p of inputs) console.log(p, "->", m.natureFromPersonality(p));
        //     });
        //   '
        // Output (run from the workspace root, 2026-08-11):
        //   0 -> 0
        //   1 -> 1
        //   24 -> 24
        //   25 -> 0
        //   123456789 -> 14
        //   4294967295 -> 20
        let cases: [(u32, u8); 6] = [
            (0, 0),
            (1, 1),
            (24, 24),
            (25, 0),
            (123_456_789, 14),
            (0xffff_ffff, 20),
        ];
        for (personality, expected_nature) in cases {
            assert_eq!(
                nature_from_personality(personality),
                expected_nature,
                "personality={personality}"
            );
        }
    }
}
