//! Pure helpers from `src/engine/factoryCorpusParty.ts`'s mon-construction
//! path that stand alone from `gen_tables`' data (shininess and EV-spread
//! derivation). Landed ahead of the member-construction function itself so
//! the data plumbing and these two pure functions are pinned independently
//! before that port begins.

/// Shiny-value denominator: personality/OT-id xor-fold values below this
/// are shiny (`include/pokemon.h:371` `GET_SHINY_VALUE`;
/// `constants/pokemon.h:94`). Mirrors `SHINY_ODDS`
/// (`src/engine/factoryCorpusParty.ts:33`).
const SHINY_ODDS: u32 = 8;

/// `GET_SHINY_VALUE` compared against `SHINY_ODDS`. Mirrors `isShiny`
/// (`src/engine/factoryCorpusParty.ts:171-176`).
#[must_use]
pub fn is_shiny(ot_id: u32, personality: u32) -> bool {
    let value =
        ((ot_id >> 16) ^ (ot_id & 0xffff) ^ (personality >> 16) ^ (personality & 0xffff)) & 0xffff;
    value < SHINY_ODDS
}

/// One member's derived EVs, ordered `[hp, attack, defense, speed,
/// sp_attack, sp_defense]` — the same order `gen_tables::FrontierMonRow`'s
/// `ev_flags` bit assignment documents (bit0=HP .. bit5=SP_DEFENSE).
pub type Evs = [u16; 6];

const EV_FLAG_HP: u8 = 1 << 0;
const EV_FLAG_ATTACK: u8 = 1 << 1;
const EV_FLAG_DEFENSE: u8 = 1 << 2;
const EV_FLAG_SPEED: u8 = 1 << 3;
const EV_FLAG_SP_ATTACK: u8 = 1 << 4;
const EV_FLAG_SP_DEFENSE: u8 = 1 << 5;

const MAX_TOTAL_EVS: u16 = 510;

/// Splits `MAX_TOTAL_EVS` evenly across the flagged stats. Mirrors
/// `deriveEvs` (`src/engine/factoryCorpusParty.ts:156-169`): `floor(510 /
/// flaggedCount)` per flagged stat, 0 elsewhere. Mirrors the TS function's
/// throw on an empty EV spread with `None` (no `gen_tables::FRONTIER_MONS`
/// row ever produces an empty mask — every real Factory set flags 2 or 3
/// stats).
#[must_use]
pub fn derive_evs(ev_flags: u8) -> Option<Evs> {
    let flagged_count = ev_flags.count_ones();
    if flagged_count == 0 {
        return None;
    }
    let ev_per_stat = MAX_TOTAL_EVS / flagged_count as u16;
    let value_if = |flag: u8| if ev_flags & flag != 0 { ev_per_stat } else { 0 };
    Some([
        value_if(EV_FLAG_HP),
        value_if(EV_FLAG_ATTACK),
        value_if(EV_FLAG_DEFENSE),
        value_if(EV_FLAG_SPEED),
        value_if(EV_FLAG_SP_ATTACK),
        value_if(EV_FLAG_SP_DEFENSE),
    ])
}

#[cfg(test)]
mod tests {
    use super::*;

    // --- is_shiny ---
    //
    // `isShiny` is not exported from factoryCorpusParty.ts, so these are
    // read off the exported `createFactoryCorpusPartyMember`'s `.shiny`
    // field (which calls it internally) via:
    //   node --experimental-strip-types -e '
    //     import("./src/engine/factoryCorpusParty.ts").then((m) => {
    //       const shinyTrue = m.createFactoryCorpusPartyMember({ setId: 6, personality: 0, fixedIv: 0, abilitySlot: 0, otId: 0 });
    //       console.log("shinyTrue (setId=6, personality=0, otId=0):", JSON.stringify({ shiny: shinyTrue.shiny, species: shinyTrue.speciesName }));
    //       const shinyFalse = m.createFactoryCorpusPartyMember({ setId: 8, personality: 18, fixedIv: 0, abilitySlot: 0, otId: 0 });
    //       console.log("shinyFalse (setId=8, personality=18, otId=0):", JSON.stringify({ shiny: shinyFalse.shiny, species: shinyFalse.speciesName }));
    //     });
    //   '
    // Output (run from the workspace root, 2026-08-11):
    //   shinyTrue (setId=6, personality=0, otId=0): {"shiny":true,"species":"SPECIES_MAGIKARP"}
    //   shinyFalse (setId=8, personality=18, otId=0): {"shiny":false,"species":"SPECIES_METAPOD"}

