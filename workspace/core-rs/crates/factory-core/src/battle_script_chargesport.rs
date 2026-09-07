//! Pure `B_SCR_OP_SETCHARGE` + `B_SCR_OP_SETTYPEBASEDHALVERS` registration,
//! state, and control leaf.
//!
//! This is the deliberately narrow native twin of
//! `src/engine/battleScriptChargeSportOpcode.ts`, which registers both
//! opcodes' handlers from one TS factory because Charge and the two field
//! sports share status3/damage-lifetime ownership. This module keeps that
//! pairing (one registration function, one shared rules/instruction/control
//! projection) but models the *two handler bodies* as two independent apply
//! functions -- `apply_battle_script_setcharge` and
//! `apply_battle_script_settypebasedhalvers` -- rather than one
//! opcode-keyed dispatcher, because the canonical factory itself returns two
//! independent handler closures keyed by two different opcode ids in one
//! `Object.freeze({...})` map; two Rust functions mirror that shape more
//! literally than folding both bodies behind a single entry point.
//!
//! `Cmd_setcharge` unconditionally ORs `STATUS3_CHARGED_UP` into the
//! attacker's `status3` and unconditionally overwrites both Charge lifetime
//! fields to 2 (a repeat use refreshes them). `Cmd_settypebasedhalvers`
//! reads `gBattleMoves[gCurrentMove].effect`; only `EFFECT_MUD_SPORT` and
//! `EFFECT_WATER_SPORT` are legal (anything else is a canonical error, since
//! the source shares this opcode's dispatch between exactly those two move
//! effects). If the resolved sport's status3 bit is already set, the
//! command jumps through the late-resolved operand pointer with the rules
//! unchanged; otherwise it sets that bit and the sport's `multistringChooser`
//! value and advances. Neither branch consumes RNG, emits an event, changes
//! scheduler state, or touches presentation.
//!
//! Source authority:
//! - `Cmd_setcharge` is
//!   `reference/pokeemerald/src/battle_script_commands.c:9100-9106`;
//!   dispatch `:534` (`//0xCB`), forward declaration `:282`.
//! - `Cmd_settypebasedhalvers` is
//!   `reference/pokeemerald/src/battle_script_commands.c:9758-9786`;
//!   dispatch `:563` (`//0xE8`), forward declaration `:311`.
//! - The one-byte `setcharge` macro is
//!   `asm/macros/battle_script.inc:1043-1045`; the five-byte
//!   `settypebasedhalvers ptr:req` macro is `:1181-1184`.
//! - The sole Charge call site is `BattleScript_EffectCharge` at
//!   `data/battle_scripts_1.s:2297-2304` (`setcharge` statement `:2301`).
//!   The sole sport call site is the shared
//!   `BattleScript_EffectMudSport::`/`BattleScript_EffectWaterSport::` label
//!   pair at `:2628-2637` (`settypebasedhalvers BattleScript_ButItFailed`
//!   statement `:2633`); both labels resolve to the same program counter, so
//!   the dispatched effect depends only on `gCurrentMove`, not on which
//!   label was jumped to.
//! - `STATUS3_CHARGED_UP`, `STATUS3_MUDSPORT`, `STATUS3_WATERSPORT` are
//!   `include/constants/battle.h:166,173,174`.
//! - `EFFECT_MUD_SPORT`, `EFFECT_WATER_SPORT` are
//!   `include/constants/battle_move_effects.h:205,214`.
//! - `B_MSG_WEAKEN_ELECTRIC`, `B_MSG_WEAKEN_FIRE` are
//!   `include/constants/battle_string_ids.h:528-529`.
//! - `chargeTimer:4`, `chargeTimerStartValue:4` are `include/battle.h:89-90`.
//! - `B_SCR_OP_SETCHARGE`, `B_SCR_OP_SETTYPEBASEDHALVERS` are
//!   `include/constants/battle_script_commands.h:209,238`.
//!
//! This leaf deliberately owns neither a generic machine, scheduler/event
//! transport, RNG advancement, presentation, nor the WASM ABI.

use core::fmt;

use crate::gen_tables;

