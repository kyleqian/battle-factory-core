//! Canonical-TypeScript differential and registration ratchets for
//! `damagecalcOpcodeHandler` (`B_SCR_OP_DAMAGECALC`, 0x05).
//!
//! Regenerate with `node --experimental-strip-types
//! core-rs/tools/gen-battle-script-damagecalc-vectors.mjs`.

use factory_core::battle_script_damagecalc::{
    apply_battle_script_damagecalc, register_battle_script_damagecalc,
    BattleScriptDamagecalcBattlerState, BattleScriptDamagecalcInstruction,
    BattleScriptDamagecalcRoles, BattleScriptDamagecalcRules,
};
use factory_core::battle_script_damagecalc_vectors_gen::{
    BattleScriptDamagecalcRegistrationVectorCase, BattleScriptDamagecalcVectorBattlerState,
    BattleScriptDamagecalcVectorState, BATTLE_SCRIPT_DAMAGECALC_BRANCH_CENSUS,
    BATTLE_SCRIPT_DAMAGECALC_CASES, BATTLE_SCRIPT_DAMAGECALC_CATEGORY_CENSUS,
    BATTLE_SCRIPT_DAMAGECALC_REGISTRATION_BRANCH_CENSUS,
    BATTLE_SCRIPT_DAMAGECALC_REGISTRATION_CASES, BATTLE_SCRIPT_DAMAGECALC_VECTOR_CORPUS_SHA256,
};

fn battler(value: BattleScriptDamagecalcVectorBattlerState) -> BattleScriptDamagecalcBattlerState {
    BattleScriptDamagecalcBattlerState { base: value.base, helping_hand: value.helping_hand }
}

fn rules(value: BattleScriptDamagecalcVectorState) -> BattleScriptDamagecalcRules {
    BattleScriptDamagecalcRules {
        battlers: value.battlers.map(battler),
        battlers_count: value.battlers_count,
        battle_type_flags: value.battle_type_flags,
        weather: value.weather,
        current_move: value.current_move,
        dynamic_base_power: value.dynamic_base_power,
        dynamic_move_type: value.dynamic_move_type,
        crit_multiplier: value.crit_multiplier,
        dmg_multiplier: value.dmg_multiplier,
        selector_roles: BattleScriptDamagecalcRoles {
            attacker: value.attacker.and_then(
                factory_core::battle_script_damagecalc::BattleScriptDamagecalcBattler::from_u8,
            ),
            target: value.target.and_then(
                factory_core::battle_script_damagecalc::BattleScriptDamagecalcBattler::from_u8,
            ),
        },
        enigma_berry_hold_effects: value.enigma_berry_hold_effects,
        enigma_berry_hold_effect_params: value.enigma_berry_hold_effect_params,
        battle_move_damage: value.battle_move_damage,
    }
}

fn vector_state(value: BattleScriptDamagecalcRules) -> BattleScriptDamagecalcVectorState {
    BattleScriptDamagecalcVectorState {
        battlers: value
            .battlers
            .map(|battler| BattleScriptDamagecalcVectorBattlerState {
                base: battler.base,
                helping_hand: battler.helping_hand,
            }),
        battlers_count: value.battlers_count,
        battle_type_flags: value.battle_type_flags,
        weather: value.weather,
        current_move: value.current_move,
        dynamic_base_power: value.dynamic_base_power,
        dynamic_move_type: value.dynamic_move_type,
        crit_multiplier: value.crit_multiplier,
        dmg_multiplier: value.dmg_multiplier,
        attacker: value
            .selector_roles
            .attacker
            .map(factory_core::battle_script_damagecalc::BattleScriptDamagecalcBattler::as_u8),
        target: value
            .selector_roles
            .target
            .map(factory_core::battle_script_damagecalc::BattleScriptDamagecalcBattler::as_u8),
        enigma_berry_hold_effects: value.enigma_berry_hold_effects,
        enigma_berry_hold_effect_params: value.enigma_berry_hold_effect_params,
        battle_move_damage: value.battle_move_damage,
    }
}

#[test]
fn complete_projected_outputs_and_errors_match_canonical_typescript() {
    assert_eq!(BATTLE_SCRIPT_DAMAGECALC_CASES.len(), 24);
    for (case_index, case) in BATTLE_SCRIPT_DAMAGECALC_CASES.iter().enumerate() {
        let input = rules(case.initial);
        let before = input;

        let result = apply_battle_script_damagecalc(&input);

        assert_eq!(
            input, before,
            "case {case_index} {} mutated rules input",
            case.label
        );

        match (result, case.expected, case.expected_error) {
            (Ok(actual), Some(expected), None) => {
                assert_eq!(
                    vector_state(actual),
                    expected,
                    "case {case_index} {} complete projected state",
                    case.label
                );
            }
            (Err(actual), None, Some(expected)) => {
                assert_eq!(actual.to_string(), expected, "case {case_index} {} exact error", case.label);
            }
            (actual, expected, expected_error) => panic!(
                "case {case_index} {} generated outcome disagrees: actual={actual:?}, expected={expected:?}, expected_error={expected_error:?}",
                case.label
            ),
        }
    }
}

#[test]
fn registration_matches_canonical_typescript_and_keeps_exact_errors() {
    assert_eq!(BATTLE_SCRIPT_DAMAGECALC_REGISTRATION_CASES.len(), 3);
    for case in BATTLE_SCRIPT_DAMAGECALC_REGISTRATION_CASES {
        execute_registration_case(&case);
    }
}

fn execute_registration_case(case: &BattleScriptDamagecalcRegistrationVectorCase) {
    let instructions: Vec<BattleScriptDamagecalcInstruction<'static>> = case.instructions.to_vec();
    match (
        register_battle_script_damagecalc(&instructions),
        case.expected_opcode_id,
        case.expected_error,
    ) {
        (Ok(actual), Some(expected), None) => assert_eq!(actual, expected, "{}", case.label),
        (Err(actual), None, Some(expected)) => {
            assert_eq!(actual.to_string(), expected, "{}", case.label)
        }
        (actual, expected_id, expected_error) => panic!(
            "{} registration mismatch: actual={actual:?}, expected_id={expected_id:?}, expected_error={expected_error:?}",
            case.label
        ),
    }
}

#[test]
fn corpus_censuses_and_hash_are_pinned() {
    assert_eq!(
        BATTLE_SCRIPT_DAMAGECALC_CATEGORY_CENSUS,
        [
            ("charge", 5),
            ("helper-error", 1),
            ("helper-wiring", 2),
            ("helping-hand", 3),
            ("move-type", 4),
            ("multiplier-order", 6),
            ("role-errors", 3),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_DAMAGECALC_BRANCH_CENSUS,
        [
            ("advance", 17),
            ("helper-item-out-of-range", 1),
            ("helper-missing-target-role", 1),
            ("missing-attacker-role", 2),
            ("unknown-move-type", 2),
            ("unknown-type-id", 1),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_DAMAGECALC_REGISTRATION_BRANCH_CENSUS,
        [("missing-opcode", 1), ("registered", 2)]
    );
    assert_eq!(
        BATTLE_SCRIPT_DAMAGECALC_VECTOR_CORPUS_SHA256,
        "897f1de90a536e52f5eaf203bbeb892db7817dc006ca7632959d4a39653b9690"
    );
}
