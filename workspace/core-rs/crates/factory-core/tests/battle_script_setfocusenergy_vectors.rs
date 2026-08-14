//! Differential ratchet for
//! `src/engine/battleScriptSetfocusenergyOpcode.ts`. Expected complete
//! projected results, controls, and the exact missing-role error are generated
//! by invoking the canonical TypeScript opcode handler; regenerate with node
//! --experimental-strip-types
//! core-rs/tools/gen-battle-script-setfocusenergy-vectors.mjs.

use std::collections::BTreeSet;

use factory_core::battle_script_setfocusenergy::{
    apply_battle_script_setfocusenergy, BattleScriptSetfocusenergyBattlerState,
    BattleScriptSetfocusenergyControl, BattleScriptSetfocusenergyRoles,
    BattleScriptSetfocusenergyRules, BATTLE_SCRIPT_B_MSG_FOCUS_ENERGY_FAILED,
    BATTLE_SCRIPT_B_MSG_GETTING_PUMPED, BATTLE_SCRIPT_MOVE_RESULT_FAILED,
    BATTLE_SCRIPT_SETFOCUSENERGY_BATTLERS, BATTLE_SCRIPT_SETFOCUSENERGY_BATTLER_COUNT,
    BATTLE_SCRIPT_STATUS2_FOCUS_ENERGY,
};
use factory_core::battle_script_setfocusenergy_vectors_gen::{
    BattleScriptSetfocusenergyVectorCase, BattleScriptSetfocusenergyVectorState,
    BATTLE_SCRIPT_SETFOCUSENERGY_ATTACKER_DOMAIN, BATTLE_SCRIPT_SETFOCUSENERGY_BRANCH_CENSUS,
    BATTLE_SCRIPT_SETFOCUSENERGY_CASES, BATTLE_SCRIPT_SETFOCUSENERGY_CATEGORY_CENSUS,
    BATTLE_SCRIPT_SETFOCUSENERGY_DOMAIN_CENSUS, BATTLE_SCRIPT_SETFOCUSENERGY_INPUT_DOMAIN,
    BATTLE_SCRIPT_SETFOCUSENERGY_MOVE_RESULT_FAILED_INPUT_DOMAIN,
    BATTLE_SCRIPT_SETFOCUSENERGY_MOVE_RESULT_FLAGS_EDGE_DOMAIN,
    BATTLE_SCRIPT_SETFOCUSENERGY_PRIOR_MULTISTRING_CHOOSER_DOMAIN,
    BATTLE_SCRIPT_SETFOCUSENERGY_STATUS2_EDGE_DOMAIN,
    BATTLE_SCRIPT_SETFOCUSENERGY_VECTOR_CORPUS_SHA256,
};

fn rules(value: BattleScriptSetfocusenergyVectorState) -> BattleScriptSetfocusenergyRules {
    BattleScriptSetfocusenergyRules {
        battlers: value
            .status2
            .map(|status2| BattleScriptSetfocusenergyBattlerState { status2 }),
        move_result_flags: value.move_result_flags,
        multistring_chooser: value.multistring_chooser,
        selector_roles: BattleScriptSetfocusenergyRoles { attacker: value.attacker },
    }
}

fn vector_state(value: BattleScriptSetfocusenergyRules) -> BattleScriptSetfocusenergyVectorState {
    BattleScriptSetfocusenergyVectorState {
        status2: value.battlers.map(|battler| battler.status2),
        move_result_flags: value.move_result_flags,
        multistring_chooser: value.multistring_chooser,
        attacker: value.selector_roles.attacker,
    }
}

#[test]
fn complete_projected_outputs_controls_and_exact_missing_role_error_match_canonical_typescript() {
    assert_eq!(BATTLE_SCRIPT_SETFOCUSENERGY_CASES.len(), 69);
    for (case_index, case) in BATTLE_SCRIPT_SETFOCUSENERGY_CASES.iter().enumerate() {
        execute_case(case_index, case);
    }
}

