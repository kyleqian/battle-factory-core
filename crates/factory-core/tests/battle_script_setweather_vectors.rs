//! Differential ratchet for the canonical TypeScript weather opcode family.
//! Regenerate with node --experimental-strip-types
//! core-rs/tools/gen-battle-script-setweather-vectors.mjs.
//!
//! Source evidence: Cmd_setrain at battle_script_commands.c:6681-6696,
//! Cmd_setsandstorm at :7586-7601, Cmd_setsunny at :8767-8783, Cmd_sethail
//! at :9055-9071, the four operandless macro bytes, and their four
//! effect-script call sites.

use std::collections::BTreeSet;

use factory_core::battle_script_setweather::{
    apply_battle_script_setweather, register_battle_script_setweather_handlers,
    BattleScriptSetweatherBinding, BattleScriptSetweatherControl,
    BattleScriptSetweatherInstruction, BattleScriptSetweatherKind, BattleScriptSetweatherRules,
    BattleScriptSetweatherSiblings, BATTLE_SCRIPT_B_MSG_STARTED_HAIL,
    BATTLE_SCRIPT_B_MSG_STARTED_RAIN, BATTLE_SCRIPT_B_MSG_STARTED_SANDSTORM,
    BATTLE_SCRIPT_B_MSG_STARTED_SUNLIGHT, BATTLE_SCRIPT_B_MSG_WEATHER_FAILED,
    BATTLE_SCRIPT_MOVE_RESULT_MISSED, BATTLE_SCRIPT_SETWEATHER_DURATION,
    BATTLE_SCRIPT_SETWEATHER_KINDS, BATTLE_SCRIPT_SETWEATHER_SOURCE_DISPATCHERS,
    BATTLE_SCRIPT_SETWEATHER_SOURCE_OPCODE_IDS,
};
use factory_core::battle_script_setweather_vectors_gen::{
    BattleScriptSetweatherRegistrationCase, BattleScriptSetweatherVectorBinding,
    BattleScriptSetweatherVectorCase, BattleScriptSetweatherVectorInstruction,
    BattleScriptSetweatherVectorSiblings, BattleScriptSetweatherVectorState,
    BATTLE_SCRIPT_SETWEATHER_BRANCH_CENSUS, BATTLE_SCRIPT_SETWEATHER_CANONICAL_IDENTITIES,
    BATTLE_SCRIPT_SETWEATHER_CASES, BATTLE_SCRIPT_SETWEATHER_CATEGORY_CENSUS,
    BATTLE_SCRIPT_SETWEATHER_DOMAIN_CENSUS, BATTLE_SCRIPT_SETWEATHER_HIGH_WEATHER_EDGE_DOMAIN,
    BATTLE_SCRIPT_SETWEATHER_LOW_WEATHER_DOMAIN,
    BATTLE_SCRIPT_SETWEATHER_MOVE_RESULT_FLAGS_EDGE_DOMAIN,
    BATTLE_SCRIPT_SETWEATHER_REGISTRATION_BRANCH_CENSUS,
    BATTLE_SCRIPT_SETWEATHER_REGISTRATION_CASES, BATTLE_SCRIPT_SETWEATHER_U8_EDGE_DOMAIN,
    BATTLE_SCRIPT_SETWEATHER_VECTOR_CORPUS_BYTES, BATTLE_SCRIPT_SETWEATHER_VECTOR_CORPUS_SHA256,
};

fn siblings(value: BattleScriptSetweatherVectorSiblings) -> BattleScriptSetweatherSiblings {
    BattleScriptSetweatherSiblings {
        hit_marker: value.hit_marker,
        random_turn_number: value.random_turn_number,
        side_statuses: value.side_statuses,
        mist_timers: value.mist_timers,
        wish_counter: value.wish_counter,
        future_sight_counter: value.future_sight_counter,
        battle_communication0: value.battle_communication0,
        battler_statuses: value.battler_statuses,
    }
}

fn vector_siblings(value: BattleScriptSetweatherSiblings) -> BattleScriptSetweatherVectorSiblings {
    BattleScriptSetweatherVectorSiblings {
        hit_marker: value.hit_marker,
        random_turn_number: value.random_turn_number,
        side_statuses: value.side_statuses,
        mist_timers: value.mist_timers,
        wish_counter: value.wish_counter,
        future_sight_counter: value.future_sight_counter,
        battle_communication0: value.battle_communication0,
        battler_statuses: value.battler_statuses,
    }
}