/// Source `MAX_BATTLERS_COUNT`; all source-indexed state retains four cells.
pub const BATTLE_SCRIPT_CHARGESPORT_BATTLER_COUNT: usize = 4;
/// `B_SCR_OP_SETCHARGE` in the source command enum / dispatch table.
pub const BATTLE_SCRIPT_CHARGESPORT_CHARGE_OPCODE: u8 = 0xcb;
/// Concrete Charge opcode name selected by canonical registration.
pub const BATTLE_SCRIPT_CHARGESPORT_CHARGE_OPCODE_NAME: &str = "B_SCR_OP_SETCHARGE";
/// Source dispatch-table Charge handler identity.
pub const BATTLE_SCRIPT_CHARGESPORT_CHARGE_DISPATCHER: &str = "Cmd_setcharge";
/// `B_SCR_OP_SETTYPEBASEDHALVERS` in the source command enum / dispatch table.
pub const BATTLE_SCRIPT_CHARGESPORT_SPORT_OPCODE: u8 = 0xe8;
/// Concrete sport opcode name selected by canonical registration.
pub const BATTLE_SCRIPT_CHARGESPORT_SPORT_OPCODE_NAME: &str = "B_SCR_OP_SETTYPEBASEDHALVERS";
/// Source dispatch-table sport handler identity.
pub const BATTLE_SCRIPT_CHARGESPORT_SPORT_DISPATCHER: &str = "Cmd_settypebasedhalvers";
/// The canonical factory accepts exactly this many concrete starts, per opcode.
pub const BATTLE_SCRIPT_CHARGESPORT_CONCRETE_START_COUNT: usize = 1;
/// One four-byte failure pointer follows the sport opcode byte.
pub const BATTLE_SCRIPT_CHARGESPORT_SPORT_OPERAND_WIDTH_BYTES: u8 = 4;
/// The committed sport failure pointer expression (registration pins it).
pub const BATTLE_SCRIPT_CHARGESPORT_SPORT_FAILURE_EXPRESSION: &str = "BattleScript_ButItFailed";
/// The source `setcharge` macro's encoded byte width (opcode byte only).
pub const BATTLE_SCRIPT_CHARGESPORT_CHARGE_ENCODED_WIDTH_BYTES: u8 = 1;
/// The source `settypebasedhalvers` macro's encoded byte width.
pub const BATTLE_SCRIPT_CHARGESPORT_SPORT_ENCODED_WIDTH_BYTES: u8 = 5;
/// `include/constants/battle.h:166` -- `STATUS3_CHARGED_UP` (`1 << 9`).
pub const BATTLE_SCRIPT_CHARGESPORT_STATUS3_CHARGED_UP: u32 = 1 << 9;
/// `include/constants/battle.h:173` -- `STATUS3_MUDSPORT` (`1 << 16`).
pub const BATTLE_SCRIPT_CHARGESPORT_STATUS3_MUDSPORT: u32 = 1 << 16;
/// `include/constants/battle.h:174` -- `STATUS3_WATERSPORT` (`1 << 17`).
pub const BATTLE_SCRIPT_CHARGESPORT_STATUS3_WATERSPORT: u32 = 1 << 17;
/// `include/constants/battle_move_effects.h:205` -- `EFFECT_MUD_SPORT`.
pub const BATTLE_SCRIPT_CHARGESPORT_EFFECT_MUD_SPORT: u16 = 201;
/// `include/constants/battle_move_effects.h:214` -- `EFFECT_WATER_SPORT`.
pub const BATTLE_SCRIPT_CHARGESPORT_EFFECT_WATER_SPORT: u16 = 210;
/// `include/constants/battle_string_ids.h:528` -- `B_MSG_WEAKEN_ELECTRIC`.
pub const BATTLE_SCRIPT_CHARGESPORT_MULTISTRING_WEAKEN_ELECTRIC: u8 = 0;
/// `include/constants/battle_string_ids.h:529` -- `B_MSG_WEAKEN_FIRE`.
pub const BATTLE_SCRIPT_CHARGESPORT_MULTISTRING_WEAKEN_FIRE: u8 = 1;

/// Complete source battler-id domain used by roles and source-indexed arrays.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptChargeSportBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

/// Fixed source battler domain, including inactive cells in singles.
pub const BATTLE_SCRIPT_CHARGESPORT_BATTLERS: [BattleScriptChargeSportBattler;
    BATTLE_SCRIPT_CHARGESPORT_BATTLER_COUNT] = [
    BattleScriptChargeSportBattler::Battler0,
    BattleScriptChargeSportBattler::Battler1,
    BattleScriptChargeSportBattler::Battler2,
    BattleScriptChargeSportBattler::Battler3,
];

impl BattleScriptChargeSportBattler {
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

/// The complete per-battler projection read or written by either opcode.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptChargeSportBattlerState {
    /// Source `gStatuses3[battler]`, an unsigned 32-bit packed field.
    pub status3: u32,
    /// Source `gDisableStructs[battler].chargeTimer:4` (0..=15).
    pub charge_timer: u8,
    /// Source `gDisableStructs[battler].chargeTimerStartValue:4` (0..=15).
    pub charge_timer_start_value: u8,
}

/// Canonical selector bindings. Only `attacker` is ever read by either
/// handler, matching the canonical `requireBattlerRole(rules, "attacker")`
/// calls.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptChargeSportRoles {
    pub attacker: Option<BattleScriptChargeSportBattler>,
}

