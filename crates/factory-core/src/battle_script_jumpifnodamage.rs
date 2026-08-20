//! Pure `B_SCR_OP_JUMPIFNODAMAGE` registration and control projection.
//!
//! This is the deliberately narrow, machine-independent port of
//! `src/engine/battleScriptJumpifnodamageOpcode.ts`. The registration factory
//! filters by opcode name, requires exactly one concrete instruction, and
//! validates its complete committed Focus Punch shape. The handler itself
//! requires the attacker before examining that battler's `ProtectStruct`
//! physical and special damage receipts. Either nonzero receipt advances;
//! only two zero receipts resolve and follow the encoded pointer.
//!
//! Source authority:
//! - `B_SCR_OP_JUMPIFNODAMAGE` / `0xCF` is bound to
//!   `Cmd_jumpifnodamage` in
//!   `reference/pokeemerald/src/battle_script_commands.c:538`.
//! - The command body at `battle_script_commands.c:9148-9154` reads only
//!   `gProtectStructs[gBattlerAttacker].physicalDmg` and `.specialDmg`, then
//!   either advances its five-byte instruction or reads the pointer at +1.
//! - `ProtectStruct::{physicalDmg,specialDmg}` are source `u32` fields at
//!   `reference/pokeemerald/include/battle.h:126-127`. The canonical
//!   TypeScript rules constructor deliberately projects them through
//!   `requireSigned32` at `battleScriptRulesContext.ts:2359-2375`, so this
//!   native leaf retains that exact canonical `i32` domain. Any nonzero
//!   signed-domain value has the source command's truthy effect.
//! - The five-byte `jumpifnodamage ptr:req` macro is at
//!   `reference/pokeemerald/asm/macros/battle_script.inc:1061-1064`; its one
//!   concrete Focus Punch call is `data/battle_scripts_1.s:2260-2266`.
//!
//! `SpecialStatus` has similarly named damage copies, but neither source nor
//! canonical TypeScript reads them here. They stay in the projection solely
//! to make that ownership boundary executable. The generic Battle Script
//! program, resolved absolute program counter, turn-lifetime receipt writes
//! and clearing, scheduler, RNG, presentation, and WASM ABI remain outside
//! this pure leaf.

use core::fmt;

/// Source `MAX_BATTLERS_COUNT`; all source arrays retain four battler slots.
pub const BATTLE_SCRIPT_JUMPIFNODAMAGE_BATTLER_COUNT: usize = 4;

/// The only opcode name selected by canonical registration.
pub const BATTLE_SCRIPT_JUMPIFNODAMAGE_OPCODE_NAME: &str = "B_SCR_OP_JUMPIFNODAMAGE";

/// Source opcode identity, independently ratcheted from registration.
pub const BATTLE_SCRIPT_JUMPIFNODAMAGE_OPCODE: u8 = 0xcf;

/// Source dispatch-table identity, independently ratcheted from registration.
pub const BATTLE_SCRIPT_JUMPIFNODAMAGE_DISPATCHER: &str = "Cmd_jumpifnodamage";

/// The committed program's sole source label.
pub const BATTLE_SCRIPT_JUMPIFNODAMAGE_ENTRY_LABEL: &str = "BattleScript_EffectFocusPunch";

/// The committed program's sole source statement line.
pub const BATTLE_SCRIPT_JUMPIFNODAMAGE_STATEMENT_LINE: u32 = 2262;

/// The encoded jump pointer's source expression.
pub const BATTLE_SCRIPT_JUMPIFNODAMAGE_TARGET_LABEL: &str = "BattleScript_HitFromAccCheck";

/// The macro pointer operand's width.
pub const BATTLE_SCRIPT_JUMPIFNODAMAGE_POINTER_WIDTH_BYTES: u8 = 4;

/// One opcode byte plus the one four-byte pointer operand.
pub const BATTLE_SCRIPT_JUMPIFNODAMAGE_ENCODED_WIDTH_BYTES: u8 = 5;

/// Complete source `BattleScriptBattlerId` domain used by source arrays and
/// the optional attacker role.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptJumpifnodamageBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

/// Fixed source battler domain retained for selector and sibling ratchets.
pub const BATTLE_SCRIPT_JUMPIFNODAMAGE_BATTLERS: [BattleScriptJumpifnodamageBattler;
    BATTLE_SCRIPT_JUMPIFNODAMAGE_BATTLER_COUNT] = [
    BattleScriptJumpifnodamageBattler::Battler0,
    BattleScriptJumpifnodamageBattler::Battler1,
    BattleScriptJumpifnodamageBattler::Battler2,
    BattleScriptJumpifnodamageBattler::Battler3,
];

impl BattleScriptJumpifnodamageBattler {
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
}

