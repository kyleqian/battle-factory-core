//! Pure `B_SCR_OP_HITANIMATION` (0x5C, `Cmd_hitanimation`) /
//! `B_SCR_OP_EFFECTIVENESSSOUND` (0x0E, `Cmd_effectivenesssound`) pair --
//! two thin hit-feedback opcodes grouped for their shared
//! `resolveHitChainBattlerOperand`/`requireBattlerRole` role plumbing and
//! `moveResultFlags`-driven ladders. `B_SCR_OP_ATTACKANIMATION` is
//! deliberately out of scope.
//!
//! Native twin of `hitanimationOpcodeHandler`
//! (`src/engine/battleScriptHitChainOpcode.ts:2341-2400`) and
//! `createEffectivenesssoundOpcodeHandler` (`:2297-2340`), plus the shared
//! helpers `resolveHitChainBattlerOperand` (`:772-790`), `requireBattlerRole`
//! (`:787-795`), `unsupportedBranch` (`:717-738`), `controllerBusyBlock`
//! (`:740-750`), and `markBattleScriptControllerPending`
//! (`battleScriptMachine.ts:348-362`).
//!
//! Canonical semantics:
//!
//! `Cmd_hitanimation` (`reference/pokeemerald/src/battle_script_commands.c`
//! `:5558-5576`; dispatch `:423` `//0x5C`; forward decl `:171`; header
//! `include/constants/battle_script_commands.h:98`; macro
//! `asm/macros/battle_script.inc:539`) has **no**
//! `gBattleControllerExecFlags` busy gate -- pinned exactly, unlike its
//! siblings and unlike `effectivenesssound` below. Ladder: (a) resolve the
//! battler operand via `resolveHitChainBattlerOperand`
//! (BS_TARGET/BS_ATTACKER/BS_FAINTED; any other selector, including a
//! missing operand, is `unsupported-branch` HALT with source construct
//! `Cmd_hitanimation's GetBattlerForBattleScript selector (<expr>) is not
//! BS_TARGET/BS_ATTACKER`, `<missing>` when the operand is absent,
//! `battle_script_commands.c:5560`); (b)
//! `moveResultFlags & MOVE_RESULT_NO_EFFECT` -> plain advance; (c)
//! substitute suppression
//! (`(hitMarker & HITMARKER_IGNORE_SUBSTITUTE) != 0 && (battler.status2 &
//! STATUS2_SUBSTITUTE) != 0 && battler.substituteHP != 0`) -> plain advance;
//! (d) else mark the battler controller-pending (no duplicate) and advance
//! with one `animation` event (`HIT_ANIMATION`, no arguments). Committed
//! census: 14 sites (12 `BS_TARGET` + 2 `BS_ATTACKER`;
//! `BS_FAINTED` has zero committed sites -- exercised only via custom
//! operand surgery in the generator).
//!
//! `Cmd_effectivenesssound` (`:2001-2047`; dispatch `:345` `//0xE`; forward
//! decl `:93`; header `:20`; macro `:62`, no operand) busy-gates FIRST
//! (canonical port: pending list non-empty), then `requireBattlerRole`s the
//! target (verbatim throw), then over `flags = moveResultFlags`: `MISSED`
//! set -> no sound; else over `resultBits = flags & !MISSED`, an exact-match
//! tier (`SUPER_EFFECTIVE` -> 14, `NOT_VERY_EFFECTIVE` -> 12,
//! `DOESNT_AFFECT_FOE`/`FAILED` -> no sound) followed by the C switch's
//! `default` arm's bitwise tier (`& SUPER_EFFECTIVE` -> 14, else
//! `& NOT_VERY_EFFECTIVE` -> 12, else `& (DOESNT_AFFECT_FOE|FAILED) == 0` ->
//! 13, else no sound). No sound -> plain advance; sound -> advance + mark
//! target controller-pending + one `play-se` event. Committed census: 18
//! identical no-operand sites.
//!
//! Registration (`createBattleScriptHitChainOpcodeHandlers`'s module-local
//! `install`, `:4708-4712`, rows `:4729-4730`): find-FIRST by opcode name;
//! absence throws `committed Battle Script program does not emit <name>`
//! verbatim; no other validation.
//!
//! Neither handler ever consumes RNG, jumps, or mutates `rulesContext` --
//! `rules` inputs are read-only for both opcodes.

use core::fmt;

/// Source `MAX_BATTLERS_COUNT`.
pub const BATTLE_SCRIPT_HIT_FEEDBACK_BATTLER_COUNT: usize = 4;

pub const BATTLE_SCRIPT_HITANIMATION_OPCODE: u8 = 0x5c;
pub const BATTLE_SCRIPT_HITANIMATION_OPCODE_NAME: &str = "B_SCR_OP_HITANIMATION";
pub const BATTLE_SCRIPT_HITANIMATION_DISPATCHER: &str = "Cmd_hitanimation";
/// `grep -c $'\thitanimation' reference/pokeemerald/data/battle_scripts_1.s`.
pub const BATTLE_SCRIPT_HITANIMATION_CANONICAL_SITE_COUNT: usize = 14;
pub const BATTLE_SCRIPT_HITANIMATION_BS_TARGET_SITE_COUNT: usize = 12;
pub const BATTLE_SCRIPT_HITANIMATION_BS_ATTACKER_SITE_COUNT: usize = 2;

