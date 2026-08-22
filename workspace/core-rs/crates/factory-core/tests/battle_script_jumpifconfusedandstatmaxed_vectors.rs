//! Canonical-TypeScript differential and registration ratchets for
//! `src/engine/battleScriptJumpifconfusedandstatmaxedOpcode.ts`.
//!
//! Regenerate the expected corpus with:
//! `node --experimental-strip-types
//! core-rs/tools/gen-battle-script-jumpifconfusedandstatmaxed-vectors.mjs`.

use std::collections::BTreeSet;

use factory_core::battle_script_jumpifconfusedandstatmaxed::{
    apply_battle_script_jumpifconfusedandstatmaxed,
    battle_script_jumpifconfusedandstatmaxed_stat_from_expression,
    register_battle_script_jumpifconfusedandstatmaxed_handler,
    BattleScriptJumpifconfusedandstatmaxedBattlerState,
    BattleScriptJumpifconfusedandstatmaxedContextState,
    BattleScriptJumpifconfusedandstatmaxedControl, BattleScriptJumpifconfusedandstatmaxedExecution,
    BattleScriptJumpifconfusedandstatmaxedOperand,
    BattleScriptJumpifconfusedandstatmaxedRegistrationInstruction,
    BattleScriptJumpifconfusedandstatmaxedRoles, BattleScriptJumpifconfusedandstatmaxedRules,
    BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_BATTLERS,
    BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_BATTLER_COUNT,
    BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_STAT_STAGE_COUNT, BATTLE_SCRIPT_MAX_STAT_STAGE,
    BATTLE_SCRIPT_STATUS2_CONFUSION,
};
use factory_core::battle_script_jumpifconfusedandstatmaxed_vectors_gen::{
    BattleScriptJumpifconfusedandstatmaxedVectorBattlerState,
    BattleScriptJumpifconfusedandstatmaxedVectorCase,
    BattleScriptJumpifconfusedandstatmaxedVectorContextState,
    BattleScriptJumpifconfusedandstatmaxedVectorRegistrationInstruction,
    BattleScriptJumpifconfusedandstatmaxedVectorState,
    BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_CASES,
    BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_REGISTRATION_CASES,
    BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_STATUS2_EDGE_DOMAIN,
    BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_STAT_STAGE_EDGE_DOMAIN,
    BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_TARGET_DOMAIN,
};

fn battler(
    value: BattleScriptJumpifconfusedandstatmaxedVectorBattlerState,
) -> BattleScriptJumpifconfusedandstatmaxedBattlerState {
    BattleScriptJumpifconfusedandstatmaxedBattlerState {
        side: value.side,
        ability: value.ability,
        hp: value.hp,
        max_hp: value.max_hp,
        moves: value.moves,
        pp: value.pp,
        status1: value.status1,
        status2: value.status2,
        status3: value.status3,
        stat_stages: value.stat_stages,
        item: value.item,
        party_index: value.party_index,
    }
}

fn vector_battler(
    value: BattleScriptJumpifconfusedandstatmaxedBattlerState,
) -> BattleScriptJumpifconfusedandstatmaxedVectorBattlerState {
    BattleScriptJumpifconfusedandstatmaxedVectorBattlerState {
        side: value.side,
        ability: value.ability,
        hp: value.hp,
        max_hp: value.max_hp,
        moves: value.moves,
        pp: value.pp,
        status1: value.status1,
        status2: value.status2,
        status3: value.status3,
        stat_stages: value.stat_stages,
        item: value.item,
        party_index: value.party_index,
    }
}

fn context_state(
    value: BattleScriptJumpifconfusedandstatmaxedVectorContextState,
) -> BattleScriptJumpifconfusedandstatmaxedContextState {
    BattleScriptJumpifconfusedandstatmaxedContextState {
        scripting_battler: value.scripting_battler,
        current_move: value.current_move,
        move_result_flags: value.move_result_flags,
        hit_marker: value.hit_marker,
        battle_move_damage: value.battle_move_damage,
        bide_dmg: value.bide_dmg,
        locked_moves: value.locked_moves,
    }
}

fn vector_context_state(
    value: BattleScriptJumpifconfusedandstatmaxedContextState,
) -> BattleScriptJumpifconfusedandstatmaxedVectorContextState {
    BattleScriptJumpifconfusedandstatmaxedVectorContextState {
        scripting_battler: value.scripting_battler,
        current_move: value.current_move,
        move_result_flags: value.move_result_flags,
        hit_marker: value.hit_marker,
        battle_move_damage: value.battle_move_damage,
        bide_dmg: value.bide_dmg,
        locked_moves: value.locked_moves,
    }
}