/// The similarly named `SpecialStatus` receipts intentionally not read by
/// `Cmd_jumpifnodamage`. Their presence makes the ProtectStruct-only source
/// boundary observable in the native corpus.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifnodamageSpecialStatus {
    pub physical_dmg: i32,
    pub special_dmg: i32,
    pub shell_bell_dmg: i32,
}

/// Per-battler source-shaped projection. Only the two ProtectStruct receipt
/// values are read. Receipt-owner ids and SpecialStatus copies are preserved
/// but intentionally ignored by this command, matching source exactly.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifnodamageBattlerState {
    /// Canonical `ProtectStruct::physicalDmg` projection (`requireSigned32`).
    pub protect_physical_dmg: i32,
    pub protect_physical_battler_id: BattleScriptJumpifnodamageBattler,
    /// Canonical `ProtectStruct::specialDmg` projection (`requireSigned32`).
    pub protect_special_dmg: i32,
    pub protect_special_battler_id: BattleScriptJumpifnodamageBattler,
    pub special_status: BattleScriptJumpifnodamageSpecialStatus,
    /// Representative untouched source-shaped siblings.
    pub hp: u16,
    pub status2: u32,
}

/// Complete selector projection retained by the canonical no-write handler.
/// Only `attacker` is read, but the remaining bindings establish that the
/// source's unmodified rules context preserves aliases exactly.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifnodamageRoles {
    pub attacker: Option<BattleScriptJumpifnodamageBattler>,
    pub target: Option<BattleScriptJumpifnodamageBattler>,
    pub effect_battler: Option<BattleScriptJumpifnodamageBattler>,
    pub fainted: Option<BattleScriptJumpifnodamageBattler>,
}

/// Independent rules-context fields preserved by the canonical no-write
/// transition. The leaf neither reads nor rewrites these values.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifnodamageSiblings {
    pub current_move: u16,
    pub battle_move_damage: i32,
    pub move_result_flags: u32,
    pub hit_marker: u32,
    pub bide_dmg: [i32; BATTLE_SCRIPT_JUMPIFNODAMAGE_BATTLER_COUNT],
    pub locked_moves: [u16; BATTLE_SCRIPT_JUMPIFNODAMAGE_BATTLER_COUNT],
}

/// Complete narrow projection read or preserved by the command. It is not a
/// generic battle reducer: every member demonstrates the leaf's precise
/// no-write ownership boundary.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifnodamageRules {
    pub battlers:
        [BattleScriptJumpifnodamageBattlerState; BATTLE_SCRIPT_JUMPIFNODAMAGE_BATTLER_COUNT],
    pub selector_roles: BattleScriptJumpifnodamageRoles,
    pub siblings: BattleScriptJumpifnodamageSiblings,
}

/// One source operand retained by registration-shape evidence.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifnodamageOperand<'a> {
    pub width_bytes: u8,
    pub expression: &'a str,
}

/// Source instruction projection evaluated by canonical registration.
/// `jump_target_resolves` represents the surrounding program's exact label
/// lookup result for operand zero. Execution receives its already-registered
/// pointer separately because the canonical handler performs no shape check.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifnodamageRegistrationInstruction<'a> {
    pub opcode_name: &'a str,
    pub program_counter: u32,
    pub opcode_id: u8,
    pub dispatcher: &'a str,
    pub source_label: &'a str,
    pub source_statement_line: u32,
    pub operands: &'a [BattleScriptJumpifnodamageOperand<'a>],
    pub jump_target_resolves: bool,
}

/// The pointer operand passed to an already-registered handler. The generic
/// script machine owns operand decoding and absolute program-counter lookup;
/// this leaf preserves only the expression and whether its late lookup found
/// a label.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifnodamageExecution<'a> {
    pub jump_target_expression: &'a str,
    pub jump_target_resolves: bool,
}

/// The one dynamic handler-map key returned by successful registration.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifnodamageRegistration {
    pub opcode_id: u8,
}

/// Machine-independent command control. The surrounding program owns the
/// resolved target's absolute program counter.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptJumpifnodamageControl {
    /// Either ProtectStruct receipt is nonzero; source advances five bytes.
    Advance,
    /// Both ProtectStruct receipts are zero; source follows the pointer.
    Jump,
}

/// Complete result of one successful immutable handler invocation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifnodamageOutcome {
    pub rules: BattleScriptJumpifnodamageRules,
    pub control: BattleScriptJumpifnodamageControl,
}

/// Exact registration failures in canonical evaluation order.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptJumpifnodamageRegistrationError {
    IncorrectConcreteStartCount { count: usize },
    InvalidInstructionShape { program_counter: u32 },
}

