//! Pure `B_SCR_OP_JUMPIFARRAYEQUAL` (0x2C, `Cmd_jumpifarrayequal`) /
//! `B_SCR_OP_JUMPIFARRAYNOTEQUAL` (0x2D, `Cmd_jumpifarraynotequal`) /
//! `B_SCR_OP_COPYARRAYWITHINDEX` (0x32, `Cmd_copyarraywithindex`) trio -- the
//! native twin of `createJumpifarraynotequalHandler` and
//! `createCopyarraywithindexHandler`
//! (`src/engine/battleScriptDamagingWeatherOpcode.ts`) and the module-local
//! `jumpIfArrayEqualHandler` (`src/engine/battleScriptRankedBatch1Opcode.ts`).
//!
//! The interest of grouping these three into one module (byte-algebra-trio
//! precedent, `battle_script_byte_algebra.rs`) is THREE DIFFERENT
//! registration conventions over a shared small array-of-bytes primitive
//! family:
//! - **jumpifarraynotequal**: find-FIRST REQUIRED only
//!   (`findInstructionOpcodeId`), no shape validation at registration --
//!   every guard lives at runtime as a first-class `Halt` mirroring
//!   canonical `unsupportedBranch` verbatim (jumpif/addbyte precedent).
//! - **jumpifarrayequal**: the ranked-batch1 `install` convention -- exactly
//!   1 concrete start, dispatcher must be `"Cmd_jumpifarrayequal"`, operand
//!   count 4, checked eagerly at registration.
//! - **copyarraywithindex**: `registerSingleInstruction` -- exactly 1
//!   concrete start, operand count 4, but NO dispatcher check.
//!
//! A second axis this module pins is the throw-vs-Halt ASYMMETRY between the
//! two jump opcodes over the identical `gBattlerAttacker`/`gBattlerTarget`
//! operand pair: `jumpifarraynotequal`'s operand resolver treats a missing
//! selector role as an ordinary unmodeled read (`None`), so the committed
//! Ghost Curse site (`gBattlerAttacker, gBattlerTarget`) with either role
//! absent HALTS; `jumpifarrayequal`'s handler instead calls
//! `requireBattlerRole`, so the identical missing-role condition THROWS
//! (`Battle Script hit-chain command requires a <role> role`,
//! `battleScriptHitChainOpcode.ts:787-794`, verbatim including the
//! ungrammatical "a attacker").
//!
//! Operand resolution for `jumpifarraynotequal`/`jumpifarrayequal` is a
//! closed, hand-ported table (not a catalog projection, unlike the wider
//! SETBYTE-universe leaves): `"gBattlersCount"` reads
//! `battleTopology.battlersCount`; `"gBattlerAttacker"`/`"gBattlerTarget"`
//! read the selector-role bindings (`None` on a missing role, total);
//! `"sBATTLER"` reads `scriptingBattler`; `"gBattleCommunication"` /
//! `"gBattleCommunication + 1"` read the two communication scratch bytes;
//! every other expression (including the committed link-battle barrier site's
//! `"gBattlerFainted"`) is unmodeled and resolves `None`.
//!
//! Source authority: `reference/pokeemerald/src/battle_script_commands.c`
//! `Cmd_jumpifarrayequal` :3771-3791, `Cmd_jumpifarraynotequal` :3793-3814,
//! `Cmd_copyarraywithindex` :3850-3861; dispatch rows :375 (`//0x2C`), :376
//! (`//0x2D`), :381 (`//0x32`); forward decls :123/:124/:129.
//! `include/constants/battle_script_commands.h:50/:51/:56`. Macros
//! `asm/macros/battle_script.inc:241` (`jumpifarrayequal`), `:249`
//! (`jumpifarraynotequal`), `:282` (`copyarraywithindex`); byte sugar
//! `jumpifbytenotequal` `:1406-1408`, `jumpifbyteequal` `:1410-1412`.
//!
//! Committed census (`reference/pokeemerald/data/battle_scripts_1.s`):
//! NOTEQUAL 7 sites -- `gBattlerAttacker, gBattlerTarget` :1512 (Ghost
//! Curse), `sBATTLER, gBattlersCount` :1581/:4004, `gBattlerTarget,
//! gBattlersCount` :2595, `gBattlerFainted, gBattlersCount` :2916 (the
//! committed link-battle BARRIER site -- `gBattlerFainted` resolves `None`),
//! `gBattleCommunication, gBattlersCount` :3221, `gBattleCommunication + 1,
//! gBattlersCount` :4443. EQUAL exactly 1 site:
//! `gBattlerAttacker, gBattlerTarget` :2579 (Teeter Dance). WITHINDEX exactly
//! 1 site: `gBattlerAttacker, gBattlerByTurnOrder, gBattleCommunication, 1`
//! :3206.
//!
//! This leaf owns neither a generic machine, scheduler/event transport, RNG,
//! presentation, nor the WASM ABI. No branch ever consumes RNG.

