//! Pure `B_SCR_OP_BICBYTE` (0x36, `Cmd_bicbyte`) / `B_SCR_OP_ORBYTE` (0x33,
//! `Cmd_orbyte`) / `B_SCR_OP_BICWORD` (0x38, `Cmd_bicword`) byte-algebra trio
//! -- the native twin of three separate TypeScript modules:
//! `createBattleScriptBicbyteCommandHandlers`
//! (`src/engine/battleScriptSetByte.ts:389-461`), the orbyte slice inside
//! `createBattleScriptStatbuffchangeOpcodeHandlers`
//! (`src/engine/battleScriptStatbuffchangeOpcode.ts:464-545`), and
//! `createBicwordHandler` (`src/engine/battleScriptDamagingWeatherOpcode.ts:
//! 292-343`).
//!
//! All three are advance-only bit-algebra primitives -- no jumps, no battler
//! selectors, no RNG: `*ptr &= ~mask` / `*ptr |= value` / `*word &= ~mask`.
//! The interest of grouping them into one module is their THREE DIFFERENT
//! registration conventions:
//! - **bicbyte**: eager, hard-`throw` validation of ALL 11 concrete starts,
//!   checking dispatcher, operand shape, pointer-list membership, AND mask
//!   resolution before any execution.
//! - **orbyte**: also eager over all 11 concrete starts, but with NO
//!   dispatcher check (a custom program whose orbyte rows carry a wrong
//!   dispatcher string still registers -- pinned by a dedicated test) and a
//!   pointer check that is an exact-string match (`"gMoveResultFlags"`), not
//!   list membership.
//! - **bicword**: validates NOTHING at registration -- find-FIRST REQUIRED
//!   only (`findInstructionOpcodeId`); every guard is at RUNTIME, and an
//!   unmodeled operand pair is a first-class `Halt` mirroring canonical
//!   `unsupportedBranch` verbatim (M74 shape), never an error.
//!
//! Value-resolution universes also differ. bicbyte's mask resolves through
//! `resolveBattleScriptSetByteValue`, the ~130-entry `SETBYTE_VALUES` literal
//! table shared across SETBYTE/BICBYTE/ADDBYTE/JUMPIFBYTE; this module
//! direct-ports only the 3 literal masks the 11 committed bicbyte call sites
//! actually use (`battle.h:220-228`) -- a narrow catalog projection of that
//! table, matching the M74 `battle_script_jumpif.rs` decision to record only
//! the committed-and-tested operand universe rather than hand-port the whole
//! table. orbyte's value resolves through its own private 3-entry
//! `ORBYTE_MOVE_RESULT_BITS` map (no shared-table membership). bicword's mask
//! resolves through its own private 3-entry `BICWORD_ACCEPTED_MASK_BY_VALUE`
//! map keyed by the literal value-operand text.
//!
//! bicbyte's pointer check is direct-ported in full: the ~24-name
//! `BATTLE_SCRIPT_SETBYTE_POINTER_EXPRESSIONS` list
//! (`battleScriptSetByte.ts:31-56`) is small and fully enumerable, so this
//! module ports it verbatim. All 11 committed bicbyte call sites target
//! `gMoveResultFlags`, so this module's RUNTIME byte universe is modeled
//! narrowly (`moveResultFlags` only, mirroring the shared
//! [`BattleScriptByteAlgebraRules`] projection). A custom instruction whose
//! pointer is one of the other ~23 listed expressions still PASSES
//! registration (matching canonical TypeScript, which reads/writes the full
//! byte-lvalue universe) but its EXECUTION is outside this leaf's modeled
//! universe: this module surfaces that gap as a first-class `Halt` mirror
//! (the same catalog-projection boundary `battle_script_jumpif.rs` uses for
//! beyond-committed-universe operands), which is a deliberate, documented
//! DIVERGENCE from canonical TypeScript (which would execute those other
//! pointers successfully) -- do not widen this without porting the full
//! byte-lvalue universe.
//!
//! Source authority: `reference/pokeemerald/src/battle_script_commands.c` --
//! `Cmd_orbyte` :3864-3869 (`T2_READ_PTR(gBattlescriptCurrInstr + 1)`,
//! `|= gBattlescriptCurrInstr[5]`, `+= 6`), `Cmd_bicbyte` :3889-3894
//! (`&= ~(gBattlescriptCurrInstr[5])`, `+= 6`), `Cmd_bicword` :3905-3912
//! (`T2_READ_32(... + 5)`, `&= ~val`, `+= 9`); dispatch rows :382 (`//0x33`),
//! :385 (`//0x36`), :387 (`//0x38`); forward decls :130, :133, :135; enum
//! positions `include/constants/battle_script_commands.h:57,60,62`; macros
//! `asm/macros/battle_script.inc:290` (`orbyte ptr:req, byte:req`, width 6),
//! :308 (`bicbyte ptr:req, byte:req`, width 6), :320 (`bicword ptr:req,
//! word:req`, width 9). Call sites in `data/battle_scripts_1.s` (verified by
//! grep): 11 bicbyte (MOVE_RESULT_MISSED x3: :419,:866,:1425;
//! MOVE_RESULT_SUPER_EFFECTIVE|MOVE_RESULT_NOT_VERY_EFFECTIVE x7:
//! :815,:825,:1201,:1212,:1726,:2488,:3300;
//! MOVE_RESULT_MISSED|MOVE_RESULT_DOESNT_AFFECT_FOE x1: :2429), 11 orbyte
//! (MOVE_RESULT_MISSED x3: :272,:422,:871; MOVE_RESULT_FAILED x5:
//! :470,:2060,:2682,:2768,:3542; MOVE_RESULT_DOESNT_AFFECT_FOE x3:
//! :2067,:4088,:4098), 3 bicword (`HITMARKER_IGNORE_UNDERGROUND` :1846, the
//! 4-way combo :3223, `HITMARKER_WAKE_UP_CLEAR` :3724).
//!
//! This leaf owns neither a generic machine, scheduler/event transport, RNG,
//! presentation, nor the WASM ABI.

