//! Canonical-TS differential, registration, RNG, and immutability ratchets
//! for `src/engine/battleScriptTrysetencoreOpcode.ts`.
//!
//! Regenerate with `node --experimental-strip-types
//! core-rs/tools/gen-battle-script-trysetencore-vectors.mjs`.

use std::collections::BTreeSet;

use factory_core::battle_script_trysetencore::{
    apply_battle_script_trysetencore, register_battle_script_trysetencore_handler,
    BattleScriptTrysetencoreBattlerState, BattleScriptTrysetencoreContextState,
    BattleScriptTrysetencoreControl, BattleScriptTrysetencoreInstruction,
    BattleScriptTrysetencoreMachineSiblings, BattleScriptTrysetencoreMoveHistory,
    BattleScriptTrysetencoreOperand, BattleScriptTrysetencoreResolvedLabel,
    BattleScriptTrysetencoreRoles, BattleScriptTrysetencoreRules,
    BattleScriptTrysetencoreScheduler, BATTLE_SCRIPT_TRYSETENCORE_BATTLERS,
    BATTLE_SCRIPT_TRYSETENCORE_DURATION_MAX, BATTLE_SCRIPT_TRYSETENCORE_DURATION_MIN,
    BATTLE_SCRIPT_TRYSETENCORE_MOVE_ENCORE, BATTLE_SCRIPT_TRYSETENCORE_MOVE_MIRROR_MOVE,
    BATTLE_SCRIPT_TRYSETENCORE_MOVE_STRUGGLE,
};
use factory_core::battle_script_trysetencore_vectors_gen::{
    BattleScriptTrysetencoreVectorBattlerState, BattleScriptTrysetencoreVectorCase,
    BattleScriptTrysetencoreVectorContextState, BattleScriptTrysetencoreVectorInstruction,
    BattleScriptTrysetencoreVectorMachine, BattleScriptTrysetencoreVectorMoveHistory,
    BattleScriptTrysetencoreVectorScheduler, BattleScriptTrysetencoreVectorState,
    BATTLE_SCRIPT_TRYSETENCORE_BRANCH_CENSUS, BATTLE_SCRIPT_TRYSETENCORE_CASES,
    BATTLE_SCRIPT_TRYSETENCORE_CATEGORY_CENSUS, BATTLE_SCRIPT_TRYSETENCORE_DOMAIN_CENSUS,
    BATTLE_SCRIPT_TRYSETENCORE_ENCORED_MOVE_EDGE_DOMAIN,
    BATTLE_SCRIPT_TRYSETENCORE_LAST_MOVE_EDGE_DOMAIN, BATTLE_SCRIPT_TRYSETENCORE_PP_EDGE_DOMAIN,
    BATTLE_SCRIPT_TRYSETENCORE_REGISTRATION_BRANCH_CENSUS,
    BATTLE_SCRIPT_TRYSETENCORE_REGISTRATION_CASES, BATTLE_SCRIPT_TRYSETENCORE_RNG_DURATION_DOMAIN,
};
use factory_core::rng::advance_rng_value;

fn battler(
    value: BattleScriptTrysetencoreVectorBattlerState,
) -> BattleScriptTrysetencoreBattlerState {
    BattleScriptTrysetencoreBattlerState {
        side: value.side,
        ability: value.ability,
        hp: value.hp,
        max_hp: value.max_hp,
        moves: value.moves,
        pp: value.pp,
        status1: value.status1,
        status2: value.status2,
        status3: value.status3,
        item: value.item,
        stat_stages: value.stat_stages,
        party_index: value.party_index,
        encored_move: value.encored_move,
        encored_move_pos: value.encored_move_pos,
        encore_timer: value.encore_timer,
        encore_timer_start_value: value.encore_timer_start_value,
    }
}

fn vector_battler(
    value: BattleScriptTrysetencoreBattlerState,
) -> BattleScriptTrysetencoreVectorBattlerState {
    BattleScriptTrysetencoreVectorBattlerState {
        side: value.side,
        ability: value.ability,
        hp: value.hp,
        max_hp: value.max_hp,
        moves: value.moves,
        pp: value.pp,
        status1: value.status1,
        status2: value.status2,
        status3: value.status3,
        item: value.item,
        stat_stages: value.stat_stages,
        party_index: value.party_index,
        encored_move: value.encored_move,
        encored_move_pos: value.encored_move_pos,
        encore_timer: value.encore_timer,
        encore_timer_start_value: value.encore_timer_start_value,
    }
}

