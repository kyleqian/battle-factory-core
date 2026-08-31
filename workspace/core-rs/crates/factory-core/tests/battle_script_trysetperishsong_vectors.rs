//! Canonical-TypeScript differential, registration, and immutable state
//! ratchets for `battleScriptTrysetperishsongOpcode.ts`.
//!
//! Regenerate with `node --experimental-strip-types
//! core-rs/tools/gen-battle-script-trysetperishsong-vectors.mjs`.

use factory_core::battle_script_trysetperishsong::{
    apply_battle_script_trysetperishsong, register_battle_script_trysetperishsong_handler,
    BattleScriptTrysetperishsongBattlerState, BattleScriptTrysetperishsongBattlersCount,
    BattleScriptTrysetperishsongContextSiblings, BattleScriptTrysetperishsongControl,
    BattleScriptTrysetperishsongMachineSiblings, BattleScriptTrysetperishsongRoles,
    BattleScriptTrysetperishsongRules, BattleScriptTrysetperishsongScheduler,
    BATTLE_SCRIPT_ABILITY_PRESSURE, BATTLE_SCRIPT_ABILITY_SOUNDPROOF,
    BATTLE_SCRIPT_MOVE_PERISH_SONG, BATTLE_SCRIPT_STATUS3_PERISH_SONG,
    BATTLE_SCRIPT_TRYSETPERISHSONG_TIMER_VALUE,
};
use factory_core::battle_script_trysetperishsong_vectors_gen::{
    BattleScriptTrysetperishsongRegistrationVectorCase,
    BattleScriptTrysetperishsongVectorBattlerState, BattleScriptTrysetperishsongVectorContext,
    BattleScriptTrysetperishsongVectorMachine, BattleScriptTrysetperishsongVectorState,
    BATTLE_SCRIPT_TRYSETPERISHSONG_BRANCH_CENSUS, BATTLE_SCRIPT_TRYSETPERISHSONG_CASES,
    BATTLE_SCRIPT_TRYSETPERISHSONG_CATEGORY_CENSUS, BATTLE_SCRIPT_TRYSETPERISHSONG_DOMAIN_CENSUS,
    BATTLE_SCRIPT_TRYSETPERISHSONG_REGISTRATION_BRANCH_CENSUS,
    BATTLE_SCRIPT_TRYSETPERISHSONG_REGISTRATION_CASES,
    BATTLE_SCRIPT_TRYSETPERISHSONG_VECTOR_CORPUS_SHA256,
};

fn battler(
    value: BattleScriptTrysetperishsongVectorBattlerState,
) -> BattleScriptTrysetperishsongBattlerState {
    BattleScriptTrysetperishsongBattlerState {
        status3: value.status3,
        ability: value.ability,
        moves: value.moves,
        pp: value.pp,
        perish_song_timer: value.perish_song_timer,
        perish_song_timer_start_value: value.perish_song_timer_start_value,
    }
}

fn context(
    value: BattleScriptTrysetperishsongVectorContext,
) -> BattleScriptTrysetperishsongContextSiblings {
    BattleScriptTrysetperishsongContextSiblings {
        scripting_battler: value.scripting_battler,
        current_move: value.current_move,
        hit_marker: value.hit_marker,
        battle_communication0: value.battle_communication0,
    }
}

fn rules(value: BattleScriptTrysetperishsongVectorState) -> BattleScriptTrysetperishsongRules {
    BattleScriptTrysetperishsongRules {
        battlers: value.battlers.map(battler),
        battlers_count: value.battlers_count,
        selector_roles: BattleScriptTrysetperishsongRoles {
            attacker: value.attacker,
            target: value.target,
            effect_battler: value.effect_battler,
            fainted: value.fainted,
        },
        context_siblings: context(value.context),
    }
}

fn vector_state(
    value: BattleScriptTrysetperishsongRules,
) -> BattleScriptTrysetperishsongVectorState {
    BattleScriptTrysetperishsongVectorState {
        battlers: value
            .battlers
            .map(|battler| BattleScriptTrysetperishsongVectorBattlerState {
                status3: battler.status3,
                ability: battler.ability,
                moves: battler.moves,
                pp: battler.pp,
                perish_song_timer: battler.perish_song_timer,
                perish_song_timer_start_value: battler.perish_song_timer_start_value,
            }),
        battlers_count: value.battlers_count,
        attacker: value.selector_roles.attacker,
        target: value.selector_roles.target,
        effect_battler: value.selector_roles.effect_battler,
        fainted: value.selector_roles.fainted,
        context: BattleScriptTrysetperishsongVectorContext {
            scripting_battler: value.context_siblings.scripting_battler,
            current_move: value.context_siblings.current_move,
            hit_marker: value.context_siblings.hit_marker,
            battle_communication0: value.context_siblings.battle_communication0,
        },
    }
}