fn rules(
    value: BattleScriptJumpifconfusedandstatmaxedVectorState,
) -> BattleScriptJumpifconfusedandstatmaxedRules {
    BattleScriptJumpifconfusedandstatmaxedRules {
        battlers: value.battlers.map(battler),
        selector_roles: BattleScriptJumpifconfusedandstatmaxedRoles {
            attacker: value.attacker,
            target: value.target,
            effect_battler: value.effect_battler,
            fainted: value.fainted,
        },
        context_state: context_state(value.context_state),
    }
}

fn vector_state(
    value: BattleScriptJumpifconfusedandstatmaxedRules,
) -> BattleScriptJumpifconfusedandstatmaxedVectorState {
    BattleScriptJumpifconfusedandstatmaxedVectorState {
        battlers: value.battlers.map(vector_battler),
        attacker: value.selector_roles.attacker,
        target: value.selector_roles.target,
        effect_battler: value.selector_roles.effect_battler,
        fainted: value.selector_roles.fainted,
        context_state: vector_context_state(value.context_state),
    }
}

#[test]
fn complete_projected_outputs_controls_ordered_errors_repetitions_and_immutability_match_canonical_ts(
) {
    assert_eq!(BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_CASES.len(), 589);
    for (case_index, case) in BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_CASES
        .iter()
        .enumerate()
    {
        execute_case(case_index, case);
    }
}

fn execute_case(case_index: usize, case: &BattleScriptJumpifconfusedandstatmaxedVectorCase) {
    let input = rules(case.initial);
    let before = input;
    let mut current = input;
    let execution = BattleScriptJumpifconfusedandstatmaxedExecution {
        program_counter: case.execution.program_counter,
        stat_expression: case.execution.stat_expression,
        jump_target_expression: case.execution.jump_target_expression,
        jump_target_resolves: case.execution.jump_target_resolves,
    };
    let mut controls = Vec::new();
    let mut error = None;

    for application in 0..case.applications {
        let prior = current;
        match apply_battle_script_jumpifconfusedandstatmaxed(execution, &current) {
            Ok(outcome) => {
                assert_eq!(
                    current, prior,
                    "case {case_index} {} application {application}: native leaf mutated input",
                    case.label,
                );
                assert_transition_shape(case_index, case, application, prior, outcome);
                controls.push(outcome.control);
                current = outcome.rules;
            }
            Err(actual) => {
                assert_eq!(
                    current, prior,
                    "case {case_index} {} application {application}: failing leaf mutated input",
                    case.label,
                );
                error = Some(actual.to_string());
                break;
            }
        }
    }

    assert_eq!(
        input, before,
        "case {case_index} {}: native leaf changed initial input",
        case.label,
    );
    assert_eq!(
        controls.as_slice(),
        case.controls,
        "case {case_index} {}: canonical controls",
        case.label,
    );
    assert_eq!(
        error.as_deref(),
        case.expected_error,
        "case {case_index} {}: exact canonical error",
        case.label,
    );
    assert_eq!(
        error.is_none().then(|| vector_state(current)),
        case.expected,
        "case {case_index} {}: complete projected result",
        case.label,
    );
}

fn assert_transition_shape(
    case_index: usize,
    case: &BattleScriptJumpifconfusedandstatmaxedVectorCase,
    application: u8,
    prior: BattleScriptJumpifconfusedandstatmaxedRules,
    outcome: factory_core::battle_script_jumpifconfusedandstatmaxed::BattleScriptJumpifconfusedandstatmaxedOutcome,
) {
    let stat = battle_script_jumpifconfusedandstatmaxed_stat_from_expression(
        case.execution.stat_expression,
    )
    .unwrap_or_else(|| {
        panic!(
            "case {case_index} {} application {application}: successful path had unknown stat",
            case.label,
        )
    });
    let target = prior.selector_roles.target.unwrap_or_else(|| {
        panic!(
            "case {case_index} {} application {application}: successful path had no target",
            case.label,
        )
    });
    let target_state = prior.battlers[target.index()];
    let expected_control = if target_state.status2 & BATTLE_SCRIPT_STATUS2_CONFUSION != 0
        && target_state.stat_stages[stat.index()] == BATTLE_SCRIPT_MAX_STAT_STAGE
    {
        BattleScriptJumpifconfusedandstatmaxedControl::Jump
    } else {
        BattleScriptJumpifconfusedandstatmaxedControl::Advance
    };
    assert_eq!(
        outcome.rules, prior,
        "case {case_index} {} application {application}: no-write leaf changed state",
        case.label,
    );
    assert_eq!(
        outcome.control, expected_control,
        "case {case_index} {} application {application}: source conjunction branch",
        case.label,
    );
}

