//! Canonical-TS differential and registration ratchets for
//! src/engine/battleScriptIncrementGameStatOpcode.ts.
//!
//! Regenerate expected vectors with:
//! node --experimental-strip-types
//! core-rs/tools/gen-battle-script-incrementgamestat-vectors.mjs.

use std::collections::BTreeSet;

use factory_core::battle_script_incrementgamestat::{
    apply_battle_script_increment_game_stat, register_battle_script_increment_game_stat_handler,
    BattleScriptIncrementGameStatBattlerState, BattleScriptIncrementGameStatControl,
    BattleScriptIncrementGameStatObservation, BattleScriptIncrementGameStatOperand,
    BattleScriptIncrementGameStatRegistrationInstruction, BattleScriptIncrementGameStatRoles,
    BattleScriptIncrementGameStatRules, BattleScriptIncrementGameStatSiblings,
    BATTLE_SCRIPT_INCREMENTGAMESTAT_BATTLER_COUNT, BATTLE_SCRIPT_INCREMENT_GAME_STAT_BATTLERS,
};
use factory_core::battle_script_incrementgamestat_vectors_gen::{
    BattleScriptIncrementGameStatVectorBattlerState, BattleScriptIncrementGameStatVectorCase,
    BattleScriptIncrementGameStatVectorRegistrationInstruction,
    BattleScriptIncrementGameStatVectorSiblings, BattleScriptIncrementGameStatVectorState,
    BATTLE_SCRIPT_INCREMENT_GAME_STAT_CASES, BATTLE_SCRIPT_INCREMENT_GAME_STAT_I32_EDGE_DOMAIN,
    BATTLE_SCRIPT_INCREMENT_GAME_STAT_REGISTRATION_CASES,
    BATTLE_SCRIPT_INCREMENT_GAME_STAT_U16_EDGE_DOMAIN,
    BATTLE_SCRIPT_INCREMENT_GAME_STAT_U32_EDGE_DOMAIN,
    BATTLE_SCRIPT_INCREMENT_GAME_STAT_U8_EDGE_DOMAIN,
};

fn battler(
    value: BattleScriptIncrementGameStatVectorBattlerState,
) -> BattleScriptIncrementGameStatBattlerState {
    BattleScriptIncrementGameStatBattlerState {
        side: value.side,
        ability: value.ability,
        hp: value.hp,
        item: value.item,
        pp: value.pp,
        status1: value.status1,
        status2: value.status2,
        status3: value.status3,
    }
}

fn siblings(
    value: BattleScriptIncrementGameStatVectorSiblings,
) -> BattleScriptIncrementGameStatSiblings {
    BattleScriptIncrementGameStatSiblings {
        scripting_battler: value.scripting_battler,
        current_move: value.current_move,
        current_move_position: value.current_move_position,
        move_result_flags: value.move_result_flags,
        battle_move_damage: value.battle_move_damage,
        hit_marker: value.hit_marker,
        multi_hit_counter: value.multi_hit_counter,
        bide_dmg: value.bide_dmg,
        locked_moves: value.locked_moves,
    }
}

fn rules(value: BattleScriptIncrementGameStatVectorState) -> BattleScriptIncrementGameStatRules {
    BattleScriptIncrementGameStatRules {
        battlers: value.battlers.map(battler),
        selector_roles: BattleScriptIncrementGameStatRoles {
            attacker: value.attacker,
            target: value.target,
            effect_battler: value.effect_battler,
            fainted: value.fainted,
        },
        siblings: siblings(value.siblings),
    }
}

fn vector_battler(
    value: BattleScriptIncrementGameStatBattlerState,
) -> BattleScriptIncrementGameStatVectorBattlerState {
    BattleScriptIncrementGameStatVectorBattlerState {
        side: value.side,
        ability: value.ability,
        hp: value.hp,
        item: value.item,
        pp: value.pp,
        status1: value.status1,
        status2: value.status2,
        status3: value.status3,
    }
}

fn vector_siblings(
    value: BattleScriptIncrementGameStatSiblings,
) -> BattleScriptIncrementGameStatVectorSiblings {
    BattleScriptIncrementGameStatVectorSiblings {
        scripting_battler: value.scripting_battler,
        current_move: value.current_move,
        current_move_position: value.current_move_position,
        move_result_flags: value.move_result_flags,
        battle_move_damage: value.battle_move_damage,
        hit_marker: value.hit_marker,
        multi_hit_counter: value.multi_hit_counter,
        bide_dmg: value.bide_dmg,
        locked_moves: value.locked_moves,
    }
}