fn execute_case(case_index: usize, case: &BattleScriptSetfocusenergyVectorCase) {
    let input = rules(case.initial);
    let before = input;
    let mut current = input;
    let mut actual_controls = Vec::new();
    let mut actual_error = None;

    for application in 0..case.applications {
        let prior = current;
        match apply_battle_script_setfocusenergy(&current) {
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
        case.label
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
                actual_controls.len(),
                usize::from(case.applications),
                "case {case_index} {}: successful sequence stopped early",
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
    case: &BattleScriptSetfocusenergyVectorCase,
    application: u8,
    prior: BattleScriptSetfocusenergyRules,
    outcome: factory_core::battle_script_setfocusenergy::BattleScriptSetfocusenergyOutcome,
) {
    assert_eq!(
        outcome.control,
        BattleScriptSetfocusenergyControl::Advance,
        "case {case_index} {} application {application}: Focus Energy must advance",
        case.label,
    );
    let attacker = prior.selector_roles.attacker.unwrap_or_else(|| {
        panic!(
            "case {case_index} {} application {application}: advance had no attacker",
            case.label
        )
    });
    assert_eq!(
        outcome.rules.selector_roles, prior.selector_roles,
        "case {case_index} {} application {application}: changed attacker role",
        case.label,
    );

    let already_focused =
        prior.battlers[attacker.index()].status2 & BATTLE_SCRIPT_STATUS2_FOCUS_ENERGY != 0;
    if already_focused {
        assert_eq!(
            outcome.rules.battlers, prior.battlers,
            "case {case_index} {} application {application}: already-focused failure changed a battler",
            case.label,
        );
        assert_eq!(
            outcome.rules.move_result_flags,
            prior.move_result_flags | BATTLE_SCRIPT_MOVE_RESULT_FAILED,
            "case {case_index} {} application {application}: failure did not OR MOVE_RESULT_FAILED",
            case.label,
        );
        assert_eq!(
            outcome.rules.move_result_flags & !BATTLE_SCRIPT_MOVE_RESULT_FAILED,
            prior.move_result_flags & !BATTLE_SCRIPT_MOVE_RESULT_FAILED,
            "case {case_index} {} application {application}: failure changed unrelated move-result bits",
            case.label,
        );
        assert_eq!(
            outcome.rules.multistring_chooser, BATTLE_SCRIPT_B_MSG_FOCUS_ENERGY_FAILED,
            "case {case_index} {} application {application}: failure chose the wrong message",
            case.label,
        );
        return;
    }

    assert_eq!(
        outcome.rules.move_result_flags, prior.move_result_flags,
        "case {case_index} {} application {application}: success changed moveResultFlags",
        case.label,
    );
    for battler in BATTLE_SCRIPT_SETFOCUSENERGY_BATTLERS {
        if battler != attacker {
            assert_eq!(
                outcome.rules.battlers[battler.index()],
                prior.battlers[battler.index()],
                "case {case_index} {} application {application}: success changed non-attacker battler {}",
                case.label,
                battler.as_u8(),
            );
        }
    }
    assert_eq!(
        outcome.rules.battlers[attacker.index()].status2,
        prior.battlers[attacker.index()].status2 | BATTLE_SCRIPT_STATUS2_FOCUS_ENERGY,
        "case {case_index} {} application {application}: success did not OR Focus Energy into attacker status2",
        case.label,
    );
    assert_eq!(
        outcome.rules.battlers[attacker.index()].status2 & !BATTLE_SCRIPT_STATUS2_FOCUS_ENERGY,
        prior.battlers[attacker.index()].status2 & !BATTLE_SCRIPT_STATUS2_FOCUS_ENERGY,
        "case {case_index} {} application {application}: success changed attacker status2 unrelated bits",
        case.label,
    );
    assert_eq!(
        outcome.rules.multistring_chooser, BATTLE_SCRIPT_B_MSG_GETTING_PUMPED,
        "case {case_index} {} application {application}: success chose the wrong message",
        case.label,
    );
}

#[test]
fn matrix_covers_all_four_attackers_focus_move_result_inputs_and_u32_edges() {
    let matrix = BATTLE_SCRIPT_SETFOCUSENERGY_CASES
        .iter()
        .filter(|case| case.category == "attacker-focus-move-result-matrix")
        .collect::<Vec<_>>();
    assert_eq!(matrix.len(), 16);
    let matrix_domain = matrix
        .iter()
        .map(|case| {
            let attacker = case
                .initial
                .attacker
                .unwrap_or_else(|| panic!("matrix case {} is missing attacker", case.label));
            (
                attacker.as_u8(),
                case.initial.status2[attacker.index()],
                case.initial.move_result_flags,
            )
        })
        .collect::<BTreeSet<_>>();
    let expected_matrix = BATTLE_SCRIPT_SETFOCUSENERGY_ATTACKER_DOMAIN
        .into_iter()
        .flat_map(|attacker| {
            BATTLE_SCRIPT_SETFOCUSENERGY_INPUT_DOMAIN
                .into_iter()
                .flat_map(move |status2| {
                    BATTLE_SCRIPT_SETFOCUSENERGY_MOVE_RESULT_FAILED_INPUT_DOMAIN
                        .into_iter()
                        .map(move |move_result_flags| (attacker, status2, move_result_flags))
                })
        })
        .collect::<BTreeSet<_>>();
    assert_eq!(matrix_domain, expected_matrix);

    let status2_edges = BATTLE_SCRIPT_SETFOCUSENERGY_CASES
        .iter()
        .filter(|case| case.category == "status2-u32-edge-matrix")
        .collect::<Vec<_>>();
    assert_eq!(status2_edges.len(), 16);
    let status2_edge_domain = status2_edges
        .iter()
        .map(|case| {
            let attacker = case
                .initial
                .attacker
                .unwrap_or_else(|| panic!("status2 edge case {} is missing attacker", case.label));
            (attacker.as_u8(), case.initial.status2[attacker.index()])
        })
        .collect::<BTreeSet<_>>();
    let expected_status2_edges = BATTLE_SCRIPT_SETFOCUSENERGY_ATTACKER_DOMAIN
        .into_iter()
        .flat_map(|attacker| {
            BATTLE_SCRIPT_SETFOCUSENERGY_STATUS2_EDGE_DOMAIN
                .into_iter()
                .map(move |status2| (attacker, status2))
        })
        .collect::<BTreeSet<_>>();
    assert_eq!(status2_edge_domain, expected_status2_edges);

    let move_result_edges = BATTLE_SCRIPT_SETFOCUSENERGY_CASES
        .iter()
        .filter(|case| case.category == "move-result-flags-u32-edge-matrix")
        .collect::<Vec<_>>();
    assert_eq!(move_result_edges.len(), 32);
    let move_result_edge_domain = move_result_edges
        .iter()
        .map(|case| {
            let attacker = case.initial.attacker.unwrap_or_else(|| {
                panic!("move-result edge case {} is missing attacker", case.label)
            });
            (
                attacker.as_u8(),
                case.initial.status2[attacker.index()],
                case.initial.move_result_flags,
            )
        })
        .collect::<BTreeSet<_>>();
    let expected_move_result_edges = BATTLE_SCRIPT_SETFOCUSENERGY_ATTACKER_DOMAIN
        .into_iter()
        .flat_map(|attacker| {
            BATTLE_SCRIPT_SETFOCUSENERGY_INPUT_DOMAIN
                .into_iter()
                .flat_map(move |status2| {
                    BATTLE_SCRIPT_SETFOCUSENERGY_MOVE_RESULT_FLAGS_EDGE_DOMAIN
                        .into_iter()
                        .map(move |move_result_flags| (attacker, status2, move_result_flags))
                })
        })
        .collect::<BTreeSet<_>>();
    assert_eq!(move_result_edge_domain, expected_move_result_edges);
}

#[test]
fn chooser_overwrite_sibling_preservation_missing_role_order_and_repeated_paths_are_pinned() {
    let expected_choosers = BATTLE_SCRIPT_SETFOCUSENERGY_PRIOR_MULTISTRING_CHOOSER_DOMAIN
        .into_iter()
        .collect::<BTreeSet<_>>();
    for branch in ["success-advance", "already-focused-failure-advance"] {
        let observed_choosers = BATTLE_SCRIPT_SETFOCUSENERGY_CASES
            .iter()
            .filter(|case| case.branch == branch)
            .map(|case| case.initial.multistring_chooser)
            .collect::<BTreeSet<_>>();
        assert_eq!(
            observed_choosers, expected_choosers,
            "{branch} chooser probes"
        );
    }

    let success = BATTLE_SCRIPT_SETFOCUSENERGY_CASES
        .iter()
        .find(|case| {
            case.label == "success_mutates_only_attacker_preserves_flags_and_overwrites_chooser"
        })
        .expect("success preservation vector");
    let success_expected = success.expected.expect("success preservation output");
    assert_eq!(success.initial.attacker.map(|value| value.as_u8()), Some(2));
    assert_eq!(success.initial.multistring_chooser, 0xa5);
    assert_eq!(
        success_expected.multistring_chooser,
        BATTLE_SCRIPT_B_MSG_GETTING_PUMPED
    );
    assert_ne!(
        success_expected.multistring_chooser,
        success.initial.multistring_chooser
    );
    assert_eq!(
        success_expected.move_result_flags,
        success.initial.move_result_flags
    );
    assert_eq!(success_expected.status2[2], 0x8010_0101);
    for battler in [0, 1, 3] {
        assert_eq!(
            success_expected.status2[battler], success.initial.status2[battler],
            "success preservation vector changed sibling {battler}",
        );
    }

    let failure = BATTLE_SCRIPT_SETFOCUSENERGY_CASES
        .iter()
        .find(|case| {
            case.label
                == "already_focused_failure_preserves_battlers_ors_flags_and_overwrites_chooser"
        })
        .expect("failure preservation vector");
    let failure_expected = failure.expected.expect("failure preservation output");
    assert_eq!(failure.initial.attacker.map(|value| value.as_u8()), Some(1));
    assert_eq!(failure.initial.multistring_chooser, 0x7f);
    assert_eq!(
        failure_expected.multistring_chooser,
        BATTLE_SCRIPT_B_MSG_FOCUS_ENERGY_FAILED
    );
    assert_ne!(
        failure_expected.multistring_chooser,
        failure.initial.multistring_chooser
    );
    assert_eq!(failure_expected.status2, failure.initial.status2);
    assert_eq!(failure_expected.move_result_flags, 0x8000_0121);
    assert_eq!(
        failure_expected.move_result_flags & !BATTLE_SCRIPT_MOVE_RESULT_FAILED,
        failure.initial.move_result_flags & !BATTLE_SCRIPT_MOVE_RESULT_FAILED,
    );

    let missing = BATTLE_SCRIPT_SETFOCUSENERGY_CASES
        .iter()
        .find(|case| {
            case.label
                == "missing_attacker_role_precedes_status2_move_result_flags_and_chooser_reads"
        })
        .expect("missing-attacker vector");
    assert_eq!(missing.initial.attacker, None);
    assert_eq!(missing.initial.status2[2], u32::MAX);
    assert_eq!(missing.initial.move_result_flags, u32::MAX);
    assert_eq!(missing.initial.multistring_chooser, u8::MAX);
    assert_eq!(missing.expected, None);
    assert!(missing.controls.is_empty());
    assert_eq!(
        missing.expected_error,
        Some("Battle Script hit-chain command requires a attacker role"),
    );

    let success_then_failure = BATTLE_SCRIPT_SETFOCUSENERGY_CASES
        .iter()
        .find(|case| case.label == "repeated_application_success_then_already_focused_failure")
        .expect("success-then-failure vector");
    let success_then_failure_expected = success_then_failure
        .expected
        .expect("success-then-failure output");
    assert_eq!(success_then_failure.applications, 2);
    assert_eq!(
        success_then_failure.branch,
        "success-then-already-focused-failure-advance",
    );
    assert_eq!(
        success_then_failure.controls,
        &[
            BattleScriptSetfocusenergyControl::Advance,
            BattleScriptSetfocusenergyControl::Advance,
        ],
    );
    assert_eq!(success_then_failure_expected.status2[3], 0x8010_0101);
    assert_eq!(success_then_failure_expected.move_result_flags, 0x0100_0021);
    assert_eq!(
        success_then_failure_expected.multistring_chooser,
        BATTLE_SCRIPT_B_MSG_FOCUS_ENERGY_FAILED,
    );

    let repeated_failure = BATTLE_SCRIPT_SETFOCUSENERGY_CASES
        .iter()
        .find(|case| case.label == "repeated_already_focused_failure_is_idempotent")
        .expect("repeated-failure vector");
    let repeated_failure_expected = repeated_failure.expected.expect("repeated-failure output");
    assert_eq!(repeated_failure.applications, 2);
    assert_eq!(
        repeated_failure.branch,
        "already-focused-failure-then-already-focused-failure-advance",
    );
    assert_eq!(
        repeated_failure.controls,
        &[
            BattleScriptSetfocusenergyControl::Advance,
            BattleScriptSetfocusenergyControl::Advance,
        ],
    );
    assert_eq!(
        repeated_failure_expected.status2,
        repeated_failure.initial.status2
    );
    assert_eq!(repeated_failure_expected.move_result_flags, 0x0100_0021);
    assert_eq!(
        repeated_failure_expected.multistring_chooser,
        BATTLE_SCRIPT_B_MSG_FOCUS_ENERGY_FAILED,
    );
}

#[test]
fn fixed_four_slot_domain_u32_edges_and_source_constants_are_retained() {
    assert_eq!(BATTLE_SCRIPT_SETFOCUSENERGY_BATTLER_COUNT, 4);
    assert_eq!(
        BATTLE_SCRIPT_SETFOCUSENERGY_BATTLERS.map(|battler| battler.as_u8()),
        BATTLE_SCRIPT_SETFOCUSENERGY_ATTACKER_DOMAIN,
    );
    assert_eq!(BATTLE_SCRIPT_SETFOCUSENERGY_ATTACKER_DOMAIN, [0, 1, 2, 3]);
    assert_eq!(
        BATTLE_SCRIPT_SETFOCUSENERGY_INPUT_DOMAIN,
        [0x0000_0000, 0x0010_0000],
    );
    assert_eq!(
        BATTLE_SCRIPT_SETFOCUSENERGY_STATUS2_EDGE_DOMAIN,
        [0x0000_0000, 0xffff_ffff, 0x8000_0000, 0x0100_0001],
    );
    assert_eq!(
        BATTLE_SCRIPT_SETFOCUSENERGY_MOVE_RESULT_FAILED_INPUT_DOMAIN,
        [0x0000_0000, 0x0000_0020],
    );
    assert_eq!(
        BATTLE_SCRIPT_SETFOCUSENERGY_MOVE_RESULT_FLAGS_EDGE_DOMAIN,
        [0x0000_0000, 0xffff_ffff, 0x8000_0000, 0x0100_0001],
    );
    assert_eq!(
        BATTLE_SCRIPT_SETFOCUSENERGY_PRIOR_MULTISTRING_CHOOSER_DOMAIN,
        [0x00, 0x01, 0x2a, 0x7f, 0xa5, 0xff],
    );
    assert_eq!(BATTLE_SCRIPT_STATUS2_FOCUS_ENERGY, 0x0010_0000);
    assert_eq!(BATTLE_SCRIPT_MOVE_RESULT_FAILED, 0x0000_0020);
    assert_eq!(BATTLE_SCRIPT_B_MSG_GETTING_PUMPED, 0);
    assert_eq!(BATTLE_SCRIPT_B_MSG_FOCUS_ENERGY_FAILED, 1);
}

#[test]
fn domain_category_branch_censuses_and_corpus_hash_are_ratchet_pinned() {
    assert_eq!(
        BATTLE_SCRIPT_SETFOCUSENERGY_DOMAIN_CENSUS,
        [
            ("battler-slots", 4),
            ("attacker-role-values", 4),
            ("optional-attacker-role-values", 5),
            ("status2-u32-values", 4_294_967_296),
            ("status2-focus-clear-set-inputs", 2),
            ("status2-edge-values", 4),
            ("move-result-flags-u32-values", 4_294_967_296),
            ("move-result-failed-clear-set-inputs", 2),
            ("move-result-flags-edge-values", 4),
            ("multistring-chooser-u8-values", 256),
            ("prior-multistring-chooser-probes", 6),
            ("application-count-values", 2),
            ("typed-missing-attacker-combinations", 1),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_SETFOCUSENERGY_CATEGORY_CENSUS,
        [
            ("already-focused-failure-preservation", 1),
            ("attacker-focus-move-result-matrix", 16),
            ("missing-attacker-role", 1),
            ("move-result-flags-u32-edge-matrix", 32),
            ("repeated-already-focused-failure", 1),
            ("repeated-success-then-failure", 1),
            ("status2-u32-edge-matrix", 16),
            ("success-attacker-only-mutation", 1),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_SETFOCUSENERGY_BRANCH_CENSUS,
        [
            ("already-focused-failure-advance", 29),
            (
                "already-focused-failure-then-already-focused-failure-advance",
                1,
            ),
            ("missing-attacker-role", 1),
            ("success-advance", 37),
            ("success-then-already-focused-failure-advance", 1),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_SETFOCUSENERGY_VECTOR_CORPUS_SHA256,
        "7b3faf718150f8fc6a791ce01c4df7f6c72ea80390417f75de316f381e9184c7",
    );
}
