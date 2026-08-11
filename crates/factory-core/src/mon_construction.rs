//! Pure helpers from `src/engine/factoryCorpusParty.ts`'s mon-construction
//! path that stand alone from `gen_tables`' data (shininess and EV-spread
//! derivation), plus `create_factory_corpus_party_member` /
//! `create_factory_corpus_party` themselves, which combine those helpers
//! with `gen_tables`, `gender`, `rental_data::nature_from_personality`, and
//! `stats` to reproduce `createFactoryCorpusPartyMember` /
//! `createFactoryCorpusParty` (`src/engine/factoryCorpusParty.ts:179-308`)
//! field for field.

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

use crate::gen_tables;
use crate::gender::{get_mon_gender, MonGender};
use crate::rental_data::nature_from_personality;
use crate::stats::{calculate_hp_stat, calculate_other_stat};

/// Level-50 singles Factory contract. Mirrors `FACTORY_LEVEL_50`
/// (`src/engine/factoryCorpusParty.ts:31`).
const FACTORY_LEVEL_50: u32 = 50;

/// Mirrors `FactoryCorpusPartyInstance` (`src/engine/factoryCorpusParty.ts:113-124`).
///
/// `personality` and `ot_id` are native `u32`, so the TS `requireU32`
/// range/integer checks (`factoryCorpusParty.ts:149-154`) are vacuous here —
/// Rust's type system already excludes non-integers and out-of-`u32`-range
/// values that TS (whose numbers are all f64) must reject at runtime.
/// `ability_slot` mirrors the TS type's `0 | 1` domain: it is not
/// runtime-validated here either (TS doesn't validate it at runtime beyond
/// the erased type annotation), so callers must pass 0 or 1 — every real
/// caller does (`ability_slot_for_personality`-derived or a literal 0/1).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryCorpusPartyInstance {
    pub set_id: u32,
    pub personality: u32,
    pub fixed_iv: u32,
    pub ability_slot: u8,
    pub ot_id: u32,
}

/// Mirrors `FactoryCorpusPartyMemberState` (`src/engine/factoryCorpusParty.ts:131-147`)
/// narrowed to numeric/enum fields — `speciesName`, `abilityName`,
/// `natureName`, `itemName`, `holdEffectName` are resolved decoder-side
/// (`core-rs/adapter/factoryEngine.ts`) from the same JSONs the TS engine
/// reads, exactly like `core-rs/adapter/factoryEngine.ts`'s existing
/// `speciesNameForId` does for `RentalRecord`.
///
/// Field order here mirrors the TS function's return-statement order
/// (`factoryCorpusParty.ts:252-288`) with the name fields elided, and is
/// the same order `crates/factory-wasm/src/lib.rs`'s
/// `fw_create_factory_party_member` buffer layout uses.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryCorpusPartyMemberState {
    pub set_id: u16,
    pub species_id: u16,
    /// Always `false`: Factory corpus mons are never eggs.
    pub is_egg: bool,
    /// Mirrors TS `abilityNum` -- always equal to `ability_slot`
    /// (`factoryCorpusParty.ts:257`, `MON_DATA_ABILITY_NUM`).
    pub ability_num: u8,
    pub ability_slot: u8,
    pub ability: u16,
    /// `[hp, attack, defense, speed, sp_attack, sp_defense]`, all six equal
    /// to the instance's `fixed_iv` (`uniformBattleScriptIvs`,
    /// `src/engine/battleScriptRulesContext.ts:188-199`).
    pub ivs: [u8; 6],
    pub personality: u32,
    pub experience: u32,
    /// Always 50 (`FACTORY_LEVEL_50`).
    pub level: u8,
    /// Always 0 (`battle_tower.c:1870-1883` friendship reset).
    pub friendship: u8,
    pub max_hp: u32,
    pub attack: u32,
    pub defense: u32,
    pub speed: u32,
    pub sp_attack: u32,
    pub sp_defense: u32,
    /// Always equal to `max_hp` (a freshly constructed mon is unhurt).
    pub hp: u32,
    /// Always 0.
    pub status1: u8,
    pub item_id: u16,
    pub hold_effect: u16,
    pub hold_effect_param: u8,
    pub moves: [u16; 4],
    /// Base PP per move slot (`gen_tables::MOVE_PP`); zero moves (id 0,
    /// unused slots on a &lt;4-move set) have base PP 0.
    pub pp: [u8; 4],
    /// Always 0 -- Factory sets carry no PP Ups
    /// (`factoryCorpusParty.ts:209-211`).
    pub pp_bonuses: u8,
    /// Always `[0, 0, 0, 0]` (see `pp_bonuses`).
    pub pp_ups: [u8; 4],
    pub nature: u8,
    /// `[hp, attack, defense, speed, sp_attack, sp_defense]`, mirroring
    /// `Evs`'s order.
    pub evs: [u16; 6],
    pub gender: MonGender,
    pub shiny: bool,
}

