//! Canonical-TypeScript differential, registration, and immutable state
//! ratchets for `battleScriptChargeSportOpcode.ts`.
//!
//! Regenerate with `node --experimental-strip-types
//! core-rs/tools/gen-battle-script-chargesport-vectors.mjs`.

use factory_core::battle_script_chargesport::{
    apply_battle_script_setcharge, apply_battle_script_settypebasedhalvers,
    register_battle_script_chargesport_handlers, BattleScriptChargeSportBattlerState,
    BattleScriptChargeSportControl, BattleScriptChargeSportRoles, BattleScriptChargeSportRules,
    BATTLE_SCRIPT_CHARGESPORT_EFFECT_MUD_SPORT, BATTLE_SCRIPT_CHARGESPORT_EFFECT_WATER_SPORT,
    BATTLE_SCRIPT_CHARGESPORT_STATUS3_CHARGED_UP, BATTLE_SCRIPT_CHARGESPORT_STATUS3_MUDSPORT,
    BATTLE_SCRIPT_CHARGESPORT_STATUS3_WATERSPORT,
};
use factory_core::battle_script_chargesport_vectors_gen::{
    BattleScriptChargeSportRegistrationVectorCase, BattleScriptChargeSportVectorBattlerState,
    BattleScriptChargeSportVectorState, BATTLE_SCRIPT_CHARGESPORT_BRANCH_CENSUS,
    BATTLE_SCRIPT_CHARGESPORT_CASES, BATTLE_SCRIPT_CHARGESPORT_CATEGORY_CENSUS,
    BATTLE_SCRIPT_CHARGESPORT_DOMAIN_CENSUS, BATTLE_SCRIPT_CHARGESPORT_OPCODE_CENSUS,
    BATTLE_SCRIPT_CHARGESPORT_REGISTRATION_BRANCH_CENSUS,
    BATTLE_SCRIPT_CHARGESPORT_REGISTRATION_CASES, BATTLE_SCRIPT_CHARGESPORT_VECTOR_CORPUS_SHA256,
};
use factory_core::gen_tables;

fn rules(value: BattleScriptChargeSportVectorState) -> BattleScriptChargeSportRules {
    BattleScriptChargeSportRules {
        battlers: value
            .battlers
            .map(|battler| BattleScriptChargeSportBattlerState {
                status3: battler.status3,
                charge_timer: battler.charge_timer,
                charge_timer_start_value: battler.charge_timer_start_value,
            }),
        selector_roles: BattleScriptChargeSportRoles { attacker: value.attacker },
        current_move: value.current_move,
        multistring_chooser: value.multistring_chooser,
    }
}

fn vector_state(value: BattleScriptChargeSportRules) -> BattleScriptChargeSportVectorState {
    BattleScriptChargeSportVectorState {
        battlers: value
            .battlers
            .map(|battler| BattleScriptChargeSportVectorBattlerState {
                status3: battler.status3,
                charge_timer: battler.charge_timer,
                charge_timer_start_value: battler.charge_timer_start_value,
            }),
        attacker: value.selector_roles.attacker,
        current_move: value.current_move,
        multistring_chooser: value.multistring_chooser,
    }
}

#[test]
fn complete_projected_outputs_controls_errors_and_immutability_match_canonical_typescript() {
    assert_eq!(BATTLE_SCRIPT_CHARGESPORT_CASES.len(), 211);
    for (case_index, case) in BATTLE_SCRIPT_CHARGESPORT_CASES.iter().enumerate() {
        execute_case(case_index, case);
    }
}

fn execute_case(
    case_index: usize,
    case: &factory_core::battle_script_chargesport_vectors_gen::BattleScriptChargeSportVectorCase,
) {
    let input = rules(case.initial);
    let before = input;

    let outcome = match case.opcode {
        "charge" => apply_battle_script_setcharge(&input),
        "sport" => apply_battle_script_settypebasedhalvers(case.instruction, &input),
        other => panic!("case {case_index} {} unknown opcode {other}", case.label),
    };

    match (outcome, case.expected, case.control, case.expected_error) {
        (Ok(outcome), Some(expected), Some(expected_control), None) => {
            assert_eq!(input, before, "case {case_index} {} mutated rules input", case.label);
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
            assert_transition_shape(case_index, case, before, outcome);
        }
        (Err(actual), None, None, Some(expected)) => {
            assert_eq!(
                input, before,
                "case {case_index} {} mutated rules input on error",
                case.label
            );
            assert_eq!(actual.to_string(), expected, "case {case_index} {} exact error", case.label);
        }
        (actual, expected, expected_control, expected_error) => panic!(
            "case {case_index} {} generated outcome disagrees: actual={actual:?}, expected={expected:?}, expected_control={expected_control:?}, expected_error={expected_error:?}",
            case.label
        ),
    }
}