fn rules(value: BattleScriptSetweatherVectorState) -> BattleScriptSetweatherRules {
    BattleScriptSetweatherRules {
        weather: value.weather,
        weather_timer: value.weather_timer,
        move_result_flags: value.move_result_flags,
        multistring_chooser: value.multistring_chooser,
        siblings: siblings(value.siblings),
    }
}

fn vector_state(value: BattleScriptSetweatherRules) -> BattleScriptSetweatherVectorState {
    BattleScriptSetweatherVectorState {
        weather: value.weather,
        weather_timer: value.weather_timer,
        move_result_flags: value.move_result_flags,
        multistring_chooser: value.multistring_chooser,
        siblings: vector_siblings(value.siblings),
    }
}

fn instruction(
    value: BattleScriptSetweatherVectorInstruction,
) -> BattleScriptSetweatherInstruction<'static> {
    BattleScriptSetweatherInstruction {
        opcode_name: value.opcode_name,
        program_counter: value.program_counter,
        opcode_id: value.opcode_id,
        dispatcher: value.dispatcher,
        operand_count: value.operand_count,
    }
}

fn vector_binding(value: BattleScriptSetweatherBinding) -> BattleScriptSetweatherVectorBinding {
    BattleScriptSetweatherVectorBinding { opcode_id: value.opcode_id, kind: value.kind }
}

#[test]
fn complete_projected_outputs_controls_and_machine_invariants_match_canonical_typescript() {
    assert_eq!(BATTLE_SCRIPT_SETWEATHER_CASES.len(), 1_788);
    for (case_index, case) in BATTLE_SCRIPT_SETWEATHER_CASES.iter().enumerate() {
        execute_case(case_index, case);
    }
}

fn execute_case(case_index: usize, case: &BattleScriptSetweatherVectorCase) {
    let input = rules(case.initial);
    let before = input;
    let mut current = input;
    assert_eq!(
        case.operations.len(),
        case.controls.len(),
        "case {case_index} {}: control cardinality",
        case.label,
    );
    assert_eq!(
        case.operations.len(),
        case.scheduler_unchanged.len(),
        "case {case_index} {}: scheduler receipt cardinality",
        case.label,
    );
    assert_eq!(
        case.operations.len(),
        case.rng_unchanged.len(),
        "case {case_index} {}: rng receipt cardinality",
        case.label,
    );
    assert_eq!(
        case.operations.len(),
        case.event_counts.len(),
        "case {case_index} {}: event receipt cardinality",
        case.label,
    );

    for (application, kind) in case.operations.iter().copied().enumerate() {
        let prior = current;
        let outcome = apply_battle_script_setweather(kind, &current);
        assert_eq!(
            outcome.control, case.controls[application],
            "case {case_index} {} application {application}: canonical control",
            case.label,
        );
        assert_eq!(
            outcome.control,
            BattleScriptSetweatherControl::Advance,
            "case {case_index} {} application {application}: weather command must Advance",
            case.label,
        );
        assert!(
            case.scheduler_unchanged[application],
            "case {case_index} {} application {application}: canonical scheduler changed",
            case.label,
        );
        assert!(
            case.rng_unchanged[application],
            "case {case_index} {} application {application}: canonical handler consumed RNG",
            case.label,
        );
        assert_eq!(
            case.event_counts[application], 0,
            "case {case_index} {} application {application}: canonical handler emitted events",
            case.label,
        );
        assert_transition_shape(case_index, case, application, kind, prior, outcome.rules);
        current = outcome.rules;
    }

    assert_eq!(
        input, before,
        "case {case_index} {}: native transformation mutated input",
        case.label,
    );
    assert_eq!(
        vector_state(current),
        case.expected,
        "case {case_index} {}: complete canonical projected output",
        case.label,
    );
}

