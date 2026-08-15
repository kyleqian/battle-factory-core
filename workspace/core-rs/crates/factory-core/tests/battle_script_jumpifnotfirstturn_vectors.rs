//! Differential ratchet for
//! src/engine/battleScriptJumpifnotfirstturnOpcode.ts. Expected complete
//! projected results, controls, and the exact missing-role error are generated
//! by invoking the canonical TypeScript opcode handler; regenerate with
//! node --experimental-strip-types
//! core-rs/tools/gen-battle-script-jumpifnotfirstturn-vectors.mjs.

use std::collections::BTreeSet;
use std::convert::TryFrom;

use factory_core::battle_script_jumpifnotfirstturn::{
    apply_battle_script_jumpifnotfirstturn, BattleScriptJumpifnotfirstturnBattlerState,
    BattleScriptJumpifnotfirstturnControl, BattleScriptJumpifnotfirstturnIsFirstTurn,
    BattleScriptJumpifnotfirstturnRoles, BattleScriptJumpifnotfirstturnRules,
    BATTLE_SCRIPT_JUMPIFNOTFIRSTTURN_BATTLERS, BATTLE_SCRIPT_JUMPIFNOTFIRSTTURN_BATTLER_COUNT,
};
use factory_core::battle_script_jumpifnotfirstturn_vectors_gen::{
    BattleScriptJumpifnotfirstturnVectorCase, BattleScriptJumpifnotfirstturnVectorState,
    BATTLE_SCRIPT_JUMPIFNOTFIRSTTURN_ATTACKER_DOMAIN,
    BATTLE_SCRIPT_JUMPIFNOTFIRSTTURN_BRANCH_CENSUS,
    BATTLE_SCRIPT_JUMPIFNOTFIRSTTURN_CANONICAL_INVALID_U8_PROBES,
    BATTLE_SCRIPT_JUMPIFNOTFIRSTTURN_CASES, BATTLE_SCRIPT_JUMPIFNOTFIRSTTURN_CATEGORY_CENSUS,
    BATTLE_SCRIPT_JUMPIFNOTFIRSTTURN_DOMAIN_CENSUS,
    BATTLE_SCRIPT_JUMPIFNOTFIRSTTURN_IS_FIRST_TURN_DOMAIN,
    BATTLE_SCRIPT_JUMPIFNOTFIRSTTURN_SOURCE_STORAGE_U8_VALUES,
    BATTLE_SCRIPT_JUMPIFNOTFIRSTTURN_VECTOR_CORPUS_SHA256,
};

fn rules(value: BattleScriptJumpifnotfirstturnVectorState) -> BattleScriptJumpifnotfirstturnRules {
    BattleScriptJumpifnotfirstturnRules {
        battlers: value
            .is_first_turn
            .map(|is_first_turn| BattleScriptJumpifnotfirstturnBattlerState { is_first_turn }),
        selector_roles: BattleScriptJumpifnotfirstturnRoles { attacker: value.attacker },
    }
}

fn vector_state(
    value: BattleScriptJumpifnotfirstturnRules,
) -> BattleScriptJumpifnotfirstturnVectorState {
    BattleScriptJumpifnotfirstturnVectorState {
        is_first_turn: value.battlers.map(|battler| battler.is_first_turn),
        attacker: value.selector_roles.attacker,
    }
}

#[test]
fn complete_projected_outputs_controls_and_exact_missing_role_error_match_canonical_typescript() {
    assert_eq!(BATTLE_SCRIPT_JUMPIFNOTFIRSTTURN_CASES.len(), 20);
    for (case_index, case) in BATTLE_SCRIPT_JUMPIFNOTFIRSTTURN_CASES.iter().enumerate() {
        execute_case(case_index, case);
    }
}

fn execute_case(case_index: usize, case: &BattleScriptJumpifnotfirstturnVectorCase) {
    let input = rules(case.initial);
    let before = input;
    let mut current = input;
    let mut actual_controls = Vec::new();
    let mut actual_error = None;

    for application in 0..case.applications {
        let prior = current;
        match apply_battle_script_jumpifnotfirstturn(&current) {
            Ok(outcome) => {
                actual_controls.push(outcome.control);
                assert_transition_shape(case_index, case, application, prior, outcome);
                current = outcome.rules;
            }
            Err(error) => {
                actual_error = Some(error.to_string());
                break;
            }
        }
    }

    assert_eq!(
        input, before,
        "case {case_index} {}: native transformation mutated input",
        case.label,
    );
    match (actual_error, case.expected, case.expected_error) {
        (None, Some(expected), None) => {
            assert_eq!(
                actual_controls.as_slice(),
                case.controls,
                "case {case_index} {}: canonical control sequence",
                case.label,
            );
            assert_eq!(
                vector_state(current),
                expected,
                "case {case_index} {}: complete projected output",
                case.label,
            );
        }
        (Some(error), None, Some(expected_error)) => {
            assert_eq!(
                actual_controls.as_slice(),
                case.controls,
                "case {case_index} {}: error must not produce a control result",
                case.label,
            );
            assert_eq!(
                error, expected_error,
                "case {case_index} {}: exact missing-attacker error",
                case.label,
            );
        }
        (error, expected, expected_error) => panic!(
            "case {case_index} {}: generated outcome shape disagrees with native result: error={error:?}, expected={expected:?}, expected_error={expected_error:?}",
            case.label,
        ),
    }
}

