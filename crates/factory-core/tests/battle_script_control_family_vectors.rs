//! Canonical-TypeScript differential and registration tests for the
//! machine-control family: GOTO / RETURN / END / END2 / END3 / CALL.

use factory_core::battle_script_control_family::*;
use factory_core::battle_script_control_family_vectors_gen::*;

fn jump_instruction_from_case(
    case: &ControlFamilyBehaviorVectorCase,
) -> (
    Vec<BattleScriptControlFamilyOperand<'static>>,
    Option<BattleScriptControlFamilyResolvedTarget>,
) {
    let count = case
        .operand_count
        .expect("goto/call case must carry operand_count");
    let mut operands = Vec::new();
    if count >= 1 {
        operands.push(BattleScriptControlFamilyOperand {
            width_bytes: case.operand0_width_bytes.unwrap(),
            expression: case.operand0_expression.unwrap(),
        });
    }
    for _ in 1..count {
        operands
            .push(BattleScriptControlFamilyOperand { width_bytes: 4, expression: "ExtraOperand" });
    }
    let resolved_target = case
        .resolved_target_program_counter
        .map(|program_counter| BattleScriptControlFamilyResolvedTarget { program_counter });
    (operands, resolved_target)
}

fn assert_outcome_matches_case(
    case: &ControlFamilyBehaviorVectorCase,
    next: BattleScriptControlFamilyCursor,
    outcome: BattleScriptControlFamilyOutcome,
) {
    assert_eq!(
        next.program_counter, case.result_program_counter,
        "case {}: pc",
        case.label
    );
    assert_eq!(
        next.call_stack, case.result_call_stack,
        "case {}: call stack",
        case.label
    );
    match case.halt_kind {
        None => assert!(
            !matches!(outcome, BattleScriptControlFamilyOutcome::Halt(_)),
            "case {}: expected no halt, got {outcome:?}",
            case.label
        ),
        Some("invalid-control-target") => match outcome {
            BattleScriptControlFamilyOutcome::Halt(
                BattleScriptControlFamilyHalt::InvalidControlTarget { program_counter, expression },
            ) => {
                assert_eq!(
                    program_counter, case.result_program_counter,
                    "case {}: halt pc",
                    case.label
                );
                assert_eq!(
                    Some(expression.as_str()),
                    case.halt_expression,
                    "case {}: halt expression",
                    case.label
                );
            }
            other => panic!(
                "case {}: expected invalid-control-target halt, got {other:?}",
                case.label
            ),
        },
        Some("return-stack-underflow") => match outcome {
            BattleScriptControlFamilyOutcome::Halt(
                BattleScriptControlFamilyHalt::ReturnStackUnderflow { program_counter },
            ) => assert_eq!(
                program_counter, case.result_program_counter,
                "case {}: halt pc",
                case.label
            ),
            other => panic!(
                "case {}: expected return-stack-underflow halt, got {other:?}",
                case.label
            ),
        },
        Some("terminal") => match outcome {
            BattleScriptControlFamilyOutcome::Halt(BattleScriptControlFamilyHalt::Terminal {
                program_counter,
                opcode_id,
                opcode_name,
            }) => {
                assert_eq!(
                    program_counter, case.result_program_counter,
                    "case {}: halt pc",
                    case.label
                );
                assert_eq!(
                    Some(opcode_id),
                    case.halt_opcode_id,
                    "case {}: halt opcode id",
                    case.label
                );
                assert_eq!(
                    Some(opcode_name),
                    case.halt_opcode_name,
                    "case {}: halt opcode name",
                    case.label
                );
            }
            other => panic!("case {}: expected terminal halt, got {other:?}", case.label),
        },
        Some("end3") => match outcome {
            BattleScriptControlFamilyOutcome::Halt(BattleScriptControlFamilyHalt::End3 {
                program_counter,
                opcode_id,
                opcode_name,
            }) => {
                assert_eq!(
                    program_counter, case.result_program_counter,
                    "case {}: halt pc",
                    case.label
                );
                assert_eq!(
                    Some(opcode_id),
                    case.halt_opcode_id,
                    "case {}: halt opcode id",
                    case.label
                );
                assert_eq!(
                    Some(opcode_name),
                    case.halt_opcode_name,
                    "case {}: halt opcode name",
                    case.label
                );
            }
            other => panic!("case {}: expected end3 halt, got {other:?}", case.label),
        },
        Some(other_kind) => panic!("case {}: unexpected halt kind {other_kind}", case.label),
    }
}

