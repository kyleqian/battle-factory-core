//! Canonical-TypeScript differential, registration, and immutable state
//! ratchets for `battleScriptTryswapabilitiesOpcode.ts`.
//!
//! Regenerate with `node --experimental-strip-types
//! core-rs/tools/gen-battle-script-tryswapabilities-vectors.mjs`.

use factory_core::battle_script_tryswapabilities::{
    apply_battle_script_tryswapabilities, register_battle_script_tryswapabilities_handler,
    BattleScriptTryswapabilitiesBattlerState, BattleScriptTryswapabilitiesControl,
    BattleScriptTryswapabilitiesRoles, BattleScriptTryswapabilitiesRules,
    BATTLE_SCRIPT_ABILITY_NONE, BATTLE_SCRIPT_ABILITY_WONDER_GUARD,
    BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT,
};
use factory_core::battle_script_tryswapabilities_vectors_gen::{
    BattleScriptTryswapabilitiesRegistrationVectorCase, BattleScriptTryswapabilitiesVectorState,
    BATTLE_SCRIPT_TRYSWAPABILITIES_BRANCH_CENSUS, BATTLE_SCRIPT_TRYSWAPABILITIES_CASES,
    BATTLE_SCRIPT_TRYSWAPABILITIES_CATEGORY_CENSUS, BATTLE_SCRIPT_TRYSWAPABILITIES_DOMAIN_CENSUS,
    BATTLE_SCRIPT_TRYSWAPABILITIES_REGISTRATION_BRANCH_CENSUS,
    BATTLE_SCRIPT_TRYSWAPABILITIES_REGISTRATION_CASES,
    BATTLE_SCRIPT_TRYSWAPABILITIES_VECTOR_CORPUS_SHA256,
};

fn rules(value: BattleScriptTryswapabilitiesVectorState) -> BattleScriptTryswapabilitiesRules {
    BattleScriptTryswapabilitiesRules {
        battlers: value
            .battlers
            .map(|battler| BattleScriptTryswapabilitiesBattlerState { ability: battler.ability }),
        selector_roles: BattleScriptTryswapabilitiesRoles {
            attacker: value.attacker,
            target: value.target,
        },
        move_result_flags: value.move_result_flags,
    }
}

fn vector_state(
    value: BattleScriptTryswapabilitiesRules,
) -> BattleScriptTryswapabilitiesVectorState {
    BattleScriptTryswapabilitiesVectorState {
        battlers: value.battlers.map(|battler| {
            factory_core::battle_script_tryswapabilities_vectors_gen::BattleScriptTryswapabilitiesVectorBattlerState {
                ability: battler.ability,
            }
        }),
        attacker: value.selector_roles.attacker,
        target: value.selector_roles.target,
        move_result_flags: value.move_result_flags,
    }
}

#[test]
fn complete_projected_outputs_controls_errors_and_immutability_match_canonical_typescript() {
    assert_eq!(BATTLE_SCRIPT_TRYSWAPABILITIES_CASES.len(), 262);
    for (case_index, case) in BATTLE_SCRIPT_TRYSWAPABILITIES_CASES.iter().enumerate() {
        execute_case(case_index, case);
    }
}

fn execute_case(
    case_index: usize,
    case: &factory_core::battle_script_tryswapabilities_vectors_gen::BattleScriptTryswapabilitiesVectorCase,
) {
    let input = rules(case.initial);
    let before = input;

    match (
        apply_battle_script_tryswapabilities(case.instruction, &input),
        case.expected,
        case.control,
        case.expected_error,
    ) {
        (Ok(outcome), Some(expected), Some(expected_control), None) => {
            assert_eq!(
                input, before,
                "case {case_index} {} mutated rules input",
                case.label
            );
            assert_eq!(
                outcome.control, expected_control,
                "case {case_index} {} control mismatch",
                case.label
            );
            assert_eq!(
                vector_state(outcome.rules),
                expected,
                "case {case_index} {} complete projected state",
                case.label
            );
            assert_transition_shape(case_index, case, before, outcome);
        }
        (Err(actual), None, None, Some(expected)) => {
            assert_eq!(
                input, before,
                "case {case_index} {} mutated rules input on error",
                case.label
            );
            assert_eq!(
                actual.to_string(),
                expected,
                "case {case_index} {} exact error",
                case.label
            );
        }
        (actual, expected, expected_control, expected_error) => panic!(
            "case {case_index} {} generated outcome disagrees: actual={actual:?}, expected={expected:?}, expected_control={expected_control:?}, expected_error={expected_error:?}",
            case.label
        ),
    }
}