#[test]
fn both_concrete_stat_sites_every_target_confusion_mask_edge_and_stat_stage_edge_are_crossed() {
    let matrix = BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_CASES
        .iter()
        .filter(|case| case.category == "site-target-confusion-stage-matrix")
        .collect::<Vec<_>>();
    assert_eq!(matrix.len(), 560);

    let actual = matrix
        .iter()
        .map(|case| {
            let target = case.initial.target.expect("matrix target");
            let stat = battle_script_jumpifconfusedandstatmaxed_stat_from_expression(
                case.execution.stat_expression,
            )
            .expect("concrete matrix stat");
            (
                case.execution.stat_expression,
                target.as_u8(),
                case.initial.battlers[target.index()].status2,
                case.initial.battlers[target.index()].stat_stages[stat.index()],
            )
        })
        .collect::<BTreeSet<_>>();
    let expected = ["STAT_ATK", "STAT_SPATK"]
        .into_iter()
        .flat_map(|stat_expression| {
            BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_TARGET_DOMAIN
                .into_iter()
                .flat_map(move |target| {
                    BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_STATUS2_EDGE_DOMAIN
                        .into_iter()
                        .flat_map(move |status2| {
                            BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_STAT_STAGE_EDGE_DOMAIN
                                .into_iter()
                                .map(move |stage| (stat_expression, target, status2, stage))
                        })
                })
        })
        .collect::<BTreeSet<_>>();
    assert_eq!(actual, expected);

    for case in matrix {
        let target = case.initial.target.expect("matrix target");
        let stat = battle_script_jumpifconfusedandstatmaxed_stat_from_expression(
            case.execution.stat_expression,
        )
        .expect("matrix stat");
        let target_state = case.initial.battlers[target.index()];
        let expected_control = if target_state.status2 & BATTLE_SCRIPT_STATUS2_CONFUSION != 0
            && target_state.stat_stages[stat.index()] == BATTLE_SCRIPT_MAX_STAT_STAGE
        {
            BattleScriptJumpifconfusedandstatmaxedControl::Jump
        } else {
            BattleScriptJumpifconfusedandstatmaxedControl::Advance
        };
        assert_eq!(case.controls, &[expected_control], "{} branch", case.label);
    }
}

#[test]
fn concrete_atk_and_spatk_operands_ignore_the_other_stage_cell() {
    let isolation = BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_CASES
        .iter()
        .filter(|case| case.category == "concrete-stat-index-isolation")
        .collect::<Vec<_>>();
    assert_eq!(isolation.len(), 16);
    for case in isolation {
        let target = case.initial.target.expect("isolation target");
        let stat = battle_script_jumpifconfusedandstatmaxed_stat_from_expression(
            case.execution.stat_expression,
        )
        .expect("isolation stat");
        let other = if stat.index() == 1 { 4 } else { 1 };
        let target_state = case.initial.battlers[target.index()];
        assert_eq!(target_state.status2 & BATTLE_SCRIPT_STATUS2_CONFUSION, 7);
        let expected_control =
            if target_state.stat_stages[stat.index()] == BATTLE_SCRIPT_MAX_STAT_STAGE {
                BattleScriptJumpifconfusedandstatmaxedControl::Jump
            } else {
                BattleScriptJumpifconfusedandstatmaxedControl::Advance
            };
        assert_eq!(
            case.controls,
            &[expected_control],
            "{} selected stat",
            case.label
        );
        assert_ne!(
            target_state.stat_stages[stat.index()],
            target_state.stat_stages[other],
            "{} must distinguish selected and sibling stat cells",
            case.label,
        );
    }
}

#[test]
fn missing_target_and_label_resolution_follow_exact_canonical_order() {
    let false_paths = BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_CASES
        .iter()
        .filter(|case| case.category == "false-path-skips-label-resolution")
        .collect::<Vec<_>>();
    assert_eq!(false_paths.len(), 4);
    for case in false_paths {
        assert!(!case.execution.jump_target_resolves, "{} setup", case.label);
        assert_eq!(
            case.expected_error, None,
            "{} must not resolve pointer",
            case.label
        );
        assert_eq!(
            case.controls,
            &[BattleScriptJumpifconfusedandstatmaxedControl::Advance]
        );
    }

    let unresolved = BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_CASES
        .iter()
        .filter(|case| case.category == "true-path-label-resolution")
        .collect::<Vec<_>>();
    assert_eq!(unresolved.len(), 2);
    for case in unresolved {
        assert_eq!(case.controls, &[]);
        assert_eq!(
            case.expected_error,
            Some("Cmd_jumpifconfusedandstatmaxed: unresolved jump target BattleScript_ButItFailed"),
        );
    }

    let missing = BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_CASES
        .iter()
        .filter(|case| case.category == "missing-target-ordering")
        .collect::<Vec<_>>();
    assert_eq!(missing.len(), 2);
    for case in missing {
        assert_eq!(case.initial.target, None);
        assert!(!case.execution.jump_target_resolves);
        assert_eq!(case.controls, &[]);
        assert_eq!(
            case.expected_error,
            Some("Cmd_jumpifconfusedandstatmaxed requires a target role"),
        );
    }

    let undecodable = BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_CASES
        .iter()
        .find(|case| case.category == "handler-validation-ordering")
        .expect("undecodable direct-handler case");
    assert_eq!(undecodable.initial.target, None);
    assert_eq!(undecodable.execution.stat_expression, "STAT_DEF");
    assert_eq!(undecodable.controls, &[]);
    assert_eq!(
        undecodable.expected_error,
        Some("validated B_SCR_OP_JUMPIFCONFUSEDANDSTATMAXED became undecodable at 1088"),
    );
}