fn assert_transition_shape(
    case_index: usize,
    case: &BattleScriptSetweatherVectorCase,
    application: usize,
    kind: BattleScriptSetweatherKind,
    prior: BattleScriptSetweatherRules,
    next: BattleScriptSetweatherRules,
) {
    let config = kind.config();
    assert_eq!(
        next.siblings, prior.siblings,
        "case {case_index} {} application {application}: changed immutable rules siblings",
        case.label,
    );
    if prior.weather & config.active_mask != 0 {
        assert_eq!(
            next.weather, prior.weather,
            "case {case_index} {} application {application}: same-weather failure changed weather",
            case.label,
        );
        assert_eq!(
            next.weather_timer, prior.weather_timer,
            "case {case_index} {} application {application}: same-weather failure changed timer",
            case.label,
        );
        assert_eq!(
            next.move_result_flags,
            prior.move_result_flags | BATTLE_SCRIPT_MOVE_RESULT_MISSED,
            "case {case_index} {} application {application}: failure did not OR MOVE_RESULT_MISSED",
            case.label,
        );
        assert_eq!(
            next.move_result_flags & !BATTLE_SCRIPT_MOVE_RESULT_MISSED,
            prior.move_result_flags & !BATTLE_SCRIPT_MOVE_RESULT_MISSED,
            "case {case_index} {} application {application}: failure changed unrelated move-result bits",
            case.label,
        );
        assert_eq!(
            next.multistring_chooser, BATTLE_SCRIPT_B_MSG_WEATHER_FAILED,
            "case {case_index} {} application {application}: failure chooser",
            case.label,
        );
        return;
    }

    assert_eq!(
        next.weather, config.temporary_bit,
        "case {case_index} {} application {application}: success must clobber weather",
        case.label,
    );
    assert_eq!(
        next.weather_timer, BATTLE_SCRIPT_SETWEATHER_DURATION,
        "case {case_index} {} application {application}: success timer",
        case.label,
    );
    assert_eq!(
        next.move_result_flags, prior.move_result_flags,
        "case {case_index} {} application {application}: success changed result flags",
        case.label,
    );
    assert_eq!(
        next.multistring_chooser, config.success_chooser,
        "case {case_index} {} application {application}: success chooser",
        case.label,
    );
}

#[test]
fn exact_factory_registration_outcomes_match_canonical_typescript() {
    assert_eq!(BATTLE_SCRIPT_SETWEATHER_REGISTRATION_CASES.len(), 17);
    for (case_index, case) in BATTLE_SCRIPT_SETWEATHER_REGISTRATION_CASES
        .iter()
        .enumerate()
    {
        execute_registration_case(case_index, case);
    }
}

fn execute_registration_case(case_index: usize, case: &BattleScriptSetweatherRegistrationCase) {
    let input = case
        .instructions
        .iter()
        .copied()
        .map(instruction)
        .collect::<Vec<_>>();
    let actual = register_battle_script_setweather_handlers(&input);
    match (actual, case.expected_error) {
        (Ok(registered), None) => {
            let bindings = registered.bindings().map(vector_binding).collect::<Vec<_>>();
            assert_eq!(
                bindings,
                case.expected_bindings,
                "registration case {case_index} {}: final JS-spread handler map",
                case.label,
            );
        }
        (Err(error), Some(expected_error)) => assert_eq!(
            error.to_string(),
            expected_error,
            "registration case {case_index} {}: exact canonical validation ordering",
            case.label,
        ),
        (actual, expected_error) => panic!(
            "registration case {case_index} {}: native outcome disagrees with canonical: actual={actual:?}, expected_error={expected_error:?}",
            case.label,
        ),
    }
}

