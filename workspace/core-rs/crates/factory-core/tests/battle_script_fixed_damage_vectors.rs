//! Canonical-TypeScript differential and registration ratchets for the
//! fixed-damage cluster: `B_SCR_OP_DMGTOLEVEL` (0x9F),
//! `B_SCR_OP_PSYWAVEDAMAGEEFFECT` (0xA0), `B_SCR_OP_DAMAGETOHALFTARGETHP`
//! (0x94), `B_SCR_OP_SETDAMAGETOHEALTHDIFFERENCE` (0xD8).
//!
//! Regenerate with `node --experimental-strip-types
//! core-rs/tools/gen-battle-script-fixed-damage-vectors.mjs`.

use factory_core::battle_script_fixed_damage::{
    apply_battle_script_damagetohalftargethp, apply_battle_script_dmgtolevel,
    apply_battle_script_psywavedamageeffect, apply_battle_script_setdamagetohealthdifference,
    register_battle_script_damagetohalftargethp, register_battle_script_dmgtolevel,
    register_battle_script_psywavedamageeffect, register_battle_script_setdamagetohealthdifference,
    BattleScriptFixedDamageBattler, BattleScriptFixedDamageBattlerState,
    BattleScriptFixedDamageInstruction, BattleScriptFixedDamageResolvedTarget,
    BattleScriptFixedDamageRngState, BattleScriptFixedDamageRoles, BattleScriptFixedDamageRules,
    BattleScriptFixedDamageSetHealthDiffControl,
};
use factory_core::battle_script_fixed_damage_vectors_gen::{
    BattleScriptFixedDamageRegistrationVectorCase, BattleScriptFixedDamageVectorInstruction,
    BattleScriptFixedDamageVectorRng, BattleScriptFixedDamageVectorRules,
    BATTLE_SCRIPT_FIXED_DAMAGE_BRANCH_CENSUS, BATTLE_SCRIPT_FIXED_DAMAGE_CASES,
    BATTLE_SCRIPT_FIXED_DAMAGE_CATEGORY_CENSUS, BATTLE_SCRIPT_FIXED_DAMAGE_OPCODE_CENSUS,
    BATTLE_SCRIPT_FIXED_DAMAGE_REGISTRATION_BRANCH_CENSUS,
    BATTLE_SCRIPT_FIXED_DAMAGE_REGISTRATION_CASES,
    BATTLE_SCRIPT_FIXED_DAMAGE_REGISTRATION_CONVENTION_CENSUS,
    BATTLE_SCRIPT_FIXED_DAMAGE_VECTOR_CORPUS_SHA256,
};

fn rules(value: BattleScriptFixedDamageVectorRules) -> BattleScriptFixedDamageRules {
    BattleScriptFixedDamageRules {
        battlers: std::array::from_fn(|i| BattleScriptFixedDamageBattlerState {
            level: value.levels[i],
            hp: value.hps[i],
        }),
        battle_move_damage: value.battle_move_damage,
        selector_roles: BattleScriptFixedDamageRoles {
            attacker: value
                .attacker
                .and_then(BattleScriptFixedDamageBattler::from_u8),
            target: value
                .target
                .and_then(BattleScriptFixedDamageBattler::from_u8),
        },
    }
}

fn vector_rules(value: BattleScriptFixedDamageRules) -> BattleScriptFixedDamageVectorRules {
    BattleScriptFixedDamageVectorRules {
        levels: value.battlers.map(|b| b.level),
        hps: value.battlers.map(|b| b.hp),
        battle_move_damage: value.battle_move_damage,
        attacker: value
            .selector_roles
            .attacker
            .map(BattleScriptFixedDamageBattler::as_u8),
        target: value
            .selector_roles
            .target
            .map(BattleScriptFixedDamageBattler::as_u8),
    }
}

fn rng(value: BattleScriptFixedDamageVectorRng) -> BattleScriptFixedDamageRngState {
    BattleScriptFixedDamageRngState { value: value.value, calls: value.calls }
}

fn instruction(
    value: &BattleScriptFixedDamageVectorInstruction,
) -> BattleScriptFixedDamageInstruction<'static> {
    BattleScriptFixedDamageInstruction {
        opcode_name: value.opcode_name,
        opcode_id: value.opcode_id,
        program_counter: value.program_counter,
        dispatcher: value.dispatcher,
        source_label: value.source_label,
        source_statement_line: value.source_statement_line,
        operand_count: value.operand_count,
        jump_target_expression: value.jump_target_expression,
        resolved_jump_target: None,
    }
}