use core::fmt;

pub const BATTLE_SCRIPT_JUMPIFARRAYEQUAL_OPCODE: u8 = 0x2c;
pub const BATTLE_SCRIPT_JUMPIFARRAYEQUAL_OPCODE_NAME: &str = "B_SCR_OP_JUMPIFARRAYEQUAL";
pub const BATTLE_SCRIPT_JUMPIFARRAYEQUAL_DISPATCHER: &str = "Cmd_jumpifarrayequal";
pub const BATTLE_SCRIPT_JUMPIFARRAYEQUAL_CONCRETE_START_COUNT: usize = 1;

pub const BATTLE_SCRIPT_JUMPIFARRAYNOTEQUAL_OPCODE: u8 = 0x2d;
pub const BATTLE_SCRIPT_JUMPIFARRAYNOTEQUAL_OPCODE_NAME: &str = "B_SCR_OP_JUMPIFARRAYNOTEQUAL";
pub const BATTLE_SCRIPT_JUMPIFARRAYNOTEQUAL_DISPATCHER: &str = "Cmd_jumpifarraynotequal";
pub const BATTLE_SCRIPT_JUMPIFARRAYNOTEQUAL_CONCRETE_START_COUNT: usize = 7;

pub const BATTLE_SCRIPT_COPYARRAYWITHINDEX_OPCODE: u8 = 0x32;
pub const BATTLE_SCRIPT_COPYARRAYWITHINDEX_OPCODE_NAME: &str = "B_SCR_OP_COPYARRAYWITHINDEX";
pub const BATTLE_SCRIPT_COPYARRAYWITHINDEX_DISPATCHER: &str = "Cmd_copyarraywithindex";
pub const BATTLE_SCRIPT_COPYARRAYWITHINDEX_CONCRETE_START_COUNT: usize = 1;

pub const BATTLE_SCRIPT_ARRAY_FAMILY_SOURCE_FILE: &str = "battle_script_commands.c";
pub const BATTLE_SCRIPT_JUMPIFARRAYEQUAL_HANDLER_LINE: u32 = 3771;
pub const BATTLE_SCRIPT_JUMPIFARRAYNOTEQUAL_HANDLER_LINE: u32 = 3793;
pub const BATTLE_SCRIPT_COPYARRAYWITHINDEX_HANDLER_LINE: u32 = 3850;

/// The narrow rules slice the trio touches
/// (`selectorRoles.{attacker,target}`, `battleTopology.battlersCount`,
/// `scriptingBattler`, `battleCommunication0/1`, `battlerByTurnOrder`).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptArrayFamilyRules {
    pub selector_attacker: Option<u8>,
    pub selector_target: Option<u8>,
    pub battlers_count: u8,
    pub scripting_battler: u8,
    pub battle_communication0: u8,
    pub battle_communication1: u8,
    pub battler_by_turn_order: [u8; 4],
}

/// Native twin of `readJumpifarraynotequalOperand`
/// (`battleScriptDamagingWeatherOpcode.ts:365-372`). A closed, hand-ported
/// table (module doc comment) -- any expression outside this list, including
/// the committed link-battle barrier's `"gBattlerFainted"`, is unmodeled.
#[must_use]
pub fn read_array_family_operand(
    rules: &BattleScriptArrayFamilyRules,
    expression: &str,
) -> Option<u8> {
    match expression {
        "gBattlersCount" => Some(rules.battlers_count),
        "gBattlerAttacker" => rules.selector_attacker,
        "gBattlerTarget" => rules.selector_target,
        "sBATTLER" => Some(rules.scripting_battler),
        "gBattleCommunication" => Some(rules.battle_communication0),
        "gBattleCommunication + 1" => Some(rules.battle_communication1),
        _ => None,
    }
}