fn machine(
    value: BattleScriptTrysetperishsongVectorMachine,
) -> BattleScriptTrysetperishsongMachineSiblings {
    BattleScriptTrysetperishsongMachineSiblings {
        scheduler: BattleScriptTrysetperishsongScheduler {
            message_display_active: value.scheduler.message_display_active,
            pause_counter_battle: value.scheduler.pause_counter_battle,
            active_battler: value.scheduler.active_battler,
            pending_controller_battlers: value.scheduler.pending_controller_battlers,
            pending_count: value.scheduler.pending_count,
        },
        rng_value: value.rng_value,
        rng_calls: value.rng_calls,
    }
}

#[test]
fn complete_projected_outputs_controls_errors_and_immutability_match_canonical_typescript() {
    assert_eq!(BATTLE_SCRIPT_TRYSETPERISHSONG_CASES.len(), 789);
    for (case_index, case) in BATTLE_SCRIPT_TRYSETPERISHSONG_CASES.iter().enumerate() {
        execute_case(case_index, case);
    }
}

fn execute_case(
    case_index: usize,
    case: &factory_core::battle_script_trysetperishsong_vectors_gen::BattleScriptTrysetperishsongVectorCase,
) {
    let input = rules(case.initial);
    let before = input;
    let machine_input = machine(case.machine);
    let machine_before = machine_input;
    let mut current = input;
    let mut controls = Vec::new();
    let mut actual_error = None;

    for application in 0..case.applications {
        let prior = current;
        match apply_battle_script_trysetperishsong(case.instruction, &current, &machine_input) {
            Ok(outcome) => {
                assert_transition_shape(
                    case_index,
                    case,
                    application,
                    prior,
                    machine_input,
                    outcome,
                );
                controls.push(outcome.control);
                current = outcome.rules;
            }
            Err(error) => {
                actual_error = Some(error.to_string());
                break;
            }
        }
    }

    assert_eq!(
        input, before,
        "case {case_index} {} mutated rules input",
        case.label
    );
    assert_eq!(
        machine_input, machine_before,
        "case {case_index} {} mutated machine input",
        case.label
    );
    match (actual_error, case.expected, case.expected_error) {
        (None, Some(expected), None) => {
            assert_eq!(
                controls.as_slice(),
                case.controls,
                "case {case_index} {} control sequence",
                case.label
            );
            assert_eq!(
                vector_state(current),
                expected,
                "case {case_index} {} complete projected state",
                case.label
            );
        }
        (Some(actual), None, Some(expected)) => {
            assert_eq!(
                controls.as_slice(),
                case.controls,
                "case {case_index} {} error must have no control",
                case.label
            );
            assert_eq!(actual, expected, "case {case_index} {} exact error", case.label);
        }
        (actual, expected, expected_error) => panic!(
            "case {case_index} {} generated outcome disagrees: actual_error={actual:?}, expected={expected:?}, expected_error={expected_error:?}",
            case.label
        ),
    }
}