fn vector(value: BattleScriptIncrementGameStatRules) -> BattleScriptIncrementGameStatVectorState {
    BattleScriptIncrementGameStatVectorState {
        battlers: value.battlers.map(vector_battler),
        attacker: value.selector_roles.attacker,
        target: value.selector_roles.target,
        effect_battler: value.selector_roles.effect_battler,
        fainted: value.selector_roles.fainted,
        siblings: vector_siblings(value.siblings),
    }
}

#[test]
fn complete_projected_outputs_events_ordered_errors_repetitions_and_immutability_match_canonical_ts(
) {
    assert_eq!(BATTLE_SCRIPT_INCREMENT_GAME_STAT_CASES.len(), 33);
    for (case_index, case) in BATTLE_SCRIPT_INCREMENT_GAME_STAT_CASES.iter().enumerate() {
        execute_case(case_index, case);
    }
}

fn execute_case(case_index: usize, case: &BattleScriptIncrementGameStatVectorCase) {
    let input = rules(case.initial);
    let before = input;
    let mut current = input;
    let mut controls = Vec::new();
    let mut error = None;

    for application in 0..case.applications {
        let prior = current;
        match apply_battle_script_increment_game_stat(case.game_stat, &current) {
            Ok(outcome) => {
                assert_eq!(
                    current, prior,
                    "case {case_index} {} application {application}: native leaf mutated input",
                    case.label,
                );
                assert_transition_shape(case_index, case, application, prior, outcome);
                controls.push(outcome.control);
                current = outcome.rules;
            }
            Err(actual) => {
                assert_eq!(
                    current, prior,
                    "case {case_index} {} application {application}: failing leaf mutated input",
                    case.label,
                );
                error = Some(actual.to_string());
                break;
            }
        }
    }

    assert_eq!(
        input, before,
        "case {case_index} {}: native leaf changed initial input",
        case.label,
    );
    assert_eq!(
        controls.as_slice(),
        case.controls,
        "case {case_index} {}: canonical controls",
        case.label,
    );
    assert_eq!(
        error.as_deref(),
        case.expected_error,
        "case {case_index} {}: exact canonical error",
        case.label,
    );
    assert_eq!(
        case.expected,
        error.is_none().then(|| vector(current)),
        "case {case_index} {}: complete projected output",
        case.label,
    );
}

fn assert_transition_shape(
    case_index: usize,
    case: &BattleScriptIncrementGameStatVectorCase,
    application: u8,
    prior: BattleScriptIncrementGameStatRules,
    outcome: factory_core::battle_script_incrementgamestat::BattleScriptIncrementGameStatOutcome,
) {
    let attacker = prior.selector_roles.attacker.unwrap_or_else(|| {
        panic!(
            "case {case_index} {} application {application}: successful result had no attacker",
            case.label,
        )
    });
    assert_eq!(
        outcome.rules, prior,
        "case {case_index} {} application {application}: no-write leaf changed projected state",
        case.label,
    );
    assert_eq!(
        outcome.control,
        BattleScriptIncrementGameStatControl::Advance,
        "case {case_index} {} application {application}: command must advance",
        case.label,
    );
    let expected_observation = case
        .expected_observation
        .map(|game_stat| BattleScriptIncrementGameStatObservation::GameStatIncrement { game_stat });
    assert_eq!(
        outcome.observation, expected_observation,
        "case {case_index} {} application {application}: canonical observation",
        case.label,
    );

    let player_side = prior.battlers[attacker.index()].side
        == factory_core::battle_script_incrementgamestat::BattleScriptIncrementGameStatSide::Player;
    match outcome.observation {
        Some(BattleScriptIncrementGameStatObservation::GameStatIncrement { game_stat }) => {
            assert!(player_side, "player-side gate emitted for opponent");
            assert_eq!(game_stat, case.game_stat, "typed event game stat");
        }
        None => assert!(!player_side, "player-side attacker emitted no observation"),
    }
}