fn move_history(
    value: BattleScriptTrysetencoreVectorMoveHistory,
) -> BattleScriptTrysetencoreMoveHistory {
    BattleScriptTrysetencoreMoveHistory {
        last_printed_moves: value.last_printed_moves,
        last_moves: value.last_moves,
        last_resulting_moves: value.last_resulting_moves,
        last_landed_moves: value.last_landed_moves,
        last_hit_by_type: value.last_hit_by_type,
        last_hit_by: value.last_hit_by,
    }
}

fn vector_move_history(
    value: BattleScriptTrysetencoreMoveHistory,
) -> BattleScriptTrysetencoreVectorMoveHistory {
    BattleScriptTrysetencoreVectorMoveHistory {
        last_printed_moves: value.last_printed_moves,
        last_moves: value.last_moves,
        last_resulting_moves: value.last_resulting_moves,
        last_landed_moves: value.last_landed_moves,
        last_hit_by_type: value.last_hit_by_type,
        last_hit_by: value.last_hit_by,
    }
}

fn context_state(
    value: BattleScriptTrysetencoreVectorContextState,
) -> BattleScriptTrysetencoreContextState {
    BattleScriptTrysetencoreContextState {
        scripting_battler: value.scripting_battler,
        atk_canceler_tracker: value.atk_canceler_tracker,
        battle_outcome: value.battle_outcome,
        current_move: value.current_move,
        current_move_position: value.current_move_position,
        move_result_flags: value.move_result_flags,
        hit_marker: value.hit_marker,
        multi_hit_counter: value.multi_hit_counter,
    }
}

fn vector_context_state(
    value: BattleScriptTrysetencoreContextState,
) -> BattleScriptTrysetencoreVectorContextState {
    BattleScriptTrysetencoreVectorContextState {
        scripting_battler: value.scripting_battler,
        atk_canceler_tracker: value.atk_canceler_tracker,
        battle_outcome: value.battle_outcome,
        current_move: value.current_move,
        current_move_position: value.current_move_position,
        move_result_flags: value.move_result_flags,
        hit_marker: value.hit_marker,
        multi_hit_counter: value.multi_hit_counter,
    }
}

fn rules(value: BattleScriptTrysetencoreVectorState) -> BattleScriptTrysetencoreRules {
    BattleScriptTrysetencoreRules {
        battlers: value.battlers.map(battler),
        selector_roles: BattleScriptTrysetencoreRoles {
            attacker: value.attacker,
            target: value.target,
            effect_battler: value.effect_battler,
            fainted: value.fainted,
        },
        move_history: move_history(value.move_history),
        context_state: context_state(value.context_state),
    }
}

fn vector_state(value: BattleScriptTrysetencoreRules) -> BattleScriptTrysetencoreVectorState {
    BattleScriptTrysetencoreVectorState {
        battlers: value.battlers.map(vector_battler),
        attacker: value.selector_roles.attacker,
        target: value.selector_roles.target,
        effect_battler: value.selector_roles.effect_battler,
        fainted: value.selector_roles.fainted,
        move_history: vector_move_history(value.move_history),
        context_state: vector_context_state(value.context_state),
    }
}

fn scheduler(value: BattleScriptTrysetencoreVectorScheduler) -> BattleScriptTrysetencoreScheduler {
    BattleScriptTrysetencoreScheduler {
        message_display_active: value.message_display_active,
        pause_counter_battle: value.pause_counter_battle,
        active_battler: value.active_battler,
        pending_controller_battlers: value.pending_controller_battlers,
        pending_count: value.pending_count,
    }
}

fn vector_scheduler(
    value: BattleScriptTrysetencoreScheduler,
) -> BattleScriptTrysetencoreVectorScheduler {
    BattleScriptTrysetencoreVectorScheduler {
        message_display_active: value.message_display_active,
        pause_counter_battle: value.pause_counter_battle,
        active_battler: value.active_battler,
        pending_controller_battlers: value.pending_controller_battlers,
        pending_count: value.pending_count,
    }
}

