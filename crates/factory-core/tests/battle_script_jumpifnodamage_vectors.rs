//! Canonical-TS differential and registration ratchets for
//! `src/engine/battleScriptJumpifnodamageOpcode.ts`.
//!
//! Regenerate the expected corpus with:
//! `node --experimental-strip-types
//! core-rs/tools/gen-battle-script-jumpifnodamage-vectors.mjs`.

use std::collections::BTreeSet;

use factory_core::battle_script_jumpifnodamage::{
    apply_battle_script_jumpifnodamage, register_battle_script_jumpifnodamage_handler,
    BattleScriptJumpifnodamageBattlerState, BattleScriptJumpifnodamageControl,
    BattleScriptJumpifnodamageExecution, BattleScriptJumpifnodamageOperand,
    BattleScriptJumpifnodamageRegistrationInstruction, BattleScriptJumpifnodamageRoles,
    BattleScriptJumpifnodamageRules, BattleScriptJumpifnodamageSiblings,
    BattleScriptJumpifnodamageSpecialStatus, BATTLE_SCRIPT_JUMPIFNODAMAGE_BATTLERS,
    BATTLE_SCRIPT_JUMPIFNODAMAGE_BATTLER_COUNT,
};
use factory_core::battle_script_jumpifnodamage_vectors_gen::{
    BattleScriptJumpifnodamageVectorBattlerState, BattleScriptJumpifnodamageVectorCase,
    BattleScriptJumpifnodamageVectorRegistrationInstruction,
    BattleScriptJumpifnodamageVectorSiblings, BattleScriptJumpifnodamageVectorState,
    BATTLE_SCRIPT_JUMPIFNODAMAGE_CASES, BATTLE_SCRIPT_JUMPIFNODAMAGE_I32_EDGE_DOMAIN,
    BATTLE_SCRIPT_JUMPIFNODAMAGE_REGISTRATION_CASES,
};

fn battler(
    value: BattleScriptJumpifnodamageVectorBattlerState,
) -> BattleScriptJumpifnodamageBattlerState {
    BattleScriptJumpifnodamageBattlerState {
        protect_physical_dmg: value.protect_physical_dmg,
        protect_physical_battler_id: value.protect_physical_battler_id,
        protect_special_dmg: value.protect_special_dmg,
        protect_special_battler_id: value.protect_special_battler_id,
        special_status: BattleScriptJumpifnodamageSpecialStatus {
            physical_dmg: value.special_status_physical_dmg,
            special_dmg: value.special_status_special_dmg,
            shell_bell_dmg: value.shell_bell_dmg,
        },
        hp: value.hp,
        status2: value.status2,
    }
}

fn siblings(value: BattleScriptJumpifnodamageVectorSiblings) -> BattleScriptJumpifnodamageSiblings {
    BattleScriptJumpifnodamageSiblings {
        current_move: value.current_move,
        battle_move_damage: value.battle_move_damage,
        move_result_flags: value.move_result_flags,
        hit_marker: value.hit_marker,
        bide_dmg: value.bide_dmg,
        locked_moves: value.locked_moves,
    }
}

fn rules(value: BattleScriptJumpifnodamageVectorState) -> BattleScriptJumpifnodamageRules {
    BattleScriptJumpifnodamageRules {
        battlers: value.battlers.map(battler),
        selector_roles: BattleScriptJumpifnodamageRoles {
            attacker: value.attacker,
            target: value.target,
            effect_battler: value.effect_battler,
            fainted: value.fainted,
        },
        siblings: siblings(value.siblings),
    }
}

fn vector_battler(
    value: BattleScriptJumpifnodamageBattlerState,
) -> BattleScriptJumpifnodamageVectorBattlerState {
    BattleScriptJumpifnodamageVectorBattlerState {
        protect_physical_dmg: value.protect_physical_dmg,
        protect_physical_battler_id: value.protect_physical_battler_id,
        protect_special_dmg: value.protect_special_dmg,
        protect_special_battler_id: value.protect_special_battler_id,
        special_status_physical_dmg: value.special_status.physical_dmg,
        special_status_special_dmg: value.special_status.special_dmg,
        shell_bell_dmg: value.special_status.shell_bell_dmg,
        hp: value.hp,
        status2: value.status2,
    }
}