use core::fmt;

pub const BATTLE_SCRIPT_BYTE_ALGEBRA_SOURCE_FILE: &str = "battle_script_commands.c";

pub const BATTLE_SCRIPT_BICBYTE_OPCODE: u8 = 0x36;
pub const BATTLE_SCRIPT_BICBYTE_OPCODE_NAME: &str = "B_SCR_OP_BICBYTE";
pub const BATTLE_SCRIPT_BICBYTE_DISPATCHER: &str = "Cmd_bicbyte";
pub const BATTLE_SCRIPT_BICBYTE_POINTER_WIDTH_BYTES: u8 = 4;
pub const BATTLE_SCRIPT_BICBYTE_MASK_WIDTH_BYTES: u8 = 1;
pub const BATTLE_SCRIPT_BICBYTE_ENCODED_WIDTH_BYTES: u8 = 6;
pub const BATTLE_SCRIPT_BICBYTE_CONCRETE_START_COUNT: usize = 11;
pub const BATTLE_SCRIPT_BICBYTE_HANDLER_LINE: u32 = 3889;

pub const BATTLE_SCRIPT_ORBYTE_OPCODE: u8 = 0x33;
pub const BATTLE_SCRIPT_ORBYTE_OPCODE_NAME: &str = "B_SCR_OP_ORBYTE";
pub const BATTLE_SCRIPT_ORBYTE_DISPATCHER: &str = "Cmd_orbyte";
pub const BATTLE_SCRIPT_ORBYTE_POINTER_WIDTH_BYTES: u8 = 4;
pub const BATTLE_SCRIPT_ORBYTE_VALUE_WIDTH_BYTES: u8 = 1;
pub const BATTLE_SCRIPT_ORBYTE_ENCODED_WIDTH_BYTES: u8 = 6;
pub const BATTLE_SCRIPT_ORBYTE_CONCRETE_START_COUNT: usize = 11;
pub const BATTLE_SCRIPT_ORBYTE_POINTER_EXPRESSION: &str = "gMoveResultFlags";
pub const BATTLE_SCRIPT_ORBYTE_HANDLER_LINE: u32 = 3864;

pub const BATTLE_SCRIPT_BICWORD_OPCODE: u8 = 0x38;
pub const BATTLE_SCRIPT_BICWORD_OPCODE_NAME: &str = "B_SCR_OP_BICWORD";
pub const BATTLE_SCRIPT_BICWORD_DISPATCHER: &str = "Cmd_bicword";
pub const BATTLE_SCRIPT_BICWORD_ENCODED_WIDTH_BYTES: u8 = 9;
pub const BATTLE_SCRIPT_BICWORD_POINTER_EXPRESSION: &str = "gHitMarker";
pub const BATTLE_SCRIPT_BICWORD_HANDLER_LINE: u32 = 3905;

/// Direct port of `BATTLE_SCRIPT_SETBYTE_POINTER_EXPRESSIONS`
/// (`battleScriptSetByte.ts:31-56`) -- a fixed, fully enumerable ~24-name
/// list. Only bicbyte's registration consults this; its execution universe
/// is narrowed further (see module doc comment).
pub const BATTLE_SCRIPT_SETBYTE_POINTER_EXPRESSIONS: [&str; 24] = [
    "cEFFECT_CHOOSER",
    "cMULTISTRING_CHOOSER",
    "gBattleCommunication",
    "gBattleCommunication + 1",
    "gBattleMoveDamage",
    "gBattleMoveDamage + 1",
    "gBattleMoveDamage + 2",
    "gBattleMoveDamage + 3",
    "gBattlerTarget",
    "gMoveResultFlags",
    "sBATTLER",
    "sB_ANIM_TARGETS_HIT",
    "sB_ANIM_TURN",
    "sDMG_MULTIPLIER",
    "sGIVEEXP_STATE",
    "sLEARNMOVE_STATE",
    "sLVLBOX_STATE",
    "sMOVEEND_STATE",
    "sMULTIHIT_EFFECT",
    "sSTATCHANGER",
    "sSTAT_ANIM_PLAYED",
    "sTRIPLE_KICK_POWER",
    "sTRIPLE_KICK_POWER + 1",
    "sTWOTURN_STRINGID",
];

/// Narrow projection of the ~130-entry canonical `SETBYTE_VALUES` table
/// (`battleScriptSetByte.ts`), restricted to the 3 literal mask expressions
/// the 11 committed `B_SCR_OP_BICBYTE` call sites use.
/// `include/constants/battle.h:220-228`.
const BICBYTE_MASKS: [(&str, u8); 3] = [
    ("MOVE_RESULT_MISSED", 1 << 0),
    (
        "MOVE_RESULT_SUPER_EFFECTIVE | MOVE_RESULT_NOT_VERY_EFFECTIVE",
        (1 << 1) | (1 << 2),
    ),
    (
        "MOVE_RESULT_MISSED | MOVE_RESULT_DOESNT_AFFECT_FOE",
        (1 << 0) | (1 << 3),
    ),
];

/// Native twin of `resolveBattleScriptSetByteValue`, narrowed to the 3 mask
/// literals this opcode's committed sites use (see module doc comment).
#[must_use]
pub fn resolve_battle_script_bicbyte_mask(expression: &str) -> Option<u8> {
    BICBYTE_MASKS
        .iter()
        .find_map(|(candidate, value)| (*candidate == expression).then_some(*value))
}

/// `ORBYTE_MOVE_RESULT_BITS` (`battleScriptStatbuffchangeOpcode.ts:464-470`).
/// `include/constants/battle.h:220-228`.
const ORBYTE_VALUES: [(&str, u8); 3] = [
    ("MOVE_RESULT_MISSED", 1 << 0),
    ("MOVE_RESULT_DOESNT_AFFECT_FOE", 1 << 3),
    ("MOVE_RESULT_FAILED", 1 << 5),
];

