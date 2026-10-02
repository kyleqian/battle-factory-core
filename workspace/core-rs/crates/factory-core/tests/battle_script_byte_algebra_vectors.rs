//! Canonical-TypeScript differential and registration tests for the
//! `B_SCR_OP_BICBYTE` / `B_SCR_OP_ORBYTE` / `B_SCR_OP_BICWORD` byte-algebra
//! trio.

use factory_core::battle_script_byte_algebra::*;
use factory_core::battle_script_byte_algebra_vectors_gen::*;

fn rules_from_vector(rules: ByteAlgebraVectorRules) -> BattleScriptByteAlgebraRules {
    BattleScriptByteAlgebraRules {
        move_result_flags: rules.move_result_flags,
        hit_marker: rules.hit_marker,
        siblings: BattleScriptByteAlgebraSiblings {
            battle_outcome: rules.battle_outcome,
            crit_multiplier: rules.crit_multiplier,
            weather: rules.weather,
        },
    }
}

fn as_vector(rules: BattleScriptByteAlgebraRules) -> ByteAlgebraVectorRules {
    ByteAlgebraVectorRules {
        move_result_flags: rules.move_result_flags,
        hit_marker: rules.hit_marker,
        battle_outcome: rules.siblings.battle_outcome,
        crit_multiplier: rules.siblings.crit_multiplier,
        weather: rules.siblings.weather,
    }
}

fn byte_operands(operands: &[ByteAlgebraOperand]) -> Vec<BattleScriptByteAlgebraOperand<'static>> {
    operands
        .iter()
        .map(|operand| BattleScriptByteAlgebraOperand {
            width_bytes: operand.width_bytes,
            expression: operand.expression,
        })
        .collect()
}

#[test]
fn behavior_cases_match_canonical_ts() {
    assert_eq!(BATTLE_SCRIPT_BYTE_ALGEBRA_BEHAVIOR_CASES.len(), 41);
    for (index, case) in BATTLE_SCRIPT_BYTE_ALGEBRA_BEHAVIOR_CASES.iter().enumerate() {
        assert!(
            case.error.is_none(),
            "case {index} {}: unexpected error in corpus",
            case.label
        );
        let rules = rules_from_vector(case.initial);
        let operands = byte_operands(case.instruction.operands);
        match case.opcode {
            "bicbyte" => {
                let instruction = BattleScriptBicbyteInstruction {
                    opcode_name: case.instruction.opcode_name,
                    program_counter: case.instruction.program_counter,
                    opcode_id: case.instruction.opcode_id,
                    dispatcher: case.instruction.dispatcher,
                    operands: &operands,
                };
                let outcome = apply_battle_script_bicbyte(&instruction, &rules)
                    .unwrap_or_else(|error| panic!("case {index} {}: {error}", case.label));
                match outcome {
                    BattleScriptBicbyteOutcome::Advance { rules: next } => {
                        assert_eq!(case.control_kind, "advance", "case {index} {}", case.label);
                        assert_eq!(
                            Some(as_vector(next)),
                            case.result,
                            "case {index} {}: bicbyte result mismatch",
                            case.label
                        );
                    }
                    BattleScriptBicbyteOutcome::Halt(_) => {
                        panic!("case {index} {}: unexpected bicbyte halt", case.label)
                    }
                }
            }
            "orbyte" => {
                let instruction = BattleScriptOrbyteInstruction {
                    opcode_name: case.instruction.opcode_name,
                    program_counter: case.instruction.program_counter,
                    opcode_id: case.instruction.opcode_id,
                    dispatcher: case.instruction.dispatcher,
                    operands: &operands,
                };
                let next = apply_battle_script_orbyte(&instruction, &rules)
                    .unwrap_or_else(|error| panic!("case {index} {}: {error}", case.label));
                assert_eq!(case.control_kind, "advance", "case {index} {}", case.label);
                assert_eq!(
                    Some(as_vector(next)),
                    case.result,
                    "case {index} {}: orbyte result mismatch",
                    case.label
                );
            }
            "bicword" => {
                let instruction = BattleScriptBicwordInstruction {
                    program_counter: case.instruction.program_counter,
                    opcode_id: case.instruction.opcode_id,
                    pointer_expression: operands[0].expression,
                    value_expression: operands[1].expression,
                };
                match apply_battle_script_bicword(&instruction, &rules) {
                    BattleScriptBicwordOutcome::Advance { rules: next } => {
                        assert_eq!(case.control_kind, "advance", "case {index} {}", case.label);
                        assert_eq!(
                            Some(as_vector(next)),
                            case.result,
                            "case {index} {}: bicword result mismatch",
                            case.label
                        );
                    }
                    BattleScriptBicwordOutcome::Halt(halt) => {
                        assert_eq!(case.control_kind, "halt", "case {index} {}", case.label);
                        assert_eq!(
                            Some(halt.source_construct.as_str()),
                            case.halt_construct,
                            "case {index} {}: halt construct mismatch",
                            case.label
                        );
                        assert_eq!(
                            Some(halt.source_line),
                            case.halt_line,
                            "case {index} {}: halt line mismatch",
                            case.label
                        );
                        assert_eq!(halt.source_file, "battle_script_commands.c");
                    }
                }
            }
            other => panic!("case {index} {}: unknown opcode tag {other}", case.label),
        }
    }
}