fn machine(
    value: BattleScriptTrysetencoreVectorMachine,
) -> BattleScriptTrysetencoreMachineSiblings {
    BattleScriptTrysetencoreMachineSiblings {
        scheduler: scheduler(value.scheduler),
        rng_value: value.rng_value,
        rng_calls: value.rng_calls,
    }
}

fn vector_machine(
    value: BattleScriptTrysetencoreMachineSiblings,
) -> BattleScriptTrysetencoreVectorMachine {
    BattleScriptTrysetencoreVectorMachine {
        scheduler: vector_scheduler(value.scheduler),
        rng_value: value.rng_value,
        rng_calls: value.rng_calls,
    }
}

fn operands(
    value: BattleScriptTrysetencoreVectorInstruction,
) -> Vec<BattleScriptTrysetencoreOperand<'static>> {
    assert_eq!(
        value.operand_widths.len(),
        value.operand_expressions.len(),
        "generated operand width/expression cardinality"
    );
    value
        .operand_widths
        .iter()
        .zip(value.operand_expressions)
        .map(
            |(&width_bytes, &expression)| BattleScriptTrysetencoreOperand {
                width_bytes,
                expression,
            },
        )
        .collect()
}

fn instruction<'a>(
    value: BattleScriptTrysetencoreVectorInstruction,
    operands: &'a [BattleScriptTrysetencoreOperand<'a>],
) -> BattleScriptTrysetencoreInstruction<'a> {
    let resolved_failure_target = match (
        value.resolved_failure_expression,
        value.resolved_failure_program_counter,
    ) {
        (Some(expression), Some(program_counter)) => {
            Some(BattleScriptTrysetencoreResolvedLabel { expression, program_counter })
        }
        (None, None) => None,
        _ => panic!("generated resolved-label fields must have matching presence"),
    };
    BattleScriptTrysetencoreInstruction {
        opcode_name: value.opcode_name,
        program_counter: value.program_counter,
        opcode_id: value.opcode_id,
        dispatcher: value.dispatcher,
        operands,
        resolved_failure_target,
    }
}

#[test]
fn complete_projected_outputs_controls_rng_errors_repetitions_and_immutability_match_canonical_ts()
{
    assert_eq!(BATTLE_SCRIPT_TRYSETENCORE_CASES.len(), 739);
    for (case_index, case) in BATTLE_SCRIPT_TRYSETENCORE_CASES.iter().enumerate() {
        execute_case(case_index, case);
    }
}

fn execute_case(case_index: usize, case: &BattleScriptTrysetencoreVectorCase) {
    let operand_values = operands(case.instruction);
    let instruction = instruction(case.instruction, &operand_values);
    let input_rules = rules(case.initial);
    let input_machine = machine(case.initial_machine);
    let before_rules = input_rules;
    let before_machine = input_machine;
    let mut current_rules = input_rules;
    let mut current_machine = input_machine;
    let mut controls = Vec::new();
    let mut actual_error = None;

    for application in 0..case.applications {
        let prior_rules = current_rules;
        let prior_machine = current_machine;
        match apply_battle_script_trysetencore(instruction, &current_rules, &current_machine) {
            Ok(outcome) => {
                assert_eq!(
                    current_rules, prior_rules,
                    "case {case_index} {} application {application}: native leaf mutated rules input",
                    case.label,
                );
                assert_eq!(
                    current_machine, prior_machine,
                    "case {case_index} {} application {application}: native leaf mutated machine input",
                    case.label,
                );
                assert_transition_shape(
                    case_index,
                    case,
                    application,
                    prior_rules,
                    prior_machine,
                    outcome,
                );
                controls.push(outcome.control);
                current_rules = outcome.rules;
                current_machine = outcome.machine_siblings;
            }
            Err(error) => {
                assert_eq!(
                    current_rules, prior_rules,
                    "case {case_index} {} application {application}: failing leaf mutated rules input",
                    case.label,
                );
                assert_eq!(
                    current_machine, prior_machine,
                    "case {case_index} {} application {application}: failing leaf mutated machine input",
                    case.label,
                );
                actual_error = Some(error.to_string());
                break;
            }
        }
    }

    assert_eq!(
        input_rules, before_rules,
        "case {case_index} {}: native leaf changed original rules",
        case.label,
    );
    assert_eq!(
        input_machine, before_machine,
        "case {case_index} {}: native leaf changed original machine",
        case.label,
    );
    assert_eq!(
        controls.as_slice(),
        case.controls,
        "case {case_index} {}: canonical controls",
        case.label,
    );
    assert_eq!(
        actual_error.as_deref(),
        case.expected_error,
        "case {case_index} {}: exact source-ordered error",
        case.label,
    );
    match (case.expected, case.expected_machine, actual_error) {
        (Some(expected_rules), Some(expected_machine), None) => {
            assert_eq!(
                vector_state(current_rules),
                expected_rules,
                "case {case_index} {}: complete canonical rules output",
                case.label,
            );
            assert_eq!(
                vector_machine(current_machine),
                expected_machine,
                "case {case_index} {}: complete canonical machine output",
                case.label,
            );
        }
        (None, None, Some(_)) => {}
        outcome => panic!(
            "case {case_index} {}: generated outcome shape disagrees with native result: {outcome:?}",
            case.label,
        ),
    }
}

