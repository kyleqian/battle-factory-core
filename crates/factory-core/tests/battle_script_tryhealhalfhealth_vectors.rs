//! Differential ratchet for
//! `src/engine/battleScriptTryhealhalfhealthOpcode.ts`. Expected complete
//! narrow projections, controls, registration results, and exact ordered
//! errors are generated only by executing the canonical TypeScript handler:
//!
//! `node --experimental-strip-types
//! core-rs/tools/gen-battle-script-tryhealhalfhealth-vectors.mjs`
//!
//! Behavioral source evidence is `Cmd_tryhealhalfhealth` at
//! `reference/pokeemerald/src/battle_script_commands.c:6615-6629`, dispatched
//! at `:454` as opcode `0x7B`; its six-byte macro is
//! `reference/pokeemerald/asm/macros/battle_script.inc:684-688`, with Restore
//! HP / Softboiled concrete calls at `data/battle_scripts_1.s:676,2031` and
//! their shared `BattleScript_AlreadyAtFullHp` failure label at `:2042`.

use std::collections::BTreeSet;

use factory_core::battle_script_tryhealhalfhealth::{
    apply_battle_script_tryhealhalfhealth, battle_script_tryhealhalfhealth_half_max_hp,
    register_battle_script_tryhealhalfhealth_handler, BattleScriptTryhealhalfhealthBattler,
    BattleScriptTryhealhalfhealthBattlerState, BattleScriptTryhealhalfhealthControl,
    BattleScriptTryhealhalfhealthInstruction, BattleScriptTryhealhalfhealthOperand,
    BattleScriptTryhealhalfhealthRegistration, BattleScriptTryhealhalfhealthRoles,
    BattleScriptTryhealhalfhealthRules, BattleScriptTryhealhalfhealthSiblings,
    BATTLE_SCRIPT_TRYHEALHALFHEALTH_BATTLERS, BATTLE_SCRIPT_TRYHEALHALFHEALTH_BATTLER_COUNT,
    BATTLE_SCRIPT_TRYHEALHALFHEALTH_BATTLER_OPERAND_WIDTH_BYTES,
    BATTLE_SCRIPT_TRYHEALHALFHEALTH_BS_ATTACKER, BATTLE_SCRIPT_TRYHEALHALFHEALTH_BS_TARGET,
    BATTLE_SCRIPT_TRYHEALHALFHEALTH_DISPATCHER,
    BATTLE_SCRIPT_TRYHEALHALFHEALTH_FAILURE_POINTER_WIDTH_BYTES,
    BATTLE_SCRIPT_TRYHEALHALFHEALTH_FULL_HP_LABEL, BATTLE_SCRIPT_TRYHEALHALFHEALTH_OPCODE,
    BATTLE_SCRIPT_TRYHEALHALFHEALTH_OPCODE_NAME,
};
use factory_core::battle_script_tryhealhalfhealth_vectors_gen::{
    BattleScriptTryhealhalfhealthVectorBattlerState, BattleScriptTryhealhalfhealthVectorCase,
    BattleScriptTryhealhalfhealthVectorInstruction, BattleScriptTryhealhalfhealthVectorSiblings,
    BattleScriptTryhealhalfhealthVectorState, BATTLE_SCRIPT_TRYHEALHALFHEALTH_BRANCH_CENSUS,
    BATTLE_SCRIPT_TRYHEALHALFHEALTH_CANONICAL_SHAPES, BATTLE_SCRIPT_TRYHEALHALFHEALTH_CASES,
    BATTLE_SCRIPT_TRYHEALHALFHEALTH_CATEGORY_CENSUS, BATTLE_SCRIPT_TRYHEALHALFHEALTH_DOMAIN_CENSUS,
    BATTLE_SCRIPT_TRYHEALHALFHEALTH_HALF_PROOFS, BATTLE_SCRIPT_TRYHEALHALFHEALTH_HALF_RAW_BYTES,
    BATTLE_SCRIPT_TRYHEALHALFHEALTH_HALF_RAW_SHA256,
    BATTLE_SCRIPT_TRYHEALHALFHEALTH_MAX_HP_EDGE_DOMAIN,
    BATTLE_SCRIPT_TRYHEALHALFHEALTH_PRIOR_DAMAGE_EDGE_DOMAIN,
    BATTLE_SCRIPT_TRYHEALHALFHEALTH_REGISTRATION_BRANCH_CENSUS,
    BATTLE_SCRIPT_TRYHEALHALFHEALTH_REGISTRATION_CASES,
    BATTLE_SCRIPT_TRYHEALHALFHEALTH_VECTOR_CORPUS_BYTES,
    BATTLE_SCRIPT_TRYHEALHALFHEALTH_VECTOR_CORPUS_SHA256,
};