/// Mirrors the three `Error` throws in `createFactoryCorpusPartyMember`
/// reachable from caller-supplied `FactoryCorpusPartyInstance` fields
/// (`factoryCorpusParty.ts:182-200`, `battleScriptRulesContext.ts:189-190`).
/// Every other TS throw in that function (unknown species/nature/move/item/
/// hold-effect/ability/growth-rate) is impossible against the generated
/// `gen_tables` — see `core-rs/tools/gen-data.mjs`, which fails codegen if
/// any `FRONTIER_MONS` row's species/moves/item don't resolve -- so those
/// lookups use `.expect()` instead of a `Result` variant here, mirroring
/// `rental_generation.rs`'s `GenerationError` doc comment.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PartyMemberError {
    /// `factoryCorpusParty.ts:182-184`.
    SetIdOutOfRange { set_id: u32, max: u32 },
    /// `factoryCorpusParty.ts:193-200`.
    NatureMismatch {
        set_id: u16,
        expected_nature: u8,
        personality: u32,
        derived_nature: u8,
    },
    /// `uniformBattleScriptIvs` (`battleScriptRulesContext.ts:188-199`).
    InvalidFixedIv { fixed_iv: u32 },
}

impl std::fmt::Display for PartyMemberError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PartyMemberError::SetIdOutOfRange { set_id, max } => {
                write!(f, "Frontier set id must be in 0..{max}, got {set_id}")
            }
            PartyMemberError::NatureMismatch {
                set_id,
                expected_nature,
                personality,
                derived_nature,
            } => write!(
                f,
                "Frontier set {set_id} requires nature {expected_nature}, personality {personality} derives {derived_nature}"
            ),
            PartyMemberError::InvalidFixedIv { fixed_iv } => {
                write!(f, "uniform IV must be an integer in 0..31, got {fixed_iv}")
            }
        }
    }
}