#[test]
fn both_game_stats_cover_all_attacker_slots_and_the_resolved_side_matrix() {
    let canonical = BATTLE_SCRIPT_INCREMENT_GAME_STAT_CASES
        .iter()
        .filter(|case| case.category == "canonical-attacker-slot-side-mapping")
        .collect::<Vec<_>>();
    assert_eq!(canonical.len(), 8);
    for case in canonical {
        let attacker = case.initial.attacker.expect("canonical case attacker");
        let expected_side = match attacker.as_u8() {
            0 | 2 => factory_core::battle_script_incrementgamestat::BattleScriptIncrementGameStatSide::Player,
            1 | 3 => factory_core::battle_script_incrementgamestat::BattleScriptIncrementGameStatSide::Opponent,
            _ => unreachable!("fixed battler domain"),
        };
        assert_eq!(case.initial.battlers[attacker.index()].side, expected_side);
        assert_eq!(
            case.expected_observation.is_some(),
            expected_side
                == factory_core::battle_script_incrementgamestat::BattleScriptIncrementGameStatSide::Player,
            "{} canonical gate",
            case.label,
        );
    }

    let matrix = BATTLE_SCRIPT_INCREMENT_GAME_STAT_CASES
        .iter()
        .filter(|case| case.category == "resolved-attacker-side-gate")
        .collect::<Vec<_>>();
    assert_eq!(matrix.len(), 16);
    let actual = matrix
        .iter()
        .map(|case| {
            let attacker = case.initial.attacker.expect("matrix attacker");
            (
                attacker,
                case.initial.battlers[attacker.index()].side,
                case.game_stat,
            )
        })
        .collect::<BTreeSet<_>>();
    let expected = BATTLE_SCRIPT_INCREMENT_GAME_STAT_BATTLERS
        .into_iter()
        .flat_map(|attacker| {
            [
                factory_core::battle_script_incrementgamestat::BattleScriptIncrementGameStatSide::Player,
                factory_core::battle_script_incrementgamestat::BattleScriptIncrementGameStatSide::Opponent,
            ]
            .into_iter()
            .flat_map(move |side| {
                factory_core::battle_script_incrementgamestat::BATTLE_SCRIPT_INCREMENT_GAME_STATS
                    .into_iter()
                    .map(move |game_stat| (attacker, side, game_stat))
            })
        })
        .collect::<BTreeSet<_>>();
    assert_eq!(actual, expected);
}

#[test]
fn integer_edge_siblings_are_preserved_without_any_counter_or_battle_mutation() {
    let cases = BATTLE_SCRIPT_INCREMENT_GAME_STAT_CASES
        .iter()
        .filter(|case| case.category == "integer-edge-and-sibling-preservation")
        .collect::<Vec<_>>();
    assert_eq!(cases.len(), 4);

    let mut u8_values = BTreeSet::new();
    let mut u16_values = BTreeSet::new();
    let mut i32_values = BTreeSet::new();
    let mut u32_values = BTreeSet::new();
    for case in cases {
        assert_eq!(
            case.expected,
            Some(case.initial),
            "{} state changed",
            case.label
        );
        for battler in case.initial.battlers {
            u8_values.insert(battler.ability);
            u8_values.extend(battler.pp);
            u16_values.insert(battler.hp);
            u16_values.insert(battler.item);
            u32_values.extend([battler.status1, battler.status2, battler.status3]);
        }
        u8_values.extend([
            case.initial.siblings.current_move_position,
            case.initial.siblings.move_result_flags,
            case.initial.siblings.multi_hit_counter,
        ]);
        u16_values.insert(case.initial.siblings.current_move);
        u16_values.extend(case.initial.siblings.locked_moves);
        i32_values.insert(case.initial.siblings.battle_move_damage);
        i32_values.extend(case.initial.siblings.bide_dmg);
        u32_values.insert(case.initial.siblings.hit_marker);
    }
    for value in BATTLE_SCRIPT_INCREMENT_GAME_STAT_U8_EDGE_DOMAIN {
        assert!(u8_values.contains(&value), "missing u8 edge {value}");
    }
    for value in BATTLE_SCRIPT_INCREMENT_GAME_STAT_U16_EDGE_DOMAIN {
        assert!(u16_values.contains(&value), "missing u16 edge {value}");
    }
    for value in BATTLE_SCRIPT_INCREMENT_GAME_STAT_I32_EDGE_DOMAIN {
        assert!(i32_values.contains(&value), "missing i32 edge {value}");
    }
    for value in BATTLE_SCRIPT_INCREMENT_GAME_STAT_U32_EDGE_DOMAIN {
        assert!(u32_values.contains(&value), "missing u32 edge {value}");
    }
}