fn battler(
    value: BattleScriptTryhealhalfhealthVectorBattlerState,
) -> BattleScriptTryhealhalfhealthBattlerState {
    BattleScriptTryhealhalfhealthBattlerState {
        side: value.side,
        ability: value.ability,
        hp: value.hp,
        max_hp: value.max_hp,
        moves: value.moves,
        pp: value.pp,
        status1: value.status1,
        status2: value.status2,
        status3: value.status3,
        substitute_hp: value.substitute_hp,
        rollout_timer: value.rollout_timer,
        fury_cutter_counter: value.fury_cutter_counter,
        truant_counter: value.truant_counter,
        recharge_timer: value.recharge_timer,
        flinch_immobility: value.flinch_immobility,
        disabled_move: value.disabled_move,
        used_disabled_move: value.used_disabled_move,
        taunt_timer: value.taunt_timer,
        used_taunted_move: value.used_taunted_move,
        used_imprisoned_move: value.used_imprisoned_move,
        item: value.item,
        stat_stages: value.stat_stages,
        party_index: value.party_index,
        speed: value.speed,
    }
}

fn vector_battler(
    value: BattleScriptTryhealhalfhealthBattlerState,
) -> BattleScriptTryhealhalfhealthVectorBattlerState {
    BattleScriptTryhealhalfhealthVectorBattlerState {
        side: value.side,
        ability: value.ability,
        hp: value.hp,
        max_hp: value.max_hp,
        moves: value.moves,
        pp: value.pp,
        status1: value.status1,
        status2: value.status2,
        status3: value.status3,
        substitute_hp: value.substitute_hp,
        rollout_timer: value.rollout_timer,
        fury_cutter_counter: value.fury_cutter_counter,
        truant_counter: value.truant_counter,
        recharge_timer: value.recharge_timer,
        flinch_immobility: value.flinch_immobility,
        disabled_move: value.disabled_move,
        used_disabled_move: value.used_disabled_move,
        taunt_timer: value.taunt_timer,
        used_taunted_move: value.used_taunted_move,
        used_imprisoned_move: value.used_imprisoned_move,
        item: value.item,
        stat_stages: value.stat_stages,
        party_index: value.party_index,
        speed: value.speed,
    }
}

fn siblings(
    value: BattleScriptTryhealhalfhealthVectorSiblings,
) -> BattleScriptTryhealhalfhealthSiblings {
    BattleScriptTryhealhalfhealthSiblings {
        scripting_battler: value.scripting_battler,
        battler_with_ability: value.battler_with_ability,
        atk_canceler_tracker: value.atk_canceler_tracker,
        battle_outcome: value.battle_outcome,
        current_move: value.current_move,
        current_move_effect: value.current_move_effect,
        current_move_position: value.current_move_position,
        move_result_flags: value.move_result_flags,
        dmg_multiplier: value.dmg_multiplier,
        crit_multiplier: value.crit_multiplier,
        move_effect_byte: value.move_effect_byte,
        miss_type: value.miss_type,
        hit_marker: value.hit_marker,
        multi_hit_counter: value.multi_hit_counter,
        multi_hit_string_counter: value.multi_hit_string_counter,
        multistring_chooser: value.multistring_chooser,
        pain_split_hp: value.pain_split_hp,
        dynamic_base_power: value.dynamic_base_power,
        hp_dealt: value.hp_dealt,
        bide_dmg: value.bide_dmg,
        locked_moves: value.locked_moves,
        side_statuses: value.side_statuses,
        weather: value.weather,
        weather_timer: value.weather_timer,
    }
}

fn vector_siblings(
    value: BattleScriptTryhealhalfhealthSiblings,
) -> BattleScriptTryhealhalfhealthVectorSiblings {
    BattleScriptTryhealhalfhealthVectorSiblings {
        scripting_battler: value.scripting_battler,
        battler_with_ability: value.battler_with_ability,
        atk_canceler_tracker: value.atk_canceler_tracker,
        battle_outcome: value.battle_outcome,
        current_move: value.current_move,
        current_move_effect: value.current_move_effect,
        current_move_position: value.current_move_position,
        move_result_flags: value.move_result_flags,
        dmg_multiplier: value.dmg_multiplier,
        crit_multiplier: value.crit_multiplier,
        move_effect_byte: value.move_effect_byte,
        miss_type: value.miss_type,
        hit_marker: value.hit_marker,
        multi_hit_counter: value.multi_hit_counter,
        multi_hit_string_counter: value.multi_hit_string_counter,
        multistring_chooser: value.multistring_chooser,
        pain_split_hp: value.pain_split_hp,
        dynamic_base_power: value.dynamic_base_power,
        hp_dealt: value.hp_dealt,
        bide_dmg: value.bide_dmg,
        locked_moves: value.locked_moves,
        side_statuses: value.side_statuses,
        weather: value.weather,
        weather_timer: value.weather_timer,
    }
}

fn rules(value: BattleScriptTryhealhalfhealthVectorState) -> BattleScriptTryhealhalfhealthRules {
    BattleScriptTryhealhalfhealthRules {
        battlers: value.battlers.map(battler),
        selector_roles: BattleScriptTryhealhalfhealthRoles {
            attacker: value.attacker,
            target: value.target,
            effect_battler: value.effect_battler,
            fainted: value.fainted,
        },
        battle_move_damage: value.battle_move_damage,
        siblings: siblings(value.siblings),
    }
}

