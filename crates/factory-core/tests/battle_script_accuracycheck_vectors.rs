//! Canonical-TypeScript differential and registration ratchets for the
//! `B_SCR_OP_ACCURACYCHECK` leaf (M87 -- part 2 of 3: the full-formula path;
//! M86's bypass paths are re-projected through the same widened case shape).
//!
//! Regenerate with `node --experimental-strip-types
//! core-rs/tools/gen-battle-script-accuracycheck-vectors.mjs`.

use factory_core::battle_script_accuracycheck::{
    apply_battle_script_accuracycheck, register_battle_script_accuracycheck,
    BattleScriptAccuracycheckBattler, BattleScriptAccuracycheckBattlerState,
    BattleScriptAccuracycheckExecution, BattleScriptAccuracycheckHalt,
    BattleScriptAccuracycheckInstruction, BattleScriptAccuracycheckMoveHistory,
    BattleScriptAccuracycheckOutcome, BattleScriptAccuracycheckRngState,
    BattleScriptAccuracycheckRoles, BattleScriptAccuracycheckRules,
};
use factory_core::battle_script_accuracycheck_vectors_gen::{
    BattleScriptAccuracycheckRegistrationVectorCase, BattleScriptAccuracycheckVectorCase,
    BattleScriptAccuracycheckVectorState, BATTLE_SCRIPT_ACCURACYCHECK_BRANCH_CENSUS,
    BATTLE_SCRIPT_ACCURACYCHECK_CASES, BATTLE_SCRIPT_ACCURACYCHECK_CATEGORY_CENSUS,
    BATTLE_SCRIPT_ACCURACYCHECK_MOVE_OPERAND_CENSUS,
    BATTLE_SCRIPT_ACCURACYCHECK_REGISTRATION_BRANCH_CENSUS,
    BATTLE_SCRIPT_ACCURACYCHECK_REGISTRATION_CASES, BATTLE_SCRIPT_ACCURACYCHECK_RNG_DRAW_CENSUS,
    BATTLE_SCRIPT_ACCURACYCHECK_VECTOR_CORPUS_SHA256,
};

fn rules(value: BattleScriptAccuracycheckVectorState) -> BattleScriptAccuracycheckRules {
    BattleScriptAccuracycheckRules {
        battlers: value
            .battlers
            .map(|battler| BattleScriptAccuracycheckBattlerState {
                status1: battler.status1,
                status2: battler.status2,
                status3: battler.status3,
                protected: battler.protected,
                battler_with_sure_hit: battler.battler_with_sure_hit,
                ability: battler.ability,
                item: battler.item,
                types: battler.types,
                side: battler.side,
                accuracy_stage: battler.accuracy_stage,
                evasion_stage: battler.evasion_stage,
                not_first_strike: battler.not_first_strike,
                target_not_affected: battler.target_not_affected,
            }),
        battlers_count: value.battlers_count,
        current_move: value.current_move,
        dynamic_move_type: value.dynamic_move_type,
        battle_type_flags: value.battle_type_flags,
        weather: value.weather,
        hit_marker: value.hit_marker,
        move_result_flags: value.move_result_flags,
        miss_type: value.miss_type,
        last_used_ability: value.last_used_ability,
        move_history: BattleScriptAccuracycheckMoveHistory {
            last_landed_moves: value.last_landed_moves,
            last_hit_by_type: value.last_hit_by_type,
        },
        ai_observed_ability_ids: value.ai_observed_ability_ids,
        enigma_berry_hold_effects: value.enigma_berry_hold_effects,
        enigma_berry_hold_effect_params: value.enigma_berry_hold_effect_params,
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
                status1: battler.status1,
                status2: battler.status2,
                status3: battler.status3,
                protected: battler.protected,
                battler_with_sure_hit: battler.battler_with_sure_hit,
                ability: battler.ability,
                item: battler.item,
                types: battler.types,
                side: battler.side,
                accuracy_stage: battler.accuracy_stage,
                evasion_stage: battler.evasion_stage,
                not_first_strike: battler.not_first_strike,
                target_not_affected: battler.target_not_affected,
            }
        }),
        battlers_count: value.battlers_count,
        current_move: value.current_move,
        dynamic_move_type: value.dynamic_move_type,
        battle_type_flags: value.battle_type_flags,
        weather: value.weather,
        hit_marker: value.hit_marker,
        move_result_flags: value.move_result_flags,
        miss_type: value.miss_type,
        last_used_ability: value.last_used_ability,
        last_landed_moves: value.move_history.last_landed_moves,
        last_hit_by_type: value.move_history.last_hit_by_type,
        ai_observed_ability_ids: value.ai_observed_ability_ids,
        enigma_berry_hold_effects: value.enigma_berry_hold_effects,
        enigma_berry_hold_effect_params: value.enigma_berry_hold_effect_params,
        attacker: value.selector_roles.attacker.map(BattleScriptAccuracycheckBattler::as_u8),
        target: value.selector_roles.target.map(BattleScriptAccuracycheckBattler::as_u8),
    }
}

