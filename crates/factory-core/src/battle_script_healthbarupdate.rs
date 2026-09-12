//! Pure `B_SCR_OP_HEALTHBARUPDATE` (0x0B, `Cmd_healthbarupdate`) leaf: the
//! controller-busy gate, the NO_EFFECT short-circuit, the substitute
//! `STRINGID_SUBSTITUTEDAMAGED` message path, and the clamped health-bar
//! update path.
//!
//! Native twin of `createHealthbarupdateOpcodeHandler`
//! (`src/engine/battleScriptHitChainOpcode.ts:2378-2430`), the shared
//! helpers `resolveHitChainBattlerOperand` (`:772-790`), `requireBattlerRole`
//! (`:787-795`), `unsupportedBranch` (`:717-738`), `controllerBusyBlock`
//! (`:740-750`), `blockOnUnavailableMessage` (`:752-765`), `stringOperand`
//! (`:703-711`), `markBattleScriptControllerPending`
//! (`battleScriptMachine.ts:348-362`), and the canonical production
//! `externalPorts()` `isControllerIdle`/`prepareMessage`
//! (`src/engine/factoryBattleScriptFullTurnDecision.ts:840-1352`).
//!
//! Canonical semantics (`Cmd_healthbarupdate`,
//! `reference/pokeemerald/src/battle_script_commands.c:1807-1841`; dispatch
//! `:342` `//0xB`; forward decl `:90`;
//! `include/constants/battle_script_commands.h:17`; macro
//! `asm/macros/battle_script.inc:48-49`):
//!
//! 1. Busy gate first (`:1809-1810`, canonical `gBattleControllerExecFlags`;
//!    port twin = pending list non-empty) -> `ControllerBusy` Block.
//! 2. `MOVE_RESULT_NO_EFFECT` short-circuit (`:1812`, checked BEFORE the
//!    operand is resolved -- pinned ordering: a NO_EFFECT flags value with an
//!    unsupported selector still plain-advances, unlike `hitanimation`,
//!    which resolves the operand first) -> plain advance.
//! 3. `GetBattlerForBattleScript` (`:1814`) via `resolveHitChainBattlerOperand`:
//!    BS_TARGET/BS_ATTACKER/BS_FAINTED with the three verbatim role throws;
//!    any other selector (including a missing operand) -> `unsupported-branch`
//!    HALT with source construct `Cmd_healthbarupdate's
//!    GetBattlerForBattleScript selector (<expr>) is not BS_TARGET/BS_ATTACKER`
//!    (`<missing>` when absent), `battle_script_commands.c:1814` -- verbatim
//!    even though BS_FAINTED is accepted.
//! 4. Substitute message path (`:1816-1819`): `status2 & STATUS2_SUBSTITUTE
//!    != 0 && substituteHP != 0 && (hitMarker & HITMARKER_IGNORE_SUBSTITUTE)
//!    == 0` (note the polarity: IGNORE_SUBSTITUTE CLEAR takes the message
//!    path -- opposite of `hitanimation`'s suppression, which requires the
//!    bit SET) -> `prepareMessage(STRINGID_SUBSTITUTEDAMAGED)`; a null port
//!    (canonically unreachable, driven via an injected stub, matching
//!    `battle_script_attackstring.rs`) blocks with
//!    `PrepareMessageUnavailable`; else advance with ONE message event and NO
//!    controller pending -- pinned: the C substitute arm has no
//!    `MarkBattlerForControllerExec`. The payload is the same total native
//!    function as attackstring's `STRINGID_USEDMOVE` payload:
//!    `{ messageId, scriptingBattler, actionSnapshot iff attacker role is
//!    Some }`, substitutions always empty (verified field-for-field against
//!    the canonical `prepareMessage` closure in the generator, which fails
//!    loudly if the payload ever carries an unexpected field).
//! 5. Health-bar path (`:1821-1834`, otherwise): `healthValue =
//!    min(battleMoveDamage, 10000)` (`battleMoveDamage` is a signed i32 in
//!    spirit); mark the resolved battler controller-pending (no duplicate)
//!    and advance with ONE `health-bar-update` event. The C
//!    `gBattleResults.playerMonWasDamaged` write (`:1836-1837`) is
//!    orchestration-level battle-results state INTENTIONALLY ABSENT from the
//!    TS handler -- TS is the spec.
//!
//! Registration (`createBattleScriptHitChainOpcodeHandlers`'s module-local
//! `install`, row `:4731`): find-FIRST by opcode name; absence throws
//! `committed Battle Script program does not emit B_SCR_OP_HEALTHBARUPDATE`
//! verbatim.
//!
//! Committed census: 41 sites (22 `BS_ATTACKER` + 18 `BS_TARGET` + 1
//! `BS_FAINTED`, the Spikes-on-switch script; the fainted arm is
//! committed-reachable here, unlike `hitanimation`).
//!
//! No RNG, no jumps, no `rules` mutation at all.

