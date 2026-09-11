//! Canonical-TypeScript differential and registration tests for the
//! SETMULTIHIT / DECREMENTMULTIHIT / SETMULTIHITCOUNTER / INITMULTIHITSTRING
//! / JUMPIFHASNOHP quintet.

use factory_core::battle_script_multihit_family::*;
use factory_core::battle_script_multihit_family_vectors_gen::*;

fn rules_from_vector(rules: MultihitVectorRules) -> BattleScriptMultiHitFamilyRules {
    BattleScriptMultiHitFamilyRules {
        multi_hit_counter: rules.multi_hit_counter,
        multi_hit_string_counter: rules.multi_hit_string_counter,
        selector_attacker: rules.selector_attacker,
        selector_target: rules.selector_target,
        selector_effect_battler: rules.selector_effect_battler,
        selector_fainted: rules.selector_fainted,
        scripting_battler: rules.scripting_battler,
        battlers_hp: rules.battlers_hp,
    }
}

fn operands_from_vector(
    operands: &[MultihitOperandVector],
) -> Vec<BattleScriptMultiHitFamilyOperand<'_>> {
    operands
        .iter()
        .map(|o| BattleScriptMultiHitFamilyOperand {
            width_bytes: o.width_bytes,
            expression: o.expression,
        })
        .collect()
}

#[test]
fn setmultihit_cases_match_canonical_ts() {
    assert_eq!(BATTLE_SCRIPT_SETMULTIHIT_CASES.len(), 7);
    for case in BATTLE_SCRIPT_SETMULTIHIT_CASES.iter() {
        let rules = rules_from_vector(case.initial);
        let operands = operands_from_vector(case.operands);
        let instruction = BattleScriptSetMultiHitInstruction {
            program_counter: case.program_counter,
            opcode_id: case.opcode_id,
            operands: &operands,
        };
        let outcome = apply_battle_script_setmultihit(&rules, &instruction);
        match outcome {
            BattleScriptSetMultiHitOutcome::Advance { rules } => {
                assert_eq!(case.control_kind, "advance", "case {}", case.label);
                assert_eq!(
                    Some(rules.multi_hit_counter),
                    case.result_counter,
                    "case {}",
                    case.label
                );
            }
            BattleScriptSetMultiHitOutcome::Block(block) => {
                assert_eq!(case.control_kind, "block", "case {}", case.label);
                assert_eq!(
                    Some(block.operand_expression.as_str()),
                    case.block_operand_expression,
                    "case {}",
                    case.label
                );
                assert_eq!(block.port, "resolve-byte");
            }
            BattleScriptSetMultiHitOutcome::Halt(halt) => {
                assert_eq!(case.control_kind, "halt", "case {}", case.label);
                assert_eq!(
                    Some(halt.operand_expression.as_str()),
                    case.halt_operand_expression,
                    "case {}",
                    case.label
                );
                assert_eq!(
                    Some(halt.received.as_str()),
                    case.halt_received,
                    "case {}",
                    case.label
                );
                assert_eq!(halt.expected, "u8");
            }
        }
    }
}

