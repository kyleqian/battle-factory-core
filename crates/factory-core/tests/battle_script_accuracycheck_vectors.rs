//! Canonical-TypeScript differential and registration ratchets for the
//! `B_SCR_OP_ACCURACYCHECK` bypass paths (M86 -- part 1 of 2).
//!
//! Regenerate with `node --experimental-strip-types
//! core-rs/tools/gen-battle-script-accuracycheck-vectors.mjs`.

use factory_core::battle_script_accuracycheck::{
    apply_battle_script_accuracycheck, register_battle_script_accuracycheck,
    BattleScriptAccuracycheckBattler, BattleScriptAccuracycheckBattlerState,
    BattleScriptAccuracycheckExecution, BattleScriptAccuracycheckHalt,
    BattleScriptAccuracycheckInstruction, BattleScriptAccuracycheckMoveHistory,
    BattleScriptAccuracycheckOutcome, BattleScriptAccuracycheckRoles,
    BattleScriptAccuracycheckRules,
};
use factory_core::battle_script_accuracycheck_vectors_gen::{
    BattleScriptAccuracycheckRegistrationVectorCase, BattleScriptAccuracycheckVectorCase,
    BattleScriptAccuracycheckVectorState, BATTLE_SCRIPT_ACCURACYCHECK_BRANCH_CENSUS,
    BATTLE_SCRIPT_ACCURACYCHECK_CASES, BATTLE_SCRIPT_ACCURACYCHECK_CATEGORY_CENSUS,
    BATTLE_SCRIPT_ACCURACYCHECK_MOVE_OPERAND_CENSUS,
    BATTLE_SCRIPT_ACCURACYCHECK_REGISTRATION_BRANCH_CENSUS,
    BATTLE_SCRIPT_ACCURACYCHECK_REGISTRATION_CASES,
    BATTLE_SCRIPT_ACCURACYCHECK_VECTOR_CORPUS_SHA256,
};

fn rules(value: BattleScriptAccuracycheckVectorState) -> BattleScriptAccuracycheckRules {
    BattleScriptAccuracycheckRules {
        battlers: value
            .battlers
            .map(|battler| BattleScriptAccuracycheckBattlerState {
                status3: battler.status3,
                protected: battler.protected,
                battler_with_sure_hit: battler.battler_with_sure_hit,
            }),
        current_move: value.current_move,
        move_result_flags: value.move_result_flags,
        miss_type: value.miss_type,
        move_history: BattleScriptAccuracycheckMoveHistory {
            last_landed_moves: value.last_landed_moves,
            last_hit_by_type: value.last_hit_by_type,
        },
        selector_roles: BattleScriptAccuracycheckRoles {
            attacker: value
                .attacker
                .and_then(BattleScriptAccuracycheckBattler::from_u8),
            target: value
                .target
                .and_then(BattleScriptAccuracycheckBattler::from_u8),
        },
    }
}

fn vector_state(value: &BattleScriptAccuracycheckRules) -> BattleScriptAccuracycheckVectorState {
    BattleScriptAccuracycheckVectorState {
        battlers: value.battlers.map(|battler| {
            factory_core::battle_script_accuracycheck_vectors_gen::BattleScriptAccuracycheckVectorBattlerState {
                status3: battler.status3,
                protected: battler.protected,
                battler_with_sure_hit: battler.battler_with_sure_hit,
            }
        }),
        current_move: value.current_move,
        move_result_flags: value.move_result_flags,
        miss_type: value.miss_type,
        last_landed_moves: value.move_history.last_landed_moves,
        last_hit_by_type: value.move_history.last_hit_by_type,
        attacker: value
            .selector_roles
            .attacker
            .map(BattleScriptAccuracycheckBattler::as_u8),
        target: value.selector_roles.target.map(BattleScriptAccuracycheckBattler::as_u8),
    }
}

