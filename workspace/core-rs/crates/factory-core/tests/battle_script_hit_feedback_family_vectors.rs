//! Canonical-TypeScript differential and registration ratchets for
//! `hitanimationOpcodeHandler` / `createEffectivenesssoundOpcodeHandler`
//! (`src/engine/battleScriptHitChainOpcode.ts`).
//!
//! Regenerate with `node --experimental-strip-types
//! core-rs/tools/gen-battle-script-hit-feedback-family-vectors.mjs`.

use factory_core::battle_script_hit_feedback_family::{
    apply_battle_script_effectivenesssound, apply_battle_script_hitanimation,
    register_battle_script_effectivenesssound_handler, register_battle_script_hitanimation_handler,
    BattleScriptEffectivenesssoundOutcome, BattleScriptHitFeedbackBattlerState,
    BattleScriptHitFeedbackControllerBusy, BattleScriptHitFeedbackEvent,
    BattleScriptHitFeedbackInstruction, BattleScriptHitFeedbackRoles,
    BattleScriptHitFeedbackScheduler, BattleScriptHitanimationOutcome,
    BATTLE_SCRIPT_EFFECTIVENESSSOUND_OPCODE, BATTLE_SCRIPT_EFFECTIVENESSSOUND_OPCODE_NAME,
    BATTLE_SCRIPT_HITANIMATION_OPCODE, BATTLE_SCRIPT_HITANIMATION_OPCODE_NAME,
};
use factory_core::battle_script_hit_feedback_family_vectors_gen::{
    HitFeedbackVectorEvent, BATTLE_SCRIPT_EFFECTIVENESSSOUND_CASES,
    BATTLE_SCRIPT_EFFECTIVENESSSOUND_CATEGORY_CENSUS, BATTLE_SCRIPT_HITANIMATION_CASES,
    BATTLE_SCRIPT_HITANIMATION_CATEGORY_CENSUS, BATTLE_SCRIPT_HIT_FEEDBACK_DOMAIN_CENSUS,
    BATTLE_SCRIPT_HIT_FEEDBACK_REGISTRATION_CASES, BATTLE_SCRIPT_HIT_FEEDBACK_VECTOR_CORPUS_SHA256,
};

fn expected_event(value: Option<HitFeedbackVectorEvent>) -> Option<BattleScriptHitFeedbackEvent> {
    value.map(|event| match event {
        HitFeedbackVectorEvent::Animation { battler } => {
            BattleScriptHitFeedbackEvent::Animation { battler }
        }
        HitFeedbackVectorEvent::PlaySe { battler, song_id } => {
            BattleScriptHitFeedbackEvent::PlaySe { battler, song_id }
        }
    })
}

fn scheduler_from(
    pending: [Option<factory_core::battle_script_hit_feedback_family::BattleScriptHitFeedbackBattler>;
        4],
) -> BattleScriptHitFeedbackScheduler {
    BattleScriptHitFeedbackScheduler {
        pending_controller_battlers: pending,
        pending_count: pending.iter().filter(|value| value.is_some()).count() as u8,
    }
}

