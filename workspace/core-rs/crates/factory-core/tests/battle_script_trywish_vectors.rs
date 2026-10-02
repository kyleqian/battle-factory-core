//! Canonical-TypeScript differential, registration, and immutable state
//! ratchets for `battleScriptTrywishOpcode.ts`.
//!
//! Regenerate with `node --experimental-strip-types
//! core-rs/tools/gen-battle-script-trywish-vectors.mjs`.

use factory_core::battle_script_trywish::{
    apply_battle_script_trywish, register_battle_script_trywish_handler,
    BattleScriptTrywishBattlerState, BattleScriptTrywishControl, BattleScriptTrywishRoles,
    BattleScriptTrywishRules, BATTLE_SCRIPT_TRYWISH_MODE_USE_WISH,
};
use factory_core::battle_script_trywish_vectors_gen::{
    BattleScriptTrywishRegistrationVectorCase, BattleScriptTrywishVectorBattlerState,
    BattleScriptTrywishVectorState, BATTLE_SCRIPT_TRYWISH_BRANCH_CENSUS,
    BATTLE_SCRIPT_TRYWISH_CASES, BATTLE_SCRIPT_TRYWISH_CATEGORY_CENSUS,
    BATTLE_SCRIPT_TRYWISH_DOMAIN_CENSUS, BATTLE_SCRIPT_TRYWISH_REGISTRATION_BRANCH_CENSUS,
    BATTLE_SCRIPT_TRYWISH_REGISTRATION_CASES, BATTLE_SCRIPT_TRYWISH_VECTOR_CORPUS_SHA256,
};

fn rules(value: BattleScriptTrywishVectorState) -> BattleScriptTrywishRules {
    BattleScriptTrywishRules {
        battlers: value
            .battlers
            .map(|battler| BattleScriptTrywishBattlerState {
                hp: battler.hp,
                max_hp: battler.max_hp,
                party_index: battler.party_index,
                ability: battler.ability,
                item: battler.item,
                status1: battler.status1,
            }),
        selector_roles: BattleScriptTrywishRoles { attacker: value.attacker, target: value.target },
        wish_counter: value.wish_counter,
        wish_mon_id: value.wish_mon_id,
        battle_move_damage: value.battle_move_damage,
        battle_text_buff1_mon_nick: value.battle_text_buff1_mon_nick,
    }
}

fn vector_state(value: BattleScriptTrywishRules) -> BattleScriptTrywishVectorState {
    BattleScriptTrywishVectorState {
        battlers: value
            .battlers
            .map(|battler| BattleScriptTrywishVectorBattlerState {
                hp: battler.hp,
                max_hp: battler.max_hp,
                party_index: battler.party_index,
                ability: battler.ability,
                item: battler.item,
                status1: battler.status1,
            }),
        attacker: value.selector_roles.attacker,
        target: value.selector_roles.target,
        wish_counter: value.wish_counter,
        wish_mon_id: value.wish_mon_id,
        battle_move_damage: value.battle_move_damage,
        battle_text_buff1_mon_nick: value.battle_text_buff1_mon_nick,
    }
}

#[test]
fn complete_projected_outputs_controls_errors_and_immutability_match_canonical_typescript() {
    assert_eq!(BATTLE_SCRIPT_TRYWISH_CASES.len(), 658);
    for (case_index, case) in BATTLE_SCRIPT_TRYWISH_CASES.iter().enumerate() {
        execute_case(case_index, case);
    }
}

