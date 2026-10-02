//! Canonical-TypeScript differential, registration, and immutable state
//! ratchets for `battleScriptTrysetfutureattackOpcode.ts`.
//!
//! Regenerate with `node --experimental-strip-types
//! core-rs/tools/gen-battle-script-trysetfutureattack-vectors.mjs`.

use factory_core::battle_script_trysetfutureattack::{
    apply_battle_script_trysetfutureattack, calculate_future_attack_base_damage,
    register_battle_script_trysetfutureattack_handler, BattleScriptTrysetfutureattackBattler,
    BattleScriptTrysetfutureattackBattlerState, BattleScriptTrysetfutureattackRoles,
    BattleScriptTrysetfutureattackRules,
};
use factory_core::battle_script_trysetfutureattack_vectors_gen::{
    BattleScriptTrysetfutureattackRegistrationVectorCase, BattleScriptTrysetfutureattackVectorCase,
    BattleScriptTrysetfutureattackVectorState, BATTLE_SCRIPT_TRYSETFUTUREATTACK_BRANCH_CENSUS,
    BATTLE_SCRIPT_TRYSETFUTUREATTACK_CASES, BATTLE_SCRIPT_TRYSETFUTUREATTACK_CATEGORY_CENSUS,
    BATTLE_SCRIPT_TRYSETFUTUREATTACK_DOMAIN_CENSUS,
    BATTLE_SCRIPT_TRYSETFUTUREATTACK_NOT_A_FUTURE_MOVE_MESSAGE,
    BATTLE_SCRIPT_TRYSETFUTUREATTACK_REGISTRATION_BRANCH_CENSUS,
    BATTLE_SCRIPT_TRYSETFUTUREATTACK_REGISTRATION_CASES,
    BATTLE_SCRIPT_TRYSETFUTUREATTACK_VECTOR_CORPUS_SHA256,
};

fn rules(value: BattleScriptTrysetfutureattackVectorState) -> BattleScriptTrysetfutureattackRules {
    BattleScriptTrysetfutureattackRules {
        battlers: value
            .battlers
            .map(|b| BattleScriptTrysetfutureattackBattlerState {
                side: b.side,
                attack: b.attack,
                defense: b.defense,
                sp_attack: b.sp_attack,
                sp_defense: b.sp_defense,
                level: b.level,
                types: b.types,
                stat_stages: b.stat_stages,
                hp: b.hp,
                status1: b.status1,
                ability: b.ability,
                species: b.species,
                hold_effect: b.hold_effect,
                hold_effect_param: b.hold_effect_param,
                helping_hand: b.helping_hand,
            }),
        selector_roles: BattleScriptTrysetfutureattackRoles { attacker: None, target: None },
        battlers_count: value.battlers_count,
        absent_battler_flags: value.absent_battler_flags,
        side_statuses: value.side_statuses,
        future_sight_counter: value.future_sight_counter,
        future_sight_move: value.future_sight_move,
        future_sight_attacker: value.future_sight_attacker,
        future_sight_dmg: value.future_sight_dmg,
        current_move: value.current_move,
        multistring_chooser: value.multistring_chooser,
    }
}

fn vector_state(
    value: BattleScriptTrysetfutureattackRules,
) -> BattleScriptTrysetfutureattackVectorState {
    BattleScriptTrysetfutureattackVectorState {
        battlers: value.battlers.map(|b| {
            factory_core::battle_script_trysetfutureattack_vectors_gen::BattleScriptTrysetfutureattackVectorBattlerState {
                side: b.side,
                attack: b.attack,
                defense: b.defense,
                sp_attack: b.sp_attack,
                sp_defense: b.sp_defense,
                level: b.level,
                types: b.types,
                stat_stages: b.stat_stages,
                hp: b.hp,
                status1: b.status1,
                ability: b.ability,
                species: b.species,
                hold_effect: b.hold_effect,
                hold_effect_param: b.hold_effect_param,
                helping_hand: b.helping_hand,
            }
        }),
        battlers_count: value.battlers_count,
        absent_battler_flags: value.absent_battler_flags,
        side_statuses: value.side_statuses,
        future_sight_counter: value.future_sight_counter,
        future_sight_move: value.future_sight_move,
        future_sight_attacker: value.future_sight_attacker,
        future_sight_dmg: value.future_sight_dmg,
        current_move: value.current_move,
        multistring_chooser: value.multistring_chooser,
    }
}

fn battler(id: u8) -> BattleScriptTrysetfutureattackBattler {
    BattleScriptTrysetfutureattackBattler::from_u8(id).expect("battler id in range")
}

#[test]
fn complete_projected_outputs_controls_errors_and_immutability_match_canonical_typescript() {
    assert_eq!(BATTLE_SCRIPT_TRYSETFUTUREATTACK_CASES.len(), 48);
    for (case_index, case) in BATTLE_SCRIPT_TRYSETFUTUREATTACK_CASES.iter().enumerate() {
        execute_case(case_index, case);
    }
}

fn execute_case(case_index: usize, case: &BattleScriptTrysetfutureattackVectorCase) {
    let mut input = rules(case.initial);
    input.selector_roles = BattleScriptTrysetfutureattackRoles {
        attacker: Some(battler(case.attacker)),
        target: Some(battler(case.target)),
    };
    let before = input;

    let result = apply_battle_script_trysetfutureattack(case.instruction, &input);
    assert_eq!(
        input, before,
        "case {case_index} {} mutated rules input",
        case.label
    );

    match (result, case.expected, case.expected_error) {
        (Ok(outcome), Some(expected), None) => {
            assert_eq!(Some(outcome.control), case.control, "case {case_index} {} control", case.label);
            assert_eq!(
                vector_state(outcome.rules),
                expected,
                "case {case_index} {} complete projected state",
                case.label
            );
        }
        (Err(actual), None, Some(expected)) => {
            assert_eq!(case.control, None, "case {case_index} {} error must have no control", case.label);
            assert_eq!(actual.to_string(), expected, "case {case_index} {} exact error", case.label);
        }
        (actual, expected, expected_error) => panic!(
            "case {case_index} {} generated outcome disagrees: actual={actual:?}, expected={expected:?}, expected_error={expected_error:?}",
            case.label
        ),
    }
}

