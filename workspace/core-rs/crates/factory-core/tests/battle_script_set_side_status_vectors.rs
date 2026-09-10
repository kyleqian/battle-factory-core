//! Canonical-TypeScript differential and registration ratchets for the
//! side-status screen family: `B_SCR_OP_SETREFLECT` (0x7E),
//! `B_SCR_OP_SETLIGHTSCREEN` (0x92), `B_SCR_OP_SETMIST` (0x99),
//! `B_SCR_OP_SETSAFEGUARD` (0xB8), `B_SCR_OP_REMOVELIGHTSCREENREFLECT`
//! (0xEE).
//!
//! Regenerate with `node --experimental-strip-types
//! core-rs/tools/gen-battle-script-set-side-status-vectors.mjs`.

use factory_core::battle_script_set_side_status::{
    apply_battle_script_removelightscreenreflect, apply_battle_script_setlightscreen,
    apply_battle_script_setmist, apply_battle_script_setreflect, apply_battle_script_setsafeguard,
    register_battle_script_set_side_status_handlers, BattleScriptSetSideStatusBattler,
    BattleScriptSetSideStatusBattlerState, BattleScriptSetSideStatusInstruction,
    BattleScriptSetSideStatusRoles, BattleScriptSetSideStatusRules, BattleScriptSetSideStatusSide,
    BattleScriptSetSideStatusSideTimerState,
};
use factory_core::battle_script_set_side_status_vectors_gen::{
    BattleScriptSetSideStatusRegistrationVectorCase, BattleScriptSetSideStatusVectorInstruction,
    BattleScriptSetSideStatusVectorRules, BattleScriptSetSideStatusVectorSideTimer,
    BATTLE_SCRIPT_SET_SIDE_STATUS_BRANCH_CENSUS, BATTLE_SCRIPT_SET_SIDE_STATUS_CASES,
    BATTLE_SCRIPT_SET_SIDE_STATUS_CATEGORY_CENSUS, BATTLE_SCRIPT_SET_SIDE_STATUS_OPCODE_CENSUS,
    BATTLE_SCRIPT_SET_SIDE_STATUS_REGISTRATION_BRANCH_CENSUS,
    BATTLE_SCRIPT_SET_SIDE_STATUS_REGISTRATION_CASES,
    BATTLE_SCRIPT_SET_SIDE_STATUS_VECTOR_CORPUS_SHA256,
};

fn side(value: u8) -> BattleScriptSetSideStatusSide {
    BattleScriptSetSideStatusSide::from_u8(value).unwrap()
}

fn battler_id(value: u8) -> BattleScriptSetSideStatusBattler {
    BattleScriptSetSideStatusBattler::from_u8(value).unwrap()
}

fn timer(
    value: BattleScriptSetSideStatusVectorSideTimer,
) -> BattleScriptSetSideStatusSideTimerState {
    BattleScriptSetSideStatusSideTimerState {
        reflect_timer: value.reflect_timer,
        reflect_battler_id: battler_id(value.reflect_battler_id),
        lightscreen_timer: value.lightscreen_timer,
        lightscreen_battler_id: battler_id(value.lightscreen_battler_id),
        safeguard_timer: value.safeguard_timer,
        safeguard_battler_id: battler_id(value.safeguard_battler_id),
        mist_battler_id: battler_id(value.mist_battler_id),
    }
}

fn vector_timer(
    value: BattleScriptSetSideStatusSideTimerState,
) -> BattleScriptSetSideStatusVectorSideTimer {
    BattleScriptSetSideStatusVectorSideTimer {
        reflect_timer: value.reflect_timer,
        reflect_battler_id: value.reflect_battler_id.as_u8(),
        lightscreen_timer: value.lightscreen_timer,
        lightscreen_battler_id: value.lightscreen_battler_id.as_u8(),
        safeguard_timer: value.safeguard_timer,
        safeguard_battler_id: value.safeguard_battler_id.as_u8(),
        mist_battler_id: value.mist_battler_id.as_u8(),
    }
}

fn rules(value: BattleScriptSetSideStatusVectorRules) -> BattleScriptSetSideStatusRules {
    BattleScriptSetSideStatusRules {
        battlers: std::array::from_fn(|i| BattleScriptSetSideStatusBattlerState {
            side: side(value.sides[i]),
        }),
        side_statuses: value.side_statuses,
        side_timers: value.side_timers.map(timer),
        mist_timers: value.mist_timers,
        move_result_flags: value.move_result_flags,
        multistring_chooser: value.multistring_chooser,
        anim_turn: value.anim_turn,
        anim_targets_hit: value.anim_targets_hit,
        selector_roles: BattleScriptSetSideStatusRoles {
            attacker: value
                .attacker
                .and_then(BattleScriptSetSideStatusBattler::from_u8),
        },
    }
}

