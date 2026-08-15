//! Canonical-TS differential, metadata, census, and exhaustive arithmetic
//! ratchets for `Cmd_recoverbasedonsunlight`.

use std::collections::BTreeMap;

use factory_core::battle_script_recoverbasedonsunlight::*;
use factory_core::battle_script_recoverbasedonsunlight_vectors_gen::*;

fn battler(
    value: BattleScriptRecoverbasedonsunlightVectorBattler,
) -> BattleScriptRecoverbasedonsunlightBattlerState {
    BattleScriptRecoverbasedonsunlightBattlerState {
        ability: value.ability,
        hp: value.hp,
        max_hp: value.max_hp,
        status1: value.status1,
        status2: value.status2,
        status3: value.status3,
        item: value.item,
        moves: value.moves,
    }
}

fn rules(
    value: BattleScriptRecoverbasedonsunlightVectorState,
) -> BattleScriptRecoverbasedonsunlightRules {
    BattleScriptRecoverbasedonsunlightRules {
        battlers: value.battlers.map(battler),
        selector_roles: BattleScriptRecoverbasedonsunlightRoles {
            attacker: value.attacker,
            target: value.target,
            effect_battler: value.effect_battler,
            fainted: value.fainted,
        },
        battle_move_damage: value.battle_move_damage,
        siblings: BattleScriptRecoverbasedonsunlightSiblings {
            battlers_count: value.battlers_count,
            absent_battler_flags: value.absent_battler_flags,
            weather: value.weather,
            weather_timer: value.weather_timer,
            current_move: value.current_move,
            move_result_flags: value.move_result_flags,
            hit_marker: value.hit_marker,
            side_statuses: value.side_statuses,
        },
    }
}

fn vector_battler(
    value: BattleScriptRecoverbasedonsunlightBattlerState,
) -> BattleScriptRecoverbasedonsunlightVectorBattler {
    BattleScriptRecoverbasedonsunlightVectorBattler {
        ability: value.ability,
        hp: value.hp,
        max_hp: value.max_hp,
        status1: value.status1,
        status2: value.status2,
        status3: value.status3,
        item: value.item,
        moves: value.moves,
    }
}

fn vector(
    value: BattleScriptRecoverbasedonsunlightRules,
) -> BattleScriptRecoverbasedonsunlightVectorState {
    BattleScriptRecoverbasedonsunlightVectorState {
        battlers: value.battlers.map(vector_battler),
        attacker: value.selector_roles.attacker,
        target: value.selector_roles.target,
        effect_battler: value.selector_roles.effect_battler,
        fainted: value.selector_roles.fainted,
        battlers_count: value.siblings.battlers_count,
        absent_battler_flags: value.siblings.absent_battler_flags,
        weather: value.siblings.weather,
        weather_timer: value.siblings.weather_timer,
        current_move: value.siblings.current_move,
        move_result_flags: value.siblings.move_result_flags,
        hit_marker: value.siblings.hit_marker,
        side_statuses: value.siblings.side_statuses,
        battle_move_damage: value.battle_move_damage,
    }
}