/// One source macro operand -- used only by `jumpifarrayequal`'s
/// per-execution tuple-shape validation (module doc comment).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptArrayFamilyOperand<'a> {
    pub width_bytes: u8,
    pub expression: &'a str,
}

/// A resolved source jump target, resolved LAZILY by the caller only on the
/// taken branch (jumpif family precedent, `battle_script_jumpif.rs`).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptArrayFamilyResolvedTarget<'a> {
    pub expression: &'a str,
    pub program_counter: u32,
}

/// Mirrors canonical `unsupportedBranch`'s reason object verbatim -- a valid
/// outcome, never an error (jumpifarraynotequal only; jumpifarrayequal never
/// halts -- module doc comment's throw-vs-Halt asymmetry).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BattleScriptArrayFamilyHalt {
    pub program_counter: u32,
    pub opcode_id: u8,
    pub opcode_name: &'static str,
    pub source_construct: String,
    pub source_file: &'static str,
    pub source_line: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifArrayNotEqualInstruction<'a> {
    pub program_counter: u32,
    pub opcode_id: u8,
    pub mem1_expression: &'a str,
    pub mem2_expression: &'a str,
    pub size_expression: &'a str,
    pub ptr_expression: &'a str,
    pub resolved_target: Option<BattleScriptArrayFamilyResolvedTarget<'a>>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BattleScriptJumpifArrayNotEqualOutcome {
    Advance,
    Jump {
        program_counter: u32,
    },
    /// Mirrors canonical `unsupportedBranch` verbatim -- never an error.
    Halt(BattleScriptArrayFamilyHalt),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifArrayEqualInstruction<'a> {
    pub program_counter: u32,
    /// `[left, right, size, pointer]` when well formed; shape is
    /// re-validated on every execution (canonical registration also
    /// validates it eagerly -- ported independently below since the TS
    /// handler re-checks it too).
    pub operands: &'a [BattleScriptArrayFamilyOperand<'a>],
    pub resolved_target: Option<BattleScriptArrayFamilyResolvedTarget<'a>>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptJumpifArrayEqualOutcome {
    Advance,
    Jump { program_counter: u32 },
}

/// Exact observable runtime errors across the trio, in canonical evaluation
/// order per opcode.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptArrayFamilyError<'a> {
    /// `Cmd_jumpifarraynotequal: unresolved jump target <expr>`.
    NotEqualUnresolvedJumpTarget { expression: &'a str },
    /// `invalid supported B_SCR_OP_JUMPIFARRAYEQUAL tuple at <pc>`.
    EqualInvalidTuple { program_counter: u32 },
    /// `Battle Script hit-chain command requires a <role> role`
    /// (`battleScriptHitChainOpcode.ts:787-794`, verbatim).
    EqualMissingRole { role: &'static str },
    /// `unresolved jumpifarrayequal target <expr>`.
    EqualUnresolvedJumpTarget { expression: &'a str },
    /// `Cmd_copyarraywithindex: gBattleCommunication index <index> is out of
    /// gBattlerByTurnOrder's range`.
    CopyArrayWithIndexOutOfRange { index: u8 },
}

impl fmt::Display for BattleScriptArrayFamilyError<'_> {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::NotEqualUnresolvedJumpTarget { expression } => write!(
                formatter,
                "Cmd_jumpifarraynotequal: unresolved jump target {expression}"
            ),
            Self::EqualInvalidTuple { program_counter } => write!(
                formatter,
                "invalid supported B_SCR_OP_JUMPIFARRAYEQUAL tuple at {program_counter}"
            ),
            Self::EqualMissingRole { role } => {
                write!(formatter, "Battle Script hit-chain command requires a {role} role")
            }
            Self::EqualUnresolvedJumpTarget { expression } => {
                write!(formatter, "unresolved jumpifarrayequal target {expression}")
            }
            Self::CopyArrayWithIndexOutOfRange { index } => write!(
                formatter,
                "Cmd_copyarraywithindex: gBattleCommunication index {index} is out of gBattlerByTurnOrder's range"
            ),
        }
    }
}

