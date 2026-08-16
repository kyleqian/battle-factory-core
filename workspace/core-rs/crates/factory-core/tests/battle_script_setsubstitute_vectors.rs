//! Differential ratchet for `src/engine/battleScriptSetsubstituteOpcode.ts`.
//! Complete narrow projections, full-u16 quarter-boundary proof rows, source
//! identity, factory cardinality, and exact missing-attacker ordering are
//! generated only by executing the canonical TypeScript handler:
//!
//! `node --experimental-strip-types core-rs/tools/gen-battle-script-setsubstitute-vectors.mjs`

use std::collections::BTreeSet;

use factory_core::battle_script_setsubstitute::{
    apply_battle_script_setsubstitute, battle_script_setsubstitute_quarter_max_hp,
    register_battle_script_setsubstitute_handler, BattleScriptSetsubstituteBattler,
    BattleScriptSetsubstituteBattlerState, BattleScriptSetsubstituteControl,
    BattleScriptSetsubstituteInstruction, BattleScriptSetsubstituteRegistration,
    BattleScriptSetsubstituteRoles, BattleScriptSetsubstituteRules,
    BattleScriptSetsubstituteSiblings, BATTLE_SCRIPT_B_MSG_SET_SUBSTITUTE,
    BATTLE_SCRIPT_B_MSG_SUBSTITUTE_FAILED, BATTLE_SCRIPT_HITMARKER_IGNORE_SUBSTITUTE,
    BATTLE_SCRIPT_SETSUBSTITUTE_BATTLERS, BATTLE_SCRIPT_SETSUBSTITUTE_BATTLER_COUNT,
    BATTLE_SCRIPT_SETSUBSTITUTE_DISPATCHER, BATTLE_SCRIPT_SETSUBSTITUTE_OPCODE,
    BATTLE_SCRIPT_SETSUBSTITUTE_OPCODE_NAME, BATTLE_SCRIPT_STATUS2_SUBSTITUTE,
    BATTLE_SCRIPT_STATUS2_WRAPPED_MASK,
};
use factory_core::battle_script_setsubstitute_vectors_gen::{
    BattleScriptSetsubstituteQuarterProof, BattleScriptSetsubstituteVectorBattlerState,
    BattleScriptSetsubstituteVectorCase, BattleScriptSetsubstituteVectorSiblings,
    BattleScriptSetsubstituteVectorState, BATTLE_SCRIPT_SETSUBSTITUTE_BRANCH_CENSUS,
    BATTLE_SCRIPT_SETSUBSTITUTE_CANONICAL_IDENTITY, BATTLE_SCRIPT_SETSUBSTITUTE_CASES,
    BATTLE_SCRIPT_SETSUBSTITUTE_CATEGORY_CENSUS, BATTLE_SCRIPT_SETSUBSTITUTE_DOMAIN_CENSUS,
    BATTLE_SCRIPT_SETSUBSTITUTE_HIT_MARKER_EDGE_DOMAIN,
    BATTLE_SCRIPT_SETSUBSTITUTE_MAX_HP_EDGE_DOMAIN,
    BATTLE_SCRIPT_SETSUBSTITUTE_PRIOR_DAMAGE_EDGE_DOMAIN,
    BATTLE_SCRIPT_SETSUBSTITUTE_QUARTER_PROOFS, BATTLE_SCRIPT_SETSUBSTITUTE_QUARTER_RAW_BYTES,
    BATTLE_SCRIPT_SETSUBSTITUTE_QUARTER_RAW_SHA256,
    BATTLE_SCRIPT_SETSUBSTITUTE_REGISTRATION_BRANCH_CENSUS,
    BATTLE_SCRIPT_SETSUBSTITUTE_REGISTRATION_CASES,
    BATTLE_SCRIPT_SETSUBSTITUTE_STATUS2_EDGE_DOMAIN,
    BATTLE_SCRIPT_SETSUBSTITUTE_SUBSTITUTE_HP_EDGE_DOMAIN,
    BATTLE_SCRIPT_SETSUBSTITUTE_U8_EDGE_DOMAIN, BATTLE_SCRIPT_SETSUBSTITUTE_VECTOR_CORPUS_BYTES,
    BATTLE_SCRIPT_SETSUBSTITUTE_VECTOR_CORPUS_SHA256,
};