#[must_use]
pub fn resolve_battle_script_orbyte_value(expression: &str) -> Option<u8> {
    ORBYTE_VALUES
        .iter()
        .find_map(|(candidate, value)| (*candidate == expression).then_some(*value))
}

/// `HITMARKER_WAKE_UP_CLEAR` from `include/constants/battle.h:181`
/// (documented never set or checked; the interpreter still performs the
/// source-authentic clear).
pub const BATTLE_SCRIPT_HITMARKER_WAKE_UP_CLEAR: u32 = 1 << 4;
/// `HITMARKER_IGNORE_BIDE` from `include/constants/battle.h:182`.
pub const BATTLE_SCRIPT_HITMARKER_IGNORE_BIDE: u32 = 1 << 5;
/// `HITMARKER_IGNORE_SUBSTITUTE` from `include/constants/battle.h:185`.
pub const BATTLE_SCRIPT_HITMARKER_IGNORE_SUBSTITUTE: u32 = 1 << 8;
/// `HITMARKER_IGNORE_UNDERGROUND` from `include/constants/battle.h:194`.
pub const BATTLE_SCRIPT_HITMARKER_IGNORE_UNDERGROUND: u32 = 1 << 17;
/// `HITMARKER_PASSIVE_HP_UPDATE` from `include/constants/battle.h:197`.
pub const BATTLE_SCRIPT_HITMARKER_PASSIVE_HP_UPDATE: u32 = 1 << 20;
/// `HITMARKER_GRUDGE` from `include/constants/battle.h:201`.
pub const BATTLE_SCRIPT_HITMARKER_GRUDGE: u32 = 1 << 24;

/// `BattleScript_DamagingWeatherContinuesEnd`'s combo
/// (`battleScriptDamagingWeatherOpcode.ts:292-317`).
pub const BATTLE_SCRIPT_BICWORD_FOUR_WAY_COMBO_EXPRESSION: &str =
    "HITMARKER_IGNORE_BIDE | HITMARKER_IGNORE_SUBSTITUTE | HITMARKER_PASSIVE_HP_UPDATE | HITMARKER_GRUDGE";

const BICWORD_FOUR_WAY_MASK: u32 = BATTLE_SCRIPT_HITMARKER_IGNORE_BIDE
    | BATTLE_SCRIPT_HITMARKER_IGNORE_SUBSTITUTE
    | BATTLE_SCRIPT_HITMARKER_PASSIVE_HP_UPDATE
    | BATTLE_SCRIPT_HITMARKER_GRUDGE;

/// Native twin of `BICWORD_ACCEPTED_MASK_BY_VALUE`
/// (`battleScriptDamagingWeatherOpcode.ts:305-317`): exactly 3 accepted
/// value-operand literals, keyed by exact text (no `|`-splitting).
#[must_use]
pub fn resolve_battle_script_bicword_mask(expression: &str) -> Option<u32> {
    if expression == BATTLE_SCRIPT_BICWORD_FOUR_WAY_COMBO_EXPRESSION {
        Some(BICWORD_FOUR_WAY_MASK)
    } else if expression == "HITMARKER_IGNORE_UNDERGROUND" {
        Some(BATTLE_SCRIPT_HITMARKER_IGNORE_UNDERGROUND)
    } else if expression == "HITMARKER_WAKE_UP_CLEAR" {
        Some(BATTLE_SCRIPT_HITMARKER_WAKE_UP_CLEAR)
    } else {
        None
    }
}

/// Deliberately minimal narrow projection: the two fields these three
/// opcodes can possibly write (`move_result_flags` for bicbyte/orbyte,
/// `hit_marker` for bicword), plus a small untouched-sibling slice so the
/// "only the mutated field changes" boundary is testable (orword-style
/// precedent).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptByteAlgebraSiblings {
    pub battle_outcome: u8,
    pub crit_multiplier: u8,
    pub weather: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptByteAlgebraRules {
    pub move_result_flags: u8,
    pub hit_marker: u32,
    pub siblings: BattleScriptByteAlgebraSiblings,
}

/// One source macro operand, shared by bicbyte/orbyte (bicword carries its
/// two operand expressions directly -- see [`BattleScriptBicwordInstruction`]
/// -- since its registration never inspects operand shape).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptByteAlgebraOperand<'a> {
    pub width_bytes: u8,
    pub expression: &'a str,
}

/// Mirrors canonical `unsupportedBranch`'s reason object verbatim -- a valid
/// outcome, never an error (M74 shape).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BattleScriptByteAlgebraHalt {
    pub program_counter: u32,
    pub opcode_id: u8,
    pub opcode_name: &'static str,
    pub source_construct: String,
    pub source_file: &'static str,
    pub source_line: u32,
}

// ---------------------------------------------------------------------
// BICBYTE
// ---------------------------------------------------------------------

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptBicbyteInstruction<'a> {
    pub opcode_name: &'a str,
    pub program_counter: u32,
    pub opcode_id: u8,
    pub dispatcher: &'a str,
    pub operands: &'a [BattleScriptByteAlgebraOperand<'a>],
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptBicbyteRegistration {
    pub opcode_id: u8,
}

/// Exact eager-registration failures in canonical evaluation order.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptBicbyteRegistrationError<'a> {
    WrongCardinality { count: usize },
    InvalidInstructionShape { program_counter: u32 },
    UnknownPointer { expression: &'a str },
    UnknownMask { expression: &'a str },
}

impl fmt::Display for BattleScriptBicbyteRegistrationError<'_> {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::WrongCardinality { count } => write!(
                formatter,
                "B_SCR_OP_BICBYTE requires all 11 concrete starts, got {count}"
            ),
            Self::InvalidInstructionShape { program_counter } => write!(
                formatter,
                "invalid B_SCR_OP_BICBYTE shape at program counter {program_counter}"
            ),
            Self::UnknownPointer { expression } => {
                write!(formatter, "unknown B_SCR_OP_BICBYTE pointer {expression}")
            }
            Self::UnknownMask { expression } => {
                write!(formatter, "unknown B_SCR_OP_BICBYTE mask {expression}")
            }
        }
    }
}