#[test]
fn hitanimation_matches_canonical_typescript_for_every_case() {
    assert_eq!(BATTLE_SCRIPT_HITANIMATION_CASES.len(), 15);
    for (index, case) in BATTLE_SCRIPT_HITANIMATION_CASES.iter().enumerate() {
        let roles = BattleScriptHitFeedbackRoles {
            attacker: case.attacker,
            target: case.target,
            fainted: case.fainted,
        };
        let battlers: [BattleScriptHitFeedbackBattlerState; 4] =
            case.battlers.map(|b| BattleScriptHitFeedbackBattlerState {
                status2: b.status2,
                substitute_hp: b.substitute_hp,
            });
        let scheduler = scheduler_from(case.initial_pending);

        let result = apply_battle_script_hitanimation(
            0x2000,
            &roles,
            &battlers,
            case.move_result_flags,
            case.hit_marker,
            &scheduler,
            case.operand_expression,
        );

        match case.kind {
            "throw" => {
                let error =
                    result.expect_err(&format!("case {index} {} expected throw", case.label));
                assert_eq!(
                    error.to_string(),
                    case.throw_message.unwrap(),
                    "case {index} {}",
                    case.label
                );
            }
            "halt" => {
                let outcome = result
                    .unwrap_or_else(|e| panic!("case {index} {} unexpected error {e}", case.label));
                match outcome {
                    BattleScriptHitanimationOutcome::Halt(halt) => {
                        assert_eq!(halt.program_counter, 0x2000, "case {index} {}", case.label);
                        assert_eq!(
                            halt.opcode_id, BATTLE_SCRIPT_HITANIMATION_OPCODE,
                            "case {index} {}",
                            case.label
                        );
                        assert_eq!(
                            halt.opcode_name, BATTLE_SCRIPT_HITANIMATION_OPCODE_NAME,
                            "case {index} {}",
                            case.label
                        );
                        assert_eq!(
                            halt.source_construct,
                            case.halt_source_construct.unwrap(),
                            "case {index} {}",
                            case.label
                        );
                        assert_eq!(
                            halt.source_file, "battle_script_commands.c",
                            "case {index} {}",
                            case.label
                        );
                        assert_eq!(
                            halt.source_line,
                            case.halt_source_line.unwrap(),
                            "case {index} {}",
                            case.label
                        );
                    }
                    other => panic!("case {index} {} expected halt, got {other:?}", case.label),
                }
            }
            "advance" => {
                let outcome = result
                    .unwrap_or_else(|e| panic!("case {index} {} unexpected error {e}", case.label));
                match outcome {
                    BattleScriptHitanimationOutcome::Advance {
                        scheduler: out_scheduler,
                        event,
                    } => {
                        assert_eq!(
                            out_scheduler.pending_controller_battlers,
                            case.pending_out.unwrap(),
                            "case {index} {} pending",
                            case.label
                        );
                        assert_eq!(
                            event,
                            expected_event(case.event),
                            "case {index} {} event",
                            case.label
                        );
                    }
                    other => panic!(
                        "case {index} {} expected advance, got {other:?}",
                        case.label
                    ),
                }
            }
            other => panic!("case {index} {} unknown kind {other}", case.label),
        }
    }
}

#[test]
fn effectivenesssound_matches_canonical_typescript_for_every_case() {
    assert_eq!(BATTLE_SCRIPT_EFFECTIVENESSSOUND_CASES.len(), 12);
    for (index, case) in BATTLE_SCRIPT_EFFECTIVENESSSOUND_CASES.iter().enumerate() {
        let roles = BattleScriptHitFeedbackRoles {
            attacker: case.attacker,
            target: case.target,
            fainted: case.fainted,
        };
        let scheduler = scheduler_from(case.initial_pending);

        let result = apply_battle_script_effectivenesssound(
            0x3000,
            &roles,
            case.move_result_flags,
            &scheduler,
        );

        match case.kind {
            "throw" => {
                let error =
                    result.expect_err(&format!("case {index} {} expected throw", case.label));
                assert_eq!(
                    error.to_string(),
                    case.throw_message.unwrap(),
                    "case {index} {}",
                    case.label
                );
            }
            "block" => {
                let outcome = result
                    .unwrap_or_else(|e| panic!("case {index} {} unexpected error {e}", case.label));
                assert_eq!(
                    outcome,
                    BattleScriptEffectivenesssoundOutcome::Block(
                        BattleScriptHitFeedbackControllerBusy {
                            program_counter: 0x3000,
                            opcode_id: BATTLE_SCRIPT_EFFECTIVENESSSOUND_OPCODE,
                            opcode_name: BATTLE_SCRIPT_EFFECTIVENESSSOUND_OPCODE_NAME,
                        }
                    ),
                    "case {index} {}",
                    case.label
                );
            }
            "advance" => {
                let outcome = result
                    .unwrap_or_else(|e| panic!("case {index} {} unexpected error {e}", case.label));
                match outcome {
                    BattleScriptEffectivenesssoundOutcome::Advance {
                        scheduler: out_scheduler,
                        event,
                    } => {
                        assert_eq!(
                            out_scheduler.pending_controller_battlers,
                            case.pending_out.unwrap(),
                            "case {index} {} pending",
                            case.label
                        );
                        assert_eq!(
                            event,
                            expected_event(case.event),
                            "case {index} {} event",
                            case.label
                        );
                    }
                    other => panic!(
                        "case {index} {} expected advance, got {other:?}",
                        case.label
                    ),
                }
            }
            other => panic!("case {index} {} unknown kind {other}", case.label),
        }
    }
}