fn assert_transition_shape(
    case_index: usize,
    case: &factory_core::battle_script_trysetperishsong_vectors_gen::BattleScriptTrysetperishsongVectorCase,
    application: u8,
    prior: BattleScriptTrysetperishsongRules,
    machine_input: BattleScriptTrysetperishsongMachineSiblings,
    outcome: factory_core::battle_script_trysetperishsong::BattleScriptTrysetperishsongOutcome,
) {
    assert_eq!(
        outcome.rules.selector_roles, prior.selector_roles,
        "case {case_index} {} application {application} changed selector roles",
        case.label
    );
    assert_eq!(
        outcome.rules.context_siblings, prior.context_siblings,
        "case {case_index} {} application {application} changed context siblings",
        case.label
    );
    assert_eq!(
        outcome.rules.battlers_count, prior.battlers_count,
        "case {case_index} {} application {application} changed battlers_count",
        case.label
    );
    assert_eq!(
        outcome.machine_siblings, machine_input,
        "case {case_index} {} application {application} changed scheduler or RNG",
        case.label
    );

    let count = prior.battlers_count.as_usize();
    let attacker = prior.selector_roles.attacker;
    let mut expected_not_affected = 0usize;
    for i in 0..count {
        let before = prior.battlers[i];
        let after = outcome.rules.battlers[i];
        let was_not_affected = before.status3 & BATTLE_SCRIPT_STATUS3_PERISH_SONG != 0
            || before.ability == BATTLE_SCRIPT_ABILITY_SOUNDPROOF;
        if was_not_affected {
            expected_not_affected += 1;
            assert_eq!(
                after.status3, before.status3,
                "case {case_index} {} application {application} battler {i} status3 changed while not-affected",
                case.label
            );
            assert_eq!(
                after.perish_song_timer, before.perish_song_timer,
                "case {case_index} {} application {application} battler {i} timer changed while not-affected",
                case.label
            );
        } else {
            assert_eq!(
                after.status3,
                before.status3 | BATTLE_SCRIPT_STATUS3_PERISH_SONG,
                "case {case_index} {} application {application} battler {i} did not gain the status bit",
                case.label
            );
            assert_eq!(
                after.perish_song_timer, BATTLE_SCRIPT_TRYSETPERISHSONG_TIMER_VALUE,
                "case {case_index} {} application {application} battler {i} timer not set to 3",
                case.label
            );
            assert_eq!(
                after.perish_song_timer_start_value, BATTLE_SCRIPT_TRYSETPERISHSONG_TIMER_VALUE,
                "case {case_index} {} application {application} battler {i} start value not set to 3",
                case.label
            );
        }
        assert_eq!(
            after.ability, before.ability,
            "case {case_index} {} application {application} battler {i} ability changed",
            case.label
        );
    }
    for i in count..4 {
        assert_eq!(
            outcome.rules.battlers[i], prior.battlers[i],
            "case {case_index} {} application {application} inactive battler {i} changed",
            case.label
        );
    }

    match outcome.control {
        BattleScriptTrysetperishsongControl::Jump { .. } => assert_eq!(
            expected_not_affected, count,
            "case {case_index} {} application {application} jumped without all-not-affected",
            case.label
        ),
        BattleScriptTrysetperishsongControl::Advance => assert_ne!(
            expected_not_affected, count,
            "case {case_index} {} application {application} advanced despite all-not-affected",
            case.label
        ),
    }

    // Pressure PP loss: only the resolved attacker's first Perish Song slot
    // may ever change, by at most the count of other-battler Pressure
    // holders, and never below zero.
    if let Some(attacker) = attacker {
        let attacker_index = attacker.index();
        let before_attacker = prior.battlers[attacker_index];
        let after_attacker = outcome.rules.battlers[attacker_index];
        let perish_song_pos = before_attacker
            .moves
            .iter()
            .position(|&move_id| move_id == BATTLE_SCRIPT_MOVE_PERISH_SONG);
        for slot in 0..4 {
            if Some(slot) != perish_song_pos {
                assert_eq!(
                    after_attacker.pp[slot], before_attacker.pp[slot],
                    "case {case_index} {} application {application} non-Perish-Song pp slot {slot} changed",
                    case.label
                );
            }
        }
        if let Some(pos) = perish_song_pos {
            let pressure_holders = (0..count)
                .filter(|&i| {
                    i != attacker_index
                        && prior.battlers[i].ability == BATTLE_SCRIPT_ABILITY_PRESSURE
                })
                .count();
            let expected_pp = before_attacker.pp[pos].saturating_sub(pressure_holders as u8);
            assert_eq!(
                after_attacker.pp[pos], expected_pp,
                "case {case_index} {} application {application} Pressure PP loss mismatch",
                case.label
            );
        }
        for i in 0..count {
            if i != attacker_index {
                assert_eq!(
                    outcome.rules.battlers[i].pp, prior.battlers[i].pp,
                    "case {case_index} {} application {application} non-attacker battler {i} pp changed",
                    case.label
                );
                assert_eq!(
                    outcome.rules.battlers[i].moves, prior.battlers[i].moves,
                    "case {case_index} {} application {application} non-attacker battler {i} moves changed",
                    case.label
                );
            }
        }
    } else {
        for i in 0..count {
            assert_eq!(
                outcome.rules.battlers[i].pp, prior.battlers[i].pp,
                "case {case_index} {} application {application} pp changed without an attacker",
                case.label
            );
        }
    }
}

