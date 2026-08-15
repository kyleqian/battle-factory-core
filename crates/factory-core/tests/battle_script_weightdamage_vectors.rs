//! Differential ratchet for src/engine/battleScriptWeightDamageOpcode.ts.
//! The checked-in corpus is generated only by executing canonical TypeScript:
//!
//! node --experimental-strip-types core-rs/tools/gen-battle-script-weightdamage-vectors.mjs

use std::collections::BTreeSet;

use factory_core::battle_script_weightdamage::{
    apply_battle_script_weightdamage, low_kick_power_for_weight, source_species_weight_hectograms,
    validate_battle_script_weightdamage_registration, BattleScriptWeightdamageBattler,
    BattleScriptWeightdamageBattlerState, BattleScriptWeightdamageControl,
    BattleScriptWeightdamageInstruction, BattleScriptWeightdamageRoles,
    BattleScriptWeightdamageRules, BATTLE_SCRIPT_LOW_KICK_HEAVY_POWER,
    BATTLE_SCRIPT_LOW_KICK_WEIGHT_THRESHOLDS, BATTLE_SCRIPT_WEIGHTDAMAGE_BATTLERS,
    BATTLE_SCRIPT_WEIGHTDAMAGE_BATTLER_COUNT, BATTLE_SCRIPT_WEIGHTDAMAGE_OPCODE,
};
use factory_core::battle_script_weightdamage_vectors_gen::{
    BattleScriptWeightdamageRegistrationCase, BattleScriptWeightdamageVectorCase,
    BattleScriptWeightdamageVectorInstruction, BattleScriptWeightdamageVectorState,
    BATTLE_SCRIPT_WEIGHTDAMAGE_BATTLER_DOMAIN, BATTLE_SCRIPT_WEIGHTDAMAGE_BRANCH_CENSUS,
    BATTLE_SCRIPT_WEIGHTDAMAGE_CASES, BATTLE_SCRIPT_WEIGHTDAMAGE_CATEGORY_CENSUS,
    BATTLE_SCRIPT_WEIGHTDAMAGE_DOMAIN_CENSUS,
    BATTLE_SCRIPT_WEIGHTDAMAGE_DYNAMIC_BASE_POWER_EDGE_DOMAIN,
    BATTLE_SCRIPT_WEIGHTDAMAGE_GENERATED_OUTPUT_LIMIT_BYTES, BATTLE_SCRIPT_WEIGHTDAMAGE_LEGACY_IDS,
    BATTLE_SCRIPT_WEIGHTDAMAGE_LOW_KICK_POWERS, BATTLE_SCRIPT_WEIGHTDAMAGE_OPTIONAL_BATTLER_DOMAIN,
    BATTLE_SCRIPT_WEIGHTDAMAGE_REGISTRATION_BRANCH_CENSUS,
    BATTLE_SCRIPT_WEIGHTDAMAGE_REGISTRATION_CASES, BATTLE_SCRIPT_WEIGHTDAMAGE_SCALAR_BRANCH_CENSUS,
    BATTLE_SCRIPT_WEIGHTDAMAGE_SCALAR_CASES, BATTLE_SCRIPT_WEIGHTDAMAGE_SCALAR_CATEGORY_CENSUS,
    BATTLE_SCRIPT_WEIGHTDAMAGE_THRESHOLD_NEIGHBORS, BATTLE_SCRIPT_WEIGHTDAMAGE_VECTOR_CORPUS_BYTES,
    BATTLE_SCRIPT_WEIGHTDAMAGE_VECTOR_CORPUS_SHA256,
};

fn rules(value: BattleScriptWeightdamageVectorState) -> BattleScriptWeightdamageRules {
    BattleScriptWeightdamageRules {
        battlers: value
            .species
            .map(|species| BattleScriptWeightdamageBattlerState { species }),
        dynamic_base_power: value.dynamic_base_power,
        selector_roles: BattleScriptWeightdamageRoles {
            attacker: value.attacker,
            target: value.target,
            effect_battler: value.effect_battler,
            fainted: value.fainted,
        },
    }
}

fn vector_state(value: BattleScriptWeightdamageRules) -> BattleScriptWeightdamageVectorState {
    BattleScriptWeightdamageVectorState {
        species: value.battlers.map(|battler| battler.species),
        dynamic_base_power: value.dynamic_base_power,
        attacker: value.selector_roles.attacker,
        target: value.selector_roles.target,
        effect_battler: value.selector_roles.effect_battler,
        fainted: value.selector_roles.fainted,
    }
}