pub const BATTLE_SCRIPT_EFFECTIVENESSSOUND_OPCODE: u8 = 0x0e;
pub const BATTLE_SCRIPT_EFFECTIVENESSSOUND_OPCODE_NAME: &str = "B_SCR_OP_EFFECTIVENESSSOUND";
pub const BATTLE_SCRIPT_EFFECTIVENESSSOUND_DISPATCHER: &str = "Cmd_effectivenesssound";
/// `grep -c $'\teffectivenesssound$' reference/pokeemerald/data/battle_scripts_1.s`.
pub const BATTLE_SCRIPT_EFFECTIVENESSSOUND_CANONICAL_SITE_COUNT: usize = 18;

/// `src/engine/battleScriptSourceConstants.ts:34` -- `STATUS2_SUBSTITUTE`.
pub const BATTLE_SCRIPT_HIT_FEEDBACK_STATUS2_SUBSTITUTE: u32 = 0x0100_0000;
/// `src/engine/battleScriptSourceConstants.ts:125` -- `HITMARKER_IGNORE_SUBSTITUTE`.
pub const BATTLE_SCRIPT_HIT_FEEDBACK_HITMARKER_IGNORE_SUBSTITUTE: u32 = 1 << 8;
/// `src/engine/battleScriptRulesContext.ts:150` -- `MOVE_RESULT_NO_EFFECT`
/// (`MISSED | DOESNT_AFFECT_FOE | FAILED`).
pub const BATTLE_SCRIPT_HIT_FEEDBACK_MOVE_RESULT_NO_EFFECT: u32 = (1 << 0) | (1 << 3) | (1 << 5);
/// `src/engine/battleScriptSourceConstants.ts:142-148`.
pub const BATTLE_SCRIPT_HIT_FEEDBACK_MOVE_RESULT_MISSED: u32 = 1 << 0;
pub const BATTLE_SCRIPT_HIT_FEEDBACK_MOVE_RESULT_SUPER_EFFECTIVE: u32 = 1 << 1;
pub const BATTLE_SCRIPT_HIT_FEEDBACK_MOVE_RESULT_NOT_VERY_EFFECTIVE: u32 = 1 << 2;
pub const BATTLE_SCRIPT_HIT_FEEDBACK_MOVE_RESULT_DOESNT_AFFECT_FOE: u32 = 1 << 3;
pub const BATTLE_SCRIPT_HIT_FEEDBACK_MOVE_RESULT_FAILED: u32 = 1 << 5;
/// `include/constants/songs.h:18-20`, `battleScriptHitChainOpcode.ts:699-701`.
pub const BATTLE_SCRIPT_HIT_FEEDBACK_SE_NOT_EFFECTIVE: u8 = 12;
pub const BATTLE_SCRIPT_HIT_FEEDBACK_SE_EFFECTIVE: u8 = 13;
pub const BATTLE_SCRIPT_HIT_FEEDBACK_SE_SUPER_EFFECTIVE: u8 = 14;

/// Complete source battler-id domain.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptHitFeedbackBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

impl BattleScriptHitFeedbackBattler {
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
pub struct BattleScriptHitFeedbackRoles {
    pub attacker: Option<BattleScriptHitFeedbackBattler>,
    pub target: Option<BattleScriptHitFeedbackBattler>,
    pub fainted: Option<BattleScriptHitFeedbackBattler>,
}

/// The narrow per-battler slice `hitanimation` reads.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptHitFeedbackBattlerState {
    pub status2: u32,
    pub substitute_hp: u8,
}

/// Scheduler projection: pending list plus count (attackstring/ppreduce
/// pending-list shape).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptHitFeedbackScheduler {
    pub pending_controller_battlers:
        [Option<BattleScriptHitFeedbackBattler>; BATTLE_SCRIPT_HIT_FEEDBACK_BATTLER_COUNT],
    pub pending_count: u8,
}

/// The one event either opcode ever emits.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptHitFeedbackEvent {
    /// `{ kind: "animation", animationId: "HIT_ANIMATION", battler, arguments: [] }`.
    Animation {
        battler: BattleScriptHitFeedbackBattler,
    },
    /// `{ kind: "play-se", battler, songId }`.
    PlaySe {
        battler: BattleScriptHitFeedbackBattler,
        song_id: u8,
    },
}

/// Mirrors canonical `unsupportedBranch`'s reason object verbatim -- a valid
/// typed outcome, never an error (`hitanimation` only).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BattleScriptHitFeedbackUnsupportedBranch {
    pub program_counter: u32,
    pub opcode_id: u8,
    pub opcode_name: &'static str,
    pub source_construct: String,
    pub source_file: &'static str,
    pub source_line: u32,
}

/// Mirrors canonical `controllerBusyBlock`'s reason object verbatim
/// (`effectivenesssound` only).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptHitFeedbackControllerBusy {
    pub program_counter: u32,
    pub opcode_id: u8,
    pub opcode_name: &'static str,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BattleScriptHitanimationOutcome {
    Advance {
        scheduler: BattleScriptHitFeedbackScheduler,
        event: Option<BattleScriptHitFeedbackEvent>,
    },
    Halt(BattleScriptHitFeedbackUnsupportedBranch),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptEffectivenesssoundOutcome {
    Advance {
        scheduler: BattleScriptHitFeedbackScheduler,
        event: Option<BattleScriptHitFeedbackEvent>,
    },
    Block(BattleScriptHitFeedbackControllerBusy),
}

/// Exact observable role-related throws, verbatim from
/// `requireBattlerRole`/`resolveHitChainBattlerOperand`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptHitFeedbackError {
    MissingAttackerRole,
    MissingTargetRole,
    MissingFaintedRole,
}

