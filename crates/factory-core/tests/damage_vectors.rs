//! Runs `damage_calc`'s pure functions against the checked-in, TS-generated
//! vectors in `damage_vectors_gen.rs` (regenerate with `node
//! core-rs/tools/gen-damage-vectors.mjs`). Every expected value in that file
//! came from executing the real `src/engine/damageCalc.ts`, not hand
//! computation - this test just proves the Rust port reproduces it.

use factory_core::damage_calc::{
    apply_random_damage_multiplier, apply_stab, apply_stat_stage_mod, apply_type_effectiveness,
    calculate_accuracy, calculate_base_damage, calculate_endeavor_damage,
    get_critical_hit_chance_stage, resolve_endeavor_damage, roll_accuracy_hits,
    roll_is_critical_hit, AccuracyCalcInput, DamageBattler, DamageCalcInput, StatStages,
};
use factory_core::damage_vectors_gen::{
    BattlerRow, ACCURACY_CASES, ACCURACY_ROLL_CASES, CALC_BASE_DAMAGE_CASES,
    CRIT_CHANCE_STAGE_CASES, CRIT_ROLL_CASES, ENDEAVOR_CASES, ENDEAVOR_RESOLVE_CASES,
    RANDOM_MULTIPLIER_CASES, STAB_CASES, STAT_STAGE_CASES, TYPE_EFFECTIVENESS_CASES,
};
use factory_core::gen_tables::TYPE_EFFECTIVENESS_TABLE;

fn battler_from_row(row: BattlerRow) -> DamageBattler {
    DamageBattler {
        attack: row.attack,
        defense: row.defense,
        sp_attack: row.sp_attack,
        sp_defense: row.sp_defense,
        level: row.level,
        types: row.types,
        stat_stages: StatStages {
            atk: row.stages[0],
            def: row.stages[1],
            sp_atk: row.stages[2],
            sp_def: row.stages[3],
        },
        is_burned: row.is_burned,
        has_status1: row.has_status1,
        hp: row.hp,
        max_hp: row.max_hp,
        ability: row.ability,
        species: row.species,
        hold_effect: row.hold_effect,
        hold_effect_param: row.hold_effect_param,
    }
}

#[test]
fn type_effectiveness_cases_match_ts() {
    assert!(!TYPE_EFFECTIVENESS_CASES.is_empty());
    for (i, c) in TYPE_EFFECTIVENESS_CASES.iter().enumerate() {
        let result = apply_type_effectiveness(
            c.damage_in,
            c.attacking_type,
            [c.defending_type_a, c.defending_type_b],
            &TYPE_EFFECTIVENESS_TABLE,
        );
        assert_eq!(result.damage, c.expected_damage, "case {i}: {c:?}");
        assert_eq!(
            result.multiplier_tenths, c.expected_multiplier_tenths,
            "case {i}: {c:?}"
        );
    }
}

#[test]
fn stat_stage_cases_match_ts() {
    assert!(!STAT_STAGE_CASES.is_empty());
    for (i, c) in STAT_STAGE_CASES.iter().enumerate() {
        assert_eq!(
            apply_stat_stage_mod(c.stat, c.stage),
            c.expected,
            "case {i}: {c:?}"
        );
    }
}

#[test]
fn calc_base_damage_cases_match_ts() {
    assert!(!CALC_BASE_DAMAGE_CASES.is_empty());
    for (i, c) in CALC_BASE_DAMAGE_CASES.iter().enumerate() {
        let input = DamageCalcInput {
            attacker: battler_from_row(c.attacker),
            defender: battler_from_row(c.defender),
            move_power: c.move_power,
            move_type: c.move_type,
            is_critical_hit: c.is_critical_hit,
            side_status_reflect: c.side_status_reflect,
            side_status_light_screen: c.side_status_light_screen,
            is_double_battle_spread_move: c.is_double_battle_spread_move,
            is_explosion_effect: c.is_explosion_effect,
            weather: c.weather,
            weather_has_effect: c.weather_has_effect,
            current_move: c.current_move,
            active_battler_abilities: None,
            is_frontier_battle: c.is_frontier_battle,
            flash_fire_boosted: c.flash_fire_boosted,
        };
        assert_eq!(calculate_base_damage(&input), c.expected, "case {i}: {c:?}");
    }
}

