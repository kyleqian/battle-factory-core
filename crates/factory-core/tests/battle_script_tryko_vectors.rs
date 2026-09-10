//! Canonical-TypeScript differential and registration ratchets for
//! `B_SCR_OP_TRYKO` (0x93).
//!
//! Regenerate with `node --experimental-strip-types
//! core-rs/tools/gen-battle-script-tryko-vectors.mjs`.

use factory_core::battle_script_ai_reveal::BattleScriptAiRevealRules;
use factory_core::battle_script_tryko::{
    apply_battle_script_tryko, register_battle_script_tryko, BattleScriptTryKoBattler,
    BattleScriptTryKoBattlerState, BattleScriptTryKoControl, BattleScriptTryKoInstruction,
    BattleScriptTryKoRngState, BattleScriptTryKoRoles, BattleScriptTryKoRules,
};
use factory_core::battle_script_tryko_vectors_gen::{
    BattleScriptTryKoRegistrationVectorCase, BattleScriptTryKoVectorBattlerState,
    BattleScriptTryKoVectorControl, BattleScriptTryKoVectorRng, BattleScriptTryKoVectorRules,
    BATTLE_SCRIPT_TRYKO_BRANCH_CENSUS, BATTLE_SCRIPT_TRYKO_CASES,
    BATTLE_SCRIPT_TRYKO_CATEGORY_CENSUS, BATTLE_SCRIPT_TRYKO_REGISTRATION_BRANCH_CENSUS,
    BATTLE_SCRIPT_TRYKO_REGISTRATION_CASES, BATTLE_SCRIPT_TRYKO_VECTOR_CORPUS_SHA256,
};

fn battler(value: BattleScriptTryKoVectorBattlerState) -> BattleScriptTryKoBattlerState {
    BattleScriptTryKoBattlerState {
        item: value.item,
        ability: value.ability,
        level: value.level,
        hp: value.hp,
        endured: value.endured,
        special_status_focus_banded: value.focus_banded,
        status3: value.status3,
        battler_with_sure_hit: value.battler_with_sure_hit,
    }
}

fn rules(value: BattleScriptTryKoVectorRules) -> BattleScriptTryKoRules {
    BattleScriptTryKoRules {
        battlers: value.battlers.map(battler),
        current_move: value.current_move,
        battle_move_damage: value.battle_move_damage,
        move_result_flags: value.move_result_flags,
        last_used_item: value.last_used_item,
        last_used_ability: value.last_used_ability,
        multistring_chooser: value.multistring_chooser,
        enigma_berry_hold_effects: value.enigma_berry_hold_effects,
        enigma_berry_hold_effect_params: value.enigma_berry_hold_effect_params,
        ai_reveal: BattleScriptAiRevealRules {
            ai_observed_ability_ids: value.ai_observed_ability_ids,
            ai_observed_item_effects: value.ai_observed_item_effects,
        },
        selector_roles: BattleScriptTryKoRoles {
            attacker: value.attacker.and_then(BattleScriptTryKoBattler::from_u8),
            target: value.target.and_then(BattleScriptTryKoBattler::from_u8),
        },
    }
}

fn vector_rules(value: BattleScriptTryKoRules) -> BattleScriptTryKoVectorRules {
    BattleScriptTryKoVectorRules {
        battlers: value
            .battlers
            .map(|battler| BattleScriptTryKoVectorBattlerState {
                item: battler.item,
                ability: battler.ability,
                level: battler.level,
                hp: battler.hp,
                endured: battler.endured,
                focus_banded: battler.special_status_focus_banded,
                status3: battler.status3,
                battler_with_sure_hit: battler.battler_with_sure_hit,
            }),
        current_move: value.current_move,
        battle_move_damage: value.battle_move_damage,
        move_result_flags: value.move_result_flags,
        last_used_item: value.last_used_item,
        last_used_ability: value.last_used_ability,
        multistring_chooser: value.multistring_chooser,
        enigma_berry_hold_effects: value.enigma_berry_hold_effects,
        enigma_berry_hold_effect_params: value.enigma_berry_hold_effect_params,
        ai_observed_item_effects: value.ai_reveal.ai_observed_item_effects,
        ai_observed_ability_ids: value.ai_reveal.ai_observed_ability_ids,
        attacker: value
            .selector_roles
            .attacker
            .map(BattleScriptTryKoBattler::as_u8),
        target: value
            .selector_roles
            .target
            .map(BattleScriptTryKoBattler::as_u8),
    }
}

fn rng(value: BattleScriptTryKoVectorRng) -> BattleScriptTryKoRngState {
    BattleScriptTryKoRngState { value: value.value, calls: value.calls }
}