impl std::error::Error for BattleScriptArrayFamilyError<'_> {}

/// Native twin of canonical `createJumpifarraynotequalHandler`
/// (`battleScriptDamagingWeatherOpcode.ts:374-398`).
pub fn apply_battle_script_jumpifarraynotequal<'a>(
    instruction: &BattleScriptJumpifArrayNotEqualInstruction<'a>,
    rules: &BattleScriptArrayFamilyRules,
) -> Result<BattleScriptJumpifArrayNotEqualOutcome, BattleScriptArrayFamilyError<'a>> {
    let mem1 = read_array_family_operand(rules, instruction.mem1_expression);
    let mem2 = read_array_family_operand(rules, instruction.mem2_expression);
    if mem1.is_none() || mem2.is_none() || instruction.size_expression != "0x1" {
        return Ok(BattleScriptJumpifArrayNotEqualOutcome::Halt(
            BattleScriptArrayFamilyHalt {
                program_counter: instruction.program_counter,
                opcode_id: instruction.opcode_id,
                opcode_name: BATTLE_SCRIPT_JUMPIFARRAYNOTEQUAL_OPCODE_NAME,
                source_construct: format!(
                    "Cmd_jumpifarraynotequal's operand ({}, {}, size {}) is not modeled",
                    instruction.mem1_expression,
                    instruction.mem2_expression,
                    instruction.size_expression
                ),
                source_file: BATTLE_SCRIPT_ARRAY_FAMILY_SOURCE_FILE,
                source_line: BATTLE_SCRIPT_JUMPIFARRAYNOTEQUAL_HANDLER_LINE,
            },
        ));
    }
    if mem1 == mem2 {
        return Ok(BattleScriptJumpifArrayNotEqualOutcome::Advance);
    }
    let target = instruction.resolved_target.ok_or(
        BattleScriptArrayFamilyError::NotEqualUnresolvedJumpTarget {
            expression: instruction.ptr_expression,
        },
    )?;
    Ok(BattleScriptJumpifArrayNotEqualOutcome::Jump { program_counter: target.program_counter })
}

/// Native twin of canonical `jumpIfArrayEqualHandler`
/// (`battleScriptRankedBatch1Opcode.ts:77-102`).
pub fn apply_battle_script_jumpifarrayequal<'a>(
    instruction: &BattleScriptJumpifArrayEqualInstruction<'a>,
    rules: &BattleScriptArrayFamilyRules,
) -> Result<BattleScriptJumpifArrayEqualOutcome, BattleScriptArrayFamilyError<'a>> {
    let operands = instruction.operands;
    let shape_ok = operands.len() == 4
        && operands[0].expression == "gBattlerAttacker"
        && operands[1].expression == "gBattlerTarget"
        && operands[2].expression == "0x1"
        && operands[3].width_bytes == 4;
    if !shape_ok {
        return Err(BattleScriptArrayFamilyError::EqualInvalidTuple {
            program_counter: instruction.program_counter,
        });
    }
    let attacker = rules
        .selector_attacker
        .ok_or(BattleScriptArrayFamilyError::EqualMissingRole { role: "attacker" })?;
    let target = rules
        .selector_target
        .ok_or(BattleScriptArrayFamilyError::EqualMissingRole { role: "target" })?;
    if attacker != target {
        return Ok(BattleScriptJumpifArrayEqualOutcome::Advance);
    }
    let resolved = instruction.resolved_target.ok_or(
        BattleScriptArrayFamilyError::EqualUnresolvedJumpTarget {
            expression: operands[3].expression,
        },
    )?;
    Ok(BattleScriptJumpifArrayEqualOutcome::Jump { program_counter: resolved.program_counter })
}

