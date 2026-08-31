//! Canonical-TypeScript differential, registration, topology, and immutable
//! state ratchets for `battleScriptTrysethelpinghandOpcode.ts`.
//!
//! Regenerate with `node --experimental-strip-types
//! core-rs/tools/gen-battle-script-trysethelpinghand-vectors.mjs`.

use std::collections::BTreeSet;

use factory_core::battle_script_trysethelpinghand::{
    apply_battle_script_trysethelpinghand, register_battle_script_trysethelpinghand_handler,
    resolve_battle_script_trysethelpinghand_partner, BattleScriptTrysethelpinghandBattler,
    BattleScriptTrysethelpinghandBattlerState, BattleScriptTrysethelpinghandBattlersCount,
    BattleScriptTrysethelpinghandContextSiblings, BattleScriptTrysethelpinghandControl,
    BattleScriptTrysethelpinghandMachineSiblings, BattleScriptTrysethelpinghandRoles,
    BattleScriptTrysethelpinghandRules, BattleScriptTrysethelpinghandScheduler,
    BattleScriptTrysethelpinghandTopology, BATTLE_SCRIPT_TRYSETHELPINGHAND_BATTLERS,
    BATTLE_SCRIPT_TRYSETHELPINGHAND_BATTLE_TYPE_DOUBLE, BATTLE_SCRIPT_TRYSETHELPINGHAND_SET_VALUE,
};
use factory_core::battle_script_trysethelpinghand_vectors_gen::{
    BattleScriptTrysethelpinghandRegistrationVectorCase,
    BattleScriptTrysethelpinghandVectorBattlerState, BattleScriptTrysethelpinghandVectorCase,
    BattleScriptTrysethelpinghandVectorContext, BattleScriptTrysethelpinghandVectorMachine,
    BattleScriptTrysethelpinghandVectorState, BattleScriptTrysethelpinghandVectorTopology,
    BATTLE_SCRIPT_TRYSETHELPINGHAND_BRANCH_CENSUS, BATTLE_SCRIPT_TRYSETHELPINGHAND_CASES,
    BATTLE_SCRIPT_TRYSETHELPINGHAND_CATEGORY_CENSUS, BATTLE_SCRIPT_TRYSETHELPINGHAND_DOMAIN_CENSUS,
    BATTLE_SCRIPT_TRYSETHELPINGHAND_REGISTRATION_BRANCH_CENSUS,
    BATTLE_SCRIPT_TRYSETHELPINGHAND_REGISTRATION_CASES,
    BATTLE_SCRIPT_TRYSETHELPINGHAND_VECTOR_CORPUS_SHA256,
};

fn topology(
    value: BattleScriptTrysethelpinghandVectorTopology,
) -> BattleScriptTrysethelpinghandTopology {
    let count = match value.battlers_count {
        2 => BattleScriptTrysethelpinghandBattlersCount::Singles,
        4 => BattleScriptTrysethelpinghandBattlersCount::Doubles,
        other => panic!("generated topology count {other} is not canonical"),
    };
    BattleScriptTrysethelpinghandTopology::new(
        count,
        value.battle_type_flags,
        value.battler_positions,
    )
    .expect("generated topology must be canonically valid")
}

fn battler(
    value: BattleScriptTrysethelpinghandVectorBattlerState,
) -> BattleScriptTrysethelpinghandBattlerState {
    BattleScriptTrysethelpinghandBattlerState {
        helping_hand: value.helping_hand,
        status3: value.status3,
        marker: value.marker,
    }
}

fn context(
    value: BattleScriptTrysethelpinghandVectorContext,
) -> BattleScriptTrysethelpinghandContextSiblings {
    BattleScriptTrysethelpinghandContextSiblings {
        scripting_battler: value.scripting_battler,
        current_move: value.current_move,
        hit_marker: value.hit_marker,
        battle_communication0: value.battle_communication0,
    }
}

fn rules(value: BattleScriptTrysethelpinghandVectorState) -> BattleScriptTrysethelpinghandRules {
    BattleScriptTrysethelpinghandRules {
        battlers: value.battlers.map(battler),
        battle_topology: topology(value.topology),
        absent_battler_flags: value.absent_battler_flags,
        selector_roles: BattleScriptTrysethelpinghandRoles {
            attacker: value.attacker,
            target: value.target,
            effect_battler: value.effect_battler,
            fainted: value.fainted,
        },
        context_siblings: context(value.context),
    }
}