fn assert_transition_shape(
    case_index: usize,
    case: &factory_core::battle_script_chargesport_vectors_gen::BattleScriptChargeSportVectorCase,
    prior: BattleScriptChargeSportRules,
    outcome: factory_core::battle_script_chargesport::BattleScriptChargeSportOutcome,
) {
    let attacker = prior
        .selector_roles
        .attacker
        .expect("resolved case has attacker");

    if case.opcode == "charge" {
        assert_eq!(
            outcome.control,
            BattleScriptChargeSportControl::Advance,
            "case {case_index} {} charge always advances",
            case.label
        );
        assert_eq!(
            outcome.rules.battlers[attacker.index()].status3,
            prior.battlers[attacker.index()].status3 | BATTLE_SCRIPT_CHARGESPORT_STATUS3_CHARGED_UP,
            "case {case_index} {} charge bit set",
            case.label
        );
        assert_eq!(outcome.rules.battlers[attacker.index()].charge_timer, 2);
        assert_eq!(
            outcome.rules.battlers[attacker.index()].charge_timer_start_value,
            2
        );
        for i in 0..4 {
            if i != attacker.index() {
                assert_eq!(
                    outcome.rules.battlers[i], prior.battlers[i],
                    "case {case_index} {} untouched battler {i} changed",
                    case.label
                );
            }
        }
        return;
    }

    let move_row = gen_tables::MOVES
        .get(usize::from(prior.current_move))
        .expect("resolved sport case has a valid move row");
    let is_mud_sport = move_row.effect == BATTLE_SCRIPT_CHARGESPORT_EFFECT_MUD_SPORT;
    assert!(
        is_mud_sport || move_row.effect == BATTLE_SCRIPT_CHARGESPORT_EFFECT_WATER_SPORT,
        "case {case_index} {} resolved sport case must have a sport effect",
        case.label
    );
    let bit = if is_mud_sport {
        BATTLE_SCRIPT_CHARGESPORT_STATUS3_MUDSPORT
    } else {
        BATTLE_SCRIPT_CHARGESPORT_STATUS3_WATERSPORT
    };
    let already_set = prior.battlers[attacker.index()].status3 & bit != 0;

    match outcome.control {
        BattleScriptChargeSportControl::Jump { .. } => {
            assert!(
                already_set,
                "case {case_index} {} jumped without the bit set",
                case.label
            );
            assert_eq!(
                outcome.rules, prior,
                "case {case_index} {} jump must leave rules unchanged",
                case.label
            );
        }
        BattleScriptChargeSportControl::Advance => {
            assert!(
                !already_set,
                "case {case_index} {} advanced despite the bit set",
                case.label
            );
            assert_eq!(
                outcome.rules.battlers[attacker.index()].status3,
                prior.battlers[attacker.index()].status3 | bit,
                "case {case_index} {} sport bit set",
                case.label
            );
            let expected_chooser = if is_mud_sport { 0 } else { 1 };
            assert_eq!(
                outcome.rules.multistring_chooser, expected_chooser,
                "case {case_index} {} multistring chooser",
                case.label
            );
            for i in 0..4 {
                if i != attacker.index() {
                    assert_eq!(
                        outcome.rules.battlers[i], prior.battlers[i],
                        "case {case_index} {} untouched battler {i} changed",
                        case.label
                    );
                }
            }
        }
    }
}

#[test]
fn registration_matches_canonical_typescript_and_keeps_exact_errors() {
    assert_eq!(BATTLE_SCRIPT_CHARGESPORT_REGISTRATION_CASES.len(), 14);
    for case in BATTLE_SCRIPT_CHARGESPORT_REGISTRATION_CASES {
        execute_registration_case(&case);
    }
}

