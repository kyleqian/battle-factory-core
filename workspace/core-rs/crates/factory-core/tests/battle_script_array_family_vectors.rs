//! Canonical-TypeScript differential and registration tests for
//! `B_SCR_OP_JUMPIFARRAYEQUAL` / `B_SCR_OP_JUMPIFARRAYNOTEQUAL` /
//! `B_SCR_OP_COPYARRAYWITHINDEX`.

use factory_core::battle_script_array_family::*;
use factory_core::battle_script_array_family_vectors_gen::*;

fn rules_from_vector(rules: ArrayFamilyVectorRules) -> BattleScriptArrayFamilyRules {
    BattleScriptArrayFamilyRules {
        selector_attacker: rules.selector_attacker,
        selector_target: rules.selector_target,
        battlers_count: rules.battlers_count,
        scripting_battler: rules.scripting_battler,
        battle_communication0: rules.battle_communication0,
        battle_communication1: rules.battle_communication1,
        battler_by_turn_order: rules.battler_by_turn_order,
    }
}

fn as_vector(rules: BattleScriptArrayFamilyRules) -> ArrayFamilyVectorRules {
    ArrayFamilyVectorRules {
        selector_attacker: rules.selector_attacker,
        selector_target: rules.selector_target,
        battlers_count: rules.battlers_count,
        scripting_battler: rules.scripting_battler,
        battle_communication0: rules.battle_communication0,
        battle_communication1: rules.battle_communication1,
        battler_by_turn_order: rules.battler_by_turn_order,
    }
}

#[test]
fn notequal_behavior_cases_match_canonical_ts() {
    assert_eq!(BATTLE_SCRIPT_ARRAY_FAMILY_NOTEQUAL_CASES.len(), 19);
    for case in BATTLE_SCRIPT_ARRAY_FAMILY_NOTEQUAL_CASES.iter() {
        let rules = rules_from_vector(case.initial);
        let instruction = BattleScriptJumpifArrayNotEqualInstruction {
            program_counter: case.program_counter,
            opcode_id: case.opcode_id,
            mem1_expression: case.mem1_expression,
            mem2_expression: case.mem2_expression,
            size_expression: case.size_expression,
            ptr_expression: case.ptr_expression,
            resolved_target: case.jump_program_counter.map(|program_counter| {
                BattleScriptArrayFamilyResolvedTarget {
                    expression: case.ptr_expression,
                    program_counter,
                }
            }),
        };
        let outcome = apply_battle_script_jumpifarraynotequal(&instruction, &rules);
        match outcome {
            Ok(BattleScriptJumpifArrayNotEqualOutcome::Advance) => {
                assert_eq!(case.control_kind, "advance", "case {}", case.label);
            }
            Ok(BattleScriptJumpifArrayNotEqualOutcome::Jump { program_counter }) => {
                assert_eq!(case.control_kind, "jump", "case {}", case.label);
                assert_eq!(
                    Some(program_counter),
                    case.jump_program_counter,
                    "case {}: jump target",
                    case.label
                );
            }
            Ok(BattleScriptJumpifArrayNotEqualOutcome::Halt(halt)) => {
                assert_eq!(case.control_kind, "halt", "case {}", case.label);
                assert_eq!(
                    Some(halt.source_construct.as_str()),
                    case.halt_construct,
                    "case {}: halt construct",
                    case.label
                );
                assert_eq!(
                    Some(halt.source_line),
                    case.halt_line,
                    "case {}: halt line",
                    case.label
                );
                assert_eq!(halt.source_file, "battle_script_commands.c");
            }
            Err(error) => {
                assert_eq!(case.control_kind, "error", "case {}", case.label);
                assert_eq!(
                    Some(error.to_string().as_str()),
                    case.error,
                    "case {}: error",
                    case.label
                );
            }
        }
    }
}

#[test]
fn equal_behavior_cases_match_canonical_ts() {
    assert_eq!(BATTLE_SCRIPT_ARRAY_FAMILY_EQUAL_CASES.len(), 5);
    for case in BATTLE_SCRIPT_ARRAY_FAMILY_EQUAL_CASES.iter() {
        let rules = rules_from_vector(case.initial);
        let operands: Vec<BattleScriptArrayFamilyOperand<'_>> = case
            .operands
            .iter()
            .map(|op| BattleScriptArrayFamilyOperand {
                width_bytes: op.width_bytes,
                expression: op.expression,
            })
            .collect();
        let last_expression = case.operands[3].expression;
        let instruction = BattleScriptJumpifArrayEqualInstruction {
            program_counter: case.program_counter,
            operands: &operands,
            resolved_target: case.jump_program_counter.map(|program_counter| {
                BattleScriptArrayFamilyResolvedTarget {
                    expression: last_expression,
                    program_counter,
                }
            }),
        };
        let outcome = apply_battle_script_jumpifarrayequal(&instruction, &rules);
        match outcome {
            Ok(BattleScriptJumpifArrayEqualOutcome::Advance) => {
                assert_eq!(case.control_kind, "advance", "case {}", case.label);
            }
            Ok(BattleScriptJumpifArrayEqualOutcome::Jump { program_counter }) => {
                assert_eq!(case.control_kind, "jump", "case {}", case.label);
                assert_eq!(
                    Some(program_counter),
                    case.jump_program_counter,
                    "case {}: jump target",
                    case.label
                );
            }
            Err(error) => {
                assert_eq!(case.control_kind, "error", "case {}", case.label);
                assert_eq!(
                    Some(error.to_string().as_str()),
                    case.error,
                    "case {}: error",
                    case.label
                );
            }
        }
    }
}

