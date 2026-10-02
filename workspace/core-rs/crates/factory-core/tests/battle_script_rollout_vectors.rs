//! Canonical-TypeScript differential, registration, and immutable state
//! ratchets for `battleScriptRolloutOpcode.ts` (plus its projected helpers
//! `cancelBattleScriptMultiTurnMoves` and `requireBattlerRole`).
//!
//! Regenerate with `node --experimental-strip-types
//! core-rs/tools/gen-battle-script-rollout-vectors.mjs`.

use factory_core::battle_script_rolloutdamagecalculation::{
    apply_battle_script_rollout, validate_battle_script_rollout_registration,
    BattleScriptRolloutBattlerState, BattleScriptRolloutControl, BattleScriptRolloutInstruction,
    BattleScriptRolloutLabels, BattleScriptRolloutRoles, BattleScriptRolloutRules,
};
use factory_core::battle_script_rolloutdamagecalculation_vectors_gen::{
    BattleScriptRolloutRegistrationVectorCase, BattleScriptRolloutVectorState,
    BATTLE_SCRIPT_ROLLOUT_BRANCH_CENSUS, BATTLE_SCRIPT_ROLLOUT_CASES,
    BATTLE_SCRIPT_ROLLOUT_CATEGORY_CENSUS, BATTLE_SCRIPT_ROLLOUT_DOMAIN_CENSUS,
    BATTLE_SCRIPT_ROLLOUT_REGISTRATION_BRANCH_CENSUS, BATTLE_SCRIPT_ROLLOUT_REGISTRATION_CASES,
    BATTLE_SCRIPT_ROLLOUT_VECTOR_CORPUS_SHA256,
};

fn rules(value: BattleScriptRolloutVectorState) -> BattleScriptRolloutRules {
    BattleScriptRolloutRules {
        battlers: value
            .battlers
            .map(|battler| BattleScriptRolloutBattlerState {
                side: battler.side,
                ability: battler.ability,
                hp: battler.hp,
                max_hp: battler.max_hp,
                item: battler.item,
                party_index: battler.party_index,
                status2: battler.status2,
                status3: battler.status3,
                rollout_timer: battler.rollout_timer,
                fury_cutter_counter: battler.fury_cutter_counter,
            }),
        selector_roles: BattleScriptRolloutRoles { attacker: value.attacker, target: value.target },
        locked_moves: value.locked_moves,
        rollout_timer_start_values: value.rollout_timer_start_values,
        current_move: value.current_move,
        current_move_power: value.current_move_power,
        move_result_flags: value.move_result_flags,
        dynamic_base_power: value.dynamic_base_power,
    }
}

fn vector_state(value: BattleScriptRolloutRules) -> BattleScriptRolloutVectorState {
    BattleScriptRolloutVectorState {
        battlers: value.battlers.map(|battler| {
            factory_core::battle_script_rolloutdamagecalculation_vectors_gen::BattleScriptRolloutVectorBattlerState {
                side: battler.side,
                ability: battler.ability,
                hp: battler.hp,
                max_hp: battler.max_hp,
                item: battler.item,
                party_index: battler.party_index,
                status2: battler.status2,
                status3: battler.status3,
                rollout_timer: battler.rollout_timer,
                fury_cutter_counter: battler.fury_cutter_counter,
            }
        }),
        attacker: value.selector_roles.attacker,
        target: value.selector_roles.target,
        locked_moves: value.locked_moves,
        rollout_timer_start_values: value.rollout_timer_start_values,
        current_move: value.current_move,
        current_move_power: value.current_move_power,
        move_result_flags: value.move_result_flags,
        dynamic_base_power: value.dynamic_base_power,
    }
}

#[test]
fn complete_projected_outputs_controls_errors_and_immutability_match_canonical_typescript() {
    assert_eq!(BATTLE_SCRIPT_ROLLOUT_CASES.len(), 87);
    for (case_index, case) in BATTLE_SCRIPT_ROLLOUT_CASES.iter().enumerate() {
        execute_case(case_index, case);
    }
}

fn execute_case(
    case_index: usize,
    case: &factory_core::battle_script_rolloutdamagecalculation_vectors_gen::BattleScriptRolloutVectorCase,
) {
    let input = rules(case.initial);
    let before = input;
    let move_missed_pause_resolved = case.branch != "missing-move-missed-pause";
    let labels = BattleScriptRolloutLabels { move_missed_pause_resolved };

    match (
        apply_battle_script_rollout(labels, &input),
        case.expected,
        case.control,
        case.expected_error,
    ) {
        (Ok(outcome), Some(expected), Some(expected_control), None) => {
            assert_eq!(
                input, before,
                "case {case_index} {} mutated rules input",
                case.label
            );
            assert_eq!(
                outcome.control, expected_control,
                "case {case_index} {} control mismatch",
                case.label
            );
            assert_eq!(
                vector_state(outcome.rules),
                expected,
                "case {case_index} {} complete projected state",
                case.label
            );
        }
        (Err(actual), None, None, Some(expected)) => {
            assert_eq!(
                input, before,
                "case {case_index} {} mutated rules input on error",
                case.label
            );
            assert_eq!(
                actual.to_string(),
                expected,
                "case {case_index} {} exact error",
                case.label
            );
        }
        (actual, expected, expected_control, expected_error) => panic!(
            "case {case_index} {} generated outcome disagrees: actual={actual:?}, expected={expected:?}, expected_control={expected_control:?}, expected_error={expected_error:?}",
            case.label
        ),
    }
}

