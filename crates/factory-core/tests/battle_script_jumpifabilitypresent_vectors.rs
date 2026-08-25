//! Canonical-TypeScript differential and registration tests for
//! `Cmd_jumpifabilitypresent`.

use std::collections::BTreeSet;

use factory_core::battle_script_jumpifabilitypresent::*;
use factory_core::battle_script_jumpifabilitypresent_vectors_gen::*;

#[test]
fn complete_outputs_controls_errors_repetition_and_immutability_match_canonical_ts() {
    assert_eq!(BATTLE_SCRIPT_JUMPIFABILITYPRESENT_CASES.len(), 153);
    for (case_index, case) in BATTLE_SCRIPT_JUMPIFABILITYPRESENT_CASES.iter().enumerate() {
        let initial = case.initial;
        let mut current = initial;
        let mut controls = Vec::new();
        let mut error = None;
        for application in 0..case.applications {
            let before = current;
            let result = apply_battle_script_jumpifabilitypresent(
                BattleScriptJumpifabilitypresentExecution {
                    ability_expression: case.execution.ability_expression,
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
fn dense_matrix_covers_both_topologies_sites_positions_life_and_ability_kinds() {
    let matrix = BATTLE_SCRIPT_JUMPIFABILITYPRESENT_CASES
        .iter()
        .filter(|case| case.category == "dense-topology-position-life-ability-matrix")
        .collect::<Vec<_>>();
    assert_eq!(matrix.len(), 144);
    let topology_site_position = matrix
        .iter()
        .map(|case| {
            let site = case.execution.ability_expression;
            let focus = case
                .initial
                .battlers
                .iter()
                .position(|battler| battler.hp == 0 || battler.hp == 1 || battler.hp == u16::MAX)
                .expect("one focus battler");
            (case.initial.battlers_count as u8, site, focus)
        })
        .collect::<BTreeSet<_>>();
    assert_eq!(topology_site_position.len(), 2 * 2 * 4);

    for case in matrix {
        let ability = battle_script_jumpifabilitypresent_ability_from_expression(
            case.execution.ability_expression,
        )
        .expect("matrix supported ability");
        let present = case.initial.battlers[..case.initial.battlers_count.get()]
            .iter()
            .any(|battler| battler.ability == ability.id() && battler.hp != 0);
        let expected = if present {
            BattleScriptJumpifabilitypresentControl::Jump {
                program_counter: BATTLE_SCRIPT_JUMPIFABILITYPRESENT_TARGET_PROGRAM_COUNTER,
            }
        } else {
            BattleScriptJumpifabilitypresentControl::Advance
        };
        assert_eq!(case.controls, &[expected], "{} topology scan", case.label);
    }
}

#[test]
fn absent_path_skips_label_lookup_present_path_resolves_late_and_bad_ability_wins_ordering() {
    let late = BATTLE_SCRIPT_JUMPIFABILITYPRESENT_CASES
        .iter()
        .filter(|case| case.category == "late-label-resolution")
        .collect::<Vec<_>>();
    assert_eq!(late.len(), 4);
    assert_eq!(
        late.iter().filter(|case| case.branch == "advance").count(),
        2
    );
    assert_eq!(
        late.iter()
            .filter(|case| case.branch == "unresolved-label")
            .count(),
        2
    );
    for case in late.iter().filter(|case| case.branch == "advance") {
        assert_eq!(case.execution.resolved_jump_program_counter, None);
        assert_eq!(case.expected_error, None);
    }
    for case in late.iter().filter(|case| case.branch == "unresolved-label") {
        assert_eq!(case.controls, &[]);
        assert_eq!(
            case.expected_error,
            Some(
                "Cmd_jumpifabilitypresent: unresolved jump target BattleScript_SolarBeamDecideTurn"
            )
        );
    }

    let direct = BATTLE_SCRIPT_JUMPIFABILITYPRESENT_CASES
        .iter()
        .find(|case| case.category == "direct-handler-validation")
        .expect("direct invalid ability case");
    assert_eq!(direct.execution.resolved_jump_program_counter, None);
    assert_eq!(direct.controls, &[]);
    assert_eq!(
        direct.expected_error,
        Some("Cmd_jumpifabilitypresent: unvalidated ability operand ABILITY_DRIZZLE")
    );
}

#[test]
fn repeated_jump_and_advance_are_stable_no_write_results() {
    let repeated = BATTLE_SCRIPT_JUMPIFABILITYPRESENT_CASES
        .iter()
        .filter(|case| case.category == "repeated-application")
        .collect::<Vec<_>>();
    assert_eq!(repeated.len(), 4);
    for case in repeated {
        assert_eq!(case.applications, 2);
        assert_eq!(case.expected, Some(case.initial));
        assert_eq!(case.controls.len(), 2);
        assert_eq!(case.controls[0], case.controls[1]);
    }
}

#[test]
fn registration_cardinality_shape_error_order_and_first_binding_match_canonical_ts() {
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFABILITYPRESENT_REGISTRATION_CASES.len(),
        15
    );
    for case in &BATTLE_SCRIPT_JUMPIFABILITYPRESENT_REGISTRATION_CASES {
        let operand_storage =
            case.instructions
                .iter()
                .map(|instruction| {
                    instruction
                        .operand_widths
                        .iter()
                        .zip(instruction.operand_expressions)
                        .map(|(&width_bytes, &expression)| {
                            BattleScriptJumpifabilitypresentOperand { width_bytes, expression }
                        })
                        .collect::<Vec<_>>()
                })
                .collect::<Vec<_>>();
        let instructions = case
            .instructions
            .iter()
            .zip(&operand_storage)
            .map(|(instruction, operands)| {
                BattleScriptJumpifabilitypresentRegistrationInstruction {
                    opcode_name: instruction.opcode_name,
                    program_counter: instruction.program_counter,
                    opcode_id: instruction.opcode_id,
                    dispatcher: instruction.dispatcher,
                    operands,
                }
            })
            .collect::<Vec<_>>();
        match register_battle_script_jumpifabilitypresent_handler(&instructions) {
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