#[test]
fn singleton_registration_matches_canonical_typescript_and_keeps_exact_errors() {
    assert_eq!(BATTLE_SCRIPT_TRYSETPERISHSONG_REGISTRATION_CASES.len(), 10);
    for case in BATTLE_SCRIPT_TRYSETPERISHSONG_REGISTRATION_CASES {
        execute_registration_case(&case);
    }
}

fn execute_registration_case(case: &BattleScriptTrysetperishsongRegistrationVectorCase) {
    match (
        register_battle_script_trysetperishsong_handler(case.instructions),
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
fn dense_kind_moveset_pp_matrix_covers_all_required_domains() {
    let dense = BATTLE_SCRIPT_TRYSETPERISHSONG_CASES
        .iter()
        .filter(|case| case.category == "dense-kind-moveset-pp-matrix")
        .collect::<Vec<_>>();
    assert!(
        dense.len() >= 500,
        "dense matrix must be substantial, got {}",
        dense.len()
    );
    assert!(dense
        .iter()
        .any(|case| case.initial.battlers_count
            == BattleScriptTrysetperishsongBattlersCount::Singles));
    assert!(dense
        .iter()
        .any(|case| case.initial.battlers_count
            == BattleScriptTrysetperishsongBattlersCount::Doubles));
    assert!(dense.iter().any(|case| case
        .controls
        .contains(&BattleScriptTrysetperishsongControl::Jump { program_counter: 1434 })));
    assert!(dense
        .iter()
        .any(|case| case.controls == [BattleScriptTrysetperishsongControl::Advance]));

    let all_not_affected = BATTLE_SCRIPT_TRYSETPERISHSONG_CASES
        .iter()
        .filter(|case| case.category == "all-not-affected-failure-path")
        .collect::<Vec<_>>();
    assert!(!all_not_affected.is_empty());
    assert!(all_not_affected.iter().all(|case| case.controls
        == [BattleScriptTrysetperishsongControl::Jump { program_counter: 1434 }]));

    let multi_pressure = BATTLE_SCRIPT_TRYSETPERISHSONG_CASES
        .iter()
        .filter(|case| case.category == "multi-pressure-floor-at-zero")
        .collect::<Vec<_>>();
    assert_eq!(multi_pressure.len(), 4);
    assert!(
        multi_pressure.iter().any(
            |case| rules(case.expected.expect("multi-pressure succeeds")).battlers[0].pp[0] == 0
        ),
        "at least one starting pp must floor at 0 against three Pressure holders"
    );
    for case in &multi_pressure {
        let initial_pp = case.initial.battlers[0].pp[0];
        let expected = rules(case.expected.expect("multi-pressure succeeds"));
        assert_eq!(
            expected.battlers[0].pp[0],
            initial_pp.saturating_sub(3),
            "three Pressure holders decrement pp by at most 3, floored at 0"
        );
    }
}

#[test]
fn corpus_censuses_and_hash_are_pinned() {
    assert_eq!(
        BATTLE_SCRIPT_TRYSETPERISHSONG_DOMAIN_CENSUS,
        [
            ("source-battler-slots", 4),
            ("topology-variants", 2),
            ("kind-values", 5),
            ("moveset-variants", 6),
            ("pp-values", 4),
            ("optional-selector-values", 5),
            ("application-count-values", 2),
            ("registration-cases", 10),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYSETPERISHSONG_CATEGORY_CENSUS,
        [
            ("all-not-affected-failure-path", 21),
            ("dense-kind-moveset-pp-matrix", 630),
            ("late-label-resolution", 1),
            ("malformed-shape-before-attacker", 5),
            ("missing-attacker-role", 1),
            ("multi-pressure-floor-at-zero", 4),
            ("optional-selector-siblings", 125),
            ("repeated-application", 1),
            ("unresolved-failure-target", 1),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYSETPERISHSONG_BRANCH_CENSUS,
        [
            ("advance", 718),
            ("advance-then-jump", 1),
            ("invalid-instruction-shape", 5),
            ("jump", 63),
            ("missing-attacker-role", 1),
            ("unresolved-failure-target", 1),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYSETPERISHSONG_REGISTRATION_BRANCH_CENSUS,
        [
            ("invalid-shape", 5),
            ("registered", 2),
            ("wrong-cardinality", 3)
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYSETPERISHSONG_VECTOR_CORPUS_SHA256,
        "4854061de9011da05d6d8fc26e0d5baec66e7483607ddf464fe36ba91102f5a2"
    );
}
