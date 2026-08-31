//! Canonical-TypeScript differential and registration tests for
//! `Cmd_jumpifstat`.

use factory_core::battle_script_jumpifstat::*;
use factory_core::battle_script_jumpifstat_vectors_gen::*;

#[test]
fn complete_outputs_controls_errors_repetition_and_immutability_match_canonical_ts() {
    assert_eq!(BATTLE_SCRIPT_JUMPIFSTAT_CASES.len(), 1602);
    for (case_index, case) in BATTLE_SCRIPT_JUMPIFSTAT_CASES.iter().enumerate() {
        let initial = case.initial;
        let mut current = initial;
        let mut controls = Vec::new();
        let mut error = None;
        for application in 0..case.applications {
            let before = current;
            let result = apply_battle_script_jumpifstat(
                BattleScriptJumpifstatExecution {
                    program_counter: case.execution.program_counter,
                    comparator_expression: case.execution.comparator_expression,
                    stat_expression: case.execution.stat_expression,
                    value_expression: case.execution.value_expression,
                    battler_operand_expression: case.execution.battler_operand_expression,
                    battler: case.execution.battler,
                    jump_target_expression: case.execution.jump_target_expression,
                    resolved_jump_program_counter: case.execution.resolved_jump_program_counter,
                },
                &current,
            );
            assert_eq!(
                current, before,
                "case {case_index} {} application {application}: input mutation",
                case.label
            );
            match result {
                Ok(outcome) => {
                    assert_eq!(
                        outcome.rules, before,
                        "case {case_index} {}: output state mutation",
                        case.label
                    );
                    controls.push(outcome.control);
                    current = outcome.rules;
                }
                Err(actual) => {
                    error = Some(actual.to_string());
                    break;
                }
            }
        }
        assert_eq!(
            initial, case.initial,
            "case {case_index} {}: initial mutation",
            case.label
        );
        assert_eq!(
            controls, case.controls,
            "case {case_index} {}: controls",
            case.label
        );
        assert_eq!(
            error.as_deref(),
            case.expected_error,
            "case {case_index} {}: error",
            case.label
        );
        assert_eq!(
            error.is_none().then_some(current),
            case.expected,
            "case {case_index} {}: output",
            case.label
        );
    }
}

#[test]
fn dense_matrix_covers_eighteen_sites_both_topologies_all_roles_and_stage_domain() {
    let matrix = BATTLE_SCRIPT_JUMPIFSTAT_CASES
        .iter()
        .filter(|case| case.category == "dense-site-topology-role-stage-matrix")
        .collect::<Vec<_>>();
    assert_eq!(matrix.len(), 1404);

    for case in matrix {
        let comparator = battle_script_jumpifstat_comparator_from_expression(
            case.execution.comparator_expression,
        )
        .expect("matrix supported comparator expression");
        let stat = battle_script_jumpifstat_stat_from_expression(case.execution.stat_expression)
            .expect("matrix supported stat expression");
        let comparand =
            battle_script_jumpifstat_value_from_expression(case.execution.value_expression)
                .expect("matrix supported value expression");
        let battler = case.execution.battler.expect("matrix resolved battler");
        let value = case.initial.battlers_stat_stages[battler as usize][stat.id() as usize];
        let expected = if comparator.evaluate(value, comparand.value()) {
            BattleScriptJumpifstatControl::Jump {
                program_counter: case
                    .execution
                    .resolved_jump_program_counter
                    .expect("matrix always resolves its label"),
            }
        } else {
            BattleScriptJumpifstatControl::Advance
        };
        assert_eq!(case.controls, &[expected], "{} matrix decision", case.label);
    }
}

#[test]
fn comparator_truth_table_covers_all_six_comparators_over_the_stage_domain() {
    let table = BATTLE_SCRIPT_JUMPIFSTAT_CASES
        .iter()
        .filter(|case| case.category == "comparator-truth-table")
        .collect::<Vec<_>>();
    assert_eq!(table.len(), 156);
    for case in table {
        let comparator = battle_script_jumpifstat_comparator_from_expression(
            case.execution.comparator_expression,
        )
        .expect("table supported comparator expression");
        let comparand =
            battle_script_jumpifstat_value_from_expression(case.execution.value_expression)
                .expect("table supported value expression");
        let battler = case.execution.battler.expect("table resolved battler");
        let stat = battle_script_jumpifstat_stat_from_expression(case.execution.stat_expression)
            .expect("table supported stat expression");
        let value = case.initial.battlers_stat_stages[battler as usize][stat.id() as usize];
        let expected = if comparator.evaluate(value, comparand.value()) {
            BattleScriptJumpifstatControl::Jump {
                program_counter: case
                    .execution
                    .resolved_jump_program_counter
                    .expect("table always resolves its label"),
            }
        } else {
            BattleScriptJumpifstatControl::Advance
        };
        assert_eq!(case.controls, &[expected], "{} table decision", case.label);
    }
}