/// Ports `createFactoryCorpusPartyMember` (`src/engine/factoryCorpusParty.ts:179-289`).
pub fn create_factory_corpus_party_member(
    instance: FactoryCorpusPartyInstance,
) -> Result<FactoryCorpusPartyMemberState, PartyMemberError> {
    let frontier_len = gen_tables::FRONTIER_MONS.len();
    if instance.set_id as usize >= frontier_len {
        return Err(PartyMemberError::SetIdOutOfRange {
            set_id: instance.set_id,
            max: (frontier_len - 1) as u32,
        });
    }
    let set_id = instance.set_id as u16;
    let set = gen_tables::FRONTIER_MONS[instance.set_id as usize];

    let species = gen_tables::species_row(set.species_id).expect(
        "every FRONTIER_MONS species resolves in gen_tables::SPECIES (core-rs/tools/gen-data.mjs)",
    );

    // GetNatureFromPersonality (pokemon.c:5498-5501), after the source
    // rejection loop has selected a personality for this set's nature.
    let derived_nature = nature_from_personality(instance.personality);
    if derived_nature != set.nature {
        return Err(PartyMemberError::NatureMismatch {
            set_id,
            expected_nature: set.nature,
            personality: instance.personality,
            derived_nature,
        });
    }

    if instance.fixed_iv > 31 {
        return Err(PartyMemberError::InvalidFixedIv { fixed_iv: instance.fixed_iv });
    }
    let iv = instance.fixed_iv as u8;
    let ivs = [iv; 6];

    let evs = derive_evs(set.ev_flags).expect(
        "every real FRONTIER_MONS row flags at least one EV stat (core-rs/tools/gen-data.mjs)",
    );

    let pp = [
        gen_tables::MOVE_PP[set.moves[0] as usize],
        gen_tables::MOVE_PP[set.moves[1] as usize],
        gen_tables::MOVE_PP[set.moves[2] as usize],
        gen_tables::MOVE_PP[set.moves[3] as usize],
    ];

    let item_id = gen_tables::HELD_ITEM_BY_TABLE_ID[set.item_table_id as usize];
    let hold_effect = gen_tables::HELD_ITEM_HOLD_EFFECT_BY_TABLE_ID[set.item_table_id as usize];
    let hold_effect_param =
        gen_tables::HELD_ITEM_HOLD_EFFECT_PARAM_BY_TABLE_ID[set.item_table_id as usize];

    // CreateBoxMon only uses personality bit 0 for a genuine second ability
    // (pokemon.c:2296-2300). Single-ability species always serialize slot 0.
    let second_ability = species.abilities[1];
    let ability_slot = if second_ability == 0 {
        0
    } else {
        instance.ability_slot
    };
    let ability = species.abilities[ability_slot as usize];

    let nature_mods = gen_tables::NATURE_MODIFIERS[set.nature as usize];
    let max_hp = calculate_hp_stat(
        u32::from(species.base_hp),
        u32::from(iv),
        u32::from(evs[0]),
        FACTORY_LEVEL_50,
    );
    let attack = calculate_other_stat(
        u32::from(species.base_attack),
        u32::from(iv),
        u32::from(evs[1]),
        FACTORY_LEVEL_50,
        nature_mods.attack,
    );
    let defense = calculate_other_stat(
        u32::from(species.base_defense),
        u32::from(iv),
        u32::from(evs[2]),
        FACTORY_LEVEL_50,
        nature_mods.defense,
    );
    let speed = calculate_other_stat(
        u32::from(species.base_speed),
        u32::from(iv),
        u32::from(evs[3]),
        FACTORY_LEVEL_50,
        nature_mods.speed,
    );
    let sp_attack = calculate_other_stat(
        u32::from(species.base_sp_attack),
        u32::from(iv),
        u32::from(evs[4]),
        FACTORY_LEVEL_50,
        nature_mods.sp_attack,
    );
    let sp_defense = calculate_other_stat(
        u32::from(species.base_sp_defense),
        u32::from(iv),
        u32::from(evs[5]),
        FACTORY_LEVEL_50,
        nature_mods.sp_defense,
    );

    Ok(FactoryCorpusPartyMemberState {
        set_id,
        species_id: species.species_id,
        is_egg: false,
        ability_num: ability_slot,
        ability_slot,
        ability,
        ivs,
        personality: instance.personality,
        experience: species.exp_at_50,
        level: FACTORY_LEVEL_50 as u8,
        friendship: 0,
        max_hp,
        attack,
        defense,
        speed,
        sp_attack,
        sp_defense,
        hp: max_hp,
        status1: 0,
        item_id,
        hold_effect,
        hold_effect_param,
        moves: set.moves,
        pp,
        pp_bonuses: 0,
        pp_ups: [0, 0, 0, 0],
        nature: set.nature,
        evs,
        gender: get_mon_gender(species.gender_ratio, instance.personality),
        shiny: is_shiny(instance.ot_id, instance.personality),
    })
}