fn control(value: BattleScriptTryKoVectorControl) -> BattleScriptTryKoControl {
    match value {
        BattleScriptTryKoVectorControl::Advance => BattleScriptTryKoControl::Advance,
        BattleScriptTryKoVectorControl::Jump { program_counter } => {
            BattleScriptTryKoControl::Jump { program_counter }
        }
    }
}

#[test]
fn complete_projected_outputs_controls_and_errors_match_canonical_typescript() {
    assert_eq!(BATTLE_SCRIPT_TRYKO_CASES.len(), 27);
    for (case_index, case) in BATTLE_SCRIPT_TRYKO_CASES.iter().enumerate() {
        let input = rules(case.initial);
        let before = input;
        let rng_in = rng(case.rng_in);
        let instruction = case.instruction;

        let result = apply_battle_script_tryko(&input, rng_in, &instruction);

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
                let expected_control = case
                    .control
                    .unwrap_or_else(|| panic!("case {case_index} {} missing expected control", case.label));
                assert_eq!(
                    actual.control,
                    control(expected_control),
                    "case {case_index} {} control",
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
                    assert_eq!(draw.call, expected_draw.call, "case {case_index} {} draw[{draw_index}].call", case.label);
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
                        draw.provenance.source_statement_line, expected_draw.provenance.source_statement_line,
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
    assert_eq!(BATTLE_SCRIPT_TRYKO_REGISTRATION_CASES.len(), 3);
    for case in BATTLE_SCRIPT_TRYKO_REGISTRATION_CASES {
        execute_registration_case(&case);
    }
}

fn execute_registration_case(case: &BattleScriptTryKoRegistrationVectorCase) {
    // The registration corpus only ever carries the real committed
    // instruction plus filler noise; reconstruct the minimal instruction
    // list from the expectation shape rather than threading a second
    // generated instruction array through the corpus.
    let noise = BattleScriptTryKoInstruction {
        opcode_name: "B_SCR_OP_RUST_NOISE",
        opcode_id: 0,
        program_counter: 0,
        dispatcher: "Cmd_noise",
        source_label: "Noise",
        source_statement_line: 0,
        operands: &[],
        resolved_sturdy_target: None,
        resolved_fail_target: None,
    };
    let canonical = BattleScriptTryKoInstruction {
        opcode_name: "B_SCR_OP_TRYKO",
        opcode_id: 0x93,
        program_counter: 417,
        dispatcher: "Cmd_tryKO",
        source_label: "BattleScript_EffectOHKO",
        source_statement_line: 769,
        operands: &[],
        resolved_sturdy_target: None,
        resolved_fail_target: None,
    };
    let instructions: Vec<BattleScriptTryKoInstruction<'static>> = match case.label {
        "valid_singleton" => vec![noise, canonical],
        "missing_opcode" => vec![noise],
        "duplicate_first_wins" => vec![canonical, noise, canonical],
        other => panic!("unknown registration case label {other}"),
    };
    let result = register_battle_script_tryko(&instructions);
    match (result, case.expected_opcode_id, case.expected_error) {
        (Ok(actual), Some(expected), None) => assert_eq!(actual, expected, "{}", case.label),
        (Err(actual), None, Some(expected)) => {
            assert_eq!(actual.to_string(), expected, "{}", case.label)
        }
        (actual, expected_id, expected_error) => panic!(
            "{} registration mismatch: actual={actual:?}, expected_opcode_id={expected_id:?}, expected_error={expected_error:?}",
            case.label
        ),
    }
}

#[test]
fn corpus_censuses_and_hash_are_pinned() {
    assert_eq!(
        BATTLE_SCRIPT_TRYKO_CATEGORY_CENSUS,
        [
            ("errors", 5),
            ("focus-band", 4),
            ("formula", 4),
            ("miss-message", 3),
            ("rng-bookkeeping", 1),
            ("role-errors", 2),
            ("sturdy", 1),
            ("sure-hit", 3),
            ("trichotomy", 4),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYKO_BRANCH_CENSUS,
        [
            ("advance-0-draws", 5),
            ("advance-1-draw", 4),
            ("advance-2-draws", 2),
            ("item-out-of-range", 1),
            ("jump-0-draws", 1),
            ("jump-1-draw", 7),
            ("jump-2-draws", 1),
            ("missing-attacker-role", 1),
            ("missing-target-role", 1),
            ("unknown-move-row", 2),
            ("unresolved-fail-target", 1),
            ("unresolved-sturdy-label", 1),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYKO_REGISTRATION_BRANCH_CENSUS,
        [("missing-opcode", 1), ("registered", 2)]
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYKO_VECTOR_CORPUS_SHA256,
        "c949f5acd9149736b56ac90e07e71fb2f18b399abe7cb30cce09b7a97cf429d7"
    );
}
