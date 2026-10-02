//! Pure `B_SCR_OP_ATTACKSTRING` (0x02) leaf: the controller-busy gate, the
//! already-printed short-circuit, the `STRINGID_USEDMOVE` print path, and
//! the (canonically unreachable) null-port block.
//!
//! Native twin of `createAttackstringOpcodeHandler`
//! (`src/engine/battleScriptHitChainOpcode.ts:1308-1349`), its
//! `controllerBusyBlock` helper (`:740-750`), the module-local
//! `STRINGID_USEDMOVE_OPERAND` constant (`:1299-1306` -- only `.expression`
//! is source-meaningful at this port boundary), and the canonical production
//! `externalPorts()` closure (`src/engine/factoryBattleScriptFullTurnDecision.ts:840-1352`):
//! `isControllerIdle` (`:842-843`, `scheduler.pendingControllerBattlers.length
//! === 0`) and `prepareMessage`'s default fallthrough for a `STRINGID_`-
//! prefixed expression that matches no special substitution arm and no
//! token-gated field, which `STRINGID_USEDMOVE` is (verified by executing
//! that exact closure in the generator).
//!
//! Canonical semantics: `Cmd_attackstring`
//! (`reference/pokeemerald/src/battle_script_commands.c:1191-1203`) -- the
//! `if (gBattleControllerExecFlags) return;` spin (`:1193-1194`) IS modeled
//! here (unlike `battle_script_ppreduce.rs`'s twin, which omits it): the TS
//! handler's `isControllerIdle` gate is its port twin.
//! `PrepareStringBattle(STRINGID_USEDMOVE, gBattlerAttacker)` +
//! `gHitMarker |= HITMARKER_ATTACKSTRING_PRINTED` (`:1198-1199`), advance
//! (`:1201`), `gBattleCommunication[MSG_DISPLAY] = 0` (`:1202`); dispatch row
//! `:333` (`//0x2`); forward decl `:81`;
//! `include/constants/battle_script_commands.h:8`; macro
//! `asm/macros/battle_script.inc:12-13`.
//!
//! Gate order (pinned): controller-busy Block preempts the printed
//! short-circuit, which preempts the print path. The printed short-circuit
//! never touches `hit_marker` and never emits an event; only the print path
//! sets `HITMARKER_ATTACKSTRING_PRINTED`. Both the short-circuit and the
//! print path clear scheduler `message_display_active` unconditionally; the
//! busy Block changes neither rules nor scheduler.
//!
//! The null-`prepareMessage` Block is unreachable under the canonical
//! production port (which never returns null for a `STRINGID_`-prefixed
//! expression) -- it is modeled here as an explicit port-availability input,
//! matching how the TS side drives it with an injected null-returning
//! `prepareMessage` stub on the same opcode-handler factory.

use core::fmt;

/// Source `MAX_BATTLERS_COUNT`; all source-indexed state retains four cells.
pub const BATTLE_SCRIPT_ATTACKSTRING_BATTLER_COUNT: usize = 4;
/// `B_SCR_OP_ATTACKSTRING` in the source command enum / dispatch table.
pub const BATTLE_SCRIPT_ATTACKSTRING_OPCODE: u8 = 0x02;
/// Concrete opcode name selected by canonical registration.
pub const BATTLE_SCRIPT_ATTACKSTRING_OPCODE_NAME: &str = "B_SCR_OP_ATTACKSTRING";
/// Source dispatch-table handler identity.
pub const BATTLE_SCRIPT_ATTACKSTRING_DISPATCHER: &str = "Cmd_attackstring";
/// `attackstring` has no operands; the committed corpus carries this many
/// identical concrete sites (`grep -c $'\tattackstring'
/// reference/pokeemerald/data/battle_scripts_1.s`).
pub const BATTLE_SCRIPT_ATTACKSTRING_CANONICAL_SITE_COUNT: usize = 135;

