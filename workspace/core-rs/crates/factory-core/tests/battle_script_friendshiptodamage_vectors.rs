//! Differential ratchet for
//! `src/engine/battleScriptFriendshipToDamageOpcode.ts`. Expected complete
//! state/control projections plus registration and handler errors are created
//! only by executing the canonical TypeScript module; regenerate with:
//!
//! ```text
//! node --experimental-strip-types \
//!   core-rs/tools/gen-battle-script-friendshiptodamage-vectors.mjs
//! ```
//!
//! Source evidence is `Cmd_friendshiptodamagecalculation`
//! (`reference/pokeemerald/src/battle_script_commands.c:8603-8611`), its
//! `0xB6` dispatch entry (`:513`), the zero-operand macro
//! (`asm/macros/battle_script.inc:951-953`), and the aliased Return/Frustration
//! script body (`data/battle_scripts_1.s:1657-1662`).

use std::collections::BTreeSet;

use factory_core::battle_script_friendshiptodamage::{
    apply_battle_script_friendshiptodamage, friendship_to_dynamic_base_power,
    validate_battle_script_friendshiptodamage_registration, BattleScriptFriendship,
    BattleScriptFriendshiptodamageBattler, BattleScriptFriendshiptodamageBattlerState,
    BattleScriptFriendshiptodamageControl, BattleScriptFriendshiptodamageInstruction,
    BattleScriptFriendshiptodamageRoles, BattleScriptFriendshiptodamageRules,
    BATTLE_SCRIPT_EFFECT_FRUSTRATION, BATTLE_SCRIPT_EFFECT_RETURN,
    BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_BATTLERS, BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_BATTLER_COUNT,
    BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_OPCODE,
};
use factory_core::battle_script_friendshiptodamage_vectors_gen::{
    BattleScriptFriendshiptodamageRegistrationCase, BattleScriptFriendshiptodamageVectorCase,
    BattleScriptFriendshiptodamageVectorInstruction, BattleScriptFriendshiptodamageVectorState,
    BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_ALLOWED_EFFECTS,
    BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_BATTLER_DOMAIN,
    BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_BRANCH_CENSUS, BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_CASES,
    BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_CATEGORY_CENSUS,
    BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_DOMAIN_CENSUS,
    BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_DYNAMIC_BASE_POWER_EDGE_DOMAIN,
    BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_INVALID_FRIENDSHIP_BITS,
    BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_OPCODE as GENERATED_OPCODE,
    BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_OPTIONAL_BATTLER_DOMAIN,
    BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_REGISTRATION_BRANCH_CENSUS,
    BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_REGISTRATION_CASES,
    BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_UNREACHABLE_EFFECT_DOMAIN,
    BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_VECTOR_CORPUS_BYTES,
    BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_VECTOR_CORPUS_SHA256,
};

fn rules(value: BattleScriptFriendshiptodamageVectorState) -> BattleScriptFriendshiptodamageRules {
    BattleScriptFriendshiptodamageRules {
        battlers: value
            .friendship
            .map(|friendship| BattleScriptFriendshiptodamageBattlerState { friendship }),
        current_move_effect: value.current_move_effect,
        dynamic_base_power: value.dynamic_base_power,
        selector_roles: BattleScriptFriendshiptodamageRoles {
            attacker: value.attacker,
            target: value.target,
            effect_battler: value.effect_battler,
            fainted: value.fainted,
        },
    }
}

fn vector_state(
    value: BattleScriptFriendshiptodamageRules,
) -> BattleScriptFriendshiptodamageVectorState {
    BattleScriptFriendshiptodamageVectorState {
        friendship: value.battlers.map(|battler| battler.friendship),
        current_move_effect: value.current_move_effect,
        dynamic_base_power: value.dynamic_base_power,
        attacker: value.selector_roles.attacker,
        target: value.selector_roles.target,
        effect_battler: value.selector_roles.effect_battler,
        fainted: value.selector_roles.fainted,
    }
}