fn vector_state(
    value: BattleScriptTrysethelpinghandRules,
) -> BattleScriptTrysethelpinghandVectorState {
    BattleScriptTrysethelpinghandVectorState {
        battlers: value
            .battlers
            .map(|battler| BattleScriptTrysethelpinghandVectorBattlerState {
                helping_hand: battler.helping_hand,
                status3: battler.status3,
                marker: battler.marker,
            }),
        topology: BattleScriptTrysethelpinghandVectorTopology {
            battlers_count: value.battle_topology.battlers_count.as_u8(),
            battle_type_flags: value.battle_topology.battle_type_flags,
            battler_positions: value.battle_topology.battler_positions,
        },
        absent_battler_flags: value.absent_battler_flags,
        attacker: value.selector_roles.attacker,
        target: value.selector_roles.target,
        effect_battler: value.selector_roles.effect_battler,
        fainted: value.selector_roles.fainted,
        context: BattleScriptTrysethelpinghandVectorContext {
            scripting_battler: value.context_siblings.scripting_battler,
            current_move: value.context_siblings.current_move,
            hit_marker: value.context_siblings.hit_marker,
            battle_communication0: value.context_siblings.battle_communication0,
        },
    }
}

fn machine(
    value: BattleScriptTrysethelpinghandVectorMachine,
) -> BattleScriptTrysethelpinghandMachineSiblings {
    BattleScriptTrysethelpinghandMachineSiblings {
        scheduler: BattleScriptTrysethelpinghandScheduler {
            message_display_active: value.scheduler.message_display_active,
            pause_counter_battle: value.scheduler.pause_counter_battle,
            active_battler: value.scheduler.active_battler,
            pending_controller_battlers: value.scheduler.pending_controller_battlers,
            pending_count: value.scheduler.pending_count,
        },
        rng_value: value.rng_value,
        rng_calls: value.rng_calls,
    }
}

#[test]
fn complete_projected_outputs_controls_errors_and_immutability_match_canonical_typescript() {
    assert_eq!(BATTLE_SCRIPT_TRYSETHELPINGHAND_CASES.len(), 2_632);
    for (case_index, case) in BATTLE_SCRIPT_TRYSETHELPINGHAND_CASES.iter().enumerate() {
        execute_case(case_index, case);
    }
}