fn is_forbidden_move(move_id: u16) -> bool {
    matches!(
        move_id,
        BATTLE_SCRIPT_TRYSETENCORE_MOVE_MIRROR_MOVE
            | BATTLE_SCRIPT_TRYSETENCORE_MOVE_STRUGGLE
            | BATTLE_SCRIPT_TRYSETENCORE_MOVE_ENCORE
    )
}

fn assert_transition_shape(
    case_index: usize,
    case: &BattleScriptTrysetencoreVectorCase,
    application: u8,
    prior_rules: BattleScriptTrysetencoreRules,
    prior_machine: BattleScriptTrysetencoreMachineSiblings,
    outcome: factory_core::battle_script_trysetencore::BattleScriptTrysetencoreOutcome,
) {
    let target = prior_rules.selector_roles.target.unwrap_or_else(|| {
        panic!(
            "case {case_index} {} application {application}: successful native outcome had no target",
            case.label,
        )
    });
    let target_before = prior_rules.battlers[target.index()];
    let last_move = prior_rules.move_history.last_moves[target.index()];
    let slot = target_before
        .moves
        .iter()
        .position(|&move_id| move_id == last_move);
    let eligible = target_before.encored_move == 0
        && slot.is_some_and(|position| target_before.pp[position] != 0)
        && !is_forbidden_move(last_move);

    if !eligible {
        assert!(
            matches!(
                outcome.control,
                BattleScriptTrysetencoreControl::Jump { .. }
            ),
            "case {case_index} {} application {application}: ineligible branch must jump",
            case.label,
        );
        assert_eq!(
            outcome.rules, prior_rules,
            "case {case_index} {} application {application}: failure jump changed rules",
            case.label,
        );
        assert_eq!(
            outcome.machine_siblings, prior_machine,
            "case {case_index} {} application {application}: failure jump consumed RNG or changed scheduler",
            case.label,
        );
        return;
    }

    let position = slot.expect("eligible branch requires a first matching slot");
    assert_eq!(
        outcome.control,
        BattleScriptTrysetencoreControl::Advance,
        "case {case_index} {} application {application}: eligible branch must advance",
        case.label,
    );
    assert_eq!(
        outcome.rules.selector_roles, prior_rules.selector_roles,
        "case {case_index} {} application {application}: changed selector roles",
        case.label,
    );
    assert_eq!(
        outcome.rules.move_history, prior_rules.move_history,
        "case {case_index} {} application {application}: changed move history",
        case.label,
    );
    assert_eq!(
        outcome.rules.context_state, prior_rules.context_state,
        "case {case_index} {} application {application}: changed context siblings",
        case.label,
    );
    for battler in BATTLE_SCRIPT_TRYSETENCORE_BATTLERS {
        if battler != target {
            assert_eq!(
                outcome.rules.battlers[battler.index()],
                prior_rules.battlers[battler.index()],
                "case {case_index} {} application {application}: changed sibling battler {}",
                case.label,
                battler.as_u8(),
            );
        }
    }
    let mut expected_target = target_before;
    let next_rng_value = advance_rng_value(prior_machine.rng_value);
    let duration = ((next_rng_value >> 16) as u8 & 3) + BATTLE_SCRIPT_TRYSETENCORE_DURATION_MIN;
    expected_target.encored_move = target_before.moves[position];
    expected_target.encored_move_pos = position as u8;
    expected_target.encore_timer = duration;
    expected_target.encore_timer_start_value = duration;
    assert_eq!(
        outcome.rules.battlers[target.index()],
        expected_target,
        "case {case_index} {} application {application}: target must receive exactly the four Encore writes",
        case.label,
    );
    assert!(
        (BATTLE_SCRIPT_TRYSETENCORE_DURATION_MIN..=BATTLE_SCRIPT_TRYSETENCORE_DURATION_MAX)
            .contains(&duration),
        "case {case_index} {} application {application}: duration must be 3..6",
        case.label,
    );
    assert_eq!(
        outcome.machine_siblings.scheduler, prior_machine.scheduler,
        "case {case_index} {} application {application}: changed scheduler",
        case.label,
    );
    assert_eq!(
        outcome.machine_siblings.rng_value, next_rng_value,
        "case {case_index} {} application {application}: RNG must advance exactly once",
        case.label,
    );
    assert_eq!(
        outcome.machine_siblings.rng_calls,
        prior_machine.rng_calls + 1,
        "case {case_index} {} application {application}: RNG receipt count must increment once",
        case.label,
    );
}