#[test]
fn registration_cases_match_canonical_ts() {
    assert_eq!(BATTLE_SCRIPT_BYTE_ALGEBRA_REGISTRATION_CASES.len(), 13);

    let bicbyte_good = BattleScriptBicbyteInstruction {
        opcode_name: BATTLE_SCRIPT_BICBYTE_OPCODE_NAME,
        program_counter: 2,
        opcode_id: BATTLE_SCRIPT_BICBYTE_OPCODE,
        dispatcher: BATTLE_SCRIPT_BICBYTE_DISPATCHER,
        operands: &[
            BattleScriptByteAlgebraOperand { width_bytes: 4, expression: "gMoveResultFlags" },
            BattleScriptByteAlgebraOperand { width_bytes: 1, expression: "MOVE_RESULT_MISSED" },
        ],
    };
    let all_11 = vec![bicbyte_good; 11];
    assert!(register_battle_script_bicbyte(&all_11).is_ok());
    assert!(register_battle_script_bicbyte(&all_11[..10]).is_err());

    for case in BATTLE_SCRIPT_BYTE_ALGEBRA_REGISTRATION_CASES.iter() {
        match (case.opcode, case.label) {
            ("bicbyte", "canonical_all_11")
            | ("orbyte", "canonical_all_11")
            | ("bicword", "canonical_all_3") => {
                assert!(
                    case.error.is_none(),
                    "case {} {}: expected success",
                    case.opcode,
                    case.label
                );
            }
            ("orbyte", "wrong_dispatcher_still_registers") => {
                assert!(
                    case.error.is_none(),
                    "orbyte wrong-dispatcher asymmetry: expected successful registration"
                );
                assert_eq!(case.opcode_id, Some("true"));
            }
            _ => {
                assert!(
                    case.error.is_some(),
                    "case {} {}: expected an error",
                    case.opcode,
                    case.label
                );
            }
        }
    }

    let bicbyte_errors: Vec<&str> = BATTLE_SCRIPT_BYTE_ALGEBRA_REGISTRATION_CASES
        .iter()
        .filter(|c| c.opcode == "bicbyte")
        .filter_map(|c| c.error)
        .collect();
    assert!(bicbyte_errors
        .iter()
        .any(|e| e.starts_with("B_SCR_OP_BICBYTE requires all 11")));
    assert!(bicbyte_errors
        .iter()
        .any(|e| e.starts_with("invalid B_SCR_OP_BICBYTE shape")));
    assert!(bicbyte_errors
        .iter()
        .any(|e| e.starts_with("unknown B_SCR_OP_BICBYTE pointer")));
    assert!(bicbyte_errors
        .iter()
        .any(|e| e.starts_with("unknown B_SCR_OP_BICBYTE mask")));

    let orbyte_errors: Vec<&str> = BATTLE_SCRIPT_BYTE_ALGEBRA_REGISTRATION_CASES
        .iter()
        .filter(|c| c.opcode == "orbyte")
        .filter_map(|c| c.error)
        .collect();
    assert!(orbyte_errors
        .iter()
        .any(|e| e.starts_with("B_SCR_OP_ORBYTE requires all 11")));
    assert!(orbyte_errors
        .iter()
        .any(|e| e.starts_with("unknown B_SCR_OP_ORBYTE pointer")));
    assert!(orbyte_errors
        .iter()
        .any(|e| e.starts_with("unknown B_SCR_OP_ORBYTE value")));

    let bicword_missing = BATTLE_SCRIPT_BYTE_ALGEBRA_REGISTRATION_CASES
        .iter()
        .find(|c| c.opcode == "bicword" && c.label == "missing_opcode")
        .expect("missing_opcode case present");
    assert_eq!(
        bicword_missing.error,
        Some("committed Battle Script program does not emit B_SCR_OP_BICWORD")
    );
}

#[test]
fn census_totals_match_case_counts() {
    let category_total: usize = BATTLE_SCRIPT_BYTE_ALGEBRA_CATEGORY_CENSUS
        .iter()
        .map(|(_, c)| c)
        .sum();
    let control_total: usize = BATTLE_SCRIPT_BYTE_ALGEBRA_CONTROL_CENSUS
        .iter()
        .map(|(_, c)| c)
        .sum();
    let registration_total: usize = BATTLE_SCRIPT_BYTE_ALGEBRA_REGISTRATION_OUTCOME_CENSUS
        .iter()
        .map(|(_, c)| c)
        .sum();
    assert_eq!(
        category_total,
        BATTLE_SCRIPT_BYTE_ALGEBRA_BEHAVIOR_CASES.len()
    );
    assert_eq!(
        control_total,
        BATTLE_SCRIPT_BYTE_ALGEBRA_BEHAVIOR_CASES.len()
    );
    assert_eq!(
        registration_total,
        BATTLE_SCRIPT_BYTE_ALGEBRA_REGISTRATION_CASES.len()
    );
}

#[test]
fn corpus_provenance_is_recorded() {
    assert_eq!(BATTLE_SCRIPT_BYTE_ALGEBRA_VECTOR_CORPUS_SHA256.len(), 64);
    assert_ne!(BATTLE_SCRIPT_BYTE_ALGEBRA_VECTOR_CORPUS_BYTES, 0);
}