#[test]
fn weather_matrix_covers_low_bits_high_u32_edges_timer_chooser_flags_and_paths() {
    let low_cases = BATTLE_SCRIPT_SETWEATHER_CASES
        .iter()
        .filter(|case| case.category == "complete-low-weather-bit-matrix")
        .collect::<Vec<_>>();
    assert_eq!(
        low_cases.len(),
        4 * BATTLE_SCRIPT_SETWEATHER_LOW_WEATHER_DOMAIN.len()
    );
    let low_actual = low_cases
        .iter()
        .map(|case| (case.operations[0] as u8, case.initial.weather))
        .collect::<BTreeSet<_>>();
    let low_expected = BATTLE_SCRIPT_SETWEATHER_KINDS
        .into_iter()
        .flat_map(|kind| {
            BATTLE_SCRIPT_SETWEATHER_LOW_WEATHER_DOMAIN
                .into_iter()
                .map(move |weather| (kind as u8, weather))
        })
        .collect::<BTreeSet<_>>();
    assert_eq!(low_actual, low_expected);

    let high_cases = BATTLE_SCRIPT_SETWEATHER_CASES
        .iter()
        .filter(|case| case.category == "representative-high-weather-u32-edges")
        .collect::<Vec<_>>();
    assert_eq!(
        high_cases.len(),
        4 * BATTLE_SCRIPT_SETWEATHER_HIGH_WEATHER_EDGE_DOMAIN.len(),
    );
    let high_actual = high_cases
        .iter()
        .map(|case| (case.operations[0] as u8, case.initial.weather))
        .collect::<BTreeSet<_>>();
    let high_expected = BATTLE_SCRIPT_SETWEATHER_KINDS
        .into_iter()
        .flat_map(|kind| {
            BATTLE_SCRIPT_SETWEATHER_HIGH_WEATHER_EDGE_DOMAIN
                .into_iter()
                .map(move |weather| (kind as u8, weather))
        })
        .collect::<BTreeSet<_>>();
    assert_eq!(high_actual, high_expected);

    let timer_chooser_cases = BATTLE_SCRIPT_SETWEATHER_CASES
        .iter()
        .filter(|case| case.category == "prior-timer-chooser-u8-edge-matrix")
        .collect::<Vec<_>>();
    assert_eq!(
        timer_chooser_cases.len(),
        4 * 2 * BATTLE_SCRIPT_SETWEATHER_U8_EDGE_DOMAIN.len().pow(2),
    );
    let timer_chooser_actual = timer_chooser_cases
        .iter()
        .map(|case| {
            let kind = case.operations[0];
            (
                kind as u8,
                case.initial.weather & kind.config().active_mask != 0,
                case.initial.weather_timer,
                case.initial.multistring_chooser,
            )
        })
        .collect::<BTreeSet<_>>();
    let timer_chooser_expected = BATTLE_SCRIPT_SETWEATHER_KINDS
        .into_iter()
        .flat_map(|kind| {
            BATTLE_SCRIPT_SETWEATHER_U8_EDGE_DOMAIN
                .into_iter()
                .flat_map(move |timer| {
                    BATTLE_SCRIPT_SETWEATHER_U8_EDGE_DOMAIN
                        .into_iter()
                        .flat_map(move |chooser| {
                            [
                                (kind as u8, false, timer, chooser),
                                (kind as u8, true, timer, chooser),
                            ]
                        })
                })
        })
        .collect::<BTreeSet<_>>();
    assert_eq!(timer_chooser_actual, timer_chooser_expected);

    let flags_cases = BATTLE_SCRIPT_SETWEATHER_CASES
        .iter()
        .filter(|case| case.category == "move-result-flags-u32-edge-matrix")
        .collect::<Vec<_>>();
    assert_eq!(
        flags_cases.len(),
        4 * 2 * BATTLE_SCRIPT_SETWEATHER_MOVE_RESULT_FLAGS_EDGE_DOMAIN.len(),
    );
    let flags_actual = flags_cases
        .iter()
        .map(|case| {
            let kind = case.operations[0];
            (
                kind as u8,
                case.initial.weather & kind.config().active_mask != 0,
                case.initial.move_result_flags,
            )
        })
        .collect::<BTreeSet<_>>();
    let flags_expected = BATTLE_SCRIPT_SETWEATHER_KINDS
        .into_iter()
        .flat_map(|kind| {
            BATTLE_SCRIPT_SETWEATHER_MOVE_RESULT_FLAGS_EDGE_DOMAIN
                .into_iter()
                .flat_map(move |flags| [(kind as u8, false, flags), (kind as u8, true, flags)])
        })
        .collect::<BTreeSet<_>>();
    assert_eq!(flags_actual, flags_expected);

    let cross_cases = BATTLE_SCRIPT_SETWEATHER_CASES
        .iter()
        .filter(|case| case.category == "cross-weather-replacement")
        .collect::<Vec<_>>();
    assert_eq!(cross_cases.len(), 12);
    for from in BATTLE_SCRIPT_SETWEATHER_KINDS {
        for to in BATTLE_SCRIPT_SETWEATHER_KINDS {
            if from == to {
                continue;
            }
            assert!(
                cross_cases.iter().any(|case| {
                    case.operations == [to] && case.initial.weather == from.config().active_mask
                }),
                "cross-weather matrix omits {from:?} to {to:?}",
            );
        }
    }

    let repeated = BATTLE_SCRIPT_SETWEATHER_CASES
        .iter()
        .filter(|case| case.category == "repeated-success-then-failure")
        .collect::<Vec<_>>();
    assert_eq!(repeated.len(), 4);
    assert!(repeated
        .iter()
        .all(|case| { case.operations.len() == 2 && case.operations[0] == case.operations[1] }));
    let alternating = BATTLE_SCRIPT_SETWEATHER_CASES
        .iter()
        .filter(|case| case.category == "alternating-weather-path")
        .collect::<Vec<_>>();
    assert_eq!(alternating.len(), 4);
    assert!(alternating.iter().all(|case| {
        case.operations.len() == 6
            && case.operations[0] == case.operations[4]
            && case.operations[4] == case.operations[5]
    }));
}

