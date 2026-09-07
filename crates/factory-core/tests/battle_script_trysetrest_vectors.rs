//! Canonical-TypeScript differential, registration, and immutable state
//! ratchets for `battleScriptTrysetrestOpcode.ts`.
//!
//! Regenerate with `node --experimental-strip-types
//! core-rs/tools/gen-battle-script-trysetrest-vectors.mjs`.

use factory_core::battle_script_trysetrest::{
    apply_battle_script_trysetrest, register_battle_script_trysetrest_handler,
    BattleScriptTrysetrestBattlerState, BattleScriptTrysetrestControl,
    BattleScriptTrysetrestInstruction, BattleScriptTrysetrestOperand,
    BattleScriptTrysetrestPartyMember, BattleScriptTrysetrestRoles, BattleScriptTrysetrestRules,
};
use factory_core::battle_script_trysetrest_vectors_gen::{
    BattleScriptTrysetrestRegistrationVectorCase, BattleScriptTrysetrestVectorCase,
    BattleScriptTrysetrestVectorState, BATTLE_SCRIPT_TRYSETREST_BRANCH_CENSUS,
    BATTLE_SCRIPT_TRYSETREST_CASES, BATTLE_SCRIPT_TRYSETREST_CATEGORY_CENSUS,
    BATTLE_SCRIPT_TRYSETREST_DOMAIN_CENSUS, BATTLE_SCRIPT_TRYSETREST_REGISTRATION_CASES,
    BATTLE_SCRIPT_TRYSETREST_VECTOR_CORPUS_SHA256,
};

fn rules(value: BattleScriptTrysetrestVectorState) -> BattleScriptTrysetrestRules {
    BattleScriptTrysetrestRules {
        battlers: value
            .battlers
            .map(|battler| BattleScriptTrysetrestBattlerState {
                hp: battler.hp,
                max_hp: battler.max_hp,
                status1: battler.status1,
                side: battler.side,
                party_index: battler.party_index,
                ability: battler.ability,
                item: battler.item,
            }),
        selector_roles: BattleScriptTrysetrestRoles {
            attacker: value.attacker,
            target: value.target,
        },
        party: value.party.map(|side| {
            side.map(|member| BattleScriptTrysetrestPartyMember {
                status1: member.status1,
                noise: member.noise,
            })
        }),
        battle_move_damage: value.battle_move_damage,
        multistring_chooser: value.multistring_chooser,
    }
}

fn vector_state(value: BattleScriptTrysetrestRules) -> BattleScriptTrysetrestVectorState {
    use factory_core::battle_script_trysetrest_vectors_gen::{
        BattleScriptTrysetrestVectorBattlerState, BattleScriptTrysetrestVectorPartyMember,
    };
    BattleScriptTrysetrestVectorState {
        battlers: value
            .battlers
            .map(|battler| BattleScriptTrysetrestVectorBattlerState {
                hp: battler.hp,
                max_hp: battler.max_hp,
                status1: battler.status1,
                side: battler.side,
                party_index: battler.party_index,
                ability: battler.ability,
                item: battler.item,
            }),
        attacker: value.selector_roles.attacker,
        target: value.selector_roles.target,
        party: value.party.map(|side| {
            side.map(|member| BattleScriptTrysetrestVectorPartyMember {
                status1: member.status1,
                noise: member.noise,
            })
        }),
        battle_move_damage: value.battle_move_damage,
        multistring_chooser: value.multistring_chooser,
    }
}

#[test]
fn complete_projected_outputs_controls_errors_and_immutability_match_canonical_typescript() {
    assert_eq!(BATTLE_SCRIPT_TRYSETREST_CASES.len(), 109);
    for (case_index, case) in BATTLE_SCRIPT_TRYSETREST_CASES.iter().enumerate() {
        execute_case(case_index, case);
    }
}

