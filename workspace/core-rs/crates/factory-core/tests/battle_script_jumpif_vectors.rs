//! Canonical-TypeScript differential, registration, and catalog ratchets for
//! the jumpifbyte/jumpifhalfword/jumpifword compare-and-jump family (M74).
//!
//! Regenerate with `node --experimental-strip-types
//! core-rs/tools/gen-battle-script-jumpif-vectors.mjs`.

use factory_core::battle_script_jumpif::{
    apply_battle_script_jumpifbyte, apply_battle_script_jumpifhalfword,
    apply_battle_script_jumpifword, register_battle_script_jumpifbyte,
    register_battle_script_jumpifhalfword, register_battle_script_jumpifword,
    BattleScriptJumpifControl, BattleScriptJumpifInstruction, BattleScriptJumpifOperand,
    BattleScriptJumpifResolvedTarget, BATTLE_SCRIPT_JUMPIFBYTE_OPCODE,
    BATTLE_SCRIPT_JUMPIFBYTE_OPCODE_NAME, BATTLE_SCRIPT_JUMPIFHALFWORD_OPCODE,
    BATTLE_SCRIPT_JUMPIFHALFWORD_OPCODE_NAME, BATTLE_SCRIPT_JUMPIFWORD_OPCODE,
    BATTLE_SCRIPT_JUMPIFWORD_OPCODE_NAME,
};
use factory_core::battle_script_jumpif_catalog_gen::{
    BATTLE_SCRIPT_JUMPIFBYTE_VALUE_CATALOG, BATTLE_SCRIPT_JUMPIFHALFWORD_VALUE_CATALOG,
    BATTLE_SCRIPT_JUMPIFWORD_VALUE_CATALOG,
};
use factory_core::battle_script_jumpif_vectors_gen::{
    BattleScriptJumpifRegistrationVectorCase, BattleScriptJumpifVectorCase,
    BATTLE_SCRIPT_JUMPIF_BRANCH_CENSUS, BATTLE_SCRIPT_JUMPIF_CALL_SITE_CENSUS,
    BATTLE_SCRIPT_JUMPIF_CASES, BATTLE_SCRIPT_JUMPIF_CATEGORY_CENSUS,
    BATTLE_SCRIPT_JUMPIF_DISTINCT_TRIPLE_CENSUS, BATTLE_SCRIPT_JUMPIF_OPCODE_CENSUS,
    BATTLE_SCRIPT_JUMPIF_REGISTRATION_CASES, BATTLE_SCRIPT_JUMPIF_VECTOR_CORPUS_SHA256,
};

fn opcode_id_and_name(opcode: &str) -> (u8, &'static str) {
    match opcode {
        "byte" => (
            BATTLE_SCRIPT_JUMPIFBYTE_OPCODE,
            BATTLE_SCRIPT_JUMPIFBYTE_OPCODE_NAME,
        ),
        "halfword" => (
            BATTLE_SCRIPT_JUMPIFHALFWORD_OPCODE,
            BATTLE_SCRIPT_JUMPIFHALFWORD_OPCODE_NAME,
        ),
        "word" => (
            BATTLE_SCRIPT_JUMPIFWORD_OPCODE,
            BATTLE_SCRIPT_JUMPIFWORD_OPCODE_NAME,
        ),
        other => panic!("unknown opcode key {other}"),
    }
}

fn convert_operands(
    case: &BattleScriptJumpifVectorCase,
) -> Vec<BattleScriptJumpifOperand<'static>> {
    case.operands
        .iter()
        .map(|operand| BattleScriptJumpifOperand {
            width_bytes: operand.width_bytes,
            expression: operand.expression,
        })
        .collect()
}

fn build_instruction<'a>(
    case: &BattleScriptJumpifVectorCase,
    operands: &'a [BattleScriptJumpifOperand<'static>],
) -> BattleScriptJumpifInstruction<'a> {
    let (opcode_id, opcode_name) = opcode_id_and_name(case.opcode);
    let resolved_target = if operands.len() == 4 {
        case.resolved_target_program_counter.map(|program_counter| {
            BattleScriptJumpifResolvedTarget { expression: operands[3].expression, program_counter }
        })
    } else {
        None
    };
    BattleScriptJumpifInstruction {
        opcode_name,
        opcode_id,
        program_counter: case.program_counter,
        source_statement_line: case.source_statement_line,
        operands,
        resolved_target,
    }
}

