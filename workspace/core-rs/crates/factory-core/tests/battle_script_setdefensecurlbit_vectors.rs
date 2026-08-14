//! Differential ratchet for
//! src/engine/battleScriptSetDefenseCurlBitOpcode.ts. Expected complete
//! projected results, controls, and the exact missing-role error are generated
//! by invoking the canonical TypeScript opcode handler; regenerate with node
//! --experimental-strip-types
//! core-rs/tools/gen-battle-script-setdefensecurlbit-vectors.mjs.

use std::collections::BTreeSet;

use factory_core::battle_script_setdefensecurlbit::{
    apply_battle_script_setdefensecurlbit, BattleScriptSetdefensecurlbitBattlerState,
    BattleScriptSetdefensecurlbitControl, BattleScriptSetdefensecurlbitRoles,
    BattleScriptSetdefensecurlbitRules, BATTLE_SCRIPT_SETDEFENSECURLBIT_BATTLERS,
    BATTLE_SCRIPT_SETDEFENSECURLBIT_BATTLER_COUNT, BATTLE_SCRIPT_STATUS2_DEFENSE_CURL,
};
use factory_core::battle_script_setdefensecurlbit_vectors_gen::{
    BattleScriptSetdefensecurlbitVectorCase, BattleScriptSetdefensecurlbitVectorState,
    BATTLE_SCRIPT_SETDEFENSECURLBIT_ATTACKER_DOMAIN, BATTLE_SCRIPT_SETDEFENSECURLBIT_BRANCH_CENSUS,
    BATTLE_SCRIPT_SETDEFENSECURLBIT_CASES, BATTLE_SCRIPT_SETDEFENSECURLBIT_CATEGORY_CENSUS,
    BATTLE_SCRIPT_SETDEFENSECURLBIT_DOMAIN_CENSUS, BATTLE_SCRIPT_SETDEFENSECURLBIT_INPUT_DOMAIN,
    BATTLE_SCRIPT_SETDEFENSECURLBIT_STATUS2_EDGE_DOMAIN,
    BATTLE_SCRIPT_SETDEFENSECURLBIT_VECTOR_CORPUS_SHA256,
};

fn rules(value: BattleScriptSetdefensecurlbitVectorState) -> BattleScriptSetdefensecurlbitRules {
    BattleScriptSetdefensecurlbitRules {
        battlers: value
            .status2
            .map(|status2| BattleScriptSetdefensecurlbitBattlerState { status2 }),
        selector_roles: BattleScriptSetdefensecurlbitRoles { attacker: value.attacker },
    }
}

fn vector_state(
    value: BattleScriptSetdefensecurlbitRules,
) -> BattleScriptSetdefensecurlbitVectorState {
    BattleScriptSetdefensecurlbitVectorState {
        status2: value.battlers.map(|battler| battler.status2),
        attacker: value.selector_roles.attacker,
    }
}

#[test]
fn complete_projected_outputs_controls_and_exact_missing_role_error_match_canonical_typescript() {
    assert_eq!(BATTLE_SCRIPT_SETDEFENSECURLBIT_CASES.len(), 27);
    for (case_index, case) in BATTLE_SCRIPT_SETDEFENSECURLBIT_CASES.iter().enumerate() {
        execute_case(case_index, case);
    }
}

