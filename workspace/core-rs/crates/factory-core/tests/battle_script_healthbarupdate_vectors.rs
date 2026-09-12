//! Canonical-TypeScript differential and registration ratchets for
//! `createHealthbarupdateOpcodeHandler`
//! (`src/engine/battleScriptHitChainOpcode.ts`), driven through the
//! registered handler map with the canonical production `externalPorts()`
//! closure (`src/engine/factoryBattleScriptFullTurnDecision.ts`).
//!
//! Regenerate with `node --experimental-strip-types
//! core-rs/tools/gen-battle-script-healthbarupdate-vectors.mjs`.

use factory_core::battle_script_healthbarupdate::{
    apply_battle_script_healthbarupdate, register_battle_script_healthbarupdate_handler,
    BattleScriptHealthbarupdateActionSnapshot, BattleScriptHealthbarupdateBattlerState,
    BattleScriptHealthbarupdateBlock, BattleScriptHealthbarupdateEvent,
    BattleScriptHealthbarupdateInstruction, BattleScriptHealthbarupdateMessage,
    BattleScriptHealthbarupdateMessagePort, BattleScriptHealthbarupdateOutcome,
    BattleScriptHealthbarupdateRoles, BattleScriptHealthbarupdateScheduler,
};
use factory_core::battle_script_healthbarupdate_vectors_gen::{
    HealthbarupdateRegistrationVectorCase, HealthbarupdateVectorEvent,
    BATTLE_SCRIPT_HEALTHBARUPDATE_CASES, BATTLE_SCRIPT_HEALTHBARUPDATE_CATEGORY_CENSUS,
    BATTLE_SCRIPT_HEALTHBARUPDATE_DOMAIN_CENSUS, BATTLE_SCRIPT_HEALTHBARUPDATE_REGISTRATION_CASES,
    BATTLE_SCRIPT_HEALTHBARUPDATE_VECTOR_CORPUS_SHA256,
};

fn expected_event(
    value: Option<HealthbarupdateVectorEvent>,
) -> Option<BattleScriptHealthbarupdateEvent> {
    value.map(|event| match event {
        HealthbarupdateVectorEvent::HealthBarUpdate { battler, health_value } => {
            BattleScriptHealthbarupdateEvent::HealthBarUpdate { battler, health_value }
        }
        HealthbarupdateVectorEvent::Message { scripting_battler, action_snapshot } => {
            BattleScriptHealthbarupdateEvent::Message(BattleScriptHealthbarupdateMessage {
                message_id: "STRINGID_SUBSTITUTEDAMAGED",
                scripting_battler,
                action_snapshot: action_snapshot.map(|snapshot| {
                    BattleScriptHealthbarupdateActionSnapshot {
                        attacker: snapshot.attacker,
                        current_move: snapshot.current_move,
                        current_move_position: snapshot.current_move_position,
                    }
                }),
            })
        }
    })
}