fn vector_rules(value: BattleScriptSetSideStatusRules) -> BattleScriptSetSideStatusVectorRules {
    BattleScriptSetSideStatusVectorRules {
        sides: value.battlers.map(|b| b.side.as_u8()),
        side_statuses: value.side_statuses,
        side_timers: value.side_timers.map(vector_timer),
        mist_timers: value.mist_timers,
        move_result_flags: value.move_result_flags,
        multistring_chooser: value.multistring_chooser,
        anim_turn: value.anim_turn,
        anim_targets_hit: value.anim_targets_hit,
        attacker: value
            .selector_roles
            .attacker
            .map(BattleScriptSetSideStatusBattler::as_u8),
    }
}

#[test]
fn complete_projected_outputs_and_errors_match_canonical_typescript() {
    assert_eq!(BATTLE_SCRIPT_SET_SIDE_STATUS_CASES.len(), 30);
    for (case_index, case) in BATTLE_SCRIPT_SET_SIDE_STATUS_CASES.iter().enumerate() {
        let input = rules(case.initial);
        let before = input;
        let result = match case.opcode {
            "setreflect" => apply_battle_script_setreflect(&input),
            "setlightscreen" => apply_battle_script_setlightscreen(&input),
            "setsafeguard" => apply_battle_script_setsafeguard(&input),
            "setmist" => apply_battle_script_setmist(&input),
            "removelightscreenreflect" => apply_battle_script_removelightscreenreflect(&input),
            other => panic!("unknown opcode key {other}"),
        };
        assert_eq!(
            input, before,
            "case {case_index} {} mutated input",
            case.label
        );
        match (result, case.expected, case.expected_error) {
            (Ok(actual), Some(expected), None) => {
                assert_eq!(vector_rules(actual), expected, "case {case_index} {} rules", case.label);
            }
            (Err(actual), None, Some(expected)) => {
                assert_eq!(actual.to_string(), expected, "case {case_index} {} error", case.label);
            }
            (actual, expected, expected_error) => panic!(
                "case {case_index} {} disagrees: actual={actual:?}, expected={expected:?}, expected_error={expected_error:?}",
                case.label
            ),
        }
    }
}

fn instruction(
    value: &BattleScriptSetSideStatusVectorInstruction,
) -> BattleScriptSetSideStatusInstruction<'static> {
    BattleScriptSetSideStatusInstruction {
        opcode_name: value.opcode_name,
        opcode_id: value.opcode_id,
        program_counter: value.program_counter,
        operand_count: value.operand_count,
    }
}

#[test]
fn registration_matches_canonical_typescript_and_keeps_exact_errors() {
    assert_eq!(BATTLE_SCRIPT_SET_SIDE_STATUS_REGISTRATION_CASES.len(), 6);
    for case in &BATTLE_SCRIPT_SET_SIDE_STATUS_REGISTRATION_CASES {
        execute_registration_case(case);
    }
}

fn execute_registration_case(case: &BattleScriptSetSideStatusRegistrationVectorCase) {
    let instructions: Vec<BattleScriptSetSideStatusInstruction<'static>> =
        case.instructions.iter().map(instruction).collect();
    let result = register_battle_script_set_side_status_handlers(&instructions);
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

#[test]
fn corpus_censuses_and_hash_are_pinned() {
    assert_eq!(
        BATTLE_SCRIPT_SET_SIDE_STATUS_CATEGORY_CENSUS,
        [
            ("removelightscreenreflect", 7),
            ("setlightscreen", 6),
            ("setmist", 5),
            ("setreflect", 6),
            ("setsafeguard", 6),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_SET_SIDE_STATUS_BRANCH_CENSUS,
        [("advance", 25), ("missing-attacker-role", 5)]
    );
    assert_eq!(
        BATTLE_SCRIPT_SET_SIDE_STATUS_OPCODE_CENSUS,
        [
            ("removelightscreenreflect", 7),
            ("setlightscreen", 6),
            ("setmist", 5),
            ("setreflect", 6),
            ("setsafeguard", 6),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_SET_SIDE_STATUS_REGISTRATION_BRANCH_CENSUS,
        [("not-registered", 5), ("registered", 1)]
    );
    assert_eq!(
        BATTLE_SCRIPT_SET_SIDE_STATUS_VECTOR_CORPUS_SHA256,
        "323e4c45348f7a5d3ea5122a227da640ae01171b8dd0d3ad92c35c790aac6208"
    );
}
