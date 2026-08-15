//! Differential ratchet for `src/engine/battleScriptFuryCutterOpcode.ts`.
//! Expected complete narrow projections, controls, registration errors, and
//! handler-order errors are generated only by executing canonical TypeScript:
//!
//! ```text
//! node --experimental-strip-types \
//!   core-rs/tools/gen-battle-script-furycutter-vectors.mjs
//! ```
//!
//! Source evidence is `Cmd_furycuttercalc`
//! (`reference/pokeemerald/src/battle_script_commands.c:8580-8601`), dispatch
//! table opcode `0xB5` (`:512`), the operandless macro
//! (`asm/macros/battle_script.inc:947-949`), `BattleScript_FuryCutterHit`
//! (`data/battle_scripts_1.s:1636-1641`), `MOVE_RESULT_NO_EFFECT`
//! (`include/constants/battle.h:221-228`), and Fury Cutter's move row
//! (`src/data/battle_moves.h:2733-2742`).

use std::collections::BTreeSet;

use factory_core::battle_script_furycutter::{
    apply_battle_script_furycutter, fury_cutter_counter_and_dynamic_base_power,
    validate_battle_script_furycutter_registration, BattleScriptFurycutterBattler,
    BattleScriptFurycutterBattlerState, BattleScriptFurycutterContextState,
    BattleScriptFurycutterControl, BattleScriptFurycutterInstruction, BattleScriptFurycutterLabels,
    BattleScriptFurycutterRoles, BattleScriptFurycutterRules, BATTLE_SCRIPT_FURYCUTTER_BATTLERS,
    BATTLE_SCRIPT_FURYCUTTER_BATTLER_COUNT, BATTLE_SCRIPT_FURYCUTTER_COUNTER_FIXED_POINT,
    BATTLE_SCRIPT_FURYCUTTER_OPCODE, BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT,
};
use factory_core::battle_script_furycutter_vectors_gen::{
    BattleScriptFurycutterRegistrationCase, BattleScriptFurycutterVectorBattlerState,
    BattleScriptFurycutterVectorCase, BattleScriptFurycutterVectorContextState,
    BattleScriptFurycutterVectorInstruction, BattleScriptFurycutterVectorState,
    BATTLE_SCRIPT_FURYCUTTER_BATTLER_DOMAIN, BATTLE_SCRIPT_FURYCUTTER_BRANCH_CENSUS,
    BATTLE_SCRIPT_FURYCUTTER_CASES, BATTLE_SCRIPT_FURYCUTTER_CATEGORY_CENSUS,
    BATTLE_SCRIPT_FURYCUTTER_COUNTER_FIXED_POINT as GENERATED_FIXED_POINT,
    BATTLE_SCRIPT_FURYCUTTER_CURRENT_MOVE_POWER_EDGE_DOMAIN,
    BATTLE_SCRIPT_FURYCUTTER_DOMAIN_CENSUS,
    BATTLE_SCRIPT_FURYCUTTER_MOVE_RESULT_FLAGS_U32_EDGE_DOMAIN,
    BATTLE_SCRIPT_FURYCUTTER_MOVE_RESULT_NO_EFFECT as GENERATED_NO_EFFECT,
    BATTLE_SCRIPT_FURYCUTTER_OPCODE as GENERATED_OPCODE,
    BATTLE_SCRIPT_FURYCUTTER_OPTIONAL_BATTLER_DOMAIN,
    BATTLE_SCRIPT_FURYCUTTER_PRIOR_DYNAMIC_BASE_POWER_EDGE_DOMAIN,
    BATTLE_SCRIPT_FURYCUTTER_REGISTRATION_BRANCH_CENSUS,
    BATTLE_SCRIPT_FURYCUTTER_REGISTRATION_CASES, BATTLE_SCRIPT_FURYCUTTER_RELEVANT_COUNTER_DOMAIN,
    BATTLE_SCRIPT_FURYCUTTER_VECTOR_CORPUS_BYTES, BATTLE_SCRIPT_FURYCUTTER_VECTOR_CORPUS_SHA256,
};