#[test]
fn repeated_jump_and_advance_paths_remain_immutable() {
    let repeated = BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_CASES
        .iter()
        .filter(|case| case.category == "repeated-application")
        .collect::<Vec<_>>();
    assert_eq!(repeated.len(), 4);
    for case in repeated {
        assert_eq!(case.applications, 2, "{} applications", case.label);
        assert_eq!(
            case.expected,
            Some(case.initial),
            "{} no-write output",
            case.label
        );
        assert!(
            case.controls
                == [
                    BattleScriptJumpifconfusedandstatmaxedControl::Jump,
                    BattleScriptJumpifconfusedandstatmaxedControl::Jump,
                ]
                || case.controls
                    == [
                        BattleScriptJumpifconfusedandstatmaxedControl::Advance,
                        BattleScriptJumpifconfusedandstatmaxedControl::Advance,
                    ],
            "{} repeated same branch",
            case.label,
        );
    }
}

fn registration_instruction<'a>(
    value: BattleScriptJumpifconfusedandstatmaxedVectorRegistrationInstruction,
    operands: &'a [BattleScriptJumpifconfusedandstatmaxedOperand<'a>],
) -> BattleScriptJumpifconfusedandstatmaxedRegistrationInstruction<'a> {
    BattleScriptJumpifconfusedandstatmaxedRegistrationInstruction {
        opcode_name: value.opcode_name,
        program_counter: value.program_counter,
        opcode_id: value.opcode_id,
        dispatcher: value.dispatcher,
        operands,
        jump_target_resolves: value.jump_target_resolves,
    }
}

#[test]
fn exact_two_start_registration_shape_stat_label_and_dynamic_binding_match_canonical_typescript() {
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_REGISTRATION_CASES.len(),
        16,
    );
    for case in BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_REGISTRATION_CASES {
        let operand_sets = case
            .instructions
            .iter()
            .map(|instruction| {
                assert_eq!(
                    instruction.operand_widths.len(),
                    instruction.operand_expressions.len(),
                    "{} malformed generated operand metadata",
                    case.label,
                );
                instruction
                    .operand_widths
                    .iter()
                    .zip(instruction.operand_expressions)
                    .map(|(&width_bytes, &expression)| {
                        BattleScriptJumpifconfusedandstatmaxedOperand { width_bytes, expression }
                    })
                    .collect::<Vec<_>>()
            })
            .collect::<Vec<_>>();
        let instructions = case
            .instructions
            .iter()
            .zip(&operand_sets)
            .map(|(&instruction, operands)| registration_instruction(instruction, operands))
            .collect::<Vec<_>>();
        match register_battle_script_jumpifconfusedandstatmaxed_handler(&instructions) {
            Ok(registration) => {
                assert_eq!(
                    case.expected_error, None,
                    "{} unexpected success",
                    case.label
                );
                assert_eq!(
                    case.expected_bindings,
                    &[registration.opcode_id],
                    "{} dynamic binding",
                    case.label,
                );
            }
            Err(error) => {
                assert!(
                    case.expected_bindings.is_empty(),
                    "{} unexpected failure",
                    case.label,
                );
                assert_eq!(
                    Some(error.to_string()).as_deref(),
                    case.expected_error,
                    "{} exact registration error",
                    case.label,
                );
            }
        }
    }
}

#[test]
fn source_battler_and_stat_stage_domains_remain_fixed() {
    assert_eq!(BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_BATTLER_COUNT, 4);
    assert_eq!(BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_STAT_STAGE_COUNT, 8);
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_BATTLERS.map(|battler| battler.as_u8()),
        [0, 1, 2, 3],
    );
}