#[test]
fn repeated_jump_and_advance_are_stable_no_write_results() {
    let repeated = BATTLE_SCRIPT_JUMPIFSTAT_CASES
        .iter()
        .filter(|case| case.category == "repeated-application")
        .collect::<Vec<_>>();
    assert_eq!(repeated.len(), 36);
    for case in repeated {
        assert_eq!(case.applications, 2);
        assert_eq!(case.expected, Some(case.initial));
        assert_eq!(case.controls.len(), 2);
        assert_eq!(case.controls[0], case.controls[1]);
    }
}

#[test]
fn direct_handler_validation_orders_decode_before_battler_resolution_and_defends_the_label() {
    let direct = BATTLE_SCRIPT_JUMPIFSTAT_CASES
        .iter()
        .filter(|case| case.category == "direct-handler-validation")
        .collect::<Vec<_>>();
    assert_eq!(direct.len(), 6);
    assert_eq!(
        direct.iter().filter(|case| case.branch == "block").count(),
        2
    );
    assert_eq!(
        direct
            .iter()
            .filter(|case| case.branch == "undecodable")
            .count(),
        3
    );
    assert_eq!(
        direct
            .iter()
            .filter(|case| case.branch == "unresolved-label")
            .count(),
        1
    );
    for case in &direct {
        match case.branch {
            "block" => {
                assert_eq!(case.execution.battler, None);
                assert_eq!(case.expected_error, None);
                assert_eq!(case.controls.len(), 1);
                assert!(matches!(
                    case.controls[0],
                    BattleScriptJumpifstatControl::Block { .. }
                ));
            }
            "undecodable" => {
                assert_eq!(case.controls, &[]);
                assert_eq!(
                    case.expected_error,
                    Some(format!(
                        "validated B_SCR_OP_JUMPIFSTAT became undecodable at {}",
                        case.execution.program_counter
                    ))
                    .as_deref()
                );
            }
            "unresolved-label" => {
                assert_eq!(case.execution.resolved_jump_program_counter, None);
                assert_eq!(case.controls, &[]);
                assert!(case
                    .expected_error
                    .expect("unresolved-label branch has an error")
                    .starts_with("Cmd_jumpifstat: unresolved jump target "));
            }
            other => panic!("unexpected direct-handler-validation branch {other}"),
        }
    }
}

#[test]
fn registration_cardinality_shape_expressions_label_and_first_binding_match_canonical_ts() {
    assert_eq!(BATTLE_SCRIPT_JUMPIFSTAT_REGISTRATION_CASES.len(), 16);
    for case in &BATTLE_SCRIPT_JUMPIFSTAT_REGISTRATION_CASES {
        let operand_storage = case
            .instructions
            .iter()
            .map(|instruction| {
                instruction
                    .operand_widths
                    .iter()
                    .zip(instruction.operand_expressions)
                    .map(
                        |(&width_bytes, &expression)| BattleScriptJumpifstatOperand {
                            width_bytes,
                            expression,
                        },
                    )
                    .collect::<Vec<_>>()
            })
            .collect::<Vec<_>>();
        let instructions = case
            .instructions
            .iter()
            .zip(&operand_storage)
            .map(
                |(instruction, operands)| BattleScriptJumpifstatRegistrationInstruction {
                    opcode_name: instruction.opcode_name,
                    program_counter: instruction.program_counter,
                    opcode_id: instruction.opcode_id,
                    dispatcher: instruction.dispatcher,
                    operands,
                    resolved_jump_program_counter: if case.branch == "unresolved-label" {
                        None
                    } else {
                        Some(0)
                    },
                },
            )
            .collect::<Vec<_>>();
        match register_battle_script_jumpifstat_handler(&instructions) {
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
