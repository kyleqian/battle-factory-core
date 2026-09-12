//! Canonical-TypeScript differential and registration ratchets for
//! `createAttackstringOpcodeHandler`
//! (`src/engine/battleScriptHitChainOpcode.ts`), driven by the canonical
//! production `externalPorts()` closure
//! (`src/engine/factoryBattleScriptFullTurnDecision.ts`).
//!
//! Regenerate with `node --experimental-strip-types
//! core-rs/tools/gen-battle-script-attackstring-vectors.mjs`.

use factory_core::battle_script_attackstring::{
    apply_battle_script_attackstring, register_battle_script_attackstring_handler,
    BattleScriptAttackstringBlock, BattleScriptAttackstringInstruction,
    BattleScriptAttackstringMessage, BattleScriptAttackstringMessagePort,
    BattleScriptAttackstringOutcome, BattleScriptAttackstringRules,
    BattleScriptAttackstringScheduler,
};
use factory_core::battle_script_attackstring_vectors_gen::{
    AttackstringRegistrationVectorCase, AttackstringVectorEvent, AttackstringVectorRules,
    BATTLE_SCRIPT_ATTACKSTRING_CASES, BATTLE_SCRIPT_ATTACKSTRING_CATEGORY_CENSUS,
    BATTLE_SCRIPT_ATTACKSTRING_DOMAIN_CENSUS, BATTLE_SCRIPT_ATTACKSTRING_REGISTRATION_CASES,
    BATTLE_SCRIPT_ATTACKSTRING_VECTOR_CORPUS_SHA256,
};

fn rules(value: AttackstringVectorRules) -> BattleScriptAttackstringRules {
    BattleScriptAttackstringRules {
        hit_marker: value.hit_marker,
        attacker: value.attacker,
        current_move: value.current_move,
        current_move_position: value.current_move_position,
        scripting_battler: value.scripting_battler,
    }
}

fn vector_rules(value: BattleScriptAttackstringRules) -> AttackstringVectorRules {
    AttackstringVectorRules {
        hit_marker: value.hit_marker,
        attacker: value.attacker,
        current_move: value.current_move,
        current_move_position: value.current_move_position,
        scripting_battler: value.scripting_battler,
    }
}

fn expected_event(
    value: Option<AttackstringVectorEvent>,
) -> Option<BattleScriptAttackstringMessage> {
    value.map(|event| BattleScriptAttackstringMessage {
        message_id: "STRINGID_USEDMOVE",
        scripting_battler: event.scripting_battler,
        action_snapshot: event.action_snapshot.map(|snapshot| {
            factory_core::battle_script_attackstring::BattleScriptAttackstringActionSnapshot {
                attacker: snapshot.attacker,
                current_move: snapshot.current_move,
                current_move_position: snapshot.current_move_position,
            }
        }),
    })
}