impl fmt::Display for BattleScriptHitFeedbackError {
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

impl std::error::Error for BattleScriptHitFeedbackError {}

enum BattleScriptHitFeedbackResolved {
    Battler(BattleScriptHitFeedbackBattler),
    Unsupported,
}

/// Native twin of `resolveHitChainBattlerOperand`
/// (`battleScriptHitChainOpcode.ts:772-790`). `operand_expression` is `None`
/// for a missing operand, matching `context.instruction.operands[0]?.expression`.
fn resolve_hit_chain_battler_operand(
    roles: &BattleScriptHitFeedbackRoles,
    operand_expression: Option<&str>,
) -> Result<BattleScriptHitFeedbackResolved, BattleScriptHitFeedbackError> {
    match operand_expression {
        Some("BS_TARGET") => roles
            .target
            .map(BattleScriptHitFeedbackResolved::Battler)
            .ok_or(BattleScriptHitFeedbackError::MissingTargetRole),
        Some("BS_ATTACKER") => roles
            .attacker
            .map(BattleScriptHitFeedbackResolved::Battler)
            .ok_or(BattleScriptHitFeedbackError::MissingAttackerRole),
        Some("BS_FAINTED") => roles
            .fainted
            .map(BattleScriptHitFeedbackResolved::Battler)
            .ok_or(BattleScriptHitFeedbackError::MissingFaintedRole),
        _ => Ok(BattleScriptHitFeedbackResolved::Unsupported),
    }
}

/// Native twin of `requireBattlerRole(rulesContext, "target")`
/// (`battleScriptHitChainOpcode.ts:787-795`), verbatim throw included.
fn require_target_role(
    roles: &BattleScriptHitFeedbackRoles,
) -> Result<BattleScriptHitFeedbackBattler, BattleScriptHitFeedbackError> {
    roles
        .target
        .ok_or(BattleScriptHitFeedbackError::MissingTargetRole)
}

/// Native twin of `markBattleScriptControllerPending`
/// (`battleScriptMachine.ts:348-362`): no-duplicate append.
fn mark_hit_feedback_pending(
    scheduler: &BattleScriptHitFeedbackScheduler,
    battler: BattleScriptHitFeedbackBattler,
) -> BattleScriptHitFeedbackScheduler {
    let count = scheduler.pending_count as usize;
    if scheduler.pending_controller_battlers[..count].contains(&Some(battler)) {
        return *scheduler;
    }
    let mut next = *scheduler;
    next.pending_controller_battlers[count] = Some(battler);
    next.pending_count = scheduler.pending_count + 1;
    next
}

/// Native immutable-value twin of canonical `hitanimationOpcodeHandler`.
/// `rules` inputs are never mutated -- the outcome carries only `scheduler`
/// and `event` since `rulesContext` genuinely never changes.
#[must_use = "outcome carries the halt or the advanced scheduler/event"]
pub fn apply_battle_script_hitanimation(
    program_counter: u32,
    roles: &BattleScriptHitFeedbackRoles,
    battlers: &[BattleScriptHitFeedbackBattlerState; BATTLE_SCRIPT_HIT_FEEDBACK_BATTLER_COUNT],
    move_result_flags: u32,
    hit_marker: u32,
    scheduler: &BattleScriptHitFeedbackScheduler,
    operand_expression: Option<&str>,
) -> Result<BattleScriptHitanimationOutcome, BattleScriptHitFeedbackError> {
    let battler = match resolve_hit_chain_battler_operand(roles, operand_expression)? {
        BattleScriptHitFeedbackResolved::Battler(battler) => battler,
        BattleScriptHitFeedbackResolved::Unsupported => {
            return Ok(BattleScriptHitanimationOutcome::Halt(
                BattleScriptHitFeedbackUnsupportedBranch {
                    program_counter,
                    opcode_id: BATTLE_SCRIPT_HITANIMATION_OPCODE,
                    opcode_name: BATTLE_SCRIPT_HITANIMATION_OPCODE_NAME,
                    source_construct: format!(
                        "Cmd_hitanimation's GetBattlerForBattleScript selector ({}) is not BS_TARGET/BS_ATTACKER",
                        operand_expression.unwrap_or("<missing>")
                    ),
                    source_file: "battle_script_commands.c",
                    source_line: 5560,
                },
            ));
        }
    };

    if move_result_flags & BATTLE_SCRIPT_HIT_FEEDBACK_MOVE_RESULT_NO_EFFECT != 0 {
        return Ok(BattleScriptHitanimationOutcome::Advance { scheduler: *scheduler, event: None });
    }

    let state = &battlers[battler.index()];
    let substitute_active = (state.status2 & BATTLE_SCRIPT_HIT_FEEDBACK_STATUS2_SUBSTITUTE) != 0
        && state.substitute_hp != 0;
    let suppressed_by_substitute =
        (hit_marker & BATTLE_SCRIPT_HIT_FEEDBACK_HITMARKER_IGNORE_SUBSTITUTE) != 0
            && substitute_active;
    if suppressed_by_substitute {
        return Ok(BattleScriptHitanimationOutcome::Advance { scheduler: *scheduler, event: None });
    }

    let next_scheduler = mark_hit_feedback_pending(scheduler, battler);
    Ok(BattleScriptHitanimationOutcome::Advance {
        scheduler: next_scheduler,
        event: Some(BattleScriptHitFeedbackEvent::Animation { battler }),
    })
}

/// Native twin of the two-tier sound ladder inside canonical
/// `createEffectivenesssoundOpcodeHandler`: an exact-match tier, then (its
/// `default` arm) a bitwise tier.
#[must_use]
fn resolve_effectiveness_song_id(move_result_flags: u32) -> Option<u8> {
    if move_result_flags & BATTLE_SCRIPT_HIT_FEEDBACK_MOVE_RESULT_MISSED != 0 {
        return None;
    }
    let result_bits = move_result_flags & !BATTLE_SCRIPT_HIT_FEEDBACK_MOVE_RESULT_MISSED;
    if result_bits == BATTLE_SCRIPT_HIT_FEEDBACK_MOVE_RESULT_SUPER_EFFECTIVE {
        return Some(BATTLE_SCRIPT_HIT_FEEDBACK_SE_SUPER_EFFECTIVE);
    }
    if result_bits == BATTLE_SCRIPT_HIT_FEEDBACK_MOVE_RESULT_NOT_VERY_EFFECTIVE {
        return Some(BATTLE_SCRIPT_HIT_FEEDBACK_SE_NOT_EFFECTIVE);
    }
    if result_bits == BATTLE_SCRIPT_HIT_FEEDBACK_MOVE_RESULT_DOESNT_AFFECT_FOE
        || result_bits == BATTLE_SCRIPT_HIT_FEEDBACK_MOVE_RESULT_FAILED
    {
        return None;
    }
    if result_bits & BATTLE_SCRIPT_HIT_FEEDBACK_MOVE_RESULT_SUPER_EFFECTIVE != 0 {
        return Some(BATTLE_SCRIPT_HIT_FEEDBACK_SE_SUPER_EFFECTIVE);
    }
    if result_bits & BATTLE_SCRIPT_HIT_FEEDBACK_MOVE_RESULT_NOT_VERY_EFFECTIVE != 0 {
        return Some(BATTLE_SCRIPT_HIT_FEEDBACK_SE_NOT_EFFECTIVE);
    }
    if result_bits
        & (BATTLE_SCRIPT_HIT_FEEDBACK_MOVE_RESULT_DOESNT_AFFECT_FOE
            | BATTLE_SCRIPT_HIT_FEEDBACK_MOVE_RESULT_FAILED)
        == 0
    {
        return Some(BATTLE_SCRIPT_HIT_FEEDBACK_SE_EFFECTIVE);
    }
    None
}

/// Native immutable-value twin of canonical `createEffectivenesssoundOpcodeHandler`.
#[must_use = "outcome carries the block or the advanced scheduler/event"]
pub fn apply_battle_script_effectivenesssound(
    program_counter: u32,
    roles: &BattleScriptHitFeedbackRoles,
    move_result_flags: u32,
    scheduler: &BattleScriptHitFeedbackScheduler,
) -> Result<BattleScriptEffectivenesssoundOutcome, BattleScriptHitFeedbackError> {
    if scheduler.pending_count != 0 {
        return Ok(BattleScriptEffectivenesssoundOutcome::Block(
            BattleScriptHitFeedbackControllerBusy {
                program_counter,
                opcode_id: BATTLE_SCRIPT_EFFECTIVENESSSOUND_OPCODE,
                opcode_name: BATTLE_SCRIPT_EFFECTIVENESSSOUND_OPCODE_NAME,
            },
        ));
    }
    let target = require_target_role(roles)?;
    match resolve_effectiveness_song_id(move_result_flags) {
        None => Ok(BattleScriptEffectivenesssoundOutcome::Advance {
            scheduler: *scheduler,
            event: None,
        }),
        Some(song_id) => {
            let next_scheduler = mark_hit_feedback_pending(scheduler, target);
            Ok(BattleScriptEffectivenesssoundOutcome::Advance {
                scheduler: next_scheduler,
                event: Some(BattleScriptHitFeedbackEvent::PlaySe { battler: target, song_id }),
            })
        }
    }
}

/// Registration-only instruction projection shared by both opcodes: neither
/// carries operand shape validation at registration time.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptHitFeedbackInstruction<'a> {
    pub opcode_name: &'a str,
    pub opcode_id: u8,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptHitFeedbackRegistration {
    pub opcode_id: u8,
}

/// Exact observable registration error, verbatim per opcode name.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptHitFeedbackRegistrationError {
    opcode_name: &'static str,
}

