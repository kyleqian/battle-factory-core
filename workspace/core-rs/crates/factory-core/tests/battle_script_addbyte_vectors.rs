//! Canonical-TypeScript differential and registration tests for
//! `B_SCR_OP_ADDBYTE`.

use factory_core::battle_script_addbyte::*;
use factory_core::battle_script_addbyte_vectors_gen::*;

fn rules_from_vector(rules: AddbyteVectorRules) -> BattleScriptAddbyteRules {
    BattleScriptAddbyteRules {
        battle_communication0: rules.battle_communication0,
        battle_communication1: rules.battle_communication1,
        battle_move_damage: rules.battle_move_damage,
        dmg_multiplier: 1,
        move_effect_byte: rules.move_effect_byte,
        move_result_flags: 0,
        multistring_chooser: rules.multistring_chooser,
        selector_target: rules.target.map(|value| value as u8),
        scripting_battler: rules.scripting_battler,
        anim_targets_hit: 0,
        anim_turn: 0,
        give_exp_state: 0,
        learn_move_state: 0,
        lvl_box_state: 0,
        moveend_state: 0,
        multi_hit_effect: 0,
        stat_changer: rules.stat_changer,
        stat_anim_played: 0,
        triple_kick_power: rules.triple_kick_power,
        two_turn_stringid: rules.two_turn_stringid,
        multi_hit_string_counter: rules.multi_hit_string_counter,
    }
}

fn as_vector(rules: BattleScriptAddbyteRules) -> AddbyteVectorRules {
    AddbyteVectorRules {
        battle_communication0: rules.battle_communication0,
        battle_communication1: rules.battle_communication1,
        battle_move_damage: rules.battle_move_damage,
        move_effect_byte: rules.move_effect_byte,
        multistring_chooser: rules.multistring_chooser,
        target: rules.selector_target.map(i32::from),
        scripting_battler: rules.scripting_battler,
        stat_changer: rules.stat_changer,
        triple_kick_power: rules.triple_kick_power,
        two_turn_stringid: rules.two_turn_stringid,
        multi_hit_string_counter: rules.multi_hit_string_counter,
    }
}

#[test]
fn behavior_cases_match_canonical_ts() {
    assert_eq!(BATTLE_SCRIPT_ADDBYTE_BEHAVIOR_CASES.len(), 23);
    for (index, case) in BATTLE_SCRIPT_ADDBYTE_BEHAVIOR_CASES.iter().enumerate() {
        let rules = rules_from_vector(case.initial);
        let instruction = BattleScriptAddbyteInstruction {
            program_counter: case.instruction.program_counter,
            opcode_id: case.instruction.opcode_id,
            pointer_expression: case.instruction.operands[0].expression,
            byte_expression: case.instruction.operands[1].expression,
        };
        let outcome = apply_battle_script_addbyte(&instruction, &rules);
        match outcome {
            Ok(BattleScriptAddbyteOutcome::Advance { rules: next }) => {
                assert_eq!(case.control_kind, "advance", "case {index} {}", case.label);
                assert_eq!(
                    Some(as_vector(next)),
                    case.result,
                    "case {index} {}: result mismatch",
                    case.label
                );
            }
            Ok(BattleScriptAddbyteOutcome::Halt(halt)) => {
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
            Err(error) => {
                assert_eq!(case.control_kind, "error", "case {index} {}", case.label);
                assert_eq!(
                    Some(error.to_string().as_str()),
                    case.error,
                    "case {index} {}: error mismatch",
                    case.label
                );
            }
        }
    }
}

#[test]
fn registration_cases_match_canonical_ts() {
    assert_eq!(BATTLE_SCRIPT_ADDBYTE_REGISTRATION_CASES.len(), 2);

    let present = [BattleScriptAddbyteRegistrationInstruction {
        opcode_name: BATTLE_SCRIPT_ADDBYTE_OPCODE_NAME,
        opcode_id: BATTLE_SCRIPT_ADDBYTE_OPCODE,
    }];
    assert!(register_battle_script_addbyte(&present).is_ok());
    assert!(register_battle_script_addbyte(&[]).is_err());

    let missing = BATTLE_SCRIPT_ADDBYTE_REGISTRATION_CASES
        .iter()
        .find(|c| c.label == "missing_opcode")
        .expect("missing_opcode case present");
    assert_eq!(
        missing.error,
        Some("committed Battle Script program does not emit B_SCR_OP_ADDBYTE")
    );

    let canonical = BATTLE_SCRIPT_ADDBYTE_REGISTRATION_CASES
        .iter()
        .find(|c| c.label == "canonical_all_9")
        .expect("canonical_all_9 case present");
    assert!(canonical.error.is_none());
    assert_eq!(canonical.opcode_id, Some("true"));
}

#[test]
fn census_totals_match_case_counts() {
    let category_total: usize = BATTLE_SCRIPT_ADDBYTE_CATEGORY_CENSUS
        .iter()
        .map(|(_, c)| c)
        .sum();
    let control_total: usize = BATTLE_SCRIPT_ADDBYTE_CONTROL_CENSUS
        .iter()
        .map(|(_, c)| c)
        .sum();
    let registration_total: usize = BATTLE_SCRIPT_ADDBYTE_REGISTRATION_OUTCOME_CENSUS
        .iter()
        .map(|(_, c)| c)
        .sum();
    assert_eq!(category_total, BATTLE_SCRIPT_ADDBYTE_BEHAVIOR_CASES.len());
    assert_eq!(control_total, BATTLE_SCRIPT_ADDBYTE_BEHAVIOR_CASES.len());
    assert_eq!(
        registration_total,
        BATTLE_SCRIPT_ADDBYTE_REGISTRATION_CASES.len()
    );
}

#[test]
fn corpus_provenance_is_recorded() {
    assert_eq!(BATTLE_SCRIPT_ADDBYTE_VECTOR_CORPUS_SHA256.len(), 64);
    assert_ne!(BATTLE_SCRIPT_ADDBYTE_VECTOR_CORPUS_BYTES, 0);
}