#[test]
fn complete_projected_outputs_and_errors_match_canonical_typescript() {
    assert_eq!(BATTLE_SCRIPT_ACCURACYCHECK_CASES.len(), 30);
    for (case_index, case) in BATTLE_SCRIPT_ACCURACYCHECK_CASES.iter().enumerate() {
        let input = rules(case.initial);
        let before = input;

        let execution = BattleScriptAccuracycheckExecution {
            program_counter: case.program_counter,
            opcode_id: 0x01,
            move_operand_expression: case.move_operand_expression,
            fail_label_expression: case.fail_label_expression,
            resolved_fail_program_counter: case.resolved_fail_program_counter,
        };

        let result = apply_battle_script_accuracycheck(&execution, &input);
        assert_eq!(
            input, before,
            "case {case_index} {} mutated rules input",
            case.label
        );

        match (result, case.branch) {
            (Ok(BattleScriptAccuracycheckOutcome::Advance { rules: out }), "advance") => {
                assert_eq!(
                    vector_state(&out),
                    case.expected.unwrap(),
                    "case {case_index} {} advance state",
                    case.label
                );
            }
            (Ok(BattleScriptAccuracycheckOutcome::Jump { program_counter, rules: out }), "jump") => {
                assert_eq!(
                    Some(program_counter),
                    case.jump_program_counter,
                    "case {case_index} {} jump program counter",
                    case.label
                );
                assert_eq!(
                    vector_state(&out),
                    case.expected.unwrap(),
                    "case {case_index} {} jump state",
                    case.label
                );
            }
            (Ok(BattleScriptAccuracycheckOutcome::Halt(halt)), "halt") => {
                assert_halt_matches(&halt, case);
            }
            (Err(actual), "missing-attacker-role" | "missing-target-role" | "unresolved-fail-label") => {
                assert_eq!(
                    actual.to_string(),
                    case.expected_error.unwrap(),
                    "case {case_index} {} exact error",
                    case.label
                );
            }
            (actual, branch) => panic!(
                "case {case_index} {} generated outcome disagrees with branch {branch}: actual={actual:?}",
                case.label
            ),
        }
    }
}

fn assert_halt_matches(
    halt: &BattleScriptAccuracycheckHalt,
    case: &BattleScriptAccuracycheckVectorCase,
) {
    let expected = case.halt.as_ref().expect("expected halt fixture");
    assert_eq!(halt.opcode_id, expected.opcode_id, "{}", case.label);
    assert_eq!(halt.opcode_name, expected.opcode_name, "{}", case.label);
    assert_eq!(
        halt.source_construct, expected.source_construct,
        "{}",
        case.label
    );
    assert_eq!(halt.source_file, expected.source_file, "{}", case.label);
    assert_eq!(halt.source_line, expected.source_line, "{}", case.label);
}

#[test]
fn registration_matches_canonical_typescript_and_keeps_exact_errors() {
    assert_eq!(BATTLE_SCRIPT_ACCURACYCHECK_REGISTRATION_CASES.len(), 3);
    for case in BATTLE_SCRIPT_ACCURACYCHECK_REGISTRATION_CASES {
        execute_registration_case(&case);
    }
}

fn execute_registration_case(case: &BattleScriptAccuracycheckRegistrationVectorCase) {
    let instructions: Vec<BattleScriptAccuracycheckInstruction<'static>> =
        case.instructions.to_vec();
    match (
        register_battle_script_accuracycheck(&instructions),
        case.expected_opcode_id,
        case.expected_error,
    ) {
        (Ok(actual), Some(expected), None) => assert_eq!(actual, expected, "{}", case.label),
        (Err(actual), None, Some(expected)) => {
            assert_eq!(actual.to_string(), expected, "{}", case.label)
        }
        (actual, expected_id, expected_error) => panic!(
            "{} registration mismatch: actual={actual:?}, expected_id={expected_id:?}, expected_error={expected_error:?}",
            case.label
        ),
    }
}

#[test]
fn corpus_censuses_and_hash_are_pinned() {
    assert_eq!(
        BATTLE_SCRIPT_ACCURACYCHECK_CATEGORY_CENSUS,
        [
            ("checks-lock-on-asymmetry", 3),
            ("committed-call-sites", 9),
            ("lock-on", 2),
            ("precedence", 1),
            ("protect", 4),
            ("role-errors", 3),
            ("semi-invulnerable", 4),
            ("unresolved-label", 2),
            ("unsupported-branch", 2),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_ACCURACYCHECK_BRANCH_CENSUS,
        [
            ("advance", 15),
            ("halt", 2),
            ("jump", 8),
            ("missing-attacker-role", 2),
            ("missing-target-role", 1),
            ("unresolved-fail-label", 2),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_ACCURACYCHECK_REGISTRATION_BRANCH_CENSUS,
        [("missing-opcode", 1), ("registered", 2)]
    );
    assert_eq!(
        BATTLE_SCRIPT_ACCURACYCHECK_MOVE_OPERAND_CENSUS,
        [
            ("ACC_CURR_MOVE", 55),
            ("MOVE_DOOM_DESIRE", 1),
            ("MOVE_FUTURE_SIGHT", 1),
            ("NO_ACC_CALC", 1),
            ("NO_ACC_CALC_CHECK_LOCK_ON", 8),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_ACCURACYCHECK_VECTOR_CORPUS_SHA256,
        "ec8e2d37ad28ecad421b63421142b7c016c69891912588fab62831cf2db303b3"
    );
}