use core::fmt;

/// Source `MAX_BATTLERS_COUNT`.
pub const BATTLE_SCRIPT_HEALTHBARUPDATE_BATTLER_COUNT: usize = 4;

pub const BATTLE_SCRIPT_HEALTHBARUPDATE_OPCODE: u8 = 0x0b;
pub const BATTLE_SCRIPT_HEALTHBARUPDATE_OPCODE_NAME: &str = "B_SCR_OP_HEALTHBARUPDATE";
pub const BATTLE_SCRIPT_HEALTHBARUPDATE_DISPATCHER: &str = "Cmd_healthbarupdate";
/// `grep -c $'\thealthbarupdate' reference/pokeemerald/data/battle_scripts_1.s`.
pub const BATTLE_SCRIPT_HEALTHBARUPDATE_CANONICAL_SITE_COUNT: usize = 41;
pub const BATTLE_SCRIPT_HEALTHBARUPDATE_BS_ATTACKER_SITE_COUNT: usize = 22;
pub const BATTLE_SCRIPT_HEALTHBARUPDATE_BS_TARGET_SITE_COUNT: usize = 18;
pub const BATTLE_SCRIPT_HEALTHBARUPDATE_BS_FAINTED_SITE_COUNT: usize = 1;

/// `src/engine/battleScriptSourceConstants.ts` -- `STATUS2_SUBSTITUTE`.
pub const BATTLE_SCRIPT_HEALTHBARUPDATE_STATUS2_SUBSTITUTE: u32 = 0x0100_0000;
/// `src/engine/battleScriptSourceConstants.ts` -- `HITMARKER_IGNORE_SUBSTITUTE`.
pub const BATTLE_SCRIPT_HEALTHBARUPDATE_HITMARKER_IGNORE_SUBSTITUTE: u32 = 1 << 8;
/// `src/engine/battleScriptRulesContext.ts` -- `MOVE_RESULT_NO_EFFECT`
/// (`MISSED | DOESNT_AFFECT_FOE | FAILED`).
pub const BATTLE_SCRIPT_HEALTHBARUPDATE_MOVE_RESULT_NO_EFFECT: u32 = (1 << 0) | (1 << 3) | (1 << 5);
/// `battle_script_commands.c:1824` -- `maxPossibleDmgValue`.
pub const BATTLE_SCRIPT_HEALTHBARUPDATE_MAX_HEALTH_VALUE: i32 = 10000;
/// The synthetic operand's only source-meaningful field
/// (`stringOperand("STRINGID_SUBSTITUTEDAMAGED", 1818).expression`).
pub const BATTLE_SCRIPT_HEALTHBARUPDATE_MESSAGE_ID: &str = "STRINGID_SUBSTITUTEDAMAGED";

/// Complete source battler-id domain.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptHealthbarupdateBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

impl BattleScriptHealthbarupdateBattler {
    #[must_use]
    pub const fn index(self) -> usize {
        self as usize
    }

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

/// `rulesContext.selectorRoles`' three battler-hit-chain-relevant bindings.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptHealthbarupdateRoles {
    pub attacker: Option<BattleScriptHealthbarupdateBattler>,
    pub target: Option<BattleScriptHealthbarupdateBattler>,
    pub fainted: Option<BattleScriptHealthbarupdateBattler>,
}

/// The narrow per-battler slice this command reads.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptHealthbarupdateBattlerState {
    pub status2: u32,
    pub substitute_hp: u8,
}

/// Scheduler projection: pending list plus count (M96 pending-list shape).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptHealthbarupdateScheduler {
    pub pending_controller_battlers:
        [Option<BattleScriptHealthbarupdateBattler>; BATTLE_SCRIPT_HEALTHBARUPDATE_BATTLER_COUNT],
    pub pending_count: u8,
}

/// `STRINGID_SUBSTITUTEDAMAGED`'s complete canonical payload shape: the same
/// total native function as attackstring's `STRINGID_USEDMOVE` payload --
/// `substitutions` is always `[]` (no field to carry, so omitted here
/// entirely), and `actionSnapshot` is present iff `rules.attacker` is `Some`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptHealthbarupdateMessage {
    pub message_id: &'static str,
    pub scripting_battler: u8,
    pub action_snapshot: Option<BattleScriptHealthbarupdateActionSnapshot>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptHealthbarupdateActionSnapshot {
    pub attacker: u8,
    pub current_move: u16,
    pub current_move_position: u8,
}

/// The one event either branch (message or health-bar) ever emits.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptHealthbarupdateEvent {
    Message(BattleScriptHealthbarupdateMessage),
    /// `{ kind: "health-bar-update", battler, healthValue }`.
    HealthBarUpdate {
        battler: BattleScriptHealthbarupdateBattler,
        health_value: i32,
    },
}