#[test]
fn target_slot_rng_duration_matrix_covers_every_target_slot_and_all_four_duration_values() {
    let matrix = BATTLE_SCRIPT_TRYSETENCORE_CASES
        .iter()
        .filter(|case| case.category == "target-slot-rng-duration-matrix")
        .collect::<Vec<_>>();
    assert_eq!(matrix.len(), 64);
    let actual = matrix
        .iter()
        .map(|case| {
            let target = case.initial.target.expect("matrix target");
            let expected = case.expected.expect("matrix success");
            let target_after = expected.battlers[target.index()];
            (
                target.as_u8(),
                target_after.encored_move_pos,
                target_after.encore_timer,
            )
        })
        .collect::<BTreeSet<_>>();
    let expected = BATTLE_SCRIPT_TRYSETENCORE_BATTLERS
        .into_iter()
        .flat_map(|target| {
            [0_u8, 1, 2, 3].into_iter().flat_map(move |slot| {
                BATTLE_SCRIPT_TRYSETENCORE_RNG_DURATION_DOMAIN
                    .into_iter()
                    .map(move |duration| (target.as_u8(), slot, duration))
            })
        })
        .collect::<BTreeSet<_>>();
    assert_eq!(actual, expected);
}

#[test]
fn gate_domains_duplicate_first_match_and_no_rng_failing_paths_are_explicitly_covered() {
    let pp = BATTLE_SCRIPT_TRYSETENCORE_CASES
        .iter()
        .filter(|case| case.category == "pp-u8-edge-per-target-slot-matrix")
        .collect::<Vec<_>>();
    assert_eq!(pp.len(), 64);
    let observed_pp = pp
        .iter()
        .map(|case| {
            let target = case.initial.target.expect("PP case target");
            let move_position = case.initial.battlers[target.index()]
                .moves
                .iter()
                .position(|&move_id| {
                    move_id == case.initial.move_history.last_moves[target.index()]
                })
                .expect("PP case matching slot");
            (
                target.as_u8(),
                move_position as u8,
                case.initial.battlers[target.index()].pp[move_position],
            )
        })
        .collect::<BTreeSet<_>>();
    let expected_pp = BATTLE_SCRIPT_TRYSETENCORE_BATTLERS
        .into_iter()
        .flat_map(|target| {
            [0_u8, 1, 2, 3].into_iter().flat_map(move |slot| {
                BATTLE_SCRIPT_TRYSETENCORE_PP_EDGE_DOMAIN
                    .into_iter()
                    .map(move |value| (target.as_u8(), slot, value))
            })
        })
        .collect::<BTreeSet<_>>();
    assert_eq!(observed_pp, expected_pp);

    let encored = BATTLE_SCRIPT_TRYSETENCORE_CASES
        .iter()
        .filter(|case| case.category == "existing-encore-gate-u16-edge-matrix")
        .collect::<Vec<_>>();
    assert_eq!(encored.len(), 16);
    let observed_encored = encored
        .iter()
        .map(|case| {
            let target = case.initial.target.expect("Encore gate target");
            (
                target.as_u8(),
                case.initial.battlers[target.index()].encored_move,
            )
        })
        .collect::<BTreeSet<_>>();
    let expected_encored = BATTLE_SCRIPT_TRYSETENCORE_BATTLERS
        .into_iter()
        .flat_map(|target| {
            BATTLE_SCRIPT_TRYSETENCORE_ENCORED_MOVE_EDGE_DOMAIN
                .into_iter()
                .map(move |move_id| (target.as_u8(), move_id))
        })
        .collect::<BTreeSet<_>>();
    assert_eq!(observed_encored, expected_encored);

    let duplicate = BATTLE_SCRIPT_TRYSETENCORE_CASES
        .iter()
        .filter(|case| case.category == "first-matching-duplicate-slot-pp-precedence")
        .collect::<Vec<_>>();
    assert_eq!(duplicate.len(), 32);
    for case in duplicate {
        let target = case.initial.target.expect("duplicate target");
        let state = case.initial.battlers[target.index()];
        let last_move = case.initial.move_history.last_moves[target.index()];
        let first = state
            .moves
            .iter()
            .position(|&move_id| move_id == last_move)
            .expect("first duplicate");
        let second = state
            .moves
            .iter()
            .enumerate()
            .find_map(|(index, &move_id)| (index > first && move_id == last_move).then_some(index))
            .expect("second duplicate");
        assert_ne!(
            state.pp[first], state.pp[second],
            "{} duplicate PP contrast",
            case.label
        );
        match case.controls {
            [BattleScriptTrysetencoreControl::Advance] => {
                let expected = case.expected.expect("successful duplicate outcome");
                assert_eq!(
                    expected.battlers[target.index()].encored_move_pos,
                    first as u8,
                    "{} must select the first matching slot",
                    case.label,
                );
            }
            [BattleScriptTrysetencoreControl::Jump { .. }] => assert_eq!(
                state.pp[first], 0,
                "{} first match should be the zero-PP gate",
                case.label,
            ),
            controls => panic!("{} unexpected duplicate controls {controls:?}", case.label),
        }
    }

    let edge_moves = BATTLE_SCRIPT_TRYSETENCORE_CASES
        .iter()
        .filter(|case| case.category == "u16-last-move-forbidden-and-boundary-matrix")
        .collect::<Vec<_>>();
    assert_eq!(edge_moves.len(), 48);
    let observed_moves = edge_moves
        .iter()
        .map(|case| {
            let target = case.initial.target.expect("edge target");
            (
                target.as_u8(),
                case.initial.move_history.last_moves[target.index()],
            )
        })
        .collect::<BTreeSet<_>>();
    let expected_moves = BATTLE_SCRIPT_TRYSETENCORE_BATTLERS
        .into_iter()
        .flat_map(|target| {
            BATTLE_SCRIPT_TRYSETENCORE_LAST_MOVE_EDGE_DOMAIN
                .into_iter()
                .map(move |move_id| (target.as_u8(), move_id))
        })
        .collect::<BTreeSet<_>>();
    assert_eq!(observed_moves, expected_moves);
}