fn assert_transition_shape(
    case_index: usize,
    case: &BattleScriptJumpifnotfirstturnVectorCase,
    application: u8,
    prior: BattleScriptJumpifnotfirstturnRules,
    outcome: factory_core::battle_script_jumpifnotfirstturn::BattleScriptJumpifnotfirstturnOutcome,
) {
    let attacker = prior.selector_roles.attacker.unwrap_or_else(|| {
        panic!(
            "case {case_index} {} application {application}: successful result had no attacker",
            case.label,
        )
    });
    assert_eq!(
        outcome.rules, prior,
        "case {case_index} {} application {application}: leaf changed complete narrow state",
        case.label,
    );
    assert_eq!(
        outcome.rules.selector_roles, prior.selector_roles,
        "case {case_index} {} application {application}: changed attacker role",
        case.label,
    );
    for battler in BATTLE_SCRIPT_JUMPIFNOTFIRSTTURN_BATTLERS {
        assert_eq!(
            outcome.rules.battlers[battler.index()],
            prior.battlers[battler.index()],
            "case {case_index} {} application {application}: changed battler {}",
            case.label,
            battler.as_u8(),
        );
    }
    let expected_control = if prior.battlers[attacker.index()].is_first_turn.is_nonzero() {
        BattleScriptJumpifnotfirstturnControl::Advance
    } else {
        BattleScriptJumpifnotfirstturnControl::FailJump
    };
    assert_eq!(
        outcome.control, expected_control,
        "case {case_index} {} application {application}: wrong truthy first-turn control",
        case.label,
    );
}

#[test]
fn matrix_covers_all_four_attackers_and_all_three_validated_is_first_turn_values() {
    let matrix = BATTLE_SCRIPT_JUMPIFNOTFIRSTTURN_CASES
        .iter()
        .filter(|case| case.category == "attacker-is-first-turn-matrix")
        .collect::<Vec<_>>();
    assert_eq!(matrix.len(), 12);

    let matrix_domain = matrix
        .iter()
        .map(|case| {
            let attacker = case
                .initial
                .attacker
                .unwrap_or_else(|| panic!("matrix case {} is missing an attacker", case.label));
            (
                attacker.as_u8(),
                case.initial.is_first_turn[attacker.index()].as_u8(),
            )
        })
        .collect::<BTreeSet<_>>();
    let expected = BATTLE_SCRIPT_JUMPIFNOTFIRSTTURN_ATTACKER_DOMAIN
        .into_iter()
        .flat_map(|attacker| {
            BATTLE_SCRIPT_JUMPIFNOTFIRSTTURN_IS_FIRST_TURN_DOMAIN
                .into_iter()
                .map(move |is_first_turn| (attacker, is_first_turn))
        })
        .collect::<BTreeSet<_>>();
    assert_eq!(matrix_domain, expected);

    let zero_controls = matrix
        .iter()
        .filter(|case| {
            let attacker = case.initial.attacker.expect("matrix attacker");
            case.initial.is_first_turn[attacker.index()]
                == BattleScriptJumpifnotfirstturnIsFirstTurn::NotFirstTurn
        })
        .map(|case| case.controls)
        .collect::<Vec<_>>();
    assert_eq!(
        zero_controls,
        vec![
            &[BattleScriptJumpifnotfirstturnControl::FailJump][..],
            &[BattleScriptJumpifnotfirstturnControl::FailJump][..],
            &[BattleScriptJumpifnotfirstturnControl::FailJump][..],
            &[BattleScriptJumpifnotfirstturnControl::FailJump][..],
        ],
    );
}

