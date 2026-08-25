//! Canonical-TypeScript differential ratchet for
//! `src/engine/battleScriptRefreshOpcode.ts`.
//!
//! Regenerate from any cwd with `node --experimental-strip-types
//! core-rs/tools/gen-battle-script-refresh-vectors.mjs`.

use std::collections::BTreeSet;

use factory_core::battle_script_refresh::*;
use factory_core::battle_script_refresh_vectors_gen::*;

fn instruction(
    value: BattleScriptRefreshVectorInstruction,
) -> BattleScriptRefreshInstruction<'static> {
    BattleScriptRefreshInstruction {
        opcode_name: value.opcode_name,
        program_counter: value.program_counter,
        opcode_id: value.opcode_id,
        dispatcher: value.dispatcher,
        operands: value.operands,
        resolved_failure_target: value.resolved_failure_target,
    }
}

#[test]
fn complete_projected_state_scheduler_events_controls_errors_and_repetitions_match_ts() {
    assert_eq!(BATTLE_SCRIPT_REFRESH_CASES.len(), 106);
    for (case_index, case) in BATTLE_SCRIPT_REFRESH_CASES.iter().enumerate() {
        let input_rules = case.initial_rules;
        let input_machine = case.initial_machine;
        let mut current_rules = input_rules;
        let mut current_machine = input_machine;
        let mut controls = [None; 3];
        let mut events = [None; 3];
        let mut actual_error = None;

        for application in 0..case.applications {
            let prior_rules = current_rules;
            let prior_machine = current_machine;
            match apply_battle_script_refresh(
                instruction(case.instruction),
                &current_rules,
                &current_machine,
            ) {
                Ok(outcome) => {
                    assert_eq!(
                        current_rules, prior_rules,
                        "case {case_index} {} application {application}: input rules mutated",
                        case.label
                    );
                    assert_eq!(current_machine, prior_machine, "case {case_index} {} application {application}: input machine siblings mutated", case.label);
                    controls[usize::from(application)] = Some(outcome.control);
                    events[usize::from(application)] = outcome.emitted_event;
                    assert_transition_shape(
                        case_index,
                        case,
                        application,
                        prior_rules,
                        prior_machine,
                        outcome,
                    );
                    current_rules = outcome.rules;
                    current_machine = outcome.machine_siblings;
                }
                Err(error) => {
                    actual_error = Some(error.to_string());
                    assert_eq!(
                        current_rules, prior_rules,
                        "case {case_index} {} error mutated rules",
                        case.label
                    );
                    assert_eq!(
                        current_machine, prior_machine,
                        "case {case_index} {} error mutated machine siblings",
                        case.label
                    );
                    break;
                }
            }
        }

        assert_eq!(
            input_rules, case.initial_rules,
            "case {case_index} {} initial rules changed",
            case.label
        );
        assert_eq!(
            input_machine, case.initial_machine,
            "case {case_index} {} initial machine changed",
            case.label
        );
        assert_eq!(
            controls, case.controls,
            "case {case_index} {} controls",
            case.label
        );
        assert_eq!(
            events, case.events,
            "case {case_index} {} events",
            case.label
        );
        assert_eq!(
            actual_error.as_deref(),
            case.expected_error,
            "case {case_index} {} exact error",
            case.label
        );
        assert_eq!(
            case.expected_rules,
            actual_error.is_none().then_some(current_rules),
            "case {case_index} {} complete rules",
            case.label
        );
        assert_eq!(
            case.expected_scheduler,
            actual_error.is_none().then_some(current_machine.scheduler),
            "case {case_index} {} scheduler",
            case.label
        );
        assert_eq!(
            current_machine.rng_value, input_machine.rng_value,
            "case {case_index} {} RNG value",
            case.label
        );
        assert_eq!(
            current_machine.rng_calls, input_machine.rng_calls,
            "case {case_index} {} RNG calls",
            case.label
        );
        assert_eq!(
            current_machine.event_history, input_machine.event_history,
            "case {case_index} {} existing events",
            case.label
        );
    }
}

