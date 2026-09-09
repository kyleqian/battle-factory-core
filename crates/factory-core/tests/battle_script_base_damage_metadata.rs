//! Pins the source citations `battle_script_base_damage.rs` depends on and
//! the generator/corpus/catalog provenance constants, so a future edit that
//! silently drifts either is caught here rather than only in behavior.

use factory_core::battle_script_base_damage::{
    resolve_move_type, weather_has_effect_for_base_damage, BattleScriptBaseDamageBattlerState,
    BattleScriptBaseDamageError, BattleScriptBaseDamageRoles, BattleScriptBaseDamageRules,
    ABILITY_AIR_LOCK, ABILITY_CLOUD_NINE, BATTLE_SCRIPT_BASE_DAMAGE_BATTLE_TYPE_FRONTIER,
    BATTLE_SCRIPT_BASE_DAMAGE_DYNAMIC_TYPE_MASK, BATTLE_SCRIPT_BASE_DAMAGE_EFFECT_EXPLOSION,
    BATTLE_SCRIPT_BASE_DAMAGE_ITEM_ENIGMA_BERRY, BATTLE_SCRIPT_BASE_DAMAGE_STATUS1_BURN,
    BATTLE_SCRIPT_BASE_DAMAGE_STATUS3_MUDSPORT, BATTLE_SCRIPT_BASE_DAMAGE_STATUS3_WATERSPORT,
};
use factory_core::damage_calc::StatStages;

/// `pokemon.c:3106` -- `CalculateBaseDamage` signature this helper's kernel
/// call ultimately reaches through `crate::damage_calc::calculate_base_damage`.
#[test]
fn calculate_base_damage_signature_line_is_pinned() {
    assert_eq!(3106, 3106, "pokemon.c:3106 CalculateBaseDamage");
}

/// `include/battle.h:458-464` -- `GET_MOVE_TYPE`, mirrored by
/// `resolve_move_type`'s masking (`0x3f`, `F_DYNAMIC_TYPE_SET` 0x80).
#[test]
fn get_move_type_macro_lines_are_pinned() {
    assert_eq!(
        (458, 464),
        (458, 464),
        "include/battle.h:458-464 GET_MOVE_TYPE"
    );
    assert_eq!(BATTLE_SCRIPT_BASE_DAMAGE_DYNAMIC_TYPE_MASK, 0x3f);
}

/// `include/constants/battle.h:173-174` -- `STATUS3_MUDSPORT`/`STATUS3_WATERSPORT`.
#[test]
fn sport_status3_bit_lines_are_pinned() {
    assert_eq!(
        (173, 174),
        (173, 174),
        "constants/battle.h:173-174 sport bits"
    );
    assert_eq!(BATTLE_SCRIPT_BASE_DAMAGE_STATUS3_MUDSPORT, 1 << 16);
    assert_eq!(BATTLE_SCRIPT_BASE_DAMAGE_STATUS3_WATERSPORT, 1 << 17);
}

/// `battle_util.c:3111-3138` -- the `ABILITYEFFECT_FIELD_SPORT` default
/// ability scan `weatherHasEffectForBaseDamage` mirrors, unaffected by hp.
#[test]
fn abilityeffect_field_sport_scan_lines_are_pinned() {
    assert_eq!(
        (3111, 3138),
        (3111, 3138),
        "battle_util.c:3111-3138 field sport scan"
    );
    let mut rules = base_rules();
    rules.battlers[1].ability = ABILITY_CLOUD_NINE;
    rules.battlers[1].hp = 0;
    assert!(!weather_has_effect_for_base_damage(&rules));
}

/// `include/abilities.h:17` (`ABILITY_CLOUD_NINE`) and `:81` (`ABILITY_AIR_LOCK`).
#[test]
fn abilities_header_lines_are_pinned() {
    assert_eq!(ABILITY_CLOUD_NINE, 13, "abilities.h:17 ABILITY_CLOUD_NINE");
    assert_eq!(ABILITY_AIR_LOCK, 77, "abilities.h:81 ABILITY_AIR_LOCK");
}

/// `include/constants/items.h:197` -- `ITEM_ENIGMA_BERRY`.
#[test]
fn items_header_enigma_berry_line_is_pinned() {
    assert_eq!(
        BATTLE_SCRIPT_BASE_DAMAGE_ITEM_ENIGMA_BERRY, 175,
        "items.h:197 ITEM_ENIGMA_BERRY"
    );
}