fn assert_transition_shape(
    case_index: usize,
    case: &factory_core::battle_script_tryswapabilities_vectors_gen::BattleScriptTryswapabilitiesVectorCase,
    prior: BattleScriptTryswapabilitiesRules,
    outcome: factory_core::battle_script_tryswapabilities::BattleScriptTryswapabilitiesOutcome,
) {
    let attacker = prior
        .selector_roles
        .attacker
        .expect("resolved case has attacker");
    let target = prior
        .selector_roles
        .target
        .expect("resolved case has target");
    let attacker_ability = prior.battlers[attacker.index()].ability;
    let target_ability = prior.battlers[target.index()].ability;
    let fails = (attacker_ability == BATTLE_SCRIPT_ABILITY_NONE
        && target_ability == BATTLE_SCRIPT_ABILITY_NONE)
        || attacker_ability == BATTLE_SCRIPT_ABILITY_WONDER_GUARD
        || target_ability == BATTLE_SCRIPT_ABILITY_WONDER_GUARD
        || (prior.move_result_flags & BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT) != 0;

    match outcome.control {
        BattleScriptTryswapabilitiesControl::Jump { .. } => {
            assert!(
                fails,
                "case {case_index} {} jumped without a fail predicate",
                case.label
            );
            assert_eq!(
                outcome.rules, prior,
                "case {case_index} {} jump must leave rules unchanged",
                case.label
            );
        }
        BattleScriptTryswapabilitiesControl::Advance => {
            assert!(
                !fails,
                "case {case_index} {} advanced despite a fail predicate",
                case.label
            );
            assert_eq!(
                outcome.rules.battlers[attacker.index()].ability,
                target_ability,
                "case {case_index} {} attacker did not receive target's ability",
                case.label
            );
            assert_eq!(
                outcome.rules.battlers[target.index()].ability,
                attacker_ability,
                "case {case_index} {} target did not receive attacker's ability",
                case.label
            );
            for i in 0..4 {
                if i != attacker.index() && i != target.index() {
                    assert_eq!(
                        outcome.rules.battlers[i], prior.battlers[i],
                        "case {case_index} {} untouched battler {i} changed",
                        case.label
                    );
                }
            }
            assert_eq!(
                outcome.rules.selector_roles, prior.selector_roles,
                "case {case_index} {} selector roles changed",
                case.label
            );
            assert_eq!(
                outcome.rules.move_result_flags, prior.move_result_flags,
                "case {case_index} {} move_result_flags changed",
                case.label
            );
        }
    }
}

#[test]
fn singleton_registration_matches_canonical_typescript_and_keeps_exact_errors() {
    assert_eq!(BATTLE_SCRIPT_TRYSWAPABILITIES_REGISTRATION_CASES.len(), 10);
    for case in BATTLE_SCRIPT_TRYSWAPABILITIES_REGISTRATION_CASES {
        execute_registration_case(&case);
    }
}

fn execute_registration_case(case: &BattleScriptTryswapabilitiesRegistrationVectorCase) {
    match (
        register_battle_script_tryswapabilities_handler(case.instructions),
        case.expected_opcode_id,
        case.expected_error,
    ) {
        (Ok(actual), Some(expected), None) => assert_eq!(actual.opcode_id, expected, "{}", case.label),
        (Err(actual), None, Some(expected)) => assert_eq!(actual.to_string(), expected, "{}", case.label),
        (actual, expected_opcode, expected_error) => panic!(
            "{} registration mismatch: actual={actual:?}, expected_opcode={expected_opcode:?}, expected_error={expected_error:?}",
            case.label
        ),
    }
}

#[test]
fn dense_matrices_cover_all_required_domains() {
    let ability_matrix = BATTLE_SCRIPT_TRYSWAPABILITIES_CASES
        .iter()
        .filter(|case| case.category == "dense-ability-matrix")
        .collect::<Vec<_>>();
    assert_eq!(ability_matrix.len(), 216);
    assert!(ability_matrix
        .iter()
        .any(|case| case.control == Some(BattleScriptTryswapabilitiesControl::Advance)));
    assert!(ability_matrix.iter().any(|case| matches!(
        case.control,
        Some(BattleScriptTryswapabilitiesControl::Jump { .. })
    )));

    let flags_sweep = BATTLE_SCRIPT_TRYSWAPABILITIES_CASES
        .iter()
        .filter(|case| case.category == "dense-move-result-flags-sweep")
        .collect::<Vec<_>>();
    assert_eq!(flags_sweep.len(), 36);
    assert!(flags_sweep
        .iter()
        .any(|case| case.control == Some(BattleScriptTryswapabilitiesControl::Advance)));
    assert!(flags_sweep.iter().any(|case| matches!(
        case.control,
        Some(BattleScriptTryswapabilitiesControl::Jump { .. })
    )));
}

#[test]
fn corpus_censuses_and_hash_are_pinned() {
    assert_eq!(
        BATTLE_SCRIPT_TRYSWAPABILITIES_DOMAIN_CENSUS,
        [
            ("source-battler-slots", 4),
            ("topology-variants", 2),
            ("ability-values", 6),
            ("move-result-flag-values", 6),
            ("registration-cases", 10),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYSWAPABILITIES_CATEGORY_CENSUS,
        [
            ("dense-ability-matrix", 216),
            ("dense-move-result-flags-sweep", 36),
            ("late-label-resolution", 1),
            ("malformed-shape-before-roles", 5),
            ("missing-attacker-role", 2),
            ("missing-target-role", 1),
            ("unresolved-failure-target", 1),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYSWAPABILITIES_BRANCH_CENSUS,
        [
            ("advance", 157),
            ("invalid-instruction-shape", 5),
            ("jump", 96),
            ("missing-attacker-role", 2),
            ("missing-target-role", 1),
            ("unresolved-failure-target", 1),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYSWAPABILITIES_REGISTRATION_BRANCH_CENSUS,
        [
            ("invalid-shape", 5),
            ("registered", 2),
            ("wrong-cardinality", 3)
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYSWAPABILITIES_VECTOR_CORPUS_SHA256,
        "b9550f749d80ecf2f3be66bc51227b6e34512db7253f7ec191dbbf06b47ed801"
    );
}