fn assert_transition_shape(
    case_index: usize,
    case: &BattleScriptRefreshVectorCase,
    application: u8,
    prior_rules: BattleScriptRefreshRules,
    prior_machine: BattleScriptRefreshMachineSiblings,
    outcome: BattleScriptRefreshOutcome,
) {
    let attacker = prior_rules
        .selector_roles
        .attacker
        .expect("successful case attacker");
    let prior_status = prior_rules.battlers[attacker.index()].status1;
    if prior_status & BATTLE_SCRIPT_REFRESH_CURE_MASK == 0 {
        assert_eq!(outcome.control, BattleScriptRefreshControl::FailJump);
        assert_eq!(
            outcome.rules, prior_rules,
            "case {case_index} {} application {application}: failure changed rules",
            case.label
        );
        assert_eq!(
            outcome.machine_siblings, prior_machine,
            "case {case_index} {} application {application}: failure changed scheduler/RNG/events",
            case.label
        );
        assert_eq!(outcome.emitted_event, None);
        return;
    }

    assert_eq!(outcome.control, BattleScriptRefreshControl::Advance);
    assert_eq!(outcome.rules.battlers[attacker.index()].status1, 0);
    let attacker_state = prior_rules.battlers[attacker.index()];
    assert_eq!(
        outcome.rules.party[attacker_state.side.index()][usize::from(attacker_state.party_index)]
            .status1,
        0,
    );
    for battler in BATTLE_SCRIPT_REFRESH_BATTLERS {
        if battler != attacker {
            assert_eq!(
                outcome.rules.battlers[battler.index()],
                prior_rules.battlers[battler.index()],
                "unrelated battler {battler:?}"
            );
        }
    }
    for side in 0..2 {
        for party_index in 0..BATTLE_SCRIPT_REFRESH_PARTY_SIZE {
            if side != attacker_state.side.index()
                || party_index != usize::from(attacker_state.party_index)
            {
                assert_eq!(
                    outcome.rules.party[side][party_index], prior_rules.party[side][party_index],
                    "unrelated party member {side}/{party_index}"
                );
            }
        }
    }
    assert_eq!(outcome.rules.selector_roles, prior_rules.selector_roles);
    assert_eq!(outcome.rules.context_state, prior_rules.context_state);
    assert_eq!(
        outcome.machine_siblings.scheduler.message_display_active,
        prior_machine.scheduler.message_display_active
    );
    assert_eq!(
        outcome.machine_siblings.scheduler.pause_counter_battle,
        prior_machine.scheduler.pause_counter_battle
    );
    assert_eq!(
        outcome.machine_siblings.scheduler.active_battler,
        prior_machine.scheduler.active_battler
    );
    assert_eq!(outcome.machine_siblings.rng_value, prior_machine.rng_value);
    assert_eq!(outcome.machine_siblings.rng_calls, prior_machine.rng_calls);
    assert_eq!(
        outcome.machine_siblings.event_history,
        prior_machine.event_history
    );
    assert_eq!(
        outcome.emitted_event,
        Some(BattleScriptRefreshEvent::SetBattlerStatusData { battler: attacker, status1: 0 })
    );
}

#[test]
fn all_attacker_side_party_index_mappings_are_covered_on_success() {
    let actual = BATTLE_SCRIPT_REFRESH_CASES
        .iter()
        .filter(|case| case.category == "attacker-side-party-index-mapping")
        .map(|case| {
            let attacker = case.initial_rules.selector_roles.attacker.unwrap();
            let state = case.initial_rules.battlers[attacker.index()];
            (attacker, state.side, state.party_index)
        })
        .collect::<BTreeSet<_>>();
    let expected = BATTLE_SCRIPT_REFRESH_BATTLERS
        .into_iter()
        .flat_map(|attacker| {
            [
                BattleScriptRefreshSide::Player,
                BattleScriptRefreshSide::Opponent,
            ]
            .into_iter()
            .flat_map(move |side| (0..6).map(move |party_index| (attacker, side, party_index)))
        })
        .collect::<BTreeSet<_>>();
    assert_eq!(actual, expected);
    assert_eq!(actual.len(), 48);
}