#[test]
fn all_valid_outcomes_preserve_every_sibling_and_repeated_paths_preserve_complete_state() {
    let sibling_cases = BATTLE_SCRIPT_JUMPIFNOTFIRSTTURN_CASES
        .iter()
        .filter(|case| case.category == "complete-state-sibling-preservation")
        .collect::<Vec<_>>();
    assert_eq!(sibling_cases.len(), 4);
    assert_eq!(
        sibling_cases
            .iter()
            .map(|case| {
                case.initial
                    .attacker
                    .expect("sibling preservation case attacker")
                    .as_u8()
            })
            .collect::<BTreeSet<_>>(),
        BATTLE_SCRIPT_JUMPIFNOTFIRSTTURN_ATTACKER_DOMAIN
            .into_iter()
            .collect::<BTreeSet<_>>(),
    );
    for case in sibling_cases {
        assert_eq!(
            case.expected,
            Some(case.initial),
            "{}: canonical sibling-preservation output changed state",
            case.label,
        );
    }

    let repeated = BATTLE_SCRIPT_JUMPIFNOTFIRSTTURN_CASES
        .iter()
        .filter(|case| case.category == "repeated-paths")
        .collect::<Vec<_>>();
    assert_eq!(repeated.len(), 3);
    for case in repeated {
        assert_eq!(
            case.applications, 2,
            "{}: repeated application count",
            case.label
        );
        assert_eq!(
            case.expected,
            Some(case.initial),
            "{}: repeated path changed complete state",
            case.label,
        );
    }
}

#[test]
fn missing_attacker_precedes_the_source_field_read_with_the_exact_canonical_error() {
    let case = BATTLE_SCRIPT_JUMPIFNOTFIRSTTURN_CASES
        .iter()
        .find(|case| case.label == "missing_attacker_role_precedes_is_first_turn_read")
        .expect("missing-attacker vector");
    assert_eq!(case.initial.attacker, None);
    assert_eq!(case.expected, None);
    assert_eq!(case.controls, &[]);
    assert_eq!(
        case.expected_error,
        Some("Battle Script hit-chain command requires a attacker role"),
    );
}

#[test]
fn canonical_is_first_turn_domain_is_validated_before_this_narrow_projection() {
    assert_eq!(
        BattleScriptJumpifnotfirstturnIsFirstTurn::try_from(0),
        Ok(BattleScriptJumpifnotfirstturnIsFirstTurn::NotFirstTurn),
    );
    assert_eq!(
        BattleScriptJumpifnotfirstturnIsFirstTurn::try_from(1),
        Ok(BattleScriptJumpifnotfirstturnIsFirstTurn::Value1),
    );
    assert_eq!(
        BattleScriptJumpifnotfirstturnIsFirstTurn::try_from(2),
        Ok(BattleScriptJumpifnotfirstturnIsFirstTurn::Value2),
    );
    for value in BATTLE_SCRIPT_JUMPIFNOTFIRSTTURN_CANONICAL_INVALID_U8_PROBES {
        let error = BattleScriptJumpifnotfirstturnIsFirstTurn::try_from(value)
            .expect_err("out-of-domain source-storage byte must not enter narrow projection");
        assert_eq!(error.value, value);
        assert_eq!(
            error.to_string(),
            format!("isFirstTurn must be in 0..=2, got {value}"),
        );
    }
}

#[test]
fn fixed_domains_censuses_and_corpus_hash_are_ratchet_pinned() {
    assert_eq!(BATTLE_SCRIPT_JUMPIFNOTFIRSTTURN_BATTLER_COUNT, 4);
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFNOTFIRSTTURN_BATTLERS.map(|battler| battler.as_u8()),
        BATTLE_SCRIPT_JUMPIFNOTFIRSTTURN_ATTACKER_DOMAIN,
    );
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFNOTFIRSTTURN_ATTACKER_DOMAIN,
        [0, 1, 2, 3]
    );
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFNOTFIRSTTURN_IS_FIRST_TURN_DOMAIN,
        [0, 1, 2],
    );
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFNOTFIRSTTURN_CANONICAL_INVALID_U8_PROBES,
        [3, 255],
    );
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFNOTFIRSTTURN_SOURCE_STORAGE_U8_VALUES,
        256,
    );
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFNOTFIRSTTURN_DOMAIN_CENSUS,
        [
            ("battler-slots", 4),
            ("attacker-role-values", 4),
            ("optional-attacker-role-values", 5),
            ("source-is-first-turn-storage-u8-values", 256),
            ("source-lifecycle-is-first-turn-values", 3),
            ("canonical-is-first-turn-values", 3),
            ("canonical-invalid-u8-probes", 2),
            ("control-branch-values", 2),
            ("application-count-values", 2),
            ("typed-missing-attacker-combinations", 1),
            ("absolute-failure-program-counter-fields-in-projection", 0),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFNOTFIRSTTURN_CATEGORY_CENSUS,
        [
            ("attacker-is-first-turn-matrix", 12),
            ("complete-state-sibling-preservation", 4),
            ("missing-attacker-role", 1),
            ("repeated-paths", 3),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFNOTFIRSTTURN_BRANCH_CENSUS,
        [
            ("advance", 11),
            ("advance-then-advance", 2),
            ("fail-jump", 5),
            ("fail-jump-then-fail-jump", 1),
            ("missing-attacker-role", 1),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFNOTFIRSTTURN_VECTOR_CORPUS_SHA256,
        "c48ced85f5c875b299bbdde39fbfe55471ffa51077eacc3a4f6bce9a971b3d02",
    );
}