/// Ports `createFactoryCorpusParty` (`src/engine/factoryCorpusParty.ts:292-308`).
pub fn create_factory_corpus_party(
    instances: [FactoryCorpusPartyInstance; 3],
) -> Result<[FactoryCorpusPartyMemberState; 3], PartyMemberError> {
    Ok([
        create_factory_corpus_party_member(instances[0])?,
        create_factory_corpus_party_member(instances[1])?,
        create_factory_corpus_party_member(instances[2])?,
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

    // --- create_factory_corpus_party_member ---
    //
    // Expected values generated from the real TS module (not hand-computed)
    // via, run from the workspace root, 2026-08-11:
    //   node --experimental-strip-types -e '
    //     import("./src/engine/factoryCorpusParty.ts").then((m) => {
    //       const r0 = m.createFactoryCorpusPartyMember({ setId: 110, personality: 813709149, fixedIv: 3, abilitySlot: 1, otId: 0x12345678 });
    //       console.log("GRIMER dual-ability slot1:", JSON.stringify(r0));
    //       const r1 = m.createFactoryCorpusPartyMember({ setId: 140, personality: 3187899706, fixedIv: 3, abilitySlot: 1, otId: 0x12345678 });
    //       console.log("LILEEP forced-slot0 (instance.abilitySlot=1):", JSON.stringify(r1));
    //     });
    //   '
    // then, searching personalities for a shiny-true hit against setId 6 (SPECIES_MAGIKARP):
    //   node --experimental-strip-types -e '
    //     import("./src/engine/factoryCorpusParty.ts").then((m) => {
    //       const setId = 6, otId = 0x12345678;
    //       for (let p = 0; p < 2000000; p++) {
    //         try {
    //           const r = m.createFactoryCorpusPartyMember({ setId, personality: p, fixedIv: 8, abilitySlot: 0, otId });
    //           if (r.shiny) { console.log("found", p, JSON.stringify(r)); break; }
    //         } catch (e) {}
    //       }
    //     });
    //   '
    //
    // Output:
    //   GRIMER dual-ability slot1: {"setId":110,"species":88,"speciesName":"SPECIES_GRIMER",
    //     "isEgg":false,"abilityNum":1,"abilitySlot":1,"ability":60,"abilityName":"ABILITY_STICKY_HOLD",
    //     "ivs":{"hp":3,"attack":3,"defense":3,"speed":3,"spAttack":3,"spDefense":3},
    //     "personality":813709149,"experience":125000,"level":50,"friendship":0,
    //     "maxHP":162,"attack":86,"defense":77,"speed":31,"spAttack":46,"spDefense":77,
    //     "hp":162,"status1":0,"item":135,"itemName":"ITEM_PECHA_BERRY","holdEffect":4,
    //     "holdEffectName":"HOLD_EFFECT_CURE_PSN","holdEffectParam":0,"moves":[124,317,151,107],
    //     "pp":[20,10,40,20],"ppBonuses":0,"ppUps":[0,0,0,0],"nature":24,"natureName":"NATURE_QUIRKY",
    //     "evs":{"hp":170,"attack":0,"defense":170,"speed":0,"spAttack":0,"spDefense":170},
    //     "gender":"female","shiny":false}
    //   LILEEP forced-slot0 (instance.abilitySlot=1): {"setId":140,"species":388,"speciesName":"SPECIES_LILEEP",
    //     "isEgg":false,"abilityNum":0,"abilitySlot":0,"ability":21,"abilityName":"ABILITY_SUCTION_CUPS",
    //     "ivs":{"hp":3,"attack":3,"defense":3,"speed":3,"spAttack":3,"spDefense":3},
    //     "personality":3187899706,"experience":125000,"level":50,"friendship":0,
    //     "maxHP":159,"attack":79,"defense":83,"speed":29,"spAttack":67,"spDefense":93,
    //     "hp":159,"status1":0,"item":221,"itemName":"ITEM_LAX_INCENSE","holdEffect":22,
    //     "holdEffectName":"HOLD_EFFECT_EVASION_UP","holdEffectParam":5,"moves":[246,51,275,109],
    //     "pp":[5,30,20,10],"ppBonuses":0,"ppUps":[0,0,0,0],"nature":6,"natureName":"NATURE_DOCILE",
    //     "evs":{"hp":255,"attack":255,"defense":0,"speed":0,"spAttack":0,"spDefense":0},
    //     "gender":"male","shiny":false}
    //   found 279625 {"setId":6,"species":129,"speciesName":"SPECIES_MAGIKARP",
    //     "isEgg":false,"abilityNum":0,"abilitySlot":0,"ability":33,"abilityName":"ABILITY_SWIFT_SWIM",
    //     "ivs":{"hp":8,"attack":8,"defense":8,"speed":8,"spAttack":8,"spDefense":8},
    //     "personality":279625,"experience":156250,"level":50,"friendship":0,
    //     "maxHP":115,"attack":50,"defense":64,"speed":89,"spAttack":24,"spDefense":29,
    //     "hp":115,"status1":0,"item":196,"itemName":"ITEM_FOCUS_BAND","holdEffect":39,
    //     "holdEffectName":"HOLD_EFFECT_FOCUS_BAND","holdEffectParam":10,"moves":[175,0,0,0],
    //     "pp":[15,0,0,0],"ppBonuses":0,"ppUps":[0,0,0,0],"nature":0,"natureName":"NATURE_HARDY",
    //     "evs":{"hp":255,"attack":255,"defense":0,"speed":0,"spAttack":0,"spDefense":0},
    //     "gender":"female","shiny":true}
    //
    // (r0/r1 both used instance.abilitySlot=1 to prove the dual-ability
    // species honors the caller's slot while the single-ability species
    // forces slot 0 regardless -- exactly this test's split.)

    #[test]
    fn grimer_dual_ability_slot1_matches_ts() {
        let result = create_factory_corpus_party_member(FactoryCorpusPartyInstance {
            set_id: 110,
            personality: 813_709_149,
            fixed_iv: 3,
            ability_slot: 1,
            ot_id: 0x1234_5678,
        })
        .expect("valid instance");
        assert_eq!(
            result,
            FactoryCorpusPartyMemberState {
                set_id: 110,
                species_id: 88,
                is_egg: false,
                ability_num: 1,
                ability_slot: 1,
                ability: 60,
                ivs: [3, 3, 3, 3, 3, 3],
                personality: 813_709_149,
                experience: 125_000,
                level: 50,
                friendship: 0,
                max_hp: 162,
                attack: 86,
                defense: 77,
                speed: 31,
                sp_attack: 46,
                sp_defense: 77,
                hp: 162,
                status1: 0,
                item_id: 135,
                hold_effect: 4,
                hold_effect_param: 0,
                moves: [124, 317, 151, 107],
                pp: [20, 10, 40, 20],
                pp_bonuses: 0,
                pp_ups: [0, 0, 0, 0],
                nature: 24,
                evs: [170, 0, 170, 0, 0, 170],
                gender: MonGender::Female,
                shiny: false,
            }
        );
    }

    #[test]
    fn lileep_single_ability_forced_slot0_matches_ts() {
        // instance.ability_slot requests 1, but SPECIES_LILEEP's second
        // ability is ABILITY_NONE (id 0), so the output forces slot 0.
        let result = create_factory_corpus_party_member(FactoryCorpusPartyInstance {
            set_id: 140,
            personality: 3_187_899_706,
            fixed_iv: 3,
            ability_slot: 1,
            ot_id: 0x1234_5678,
        })
        .expect("valid instance");
        assert_eq!(
            result,
            FactoryCorpusPartyMemberState {
                set_id: 140,
                species_id: 388,
                is_egg: false,
                ability_num: 0,
                ability_slot: 0,
                ability: 21,
                ivs: [3, 3, 3, 3, 3, 3],
                personality: 3_187_899_706,
                experience: 125_000,
                level: 50,
                friendship: 0,
                max_hp: 159,
                attack: 79,
                defense: 83,
                speed: 29,
                sp_attack: 67,
                sp_defense: 93,
                hp: 159,
                status1: 0,
                item_id: 221,
                hold_effect: 22,
                hold_effect_param: 5,
                moves: [246, 51, 275, 109],
                pp: [5, 30, 20, 10],
                pp_bonuses: 0,
                pp_ups: [0, 0, 0, 0],
                nature: 6,
                evs: [255, 255, 0, 0, 0, 0],
                gender: MonGender::Male,
                shiny: false,
            }
        );
    }

    #[test]
    fn magikarp_shiny_true_matches_ts() {
        let result = create_factory_corpus_party_member(FactoryCorpusPartyInstance {
            set_id: 6,
            personality: 279_625,
            fixed_iv: 8,
            ability_slot: 0,
            ot_id: 0x1234_5678,
        })
        .expect("valid instance");
        assert_eq!(
            result,
            FactoryCorpusPartyMemberState {
                set_id: 6,
                species_id: 129,
                is_egg: false,
                ability_num: 0,
                ability_slot: 0,
                ability: 33,
                ivs: [8, 8, 8, 8, 8, 8],
                personality: 279_625,
                experience: 156_250,
                level: 50,
                friendship: 0,
                max_hp: 115,
                attack: 50,
                defense: 64,
                speed: 89,
                sp_attack: 24,
                sp_defense: 29,
                hp: 115,
                status1: 0,
                item_id: 196,
                hold_effect: 39,
                hold_effect_param: 10,
                moves: [175, 0, 0, 0],
                pp: [15, 0, 0, 0],
                pp_bonuses: 0,
                pp_ups: [0, 0, 0, 0],
                nature: 0,
                evs: [255, 255, 0, 0, 0, 0],
                gender: MonGender::Female,
                shiny: true,
            }
        );
    }

    // --- error paths ---
    //
    // Expected messages generated from the real TS module (not
    // hand-computed) via, run from the workspace root, 2026-08-11:
    //   node --experimental-strip-types -e '
    //     import("./src/engine/factoryCorpusParty.ts").then((m) => {
    //       try { m.createFactoryCorpusPartyMember({ setId: 882, personality: 0, fixedIv: 3, abilitySlot: 0, otId: 0 }); } catch(e) { console.log("A:", e.message); }
    //       try { m.createFactoryCorpusPartyMember({ setId: 110, personality: 0, fixedIv: 3, abilitySlot: 0, otId: 0 }); } catch(e) { console.log("B:", e.message); }
    //       try { m.createFactoryCorpusPartyMember({ setId: 110, personality: 813709149, fixedIv: 32, abilitySlot: 0, otId: 0 }); } catch(e) { console.log("C:", e.message); }
    //     });
    //   '
    // Output:
    //   A: Frontier set id must be in 0..881, got 882
    //   B: Frontier set 110 requires nature 24, personality 0 derives 0
    //   C: uniform IV must be an integer in 0..31, got 32

    #[test]
    fn set_id_out_of_range_matches_ts_message() {
        let err = create_factory_corpus_party_member(FactoryCorpusPartyInstance {
            set_id: 882,
            personality: 0,
            fixed_iv: 3,
            ability_slot: 0,
            ot_id: 0,
        })
        .unwrap_err();
        assert_eq!(
            err,
            PartyMemberError::SetIdOutOfRange { set_id: 882, max: 881 }
        );
        assert_eq!(
            err.to_string(),
            "Frontier set id must be in 0..881, got 882"
        );
    }

    #[test]
    fn nature_mismatched_personality_matches_ts_message() {
        let err = create_factory_corpus_party_member(FactoryCorpusPartyInstance {
            set_id: 110,
            personality: 0,
            fixed_iv: 3,
            ability_slot: 0,
            ot_id: 0,
        })
        .unwrap_err();
        assert_eq!(
            err,
            PartyMemberError::NatureMismatch {
                set_id: 110,
                expected_nature: 24,
                personality: 0,
                derived_nature: 0,
            }
        );
        assert_eq!(
            err.to_string(),
            "Frontier set 110 requires nature 24, personality 0 derives 0"
        );
    }

    #[test]
    fn fixed_iv_over_31_matches_ts_message() {
        let err = create_factory_corpus_party_member(FactoryCorpusPartyInstance {
            set_id: 110,
            personality: 813_709_149,
            fixed_iv: 32,
            ability_slot: 0,
            ot_id: 0,
        })
        .unwrap_err();
        assert_eq!(err, PartyMemberError::InvalidFixedIv { fixed_iv: 32 });
        assert_eq!(
            err.to_string(),
            "uniform IV must be an integer in 0..31, got 32"
        );
    }

    #[test]
    fn create_factory_corpus_party_builds_three_members() {
        let party = create_factory_corpus_party([
            FactoryCorpusPartyInstance {
                set_id: 110,
                personality: 813_709_149,
                fixed_iv: 3,
                ability_slot: 1,
                ot_id: 0x1234_5678,
            },
            FactoryCorpusPartyInstance {
                set_id: 140,
                personality: 3_187_899_706,
                fixed_iv: 3,
                ability_slot: 1,
                ot_id: 0x1234_5678,
            },
            FactoryCorpusPartyInstance {
                set_id: 6,
                personality: 279_625,
                fixed_iv: 8,
                ability_slot: 0,
                ot_id: 0x1234_5678,
            },
        ])
        .expect("all three instances are valid");
        assert_eq!(party[0].species_id, 88);
        assert_eq!(party[1].species_id, 388);
        assert_eq!(party[2].species_id, 129);
    }

    #[test]
    fn create_factory_corpus_party_propagates_first_error() {
        let err = create_factory_corpus_party([
            FactoryCorpusPartyInstance {
                set_id: 110,
                personality: 813_709_149,
                fixed_iv: 3,
                ability_slot: 1,
                ot_id: 0x1234_5678,
            },
            FactoryCorpusPartyInstance {
                set_id: 882,
                personality: 0,
                fixed_iv: 3,
                ability_slot: 0,
                ot_id: 0,
            },
            FactoryCorpusPartyInstance {
                set_id: 6,
                personality: 279_625,
                fixed_iv: 8,
                ability_slot: 0,
                ot_id: 0x1234_5678,
            },
        ])
        .unwrap_err();
        assert_eq!(
            err,
            PartyMemberError::SetIdOutOfRange { set_id: 882, max: 881 }
        );
    }
}