fn battler(value: BattleScriptFurycutterVectorBattlerState) -> BattleScriptFurycutterBattlerState {
    BattleScriptFurycutterBattlerState {
        side: value.side,
        ability: value.ability,
        hp: value.hp,
        max_hp: value.max_hp,
        moves: value.moves,
        pp: value.pp,
        status1: value.status1,
        status2: value.status2,
        status3: value.status3,
        item: value.item,
        stat_stages: value.stat_stages,
        party_index: value.party_index,
        fury_cutter_counter: value.fury_cutter_counter,
    }
}

fn vector_battler(
    value: BattleScriptFurycutterBattlerState,
) -> BattleScriptFurycutterVectorBattlerState {
    BattleScriptFurycutterVectorBattlerState {
        side: value.side,
        ability: value.ability,
        hp: value.hp,
        max_hp: value.max_hp,
        moves: value.moves,
        pp: value.pp,
        status1: value.status1,
        status2: value.status2,
        status3: value.status3,
        item: value.item,
        stat_stages: value.stat_stages,
        party_index: value.party_index,
        fury_cutter_counter: value.fury_cutter_counter,
    }
}

fn context_state(
    value: BattleScriptFurycutterVectorContextState,
) -> BattleScriptFurycutterContextState {
    BattleScriptFurycutterContextState {
        scripting_battler: value.scripting_battler,
        atk_canceler_tracker: value.atk_canceler_tracker,
        battle_outcome: value.battle_outcome,
        current_move: value.current_move,
        current_move_position: value.current_move_position,
        hit_marker: value.hit_marker,
        multi_hit_counter: value.multi_hit_counter,
    }
}

fn vector_context_state(
    value: BattleScriptFurycutterContextState,
) -> BattleScriptFurycutterVectorContextState {
    BattleScriptFurycutterVectorContextState {
        scripting_battler: value.scripting_battler,
        atk_canceler_tracker: value.atk_canceler_tracker,
        battle_outcome: value.battle_outcome,
        current_move: value.current_move,
        current_move_position: value.current_move_position,
        hit_marker: value.hit_marker,
        multi_hit_counter: value.multi_hit_counter,
    }
}

fn rules(value: BattleScriptFurycutterVectorState) -> BattleScriptFurycutterRules {
    BattleScriptFurycutterRules {
        battlers: value.battlers.map(battler),
        selector_roles: BattleScriptFurycutterRoles {
            attacker: value.attacker,
            target: value.target,
            effect_battler: value.effect_battler,
            fainted: value.fainted,
        },
        context_state: context_state(value.context_state),
        move_result_flags: value.move_result_flags,
        current_move_power: value.current_move_power,
        dynamic_base_power: value.dynamic_base_power,
    }
}

fn vector_state(value: BattleScriptFurycutterRules) -> BattleScriptFurycutterVectorState {
    BattleScriptFurycutterVectorState {
        battlers: value.battlers.map(vector_battler),
        attacker: value.selector_roles.attacker,
        target: value.selector_roles.target,
        effect_battler: value.selector_roles.effect_battler,
        fainted: value.selector_roles.fainted,
        context_state: vector_context_state(value.context_state),
        move_result_flags: value.move_result_flags,
        current_move_power: value.current_move_power,
        dynamic_base_power: value.dynamic_base_power,
    }
}

fn labels(case: &BattleScriptFurycutterVectorCase) -> BattleScriptFurycutterLabels {
    BattleScriptFurycutterLabels { move_missed_pause_resolved: case.move_missed_pause_resolved }
}

fn instruction(
    value: BattleScriptFurycutterVectorInstruction,
) -> BattleScriptFurycutterInstruction<'static> {
    BattleScriptFurycutterInstruction {
        opcode_name: value.opcode_name,
        program_counter: value.program_counter,
        opcode_id: value.opcode_id,
        dispatcher: value.dispatcher,
        operand_count: value.operand_count,
    }
}

fn optional_id(value: Option<BattleScriptFurycutterBattler>) -> Option<u8> {
    value.map(BattleScriptFurycutterBattler::as_u8)
}

