//! Canonical-TypeScript differential, registration, and immutable state
//! ratchets for `battleScriptStockpileOpcode.ts` (0x85/0x86/0x87).
//!
//! Regenerate with `node --experimental-strip-types
//! core-rs/tools/gen-battle-script-stockpile-vectors.mjs`.

use factory_core::battle_script_stockpile::{
    apply_battle_script_stockpile, apply_battle_script_stockpile_to_base_damage,
    apply_battle_script_stockpile_to_hp_heal, register_battle_script_stockpile_handlers,
    BattleScriptStockpileBattlerState, BattleScriptStockpileInstruction,
    BattleScriptStockpileRoles, BattleScriptStockpileRules,
};
use factory_core::battle_script_stockpile_vectors_gen::{
    BattleScriptStockpileRegistrationVectorCase, BattleScriptStockpileVectorBattlerState,
    BattleScriptStockpileVectorState, BATTLE_SCRIPT_STOCKPILE_BRANCH_CENSUS,
    BATTLE_SCRIPT_STOCKPILE_CASES, BATTLE_SCRIPT_STOCKPILE_CATEGORY_CENSUS,
    BATTLE_SCRIPT_STOCKPILE_DOMAIN_CENSUS, BATTLE_SCRIPT_STOCKPILE_REGISTRATION_BRANCH_CENSUS,
    BATTLE_SCRIPT_STOCKPILE_REGISTRATION_CASES, BATTLE_SCRIPT_STOCKPILE_VECTOR_CORPUS_SHA256,
};

fn battler(value: BattleScriptStockpileVectorBattlerState) -> BattleScriptStockpileBattlerState {
    BattleScriptStockpileBattlerState {
        base: value.base,
        stockpile_counter: value.stockpile_counter,
        helping_hand: value.helping_hand,
    }
}

fn rules(value: BattleScriptStockpileVectorState) -> BattleScriptStockpileRules {
    BattleScriptStockpileRules {
        battlers: value.battlers.map(battler),
        battlers_count: value.battlers_count,
        battle_type_flags: value.battle_type_flags,
        weather: value.weather,
        current_move: value.current_move,
        dynamic_base_power: value.dynamic_base_power,
        dynamic_move_type: value.dynamic_move_type,
        crit_multiplier: value.crit_multiplier,
        selector_roles: BattleScriptStockpileRoles {
            attacker: value.attacker,
            target: value.target,
        },
        enigma_berry_hold_effects: value.enigma_berry_hold_effects,
        enigma_berry_hold_effect_params: value.enigma_berry_hold_effect_params,
        miss_type: value.miss_type,
        move_result_flags: value.move_result_flags,
        multistring_chooser: value.multistring_chooser,
        battle_text_buff1_byte_number: value.battle_text_buff1_byte_number,
        battle_move_damage: value.battle_move_damage,
        anim_turn: value.anim_turn,
    }
}

fn vector_state(value: BattleScriptStockpileRules) -> BattleScriptStockpileVectorState {
    BattleScriptStockpileVectorState {
        battlers: value
            .battlers
            .map(|battler| BattleScriptStockpileVectorBattlerState {
                base: battler.base,
                stockpile_counter: battler.stockpile_counter,
                helping_hand: battler.helping_hand,
            }),
        battlers_count: value.battlers_count,
        battle_type_flags: value.battle_type_flags,
        weather: value.weather,
        current_move: value.current_move,
        dynamic_base_power: value.dynamic_base_power,
        dynamic_move_type: value.dynamic_move_type,
        crit_multiplier: value.crit_multiplier,
        attacker: value.selector_roles.attacker,
        target: value.selector_roles.target,
        enigma_berry_hold_effects: value.enigma_berry_hold_effects,
        enigma_berry_hold_effect_params: value.enigma_berry_hold_effect_params,
        miss_type: value.miss_type,
        move_result_flags: value.move_result_flags,
        multistring_chooser: value.multistring_chooser,
        battle_text_buff1_byte_number: value.battle_text_buff1_byte_number,
        battle_move_damage: value.battle_move_damage,
        anim_turn: value.anim_turn,
    }
}

fn apply(
    handler_name: &str,
    instruction: BattleScriptStockpileInstruction<'static>,
    input: &BattleScriptStockpileRules,
) -> Result<
    factory_core::battle_script_stockpile::BattleScriptStockpileOutcome,
    factory_core::battle_script_stockpile::BattleScriptStockpileError<'static>,