/// `src/engine/battleScriptSourceConstants.ts:126` -- `HITMARKER_NO_ATTACKSTRING`.
pub const BATTLE_SCRIPT_ATTACKSTRING_HITMARKER_NO_ATTACKSTRING: u32 = 1 << 9;
/// `src/engine/battleScriptSourceConstants.ts:127` -- `HITMARKER_ATTACKSTRING_PRINTED`.
pub const BATTLE_SCRIPT_ATTACKSTRING_HITMARKER_ATTACKSTRING_PRINTED: u32 = 1 << 10;
/// The synthetic operand's only source-meaningful field
/// (`STRINGID_USEDMOVE_OPERAND.expression`, `battleScriptHitChainOpcode.ts:1301`).
pub const BATTLE_SCRIPT_ATTACKSTRING_MESSAGE_ID: &str = "STRINGID_USEDMOVE";

/// Complete source battler-id domain used by roles and source-indexed arrays.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptAttackstringBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

impl BattleScriptAttackstringBattler {
    /// Zero-based source-array index.
    #[must_use]
    pub const fn index(self) -> usize {
        self as usize
    }

    /// Source `u8` battler id.
    #[must_use]
    pub const fn as_u8(self) -> u8 {
        self as u8
    }

    #[must_use]
    pub const fn from_u8(value: u8) -> Option<Self> {
        match value {
            0 => Some(Self::Battler0),
            1 => Some(Self::Battler1),
            2 => Some(Self::Battler2),
            3 => Some(Self::Battler3),
            _ => None,
        }
    }
}

/// Complete narrow rules slice read or written by this command.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptAttackstringRules {
    pub hit_marker: u32,
    /// `rules.selectorRoles.attacker` -- gates `actionSnapshot` presence in
    /// the print-path event; distinct from source `gBattlerAttacker`, which
    /// the C body reads unconditionally (TS is the spec).
    pub attacker: Option<BattleScriptAttackstringBattler>,
    pub current_move: u16,
    pub current_move_position: u8,
    /// Source `gBattleScripting.battler` at print time.
    pub scripting_battler: u8,
}

/// Scheduler projection: the busy-gate pending list plus the one field this
/// command ever mutates. Pending-list shape copied from
/// `battle_script_ppreduce.rs`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptAttackstringScheduler {
    pub message_display_active: bool,
    pub pending_controller_battlers:
        [Option<BattleScriptAttackstringBattler>; BATTLE_SCRIPT_ATTACKSTRING_BATTLER_COUNT],
    pub pending_count: u8,
}

/// `STRINGID_USEDMOVE`'s complete canonical payload shape: `substitutions`
/// is always `[]` for this fixed messageId (no field to carry, so omitted
/// here entirely), and `actionSnapshot` is present iff `rules.attacker` is
/// `Some` -- verified field-for-field against the canonical production
/// `prepareMessage` port in the generator.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptAttackstringMessage {
    pub message_id: &'static str,
    pub scripting_battler: u8,
    pub action_snapshot: Option<BattleScriptAttackstringActionSnapshot>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptAttackstringActionSnapshot {
    pub attacker: u8,
    pub current_move: u16,
    pub current_move_position: u8,
}

/// Explicit port-availability input for the injected `prepareMessage` port.
/// `Unavailable` is unreachable under the canonical production port (never
/// returns null for a `STRINGID_`-prefixed expression) but is still part of
/// the spec factory -- the TS side drives this arm with an injected
/// null-returning stub on the same opcode-handler factory.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptAttackstringMessagePort {
    Available,
    Unavailable,
}

/// Complete immutable result of one handler application. `attackstring`
/// never jumps or consumes RNG.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptAttackstringOutcome {
    Advance {
        rules: BattleScriptAttackstringRules,
        scheduler: BattleScriptAttackstringScheduler,
        event: Option<BattleScriptAttackstringMessage>,
    },
    Block(BattleScriptAttackstringBlock),
}

/// The two typed block reasons, matching
/// `battleScriptMachine.ts`'s `{ kind: "block", reason: ... }` transitions
/// verbatim.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptAttackstringBlock {
    ControllerBusy {
        program_counter: u32,
        opcode_id: u8,
        opcode_name: &'static str,
    },
    PrepareMessageUnavailable {
        program_counter: u32,
        opcode_id: u8,
        opcode_name: &'static str,
        port: &'static str,
        operand_expression: &'static str,
    },
}

