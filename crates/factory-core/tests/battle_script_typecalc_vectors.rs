//! Canonical-TypeScript differential and registration ratchets for
//! `typecalcOpcodeHandler` (`B_SCR_OP_TYPECALC`, 0x06).
//!
//! Regenerate with `node --experimental-strip-types
//! core-rs/tools/gen-battle-script-typecalc-vectors.mjs`.

use factory_core::battle_script_ai_reveal::BattleScriptAiRevealRules;
use factory_core::battle_script_typecalc::{
    apply_battle_script_typecalc, register_battle_script_typecalc, BattleScriptTypecalcBattler,
    BattleScriptTypecalcBattlerState, BattleScriptTypecalcInstruction,
    BattleScriptTypecalcMoveHistory, BattleScriptTypecalcRoles, BattleScriptTypecalcRules,
};
use factory_core::battle_script_typecalc_vectors_gen::{
    BattleScriptTypecalcRegistrationVectorCase, BattleScriptTypecalcVectorBattlerState,
    BattleScriptTypecalcVectorState, BATTLE_SCRIPT_TYPECALC_BRANCH_CENSUS,
    BATTLE_SCRIPT_TYPECALC_CASES, BATTLE_SCRIPT_TYPECALC_CATEGORY_CENSUS,
    BATTLE_SCRIPT_TYPECALC_REGISTRATION_BRANCH_CENSUS, BATTLE_SCRIPT_TYPECALC_REGISTRATION_CASES,
    BATTLE_SCRIPT_TYPECALC_VECTOR_CORPUS_SHA256,
};

fn battler(value: BattleScriptTypecalcVectorBattlerState) -> BattleScriptTypecalcBattlerState {
    BattleScriptTypecalcBattlerState {
        types: value.types,
        ability: value.ability,
        status2: value.status2,
        target_not_affected: value.target_not_affected,
    }
}

fn rules(value: BattleScriptTypecalcVectorState) -> BattleScriptTypecalcRules {
    BattleScriptTypecalcRules {
        battlers: value.battlers.map(battler),
        current_move: value.current_move,
        dynamic_move_type: value.dynamic_move_type,
        battle_move_damage: value.battle_move_damage,
        move_result_flags: value.move_result_flags,
        miss_type: value.miss_type,
        last_used_ability: value.last_used_ability,
        move_history: BattleScriptTypecalcMoveHistory {
            last_landed_moves: value.last_landed_moves,
            last_hit_by_type: value.last_hit_by_type,
        },
        ai_reveal: BattleScriptAiRevealRules {
            ai_observed_ability_ids: value.ai_observed_ability_ids,
            ai_observed_item_effects: [0; 4],
        },
        selector_roles: BattleScriptTypecalcRoles {
            attacker: value
                .attacker
                .and_then(BattleScriptTypecalcBattler::from_u8),
            target: value.target.and_then(BattleScriptTypecalcBattler::from_u8),
        },
    }
}

fn vector_state(value: BattleScriptTypecalcRules) -> BattleScriptTypecalcVectorState {
    BattleScriptTypecalcVectorState {
        battlers: value
            .battlers
            .map(|battler| BattleScriptTypecalcVectorBattlerState {
                types: battler.types,
                ability: battler.ability,
                status2: battler.status2,
                target_not_affected: battler.target_not_affected,
            }),
        current_move: value.current_move,
        dynamic_move_type: value.dynamic_move_type,
        battle_move_damage: value.battle_move_damage,
        move_result_flags: value.move_result_flags,
        miss_type: value.miss_type,
        last_used_ability: value.last_used_ability,
        last_landed_moves: value.move_history.last_landed_moves,
        last_hit_by_type: value.move_history.last_hit_by_type,
        ai_observed_ability_ids: value.ai_reveal.ai_observed_ability_ids,
        attacker: value
            .selector_roles
            .attacker
            .map(BattleScriptTypecalcBattler::as_u8),
        target: value
            .selector_roles
            .target
            .map(BattleScriptTypecalcBattler::as_u8),
    }
}

#[test]
fn complete_projected_outputs_and_errors_match_canonical_typescript() {
    assert_eq!(BATTLE_SCRIPT_TYPECALC_CASES.len(), 41);
    for (case_index, case) in BATTLE_SCRIPT_TYPECALC_CASES.iter().enumerate() {
        let input = rules(case.initial);
        let before = input;

        let result = apply_battle_script_typecalc(&input);

        assert_eq!(
            input, before,
            "case {case_index} {} mutated rules input",
            case.label
        );

        match (result, case.expected, case.expected_error) {
            (Ok(actual), Some(expected), None) => {
                assert_eq!(
                    vector_state(actual),
                    expected,
                    "case {case_index} {} complete projected state",
                    case.label
                );
            }
            (Err(actual), None, Some(expected)) => {
                assert_eq!(actual.to_string(), expected, "case {case_index} {} exact error", case.label);
            }
            (actual, expected, expected_error) => panic!(
                "case {case_index} {} generated outcome disagrees: actual={actual:?}, expected={expected:?}, expected_error={expected_error:?}",
                case.label
            ),
        }
    }
}

#[test]
fn registration_matches_canonical_typescript_and_keeps_exact_errors() {
    assert_eq!(BATTLE_SCRIPT_TYPECALC_REGISTRATION_CASES.len(), 3);
    for case in BATTLE_SCRIPT_TYPECALC_REGISTRATION_CASES {
        execute_registration_case(&case);
    }
}

fn execute_registration_case(case: &BattleScriptTypecalcRegistrationVectorCase) {
    let instructions: Vec<BattleScriptTypecalcInstruction<'static>> = case.instructions.to_vec();
    match (
        register_battle_script_typecalc(&instructions),
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
        BATTLE_SCRIPT_TYPECALC_CATEGORY_CENSUS,
        [
            ("foresight", 4),
            ("levitate", 8),
            ("move-resolution", 4),
            ("role-errors", 3),
            ("stab", 3),
            ("struggle", 1),
            ("target-not-affected", 2),
            ("type-loop-dedup", 1),
            ("type-loop-double", 2),
            ("type-loop-floor", 1),
            ("type-loop-half", 2),
            ("type-loop-immune", 2),
            ("type-loop-no-effect-preset", 1),
            ("type-loop-power-zero", 1),
            ("type-loop-quad", 1),
            ("wonder-guard", 5),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_TYPECALC_BRANCH_CENSUS,
        [
            ("advance", 35),
            ("missing-attacker-role", 2),
            ("missing-target-role", 1),
            ("unknown-move-row", 2),
            ("unknown-type-id", 1),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_TYPECALC_REGISTRATION_BRANCH_CENSUS,
        [("missing-opcode", 1), ("registered", 2)]
    );
    assert_eq!(
        BATTLE_SCRIPT_TYPECALC_VECTOR_CORPUS_SHA256,
        "881d1ffa7371bcd411ffb8cfb10eb0c49bd5151567538d7086eff9bc952d20d4"
    );
}