/// Explicit port-availability input for the injected `prepareMessage` port.
/// `Unavailable` is unreachable under the canonical production port (never
/// returns null for a `STRINGID_`-prefixed expression) but is still part of
/// the spec factory -- the TS side drives this arm with an injected
/// null-returning stub on the same opcode-handler factory (attackstring
/// precedent).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptHealthbarupdateMessagePort {
    Available,
    Unavailable,
}

/// Mirrors canonical `unsupportedBranch`'s reason object verbatim.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BattleScriptHealthbarupdateUnsupportedBranch {
    pub program_counter: u32,
    pub opcode_id: u8,
    pub opcode_name: &'static str,
    pub source_construct: String,
    pub source_file: &'static str,
    pub source_line: u32,
}

/// The two typed block reasons, matching `battleScriptMachine.ts`'s `{
/// kind: "block", reason: ... }` transitions verbatim.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptHealthbarupdateBlock {
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

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BattleScriptHealthbarupdateOutcome {
    Advance {
        scheduler: BattleScriptHealthbarupdateScheduler,
        event: Option<BattleScriptHealthbarupdateEvent>,
    },
    Block(BattleScriptHealthbarupdateBlock),
    Halt(BattleScriptHealthbarupdateUnsupportedBranch),
}

/// Exact observable role-related throws, verbatim from
/// `requireBattlerRole`/`resolveHitChainBattlerOperand`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptHealthbarupdateError {
    MissingAttackerRole,
    MissingTargetRole,
    MissingFaintedRole,
}

impl fmt::Display for BattleScriptHealthbarupdateError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::MissingAttackerRole => {
                write!(
                    formatter,
                    "Battle Script hit-chain command requires a attacker role"
                )
            }
            Self::MissingTargetRole => {
                write!(
                    formatter,
                    "Battle Script hit-chain command requires a target role"
                )
            }
            Self::MissingFaintedRole => write!(
                formatter,
                "Battle Script HP command requires a fainted role"
            ),
        }
    }
}

impl std::error::Error for BattleScriptHealthbarupdateError {}

enum BattleScriptHealthbarupdateResolved {
    Battler(BattleScriptHealthbarupdateBattler),
    Unsupported,
}

/// Native twin of `resolveHitChainBattlerOperand`
/// (`battleScriptHitChainOpcode.ts:772-790`). `operand_expression` is `None`
/// for a missing operand, matching `context.instruction.operands[0]?.expression`.
fn resolve_hit_chain_battler_operand(
    roles: &BattleScriptHealthbarupdateRoles,
    operand_expression: Option<&str>,
) -> Result<BattleScriptHealthbarupdateResolved, BattleScriptHealthbarupdateError> {
    match operand_expression {
        Some("BS_TARGET") => roles
            .target
            .map(BattleScriptHealthbarupdateResolved::Battler)
            .ok_or(BattleScriptHealthbarupdateError::MissingTargetRole),
        Some("BS_ATTACKER") => roles
            .attacker
            .map(BattleScriptHealthbarupdateResolved::Battler)
            .ok_or(BattleScriptHealthbarupdateError::MissingAttackerRole),
        Some("BS_FAINTED") => roles
            .fainted
            .map(BattleScriptHealthbarupdateResolved::Battler)
            .ok_or(BattleScriptHealthbarupdateError::MissingFaintedRole),
        _ => Ok(BattleScriptHealthbarupdateResolved::Unsupported),
    }
}

/// Native twin of `markBattleScriptControllerPending`
/// (`battleScriptMachine.ts:348-362`): no-duplicate append.
fn mark_healthbarupdate_pending(
    scheduler: &BattleScriptHealthbarupdateScheduler,
    battler: BattleScriptHealthbarupdateBattler,
) -> BattleScriptHealthbarupdateScheduler {
    let count = scheduler.pending_count as usize;
    if scheduler.pending_controller_battlers[..count].contains(&Some(battler)) {
        return *scheduler;
    }
    let mut next = *scheduler;
    next.pending_controller_battlers[count] = Some(battler);
    next.pending_count = scheduler.pending_count + 1;
    next
}