#[test]
fn decrementmultihit_cases_match_canonical_ts() {
    assert_eq!(BATTLE_SCRIPT_DECREMENTMULTIHIT_CASES.len(), 5);
    for case in BATTLE_SCRIPT_DECREMENTMULTIHIT_CASES.iter() {
        let rules = BattleScriptMultiHitFamilyRules {
            multi_hit_counter: case.initial_counter,
            multi_hit_string_counter: 0,
            selector_attacker: Some(0),
            selector_target: Some(1),
            selector_effect_battler: Some(2),
            selector_fainted: None,
            scripting_battler: 0,
            battlers_hp: [100, 100, 100, 100],
        };
        let operands = operands_from_vector(case.operands);
        let resolved_target = case
            .jump_program_counter
            .map(|program_counter| BattleScriptMultiHitFamilyResolvedTarget { program_counter });
        let instruction = BattleScriptDecrementMultiHitInstruction {
            program_counter: case.program_counter,
            operands: &operands,
            resolved_target,
        };
        let outcome = apply_battle_script_decrementmultihit(&rules, &instruction);
        match outcome {
            BattleScriptDecrementMultiHitOutcome::Advance { rules } => {
                assert_eq!(case.control_kind, "advance", "case {}", case.label);
                assert_eq!(
                    rules.multi_hit_counter, case.result_counter,
                    "case {}",
                    case.label
                );
            }
            BattleScriptDecrementMultiHitOutcome::Jump { program_counter, rules } => {
                assert_eq!(case.control_kind, "jump", "case {}", case.label);
                assert_eq!(
                    rules.multi_hit_counter, case.result_counter,
                    "case {}",
                    case.label
                );
                assert_eq!(
                    Some(program_counter),
                    case.jump_program_counter,
                    "case {}",
                    case.label
                );
            }
            BattleScriptDecrementMultiHitOutcome::Halt { reason, rules } => {
                assert_eq!(case.control_kind, "halt", "case {}", case.label);
                assert_eq!(
                    rules.multi_hit_counter, case.result_counter,
                    "case {}: decrement survives halt",
                    case.label
                );
                assert_eq!(
                    Some(reason.expression.as_str()),
                    case.halt_expression,
                    "case {}",
                    case.label
                );
            }
        }
    }
}

#[test]
fn setmultihitcounter_cases_match_canonical_ts() {
    assert_eq!(BATTLE_SCRIPT_SETMULTIHITCOUNTER_CASES.len(), 5);
    for case in BATTLE_SCRIPT_SETMULTIHITCOUNTER_CASES.iter() {
        let rules = rules_from_vector(case.initial);
        let operands = operands_from_vector(case.operands);
        let instruction = BattleScriptSetMultiHitCounterInstruction {
            program_counter: case.program_counter,
            opcode_id: case.opcode_id,
            operands: &operands,
            source_label: case.source_label,
            source_statement_line: case.source_statement_line,
        };
        let rng = BattleScriptMultiHitFamilyRngState { value: case.rng_seed, calls: 0 };
        let outcome = apply_battle_script_setmultihitcounter(&rules, rng, &instruction);
        match outcome {
            BattleScriptSetMultiHitCounterOutcome::Advance { rules, rng, draws } => {
                assert_eq!(case.control_kind, "advance", "case {}", case.label);
                assert_eq!(
                    Some(rules.multi_hit_counter),
                    case.result_counter,
                    "case {}",
                    case.label
                );
                assert_eq!(Some(rng.value), case.rng_after_value, "case {}", case.label);
                assert_eq!(Some(rng.calls), case.rng_after_calls, "case {}", case.label);
                assert_eq!(
                    draws.len(),
                    case.draws.len(),
                    "case {}: draw count",
                    case.label
                );
                for (draw, expected) in draws.iter().zip(case.draws.iter()) {
                    assert_eq!(draw.call, expected.call, "case {}: draw call", case.label);
                    assert_eq!(
                        draw.reason, expected.reason,
                        "case {}: draw reason",
                        case.label
                    );
                    assert_eq!(
                        draw.before, expected.before,
                        "case {}: draw before",
                        case.label
                    );
                    assert_eq!(
                        draw.after, expected.after,
                        "case {}: draw after",
                        case.label
                    );
                    assert_eq!(
                        draw.random_value, expected.random_value,
                        "case {}: draw random_value",
                        case.label
                    );
                    assert_eq!(
                        draw.provenance.program_counter, expected.program_counter,
                        "case {}",
                        case.label
                    );
                    assert_eq!(
                        draw.provenance.opcode_id, expected.opcode_id,
                        "case {}",
                        case.label
                    );
                    assert_eq!(
                        draw.provenance.opcode_name, expected.opcode_name,
                        "case {}",
                        case.label
                    );
                    assert_eq!(
                        draw.provenance.dispatcher, expected.dispatcher,
                        "case {}",
                        case.label
                    );
                    assert_eq!(
                        draw.provenance.source_label, expected.source_label,
                        "case {}",
                        case.label
                    );
                    assert_eq!(
                        draw.provenance.source_statement_line, expected.source_statement_line,
                        "case {}",
                        case.label
                    );
                }
            }
            BattleScriptSetMultiHitCounterOutcome::Block(block) => {
                assert_eq!(case.control_kind, "block", "case {}", case.label);
                assert_eq!(
                    Some(block.operand_expression.as_str()),
                    case.block_operand_expression,
                    "case {}",
                    case.label
                );
            }
            BattleScriptSetMultiHitCounterOutcome::Halt(halt) => {
                assert_eq!(case.control_kind, "halt", "case {}", case.label);
                assert_eq!(
                    Some(halt.operand_expression.as_str()),
                    case.halt_operand_expression,
                    "case {}",
                    case.label
                );
                assert_eq!(
                    Some(halt.received.as_str()),
                    case.halt_received,
                    "case {}",
                    case.label
                );
            }
        }
    }
}