fn vector_siblings(
    value: BattleScriptJumpifnodamageSiblings,
) -> BattleScriptJumpifnodamageVectorSiblings {
    BattleScriptJumpifnodamageVectorSiblings {
        current_move: value.current_move,
        battle_move_damage: value.battle_move_damage,
        move_result_flags: value.move_result_flags,
        hit_marker: value.hit_marker,
        bide_dmg: value.bide_dmg,
        locked_moves: value.locked_moves,
    }
}

fn vector(value: BattleScriptJumpifnodamageRules) -> BattleScriptJumpifnodamageVectorState {
    BattleScriptJumpifnodamageVectorState {
        battlers: value.battlers.map(vector_battler),
        attacker: value.selector_roles.attacker,
        target: value.selector_roles.target,
        effect_battler: value.selector_roles.effect_battler,
        fainted: value.selector_roles.fainted,
        siblings: vector_siblings(value.siblings),
    }
}

#[test]
fn complete_projected_outputs_controls_ordered_errors_repetitions_and_immutability_match_canonical_ts(
) {
    assert_eq!(BATTLE_SCRIPT_JUMPIFNODAMAGE_CASES.len(), 131);
    for (case_index, case) in BATTLE_SCRIPT_JUMPIFNODAMAGE_CASES.iter().enumerate() {
        execute_case(case_index, case);
    }
}