fn vector_state(
    value: BattleScriptTryhealhalfhealthRules,
) -> BattleScriptTryhealhalfhealthVectorState {
    BattleScriptTryhealhalfhealthVectorState {
        battlers: value.battlers.map(vector_battler),
        attacker: value.selector_roles.attacker,
        target: value.selector_roles.target,
        effect_battler: value.selector_roles.effect_battler,
        fainted: value.selector_roles.fainted,
        battle_move_damage: value.battle_move_damage,
        siblings: vector_siblings(value.siblings),
    }
}

fn operands(
    value: BattleScriptTryhealhalfhealthVectorInstruction,
) -> Vec<BattleScriptTryhealhalfhealthOperand<'static>> {
    assert_eq!(
        value.operand_widths.len(),
        value.operand_expressions.len(),
        "{} has mismatched generated operand metadata",
        value.opcode_name,
    );
    value
        .operand_widths
        .iter()
        .zip(value.operand_expressions)
        .map(
            |(&width_bytes, &expression)| BattleScriptTryhealhalfhealthOperand {
                width_bytes,
                expression,
            },
        )
        .collect()
}

fn instruction<'a>(
    value: BattleScriptTryhealhalfhealthVectorInstruction,
    operands: &'a [BattleScriptTryhealhalfhealthOperand<'a>],
) -> BattleScriptTryhealhalfhealthInstruction<'a> {
    BattleScriptTryhealhalfhealthInstruction {
        opcode_name: value.opcode_name,
        program_counter: value.program_counter,
        opcode_id: value.opcode_id,
        dispatcher: value.dispatcher,
        operands,
        resolved_failure_target: value.resolved_failure_target,
    }
}

#[test]
fn complete_projected_outputs_controls_ordered_errors_and_immutable_input_match_canonical_typescript(
) {
    assert_eq!(BATTLE_SCRIPT_TRYHEALHALFHEALTH_CASES.len(), 1_810);
    for (case_index, case) in BATTLE_SCRIPT_TRYHEALHALFHEALTH_CASES.iter().enumerate() {
        execute_case(case_index, case);
    }
}