    #[test]
    fn is_shiny_true_matches_ts() {
        assert!(is_shiny(0, 0));
    }

    #[test]
    fn is_shiny_false_matches_ts() {
        assert!(!is_shiny(0, 18));
    }

    // --- derive_evs ---
    //
    // `deriveEvs` is not exported either, so the 2-flag and 3-flag cases
    // are read off `createFactoryCorpusPartyMember`'s `.evs` field for two
    // real frontier sets, via:
    //   node --experimental-strip-types -e '
    //     import("./src/engine/factoryCorpusParty.ts").then((m) => {
    //       const twoFlag = m.createFactoryCorpusPartyMember({ setId: 0, personality: 7, fixedIv: 3, abilitySlot: 0, otId: 0 });
    //       console.log("twoFlag (setId=0 SUNKERN, personality=7, fixedIv=3):", JSON.stringify({ evs: twoFlag.evs, species: twoFlag.speciesName, nature: twoFlag.natureName }));
    //       const threeFlag = m.createFactoryCorpusPartyMember({ setId: 110, personality: 24, fixedIv: 3, abilitySlot: 0, otId: 0 });
    //       console.log("threeFlag (setId=110 GRIMER, personality=24, fixedIv=3):", JSON.stringify({ evs: threeFlag.evs, species: threeFlag.speciesName, nature: threeFlag.natureName }));
    //     });
    //   '
    // Output (run from the workspace root, 2026-08-11):
    //   twoFlag (setId=0 SUNKERN, personality=7, fixedIv=3): {"evs":{"hp":255,"attack":0,"defense":0,"speed":0,"spAttack":255,"spDefense":0},"species":"SPECIES_SUNKERN","nature":"NATURE_RELAXED"}
    //   threeFlag (setId=110 GRIMER, personality=24, fixedIv=3): {"evs":{"hp":170,"attack":0,"defense":170,"speed":0,"spAttack":0,"spDefense":170},"species":"SPECIES_GRIMER","nature":"NATURE_QUIRKY"}
    // (set 0's ev_flags=17=0b010001=HP|SP_ATTACK, gen_tables::FRONTIER_MONS[0];
    // set 110's ev_flags=37=0b100101=HP|DEFENSE|SP_DEFENSE, FRONTIER_MONS[110].)
    //
    // No real frontier set flags exactly one stat (verified against all 882
    // src/data/gen/battle-frontier-mons.json rows: every `evSpreadStats` has
    // length 2 or 3), so the 1-flag case has no TS fixture to read off and
    // is pinned directly from the cited formula instead
    // (`floor(MAX_TOTAL_EVS / 1) = 510`, `factoryCorpusParty.ts:159`).

    #[test]
    fn derive_evs_two_flags_matches_ts() {
        // FRONTIER_MONS[0] (SUNKERN): ev_flags 17 = HP (bit0) | SP_ATTACK (bit4).
        assert_eq!(derive_evs(0b0001_0001), Some([255, 0, 0, 0, 255, 0]));
    }

    #[test]
    fn derive_evs_three_flags_matches_ts() {
        // FRONTIER_MONS[110] (GRIMER): ev_flags 37 = HP (bit0) | DEFENSE (bit2)
        // | SP_DEFENSE (bit5).
        assert_eq!(derive_evs(0b0010_0101), Some([170, 0, 170, 0, 0, 170]));
    }

    #[test]
    fn derive_evs_one_flag_is_full_spread() {
        assert_eq!(derive_evs(EV_FLAG_ATTACK), Some([0, 510, 0, 0, 0, 0]));
    }

    #[test]
    fn derive_evs_empty_mask_is_none() {
        assert_eq!(derive_evs(0), None);
    }

    #[test]
    fn derive_evs_matches_gen_tables_ev_flags() {
        use crate::gen_tables::FRONTIER_MONS;
        assert_eq!(
            derive_evs(FRONTIER_MONS[0].ev_flags),
            Some([255, 0, 0, 0, 255, 0])
        );
        assert_eq!(
            derive_evs(FRONTIER_MONS[110].ev_flags),
            Some([170, 0, 170, 0, 0, 170])
        );
    }
}