/// Registration-only instruction projection: `attackstring` has no
/// operands, so canonical `install` performs no shape validation beyond
/// finding the first matching opcode name.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptAttackstringInstruction<'a> {
    pub opcode_name: &'a str,
    pub opcode_id: u8,
}

/// The one dynamic opcode key emitted by successful registration.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptAttackstringRegistration {
    pub opcode_id: u8,
}

/// Exact observable registration error.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptAttackstringError {
    HandlerNotRegistered,
}

impl fmt::Display for BattleScriptAttackstringError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::HandlerNotRegistered => write!(
                formatter,
                "committed Battle Script program does not emit {BATTLE_SCRIPT_ATTACKSTRING_OPCODE_NAME}"
            ),
        }
    }
}

impl std::error::Error for BattleScriptAttackstringError {}

/// Native projection of `createBattleScriptHitChainOpcodeHandlers`'s
/// module-local `install`: find the FIRST instruction by opcode name;
/// absence errors verbatim; no other validation (there are no operands to
/// check).
pub fn register_battle_script_attackstring_handler<'a>(
    instructions: &[BattleScriptAttackstringInstruction<'a>],
) -> Result<BattleScriptAttackstringRegistration, BattleScriptAttackstringError> {
    instructions
        .iter()
        .find(|instruction| instruction.opcode_name == BATTLE_SCRIPT_ATTACKSTRING_OPCODE_NAME)
        .map(|instruction| BattleScriptAttackstringRegistration {
            opcode_id: instruction.opcode_id,
        })
        .ok_or(BattleScriptAttackstringError::HandlerNotRegistered)
}

/// Native immutable-value twin of canonical `createAttackstringOpcodeHandler`.
/// `program_counter` is the executing instruction's own; `attackstring`
/// itself carries no operands, so no other per-site input is needed.
#[must_use]
pub fn apply_battle_script_attackstring(
    program_counter: u32,
    rules: &BattleScriptAttackstringRules,
    scheduler: &BattleScriptAttackstringScheduler,
    message_port: BattleScriptAttackstringMessagePort,
) -> BattleScriptAttackstringOutcome {
    if scheduler.pending_count != 0 {
        return BattleScriptAttackstringOutcome::Block(
            BattleScriptAttackstringBlock::ControllerBusy {
                program_counter,
                opcode_id: BATTLE_SCRIPT_ATTACKSTRING_OPCODE,
                opcode_name: BATTLE_SCRIPT_ATTACKSTRING_OPCODE_NAME,
            },
        );
    }

    let printed = (rules.hit_marker
        & (BATTLE_SCRIPT_ATTACKSTRING_HITMARKER_NO_ATTACKSTRING
            | BATTLE_SCRIPT_ATTACKSTRING_HITMARKER_ATTACKSTRING_PRINTED))
        != 0;
    if printed {
        let mut next_scheduler = *scheduler;
        next_scheduler.message_display_active = false;
        return BattleScriptAttackstringOutcome::Advance {
            rules: *rules,
            scheduler: next_scheduler,
            event: None,
        };
    }

    match message_port {
        BattleScriptAttackstringMessagePort::Unavailable => BattleScriptAttackstringOutcome::Block(
            BattleScriptAttackstringBlock::PrepareMessageUnavailable {
                program_counter,
                opcode_id: BATTLE_SCRIPT_ATTACKSTRING_OPCODE,
                opcode_name: BATTLE_SCRIPT_ATTACKSTRING_OPCODE_NAME,
                port: "prepare-message",
                operand_expression: BATTLE_SCRIPT_ATTACKSTRING_MESSAGE_ID,
            },
        ),
        BattleScriptAttackstringMessagePort::Available => {
            let mut next_rules = *rules;
            next_rules.hit_marker |= BATTLE_SCRIPT_ATTACKSTRING_HITMARKER_ATTACKSTRING_PRINTED;
            let mut next_scheduler = *scheduler;
            next_scheduler.message_display_active = false;
            let event = BattleScriptAttackstringMessage {
                message_id: BATTLE_SCRIPT_ATTACKSTRING_MESSAGE_ID,
                scripting_battler: rules.scripting_battler,
                action_snapshot: rules.attacker.map(|attacker| {
                    BattleScriptAttackstringActionSnapshot {
                        attacker: attacker.as_u8(),
                        current_move: rules.current_move,
                        current_move_position: rules.current_move_position,
                    }
                }),
            };
            BattleScriptAttackstringOutcome::Advance {
                rules: next_rules,
                scheduler: next_scheduler,
                event: Some(event),
            }
        }
    }
}