#[test]
fn complete_projected_outputs_and_blocks_match_canonical_typescript() {
    assert_eq!(BATTLE_SCRIPT_ATTACKSTRING_CASES.len(), 21);
    for (case_index, case) in BATTLE_SCRIPT_ATTACKSTRING_CASES.iter().enumerate() {
        let input_rules = rules(case.initial_rules);
        let scheduler = BattleScriptAttackstringScheduler {
            message_display_active: case.initial_display_active,
            pending_controller_battlers: case.initial_pending,
            pending_count: case
                .initial_pending
                .iter()
                .filter(|value| value.is_some())
                .count() as u8,
        };
        let before_rules = input_rules;
        let before_scheduler = scheduler;

        let message_port = if case.category == "null-port" {
            BattleScriptAttackstringMessagePort::Unavailable
        } else {
            BattleScriptAttackstringMessagePort::Available
        };

        let outcome =
            apply_battle_script_attackstring(0x1234, &input_rules, &scheduler, message_port);

        assert_eq!(
            input_rules, before_rules,
            "case {case_index} {} mutated rules input",
            case.label
        );
        assert_eq!(
            scheduler, before_scheduler,
            "case {case_index} {} mutated scheduler input",
            case.label
        );

        if case.is_block {
            let block = match outcome {
                BattleScriptAttackstringOutcome::Block(block) => block,
                other => panic!(
                    "case {case_index} {} expected block, got {other:?}",
                    case.label
                ),
            };
            match (case.block_reason_kind, block) {
                (
                    Some("controller-busy"),
                    BattleScriptAttackstringBlock::ControllerBusy { program_counter, opcode_id, opcode_name },
                ) => {
                    assert_eq!(program_counter, 0x1234);
                    assert_eq!(opcode_id, 0x02);
                    assert_eq!(opcode_name, "B_SCR_OP_ATTACKSTRING");
                }
                (
                    Some("source-context-unavailable"),
                    BattleScriptAttackstringBlock::PrepareMessageUnavailable {
                        program_counter,
                        opcode_id,
                        opcode_name,
                        port,
                        operand_expression,
                    },
                ) => {
                    assert_eq!(program_counter, 0x1234);
                    assert_eq!(opcode_id, 0x02);
                    assert_eq!(opcode_name, "B_SCR_OP_ATTACKSTRING");
                    assert_eq!(port, "prepare-message");
                    assert_eq!(operand_expression, "STRINGID_USEDMOVE");
                }
                (reason, block) => panic!(
                    "case {case_index} {} block reason mismatch: expected={reason:?}, actual={block:?}",
                    case.label
                ),
            }
        } else {
            match outcome {
                BattleScriptAttackstringOutcome::Advance {
                    rules: out_rules,
                    scheduler: out_scheduler,
                    event,
                } => {
                    assert_eq!(
                        vector_rules(out_rules),
                        case.expected_rules
                            .expect("advance case missing expected_rules"),
                        "case {case_index} {} projected rules",
                        case.label
                    );
                    assert_eq!(
                        out_scheduler.message_display_active,
                        case.expected_display_active
                            .expect("advance case missing expected_display_active"),
                        "case {case_index} {} messageDisplayActive",
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
    }
}

#[test]
fn registration_matches_canonical_typescript_and_keeps_exact_errors() {
    assert_eq!(BATTLE_SCRIPT_ATTACKSTRING_REGISTRATION_CASES.len(), 2);
    for case in BATTLE_SCRIPT_ATTACKSTRING_REGISTRATION_CASES {
        execute_registration_case(&case);
    }
}

fn execute_registration_case(case: &AttackstringRegistrationVectorCase) {
    let present = [BattleScriptAttackstringInstruction {
        opcode_name: "B_SCR_OP_ATTACKSTRING",
        opcode_id: case.expected_opcode_id.unwrap_or(0x02),
    }];
    let absent =
        [
            BattleScriptAttackstringInstruction {
                opcode_name: "B_SCR_OP_PPREDUCE",
                opcode_id: 0x03,
            },
        ];
    let instructions: &[BattleScriptAttackstringInstruction] = if case.expected_error.is_some() {
        &absent
    } else {
        &present
    };
    match (
        register_battle_script_attackstring_handler(instructions),
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
        BATTLE_SCRIPT_ATTACKSTRING_DOMAIN_CENSUS,
        [
            ("committed-sites", 135),
            ("behavior-cases", 21),
            ("registration-cases", 2)
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_ATTACKSTRING_CATEGORY_CENSUS,
        [
            ("controller-busy", 3),
            ("null-port", 2),
            ("print-path", 7),
            ("print-then-reenter", 2),
            ("printed-short-circuit", 7),
        ]
    );
    assert_eq!(
        BATTLE_SCRIPT_ATTACKSTRING_VECTOR_CORPUS_SHA256,
        "ec4b7f719748803c7968ad09e688df19be2dadc7b7503323318ed57e38681733"
    );
}