fn instruction(
    value: BattleScriptFriendshiptodamageVectorInstruction,
) -> BattleScriptFriendshiptodamageInstruction<'static> {
    BattleScriptFriendshiptodamageInstruction {
        opcode_name: value.opcode_name,
        program_counter: value.program_counter,
        opcode_id: value.opcode_id,
        dispatcher: value.dispatcher,
        operand_count: value.operand_count,
    }
}

fn optional_id(value: Option<BattleScriptFriendshiptodamageBattler>) -> Option<u8> {
    value.map(BattleScriptFriendshiptodamageBattler::as_u8)
}

fn source_power(effect: u8, friendship: u8) -> u16 {
    match effect {
        BATTLE_SCRIPT_EFFECT_RETURN => (10 * u16::from(friendship)) / 25,
        BATTLE_SCRIPT_EFFECT_FRUSTRATION => {
            (10 * (u16::from(u8::MAX) - u16::from(friendship))) / 25
        }
        _ => panic!("only Return/Frustration reach Cmd_friendshiptodamagecalculation"),
    }
}

#[test]
fn complete_projected_outputs_controls_and_exact_errors_match_canonical_typescript() {
    assert_eq!(BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_CASES.len(), 1437);
    for (case_index, case) in BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_CASES.iter().enumerate() {
        execute_case(case_index, case);
    }
}