/// Complete narrow rules slice read or written by these two commands.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptChargeSportRules {
    pub battlers: [BattleScriptChargeSportBattlerState; BATTLE_SCRIPT_CHARGESPORT_BATTLER_COUNT],
    pub selector_roles: BattleScriptChargeSportRoles,
    /// Source `gCurrentMove`, resolved through `gBattleMoves[].effect`.
    pub current_move: u16,
    /// Source `gBattleCommunication[MULTISTRING_CHOOSER]`.
    pub multistring_chooser: u8,
}

/// One source-macro operand retained for canonical shape validation and the
/// sport handler's late-resolved failure pointer.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptChargeSportOperand<'a> {
    pub width_bytes: u8,
    pub expression: &'a str,
}

/// A resolved source failure label.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptChargeSportResolvedLabel<'a> {
    pub expression: &'a str,
    pub program_counter: u32,
}

/// Instruction projection used for both registration and execution of either
/// opcode; Charge's committed instruction always has zero operands.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptChargeSportInstruction<'a> {
    pub opcode_name: &'a str,
    pub program_counter: u32,
    pub opcode_id: u8,
    pub dispatcher: &'a str,
    pub operands: &'a [BattleScriptChargeSportOperand<'a>],
    /// Late label resolution is a scheduler/program concern this leaf does
    /// not own; the caller resolves the sport operand's expression (when
    /// present) and reports the result here, exactly like the canonical
    /// TypeScript factory's own `resolveBattleScriptLabel` call inside
    /// `jumpToFailure`.
    pub resolved_failure_target: Option<BattleScriptChargeSportResolvedLabel<'a>>,
}

/// The two dynamic opcode keys emitted by successful registration.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptChargeSportRegistration {
    pub charge_opcode_id: u8,
    pub sport_opcode_id: u8,
}

/// Exact control directive emitted by either narrow opcode leaf.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptChargeSportControl {
    Advance,
    Jump { program_counter: u32 },
}

/// Complete immutable result of one successful handler application.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptChargeSportOutcome {
    pub rules: BattleScriptChargeSportRules,
    pub control: BattleScriptChargeSportControl,
}

/// Exact observable errors, in each handler's canonical evaluation order.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptChargeSportError {
    InvalidChargeShape { count: usize },
    InvalidSportShape { count: usize },
    MissingAttackerRole,
    UnknownMoveEffect { current_move: u16 },
    UnsupportedEffect { effect: u16 },
    UnresolvedSportFailureTarget,
}

impl fmt::Display for BattleScriptChargeSportError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidChargeShape { count } => write!(
                formatter,
                "invalid B_SCR_OP_SETCHARGE committed shape ({count})"
            ),
            Self::InvalidSportShape { count } => write!(
                formatter,
                "invalid B_SCR_OP_SETTYPEBASEDHALVERS committed shape ({count})"
            ),
            Self::MissingAttackerRole => write!(
                formatter,
                "Battle Script hit-chain command requires a attacker role"
            ),
            Self::UnknownMoveEffect { current_move } => write!(
                formatter,
                "currentMove {current_move} has no source-derived gBattleMoves effect"
            ),
            Self::UnsupportedEffect { effect } => write!(
                formatter,
                "Cmd_settypebasedhalvers received effect {effect}"
            ),
            Self::UnresolvedSportFailureTarget => {
                write!(formatter, "unresolved Mud/Water Sport failure target")
            }
        }
    }
}

impl std::error::Error for BattleScriptChargeSportError {}

/// Native projection of `createBattleScriptChargeSportOpcodeHandlers`.
/// Noise instructions are ignored; Charge's shape is validated before
/// sport's, matching the canonical factory's statement order, so when both
/// are wrong the reported error is always Charge's.
pub fn register_battle_script_chargesport_handlers<'a>(
    instructions: &[BattleScriptChargeSportInstruction<'a>],
) -> Result<BattleScriptChargeSportRegistration, BattleScriptChargeSportError> {
    let charge = instructions
        .iter()
        .filter(|instruction| {
            instruction.opcode_name == BATTLE_SCRIPT_CHARGESPORT_CHARGE_OPCODE_NAME
        })
        .collect::<Vec<_>>();
    if charge.len() != BATTLE_SCRIPT_CHARGESPORT_CONCRETE_START_COUNT
        || charge[0].opcode_id != BATTLE_SCRIPT_CHARGESPORT_CHARGE_OPCODE
        || charge[0].dispatcher != BATTLE_SCRIPT_CHARGESPORT_CHARGE_DISPATCHER
        || !charge[0].operands.is_empty()
    {
        return Err(BattleScriptChargeSportError::InvalidChargeShape { count: charge.len() });
    }

    let sports = instructions
        .iter()
        .filter(|instruction| {
            instruction.opcode_name == BATTLE_SCRIPT_CHARGESPORT_SPORT_OPCODE_NAME
        })
        .collect::<Vec<_>>();
    if sports.len() != BATTLE_SCRIPT_CHARGESPORT_CONCRETE_START_COUNT
        || sports[0].opcode_id != BATTLE_SCRIPT_CHARGESPORT_SPORT_OPCODE
        || sports[0].dispatcher != BATTLE_SCRIPT_CHARGESPORT_SPORT_DISPATCHER
        || sports[0].operands.len() != 1
        || sports[0].operands[0].width_bytes != BATTLE_SCRIPT_CHARGESPORT_SPORT_OPERAND_WIDTH_BYTES
        || sports[0].operands[0].expression != BATTLE_SCRIPT_CHARGESPORT_SPORT_FAILURE_EXPRESSION
    {
        return Err(BattleScriptChargeSportError::InvalidSportShape { count: sports.len() });
    }

    Ok(BattleScriptChargeSportRegistration {
        charge_opcode_id: charge[0].opcode_id,
        sport_opcode_id: sports[0].opcode_id,
    })
}