#[test]
fn behavior_cases_match_canonical_ts() {
    assert_eq!(BATTLE_SCRIPT_CONTROL_FAMILY_BEHAVIOR_CASES.len(), 27);
    for case in BATTLE_SCRIPT_CONTROL_FAMILY_BEHAVIOR_CASES.iter() {
        let cursor = BattleScriptControlFamilyCursor {
            program_counter: case.initial_program_counter,
            call_stack: case.initial_call_stack.to_vec(),
        };
        match case.kind {
            "goto" => {
                let (operands, resolved_target) = jump_instruction_from_case(case);
                let instruction = BattleScriptControlFamilyJumpInstruction {
                    operands: &operands,
                    resolved_target,
                };
                let (next, outcome) = apply_battle_script_goto(&instruction, &cursor);
                assert_outcome_matches_case(case, next, outcome);
            }
            "call" => {
                let (operands, resolved_target) = jump_instruction_from_case(case);
                let instruction = BattleScriptControlFamilyJumpInstruction {
                    operands: &operands,
                    resolved_target,
                };
                let (next, outcome) = apply_battle_script_call(&instruction, &cursor);
                assert_outcome_matches_case(case, next, outcome);
            }
            "return" => {
                let (next, outcome) = apply_battle_script_return(&cursor);
                assert_outcome_matches_case(case, next, outcome);
            }
            "end" | "end2" => {
                let instruction = BattleScriptControlFamilyTerminalInstruction {
                    opcode_id: case.opcode_id,
                    opcode_name: case.opcode_name,
                };
                let (next, outcome) = apply_battle_script_terminal(&instruction, &cursor);
                assert_outcome_matches_case(case, next, outcome);
            }
            "end3" => {
                let instruction = BattleScriptControlFamilyTerminalInstruction {
                    opcode_id: case.opcode_id,
                    opcode_name: case.opcode_name,
                };
                let (next, outcome) = apply_battle_script_end3(&instruction, &cursor);
                assert_outcome_matches_case(case, next, outcome);
            }
            other => panic!("unexpected case kind {other}"),
        }
    }
}

#[test]
fn end3_nonempty_matches_return_equivalence_case() {
    let end3_case = BATTLE_SCRIPT_CONTROL_FAMILY_BEHAVIOR_CASES
        .iter()
        .find(|c| c.label == "end3_nonempty_call_stack_matches_return")
        .unwrap();
    let return_case = BATTLE_SCRIPT_CONTROL_FAMILY_BEHAVIOR_CASES
        .iter()
        .find(|c| c.label == "return_for_end3_equivalence")
        .unwrap();
    assert_eq!(
        end3_case.result_program_counter,
        return_case.result_program_counter
    );
    assert_eq!(end3_case.result_call_stack, return_case.result_call_stack);
}

#[test]
fn goto_resolution_table_covers_every_committed_site() {
    assert_eq!(BATTLE_SCRIPT_CONTROL_FAMILY_GOTO_RESOLUTION_ROWS.len(), 285);
    for row in BATTLE_SCRIPT_CONTROL_FAMILY_GOTO_RESOLUTION_ROWS.iter() {
        assert_eq!(
            row.control_kind, "jump",
            "row at pc {}",
            row.program_counter
        );
        assert!(row.target_program_counter.is_some());
        assert!(row.halt_expression.is_none());
    }
}