#[test]
fn ordered_errors_late_labels_and_repetition_controls_remain_pinned() {
    let malformed = BATTLE_SCRIPT_TRYSETENCORE_CASES
        .iter()
        .filter(|case| case.category == "invalid-instruction-shape-before-target-role")
        .collect::<Vec<_>>();
    assert_eq!(malformed.len(), 5);
    for case in malformed {
        assert_eq!(case.initial.target, None, "{} target setup", case.label);
        assert!(case
            .expected_error
            .unwrap()
            .starts_with("invalid B_SCR_OP_TRYSETENCORE shape"));
        assert!(
            case.controls.is_empty(),
            "{} no control before shape error",
            case.label
        );
    }
    let missing = BATTLE_SCRIPT_TRYSETENCORE_CASES
        .iter()
        .find(|case| case.category == "missing-target-role")
        .expect("missing-target vector");
    assert_eq!(
        missing.expected_error,
        Some("Battle Script hit-chain command requires a target role")
    );
    assert!(missing.controls.is_empty());

    let success_late = BATTLE_SCRIPT_TRYSETENCORE_CASES
        .iter()
        .find(|case| case.category == "late-label-resolution-success")
        .expect("success late-label vector");
    assert_eq!(success_late.expected_error, None);
    assert_eq!(
        success_late.controls,
        &[BattleScriptTrysetencoreControl::Advance]
    );
    let failure_late = BATTLE_SCRIPT_TRYSETENCORE_CASES
        .iter()
        .find(|case| case.category == "late-label-resolution-failure")
        .expect("failure late-label vector");
    assert_eq!(
        failure_late.expected_error,
        Some("Cmd_trysetencore unresolved failure target BattleScript_RustEncoreUnresolved")
    );
    assert!(failure_late.controls.is_empty());

    let repeated = BATTLE_SCRIPT_TRYSETENCORE_CASES
        .iter()
        .filter(|case| case.category == "repeated-application")
        .collect::<Vec<_>>();
    assert_eq!(repeated.len(), 3);
    for case in &repeated {
        assert_eq!(case.applications, 2, "{} applications", case.label);
        assert_eq!(case.expected_error, None, "{} error", case.label);
    }
    assert_eq!(
        repeated[0].controls,
        &[
            BattleScriptTrysetencoreControl::Advance,
            BattleScriptTrysetencoreControl::Jump { program_counter: 1434 },
        ],
    );
    for case in &repeated[1..] {
        assert!(case
            .controls
            .iter()
            .all(|control| matches!(control, BattleScriptTrysetencoreControl::Jump { .. })));
    }
}