/// Native immutable-value twin of canonical `Cmd_setcharge`.
///
/// The only failure is a missing attacker role; once resolved, the attacker's
/// `status3` unconditionally gains `STATUS3_CHARGED_UP` and both Charge
/// lifetime fields are unconditionally overwritten to 2 -- a repeat use
/// refreshes the timer rather than erroring or being a no-op.
pub fn apply_battle_script_setcharge(
    rules: &BattleScriptChargeSportRules,
) -> Result<BattleScriptChargeSportOutcome, BattleScriptChargeSportError> {
    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptChargeSportError::MissingAttackerRole)?;

    let mut next_rules = *rules;
    let battler = &mut next_rules.battlers[attacker.index()];
    battler.status3 |= BATTLE_SCRIPT_CHARGESPORT_STATUS3_CHARGED_UP;
    battler.charge_timer = 2;
    battler.charge_timer_start_value = 2;
    Ok(BattleScriptChargeSportOutcome {
        rules: next_rules,
        control: BattleScriptChargeSportControl::Advance,
    })
}

/// Native immutable-value twin of canonical `Cmd_settypebasedhalvers`.
///
/// Evaluation order matches the canonical handler exactly: the attacker role
/// is required first, then `currentMove`'s source-derived effect is
/// resolved (an unknown move id is a typed error, never silently zero), then
/// the effect must be exactly `EFFECT_MUD_SPORT` or `EFFECT_WATER_SPORT`.
/// Only then is the sport's status3 bit inspected: if already set, this
/// lazily resolves the late failure-pointer operand and jumps with the rules
/// unchanged (an absent or unresolved operand is a typed error, but only on
/// this branch); otherwise it sets the bit, writes the sport's
/// `multistringChooser` value, and advances.
pub fn apply_battle_script_settypebasedhalvers<'a>(
    instruction: BattleScriptChargeSportInstruction<'a>,
    rules: &BattleScriptChargeSportRules,
) -> Result<BattleScriptChargeSportOutcome, BattleScriptChargeSportError> {
    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptChargeSportError::MissingAttackerRole)?;

    let move_row = gen_tables::MOVES
        .get(usize::from(rules.current_move))
        .ok_or(BattleScriptChargeSportError::UnknownMoveEffect {
            current_move: rules.current_move,
        })?;
    let effect = move_row.effect;
    let is_mud_sport = effect == BATTLE_SCRIPT_CHARGESPORT_EFFECT_MUD_SPORT;
    if !is_mud_sport && effect != BATTLE_SCRIPT_CHARGESPORT_EFFECT_WATER_SPORT {
        return Err(BattleScriptChargeSportError::UnsupportedEffect { effect });
    }
    let bit = if is_mud_sport {
        BATTLE_SCRIPT_CHARGESPORT_STATUS3_MUDSPORT
    } else {
        BATTLE_SCRIPT_CHARGESPORT_STATUS3_WATERSPORT
    };

    let battler = rules.battlers[attacker.index()];
    if battler.status3 & bit != 0 {
        let resolved = instruction
            .resolved_failure_target
            .ok_or(BattleScriptChargeSportError::UnresolvedSportFailureTarget)?;
        return Ok(BattleScriptChargeSportOutcome {
            rules: *rules,
            control: BattleScriptChargeSportControl::Jump {
                program_counter: resolved.program_counter,
            },
        });
    }

    let mut next_rules = *rules;
    next_rules.battlers[attacker.index()].status3 |= bit;
    next_rules.multistring_chooser = if is_mud_sport {
        BATTLE_SCRIPT_CHARGESPORT_MULTISTRING_WEAKEN_ELECTRIC
    } else {
        BATTLE_SCRIPT_CHARGESPORT_MULTISTRING_WEAKEN_FIRE
    };
    Ok(BattleScriptChargeSportOutcome {
        rules: next_rules,
        control: BattleScriptChargeSportControl::Advance,
    })
}

