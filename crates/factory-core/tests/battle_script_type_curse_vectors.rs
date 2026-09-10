//! Canonical-TypeScript differential and registration tests for
//! `Cmd_jumpiftype`/`Cmd_jumpiftype2`/`Cmd_cursetarget`.

use factory_core::battle_script_type_curse::*;
use factory_core::battle_script_type_curse_vectors_gen::*;

#[test]
fn jump_behavior_cases_match_canonical_ts() {
    assert_eq!(BATTLE_SCRIPT_TYPE_CURSE_JUMP_CASES.len(), 27);
    for (index, case) in BATTLE_SCRIPT_TYPE_CURSE_JUMP_CASES.iter().enumerate() {
        let execution = BattleScriptTypeCurseJumpExecution {
            program_counter: case.execution.program_counter,
            type_expression: case.execution.type_expression,
            battler_operand_expression: case.execution.battler_operand_expression,
            battler: case.execution.battler.map(|value| match value {
                0 => BattleScriptTypeCurseBattler::Battler0,
                1 => BattleScriptTypeCurseBattler::Battler1,
                2 => BattleScriptTypeCurseBattler::Battler2,
                3 => BattleScriptTypeCurseBattler::Battler3,
                other => panic!("case {index} {}: bad battler {other}", case.label),
            }),
            jump_target_expression: case.execution.jump_target_expression,
            resolved_jump_program_counter: case.execution.resolved_jump_program_counter,
        };
        let before = case.initial;
        let result = if case.opcode == 1 {
            apply_battle_script_jumpiftype(execution, &case.initial)
        } else {
            apply_battle_script_jumpiftype2(execution, &case.initial)
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
                    (
                        BattleScriptTypeCurseJumpControl::Advance,
                        BattleScriptTypeCurseVectorJumpControl::Advance,
                    ) => {}
                    (
                        BattleScriptTypeCurseJumpControl::Jump { program_counter },
                        BattleScriptTypeCurseVectorJumpControl::Jump {
                            program_counter: expected_pc,
                        },
                    ) => assert_eq!(
                        *program_counter, expected_pc,
                        "case {index} {}: jump target",
                        case.label
                    ),
                    (
                        BattleScriptTypeCurseJumpControl::Block { operand_expression },
                        BattleScriptTypeCurseVectorJumpControl::Block {
                            operand_expression: expected_expr,
                        },
                    ) => assert_eq!(
                        *operand_expression, expected_expr,
                        "case {index} {}: block operand",
                        case.label
                    ),
                    (
                        BattleScriptTypeCurseJumpControl::Halt {
                            program_counter,
                            opcode_id,
                            opcode_name,
                            source_construct,
                            source_file,
                            source_line,
                        },
                        BattleScriptTypeCurseVectorJumpControl::Halt {
                            program_counter: expected_pc,
                            opcode_id: expected_opcode_id,
                            opcode_name: expected_opcode_name,
                            source_construct: expected_construct,
                            source_line: expected_line,
                        },
                    ) => {
                        assert_eq!(
                            *program_counter, expected_pc,
                            "case {index} {}: halt pc",
                            case.label
                        );
                        assert_eq!(
                            *opcode_id, expected_opcode_id,
                            "case {index} {}: halt opcode_id",
                            case.label
                        );
                        assert_eq!(
                            *opcode_name, expected_opcode_name,
                            "case {index} {}: halt opcode_name",
                            case.label
                        );
                        assert_eq!(
                            source_construct, expected_construct,
                            "case {index} {}: halt source_construct",
                            case.label
                        );
                        assert_eq!(*source_file, "battle_script_commands.c");
                        assert_eq!(
                            *source_line, expected_line,
                            "case {index} {}: halt source_line",
                            case.label
                        );
                    }
                    (actual, expected) => {
                        panic!("case {index} {}: control kind mismatch, got {actual:?}, expected {expected:?}", case.label)
                    }
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
fn cursetarget_behavior_cases_match_canonical_ts() {
    assert_eq!(BATTLE_SCRIPT_TYPE_CURSE_CURSETARGET_CASES.len(), 8);
    for (index, case) in BATTLE_SCRIPT_TYPE_CURSE_CURSETARGET_CASES
        .iter()
        .enumerate()
    {
        let execution = BattleScriptTypeCurseCursetargetExecution {
            fail_target_expression: case.execution.fail_target_expression,
            resolved_fail_program_counter: case.execution.resolved_fail_program_counter,
        };
        let before = case.initial;
        let result = apply_battle_script_cursetarget(execution, &case.initial);
        assert_eq!(
            case.initial, before,
            "case {index} {}: input mutated",
            case.label
        );
        match result {
            Ok(outcome) => {
                let expected = case.expected_control.unwrap_or_else(|| {
                    panic!("case {index} {}: missing expected control", case.label)
                });
                match (&outcome.control, expected) {
                    (
                        BattleScriptTypeCurseCursetargetControl::Advance,
                        BattleScriptTypeCurseVectorCursetargetControl::Advance,
                    ) => {
                        assert_eq!(
                            outcome.battle_move_damage, case.expected_battle_move_damage,
                            "case {index} {}: battle_move_damage",
                            case.label
                        );
                        let target = case.target.expect("advance case must carry a target index");
                        assert_eq!(
                            Some(outcome.rules.battlers[target as usize].status2),
                            case.expected_resulting_status2,
                            "case {index} {}: resulting status2",
                            case.label
                        );
                    }
                    (
                        BattleScriptTypeCurseCursetargetControl::Jump { program_counter },
                        BattleScriptTypeCurseVectorCursetargetControl::Jump {
                            program_counter: expected_pc,
                        },
                    ) => {
                        assert_eq!(
                            *program_counter, expected_pc,
                            "case {index} {}: jump target",
                            case.label
                        );
                        assert_eq!(
                            outcome.battle_move_damage, None,
                            "case {index} {}: jump branch must not stage damage",
                            case.label
                        );
                        assert_eq!(
                            outcome.rules, case.initial,
                            "case {index} {}: jump branch must not mutate rules",
                            case.label
                        );
                    }
                    (actual, expected) => {
                        panic!("case {index} {}: control kind mismatch, got {actual:?}, expected {expected:?}", case.label)
                    }
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
    assert_eq!(BATTLE_SCRIPT_TYPE_CURSE_REGISTRATION_CASES.len(), 17);
    for case in BATTLE_SCRIPT_TYPE_CURSE_REGISTRATION_CASES.iter() {
        assert_eq!(
            case.registered,
            case.bound_opcode_id.is_some(),
            "case {}: registered/bound_opcode_id disagree",
            case.label
        );
        assert_eq!(
            case.registered,
            case.expected_error.is_none(),
            "case {}: registered/error disagree",
            case.label
        );
    }
}

#[test]
fn census_totals_match_case_counts() {
    let jump_category_total: usize = BATTLE_SCRIPT_TYPE_CURSE_JUMP_CATEGORY_CENSUS
        .iter()
        .map(|(_, c)| c)
        .sum();
    let jump_branch_total: usize = BATTLE_SCRIPT_TYPE_CURSE_JUMP_BRANCH_CENSUS
        .iter()
        .map(|(_, c)| c)
        .sum();
    assert_eq!(
        jump_category_total,
        BATTLE_SCRIPT_TYPE_CURSE_JUMP_CASES.len()
    );
    assert_eq!(jump_branch_total, BATTLE_SCRIPT_TYPE_CURSE_JUMP_CASES.len());
    let cursetarget_category_total: usize = BATTLE_SCRIPT_TYPE_CURSE_CURSETARGET_CATEGORY_CENSUS
        .iter()
        .map(|(_, c)| c)
        .sum();
    assert_eq!(
        cursetarget_category_total,
        BATTLE_SCRIPT_TYPE_CURSE_CURSETARGET_CASES.len()
    );
}

#[test]
fn corpus_and_generator_sha256_are_recorded() {
    assert_eq!(BATTLE_SCRIPT_TYPE_CURSE_VECTOR_CORPUS_SHA256.len(), 64);
    assert_eq!(BATTLE_SCRIPT_TYPE_CURSE_VECTOR_GENERATOR_SHA256.len(), 64);
}
