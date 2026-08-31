//! Canonical-TypeScript differential and registration ratchets for
//! `battleScriptTryinfatuatingOpcode.ts`.
//!
//! Regenerate with `node --experimental-strip-types
//! core-rs/tools/gen-battle-script-tryinfatuating-vectors.mjs`.

use factory_core::battle_script_ai_reveal::BattleScriptAiRevealRules;
use factory_core::battle_script_tryinfatuating::{
    apply_battle_script_tryinfatuating, register_battle_script_tryinfatuating_handler,
    BattleScriptTryinfatuatingBattlerState, BattleScriptTryinfatuatingControl,
    BattleScriptTryinfatuatingRegistrationError, BattleScriptTryinfatuatingRoles,
    BattleScriptTryinfatuatingRules, BATTLE_SCRIPT_ABILITY_OBLIVIOUS,
    BATTLE_SCRIPT_STATUS2_INFATUATION, BATTLE_SCRIPT_TRYINFATUATING_OPCODE_NAME,
};
use factory_core::battle_script_tryinfatuating_vectors_gen::{
    BattleScriptTryinfatuatingRegistrationVectorCase, BattleScriptTryinfatuatingVectorBattlerState,
    BattleScriptTryinfatuatingVectorState, BATTLE_SCRIPT_TRYINFATUATING_BRANCH_CENSUS,
    BATTLE_SCRIPT_TRYINFATUATING_CASES, BATTLE_SCRIPT_TRYINFATUATING_CATEGORY_CENSUS,
    BATTLE_SCRIPT_TRYINFATUATING_DOMAIN_CENSUS, BATTLE_SCRIPT_TRYINFATUATING_REGISTRATION_CASES,
    BATTLE_SCRIPT_TRYINFATUATING_VECTOR_CORPUS_SHA256,
};

fn battler(
    value: BattleScriptTryinfatuatingVectorBattlerState,
) -> BattleScriptTryinfatuatingBattlerState {
    BattleScriptTryinfatuatingBattlerState {
        species: value.species,
        personality: value.personality,
        ability: value.ability,
        status2: value.status2,
    }
}

fn rules(value: BattleScriptTryinfatuatingVectorState) -> BattleScriptTryinfatuatingRules {
    BattleScriptTryinfatuatingRules {
        battlers: value.battlers.map(battler),
        selector_roles: BattleScriptTryinfatuatingRoles {
            attacker: value.attacker,
            target: value.target,
        },
        last_used_ability: value.last_used_ability,
        ai_reveal: BattleScriptAiRevealRules {
            ai_observed_ability_ids: value.ai_observed_ability_ids,
            ai_observed_item_effects: [0; 4],
        },
    }
}

fn vector_state(value: BattleScriptTryinfatuatingRules) -> BattleScriptTryinfatuatingVectorState {
    BattleScriptTryinfatuatingVectorState {
        battlers: value
            .battlers
            .map(|battler| BattleScriptTryinfatuatingVectorBattlerState {
                species: battler.species,
                personality: battler.personality,
                ability: battler.ability,
                status2: battler.status2,
            }),
        attacker: value.selector_roles.attacker,
        target: value.selector_roles.target,
        last_used_ability: value.last_used_ability,
        ai_observed_ability_ids: value.ai_reveal.ai_observed_ability_ids,
    }
}

#[test]
fn complete_projected_outputs_controls_errors_and_immutability_match_canonical_typescript() {
    assert_eq!(BATTLE_SCRIPT_TRYINFATUATING_CASES.len(), 953);
    for (case_index, case) in BATTLE_SCRIPT_TRYINFATUATING_CASES.iter().enumerate() {
        let input = rules(case.initial);
        let before = input;

        match (
            apply_battle_script_tryinfatuating(case.instruction, &input),
            case.expected,
            case.expected_error,
        ) {
            (Ok(outcome), Some(expected), None) => {
                assert_eq!(
                    outcome.control,
                    case.control.expect("success case must carry a control"),
                    "case {case_index} {} control",
                    case.label
                );
                assert_eq!(
                    vector_state(outcome.rules),
                    expected,
                    "case {case_index} {} complete projected state",
                    case.label
                );
                assert_only_expected_fields_changed(case_index, case, before, outcome.rules);
            }
            (Err(actual), None, Some(expected)) => {
                assert_eq!(
                    actual.to_string(),
                    expected,
                    "case {case_index} {} exact error",
                    case.label
                );
            }
            (actual, expected, expected_error) => panic!(
                "case {case_index} {} generated outcome disagrees: actual={actual:?}, expected={expected:?}, expected_error={expected_error:?}",
                case.label
            ),
        }

        assert_eq!(
            input, before,
            "case {case_index} {} mutated rules input",
            case.label
        );
    }
}

