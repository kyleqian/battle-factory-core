//! Canonical-TypeScript differential and registration ratchets for the
//! `B_SCR_OP_ADJUSTNORMALDAMAGE` (0x07) / `B_SCR_OP_ADJUSTNORMALDAMAGE2`
//! (0x08) / `B_SCR_OP_ADJUSTSETDAMAGE` (0x69) family.
//!
//! Regenerate with `node --experimental-strip-types
//! core-rs/tools/gen-battle-script-adjustdamage-vectors.mjs`.

use factory_core::battle_script_adjustdamage::{
    apply_battle_script_adjustnormaldamage, apply_battle_script_adjustnormaldamage2,
    apply_battle_script_adjustsetdamage, register_battle_script_adjustdamage_handlers,
    BattleScriptAdjustDamageBattler, BattleScriptAdjustDamageBattlerState,
    BattleScriptAdjustDamageInstruction, BattleScriptAdjustDamageRngState,
    BattleScriptAdjustDamageRoles, BattleScriptAdjustDamageRules,
};
use factory_core::battle_script_adjustdamage_vectors_gen::{
    BattleScriptAdjustDamageRegistrationVectorCase, BattleScriptAdjustDamageVectorBattlerState,
    BattleScriptAdjustDamageVectorRng, BattleScriptAdjustDamageVectorRules,
    BATTLE_SCRIPT_ADJUSTDAMAGE_BRANCH_CENSUS, BATTLE_SCRIPT_ADJUSTDAMAGE_CASES,
    BATTLE_SCRIPT_ADJUSTDAMAGE_CATEGORY_CENSUS, BATTLE_SCRIPT_ADJUSTDAMAGE_OPCODE_CENSUS,
    BATTLE_SCRIPT_ADJUSTDAMAGE_REGISTRATION_BRANCH_CENSUS,
    BATTLE_SCRIPT_ADJUSTDAMAGE_REGISTRATION_CASES, BATTLE_SCRIPT_ADJUSTDAMAGE_VECTOR_CORPUS_SHA256,
};
use factory_core::battle_script_ai_reveal::BattleScriptAiRevealRules;

fn battler(
    value: BattleScriptAdjustDamageVectorBattlerState,
) -> BattleScriptAdjustDamageBattlerState {
    BattleScriptAdjustDamageBattlerState {
        item: value.item,
        status2: value.status2,
        hp: value.hp,
        endured: value.endured,
        special_status_focus_banded: value.focus_banded,
    }
}

fn rules(value: BattleScriptAdjustDamageVectorRules) -> BattleScriptAdjustDamageRules {
    BattleScriptAdjustDamageRules {
        battlers: value.battlers.map(battler),
        current_move: value.current_move,
        battle_move_damage: value.battle_move_damage,
        move_result_flags: value.move_result_flags,
        last_used_item: value.last_used_item,
        enigma_berry_hold_effects: value.enigma_berry_hold_effects,
        enigma_berry_hold_effect_params: value.enigma_berry_hold_effect_params,
        ai_reveal: BattleScriptAiRevealRules {
            ai_observed_ability_ids: value.ai_observed_ability_ids,
            ai_observed_item_effects: value.ai_observed_item_effects,
        },
        selector_roles: BattleScriptAdjustDamageRoles {
            target: value
                .target
                .and_then(BattleScriptAdjustDamageBattler::from_u8),
        },
    }
}

fn vector_rules(value: BattleScriptAdjustDamageRules) -> BattleScriptAdjustDamageVectorRules {
    BattleScriptAdjustDamageVectorRules {
        battlers: value
            .battlers
            .map(|battler| BattleScriptAdjustDamageVectorBattlerState {
                item: battler.item,
                status2: battler.status2,
                hp: battler.hp,
                endured: battler.endured,
                focus_banded: battler.special_status_focus_banded,
            }),
        current_move: value.current_move,
        battle_move_damage: value.battle_move_damage,
        move_result_flags: value.move_result_flags,
        last_used_item: value.last_used_item,
        enigma_berry_hold_effects: value.enigma_berry_hold_effects,
        enigma_berry_hold_effect_params: value.enigma_berry_hold_effect_params,
        ai_observed_item_effects: value.ai_reveal.ai_observed_item_effects,
        ai_observed_ability_ids: value.ai_reveal.ai_observed_ability_ids,
        target: value
            .selector_roles
            .target
            .map(BattleScriptAdjustDamageBattler::as_u8),
    }
}

fn rng(value: BattleScriptAdjustDamageVectorRng) -> BattleScriptAdjustDamageRngState {
    BattleScriptAdjustDamageRngState { value: value.value, calls: value.calls }
}