#[test]
fn complete_projected_outputs_controls_errors_repetitions_and_immutability_match_canonical_ts() {
    assert_eq!(BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_CASES.len(), 808);
    for (index, case) in BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_CASES
        .iter()
        .enumerate()
    {
        let operands: Vec<_> = case
            .operand_widths
            .iter()
            .zip(case.operand_expressions)
            .map(
                |(&width_bytes, &expression)| BattleScriptRecoverbasedonsunlightOperand {
                    width_bytes,
                    expression,
                },
            )
            .collect();
        let instruction = BattleScriptRecoverbasedonsunlightInstruction {
            opcode_name: BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_OPCODE_NAME,
            program_counter: 1187,
            opcode_id: BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_OPCODE,
            dispatcher: BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_DISPATCHER,
            operands: &operands,
            resolved_failure_target: case.resolved.then(|| operands[0].expression),
        };
        let input = rules(case.initial);
        let before = input;
        let mut current = input;
        let mut controls = Vec::new();
        let mut error = None;
        for application in 0..case.applications {
            let prior = current;
            match apply_battle_script_recoverbasedonsunlight(instruction, &current) {
                Ok(outcome) => {
                    assert_eq!(
                        outcome.rules.battlers, prior.battlers,
                        "case {index} {} app {application}: battlers",
                        case.label
                    );
                    assert_eq!(
                        outcome.rules.siblings, prior.siblings,
                        "case {index} {} app {application}: siblings",
                        case.label
                    );
                    assert_eq!(
                        outcome.rules.selector_roles.attacker,
                        prior.selector_roles.attacker
                    );
                    assert_eq!(
                        outcome.rules.selector_roles.effect_battler,
                        prior.selector_roles.effect_battler
                    );
                    assert_eq!(
                        outcome.rules.selector_roles.fainted,
                        prior.selector_roles.fainted
                    );
                    assert_eq!(
                        outcome.rules.selector_roles.target,
                        prior.selector_roles.attacker
                    );
                    if outcome.control == BattleScriptRecoverbasedonsunlightControl::FailJump {
                        assert_eq!(
                            outcome.rules.battle_move_damage, prior.battle_move_damage,
                            "full HP preserves prior damage"
                        );
                    }
                    controls.push(outcome.control);
                    current = outcome.rules;
                }
                Err(actual) => {
                    error = Some(actual.to_string());
                    break;
                }
            }
        }
        assert_eq!(input, before, "case {index} {} mutated input", case.label);
        assert_eq!(
            controls.as_slice(),
            case.controls,
            "case {index} {} controls",
            case.label
        );
        assert_eq!(
            error.as_deref(),
            case.expected_error,
            "case {index} {} error",
            case.label
        );
        if let Some(expected) = case.expected {
            assert_eq!(
                vector(current),
                expected,
                "case {index} {} complete output",
                case.label
            );
        }
    }
}

#[test]
fn canonical_ts_full_u16_proof_is_contiguous_and_native_exact_in_all_four_regimes() {
    let mut counts = BTreeMap::new();
    let mut next = BTreeMap::from([
        ("neutral", 0_u32),
        ("sun", 0),
        ("other", 0),
        ("suppressed", 0),
    ]);
    for &(regime, start, end, expected_damage) in &BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_PROOFS {
        assert_eq!(u32::from(start), next[regime], "{regime} proof gap");
        let (weather, effective) = match regime {
            "neutral" => (0, true),
            "sun" => (BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_WEATHER_SUN, true),
            "other" => (1, true),
            "suppressed" => (BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_WEATHER_SUN, false),
            _ => panic!("unknown regime {regime}"),
        };
        for max_hp in start..=end {
            assert_eq!(
                -i32::from(battle_script_recoverbasedonsunlight_heal(
                    max_hp, weather, effective
                )),
                expected_damage,
                "{regime} maxHP {max_hp}"
            );
            *counts.entry(regime).or_insert(0_u32) += 1;
        }
        next.insert(regime, u32::from(end) + 1);
    }
    assert_eq!(
        counts,
        BTreeMap::from([
            ("neutral", 65_536),
            ("sun", 65_536),
            ("other", 65_536),
            ("suppressed", 65_536)
        ])
    );
    assert!(next.values().all(|&value| value == 65_536));
}

#[test]
fn source_metadata_aliases_constants_and_census_are_independently_pinned() {
    assert_eq!(
        BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_METADATA,
        (
            0xc0,
            "Cmd_recoverbasedonsunlight",
            1187,
            1737,
            994,
            996,
            4,
            5,
            [1184, 1184, 1184],
            1424
        )
    );
    assert_eq!(BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_OPCODE, 0xc0);
    assert_eq!(
        BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_DISPATCHER,
        "Cmd_recoverbasedonsunlight"
    );
    assert_eq!(BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_POINTER_WIDTH_BYTES, 4);
    assert_eq!(BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_ENCODED_WIDTH_BYTES, 5);
    assert_eq!(
        BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_EFFECT_LABELS,
        [
            "BattleScript_EffectMorningSun",
            "BattleScript_EffectSynthesis",
            "BattleScript_EffectMoonlight"
        ]
    );
    assert_eq!(BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_ABILITY_CLOUD_NINE, 13);
    assert_eq!(BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_ABILITY_AIR_LOCK, 77);
    assert_eq!(BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_WEATHER_SUN, 0x60);
    assert_eq!(
        BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_DOMAIN_CENSUS,
        [
            ("u16-max-hp", 65_536),
            ("arithmetic-regimes", 4),
            ("full-lower-higher-handler-applications", 786_424),
            ("selector-alias-matrix", 500),
            ("weather-mask-values", 9),
            ("ability-placement-cases", 64),
            ("registration-cases", 5)
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_CATEGORY_CENSUS,
        [
            ("ability-placement-presence-absence", 64),
            ("error-order", 1),
            ("hp-equality-boundaries", 216),
            ("late-label-resolution", 2),
            ("prior-signed-damage", 14),
            ("repetitions", 2),
            ("selector-alias-matrix", 500),
            ("weather-u32-masks", 9)
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_RAW_PROOF_SHA256,
        "1b0e5b8f555a7b0ec7c60c9b2e97fa8b82a376afffd67d58ecee9e7992333599"
    );
    assert_eq!(
        BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_RAW_PROOF_BYTES,
        10_557_911
    );
    assert_eq!(
        BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_VECTOR_CORPUS_SHA256,
        "7c3adaca45202f2f310eabccb3023344ca4acbed2bbaeaeb268bff4f600fdfe4"
    );
    assert_eq!(
        BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_VECTOR_CORPUS_BYTES,
        9_065_263
    );
}

fn registration_instruction<'a>(
    opcode_name: &'a str,
    opcode_id: u8,
    dispatcher: &'a str,
    operands: &'a [BattleScriptRecoverbasedonsunlightOperand<'a>],
) -> BattleScriptRecoverbasedonsunlightInstruction<'a> {
    BattleScriptRecoverbasedonsunlightInstruction {
        opcode_name,
        program_counter: 1187,
        opcode_id,
        dispatcher,
        operands,
        resolved_failure_target: None,
    }
}