#[test]
fn missing_attacker_precedes_side_read_and_repetitions_remain_idempotent() {
    let missing = BATTLE_SCRIPT_INCREMENT_GAME_STAT_CASES
        .iter()
        .filter(|case| case.category == "missing-attacker-role")
        .collect::<Vec<_>>();
    assert_eq!(missing.len(), 2);
    for case in missing {
        assert_eq!(case.initial.attacker, None, "{} attacker", case.label);
        assert_eq!(case.controls, &[], "{} controls", case.label);
        assert_eq!(
            case.expected_observation, None,
            "{} observation",
            case.label
        );
        assert_eq!(
            case.expected_error,
            Some("Battle Script hit-chain command requires a attacker role"),
            "{} exact error",
            case.label,
        );
    }

    let repeated = BATTLE_SCRIPT_INCREMENT_GAME_STAT_CASES
        .iter()
        .filter(|case| case.category == "repeated-application-idempotence")
        .collect::<Vec<_>>();
    assert_eq!(repeated.len(), 3);
    for case in repeated {
        assert_eq!(case.applications, 2, "{} applications", case.label);
        assert_eq!(
            case.controls,
            &[
                BattleScriptIncrementGameStatControl::Advance,
                BattleScriptIncrementGameStatControl::Advance,
            ],
            "{} controls",
            case.label,
        );
        assert_eq!(case.expected, Some(case.initial), "{} state", case.label);
    }
}

fn registration_instruction<'a>(
    value: BattleScriptIncrementGameStatVectorRegistrationInstruction,
    operands: &'a [BattleScriptIncrementGameStatOperand<'a>],
) -> BattleScriptIncrementGameStatRegistrationInstruction<'a> {
    BattleScriptIncrementGameStatRegistrationInstruction {
        opcode_name: value.opcode_name,
        program_counter: value.program_counter,
        opcode_id: value.opcode_id,
        dispatcher: value.dispatcher,
        operands,
    }
}

#[test]
fn exact_two_start_registration_shapes_and_ordered_failures_match_canonical_typescript() {
    assert_eq!(
        BATTLE_SCRIPT_INCREMENT_GAME_STAT_REGISTRATION_CASES.len(),
        18
    );
    for case in BATTLE_SCRIPT_INCREMENT_GAME_STAT_REGISTRATION_CASES {
        let operand_sets = case
            .instructions
            .iter()
            .map(|instruction| {
                instruction
                    .operand_widths
                    .iter()
                    .zip(instruction.operand_expressions)
                    .map(
                        |(&width_bytes, &expression)| BattleScriptIncrementGameStatOperand {
                            width_bytes,
                            expression,
                        },
                    )
                    .collect::<Vec<_>>()
            })
            .collect::<Vec<_>>();
        let instructions = case
            .instructions
            .iter()
            .zip(&operand_sets)
            .map(|(&instruction, operands)| registration_instruction(instruction, operands))
            .collect::<Vec<_>>();
        match register_battle_script_increment_game_stat_handler(&instructions) {
            Ok(registration) => {
                assert_eq!(
                    case.expected_error, None,
                    "{} unexpected success",
                    case.label
                );
                assert_eq!(
                    case.expected_bindings,
                    &[registration.opcode_id],
                    "{} dynamic handler binding",
                    case.label,
                );
            }
            Err(error) => {
                assert!(
                    case.expected_bindings.is_empty(),
                    "{} unexpected failure",
                    case.label,
                );
                assert_eq!(
                    Some(error.to_string()).as_deref(),
                    case.expected_error,
                    "{} exact registration error",
                    case.label,
                );
            }
        }
    }
}

#[test]
fn fixed_source_battler_domain_remains_four_slots() {
    assert_eq!(BATTLE_SCRIPT_INCREMENTGAMESTAT_BATTLER_COUNT, 4);
    assert_eq!(
        BATTLE_SCRIPT_INCREMENT_GAME_STAT_BATTLERS.map(|battler| battler.as_u8()),
        [0, 1, 2, 3],
    );
}