fn assert_only_expected_fields_changed(
    case_index: usize,
    case: &factory_core::battle_script_tryinfatuating_vectors_gen::BattleScriptTryinfatuatingVectorCase,
    before: BattleScriptTryinfatuatingRules,
    after: BattleScriptTryinfatuatingRules,
) {
    assert_eq!(
        after.selector_roles, before.selector_roles,
        "case {case_index} {} changed selector roles",
        case.label
    );

    let target_ability_before = case
        .initial
        .target
        .map(|target| before.battlers[target.index()].ability);
    let is_oblivious = target_ability_before == Some(BATTLE_SCRIPT_ABILITY_OBLIVIOUS);

    if is_oblivious {
        assert_eq!(
            after.last_used_ability, BATTLE_SCRIPT_ABILITY_OBLIVIOUS,
            "case {case_index} {} did not set lastUsedAbility on Oblivious",
            case.label
        );
        for index in 0..4 {
            assert_eq!(
                after.battlers[index], before.battlers[index],
                "case {case_index} {} Oblivious branch changed a battler field",
                case.label
            );
        }
    } else {
        assert_eq!(
            after.last_used_ability, before.last_used_ability,
            "case {case_index} {} non-Oblivious branch changed lastUsedAbility",
            case.label
        );
        assert_eq!(
            after.ai_reveal, before.ai_reveal,
            "case {case_index} {} non-Oblivious branch changed ai_reveal",
            case.label
        );
        for index in 0..4 {
            let target = case.initial.target;
            if target.map(|t| t.index()) == Some(index)
                && matches!(
                    case.control,
                    Some(BattleScriptTryinfatuatingControl::Advance)
                )
            {
                let attacker = case.initial.attacker.expect("advance implies an attacker");
                assert_eq!(
                    after.battlers[index].status2,
                    before.battlers[index].status2 | (1u32 << (16 + attacker.index())),
                    "case {case_index} {} target status2 not OR'd with the attacker bit",
                    case.label
                );
                assert_eq!(
                    after.battlers[index].species, before.battlers[index].species,
                    "case {case_index} {} target species changed",
                    case.label
                );
                assert_eq!(
                    after.battlers[index].personality, before.battlers[index].personality,
                    "case {case_index} {} target personality changed",
                    case.label
                );
                assert_eq!(
                    after.battlers[index].ability, before.battlers[index].ability,
                    "case {case_index} {} target ability changed",
                    case.label
                );
            } else {
                assert_eq!(
                    after.battlers[index], before.battlers[index],
                    "case {case_index} {} battler {index} changed unexpectedly",
                    case.label
                );
            }
        }
    }
}

#[test]
fn registration_binds_first_match_and_matches_canonical_typescript() {
    assert_eq!(BATTLE_SCRIPT_TRYINFATUATING_REGISTRATION_CASES.len(), 3);
    for case in BATTLE_SCRIPT_TRYINFATUATING_REGISTRATION_CASES {
        execute_registration_case(&case);
    }
}

fn execute_registration_case(case: &BattleScriptTryinfatuatingRegistrationVectorCase) {
    let instructions_present = case.expected_opcode_id.is_some();
    let opcode_name = if instructions_present {
        BATTLE_SCRIPT_TRYINFATUATING_OPCODE_NAME
    } else {
        "B_SCR_OP_RUST_NOISE"
    };
    // Registration only inspects `opcode_name`/`opcode_id`; a minimal
    // stand-in instruction is sufficient (matching the canonical TS
    // factory's own shape-agnostic `.find`).
    use factory_core::battle_script_tryinfatuating::BattleScriptTryinfatuatingInstruction;
    let noise = BattleScriptTryinfatuatingInstruction {
        opcode_name: "B_SCR_OP_RUST_NOISE",
        program_counter: 0,
        opcode_id: 0,
        dispatcher: "Cmd_other",
        operands: &[],
        resolved_oblivious_target: None,
        resolved_fail_target: None,
    };
    let target = BattleScriptTryinfatuatingInstruction {
        opcode_name,
        program_counter: 1118,
        opcode_id: 0x97,
        dispatcher: "Cmd_tryinfatuating",
        operands: &[],
        resolved_oblivious_target: None,
        resolved_fail_target: None,
    };
    let instructions: Vec<_> = if case.label == "duplicate_first_wins" {
        vec![target, target, noise]
    } else {
        vec![noise, target]
    };

    match (
        register_battle_script_tryinfatuating_handler(&instructions),
        case.expected_opcode_id,
        case.expected_error,
    ) {
        (Ok(actual), Some(expected), None) => {
            assert_eq!(actual.opcode_id, expected, "{}", case.label)
        }
        (Err(BattleScriptTryinfatuatingRegistrationError::NotFound), None, Some(expected)) => {
            assert_eq!(
                BattleScriptTryinfatuatingRegistrationError::NotFound.to_string(),
                expected,
                "{}",
                case.label
            );
        }
        (actual, expected_opcode, expected_error) => panic!(
            "{} registration mismatch: actual={actual:?}, expected_opcode={expected_opcode:?}, expected_error={expected_error:?}",
            case.label
        ),
    }
}