fn execute_case(case_index: usize, case: &BattleScriptTryhealhalfhealthVectorCase) {
    let owned_operands = operands(case.instruction);
    let instruction = instruction(case.instruction, &owned_operands);
    let input = rules(case.initial);
    let before = input;
    let mut current = input;
    let mut actual_controls = Vec::new();
    let mut actual_error = None;

    for application in 0..case.applications {
        let prior = current;
        match apply_battle_script_tryhealhalfhealth(instruction, &current) {
            Ok(outcome) => {
                actual_controls.push(outcome.control);
                assert_transition_shape(case_index, case, application, prior, outcome);
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
        "case {case_index} {}: native transformation mutated input",
        case.label,
    );
    match (actual_error, case.expected, case.expected_error) {
        (None, Some(expected), None) => {
            assert_eq!(
                actual_controls.as_slice(),
                case.controls,
                "case {case_index} {}: canonical control sequence",
                case.label,
            );
            assert_eq!(
                actual_controls.len(),
                usize::from(case.applications),
                "case {case_index} {}: successful sequence stopped early",
                case.label,
            );
            assert_eq!(
                vector_state(current),
                expected,
                "case {case_index} {}: complete projected output",
                case.label,
            );
        }
        (Some(error), None, Some(expected_error)) => {
            assert_eq!(
                actual_controls.as_slice(),
                case.controls,
                "case {case_index} {}: error must not emit a control result",
                case.label,
            );
            assert_eq!(
                error, expected_error,
                "case {case_index} {}: exact source-ordered error",
                case.label,
            );
        }
        (error, expected, expected_error) => panic!(
            "case {case_index} {}: generated result shape disagrees with native result: error={error:?}, expected={expected:?}, expected_error={expected_error:?}",
            case.label,
        ),
    }
}

fn assert_transition_shape(
    case_index: usize,
    case: &BattleScriptTryhealhalfhealthVectorCase,
    application: u8,
    prior: BattleScriptTryhealhalfhealthRules,
    outcome: factory_core::battle_script_tryhealhalfhealth::BattleScriptTryhealhalfhealthOutcome,
) {
    let operand = case
        .instruction
        .operand_expressions
        .get(1)
        .copied()
        .unwrap_or_else(|| {
            panic!(
                "case {case_index} {} application {application}: success omitted battler operand",
                case.label,
            )
        });
    let selected = match operand {
        BATTLE_SCRIPT_TRYHEALHALFHEALTH_BS_ATTACKER => {
            let attacker = prior.selector_roles.attacker.unwrap_or_else(|| {
                panic!(
                    "case {case_index} {} application {application}: successful BS_ATTACKER had no attacker",
                    case.label,
                )
            });
            assert_eq!(
                outcome.rules.selector_roles.attacker, prior.selector_roles.attacker,
                "case {case_index} {} application {application}: BS_ATTACKER changed attacker",
                case.label,
            );
            assert_eq!(
                outcome.rules.selector_roles.target,
                Some(attacker),
                "case {case_index} {} application {application}: BS_ATTACKER did not rebind target",
                case.label,
            );
            assert_eq!(
                outcome.rules.selector_roles.effect_battler, prior.selector_roles.effect_battler,
                "case {case_index} {} application {application}: BS_ATTACKER changed effectBattler",
                case.label,
            );
            assert_eq!(
                outcome.rules.selector_roles.fainted, prior.selector_roles.fainted,
                "case {case_index} {} application {application}: BS_ATTACKER changed fainted",
                case.label,
            );
            attacker
        }
        BATTLE_SCRIPT_TRYHEALHALFHEALTH_BS_TARGET => {
            let target = prior.selector_roles.target.unwrap_or_else(|| {
                panic!(
                    "case {case_index} {} application {application}: successful BS_TARGET had no target",
                    case.label,
                )
            });
            assert_eq!(
                outcome.rules.selector_roles, prior.selector_roles,
                "case {case_index} {} application {application}: BS_TARGET changed selectors",
                case.label,
            );
            target
        }
        value => panic!(
            "case {case_index} {} application {application}: unexpected successful operand {value}",
            case.label,
        ),
    };
    let selected_state = prior.battlers[selected.index()];
    let expected_damage = -i32::from(battle_script_tryhealhalfhealth_half_max_hp(
        selected_state.max_hp,
    ));
    let expected_control = if selected_state.hp == selected_state.max_hp {
        BattleScriptTryhealhalfhealthControl::FailJump
    } else {
        BattleScriptTryhealhalfhealthControl::Advance
    };
    assert_eq!(
        outcome.control, expected_control,
        "case {case_index} {} application {application}: exact HP equality control",
        case.label,
    );
    assert_eq!(
        outcome.rules.battle_move_damage, expected_damage,
        "case {case_index} {} application {application}: did not overwrite signed damage",
        case.label,
    );
    assert_eq!(
        outcome.rules.battlers, prior.battlers,
        "case {case_index} {} application {application}: changed any battler state",
        case.label,
    );
    assert_eq!(
        outcome.rules.siblings, prior.siblings,
        "case {case_index} {} application {application}: changed sibling context",
        case.label,
    );
    if outcome.control == BattleScriptTryhealhalfhealthControl::FailJump {
        let expression = case
            .instruction
            .operand_expressions
            .first()
            .copied()
            .expect("successful full-HP branch has pointer operand");
        assert_eq!(
            case.instruction.resolved_failure_target,
            Some(expression),
            "case {case_index} {} application {application}: full branch did not resolve its own failure expression late",
            case.label,
        );
    }
}

#[test]
fn source_u16_half_and_full_lower_corrupt_higher_predicates_are_exhaustive() {
    const LOWER_EXISTS: u8 = 0b01;
    const HIGHER_EXISTS: u8 = 0b10;
    const PROOF_OPERANDS: [BattleScriptTryhealhalfhealthOperand<'static>; 2] = [
        BattleScriptTryhealhalfhealthOperand {
            width_bytes: BATTLE_SCRIPT_TRYHEALHALFHEALTH_FAILURE_POINTER_WIDTH_BYTES,
            expression: BATTLE_SCRIPT_TRYHEALHALFHEALTH_FULL_HP_LABEL,
        },
        BattleScriptTryhealhalfhealthOperand {
            width_bytes: BATTLE_SCRIPT_TRYHEALHALFHEALTH_BATTLER_OPERAND_WIDTH_BYTES,
            expression: BATTLE_SCRIPT_TRYHEALHALFHEALTH_BS_ATTACKER,
        },
    ];
    let instruction = BattleScriptTryhealhalfhealthInstruction {
        opcode_name: BATTLE_SCRIPT_TRYHEALHALFHEALTH_OPCODE_NAME,
        program_counter: 344,
        opcode_id: BATTLE_SCRIPT_TRYHEALHALFHEALTH_OPCODE,
        dispatcher: BATTLE_SCRIPT_TRYHEALHALFHEALTH_DISPATCHER,
        operands: &PROOF_OPERANDS,
        resolved_failure_target: Some(BATTLE_SCRIPT_TRYHEALHALFHEALTH_FULL_HP_LABEL),
    };
    assert_eq!(BATTLE_SCRIPT_TRYHEALHALFHEALTH_HALF_PROOFS.len(), 32_769);
    let mut next_max_hp = 0_u32;
    let mut expanded = 0_u32;
    for &(start, end, expected_damage, flags) in &BATTLE_SCRIPT_TRYHEALHALFHEALTH_HALF_PROOFS {
        assert_eq!(
            u32::from(start),
            next_max_hp,
            "half-proof intervals must be contiguous"
        );
        assert!(start <= end, "half-proof interval must be nonempty");
        for max_hp in start..=end {
            assert_eq!(
                -i32::from(battle_script_tryhealhalfhealth_half_max_hp(max_hp)),
                expected_damage,
                "normalized canonical half proof has wrong damage at maxHP {max_hp}",
            );
            let full_input = proof_rules(max_hp, max_hp);
            let full_before = full_input;
            let full = apply_battle_script_tryhealhalfhealth(instruction, &full_input)
                .expect("full-u16 proof must resolve its source pointer");
            assert_eq!(
                full_input, full_before,
                "full proof mutated input at maxHP {max_hp}"
            );
            assert_eq!(full.control, BattleScriptTryhealhalfhealthControl::FailJump);
            assert_eq!(full.rules.battle_move_damage, expected_damage);
            assert_eq!(
                full.rules.selector_roles.target,
                Some(BattleScriptTryhealhalfhealthBattler::Battler0),
            );
            assert_eq!(full.rules.battlers, full_input.battlers);
            assert_eq!(full.rules.siblings, full_input.siblings);

            assert_eq!(flags & LOWER_EXISTS != 0, max_hp > 0);
            if max_hp > 0 {
                let lower_input = proof_rules(max_hp, max_hp - 1);
                let lower = apply_battle_script_tryhealhalfhealth(instruction, &lower_input)
                    .expect("lower HP must not require failure-label lookup");
                assert_eq!(lower.control, BattleScriptTryhealhalfhealthControl::Advance);
                assert_eq!(lower.rules.battle_move_damage, expected_damage);
            }

            assert_eq!(flags & HIGHER_EXISTS != 0, max_hp < u16::MAX);
            if max_hp < u16::MAX {
                let higher_input = proof_rules(max_hp, max_hp + 1);
                let higher = apply_battle_script_tryhealhalfhealth(instruction, &higher_input)
                    .expect("corrupt higher HP must not require failure-label lookup");
                assert_eq!(
                    higher.control,
                    BattleScriptTryhealhalfhealthControl::Advance
                );
                assert_eq!(higher.rules.battle_move_damage, expected_damage);
            }
            expanded += 1;
        }
        next_max_hp = u32::from(end) + 1;
    }
    assert_eq!(next_max_hp, u32::from(u16::MAX) + 1);
    assert_eq!(expanded, u32::from(u16::MAX) + 1);
}

const PROOF_BATTLER: BattleScriptTryhealhalfhealthBattlerState =
    BattleScriptTryhealhalfhealthBattlerState {
        side: 0,
        ability: 1,
        hp: 0,
        max_hp: 0,
        moves: [105, 135, 0, 0],
        pp: [10, 10, 0, 0],
        status1: 0x0102_0304,
        status2: 0x0506_0708,
        status3: 0x090a_0b0c,
        substitute_hp: 13,
        rollout_timer: 14,
        fury_cutter_counter: 15,
        truant_counter: 1,
        recharge_timer: 16,
        flinch_immobility: 1,
        disabled_move: 17,
        used_disabled_move: 1,
        taunt_timer: 15,
        used_taunted_move: 1,
        used_imprisoned_move: 1,
        item: 18,
        stat_stages: [0, 1, 2, 3, 4, 5, 6, 7],
        party_index: 2,
        speed: 19,
    };

const PROOF_SIBLINGS: BattleScriptTryhealhalfhealthSiblings =
    BattleScriptTryhealhalfhealthSiblings {
        scripting_battler: BattleScriptTryhealhalfhealthBattler::Battler0,
        battler_with_ability: BattleScriptTryhealhalfhealthBattler::Battler1,
        atk_canceler_tracker: 2,
        battle_outcome: 3,
        current_move: 105,
        current_move_effect: 4,
        current_move_position: 0,
        move_result_flags: 0x8000_0001,
        dmg_multiplier: 5,
        crit_multiplier: 6,
        move_effect_byte: 7,
        miss_type: 8,
        hit_marker: 0x4000_0002,
        multi_hit_counter: 9,
        multi_hit_string_counter: 10,
        multistring_chooser: 11,
        pain_split_hp: i32::MIN,
        dynamic_base_power: 12,
        hp_dealt: i32::MAX,
        bide_dmg: [i32::MIN, -1, 0, i32::MAX],
        locked_moves: [13, 14, 15, 16],
        side_statuses: [0x0100_0001, 0x8000_0002],
        weather: 0x4000_0003,
        weather_timer: 17,
    };

fn proof_rules(max_hp: u16, hp: u16) -> BattleScriptTryhealhalfhealthRules {
    let mut focus = PROOF_BATTLER;
    focus.max_hp = max_hp;
    focus.hp = hp;
    BattleScriptTryhealhalfhealthRules {
        battlers: [focus, PROOF_BATTLER, PROOF_BATTLER, PROOF_BATTLER],
        selector_roles: BattleScriptTryhealhalfhealthRoles {
            attacker: Some(BattleScriptTryhealhalfhealthBattler::Battler0),
            target: Some(BattleScriptTryhealhalfhealthBattler::Battler1),
            effect_battler: Some(BattleScriptTryhealhalfhealthBattler::Battler2),
            fainted: Some(BattleScriptTryhealhalfhealthBattler::Battler3),
        },
        battle_move_damage: i32::MIN,
        siblings: PROOF_SIBLINGS,
    }
}

#[test]
fn canonical_first_match_registration_has_no_cardinality_or_shape_predicates() {
    assert_eq!(BATTLE_SCRIPT_TRYHEALHALFHEALTH_REGISTRATION_CASES.len(), 5);
    for case in BATTLE_SCRIPT_TRYHEALHALFHEALTH_REGISTRATION_CASES {
        let owned_operands = case
            .instructions
            .iter()
            .copied()
            .map(operands)
            .collect::<Vec<_>>();
        let instructions = case
            .instructions
            .iter()
            .copied()
            .zip(&owned_operands)
            .map(|(value, operands)| instruction(value, operands))
            .collect::<Vec<_>>();
        match (
            register_battle_script_tryhealhalfhealth_handler(&instructions),
            case.expected_bindings,
            case.expected_error,
        ) {
            (Ok(BattleScriptTryhealhalfhealthRegistration { opcode_id }), expected, None) => {
                assert_eq!(&[opcode_id], expected, "registration {}: dynamic key", case.label);
            }
            (Err(error), expected, Some(expected_error)) => {
                assert!(expected.is_empty(), "registration {}: failure returned a key", case.label);
                assert_eq!(error.to_string(), expected_error, "registration {}: exact error", case.label);
            }
            (actual, expected, expected_error) => panic!(
                "registration {}: generated result disagrees with native first-match result: actual={actual:?}, expected={expected:?}, expected_error={expected_error:?}",
                case.label,
            ),
        }
    }
    let first_match = BATTLE_SCRIPT_TRYHEALHALFHEALTH_REGISTRATION_CASES
        .iter()
        .find(|case| case.label == "first_match_wins_over_later_canonical_shape")
        .expect("first-match vector");
    assert_eq!(first_match.expected_bindings, &[0]);
    assert_eq!(first_match.instructions[0].dispatcher, "Cmd_not_checked");
    assert_eq!(first_match.instructions[0].operand_widths, &[7, 6, 5]);
    let permissive = BATTLE_SCRIPT_TRYHEALHALFHEALTH_REGISTRATION_CASES
        .iter()
        .find(|case| case.label == "id_dispatcher_and_operand_shape_are_not_predicates")
        .expect("permissive factory vector");
    assert_eq!(permissive.expected_bindings, &[u8::MAX]);
    assert!(permissive.instructions[0].operand_widths.is_empty());
}

#[test]
fn source_identity_macro_encoding_and_both_concrete_shapes_are_separately_ratcheted() {
    assert_eq!(BATTLE_SCRIPT_TRYHEALHALFHEALTH_BATTLER_COUNT, 4);
    assert_eq!(
        BATTLE_SCRIPT_TRYHEALHALFHEALTH_BATTLERS.map(BattleScriptTryhealhalfhealthBattler::as_u8),
        [0, 1, 2, 3],
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYHEALHALFHEALTH_OPCODE_NAME,
        "B_SCR_OP_TRYHEALHALFHEALTH"
    );
    assert_eq!(BATTLE_SCRIPT_TRYHEALHALFHEALTH_OPCODE, 0x7b);
    assert_eq!(
        BATTLE_SCRIPT_TRYHEALHALFHEALTH_DISPATCHER,
        "Cmd_tryhealhalfhealth"
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYHEALHALFHEALTH_FAILURE_POINTER_WIDTH_BYTES,
        4
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYHEALHALFHEALTH_BATTLER_OPERAND_WIDTH_BYTES,
        1
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYHEALHALFHEALTH_FULL_HP_LABEL,
        "BattleScript_AlreadyAtFullHp"
    );
    assert_eq!(BATTLE_SCRIPT_TRYHEALHALFHEALTH_CANONICAL_SHAPES.len(), 2);
    let [restore, softboiled] = &BATTLE_SCRIPT_TRYHEALHALFHEALTH_CANONICAL_SHAPES;
    for shape in [restore, softboiled] {
        assert_eq!(
            shape.opcode_name,
            BATTLE_SCRIPT_TRYHEALHALFHEALTH_OPCODE_NAME
        );
        assert_eq!(shape.opcode_id, BATTLE_SCRIPT_TRYHEALHALFHEALTH_OPCODE);
        assert_eq!(shape.dispatcher, BATTLE_SCRIPT_TRYHEALHALFHEALTH_DISPATCHER);
        assert_eq!(shape.invocation_mnemonic, "tryhealhalfhealth");
        assert_eq!(shape.invocation_macro_line, 684);
        assert_eq!(shape.source_macro, "tryhealhalfhealth");
        assert_eq!(shape.source_macro_line, 685);
        assert_eq!(
            shape.failure_expression,
            BATTLE_SCRIPT_TRYHEALHALFHEALTH_FULL_HP_LABEL
        );
        assert_eq!(shape.failure_width_bytes, 4);
        assert_eq!(shape.failure_macro_line, 686);
        assert_eq!(shape.battler_width_bytes, 1);
        assert_eq!(shape.battler_macro_line, 687);
        assert_eq!(shape.encoded_width_bytes, 6);
        assert_eq!(shape.failure_target_program_counter, 1_424);
    }
    assert_eq!(restore.entry_label, "BattleScript_EffectRestoreHp");
    assert_eq!(restore.entry_program_counter, 341);
    assert_eq!(restore.instruction_program_counter, 344);
    assert_eq!(restore.statement_line, 676);
    assert_eq!(
        restore.battler_expression,
        BATTLE_SCRIPT_TRYHEALHALFHEALTH_BS_ATTACKER
    );
    assert_eq!(softboiled.entry_label, "BattleScript_EffectSoftboiled");
    assert_eq!(softboiled.entry_program_counter, 1_412);
    assert_eq!(softboiled.instruction_program_counter, 1_415);
    assert_eq!(softboiled.statement_line, 2_031);
    assert_eq!(
        softboiled.battler_expression,
        BATTLE_SCRIPT_TRYHEALHALFHEALTH_BS_TARGET
    );
}

#[test]
fn selector_alias_matrices_cover_all_four_roles_and_prior_damage_edges() {
    let optional = [None, Some(0), Some(1), Some(2), Some(3)];
    let restore = BATTLE_SCRIPT_TRYHEALHALFHEALTH_CASES
        .iter()
        .filter(|case| case.category == "restore-all-attacker-and-selector-alias-combinations")
        .collect::<Vec<_>>();
    assert_eq!(restore.len(), 500);
    let restore_seen = restore
        .iter()
        .map(|case| {
            (
                case.initial
                    .attacker
                    .expect("Restore matrix attacker")
                    .as_u8(),
                case.initial
                    .target
                    .map(BattleScriptTryhealhalfhealthBattler::as_u8),
                case.initial
                    .effect_battler
                    .map(BattleScriptTryhealhalfhealthBattler::as_u8),
                case.initial
                    .fainted
                    .map(BattleScriptTryhealhalfhealthBattler::as_u8),
            )
        })
        .collect::<BTreeSet<_>>();
    for attacker in 0..=3 {
        for target in optional {
            for effect_battler in optional {
                for fainted in optional {
                    assert!(restore_seen.contains(&(attacker, target, effect_battler, fainted)));
                }
            }
        }
    }

    let softboiled = BATTLE_SCRIPT_TRYHEALHALFHEALTH_CASES
        .iter()
        .filter(|case| case.category == "softboiled-all-target-and-selector-alias-combinations")
        .collect::<Vec<_>>();
    assert_eq!(softboiled.len(), 500);
    let softboiled_seen = softboiled
        .iter()
        .map(|case| {
            (
                case.initial
                    .target
                    .expect("Softboiled matrix target")
                    .as_u8(),
                case.initial
                    .attacker
                    .map(BattleScriptTryhealhalfhealthBattler::as_u8),
                case.initial
                    .effect_battler
                    .map(BattleScriptTryhealhalfhealthBattler::as_u8),
                case.initial
                    .fainted
                    .map(BattleScriptTryhealhalfhealthBattler::as_u8),
            )
        })
        .collect::<BTreeSet<_>>();
    for target in 0..=3 {
        for attacker in optional {
            for effect_battler in optional {
                for fainted in optional {
                    assert!(softboiled_seen.contains(&(target, attacker, effect_battler, fainted)));
                }
            }
        }
    }

    let prior_damage = BATTLE_SCRIPT_TRYHEALHALFHEALTH_CASES
        .iter()
        .filter(|case| case.category == "prior-signed-battle-move-damage-overwrite")
        .map(|case| case.initial.battle_move_damage)
        .collect::<BTreeSet<_>>();
    assert_eq!(
        prior_damage.len(),
        BATTLE_SCRIPT_TRYHEALHALFHEALTH_PRIOR_DAMAGE_EDGE_DOMAIN.len()
    );
    assert_eq!(
        prior_damage,
        BATTLE_SCRIPT_TRYHEALHALFHEALTH_PRIOR_DAMAGE_EDGE_DOMAIN
            .into_iter()
            .collect::<BTreeSet<_>>(),
    );
}

#[test]
fn ordered_operand_role_label_and_repeated_branch_boundaries_are_all_present() {
    let operand_errors = BATTLE_SCRIPT_TRYHEALHALFHEALTH_CASES
        .iter()
        .filter(|case| case.category == "operand-expression-before-role-lookup")
        .collect::<Vec<_>>();
    assert_eq!(operand_errors.len(), 4);
    assert_eq!(
        operand_errors
            .iter()
            .map(|case| case.expected_error.expect("operand vector error"))
            .collect::<BTreeSet<_>>(),
        BTreeSet::from([
            "Cmd_tryhealhalfhealth: unexpected battler operand <missing> -- the committed program's only two call sites use BS_ATTACKER/BS_TARGET",
            "Cmd_tryhealhalfhealth: unexpected battler operand BS_EFFECT_BATTLER -- the committed program's only two call sites use BS_ATTACKER/BS_TARGET",
            "Cmd_tryhealhalfhealth: unexpected battler operand BS_SCRIPTING -- the committed program's only two call sites use BS_ATTACKER/BS_TARGET",
            "Cmd_tryhealhalfhealth: unexpected battler operand NOT_A_BATTLER_SELECTOR -- the committed program's only two call sites use BS_ATTACKER/BS_TARGET",
        ]),
    );
    for category in [
        "missing-attacker-before-state-and-label-reads",
        "missing-target-before-state-and-label-reads",
    ] {
        let missing = BATTLE_SCRIPT_TRYHEALHALFHEALTH_CASES
            .iter()
            .filter(|case| case.category == category)
            .collect::<Vec<_>>();
        assert_eq!(missing.len(), 125, "{category}");
        let expected = if category.starts_with("missing-attacker") {
            "Cmd_tryhealhalfhealth requires a attacker role"
        } else {
            "Cmd_tryhealhalfhealth requires a target role"
        };
        assert!(missing
            .iter()
            .all(|case| case.expected_error == Some(expected)));
    }
    let unresolved_full = BATTLE_SCRIPT_TRYHEALHALFHEALTH_CASES
        .iter()
        .filter(|case| case.branch == "unresolved-jump-target")
        .collect::<Vec<_>>();
    assert_eq!(unresolved_full.len(), 2);
    assert!(unresolved_full.iter().all(|case| {
        case.expected_error
            == Some(
                "Cmd_tryhealhalfhealth: unresolved jump target BattleScript_RustTryhealUnresolved",
            )
    }));
    let skipped = BATTLE_SCRIPT_TRYHEALHALFHEALTH_CASES
        .iter()
        .filter(|case| case.category == "nonfull-skips-failure-label-resolution")
        .collect::<Vec<_>>();
    assert_eq!(skipped.len(), 4);
    assert!(skipped.iter().all(|case| {
        case.expected.is_some()
            && case.expected_error.is_none()
            && case.controls == [BattleScriptTryhealhalfhealthControl::Advance]
            && case.instruction.resolved_failure_target.is_none()
    }));
    assert_eq!(
        BATTLE_SCRIPT_TRYHEALHALFHEALTH_CASES
            .iter()
            .filter(|case| case.category == "repeated-advance-is-idempotent")
            .count(),
        2,
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYHEALHALFHEALTH_CASES
            .iter()
            .filter(|case| case.category == "repeated-failure-is-idempotent")
            .count(),
        2,
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYHEALHALFHEALTH_MAX_HP_EDGE_DOMAIN,
        [
            0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 99, 100, 101, 102, 255, 256, 257, 32_767, 32_768,
            65_534, 65_535,
        ],
    );
}

#[test]
fn generated_census_hash_and_sizes_are_pinned() {
    assert_eq!(
        BATTLE_SCRIPT_TRYHEALHALFHEALTH_DOMAIN_CENSUS,
        [
            ("battler-slots", 4),
            ("attacker-role-values", 4),
            ("target-role-values", 4),
            ("optional-selector-role-values", 5),
            ("restore-selector-alias-cross-product", 500),
            ("softboiled-selector-alias-cross-product", 500),
            ("source-u16-max-hp-values", 65_536),
            ("full-u16-handler-applications", 196_606),
            ("half-normalized-contiguous-intervals", 32_769),
            ("prior-battle-move-damage-i32-values", 4_294_967_296),
            ("canonical-concrete-call-sites", 2),
            ("registration-cases", 5),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYHEALHALFHEALTH_CATEGORY_CENSUS,
        [
            ("full-hp-resolves-own-failure-expression-late", 6),
            ("missing-attacker-before-state-and-label-reads", 125),
            ("missing-role-before-unresolved-label", 2),
            ("missing-target-before-state-and-label-reads", 125),
            ("nonfull-skips-failure-label-resolution", 4),
            ("operand-expression-before-role-lookup", 4),
            ("prior-signed-battle-move-damage-overwrite", 28),
            ("repeated-advance-is-idempotent", 2),
            ("repeated-failure-is-idempotent", 2),
            ("restore-all-attacker-and-selector-alias-combinations", 500),
            ("softboiled-all-target-and-selector-alias-combinations", 500),
            ("source-u16-full-lower-higher-boundary-probes", 512),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYHEALHALFHEALTH_BRANCH_CENSUS,
        [
            ("advance", 1_354),
            ("advance-then-advance", 2),
            ("fail-jump", 194),
            ("fail-jump-then-fail-jump", 2),
            ("missing-attacker-role", 126),
            ("missing-target-role", 126),
            ("unexpected-battler-operand", 4),
            ("unresolved-jump-target", 2),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYHEALHALFHEALTH_REGISTRATION_BRANCH_CENSUS,
        [("missing-opcode-name", 1), ("registered", 4)],
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYHEALHALFHEALTH_HALF_RAW_SHA256,
        "abcd6a03d79e5807726f678894121524f2efebfbb25a74e12bd5af4cb5824ff8",
    );
    assert_eq!(BATTLE_SCRIPT_TRYHEALHALFHEALTH_HALF_RAW_BYTES, 4_881_873);
    assert_eq!(
        BATTLE_SCRIPT_TRYHEALHALFHEALTH_VECTOR_CORPUS_SHA256,
        "7df2575257c50006c5afc225062d834fe6f0ad6399e71bb92dd0c69564ce2fc5",
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYHEALHALFHEALTH_VECTOR_CORPUS_BYTES,
        12_548_796
    );
}