/// Independent source, dispatch, and body evidence.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptAttackstringDecompDispatchEvidence {
    pub opcode_name: &'static str,
    pub opcode_id: u8,
    pub dispatcher: &'static str,
    pub dispatch_line: u32,
    pub forward_decl_line: u32,
    pub handler_line: u32,
    pub header_enum_line: u32,
    pub busy_check_line: u32,
    pub busy_return_line: u32,
    pub printed_check_line: u32,
    pub prepare_string_battle_line: u32,
    pub hitmarker_set_line: u32,
    pub advance_line: u32,
    pub msg_display_clear_line: u32,
    pub macro_declaration_line: u32,
    pub macro_opcode_line: u32,
}

pub const BATTLE_SCRIPT_ATTACKSTRING_DECOMP_DISPATCH_EVIDENCE:
    BattleScriptAttackstringDecompDispatchEvidence =
    BattleScriptAttackstringDecompDispatchEvidence {
        opcode_name: BATTLE_SCRIPT_ATTACKSTRING_OPCODE_NAME,
        opcode_id: BATTLE_SCRIPT_ATTACKSTRING_OPCODE,
        dispatcher: BATTLE_SCRIPT_ATTACKSTRING_DISPATCHER,
        dispatch_line: 333,
        forward_decl_line: 81,
        handler_line: 1191,
        header_enum_line: 8,
        busy_check_line: 1193,
        busy_return_line: 1194,
        printed_check_line: 1196,
        prepare_string_battle_line: 1198,
        hitmarker_set_line: 1199,
        advance_line: 1201,
        msg_display_clear_line: 1202,
        macro_declaration_line: 12,
        macro_opcode_line: 13,
    };

#[cfg(test)]
mod tests {
    use super::*;

    fn base_rules() -> BattleScriptAttackstringRules {
        BattleScriptAttackstringRules {
            hit_marker: 0,
            attacker: Some(BattleScriptAttackstringBattler::Battler0),
            current_move: 33, // MOVE_TACKLE
            current_move_position: 0,
            scripting_battler: 0,
        }
    }

    fn idle_scheduler() -> BattleScriptAttackstringScheduler {
        BattleScriptAttackstringScheduler {
            message_display_active: true,
            pending_controller_battlers: [None; 4],
            pending_count: 0,
        }
    }

    fn busy_scheduler(
        pending: &[BattleScriptAttackstringBattler],
    ) -> BattleScriptAttackstringScheduler {
        let mut cells = [None; 4];
        for (index, battler) in pending.iter().enumerate() {
            cells[index] = Some(*battler);
        }
        BattleScriptAttackstringScheduler {
            message_display_active: true,
            pending_controller_battlers: cells,
            pending_count: pending.len() as u8,
        }
    }

    #[test]
    fn busy_gate_preempts_everything_and_changes_nothing() {
        let rules = base_rules();
        let scheduler = busy_scheduler(&[BattleScriptAttackstringBattler::Battler0]);
        let outcome = apply_battle_script_attackstring(
            42,
            &rules,
            &scheduler,
            BattleScriptAttackstringMessagePort::Available,
        );
        assert_eq!(
            outcome,
            BattleScriptAttackstringOutcome::Block(BattleScriptAttackstringBlock::ControllerBusy {
                program_counter: 42,
                opcode_id: BATTLE_SCRIPT_ATTACKSTRING_OPCODE,
                opcode_name: BATTLE_SCRIPT_ATTACKSTRING_OPCODE_NAME,
            })
        );

        // Busy also preempts an unavailable message port and the printed
        // short-circuit -- gate order is busy > printed > print.
        let mut printed_rules = rules;
        printed_rules.hit_marker = BATTLE_SCRIPT_ATTACKSTRING_HITMARKER_ATTACKSTRING_PRINTED;
        let outcome = apply_battle_script_attackstring(
            7,
            &printed_rules,
            &busy_scheduler(&[BattleScriptAttackstringBattler::Battler1]),
            BattleScriptAttackstringMessagePort::Unavailable,
        );
        assert!(matches!(
            outcome,
            BattleScriptAttackstringOutcome::Block(
                BattleScriptAttackstringBlock::ControllerBusy { .. }
            )
        ));
    }