#[derive(Debug)]
enum TestOutcome {
    Advance,
    Jump(u32),
    Halt {
        program_counter: u32,
        opcode_id: u8,
        opcode_name: String,
        source_construct: String,
        source_file: String,
        source_line: u32,
    },
    Error(String),
}

fn apply(
    case: &BattleScriptJumpifVectorCase,
    operands: &[BattleScriptJumpifOperand<'static>],
) -> TestOutcome {
    let instruction = build_instruction(case, operands);
    let result = match case.opcode {
        "byte" => apply_battle_script_jumpifbyte(
            &instruction,
            &case.rules,
            &BATTLE_SCRIPT_JUMPIFBYTE_VALUE_CATALOG,
        ),
        "halfword" => apply_battle_script_jumpifhalfword(
            &instruction,
            &case.rules,
            &BATTLE_SCRIPT_JUMPIFHALFWORD_VALUE_CATALOG,
        ),
        "word" => apply_battle_script_jumpifword(
            &instruction,
            &case.rules,
            &BATTLE_SCRIPT_JUMPIFWORD_VALUE_CATALOG,
        ),
        other => panic!("unknown opcode key {other}"),
    };
    match result {
        Ok(BattleScriptJumpifControl::Advance) => TestOutcome::Advance,
        Ok(BattleScriptJumpifControl::Jump { program_counter }) => {
            TestOutcome::Jump(program_counter)
        }
        Ok(BattleScriptJumpifControl::Halt {
            program_counter,
            opcode_id,
            opcode_name,
            source_construct,
            source_file,
            source_line,
        }) => TestOutcome::Halt {
            program_counter,
            opcode_id,
            opcode_name: opcode_name.to_owned(),
            source_construct,
            source_file: source_file.to_owned(),
            source_line,
        },
        Err(error) => TestOutcome::Error(error.to_string()),
    }
}

#[test]
fn complete_control_outcomes_match_canonical_typescript() {
    assert_eq!(BATTLE_SCRIPT_JUMPIF_CASES.len(), 106);
    for (index, case) in BATTLE_SCRIPT_JUMPIF_CASES.iter().enumerate() {
        let operands = convert_operands(case);
        let rules_before = case.rules;
        let outcome = apply(case, &operands);
        assert_eq!(
            case.rules, rules_before,
            "case {index} {} mutated rules",
            case.label
        );

        match (outcome, case.branch) {
            (TestOutcome::Advance, "advance") => {}
            (TestOutcome::Jump(program_counter), "jump") => {
                assert_eq!(
                    Some(program_counter),
                    case.jump_program_counter,
                    "case {index} {} jump target",
                    case.label
                );
            }
            (
                TestOutcome::Halt {
                    program_counter,
                    opcode_id,
                    opcode_name,
                    source_construct,
                    source_file,
                    source_line,
                },
                "halt",
            ) => {
                let (expected_opcode_id, expected_opcode_name) = opcode_id_and_name(case.opcode);
                assert_eq!(
                    program_counter, case.program_counter,
                    "case {index} {} halt pc",
                    case.label
                );
                assert_eq!(
                    opcode_id, expected_opcode_id,
                    "case {index} {} halt opcode id",
                    case.label
                );
                assert_eq!(
                    opcode_name, expected_opcode_name,
                    "case {index} {} halt opcode name",
                    case.label
                );
                assert_eq!(
                    Some(source_construct.as_str()),
                    case.halt_source_construct,
                    "case {index} {} halt source construct",
                    case.label
                );
                assert_eq!(
                    source_file, "data/battle_scripts_1.s",
                    "case {index} {} halt source file",
                    case.label
                );
                assert_eq!(
                    Some(source_line),
                    case.halt_source_line,
                    "case {index} {} halt source line",
                    case.label
                );
            }
            (TestOutcome::Error(message), "error") => {
                assert_eq!(
                    Some(message.as_str()),
                    case.error_message,
                    "case {index} {} error message",
                    case.label
                );
            }
            (actual, branch) => panic!(
                "case {index} {} branch mismatch: expected {branch}, got {actual:?}",
                case.label
            ),
        }
    }
}

#[test]
fn registration_matches_canonical_typescript() {
    assert_eq!(BATTLE_SCRIPT_JUMPIF_REGISTRATION_CASES.len(), 6);
    for case in BATTLE_SCRIPT_JUMPIF_REGISTRATION_CASES {
        execute_registration_case(&case);
    }
}

fn execute_registration_case(case: &BattleScriptJumpifRegistrationVectorCase) {
    let (opcode_id, opcode_name) = opcode_id_and_name(case.opcode);
    let matching_cases: Vec<&BattleScriptJumpifVectorCase> = BATTLE_SCRIPT_JUMPIF_CASES
        .iter()
        .filter(|c| c.opcode == case.opcode)
        .collect();
    let operand_sets: Vec<Vec<BattleScriptJumpifOperand<'static>>> =
        matching_cases.iter().map(|c| convert_operands(c)).collect();
    // Reuse real behavior cases' own operand/pc data for this opcode as a
    // stand-in "committed program slice" -- registration performs no shape
    // validation, so any matching instruction suffices.
    let instructions: Vec<BattleScriptJumpifInstruction<'_>> = if case.present {
        matching_cases
            .iter()
            .zip(operand_sets.iter())
            .map(|(c, operands)| build_instruction(c, operands))
            .collect()
    } else {
        Vec::new()
    };
    let registered = match case.opcode {
        "byte" => register_battle_script_jumpifbyte(&instructions),
        "halfword" => register_battle_script_jumpifhalfword(&instructions),
        "word" => register_battle_script_jumpifword(&instructions),
        other => panic!("unknown opcode key {other}"),
    };
    match (registered, case.expected_opcode_id) {
        (Ok(id), Some(expected)) => {
            assert_eq!(id, expected, "{}", case.label);
            assert_eq!(id, opcode_id, "{}", case.label);
        }
        (Err(error), None) => {
            assert_eq!(
                error.to_string(),
                format!("committed Battle Script program does not emit {opcode_name}"),
                "{}",
                case.label
            );
        }
        (actual, expected) => panic!(
            "{}: mismatch actual={actual:?}, expected={expected:?}",
            case.label
        ),
    }
}