/// Native twin of canonical `createCopyarraywithindexHandler`
/// (`battleScriptDamagingWeatherOpcode.ts:149-163`). The handler ignores
/// operand expressions at runtime -- registration already pinned the shape
/// to the single committed site (module doc comment) -- so this takes only
/// rules, never an instruction.
pub fn apply_battle_script_copyarraywithindex(
    rules: &BattleScriptArrayFamilyRules,
) -> Result<BattleScriptArrayFamilyRules, BattleScriptArrayFamilyError<'static>> {
    let index = rules.battle_communication0;
    let battler = rules
        .battler_by_turn_order
        .get(index as usize)
        .copied()
        .ok_or(BattleScriptArrayFamilyError::CopyArrayWithIndexOutOfRange { index })?;
    let mut next = *rules;
    next.selector_attacker = Some(battler);
    Ok(next)
}

/// One committed-program instruction, as seen by registration: enough shape
/// to drive all three different registration conventions.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptArrayFamilyRegistrationInstruction<'a> {
    pub opcode_name: &'a str,
    pub opcode_id: u8,
    pub program_counter: u32,
    pub dispatcher: &'a str,
    pub operand_count: usize,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptArrayFamilyRegistrationError {
    /// `committed Battle Script program does not emit B_SCR_OP_JUMPIFARRAYNOTEQUAL`.
    NotEqualMissing,
    /// `B_SCR_OP_JUMPIFARRAYEQUAL requires exactly 1 concrete start, got <n>`.
    EqualWrongStartCount { got: usize },
    /// `invalid B_SCR_OP_JUMPIFARRAYEQUAL shape at program counter <pc>`.
    EqualInvalidShape { program_counter: u32 },
    /// `B_SCR_OP_COPYARRAYWITHINDEX requires exactly 1 concrete start, got <n>`.
    WithIndexWrongStartCount { got: usize },
    /// `invalid B_SCR_OP_COPYARRAYWITHINDEX shape at program counter <pc>`.
    WithIndexInvalidShape { program_counter: u32 },
}

impl fmt::Display for BattleScriptArrayFamilyRegistrationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::NotEqualMissing => write!(
                formatter,
                "committed Battle Script program does not emit {BATTLE_SCRIPT_JUMPIFARRAYNOTEQUAL_OPCODE_NAME}"
            ),
            Self::EqualWrongStartCount { got } => write!(
                formatter,
                "{BATTLE_SCRIPT_JUMPIFARRAYEQUAL_OPCODE_NAME} requires exactly 1 concrete start, got {got}"
            ),
            Self::EqualInvalidShape { program_counter } => write!(
                formatter,
                "invalid {BATTLE_SCRIPT_JUMPIFARRAYEQUAL_OPCODE_NAME} shape at program counter {program_counter}"
            ),
            Self::WithIndexWrongStartCount { got } => write!(
                formatter,
                "{BATTLE_SCRIPT_COPYARRAYWITHINDEX_OPCODE_NAME} requires exactly 1 concrete start, got {got}"
            ),
            Self::WithIndexInvalidShape { program_counter } => write!(
                formatter,
                "invalid {BATTLE_SCRIPT_COPYARRAYWITHINDEX_OPCODE_NAME} shape at program counter {program_counter}"
            ),
        }
    }
}

impl std::error::Error for BattleScriptArrayFamilyRegistrationError {}