fn execute_case(case_index: usize, case: &BattleScriptFriendshiptodamageVectorCase) {
    let input = rules(case.initial);
    let before = input;
    let mut current = input;
    let mut actual_controls = Vec::new();
    let mut actual_error = None;

    for application in 0..case.applications {
        let prior = current;
        match apply_battle_script_friendshiptodamage(&current) {
            Ok(outcome) => {
                actual_controls.push(outcome.control);
                assert_transition_shape(
                    case_index,
                    case,
                    application,
                    prior,
                    outcome.rules,
                    outcome.control,
                );
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
                "case {case_index} {}: error must not produce control",
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
    case: &BattleScriptFriendshiptodamageVectorCase,
    application: u8,
    prior: BattleScriptFriendshiptodamageRules,
    next: BattleScriptFriendshiptodamageRules,
    control: BattleScriptFriendshiptodamageControl,
) {
    assert_eq!(
        control,
        BattleScriptFriendshiptodamageControl::Advance,
        "case {case_index} {} application {application}: command must advance",
        case.label,
    );
    let attacker = prior.selector_roles.attacker.unwrap_or_else(|| {
        panic!(
            "case {case_index} {} application {application}: advance had no attacker",
            case.label,
        )
    });
    let expected_power = friendship_to_dynamic_base_power(
        prior.current_move_effect,
        prior.battlers[attacker.index()].friendship,
    )
    .unwrap_or_else(|error| {
        panic!(
            "case {case_index} {} application {application}: legal generated state failed: {error}",
            case.label,
        )
    });
    assert_eq!(
        next.battlers, prior.battlers,
        "case {case_index} {} application {application}: changed friendship/sibling projection",
        case.label,
    );
    assert_eq!(
        next.selector_roles, prior.selector_roles,
        "case {case_index} {} application {application}: changed selector aliases",
        case.label,
    );
    assert_eq!(
        next.current_move_effect, prior.current_move_effect,
        "case {case_index} {} application {application}: changed effect discriminator",
        case.label,
    );
    assert_eq!(
        next.dynamic_base_power, expected_power,
        "case {case_index} {} application {application}: did not overwrite only dynamic base power",
        case.label,
    );
}

#[test]
fn all_u8_friendship_values_pin_source_truncation_complements_and_endpoints() {
    let values = BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_CASES
        .iter()
        .filter(|case| case.category == "every-source-u8-return-frustration")
        .collect::<Vec<_>>();
    assert_eq!(values.len(), 512);

    let mut seen = BTreeSet::new();
    for case in values {
        let attacker = case
            .initial
            .attacker
            .unwrap_or_else(|| panic!("u8 case {} lacks an attacker", case.label));
        let friendship = case.initial.friendship[attacker.index()]
            .as_source_u8()
            .unwrap_or_else(|| panic!("u8 case {} has malformed friendship", case.label));
        let effect = case.initial.current_move_effect;
        let expected = source_power(effect, friendship);
        assert_eq!(
            case.expected
                .unwrap_or_else(|| panic!("u8 case {} unexpectedly errored", case.label))
                .dynamic_base_power,
            expected,
            "u8 effect {effect} friendship {friendship}: source integer truncation",
        );
        assert_eq!(
            friendship_to_dynamic_base_power(effect, BattleScriptFriendship::from_u8(friendship)),
            Ok(expected),
            "u8 effect {effect} friendship {friendship}: native scalar",
        );
        seen.insert((effect, friendship));
    }
    assert_eq!(seen.len(), 512);
    for effect in BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_ALLOWED_EFFECTS {
        for friendship in 0_u8..=u8::MAX {
            assert!(
                seen.contains(&(effect, friendship)),
                "effect {effect} friendship {friendship} dropped from the exhaustive source-u8 matrix",
            );
        }
    }
    for friendship in 0_u8..=u8::MAX {
        assert_eq!(
            source_power(BATTLE_SCRIPT_EFFECT_RETURN, friendship),
            source_power(BATTLE_SCRIPT_EFFECT_FRUSTRATION, u8::MAX - friendship),
            "Return friendship {friendship} must complement Frustration",
        );
    }
    assert_eq!(source_power(BATTLE_SCRIPT_EFFECT_RETURN, 0), 0);
    assert_eq!(source_power(BATTLE_SCRIPT_EFFECT_RETURN, 2), 0);
    assert_eq!(source_power(BATTLE_SCRIPT_EFFECT_RETURN, 3), 1);
    assert_eq!(source_power(BATTLE_SCRIPT_EFFECT_RETURN, u8::MAX), 102);
    assert_eq!(source_power(BATTLE_SCRIPT_EFFECT_FRUSTRATION, 0), 102);
    assert_eq!(source_power(BATTLE_SCRIPT_EFFECT_FRUSTRATION, 252), 1);
    assert_eq!(source_power(BATTLE_SCRIPT_EFFECT_FRUSTRATION, 253), 0);
    assert_eq!(source_power(BATTLE_SCRIPT_EFFECT_FRUSTRATION, u8::MAX), 0);
}

#[test]
fn all_attacker_aliases_selector_combinations_dynamic_edges_and_repeats_are_retained() {
    let selectors = BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_CASES
        .iter()
        .filter(|case| case.category == "all-attacker-and-selector-role-combinations")
        .collect::<Vec<_>>();
    assert_eq!(selectors.len(), 500);
    let selector_domain = selectors
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
    let expected_selector_domain = BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_BATTLER_DOMAIN
        .into_iter()
        .flat_map(|attacker| {
            BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_OPTIONAL_BATTLER_DOMAIN
                .into_iter()
                .flat_map(move |target| {
                    BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_OPTIONAL_BATTLER_DOMAIN
                        .into_iter()
                        .flat_map(move |effect_battler| {
                            BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_OPTIONAL_BATTLER_DOMAIN
                                .into_iter()
                                .map(move |fainted| {
                                    (Some(attacker), target, effect_battler, fainted)
                                })
                        })
                })
        })
        .collect::<BTreeSet<_>>();
    assert_eq!(selector_domain, expected_selector_domain);

    let prior_dynamic = BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_CASES
        .iter()
        .filter(|case| case.category == "prior-dynamic-base-power-overwrite-matrix")
        .collect::<Vec<_>>();
    assert_eq!(prior_dynamic.len(), 176);
    let prior_dynamic_domain = prior_dynamic
        .iter()
        .map(|case| {
            (
                case.initial
                    .attacker
                    .expect("prior dynamic attacker")
                    .as_u8(),
                case.initial.current_move_effect,
                case.initial.dynamic_base_power,
            )
        })
        .collect::<BTreeSet<_>>();
    let expected_prior_dynamic_domain = BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_BATTLER_DOMAIN
        .into_iter()
        .flat_map(|attacker| {
            BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_ALLOWED_EFFECTS
                .into_iter()
                .flat_map(move |effect| {
                    BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_DYNAMIC_BASE_POWER_EDGE_DOMAIN
                        .into_iter()
                        .map(move |prior| (attacker, effect, prior))
                })
        })
        .collect::<BTreeSet<_>>();
    assert_eq!(prior_dynamic_domain, expected_prior_dynamic_domain);

    let repeats = BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_CASES
        .iter()
        .filter(|case| case.category == "repeated-application-idempotence")
        .collect::<Vec<_>>();
    assert_eq!(repeats.len(), 64);
    assert!(repeats.iter().all(|case| {
        case.applications == 2
            && case.controls
                == [
                    BattleScriptFriendshiptodamageControl::Advance,
                    BattleScriptFriendshiptodamageControl::Advance,
                ]
    }));
}

#[test]
fn missing_attacker_invalid_friendship_and_unreachable_effect_ordering_match_typescript() {
    let missing = BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_CASES
        .iter()
        .filter(|case| case.category == "missing-attacker-before-friendship-and-effect-reads")
        .collect::<Vec<_>>();
    assert_eq!(missing.len(), 125);
    let aliases = missing
        .iter()
        .map(|case| {
            assert_eq!(case.initial.attacker, None);
            assert_eq!(case.expected, None);
            assert_eq!(
                case.expected_error,
                Some("Battle Script hit-chain command requires a attacker role")
            );
            (
                optional_id(case.initial.target),
                optional_id(case.initial.effect_battler),
                optional_id(case.initial.fainted),
            )
        })
        .collect::<BTreeSet<_>>();
    assert_eq!(aliases.len(), 125);

    let invalid = BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_CASES
        .iter()
        .filter(|case| case.category == "invalid-friendship-before-effect-reachability")
        .collect::<Vec<_>>();
    assert_eq!(invalid.len(), 36);
    let invalid_bits = invalid
        .iter()
        .map(|case| {
            let attacker = case.initial.attacker.expect("invalid friendship attacker");
            assert!(case
                .expected_error
                .unwrap_or_default()
                .starts_with("attacker friendship must be a source u8, got "));
            case.initial.friendship[attacker.index()].to_bits()
        })
        .collect::<BTreeSet<_>>();
    assert_eq!(
        invalid_bits,
        BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_INVALID_FRIENDSHIP_BITS
            .into_iter()
            .collect::<BTreeSet<_>>(),
    );
    let invalid_effects = invalid
        .iter()
        .map(|case| case.initial.current_move_effect)
        .collect::<BTreeSet<_>>();
    assert_eq!(invalid_effects, BTreeSet::from([0, 121, 122, 123]));

    let unreachable = BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_CASES
        .iter()
        .filter(|case| case.category == "unreachable-effect-with-valid-source-friendship")
        .collect::<Vec<_>>();
    assert_eq!(unreachable.len(), 24);
    let unreachable_domain = unreachable
        .iter()
        .map(|case| {
            let attacker = case.initial.attacker.expect("unreachable effect attacker");
            assert!(case.initial.friendship[attacker.index()].as_source_u8().is_some());
            assert_eq!(
                case.expected_error,
                Some(format!(
                    "B_SCR_OP_FRIENDSHIPTODAMAGECALCULATION is reachable only for EFFECT_RETURN/EFFECT_FRUSTRATION, got effect {}",
                    case.initial.current_move_effect,
                ).as_str()),
            );
            (case.initial.current_move_effect, attacker.as_u8())
        })
        .collect::<BTreeSet<_>>();
    let expected_unreachable_domain = BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_UNREACHABLE_EFFECT_DOMAIN
        .into_iter()
        .flat_map(|effect| {
            BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_BATTLER_DOMAIN
                .into_iter()
                .map(move |attacker| (effect, attacker))
        })
        .collect::<BTreeSet<_>>();
    assert_eq!(unreachable_domain, expected_unreachable_domain);
}

#[test]
fn registration_opcode_dispatcher_and_zero_operand_shape_match_canonical_typescript() {
    assert_eq!(BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_REGISTRATION_CASES.len(), 6);
    for case in BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_REGISTRATION_CASES {
        execute_registration_case(&case);
    }
    let canonical = BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_REGISTRATION_CASES
        .iter()
        .find(|case| case.label == "canonical")
        .expect("canonical registration vector");
    let instruction = canonical
        .expected
        .expect("canonical registration must succeed");
    assert_eq!(
        instruction.opcode_id,
        BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_OPCODE
    );
    assert_eq!(instruction.opcode_id, GENERATED_OPCODE);
    assert_eq!(instruction.operand_count, 0);

    // The TypeScript registration intentionally uses opcodeName to select the
    // instruction, then keys its handler map by the selected opcode id without
    // separately comparing that id to 0xB6. This awkward-looking successful
    // vector is a faithful validation-order ratchet, not a native extension.
    let alternate = BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_REGISTRATION_CASES
        .iter()
        .find(|case| case.label == "wrong_opcode")
        .expect("alternate-id registration vector");
    assert_eq!(
        alternate
            .expected
            .expect("canonical TS accepts selected id")
            .opcode_id,
        0xb5
    );
}

fn execute_registration_case(case: &BattleScriptFriendshiptodamageRegistrationCase) {
    let native_instructions = case
        .instructions
        .iter()
        .copied()
        .map(instruction)
        .collect::<Vec<_>>();
    match (
        validate_battle_script_friendshiptodamage_registration(&native_instructions),
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
        BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_VECTOR_CORPUS_SHA256,
        "458a2c01c29322f17bee7ad9bb3d6f478c77a722e87aed272737d328c357dbaa",
    );
    assert_eq!(
        BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_VECTOR_CORPUS_BYTES,
        878_850
    );
    assert_eq!(BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_CASES.len(), 1437);
    assert_eq!(
        BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_DOMAIN_CENSUS,
        [
            ("battler-slots", 4),
            ("attacker-role-values", 4),
            ("optional-role-values", 5),
            ("retained-selector-role-fields", 4),
            ("attacker-selector-cross-product", 500),
            ("friendship-source-u8-values", 256),
            ("allowed-effect-values", 2),
            ("unreachable-effect-sample-values", 6),
            ("invalid-friendship-runtime-number-values", 9),
            ("dynamic-base-power-u16-values", 65_536),
            ("dynamic-base-power-edge-values", 22),
            ("application-count-values", 2),
            ("registration-shape-cases", 6),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_CATEGORY_CENSUS,
        [
            ("all-attacker-and-selector-role-combinations", 500),
            ("every-source-u8-return-frustration", 512),
            ("invalid-friendship-before-effect-reachability", 36),
            ("missing-attacker-before-friendship-and-effect-reads", 125),
            ("prior-dynamic-base-power-overwrite-matrix", 176),
            ("repeated-application-idempotence", 64),
            ("unreachable-effect-with-valid-source-friendship", 24),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_REGISTRATION_BRANCH_CENSUS,
        [
            ("concrete-start-cardinality", 2),
            ("invalid-instruction-shape", 2),
            ("registered", 2),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_BRANCH_CENSUS
            .iter()
            .map(|(_, count)| count)
            .sum::<usize>(),
        BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_CASES.len(),
    );
    assert_eq!(
        BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_BRANCH_CENSUS
            .iter()
            .find(|(branch, _)| *branch == "missing-attacker-role"),
        Some(&("missing-attacker-role", 125)),
    );
    assert_eq!(
        BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_BRANCH_CENSUS
            .iter()
            .find(|(branch, _)| *branch == "invalid-friendship"),
        Some(&("invalid-friendship", 36)),
    );
    assert_eq!(
        BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_BRANCH_CENSUS
            .iter()
            .find(|(branch, _)| *branch == "unreachable-effect"),
        Some(&("unreachable-effect", 24)),
    );
    assert_eq!(BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_BATTLER_COUNT, 4);
    assert_eq!(
        BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_BATTLERS.map(BattleScriptFriendshiptodamageBattler::as_u8),
        BATTLE_SCRIPT_FRIENDSHIPTODAMAGE_BATTLER_DOMAIN,
    );
}