#[test]
fn call_resolution_table_covers_every_committed_site() {
    assert_eq!(BATTLE_SCRIPT_CONTROL_FAMILY_CALL_RESOLUTION_ROWS.len(), 29);
    for row in BATTLE_SCRIPT_CONTROL_FAMILY_CALL_RESOLUTION_ROWS.iter() {
        assert_eq!(
            row.control_kind, "call",
            "row at pc {}",
            row.program_counter
        );
        assert_eq!(
            row.pushed_return_program_counter,
            Some(row.program_counter + 1)
        );
        assert!(row.halt_expression.is_none());
    }
}

#[test]
fn site_census_tables_match_committed_counts() {
    assert_eq!(
        BATTLE_SCRIPT_CONTROL_FAMILY_RETURN_SITE_CENSUS
            .program_counters
            .len(),
        73
    );
    assert_eq!(
        BATTLE_SCRIPT_CONTROL_FAMILY_RETURN_SITE_CENSUS.opcode_id,
        BATTLE_SCRIPT_RETURN_OPCODE
    );
    assert_eq!(
        BATTLE_SCRIPT_CONTROL_FAMILY_END_SITE_CENSUS
            .program_counters
            .len(),
        13
    );
    assert_eq!(
        BATTLE_SCRIPT_CONTROL_FAMILY_END_SITE_CENSUS.opcode_id,
        BATTLE_SCRIPT_END_OPCODE
    );
    assert_eq!(
        BATTLE_SCRIPT_CONTROL_FAMILY_END2_SITE_CENSUS
            .program_counters
            .len(),
        64
    );
    assert_eq!(
        BATTLE_SCRIPT_CONTROL_FAMILY_END2_SITE_CENSUS.opcode_id,
        BATTLE_SCRIPT_END2_OPCODE
    );
    assert_eq!(
        BATTLE_SCRIPT_CONTROL_FAMILY_END3_SITE_CENSUS
            .program_counters
            .len(),
        10
    );
    assert_eq!(
        BATTLE_SCRIPT_CONTROL_FAMILY_END3_SITE_CENSUS.opcode_id,
        BATTLE_SCRIPT_END3_OPCODE
    );
    for table in [
        &BATTLE_SCRIPT_CONTROL_FAMILY_RETURN_SITE_CENSUS,
        &BATTLE_SCRIPT_CONTROL_FAMILY_END_SITE_CENSUS,
        &BATTLE_SCRIPT_CONTROL_FAMILY_END2_SITE_CENSUS,
        &BATTLE_SCRIPT_CONTROL_FAMILY_END3_SITE_CENSUS,
    ] {
        let mut sorted = table.program_counters.to_vec();
        sorted.sort_unstable();
        assert_eq!(
            sorted, table.program_counters,
            "site census table must already be sorted"
        );
    }
}