#[test]
fn registration_matches_canonical_typescript_and_keeps_exact_errors() {
    assert_eq!(BATTLE_SCRIPT_HIT_FEEDBACK_REGISTRATION_CASES.len(), 4);
    let present = [
        BattleScriptHitFeedbackInstruction {
            opcode_name: BATTLE_SCRIPT_HITANIMATION_OPCODE_NAME,
            opcode_id: BATTLE_SCRIPT_HITANIMATION_OPCODE,
        },
        BattleScriptHitFeedbackInstruction {
            opcode_name: BATTLE_SCRIPT_EFFECTIVENESSSOUND_OPCODE_NAME,
            opcode_id: BATTLE_SCRIPT_EFFECTIVENESSSOUND_OPCODE,
        },
    ];
    let absent =
        [
            BattleScriptHitFeedbackInstruction {
                opcode_name: "B_SCR_OP_PPREDUCE",
                opcode_id: 0x03,
            },
        ];

    for case in BATTLE_SCRIPT_HIT_FEEDBACK_REGISTRATION_CASES {
        let instructions: &[BattleScriptHitFeedbackInstruction] = if case.expected_error.is_some() {
            &absent
        } else {
            &present
        };
        if case.opcode_name == BATTLE_SCRIPT_HITANIMATION_OPCODE_NAME {
            match (
                register_battle_script_hitanimation_handler(instructions),
                case.expected_opcode_id,
                case.expected_error,
            ) {
                (Ok(actual), Some(expected), None) => assert_eq!(actual.opcode_id, expected, "{}", case.label),
                (Err(actual), None, Some(expected)) => assert_eq!(actual.to_string(), expected, "{}", case.label),
                (actual, expected_opcode, expected_error) => panic!(
                    "{} registration mismatch: actual={actual:?}, expected_opcode={expected_opcode:?}, expected_error={expected_error:?}",
                    case.label
                ),
            }
        } else {
            match (
                register_battle_script_effectivenesssound_handler(instructions),
                case.expected_opcode_id,
                case.expected_error,
            ) {
                (Ok(actual), Some(expected), None) => assert_eq!(actual.opcode_id, expected, "{}", case.label),
                (Err(actual), None, Some(expected)) => assert_eq!(actual.to_string(), expected, "{}", case.label),
                (actual, expected_opcode, expected_error) => panic!(
                    "{} registration mismatch: actual={actual:?}, expected_opcode={expected_opcode:?}, expected_error={expected_error:?}",
                    case.label
                ),
            }
        }
    }
}

#[test]
fn domain_and_category_censuses_are_pinned() {
    assert_eq!(
        BATTLE_SCRIPT_HIT_FEEDBACK_DOMAIN_CENSUS,
        [
            ("hitanimation-committed-sites", 14),
            ("hitanimation-bs-target-sites", 12),
            ("hitanimation-bs-attacker-sites", 2),
            ("hitanimation-behavior-cases", 15),
            ("effectivenesssound-committed-sites", 18),
            ("effectivenesssound-behavior-cases", 12),
            ("registration-cases", 4),
        ]
    );
    assert!(!BATTLE_SCRIPT_HITANIMATION_CATEGORY_CENSUS.is_empty());
    assert!(!BATTLE_SCRIPT_EFFECTIVENESSSOUND_CATEGORY_CENSUS.is_empty());
    assert_eq!(
        BATTLE_SCRIPT_HIT_FEEDBACK_VECTOR_CORPUS_SHA256,
        "f2d8f29db05e23cd62f954270bb8a00dde7583f6d6a1e69804b56c85b76ecc1a"
    );
}