fn execute_registration_case(case: &BattleScriptChargeSportRegistrationVectorCase) {
    let instructions = [case.charge_instructions, case.sport_instructions].concat();
    match (
        register_battle_script_chargesport_handlers(&instructions),
        case.expected_charge_opcode_id,
        case.expected_sport_opcode_id,
        case.expected_error,
    ) {
        (Ok(actual), Some(expected_charge), Some(expected_sport), None) => {
            assert_eq!(actual.charge_opcode_id, expected_charge, "{}", case.label);
            assert_eq!(actual.sport_opcode_id, expected_sport, "{}", case.label);
        }
        (Err(actual), None, None, Some(expected)) => {
            assert_eq!(actual.to_string(), expected, "{}", case.label);
        }
        (actual, expected_charge, expected_sport, expected_error) => panic!(
            "{} registration mismatch: actual={actual:?}, expected_charge={expected_charge:?}, expected_sport={expected_sport:?}, expected_error={expected_error:?}",
            case.label
        ),
    }
}

#[test]
fn dense_matrices_cover_all_required_domains() {
    let charge_grid = BATTLE_SCRIPT_CHARGESPORT_CASES
        .iter()
        .filter(|case| case.category == "charge-attacker-status-timer-grid")
        .collect::<Vec<_>>();
    assert_eq!(charge_grid.len(), 80);
    assert!(charge_grid
        .iter()
        .any(|case| case.control == Some(BattleScriptChargeSportControl::Advance)));

    let sport_grid = BATTLE_SCRIPT_CHARGESPORT_CASES
        .iter()
        .filter(|case| case.category == "sport-move-status-chooser-grid")
        .collect::<Vec<_>>();
    assert_eq!(sport_grid.len(), 120);
    assert!(sport_grid
        .iter()
        .any(|case| case.control == Some(BattleScriptChargeSportControl::Advance)));
    assert!(sport_grid.iter().any(|case| matches!(
        case.control,
        Some(BattleScriptChargeSportControl::Jump { .. })
    )));
    assert!(sport_grid
        .iter()
        .any(|case| case.branch == "unsupported-effect"));
    assert!(sport_grid
        .iter()
        .any(|case| case.branch == "unknown-move-effect"));
}

#[test]
fn corpus_censuses_and_hash_are_pinned() {
    assert_eq!(
        BATTLE_SCRIPT_CHARGESPORT_DOMAIN_CENSUS,
        [
            ("source-battler-slots", 4),
            ("charge-status3-values", 4),
            ("charge-timer-values", 4),
            ("sport-move-values", 8),
            ("sport-status3-values", 5),
            ("multistring-chooser-values", 3),
            ("registration-cases", 14),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_CHARGESPORT_CATEGORY_CENSUS,
        [
            ("charge-attacker-status-timer-grid", 80),
            ("late-label-resolution-laziness", 1),
            ("missing-attacker-role", 1),
            ("sport-attacker-sweep", 8),
            ("sport-move-status-chooser-grid", 120),
            ("unresolved-sport-failure-target", 1),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_CHARGESPORT_BRANCH_CENSUS,
        [
            ("charge:advance", 64),
            ("charge:missing-attacker-role", 16),
            ("sport:advance", 21),
            ("sport:jump", 18),
            ("sport:missing-attacker-role", 1),
            ("sport:unknown-move-effect", 30),
            ("sport:unresolved-sport-failure-target", 1),
            ("sport:unsupported-effect", 60),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_CHARGESPORT_OPCODE_CENSUS,
        [("charge", 80), ("sport", 131)]
    );
    assert_eq!(
        BATTLE_SCRIPT_CHARGESPORT_REGISTRATION_BRANCH_CENSUS,
        [
            ("invalid-charge-shape", 6),
            ("invalid-sport-shape", 7),
            ("registered", 1)
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_CHARGESPORT_VECTOR_CORPUS_SHA256,
        "b077c122b735d4761232035216052054a88b7bd4b354ec7e01a7ed97b8e73deb"
    );
}