impl std::error::Error for BattleScriptBicbyteRegistrationError<'_> {}

fn validate_bicbyte_instruction<'a>(
    instruction: &BattleScriptBicbyteInstruction<'a>,
) -> Result<(), BattleScriptBicbyteRegistrationError<'a>> {
    let [pointer, mask] = instruction.operands else {
        return Err(
            BattleScriptBicbyteRegistrationError::InvalidInstructionShape {
                program_counter: instruction.program_counter,
            },
        );
    };
    if instruction.dispatcher != BATTLE_SCRIPT_BICBYTE_DISPATCHER
        || pointer.width_bytes != BATTLE_SCRIPT_BICBYTE_POINTER_WIDTH_BYTES
        || mask.width_bytes != BATTLE_SCRIPT_BICBYTE_MASK_WIDTH_BYTES
    {
        return Err(
            BattleScriptBicbyteRegistrationError::InvalidInstructionShape {
                program_counter: instruction.program_counter,
            },
        );
    }
    if !BATTLE_SCRIPT_SETBYTE_POINTER_EXPRESSIONS.contains(&pointer.expression) {
        return Err(BattleScriptBicbyteRegistrationError::UnknownPointer {
            expression: pointer.expression,
        });
    }
    if resolve_battle_script_bicbyte_mask(mask.expression).is_none() {
        return Err(BattleScriptBicbyteRegistrationError::UnknownMask {
            expression: mask.expression,
        });
    }
    Ok(())
}

/// Native projection of `createBattleScriptBicbyteCommandHandlers`: ALL 11
/// concrete starts validated eagerly (hard error, not a runtime halt), then
/// the first selected opcode id becomes the handler-map key.
pub fn register_battle_script_bicbyte<'a>(
    instructions: &[BattleScriptBicbyteInstruction<'a>],
) -> Result<BattleScriptBicbyteRegistration, BattleScriptBicbyteRegistrationError<'a>> {
    let matching = instructions
        .iter()
        .filter(|instruction| instruction.opcode_name == BATTLE_SCRIPT_BICBYTE_OPCODE_NAME)
        .collect::<Vec<_>>();
    if matching.len() != BATTLE_SCRIPT_BICBYTE_CONCRETE_START_COUNT {
        return Err(BattleScriptBicbyteRegistrationError::WrongCardinality {
            count: matching.len(),
        });
    }
    for instruction in &matching {
        validate_bicbyte_instruction(instruction)?;
    }
    Ok(BattleScriptBicbyteRegistration { opcode_id: matching[0].opcode_id })
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BattleScriptBicbyteOutcome {
    Advance {
        rules: BattleScriptByteAlgebraRules,
    },
    /// The pointer passed registration's 24-name universe check but this
    /// leaf only models `gMoveResultFlags` at runtime (module doc comment).
    Halt(BattleScriptByteAlgebraHalt),
}

/// Reachable only if a caller bypasses successful registration or a
/// previously validated source program changes under a live handler.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptBicbyteError {
    ValidatedInstructionBecameUndecodable { program_counter: u32 },
}

impl fmt::Display for BattleScriptBicbyteError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ValidatedInstructionBecameUndecodable { program_counter } => write!(
                formatter,
                "validated B_SCR_OP_BICBYTE became undecodable at {program_counter}"
            ),
        }
    }
}

impl std::error::Error for BattleScriptBicbyteError {}

/// Native twin of `Cmd_bicbyte` (`battle_script_commands.c:3889-3894`):
/// `*ptr &= ~mask`, restricted at runtime to `gMoveResultFlags`.
pub fn apply_battle_script_bicbyte(
    instruction: &BattleScriptBicbyteInstruction<'_>,
    rules: &BattleScriptByteAlgebraRules,
) -> Result<BattleScriptBicbyteOutcome, BattleScriptBicbyteError> {
    let [pointer, mask_operand] = instruction.operands else {
        return Err(
            BattleScriptBicbyteError::ValidatedInstructionBecameUndecodable {
                program_counter: instruction.program_counter,
            },
        );
    };
    let Some(mask) = resolve_battle_script_bicbyte_mask(mask_operand.expression) else {
        return Err(
            BattleScriptBicbyteError::ValidatedInstructionBecameUndecodable {
                program_counter: instruction.program_counter,
            },
        );
    };
    if pointer.expression != "gMoveResultFlags" {
        return Ok(BattleScriptBicbyteOutcome::Halt(BattleScriptByteAlgebraHalt {
            program_counter: instruction.program_counter,
            opcode_id: instruction.opcode_id,
            opcode_name: BATTLE_SCRIPT_BICBYTE_OPCODE_NAME,
            source_construct: format!(
                "Cmd_bicbyte's pointer {} is outside the modeled runtime byte universe (gMoveResultFlags)",
                pointer.expression
            ),
            source_file: BATTLE_SCRIPT_BYTE_ALGEBRA_SOURCE_FILE,
            source_line: BATTLE_SCRIPT_BICBYTE_HANDLER_LINE,
        }));
    }
    let mut next = *rules;
    next.move_result_flags = rules.move_result_flags & !mask;
    Ok(BattleScriptBicbyteOutcome::Advance { rules: next })
}