/// Native immutable-value twin of canonical `createHealthbarupdateOpcodeHandler`.
#[allow(clippy::too_many_arguments)]
#[must_use = "outcome carries the block/halt or the advanced scheduler/event"]
pub fn apply_battle_script_healthbarupdate(
    program_counter: u32,
    roles: &BattleScriptHealthbarupdateRoles,
    battlers: &[BattleScriptHealthbarupdateBattlerState;
         BATTLE_SCRIPT_HEALTHBARUPDATE_BATTLER_COUNT],
    move_result_flags: u32,
    hit_marker: u32,
    battle_move_damage: i32,
    scripting_battler: u8,
    current_move: u16,
    current_move_position: u8,
    scheduler: &BattleScriptHealthbarupdateScheduler,
    operand_expression: Option<&str>,
    message_port: BattleScriptHealthbarupdateMessagePort,
) -> Result<BattleScriptHealthbarupdateOutcome, BattleScriptHealthbarupdateError> {
    if scheduler.pending_count != 0 {
        return Ok(BattleScriptHealthbarupdateOutcome::Block(
            BattleScriptHealthbarupdateBlock::ControllerBusy {
                program_counter,
                opcode_id: BATTLE_SCRIPT_HEALTHBARUPDATE_OPCODE,
                opcode_name: BATTLE_SCRIPT_HEALTHBARUPDATE_OPCODE_NAME,
            },
        ));
    }

    if move_result_flags & BATTLE_SCRIPT_HEALTHBARUPDATE_MOVE_RESULT_NO_EFFECT != 0 {
        return Ok(BattleScriptHealthbarupdateOutcome::Advance {
            scheduler: *scheduler,
            event: None,
        });
    }

    let battler = match resolve_hit_chain_battler_operand(roles, operand_expression)? {
        BattleScriptHealthbarupdateResolved::Battler(battler) => battler,
        BattleScriptHealthbarupdateResolved::Unsupported => {
            return Ok(BattleScriptHealthbarupdateOutcome::Halt(
                BattleScriptHealthbarupdateUnsupportedBranch {
                    program_counter,
                    opcode_id: BATTLE_SCRIPT_HEALTHBARUPDATE_OPCODE,
                    opcode_name: BATTLE_SCRIPT_HEALTHBARUPDATE_OPCODE_NAME,
                    source_construct: format!(
                        "Cmd_healthbarupdate's GetBattlerForBattleScript selector ({}) is not BS_TARGET/BS_ATTACKER",
                        operand_expression.unwrap_or("<missing>")
                    ),
                    source_file: "battle_script_commands.c",
                    source_line: 1814,
                },
            ));
        }
    };

    let state = &battlers[battler.index()];
    let substitute_active = (state.status2 & BATTLE_SCRIPT_HEALTHBARUPDATE_STATUS2_SUBSTITUTE) != 0
        && state.substitute_hp != 0
        && (hit_marker & BATTLE_SCRIPT_HEALTHBARUPDATE_HITMARKER_IGNORE_SUBSTITUTE) == 0;

    if substitute_active {
        return match message_port {
            BattleScriptHealthbarupdateMessagePort::Unavailable => {
                Ok(BattleScriptHealthbarupdateOutcome::Block(
                    BattleScriptHealthbarupdateBlock::PrepareMessageUnavailable {
                        program_counter,
                        opcode_id: BATTLE_SCRIPT_HEALTHBARUPDATE_OPCODE,
                        opcode_name: BATTLE_SCRIPT_HEALTHBARUPDATE_OPCODE_NAME,
                        port: "prepare-message",
                        operand_expression: BATTLE_SCRIPT_HEALTHBARUPDATE_MESSAGE_ID,
                    },
                ))
            }
            BattleScriptHealthbarupdateMessagePort::Available => {
                let event = BattleScriptHealthbarupdateMessage {
                    message_id: BATTLE_SCRIPT_HEALTHBARUPDATE_MESSAGE_ID,
                    scripting_battler,
                    action_snapshot: roles.attacker.map(|attacker| {
                        BattleScriptHealthbarupdateActionSnapshot {
                            attacker: attacker.as_u8(),
                            current_move,
                            current_move_position,
                        }
                    }),
                };
                Ok(BattleScriptHealthbarupdateOutcome::Advance {
                    scheduler: *scheduler,
                    event: Some(BattleScriptHealthbarupdateEvent::Message(event)),
                })
            }
        };
    }

    let health_value = battle_move_damage.min(BATTLE_SCRIPT_HEALTHBARUPDATE_MAX_HEALTH_VALUE);
    let next_scheduler = mark_healthbarupdate_pending(scheduler, battler);
    Ok(BattleScriptHealthbarupdateOutcome::Advance {
        scheduler: next_scheduler,
        event: Some(BattleScriptHealthbarupdateEvent::HealthBarUpdate { battler, health_value }),
    })
}

/// Registration-only instruction projection: `healthbarupdate` carries no
/// operand-shape validation at registration time.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptHealthbarupdateInstruction<'a> {
    pub opcode_name: &'a str,
    pub opcode_id: u8,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptHealthbarupdateRegistration {
    pub opcode_id: u8,
}

/// Exact observable registration error.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptHealthbarupdateRegistrationError {
    HandlerNotRegistered,
}

impl fmt::Display for BattleScriptHealthbarupdateRegistrationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::HandlerNotRegistered => write!(
                formatter,
                "committed Battle Script program does not emit {BATTLE_SCRIPT_HEALTHBARUPDATE_OPCODE_NAME}"
            ),
        }
    }
}

