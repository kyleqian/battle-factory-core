//! Differential ratchet for
//! `src/engine/battleScriptSetforcedtargetOpcode.ts`. Expected complete
//! projected results, controls, and the exact missing-role error are generated
//! by invoking the canonical TypeScript opcode handler; regenerate with node
//! --experimental-strip-types
//! core-rs/tools/gen-battle-script-setforcedtarget-vectors.mjs.

use std::collections::BTreeSet;

use factory_core::battle_script_setforcedtarget::{
    apply_battle_script_setforcedtarget, BattleScriptSetforcedtargetBattlerState,
    BattleScriptSetforcedtargetControl, BattleScriptSetforcedtargetRoles,
    BattleScriptSetforcedtargetRules, BattleScriptSetforcedtargetSideTimerState,
    BATTLE_SCRIPT_SETFORCEDTARGET_BATTLERS, BATTLE_SCRIPT_SETFORCEDTARGET_BATTLER_COUNT,
    BATTLE_SCRIPT_SETFORCEDTARGET_FOLLOWME_TIMER_SET, BATTLE_SCRIPT_SETFORCEDTARGET_SIDES,
    BATTLE_SCRIPT_SETFORCEDTARGET_SIDE_COUNT,
};
use factory_core::battle_script_setforcedtarget_vectors_gen::{
    BattleScriptSetforcedtargetVectorCase, BattleScriptSetforcedtargetVectorState,
    BATTLE_SCRIPT_SETFORCEDTARGET_ATTACKER_DOMAIN, BATTLE_SCRIPT_SETFORCEDTARGET_BRANCH_CENSUS,
    BATTLE_SCRIPT_SETFORCEDTARGET_CANONICAL_BATTLER_SIDES, BATTLE_SCRIPT_SETFORCEDTARGET_CASES,
    BATTLE_SCRIPT_SETFORCEDTARGET_CATEGORY_CENSUS, BATTLE_SCRIPT_SETFORCEDTARGET_DOMAIN_CENSUS,
    BATTLE_SCRIPT_SETFORCEDTARGET_FOLLOWME_TARGET_DOMAIN,
    BATTLE_SCRIPT_SETFORCEDTARGET_FOLLOWME_TIMER_EDGE_DOMAIN,
    BATTLE_SCRIPT_SETFORCEDTARGET_SIDE_DOMAIN, BATTLE_SCRIPT_SETFORCEDTARGET_U8_EDGE_DOMAIN,
    BATTLE_SCRIPT_SETFORCEDTARGET_VECTOR_CORPUS_SHA256,
};

fn rules(value: BattleScriptSetforcedtargetVectorState) -> BattleScriptSetforcedtargetRules {
    BattleScriptSetforcedtargetRules {
        battlers: value
            .battler_sides
            .map(|side| BattleScriptSetforcedtargetBattlerState { side }),
        side_timers: value.side_timers,
        selector_roles: BattleScriptSetforcedtargetRoles { attacker: value.attacker },
    }
}

fn vector_state(value: BattleScriptSetforcedtargetRules) -> BattleScriptSetforcedtargetVectorState {
    BattleScriptSetforcedtargetVectorState {
        battler_sides: value.battlers.map(|battler| battler.side),
        side_timers: value.side_timers,
        attacker: value.selector_roles.attacker,
    }
}

#[test]
fn complete_projected_outputs_controls_and_exact_missing_role_error_match_canonical_typescript() {
    assert_eq!(BATTLE_SCRIPT_SETFORCEDTARGET_CASES.len(), 57);
    for (case_index, case) in BATTLE_SCRIPT_SETFORCEDTARGET_CASES.iter().enumerate() {
        execute_case(case_index, case);
    }
}