#[test]
fn complete_projected_outputs_blocks_and_halts_match_canonical_typescript() {
    assert_eq!(BATTLE_SCRIPT_HEALTHBARUPDATE_CASES.len(), 21);
    for (case_index, case) in BATTLE_SCRIPT_HEALTHBARUPDATE_CASES.iter().enumerate() {
        let roles = BattleScriptHealthbarupdateRoles {
            attacker: case.attacker,
            target: case.target,
            fainted: case.fainted,
        };
        let battlers: [BattleScriptHealthbarupdateBattlerState; 4] =
            case.battlers
                .map(|state| BattleScriptHealthbarupdateBattlerState {
                    status2: state.status2,
                    substitute_hp: state.substitute_hp,
                });
        let pending_count = case
            .initial_pending
            .iter()
            .filter(|value| value.is_some())
            .count() as u8;
        let scheduler = BattleScriptHealthbarupdateScheduler {
            pending_controller_battlers: case.initial_pending,
            pending_count,
        };
        let message_port = if case.category == "null-port" {
            BattleScriptHealthbarupdateMessagePort::Unavailable
        } else {
            BattleScriptHealthbarupdateMessagePort::Available
        };

        let result = apply_battle_script_healthbarupdate(
            0x1234,
            &roles,
            &battlers,
            case.move_result_flags,
            case.hit_marker,
            case.battle_move_damage,
            case.scripting_battler,
            case.current_move,
            case.current_move_position,
            &scheduler,
            case.operand_expression,
            message_port,
        );

        match case.kind {
            "throw" => {
                let error = result.expect_err(&format!(
                    "case {case_index} {} expected a role-throw",
                    case.label
                ));
                assert_eq!(
                    error.to_string(),
                    case.throw_message
                        .expect("throw case missing throw_message"),
                    "case {case_index} {} throw message",
                    case.label
                );
            }
            "halt" => {
                let outcome = result.unwrap_or_else(|error| {
                    panic!(
                        "case {case_index} {} unexpectedly threw {error}",
                        case.label
                    )
                });
                match outcome {
                    BattleScriptHealthbarupdateOutcome::Halt(halt) => {
                        assert_eq!(
                            halt.source_construct,
                            case.halt_source_construct
                                .expect("halt case missing halt_source_construct"),
                            "case {case_index} {} halt source construct",
                            case.label
                        );
                        assert_eq!(
                            halt.source_line,
                            case.halt_source_line
                                .expect("halt case missing halt_source_line"),
                            "case {case_index} {} halt source line",
                            case.label
                        );
                        assert_eq!(halt.source_file, "battle_script_commands.c");
                        assert_eq!(halt.opcode_id, 0x0b);
                        assert_eq!(halt.opcode_name, "B_SCR_OP_HEALTHBARUPDATE");
                    }
                    other => panic!(
                        "case {case_index} {} expected halt, got {other:?}",
                        case.label
                    ),
                }
            }
            "block" => {
                let outcome = result.unwrap_or_else(|error| {
                    panic!(
                        "case {case_index} {} unexpectedly threw {error}",
                        case.label
                    )
                });
                match outcome {
                    BattleScriptHealthbarupdateOutcome::Block(block) => {
                        match (case.block_reason_kind, block) {
                            (
                                Some("controller-busy"),
                                BattleScriptHealthbarupdateBlock::ControllerBusy {
                                    program_counter,
                                    opcode_id,
                                    opcode_name,
                                },
                            ) => {
                                assert_eq!(program_counter, 0x1234);
                                assert_eq!(opcode_id, 0x0b);
                                assert_eq!(opcode_name, "B_SCR_OP_HEALTHBARUPDATE");
                            }
                            (
                                Some("source-context-unavailable"),
                                BattleScriptHealthbarupdateBlock::PrepareMessageUnavailable {
                                    program_counter,
                                    opcode_id,
                                    opcode_name,
                                    port,
                                    operand_expression,
                                },
                            ) => {
                                assert_eq!(program_counter, 0x1234);
                                assert_eq!(opcode_id, 0x0b);
                                assert_eq!(opcode_name, "B_SCR_OP_HEALTHBARUPDATE");
                                assert_eq!(port, "prepare-message");
                                assert_eq!(operand_expression, "STRINGID_SUBSTITUTEDAMAGED");
                            }
                            (reason, block) => panic!(
                                "case {case_index} {} block reason mismatch: expected={reason:?}, actual={block:?}",
                                case.label
                            ),
                        }
                    }
                    other => panic!(
                        "case {case_index} {} expected block, got {other:?}",
                        case.label
                    ),
                }
            }
            "advance" => {
                let outcome = result.unwrap_or_else(|error| {
                    panic!(
                        "case {case_index} {} unexpectedly threw {error}",
                        case.label
                    )
                });
                match outcome {
                    BattleScriptHealthbarupdateOutcome::Advance {
                        scheduler: out_scheduler,
                        event,
                    } => {
                        let expected_pending =
                            case.pending_out.expect("advance case missing pending_out");
                        assert_eq!(
                            out_scheduler.pending_controller_battlers, expected_pending,
                            "case {case_index} {} pending battlers",
                            case.label
                        );
                        assert_eq!(
                            event,
                            expected_event(case.event),
                            "case {case_index} {} event",
                            case.label
                        );
                    }
                    other => panic!(
                        "case {case_index} {} expected advance, got {other:?}",
                        case.label
                    ),
                }
            }
            other => panic!("case {case_index} {} unknown kind {other}", case.label),
        }
    }
}

#[test]
fn registration_matches_canonical_typescript_and_keeps_exact_errors() {
    assert_eq!(BATTLE_SCRIPT_HEALTHBARUPDATE_REGISTRATION_CASES.len(), 2);
    for case in BATTLE_SCRIPT_HEALTHBARUPDATE_REGISTRATION_CASES {
        execute_registration_case(&case);
    }
}

fn execute_registration_case(case: &HealthbarupdateRegistrationVectorCase) {
    let present = [BattleScriptHealthbarupdateInstruction {
        opcode_name: "B_SCR_OP_HEALTHBARUPDATE",
        opcode_id: case.expected_opcode_id.unwrap_or(0x0b),
    }];
    let absent = [BattleScriptHealthbarupdateInstruction {
        opcode_name: "B_SCR_OP_PPREDUCE",
        opcode_id: 0x03,
    }];
    let instructions: &[BattleScriptHealthbarupdateInstruction] = if case.expected_error.is_some() {
        &absent
    } else {
        &present
    };
    match (
        register_battle_script_healthbarupdate_handler(instructions),
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

#[test]
fn domain_and_category_censuses_are_pinned() {
    assert_eq!(
        BATTLE_SCRIPT_HEALTHBARUPDATE_DOMAIN_CENSUS,
        [
            ("committed-sites", 41),
            ("bs-attacker-sites", 22),
            ("bs-target-sites", 18),
            ("bs-fainted-sites", 1),
            ("behavior-cases", 21),
            ("registration-cases", 2),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_HEALTHBARUPDATE_CATEGORY_CENSUS,
        [
            ("clamp", 4),
            ("committed-fainted", 2),
            ("controller-busy", 1),
            ("health-bar", 2),
            ("missing-role", 2),
            ("no-effect", 2),
            ("null-port", 1),
            ("substitute-fallthrough", 3),
            ("substitute-message", 2),
            ("unsupported-branch", 2),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_HEALTHBARUPDATE_VECTOR_CORPUS_SHA256,
        "63e483f7cdbe793e6663b34979a3f0aeb5c10762639a2f25f2a56a1b4aee9d5d"
    );
}