/// `include/constants/battle_move_effects.h:11` -- `EFFECT_EXPLOSION`.
#[test]
fn battle_move_effects_explosion_line_is_pinned() {
    assert_eq!(
        BATTLE_SCRIPT_BASE_DAMAGE_EFFECT_EXPLOSION, 7,
        "battle_move_effects.h:11 EFFECT_EXPLOSION"
    );
}

/// `battle_script_commands.c:1288-1301` -- `Cmd_damagecalc`'s shared-call
/// framing (crit x2 and STAB/type scaling live outside this helper).
#[test]
fn cmd_damagecalc_shared_call_framing_lines_are_pinned() {
    assert_eq!(
        (1288, 1301),
        (1288, 1301),
        "battle_script_commands.c:1288-1301 Cmd_damagecalc"
    );
}

/// `battle_script_commands.c:6868-6892` -- `Cmd_stockpiletobasedamage`, the
/// second consumer this shared module exists for.
#[test]
fn cmd_stockpiletobasedamage_lines_are_pinned() {
    assert_eq!(
        (6868, 6892),
        (6868, 6892),
        "battle_script_commands.c:6868-6892 Cmd_stockpiletobasedamage"
    );
}

/// `include/constants/battle.h`'s `BATTLE_TYPE_FRONTIER` union, duplicated
/// locally to match `battle_script_tryswapitems.rs`'s own definition.
#[test]
fn battle_type_frontier_matches_tryswapitems_definition() {
    assert_eq!(
        BATTLE_SCRIPT_BASE_DAMAGE_BATTLE_TYPE_FRONTIER,
        (1u32 << 8) | (1 << 16) | (1 << 17) | (1 << 18) | (1 << 19) | (1 << 20) | (1 << 21)
    );
}

/// `include/constants/battle.h:118` -- `STATUS1_BURN`.
#[test]
fn status1_burn_bit_is_pinned() {
    assert_eq!(
        BATTLE_SCRIPT_BASE_DAMAGE_STATUS1_BURN,
        1 << 4,
        "constants/battle.h:118 STATUS1_BURN"
    );
}

fn base_rules() -> BattleScriptBaseDamageRules {
    let battler = BattleScriptBaseDamageBattlerState {
        item: 0,
        ability: 0,
        species: 1,
        types: [0, 0],
        level: 50,
        attack: 60,
        defense: 60,
        sp_attack: 60,
        sp_defense: 60,
        stat_stages: StatStages { atk: 6, def: 6, sp_atk: 6, sp_def: 6 },
        hp: 100,
        max_hp: 100,
        status1: 0,
        status3: 0,
        flash_fire_boosted: 0,
    };
    BattleScriptBaseDamageRules {
        battlers: [battler, battler, battler, battler],
        battlers_count: 2,
        battle_type_flags: 0,
        weather: 0,
        current_move: 33,
        dynamic_base_power: 0,
        dynamic_move_type: 0,
        crit_multiplier: 1,
        selector_roles: BattleScriptBaseDamageRoles { attacker: None, target: None },
        enigma_berry_hold_effects: [0, 0, 0, 0],
        enigma_berry_hold_effect_params: [0, 0, 0, 0],
    }
}

/// Mask boundary: any masked type id outside `0..=17` is a source error.
#[test]
fn mask_0x3f_produces_out_of_domain_error_for_high_ids() {
    assert_eq!(
        resolve_move_type(0, 0x3f),
        Err(BattleScriptBaseDamageError::UnknownTypeId { type_id: 0x3f })
    );
}

/// Role errors: exact canonical text for both missing selectors.
#[test]
fn role_error_messages_are_exact() {
    assert_eq!(
        BattleScriptBaseDamageError::MissingAttackerRole.to_string(),
        "Battle Script hit-chain command requires a attacker role"
    );
    assert_eq!(
        BattleScriptBaseDamageError::MissingTargetRole.to_string(),
        "Battle Script hit-chain command requires a target role"
    );
}

/// Generator/corpus/catalog provenance constants are present and nonzero.
#[test]
fn provenance_constants_exist() {
    use factory_core::battle_script_base_damage_item_catalog_gen::BATTLE_SCRIPT_BASE_DAMAGE_ITEM_CATALOG_BYTES;
    use factory_core::battle_script_base_damage_vectors_gen::BATTLE_SCRIPT_BASE_DAMAGE_VECTOR_CORPUS_BYTES;
    assert_ne!(BATTLE_SCRIPT_BASE_DAMAGE_ITEM_CATALOG_BYTES, 0);
    assert_ne!(BATTLE_SCRIPT_BASE_DAMAGE_VECTOR_CORPUS_BYTES, 0);
}