impl std::error::Error for BattleScriptHealthbarupdateRegistrationError {}

/// Native projection of `createBattleScriptHitChainOpcodeHandlers`'s
/// module-local `install`: find the FIRST instruction by opcode name;
/// absence errors verbatim; no other validation.
pub fn register_battle_script_healthbarupdate_handler(
    instructions: &[BattleScriptHealthbarupdateInstruction<'_>],
) -> Result<BattleScriptHealthbarupdateRegistration, BattleScriptHealthbarupdateRegistrationError> {
    instructions
        .iter()
        .find(|instruction| instruction.opcode_name == BATTLE_SCRIPT_HEALTHBARUPDATE_OPCODE_NAME)
        .map(|instruction| BattleScriptHealthbarupdateRegistration {
            opcode_id: instruction.opcode_id,
        })
        .ok_or(BattleScriptHealthbarupdateRegistrationError::HandlerNotRegistered)
}

/// Independent source, dispatch, and body evidence.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptHealthbarupdateDecompDispatchEvidence {
    pub dispatch_line: u32,
    pub forward_decl_line: u32,
    pub header_enum_line: u32,
    pub handler_line: u32,
    pub busy_check_line: u32,
    pub busy_return_line: u32,
    pub no_effect_check_line: u32,
    pub selector_read_line: u32,
    pub substitute_check_line: u32,
    pub prepare_string_battle_line: u32,
    pub clamp_start_line: u32,
    pub clamp_end_line: u32,
    pub emit_health_bar_update_line: u32,
    pub mark_battler_line: u32,
    pub player_mon_was_damaged_line: u32,
    pub advance_line: u32,
    pub macro_declaration_line: u32,
    pub macro_opcode_line: u32,
}

pub const BATTLE_SCRIPT_HEALTHBARUPDATE_DECOMP_DISPATCH_EVIDENCE:
    BattleScriptHealthbarupdateDecompDispatchEvidence =
    BattleScriptHealthbarupdateDecompDispatchEvidence {
        dispatch_line: 342,
        forward_decl_line: 90,
        header_enum_line: 17,
        handler_line: 1807,
        busy_check_line: 1809,
        busy_return_line: 1810,
        no_effect_check_line: 1812,
        selector_read_line: 1814,
        substitute_check_line: 1816,
        prepare_string_battle_line: 1818,
        clamp_start_line: 1824,
        clamp_end_line: 1830,
        emit_health_bar_update_line: 1832,
        mark_battler_line: 1833,
        player_mon_was_damaged_line: 1836,
        advance_line: 1840,
        macro_declaration_line: 48,
        macro_opcode_line: 49,
    };

#[cfg(test)]
mod tests {
    use super::*;

    fn roles(
        attacker: Option<u8>,
        target: Option<u8>,
        fainted: Option<u8>,
    ) -> BattleScriptHealthbarupdateRoles {
        BattleScriptHealthbarupdateRoles {
            attacker: attacker.map(|v| BattleScriptHealthbarupdateBattler::from_u8(v).unwrap()),
            target: target.map(|v| BattleScriptHealthbarupdateBattler::from_u8(v).unwrap()),
            fainted: fainted.map(|v| BattleScriptHealthbarupdateBattler::from_u8(v).unwrap()),
        }
    }

    fn idle_scheduler() -> BattleScriptHealthbarupdateScheduler {
        BattleScriptHealthbarupdateScheduler {
            pending_controller_battlers: [None; 4],
            pending_count: 0,
        }
    }

    fn busy_scheduler(
        battler: BattleScriptHealthbarupdateBattler,
    ) -> BattleScriptHealthbarupdateScheduler {
        let mut cells = [None; 4];
        cells[0] = Some(battler);
        BattleScriptHealthbarupdateScheduler {
            pending_controller_battlers: cells,
            pending_count: 1,
        }
    }

    fn no_substitute_battlers() -> [BattleScriptHealthbarupdateBattlerState; 4] {
        [BattleScriptHealthbarupdateBattlerState { status2: 0, substitute_hp: 0 }; 4]
    }

    #[allow(clippy::too_many_arguments)]
    fn call(
        roles: &BattleScriptHealthbarupdateRoles,
        battlers: &[BattleScriptHealthbarupdateBattlerState; 4],
        move_result_flags: u32,
        hit_marker: u32,
        battle_move_damage: i32,
        scheduler: &BattleScriptHealthbarupdateScheduler,
        operand_expression: Option<&str>,
        message_port: BattleScriptHealthbarupdateMessagePort,
    ) -> Result<BattleScriptHealthbarupdateOutcome, BattleScriptHealthbarupdateError> {
        apply_battle_script_healthbarupdate(
            0,
            roles,
            battlers,
            move_result_flags,
            hit_marker,
            battle_move_damage,
            0,
            33,
            0,
            scheduler,
            operand_expression,
            message_port,
        )
    }