#[test]
fn setmultihitcounter_draw_shapes_are_represented() {
    let shapes: Vec<usize> = BATTLE_SCRIPT_SETMULTIHITCOUNTER_CASES
        .iter()
        .filter(|c| c.control_kind == "advance")
        .map(|c| c.draws.len())
        .collect();
    assert!(shapes.contains(&0), "expected a zero-draw case");
    assert!(shapes.contains(&1), "expected a one-draw case");
    assert!(shapes.contains(&2), "expected a two-draw case");
}

#[test]
fn initmultihitstring_cases_match_canonical_ts() {
    assert_eq!(BATTLE_SCRIPT_INITMULTIHITSTRING_CASES.len(), 4);
    for case in BATTLE_SCRIPT_INITMULTIHITSTRING_CASES.iter() {
        let rules = BattleScriptMultiHitFamilyRules {
            multi_hit_counter: case.initial_counter,
            multi_hit_string_counter: case.initial_string_counter,
            selector_attacker: Some(0),
            selector_target: Some(1),
            selector_effect_battler: Some(2),
            selector_fainted: None,
            scripting_battler: 0,
            battlers_hp: [100, 100, 100, 100],
        };
        assert_ne!(
            case.initial_string_counter, 0,
            "case {}: fixture should start nonzero",
            case.label
        );
        let next = apply_battle_script_initmultihitstring(&rules);
        assert_eq!(
            next.multi_hit_string_counter, case.result_string_counter,
            "case {}",
            case.label
        );
        assert_eq!(next.multi_hit_string_counter, 0, "case {}", case.label);
        assert_eq!(
            next.multi_hit_counter, case.initial_counter,
            "case {}: counter untouched",
            case.label
        );
    }
}

#[test]
fn jumpifhasnohp_cases_match_canonical_ts() {
    assert_eq!(BATTLE_SCRIPT_JUMPIFHASNOHP_CASES.len(), 13);
    for case in BATTLE_SCRIPT_JUMPIFHASNOHP_CASES.iter() {
        let rules = rules_from_vector(case.initial);
        let operands = operands_from_vector(case.operands);
        let resolved_target = case
            .jump_program_counter
            .map(|program_counter| BattleScriptMultiHitFamilyResolvedTarget { program_counter });
        let instruction = BattleScriptJumpifHasNoHpInstruction {
            program_counter: case.program_counter,
            opcode_id: case.opcode_id,
            operands: &operands,
            resolved_target,
        };
        let outcome = apply_battle_script_jumpifhasnohp(&rules, &instruction);
        match outcome {
            Ok(BattleScriptJumpifHasNoHpOutcome::Advance) => {
                assert_eq!(case.control_kind, "advance", "case {}", case.label);
            }
            Ok(BattleScriptJumpifHasNoHpOutcome::Jump { program_counter }) => {
                assert_eq!(case.control_kind, "jump", "case {}", case.label);
                assert_eq!(
                    Some(program_counter),
                    case.jump_program_counter,
                    "case {}",
                    case.label
                );
            }
            Ok(BattleScriptJumpifHasNoHpOutcome::Block(block)) => {
                assert_eq!(case.control_kind, "block", "case {}", case.label);
                assert_eq!(
                    Some(block.operand_expression.as_str()),
                    case.block_operand_expression,
                    "case {}",
                    case.label
                );
                assert_eq!(block.port, "resolve-battler-for-battle-script");
            }
            Ok(BattleScriptJumpifHasNoHpOutcome::Halt(halt)) => {
                assert_eq!(case.control_kind, "halt", "case {}", case.label);
                assert_eq!(
                    Some(halt.operand_expression.as_str()),
                    case.halt_operand_expression,
                    "case {}",
                    case.label
                );
                assert_eq!(
                    Some(halt.received.as_str()),
                    case.halt_received,
                    "case {}",
                    case.label
                );
            }
            Err(error) => {
                assert_eq!(case.control_kind, "error", "case {}", case.label);
                assert_eq!(
                    Some(error.to_string().as_str()),
                    case.error,
                    "case {}",
                    case.label
                );
            }
        }
    }
}