#[test]
fn corpus_censuses_and_hash_are_pinned() {
    assert_eq!(
        BATTLE_SCRIPT_JUMPIF_CALL_SITE_CENSUS,
        [
            ("B_SCR_OP_JUMPIFBYTE", 65),
            ("B_SCR_OP_JUMPIFHALFWORD", 15),
            ("B_SCR_OP_JUMPIFWORD", 37),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_JUMPIF_DISTINCT_TRIPLE_CENSUS,
        [
            ("B_SCR_OP_JUMPIFBYTE", 35),
            ("B_SCR_OP_JUMPIFHALFWORD", 13),
            ("B_SCR_OP_JUMPIFWORD", 20),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_JUMPIF_OPCODE_CENSUS,
        [("byte", 47), ("halfword", 26), ("word", 33)]
    );
    let category_total: usize = BATTLE_SCRIPT_JUMPIF_CATEGORY_CENSUS
        .iter()
        .map(|(_, n)| n)
        .sum();
    let branch_total: usize = BATTLE_SCRIPT_JUMPIF_BRANCH_CENSUS
        .iter()
        .map(|(_, n)| n)
        .sum();
    assert_eq!(category_total, BATTLE_SCRIPT_JUMPIF_CASES.len());
    assert_eq!(branch_total, BATTLE_SCRIPT_JUMPIF_CASES.len());
    assert_eq!(
        BATTLE_SCRIPT_JUMPIF_VECTOR_CORPUS_SHA256,
        "2bae823ca1fcfa4e1b3c028e0cacf75f9462447d136bcd458d3212a0cbf126db"
    );
}