// ---------------------------------------------------------------------
// ORBYTE
// ---------------------------------------------------------------------

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptOrbyteInstruction<'a> {
    pub opcode_name: &'a str,
    pub program_counter: u32,
    pub opcode_id: u8,
    /// Preserved as program provenance but deliberately NEVER validated at
    /// registration -- the asymmetry vs bicbyte this module pins.
    pub dispatcher: &'a str,
    pub operands: &'a [BattleScriptByteAlgebraOperand<'a>],
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptOrbyteRegistration {
    pub opcode_id: u8,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptOrbyteRegistrationError<'a> {
    WrongCardinality { count: usize },
    InvalidInstructionShape { program_counter: u32 },
    UnknownPointer { expression: &'a str },
    UnknownValue { expression: &'a str },
}

impl fmt::Display for BattleScriptOrbyteRegistrationError<'_> {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::WrongCardinality { count } => write!(
                formatter,
                "B_SCR_OP_ORBYTE requires all 11 concrete starts, got {count}"
            ),
            Self::InvalidInstructionShape { program_counter } => write!(
                formatter,
                "invalid B_SCR_OP_ORBYTE shape at program counter {program_counter}"
            ),
            Self::UnknownPointer { expression } => {
                write!(formatter, "unknown B_SCR_OP_ORBYTE pointer {expression}")
            }
            Self::UnknownValue { expression } => {
                write!(formatter, "unknown B_SCR_OP_ORBYTE value {expression}")
            }
        }
    }
}

impl std::error::Error for BattleScriptOrbyteRegistrationError<'_> {}

fn validate_orbyte_instruction<'a>(
    instruction: &BattleScriptOrbyteInstruction<'a>,
) -> Result<(), BattleScriptOrbyteRegistrationError<'a>> {
    let [pointer, value] = instruction.operands else {
        return Err(
            BattleScriptOrbyteRegistrationError::InvalidInstructionShape {
                program_counter: instruction.program_counter,
            },
        );
    };
    // NOTE: no dispatcher check here -- this is the documented asymmetry.
    if pointer.width_bytes != BATTLE_SCRIPT_ORBYTE_POINTER_WIDTH_BYTES
        || value.width_bytes != BATTLE_SCRIPT_ORBYTE_VALUE_WIDTH_BYTES
    {
        return Err(
            BattleScriptOrbyteRegistrationError::InvalidInstructionShape {
                program_counter: instruction.program_counter,
            },
        );
    }
    if pointer.expression != BATTLE_SCRIPT_ORBYTE_POINTER_EXPRESSION {
        return Err(BattleScriptOrbyteRegistrationError::UnknownPointer {
            expression: pointer.expression,
        });
    }
    if resolve_battle_script_orbyte_value(value.expression).is_none() {
        return Err(BattleScriptOrbyteRegistrationError::UnknownValue {
            expression: value.expression,
        });
    }
    Ok(())
}

/// Native projection of the orbyte slice inside
/// `createBattleScriptStatbuffchangeOpcodeHandlers` (:524-545). That same
/// factory also hard-requires 31 `B_SCR_OP_STATBUFFCHANGE` concrete starts,
/// but that is ANOTHER opcode's registration (M81 jumpifstatus2-slice
/// precedent) and is out of scope for this module.
pub fn register_battle_script_orbyte<'a>(
    instructions: &[BattleScriptOrbyteInstruction<'a>],
) -> Result<BattleScriptOrbyteRegistration, BattleScriptOrbyteRegistrationError<'a>> {
    let matching = instructions
        .iter()
        .filter(|instruction| instruction.opcode_name == BATTLE_SCRIPT_ORBYTE_OPCODE_NAME)
        .collect::<Vec<_>>();
    if matching.len() != BATTLE_SCRIPT_ORBYTE_CONCRETE_START_COUNT {
        return Err(BattleScriptOrbyteRegistrationError::WrongCardinality {
            count: matching.len(),
        });
    }
    for instruction in &matching {
        validate_orbyte_instruction(instruction)?;
    }
    Ok(BattleScriptOrbyteRegistration { opcode_id: matching[0].opcode_id })
}

/// Reachable only if a caller bypasses successful registration.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptOrbyteError {
    ValidatedInstructionBecameUndecodable { program_counter: u32 },
}

impl fmt::Display for BattleScriptOrbyteError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ValidatedInstructionBecameUndecodable { program_counter } => write!(
                formatter,
                "validated B_SCR_OP_ORBYTE became undecodable at {program_counter}"
            ),
        }
    }
}

impl std::error::Error for BattleScriptOrbyteError {}

/// Native twin of `Cmd_orbyte` (`battle_script_commands.c:3864-3869`):
/// `*ptr |= value`. Registration already restricts the pointer to exactly
/// `gMoveResultFlags`, so unlike bicbyte there is no beyond-universe pointer
/// case here.
pub fn apply_battle_script_orbyte(
    instruction: &BattleScriptOrbyteInstruction<'_>,
    rules: &BattleScriptByteAlgebraRules,
) -> Result<BattleScriptByteAlgebraRules, BattleScriptOrbyteError> {
    let [_, value_operand] = instruction.operands else {
        return Err(
            BattleScriptOrbyteError::ValidatedInstructionBecameUndecodable {
                program_counter: instruction.program_counter,
            },
        );
    };
    let Some(value) = resolve_battle_script_orbyte_value(value_operand.expression) else {
        return Err(
            BattleScriptOrbyteError::ValidatedInstructionBecameUndecodable {
                program_counter: instruction.program_counter,
            },
        );
    };
    let mut next = *rules;
    next.move_result_flags |= value;
    Ok(next)
}

// ---------------------------------------------------------------------
// BICWORD
// ---------------------------------------------------------------------

/// Registration validates NOTHING for bicword -- only the opcode name/id
/// pair is needed to find the first instance.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptBicwordRegistrationInstruction<'a> {
    pub opcode_name: &'a str,
    pub opcode_id: u8,
}

/// `committed Battle Script program does not emit B_SCR_OP_BICWORD`
/// (`findInstructionOpcodeId`, `battleScriptDamagingWeatherOpcode.ts:399-403`,
/// used at :444).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptBicwordRegistrationError;

impl fmt::Display for BattleScriptBicwordRegistrationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            formatter,
            "committed Battle Script program does not emit {BATTLE_SCRIPT_BICWORD_OPCODE_NAME}"
        )
    }
}

impl std::error::Error for BattleScriptBicwordRegistrationError {}