fn execute_case(case_index: usize, case: &BattleScriptTrysethelpinghandVectorCase) {
    let input = rules(case.initial);
    let before = input;
    let machine_input = machine(case.machine);
    let machine_before = machine_input;
    let mut current = input;
    let mut controls = Vec::new();
    let mut actual_error = None;

    for application in 0..case.applications {
        let prior = current;
        match apply_battle_script_trysethelpinghand(case.instruction, &current, &machine_input) {
            Ok(outcome) => {
                assert_transition_shape(
                    case_index,
                    case,
                    application,
                    prior,
                    machine_input,
                    outcome,
                );
                controls.push(outcome.control);
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
        "case {case_index} {} mutated rules input",
        case.label
    );
    assert_eq!(
        machine_input, machine_before,
        "case {case_index} {} mutated machine input",
        case.label
    );
    match (actual_error, case.expected, case.expected_error) {
        (None, Some(expected), None) => {
            assert_eq!(
                controls.as_slice(),
                case.controls,
                "case {case_index} {} control sequence",
                case.label
            );
            assert_eq!(
                vector_state(current),
                expected,
                "case {case_index} {} complete projected state",
                case.label
            );
        }
        (Some(actual), None, Some(expected)) => {
            assert_eq!(
                controls.as_slice(),
                case.controls,
                "case {case_index} {} error must have no control",
                case.label
            );
            assert_eq!(actual, expected, "case {case_index} {} exact error", case.label);
        }
        (actual, expected, expected_error) => panic!(
            "case {case_index} {} generated outcome disagrees: actual_error={actual:?}, expected={expected:?}, expected_error={expected_error:?}",
            case.label
        ),
    }
}

fn assert_transition_shape(
    case_index: usize,
    case: &BattleScriptTrysethelpinghandVectorCase,
    application: u8,
    prior: BattleScriptTrysethelpinghandRules,
    machine_input: BattleScriptTrysethelpinghandMachineSiblings,
    outcome: factory_core::battle_script_trysethelpinghand::BattleScriptTrysethelpinghandOutcome,
) {
    let attacker = prior.selector_roles.attacker.unwrap_or_else(|| {
        panic!(
            "case {case_index} {} application {application} succeeded without attacker",
            case.label
        )
    });
    let partner = resolve_battle_script_trysethelpinghand_partner(prior.battle_topology, attacker);
    assert_eq!(
        outcome.rules.selector_roles.target,
        Some(partner),
        "case {case_index} {} application {application} must retarget before every guard",
        case.label
    );
    assert_eq!(
        outcome.rules.selector_roles.attacker, prior.selector_roles.attacker,
        "case {case_index} {} application {application} changed attacker sibling",
        case.label
    );
    assert_eq!(
        outcome.rules.selector_roles.effect_battler, prior.selector_roles.effect_battler,
        "case {case_index} {} application {application} changed effect sibling",
        case.label
    );
    assert_eq!(
        outcome.rules.selector_roles.fainted, prior.selector_roles.fainted,
        "case {case_index} {} application {application} changed fainted sibling",
        case.label
    );
    assert_eq!(outcome.rules.battle_topology, prior.battle_topology);
    assert_eq!(
        outcome.rules.absent_battler_flags,
        prior.absent_battler_flags
    );
    assert_eq!(outcome.rules.context_siblings, prior.context_siblings);
    assert_eq!(
        outcome.machine_siblings, machine_input,
        "case {case_index} {} application {application} changed scheduler or RNG",
        case.label
    );

    match outcome.control {
        BattleScriptTrysethelpinghandControl::Advance => {
            assert_eq!(
                outcome.rules.battlers[partner.index()].helping_hand,
                BATTLE_SCRIPT_TRYSETHELPINGHAND_SET_VALUE,
                "case {case_index} {} application {application} did not set partner",
                case.label
            );
            for battler in BATTLE_SCRIPT_TRYSETHELPINGHAND_BATTLERS {
                if battler != partner {
                    assert_eq!(
                        outcome.rules.battlers[battler.index()],
                        prior.battlers[battler.index()],
                        "case {case_index} {} application {application} changed non-partner {battler:?}",
                        case.label
                    );
                }
            }
        }
        BattleScriptTrysethelpinghandControl::Jump { .. } => assert_eq!(
            outcome.rules.battlers, prior.battlers,
            "case {case_index} {} application {application} failure changed Helping Hand state",
            case.label
        ),
    }
}

#[test]
fn singleton_registration_matches_canonical_typescript_and_keeps_exact_errors() {
    assert_eq!(BATTLE_SCRIPT_TRYSETHELPINGHAND_REGISTRATION_CASES.len(), 10);
    for case in BATTLE_SCRIPT_TRYSETHELPINGHAND_REGISTRATION_CASES {
        execute_registration_case(&case);
    }
}

fn execute_registration_case(case: &BattleScriptTrysethelpinghandRegistrationVectorCase) {
    match (
        register_battle_script_trysethelpinghand_handler(case.instructions),
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
fn dense_topology_flags_absence_and_corrupt_byte_matrix_covers_all_required_domains() {
    let doubles = BATTLE_SCRIPT_TRYSETHELPINGHAND_CASES
        .iter()
        .filter(|case| case.category == "double-dense-flags-absence-helpinghand-matrix")
        .collect::<Vec<_>>();
    assert_eq!(doubles.len(), 1_728);
    let singles = BATTLE_SCRIPT_TRYSETHELPINGHAND_CASES
        .iter()
        .filter(|case| case.category == "singles-dense-flags-absence-helpinghand-matrix")
        .collect::<Vec<_>>();
    assert_eq!(singles.len(), 768);

    let double_domains = doubles
        .iter()
        .map(|case| {
            let attacker = case.initial.attacker.expect("dense attacker");
            let partner = resolve_battle_script_trysethelpinghand_partner(
                topology(case.initial.topology),
                attacker,
            );
            (
                case.initial.topology.battle_type_flags,
                attacker.as_u8(),
                partner.as_u8(),
                case.initial.absent_battler_flags,
                case.initial.battlers[attacker.index()].helping_hand,
                case.initial.battlers[partner.index()].helping_hand,
            )
        })
        .collect::<BTreeSet<_>>();
    assert!(double_domains.iter().all(|(flags, _, _, _, _, _)| {
        flags & BATTLE_SCRIPT_TRYSETHELPINGHAND_BATTLE_TYPE_DOUBLE != 0
    }));
    assert_eq!(
        double_domains
            .iter()
            .map(|(_, attacker, _, _, _, _)| *attacker)
            .collect::<BTreeSet<_>>(),
        BTreeSet::from([0, 1, 2, 3]),
    );
    assert_eq!(
        double_domains
            .iter()
            .map(|(_, _, partner, _, _, _)| *partner)
            .collect::<BTreeSet<_>>(),
        BTreeSet::from([0, 1, 2, 3]),
    );
    assert_eq!(
        double_domains
            .iter()
            .map(|(_, _, _, _, attacker, _)| *attacker)
            .collect::<BTreeSet<_>>(),
        BTreeSet::from([0, 1, 2, 0x7f, 0x80, 0xff]),
    );
    assert_eq!(
        double_domains
            .iter()
            .map(|(_, _, _, _, _, partner)| *partner)
            .collect::<BTreeSet<_>>(),
        BTreeSet::from([0, 1, 2, 0x7f, 0x80, 0xff]),
    );
    assert!(double_domains.iter().any(|(flags, _, _, _, _, _)| {
        flags & !BATTLE_SCRIPT_TRYSETHELPINGHAND_BATTLE_TYPE_DOUBLE != 0
    }));
    assert!(
        double_domains
            .iter()
            .any(|(_, _, partner, absent, _, _)| { absent & (1 << partner) == 0 && *absent != 0 }),
        "matrix must include unrelated absent-battler bits"
    );
    assert!(
        double_domains
            .iter()
            .any(|(_, _, partner, absent, _, _)| { absent & (1 << partner) != 0 }),
        "matrix must include computed-partner absence"
    );

    assert!(singles.iter().all(|case| {
        case.initial.topology.battle_type_flags & BATTLE_SCRIPT_TRYSETHELPINGHAND_BATTLE_TYPE_DOUBLE
            == 0
            && case.controls
                == [BattleScriptTrysethelpinghandControl::Jump { program_counter: 1434 }]
    }));
}

#[test]
fn optional_selector_siblings_are_preserved_while_prior_target_is_replaced() {
    let selector_cases = BATTLE_SCRIPT_TRYSETHELPINGHAND_CASES
        .iter()
        .filter(|case| case.category == "optional-selector-siblings")
        .collect::<Vec<_>>();
    assert_eq!(selector_cases.len(), 125);
    let combinations = selector_cases
        .iter()
        .map(|case| {
            (
                case.initial
                    .target
                    .map(BattleScriptTrysethelpinghandBattler::as_u8),
                case.initial
                    .effect_battler
                    .map(BattleScriptTrysethelpinghandBattler::as_u8),
                case.initial
                    .fainted
                    .map(BattleScriptTrysethelpinghandBattler::as_u8),
            )
        })
        .collect::<BTreeSet<_>>();
    assert_eq!(combinations.len(), 125);
    for case in selector_cases {
        let expected = case.expected.expect("selector cases succeed");
        let attacker = case.initial.attacker.expect("selector attacker");
        let partner = resolve_battle_script_trysethelpinghand_partner(
            topology(case.initial.topology),
            attacker,
        );
        assert_eq!(expected.target, Some(partner));
        assert_eq!(expected.effect_battler, case.initial.effect_battler);
        assert_eq!(expected.fainted, case.initial.fainted);
    }
}

#[test]
fn corpus_censuses_and_hash_are_pinned() {
    assert_eq!(
        BATTLE_SCRIPT_TRYSETHELPINGHAND_DOMAIN_CENSUS,
        [
            ("source-battler-slots", 4),
            ("topology-variants", 6),
            ("singles-topology-variants", 3),
            ("doubles-topology-variants", 3),
            ("attacker-values", 4),
            ("optional-selector-values", 5),
            ("helping-hand-u8-edge-values", 6),
            ("absent-flag-combinations", 4),
            ("battle-type-unrelated-flag-variants", 4),
            ("application-count-values", 2),
            ("registration-cases", 10),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYSETHELPINGHAND_CATEGORY_CENSUS,
        [
            ("double-dense-flags-absence-helpinghand-matrix", 1_728),
            ("late-label-resolution", 2),
            ("malformed-shape-before-attacker", 5),
            ("missing-attacker-role", 1),
            ("optional-selector-siblings", 125),
            ("repeated-application", 3),
            ("singles-dense-flags-absence-helpinghand-matrix", 768),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYSETHELPINGHAND_BRANCH_CENSUS,
        [
            ("advance", 726),
            ("advance-then-jump", 1),
            ("invalid-instruction-shape", 5),
            ("jump", 1_896),
            ("jump-then-jump", 2),
            ("missing-attacker-role", 1),
            ("unresolved-failure-target", 1),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYSETHELPINGHAND_REGISTRATION_BRANCH_CENSUS,
        [
            ("invalid-shape", 5),
            ("registered", 2),
            ("wrong-cardinality", 3)
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYSETHELPINGHAND_VECTOR_CORPUS_SHA256,
        "28a79ba053c6e925a8357766f7d73f8adb715d82d1979625d7cd02b4e87fa5e0"
    );
}