impl fmt::Display for BattleScriptHitFeedbackRegistrationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            formatter,
            "committed Battle Script program does not emit {}",
            self.opcode_name
        )
    }
}

impl std::error::Error for BattleScriptHitFeedbackRegistrationError {}

/// Native projection of `createBattleScriptHitChainOpcodeHandlers`'s
/// module-local `install`: find the FIRST instruction by opcode name;
/// absence errors verbatim; no other validation.
fn register_hit_feedback_handler(
    instructions: &[BattleScriptHitFeedbackInstruction<'_>],
    opcode_name: &'static str,
) -> Result<BattleScriptHitFeedbackRegistration, BattleScriptHitFeedbackRegistrationError> {
    instructions
        .iter()
        .find(|instruction| instruction.opcode_name == opcode_name)
        .map(|instruction| BattleScriptHitFeedbackRegistration { opcode_id: instruction.opcode_id })
        .ok_or(BattleScriptHitFeedbackRegistrationError { opcode_name })
}

pub fn register_battle_script_hitanimation_handler(
    instructions: &[BattleScriptHitFeedbackInstruction<'_>],
) -> Result<BattleScriptHitFeedbackRegistration, BattleScriptHitFeedbackRegistrationError> {
    register_hit_feedback_handler(instructions, BATTLE_SCRIPT_HITANIMATION_OPCODE_NAME)
}

pub fn register_battle_script_effectivenesssound_handler(
    instructions: &[BattleScriptHitFeedbackInstruction<'_>],
) -> Result<BattleScriptHitFeedbackRegistration, BattleScriptHitFeedbackRegistrationError> {
    register_hit_feedback_handler(instructions, BATTLE_SCRIPT_EFFECTIVENESSSOUND_OPCODE_NAME)
}

/// Independent source, dispatch, and body evidence for both opcodes.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptHitFeedbackDecompDispatchEvidence {
    pub hitanimation_dispatch_line: u32,
    pub hitanimation_forward_decl_line: u32,
    pub hitanimation_header_enum_line: u32,
    pub hitanimation_handler_line: u32,
    pub hitanimation_selector_read_line: u32,
    pub hitanimation_no_effect_check_line: u32,
    pub hitanimation_substitute_check_line: u32,
    pub hitanimation_macro_declaration_line: u32,
    pub hitanimation_macro_opcode_line: u32,
    pub effectivenesssound_dispatch_line: u32,
    pub effectivenesssound_forward_decl_line: u32,
    pub effectivenesssound_header_enum_line: u32,
    pub effectivenesssound_handler_line: u32,
    pub effectivenesssound_busy_check_line: u32,
    pub effectivenesssound_busy_return_line: u32,
    pub effectivenesssound_missed_check_line: u32,
    pub effectivenesssound_switch_line: u32,
    pub effectivenesssound_default_super_check_line: u32,
    pub effectivenesssound_macro_declaration_line: u32,
    pub effectivenesssound_macro_opcode_line: u32,
}

pub const BATTLE_SCRIPT_HIT_FEEDBACK_DECOMP_DISPATCH_EVIDENCE:
    BattleScriptHitFeedbackDecompDispatchEvidence = BattleScriptHitFeedbackDecompDispatchEvidence {
    hitanimation_dispatch_line: 423,
    hitanimation_forward_decl_line: 171,
    hitanimation_header_enum_line: 98,
    hitanimation_handler_line: 5558,
    hitanimation_selector_read_line: 5560,
    hitanimation_no_effect_check_line: 5562,
    hitanimation_substitute_check_line: 5566,
    hitanimation_macro_declaration_line: 539,
    hitanimation_macro_opcode_line: 540,
    effectivenesssound_dispatch_line: 345,
    effectivenesssound_forward_decl_line: 93,
    effectivenesssound_header_enum_line: 20,
    effectivenesssound_handler_line: 2001,
    effectivenesssound_busy_check_line: 2003,
    effectivenesssound_busy_return_line: 2004,
    effectivenesssound_missed_check_line: 2007,
    effectivenesssound_switch_line: 2009,
    effectivenesssound_default_super_check_line: 2027,
    effectivenesssound_macro_declaration_line: 62,
    effectivenesssound_macro_opcode_line: 63,
};

#[cfg(test)]
mod tests {
    use super::*;

    fn roles(
        attacker: Option<u8>,
        target: Option<u8>,
        fainted: Option<u8>,
    ) -> BattleScriptHitFeedbackRoles {
        BattleScriptHitFeedbackRoles {
            attacker: attacker.map(|v| BattleScriptHitFeedbackBattler::from_u8(v).unwrap()),
            target: target.map(|v| BattleScriptHitFeedbackBattler::from_u8(v).unwrap()),
            fainted: fainted.map(|v| BattleScriptHitFeedbackBattler::from_u8(v).unwrap()),
        }
    }

    fn idle_scheduler() -> BattleScriptHitFeedbackScheduler {
        BattleScriptHitFeedbackScheduler {
            pending_controller_battlers: [None; 4],
            pending_count: 0,
        }
    }

    fn busy_scheduler(battler: BattleScriptHitFeedbackBattler) -> BattleScriptHitFeedbackScheduler {
        let mut cells = [None; 4];
        cells[0] = Some(battler);
        BattleScriptHitFeedbackScheduler { pending_controller_battlers: cells, pending_count: 1 }
    }

    fn no_substitute_battlers() -> [BattleScriptHitFeedbackBattlerState; 4] {
        [BattleScriptHitFeedbackBattlerState { status2: 0, substitute_hp: 0 }; 4]
    }

    #[test]
    fn hitanimation_no_busy_gate_pending_non_empty_still_executes() {
        let roles = roles(Some(0), Some(1), None);
        let outcome = apply_battle_script_hitanimation(
            5,
            &roles,
            &no_substitute_battlers(),
            0,
            0,
            &busy_scheduler(BattleScriptHitFeedbackBattler::Battler2),
            Some("BS_TARGET"),
        )
        .unwrap();
        assert!(matches!(
            outcome,
            BattleScriptHitanimationOutcome::Advance { .. }
        ));
    }

    #[test]
    fn hitanimation_unknown_selector_halts_verbatim() {
        let roles = roles(Some(0), Some(1), None);
        let outcome = apply_battle_script_hitanimation(
            9,
            &roles,
            &no_substitute_battlers(),
            0,
            0,
            &idle_scheduler(),
            Some("BS_SCRIPTING"),
        )
        .unwrap();
        match outcome {
            BattleScriptHitanimationOutcome::Halt(halt) => {
                assert_eq!(
                    halt.source_construct,
                    "Cmd_hitanimation's GetBattlerForBattleScript selector (BS_SCRIPTING) is not BS_TARGET/BS_ATTACKER"
                );
                assert_eq!(halt.source_file, "battle_script_commands.c");
                assert_eq!(halt.source_line, 5560);
                assert_eq!(halt.opcode_id, BATTLE_SCRIPT_HITANIMATION_OPCODE);
                assert_eq!(halt.opcode_name, BATTLE_SCRIPT_HITANIMATION_OPCODE_NAME);
                assert_eq!(halt.program_counter, 9);
            }
            other => panic!("expected halt, got {other:?}"),
        }
    }

    #[test]
    fn hitanimation_missing_operand_halts_with_missing_placeholder() {
        let roles = roles(Some(0), Some(1), None);
        let outcome = apply_battle_script_hitanimation(
            0,
            &roles,
            &no_substitute_battlers(),
            0,
            0,
            &idle_scheduler(),
            None,
        )
        .unwrap();
        match outcome {
            BattleScriptHitanimationOutcome::Halt(halt) => assert_eq!(
                halt.source_construct,
                "Cmd_hitanimation's GetBattlerForBattleScript selector (<missing>) is not BS_TARGET/BS_ATTACKER"
            ),
            other => panic!("expected halt, got {other:?}"),
        }
    }

    #[test]
    fn hitanimation_missing_role_throws_verbatim() {
        let roles_missing_attacker = roles(None, Some(1), None);
        let error = apply_battle_script_hitanimation(
            0,
            &roles_missing_attacker,
            &no_substitute_battlers(),
            0,
            0,
            &idle_scheduler(),
            Some("BS_ATTACKER"),
        )
        .unwrap_err();
        assert_eq!(
            error.to_string(),
            "Battle Script hit-chain command requires a attacker role"
        );

        let roles_missing_target = roles(Some(0), None, None);
        let error = apply_battle_script_hitanimation(
            0,
            &roles_missing_target,
            &no_substitute_battlers(),
            0,
            0,
            &idle_scheduler(),
            Some("BS_TARGET"),
        )
        .unwrap_err();
        assert_eq!(
            error.to_string(),
            "Battle Script hit-chain command requires a target role"
        );

        let roles_missing_fainted = roles(Some(0), Some(1), None);
        let error = apply_battle_script_hitanimation(
            0,
            &roles_missing_fainted,
            &no_substitute_battlers(),
            0,
            0,
            &idle_scheduler(),
            Some("BS_FAINTED"),
        )
        .unwrap_err();
        assert_eq!(
            error.to_string(),
            "Battle Script HP command requires a fainted role"
        );
    }

    #[test]
    fn hitanimation_fainted_selector_emits_for_the_fainted_battler() {
        let roles = roles(Some(0), Some(1), Some(2));
        let outcome = apply_battle_script_hitanimation(
            0,
            &roles,
            &no_substitute_battlers(),
            0,
            0,
            &idle_scheduler(),
            Some("BS_FAINTED"),
        )
        .unwrap();
        match outcome {
            BattleScriptHitanimationOutcome::Advance { event, scheduler } => {
                assert_eq!(
                    event,
                    Some(BattleScriptHitFeedbackEvent::Animation {
                        battler: BattleScriptHitFeedbackBattler::Battler2
                    })
                );
                assert_eq!(
                    scheduler.pending_controller_battlers[0],
                    Some(BattleScriptHitFeedbackBattler::Battler2)
                );
            }
            other => panic!("expected advance, got {other:?}"),
        }
    }

    #[test]
    fn hitanimation_no_effect_advances_without_event() {
        let roles = roles(Some(0), Some(1), None);
        let outcome = apply_battle_script_hitanimation(
            0,
            &roles,
            &no_substitute_battlers(),
            BATTLE_SCRIPT_HIT_FEEDBACK_MOVE_RESULT_NO_EFFECT,
            0,
            &idle_scheduler(),
            Some("BS_TARGET"),
        )
        .unwrap();
        match outcome {
            BattleScriptHitanimationOutcome::Advance { event, scheduler } => {
                assert_eq!(event, None);
                assert_eq!(scheduler, idle_scheduler());
            }
            other => panic!("expected advance, got {other:?}"),
        }
    }

    #[test]
    fn hitanimation_substitute_suppression_requires_all_three_conjuncts() {
        let roles_value = roles(Some(0), Some(1), None);
        let mut battlers = no_substitute_battlers();
        battlers[1] = BattleScriptHitFeedbackBattlerState {
            status2: BATTLE_SCRIPT_HIT_FEEDBACK_STATUS2_SUBSTITUTE,
            substitute_hp: 5,
        };

        // All three conjuncts true -> suppressed, no event.
        let outcome = apply_battle_script_hitanimation(
            0,
            &roles_value,
            &battlers,
            0,
            BATTLE_SCRIPT_HIT_FEEDBACK_HITMARKER_IGNORE_SUBSTITUTE,
            &idle_scheduler(),
            Some("BS_TARGET"),
        )
        .unwrap();
        assert_eq!(
            outcome,
            BattleScriptHitanimationOutcome::Advance { scheduler: idle_scheduler(), event: None }
        );

        // hit_marker missing IGNORE_SUBSTITUTE -> still emits.
        let outcome = apply_battle_script_hitanimation(
            0,
            &roles_value,
            &battlers,
            0,
            0,
            &idle_scheduler(),
            Some("BS_TARGET"),
        )
        .unwrap();
        assert!(matches!(
            outcome,
            BattleScriptHitanimationOutcome::Advance { event: Some(_), .. }
        ));

        // status2 missing SUBSTITUTE bit -> still emits.
        let mut battlers_no_status = no_substitute_battlers();
        battlers_no_status[1].substitute_hp = 5;
        let outcome = apply_battle_script_hitanimation(
            0,
            &roles_value,
            &battlers_no_status,
            0,
            BATTLE_SCRIPT_HIT_FEEDBACK_HITMARKER_IGNORE_SUBSTITUTE,
            &idle_scheduler(),
            Some("BS_TARGET"),
        )
        .unwrap();
        assert!(matches!(
            outcome,
            BattleScriptHitanimationOutcome::Advance { event: Some(_), .. }
        ));

        // substituteHP == 0 -> still emits.
        let mut battlers_zero_hp = no_substitute_battlers();
        battlers_zero_hp[1].status2 = BATTLE_SCRIPT_HIT_FEEDBACK_STATUS2_SUBSTITUTE;
        let outcome = apply_battle_script_hitanimation(
            0,
            &roles_value,
            &battlers_zero_hp,
            0,
            BATTLE_SCRIPT_HIT_FEEDBACK_HITMARKER_IGNORE_SUBSTITUTE,
            &idle_scheduler(),
            Some("BS_TARGET"),
        )
        .unwrap();
        assert!(matches!(
            outcome,
            BattleScriptHitanimationOutcome::Advance { event: Some(_), .. }
        ));
    }

    #[test]
    fn hitanimation_already_pending_no_duplicate() {
        let roles = roles(Some(0), Some(1), None);
        let scheduler = busy_scheduler(BattleScriptHitFeedbackBattler::Battler1);
        let outcome = apply_battle_script_hitanimation(
            0,
            &roles,
            &no_substitute_battlers(),
            0,
            0,
            &scheduler,
            Some("BS_TARGET"),
        )
        .unwrap();
        match outcome {
            BattleScriptHitanimationOutcome::Advance { scheduler: out, .. } => {
                assert_eq!(out.pending_count, 1);
                assert_eq!(out, scheduler);
            }
            other => panic!("expected advance, got {other:?}"),
        }
    }

    #[test]
    fn effectivenesssound_busy_gate_blocks() {
        let roles = roles(None, Some(0), None);
        let outcome = apply_battle_script_effectivenesssound(
            3,
            &roles,
            0,
            &busy_scheduler(BattleScriptHitFeedbackBattler::Battler0),
        )
        .unwrap();
        assert_eq!(
            outcome,
            BattleScriptEffectivenesssoundOutcome::Block(BattleScriptHitFeedbackControllerBusy {
                program_counter: 3,
                opcode_id: BATTLE_SCRIPT_EFFECTIVENESSSOUND_OPCODE,
                opcode_name: BATTLE_SCRIPT_EFFECTIVENESSSOUND_OPCODE_NAME,
            })
        );
    }

    #[test]
    fn effectivenesssound_missing_target_role_throws() {
        let roles = roles(None, None, None);
        let error =
            apply_battle_script_effectivenesssound(0, &roles, 0, &idle_scheduler()).unwrap_err();
        assert_eq!(
            error.to_string(),
            "Battle Script hit-chain command requires a target role"
        );
    }

    #[test]
    fn effectivenesssound_missed_beats_everything() {
        let roles = roles(None, Some(0), None);
        let outcome = apply_battle_script_effectivenesssound(
            0,
            &roles,
            BATTLE_SCRIPT_HIT_FEEDBACK_MOVE_RESULT_MISSED
                | BATTLE_SCRIPT_HIT_FEEDBACK_MOVE_RESULT_SUPER_EFFECTIVE,
            &idle_scheduler(),
        )
        .unwrap();
        assert_eq!(
            outcome,
            BattleScriptEffectivenesssoundOutcome::Advance {
                scheduler: idle_scheduler(),
                event: None
            }
        );
    }

    #[test]
    fn effectivenesssound_exact_tier_both_directions() {
        let roles = roles(None, Some(0), None);
        for (flags, expected) in [
            (
                BATTLE_SCRIPT_HIT_FEEDBACK_MOVE_RESULT_SUPER_EFFECTIVE,
                Some(14u8),
            ),
            (
                BATTLE_SCRIPT_HIT_FEEDBACK_MOVE_RESULT_NOT_VERY_EFFECTIVE,
                Some(12u8),
            ),
            (
                BATTLE_SCRIPT_HIT_FEEDBACK_MOVE_RESULT_DOESNT_AFFECT_FOE,
                None,
            ),
            (BATTLE_SCRIPT_HIT_FEEDBACK_MOVE_RESULT_FAILED, None),
        ] {
            let outcome =
                apply_battle_script_effectivenesssound(0, &roles, flags, &idle_scheduler())
                    .unwrap();
            match (outcome, expected) {
                (BattleScriptEffectivenesssoundOutcome::Advance { event: None, .. }, None) => {}
                (
                    BattleScriptEffectivenesssoundOutcome::Advance {
                        event: Some(BattleScriptHitFeedbackEvent::PlaySe { song_id, .. }),
                        ..
                    },
                    Some(expected_song),
                ) => assert_eq!(song_id, expected_song),
                (other, expected) => {
                    panic!("flags {flags:#x}: got {other:?}, expected song {expected:?}")
                }
            }
        }
    }

    #[test]
    fn effectivenesssound_default_arm_bitwise_tier_both_directions() {
        let roles = roles(None, Some(0), None);
        // Bit 6 (FOE_ENDURED) alongside SUPER_EFFECTIVE still resolves 14 via the bitwise tier.
        let outcome = apply_battle_script_effectivenesssound(
            0,
            &roles,
            BATTLE_SCRIPT_HIT_FEEDBACK_MOVE_RESULT_SUPER_EFFECTIVE | (1 << 6),
            &idle_scheduler(),
        )
        .unwrap();
        assert!(matches!(
            outcome,
            BattleScriptEffectivenesssoundOutcome::Advance {
                event: Some(BattleScriptHitFeedbackEvent::PlaySe { song_id: 14, .. }),
                ..
            }
        ));

        let outcome = apply_battle_script_effectivenesssound(
            0,
            &roles,
            BATTLE_SCRIPT_HIT_FEEDBACK_MOVE_RESULT_NOT_VERY_EFFECTIVE | (1 << 6),
            &idle_scheduler(),
        )
        .unwrap();
        assert!(matches!(
            outcome,
            BattleScriptEffectivenesssoundOutcome::Advance {
                event: Some(BattleScriptHitFeedbackEvent::PlaySe { song_id: 12, .. }),
                ..
            }
        ));

        // Lone unrelated bit (e.g. 1<<6) hits none of DOESNT_AFFECT_FOE|FAILED -> SE_EFFECTIVE.
        let outcome =
            apply_battle_script_effectivenesssound(0, &roles, 1 << 6, &idle_scheduler()).unwrap();
        assert!(matches!(
            outcome,
            BattleScriptEffectivenesssoundOutcome::Advance {
                event: Some(BattleScriptHitFeedbackEvent::PlaySe { song_id: 13, .. }),
                ..
            }
        ));

        // DOESNT_AFFECT_FOE plus an extra bit -> no sound.
        let outcome = apply_battle_script_effectivenesssound(
            0,
            &roles,
            BATTLE_SCRIPT_HIT_FEEDBACK_MOVE_RESULT_DOESNT_AFFECT_FOE | (1 << 6),
            &idle_scheduler(),
        )
        .unwrap();
        assert_eq!(
            outcome,
            BattleScriptEffectivenesssoundOutcome::Advance {
                scheduler: idle_scheduler(),
                event: None
            }
        );
    }

    #[test]
    fn effectivenesssound_sound_marks_target_pending() {
        let roles = roles(None, Some(2), None);
        let outcome = apply_battle_script_effectivenesssound(
            0,
            &roles,
            BATTLE_SCRIPT_HIT_FEEDBACK_MOVE_RESULT_SUPER_EFFECTIVE,
            &idle_scheduler(),
        )
        .unwrap();
        match outcome {
            BattleScriptEffectivenesssoundOutcome::Advance { scheduler, .. } => {
                assert_eq!(
                    scheduler.pending_controller_battlers[0],
                    Some(BattleScriptHitFeedbackBattler::Battler2)
                );
                assert_eq!(scheduler.pending_count, 1);
            }
            other => panic!("expected advance, got {other:?}"),
        }
    }

    #[test]
    fn registration_finds_first_and_reports_verbatim_absence_for_both_opcodes() {
        let present = [
            BattleScriptHitFeedbackInstruction {
                opcode_name: "B_SCR_OP_ACCURACYCHECK",
                opcode_id: 0x01,
            },
            BattleScriptHitFeedbackInstruction {
                opcode_name: BATTLE_SCRIPT_HITANIMATION_OPCODE_NAME,
                opcode_id: BATTLE_SCRIPT_HITANIMATION_OPCODE,
            },
            BattleScriptHitFeedbackInstruction {
                opcode_name: BATTLE_SCRIPT_EFFECTIVENESSSOUND_OPCODE_NAME,
                opcode_id: BATTLE_SCRIPT_EFFECTIVENESSSOUND_OPCODE,
            },
        ];
        assert_eq!(
            register_battle_script_hitanimation_handler(&present)
                .unwrap()
                .opcode_id,
            BATTLE_SCRIPT_HITANIMATION_OPCODE
        );
        assert_eq!(
            register_battle_script_effectivenesssound_handler(&present)
                .unwrap()
                .opcode_id,
            BATTLE_SCRIPT_EFFECTIVENESSSOUND_OPCODE
        );

        let absent = [BattleScriptHitFeedbackInstruction {
            opcode_name: "B_SCR_OP_PPREDUCE",
            opcode_id: 0x03,
        }];
        assert_eq!(
            register_battle_script_hitanimation_handler(&absent)
                .unwrap_err()
                .to_string(),
            "committed Battle Script program does not emit B_SCR_OP_HITANIMATION"
        );
        assert_eq!(
            register_battle_script_effectivenesssound_handler(&absent)
                .unwrap_err()
                .to_string(),
            "committed Battle Script program does not emit B_SCR_OP_EFFECTIVENESSSOUND"
        );
    }

    #[test]
    fn battler_ids_round_trip_from_u8() {
        for value in 0u8..4 {
            let battler = BattleScriptHitFeedbackBattler::from_u8(value).unwrap();
            assert_eq!(
                BattleScriptHitFeedbackBattler::from_u8(battler.as_u8()),
                Some(battler)
            );
        }
        assert_eq!(BattleScriptHitFeedbackBattler::from_u8(4), None);
    }
}