#[test]
fn gender_profile_matrix_covers_success_and_every_failure_reason() {
    let matrix = BATTLE_SCRIPT_TRYINFATUATING_CASES
        .iter()
        .filter(|case| case.category == "gender-profile-matrix")
        .collect::<Vec<_>>();
    assert_eq!(matrix.len(), 900);
    assert!(matrix
        .iter()
        .any(|case| case.control == Some(BattleScriptTryinfatuatingControl::Advance)));
    assert!(matrix.iter().any(|case| matches!(
        case.control,
        Some(BattleScriptTryinfatuatingControl::Jump { .. })
    )));

    let status2 = BATTLE_SCRIPT_TRYINFATUATING_CASES
        .iter()
        .filter(|case| case.category == "status2-infatuation-sweep")
        .collect::<Vec<_>>();
    assert_eq!(status2.len(), 24);
    assert!(status2.iter().all(|case| matches!(
        case.control,
        Some(BattleScriptTryinfatuatingControl::Jump { .. })
    ) || matches!(
        case.control,
        Some(BattleScriptTryinfatuatingControl::Advance)
    )));
    for case in &status2 {
        let target = case.initial.target.expect("status2 sweep has a target");
        let target_status2_before = case.initial.battlers[target.index()].status2;
        if target_status2_before & BATTLE_SCRIPT_STATUS2_INFATUATION != 0 {
            assert!(
                matches!(
                    case.control,
                    Some(BattleScriptTryinfatuatingControl::Jump { .. })
                ),
                "{} must fail when already infatuated",
                case.label
            );
        }
    }

    let ability = BATTLE_SCRIPT_TRYINFATUATING_CASES
        .iter()
        .filter(|case| case.category == "ability-oblivious-sweep")
        .collect::<Vec<_>>();
    assert_eq!(ability.len(), 24);
    for case in &ability {
        let target = case.initial.target.expect("ability sweep has a target");
        let target_ability = case.initial.battlers[target.index()].ability;
        if target_ability == BATTLE_SCRIPT_ABILITY_OBLIVIOUS {
            let expected = case
                .expected
                .expect("oblivious always succeeds with a jump");
            assert_eq!(expected.last_used_ability, BATTLE_SCRIPT_ABILITY_OBLIVIOUS);
            assert_eq!(
                expected.ai_observed_ability_ids[target.index()],
                BATTLE_SCRIPT_ABILITY_OBLIVIOUS
            );
        }
    }
}

#[test]
fn corpus_censuses_and_hash_are_pinned() {
    assert_eq!(
        BATTLE_SCRIPT_TRYINFATUATING_DOMAIN_CENSUS,
        [
            ("source-battler-slots", 4),
            ("topology-variants", 2),
            ("role-pair-variants", 4),
            ("gender-profile-variants", 15),
            ("status2-variants", 6),
            ("ability-variants", 3),
            ("ai-observed-variants", 2),
            ("registration-cases", 3),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYINFATUATING_CATEGORY_CENSUS,
        [
            ("ability-oblivious-sweep", 24),
            ("gender-profile-matrix", 900),
            ("missing-role", 2),
            ("status2-infatuation-sweep", 24),
            ("unknown-species", 2),
            ("unresolved-fail-target", 1),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYINFATUATING_BRANCH_CENSUS,
        [
            ("advance", 384),
            ("jump", 564),
            ("missing-role", 2),
            ("unknown-species", 2),
            ("unresolved-fail-target", 1),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYINFATUATING_VECTOR_CORPUS_SHA256,
        "74da7fe4ce04d2721a87ca45021bcc5f9639a4506840a939e8f59a4970b05a81"
    );
}