    #[test]
    fn busy_gate_preempts_everything() {
        let roles = roles(Some(0), Some(1), None);
        let outcome = call(
            &roles,
            &no_substitute_battlers(),
            0,
            0,
            500,
            &busy_scheduler(BattleScriptHealthbarupdateBattler::Battler2),
            Some("BS_TARGET"),
            BattleScriptHealthbarupdateMessagePort::Available,
        )
        .unwrap();
        assert!(matches!(
            outcome,
            BattleScriptHealthbarupdateOutcome::Block(
                BattleScriptHealthbarupdateBlock::ControllerBusy { .. }
            )
        ));
    }

    #[test]
    fn no_effect_short_circuits_before_operand_resolution() {
        // An unsupported selector would normally halt, but NO_EFFECT wins first.
        let roles = roles(Some(0), Some(1), None);
        let outcome = call(
            &roles,
            &no_substitute_battlers(),
            BATTLE_SCRIPT_HEALTHBARUPDATE_MOVE_RESULT_NO_EFFECT,
            0,
            500,
            &idle_scheduler(),
            Some("BS_SCRIPTING"),
            BattleScriptHealthbarupdateMessagePort::Available,
        )
        .unwrap();
        assert_eq!(
            outcome,
            BattleScriptHealthbarupdateOutcome::Advance {
                scheduler: idle_scheduler(),
                event: None
            }
        );
    }

    #[test]
    fn unknown_selector_halts_verbatim() {
        let roles = roles(Some(0), Some(1), None);
        let outcome = call(
            &roles,
            &no_substitute_battlers(),
            0,
            0,
            500,
            &idle_scheduler(),
            Some("BS_SCRIPTING"),
            BattleScriptHealthbarupdateMessagePort::Available,
        )
        .unwrap();
        match outcome {
            BattleScriptHealthbarupdateOutcome::Halt(halt) => {
                assert_eq!(
                    halt.source_construct,
                    "Cmd_healthbarupdate's GetBattlerForBattleScript selector (BS_SCRIPTING) is not BS_TARGET/BS_ATTACKER"
                );
                assert_eq!(halt.source_file, "battle_script_commands.c");
                assert_eq!(halt.source_line, 1814);
            }
            other => panic!("expected halt, got {other:?}"),
        }
    }

    #[test]
    fn missing_operand_halts_with_missing_placeholder() {
        let roles = roles(Some(0), Some(1), None);
        let outcome = call(
            &roles,
            &no_substitute_battlers(),
            0,
            0,
            500,
            &idle_scheduler(),
            None,
            BattleScriptHealthbarupdateMessagePort::Available,
        )
        .unwrap();
        match outcome {
            BattleScriptHealthbarupdateOutcome::Halt(halt) => assert_eq!(
                halt.source_construct,
                "Cmd_healthbarupdate's GetBattlerForBattleScript selector (<missing>) is not BS_TARGET/BS_ATTACKER"
            ),
            other => panic!("expected halt, got {other:?}"),
        }
    }

    #[test]
    fn missing_role_throws_verbatim_for_all_three_selectors() {
        let error = call(
            &roles(None, Some(1), None),
            &no_substitute_battlers(),
            0,
            0,
            0,
            &idle_scheduler(),
            Some("BS_ATTACKER"),
            BattleScriptHealthbarupdateMessagePort::Available,
        )
        .unwrap_err();
        assert_eq!(
            error.to_string(),
            "Battle Script hit-chain command requires a attacker role"
        );

        let error = call(
            &roles(Some(0), None, None),
            &no_substitute_battlers(),
            0,
            0,
            0,
            &idle_scheduler(),
            Some("BS_TARGET"),
            BattleScriptHealthbarupdateMessagePort::Available,
        )
        .unwrap_err();
        assert_eq!(
            error.to_string(),
            "Battle Script hit-chain command requires a target role"
        );

        let error = call(
            &roles(Some(0), Some(1), None),
            &no_substitute_battlers(),
            0,
            0,
            0,
            &idle_scheduler(),
            Some("BS_FAINTED"),
            BattleScriptHealthbarupdateMessagePort::Available,
        )
        .unwrap_err();
        assert_eq!(
            error.to_string(),
            "Battle Script HP command requires a fainted role"
        );
    }