#[test]
fn complete_projected_outputs_and_errors_match_canonical_typescript() {
    assert_eq!(BATTLE_SCRIPT_FIXED_DAMAGE_CASES.len(), 23);
    for (case_index, case) in BATTLE_SCRIPT_FIXED_DAMAGE_CASES.iter().enumerate() {
        let input = rules(case.initial);
        let before = input;
        let rng_in = rng(case.rng_in);
        let instr = instruction(&case.instruction);

        match case.opcode {
            "dmgtolevel" => {
                let result = apply_battle_script_dmgtolevel(&input);
                assert_eq!(
                    input, before,
                    "case {case_index} {} mutated input",
                    case.label
                );
                assert_result(
                    case_index,
                    case.label,
                    result,
                    case.expected,
                    case.expected_error,
                );
            }
            "psywavedamageeffect" => {
                let result = apply_battle_script_psywavedamageeffect(&input, rng_in, &instr);
                assert_eq!(
                    input, before,
                    "case {case_index} {} mutated input",
                    case.label
                );
                match (result, case.expected, case.expected_error) {
                    (Ok(actual), Some(expected), None) => {
                        assert_eq!(
                            vector_rules(actual.rules),
                            expected,
                            "case {case_index} {} rules",
                            case.label
                        );
                        let expected_rng = case.expected_rng_out.unwrap_or_else(|| {
                            panic!("case {case_index} {} missing expected rng", case.label)
                        });
                        assert_eq!(actual.rng, rng(expected_rng), "case {case_index} {} rng", case.label);
                        assert_eq!(
                            actual.draws.len(),
                            case.expected_draws.len(),
                            "case {case_index} {} draw count",
                            case.label
                        );
                        for (draw_index, (draw, expected_draw)) in
                            actual.draws.iter().zip(case.expected_draws.iter()).enumerate()
                        {
                            assert_eq!(draw.call, expected_draw.call, "case {case_index} draw[{draw_index}].call");
                            assert_eq!(
                                draw.reason, expected_draw.reason,
                                "case {case_index} draw[{draw_index}].reason"
                            );
                            assert_eq!(
                                draw.before, expected_draw.before,
                                "case {case_index} draw[{draw_index}].before"
                            );
                            assert_eq!(draw.after, expected_draw.after, "case {case_index} draw[{draw_index}].after");
                            assert_eq!(
                                draw.random_value, expected_draw.random_value,
                                "case {case_index} draw[{draw_index}].random_value"
                            );
                            assert_eq!(
                                draw.provenance.program_counter, expected_draw.provenance.program_counter,
                                "case {case_index} draw[{draw_index}].provenance.program_counter"
                            );
                            assert_eq!(
                                draw.provenance.opcode_name, expected_draw.provenance.opcode_name,
                                "case {case_index} draw[{draw_index}].provenance.opcode_name"
                            );
                            assert_eq!(
                                draw.provenance.dispatcher, expected_draw.provenance.dispatcher,
                                "case {case_index} draw[{draw_index}].provenance.dispatcher"
                            );
                            assert_eq!(
                                draw.provenance.source_label, expected_draw.provenance.source_label,
                                "case {case_index} draw[{draw_index}].provenance.source_label"
                            );
                            assert_eq!(
                                draw.provenance.source_statement_line,
                                expected_draw.provenance.source_statement_line,
                                "case {case_index} draw[{draw_index}].provenance.source_statement_line"
                            );
                        }
                    }
                    (Err(actual), None, Some(expected)) => {
                        assert_eq!(
                            actual.to_string(),
                            expected,
                            "case {case_index} {} error",
                            case.label
                        );
                    }
                    (actual, expected, expected_error) => panic!(
                        "case {case_index} {} disagrees: actual={actual:?}, expected={expected:?}, expected_error={expected_error:?}",
                        case.label
                    ),
                }
            }
            "damagetohalftargethp" => {
                let result = apply_battle_script_damagetohalftargethp(&input);
                assert_eq!(
                    input, before,
                    "case {case_index} {} mutated input",
                    case.label
                );
                assert_result(
                    case_index,
                    case.label,
                    result,
                    case.expected,
                    case.expected_error,
                );
            }
            "setdamagetohealthdifference" => {
                let mut instr = instr;
                if case.control_kind == Some("jump") {
                    instr.resolved_jump_target = Some(BattleScriptFixedDamageResolvedTarget {
                        expression: instr.jump_target_expression,
                        program_counter: case.jump_program_counter.unwrap(),
                    });
                }
                let result = apply_battle_script_setdamagetohealthdifference(&input, &instr);
                assert_eq!(
                    input, before,
                    "case {case_index} {} mutated input",
                    case.label
                );
                match (result, case.control_kind, case.expected_error) {
                    (Ok(BattleScriptFixedDamageSetHealthDiffControl::Advance { rules: actual }), Some("advance"), None) => {
                        assert_eq!(
                            vector_rules(actual),
                            case.expected.unwrap(),
                            "case {case_index} {} advance rules",
                            case.label
                        );
                    }
                    (Ok(BattleScriptFixedDamageSetHealthDiffControl::Jump { program_counter }), Some("jump"), None) => {
                        assert_eq!(
                            program_counter,
                            case.jump_program_counter.unwrap(),
                            "case {case_index} {} jump target",
                            case.label
                        );
                    }
                    (Err(actual), None, Some(expected)) => {
                        assert_eq!(actual.to_string(), expected, "case {case_index} {} error", case.label);
                    }
                    (actual, control_kind, expected_error) => panic!(
                        "case {case_index} {} disagrees: actual={actual:?}, control_kind={control_kind:?}, expected_error={expected_error:?}",
                        case.label
                    ),
                }
            }
            other => panic!("unknown opcode key {other}"),
        }
    }
}