#[test]
fn registration_matches_canonical_typescript_and_keeps_exact_errors() {
    assert_eq!(BATTLE_SCRIPT_ROLLOUT_REGISTRATION_CASES.len(), 6);
    for case in BATTLE_SCRIPT_ROLLOUT_REGISTRATION_CASES {
        execute_registration_case(&case);
    }
}

fn execute_registration_case(case: &BattleScriptRolloutRegistrationVectorCase) {
    let instructions: Vec<BattleScriptRolloutInstruction<'static>> = case
        .instructions
        .iter()
        .map(|spec| BattleScriptRolloutInstruction {
            opcode_name: spec.opcode_name,
            program_counter: spec.program_counter,
            opcode_id: spec.opcode_id,
            dispatcher: spec.dispatcher,
            operand_count: spec.operand_count,
        })
        .collect();
    match (
        validate_battle_script_rollout_registration(&instructions),
        case.expected_opcode_id,
        case.expected_error,
    ) {
        (Ok(actual), Some(expected), None) => {
            assert_eq!(actual.opcode_id, expected, "{}", case.label)
        }
        (Err(actual), None, Some(expected)) => {
            assert_eq!(actual.to_string(), expected, "{}", case.label)
        }
        (actual, expected_opcode, expected_error) => panic!(
            "{} registration mismatch: actual={actual:?}, expected_opcode={expected_opcode:?}, expected_error={expected_error:?}",
            case.label
        ),
    }
}

#[test]
fn dense_matrices_cover_all_required_domains() {
    let no_effect_matrix = BATTLE_SCRIPT_ROLLOUT_CASES
        .iter()
        .filter(|case| case.category == "no-effect-cancellation-matrix")
        .collect::<Vec<_>>();
    assert_eq!(no_effect_matrix.len(), 60);
    assert!(no_effect_matrix
        .iter()
        .any(|case| case.control == Some(BattleScriptRolloutControl::Advance)));
    assert!(no_effect_matrix
        .iter()
        .any(|case| case.control == Some(BattleScriptRolloutControl::MoveMissedPauseJump)));

    let ladder_no_curl = BATTLE_SCRIPT_ROLLOUT_CASES
        .iter()
        .filter(|case| case.category == "five-hit-ladder-no-defense-curl")
        .collect::<Vec<_>>();
    assert_eq!(ladder_no_curl.len(), 5);
    let powers: Vec<u32> = ladder_no_curl
        .iter()
        .map(|case| {
            case.expected
                .expect("ladder hit must succeed")
                .dynamic_base_power
        })
        .collect();
    assert_eq!(powers, [30, 60, 120, 240, 480]);

    let ladder_curl = BATTLE_SCRIPT_ROLLOUT_CASES
        .iter()
        .filter(|case| case.category == "five-hit-ladder-defense-curl")
        .collect::<Vec<_>>();
    assert_eq!(ladder_curl.len(), 5);
    let curl_powers: Vec<u32> = ladder_curl
        .iter()
        .map(|case| {
            case.expected
                .expect("ladder hit must succeed")
                .dynamic_base_power
        })
        .collect();
    assert_eq!(curl_powers, [60, 120, 240, 480, 960]);
}

#[test]
fn corpus_censuses_and_hash_are_pinned() {
    assert_eq!(
        BATTLE_SCRIPT_ROLLOUT_DOMAIN_CENSUS,
        [
            ("source-battler-slots", 4),
            ("move-result-flag-sweep-values", 5),
            ("status-combos", 12),
            ("registration-cases", 6),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_ROLLOUT_CATEGORY_CENSUS,
        [
            ("attacker-battler-sweep-no-effect", 4),
            ("attacker-battler-sweep-success", 4),
            ("current-move-power-edge", 4),
            ("five-hit-ladder-defense-curl", 5),
            ("five-hit-ladder-no-defense-curl", 5),
            ("missing-attacker-role", 1),
            ("no-effect-cancellation-matrix", 60),
            ("non-first-hit-preserves-locked-state", 1),
            ("unresolved-move-missed-pause", 2),
            ("zero-rollout-timer", 1),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_ROLLOUT_BRANCH_CENSUS,
        [
            ("advance", 32),
            ("missing-attacker-role", 1),
            ("missing-move-missed-pause", 1),
            ("move-missed-pause-jump", 52),
            ("zero-rollout-timer", 1),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_ROLLOUT_REGISTRATION_BRANCH_CENSUS,
        [("invalid-shape", 5), ("registered", 1)]
    );
    assert_eq!(
        BATTLE_SCRIPT_ROLLOUT_VECTOR_CORPUS_SHA256,
        "8bb284f294f3877e6f5ab27f700592cc344e7f746226b48683b4b866223b8017"
    );
}