/// Find-FIRST REQUIRED, same convention as `battle_script_jumpif.rs`'s
/// `register_first` and `jumpifstatus`'s required registration.
pub fn register_battle_script_bicword(
    instructions: &[BattleScriptBicwordRegistrationInstruction<'_>],
) -> Result<u8, BattleScriptBicwordRegistrationError> {
    instructions
        .iter()
        .find(|instruction| instruction.opcode_name == BATTLE_SCRIPT_BICWORD_OPCODE_NAME)
        .map(|instruction| instruction.opcode_id)
        .ok_or(BattleScriptBicwordRegistrationError)
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptBicwordInstruction<'a> {
    pub program_counter: u32,
    pub opcode_id: u8,
    pub pointer_expression: &'a str,
    pub value_expression: &'a str,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BattleScriptBicwordOutcome {
    Advance {
        rules: BattleScriptByteAlgebraRules,
    },
    /// Mirrors canonical `unsupportedBranch` verbatim -- a valid outcome,
    /// never an error.
    Halt(BattleScriptByteAlgebraHalt),
}

/// Native twin of `Cmd_bicword` (`battle_script_commands.c:3905-3912`):
/// `*ptr &= ~mask`. No shape is validated -- every unmodeled `(pointer,
/// value)` pair halts instead of erroring; this function is infallible.
#[must_use]
pub fn apply_battle_script_bicword(
    instruction: &BattleScriptBicwordInstruction<'_>,
    rules: &BattleScriptByteAlgebraRules,
) -> BattleScriptBicwordOutcome {
    let mask = if instruction.pointer_expression == BATTLE_SCRIPT_BICWORD_POINTER_EXPRESSION {
        resolve_battle_script_bicword_mask(instruction.value_expression)
    } else {
        None
    };
    let Some(mask) = mask else {
        return BattleScriptBicwordOutcome::Halt(BattleScriptByteAlgebraHalt {
            program_counter: instruction.program_counter,
            opcode_id: instruction.opcode_id,
            opcode_name: BATTLE_SCRIPT_BICWORD_OPCODE_NAME,
            source_construct: format!(
                "Cmd_bicword's operand ({}, {}) is not modeled",
                instruction.pointer_expression, instruction.value_expression
            ),
            source_file: BATTLE_SCRIPT_BYTE_ALGEBRA_SOURCE_FILE,
            source_line: BATTLE_SCRIPT_BICWORD_HANDLER_LINE,
        });
    };
    let mut next = *rules;
    next.hit_marker = rules.hit_marker & !mask;
    BattleScriptBicwordOutcome::Advance { rules: next }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rules() -> BattleScriptByteAlgebraRules {
        BattleScriptByteAlgebraRules {
            move_result_flags: 0,
            hit_marker: 0,
            siblings: BattleScriptByteAlgebraSiblings {
                battle_outcome: 7,
                crit_multiplier: 2,
                weather: 0x1234,
            },
        }
    }

    fn bicbyte_instruction<'a>(
        operands: &'a [BattleScriptByteAlgebraOperand<'a>],
    ) -> BattleScriptBicbyteInstruction<'a> {
        BattleScriptBicbyteInstruction {
            opcode_name: BATTLE_SCRIPT_BICBYTE_OPCODE_NAME,
            program_counter: 10,
            opcode_id: BATTLE_SCRIPT_BICBYTE_OPCODE,
            dispatcher: BATTLE_SCRIPT_BICBYTE_DISPATCHER,
            operands,
        }
    }

    #[test]
    fn bicbyte_mask_resolver_both_directions() {
        assert_eq!(
            resolve_battle_script_bicbyte_mask("MOVE_RESULT_MISSED"),
            Some(1)
        );
        assert_eq!(
            resolve_battle_script_bicbyte_mask(
                "MOVE_RESULT_SUPER_EFFECTIVE | MOVE_RESULT_NOT_VERY_EFFECTIVE"
            ),
            Some(0b110)
        );
        assert_eq!(
            resolve_battle_script_bicbyte_mask(
                "MOVE_RESULT_MISSED | MOVE_RESULT_DOESNT_AFFECT_FOE"
            ),
            Some(0b1001)
        );
        assert_eq!(
            resolve_battle_script_bicbyte_mask("MOVE_RESULT_FAILED"),
            None
        );
    }

    #[test]
    fn bicbyte_algebra_clears_masked_bits_at_u8_edge() {
        let mut r = rules();
        r.move_result_flags = 0xff;
        let ops = [
            BattleScriptByteAlgebraOperand { width_bytes: 4, expression: "gMoveResultFlags" },
            BattleScriptByteAlgebraOperand { width_bytes: 1, expression: "MOVE_RESULT_MISSED" },
        ];
        let outcome = apply_battle_script_bicbyte(&bicbyte_instruction(&ops), &r).unwrap();
        match outcome {
            BattleScriptBicbyteOutcome::Advance { rules: next } => {
                assert_eq!(next.move_result_flags, 0xfe);
                assert_eq!(next.hit_marker, r.hit_marker);
                assert_eq!(next.siblings, r.siblings);
            }
            other => panic!("expected advance, got {other:?}"),
        }
    }

    #[test]
    fn bicbyte_idempotent_when_bit_already_clear() {
        let mut r = rules();
        r.move_result_flags = 0b0000_0110;
        let ops = [
            BattleScriptByteAlgebraOperand { width_bytes: 4, expression: "gMoveResultFlags" },
            BattleScriptByteAlgebraOperand { width_bytes: 1, expression: "MOVE_RESULT_MISSED" },
        ];
        let outcome = apply_battle_script_bicbyte(&bicbyte_instruction(&ops), &r).unwrap();
        match outcome {
            BattleScriptBicbyteOutcome::Advance { rules: next } => {
                assert_eq!(next.move_result_flags, 0b0000_0110);
            }
            other => panic!("expected advance, got {other:?}"),
        }
    }

    #[test]
    fn bicbyte_registration_requires_all_11_and_validates_in_order() {
        let good = bicbyte_instruction(&[
            BattleScriptByteAlgebraOperand { width_bytes: 4, expression: "gMoveResultFlags" },
            BattleScriptByteAlgebraOperand { width_bytes: 1, expression: "MOVE_RESULT_MISSED" },
        ]);
        let starts = vec![good; 11];
        let registration = register_battle_script_bicbyte(&starts).unwrap();
        assert_eq!(registration.opcode_id, BATTLE_SCRIPT_BICBYTE_OPCODE);

        let wrong_count = register_battle_script_bicbyte(&starts[..10]).unwrap_err();
        assert_eq!(
            wrong_count.to_string(),
            "B_SCR_OP_BICBYTE requires all 11 concrete starts, got 10"
        );

        let mut bad_shape = starts.clone();
        bad_shape[0].dispatcher = "Cmd_setbyte";
        let err = register_battle_script_bicbyte(&bad_shape).unwrap_err();
        assert_eq!(
            err.to_string(),
            "invalid B_SCR_OP_BICBYTE shape at program counter 10"
        );

        let mut bad_pointer = starts.clone();
        bad_pointer[0].operands = &[
            BattleScriptByteAlgebraOperand { width_bytes: 4, expression: "gBogusPointer" },
            BattleScriptByteAlgebraOperand { width_bytes: 1, expression: "MOVE_RESULT_MISSED" },
        ];
        let err = register_battle_script_bicbyte(&bad_pointer).unwrap_err();
        assert_eq!(
            err.to_string(),
            "unknown B_SCR_OP_BICBYTE pointer gBogusPointer"
        );

        let mut bad_mask = starts.clone();
        bad_mask[0].operands = &[
            BattleScriptByteAlgebraOperand { width_bytes: 4, expression: "gMoveResultFlags" },
            BattleScriptByteAlgebraOperand { width_bytes: 1, expression: "MOVE_RESULT_FAILED" },
        ];
        let err = register_battle_script_bicbyte(&bad_mask).unwrap_err();
        assert_eq!(
            err.to_string(),
            "unknown B_SCR_OP_BICBYTE mask MOVE_RESULT_FAILED"
        );
    }

    #[test]
    fn bicbyte_beyond_committed_pointer_is_a_halt_mirror_not_an_error() {
        let r = rules();
        let ops = [
            BattleScriptByteAlgebraOperand { width_bytes: 4, expression: "sSTATCHANGER" },
            BattleScriptByteAlgebraOperand { width_bytes: 1, expression: "MOVE_RESULT_MISSED" },
        ];
        // sSTATCHANGER is a real listed pointer (passes registration) but
        // this leaf's runtime universe is narrowed to gMoveResultFlags only.
        assert!(BATTLE_SCRIPT_SETBYTE_POINTER_EXPRESSIONS.contains(&"sSTATCHANGER"));
        let outcome = apply_battle_script_bicbyte(&bicbyte_instruction(&ops), &r).unwrap();
        match outcome {
            BattleScriptBicbyteOutcome::Halt(halt) => {
                assert_eq!(
                    halt.source_construct,
                    "Cmd_bicbyte's pointer sSTATCHANGER is outside the modeled runtime byte universe (gMoveResultFlags)"
                );
                assert_eq!(halt.source_line, 3889);
                assert_eq!(halt.source_file, "battle_script_commands.c");
            }
            other => panic!("expected halt, got {other:?}"),
        }
    }

    fn orbyte_instruction<'a>(
        dispatcher: &'a str,
        operands: &'a [BattleScriptByteAlgebraOperand<'a>],
    ) -> BattleScriptOrbyteInstruction<'a> {
        BattleScriptOrbyteInstruction {
            opcode_name: BATTLE_SCRIPT_ORBYTE_OPCODE_NAME,
            program_counter: 20,
            opcode_id: BATTLE_SCRIPT_ORBYTE_OPCODE,
            dispatcher,
            operands,
        }
    }

    #[test]
    fn orbyte_value_resolver_both_directions() {
        assert_eq!(
            resolve_battle_script_orbyte_value("MOVE_RESULT_MISSED"),
            Some(1)
        );
        assert_eq!(
            resolve_battle_script_orbyte_value("MOVE_RESULT_DOESNT_AFFECT_FOE"),
            Some(8)
        );
        assert_eq!(
            resolve_battle_script_orbyte_value("MOVE_RESULT_FAILED"),
            Some(32)
        );
        assert_eq!(
            resolve_battle_script_orbyte_value("MOVE_RESULT_SUPER_EFFECTIVE"),
            None
        );
    }

    #[test]
    fn orbyte_algebra_sets_bit_and_is_idempotent_when_already_set() {
        let ops = [
            BattleScriptByteAlgebraOperand { width_bytes: 4, expression: "gMoveResultFlags" },
            BattleScriptByteAlgebraOperand { width_bytes: 1, expression: "MOVE_RESULT_FAILED" },
        ];
        let mut r = rules();
        let next = apply_battle_script_orbyte(&orbyte_instruction("Cmd_orbyte", &ops), &r).unwrap();
        assert_eq!(next.move_result_flags, 0b0010_0000);
        assert_eq!(next.hit_marker, r.hit_marker);
        assert_eq!(next.siblings, r.siblings);

        r.move_result_flags = 0b0010_0000;
        let next = apply_battle_script_orbyte(&orbyte_instruction("Cmd_orbyte", &ops), &r).unwrap();
        assert_eq!(next.move_result_flags, 0b0010_0000);
    }

    #[test]
    fn orbyte_registration_asymmetry_no_dispatcher_check() {
        let good = orbyte_instruction(
            "Cmd_orbyte",
            &[
                BattleScriptByteAlgebraOperand { width_bytes: 4, expression: "gMoveResultFlags" },
                BattleScriptByteAlgebraOperand { width_bytes: 1, expression: "MOVE_RESULT_MISSED" },
            ],
        );
        let mut starts = vec![good; 11];
        // A wrong dispatcher string still registers -- the documented asymmetry vs bicbyte.
        starts[0].dispatcher = "Cmd_completely_bogus";
        let registration = register_battle_script_orbyte(&starts).unwrap();
        assert_eq!(registration.opcode_id, BATTLE_SCRIPT_ORBYTE_OPCODE);

        let wrong_count = register_battle_script_orbyte(&starts[..10]).unwrap_err();
        assert_eq!(
            wrong_count.to_string(),
            "B_SCR_OP_ORBYTE requires all 11 concrete starts, got 10"
        );

        let mut bad_pointer = starts.clone();
        bad_pointer[0].operands = &[
            BattleScriptByteAlgebraOperand { width_bytes: 4, expression: "gBattleOutcome" },
            BattleScriptByteAlgebraOperand { width_bytes: 1, expression: "MOVE_RESULT_MISSED" },
        ];
        let err = register_battle_script_orbyte(&bad_pointer).unwrap_err();
        assert_eq!(
            err.to_string(),
            "unknown B_SCR_OP_ORBYTE pointer gBattleOutcome"
        );

        let mut bad_value = starts.clone();
        bad_value[0].operands = &[
            BattleScriptByteAlgebraOperand { width_bytes: 4, expression: "gMoveResultFlags" },
            BattleScriptByteAlgebraOperand {
                width_bytes: 1,
                expression: "MOVE_RESULT_SUPER_EFFECTIVE",
            },
        ];
        let err = register_battle_script_orbyte(&bad_value).unwrap_err();
        assert_eq!(
            err.to_string(),
            "unknown B_SCR_OP_ORBYTE value MOVE_RESULT_SUPER_EFFECTIVE"
        );
    }

    #[test]
    fn bicword_mask_resolver_both_directions_and_bit31_edge() {
        assert_eq!(
            resolve_battle_script_bicword_mask(BATTLE_SCRIPT_BICWORD_FOUR_WAY_COMBO_EXPRESSION),
            Some((1 << 5) | (1 << 8) | (1 << 20) | (1 << 24))
        );
        assert_eq!(
            resolve_battle_script_bicword_mask("HITMARKER_IGNORE_UNDERGROUND"),
            Some(1 << 17)
        );
        assert_eq!(
            resolve_battle_script_bicword_mask("HITMARKER_WAKE_UP_CLEAR"),
            Some(1 << 4)
        );
        assert_eq!(
            resolve_battle_script_bicword_mask("HITMARKER_CHARGING"),
            None
        );
    }

    #[test]
    fn bicword_algebra_clears_all_masked_bits_vs_none() {
        let mut r = rules();
        r.hit_marker = 0xffff_ffff;
        let instruction = BattleScriptBicwordInstruction {
            program_counter: 30,
            opcode_id: BATTLE_SCRIPT_BICWORD_OPCODE,
            pointer_expression: "gHitMarker",
            value_expression: BATTLE_SCRIPT_BICWORD_FOUR_WAY_COMBO_EXPRESSION,
        };
        match apply_battle_script_bicword(&instruction, &r) {
            BattleScriptBicwordOutcome::Advance { rules: next } => {
                assert_eq!(
                    next.hit_marker,
                    !((1u32 << 5) | (1 << 8) | (1 << 20) | (1 << 24))
                );
                assert_eq!(next.move_result_flags, r.move_result_flags);
                assert_eq!(next.siblings, r.siblings);
            }
            other => panic!("expected advance, got {other:?}"),
        }

        r.hit_marker = 0;
        match apply_battle_script_bicword(&instruction, &r) {
            BattleScriptBicwordOutcome::Advance { rules: next } => assert_eq!(next.hit_marker, 0),
            other => panic!("expected advance, got {other:?}"),
        }
    }

    #[test]
    fn bicword_unmodeled_operand_pair_halts_with_verbatim_message() {
        let r = rules();
        let instruction = BattleScriptBicwordInstruction {
            program_counter: 40,
            opcode_id: BATTLE_SCRIPT_BICWORD_OPCODE,
            pointer_expression: "gBattleMoveDamage",
            value_expression: "SOME_UNMODELED_VALUE",
        };
        match apply_battle_script_bicword(&instruction, &r) {
            BattleScriptBicwordOutcome::Halt(halt) => {
                assert_eq!(
                    halt.source_construct,
                    "Cmd_bicword's operand (gBattleMoveDamage, SOME_UNMODELED_VALUE) is not modeled"
                );
                assert_eq!(halt.source_file, "battle_script_commands.c");
                assert_eq!(halt.source_line, 3905);
                assert_eq!(halt.opcode_name, BATTLE_SCRIPT_BICWORD_OPCODE_NAME);
            }
            other => panic!("expected halt, got {other:?}"),
        }

        // Right pointer, wrong value also halts.
        let instruction2 = BattleScriptBicwordInstruction {
            program_counter: 41,
            opcode_id: BATTLE_SCRIPT_BICWORD_OPCODE,
            pointer_expression: "gHitMarker",
            value_expression: "HITMARKER_NOT_REAL",
        };
        assert!(matches!(
            apply_battle_script_bicword(&instruction2, &r),
            BattleScriptBicwordOutcome::Halt(_)
        ));
    }

    #[test]
    fn bicword_registration_find_first_required() {
        let present = [BattleScriptBicwordRegistrationInstruction {
            opcode_name: BATTLE_SCRIPT_BICWORD_OPCODE_NAME,
            opcode_id: 0x38,
        }];
        assert_eq!(register_battle_script_bicword(&present).unwrap(), 0x38);
        let missing = register_battle_script_bicword(&[]).unwrap_err();
        assert_eq!(
            missing.to_string(),
            "committed Battle Script program does not emit B_SCR_OP_BICWORD"
        );
    }

    #[test]
    fn pointer_universe_has_exactly_24_entries() {
        assert_eq!(BATTLE_SCRIPT_SETBYTE_POINTER_EXPRESSIONS.len(), 24);
        assert!(BATTLE_SCRIPT_SETBYTE_POINTER_EXPRESSIONS.contains(&"gMoveResultFlags"));
    }
}
