//! Canonical-TypeScript differential, registration, and immutable state
//! ratchets for `battleScriptTrymementoOpcode.ts`.
//!
//! Regenerate with `node --experimental-strip-types
//! core-rs/tools/gen-battle-script-trymemento-vectors.mjs`.

use factory_core::battle_script_trymemento::{
    apply_battle_script_trymemento, register_battle_script_trymemento_handler,
    BattleScriptTrymementoBattlerState, BattleScriptTrymementoRoles, BattleScriptTrymementoRules,
    BattleScriptTrymementoScheduler,
};
use factory_core::battle_script_trymemento_vectors_gen::{
    BattleScriptTrymementoRegistrationVectorCase, BattleScriptTrymementoVectorBattlerState,
    BattleScriptTrymementoVectorCase, BattleScriptTrymementoVectorState,
    BATTLE_SCRIPT_TRYMEMENTO_BRANCH_CENSUS, BATTLE_SCRIPT_TRYMEMENTO_CASES,
    BATTLE_SCRIPT_TRYMEMENTO_CATEGORY_CENSUS, BATTLE_SCRIPT_TRYMEMENTO_DOMAIN_CENSUS,
    BATTLE_SCRIPT_TRYMEMENTO_REGISTRATION_BRANCH_CENSUS,
    BATTLE_SCRIPT_TRYMEMENTO_REGISTRATION_CASES, BATTLE_SCRIPT_TRYMEMENTO_VECTOR_CORPUS_SHA256,
};

fn battler(value: BattleScriptTrymementoVectorBattlerState) -> BattleScriptTrymementoBattlerState {
    BattleScriptTrymementoBattlerState {
        hp: value.hp,
        stat_stages: value.stat_stages,
        ability: value.ability,
        marker: value.marker,
    }
}

fn rules(value: BattleScriptTrymementoVectorState) -> BattleScriptTrymementoRules {
    BattleScriptTrymementoRules {
        battlers: value.battlers.map(battler),
        selector_roles: BattleScriptTrymementoRoles {
            attacker: value.attacker,
            target: value.target,
            effect_battler: value.effect_battler,
            fainted: value.fainted,
        },
        miss_type: value.miss_type,
        battle_move_damage: value.battle_move_damage,
    }
}

fn vector_state(value: BattleScriptTrymementoRules) -> BattleScriptTrymementoVectorState {
    BattleScriptTrymementoVectorState {
        battlers: value
            .battlers
            .map(|battler| BattleScriptTrymementoVectorBattlerState {
                hp: battler.hp,
                stat_stages: battler.stat_stages,
                ability: battler.ability,
                marker: battler.marker,
            }),
        attacker: value.selector_roles.attacker,
        target: value.selector_roles.target,
        effect_battler: value.selector_roles.effect_battler,
        fainted: value.selector_roles.fainted,
        miss_type: value.miss_type,
        battle_move_damage: value.battle_move_damage,
    }
}

fn scheduler(
    pending: [Option<factory_core::battle_script_trymemento::BattleScriptTrymementoBattler>; 4],
) -> BattleScriptTrymementoScheduler {
    let pending_count = pending.iter().filter(|value| value.is_some()).count() as u8;
    BattleScriptTrymementoScheduler { pending_controller_battlers: pending, pending_count }
}

#[test]
fn complete_projected_outputs_controls_events_errors_and_immutability_match_canonical_typescript() {
    assert_eq!(BATTLE_SCRIPT_TRYMEMENTO_CASES.len(), 80);
    for (case_index, case) in BATTLE_SCRIPT_TRYMEMENTO_CASES.iter().enumerate() {
        execute_case(case_index, case);
    }
}