fn execute_case(
    case_index: usize,
    case: &factory_core::battle_script_trywish_vectors_gen::BattleScriptTrywishVectorCase,
) {
    let input = rules(case.initial);
    let before = input;

    match (
        apply_battle_script_trywish(case.instruction, &input),
        case.expected,
        case.control,
        case.expected_error,
    ) {
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

fn assert_transition_shape(
    case_index: usize,
    case: &factory_core::battle_script_trywish_vectors_gen::BattleScriptTrywishVectorCase,
    prior: BattleScriptTrywishRules,
    outcome: factory_core::battle_script_trywish::BattleScriptTrywishOutcome,
) {
    let is_mode0 = case.instruction.operands[0].expression == BATTLE_SCRIPT_TRYWISH_MODE_USE_WISH;

    if is_mode0 {
        let attacker = prior
            .selector_roles
            .attacker
            .expect("resolved mode 0 case has attacker");
        match outcome.control {
            BattleScriptTrywishControl::Jump { .. } => {
                assert_ne!(
                    prior.wish_counter[attacker.index()],
                    0,
                    "case {case_index} {} jumped without a pending wish",
                    case.label
                );
                assert_eq!(
                    outcome.rules, prior,
                    "case {case_index} {} mode 0 jump must leave rules unchanged",
                    case.label
                );
            }
            BattleScriptTrywishControl::Advance => {
                assert_eq!(
                    prior.wish_counter[attacker.index()],
                    0,
                    "case {case_index} {} advanced despite a pending wish",
                    case.label
                );
                assert_eq!(
                    outcome.rules.wish_counter[attacker.index()],
                    2,
                    "case {case_index} {} did not install the two-turn counter",
                    case.label
                );
                assert_eq!(
                    outcome.rules.wish_mon_id[attacker.index()],
                    prior.battlers[attacker.index()].party_index,
                    "case {case_index} {} did not remember the party index",
                    case.label
                );
                for i in 0..4 {
                    if i != attacker.index() {
                        assert_eq!(
                            outcome.rules.wish_counter[i], prior.wish_counter[i],
                            "case {case_index} {} untouched wish_counter[{i}] changed",
                            case.label
                        );
                        assert_eq!(
                            outcome.rules.wish_mon_id[i], prior.wish_mon_id[i],
                            "case {case_index} {} untouched wish_mon_id[{i}] changed",
                            case.label
                        );
                    }
                }
                assert_eq!(
                    outcome.rules.battle_move_damage, prior.battle_move_damage,
                    "case {case_index} {} mode 0 must not touch battle_move_damage",
                    case.label
                );
                assert_eq!(
                    outcome.rules.battle_text_buff1_mon_nick, prior.battle_text_buff1_mon_nick,
                    "case {case_index} {} mode 0 must not touch battle_text_buff1_mon_nick",
                    case.label
                );
            }
        }
        assert_eq!(
            outcome.rules.battlers, prior.battlers,
            "case {case_index} {} battlers changed",
            case.label
        );
        return;
    }

    let target = prior
        .selector_roles
        .target
        .expect("resolved mode 1 case has target");
    let target_state = prior.battlers[target.index()];
    let expected_heal =
        factory_core::battle_script_trywish::battle_script_trywish_half_max_hp(target_state.max_hp);
    assert_eq!(
        outcome.rules.battle_move_damage,
        -i32::from(expected_heal),
        "case {case_index} {} mode 1 damage mismatch",
        case.label
    );
    assert_eq!(
        outcome.rules.battle_text_buff1_mon_nick,
        Some(
            factory_core::battle_script_trywish::BattleScriptTrywishMonNick {
                battler: target,
                party_index: prior.wish_mon_id[target.index()],
            }
        ),
        "case {case_index} {} mode 1 mon nick mismatch",
        case.label
    );
    match outcome.control {
        BattleScriptTrywishControl::Jump { .. } => {
            assert_eq!(
                target_state.hp, target_state.max_hp,
                "case {case_index} {} jumped despite non-full HP",
                case.label
            );
        }
        BattleScriptTrywishControl::Advance => {
            assert_ne!(
                target_state.hp, target_state.max_hp,
                "case {case_index} {} advanced despite full HP",
                case.label
            );
        }
    }
    assert_eq!(
        outcome.rules.battlers, prior.battlers,
        "case {case_index} {} battlers changed",
        case.label
    );
    assert_eq!(
        outcome.rules.wish_counter, prior.wish_counter,
        "case {case_index} {} mode 1 must not touch wish_counter",
        case.label
    );
    assert_eq!(
        outcome.rules.wish_mon_id, prior.wish_mon_id,
        "case {case_index} {} mode 1 must not touch wish_mon_id",
        case.label
    );
}

#[test]
fn registration_matches_canonical_typescript_and_keeps_exact_errors() {
    assert_eq!(BATTLE_SCRIPT_TRYWISH_REGISTRATION_CASES.len(), 6);
    for case in BATTLE_SCRIPT_TRYWISH_REGISTRATION_CASES {
        execute_registration_case(&case);
    }
}

fn execute_registration_case(case: &BattleScriptTrywishRegistrationVectorCase) {
    match (
        register_battle_script_trywish_handler(case.instructions),
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
fn dense_matrices_cover_all_required_domains() {
    let mode0 = BATTLE_SCRIPT_TRYWISH_CASES
        .iter()
        .filter(|case| case.category == "mode0-dense-attacker-sweep")
        .collect::<Vec<_>>();
    assert_eq!(mode0.len(), 144);
    assert!(mode0
        .iter()
        .any(|case| case.control == Some(BattleScriptTrywishControl::Advance)));
    assert!(mode0
        .iter()
        .any(|case| matches!(case.control, Some(BattleScriptTrywishControl::Jump { .. }))));

    let mode1 = BATTLE_SCRIPT_TRYWISH_CASES
        .iter()
        .filter(|case| case.category == "mode1-dense-target-sweep")
        .collect::<Vec<_>>();
    assert_eq!(mode1.len(), 504);
    assert!(mode1
        .iter()
        .any(|case| case.control == Some(BattleScriptTrywishControl::Advance)));
    assert!(mode1
        .iter()
        .any(|case| matches!(case.control, Some(BattleScriptTrywishControl::Jump { .. }))));
}

#[test]
fn corpus_censuses_and_hash_are_pinned() {
    assert_eq!(
        BATTLE_SCRIPT_TRYWISH_DOMAIN_CENSUS,
        [
            ("source-battler-slots", 4),
            ("topology-variants", 2),
            ("wish-counter-values", 4),
            ("party-index-values", 6),
            ("max-hp-values", 7),
            ("registration-cases", 6),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYWISH_CATEGORY_CENSUS,
        [
            ("late-label-resolution", 2),
            ("malformed-operand-shape", 4),
            ("missing-attacker-role", 1),
            ("missing-target-role", 1),
            ("mode0-dense-attacker-sweep", 144),
            ("mode1-dense-target-sweep", 504),
            ("unresolved-jump-target", 2),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYWISH_BRANCH_CENSUS,
        [
            ("advance", 254),
            ("invalid-operand-shape", 4),
            ("jump", 396),
            ("missing-attacker-role", 1),
            ("missing-target-role", 1),
            ("unresolved-jump-target", 2),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYWISH_REGISTRATION_BRANCH_CENSUS,
        [
            ("mismatched-opcode", 1),
            ("registered", 2),
            ("wrong-cardinality", 3)
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYWISH_VECTOR_CORPUS_SHA256,
        "e814a4fe03acf5b32c600b4b954599e1143ce1fb5f945751512ada6f550d1696"
    );
}
