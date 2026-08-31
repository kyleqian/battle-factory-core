//! Canonical-TypeScript differential and registration tests for
//! `Cmd_jumpifstatus3condition`.

use factory_core::battle_script_jumpifstatus3condition::*;
use factory_core::battle_script_jumpifstatus3condition_vectors_gen::*;

#[test]
fn complete_outputs_controls_errors_repetition_and_immutability_match_canonical_ts() {
    assert_eq!(BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_CASES.len(), 577);
    for (case_index, case) in BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_CASES
        .iter()
        .enumerate()
    {
        let initial = case.initial;
        let mut current = initial;
        let mut controls = Vec::new();
        let mut error = None;
        for application in 0..case.applications {
            let before = current;
            let result = apply_battle_script_jumpifstatus3condition(
                BattleScriptJumpifstatus3conditionExecution {
                    program_counter: case.execution.program_counter,
                    status_expression: case.execution.status_expression,
                    condition_expression: case.execution.condition_expression,
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
fn dense_matrix_covers_seven_sites_both_topologies_all_target_roles_and_status_domain() {
    let matrix = BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_CASES
        .iter()
        .filter(|case| case.category == "dense-site-topology-target-status-matrix")
        .collect::<Vec<_>>();
    assert_eq!(matrix.len(), 546);

    for case in matrix {
        let mask = battle_script_jumpifstatus3condition_status3_from_expression(
            case.execution.status_expression,
        )
        .expect("matrix supported status3 expression")
        .mask();
        let condition = battle_script_jumpifstatus3condition_condition_from_expression(
            case.execution.condition_expression,
        )
        .expect("matrix supported condition expression");
        let battler = case.execution.battler.expect("matrix resolved battler");
        let status3 = case.initial.battlers_status3[battler as usize];
        let bit_set = (status3 & mask) != 0;
        let should_jump = if condition { !bit_set } else { bit_set };
        let expected = if should_jump {
            BattleScriptJumpifstatus3conditionControl::Jump {
                program_counter: case
                    .execution
                    .resolved_jump_program_counter
                    .expect("matrix always resolves its label"),
            }
        } else {
            BattleScriptJumpifstatus3conditionControl::Advance
        };
        assert_eq!(case.controls, &[expected], "{} matrix decision", case.label);
    }
}

#[test]
fn absent_path_skips_label_lookup_and_present_path_resolves_late() {
    let late = BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_CASES
        .iter()
        .filter(|case| case.category == "late-label-resolution")
        .collect::<Vec<_>>();
    assert_eq!(late.len(), 14);
    assert_eq!(
        late.iter().filter(|case| case.branch == "advance").count(),
        7
    );
    assert_eq!(
        late.iter()
            .filter(|case| case.branch == "unresolved-label")
            .count(),
        7
    );
    for case in late.iter().filter(|case| case.branch == "advance") {
        assert_eq!(case.execution.resolved_jump_program_counter, None);
        assert_eq!(case.expected_error, None);
    }
    for case in late.iter().filter(|case| case.branch == "unresolved-label") {
        assert_eq!(case.controls, &[]);
        assert!(case
            .expected_error
            .expect("unresolved-label branch has an error")
            .starts_with("Cmd_jumpifstatus3condition: unresolved jump target "));
    }
}

#[test]
fn direct_handler_validation_hits_undecodable_before_label_resolution() {
    let direct = BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_CASES
        .iter()
        .filter(|case| case.category == "direct-handler-validation")
        .collect::<Vec<_>>();
    assert_eq!(direct.len(), 3);
    for case in direct {
        assert_eq!(case.branch, "undecodable");
        assert_eq!(case.controls, &[]);
        assert_eq!(
            case.expected_error,
            Some(format!(
                "validated B_SCR_OP_JUMPIFSTATUS3CONDITION became undecodable at {}",
                case.execution.program_counter
            ))
            .as_deref()
        );
    }
}

#[test]
fn repeated_jump_and_advance_are_stable_no_write_results() {
    let repeated = BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_CASES
        .iter()
        .filter(|case| case.category == "repeated-application")
        .collect::<Vec<_>>();
    assert_eq!(repeated.len(), 14);
    for case in repeated {
        assert_eq!(case.applications, 2);
        assert_eq!(case.expected, Some(case.initial));
        assert_eq!(case.controls.len(), 2);
        assert_eq!(case.controls[0], case.controls[1]);
    }
}

#[test]
fn registration_cardinality_shape_selector_condition_status_and_first_binding_match_canonical_ts() {
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_REGISTRATION_CASES.len(),
        15
    );
    for case in &BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_REGISTRATION_CASES {
        let operand_storage =
            case.instructions
                .iter()
                .map(|instruction| {
                    instruction
                        .operand_widths
                        .iter()
                        .zip(instruction.operand_expressions)
                        .map(|(&width_bytes, &expression)| {
                            BattleScriptJumpifstatus3conditionOperand { width_bytes, expression }
                        })
                        .collect::<Vec<_>>()
                })
                .collect::<Vec<_>>();
        let instructions = case
            .instructions
            .iter()
            .zip(&operand_storage)
            .map(|(instruction, operands)| {
                BattleScriptJumpifstatus3conditionRegistrationInstruction {
                    opcode_name: instruction.opcode_name,
                    program_counter: instruction.program_counter,
                    opcode_id: instruction.opcode_id,
                    dispatcher: instruction.dispatcher,
                    operands,
                }
            })
            .collect::<Vec<_>>();
        match register_battle_script_jumpifstatus3condition_handler(&instructions) {
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