    #[test]
    fn printed_short_circuit_never_touches_hit_marker_or_emits_and_beats_print() {
        let mut rules = base_rules();
        rules.hit_marker = BATTLE_SCRIPT_ATTACKSTRING_HITMARKER_ATTACKSTRING_PRINTED;
        let scheduler = idle_scheduler();
        let outcome = apply_battle_script_attackstring(
            0,
            &rules,
            &scheduler,
            BattleScriptAttackstringMessagePort::Unavailable, // beats print path, never consulted
        );
        match outcome {
            BattleScriptAttackstringOutcome::Advance {
                rules: out_rules,
                scheduler: out_scheduler,
                event,
            } => {
                assert_eq!(out_rules.hit_marker, rules.hit_marker);
                assert_eq!(event, None);
                assert!(!out_scheduler.message_display_active);
            }
            other => panic!("expected advance, got {other:?}"),
        }

        rules.hit_marker = BATTLE_SCRIPT_ATTACKSTRING_HITMARKER_NO_ATTACKSTRING;
        let outcome = apply_battle_script_attackstring(
            0,
            &rules,
            &scheduler,
            BattleScriptAttackstringMessagePort::Unavailable,
        );
        match outcome {
            BattleScriptAttackstringOutcome::Advance { rules: out_rules, .. } => {
                assert_eq!(out_rules.hit_marker, rules.hit_marker);
            }
            other => panic!("expected advance, got {other:?}"),
        }
    }

    #[test]
    fn printed_short_circuit_message_display_active_true_to_false_and_false_stays_false() {
        let mut rules = base_rules();
        rules.hit_marker = BATTLE_SCRIPT_ATTACKSTRING_HITMARKER_ATTACKSTRING_PRINTED;
        let mut scheduler = idle_scheduler();
        scheduler.message_display_active = true;
        let outcome = apply_battle_script_attackstring(
            0,
            &rules,
            &scheduler,
            BattleScriptAttackstringMessagePort::Unavailable,
        );
        let BattleScriptAttackstringOutcome::Advance { scheduler: out, .. } = outcome else {
            panic!("expected advance")
        };
        assert!(!out.message_display_active);

        scheduler.message_display_active = false;
        let outcome = apply_battle_script_attackstring(
            0,
            &rules,
            &scheduler,
            BattleScriptAttackstringMessagePort::Unavailable,
        );
        let BattleScriptAttackstringOutcome::Advance { scheduler: out, .. } = outcome else {
            panic!("expected advance")
        };
        assert!(!out.message_display_active);
    }

    #[test]
    fn print_path_sets_hit_marker_bit_preserving_others_clears_display_and_emits_one_event() {
        let mut rules = base_rules();
        rules.hit_marker = 0xF000_0001; // arbitrary unrelated bits must survive
        let scheduler = idle_scheduler();
        let outcome = apply_battle_script_attackstring(
            0,
            &rules,
            &scheduler,
            BattleScriptAttackstringMessagePort::Available,
        );
        match outcome {
            BattleScriptAttackstringOutcome::Advance {
                rules: out_rules,
                scheduler: out_scheduler,
                event,
            } => {
                assert_eq!(
                    out_rules.hit_marker,
                    rules.hit_marker | BATTLE_SCRIPT_ATTACKSTRING_HITMARKER_ATTACKSTRING_PRINTED
                );
                assert!(!out_scheduler.message_display_active);
                let event = event.expect("expected exactly one event");
                assert_eq!(event.message_id, "STRINGID_USEDMOVE");
                assert_eq!(event.scripting_battler, rules.scripting_battler);
                assert_eq!(
                    event.action_snapshot,
                    Some(BattleScriptAttackstringActionSnapshot {
                        attacker: rules.attacker.unwrap().as_u8(),
                        current_move: rules.current_move,
                        current_move_position: rules.current_move_position,
                    })
                );
            }
            other => panic!("expected advance, got {other:?}"),
        }
    }