fn execute_case(case_index: usize, case: &BattleScriptTrysetrestVectorCase) {
    let input = rules(case.initial);
    let before = input;

    match (
        apply_battle_script_trysetrest(case.instruction, &input),
        case.expected,
        case.control,
        case.expected_error,
    ) {
        (Ok(outcome), Some(expected), Some(expected_control), None) => {
            assert_eq!(input, before, "case {case_index} {} mutated rules input", case.label);
            assert_eq!(
                outcome.control, expected_control,
                "case {case_index} {} control mismatch",
                case.label
            );
            assert_eq!(
                vector_state(outcome.rules),
                expected,
                "case {case_index} {} complete projected state",
                case.label
            );
            assert_eq!(
                outcome.emitted_event, case.event,
                "case {case_index} {} emitted event mismatch",
                case.label
            );
            assert_transition_shape(case_index, case, before, outcome);
        }
        (Err(actual), None, None, Some(expected)) => {
            assert_eq!(
                input, before,
                "case {case_index} {} mutated rules input on error",
                case.label
            );
            assert_eq!(actual.to_string(), expected, "case {case_index} {} exact error", case.label);
        }
        (actual, expected, expected_control, expected_error) => panic!(
            "case {case_index} {} generated outcome disagrees: actual={actual:?}, expected={expected:?}, expected_control={expected_control:?}, expected_error={expected_error:?}",
            case.label
        ),
    }
}

fn assert_transition_shape(
    case_index: usize,
    case: &BattleScriptTrysetrestVectorCase,
    prior: BattleScriptTrysetrestRules,
    outcome: factory_core::battle_script_trysetrest::BattleScriptTrysetrestOutcome,
) {
    let attacker = prior
        .selector_roles
        .attacker
        .expect("resolved case has attacker");

    // Target is unconditionally reassigned to the attacker on every branch.
    assert_eq!(
        outcome.rules.selector_roles.target,
        Some(attacker),
        "case {case_index} {} did not reassign target to attacker",
        case.label
    );
    // battle_move_damage is unconditionally overwritten with -maxHP on
    // every branch, even the fail branch that never reads it back.
    assert_eq!(
        outcome.rules.battle_move_damage,
        -i32::from(prior.battlers[attacker.index()].max_hp),
        "case {case_index} {} damage mismatch",
        case.label
    );
    // No other battler's state is ever touched.
    for i in 0..4 {
        if i != attacker.index() {
            assert_eq!(
                outcome.rules.battlers[i], prior.battlers[i],
                "case {case_index} {} untouched battler {i} changed",
                case.label
            );
        }
    }

    match outcome.control {
        BattleScriptTrysetrestControl::Jump { .. } => {
            assert_eq!(
                prior.battlers[attacker.index()].hp,
                prior.battlers[attacker.index()].max_hp,
                "case {case_index} {} jumped despite non-full HP",
                case.label
            );
            assert_eq!(
                outcome.rules.battlers[attacker.index()].status1,
                prior.battlers[attacker.index()].status1,
                "case {case_index} {} fail branch touched status1",
                case.label
            );
            assert_eq!(
                outcome.rules.multistring_chooser, prior.multistring_chooser,
                "case {case_index} {} fail branch touched multistring_chooser",
                case.label
            );
            assert_eq!(
                outcome.rules.party, prior.party,
                "case {case_index} {} fail branch touched party",
                case.label
            );
            assert_eq!(
                outcome.emitted_event, None,
                "case {case_index} {} fail branch emitted an event",
                case.label
            );
        }
        BattleScriptTrysetrestControl::Advance => {
            assert_ne!(
                prior.battlers[attacker.index()].hp,
                prior.battlers[attacker.index()].max_hp,
                "case {case_index} {} advanced despite full HP",
                case.label
            );
            assert_eq!(
                outcome.rules.battlers[attacker.index()].status1,
                3,
                "case {case_index} {} did not replace status1 with STATUS1_SLEEP_TURN(3)",
                case.label
            );
            let side = prior.battlers[attacker.index()].side.index();
            let party_index = usize::from(prior.battlers[attacker.index()].party_index);
            assert_eq!(
                outcome.rules.party[side][party_index].status1, 3,
                "case {case_index} {} party mirror not synced",
                case.label
            );
            for (side_index, party_side) in outcome.rules.party.iter().enumerate() {
                for (member_index, member) in party_side.iter().enumerate() {
                    if (side_index, member_index) != (side, party_index) {
                        assert_eq!(
                            *member, prior.party[side_index][member_index],
                            "case {case_index} {} untouched party cell [{side_index}][{member_index}] changed",
                            case.label
                        );
                    }
                }
            }
        }
    }
}

#[test]
fn registration_matches_canonical_typescript_and_keeps_exact_errors() {
    assert_eq!(BATTLE_SCRIPT_TRYSETREST_REGISTRATION_CASES.len(), 3);
    for case in BATTLE_SCRIPT_TRYSETREST_REGISTRATION_CASES {
        execute_registration_case(&case);
    }
}