#[test]
fn registration_is_first_match_only_and_selected_shape_is_permissive() {
    const POINTER: [BattleScriptRecoverbasedonsunlightOperand<'static>; 1] =
        [BattleScriptRecoverbasedonsunlightOperand {
            width_bytes: 4,
            expression: BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_FULL_HP_LABEL,
        }];
    const BAD_POINTER: [BattleScriptRecoverbasedonsunlightOperand<'static>; 1] =
        [BattleScriptRecoverbasedonsunlightOperand { width_bytes: 9, expression: "malformed" }];
    const EMPTY: [BattleScriptRecoverbasedonsunlightOperand<'static>; 0] = [];
    let actual = [
        register_battle_script_recoverbasedonsunlight_handler(&[registration_instruction(
            BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_OPCODE_NAME,
            0xc0,
            BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_DISPATCHER,
            &POINTER,
        )])
        .map(|x| vec![x.opcode_id])
        .map_err(|x| x.to_string()),
        register_battle_script_recoverbasedonsunlight_handler(&[registration_instruction(
            "B_SCR_OP_NOP",
            0xc0,
            BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_DISPATCHER,
            &POINTER,
        )])
        .map(|x| vec![x.opcode_id])
        .map_err(|x| x.to_string()),
        register_battle_script_recoverbasedonsunlight_handler(&[
            registration_instruction(
                BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_OPCODE_NAME,
                7,
                "wrong",
                &EMPTY,
            ),
            registration_instruction(
                BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_OPCODE_NAME,
                9,
                BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_DISPATCHER,
                &POINTER,
            ),
        ])
        .map(|x| vec![x.opcode_id])
        .map_err(|x| x.to_string()),
        register_battle_script_recoverbasedonsunlight_handler(&[registration_instruction(
            BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_OPCODE_NAME,
            11,
            "wrong",
            &EMPTY,
        )])
        .map(|x| vec![x.opcode_id])
        .map_err(|x| x.to_string()),
        register_battle_script_recoverbasedonsunlight_handler(&[registration_instruction(
            BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_OPCODE_NAME,
            12,
            "wrong",
            &BAD_POINTER,
        )])
        .map(|x| vec![x.opcode_id])
        .map_err(|x| x.to_string()),
    ];
    for ((label, expected_bindings, expected_error), actual) in
        BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_REGISTRATION_CASES
            .iter()
            .zip(actual)
    {
        match actual {
            Ok(bindings) => {
                assert_eq!(bindings, *expected_bindings, "{label}");
                assert!(expected_error.is_none(), "{label}");
            }
            Err(error) => assert_eq!(Some(error.as_str()), *expected_error, "{label}"),
        }
    }
}

#[test]
fn ability_scan_matches_present_topology_hp_and_ignores_absent_flags() {
    let case = BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_CASES
        .iter()
        .find(|x| x.label == "ability_13_p0_c2_h1_x1")
        .unwrap();
    let value = rules(case.initial);
    assert!(battle_script_recoverbasedonsunlight_ability_present_on_field(&value, 13));
    assert!(!battle_script_recoverbasedonsunlight_weather_has_effect(
        &value
    ));
}