#[test]
fn crit_chance_stage_cases_match_ts() {
    assert!(!CRIT_CHANCE_STAGE_CASES.is_empty());
    for (i, c) in CRIT_CHANCE_STAGE_CASES.iter().enumerate() {
        let input = factory_core::damage_calc::CritChanceInput {
            focus_energy: c.focus_energy,
            move_effect: c.move_effect,
            attacker_hold_effect: c.attacker_hold_effect,
            is_chansey: c.is_chansey,
            is_farfetchd: c.is_farfetchd,
        };
        assert_eq!(
            get_critical_hit_chance_stage(&input),
            c.expected,
            "case {i}: {c:?}"
        );
    }
}

#[test]
fn crit_roll_cases_match_ts() {
    assert!(!CRIT_ROLL_CASES.is_empty());
    for (i, c) in CRIT_ROLL_CASES.iter().enumerate() {
        assert_eq!(
            roll_is_critical_hit(c.stage, c.roll, c.target_immune),
            c.expected,
            "case {i}: {c:?}"
        );
    }
}

#[test]
fn stab_cases_match_ts() {
    assert!(!STAB_CASES.is_empty());
    for (i, c) in STAB_CASES.iter().enumerate() {
        assert_eq!(
            apply_stab(c.damage, c.attacker_types, c.move_type),
            c.expected,
            "case {i}: {c:?}"
        );
    }
}

#[test]
fn endeavor_cases_match_ts() {
    assert!(!ENDEAVOR_CASES.is_empty());
    for (i, c) in ENDEAVOR_CASES.iter().enumerate() {
        assert_eq!(
            calculate_endeavor_damage(c.target_hp, c.user_hp),
            c.expected,
            "case {i}: {c:?}"
        );
    }
}

#[test]
fn endeavor_resolve_cases_match_ts() {
    assert!(!ENDEAVOR_RESOLVE_CASES.is_empty());
    for (i, c) in ENDEAVOR_RESOLVE_CASES.iter().enumerate() {
        assert_eq!(
            resolve_endeavor_damage(c.target_hp, c.user_hp, c.type_multiplier_tenths),
            c.expected,
            "case {i}: {c:?}"
        );
    }
}

#[test]
fn random_multiplier_cases_match_ts() {
    assert!(!RANDOM_MULTIPLIER_CASES.is_empty());
    for (i, c) in RANDOM_MULTIPLIER_CASES.iter().enumerate() {
        assert_eq!(
            apply_random_damage_multiplier(c.damage, c.roll),
            c.expected,
            "case {i}: {c:?}"
        );
    }
}

#[test]
fn accuracy_cases_match_ts() {
    assert!(!ACCURACY_CASES.is_empty());
    for (i, c) in ACCURACY_CASES.iter().enumerate() {
        let input = AccuracyCalcInput {
            move_accuracy: c.move_accuracy,
            attacker_accuracy_stage: c.attacker_accuracy_stage,
            target_evasion_stage: c.target_evasion_stage,
            target_has_foresight: c.target_has_foresight,
            attacker_ability: c.attacker_ability,
            target_ability: c.target_ability,
            is_sandstorm: c.is_sandstorm,
            move_type: c.move_type,
            target_hold_effect: c.target_hold_effect,
            target_hold_effect_param: c.target_hold_effect_param,
        };
        assert_eq!(calculate_accuracy(&input), c.expected, "case {i}: {c:?}");
    }
}

#[test]
fn accuracy_roll_cases_match_ts() {
    assert!(!ACCURACY_ROLL_CASES.is_empty());
    for (i, c) in ACCURACY_ROLL_CASES.iter().enumerate() {
        assert_eq!(
            roll_accuracy_hits(c.calc, c.roll),
            c.expected,
            "case {i}: {c:?}"
        );
    }
}