#[test]
fn complete_projected_outputs_and_errors_match_canonical_typescript() {
    assert_eq!(BATTLE_SCRIPT_ADJUSTDAMAGE_CASES.len(), 34);
    for (case_index, case) in BATTLE_SCRIPT_ADJUSTDAMAGE_CASES.iter().enumerate() {
        let input = rules(case.initial);
        let before = input;
        let rng_in = rng(case.rng_in);
        let instruction = case.instruction;

        let result = match case.opcode {
            "adjustnormaldamage" => {
                apply_battle_script_adjustnormaldamage(&input, rng_in, &instruction)
            }
            "adjustnormaldamage2" => {
                apply_battle_script_adjustnormaldamage2(&input, rng_in, &instruction)
            }
            "adjustsetdamage" => apply_battle_script_adjustsetdamage(&input, rng_in, &instruction),
            other => panic!("unknown opcode key {other}"),
        };

        assert_eq!(
            input, before,
            "case {case_index} {} mutated rules input",
            case.label
        );

        match (result, case.expected, case.expected_error) {
            (Ok(actual), Some(expected), None) => {
                assert_eq!(
                    vector_rules(actual.rules),
                    expected,
                    "case {case_index} {} complete projected rules",
                    case.label
                );
                let expected_rng = case
                    .expected_rng_out
                    .unwrap_or_else(|| panic!("case {case_index} {} missing expected rng", case.label));
                assert_eq!(actual.rng, rng(expected_rng), "case {case_index} {} rng out", case.label);
                assert_eq!(
                    actual.draws.len(),
                    case.expected_draws.len(),
                    "case {case_index} {} draw count",
                    case.label
                );
                for (draw_index, (draw, expected_draw)) in
                    actual.draws.iter().zip(case.expected_draws.iter()).enumerate()
                {
                    assert_eq!(
                        draw.call, expected_draw.call,
                        "case {case_index} {} draw[{draw_index}].call", case.label
                    );
                    assert_eq!(
                        draw.reason, expected_draw.reason,
                        "case {case_index} {} draw[{draw_index}].reason", case.label
                    );
                    assert_eq!(
                        draw.before, expected_draw.before,
                        "case {case_index} {} draw[{draw_index}].before", case.label
                    );
                    assert_eq!(
                        draw.after, expected_draw.after,
                        "case {case_index} {} draw[{draw_index}].after", case.label
                    );
                    assert_eq!(
                        draw.random_value, expected_draw.random_value,
                        "case {case_index} {} draw[{draw_index}].random_value", case.label
                    );
                    assert_eq!(
                        draw.provenance.program_counter, expected_draw.provenance.program_counter,
                        "case {case_index} {} draw[{draw_index}].provenance.program_counter", case.label
                    );
                    assert_eq!(
                        draw.provenance.opcode_id, expected_draw.provenance.opcode_id,
                        "case {case_index} {} draw[{draw_index}].provenance.opcode_id", case.label
                    );
                    assert_eq!(
                        draw.provenance.opcode_name, expected_draw.provenance.opcode_name,
                        "case {case_index} {} draw[{draw_index}].provenance.opcode_name", case.label
                    );
                    assert_eq!(
                        draw.provenance.dispatcher, expected_draw.provenance.dispatcher,
                        "case {case_index} {} draw[{draw_index}].provenance.dispatcher", case.label
                    );
                    assert_eq!(
                        draw.provenance.source_label, expected_draw.provenance.source_label,
                        "case {case_index} {} draw[{draw_index}].provenance.source_label", case.label
                    );
                    assert_eq!(
                        draw.provenance.source_statement_line,
                        expected_draw.provenance.source_statement_line,
                        "case {case_index} {} draw[{draw_index}].provenance.source_statement_line", case.label
                    );
                }
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
    assert_eq!(BATTLE_SCRIPT_ADJUSTDAMAGE_REGISTRATION_CASES.len(), 4);
    for case in BATTLE_SCRIPT_ADJUSTDAMAGE_REGISTRATION_CASES {
        execute_registration_case(&case);
    }
}

fn execute_registration_case(case: &BattleScriptAdjustDamageRegistrationVectorCase) {
    let instructions: Vec<BattleScriptAdjustDamageInstruction<'static>> =
        case.instructions.to_vec();
    let result = register_battle_script_adjustdamage_handlers(&instructions);
    match (result, case.expected_registered, case.expected_error) {
        (Ok(_), true, None) => {}
        (Err(actual), false, Some(expected)) => {
            assert_eq!(actual.to_string(), expected, "{}", case.label)
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
        BATTLE_SCRIPT_ADJUSTDAMAGE_CATEGORY_CENSUS,
        [
            ("endured", 3),
            ("enigma-berry", 2),
            ("false-swipe", 6),
            ("focus-band", 5),
            ("hp-boundary", 2),
            ("item-errors", 1),
            ("no-clamp", 3),
            ("pre-existing-flag", 1),
            ("rng-bookkeeping", 1),
            ("role-errors", 3),
            ("substitute", 2),
            ("variance", 5),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_ADJUSTDAMAGE_BRANCH_CENSUS,
        [
            ("item-out-of-range", 1),
            ("missing-target-role", 3),
            ("no-draw", 6),
            ("single-draw", 17),
            ("two-draws", 5),
            ("unknown-move-row", 2),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_ADJUSTDAMAGE_OPCODE_CENSUS,
        [
            ("adjustnormaldamage", 18),
            ("adjustnormaldamage2", 6),
            ("adjustsetdamage", 10),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_ADJUSTDAMAGE_REGISTRATION_BRANCH_CENSUS,
        [("missing-opcode", 3), ("registered", 1)]
    );
    assert_eq!(
        BATTLE_SCRIPT_ADJUSTDAMAGE_VECTOR_CORPUS_SHA256,
        "02413888d15f9578a2cc3cba2a8add8df97e1c1f9ecf149a5062cf3e32e545ec"
    );
}