#[test]
fn registration_matches_canonical_typescript_and_keeps_exact_errors() {
    assert_eq!(BATTLE_SCRIPT_TRYSETFUTUREATTACK_REGISTRATION_CASES.len(), 8);
    for case in BATTLE_SCRIPT_TRYSETFUTUREATTACK_REGISTRATION_CASES {
        execute_registration_case(&case);
    }
}

fn execute_registration_case(case: &BattleScriptTrysetfutureattackRegistrationVectorCase) {
    match (
        register_battle_script_trysetfutureattack_handler(case.instructions),
        case.expected_opcode_id,
        case.expected_error,
    ) {
        (Ok(actual), Some(expected), None) => assert_eq!(actual.opcode_id, expected, "{}", case.label),
        (Err(actual), None, Some(expected)) => assert_eq!(actual.to_string(), expected, "{}", case.label),
        (actual, expected_opcode, expected_error) => panic!(
            "{} registration mismatch: actual={actual:?}, expected_opcode={expected_opcode:?}, expected_error={expected_error:?}",
            case.label
        ),
    }
}

#[test]
fn jump_branch_never_changes_rules() {
    for case in BATTLE_SCRIPT_TRYSETFUTUREATTACK_CASES
        .iter()
        .filter(|case| case.branch == "jump")
    {
        let mut input = rules(case.initial);
        input.selector_roles = BattleScriptTrysetfutureattackRoles {
            attacker: Some(battler(case.attacker)),
            target: Some(battler(case.target)),
        };
        let outcome = apply_battle_script_trysetfutureattack(case.instruction, &input)
            .unwrap_or_else(|error| {
                panic!("{}: expected jump outcome, got error {error}", case.label)
            });
        assert_eq!(
            outcome.rules, input,
            "{}: jump must not mutate rules",
            case.label
        );
    }
}

#[test]
fn not_a_future_move_error_is_pinned() {
    let mut battlers = [BattleScriptTrysetfutureattackBattlerState {
        side: factory_core::battle_script_trysetfutureattack::BattleScriptTrysetfutureattackSide::Player,
        attack: 100,
        defense: 100,
        sp_attack: 100,
        sp_defense: 100,
        level: 50,
        types: [0, 0],
        stat_stages: factory_core::damage_calc::StatStages { atk: 6, def: 6, sp_atk: 6, sp_def: 6 },
        hp: 100,
        status1: 0,
        ability: 0,
        species: 1,
        hold_effect: 0,
        hold_effect_param: 0,
        helping_hand: 0,
    }; 4];
    battlers[1].side = factory_core::battle_script_trysetfutureattack::BattleScriptTrysetfutureattackSide::Opponent;
    let r = BattleScriptTrysetfutureattackRules {
        battlers,
        selector_roles: BattleScriptTrysetfutureattackRoles {
            attacker: Some(BattleScriptTrysetfutureattackBattler::Battler0),
            target: Some(BattleScriptTrysetfutureattackBattler::Battler1),
        },
        battlers_count: 2,
        absent_battler_flags: 0,
        side_statuses: [0, 0],
        future_sight_counter: [0, 0, 0, 0],
        future_sight_move: [0, 0, 0, 0],
        future_sight_attacker: [0, 0, 0, 0],
        future_sight_dmg: [0, 0, 0, 0],
        current_move: 33,
        multistring_chooser: 0,
    };
    let error = calculate_future_attack_base_damage(
        &r,
        BattleScriptTrysetfutureattackBattler::Battler0,
        BattleScriptTrysetfutureattackBattler::Battler1,
        33,
    )
    .expect_err("not a future move");
    assert_eq!(
        error.to_string(),
        BATTLE_SCRIPT_TRYSETFUTUREATTACK_NOT_A_FUTURE_MOVE_MESSAGE
    );
}

#[test]
fn corpus_censuses_and_hash_are_pinned() {
    assert_eq!(
        BATTLE_SCRIPT_TRYSETFUTUREATTACK_DOMAIN_CENSUS,
        [
            ("source-battler-slots", 4),
            ("registration-cases", 8),
            ("not-a-future-move-pinned", 1)
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYSETFUTUREATTACK_CATEGORY_CENSUS,
        [
            ("helping-hand-truncation", 2),
            ("late-label-resolution", 2),
            ("malformed-shape-precedes-role", 3),
            ("occupied-counter-fail", 3),
            ("role-topology", 14),
            ("stat-modifier-family", 24),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYSETFUTUREATTACK_BRANCH_CENSUS,
        [
            ("advance", 41),
            ("invalid-execution-shape", 3),
            ("jump", 3),
            ("unresolved-target", 1),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYSETFUTUREATTACK_REGISTRATION_BRANCH_CENSUS,
        [
            ("invalid-shape", 4),
            ("registered", 2),
            ("wrong-cardinality", 2)
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYSETFUTUREATTACK_VECTOR_CORPUS_SHA256,
        "ef1b6a8cf22adebb7e4d8dad9faa3f17cd16443e37a2866ec62f58173fd07da8"
    );
}