#[test]
fn complete_projected_outputs_controls_and_exact_errors_match_canonical_typescript() {
    assert_eq!(BATTLE_SCRIPT_FURYCUTTER_CASES.len(), 2_278);
    for (case_index, case) in BATTLE_SCRIPT_FURYCUTTER_CASES.iter().enumerate() {
        execute_case(case_index, case);
    }
}

fn execute_case(case_index: usize, case: &BattleScriptFurycutterVectorCase) {
    let input = rules(case.initial);
    let before = input;
    let mut current = input;
    let mut actual_controls = Vec::new();
    let mut actual_error = None;

    for application in 0..case.applications {
        let prior = current;
        match apply_battle_script_furycutter(labels(case), &current) {
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
                "case {case_index} {}: error must not produce a control result",
                case.label,
            );
            assert_eq!(
                error, expected_error,
                "case {case_index} {}: exact canonical error and ordering",
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
    case: &BattleScriptFurycutterVectorCase,
    application: u8,
    prior: BattleScriptFurycutterRules,
    outcome: factory_core::battle_script_furycutter::BattleScriptFurycutterOutcome,
) {
    let attacker = prior.selector_roles.attacker.unwrap_or_else(|| {
        panic!(
            "case {case_index} {} application {application}: successful result lacked attacker",
            case.label,
        )
    });
    let attacker_index = attacker.index();
    assert_eq!(
        outcome.rules.selector_roles, prior.selector_roles,
        "case {case_index} {} application {application}: changed selector aliases",
        case.label,
    );
    assert_eq!(
        outcome.rules.context_state, prior.context_state,
        "case {case_index} {} application {application}: changed independent context state",
        case.label,
    );
    assert_eq!(
        outcome.rules.move_result_flags, prior.move_result_flags,
        "case {case_index} {} application {application}: changed result flags",
        case.label,
    );
    assert_eq!(
        outcome.rules.current_move_power, prior.current_move_power,
        "case {case_index} {} application {application}: changed source move power",
        case.label,
    );

    if prior.move_result_flags & BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT != 0 {
        assert_eq!(
            outcome.control,
            BattleScriptFurycutterControl::MoveMissedPauseJump,
            "case {case_index} {} application {application}: no-effect result must jump",
            case.label,
        );
        let mut expected_attacker = prior.battlers[attacker_index];
        expected_attacker.fury_cutter_counter = 0;
        assert_eq!(
            outcome.rules.battlers[attacker_index], expected_attacker,
            "case {case_index} {} application {application}: miss must reset only attacker counter",
            case.label,
        );
        assert_eq!(
            outcome.rules.dynamic_base_power, prior.dynamic_base_power,
            "case {case_index} {} application {application}: miss changed dynamic power",
            case.label,
        );
    } else {
        assert_eq!(
            outcome.control,
            BattleScriptFurycutterControl::Advance,
            "case {case_index} {} application {application}: effective hit must advance",
            case.label,
        );
        let (counter, dynamic_base_power) = fury_cutter_counter_and_dynamic_base_power(
            prior.current_move_power,
            prior.battlers[attacker_index].fury_cutter_counter,
        );
        let mut expected_attacker = prior.battlers[attacker_index];
        expected_attacker.fury_cutter_counter = counter;
        assert_eq!(
            outcome.rules.battlers[attacker_index], expected_attacker,
            "case {case_index} {} application {application}: success changed attacker siblings",
            case.label,
        );
        assert_eq!(
            outcome.rules.dynamic_base_power, dynamic_base_power,
            "case {case_index} {} application {application}: success did not source-assign and wrap-double power",
            case.label,
        );
    }

    for battler in BATTLE_SCRIPT_FURYCUTTER_BATTLERS {
        if battler != attacker {
            assert_eq!(
                outcome.rules.battlers[battler.index()],
                prior.battlers[battler.index()],
                "case {case_index} {} application {application}: changed non-attacker battler {}",
                case.label,
                battler.as_u8(),
            );
        }
    }
}

#[test]
fn exhaustive_counter_selector_mask_power_and_prior_dynamic_domains_are_retained() {
    let counter_cases = BATTLE_SCRIPT_FURYCUTTER_CASES
        .iter()
        .filter(|case| case.category == "every-source-u8-counter-for-every-attacker")
        .collect::<Vec<_>>();
    assert_eq!(counter_cases.len(), 1_024);
    let counter_domain = counter_cases
        .iter()
        .map(|case| {
            let attacker = case.initial.attacker.expect("exhaustive counter attacker");
            (
                attacker.as_u8(),
                case.initial.battlers[attacker.index()].fury_cutter_counter,
            )
        })
        .collect::<BTreeSet<_>>();
    let expected_counter_domain = BATTLE_SCRIPT_FURYCUTTER_BATTLER_DOMAIN
        .into_iter()
        .flat_map(|attacker| (0_u8..=u8::MAX).map(move |counter| (attacker, counter)))
        .collect::<BTreeSet<_>>();
    assert_eq!(counter_domain, expected_counter_domain);
    for case in counter_cases {
        assert!(!case.move_missed_pause_resolved);
        assert_eq!(case.controls, [BattleScriptFurycutterControl::Advance]);
    }

    let selector_cases = BATTLE_SCRIPT_FURYCUTTER_CASES
        .iter()
        .filter(|case| case.category == "all-attacker-and-selector-alias-combinations")
        .collect::<Vec<_>>();
    assert_eq!(selector_cases.len(), 500);
    let selector_domain = selector_cases
        .iter()
        .map(|case| {
            (
                optional_id(case.initial.attacker),
                optional_id(case.initial.target),
                optional_id(case.initial.effect_battler),
                optional_id(case.initial.fainted),
            )
        })
        .collect::<BTreeSet<_>>();
    let expected_selector_domain = BATTLE_SCRIPT_FURYCUTTER_BATTLER_DOMAIN
        .into_iter()
        .flat_map(|attacker| {
            BATTLE_SCRIPT_FURYCUTTER_OPTIONAL_BATTLER_DOMAIN
                .into_iter()
                .flat_map(move |target| {
                    BATTLE_SCRIPT_FURYCUTTER_OPTIONAL_BATTLER_DOMAIN
                        .into_iter()
                        .flat_map(move |effect_battler| {
                            BATTLE_SCRIPT_FURYCUTTER_OPTIONAL_BATTLER_DOMAIN
                                .into_iter()
                                .map(move |fainted| {
                                    (Some(attacker), target, effect_battler, fainted)
                                })
                        })
                })
        })
        .collect::<BTreeSet<_>>();
    assert_eq!(selector_domain, expected_selector_domain);

    let power_cases = BATTLE_SCRIPT_FURYCUTTER_CASES
        .iter()
        .filter(|case| case.category == "current-move-power-u16-assignment-and-wrapping-doublings")
        .collect::<Vec<_>>();
    assert_eq!(power_cases.len(), 357);
    let power_domain = power_cases
        .iter()
        .map(|case| {
            let attacker = case.initial.attacker.expect("power matrix attacker");
            (
                case.initial.battlers[attacker.index()].fury_cutter_counter,
                case.initial.current_move_power,
            )
        })
        .collect::<BTreeSet<_>>();
    let expected_power_domain = BATTLE_SCRIPT_FURYCUTTER_RELEVANT_COUNTER_DOMAIN
        .into_iter()
        .flat_map(|counter| {
            BATTLE_SCRIPT_FURYCUTTER_CURRENT_MOVE_POWER_EDGE_DOMAIN
                .into_iter()
                .map(move |power| (counter, power))
        })
        .collect::<BTreeSet<_>>();
    assert_eq!(power_domain, expected_power_domain);
    for case in power_cases {
        let attacker = case.initial.attacker.expect("power matrix attacker");
        let expected = fury_cutter_counter_and_dynamic_base_power(
            case.initial.current_move_power,
            case.initial.battlers[attacker.index()].fury_cutter_counter,
        );
        let output = case.expected.expect("power matrix must succeed");
        assert_eq!(
            output.battlers[attacker.index()].fury_cutter_counter,
            expected.0,
            "case {} counter transition",
            case.label,
        );
        assert_eq!(
            output.dynamic_base_power, expected.1,
            "case {} power result",
            case.label
        );
    }

    let prior_cases = BATTLE_SCRIPT_FURYCUTTER_CASES
        .iter()
        .filter(|case| case.category == "prior-dynamic-base-power-overwrite-edges")
        .collect::<Vec<_>>();
    assert_eq!(prior_cases.len(), 84);
    assert_eq!(
        prior_cases
            .iter()
            .map(|case| case.initial.dynamic_base_power)
            .collect::<BTreeSet<_>>(),
        BATTLE_SCRIPT_FURYCUTTER_PRIOR_DYNAMIC_BASE_POWER_EDGE_DOMAIN
            .into_iter()
            .collect::<BTreeSet<_>>(),
    );
}

#[test]
fn u32_mask_miss_reset_missing_attacker_and_late_label_ordering_match_typescript() {
    let mask_cases = BATTLE_SCRIPT_FURYCUTTER_CASES
        .iter()
        .filter(|case| case.category == "move-result-no-effect-full-u32-mask-boundaries")
        .collect::<Vec<_>>();
    assert_eq!(mask_cases.len(), 104);
    assert_eq!(
        mask_cases
            .iter()
            .map(|case| case.initial.move_result_flags)
            .collect::<BTreeSet<_>>(),
        BATTLE_SCRIPT_FURYCUTTER_MOVE_RESULT_FLAGS_U32_EDGE_DOMAIN
            .into_iter()
            .collect::<BTreeSet<_>>(),
    );
    for case in mask_cases {
        let no_effect = case.initial.move_result_flags & BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT != 0;
        assert_eq!(
            case.move_missed_pause_resolved, no_effect,
            "case {}",
            case.label
        );
        assert_eq!(
            case.controls,
            if no_effect {
                &[BattleScriptFurycutterControl::MoveMissedPauseJump][..]
            } else {
                &[BattleScriptFurycutterControl::Advance][..]
            },
            "case {} mask control",
            case.label,
        );
    }

    let misses = BATTLE_SCRIPT_FURYCUTTER_CASES
        .iter()
        .filter(|case| case.category == "miss-resets-only-attacker-and-jumps")
        .collect::<Vec<_>>();
    assert_eq!(misses.len(), 68);
    assert!(misses.iter().all(|case| {
        case.move_missed_pause_resolved
            && case.controls == [BattleScriptFurycutterControl::MoveMissedPauseJump]
    }));

    let unresolved = BATTLE_SCRIPT_FURYCUTTER_CASES
        .iter()
        .filter(|case| case.category == "unresolved-label-on-miss-branch-only")
        .collect::<Vec<_>>();
    assert_eq!(unresolved.len(), 4);
    for case in unresolved {
        assert!(!case.move_missed_pause_resolved);
        assert_eq!(case.expected, None);
        assert_eq!(case.controls, []);
        assert_eq!(
            case.expected_error,
            Some("Cmd_furycuttercalc requires BattleScript_MoveMissedPause"),
        );
        assert_ne!(
            case.initial.move_result_flags & BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT,
            0,
        );
    }

    let missing = BATTLE_SCRIPT_FURYCUTTER_CASES
        .iter()
        .filter(|case| case.category == "missing-attacker-before-mask-and-label-resolution")
        .collect::<Vec<_>>();
    assert_eq!(missing.len(), 125);
    let aliases = missing
        .iter()
        .map(|case| {
            assert_eq!(case.initial.attacker, None);
            assert!(!case.move_missed_pause_resolved);
            assert_eq!(case.expected, None);
            assert_eq!(case.controls, []);
            assert_eq!(
                case.expected_error,
                Some("Battle Script hit-chain command requires a attacker role"),
            );
            (
                optional_id(case.initial.target),
                optional_id(case.initial.effect_battler),
                optional_id(case.initial.fainted),
            )
        })
        .collect::<BTreeSet<_>>();
    assert_eq!(aliases.len(), 125);
}

#[test]
fn repeated_success_wrap_fixed_point_and_miss_paths_match_canonical_typescript() {
    let fixed = BATTLE_SCRIPT_FURYCUTTER_CASES
        .iter()
        .filter(|case| case.category == "repeated-success-to-fixed-point")
        .collect::<Vec<_>>();
    assert_eq!(fixed.len(), 4);
    for case in fixed {
        assert_eq!(case.applications, 6);
        assert_eq!(
            case.controls,
            [
                BattleScriptFurycutterControl::Advance,
                BattleScriptFurycutterControl::Advance,
                BattleScriptFurycutterControl::Advance,
                BattleScriptFurycutterControl::Advance,
                BattleScriptFurycutterControl::Advance,
                BattleScriptFurycutterControl::Advance,
            ],
        );
        let attacker = case.initial.attacker.expect("fixed point attacker");
        let output = case.expected.expect("fixed point must succeed");
        assert_eq!(
            output.battlers[attacker.index()].fury_cutter_counter,
            BATTLE_SCRIPT_FURYCUTTER_COUNTER_FIXED_POINT,
        );
        assert_eq!(output.dynamic_base_power, 160);
    }

    let wrapping = BATTLE_SCRIPT_FURYCUTTER_CASES
        .iter()
        .filter(|case| case.category == "repeated-success-through-u8-wrap")
        .collect::<Vec<_>>();
    assert_eq!(wrapping.len(), 4);
    for case in wrapping {
        assert_eq!(case.applications, 3);
        assert_eq!(
            case.controls,
            [
                BattleScriptFurycutterControl::Advance,
                BattleScriptFurycutterControl::Advance,
                BattleScriptFurycutterControl::Advance,
            ],
        );
        let attacker = case.initial.attacker.expect("wrapping attacker");
        let output = case.expected.expect("wrapping sequence must succeed");
        assert_eq!(output.battlers[attacker.index()].fury_cutter_counter, 0);
        assert_eq!(output.dynamic_base_power, 0x8001);
    }

    let misses = BATTLE_SCRIPT_FURYCUTTER_CASES
        .iter()
        .filter(|case| case.category == "repeated-miss-reset-and-jump")
        .collect::<Vec<_>>();
    assert_eq!(misses.len(), 4);
    for case in misses {
        assert_eq!(case.applications, 3);
        assert_eq!(
            case.controls,
            [
                BattleScriptFurycutterControl::MoveMissedPauseJump,
                BattleScriptFurycutterControl::MoveMissedPauseJump,
                BattleScriptFurycutterControl::MoveMissedPauseJump,
            ],
        );
        let attacker = case.initial.attacker.expect("miss attacker");
        let output = case.expected.expect("repeated miss must succeed");
        assert_eq!(output.battlers[attacker.index()].fury_cutter_counter, 0);
        assert_eq!(output.dynamic_base_power, 0x1234);
    }
}

#[test]
fn registration_opcode_dispatcher_zero_operand_and_cardinality_match_canonical_typescript() {
    assert_eq!(BATTLE_SCRIPT_FURYCUTTER_REGISTRATION_CASES.len(), 6);
    for case in BATTLE_SCRIPT_FURYCUTTER_REGISTRATION_CASES {
        execute_registration_case(&case);
    }
    let canonical = BATTLE_SCRIPT_FURYCUTTER_REGISTRATION_CASES
        .iter()
        .find(|case| case.label == "canonical")
        .expect("canonical registration vector");
    let instruction = canonical
        .expected
        .expect("canonical registration must succeed");
    assert_eq!(instruction.opcode_id, BATTLE_SCRIPT_FURYCUTTER_OPCODE);
    assert_eq!(instruction.opcode_id, GENERATED_OPCODE);
    assert_eq!(instruction.operand_count, 0);

    let bad_opcode = BATTLE_SCRIPT_FURYCUTTER_REGISTRATION_CASES
        .iter()
        .find(|case| case.label == "wrong_opcode")
        .expect("wrong opcode registration vector");
    assert_eq!(bad_opcode.expected, None);
    assert_eq!(
        bad_opcode.expected_error,
        Some("invalid B_SCR_OP_FURYCUTTERCALC shape at program counter 1107"),
    );
}

fn execute_registration_case(case: &BattleScriptFurycutterRegistrationCase) {
    let native_instructions = case
        .instructions
        .iter()
        .copied()
        .map(instruction)
        .collect::<Vec<_>>();
    match (
        validate_battle_script_furycutter_registration(&native_instructions),
        case.expected,
        case.expected_error,
    ) {
        (Ok(actual), Some(expected), None) => assert_eq!(
            actual,
            instruction(expected),
            "registration {}: selected instruction",
            case.label,
        ),
        (Err(actual), None, Some(expected)) => assert_eq!(
            actual.to_string(),
            expected,
            "registration {}: canonical error",
            case.label,
        ),
        (actual, expected, expected_error) => panic!(
            "registration {}: generated shape disagrees with native result: actual={actual:?}, expected={expected:?}, expected_error={expected_error:?}",
            case.label,
        ),
    }
}

#[test]
fn corpus_censuses_hash_and_size_are_ratchet_pinned() {
    assert_eq!(
        BATTLE_SCRIPT_FURYCUTTER_VECTOR_CORPUS_SHA256,
        "5f73545665073ab151ebd3c4d55d558e80916473d6eff98a190ea7e56a341c34",
    );
    assert_eq!(BATTLE_SCRIPT_FURYCUTTER_VECTOR_CORPUS_BYTES, 6_068_742);
    assert_eq!(BATTLE_SCRIPT_FURYCUTTER_CASES.len(), 2_278);
    assert_eq!(
        BATTLE_SCRIPT_FURYCUTTER_DOMAIN_CENSUS,
        [
            ("battler-slots", 4),
            ("attacker-role-values", 4),
            ("optional-selector-role-values", 5),
            ("attacker-selector-cross-product", 500),
            ("counter-source-u8-values", 256),
            ("counter-relevant-edge-values", 17),
            ("counter-fixed-point-value", 5),
            ("current-move-power-source-u16-values", 65_536),
            ("current-move-power-edge-values", 21),
            ("prior-dynamic-base-power-edge-values", 21),
            ("move-result-flags-u32-values", 4_294_967_296),
            ("move-result-no-effect-mask-edge-values", 26),
            ("move-result-no-effect-mask", 41),
            ("application-count-values", 3),
            ("registration-shape-cases", 6),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_FURYCUTTER_CATEGORY_CENSUS,
        [
            ("all-attacker-and-selector-alias-combinations", 500),
            (
                "current-move-power-u16-assignment-and-wrapping-doublings",
                357,
            ),
            ("every-source-u8-counter-for-every-attacker", 1_024),
            ("miss-resets-only-attacker-and-jumps", 68),
            ("missing-attacker-before-mask-and-label-resolution", 125),
            ("move-result-no-effect-full-u32-mask-boundaries", 104),
            ("prior-dynamic-base-power-overwrite-edges", 84),
            ("repeated-miss-reset-and-jump", 4),
            ("repeated-success-through-u8-wrap", 4),
            ("repeated-success-to-fixed-point", 4),
            ("unresolved-label-on-miss-branch-only", 4),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_FURYCUTTER_BRANCH_CENSUS,
        [
            ("advance", 1_997),
            ("missing-attacker-role", 125),
            ("move-missed-pause-jump", 140),
            ("repeated-advance", 8),
            ("repeated-move-missed-pause-jump", 4),
            ("unresolved-move-missed-pause", 4),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_FURYCUTTER_REGISTRATION_BRANCH_CENSUS,
        [
            ("concrete-start-cardinality", 2),
            ("invalid-instruction-shape", 3),
            ("registered", 1),
        ],
    );
    assert_eq!(BATTLE_SCRIPT_FURYCUTTER_OPCODE, GENERATED_OPCODE);
    assert_eq!(BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT, GENERATED_NO_EFFECT);
    assert_eq!(
        BATTLE_SCRIPT_FURYCUTTER_COUNTER_FIXED_POINT,
        GENERATED_FIXED_POINT,
    );
    assert_eq!(BATTLE_SCRIPT_FURYCUTTER_BATTLER_COUNT, 4);
    assert_eq!(
        BATTLE_SCRIPT_FURYCUTTER_BATTLERS.map(BattleScriptFurycutterBattler::as_u8),
        BATTLE_SCRIPT_FURYCUTTER_BATTLER_DOMAIN,
    );
}