#[test]
fn singleton_registration_and_generated_censuses_match_canonical_typescript() {
    assert_eq!(BATTLE_SCRIPT_TRYSETENCORE_REGISTRATION_CASES.len(), 12);
    for case in BATTLE_SCRIPT_TRYSETENCORE_REGISTRATION_CASES {
        let operand_sets = case
            .instructions
            .iter()
            .map(|value| operands(*value))
            .collect::<Vec<_>>();
        let instructions = case
            .instructions
            .iter()
            .zip(&operand_sets)
            .map(|(&value, operands)| instruction(value, operands))
            .collect::<Vec<_>>();
        match register_battle_script_trysetencore_handler(&instructions) {
            Ok(registration) => {
                assert_eq!(
                    case.expected_error, None,
                    "{} unexpected registration success",
                    case.label
                );
                assert_eq!(
                    case.expected_bindings,
                    &[registration.opcode_id],
                    "{} dynamic handler binding",
                    case.label
                );
            }
            Err(error) => {
                assert!(
                    case.expected_bindings.is_empty(),
                    "{} unexpected registration failure",
                    case.label
                );
                assert_eq!(
                    Some(error.to_string()).as_deref(),
                    case.expected_error,
                    "{} exact registration error",
                    case.label
                );
            }
        }
    }
    assert_eq!(
        BATTLE_SCRIPT_TRYSETENCORE_DOMAIN_CENSUS,
        [
            ("battler-slots", 4),
            ("target-role-values", 4),
            ("optional-selector-role-values", 5),
            ("selector-role-combinations-with-concrete-target", 500),
            ("move-slots", 4),
            ("pp-u8-edge-values", 4),
            ("encored-move-u16-edge-values", 4),
            ("last-move-u16-edge-values", 12),
            ("forbidden-move-values", 3),
            ("rng-duration-values", 4),
            ("instruction-shape-variants", 6),
            ("control-branch-values", 2),
            ("application-count-values", 2),
            ("registration-shape-cases", 12),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYSETENCORE_CATEGORY_CENSUS,
        [
            (
                "complete-target-attacker-effect-fainted-selector-matrix",
                500
            ),
            ("existing-encore-gate-u16-edge-matrix", 16),
            ("first-matching-duplicate-slot-pp-precedence", 32),
            ("invalid-instruction-shape-before-target-role", 5),
            ("late-label-resolution-failure", 1),
            ("late-label-resolution-success", 1),
            ("missing-target-role", 1),
            ("no-matching-slot-fail-jump", 4),
            ("pp-u8-edge-per-target-slot-matrix", 64),
            ("repeated-application", 3),
            ("target-slot-rng-duration-matrix", 64),
            ("u16-last-move-forbidden-and-boundary-matrix", 48),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYSETENCORE_BRANCH_CENSUS,
        [
            ("advance", 669),
            ("advance-then-jump", 1),
            ("invalid-instruction-shape", 5),
            ("jump", 60),
            ("jump-then-jump", 2),
            ("missing-target-role", 1),
            ("unresolved-failure-target", 1),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYSETENCORE_REGISTRATION_BRANCH_CENSUS,
        [
            ("invalid-shape", 5),
            ("registered", 3),
            ("wrong-cardinality", 4)
        ],
    );
}
