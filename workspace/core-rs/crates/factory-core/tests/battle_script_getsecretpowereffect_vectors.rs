//! Canonical-TypeScript differential and registration tests for
//! `Cmd_getsecretpowereffect`.

use factory_core::battle_script_getsecretpowereffect::*;
use factory_core::battle_script_getsecretpowereffect_vectors_gen::*;

#[test]
fn every_case_matches_canonical_ts_output_and_preserves_input() {
    assert_eq!(BATTLE_SCRIPT_GETSECRETPOWEREFFECT_CASES.len(), 298);
    for (case_index, case) in BATTLE_SCRIPT_GETSECRETPOWEREFFECT_CASES.iter().enumerate() {
        let before = case.initial;
        let outcome = apply_battle_script_getsecretpowereffect(&case.initial);
        assert_eq!(
            case.initial, before,
            "case {case_index} {}: input mutation",
            case.label
        );
        assert_eq!(
            outcome.control,
            BattleScriptGetsecretpowereffectControl::Advance,
            "case {case_index} {}: control",
            case.label
        );
        assert_eq!(
            outcome.rules, case.expected,
            "case {case_index} {}: output",
            case.label
        );
        assert_eq!(
            outcome.rules.siblings, case.initial.siblings,
            "case {case_index} {}: sibling immutability",
            case.label
        );
        assert_eq!(
            outcome.rules.g_battle_environment, case.g_battle_environment,
            "case {case_index} {}: environment immutability",
            case.label
        );
        assert_eq!(
            outcome.rules.move_effect_byte,
            battle_script_getsecretpowereffect_move_effect_for_environment(
                case.g_battle_environment
            ),
            "case {case_index} {}: pure mapping agreement",
            case.label
        );
    }
}

#[test]
fn environment_domain_category_covers_every_raw_u8_value() {
    let domain = BATTLE_SCRIPT_GETSECRETPOWEREFFECT_CASES
        .iter()
        .filter(|case| case.category == "environment-domain")
        .collect::<Vec<_>>();
    assert_eq!(domain.len(), 256);
    for environment in 0..=0xffu16 {
        let environment = environment as u8;
        let case = domain
            .iter()
            .find(|case| case.g_battle_environment == environment)
            .unwrap_or_else(|| panic!("missing environment {environment} in domain matrix"));
        assert_eq!(
            case.expected.move_effect_byte,
            battle_script_getsecretpowereffect_move_effect_for_environment(environment)
        );
    }
}

#[test]
fn overwrite_semantics_category_replaces_zero_expected_and_max_prior_bytes() {
    let overwrite = BATTLE_SCRIPT_GETSECRETPOWEREFFECT_CASES
        .iter()
        .filter(|case| case.category == "overwrite-semantics")
        .collect::<Vec<_>>();
    assert_eq!(overwrite.len(), 42);
    for case in &overwrite {
        let expected = battle_script_getsecretpowereffect_move_effect_for_environment(
            case.g_battle_environment,
        );
        assert_eq!(case.expected.move_effect_byte, expected, "{}", case.label);
    }
    let mut environments = overwrite
        .iter()
        .map(|case| case.g_battle_environment)
        .collect::<Vec<_>>();
    environments.sort_unstable();
    environments.dedup();
    for environment in environments {
        let prior_bytes = overwrite
            .iter()
            .filter(|case| case.g_battle_environment == environment)
            .map(|case| case.initial.move_effect_byte)
            .collect::<std::collections::BTreeSet<_>>();
        assert!(
            prior_bytes.contains(&0) && prior_bytes.contains(&0xff),
            "environment {environment} missing zero/max prior-byte fixtures"
        );
    }
}

#[test]
fn named_environments_match_the_documented_source_switch() {
    let explicit = [
        (0u8, BATTLE_SCRIPT_MOVE_EFFECT_POISON),
        (1, BATTLE_SCRIPT_MOVE_EFFECT_SLEEP),
        (2, BATTLE_SCRIPT_MOVE_EFFECT_ACC_MINUS_1),
        (3, BATTLE_SCRIPT_MOVE_EFFECT_DEF_MINUS_1),
        (4, BATTLE_SCRIPT_MOVE_EFFECT_ATK_MINUS_1),
        (5, BATTLE_SCRIPT_MOVE_EFFECT_SPD_MINUS_1),
        (6, BATTLE_SCRIPT_MOVE_EFFECT_CONFUSION),
        (7, BATTLE_SCRIPT_MOVE_EFFECT_FLINCH),
    ];
    for (environment, expected) in explicit {
        assert_eq!(
            battle_script_getsecretpowereffect_move_effect_for_environment(environment),
            expected
        );
    }
    for environment in 8..=0xffu16 {
        assert_eq!(
            battle_script_getsecretpowereffect_move_effect_for_environment(environment as u8),
            BATTLE_SCRIPT_MOVE_EFFECT_PARALYSIS,
            "default arm for environment {environment}"
        );
    }
}

#[test]
fn registration_cardinality_and_shape_match_canonical_ts() {
    assert_eq!(
        BATTLE_SCRIPT_GETSECRETPOWEREFFECT_REGISTRATION_CASES.len(),
        6
    );
    for case in &BATTLE_SCRIPT_GETSECRETPOWEREFFECT_REGISTRATION_CASES {
        let instructions = case
            .instructions
            .iter()
            .map(
                |instruction| BattleScriptGetsecretpowereffectRegistrationInstruction {
                    opcode_name: instruction.opcode_name,
                    program_counter: instruction.program_counter,
                    opcode_id: instruction.opcode_id,
                    dispatcher: instruction.dispatcher,
                    operand_count: instruction.operand_count,
                },
            )
            .collect::<Vec<_>>();
        match register_battle_script_getsecretpowereffect_handler(&instructions) {
            Ok(registration) => {
                assert_eq!(
                    case.expected_error, None,
                    "{} unexpected success",
                    case.label
                );
                assert_eq!(
                    case.expected_bindings,
                    &[registration.opcode_id],
                    "{} binding",
                    case.label
                );
            }
            Err(actual) => {
                assert_eq!(
                    case.expected_bindings,
                    &[],
                    "{} unexpected error",
                    case.label
                );
                assert_eq!(
                    case.expected_error,
                    Some(actual.to_string().as_str()),
                    "{} error",
                    case.label
                );
            }
        }
    }
}