#[test]
fn withindex_behavior_cases_match_canonical_ts() {
    assert_eq!(BATTLE_SCRIPT_ARRAY_FAMILY_WITHINDEX_CASES.len(), 5);
    for case in BATTLE_SCRIPT_ARRAY_FAMILY_WITHINDEX_CASES.iter() {
        let rules = rules_from_vector(case.initial);
        let outcome = apply_battle_script_copyarraywithindex(&rules);
        match outcome {
            Ok(next) => {
                assert_eq!(case.control_kind, "advance", "case {}", case.label);
                assert_eq!(
                    Some(as_vector(next)),
                    case.result,
                    "case {}: result",
                    case.label
                );
            }
            Err(error) => {
                assert_eq!(case.control_kind, "error", "case {}", case.label);
                assert_eq!(
                    Some(error.to_string().as_str()),
                    case.error,
                    "case {}: error",
                    case.label
                );
            }
        }
    }
}

#[test]
fn registration_cases_match_canonical_ts() {
    assert_eq!(BATTLE_SCRIPT_ARRAY_FAMILY_REGISTRATION_CASES.len(), 8);

    for case in BATTLE_SCRIPT_ARRAY_FAMILY_REGISTRATION_CASES.iter() {
        match case.family {
            "notequal" => {
                let present = [BattleScriptArrayFamilyRegistrationInstruction {
                    opcode_name: BATTLE_SCRIPT_JUMPIFARRAYNOTEQUAL_OPCODE_NAME,
                    opcode_id: BATTLE_SCRIPT_JUMPIFARRAYNOTEQUAL_OPCODE,
                    program_counter: 1,
                    dispatcher: BATTLE_SCRIPT_JUMPIFARRAYNOTEQUAL_DISPATCHER,
                    operand_count: 4,
                }];
                if let Some(expected) = case.error {
                    assert_eq!(
                        register_battle_script_jumpifarraynotequal(&[])
                            .unwrap_err()
                            .to_string(),
                        expected,
                        "case {}",
                        case.label
                    );
                } else {
                    assert!(
                        register_battle_script_jumpifarraynotequal(&present).is_ok(),
                        "case {}",
                        case.label
                    );
                }
            }
            "equal" => {
                let one = BattleScriptArrayFamilyRegistrationInstruction {
                    opcode_name: BATTLE_SCRIPT_JUMPIFARRAYEQUAL_OPCODE_NAME,
                    opcode_id: BATTLE_SCRIPT_JUMPIFARRAYEQUAL_OPCODE,
                    program_counter: 7,
                    dispatcher: BATTLE_SCRIPT_JUMPIFARRAYEQUAL_DISPATCHER,
                    operand_count: 4,
                };
                match case.label {
                    "equal_missing" => {
                        assert_eq!(
                            register_battle_script_jumpifarrayequal(&[])
                                .unwrap_err()
                                .to_string(),
                            case.error.unwrap()
                        );
                    }
                    "equal_duplicated" => {
                        assert_eq!(
                            register_battle_script_jumpifarrayequal(&[one, one])
                                .unwrap_err()
                                .to_string(),
                            case.error.unwrap()
                        );
                    }
                    "equal_canonical" => {
                        assert!(register_battle_script_jumpifarrayequal(&[one]).is_ok());
                    }
                    other => panic!("unexpected equal registration label {other}"),
                }
            }
            "withindex" => {
                let one = BattleScriptArrayFamilyRegistrationInstruction {
                    opcode_name: BATTLE_SCRIPT_COPYARRAYWITHINDEX_OPCODE_NAME,
                    opcode_id: BATTLE_SCRIPT_COPYARRAYWITHINDEX_OPCODE,
                    program_counter: 3,
                    dispatcher: BATTLE_SCRIPT_COPYARRAYWITHINDEX_DISPATCHER,
                    operand_count: 4,
                };
                match case.label {
                    "withindex_missing" => {
                        assert_eq!(
                            register_battle_script_copyarraywithindex(&[])
                                .unwrap_err()
                                .to_string(),
                            case.error.unwrap()
                        );
                    }
                    "withindex_duplicated" => {
                        assert_eq!(
                            register_battle_script_copyarraywithindex(&[one, one])
                                .unwrap_err()
                                .to_string(),
                            case.error.unwrap()
                        );
                    }
                    "withindex_canonical" => {
                        assert!(register_battle_script_copyarraywithindex(&[one]).is_ok());
                    }
                    other => panic!("unexpected withindex registration label {other}"),
                }
            }
            other => panic!("unexpected registration family {other}"),
        }
    }
}

#[test]
fn census_totals_match_case_counts() {
    let control_total: usize = BATTLE_SCRIPT_ARRAY_FAMILY_CONTROL_CENSUS
        .iter()
        .map(|(_, c)| c)
        .sum();
    let registration_total: usize = BATTLE_SCRIPT_ARRAY_FAMILY_REGISTRATION_OUTCOME_CENSUS
        .iter()
        .map(|(_, c)| c)
        .sum();
    assert_eq!(
        control_total,
        BATTLE_SCRIPT_ARRAY_FAMILY_NOTEQUAL_CASES.len()
            + BATTLE_SCRIPT_ARRAY_FAMILY_EQUAL_CASES.len()
            + BATTLE_SCRIPT_ARRAY_FAMILY_WITHINDEX_CASES.len()
    );
    assert_eq!(
        registration_total,
        BATTLE_SCRIPT_ARRAY_FAMILY_REGISTRATION_CASES.len()
    );
}

#[test]
fn corpus_provenance_is_recorded() {
    assert_eq!(BATTLE_SCRIPT_ARRAY_FAMILY_VECTOR_CORPUS_SHA256.len(), 64);
    assert_ne!(BATTLE_SCRIPT_ARRAY_FAMILY_VECTOR_CORPUS_BYTES, 0);
}