fn execute_case(case_index: usize, case: &BattleScriptSetdefensecurlbitVectorCase) {
    let input = rules(case.initial);
    let before = input;
    let mut current = input;
    let mut actual_controls = Vec::new();
    let mut actual_error = None;

    for application in 0..case.applications {
        let prior = current;
        match apply_battle_script_setdefensecurlbit(&current) {
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
    case: &BattleScriptSetdefensecurlbitVectorCase,
    application: u8,
    prior: BattleScriptSetdefensecurlbitRules,
    outcome: factory_core::battle_script_setdefensecurlbit::BattleScriptSetdefensecurlbitOutcome,
) {
    assert_eq!(
        outcome.control,
        BattleScriptSetdefensecurlbitControl::Advance,
        "case {case_index} {} application {application}: Defense Curl must advance",
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
    for battler in BATTLE_SCRIPT_SETDEFENSECURLBIT_BATTLERS {
        if battler != attacker {
            assert_eq!(
                outcome.rules.battlers[battler.index()],
                prior.battlers[battler.index()],
                "case {case_index} {} application {application}: changed non-attacker battler {}",
                case.label,
                battler.as_u8(),
            );
        }
    }
    assert_eq!(
        outcome.rules.battlers[attacker.index()].status2,
        prior.battlers[attacker.index()].status2 | BATTLE_SCRIPT_STATUS2_DEFENSE_CURL,
        "case {case_index} {} application {application}: did not OR Defense Curl into attacker status2",
        case.label,
    );
    assert_eq!(
        outcome.rules.battlers[attacker.index()].status2 & !BATTLE_SCRIPT_STATUS2_DEFENSE_CURL,
        prior.battlers[attacker.index()].status2 & !BATTLE_SCRIPT_STATUS2_DEFENSE_CURL,
        "case {case_index} {} application {application}: changed attacker status2 unrelated bits",
        case.label,
    );
}

#[test]
fn matrix_covers_all_four_attackers_clear_set_inputs_and_u32_edges() {
    let matrix = BATTLE_SCRIPT_SETDEFENSECURLBIT_CASES
        .iter()
        .filter(|case| case.category == "attacker-status2-matrix")
        .collect::<Vec<_>>();
    assert_eq!(matrix.len(), 8);
    let matrix_domain = matrix
        .iter()
        .map(|case| {
            let attacker = case
                .initial
                .attacker
                .unwrap_or_else(|| panic!("matrix case {} is missing attacker", case.label));
            (attacker.as_u8(), case.initial.status2[attacker.index()])
        })
        .collect::<BTreeSet<_>>();
    let expected_matrix = BATTLE_SCRIPT_SETDEFENSECURLBIT_ATTACKER_DOMAIN
        .into_iter()
        .flat_map(|attacker| {
            BATTLE_SCRIPT_SETDEFENSECURLBIT_INPUT_DOMAIN
                .into_iter()
                .map(move |status2| (attacker, status2))
        })
        .collect::<BTreeSet<_>>();
    assert_eq!(matrix_domain, expected_matrix);

    let edges = BATTLE_SCRIPT_SETDEFENSECURLBIT_CASES
        .iter()
        .filter(|case| case.category == "u32-status2-edge-matrix")
        .collect::<Vec<_>>();
    assert_eq!(edges.len(), 16);
    let edge_domain = edges
        .iter()
        .map(|case| {
            let attacker = case
                .initial
                .attacker
                .unwrap_or_else(|| panic!("edge case {} is missing attacker", case.label));
            (attacker.as_u8(), case.initial.status2[attacker.index()])
        })
        .collect::<BTreeSet<_>>();
    let expected_edges = BATTLE_SCRIPT_SETDEFENSECURLBIT_STATUS2_EDGE_DOMAIN
        .into_iter()
        .flat_map(|status2| {
            BATTLE_SCRIPT_SETDEFENSECURLBIT_ATTACKER_DOMAIN
                .into_iter()
                .map(move |attacker| (attacker, status2))
        })
        .collect::<BTreeSet<_>>();
    assert_eq!(edge_domain, expected_edges);
}

#[test]
fn attacker_only_preservation_missing_attacker_and_repeated_idempotence_are_pinned() {
    let attacker_only = BATTLE_SCRIPT_SETDEFENSECURLBIT_CASES
        .iter()
        .find(|case| case.label == "attacker_only_mutation_preserves_siblings_and_unrelated_bits")
        .expect("attacker-only vector");
    let attacker_only_expected = attacker_only.expected.expect("attacker-only output");
    assert_eq!(
        attacker_only.initial.attacker,
        Some(factory_core::battle_script_setdefensecurlbit::BattleScriptSetdefensecurlbitBattler::Battler2)
    );
    assert_eq!(attacker_only_expected.status2[2], 0xc000_0101);
    for battler in [0, 1, 3] {
        assert_eq!(
            attacker_only_expected.status2[battler], attacker_only.initial.status2[battler],
            "attacker-only vector changed sibling {battler}",
        );
    }

    let missing = BATTLE_SCRIPT_SETDEFENSECURLBIT_CASES
        .iter()
        .find(|case| case.label == "missing_attacker_role_precedes_status2_read")
        .expect("missing-attacker vector");
    assert_eq!(missing.initial.attacker, None);
    assert_eq!(missing.initial.status2[2], u32::MAX);
    assert_eq!(missing.expected, None);
    assert!(missing.controls.is_empty());
    assert_eq!(
        missing.expected_error,
        Some("Battle Script hit-chain command requires a attacker role"),
    );

    let repeated = BATTLE_SCRIPT_SETDEFENSECURLBIT_CASES
        .iter()
        .find(|case| case.label == "repeated_application_is_idempotent_and_advances_each_time")
        .expect("repeated-application vector");
    assert_eq!(repeated.applications, 2);
    assert_eq!(
        repeated.controls,
        &[
            BattleScriptSetdefensecurlbitControl::Advance,
            BattleScriptSetdefensecurlbitControl::Advance,
        ],
    );
    let expected = repeated.expected.expect("repeated output");
    assert_eq!(expected.status2[3], 0x4100_0001);
    assert_eq!(
        expected.status2[3],
        repeated.initial.status2[3] | BATTLE_SCRIPT_STATUS2_DEFENSE_CURL,
        "second Defense Curl application must leave the initial OR result intact",
    );
}

#[test]
fn fixed_four_slot_domain_u32_edges_and_source_constant_are_retained() {
    assert_eq!(BATTLE_SCRIPT_SETDEFENSECURLBIT_BATTLER_COUNT, 4);
    assert_eq!(
        BATTLE_SCRIPT_SETDEFENSECURLBIT_BATTLERS.map(|battler| battler.as_u8()),
        BATTLE_SCRIPT_SETDEFENSECURLBIT_ATTACKER_DOMAIN,
    );
    assert_eq!(
        BATTLE_SCRIPT_SETDEFENSECURLBIT_ATTACKER_DOMAIN,
        [0, 1, 2, 3]
    );
    assert_eq!(
        BATTLE_SCRIPT_SETDEFENSECURLBIT_INPUT_DOMAIN,
        [0x0000_0000, 0x4000_0000],
    );
    assert_eq!(
        BATTLE_SCRIPT_SETDEFENSECURLBIT_STATUS2_EDGE_DOMAIN,
        [0x0000_0000, 0xffff_ffff, 0x8000_0000, 0x0100_0001],
    );
    assert_eq!(BATTLE_SCRIPT_STATUS2_DEFENSE_CURL, 0x4000_0000);
}

#[test]
fn domain_category_branch_censuses_and_corpus_hash_are_ratchet_pinned() {
    assert_eq!(
        BATTLE_SCRIPT_SETDEFENSECURLBIT_DOMAIN_CENSUS,
        [
            ("battler-slots", 4),
            ("attacker-role-values", 4),
            ("optional-attacker-role-values", 5),
            ("status2-u32-values", 4_294_967_296),
            ("status2-edge-values", 4),
            ("defense-curl-clear-set-inputs", 2),
            ("application-count-values", 2),
            ("typed-missing-attacker-combinations", 1),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_SETDEFENSECURLBIT_CATEGORY_CENSUS,
        [
            ("attacker-only-mutation", 1),
            ("attacker-status2-matrix", 8),
            ("missing-attacker-role", 1),
            ("repeated-application", 1),
            ("u32-status2-edge-matrix", 16),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_SETDEFENSECURLBIT_BRANCH_CENSUS,
        [
            ("advance", 25),
            ("advance-then-advance", 1),
            ("missing-attacker-role", 1),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_SETDEFENSECURLBIT_VECTOR_CORPUS_SHA256,
        "39dd1fb0a8d96809508adfd1282eef87c6fc202f49920bb009d80ce61b839825",
    );
}