    #[test]
    fn print_path_omits_action_snapshot_exactly_when_attacker_role_is_null() {
        let mut rules = base_rules();
        rules.attacker = None;
        let outcome = apply_battle_script_attackstring(
            0,
            &rules,
            &idle_scheduler(),
            BattleScriptAttackstringMessagePort::Available,
        );
        let BattleScriptAttackstringOutcome::Advance { event, .. } = outcome else {
            panic!("expected advance")
        };
        assert_eq!(event.unwrap().action_snapshot, None);
    }

    #[test]
    fn print_then_reenter_short_circuits_via_printed_bit() {
        let rules = base_rules();
        let scheduler = idle_scheduler();
        let first = apply_battle_script_attackstring(
            0,
            &rules,
            &scheduler,
            BattleScriptAttackstringMessagePort::Available,
        );
        let BattleScriptAttackstringOutcome::Advance {
            rules: after_first,
            scheduler: sched_after_first,
            ..
        } = first
        else {
            panic!("expected advance")
        };
        let second = apply_battle_script_attackstring(
            1,
            &after_first,
            &sched_after_first,
            BattleScriptAttackstringMessagePort::Unavailable, // never consulted this time
        );
        match second {
            BattleScriptAttackstringOutcome::Advance { event, .. } => assert_eq!(event, None),
            other => panic!("expected advance, got {other:?}"),
        }
    }

    #[test]
    fn null_port_blocks_with_exact_reason() {
        let outcome = apply_battle_script_attackstring(
            99,
            &base_rules(),
            &idle_scheduler(),
            BattleScriptAttackstringMessagePort::Unavailable,
        );
        assert_eq!(
            outcome,
            BattleScriptAttackstringOutcome::Block(
                BattleScriptAttackstringBlock::PrepareMessageUnavailable {
                    program_counter: 99,
                    opcode_id: BATTLE_SCRIPT_ATTACKSTRING_OPCODE,
                    opcode_name: BATTLE_SCRIPT_ATTACKSTRING_OPCODE_NAME,
                    port: "prepare-message",
                    operand_expression: "STRINGID_USEDMOVE",
                }
            )
        );
    }

    #[test]
    fn registration_finds_first_and_reports_verbatim_absence() {
        let present = [
            BattleScriptAttackstringInstruction {
                opcode_name: "B_SCR_OP_ACCURACYCHECK",
                opcode_id: 0x01,
            },
            BattleScriptAttackstringInstruction {
                opcode_name: BATTLE_SCRIPT_ATTACKSTRING_OPCODE_NAME,
                opcode_id: BATTLE_SCRIPT_ATTACKSTRING_OPCODE,
            },
            BattleScriptAttackstringInstruction {
                opcode_name: BATTLE_SCRIPT_ATTACKSTRING_OPCODE_NAME,
                opcode_id: 0x99,
            },
        ];
        assert_eq!(
            register_battle_script_attackstring_handler(&present)
                .unwrap()
                .opcode_id,
            BATTLE_SCRIPT_ATTACKSTRING_OPCODE
        );

        let absent = [BattleScriptAttackstringInstruction {
            opcode_name: "B_SCR_OP_PPREDUCE",
            opcode_id: 0x03,
        }];
        assert_eq!(
            register_battle_script_attackstring_handler(&absent)
                .unwrap_err()
                .to_string(),
            "committed Battle Script program does not emit B_SCR_OP_ATTACKSTRING"
        );
    }

    #[test]
    fn battler_ids_round_trip_from_u8() {
        for value in 0u8..4 {
            let battler = BattleScriptAttackstringBattler::from_u8(value).unwrap();
            assert_eq!(
                BattleScriptAttackstringBattler::from_u8(battler.as_u8()),
                Some(battler)
            );
        }
        assert_eq!(BattleScriptAttackstringBattler::from_u8(4), None);
    }
}
