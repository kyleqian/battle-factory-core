//! Canonical-TypeScript differential and registration ratchets for
//! `critcalcOpcodeHandler` (`B_SCR_OP_CRITCALC`, 0x04).
//!
//! Regenerate with `node --experimental-strip-types
//! core-rs/tools/gen-battle-script-critcalc-vectors.mjs`.

use factory_core::battle_script_critcalc::{
    apply_battle_script_critcalc, register_battle_script_critcalc, BattleScriptCritcalcBattler,
    BattleScriptCritcalcBattlerState, BattleScriptCritcalcInstruction,
    BattleScriptCritcalcRngState, BattleScriptCritcalcRoles, BattleScriptCritcalcRules,
};
use factory_core::battle_script_critcalc_vectors_gen::{
    BattleScriptCritcalcRegistrationVectorCase, BattleScriptCritcalcVectorBattlerState,
    BattleScriptCritcalcVectorRng, BattleScriptCritcalcVectorRules,
    BATTLE_SCRIPT_CRITCALC_BRANCH_CENSUS, BATTLE_SCRIPT_CRITCALC_CASES,
    BATTLE_SCRIPT_CRITCALC_CATEGORY_CENSUS, BATTLE_SCRIPT_CRITCALC_REGISTRATION_BRANCH_CENSUS,
    BATTLE_SCRIPT_CRITCALC_REGISTRATION_CASES, BATTLE_SCRIPT_CRITCALC_VECTOR_CORPUS_SHA256,
};

fn battler(value: BattleScriptCritcalcVectorBattlerState) -> BattleScriptCritcalcBattlerState {
    BattleScriptCritcalcBattlerState {
        item: value.item,
        ability: value.ability,
        species: value.species,
        status2: value.status2,
        status3: value.status3,
    }
}

fn rules(value: BattleScriptCritcalcVectorRules) -> BattleScriptCritcalcRules {
    BattleScriptCritcalcRules {
        battlers: value.battlers.map(battler),
        battle_type_flags: value.battle_type_flags,
        current_move: value.current_move,
        crit_multiplier: value.crit_multiplier,
        enigma_berry_hold_effects: value.enigma_berry_hold_effects,
        selector_roles: BattleScriptCritcalcRoles {
            attacker: value
                .attacker
                .and_then(BattleScriptCritcalcBattler::from_u8),
            target: value.target.and_then(BattleScriptCritcalcBattler::from_u8),
        },
    }
}

fn vector_rules(value: BattleScriptCritcalcRules) -> BattleScriptCritcalcVectorRules {
    BattleScriptCritcalcVectorRules {
        battlers: value
            .battlers
            .map(|battler| BattleScriptCritcalcVectorBattlerState {
                item: battler.item,
                ability: battler.ability,
                species: battler.species,
                status2: battler.status2,
                status3: battler.status3,
            }),
        battle_type_flags: value.battle_type_flags,
        current_move: value.current_move,
        crit_multiplier: value.crit_multiplier,
        enigma_berry_hold_effects: value.enigma_berry_hold_effects,
        attacker: value
            .selector_roles
            .attacker
            .map(BattleScriptCritcalcBattler::as_u8),
        target: value
            .selector_roles
            .target
            .map(BattleScriptCritcalcBattler::as_u8),
    }
}

fn rng(value: BattleScriptCritcalcVectorRng) -> BattleScriptCritcalcRngState {
    BattleScriptCritcalcRngState { value: value.value, calls: value.calls }
}

#[test]
fn complete_projected_outputs_and_errors_match_canonical_typescript() {
    assert_eq!(BATTLE_SCRIPT_CRITCALC_CASES.len(), 30);
    for (case_index, case) in BATTLE_SCRIPT_CRITCALC_CASES.iter().enumerate() {
        let input = rules(case.initial);
        let before = input;
        let rng_in = rng(case.rng_in);

        let result = apply_battle_script_critcalc(&input, rng_in, &case.instruction);

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
                assert_eq!(
                    actual.rng,
                    rng(expected_rng),
                    "case {case_index} {} rng out",
                    case.label
                );
                match (actual.draw, &case.expected_draw) {
                    (None, None) => {}
                    (Some(draw), Some(expected_draw)) => {
                        assert_eq!(draw.call, expected_draw.call, "case {case_index} {} draw.call", case.label);
                        assert_eq!(draw.reason, expected_draw.reason, "case {case_index} {} draw.reason", case.label);
                        assert_eq!(draw.before, expected_draw.before, "case {case_index} {} draw.before", case.label);
                        assert_eq!(draw.after, expected_draw.after, "case {case_index} {} draw.after", case.label);
                        assert_eq!(
                            draw.random_value, expected_draw.random_value,
                            "case {case_index} {} draw.random_value", case.label
                        );
                        assert_eq!(
                            draw.provenance.program_counter, expected_draw.provenance.program_counter,
                            "case {case_index} {} provenance.program_counter", case.label
                        );
                        assert_eq!(
                            draw.provenance.opcode_id, expected_draw.provenance.opcode_id,
                            "case {case_index} {} provenance.opcode_id", case.label
                        );
                        assert_eq!(
                            draw.provenance.opcode_name, expected_draw.provenance.opcode_name,
                            "case {case_index} {} provenance.opcode_name", case.label
                        );
                        assert_eq!(
                            draw.provenance.dispatcher, expected_draw.provenance.dispatcher,
                            "case {case_index} {} provenance.dispatcher", case.label
                        );
                        assert_eq!(
                            draw.provenance.source_label, expected_draw.provenance.source_label,
                            "case {case_index} {} provenance.source_label", case.label
                        );
                        assert_eq!(
                            draw.provenance.source_statement_line, expected_draw.provenance.source_statement_line,
                            "case {case_index} {} provenance.source_statement_line", case.label
                        );
                    }
                    (actual_draw, expected_draw) => panic!(
                        "case {case_index} {} draw presence disagrees: actual={actual_draw:?}, expected={expected_draw:?}",
                        case.label
                    ),
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
    assert_eq!(BATTLE_SCRIPT_CRITCALC_REGISTRATION_CASES.len(), 3);
    for case in BATTLE_SCRIPT_CRITCALC_REGISTRATION_CASES {
        execute_registration_case(&case);
    }
}

fn execute_registration_case(case: &BattleScriptCritcalcRegistrationVectorCase) {
    let instructions: Vec<BattleScriptCritcalcInstruction<'static>> = case.instructions.to_vec();
    match (
        register_battle_script_critcalc(&instructions),
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
        BATTLE_SCRIPT_CRITCALC_CATEGORY_CENSUS,
        [
            ("crit-roll", 4),
            ("immunity", 5),
            ("move-resolution", 1),
            ("provenance", 2),
            ("rng-bookkeeping", 1),
            ("role-errors", 3),
            ("stage-clamp", 2),
            ("stage-focus-energy", 2),
            ("stage-hold-effect", 5),
            ("stage-move-effect", 5),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_CRITCALC_BRANCH_CENSUS,
        [
            ("advance-drew", 21),
            ("immune-no-draw", 5),
            ("missing-attacker-role", 2),
            ("missing-target-role", 1),
            ("unknown-move-row", 1),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_CRITCALC_REGISTRATION_BRANCH_CENSUS,
        [("missing-opcode", 1), ("registered", 2)]
    );
    assert_eq!(
        BATTLE_SCRIPT_CRITCALC_VECTOR_CORPUS_SHA256,
        "6f79151fb416e38a6857f812310dd7819f81f59031acd0b31209325a4ba52b6e"
    );
}