fn assert_result(
    case_index: usize,
    label: &str,
    result: Result<BattleScriptFixedDamageRules, impl std::fmt::Display + std::fmt::Debug>,
    expected: Option<BattleScriptFixedDamageVectorRules>,
    expected_error: Option<&str>,
) {
    match (result, expected, expected_error) {
        (Ok(actual), Some(expected), None) => {
            assert_eq!(vector_rules(actual), expected, "case {case_index} {label} rules");
        }
        (Err(actual), None, Some(expected)) => {
            assert_eq!(actual.to_string(), expected, "case {case_index} {label} error");
        }
        (actual, expected, expected_error) => panic!(
            "case {case_index} {label} disagrees: actual={actual:?}, expected={expected:?}, expected_error={expected_error:?}"
        ),
    }
}

#[test]
fn registration_matches_canonical_typescript_and_keeps_exact_errors() {
    assert_eq!(BATTLE_SCRIPT_FIXED_DAMAGE_REGISTRATION_CASES.len(), 9);
    for case in &BATTLE_SCRIPT_FIXED_DAMAGE_REGISTRATION_CASES {
        execute_registration_case(case);
    }
}

fn execute_registration_case(case: &BattleScriptFixedDamageRegistrationVectorCase) {
    let instructions: Vec<BattleScriptFixedDamageInstruction<'static>> =
        case.instructions.iter().map(instruction).collect();
    match case.convention {
        "hit-chain" => {
            let dmgtolevel = register_battle_script_dmgtolevel(&instructions);
            let psywave = register_battle_script_psywavedamageeffect(&instructions);
            let healthdiff = register_battle_script_setdamagetohealthdifference(&instructions);
            if case.expected_registered {
                assert!(dmgtolevel.is_ok(), "{}", case.label);
                assert!(psywave.is_ok(), "{}", case.label);
                assert!(healthdiff.is_ok(), "{}", case.label);
            } else {
                let expected = case.expected_error.unwrap();
                let combined_error = dmgtolevel
                    .err()
                    .or_else(|| psywave.err())
                    .or_else(|| healthdiff.err())
                    .unwrap_or_else(|| panic!("{} expected a registration error", case.label));
                assert_eq!(combined_error.to_string(), expected, "{}", case.label);
            }
        }
        "ranked" => {
            let result = register_battle_script_damagetohalftargethp(&instructions);
            match (result, case.expected_registered, case.expected_error) {
                (Ok(_), true, None) => {}
                (Err(actual), false, Some(expected)) => {
                    assert_eq!(actual.to_string(), expected, "{}", case.label);
                }
                (actual, expected_registered, expected_error) => panic!(
                    "{} registration mismatch: actual={actual:?}, expected_registered={expected_registered:?}, expected_error={expected_error:?}",
                    case.label
                ),
            }
        }
        other => panic!("unknown registration convention {other}"),
    }
}

#[test]
fn corpus_censuses_and_hash_are_pinned() {
    assert_eq!(
        BATTLE_SCRIPT_FIXED_DAMAGE_CATEGORY_CENSUS,
        [
            ("dmgtolevel", 4),
            ("halfhp", 5),
            ("healthdiff", 7),
            ("psywave", 7)
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_FIXED_DAMAGE_BRANCH_CENSUS,
        [
            ("advance-multi-draw", 1),
            ("advance-no-draw", 9),
            ("advance-single-draw", 5),
            ("jump", 2),
            ("missing-attacker-role", 3),
            ("missing-target-role", 2),
            ("unresolved-jump-target", 1),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_FIXED_DAMAGE_OPCODE_CENSUS,
        [
            ("damagetohalftargethp", 5),
            ("dmgtolevel", 4),
            ("psywavedamageeffect", 7),
            ("setdamagetohealthdifference", 7)
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_FIXED_DAMAGE_REGISTRATION_CONVENTION_CENSUS,
        [("hit-chain", 4), ("ranked", 5)]
    );
    assert_eq!(
        BATTLE_SCRIPT_FIXED_DAMAGE_REGISTRATION_BRANCH_CENSUS,
        [("not-registered", 7), ("registered", 2)]
    );
    assert_eq!(
        BATTLE_SCRIPT_FIXED_DAMAGE_VECTOR_CORPUS_SHA256,
        "20f30d0f4b56a7f048a61544277c63388bf7f427818e127064dbdc7f528ffc2a"
    );
}
