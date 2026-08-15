use std::collections::BTreeSet;

use factory_core::battle_script_snatchsetbattlers::{
    apply_battle_script_snatchsetbattlers, BattleScriptSnatchsetbattlersBattler,
    BattleScriptSnatchsetbattlersControl, BattleScriptSnatchsetbattlersOutcome,
    BattleScriptSnatchsetbattlersRoles, BattleScriptSnatchsetbattlersRules,
    BATTLE_SCRIPT_SNATCHSETBATTLERS_BATTLERS, BATTLE_SCRIPT_SNATCHSETBATTLERS_BATTLER_COUNT,
};
use factory_core::battle_script_snatchsetbattlers_vectors_gen::{
    BattleScriptSnatchsetbattlersVectorCase, BattleScriptSnatchsetbattlersVectorState,
    BATTLE_SCRIPT_SNATCHSETBATTLERS_BATTLER_DOMAIN, BATTLE_SCRIPT_SNATCHSETBATTLERS_BRANCH_CENSUS,
    BATTLE_SCRIPT_SNATCHSETBATTLERS_CASES, BATTLE_SCRIPT_SNATCHSETBATTLERS_CATEGORY_CENSUS,
    BATTLE_SCRIPT_SNATCHSETBATTLERS_DOMAIN_CENSUS,
    BATTLE_SCRIPT_SNATCHSETBATTLERS_OPTIONAL_SELECTOR_DOMAIN,
    BATTLE_SCRIPT_SNATCHSETBATTLERS_VECTOR_CORPUS_SHA256,
};

fn rules(value: BattleScriptSnatchsetbattlersVectorState) -> BattleScriptSnatchsetbattlersRules {
    BattleScriptSnatchsetbattlersRules {
        selector_roles: BattleScriptSnatchsetbattlersRoles {
            attacker: value.attacker,
            target: value.target,
            effect_battler: value.effect_battler,
            fainted: value.fainted,
        },
        scripting_battler: value.scripting_battler,
    }
}

fn vector_state(
    value: BattleScriptSnatchsetbattlersRules,
) -> BattleScriptSnatchsetbattlersVectorState {
    BattleScriptSnatchsetbattlersVectorState {
        attacker: value.selector_roles.attacker,
        target: value.selector_roles.target,
        effect_battler: value.selector_roles.effect_battler,
        fainted: value.selector_roles.fainted,
        scripting_battler: value.scripting_battler,
    }
}

#[test]
fn complete_projected_outputs_controls_exact_errors_and_input_preservation_match_canonical_typescript(
) {
    assert_eq!(BATTLE_SCRIPT_SNATCHSETBATTLERS_CASES.len(), 1622);
    for (case_index, case) in BATTLE_SCRIPT_SNATCHSETBATTLERS_CASES.iter().enumerate() {
        execute_case(case_index, case);
    }
}