const CANONICAL_REGISTRATION_INSTRUCTION: BattleScriptTrysetrestInstruction<'static> =
    BattleScriptTrysetrestInstruction {
        opcode_name: "B_SCR_OP_TRYSETREST",
        program_counter: 0,
        opcode_id: 0x81,
        dispatcher: "Cmd_trysetrest",
        operands: &[BattleScriptTrysetrestOperand {
            width_bytes: 4,
            expression: "BattleScript_AlreadyAtFullHp",
        }],
        resolved_jump_target: None,
    };
const NOISE_REGISTRATION_INSTRUCTION: BattleScriptTrysetrestInstruction<'static> =
    BattleScriptTrysetrestInstruction {
        opcode_name: "B_SCR_OP_RUST_NOISE",
        opcode_id: 0,
        ..CANONICAL_REGISTRATION_INSTRUCTION
    };

fn execute_registration_case(case: &BattleScriptTrysetrestRegistrationVectorCase) {
    let instructions: &[BattleScriptTrysetrestInstruction<'static>] = match case.label {
        "valid_singleton" => &[
            NOISE_REGISTRATION_INSTRUCTION,
            CANONICAL_REGISTRATION_INSTRUCTION,
        ],
        "missing_opcode" => &[NOISE_REGISTRATION_INSTRUCTION],
        // Registration is FIND-FIRST: the first matching instruction's
        // opcode id wins even with a second match present.
        "duplicate_first_wins" => &[
            CANONICAL_REGISTRATION_INSTRUCTION,
            NOISE_REGISTRATION_INSTRUCTION,
            CANONICAL_REGISTRATION_INSTRUCTION,
        ],
        other => panic!("unexpected registration case label {other}"),
    };

    match (register_battle_script_trysetrest_handler(instructions), case.expected_opcode_id, case.expected_error) {
        (Ok(actual), Some(expected), None) => assert_eq!(actual.opcode_id, expected, "{}", case.label),
        (Err(actual), None, Some(expected)) => assert_eq!(actual.to_string(), expected, "{}", case.label),
        (actual, expected_opcode, expected_error) => panic!(
            "{} registration mismatch: actual={actual:?}, expected_opcode={expected_opcode:?}, expected_error={expected_error:?}",
            case.label
        ),
    }
}

#[test]
fn dense_matrices_cover_all_required_domains() {
    let attacker_status_sweep = BATTLE_SCRIPT_TRYSETREST_CASES
        .iter()
        .filter(|case| case.category == "attacker-status-sweep")
        .collect::<Vec<_>>();
    assert_eq!(attacker_status_sweep.len(), 88);
    assert!(attacker_status_sweep
        .iter()
        .any(|case| case.control == Some(BattleScriptTrysetrestControl::Advance)));
    assert!(attacker_status_sweep.iter().any(|case| matches!(
        case.control,
        Some(BattleScriptTrysetrestControl::Jump { .. })
    )));

    let maxhp_edge = BATTLE_SCRIPT_TRYSETREST_CASES
        .iter()
        .filter(|case| case.category == "maxhp-edge-sweep")
        .count();
    assert_eq!(maxhp_edge, 8);

    let party_identity = BATTLE_SCRIPT_TRYSETREST_CASES
        .iter()
        .filter(|case| case.category == "party-identity-sweep")
        .count();
    assert_eq!(party_identity, 4);

    let target_role = BATTLE_SCRIPT_TRYSETREST_CASES
        .iter()
        .filter(|case| case.category == "target-role-sweep")
        .count();
    assert_eq!(target_role, 6);
}

#[test]
fn corpus_censuses_and_hash_are_pinned() {
    assert_eq!(
        BATTLE_SCRIPT_TRYSETREST_DOMAIN_CENSUS,
        [
            ("source-battler-slots", 4),
            ("status1-values", 11),
            ("maxhp-edge-values", 4),
            ("registration-cases", 3),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYSETREST_CATEGORY_CENSUS,
        [
            ("attacker-status-sweep", 88),
            ("maxhp-edge-sweep", 8),
            ("missing-attacker-role", 1),
            ("party-identity-sweep", 4),
            ("target-role-sweep", 6),
            ("unresolved-label", 2),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYSETREST_BRANCH_CENSUS,
        [
            ("advance", 56),
            ("jump", 51),
            ("missing-attacker-role", 1),
            ("unresolved-jump-target", 1),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_TRYSETREST_VECTOR_CORPUS_SHA256,
        "59bb3a8e3d36d1e7f0a0558522ab7c1eef5355e6cb833552459433f3d0b00c82"
    );
}