fn instruction(
    value: BattleScriptWeightdamageVectorInstruction,
) -> BattleScriptWeightdamageInstruction<'static> {
    BattleScriptWeightdamageInstruction {
        opcode_name: value.opcode_name,
        program_counter: value.program_counter,
        opcode_id: value.opcode_id,
        dispatcher: value.dispatcher,
        operand_count: value.operand_count,
    }
}

#[test]
fn canonical_handler_outputs_controls_errors_and_input_immutability_match() {
    assert_eq!(BATTLE_SCRIPT_WEIGHTDAMAGE_CASES.len(), 1132);
    for (case_index, case) in BATTLE_SCRIPT_WEIGHTDAMAGE_CASES.iter().enumerate() {
        execute_case(case_index, case);
    }
}

fn execute_case(case_index: usize, case: &BattleScriptWeightdamageVectorCase) {
    let input = rules(case.initial);
    let before = input;
    let mut current = input;
    let mut controls = Vec::new();
    let mut error = None;

    for application in 0..case.applications {
        let prior = current;
        match apply_battle_script_weightdamage(&current) {
            Ok(outcome) => {
                controls.push(outcome.control);
                assert_transition_shape(case_index, case, application, prior, outcome);
                current = outcome.rules;
            }
            Err(actual) => {
                error = Some(actual.to_string());
                break;
            }
        }
    }

    assert_eq!(
        input, before,
        "case {case_index} {}: native transformation mutated input",
        case.label,
    );
    match (error, case.expected, case.expected_error) {
        (None, Some(expected), None) => {
            assert_eq!(
                controls.as_slice(),
                case.controls,
                "case {case_index} {}: canonical controls",
                case.label,
            );
            assert_eq!(
                controls.len(),
                usize::from(case.applications),
                "case {case_index} {}: sequence stopped early",
                case.label,
            );
            assert_eq!(
                vector_state(current),
                expected,
                "case {case_index} {}: complete canonical projection",
                case.label,
            );
        }
        (Some(actual), None, Some(expected)) => {
            assert!(
                controls.is_empty(),
                "case {case_index} {}: errors must not emit controls",
                case.label,
            );
            assert_eq!(
                actual, expected,
                "case {case_index} {}: exact canonical ordered error",
                case.label,
            );
        }
        (actual, expected, expected_error) => panic!(
            "case {case_index} {}: generated/native shape mismatch: error={actual:?} expected={expected:?} expected_error={expected_error:?}",
            case.label,
        ),
    }
}

fn assert_transition_shape(
    case_index: usize,
    case: &BattleScriptWeightdamageVectorCase,
    application: u8,
    prior: BattleScriptWeightdamageRules,
    outcome: factory_core::battle_script_weightdamage::BattleScriptWeightdamageOutcome,
) {
    assert_eq!(
        outcome.control,
        BattleScriptWeightdamageControl::Advance,
        "case {case_index} {} application {application}: command must advance",
        case.label,
    );
    let target = prior.selector_roles.target.unwrap_or_else(|| {
        panic!(
            "case {case_index} {} application {application}: successful case has no target",
            case.label,
        )
    });
    let species = prior.battlers[target.index()].species;
    let expected_power = low_kick_power_for_weight(
        source_species_weight_hectograms(species.into()).unwrap_or_else(|error| {
            panic!(
                "case {case_index} {} application {application}: legal catalog species {species} failed: {error}",
                case.label,
            )
        })
        .into(),
    )
    .unwrap_or_else(|error| {
        panic!(
            "case {case_index} {} application {application}: legal catalog weight failed: {error}",
            case.label,
        )
    });
    assert_eq!(
        outcome.rules.battlers, prior.battlers,
        "case {case_index} {} application {application}: changed species/sibling projection",
        case.label,
    );
    assert_eq!(
        outcome.rules.selector_roles, prior.selector_roles,
        "case {case_index} {} application {application}: changed selector aliases",
        case.label,
    );
    assert_eq!(
        outcome.rules.dynamic_base_power, expected_power,
        "case {case_index} {} application {application}: did not overwrite only dynamic power",
        case.label,
    );
}