impl fmt::Display for BattleScriptJumpifnodamageRegistrationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::IncorrectConcreteStartCount { count } => write!(
                formatter,
                "B_SCR_OP_JUMPIFNODAMAGE requires exactly 1 concrete start, got {count}"
            ),
            Self::InvalidInstructionShape { program_counter } => write!(
                formatter,
                "invalid B_SCR_OP_JUMPIFNODAMAGE shape at program counter {program_counter}"
            ),
        }
    }
}

impl std::error::Error for BattleScriptJumpifnodamageRegistrationError {}

/// Exact direct-handler failures in canonical evaluation order.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptJumpifnodamageError<'a> {
    MissingAttackerRole,
    UnresolvedJumpTarget { expression: &'a str },
}

impl fmt::Display for BattleScriptJumpifnodamageError<'_> {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::MissingAttackerRole => write!(
                formatter,
                "Battle Script hit-chain command requires a attacker role"
            ),
            Self::UnresolvedJumpTarget { expression } => write!(
                formatter,
                "Cmd_jumpifnodamage: unresolved jump target {expression}"
            ),
        }
    }
}

impl std::error::Error for BattleScriptJumpifnodamageError<'_> {}

fn has_committed_registration_shape(
    instruction: BattleScriptJumpifnodamageRegistrationInstruction<'_>,
) -> bool {
    let [target] = instruction.operands else {
        return false;
    };
    instruction.opcode_id == BATTLE_SCRIPT_JUMPIFNODAMAGE_OPCODE
        && instruction.dispatcher == BATTLE_SCRIPT_JUMPIFNODAMAGE_DISPATCHER
        && instruction.source_label == BATTLE_SCRIPT_JUMPIFNODAMAGE_ENTRY_LABEL
        && instruction.source_statement_line == BATTLE_SCRIPT_JUMPIFNODAMAGE_STATEMENT_LINE
        && target.width_bytes == BATTLE_SCRIPT_JUMPIFNODAMAGE_POINTER_WIDTH_BYTES
        && target.expression == BATTLE_SCRIPT_JUMPIFNODAMAGE_TARGET_LABEL
        && instruction.jump_target_resolves
}

/// Native projection of
/// `createBattleScriptJumpifnodamageOpcodeHandlers(program)`.
///
/// Filtering happens before cardinality validation. Only a singleton selected
/// instruction reaches the complete source/program shape predicate, including
/// its late program-label existence check.
pub fn register_battle_script_jumpifnodamage_handler(
    instructions: &[BattleScriptJumpifnodamageRegistrationInstruction<'_>],
) -> Result<BattleScriptJumpifnodamageRegistration, BattleScriptJumpifnodamageRegistrationError> {
    let mut selected = None;
    let mut count = 0;
    for instruction in instructions {
        if instruction.opcode_name == BATTLE_SCRIPT_JUMPIFNODAMAGE_OPCODE_NAME {
            count += 1;
            selected = Some(*instruction);
        }
    }
    if count != 1 {
        return Err(
            BattleScriptJumpifnodamageRegistrationError::IncorrectConcreteStartCount { count },
        );
    }
    let instruction = selected.expect("one selected instruction after singleton count");
    if !has_committed_registration_shape(instruction) {
        return Err(
            BattleScriptJumpifnodamageRegistrationError::InvalidInstructionShape {
                program_counter: instruction.program_counter,
            },
        );
    }
    Ok(BattleScriptJumpifnodamageRegistration { opcode_id: instruction.opcode_id })
}

/// Native immutable-value twin of canonical `Cmd_jumpifnodamage`.
///
/// The attacker role is resolved before receipt reads. The two signed-domain
/// ProtectStruct values are tested in source physical-then-special order; any
/// nonzero value advances without touching the pointer lookup. Only when both
/// are zero does the handler consult its already-decoded target expression.
/// Both success paths preserve every member of the narrow projection.
pub fn apply_battle_script_jumpifnodamage<'a>(
    execution: BattleScriptJumpifnodamageExecution<'a>,
    rules: &BattleScriptJumpifnodamageRules,
) -> Result<BattleScriptJumpifnodamageOutcome, BattleScriptJumpifnodamageError<'a>> {
    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptJumpifnodamageError::MissingAttackerRole)?;
    let receipt = rules.battlers[attacker.index()];
    if receipt.protect_physical_dmg != 0 || receipt.protect_special_dmg != 0 {
        return Ok(BattleScriptJumpifnodamageOutcome {
            rules: *rules,
            control: BattleScriptJumpifnodamageControl::Advance,
        });
    }
    if !execution.jump_target_resolves {
        return Err(BattleScriptJumpifnodamageError::UnresolvedJumpTarget {
            expression: execution.jump_target_expression,
        });
    }
    Ok(BattleScriptJumpifnodamageOutcome {
        rules: *rules,
        control: BattleScriptJumpifnodamageControl::Jump,
    })
}
