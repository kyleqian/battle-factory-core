//! Canonical-TypeScript differential and registration tests for
//! `Cmd_jumpifstatus`/`Cmd_jumpifstatus2`.

use factory_core::battle_script_jumpifstatus::*;
use factory_core::battle_script_jumpifstatus_vectors_gen::*;

#[test]
fn behavior_cases_match_canonical_ts() {
    assert_eq!(BATTLE_SCRIPT_JUMPIFSTATUS_CASES.len(), 29);
    for (index, case) in BATTLE_SCRIPT_JUMPIFSTATUS_CASES.iter().enumerate() {
        let execution = BattleScriptJumpifstatusExecution {
            program_counter: case.execution.program_counter,
            status_expression: case.execution.status_expression,
            battler_operand_expression: case.execution.battler_operand_expression,
            battler: case.execution.battler,
            jump_target_expression: case.execution.jump_target_expression,
            resolved_jump_program_counter: case.execution.resolved_jump_program_counter,
        };
        let before = case.initial;
        let result = if case.opcode == 1 {
            apply_battle_script_jumpifstatus(execution, &case.initial)
        } else {
            apply_battle_script_jumpifstatus2(execution, &case.initial)
        };
        assert_eq!(
            case.initial, before,
            "case {index} {}: input mutated",
            case.label
        );
        match result {
            Ok(control) => {
                let expected = case.expected_control.unwrap_or_else(|| {
                    panic!("case {index} {}: missing expected control", case.label)
                });
                match (&control, expected) {
                    (BattleScriptJumpifstatusControl::Advance, BattleScriptJumpifstatusVectorControl::Advance) => {}
                    (
                        BattleScriptJumpifstatusControl::Jump { program_counter },
                        BattleScriptJumpifstatusVectorControl::Jump { program_counter: expected_pc },
                    ) => assert_eq!(*program_counter, expected_pc, "case {index} {}: jump target", case.label),
                    (
                        BattleScriptJumpifstatusControl::Block { operand_expression },
                        BattleScriptJumpifstatusVectorControl::Block { operand_expression: expected_expr },
                    ) => assert_eq!(*operand_expression, expected_expr, "case {index} {}: block operand", case.label),
                    (
                        BattleScriptJumpifstatusControl::Halt {
                            program_counter,
                            opcode_id,
                            opcode_name,
                            source_construct,
                            source_file,
                            source_line,
                        },
                        BattleScriptJumpifstatusVectorControl::Halt {
                            program_counter: expected_pc,
                            opcode_id: expected_opcode_id,
                            opcode_name: expected_opcode_name,
                            source_construct: expected_construct,
                            source_line: expected_line,
                        },
                    ) => {
                        assert_eq!(*program_counter, expected_pc, "case {index} {}: halt pc", case.label);
                        assert_eq!(*opcode_id, expected_opcode_id, "case {index} {}: halt opcode_id", case.label);
                        assert_eq!(*opcode_name, expected_opcode_name, "case {index} {}: halt opcode_name", case.label);
                        assert_eq!(source_construct, expected_construct, "case {index} {}: halt source_construct", case.label);
                        assert_eq!(*source_file, "battle_script_commands.c");
                        assert_eq!(*source_line, expected_line, "case {index} {}: halt source_line", case.label);
                    }
                    (actual, expected) => panic!(
                        "case {index} {}: control kind mismatch, got {actual:?}, expected {expected:?}",
                        case.label
                    ),
                }
                assert!(
                    case.expected_error.is_none(),
                    "case {index} {}: expected no error but corpus carries one",
                    case.label
                );
            }
            Err(error) => {
                assert_eq!(
                    Some(error.to_string().as_str()),
                    case.expected_error,
                    "case {index} {}: error message mismatch",
                    case.label
                );
                assert!(
                    case.expected_control.is_none(),
                    "case {index} {}: expected no control but corpus carries one",
                    case.label
                );
            }
        }
    }
}

#[test]
fn registration_cases_match_canonical_ts() {
    assert_eq!(BATTLE_SCRIPT_JUMPIFSTATUS_REGISTRATION_CASES.len(), 5);
    for case in BATTLE_SCRIPT_JUMPIFSTATUS_REGISTRATION_CASES.iter() {
        assert_eq!(
            case.registered,
            case.bound_opcode_id.is_some(),
            "case {}: registered/bound_opcode_id disagree",
            case.label
        );
        if case.opcode == 1 {
            assert_eq!(
                case.registered,
                case.expected_error.is_none(),
                "case {}: status1 registered/error disagree",
                case.label
            );
        } else {
            // status2 never errors (optional-presence convention).
            assert!(
                case.expected_error.is_none(),
                "case {}: status2 registration must never error",
                case.label
            );
        }
    }
}

#[test]
fn category_and_branch_census_match_generator_output() {
    let category_total: usize = BATTLE_SCRIPT_JUMPIFSTATUS_CATEGORY_CENSUS
        .iter()
        .map(|(_, count)| count)
        .sum();
    let branch_total: usize = BATTLE_SCRIPT_JUMPIFSTATUS_BRANCH_CENSUS
        .iter()
        .map(|(_, count)| count)
        .sum();
    assert_eq!(category_total, BATTLE_SCRIPT_JUMPIFSTATUS_CASES.len());
    assert_eq!(branch_total, BATTLE_SCRIPT_JUMPIFSTATUS_CASES.len());
}

#[test]
fn corpus_and_generator_sha256_are_recorded() {
    assert_eq!(BATTLE_SCRIPT_JUMPIFSTATUS_VECTOR_CORPUS_SHA256.len(), 64);
    assert_eq!(BATTLE_SCRIPT_JUMPIFSTATUS_VECTOR_GENERATOR_SHA256.len(), 64);
}