#[test]
fn every_source_species_row_legacy_null_and_out_of_catalog_target_paths_are_retained() {
    let catalog = BATTLE_SCRIPT_WEIGHTDAMAGE_CASES
        .iter()
        .filter(|case| case.category == "every-source-species-catalog-row")
        .collect::<Vec<_>>();
    assert_eq!(catalog.len(), 411);
    let ids = catalog
        .iter()
        .map(|case| {
            let target = case.initial.target.expect("catalog case has target");
            case.initial.species[target.index()]
        })
        .collect::<BTreeSet<_>>();
    assert_eq!(ids, (1_u16..=411).collect());
    let legacy = catalog
        .iter()
        .filter_map(|case| {
            case.expected_error.map(|_| {
                let target = case.initial.target.expect("legacy catalog target");
                case.initial.species[target.index()]
            })
        })
        .collect::<BTreeSet<_>>();
    assert_eq!(
        legacy,
        BATTLE_SCRIPT_WEIGHTDAMAGE_LEGACY_IDS.into_iter().collect(),
    );
    assert_eq!(
        catalog
            .iter()
            .filter(|case| case.expected.is_some())
            .count(),
        386,
    );

    let outside = BATTLE_SCRIPT_WEIGHTDAMAGE_CASES
        .iter()
        .filter(|case| case.category == "out-of-catalog-target-species")
        .collect::<Vec<_>>();
    assert_eq!(outside.len(), 12);
    for target in BATTLE_SCRIPT_WEIGHTDAMAGE_BATTLER_DOMAIN {
        let observed = outside
            .iter()
            .filter(|case| {
                case.initial
                    .target
                    .map(BattleScriptWeightdamageBattler::as_u8)
                    == Some(target)
            })
            .map(|case| case.initial.species[usize::from(target)])
            .collect::<BTreeSet<_>>();
        assert_eq!(observed, [0_u16, 412, u16::MAX].into_iter().collect());
    }
}

#[test]
fn all_target_aliases_optional_selector_matrix_prior_power_edges_and_repeats_are_pinned() {
    let matrix = BATTLE_SCRIPT_WEIGHTDAMAGE_CASES
        .iter()
        .filter(|case| case.category == "all-target-and-optional-selector-role-combinations")
        .collect::<Vec<_>>();
    assert_eq!(matrix.len(), 500);
    let observed = matrix
        .iter()
        .map(|case| {
            (
                case.initial
                    .target
                    .map(BattleScriptWeightdamageBattler::as_u8),
                case.initial
                    .attacker
                    .map(BattleScriptWeightdamageBattler::as_u8),
                case.initial
                    .effect_battler
                    .map(BattleScriptWeightdamageBattler::as_u8),
                case.initial
                    .fainted
                    .map(BattleScriptWeightdamageBattler::as_u8),
            )
        })
        .collect::<BTreeSet<_>>();
    let expected = BATTLE_SCRIPT_WEIGHTDAMAGE_BATTLER_DOMAIN
        .into_iter()
        .flat_map(|target| {
            BATTLE_SCRIPT_WEIGHTDAMAGE_OPTIONAL_BATTLER_DOMAIN
                .into_iter()
                .flat_map(move |attacker| {
                    BATTLE_SCRIPT_WEIGHTDAMAGE_OPTIONAL_BATTLER_DOMAIN
                        .into_iter()
                        .flat_map(move |effect_battler| {
                            BATTLE_SCRIPT_WEIGHTDAMAGE_OPTIONAL_BATTLER_DOMAIN
                                .into_iter()
                                .map(move |fainted| {
                                    (Some(target), attacker, effect_battler, fainted)
                                })
                        })
                })
        })
        .collect::<BTreeSet<_>>();
    assert_eq!(observed, expected);

    let prior = BATTLE_SCRIPT_WEIGHTDAMAGE_CASES
        .iter()
        .filter(|case| case.category == "prior-dynamic-base-power-overwrite-matrix")
        .collect::<Vec<_>>();
    assert_eq!(prior.len(), 60);
    for target in BATTLE_SCRIPT_WEIGHTDAMAGE_BATTLER_DOMAIN {
        let values = prior
            .iter()
            .filter(|case| {
                case.initial
                    .target
                    .map(BattleScriptWeightdamageBattler::as_u8)
                    == Some(target)
            })
            .map(|case| case.initial.dynamic_base_power)
            .collect::<BTreeSet<_>>();
        assert_eq!(
            values,
            BATTLE_SCRIPT_WEIGHTDAMAGE_DYNAMIC_BASE_POWER_EDGE_DOMAIN
                .into_iter()
                .collect(),
            "target {target}: every prior u16 dynamic power edge",
        );
    }

    let repeats = BATTLE_SCRIPT_WEIGHTDAMAGE_CASES
        .iter()
        .filter(|case| case.category == "repeated-application-idempotence")
        .collect::<Vec<_>>();
    assert_eq!(repeats.len(), 24);
    assert!(repeats.iter().all(|case| {
        case.applications == 2
            && case.controls
                == [
                    BattleScriptWeightdamageControl::Advance,
                    BattleScriptWeightdamageControl::Advance,
                ]
    }));

    let missing = BATTLE_SCRIPT_WEIGHTDAMAGE_CASES
        .iter()
        .filter(|case| case.category == "missing-target-before-species-lookup")
        .collect::<Vec<_>>();
    assert_eq!(missing.len(), 125);
    assert!(missing.iter().all(|case| {
        case.initial.target.is_none()
            && case.expected_error == Some("Battle Script hit-chain command requires a target role")
    }));
    let selected = missing
        .iter()
        .map(|case| {
            case.initial
                .species
                .iter()
                .copied()
                .max()
                .expect("four cells")
        })
        .collect::<BTreeSet<_>>();
    assert!(selected.contains(&u16::MAX));
}