#[test]
fn source_identity_configuration_and_message_constants_are_independently_ratcheted() {
    assert_eq!(
        BATTLE_SCRIPT_SETWEATHER_KINDS,
        [
            BattleScriptSetweatherKind::Rain,
            BattleScriptSetweatherKind::Sunny,
            BattleScriptSetweatherKind::Sandstorm,
            BattleScriptSetweatherKind::Hail,
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_SETWEATHER_SOURCE_OPCODE_IDS,
        [0x7d, 0xbb, 0x95, 0xc8]
    );
    assert_eq!(
        BATTLE_SCRIPT_SETWEATHER_SOURCE_DISPATCHERS,
        [
            "Cmd_setrain",
            "Cmd_setsunny",
            "Cmd_setsandstorm",
            "Cmd_sethail"
        ],
    );
    assert_eq!(BATTLE_SCRIPT_MOVE_RESULT_MISSED, 0x0000_0001);
    assert_eq!(BATTLE_SCRIPT_SETWEATHER_DURATION, 5);
    assert_eq!(BATTLE_SCRIPT_B_MSG_STARTED_RAIN, 0);
    assert_eq!(BATTLE_SCRIPT_B_MSG_WEATHER_FAILED, 2);
    assert_eq!(BATTLE_SCRIPT_B_MSG_STARTED_SANDSTORM, 3);
    assert_eq!(BATTLE_SCRIPT_B_MSG_STARTED_SUNLIGHT, 4);
    assert_eq!(BATTLE_SCRIPT_B_MSG_STARTED_HAIL, 5);

    let identities = BATTLE_SCRIPT_SETWEATHER_CANONICAL_IDENTITIES;
    assert_eq!(identities.len(), 4);
    let observed = identities.map(|identity| {
        (
            identity.kind,
            identity.opcode_name,
            identity.opcode_id,
            identity.dispatcher,
            identity.entry_label,
            identity.entry_program_counter,
            identity.statement_line,
            identity.macro_line,
            identity.active_mask,
            identity.temporary_bit,
            identity.success_chooser,
        )
    });
    assert_eq!(
        observed,
        [
            (
                BattleScriptSetweatherKind::Rain,
                "B_SCR_OP_SETRAIN",
                0x7d,
                "Cmd_setrain",
                "BattleScript_EffectRainDance",
                1194,
                1748,
                695,
                0x0000_0007,
                0x0000_0001,
                0,
            ),
            (
                BattleScriptSetweatherKind::Sunny,
                "B_SCR_OP_SETSUNNY",
                0xbb,
                "Cmd_setsunny",
                "BattleScript_EffectSunnyDay",
                1204,
                1761,
                973,
                0x0000_0060,
                0x0000_0020,
                4,
            ),
            (
                BattleScriptSetweatherKind::Sandstorm,
                "B_SCR_OP_SETSANDSTORM",
                0x95,
                "Cmd_setsandstorm",
                "BattleScript_EffectSandstorm",
                1073,
                1593,
                803,
                0x0000_0018,
                0x0000_0008,
                3,
            ),
            (
                BattleScriptSetweatherKind::Hail,
                "B_SCR_OP_SETHAIL",
                0xc8,
                "Cmd_sethail",
                "BattleScript_EffectHail",
                1493,
                2136,
                1031,
                0x0000_0080,
                0x0000_0080,
                5,
            ),
        ],
    );
    for identity in identities {
        assert_eq!(identity.opcode_name, identity.kind.opcode_name());
        assert_eq!(identity.opcode_id, identity.kind.source_opcode_id());
        assert_eq!(identity.dispatcher, identity.kind.source_dispatcher());
        assert_eq!(identity.active_mask, identity.kind.config().active_mask);
        assert_eq!(identity.temporary_bit, identity.kind.config().temporary_bit);
        assert_eq!(
            identity.success_chooser,
            identity.kind.config().success_chooser
        );
    }
}

#[test]
fn domain_category_branch_censuses_and_corpus_hash_are_ratchet_pinned() {
    assert_eq!(
        BATTLE_SCRIPT_SETWEATHER_DOMAIN_CENSUS,
        [
            ("weather-u32-values", 4_294_967_296),
            ("move-result-flags-u32-values", 4_294_967_296),
            ("weather-timer-u8-values", 256),
            ("multistring-chooser-u8-values", 256),
            ("weather-configurations", 4),
            ("complete-relevant-low-weather-bit-combinations", 256),
            ("representative-high-weather-u32-probes", 8),
            ("prior-timer-chooser-edge-probes", 9),
            ("move-result-flags-edge-probes", 8),
            ("operation-sequence-length-values", 6),
            ("factory-instruction-families", 4),
            ("factory-registration-cases", 17),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_SETWEATHER_CATEGORY_CENSUS,
        [
            ("alternating-weather-path", 4),
            ("complete-low-weather-bit-matrix", 1_024),
            ("cross-weather-replacement", 12),
            ("move-result-flags-u32-edge-matrix", 64),
            ("prior-timer-chooser-u8-edge-matrix", 648),
            ("repeated-success-then-failure", 4),
            ("representative-high-weather-u32-edges", 32),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_SETWEATHER_BRANCH_CENSUS,
        [
            ("hail-same-weather-failure-advance", 219),
            ("hail-success-advance", 226),
            ("hail-success-advance-then-hail-same-weather-failure-advance", 1),
            (
                "hail-success-advance-then-rain-success-advance-then-sunny-success-advance-then-sandstorm-success-advance-then-hail-success-advance-then-hail-same-weather-failure-advance",
                1,
            ),
            ("rain-same-weather-failure-advance", 314),
            ("rain-success-advance", 131),
            ("rain-success-advance-then-rain-same-weather-failure-advance", 1),
            (
                "rain-success-advance-then-sunny-success-advance-then-sandstorm-success-advance-then-hail-success-advance-then-rain-success-advance-then-rain-same-weather-failure-advance",
                1,
            ),
            ("sandstorm-same-weather-failure-advance", 282),
            ("sandstorm-success-advance", 163),
            (
                "sandstorm-success-advance-then-hail-success-advance-then-rain-success-advance-then-sunny-success-advance-then-sandstorm-success-advance-then-sandstorm-same-weather-failure-advance",
                1,
            ),
            ("sandstorm-success-advance-then-sandstorm-same-weather-failure-advance", 1),
            ("sunny-same-weather-failure-advance", 282),
            ("sunny-success-advance", 163),
            (
                "sunny-success-advance-then-sandstorm-success-advance-then-hail-success-advance-then-rain-success-advance-then-sunny-success-advance-then-sunny-same-weather-failure-advance",
                1,
            ),
            ("sunny-success-advance-then-sunny-same-weather-failure-advance", 1),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_SETWEATHER_REGISTRATION_BRANCH_CENSUS,
        [
            ("B_SCR_OP_SETHAIL-cardinality", 2),
            ("B_SCR_OP_SETHAIL-zero-operand-shape", 1),
            ("B_SCR_OP_SETRAIN-cardinality", 2),
            ("B_SCR_OP_SETRAIN-zero-operand-shape", 1),
            ("B_SCR_OP_SETSANDSTORM-cardinality", 2),
            ("B_SCR_OP_SETSANDSTORM-zero-operand-shape", 1),
            ("B_SCR_OP_SETSUNNY-cardinality", 2),
            ("B_SCR_OP_SETSUNNY-zero-operand-shape", 1),
            ("registered", 5),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_SETWEATHER_VECTOR_CORPUS_SHA256,
        "7b590b8f3b669c00f943087d24f9618d118ef9d87f75bc202baa0f8f08ab5e03",
    );
    assert_eq!(BATTLE_SCRIPT_SETWEATHER_VECTOR_CORPUS_BYTES, 2_086_704);
}