fn battler(
    value: BattleScriptSetsubstituteVectorBattlerState,
) -> BattleScriptSetsubstituteBattlerState {
    BattleScriptSetsubstituteBattlerState {
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
    value: BattleScriptSetsubstituteBattlerState,
) -> BattleScriptSetsubstituteVectorBattlerState {
    BattleScriptSetsubstituteVectorBattlerState {
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

fn siblings(value: BattleScriptSetsubstituteVectorSiblings) -> BattleScriptSetsubstituteSiblings {
    BattleScriptSetsubstituteSiblings {
        scripting_battler: value.scripting_battler,
        battler_with_ability: value.battler_with_ability,
        atk_canceler_tracker: value.atk_canceler_tracker,
        battle_outcome: value.battle_outcome,
        current_move: value.current_move,
        current_move_effect: value.current_move_effect,
        current_move_power: value.current_move_power,
        current_move_position: value.current_move_position,
        move_result_flags: value.move_result_flags,
        dmg_multiplier: value.dmg_multiplier,
        crit_multiplier: value.crit_multiplier,
        move_effect_byte: value.move_effect_byte,
        miss_type: value.miss_type,
        multi_hit_counter: value.multi_hit_counter,
        multi_hit_string_counter: value.multi_hit_string_counter,
        dynamic_base_power: value.dynamic_base_power,
        hp_dealt: value.hp_dealt,
        locked_moves: value.locked_moves,
        bide_dmg: value.bide_dmg,
        side_statuses: value.side_statuses,
        weather: value.weather,
        weather_timer: value.weather_timer,
    }
}

fn vector_siblings(
    value: BattleScriptSetsubstituteSiblings,
) -> BattleScriptSetsubstituteVectorSiblings {
    BattleScriptSetsubstituteVectorSiblings {
        scripting_battler: value.scripting_battler,
        battler_with_ability: value.battler_with_ability,
        atk_canceler_tracker: value.atk_canceler_tracker,
        battle_outcome: value.battle_outcome,
        current_move: value.current_move,
        current_move_effect: value.current_move_effect,
        current_move_power: value.current_move_power,
        current_move_position: value.current_move_position,
        move_result_flags: value.move_result_flags,
        dmg_multiplier: value.dmg_multiplier,
        crit_multiplier: value.crit_multiplier,
        move_effect_byte: value.move_effect_byte,
        miss_type: value.miss_type,
        multi_hit_counter: value.multi_hit_counter,
        multi_hit_string_counter: value.multi_hit_string_counter,
        dynamic_base_power: value.dynamic_base_power,
        hp_dealt: value.hp_dealt,
        locked_moves: value.locked_moves,
        bide_dmg: value.bide_dmg,
        side_statuses: value.side_statuses,
        weather: value.weather,
        weather_timer: value.weather_timer,
    }
}

fn rules(value: BattleScriptSetsubstituteVectorState) -> BattleScriptSetsubstituteRules {
    BattleScriptSetsubstituteRules {
        battlers: value.battlers.map(battler),
        selector_roles: BattleScriptSetsubstituteRoles {
            attacker: value.attacker,
            target: value.target,
            effect_battler: value.effect_battler,
            fainted: value.fainted,
        },
        battle_move_damage: value.battle_move_damage,
        multistring_chooser: value.multistring_chooser,
        hit_marker: value.hit_marker,
        siblings: siblings(value.siblings),
    }
}

fn vector_state(value: BattleScriptSetsubstituteRules) -> BattleScriptSetsubstituteVectorState {
    BattleScriptSetsubstituteVectorState {
        battlers: value.battlers.map(vector_battler),
        attacker: value.selector_roles.attacker,
        target: value.selector_roles.target,
        effect_battler: value.selector_roles.effect_battler,
        fainted: value.selector_roles.fainted,
        battle_move_damage: value.battle_move_damage,
        multistring_chooser: value.multistring_chooser,
        hit_marker: value.hit_marker,
        siblings: vector_siblings(value.siblings),
    }
}

#[test]
fn complete_projected_outputs_controls_ordered_errors_and_immutable_input_match_canonical_typescript(
) {
    assert_eq!(BATTLE_SCRIPT_SETSUBSTITUTE_CASES.len(), 1_397);
    for (case_index, case) in BATTLE_SCRIPT_SETSUBSTITUTE_CASES.iter().enumerate() {
        execute_case(case_index, case);
    }
}

fn execute_case(case_index: usize, case: &BattleScriptSetsubstituteVectorCase) {
    let input = rules(case.initial);
    let before = input;
    let mut current = input;
    let mut actual_controls = Vec::new();
    let mut actual_error = None;

    for application in 0..case.applications {
        let prior = current;
        match apply_battle_script_setsubstitute(&current) {
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
    assert_eq!(
        case.scheduler_unchanged,
        vec![true; actual_controls.len()].as_slice(),
        "case {case_index} {}: canonical handler changed scheduler",
        case.label,
    );
    assert_eq!(
        case.rng_unchanged,
        vec![true; actual_controls.len()].as_slice(),
        "case {case_index} {}: canonical handler consumed RNG",
        case.label,
    );
    assert_eq!(
        case.event_counts,
        vec![0; actual_controls.len()].as_slice(),
        "case {case_index} {}: canonical handler emitted events",
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
            assert!(actual_controls.is_empty(), "case {case_index} {}: error advanced", case.label);
            assert_eq!(
                error, expected_error,
                "case {case_index} {}: exact source-ordered error",
                case.label,
            );
        }
        (error, expected, expected_error) => panic!(
            "case {case_index} {}: generated outcome shape disagrees with native result: error={error:?}, expected={expected:?}, expected_error={expected_error:?}",
            case.label,
        ),
    }
}

fn assert_transition_shape(
    case_index: usize,
    case: &BattleScriptSetsubstituteVectorCase,
    application: u8,
    prior: BattleScriptSetsubstituteRules,
    outcome: factory_core::battle_script_setsubstitute::BattleScriptSetsubstituteOutcome,
) {
    assert_eq!(
        outcome.control,
        BattleScriptSetsubstituteControl::Advance,
        "case {case_index} {} application {application}: Substitute must Advance",
        case.label,
    );
    let attacker = prior.selector_roles.attacker.unwrap_or_else(|| {
        panic!(
            "case {case_index} {} application {application}: Advance had no attacker",
            case.label,
        )
    });
    let attacker_before = prior.battlers[attacker.index()];
    let quarter = battle_script_setsubstitute_quarter_max_hp(attacker_before.max_hp);
    assert_eq!(
        outcome.rules.selector_roles, prior.selector_roles,
        "case {case_index} {} application {application}: changed selector roles",
        case.label,
    );
    assert_eq!(
        outcome.rules.siblings, prior.siblings,
        "case {case_index} {} application {application}: changed unrelated sibling state",
        case.label,
    );

    if attacker_before.hp <= quarter {
        assert_eq!(
            outcome.rules.battlers, prior.battlers,
            "case {case_index} {} application {application}: failure changed a battler",
            case.label,
        );
        assert_eq!(
            outcome.rules.hit_marker, prior.hit_marker,
            "case {case_index} {} application {application}: failure changed hit marker",
            case.label,
        );
        assert_eq!(
            outcome.rules.battle_move_damage, 0,
            "case {case_index} {} application {application}: failure did not write zero damage",
            case.label,
        );
        assert_eq!(
            outcome.rules.multistring_chooser, BATTLE_SCRIPT_B_MSG_SUBSTITUTE_FAILED,
            "case {case_index} {} application {application}: failure chose wrong message",
            case.label,
        );
        return;
    }

    for battler_id in BATTLE_SCRIPT_SETSUBSTITUTE_BATTLERS {
        if battler_id != attacker {
            assert_eq!(
                outcome.rules.battlers[battler_id.index()],
                prior.battlers[battler_id.index()],
                "case {case_index} {} application {application}: success changed sibling battler {}",
                case.label,
                battler_id.as_u8(),
            );
        }
    }
    let mut expected_attacker = attacker_before;
    expected_attacker.status2 = (attacker_before.status2 | BATTLE_SCRIPT_STATUS2_SUBSTITUTE)
        & !BATTLE_SCRIPT_STATUS2_WRAPPED_MASK;
    expected_attacker.substitute_hp = quarter;
    assert_eq!(
        outcome.rules.battlers[attacker.index()],
        expected_attacker,
        "case {case_index} {} application {application}: success changed fields beyond attacker Substitute state",
        case.label,
    );
    assert_eq!(
        outcome.rules.battle_move_damage,
        i32::from(quarter),
        "case {case_index} {} application {application}: success wrote wrong quarter damage",
        case.label,
    );
    assert_eq!(
        outcome.rules.multistring_chooser, BATTLE_SCRIPT_B_MSG_SET_SUBSTITUTE,
        "case {case_index} {} application {application}: success chose wrong message",
        case.label,
    );
    assert_eq!(
        outcome.rules.hit_marker,
        prior.hit_marker | BATTLE_SCRIPT_HITMARKER_IGNORE_SUBSTITUTE,
        "case {case_index} {} application {application}: success did not OR ignore-substitute marker",
        case.label,
    );
}

const QUARTER_BATTLER: BattleScriptSetsubstituteBattlerState =
    BattleScriptSetsubstituteBattlerState {
        side: 0,
        ability: 1,
        hp: 1,
        max_hp: 0,
        moves: [164, 2, 3, 4],
        pp: [10, 20, 30, 40],
        status1: 0x0102_0304,
        status2: 0x8000_e001,
        status3: 0x0506_0708,
        substitute_hp: u16::MAX,
        rollout_timer: 9,
        fury_cutter_counter: 10,
        truant_counter: 11,
        recharge_timer: 12,
        flinch_immobility: 13,
        disabled_move: 14,
        used_disabled_move: 15,
        taunt_timer: 16,
        used_taunted_move: 17,
        used_imprisoned_move: 18,
        item: 19,
        stat_stages: [20, 21, 22, 23, 24, 25, 26, 27],
        party_index: 28,
        speed: 29,
    };

const QUARTER_SIBLINGS: BattleScriptSetsubstituteSiblings = BattleScriptSetsubstituteSiblings {
    scripting_battler: BattleScriptSetsubstituteBattler::Battler0,
    battler_with_ability: BattleScriptSetsubstituteBattler::Battler1,
    atk_canceler_tracker: 2,
    battle_outcome: 3,
    current_move: 4,
    current_move_effect: 5,
    current_move_power: 6,
    current_move_position: 7,
    move_result_flags: 0x8000_0001,
    dmg_multiplier: 8,
    crit_multiplier: 9,
    move_effect_byte: 10,
    miss_type: 11,
    multi_hit_counter: 12,
    multi_hit_string_counter: 13,
    dynamic_base_power: 14,
    hp_dealt: -15,
    locked_moves: [16, 17, 18, 19],
    bide_dmg: [-20, 21, -22, 23],
    side_statuses: [0x0100_0001, 0x8000_0002],
    weather: 0x4000_0003,
    weather_timer: 24,
};

fn quarter_rules(max_hp: u16, hp: u16) -> BattleScriptSetsubstituteRules {
    let mut attacker = QUARTER_BATTLER;
    attacker.max_hp = max_hp;
    attacker.hp = hp;
    BattleScriptSetsubstituteRules {
        battlers: [attacker, QUARTER_BATTLER, QUARTER_BATTLER, QUARTER_BATTLER],
        selector_roles: BattleScriptSetsubstituteRoles {
            attacker: Some(BattleScriptSetsubstituteBattler::Battler0),
            target: Some(BattleScriptSetsubstituteBattler::Battler1),
            effect_battler: Some(BattleScriptSetsubstituteBattler::Battler2),
            fainted: Some(BattleScriptSetsubstituteBattler::Battler3),
        },
        battle_move_damage: i32::MIN,
        multistring_chooser: u8::MAX,
        hit_marker: u32::MAX,
        siblings: QUARTER_SIBLINGS,
    }
}

#[test]
fn complete_source_u16_max_hp_domain_runs_both_canonical_threshold_sides() {
    assert_eq!(BATTLE_SCRIPT_SETSUBSTITUTE_QUARTER_PROOFS.len(), 16_383);
    let mut next_max_hp = 0_u32;
    let mut expanded_rows = 0_u32;
    for proof in &BATTLE_SCRIPT_SETSUBSTITUTE_QUARTER_PROOFS {
        assert_quarter_interval(proof, next_max_hp as u16);
        for max_hp in proof.max_hp_start..=proof.max_hp_end {
            let failure_input = quarter_rules(max_hp, proof.failure_hp);
            let failure = apply_battle_script_setsubstitute(&failure_input)
                .expect("full-u16 failure boundary has attacker");
            assert_eq!(failure.control, BattleScriptSetsubstituteControl::Advance);
            assert_eq!(failure.rules.battlers, failure_input.battlers);
            assert_eq!(failure.rules.siblings, failure_input.siblings);
            assert_eq!(failure.rules.hit_marker, proof.failure_hit_marker);
            assert_eq!(
                failure.rules.battle_move_damage,
                proof.failure_battle_move_damage
            );
            assert_eq!(failure.rules.multistring_chooser, proof.failure_chooser);
            assert_eq!(failure.rules.battlers[0].status2, proof.failure_status2);
            assert_eq!(
                failure.rules.battlers[0].substitute_hp,
                proof.failure_substitute_hp
            );

            let success_input = quarter_rules(max_hp, proof.success_hp);
            let success = apply_battle_script_setsubstitute(&success_input)
                .expect("full-u16 success boundary has attacker");
            assert_eq!(success.control, BattleScriptSetsubstituteControl::Advance);
            assert_eq!(success.rules.battlers[1..], success_input.battlers[1..]);
            assert_eq!(success.rules.siblings, success_input.siblings);
            assert_eq!(success.rules.hit_marker, proof.success_hit_marker);
            assert_eq!(
                success.rules.battle_move_damage,
                proof.success_battle_move_damage
            );
            assert_eq!(success.rules.multistring_chooser, proof.success_chooser);
            assert_eq!(success.rules.battlers[0].status2, proof.success_status2);
            assert_eq!(
                success.rules.battlers[0].substitute_hp,
                proof.success_substitute_hp
            );
            expanded_rows += 1;
        }
        next_max_hp = u32::from(proof.max_hp_end) + 1;
    }
    assert_eq!(next_max_hp, u32::from(u16::MAX) + 1);
    assert_eq!(expanded_rows, u32::from(u16::MAX) + 1);
}

fn assert_quarter_interval(proof: &BattleScriptSetsubstituteQuarterProof, expected_start: u16) {
    assert_eq!(
        proof.max_hp_start, expected_start,
        "quarter intervals must be contiguous"
    );
    assert!(
        proof.max_hp_start <= proof.max_hp_end,
        "quarter interval must be nonempty"
    );
    assert_eq!(proof.failure_hp, proof.threshold);
    assert_eq!(proof.success_hp, proof.threshold + 1);
    for max_hp in proof.max_hp_start..=proof.max_hp_end {
        assert_eq!(
            battle_script_setsubstitute_quarter_max_hp(max_hp),
            proof.threshold,
            "interval {}..={} has a wrong quarter at {max_hp}",
            proof.max_hp_start,
            proof.max_hp_end,
        );
    }
}

#[test]
fn canonical_factory_cardinality_and_deliberate_non_shape_checks_match_typescript() {
    assert_eq!(BATTLE_SCRIPT_SETSUBSTITUTE_REGISTRATION_CASES.len(), 6);
    for case in BATTLE_SCRIPT_SETSUBSTITUTE_REGISTRATION_CASES {
        let instructions = case
            .instructions
            .iter()
            .map(|instruction| BattleScriptSetsubstituteInstruction {
                opcode_name: instruction.opcode_name,
                program_counter: instruction.program_counter,
                opcode_id: instruction.opcode_id,
                dispatcher: instruction.dispatcher,
                operand_count: instruction.operand_count,
            })
            .collect::<Vec<_>>();
        match (
            register_battle_script_setsubstitute_handler(&instructions),
            case.expected_bindings,
            case.expected_error,
        ) {
            (Ok(BattleScriptSetsubstituteRegistration { opcode_id }), expected, None) => {
                assert_eq!(&[opcode_id], expected, "registration {}: dynamic handler key", case.label);
            }
            (Err(error), expected, Some(expected_error)) => {
                assert!(expected.is_empty(), "registration {}: failed factory produced key", case.label);
                assert_eq!(error.to_string(), expected_error, "registration {}: exact factory error", case.label);
            }
            (actual, expected, expected_error) => panic!(
                "registration {}: generated shape disagrees with native result: actual={actual:?}, expected={expected:?}, expected_error={expected_error:?}",
                case.label,
            ),
        }
    }
    let permissive = BATTLE_SCRIPT_SETSUBSTITUTE_REGISTRATION_CASES
        .iter()
        .find(|case| case.label == "id_dispatcher_and_operands_are_not_factory_predicates")
        .expect("permissive factory vector");
    assert_eq!(permissive.expected_bindings, &[0]);
    assert_eq!(permissive.instructions[0].dispatcher, "Cmd_not_checked");
    assert_eq!(permissive.instructions[0].operand_count, 7);
}

#[test]
fn source_identity_masks_chooser_table_and_one_byte_macro_are_separately_ratcheted() {
    assert_eq!(
        BATTLE_SCRIPT_SETSUBSTITUTE_OPCODE_NAME,
        "B_SCR_OP_SETSUBSTITUTE"
    );
    assert_eq!(BATTLE_SCRIPT_SETSUBSTITUTE_OPCODE, 0x9c);
    assert_eq!(BATTLE_SCRIPT_SETSUBSTITUTE_DISPATCHER, "Cmd_setsubstitute");
    assert_eq!(BATTLE_SCRIPT_STATUS2_SUBSTITUTE, 0x0100_0000);
    assert_eq!(BATTLE_SCRIPT_STATUS2_WRAPPED_MASK, 0x0000_e000);
    assert_eq!(BATTLE_SCRIPT_HITMARKER_IGNORE_SUBSTITUTE, 0x0000_0100);
    assert_eq!(BATTLE_SCRIPT_B_MSG_SET_SUBSTITUTE, 0);
    assert_eq!(BATTLE_SCRIPT_B_MSG_SUBSTITUTE_FAILED, 1);
    assert_eq!(BATTLE_SCRIPT_SETSUBSTITUTE_BATTLER_COUNT, 4);
    assert_eq!(
        BATTLE_SCRIPT_SETSUBSTITUTE_BATTLERS.map(BattleScriptSetsubstituteBattler::as_u8),
        [0, 1, 2, 3],
    );
    assert_eq!(
        BATTLE_SCRIPT_SETSUBSTITUTE_CANONICAL_IDENTITY.opcode_name,
        BATTLE_SCRIPT_SETSUBSTITUTE_OPCODE_NAME,
    );
    assert_eq!(
        BATTLE_SCRIPT_SETSUBSTITUTE_CANONICAL_IDENTITY.opcode_id,
        BATTLE_SCRIPT_SETSUBSTITUTE_OPCODE,
    );
    assert_eq!(
        BATTLE_SCRIPT_SETSUBSTITUTE_CANONICAL_IDENTITY.dispatcher,
        BATTLE_SCRIPT_SETSUBSTITUTE_DISPATCHER,
    );
    assert_eq!(
        BATTLE_SCRIPT_SETSUBSTITUTE_CANONICAL_IDENTITY.operand_count,
        0
    );
    assert_eq!(
        BATTLE_SCRIPT_SETSUBSTITUTE_CANONICAL_IDENTITY.entry_label,
        "BattleScript_EffectSubstitute"
    );
    assert_eq!(
        BATTLE_SCRIPT_SETSUBSTITUTE_CANONICAL_IDENTITY.entry_program_counter,
        657
    );
    assert_eq!(
        BATTLE_SCRIPT_SETSUBSTITUTE_CANONICAL_IDENTITY.instruction_program_counter,
        662
    );
    assert_eq!(
        BATTLE_SCRIPT_SETSUBSTITUTE_CANONICAL_IDENTITY.statement_line,
        1_091
    );
    assert_eq!(
        BATTLE_SCRIPT_SETSUBSTITUTE_CANONICAL_IDENTITY.invocation_mnemonic,
        "setsubstitute"
    );
    assert_eq!(
        BATTLE_SCRIPT_SETSUBSTITUTE_CANONICAL_IDENTITY.macro_line,
        833
    );
    assert_eq!(
        BATTLE_SCRIPT_SETSUBSTITUTE_CANONICAL_IDENTITY.source_macro,
        "setsubstitute"
    );
    assert_eq!(
        BATTLE_SCRIPT_SETSUBSTITUTE_CANONICAL_IDENTITY.encoded_width_bytes,
        1
    );
}

#[test]
fn matrices_cover_all_roles_aliases_u32_edges_and_repeated_paths() {
    let aliases = BATTLE_SCRIPT_SETSUBSTITUTE_CASES
        .iter()
        .filter(|case| case.category == "all-attacker-and-selector-alias-combinations")
        .map(|case| {
            (
                case.initial.attacker.expect("alias case attacker").as_u8(),
                case.initial
                    .target
                    .map(BattleScriptSetsubstituteBattler::as_u8),
                case.initial
                    .effect_battler
                    .map(BattleScriptSetsubstituteBattler::as_u8),
                case.initial
                    .fainted
                    .map(BattleScriptSetsubstituteBattler::as_u8),
            )
        })
        .collect::<BTreeSet<_>>();
    assert_eq!(aliases.len(), 500);
    for attacker in 0..=3 {
        for target in [None, Some(0), Some(1), Some(2), Some(3)] {
            for effect_battler in [None, Some(0), Some(1), Some(2), Some(3)] {
                for fainted in [None, Some(0), Some(1), Some(2), Some(3)] {
                    assert!(aliases.contains(&(attacker, target, effect_battler, fainted)));
                }
            }
        }
    }
    let missing = BATTLE_SCRIPT_SETSUBSTITUTE_CASES
        .iter()
        .filter(|case| case.category == "missing-attacker-before-all-state-reads")
        .collect::<Vec<_>>();
    assert_eq!(missing.len(), 125);
    assert!(missing.iter().all(|case| {
        case.initial.attacker.is_none()
            && case.expected.is_none()
            && case.expected_error == Some("Cmd_setsubstitute requires an attacker role")
    }));

    let status_edges = BATTLE_SCRIPT_SETSUBSTITUTE_CASES
        .iter()
        .filter(|case| case.category == "status2-full-u32-or-and-wrapped-clear")
        .map(|case| {
            let attacker = case.initial.attacker.expect("status edge attacker");
            (
                attacker.as_u8(),
                case.initial.battlers[attacker.index()].status2,
            )
        })
        .collect::<BTreeSet<_>>();
    assert_eq!(status_edges.len(), 32);
    for attacker in 0..=3 {
        for status2 in BATTLE_SCRIPT_SETSUBSTITUTE_STATUS2_EDGE_DOMAIN {
            assert!(status_edges.contains(&(attacker, status2)));
        }
    }

    let hit_marker_edges = BATTLE_SCRIPT_SETSUBSTITUTE_CASES
        .iter()
        .filter(|case| case.category == "hit-marker-full-u32-or")
        .map(|case| {
            let attacker = case.initial.attacker.expect("hit marker edge attacker");
            (attacker.as_u8(), case.initial.hit_marker)
        })
        .collect::<BTreeSet<_>>();
    assert_eq!(hit_marker_edges.len(), 32);
    for attacker in 0..=3 {
        for hit_marker in BATTLE_SCRIPT_SETSUBSTITUTE_HIT_MARKER_EDGE_DOMAIN {
            assert!(hit_marker_edges.contains(&(attacker, hit_marker)));
        }
    }

    assert_eq!(
        BATTLE_SCRIPT_SETSUBSTITUTE_CASES
            .iter()
            .filter(|case| case.category == "repeated-success-is-idempotent-and-advances")
            .count(),
        4,
    );
    assert_eq!(
        BATTLE_SCRIPT_SETSUBSTITUTE_CASES
            .iter()
            .filter(|case| case.category == "repeated-failure-is-idempotent-and-advances")
            .count(),
        4,
    );
}

#[test]
fn corpus_censuses_hashes_and_sizes_are_ratchet_pinned() {
    assert_eq!(
        BATTLE_SCRIPT_SETSUBSTITUTE_DOMAIN_CENSUS,
        [
            ("battler-slots", 4),
            ("attacker-role-values", 4),
            ("optional-selector-role-values", 5),
            ("attacker-selector-alias-cross-product", 500),
            ("source-u16-max-hp-values", 65_536),
            ("quarter-boundary-handler-applications", 131_072),
            ("quarter-normalized-contiguous-intervals", 16_383),
            ("status2-u32-values", 4_294_967_296),
            ("hit-marker-u32-values", 4_294_967_296),
            ("prior-battle-move-damage-i32-values", 4_294_967_296),
            ("prior-multistring-chooser-u8-values", 256),
            ("prior-substitute-hp-u16-values", 65_536),
            ("registration-cases", 6),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_SETSUBSTITUTE_CATEGORY_CENSUS,
        [
            ("all-attacker-and-selector-alias-combinations", 500),
            ("failure-preserves-battlers-hitmarker-and-siblings", 4),
            ("hit-marker-full-u32-or", 32),
            ("missing-attacker-before-all-state-reads", 125),
            ("prior-damage-chooser-substitute-overwrite-edges", 600),
            ("quarter-boundary-representative-u16-edges", 96),
            ("repeated-failure-is-idempotent-and-advances", 4),
            ("repeated-success-is-idempotent-and-advances", 4),
            ("status2-full-u32-or-and-wrapped-clear", 32),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_SETSUBSTITUTE_BRANCH_CENSUS,
        [
            ("failure-advance", 302),
            ("missing-attacker-role", 125),
            ("repeated-failure-advance", 4),
            ("repeated-success-advance", 4),
            ("success-advance", 962),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_SETSUBSTITUTE_REGISTRATION_BRANCH_CENSUS,
        [("name-cardinality", 2), ("registered", 4)],
    );
    assert_eq!(
        BATTLE_SCRIPT_SETSUBSTITUTE_QUARTER_RAW_SHA256,
        "abcd70b385df94da84e99bb005d4a6b03819847adabd3d7bd205a4c263dd2ae8",
    );
    assert_eq!(BATTLE_SCRIPT_SETSUBSTITUTE_QUARTER_RAW_BYTES, 22_048_947);
    assert_eq!(
        BATTLE_SCRIPT_SETSUBSTITUTE_VECTOR_CORPUS_SHA256,
        "8e1e63f440ff847cc2e888805041e378383b726a74ae0f054d1a8df6108b0fd8",
    );
    assert_eq!(BATTLE_SCRIPT_SETSUBSTITUTE_VECTOR_CORPUS_BYTES, 13_503_050);
    assert_eq!(
        BATTLE_SCRIPT_SETSUBSTITUTE_MAX_HP_EDGE_DOMAIN,
        [0, 1, 3, 4, 7, 8, 9, 255, 256, 1_020, 1_021, u16::MAX]
    );
    assert_eq!(
        BATTLE_SCRIPT_SETSUBSTITUTE_PRIOR_DAMAGE_EDGE_DOMAIN,
        [i32::MIN, -1, 0, 1, i32::MAX]
    );
    assert_eq!(
        BATTLE_SCRIPT_SETSUBSTITUTE_U8_EDGE_DOMAIN,
        [0, 1, 0x7f, 0xfe, u8::MAX]
    );
    assert_eq!(
        BATTLE_SCRIPT_SETSUBSTITUTE_SUBSTITUTE_HP_EDGE_DOMAIN,
        [0, 1, 0xff, 0x100, 0x3fff, u16::MAX]
    );
}