#[test]
fn full_status_bit_domain_and_named_mask_boundaries_are_covered() {
    assert_eq!(BATTLE_SCRIPT_REFRESH_STATUS_DOMAIN.len(), 42);
    for bit in 0..32 {
        assert!(
            BATTLE_SCRIPT_REFRESH_STATUS_DOMAIN.contains(&(1_u32 << bit)),
            "missing singleton bit {bit}"
        );
    }
    for value in [
        0,
        BATTLE_SCRIPT_STATUS1_SLEEP,
        BATTLE_SCRIPT_STATUS1_FREEZE,
        BATTLE_SCRIPT_STATUS1_POISON,
        BATTLE_SCRIPT_STATUS1_BURN,
        BATTLE_SCRIPT_STATUS1_PARALYSIS,
        BATTLE_SCRIPT_STATUS1_TOXIC_POISON,
        BATTLE_SCRIPT_REFRESH_CURE_MASK,
        u32::MAX,
    ] {
        assert!(
            BATTLE_SCRIPT_REFRESH_STATUS_DOMAIN.contains(&value),
            "missing status boundary {value:#010x}"
        );
    }
    assert_eq!(
        BATTLE_SCRIPT_REFRESH_STATUS_BRANCH_COUNTS,
        [("success", 9), ("failure", 33)]
    );
}

#[test]
fn singleton_registration_cardinality_order_and_shape_match_ts() {
    assert_eq!(BATTLE_SCRIPT_REFRESH_REGISTRATION_CASES.len(), 12);
    for case in BATTLE_SCRIPT_REFRESH_REGISTRATION_CASES {
        let instructions = case
            .instructions
            .iter()
            .copied()
            .map(instruction)
            .collect::<Vec<_>>();
        let actual = register_battle_script_refresh_handler(&instructions);
        match (actual, case.opcode_id, case.expected_error) {
            (Ok(registration), Some(opcode_id), None) => {
                assert_eq!(registration.opcode_id, opcode_id, "{}", case.label)
            }
            (Err(error), None, Some(expected)) => {
                assert_eq!(error.to_string(), expected, "{}", case.label)
            }
            (actual, opcode_id, error) => panic!(
                "{} registration mismatch: {actual:?} {opcode_id:?} {error:?}",
                case.label
            ),
        }
    }
}

#[test]
fn malformed_instruction_precedes_missing_attacker_and_labels_resolve_only_on_failure() {
    for case in BATTLE_SCRIPT_REFRESH_CASES
        .iter()
        .filter(|case| case.category == "malformed-before-attacker")
    {
        assert!(case.initial_rules.selector_roles.attacker.is_none());
        assert!(case
            .expected_error
            .unwrap()
            .starts_with("invalid B_SCR_OP_CUREIFBURNEDPARALYZEDORPOISONED shape"));
    }
    let success = BATTLE_SCRIPT_REFRESH_CASES
        .iter()
        .find(|case| case.label == "unresolved-success")
        .unwrap();
    assert_eq!(success.expected_error, None);
    assert_eq!(
        success.controls[0],
        Some(BattleScriptRefreshControl::Advance)
    );
    let failure = BATTLE_SCRIPT_REFRESH_CASES
        .iter()
        .find(|case| case.label == "unresolved-failure")
        .unwrap();
    assert_eq!(failure.controls, [None; 3]);
    assert_eq!(
        failure.expected_error,
        Some(
            "Cmd_cureifburnedparalyzedorpoisoned: unresolved failure target MissingRefreshFailure"
        )
    );
}