/// Independent source, dispatch, and body evidence for both opcodes.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptChargeSportDecompDispatchEvidence {
    pub charge_opcode_name: &'static str,
    pub charge_opcode_id: u8,
    pub charge_dispatcher: &'static str,
    pub charge_dispatch_line: u32,
    pub charge_forward_decl_line: u32,
    pub charge_handler_line: u32,
    pub charge_status3_write_line: u32,
    pub charge_timer_write_line: u32,
    pub charge_timer_start_write_line: u32,
    pub charge_advance_line: u32,
    pub sport_opcode_name: &'static str,
    pub sport_opcode_id: u8,
    pub sport_dispatcher: &'static str,
    pub sport_dispatch_line: u32,
    pub sport_forward_decl_line: u32,
    pub sport_handler_line: u32,
    pub sport_effect_check_line: u32,
    pub sport_mud_bit_test_line: u32,
    pub sport_mud_write_line: u32,
    pub sport_mud_chooser_line: u32,
    pub sport_water_bit_test_line: u32,
    pub sport_water_write_line: u32,
    pub sport_water_chooser_line: u32,
    pub sport_worked_branch_line: u32,
    pub sport_advance_line: u32,
    pub sport_jump_line: u32,
}

pub const BATTLE_SCRIPT_CHARGESPORT_DECOMP_DISPATCH_EVIDENCE:
    BattleScriptChargeSportDecompDispatchEvidence = BattleScriptChargeSportDecompDispatchEvidence {
    charge_opcode_name: BATTLE_SCRIPT_CHARGESPORT_CHARGE_OPCODE_NAME,
    charge_opcode_id: BATTLE_SCRIPT_CHARGESPORT_CHARGE_OPCODE,
    charge_dispatcher: BATTLE_SCRIPT_CHARGESPORT_CHARGE_DISPATCHER,
    charge_dispatch_line: 534,
    charge_forward_decl_line: 282,
    charge_handler_line: 9100,
    charge_status3_write_line: 9102,
    charge_timer_write_line: 9103,
    charge_timer_start_write_line: 9104,
    charge_advance_line: 9105,
    sport_opcode_name: BATTLE_SCRIPT_CHARGESPORT_SPORT_OPCODE_NAME,
    sport_opcode_id: BATTLE_SCRIPT_CHARGESPORT_SPORT_OPCODE,
    sport_dispatcher: BATTLE_SCRIPT_CHARGESPORT_SPORT_DISPATCHER,
    sport_dispatch_line: 563,
    sport_forward_decl_line: 311,
    sport_handler_line: 9758,
    sport_effect_check_line: 9762,
    sport_mud_bit_test_line: 9764,
    sport_mud_write_line: 9766,
    sport_mud_chooser_line: 9767,
    sport_water_bit_test_line: 9773,
    sport_water_write_line: 9775,
    sport_water_chooser_line: 9776,
    sport_worked_branch_line: 9781,
    sport_advance_line: 9782,
    sport_jump_line: 9784,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptChargeSportMacroEvidence {
    pub charge_declaration_line: u32,
    pub charge_opcode_line: u32,
    pub charge_encoded_width_bytes: u8,
    pub sport_declaration_line: u32,
    pub sport_opcode_line: u32,
    pub sport_pointer_line: u32,
    pub sport_encoded_width_bytes: u8,
}

pub const BATTLE_SCRIPT_CHARGESPORT_MACRO_EVIDENCE: BattleScriptChargeSportMacroEvidence =
    BattleScriptChargeSportMacroEvidence {
        charge_declaration_line: 1043,
        charge_opcode_line: 1044,
        charge_encoded_width_bytes: BATTLE_SCRIPT_CHARGESPORT_CHARGE_ENCODED_WIDTH_BYTES,
        sport_declaration_line: 1181,
        sport_opcode_line: 1182,
        sport_pointer_line: 1183,
        sport_encoded_width_bytes: BATTLE_SCRIPT_CHARGESPORT_SPORT_ENCODED_WIDTH_BYTES,
    };

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptChargeSportCallSiteEvidence {
    pub charge_entry_label: &'static str,
    pub charge_entry_label_line: u32,
    pub charge_statement_line: u32,
    pub charge_instruction_program_counter: u32,
    pub sport_mud_entry_label: &'static str,
    pub sport_mud_entry_label_line: u32,
    pub sport_water_entry_label: &'static str,
    pub sport_water_entry_label_line: u32,
    pub sport_statement_line: u32,
    pub sport_instruction_program_counter: u32,
    pub sport_failure_target_expression: &'static str,
    pub sport_failure_target_program_counter: u32,
}

pub const BATTLE_SCRIPT_CHARGESPORT_CALL_SITE_EVIDENCE: BattleScriptChargeSportCallSiteEvidence =
    BattleScriptChargeSportCallSiteEvidence {
        charge_entry_label: "BattleScript_EffectCharge",
        charge_entry_label_line: 2297,
        charge_statement_line: 2301,
        charge_instruction_program_counter: 1622,
        sport_mud_entry_label: "BattleScript_EffectMudSport",
        sport_mud_entry_label_line: 2628,
        sport_water_entry_label: "BattleScript_EffectWaterSport",
        sport_water_entry_label_line: 2629,
        sport_statement_line: 2633,
        sport_instruction_program_counter: 1885,
        sport_failure_target_expression: BATTLE_SCRIPT_CHARGESPORT_SPORT_FAILURE_EXPRESSION,
        sport_failure_target_program_counter: 1434,
    };

#[cfg(test)]
mod tests {
    use super::*;

    const CHARGE_INSTRUCTION: BattleScriptChargeSportInstruction<'static> =
        BattleScriptChargeSportInstruction {
            opcode_name: BATTLE_SCRIPT_CHARGESPORT_CHARGE_OPCODE_NAME,
            program_counter: 1622,
            opcode_id: BATTLE_SCRIPT_CHARGESPORT_CHARGE_OPCODE,
            dispatcher: BATTLE_SCRIPT_CHARGESPORT_CHARGE_DISPATCHER,
            operands: &[],
            resolved_failure_target: None,
        };

    const SPORT_OPERAND: BattleScriptChargeSportOperand<'static> = BattleScriptChargeSportOperand {
        width_bytes: 4,
        expression: BATTLE_SCRIPT_CHARGESPORT_SPORT_FAILURE_EXPRESSION,
    };
    const SPORT_OPERANDS: [BattleScriptChargeSportOperand<'static>; 1] = [SPORT_OPERAND];

    fn sport_instruction(
        resolved_failure_target: Option<BattleScriptChargeSportResolvedLabel<'static>>,
    ) -> BattleScriptChargeSportInstruction<'static> {
        BattleScriptChargeSportInstruction {
            opcode_name: BATTLE_SCRIPT_CHARGESPORT_SPORT_OPCODE_NAME,
            program_counter: 1885,
            opcode_id: BATTLE_SCRIPT_CHARGESPORT_SPORT_OPCODE,
            dispatcher: BATTLE_SCRIPT_CHARGESPORT_SPORT_DISPATCHER,
            operands: &SPORT_OPERANDS,
            resolved_failure_target,
        }
    }

    const RESOLVED_BUT_IT_FAILED: BattleScriptChargeSportResolvedLabel<'static> =
        BattleScriptChargeSportResolvedLabel {
            expression: BATTLE_SCRIPT_CHARGESPORT_SPORT_FAILURE_EXPRESSION,
            program_counter: 1434,
        };

    fn plain_battler(
        status3: u32,
        charge_timer: u8,
        charge_timer_start_value: u8,
    ) -> BattleScriptChargeSportBattlerState {
        BattleScriptChargeSportBattlerState { status3, charge_timer, charge_timer_start_value }
    }

    fn rules(
        battlers: [BattleScriptChargeSportBattlerState; 4],
        attacker: Option<BattleScriptChargeSportBattler>,
        current_move: u16,
        multistring_chooser: u8,
    ) -> BattleScriptChargeSportRules {
        BattleScriptChargeSportRules {
            battlers,
            selector_roles: BattleScriptChargeSportRoles { attacker },
            current_move,
            multistring_chooser,
        }
    }

    const MUD_SPORT_MOVE: u16 = 300;
    const WATER_SPORT_MOVE: u16 = 346;
    const TACKLE_MOVE: u16 = 33;

    #[test]
    fn charge_refresh_unconditionally_overwrites_timers() {
        let input = rules(
            [
                plain_battler(BATTLE_SCRIPT_CHARGESPORT_STATUS3_CHARGED_UP, 1, 7),
                plain_battler(0, 0, 0),
                plain_battler(0, 0, 0),
                plain_battler(0, 0, 0),
            ],
            Some(BattleScriptChargeSportBattler::Battler0),
            TACKLE_MOVE,
            0,
        );
        let outcome = apply_battle_script_setcharge(&input).expect("charge refreshes");
        assert_eq!(outcome.control, BattleScriptChargeSportControl::Advance);
        assert_eq!(
            outcome.rules.battlers[0],
            plain_battler(BATTLE_SCRIPT_CHARGESPORT_STATUS3_CHARGED_UP, 2, 2)
        );
        assert_eq!(outcome.rules.battlers[1..], input.battlers[1..]);
    }

    #[test]
    fn charge_from_zero_sets_bit_and_timers() {
        let input = rules(
            [
                plain_battler(0, 0, 0),
                plain_battler(0, 0, 0),
                plain_battler(0, 0, 0),
                plain_battler(0, 0, 0),
            ],
            Some(BattleScriptChargeSportBattler::Battler2),
            TACKLE_MOVE,
            0,
        );
        let outcome = apply_battle_script_setcharge(&input).expect("charge sets");
        assert_eq!(
            outcome.rules.battlers[2],
            plain_battler(BATTLE_SCRIPT_CHARGESPORT_STATUS3_CHARGED_UP, 2, 2)
        );
    }

    #[test]
    fn charge_missing_attacker_role_errors() {
        let input = rules(
            [
                plain_battler(0, 0, 0),
                plain_battler(0, 0, 0),
                plain_battler(0, 0, 0),
                plain_battler(0, 0, 0),
            ],
            None,
            TACKLE_MOVE,
            0,
        );
        assert_eq!(
            apply_battle_script_setcharge(&input)
                .expect_err("missing attacker")
                .to_string(),
            "Battle Script hit-chain command requires a attacker role"
        );
    }

    #[test]
    fn mud_sport_from_zero_sets_bit_and_chooser() {
        let input = rules(
            [
                plain_battler(0, 0, 0),
                plain_battler(0, 0, 0),
                plain_battler(0, 0, 0),
                plain_battler(0, 0, 0),
            ],
            Some(BattleScriptChargeSportBattler::Battler0),
            MUD_SPORT_MOVE,
            7,
        );
        let outcome = apply_battle_script_settypebasedhalvers(sport_instruction(None), &input)
            .expect("mud sport succeeds");
        assert_eq!(outcome.control, BattleScriptChargeSportControl::Advance);
        assert_eq!(
            outcome.rules.battlers[0].status3,
            BATTLE_SCRIPT_CHARGESPORT_STATUS3_MUDSPORT
        );
        assert_eq!(
            outcome.rules.multistring_chooser,
            BATTLE_SCRIPT_CHARGESPORT_MULTISTRING_WEAKEN_ELECTRIC
        );
    }

    #[test]
    fn water_sport_from_zero_sets_bit_and_chooser() {
        let input = rules(
            [
                plain_battler(0, 0, 0),
                plain_battler(0, 0, 0),
                plain_battler(0, 0, 0),
                plain_battler(0, 0, 0),
            ],
            Some(BattleScriptChargeSportBattler::Battler1),
            WATER_SPORT_MOVE,
            7,
        );
        let outcome = apply_battle_script_settypebasedhalvers(sport_instruction(None), &input)
            .expect("water sport succeeds");
        assert_eq!(outcome.control, BattleScriptChargeSportControl::Advance);
        assert_eq!(
            outcome.rules.battlers[1].status3,
            BATTLE_SCRIPT_CHARGESPORT_STATUS3_WATERSPORT
        );
        assert_eq!(
            outcome.rules.multistring_chooser,
            BATTLE_SCRIPT_CHARGESPORT_MULTISTRING_WEAKEN_FIRE
        );
    }

    #[test]
    fn already_set_sport_bit_jumps_via_resolved_operand_rules_unchanged() {
        let input = rules(
            [
                plain_battler(BATTLE_SCRIPT_CHARGESPORT_STATUS3_MUDSPORT, 0, 0),
                plain_battler(0, 0, 0),
                plain_battler(0, 0, 0),
                plain_battler(0, 0, 0),
            ],
            Some(BattleScriptChargeSportBattler::Battler0),
            MUD_SPORT_MOVE,
            5,
        );
        let outcome = apply_battle_script_settypebasedhalvers(
            sport_instruction(Some(RESOLVED_BUT_IT_FAILED)),
            &input,
        )
        .expect("already-set jumps");
        assert_eq!(
            outcome.control,
            BattleScriptChargeSportControl::Jump { program_counter: 1434 }
        );
        assert_eq!(outcome.rules, input);
    }

    #[test]
    fn already_set_sport_bit_with_unresolved_operand_errors_lazily() {
        let input = rules(
            [
                plain_battler(BATTLE_SCRIPT_CHARGESPORT_STATUS3_WATERSPORT, 0, 0),
                plain_battler(0, 0, 0),
                plain_battler(0, 0, 0),
                plain_battler(0, 0, 0),
            ],
            Some(BattleScriptChargeSportBattler::Battler0),
            WATER_SPORT_MOVE,
            5,
        );
        assert_eq!(
            apply_battle_script_settypebasedhalvers(sport_instruction(None), &input)
                .expect_err("unresolved lazily")
                .to_string(),
            "unresolved Mud/Water Sport failure target"
        );
    }

    #[test]
    fn fresh_success_never_consults_unresolved_operand() {
        // Laziness: an unresolved operand must not error when the sport
        // bit is not already set (the fresh-set branch never reads it).
        let input = rules(
            [
                plain_battler(0, 0, 0),
                plain_battler(0, 0, 0),
                plain_battler(0, 0, 0),
                plain_battler(0, 0, 0),
            ],
            Some(BattleScriptChargeSportBattler::Battler0),
            MUD_SPORT_MOVE,
            0,
        );
        let outcome = apply_battle_script_settypebasedhalvers(sport_instruction(None), &input)
            .expect("fresh set does not need the operand");
        assert_eq!(outcome.control, BattleScriptChargeSportControl::Advance);
    }

    #[test]
    fn non_sport_effect_errors() {
        let input = rules(
            [
                plain_battler(0, 0, 0),
                plain_battler(0, 0, 0),
                plain_battler(0, 0, 0),
                plain_battler(0, 0, 0),
            ],
            Some(BattleScriptChargeSportBattler::Battler0),
            TACKLE_MOVE,
            0,
        );
        assert_eq!(
            apply_battle_script_settypebasedhalvers(sport_instruction(None), &input)
                .expect_err("EFFECT_HIT is not a sport")
                .to_string(),
            "Cmd_settypebasedhalvers received effect 0"
        );
    }

    #[test]
    fn unknown_move_id_errors() {
        let input = rules(
            [
                plain_battler(0, 0, 0),
                plain_battler(0, 0, 0),
                plain_battler(0, 0, 0),
                plain_battler(0, 0, 0),
            ],
            Some(BattleScriptChargeSportBattler::Battler0),
            65535,
            0,
        );
        assert_eq!(
            apply_battle_script_settypebasedhalvers(sport_instruction(None), &input)
                .expect_err("unknown move id")
                .to_string(),
            "currentMove 65535 has no source-derived gBattleMoves effect"
        );
    }

    #[test]
    fn sport_missing_attacker_role_errors_before_move_effect() {
        let input = rules(
            [
                plain_battler(0, 0, 0),
                plain_battler(0, 0, 0),
                plain_battler(0, 0, 0),
                plain_battler(0, 0, 0),
            ],
            None,
            65535,
            0,
        );
        assert_eq!(
            apply_battle_script_settypebasedhalvers(sport_instruction(None), &input)
                .expect_err("missing attacker precedes move effect")
                .to_string(),
            "Battle Script hit-chain command requires a attacker role"
        );
    }

    #[test]
    fn registration_accepts_canonical_shape_and_returns_both_keys() {
        let registration = register_battle_script_chargesport_handlers(&[
            CHARGE_INSTRUCTION,
            sport_instruction(None),
        ])
        .expect("canonical shape registers");
        assert_eq!(
            registration.charge_opcode_id,
            BATTLE_SCRIPT_CHARGESPORT_CHARGE_OPCODE
        );
        assert_eq!(
            registration.sport_opcode_id,
            BATTLE_SCRIPT_CHARGESPORT_SPORT_OPCODE
        );
    }

    #[test]
    fn registration_rejects_wrong_charge_cardinality() {
        assert_eq!(
            register_battle_script_chargesport_handlers(&[sport_instruction(None)])
                .expect_err("zero charge starts")
                .to_string(),
            "invalid B_SCR_OP_SETCHARGE committed shape (0)"
        );
        assert_eq!(
            register_battle_script_chargesport_handlers(&[
                CHARGE_INSTRUCTION,
                CHARGE_INSTRUCTION,
                sport_instruction(None),
            ])
            .expect_err("two charge starts")
            .to_string(),
            "invalid B_SCR_OP_SETCHARGE committed shape (2)"
        );
    }

    #[test]
    fn registration_rejects_wrong_sport_cardinality_after_charge_is_valid() {
        assert_eq!(
            register_battle_script_chargesport_handlers(&[CHARGE_INSTRUCTION])
                .expect_err("zero sport starts")
                .to_string(),
            "invalid B_SCR_OP_SETTYPEBASEDHALVERS committed shape (0)"
        );
    }

    #[test]
    fn registration_reports_charge_error_first_when_both_are_wrong() {
        let bad_charge =
            BattleScriptChargeSportInstruction { opcode_id: 0xd0, ..CHARGE_INSTRUCTION };
        let bad_sport = BattleScriptChargeSportInstruction {
            dispatcher: "Cmd_wrong",
            ..sport_instruction(None)
        };
        assert_eq!(
            register_battle_script_chargesport_handlers(&[bad_charge, bad_sport])
                .expect_err("charge reported first")
                .to_string(),
            "invalid B_SCR_OP_SETCHARGE committed shape (1)"
        );
    }

    #[test]
    fn registration_rejects_wrong_sport_operand_expression() {
        let wrong_operand = BattleScriptChargeSportOperand {
            width_bytes: 4,
            expression: "BattleScript_SomewhereElse",
        };
        let bad_sport = BattleScriptChargeSportInstruction {
            operands: &[wrong_operand],
            ..sport_instruction(None)
        };
        assert_eq!(
            register_battle_script_chargesport_handlers(&[CHARGE_INSTRUCTION, bad_sport])
                .expect_err("wrong operand expression")
                .to_string(),
            "invalid B_SCR_OP_SETTYPEBASEDHALVERS committed shape (1)"
        );
    }

    #[test]
    fn battler_ids_round_trip_from_u8() {
        for battler in BATTLE_SCRIPT_CHARGESPORT_BATTLERS {
            assert_eq!(
                BattleScriptChargeSportBattler::from_u8(battler.as_u8()),
                Some(battler)
            );
        }
        assert_eq!(BattleScriptChargeSportBattler::from_u8(4), None);
    }
}