#[test]
fn registration_cases_match_canonical_ts() {
    assert_eq!(BATTLE_SCRIPT_CONTROL_FAMILY_REGISTRATION_CASES.len(), 8);
    let all_six = [
        BattleScriptControlFamilyRegistrationInstruction {
            opcode_name: BATTLE_SCRIPT_GOTO_OPCODE_NAME,
            opcode_id: BATTLE_SCRIPT_GOTO_OPCODE,
        },
        BattleScriptControlFamilyRegistrationInstruction {
            opcode_name: BATTLE_SCRIPT_RETURN_OPCODE_NAME,
            opcode_id: BATTLE_SCRIPT_RETURN_OPCODE,
        },
        BattleScriptControlFamilyRegistrationInstruction {
            opcode_name: BATTLE_SCRIPT_END_OPCODE_NAME,
            opcode_id: BATTLE_SCRIPT_END_OPCODE,
        },
        BattleScriptControlFamilyRegistrationInstruction {
            opcode_name: BATTLE_SCRIPT_END2_OPCODE_NAME,
            opcode_id: BATTLE_SCRIPT_END2_OPCODE,
        },
        BattleScriptControlFamilyRegistrationInstruction {
            opcode_name: BATTLE_SCRIPT_END3_OPCODE_NAME,
            opcode_id: BATTLE_SCRIPT_END3_OPCODE,
        },
        BattleScriptControlFamilyRegistrationInstruction {
            opcode_name: BATTLE_SCRIPT_CALL_OPCODE_NAME,
            opcode_id: BATTLE_SCRIPT_CALL_OPCODE,
        },
    ];

    for case in BATTLE_SCRIPT_CONTROL_FAMILY_REGISTRATION_CASES.iter() {
        match case.label {
            "goto_canonical" => assert_eq!(
                register_battle_script_control_opcode(&all_six, BATTLE_SCRIPT_GOTO_OPCODE_NAME)
                    .unwrap(),
                BATTLE_SCRIPT_GOTO_OPCODE
            ),
            "return_canonical" => assert_eq!(
                register_battle_script_control_opcode(&all_six, BATTLE_SCRIPT_RETURN_OPCODE_NAME)
                    .unwrap(),
                BATTLE_SCRIPT_RETURN_OPCODE
            ),
            "end_canonical" => assert_eq!(
                register_battle_script_control_opcode(&all_six, BATTLE_SCRIPT_END_OPCODE_NAME)
                    .unwrap(),
                BATTLE_SCRIPT_END_OPCODE
            ),
            "end2_canonical" => assert_eq!(
                register_battle_script_control_opcode(&all_six, BATTLE_SCRIPT_END2_OPCODE_NAME)
                    .unwrap(),
                BATTLE_SCRIPT_END2_OPCODE
            ),
            "end3_canonical" => assert_eq!(
                register_battle_script_control_opcode(&all_six, BATTLE_SCRIPT_END3_OPCODE_NAME)
                    .unwrap(),
                BATTLE_SCRIPT_END3_OPCODE
            ),
            "call_canonical" => assert_eq!(
                register_battle_script_control_opcode(&all_six, BATTLE_SCRIPT_CALL_OPCODE_NAME)
                    .unwrap(),
                BATTLE_SCRIPT_CALL_OPCODE
            ),
            "goto_missing" => assert_eq!(
                register_battle_script_control_opcode(&[], BATTLE_SCRIPT_GOTO_OPCODE_NAME)
                    .unwrap_err()
                    .to_string(),
                case.error.unwrap()
            ),
            "end3_missing" => assert_eq!(
                register_battle_script_control_opcode(&[], BATTLE_SCRIPT_END3_OPCODE_NAME)
                    .unwrap_err()
                    .to_string(),
                case.error.unwrap()
            ),
            other => panic!("unexpected registration label {other}"),
        }
    }
}

#[test]
fn census_totals_match_case_counts() {
    let behavior_total: usize = BATTLE_SCRIPT_CONTROL_FAMILY_DOMAIN_CENSUS
        .iter()
        .find(|(name, _)| *name == "behavior-cases")
        .map(|(_, count)| *count)
        .unwrap();
    assert_eq!(
        behavior_total,
        BATTLE_SCRIPT_CONTROL_FAMILY_BEHAVIOR_CASES.len()
    );
    let registration_total: usize = BATTLE_SCRIPT_CONTROL_FAMILY_REGISTRATION_OUTCOME_CENSUS
        .iter()
        .map(|(_, c)| c)
        .sum();
    assert_eq!(
        registration_total,
        BATTLE_SCRIPT_CONTROL_FAMILY_REGISTRATION_CASES.len()
    );
}

#[test]
fn corpus_provenance_is_recorded() {
    assert_eq!(BATTLE_SCRIPT_CONTROL_FAMILY_VECTOR_CORPUS_SHA256.len(), 64);
    assert_ne!(BATTLE_SCRIPT_CONTROL_FAMILY_VECTOR_CORPUS_BYTES, 0);
}