    #[test]
    fn fainted_selector_health_bar_path_emits_for_the_fainted_battler() {
        let roles = roles(Some(0), Some(1), Some(2));
        let outcome = call(
            &roles,
            &no_substitute_battlers(),
            0,
            0,
            123,
            &idle_scheduler(),
            Some("BS_FAINTED"),
            BattleScriptHealthbarupdateMessagePort::Available,
        )
        .unwrap();
        match outcome {
            BattleScriptHealthbarupdateOutcome::Advance { event, scheduler } => {
                assert_eq!(
                    event,
                    Some(BattleScriptHealthbarupdateEvent::HealthBarUpdate {
                        battler: BattleScriptHealthbarupdateBattler::Battler2,
                        health_value: 123,
                    })
                );
                assert_eq!(
                    scheduler.pending_controller_battlers[0],
                    Some(BattleScriptHealthbarupdateBattler::Battler2)
                );
            }
            other => panic!("expected advance, got {other:?}"),
        }
    }

    #[test]
    fn health_bar_path_clamp_trio_and_negative_pass_through() {
        let roles = roles(Some(0), Some(1), None);
        for (damage, expected) in [
            (9_999i32, 9_999i32),
            (10_000, 10_000),
            (10_001, 10_000),
            (-500, -500),
        ] {
            let outcome = call(
                &roles,
                &no_substitute_battlers(),
                0,
                0,
                damage,
                &idle_scheduler(),
                Some("BS_TARGET"),
                BattleScriptHealthbarupdateMessagePort::Available,
            )
            .unwrap();
            match outcome {
                BattleScriptHealthbarupdateOutcome::Advance {
                    event:
                        Some(BattleScriptHealthbarupdateEvent::HealthBarUpdate { health_value, .. }),
                    ..
                } => assert_eq!(health_value, expected, "damage {damage}"),
                other => panic!(
                    "damage {damage}: expected advance with health-bar-update, got {other:?}"
                ),
            }
        }
    }

    #[test]
    fn mark_pending_helper_is_no_duplicate() {
        // The busy gate (pending non-empty -> Block) fires before this
        // command ever marks a battler, so a pre-pending resolved battler is
        // unreachable through `apply_battle_script_healthbarupdate` itself
        // (unlike `hitanimation`, which has no busy gate) -- pin the shared
        // no-duplicate append behavior directly on the internal helper.
        let already_pending = busy_scheduler(BattleScriptHealthbarupdateBattler::Battler1);
        let next = mark_healthbarupdate_pending(
            &already_pending,
            BattleScriptHealthbarupdateBattler::Battler1,
        );
        assert_eq!(next, already_pending);
    }

    #[test]
    fn substitute_message_path_requires_all_three_conjuncts() {
        let roles_value = roles(Some(0), Some(1), None);
        let mut battlers = no_substitute_battlers();
        battlers[1] = BattleScriptHealthbarupdateBattlerState {
            status2: BATTLE_SCRIPT_HEALTHBARUPDATE_STATUS2_SUBSTITUTE,
            substitute_hp: 5,
        };

        // All three conjuncts true (IGNORE_SUBSTITUTE CLEAR) -> message path.
        let outcome = call(
            &roles_value,
            &battlers,
            0,
            0,
            77,
            &idle_scheduler(),
            Some("BS_TARGET"),
            BattleScriptHealthbarupdateMessagePort::Available,
        )
        .unwrap();
        match outcome {
            BattleScriptHealthbarupdateOutcome::Advance { event, scheduler } => {
                assert_eq!(
                    scheduler,
                    idle_scheduler(),
                    "message path must not mark pending"
                );
                match event {
                    Some(BattleScriptHealthbarupdateEvent::Message(message)) => {
                        assert_eq!(message.message_id, "STRINGID_SUBSTITUTEDAMAGED");
                        assert_eq!(
                            message.action_snapshot,
                            Some(BattleScriptHealthbarupdateActionSnapshot {
                                attacker: 0,
                                current_move: 33,
                                current_move_position: 0,
                            })
                        );
                    }
                    other => panic!("expected message event, got {other:?}"),
                }
            }
            other => panic!("expected advance, got {other:?}"),
        }

        // IGNORE_SUBSTITUTE SET -> falls through to health-bar path.
        let outcome = call(
            &roles_value,
            &battlers,
            0,
            BATTLE_SCRIPT_HEALTHBARUPDATE_HITMARKER_IGNORE_SUBSTITUTE,
            77,
            &idle_scheduler(),
            Some("BS_TARGET"),
            BattleScriptHealthbarupdateMessagePort::Available,
        )
        .unwrap();
        assert!(matches!(
            outcome,
            BattleScriptHealthbarupdateOutcome::Advance {
                event: Some(BattleScriptHealthbarupdateEvent::HealthBarUpdate { .. }),
                ..
            }
        ));

        // No SUBSTITUTE bit -> falls through.
        let mut no_bit = no_substitute_battlers();
        no_bit[1].substitute_hp = 5;
        let outcome = call(
            &roles_value,
            &no_bit,
            0,
            0,
            77,
            &idle_scheduler(),
            Some("BS_TARGET"),
            BattleScriptHealthbarupdateMessagePort::Available,
        )
        .unwrap();
        assert!(matches!(
            outcome,
            BattleScriptHealthbarupdateOutcome::Advance {
                event: Some(BattleScriptHealthbarupdateEvent::HealthBarUpdate { .. }),
                ..
            }
        ));

        // substituteHP == 0 -> falls through.
        let mut zero_hp = no_substitute_battlers();
        zero_hp[1].status2 = BATTLE_SCRIPT_HEALTHBARUPDATE_STATUS2_SUBSTITUTE;
        let outcome = call(
            &roles_value,
            &zero_hp,
            0,
            0,
            77,
            &idle_scheduler(),
            Some("BS_TARGET"),
            BattleScriptHealthbarupdateMessagePort::Available,
        )
        .unwrap();
        assert!(matches!(
            outcome,
            BattleScriptHealthbarupdateOutcome::Advance {
                event: Some(BattleScriptHealthbarupdateEvent::HealthBarUpdate { .. }),
                ..
            }
        ));
    }