fn execute_case(case_index: usize, case: &BattleScriptSnatchsetbattlersVectorCase) {
    let input = rules(case.initial);
    let before = input;
    let mut current = input;
    let mut actual_controls = Vec::new();
    let mut actual_branches = Vec::new();
    let mut actual_error = None;

    for application in 0..case.applications {
        let prior = current;
        match apply_battle_script_snatchsetbattlers(&current) {
            Ok(outcome) => {
                actual_controls.push(outcome.control);
                actual_branches.push(assert_transition_shape(
                    case_index,
                    case,
                    application,
                    prior,
                    outcome,
                ));
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
                actual_branches.as_slice(),
                case.branches,
                "case {case_index} {}: canonical self/non-self sequence",
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
            assert!(
                actual_controls.is_empty(),
                "case {case_index} {}: error must not produce a control result",
                case.label,
            );
            assert!(
                actual_branches.is_empty(),
                "case {case_index} {}: error must not take a success branch",
                case.label,
            );
            assert_eq!(
                error, expected_error,
                "case {case_index} {}: exact canonical role error",
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
    case: &BattleScriptSnatchsetbattlersVectorCase,
    application: u8,
    prior: BattleScriptSnatchsetbattlersRules,
    outcome: BattleScriptSnatchsetbattlersOutcome,
) -> &'static str {
    let original_attacker = prior.selector_roles.attacker.unwrap_or_else(|| {
        panic!(
            "case {case_index} {} application {application}: successful result had no attacker",
            case.label,
        )
    });
    let original_target = prior.selector_roles.target.unwrap_or_else(|| {
        panic!(
            "case {case_index} {} application {application}: successful result had no target",
            case.label,
        )
    });
    let original_scripting_battler = prior.scripting_battler;
    let self_targeted = original_attacker == original_target;

    assert_eq!(
        outcome.control,
        BattleScriptSnatchsetbattlersControl::Advance,
        "case {case_index} {} application {application}: operand-free source opcode must advance",
        case.label,
    );
    assert_eq!(
        outcome.rules.selector_roles.effect_battler,
        Some(original_attacker),
        "case {case_index} {} application {application}: effectBattler must retain original attacker",
        case.label,
    );
    assert_eq!(
        outcome.rules.selector_roles.fainted, prior.selector_roles.fainted,
        "case {case_index} {} application {application}: fainted selector sibling changed",
        case.label,
    );
    assert_eq!(
        outcome.rules.selector_roles.target,
        Some(original_scripting_battler),
        "case {case_index} {} application {application}: target must become original scriptingBattler",
        case.label,
    );
    assert_eq!(
        outcome.rules.selector_roles.attacker,
        Some(if self_targeted {
            original_scripting_battler
        } else {
            original_attacker
        }),
        "case {case_index} {} application {application}: attacker self-target branch result",
        case.label,
    );
    assert_eq!(
        outcome.rules.scripting_battler, original_attacker,
        "case {case_index} {} application {application}: scriptingBattler must become original attacker",
        case.label,
    );

    if self_targeted {
        "self-targeted"
    } else {
        "nonself-targeted"
    }
}

#[test]
fn complete_attacker_target_scripting_effect_and_fainted_matrix_is_covered() {
    let matrix = BATTLE_SCRIPT_SNATCHSETBATTLERS_CASES
        .iter()
        .filter(|case| case.category == "complete-attacker-target-scripting-effect-fainted-matrix")
        .collect::<Vec<_>>();
    assert_eq!(matrix.len(), 1600);

    let role_value = |value: Option<BattleScriptSnatchsetbattlersBattler>| {
        value.map_or(-1_i8, |battler| battler.as_u8() as i8)
    };
    let observed = matrix
        .iter()
        .map(|case| {
            (
                case.initial.attacker.expect("matrix attacker").as_u8(),
                case.initial.target.expect("matrix target").as_u8(),
                case.initial.scripting_battler.as_u8(),
                role_value(case.initial.effect_battler),
                role_value(case.initial.fainted),
            )
        })
        .collect::<BTreeSet<_>>();
    let expected = BATTLE_SCRIPT_SNATCHSETBATTLERS_BATTLER_DOMAIN
        .into_iter()
        .flat_map(|attacker| {
            BATTLE_SCRIPT_SNATCHSETBATTLERS_BATTLER_DOMAIN
                .into_iter()
                .flat_map(move |target| {
                    BATTLE_SCRIPT_SNATCHSETBATTLERS_BATTLER_DOMAIN
                        .into_iter()
                        .flat_map(move |scripting_battler| {
                            BATTLE_SCRIPT_SNATCHSETBATTLERS_OPTIONAL_SELECTOR_DOMAIN
                                .into_iter()
                                .flat_map(move |effect_battler| {
                                    BATTLE_SCRIPT_SNATCHSETBATTLERS_OPTIONAL_SELECTOR_DOMAIN
                                        .into_iter()
                                        .map(move |fainted| {
                                            (
                                                attacker,
                                                target,
                                                scripting_battler,
                                                effect_battler,
                                                fainted,
                                            )
                                        })
                                })
                        })
                })
        })
        .collect::<BTreeSet<_>>();
    assert_eq!(observed, expected);

    let pairs = matrix
        .iter()
        .map(|case| {
            (
                case.initial.attacker.expect("matrix attacker").as_u8(),
                case.initial.target.expect("matrix target").as_u8(),
            )
        })
        .collect::<BTreeSet<_>>();
    assert_eq!(pairs.len(), 16, "all 4x4 attacker-target pairs");
    assert_eq!(
        matrix
            .iter()
            .filter(|case| case.branch == "self-targeted-advance")
            .count(),
        400,
        "all four self-target pairs crossed with scripting/effect/fainted domains",
    );
    assert_eq!(
        matrix
            .iter()
            .filter(|case| case.branch == "nonself-targeted-advance")
            .count(),
        1200,
        "all twelve non-self-target pairs crossed with scripting/effect/fainted domains",
    );
}

#[test]
fn ordered_errors_aliases_and_repeated_branch_transition_are_pinned() {
    let ordered_errors = BATTLE_SCRIPT_SNATCHSETBATTLERS_CASES
        .iter()
        .filter(|case| case.category == "ordered-missing-selector-role-errors")
        .collect::<Vec<_>>();
    assert_eq!(ordered_errors.len(), 3);
    let both_missing = ordered_errors
        .iter()
        .find(|case| case.label == "missing_attacker_precedes_missing_target")
        .expect("doubly missing vector");
    assert_eq!(both_missing.initial.attacker, None);
    assert_eq!(both_missing.initial.target, None);
    assert_eq!(
        both_missing.expected_error,
        Some("Battle Script hit-chain command requires a attacker role"),
    );
    let missing_target = ordered_errors
        .iter()
        .find(|case| case.label == "missing_target_after_attacker_resolution")
        .expect("target-missing vector");
    assert!(missing_target.initial.attacker.is_some());
    assert_eq!(missing_target.initial.target, None);
    assert_eq!(
        missing_target.expected_error,
        Some("Battle Script hit-chain command requires a target role"),
    );

    let aliases = BATTLE_SCRIPT_SNATCHSETBATTLERS_CASES
        .iter()
        .filter(|case| case.category == "explicit-selector-alias-permutations")
        .collect::<Vec<_>>();
    assert_eq!(aliases.len(), 16);
    for battler in BATTLE_SCRIPT_SNATCHSETBATTLERS_BATTLER_DOMAIN {
        let all_alias = aliases
            .iter()
            .find(|case| case.label == format!("alias_all_roles_and_scripting_b{battler}"))
            .expect("all-role alias vector");
        let expected = BATTLE_SCRIPT_SNATCHSETBATTLERS_BATTLERS[usize::from(battler)];
        assert_eq!(all_alias.initial.attacker, Some(expected));
        assert_eq!(all_alias.initial.target, Some(expected));
        assert_eq!(all_alias.initial.effect_battler, Some(expected));
        assert_eq!(all_alias.initial.fainted, Some(expected));
        assert_eq!(all_alias.initial.scripting_battler, expected);
        assert_eq!(all_alias.branches, &["self-targeted"]);
    }

    let repeated_transition = BATTLE_SCRIPT_SNATCHSETBATTLERS_CASES
        .iter()
        .find(|case| case.label == "repeated_nonself_then_self_when_scripting_aliases_attacker")
        .expect("nonself-to-self repeated vector");
    assert_eq!(repeated_transition.applications, 2);
    assert_eq!(
        repeated_transition.controls,
        &[
            BattleScriptSnatchsetbattlersControl::Advance,
            BattleScriptSnatchsetbattlersControl::Advance,
        ],
    );
    assert_eq!(
        repeated_transition.branches,
        &["nonself-targeted", "self-targeted"],
        "the second application must observe the first rebinding",
    );
}

#[test]
fn source_domains_censuses_and_corpus_hash_are_ratchet_pinned() {
    assert_eq!(BATTLE_SCRIPT_SNATCHSETBATTLERS_BATTLER_COUNT, 4);
    assert_eq!(
        BATTLE_SCRIPT_SNATCHSETBATTLERS_BATTLERS.map(|battler| battler.as_u8()),
        BATTLE_SCRIPT_SNATCHSETBATTLERS_BATTLER_DOMAIN,
    );
    assert_eq!(BATTLE_SCRIPT_SNATCHSETBATTLERS_BATTLER_DOMAIN, [0, 1, 2, 3]);
    assert_eq!(
        BATTLE_SCRIPT_SNATCHSETBATTLERS_OPTIONAL_SELECTOR_DOMAIN,
        [-1, 0, 1, 2, 3],
    );
    assert_eq!(
        BATTLE_SCRIPT_SNATCHSETBATTLERS_DOMAIN_CENSUS,
        [
            ("battler-slots", 4),
            ("attacker-role-values", 4),
            ("target-role-values", 4),
            ("optional-attacker-role-values", 5),
            ("optional-target-role-values", 5),
            ("optional-effect-battler-role-values", 5),
            ("optional-fainted-role-values", 5),
            ("scripting-battler-values", 4),
            ("complete-attacker-target-pairs", 16),
            ("self-target-pair-values", 4),
            ("nonself-target-pair-values", 12),
            (
                "complete-attacker-target-scripting-effect-fainted-matrix-cases",
                1600,
            ),
            ("explicit-alias-permutation-cases", 16),
            ("ordered-missing-role-cases", 3),
            ("repeated-application-cases", 3),
            ("application-count-values", 2),
            ("selector-roles-written-by-handler", 3),
            ("preserved-narrow-selector-siblings", 1),
            ("opcode-byte", 237),
            ("opcode-operands", 0),
            ("abi-exports-added", 0),
            ("unsupported-barriers-added", 0),
            ("generated-file-byte-limit-exclusive", 5_000_000),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_SNATCHSETBATTLERS_CATEGORY_CENSUS,
        [
            (
                "complete-attacker-target-scripting-effect-fainted-matrix",
                1600,
            ),
            ("explicit-selector-alias-permutations", 16),
            ("ordered-missing-selector-role-errors", 3),
            ("repeated-application-branch-transitions", 3),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_SNATCHSETBATTLERS_BRANCH_CENSUS,
        [
            ("missing-attacker-role", 2),
            ("missing-target-role", 1),
            ("nonself-targeted-advance", 1208),
            ("nonself-targeted-advance-then-nonself-targeted-advance", 1,),
            ("nonself-targeted-advance-then-self-targeted-advance", 1),
            ("self-targeted-advance", 408),
            ("self-targeted-advance-then-self-targeted-advance", 1),
        ],
    );
    assert_eq!(
        BATTLE_SCRIPT_SNATCHSETBATTLERS_VECTOR_CORPUS_SHA256,
        "53c9f9d8642180e20c6cd2f75e0eb11a1632d52894bb070f2c6342f81bbd517e",
    );
}