#[test]
fn registration_cases_match_canonical_ts() {
    assert_eq!(BATTLE_SCRIPT_MULTIHIT_FAMILY_REGISTRATION_CASES.len(), 7);
    for case in BATTLE_SCRIPT_MULTIHIT_FAMILY_REGISTRATION_CASES.iter() {
        let present = [BattleScriptMultiHitFamilyRegistrationInstruction {
            opcode_name: case.opcode_name,
            opcode_id: 0x99,
        }];
        if let Some(expected) = case.error {
            assert_eq!(
                register_battle_script_multihit_family_opcode(&[], case.opcode_name)
                    .unwrap_err()
                    .to_string(),
                expected,
                "case {}",
                case.label
            );
        } else {
            assert_eq!(
                register_battle_script_multihit_family_opcode(&present, case.opcode_name).unwrap(),
                0x99,
                "case {}",
                case.label
            );
        }
    }
}

#[test]
fn census_totals_match_case_counts() {
    let control_total: usize = BATTLE_SCRIPT_MULTIHIT_FAMILY_CONTROL_CENSUS
        .iter()
        .map(|(_, c)| c)
        .sum();
    let registration_total: usize = BATTLE_SCRIPT_MULTIHIT_FAMILY_REGISTRATION_OUTCOME_CENSUS
        .iter()
        .map(|(_, c)| c)
        .sum();
    assert_eq!(
        control_total,
        BATTLE_SCRIPT_SETMULTIHIT_CASES.len()
            + BATTLE_SCRIPT_DECREMENTMULTIHIT_CASES.len()
            + BATTLE_SCRIPT_SETMULTIHITCOUNTER_CASES.len()
            + BATTLE_SCRIPT_JUMPIFHASNOHP_CASES.len()
    );
    assert_eq!(
        registration_total,
        BATTLE_SCRIPT_MULTIHIT_FAMILY_REGISTRATION_CASES.len()
    );
}

#[test]
fn corpus_provenance_is_recorded() {
    assert_eq!(BATTLE_SCRIPT_MULTIHIT_FAMILY_VECTOR_CORPUS_SHA256.len(), 64);
    assert_ne!(BATTLE_SCRIPT_MULTIHIT_FAMILY_VECTOR_CORPUS_BYTES, 0);
    let total = BATTLE_SCRIPT_SETMULTIHIT_CASES.len()
        + BATTLE_SCRIPT_DECREMENTMULTIHIT_CASES.len()
        + BATTLE_SCRIPT_SETMULTIHITCOUNTER_CASES.len()
        + BATTLE_SCRIPT_INITMULTIHITSTRING_CASES.len()
        + BATTLE_SCRIPT_JUMPIFHASNOHP_CASES.len();
    assert!(
        (34..=44).contains(&total),
        "behavior case count {total} outside the 34-44 target band"
    );
}
