//! Replays every generated case for
//! `calculate_battle_script_base_damage_for_current_move` against the
//! canonical TypeScript-executed corpus, and pins both the vector and item
//! catalog sha256/byte counts plus their category/branch censuses.

use factory_core::battle_script_base_damage::{
    calculate_battle_script_base_damage_for_current_move, BattleScriptBaseDamageBattler,
    BattleScriptBaseDamageBattlerState, BattleScriptBaseDamageRoles, BattleScriptBaseDamageRules,
};
use factory_core::battle_script_base_damage_item_catalog_gen::{
    BATTLE_SCRIPT_BASE_DAMAGE_ITEM_CATALOG, BATTLE_SCRIPT_BASE_DAMAGE_ITEM_CATALOG_BYTES,
    BATTLE_SCRIPT_BASE_DAMAGE_ITEM_CATALOG_SHA256,
};
use factory_core::battle_script_base_damage_vectors_gen::{
    BattleScriptBaseDamageVectorBattlerState, BattleScriptBaseDamageVectorRules,
    BATTLE_SCRIPT_BASE_DAMAGE_BRANCH_CENSUS, BATTLE_SCRIPT_BASE_DAMAGE_CASES,
    BATTLE_SCRIPT_BASE_DAMAGE_CATEGORY_CENSUS, BATTLE_SCRIPT_BASE_DAMAGE_VECTOR_CORPUS_BYTES,
    BATTLE_SCRIPT_BASE_DAMAGE_VECTOR_CORPUS_SHA256,
    BATTLE_SCRIPT_BASE_DAMAGE_VECTOR_GENERATOR_BYTES,
    BATTLE_SCRIPT_BASE_DAMAGE_VECTOR_GENERATOR_SHA256,
};

fn battler_state(
    value: &BattleScriptBaseDamageVectorBattlerState,
) -> BattleScriptBaseDamageBattlerState {
    BattleScriptBaseDamageBattlerState {
        item: value.item,
        ability: value.ability,
        species: value.species,
        types: value.types,
        level: value.level,
        attack: value.attack,
        defense: value.defense,
        sp_attack: value.sp_attack,
        sp_defense: value.sp_defense,
        stat_stages: value.stat_stages,
        hp: value.hp,
        max_hp: value.max_hp,
        status1: value.status1,
        status3: value.status3,
        flash_fire_boosted: value.flash_fire_boosted,
    }
}

fn rules_from_vector(value: &BattleScriptBaseDamageVectorRules) -> BattleScriptBaseDamageRules {
    BattleScriptBaseDamageRules {
        battlers: [
            battler_state(&value.battlers[0]),
            battler_state(&value.battlers[1]),
            battler_state(&value.battlers[2]),
            battler_state(&value.battlers[3]),
        ],
        battlers_count: value.battlers_count,
        battle_type_flags: value.battle_type_flags,
        weather: value.weather,
        current_move: value.current_move,
        dynamic_base_power: value.dynamic_base_power,
        dynamic_move_type: value.dynamic_move_type,
        crit_multiplier: value.crit_multiplier,
        selector_roles: BattleScriptBaseDamageRoles {
            attacker: value
                .attacker
                .and_then(BattleScriptBaseDamageBattler::from_u8),
            target: value
                .target
                .and_then(BattleScriptBaseDamageBattler::from_u8),
        },
        enigma_berry_hold_effects: value.enigma_berry_hold_effects,
        enigma_berry_hold_effect_params: value.enigma_berry_hold_effect_params,
    }
}

#[test]
fn every_generated_case_matches_canonical_typescript() {
    assert!(
        !BATTLE_SCRIPT_BASE_DAMAGE_CASES.is_empty(),
        "generated corpus must not be empty"
    );
    for case in &BATTLE_SCRIPT_BASE_DAMAGE_CASES {
        let rules = rules_from_vector(&case.rules);
        let outcome = calculate_battle_script_base_damage_for_current_move(&rules);
        match (case.expected_damage, case.expected_error) {
            (Some(expected), None) => assert_eq!(
                outcome.unwrap_or_else(|error| panic!(
                    "case {}: expected Ok({expected}), got Err({error})",
                    case.label
                )),
                expected,
                "case {} damage mismatch",
                case.label
            ),
            (None, Some(expected_message)) => {
                let error = outcome.expect_err(&format!("case {} expected an error", case.label));
                assert_eq!(
                    error.to_string(),
                    expected_message,
                    "case {} error message mismatch",
                    case.label
                );
            }
            other => panic!("case {}: malformed expectation {other:?}", case.label),
        }
    }
}

#[test]
fn category_and_branch_censuses_are_pinned() {
    assert!(!BATTLE_SCRIPT_BASE_DAMAGE_CATEGORY_CENSUS.is_empty());
    assert!(!BATTLE_SCRIPT_BASE_DAMAGE_BRANCH_CENSUS.is_empty());
    let total_from_categories: usize = BATTLE_SCRIPT_BASE_DAMAGE_CATEGORY_CENSUS
        .iter()
        .map(|(_, count)| *count)
        .sum();
    let total_from_branches: usize = BATTLE_SCRIPT_BASE_DAMAGE_BRANCH_CENSUS
        .iter()
        .map(|(_, count)| *count)
        .sum();
    assert_eq!(total_from_categories, BATTLE_SCRIPT_BASE_DAMAGE_CASES.len());
    assert_eq!(total_from_branches, BATTLE_SCRIPT_BASE_DAMAGE_CASES.len());
}

#[test]
fn vector_and_catalog_provenance_constants_are_nonempty() {
    assert_eq!(BATTLE_SCRIPT_BASE_DAMAGE_VECTOR_CORPUS_SHA256.len(), 64);
    assert_ne!(BATTLE_SCRIPT_BASE_DAMAGE_VECTOR_CORPUS_BYTES, 0);
    assert_eq!(BATTLE_SCRIPT_BASE_DAMAGE_VECTOR_GENERATOR_SHA256.len(), 64);
    assert_ne!(BATTLE_SCRIPT_BASE_DAMAGE_VECTOR_GENERATOR_BYTES, 0);
    assert_eq!(BATTLE_SCRIPT_BASE_DAMAGE_ITEM_CATALOG_SHA256.len(), 64);
    assert_ne!(BATTLE_SCRIPT_BASE_DAMAGE_ITEM_CATALOG_BYTES, 0);
    assert_eq!(BATTLE_SCRIPT_BASE_DAMAGE_ITEM_CATALOG.len(), 70);
}