    #[test]
    fn substitute_message_path_omits_action_snapshot_when_attacker_role_null() {
        let roles_value = roles(None, Some(1), None);
        let mut battlers = no_substitute_battlers();
        battlers[1] = BattleScriptHealthbarupdateBattlerState {
            status2: BATTLE_SCRIPT_HEALTHBARUPDATE_STATUS2_SUBSTITUTE,
            substitute_hp: 5,
        };
        let outcome = call(
            &roles_value,
            &battlers,
            0,
            0,
            77,
            &idle_scheduler(),
            Some("BS_TARGET"),
            BattleScriptHealthbarupdateMessagePort::Available,
        )
        .unwrap();
        match outcome {
            BattleScriptHealthbarupdateOutcome::Advance {
                event: Some(BattleScriptHealthbarupdateEvent::Message(message)),
                ..
            } => assert_eq!(message.action_snapshot, None),
            other => panic!("expected message event, got {other:?}"),
        }
    }

    #[test]
    fn substitute_message_path_null_port_blocks_with_exact_reason() {
        let roles_value = roles(Some(0), Some(1), None);
        let mut battlers = no_substitute_battlers();
        battlers[1] = BattleScriptHealthbarupdateBattlerState {
            status2: BATTLE_SCRIPT_HEALTHBARUPDATE_STATUS2_SUBSTITUTE,
            substitute_hp: 5,
        };
        let outcome = call(
            &roles_value,
            &battlers,
            0,
            0,
            77,
            &idle_scheduler(),
            Some("BS_TARGET"),
            BattleScriptHealthbarupdateMessagePort::Unavailable,
        )
        .unwrap();
        assert_eq!(
            outcome,
            BattleScriptHealthbarupdateOutcome::Block(
                BattleScriptHealthbarupdateBlock::PrepareMessageUnavailable {
                    program_counter: 0,
                    opcode_id: BATTLE_SCRIPT_HEALTHBARUPDATE_OPCODE,
                    opcode_name: BATTLE_SCRIPT_HEALTHBARUPDATE_OPCODE_NAME,
                    port: "prepare-message",
                    operand_expression: "STRINGID_SUBSTITUTEDAMAGED",
                }
            )
        );
    }

    #[test]
    fn registration_finds_first_and_reports_verbatim_absence() {
        let present = [
            BattleScriptHealthbarupdateInstruction {
                opcode_name: "B_SCR_OP_ACCURACYCHECK",
                opcode_id: 0x01,
            },
            BattleScriptHealthbarupdateInstruction {
                opcode_name: BATTLE_SCRIPT_HEALTHBARUPDATE_OPCODE_NAME,
                opcode_id: BATTLE_SCRIPT_HEALTHBARUPDATE_OPCODE,
            },
        ];
        assert_eq!(
            register_battle_script_healthbarupdate_handler(&present)
                .unwrap()
                .opcode_id,
            BATTLE_SCRIPT_HEALTHBARUPDATE_OPCODE
        );

        let absent = [BattleScriptHealthbarupdateInstruction {
            opcode_name: "B_SCR_OP_PPREDUCE",
            opcode_id: 0x03,
        }];
        assert_eq!(
            register_battle_script_healthbarupdate_handler(&absent)
                .unwrap_err()
                .to_string(),
            "committed Battle Script program does not emit B_SCR_OP_HEALTHBARUPDATE"
        );
    }

    #[test]
    fn battler_ids_round_trip_from_u8() {
        for value in 0u8..4 {
            let battler = BattleScriptHealthbarupdateBattler::from_u8(value).unwrap();
            assert_eq!(
                BattleScriptHealthbarupdateBattler::from_u8(battler.as_u8()),
                Some(battler)
            );
        }
        assert_eq!(BattleScriptHealthbarupdateBattler::from_u8(4), None);
    }
}