#[test]
fn direct_canonical_scalar_helpers_threshold_neighbors_and_malformed_inputs_match() {
    assert_eq!(BATTLE_SCRIPT_WEIGHTDAMAGE_SCALAR_CASES.len(), 66);
    for case in BATTLE_SCRIPT_WEIGHTDAMAGE_SCALAR_CASES {
        let actual = match case.kind {
            "weight" => low_kick_power_for_weight(case.number),
            "species" => source_species_weight_hectograms(case.number),
            kind => panic!("{}: unknown scalar kind {kind}", case.label),
        };
        match (actual, case.expected, case.expected_error) {
            (Ok(value), Some(expected), None) => {
                assert_eq!(value, expected, "{}: canonical scalar output", case.label)
            }
            (Err(error), None, Some(expected)) => {
                assert_eq!(error.to_string(), expected, "{}: canonical scalar error", case.label)
            }
            (actual, expected, expected_error) => panic!(
                "{}: scalar shape mismatch actual={actual:?} expected={expected:?} error={expected_error:?}",
                case.label,
            ),
        }
    }
    let threshold_bits = BATTLE_SCRIPT_WEIGHTDAMAGE_SCALAR_CASES
        .iter()
        .filter(|case| case.category == "all-strict-threshold-neighbors")
        .map(|case| case.number.to_bits())
        .collect::<BTreeSet<_>>();
    assert_eq!(
        threshold_bits.len(),
        BATTLE_SCRIPT_WEIGHTDAMAGE_THRESHOLD_NEIGHBORS.len()
    );
    assert_eq!(
        BATTLE_SCRIPT_LOW_KICK_WEIGHT_THRESHOLDS,
        [(100, 20), (250, 40), (500, 60), (1000, 80), (2000, 100),],
    );
    assert_eq!(BATTLE_SCRIPT_LOW_KICK_HEAVY_POWER, 120);
    assert_eq!(
        BATTLE_SCRIPT_WEIGHTDAMAGE_LOW_KICK_POWERS,
        [20, 40, 60, 80, 100, 120]
    );
}

#[test]
fn registration_filter_cardinality_and_full_shape_match_canonical_typescript() {
    assert_eq!(BATTLE_SCRIPT_WEIGHTDAMAGE_REGISTRATION_CASES.len(), 7);
    for case in BATTLE_SCRIPT_WEIGHTDAMAGE_REGISTRATION_CASES {
        execute_registration_case(case);
    }
}

fn execute_registration_case(case: BattleScriptWeightdamageRegistrationCase) {
    let input = case
        .instructions
        .iter()
        .copied()
        .map(instruction)
        .collect::<Vec<_>>();
    match (
        validate_battle_script_weightdamage_registration(&input),
        case.expected,
        case.expected_error,
    ) {
        (Ok(actual), Some(expected), None) => {
            assert_eq!(actual.opcode_name, expected.opcode_name, "{}: opcode name", case.label);
            assert_eq!(
                actual.program_counter, expected.program_counter,
                "{}: program counter", case.label,
            );
            assert_eq!(actual.opcode_id, expected.opcode_id, "{}: opcode ID", case.label);
            assert_eq!(actual.dispatcher, expected.dispatcher, "{}: dispatcher", case.label);
            assert_eq!(
                actual.operand_count, expected.operand_count,
                "{}: operand count", case.label,
            );
            assert_eq!(actual.opcode_id, BATTLE_SCRIPT_WEIGHTDAMAGE_OPCODE);
        }
        (Err(actual), None, Some(expected)) => assert_eq!(
            actual.to_string(),
            expected,
            "{}: exact registration error",
            case.label,
        ),
        (actual, expected, expected_error) => panic!(
            "{}: registration shape mismatch actual={actual:?} expected={expected:?} expected_error={expected_error:?}",
            case.label,
        ),
    }
}