fn execute_case(case_index: usize, case: &BattleScriptSetforcedtargetVectorCase) {
    let input = rules(case.initial);
    let before = input;
    let mut current = input;
    let mut actual_controls = Vec::new();
    let mut actual_error = None;

    for application in 0..case.applications {
        let prior = current;
        match apply_battle_script_setforcedtarget(&current) {
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
    case: &BattleScriptSetforcedtargetVectorCase,
    application: u8,
    prior: BattleScriptSetforcedtargetRules,
    outcome: factory_core::battle_script_setforcedtarget::BattleScriptSetforcedtargetOutcome,
) {
    assert_eq!(
        outcome.control,
        BattleScriptSetforcedtargetControl::Advance,
        "case {case_index} {} application {application}: Follow Me must advance",
        case.label,
    );
    let attacker = prior.selector_roles.attacker.unwrap_or_else(|| {
        panic!(
            "case {case_index} {} application {application}: advance had no attacker",
            case.label,
        )
    });
    let side = prior.battlers[attacker.index()].side;
    let opposite = side.opposite();
    let prior_timer = prior.side_timers[side.index()];
    let next_timer = outcome.rules.side_timers[side.index()];

    assert_eq!(
        outcome.rules.selector_roles, prior.selector_roles,
        "case {case_index} {} application {application}: changed attacker role",
        case.label,
    );
    assert_eq!(
        outcome.rules.battlers, prior.battlers,
        "case {case_index} {} application {application}: changed battler-side records",
        case.label,
    );
    assert_eq!(
        outcome.rules.side_timers[opposite.index()],
        prior.side_timers[opposite.index()],
        "case {case_index} {} application {application}: changed opposite side timer",
        case.label,
    );
    assert_eq!(
        next_timer.followme_timer, BATTLE_SCRIPT_SETFORCEDTARGET_FOLLOWME_TIMER_SET,
        "case {case_index} {} application {application}: Follow Me timer write",
        case.label,
    );
    assert_eq!(
        next_timer.followme_target, attacker,
        "case {case_index} {} application {application}: Follow Me target write",
        case.label,
    );
    assert_sibling_timer_fields_preserved(case_index, case, application, prior_timer, next_timer);
}

fn assert_sibling_timer_fields_preserved(
    case_index: usize,
    case: &BattleScriptSetforcedtargetVectorCase,
    application: u8,
    prior: BattleScriptSetforcedtargetSideTimerState,
    next: BattleScriptSetforcedtargetSideTimerState,
) {
    assert_eq!(
        next.reflect_timer, prior.reflect_timer,
        "case {case_index} {} application {application}: changed reflect timer",
        case.label,
    );
    assert_eq!(
        next.reflect_battler_id, prior.reflect_battler_id,
        "case {case_index} {} application {application}: changed reflect battler",
        case.label,
    );
    assert_eq!(
        next.lightscreen_timer, prior.lightscreen_timer,
        "case {case_index} {} application {application}: changed Light Screen timer",
        case.label,
    );
    assert_eq!(
        next.lightscreen_battler_id, prior.lightscreen_battler_id,
        "case {case_index} {} application {application}: changed Light Screen battler",
        case.label,
    );
    assert_eq!(
        next.safeguard_timer, prior.safeguard_timer,
        "case {case_index} {} application {application}: changed Safeguard timer",
        case.label,
    );
    assert_eq!(
        next.safeguard_battler_id, prior.safeguard_battler_id,
        "case {case_index} {} application {application}: changed Safeguard battler",
        case.label,
    );
    assert_eq!(
        next.mist_battler_id, prior.mist_battler_id,
        "case {case_index} {} application {application}: changed Mist battler",
        case.label,
    );
    assert_eq!(
        next.spikes_amount, prior.spikes_amount,
        "case {case_index} {} application {application}: changed Spikes amount",
        case.label,
    );
}

#[test]
fn matrix_covers_all_attackers_canonical_sides_timer_edges_and_prior_targets() {
    let matrix = BATTLE_SCRIPT_SETFORCEDTARGET_CASES
        .iter()
        .filter(|case| case.category == "attacker-side-followme-matrix")
        .collect::<Vec<_>>();
    assert_eq!(matrix.len(), 48);

    let matrix_domain = matrix
        .iter()
        .map(|case| {
            let attacker = case
                .initial
                .attacker
                .unwrap_or_else(|| panic!("matrix case {} is missing attacker", case.label));
            let side = case.initial.battler_sides[attacker.index()];
            (
                attacker.as_u8(),
                side.as_u8(),
                case.initial.side_timers[side.index()].followme_timer,
                case.initial.side_timers[side.index()]
                    .followme_target
                    .as_u8(),
            )
        })
        .collect::<BTreeSet<_>>();
    let expected_matrix = BATTLE_SCRIPT_SETFORCEDTARGET_ATTACKER_DOMAIN
        .into_iter()
        .flat_map(|attacker| {
            let side = BATTLE_SCRIPT_SETFORCEDTARGET_CANONICAL_BATTLER_SIDES[usize::from(attacker)];
            BATTLE_SCRIPT_SETFORCEDTARGET_FOLLOWME_TIMER_EDGE_DOMAIN
                .into_iter()
                .flat_map(move |timer| {
                    BATTLE_SCRIPT_SETFORCEDTARGET_FOLLOWME_TARGET_DOMAIN
                        .into_iter()
                        .map(move |target| (attacker, side, timer, target))
                })
        })
        .collect::<BTreeSet<_>>();
    assert_eq!(matrix_domain, expected_matrix);
    assert_eq!(
        matrix
            .iter()
            .map(|case| {
                let attacker = case.initial.attacker.expect("matrix attacker");
                case.initial.battler_sides[attacker.index()].as_u8()
            })
            .collect::<BTreeSet<_>>(),
        BTreeSet::from([0, 1]),
        "the canonical matrix must route both side records",
    );
}

#[test]
fn preservation_u8_extremes_and_missing_role_order_are_pinned() {
    let boundary_cases = BATTLE_SCRIPT_SETFORCEDTARGET_CASES
        .iter()
        .filter(|case| case.category == "all-sibling-fields-u8-boundary-preservation")
        .collect::<Vec<_>>();
    assert_eq!(boundary_cases.len(), 2);
    for case in boundary_cases {
        let attacker = case.initial.attacker.expect("boundary attacker");
        let side = case.initial.battler_sides[attacker.index()];
        let expected = case.expected.expect("boundary expected state");
        assert_eq!(
            expected.side_timers[side.opposite().index()],
            case.initial.side_timers[side.opposite().index()],
            "{}: opposite side stays byte-for-byte equivalent",
            case.label,
        );
        assert_sibling_timer_fields_preserved(
            0,
            case,
            0,
            case.initial.side_timers[side.index()],
            expected.side_timers[side.index()],
        );
    }

    let expected_u8_edges = BATTLE_SCRIPT_SETFORCEDTARGET_U8_EDGE_DOMAIN
        .into_iter()
        .collect::<BTreeSet<_>>();
    for timer_values in [
        BATTLE_SCRIPT_SETFORCEDTARGET_CASES
            .iter()
            .flat_map(|case| case.initial.side_timers.map(|timer| timer.reflect_timer))
            .collect::<BTreeSet<_>>(),
        BATTLE_SCRIPT_SETFORCEDTARGET_CASES
            .iter()
            .flat_map(|case| {
                case.initial
                    .side_timers
                    .map(|timer| timer.lightscreen_timer)
            })
            .collect::<BTreeSet<_>>(),
        BATTLE_SCRIPT_SETFORCEDTARGET_CASES
            .iter()
            .flat_map(|case| case.initial.side_timers.map(|timer| timer.safeguard_timer))
            .collect::<BTreeSet<_>>(),
        BATTLE_SCRIPT_SETFORCEDTARGET_CASES
            .iter()
            .flat_map(|case| case.initial.side_timers.map(|timer| timer.spikes_amount))
            .collect::<BTreeSet<_>>(),
    ] {
        assert_eq!(timer_values, expected_u8_edges);
    }

    let missing = BATTLE_SCRIPT_SETFORCEDTARGET_CASES
        .iter()
        .find(|case| case.label == "missing_attacker_role_precedes_battler_side_access")
        .expect("missing-attacker vector");
    assert_eq!(missing.initial.attacker, None);
    assert_eq!(missing.expected, None);
    assert!(missing.controls.is_empty());
    assert_eq!(
        missing.expected_error,
        Some("Battle Script hit-chain command requires a attacker role"),
    );
}

#[test]
fn same_side_partner_overwrite_and_repeated_applications_are_pinned() {
    let partner_overwrites = BATTLE_SCRIPT_SETFORCEDTARGET_CASES
        .iter()
        .filter(|case| case.category == "same-side-partner-overwrite")
        .map(|case| {
            let attacker = case.initial.attacker.expect("partner overwrite attacker");
            let side = case.initial.battler_sides[attacker.index()];
            let expected = case.expected.expect("partner overwrite expected state");
            (
                attacker.as_u8(),
                side.as_u8(),
                case.initial.side_timers[side.index()]
                    .followme_target
                    .as_u8(),
                expected.side_timers[side.index()].followme_target.as_u8(),
            )
        })
        .collect::<BTreeSet<_>>();
    assert_eq!(
        partner_overwrites,
        BTreeSet::from([(0, 0, 2, 0), (1, 1, 3, 1), (2, 0, 0, 2), (3, 1, 1, 3)]),
    );

    let repeated = BATTLE_SCRIPT_SETFORCEDTARGET_CASES
        .iter()
        .filter(|case| case.category == "repeated-application")
        .collect::<Vec<_>>();
    assert_eq!(repeated.len(), 2);
    for case in repeated {
        let attacker = case.initial.attacker.expect("repeated attacker");
        let side = case.initial.battler_sides[attacker.index()];
        let expected = case.expected.expect("repeated expected state");
        assert_eq!(case.applications, 2);
        assert_eq!(
            case.controls,
            &[
                BattleScriptSetforcedtargetControl::Advance,
                BattleScriptSetforcedtargetControl::Advance,
            ],
        );
        assert_eq!(
            expected.side_timers[side.index()].followme_timer,
            BATTLE_SCRIPT_SETFORCEDTARGET_FOLLOWME_TIMER_SET,
        );
        assert_eq!(expected.side_timers[side.index()].followme_target, attacker,);
    }
}

#[test]
fn fixed_domains_censuses_and_corpus_hash_are_ratchet_pinned() {
    assert_eq!(BATTLE_SCRIPT_SETFORCEDTARGET_BATTLER_COUNT, 4);
    assert_eq!(BATTLE_SCRIPT_SETFORCEDTARGET_SIDE_COUNT, 2);
    assert_eq!(
        BATTLE_SCRIPT_SETFORCEDTARGET_BATTLERS.map(|battler| battler.as_u8()),
        BATTLE_SCRIPT_SETFORCEDTARGET_ATTACKER_DOMAIN,
    );
    assert_eq!(
        BATTLE_SCRIPT_SETFORCEDTARGET_SIDES.map(|side| side.as_u8()),
        BATTLE_SCRIPT_SETFORCEDTARGET_SIDE_DOMAIN,
    );
    assert_eq!(
        BATTLE_SCRIPT_SETFORCEDTARGET_CANONICAL_BATTLER_SIDES,
        [0, 1, 0, 1],
    );
    assert_eq!(
        BATTLE_SCRIPT_SETFORCEDTARGET_FOLLOWME_TIMER_EDGE_DOMAIN,
        [0x00, 0x01, 0xff],
    );
    assert_eq!(
        BATTLE_SCRIPT_SETFORCEDTARGET_FOLLOWME_TARGET_DOMAIN,
        [0, 1, 2, 3],
    );
    assert_eq!(
        BATTLE_SCRIPT_SETFORCEDTARGET_U8_EDGE_DOMAIN,
        [0x00, 0x01, 0x7f, 0xfe, 0xff],
    );
    assert_eq!(BATTLE_SCRIPT_SETFORCEDTARGET_FOLLOWME_TIMER_SET, 1);
    assert_eq!(
        BATTLE_SCRIPT_SETFORCEDTARGET_DOMAIN_CENSUS,
        [
            ("battler-slots", 4),
            ("side-timer-records", 2),
            ("side-values", 2),
            ("canonical-battler-side-map-cells", 4),
            ("attacker-role-values", 4),
            ("optional-attacker-role-values", 5),
            ("side-timer-u8-values", 256),
            ("side-timer-sibling-u8-edge-values", 5),
            ("side-timer-battler-id-values", 4),
            ("followme-timer-edge-values", 3),
            ("followme-target-values", 4),
            ("followme-timer-write-value", 1),
            ("application-count-values", 2),
            ("typed-missing-attacker-combinations", 1),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_SETFORCEDTARGET_CATEGORY_CENSUS,
        [
            ("all-sibling-fields-u8-boundary-preservation", 2),
            ("attacker-side-followme-matrix", 48),
            ("missing-attacker-role", 1),
            ("repeated-application", 2),
            ("same-side-partner-overwrite", 4),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_SETFORCEDTARGET_BRANCH_CENSUS,
        [
            ("advance", 54),
            ("advance-then-advance", 2),
            ("missing-attacker-role", 1),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_SETFORCEDTARGET_VECTOR_CORPUS_SHA256,
        "b64cdf4492cb810c7d89098e301efd9b21fad5f4798a36bc237c62a336cf3f91",
    );
}