> {
    match handler_name {
        "stockpile" => apply_battle_script_stockpile(instruction, input),
        "toBaseDamage" => apply_battle_script_stockpile_to_base_damage(instruction, input),
        "toHpHeal" => apply_battle_script_stockpile_to_hp_heal(instruction, input),
        other => panic!("unknown handler name {other}"),
    }
}

#[test]
fn complete_projected_outputs_controls_and_errors_match_canonical_typescript() {
    assert_eq!(BATTLE_SCRIPT_STOCKPILE_CASES.len(), 40);
    for (case_index, case) in BATTLE_SCRIPT_STOCKPILE_CASES.iter().enumerate() {
        let input = rules(case.initial);
        let before = input;

        let result = apply(case.handler_name, case.instruction, &input);

        assert_eq!(
            input, before,
            "case {case_index} {} mutated rules input",
            case.label
        );

        match (result, case.expected, case.expected_error) {
            (Ok(outcome), Some(expected), None) => {
                assert_eq!(Some(outcome.control), case.control, "case {case_index} {} control", case.label);
                assert_eq!(
                    vector_state(outcome.rules),
                    expected,
                    "case {case_index} {} complete projected state",
                    case.label
                );
            }
            (Err(actual), None, Some(expected)) => {
                assert_eq!(case.control, None, "case {case_index} {} error must have no control", case.label);
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
    assert_eq!(BATTLE_SCRIPT_STOCKPILE_REGISTRATION_CASES.len(), 18);
    for case in BATTLE_SCRIPT_STOCKPILE_REGISTRATION_CASES {
        execute_registration_case(&case);
    }
}

fn execute_registration_case(case: &BattleScriptStockpileRegistrationVectorCase) {
    match (
        register_battle_script_stockpile_handlers(case.instructions),
        case.expected_opcode_ids,
        case.expected_error,
    ) {
        (Ok(actual), Some(expected), None) => {
            assert_eq!(
                [actual.stockpile_opcode_id, actual.to_base_damage_opcode_id, actual.to_hp_heal_opcode_id],
                expected,
                "{}",
                case.label
            );
        }
        (Err(actual), None, Some(expected)) => assert_eq!(actual.to_string(), expected, "{}", case.label),
        (actual, expected_ids, expected_error) => panic!(
            "{} registration mismatch: actual={actual:?}, expected_ids={expected_ids:?}, expected_error={expected_error:?}",
            case.label
        ),
    }
}

#[test]
fn stockpile_zero_events_and_zero_rng_family_invariant() {
    // The narrow rules struct carries no scheduler/event/RNG surface at
    // all; the type system itself proves this invariant. This test instead
    // ratchets that every case's control/rules pairing is internally
    // consistent (jump implies no advance-only field drift is silently
    // accepted by the harness).
    for case in BATTLE_SCRIPT_STOCKPILE_CASES.iter() {
        if case.expected_error.is_some() {
            assert!(
                case.control.is_none(),
                "{}: error case must carry no control",
                case.label
            );
        } else {
            assert!(
                case.control.is_some(),
                "{}: success case must carry a control",
                case.label
            );
        }
    }
}

#[test]
fn corpus_censuses_and_hash_are_pinned() {
    assert_eq!(
        BATTLE_SCRIPT_STOCKPILE_DOMAIN_CENSUS,
        [("source-battler-slots", 4), ("registration-cases", 18)]
    );
    assert_eq!(
        BATTLE_SCRIPT_STOCKPILE_CATEGORY_CENSUS,
        [
            ("stockpile", 5),
            ("stockpiletobasedamage", 2),
            ("stockpiletobasedamage-grid", 12),
            ("stockpiletobasedamage-helper-error", 1),
            ("stockpiletobasedamage-lazy-label", 2),
            ("stockpiletobasedamage-protected-skip", 1),
            ("stockpiletobasedamage-real-helper", 2),
            ("stockpiletohpheal", 3),
            ("stockpiletohpheal-heal-shift", 5),
            ("stockpiletohpheal-lazy-label", 3),
            ("stockpiletohpheal-role-matrix", 4),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_STOCKPILE_BRANCH_CENSUS,
        [
            ("advance", 30),
            ("helper-missing-target-role", 1),
            ("jump", 3),
            ("missing-attacker-role", 3),
            ("unresolved-failure-target", 3),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_STOCKPILE_REGISTRATION_BRANCH_CENSUS,
        [
            ("invalid-shape", 11),
            ("registered", 1),
            ("wrong-cardinality", 6)
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_STOCKPILE_VECTOR_CORPUS_SHA256,
        "e418402f91cc21b58f7cf602f1eb73a6f38e9307eeafe914e078ab36d3fed0d8"
    );
}