#[test]
fn exact_corpus_hash_bytes_all_censuses_and_generated_output_bound_are_pinned() {
    assert_eq!(
        BATTLE_SCRIPT_WEIGHTDAMAGE_VECTOR_CORPUS_SHA256,
        "5c970efa033a8fc982e81f962ed1372cf63166d1c842346445c51d2c7904fb6c",
    );
    assert_eq!(BATTLE_SCRIPT_WEIGHTDAMAGE_VECTOR_CORPUS_BYTES, 490486);
    assert_eq!(
        BATTLE_SCRIPT_WEIGHTDAMAGE_DOMAIN_CENSUS,
        [
            ("battler-slots", 4),
            ("target-role-values", 4),
            ("optional-selector-role-values", 5),
            ("target-optional-selector-cross-product", 500),
            ("source-species-catalog-rows", 411),
            ("source-species-with-weight-rows", 386),
            ("legacy-compatibility-null-weight-rows", 25),
            ("out-of-catalog-target-species-values", 3),
            ("low-kick-strict-upper-bound-count", 5),
            ("low-kick-power-band-count", 6),
            ("threshold-neighbor-weight-values", 23),
            ("broad-safe-weight-values", 23),
            ("malformed-direct-weight-values", 7),
            ("direct-species-helper-values", 13),
            ("dynamic-base-power-u16-values", 65536),
            ("dynamic-base-power-edge-values", 15),
            ("application-count-values", 2),
            ("registration-shape-cases", 7),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_WEIGHTDAMAGE_CATEGORY_CENSUS,
        [
            ("all-target-and-optional-selector-role-combinations", 500),
            ("every-source-species-catalog-row", 411),
            ("missing-target-before-species-lookup", 125),
            ("out-of-catalog-target-species", 12),
            ("prior-dynamic-base-power-overwrite-matrix", 60),
            ("repeated-application-idempotence", 24),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_WEIGHTDAMAGE_BRANCH_CENSUS,
        [
            ("legacy-compatibility-no-weight", 25),
            ("missing-target-role", 125),
            ("out-of-catalog", 12),
            ("write-power-100-advance", 33),
            ("write-power-120-advance", 208),
            ("write-power-120-then-120-advance", 8),
            ("write-power-20-advance", 189),
            ("write-power-20-then-20-advance", 4),
            ("write-power-40-advance", 173),
            ("write-power-40-then-40-advance", 4),
            ("write-power-60-advance", 178),
            ("write-power-60-then-60-advance", 4),
            ("write-power-80-advance", 165),
            ("write-power-80-then-80-advance", 4),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_WEIGHTDAMAGE_SCALAR_CATEGORY_CENSUS,
        [
            ("all-strict-threshold-neighbors", 23),
            ("broad-nonnegative-safe-integer-domain", 23),
            ("direct-source-species-helper-domain", 13),
            ("malformed-direct-weight-helper-inputs", 7),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_WEIGHTDAMAGE_SCALAR_BRANCH_CENSUS,
        [
            ("species-error", 9),
            ("species-success", 4),
            ("weight-error", 7),
            ("weight-success", 46),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_WEIGHTDAMAGE_REGISTRATION_BRANCH_CENSUS,
        [
            ("concrete-start-cardinality", 3),
            ("invalid-instruction-shape", 3),
            ("registered", 1),
        ],
    );
    let generated = include_bytes!("../src/battle_script_weightdamage_vectors_gen.rs");
    assert!(
        generated.len() <= BATTLE_SCRIPT_WEIGHTDAMAGE_GENERATED_OUTPUT_LIMIT_BYTES,
        "generated vector output {} exceeded {} bytes",
        generated.len(),
        BATTLE_SCRIPT_WEIGHTDAMAGE_GENERATED_OUTPUT_LIMIT_BYTES,
    );
    assert_eq!(generated.len(), 1_327_310);
}

#[test]
fn fixed_source_battler_domain_remains_four_slots() {
    assert_eq!(BATTLE_SCRIPT_WEIGHTDAMAGE_BATTLER_COUNT, 4);
    assert_eq!(
        BATTLE_SCRIPT_WEIGHTDAMAGE_BATTLERS.map(BattleScriptWeightdamageBattler::as_u8),
        BATTLE_SCRIPT_WEIGHTDAMAGE_BATTLER_DOMAIN,
    );
}
