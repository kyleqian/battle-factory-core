//! Canonical-TypeScript differential and registration tests for
//! `B_SCR_OP_COPYARRAY`.

use factory_core::battle_script_copyarray::*;
use factory_core::battle_script_copyarray_vectors_gen::*;

fn rules_from_vector(rules: CopyarrayVectorRules) -> BattleScriptCopyarrayRules {
    BattleScriptCopyarrayRules {
        battle_move_damage: rules.battle_move_damage,
        hp_dealt: rules.hp_dealt,
        pain_split_hp: rules.pain_split_hp,
        scripting_bide_dmg: rules.scripting_bide_dmg,
        dynamic_base_power: rules.dynamic_base_power,
        triple_kick_power: rules.triple_kick_power,
        move_effect_byte: rules.move_effect_byte,
        multi_hit_effect: rules.multi_hit_effect,
        multistring_chooser: rules.multistring_chooser,
        two_turn_stringid: rules.two_turn_stringid,
        scripting_battler: rules.scripting_battler,
        battler_with_ability: rules.battler_with_ability,
        selector_roles: BattleScriptCopyarraySelectorRoles {
            attacker: rules.attacker.map(|value| value as u8),
            target: rules.target.map(|value| value as u8),
            effect_battler: rules.effect_battler.map(|value| value as u8),
        },
    }
}

fn as_vector(rules: BattleScriptCopyarrayRules) -> CopyarrayVectorRules {
    CopyarrayVectorRules {
        battle_move_damage: rules.battle_move_damage,
        hp_dealt: rules.hp_dealt,
        pain_split_hp: rules.pain_split_hp,
        scripting_bide_dmg: rules.scripting_bide_dmg,
        dynamic_base_power: rules.dynamic_base_power,
        triple_kick_power: rules.triple_kick_power,
        move_effect_byte: rules.move_effect_byte,
        multi_hit_effect: rules.multi_hit_effect,
        multistring_chooser: rules.multistring_chooser,
        two_turn_stringid: rules.two_turn_stringid,
        scripting_battler: rules.scripting_battler,
        battler_with_ability: rules.battler_with_ability,
        attacker: rules.selector_roles.attacker.map(i32::from),
        target: rules.selector_roles.target.map(i32::from),
        effect_battler: rules.selector_roles.effect_battler.map(i32::from),
    }
}

#[test]
fn behavior_cases_match_canonical_ts() {
    assert_eq!(BATTLE_SCRIPT_COPYARRAY_BEHAVIOR_CASES.len(), 22);
    for (index, case) in BATTLE_SCRIPT_COPYARRAY_BEHAVIOR_CASES.iter().enumerate() {
        let rules = rules_from_vector(case.initial);
        let operand = |i: usize| case.instruction.operands[i].map(|op| op.expression);
        let instruction = BattleScriptCopyarrayInstruction {
            program_counter: case.instruction.program_counter,
            opcode_id: case.instruction.opcode_id,
            dst_expression: operand(0),
            src_expression: operand(1),
            size_expression: operand(2),
        };
        let outcome = apply_battle_script_copyarray(&instruction, &rules);
        match outcome {
            Ok(BattleScriptCopyarrayOutcome::Advance { rules: next }) => {
                assert_eq!(case.control_kind, "advance", "case {index} {}", case.label);
                assert_eq!(
                    Some(as_vector(next)),
                    case.result,
                    "case {index} {}: result mismatch",
                    case.label
                );
            }
            Ok(BattleScriptCopyarrayOutcome::Halt(halt)) => {
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
    assert_eq!(BATTLE_SCRIPT_COPYARRAY_REGISTRATION_CASES.len(), 2);

    let present = [BattleScriptCopyarrayRegistrationInstruction {
        opcode_name: BATTLE_SCRIPT_COPYARRAY_OPCODE_NAME,
        opcode_id: BATTLE_SCRIPT_COPYARRAY_OPCODE,
    }];
    assert!(register_battle_script_copyarray(&present).is_ok());
    assert!(register_battle_script_copyarray(&[]).is_err());

    let missing = BATTLE_SCRIPT_COPYARRAY_REGISTRATION_CASES
        .iter()
        .find(|c| c.label == "missing_opcode")
        .expect("missing_opcode case present");
    assert_eq!(
        missing.error,
        Some("committed Battle Script program does not emit B_SCR_OP_COPYARRAY")
    );

    let canonical = BATTLE_SCRIPT_COPYARRAY_REGISTRATION_CASES
        .iter()
        .find(|c| c.label == "canonical_all_16")
        .expect("canonical_all_16 case present");
    assert!(canonical.error.is_none());
    assert_eq!(canonical.opcode_id, Some("true"));
}

#[test]
fn census_totals_match_case_counts() {
    let category_total: usize = BATTLE_SCRIPT_COPYARRAY_CATEGORY_CENSUS
        .iter()
        .map(|(_, c)| c)
        .sum();
    let control_total: usize = BATTLE_SCRIPT_COPYARRAY_CONTROL_CENSUS
        .iter()
        .map(|(_, c)| c)
        .sum();
    let registration_total: usize = BATTLE_SCRIPT_COPYARRAY_REGISTRATION_OUTCOME_CENSUS
        .iter()
        .map(|(_, c)| c)
        .sum();
    assert_eq!(category_total, BATTLE_SCRIPT_COPYARRAY_BEHAVIOR_CASES.len());
    assert_eq!(control_total, BATTLE_SCRIPT_COPYARRAY_BEHAVIOR_CASES.len());
    assert_eq!(
        registration_total,
        BATTLE_SCRIPT_COPYARRAY_REGISTRATION_CASES.len()
    );
}

#[test]
fn corpus_provenance_is_recorded() {
    assert_eq!(BATTLE_SCRIPT_COPYARRAY_VECTOR_CORPUS_SHA256.len(), 64);
    assert_ne!(BATTLE_SCRIPT_COPYARRAY_VECTOR_CORPUS_BYTES, 0);
}