fn execute_case(case_index: usize, case: &BattleScriptJumpifnodamageVectorCase) {
    let input = rules(case.initial);
    let before = input;
    let mut current = input;
    let mut controls = Vec::new();
    let mut error = None;
    let execution = BattleScriptJumpifnodamageExecution {
        jump_target_expression: case.jump_target_expression,
        jump_target_resolves: case.jump_target_resolves,
    };

    for application in 0..case.applications {
        let prior = current;
        match apply_battle_script_jumpifnodamage(execution, &current) {
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
        "case {case_index} {}: complete projected result",
        case.label,
    );
}

fn assert_transition_shape(
    case_index: usize,
    case: &BattleScriptJumpifnodamageVectorCase,
    application: u8,
    prior: BattleScriptJumpifnodamageRules,
    outcome: factory_core::battle_script_jumpifnodamage::BattleScriptJumpifnodamageOutcome,
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
    for battler in BATTLE_SCRIPT_JUMPIFNODAMAGE_BATTLERS {
        assert_eq!(
            outcome.rules.battlers[battler.index()],
            prior.battlers[battler.index()],
            "case {case_index} {} application {application}: changed battler {}",
            case.label,
            battler.as_u8(),
        );
    }
    let receipt = prior.battlers[attacker.index()];
    let expected_control = if receipt.protect_physical_dmg != 0 || receipt.protect_special_dmg != 0
    {
        BattleScriptJumpifnodamageControl::Advance
    } else {
        BattleScriptJumpifnodamageControl::Jump
    };
    assert_eq!(
        outcome.control, expected_control,
        "case {case_index} {} application {application}: ProtectStruct truth branch",
        case.label,
    );
}

#[test]
fn all_four_attackers_each_cover_the_complete_signed_i32_physical_special_cross_product() {
    let matrix = BATTLE_SCRIPT_JUMPIFNODAMAGE_CASES
        .iter()
        .filter(|case| case.category == "attacker-protect-receipt-i32-matrix")
        .collect::<Vec<_>>();
    assert_eq!(matrix.len(), 100);

    let actual = matrix
        .iter()
        .map(|case| {
            let attacker = case
                .initial
                .attacker
                .expect("receipt matrix must supply attacker");
            (
                attacker.as_u8(),
                case.initial.battlers[attacker.index()].protect_physical_dmg,
                case.initial.battlers[attacker.index()].protect_special_dmg,
            )
        })
        .collect::<BTreeSet<_>>();
    let expected = BATTLE_SCRIPT_JUMPIFNODAMAGE_BATTLERS
        .into_iter()
        .flat_map(|attacker| {
            BATTLE_SCRIPT_JUMPIFNODAMAGE_I32_EDGE_DOMAIN
                .into_iter()
                .flat_map(move |physical| {
                    BATTLE_SCRIPT_JUMPIFNODAMAGE_I32_EDGE_DOMAIN
                        .into_iter()
                        .map(move |special| (attacker.as_u8(), physical, special))
                })
        })
        .collect::<BTreeSet<_>>();
    assert_eq!(actual, expected);

    for case in matrix {
        let attacker = case.initial.attacker.expect("matrix attacker");
        let receipt = case.initial.battlers[attacker.index()];
        let expected_control =
            if receipt.protect_physical_dmg == 0 && receipt.protect_special_dmg == 0 {
                BattleScriptJumpifnodamageControl::Jump
            } else {
                BattleScriptJumpifnodamageControl::Advance
            };
        assert_eq!(case.controls, &[expected_control]);
    }
}

#[test]
fn special_status_shadow_receipts_are_ignored_and_every_projection_sibling_is_preserved() {
    let shadow_cases = BATTLE_SCRIPT_JUMPIFNODAMAGE_CASES
        .iter()
        .filter(|case| case.category == "special-status-shadow-receipts-ignored")
        .collect::<Vec<_>>();
    assert_eq!(shadow_cases.len(), 20);
    for case in shadow_cases {
        let attacker = case.initial.attacker.expect("shadow case attacker");
        let battler = case.initial.battlers[attacker.index()];
        assert_eq!(
            battler.protect_physical_dmg, 0,
            "{} physical receipt",
            case.label
        );
        assert_eq!(
            battler.protect_special_dmg, 0,
            "{} special receipt",
            case.label
        );
        assert!(
            battler.special_status_physical_dmg != 0 || battler.special_status_special_dmg != 0,
            "{} must carry a nonzero ignored SpecialStatus shadow receipt",
            case.label,
        );
        assert_eq!(case.controls, &[BattleScriptJumpifnodamageControl::Jump]);
        assert_eq!(
            case.expected,
            Some(case.initial),
            "{} output state",
            case.label
        );
    }

    let preservation = BATTLE_SCRIPT_JUMPIFNODAMAGE_CASES
        .iter()
        .filter(|case| case.category == "prior-and-sibling-state-preservation")
        .collect::<Vec<_>>();
    assert_eq!(preservation.len(), 4);
    assert_eq!(
        preservation
            .iter()
            .map(|case| case
                .initial
                .attacker
                .expect("preservation attacker")
                .as_u8())
            .collect::<BTreeSet<_>>(),
        BATTLE_SCRIPT_JUMPIFNODAMAGE_BATTLERS
            .map(|battler| battler.as_u8())
            .into_iter()
            .collect::<BTreeSet<_>>(),
    );
    for case in preservation {
        assert_eq!(
            case.expected,
            Some(case.initial),
            "{} state changed",
            case.label
        );
    }
}

#[test]
fn missing_attacker_and_late_unresolved_label_follow_canonical_order() {
    let missing = BATTLE_SCRIPT_JUMPIFNODAMAGE_CASES
        .iter()
        .find(|case| case.label == "missing_attacker_precedes_unresolved_jump_target")
        .expect("missing attacker vector");
    assert_eq!(missing.initial.attacker, None);
    assert!(!missing.jump_target_resolves);
    assert_eq!(missing.controls, &[]);
    assert_eq!(
        missing.expected_error,
        Some("Battle Script hit-chain command requires a attacker role"),
    );

    let unresolved = BATTLE_SCRIPT_JUMPIFNODAMAGE_CASES
        .iter()
        .find(|case| case.label == "zero_receipts_reach_unresolved_jump_target")
        .expect("unresolved zero receipt vector");
    assert_eq!(unresolved.controls, &[]);
    assert_eq!(
        unresolved.expected_error,
        Some("Cmd_jumpifnodamage: unresolved jump target BattleScript_HitFromAccCheck"),
    );

    for label in [
        "physical_receipt_skips_unresolved_jump_target",
        "special_receipt_skips_unresolved_jump_target",
    ] {
        let case = BATTLE_SCRIPT_JUMPIFNODAMAGE_CASES
            .iter()
            .find(|case| case.label == label)
            .unwrap_or_else(|| panic!("missing {label} vector"));
        assert!(
            !case.jump_target_resolves,
            "{label} must use unresolved program"
        );
        assert_eq!(case.expected_error, None, "{label} must skip lookup");
        assert_eq!(case.controls, &[BattleScriptJumpifnodamageControl::Advance]);
    }
}

#[test]
fn repeated_application_is_idempotent_on_both_receipt_branches() {
    let repeated = BATTLE_SCRIPT_JUMPIFNODAMAGE_CASES
        .iter()
        .filter(|case| case.category == "repeated-application-idempotence")
        .collect::<Vec<_>>();
    assert_eq!(repeated.len(), 3);
    for case in &repeated {
        assert_eq!(case.applications, 2, "{} applications", case.label);
        assert_eq!(
            case.expected,
            Some(case.initial),
            "{} state changed",
            case.label
        );
    }
    assert_eq!(
        repeated
            .iter()
            .map(|case| case.controls)
            .collect::<Vec<_>>(),
        vec![
            &[
                BattleScriptJumpifnodamageControl::Jump,
                BattleScriptJumpifnodamageControl::Jump
            ][..],
            &[
                BattleScriptJumpifnodamageControl::Advance,
                BattleScriptJumpifnodamageControl::Advance
            ][..],
            &[
                BattleScriptJumpifnodamageControl::Advance,
                BattleScriptJumpifnodamageControl::Advance
            ][..],
        ],
    );
}

fn registration_instruction<'a>(
    value: BattleScriptJumpifnodamageVectorRegistrationInstruction,
    operands: &'a [BattleScriptJumpifnodamageOperand<'a>],
) -> BattleScriptJumpifnodamageRegistrationInstruction<'a> {
    BattleScriptJumpifnodamageRegistrationInstruction {
        opcode_name: value.opcode_name,
        program_counter: value.program_counter,
        opcode_id: value.opcode_id,
        dispatcher: value.dispatcher,
        source_label: value.source_label,
        source_statement_line: value.source_statement_line,
        operands,
        jump_target_resolves: value.jump_target_resolves,
    }
}

#[test]
fn exact_singleton_registration_shape_and_failures_match_canonical_typescript() {
    assert_eq!(BATTLE_SCRIPT_JUMPIFNODAMAGE_REGISTRATION_CASES.len(), 16);
    for case in BATTLE_SCRIPT_JUMPIFNODAMAGE_REGISTRATION_CASES {
        let operand_sets = case
            .instructions
            .iter()
            .map(|instruction| {
                instruction
                    .operand_widths
                    .iter()
                    .zip(instruction.operand_expressions)
                    .map(
                        |(&width_bytes, &expression)| BattleScriptJumpifnodamageOperand {
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
        match register_battle_script_jumpifnodamage_handler(&instructions) {
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
                    case.label
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
    assert_eq!(BATTLE_SCRIPT_JUMPIFNODAMAGE_BATTLER_COUNT, 4);
    assert_eq!(
        BATTLE_SCRIPT_JUMPIFNODAMAGE_BATTLERS.map(|battler| battler.as_u8()),
        [0, 1, 2, 3],
    );
}