/// Find-FIRST REQUIRED, no shape validation -- `findInstructionOpcodeId`
/// convention (jumpif/addbyte precedent).
pub fn register_battle_script_jumpifarraynotequal(
    instructions: &[BattleScriptArrayFamilyRegistrationInstruction<'_>],
) -> Result<u8, BattleScriptArrayFamilyRegistrationError> {
    instructions
        .iter()
        .find(|instruction| {
            instruction.opcode_name == BATTLE_SCRIPT_JUMPIFARRAYNOTEQUAL_OPCODE_NAME
        })
        .map(|instruction| instruction.opcode_id)
        .ok_or(BattleScriptArrayFamilyRegistrationError::NotEqualMissing)
}

/// The ranked-batch1 `install` convention: exactly 1 concrete start,
/// dispatcher must match, operand count 4 -- checked eagerly.
pub fn register_battle_script_jumpifarrayequal(
    instructions: &[BattleScriptArrayFamilyRegistrationInstruction<'_>],
) -> Result<u8, BattleScriptArrayFamilyRegistrationError> {
    let starts: Vec<_> = instructions
        .iter()
        .filter(|instruction| instruction.opcode_name == BATTLE_SCRIPT_JUMPIFARRAYEQUAL_OPCODE_NAME)
        .collect();
    if starts.len() != 1 {
        return Err(
            BattleScriptArrayFamilyRegistrationError::EqualWrongStartCount { got: starts.len() },
        );
    }
    let instruction = starts[0];
    if instruction.dispatcher != BATTLE_SCRIPT_JUMPIFARRAYEQUAL_DISPATCHER
        || instruction.operand_count != 4
    {
        return Err(
            BattleScriptArrayFamilyRegistrationError::EqualInvalidShape {
                program_counter: instruction.program_counter,
            },
        );
    }
    Ok(instruction.opcode_id)
}

/// `registerSingleInstruction`: exactly 1 concrete start, operand count 4,
/// NO dispatcher check.
pub fn register_battle_script_copyarraywithindex(
    instructions: &[BattleScriptArrayFamilyRegistrationInstruction<'_>],
) -> Result<u8, BattleScriptArrayFamilyRegistrationError> {
    let starts: Vec<_> = instructions
        .iter()
        .filter(|instruction| {
            instruction.opcode_name == BATTLE_SCRIPT_COPYARRAYWITHINDEX_OPCODE_NAME
        })
        .collect();
    if starts.len() != 1 {
        return Err(
            BattleScriptArrayFamilyRegistrationError::WithIndexWrongStartCount {
                got: starts.len(),
            },
        );
    }
    let instruction = starts[0];
    if instruction.operand_count != 4 {
        return Err(
            BattleScriptArrayFamilyRegistrationError::WithIndexInvalidShape {
                program_counter: instruction.program_counter,
            },
        );
    }
    Ok(instruction.opcode_id)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rules() -> BattleScriptArrayFamilyRules {
        BattleScriptArrayFamilyRules {
            selector_attacker: Some(0),
            selector_target: Some(1),
            battlers_count: 2,
            scripting_battler: 0,
            battle_communication0: 0,
            battle_communication1: 0,
            battler_by_turn_order: [0, 1, 2, 3],
        }
    }

    #[test]
    fn operand_resolver_both_directions() {
        let r = rules();
        assert_eq!(read_array_family_operand(&r, "gBattlersCount"), Some(2));
        assert_eq!(read_array_family_operand(&r, "gBattlerAttacker"), Some(0));
        assert_eq!(read_array_family_operand(&r, "gBattlerTarget"), Some(1));
        assert_eq!(read_array_family_operand(&r, "sBATTLER"), Some(0));
        assert_eq!(
            read_array_family_operand(&r, "gBattleCommunication"),
            Some(0)
        );
        assert_eq!(
            read_array_family_operand(&r, "gBattleCommunication + 1"),
            Some(0)
        );
        assert_eq!(read_array_family_operand(&r, "gBattlerFainted"), None);
        assert_eq!(read_array_family_operand(&r, "gBogusPointer"), None);

        let mut missing = r;
        missing.selector_attacker = None;
        assert_eq!(
            read_array_family_operand(&missing, "gBattlerAttacker"),
            None
        );
    }

    fn notequal_instr<'a>(
        mem1: &'a str,
        mem2: &'a str,
        size: &'a str,
        target_pc: Option<u32>,
    ) -> BattleScriptJumpifArrayNotEqualInstruction<'a> {
        BattleScriptJumpifArrayNotEqualInstruction {
            program_counter: 100,
            opcode_id: BATTLE_SCRIPT_JUMPIFARRAYNOTEQUAL_OPCODE,
            mem1_expression: mem1,
            mem2_expression: mem2,
            size_expression: size,
            ptr_expression: "SomeLabel",
            resolved_target: target_pc.map(|program_counter| {
                BattleScriptArrayFamilyResolvedTarget { expression: "SomeLabel", program_counter }
            }),
        }
    }

    #[test]
    fn notequal_halts_on_unmodeled_pointer_never_throws() {
        let mut r = rules();
        r.selector_attacker = None;
        let outcome = apply_battle_script_jumpifarraynotequal(
            &notequal_instr("gBattlerAttacker", "gBattlerTarget", "0x1", Some(200)),
            &r,
        )
        .unwrap();
        match outcome {
            BattleScriptJumpifArrayNotEqualOutcome::Halt(halt) => {
                assert_eq!(
                    halt.source_construct,
                    "Cmd_jumpifarraynotequal's operand (gBattlerAttacker, gBattlerTarget, size 0x1) is not modeled"
                );
                assert_eq!(halt.source_line, 3793);
            }
            other => panic!("expected halt, got {other:?}"),
        }
    }

    #[test]
    fn notequal_wrong_size_halts() {
        let r = rules();
        let outcome = apply_battle_script_jumpifarraynotequal(
            &notequal_instr("sBATTLER", "gBattlersCount", "0x2", Some(200)),
            &r,
        )
        .unwrap();
        assert!(matches!(
            outcome,
            BattleScriptJumpifArrayNotEqualOutcome::Halt(_)
        ));
    }

    #[test]
    fn notequal_equal_advances_unequal_jumps() {
        let mut r = rules();
        r.scripting_battler = 2;
        r.battlers_count = 2;
        let outcome = apply_battle_script_jumpifarraynotequal(
            &notequal_instr("sBATTLER", "gBattlersCount", "0x1", Some(200)),
            &r,
        )
        .unwrap();
        assert!(matches!(
            outcome,
            BattleScriptJumpifArrayNotEqualOutcome::Advance
        ));

        r.scripting_battler = 0;
        let outcome = apply_battle_script_jumpifarraynotequal(
            &notequal_instr("sBATTLER", "gBattlersCount", "0x1", Some(200)),
            &r,
        )
        .unwrap();
        assert_eq!(
            outcome,
            BattleScriptJumpifArrayNotEqualOutcome::Jump { program_counter: 200 }
        );
    }

    #[test]
    fn notequal_unresolved_jump_target_is_a_throw() {
        let r = rules();
        let error = apply_battle_script_jumpifarraynotequal(
            &notequal_instr("sBATTLER", "gBattlersCount", "0x1", None),
            &r,
        )
        .unwrap_err();
        assert_eq!(
            error.to_string(),
            "Cmd_jumpifarraynotequal: unresolved jump target SomeLabel"
        );
    }

    fn equal_operands<'a>() -> [BattleScriptArrayFamilyOperand<'a>; 4] {
        [
            BattleScriptArrayFamilyOperand { width_bytes: 4, expression: "gBattlerAttacker" },
            BattleScriptArrayFamilyOperand { width_bytes: 4, expression: "gBattlerTarget" },
            BattleScriptArrayFamilyOperand { width_bytes: 1, expression: "0x1" },
            BattleScriptArrayFamilyOperand { width_bytes: 4, expression: "SomeLabel" },
        ]
    }

    #[test]
    fn equal_missing_role_throws_asymmetric_with_notequal_halt() {
        let ops = equal_operands();
        let instr = BattleScriptJumpifArrayEqualInstruction {
            program_counter: 10,
            operands: &ops,
            resolved_target: Some(BattleScriptArrayFamilyResolvedTarget {
                expression: "SomeLabel",
                program_counter: 300,
            }),
        };
        let mut r = rules();
        r.selector_attacker = None;
        let error = apply_battle_script_jumpifarrayequal(&instr, &r).unwrap_err();
        assert_eq!(
            error.to_string(),
            "Battle Script hit-chain command requires a attacker role"
        );

        let mut r2 = rules();
        r2.selector_target = None;
        let error2 = apply_battle_script_jumpifarrayequal(&instr, &r2).unwrap_err();
        assert_eq!(
            error2.to_string(),
            "Battle Script hit-chain command requires a target role"
        );
    }

    #[test]
    fn equal_attacker_equals_target_jumps_else_advances() {
        let ops = equal_operands();
        let instr = BattleScriptJumpifArrayEqualInstruction {
            program_counter: 10,
            operands: &ops,
            resolved_target: Some(BattleScriptArrayFamilyResolvedTarget {
                expression: "SomeLabel",
                program_counter: 300,
            }),
        };
        let mut r = rules();
        r.selector_attacker = Some(1);
        r.selector_target = Some(1);
        let outcome = apply_battle_script_jumpifarrayequal(&instr, &r).unwrap();
        assert_eq!(
            outcome,
            BattleScriptJumpifArrayEqualOutcome::Jump { program_counter: 300 }
        );

        r.selector_target = Some(2);
        let outcome = apply_battle_script_jumpifarrayequal(&instr, &r).unwrap();
        assert_eq!(outcome, BattleScriptJumpifArrayEqualOutcome::Advance);
    }

    #[test]
    fn equal_invalid_tuple_shape_is_a_throw() {
        let mut ops = equal_operands();
        ops[0] = BattleScriptArrayFamilyOperand { width_bytes: 4, expression: "gBattlerTarget" };
        let instr = BattleScriptJumpifArrayEqualInstruction {
            program_counter: 42,
            operands: &ops,
            resolved_target: None,
        };
        let error = apply_battle_script_jumpifarrayequal(&instr, &rules()).unwrap_err();
        assert_eq!(
            error.to_string(),
            "invalid supported B_SCR_OP_JUMPIFARRAYEQUAL tuple at 42"
        );
    }

    #[test]
    fn withindex_writes_attacker_role_from_turn_order_slot() {
        let mut r = rules();
        r.battler_by_turn_order = [3, 2, 1, 0];
        r.battle_communication0 = 2;
        let next = apply_battle_script_copyarraywithindex(&r).unwrap();
        assert_eq!(next.selector_attacker, Some(1));
    }

    #[test]
    fn withindex_out_of_range_is_a_throw() {
        let mut r = rules();
        r.battle_communication0 = 4;
        let error = apply_battle_script_copyarraywithindex(&r).unwrap_err();
        assert_eq!(
            error.to_string(),
            "Cmd_copyarraywithindex: gBattleCommunication index 4 is out of gBattlerByTurnOrder's range"
        );
    }

    #[test]
    fn registration_conventions_differ() {
        let notequal_present = [BattleScriptArrayFamilyRegistrationInstruction {
            opcode_name: BATTLE_SCRIPT_JUMPIFARRAYNOTEQUAL_OPCODE_NAME,
            opcode_id: 0x2d,
            program_counter: 1,
            dispatcher: "anything",
            operand_count: 0,
        }];
        assert_eq!(
            register_battle_script_jumpifarraynotequal(&notequal_present).unwrap(),
            0x2d
        );
        assert_eq!(
            register_battle_script_jumpifarraynotequal(&[])
                .unwrap_err()
                .to_string(),
            "committed Battle Script program does not emit B_SCR_OP_JUMPIFARRAYNOTEQUAL"
        );

        let equal_wrong_shape = [BattleScriptArrayFamilyRegistrationInstruction {
            opcode_name: BATTLE_SCRIPT_JUMPIFARRAYEQUAL_OPCODE_NAME,
            opcode_id: 0x2c,
            program_counter: 7,
            dispatcher: "Cmd_wrong",
            operand_count: 4,
        }];
        assert_eq!(
            register_battle_script_jumpifarrayequal(&equal_wrong_shape)
                .unwrap_err()
                .to_string(),
            "invalid B_SCR_OP_JUMPIFARRAYEQUAL shape at program counter 7"
        );
        let equal_duplicated = [equal_wrong_shape[0], equal_wrong_shape[0]];
        assert_eq!(
            register_battle_script_jumpifarrayequal(&equal_duplicated)
                .unwrap_err()
                .to_string(),
            "B_SCR_OP_JUMPIFARRAYEQUAL requires exactly 1 concrete start, got 2"
        );

        let withindex_present = [BattleScriptArrayFamilyRegistrationInstruction {
            opcode_name: BATTLE_SCRIPT_COPYARRAYWITHINDEX_OPCODE_NAME,
            opcode_id: 0x32,
            program_counter: 3,
            dispatcher: "irrelevant-for-this-convention",
            operand_count: 4,
        }];
        assert_eq!(
            register_battle_script_copyarraywithindex(&withindex_present).unwrap(),
            0x32
        );
        let withindex_bad_shape = [BattleScriptArrayFamilyRegistrationInstruction {
            operand_count: 3,
            ..withindex_present[0]
        }];
        assert_eq!(
            register_battle_script_copyarraywithindex(&withindex_bad_shape)
                .unwrap_err()
                .to_string(),
            "invalid B_SCR_OP_COPYARRAYWITHINDEX shape at program counter 3"
        );
    }
}