#[test]
fn complete_projected_outputs_and_errors_match_canonical_typescript() {
    assert_eq!(BATTLE_SCRIPT_ACCURACYCHECK_CASES.len(), 74);
    for (case_index, case) in BATTLE_SCRIPT_ACCURACYCHECK_CASES.iter().enumerate() {
        let input = rules(case.initial);
        let before = input;
        let rng = BattleScriptAccuracycheckRngState { value: 0x99aa_ccdd, calls: 0 };

        let execution = BattleScriptAccuracycheckExecution {
            program_counter: case.program_counter,
            opcode_id: 0x01,
            move_operand_expression: case.move_operand_expression,
            fail_label_expression: case.fail_label_expression,
            resolved_fail_program_counter: case.resolved_fail_program_counter,
        };

        let result = apply_battle_script_accuracycheck(&execution, &input, rng);
        assert_eq!(
            input, before,
            "case {case_index} {} mutated rules input",
            case.label
        );

        match (result, case.branch) {
            (Ok(BattleScriptAccuracycheckOutcome::Advance { rules: out, rng: out_rng, draws }), "advance") => {
                assert_eq!(vector_state(&out), case.expected.unwrap(), "case {case_index} {} advance state", case.label);
                assert_draws_match(&out_rng, &draws, case);
            }
            (
                Ok(BattleScriptAccuracycheckOutcome::Jump { program_counter, rules: out, rng: out_rng, draws }),
                "jump",
            ) => {
                assert_eq!(
                    Some(program_counter),
                    case.jump_program_counter,
                    "case {case_index} {} jump program counter",
                    case.label
                );
                assert_eq!(vector_state(&out), case.expected.unwrap(), "case {case_index} {} jump state", case.label);
                assert_draws_match(&out_rng, &draws, case);
            }
            (Ok(BattleScriptAccuracycheckOutcome::Halt(halt)), "halt") => {
                assert_halt_matches(&halt, case);
            }
            (
                Err(actual),
                "missing-attacker-role" | "missing-target-role" | "unresolved-fail-label" | "unknown-move-row"
                | "unknown-type-id",
            ) => {
                assert_eq!(actual.to_string(), case.expected_error.unwrap(), "case {case_index} {} exact error", case.label);
            }
            (actual, branch) => panic!(
                "case {case_index} {} generated outcome disagrees with branch {branch}: actual={actual:?}",
                case.label
            ),
        }
    }
}

fn assert_draws_match(
    out_rng: &BattleScriptAccuracycheckRngState,
    draws: &[factory_core::battle_script_accuracycheck::BattleScriptAccuracycheckRngDraw],
    case: &BattleScriptAccuracycheckVectorCase,
) {
    assert_eq!(out_rng.value, case.rng_value, "{} rng value", case.label);
    assert_eq!(out_rng.calls, case.rng_calls, "{} rng calls", case.label);
    assert_eq!(draws.len(), case.draws.len(), "{} draw count", case.label);
    for (actual, expected) in draws.iter().zip(case.draws.iter()) {
        assert_eq!(actual.call, expected.call, "{}", case.label);
        assert_eq!(actual.reason, expected.reason, "{}", case.label);
        assert_eq!(actual.before, expected.before, "{}", case.label);
        assert_eq!(actual.after, expected.after, "{}", case.label);
        assert_eq!(actual.random_value, expected.random_value, "{}", case.label);
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
    match (register_battle_script_accuracycheck(&instructions), case.expected_opcode_id, case.expected_error) {
        (Ok(actual), Some(expected), None) => assert_eq!(actual, expected, "{}", case.label),
        (Err(actual), None, Some(expected)) => assert_eq!(actual.to_string(), expected, "{}", case.label),
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
            ("full-formula-bypass", 4),
            ("full-formula-calc", 4),
            ("full-formula-committed-call-sites", 14),
            ("full-formula-destiny-bond", 3),
            ("full-formula-errors", 3),
            ("full-formula-ladder", 4),
            ("full-formula-lock-on", 1),
            ("full-formula-miss", 6),
            ("full-formula-protect", 2),
            ("full-formula-unresolved-label", 3),
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
    let total_branch: usize = BATTLE_SCRIPT_ACCURACYCHECK_BRANCH_CENSUS
        .iter()
        .map(|(_, n)| n)
        .sum();
    assert_eq!(total_branch, BATTLE_SCRIPT_ACCURACYCHECK_CASES.len());
    let total_rng: usize = BATTLE_SCRIPT_ACCURACYCHECK_RNG_DRAW_CENSUS
        .iter()
        .map(|(_, n)| n)
        .sum();
    assert_eq!(total_rng, BATTLE_SCRIPT_ACCURACYCHECK_CASES.len());
    assert_eq!(
        BATTLE_SCRIPT_ACCURACYCHECK_VECTOR_CORPUS_SHA256,
        "8ceb8ee92038968276397dd76c28dc37a9954f74767549f74d25133e4ef43fd7"
    );
}