fn execute_case(case_index: usize, case: &BattleScriptTrymementoVectorCase) {
    let input = rules(case.initial);
    let before = input;
    let machine_input = scheduler(case.initial_pending);
    let machine_before = machine_input;

    let result = apply_battle_script_trymemento(case.instruction, &input, &machine_input);

    assert_eq!(
        input, before,
        "case {case_index} {} mutated rules input",
        case.label
    );
    assert_eq!(
        machine_input, machine_before,
        "case {case_index} {} mutated scheduler input",
        case.label
    );

    match (result, case.expected, case.expected_error) {
        (Ok(outcome), Some(expected), None) => {
            assert_eq!(
                Some(outcome.control),
                case.control,
                "case {case_index} {} control",
                case.label
            );
            assert_eq!(
                vector_state(outcome.rules),
                expected,
                "case {case_index} {} complete projected state",
                case.label
            );
            assert_eq!(
                outcome.scheduler.pending_controller_battlers,
                case.expected_pending,
                "case {case_index} {} pending list",
                case.label
            );
            assert_eq!(
                outcome.emitted_event, case.event,
                "case {case_index} {} emitted event",
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
    assert_eq!(BATTLE_SCRIPT_TRYMEMENTO_REGISTRATION_CASES.len(), 9);
    for case in BATTLE_SCRIPT_TRYMEMENTO_REGISTRATION_CASES {
        execute_registration_case(&case);
    }
}

fn execute_registration_case(case: &BattleScriptTrymementoRegistrationVectorCase) {
    match (
        register_battle_script_trymemento_handler(case.instructions),
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
fn jump_branch_never_changes_rules_or_scheduler() {
    for case in BATTLE_SCRIPT_TRYMEMENTO_CASES
        .iter()
        .filter(|case| case.branch == "jump")
    {
        let input = rules(case.initial);
        let machine_input = scheduler(case.initial_pending);
        let outcome = apply_battle_script_trymemento(case.instruction, &input, &machine_input)
            .unwrap_or_else(|error| {
                panic!("{}: expected jump outcome, got error {error}", case.label)
            });
        assert_eq!(
            vector_state(outcome.rules),
            case.initial,
            "{}: jump must not mutate rules",
            case.label
        );
        assert_eq!(
            outcome.scheduler, machine_input,
            "{}: jump must not mutate scheduler",
            case.label
        );
        assert_eq!(
            outcome.emitted_event, None,
            "{}: jump must not emit an event",
            case.label
        );
    }
}

#[test]
fn advance_branch_only_changes_damage_and_pending_list() {
    for case in BATTLE_SCRIPT_TRYMEMENTO_CASES
        .iter()
        .filter(|case| case.branch == "advance")
    {
        let input = rules(case.initial);
        let machine_input = scheduler(case.initial_pending);
        let outcome = apply_battle_script_trymemento(case.instruction, &input, &machine_input)
            .unwrap_or_else(|error| {
                panic!(
                    "{}: expected advance outcome, got error {error}",
                    case.label
                )
            });
        let attacker = input
            .selector_roles
            .attacker
            .expect("advance case has attacker");
        assert_eq!(
            outcome.rules.battle_move_damage,
            i32::from(input.battlers[attacker.index()].hp),
            "{}: battleMoveDamage must equal attacker hp",
            case.label
        );
        for (index, battler_state) in outcome.rules.battlers.iter().enumerate() {
            assert_eq!(
                *battler_state, input.battlers[index],
                "{}: advance must not mutate any battler state",
                case.label
            );
        }
        assert!(
            outcome.emitted_event.is_some(),
            "{}: advance must emit a health-bar-update event",
            case.label
        );
    }
}

#[test]
fn corpus_censuses_and_hash_are_pinned() {
    assert_eq!(
        BATTLE_SCRIPT_TRYMEMENTO_DOMAIN_CENSUS,
        [
            ("source-battler-slots", 4),
            ("call-site-topologies", 2),
            ("stat-stage-pairs", 6),
            ("miss-type-values", 4),
            ("attacker-hp-values", 4),
            ("registration-cases", 9),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYMEMENTO_CATEGORY_CENSUS,
        [
            ("attacker-hp-damage-mapping", 4),
            ("attacker-target-pair-matrix", 18),
            ("late-label-resolution", 2),
            ("malformed-shape-precedes-roles", 5),
            ("scheduler-pending-preservation", 3),
            ("stat-stage-and-misstype-matrix", 48),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYMEMENTO_BRANCH_CENSUS,
        [
            ("advance", 50),
            ("invalid-instruction-shape", 5),
            ("jump", 18),
            ("missing-attacker-role", 2),
            ("missing-target-role", 4),
            ("unresolved-failure-target", 1),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYMEMENTO_REGISTRATION_BRANCH_CENSUS,
        [
            ("invalid-shape", 4),
            ("registered", 2),
            ("wrong-cardinality", 3)
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYMEMENTO_VECTOR_CORPUS_SHA256,
        "b56a69bc7549bf021804bc25f684d6184109e6df62ca735ae92b29ddb95bf0ff"
    );
}
