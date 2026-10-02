//! Pure `B_SCR_OP_JUMPIFSTATUS` (0x1C, `Cmd_jumpifstatus`) /
//! `B_SCR_OP_JUMPIFSTATUS2` (0x1D, `Cmd_jumpifstatus2`) leaf -- the native
//! twin of `createJumpifstatusOpcodeHandler`
//! (`src/engine/battleScriptStatusPrimaryOpcode.ts:105-131`, doc line :104
//! citing `battle_script_commands.c:3081-3091`) and
//! `createJumpifstatus2OpcodeHandler`
//! (`src/engine/battleScriptStatbuffchangeOpcode.ts:419-462`, citing
//! `:3093-3103`).
//!
//! Both opcodes share one C shape (battler selector 1B + `u32` flags 4B +
//! jump ptr 4B, encoded width 10): `if (gBattleMons[battler].statusN & flags
//! && gBattleMons[battler].hp != 0) jump; else advance += 10`. They differ in
//! three ways this module keeps distinct:
//! - **which status word** they read (`status1` vs `status2`);
//! - **how the mask operand resolves**: `Cmd_jumpifstatus`'s status1 value
//!   accepts an ARBITRARY `|`-joined combination of the 6 named single-bit
//!   terms in `STATUS1_SINGLE_BITS` (`include/constants/battle.h:114-125`:
//!   SLEEP `0x7`, POISON `1<<3`, BURN `1<<4`, FREEZE `1<<5`, PARALYSIS
//!   `1<<6`, TOXIC_POISON `1<<7`) plus the literal `STATUS1_ANY` union
//!   (`0xff`); `Cmd_jumpifstatus2`'s status2 value is looked up in the FIXED
//!   6-entry `JUMPIFSTATUS2_VALUES` map (`battle.h:129,139,144,148,150,151`:
//!   CONFUSION `0x7`, MULTIPLETURNS `1<<12`, FOCUS_ENERGY `1<<20`,
//!   SUBSTITUTE `1<<24`, ESCAPE_PREVENTION `1<<26`, NIGHTMARE `1<<27`) with
//!   NO `|`-combination support -- an unresolvable expression on either
//!   opcode is a first-class `Halt` mirroring canonical `unsupportedBranch`
//!   verbatim (a valid outcome, never a thrown error), citing
//!   `battle_script_commands.c:3081` (status1) or `:3096` (status2, the
//!   canonical handler's own citation choice -- its `flags` declaration
//!   line, not its handler line; ported verbatim since TS is the spec even
//!   where its own citation is inconsistent with `Cmd_jumpifstatus`'s);
//! - **registration convention**: `B_SCR_OP_JUMPIFSTATUS` is find-FIRST
//!   REQUIRED (`createBattleScriptStatusPrimaryOpcodeHandlers`'s
//!   `findOpcodeId`, :262-265) -- absence throws `committed Battle Script
//!   program does not emit B_SCR_OP_JUMPIFSTATUS`, exactly like
//!   `battle_script_jumpif.rs`'s `register_first`. `B_SCR_OP_JUMPIFSTATUS2`
//!   is find-FIRST OPTIONAL (`createBattleScriptStatbuffchangeOpcodeHandlers`,
//!   :563-568) -- an absent opcode silently registers nothing, no error.
//!   (That same factory also hard-requires STATBUFFCHANGE/ORBYTE concrete
//!   counts; this module models ONLY the jumpifstatus2 registration slice,
//!   not those other opcodes.)
//!
//! Both handlers resolve the battler selector through an injected result
//! (mirroring `resolveRulesBattlerForBattleScript`); an unresolved selector
//! produces a first-class `Block` control matching the canonical handler's
//! `{ kind: "block", reason: { kind: "source-context-unavailable",
//! programCounter, opcodeId, opcodeName, port:
//! "resolve-battler-for-battle-script", operandExpression } }` transition.
//! Evaluation order is pinned: mask-unsupported (`Halt`) preempts
//! selector-unresolved (`Block`) preempts the `hp`/status read. A miss
//! advances without consulting the label; a hit resolves the (lazily
//! validated) pointer operand and jumps -- unresolved on a taken branch is
//! `"Cmd_jumpifstatus: unresolved jump target <expr>"` /
//! `"Cmd_jumpifstatus2: unresolved jump target <expr>"`.
//!
//! Source authority: `reference/pokeemerald/src/battle_script_commands.c:3081-3091`
//! (`Cmd_jumpifstatus`), `:3093-3103` (`Cmd_jumpifstatus2`); dispatch rows
//! `:359` (`//0x1C`), `:360` (`//0x1D`); forward decls `:107,:108`; enum
//! positions `include/constants/battle_script_commands.h:34,35`; macros
//! `asm/macros/battle_script.inc:136-140` (`jumpifstatus`), `:143-147`
//! (`jumpifstatus2`) -- both encoded width 10. Call sites in
//! `data/battle_scripts_1.s`: 21 `jumpifstatus ` / 37 `jumpifstatus2 `
//! (verified by grep in the metadata test), first at line 289
//! (`BS_TARGET, STATUS1_SLEEP, BattleScript_AlreadyAsleep`) and line 288
//! (`BS_TARGET, STATUS2_SUBSTITUTE, BattleScript_ButItFailed`) respectively.
//!
//! This leaf owns neither a generic machine, scheduler/event transport, RNG,
//! presentation, nor the WASM ABI. No branch ever mutates rules.

use core::fmt;

pub const BATTLE_SCRIPT_JUMPIFSTATUS_OPCODE: u8 = 0x1c;
pub const BATTLE_SCRIPT_JUMPIFSTATUS_OPCODE_NAME: &str = "B_SCR_OP_JUMPIFSTATUS";
pub const BATTLE_SCRIPT_JUMPIFSTATUS_DISPATCHER: &str = "Cmd_jumpifstatus";

pub const BATTLE_SCRIPT_JUMPIFSTATUS2_OPCODE: u8 = 0x1d;
pub const BATTLE_SCRIPT_JUMPIFSTATUS2_OPCODE_NAME: &str = "B_SCR_OP_JUMPIFSTATUS2";
pub const BATTLE_SCRIPT_JUMPIFSTATUS2_DISPATCHER: &str = "Cmd_jumpifstatus2";

pub const BATTLE_SCRIPT_JUMPIFSTATUS_BATTLER_WIDTH_BYTES: u8 = 1;
pub const BATTLE_SCRIPT_JUMPIFSTATUS_FLAGS_WIDTH_BYTES: u8 = 4;
pub const BATTLE_SCRIPT_JUMPIFSTATUS_POINTER_WIDTH_BYTES: u8 = 4;
pub const BATTLE_SCRIPT_JUMPIFSTATUS_ENCODED_WIDTH_BYTES: u8 = 10;
/// `unsupportedBranch`'s fixed `sourceFile` argument for this leaf.
pub const BATTLE_SCRIPT_JUMPIFSTATUS_SOURCE_FILE: &str = "battle_script_commands.c";

/// `include/constants/battle.h:114-125`.
const STATUS1_SLEEP: u32 = 0x7;
const STATUS1_POISON: u32 = 1 << 3;
const STATUS1_BURN: u32 = 1 << 4;
const STATUS1_FREEZE: u32 = 1 << 5;
const STATUS1_PARALYSIS: u32 = 1 << 6;
const STATUS1_TOXIC_POISON: u32 = 1 << 7;
const STATUS1_ANY: u32 = 0xff;

/// `include/constants/battle.h:129,139,144,148,150,151`.
const STATUS2_CONFUSION: u32 = 0x7;
const STATUS2_MULTIPLETURNS: u32 = 1 << 12;
const STATUS2_FOCUS_ENERGY: u32 = 1 << 20;
const STATUS2_SUBSTITUTE: u32 = 1 << 24;
const STATUS2_ESCAPE_PREVENTION: u32 = 1 << 26;
const STATUS2_NIGHTMARE: u32 = 1 << 27;

fn status1_single_bit(term: &str) -> Option<u32> {
    Some(match term {
        "STATUS1_SLEEP" => STATUS1_SLEEP,
        "STATUS1_POISON" => STATUS1_POISON,
        "STATUS1_BURN" => STATUS1_BURN,
        "STATUS1_FREEZE" => STATUS1_FREEZE,
        "STATUS1_PARALYSIS" => STATUS1_PARALYSIS,
        "STATUS1_TOXIC_POISON" => STATUS1_TOXIC_POISON,
        _ => return None,
    })
}

/// Native twin of `resolveStatus1Mask`
/// (`battleScriptStatusPrimaryOpcode.ts:61-75`): accepts an arbitrary
/// `|`-joined combination of the six single-bit terms plus the literal
/// `STATUS1_ANY` union; any unknown term makes the whole expression
/// unresolvable.
#[must_use]
pub fn resolve_battle_script_jumpifstatus_status1_mask(expression: &str) -> Option<u32> {
    let mut result = 0u32;
    for term in expression.split('|') {
        let trimmed = term.trim();
        if trimmed == "STATUS1_ANY" {
            result |= STATUS1_ANY;
            continue;
        }
        result |= status1_single_bit(trimmed)?;
    }
    Some(result)
}

/// Native twin of `JUMPIFSTATUS2_VALUES`
/// (`battleScriptStatbuffchangeOpcode.ts:410-417`): a fixed lookup, no
/// `|`-combination support.
#[must_use]
pub fn resolve_battle_script_jumpifstatus2_status2_mask(expression: &str) -> Option<u32> {
    Some(match expression {
        "STATUS2_SUBSTITUTE" => STATUS2_SUBSTITUTE,
        "STATUS2_CONFUSION" => STATUS2_CONFUSION,
        "STATUS2_MULTIPLETURNS" => STATUS2_MULTIPLETURNS,
        "STATUS2_FOCUS_ENERGY" => STATUS2_FOCUS_ENERGY,
        "STATUS2_ESCAPE_PREVENTION" => STATUS2_ESCAPE_PREVENTION,
        "STATUS2_NIGHTMARE" => STATUS2_NIGHTMARE,
        _ => return None,
    })
}

/// Deliberately narrow projection: only the four battlers' `status1`/
/// `status2`/`hp` fields, matching what `Cmd_jumpifstatus`/`Cmd_jumpifstatus2`
/// can possibly read. No branch ever writes any of these fields.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifstatusRules {
    pub battlers_status1: [u32; 4],
    pub battlers_status2: [u32; 4],
    pub battlers_hp: [u32; 4],
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifstatusExecution<'a> {
    pub program_counter: u32,
    pub status_expression: &'a str,
    pub battler_operand_expression: &'a str,
    /// Already-resolved result of `resolveBattlerForBattleScript` for the
    /// instruction's battler operand; `None` mirrors the canonical handler's
    /// `battler === null` branch.
    pub battler: Option<u8>,
    pub jump_target_expression: &'a str,
    pub resolved_jump_program_counter: Option<u32>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BattleScriptJumpifstatusControl<'a> {
    Advance,
    Jump {
        program_counter: u32,
    },
    /// `battleScriptMachine.ts`'s `{ kind: "block", reason: { kind:
    /// "source-context-unavailable", ... } }` transition -- a valid (non-
    /// error) outcome, unlike a decode failure.
    Block {
        operand_expression: &'a str,
    },
    /// Mirrors canonical `unsupportedBranch`'s `{ kind: "halt", reason: {
    /// kind: "unsupported-branch", ... } }` transition verbatim -- also a
    /// valid outcome, never an error.
    Halt {
        program_counter: u32,
        opcode_id: u8,
        opcode_name: &'a str,
        source_construct: String,
        source_file: &'static str,
        source_line: u32,
    },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptJumpifstatusError<'a> {
    UnresolvedJumpTarget {
        dispatcher: &'static str,
        expression: &'a str,
    },
}

impl fmt::Display for BattleScriptJumpifstatusError<'_> {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::UnresolvedJumpTarget { dispatcher, expression } => {
                write!(
                    formatter,
                    "{dispatcher}: unresolved jump target {expression}"
                )
            }
        }
    }
}

impl std::error::Error for BattleScriptJumpifstatusError<'_> {}

/// Shared post-mask evaluation core: selector `Block`, then the `hp`/status
/// conjunct, then lazy label resolution on the taken branch only.
fn apply_after_mask<'a>(
    execution: BattleScriptJumpifstatusExecution<'a>,
    mask: u32,
    status_word: impl FnOnce(u8) -> u32,
    hp: impl FnOnce(u8) -> u32,
    dispatcher: &'static str,
) -> Result<BattleScriptJumpifstatusControl<'a>, BattleScriptJumpifstatusError<'a>> {
    let Some(battler) = execution.battler else {
        return Ok(BattleScriptJumpifstatusControl::Block {
            operand_expression: execution.battler_operand_expression,
        });
    };
    let should_jump = (status_word(battler) & mask) != 0 && hp(battler) != 0;
    if !should_jump {
        return Ok(BattleScriptJumpifstatusControl::Advance);
    }
    let program_counter = execution.resolved_jump_program_counter.ok_or(
        BattleScriptJumpifstatusError::UnresolvedJumpTarget {
            dispatcher,
            expression: execution.jump_target_expression,
        },
    )?;
    Ok(BattleScriptJumpifstatusControl::Jump { program_counter })
}

/// Native twin of `Cmd_jumpifstatus` (`battle_script_commands.c:3081-3091`).
pub fn apply_battle_script_jumpifstatus<'a>(
    execution: BattleScriptJumpifstatusExecution<'a>,
    rules: &BattleScriptJumpifstatusRules,
) -> Result<BattleScriptJumpifstatusControl<'a>, BattleScriptJumpifstatusError<'a>> {
    let Some(mask) = resolve_battle_script_jumpifstatus_status1_mask(execution.status_expression)
    else {
        return Ok(BattleScriptJumpifstatusControl::Halt {
            program_counter: execution.program_counter,
            opcode_id: BATTLE_SCRIPT_JUMPIFSTATUS_OPCODE,
            opcode_name: BATTLE_SCRIPT_JUMPIFSTATUS_OPCODE_NAME,
            source_construct: format!(
                "Cmd_jumpifstatus's status1 value {} is outside the registered set",
                execution.status_expression
            ),
            source_file: BATTLE_SCRIPT_JUMPIFSTATUS_SOURCE_FILE,
            source_line: 3081,
        });
    };
    apply_after_mask(
        execution,
        mask,
        |battler| rules.battlers_status1[battler as usize],
        |battler| rules.battlers_hp[battler as usize],
        BATTLE_SCRIPT_JUMPIFSTATUS_DISPATCHER,
    )
}

/// Native twin of `Cmd_jumpifstatus2` (`battle_script_commands.c:3093-3103`).
pub fn apply_battle_script_jumpifstatus2<'a>(
    execution: BattleScriptJumpifstatusExecution<'a>,
    rules: &BattleScriptJumpifstatusRules,
) -> Result<BattleScriptJumpifstatusControl<'a>, BattleScriptJumpifstatusError<'a>> {
    let Some(mask) = resolve_battle_script_jumpifstatus2_status2_mask(execution.status_expression)
    else {
        return Ok(BattleScriptJumpifstatusControl::Halt {
            program_counter: execution.program_counter,
            opcode_id: BATTLE_SCRIPT_JUMPIFSTATUS2_OPCODE,
            opcode_name: BATTLE_SCRIPT_JUMPIFSTATUS2_OPCODE_NAME,
            source_construct: format!(
                "Cmd_jumpifstatus2's status2 value {} is outside the registered set",
                execution.status_expression
            ),
            source_file: BATTLE_SCRIPT_JUMPIFSTATUS_SOURCE_FILE,
            source_line: 3096,
        });
    };
    apply_after_mask(
        execution,
        mask,
        |battler| rules.battlers_status2[battler as usize],
        |battler| rules.battlers_hp[battler as usize],
        BATTLE_SCRIPT_JUMPIFSTATUS2_DISPATCHER,
    )
}

/// `committed Battle Script program does not emit {opcode_name}` -- only
/// `B_SCR_OP_JUMPIFSTATUS` uses this; `B_SCR_OP_JUMPIFSTATUS2` registration
/// is optional and never errors.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifstatusRegistrationError {
    pub opcode_name: &'static str,
}

impl fmt::Display for BattleScriptJumpifstatusRegistrationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            formatter,
            "committed Battle Script program does not emit {}",
            self.opcode_name
        )
    }
}

impl std::error::Error for BattleScriptJumpifstatusRegistrationError {}

/// Registration only needs the opcode name/id pair -- neither convention
/// validates operand shape (matching `battle_script_jumpif.rs`'s
/// `register_first`).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifstatusRegistrationInstruction<'a> {
    pub opcode_name: &'a str,
    pub opcode_id: u8,
}

/// Find-FIRST REQUIRED: `createBattleScriptStatusPrimaryOpcodeHandlers`'s
/// `findOpcodeId` (:262-265).
pub fn register_battle_script_jumpifstatus(
    instructions: &[BattleScriptJumpifstatusRegistrationInstruction<'_>],
) -> Result<u8, BattleScriptJumpifstatusRegistrationError> {
    instructions
        .iter()
        .find(|instruction| instruction.opcode_name == BATTLE_SCRIPT_JUMPIFSTATUS_OPCODE_NAME)
        .map(|instruction| instruction.opcode_id)
        .ok_or(BattleScriptJumpifstatusRegistrationError {
            opcode_name: BATTLE_SCRIPT_JUMPIFSTATUS_OPCODE_NAME,
        })
}

/// Find-FIRST OPTIONAL: `createBattleScriptStatbuffchangeOpcodeHandlers`'s
/// jumpifstatus2 slice (:563-568) -- an absent opcode registers nothing,
/// without error.
#[must_use]
pub fn register_battle_script_jumpifstatus2(
    instructions: &[BattleScriptJumpifstatusRegistrationInstruction<'_>],
) -> Option<u8> {
    instructions
        .iter()
        .find(|instruction| instruction.opcode_name == BATTLE_SCRIPT_JUMPIFSTATUS2_OPCODE_NAME)
        .map(|instruction| instruction.opcode_id)
}

/// Decomp/dispatch evidence for both opcodes, independently re-derived from
/// `reference/pokeemerald/src/battle_script_commands.c` in the metadata test.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifstatusDecompEvidence {
    pub jumpifstatus_dispatch_line: u32,
    pub jumpifstatus2_dispatch_line: u32,
    pub jumpifstatus_forward_decl_line: u32,
    pub jumpifstatus2_forward_decl_line: u32,
    pub jumpifstatus_handler_line: u32,
    pub jumpifstatus2_handler_line: u32,
    pub jumpifstatus_battler_line: u32,
    pub jumpifstatus_flags_line: u32,
    pub jumpifstatus_ptr_line: u32,
    pub jumpifstatus_if_line: u32,
    pub jumpifstatus_jump_line: u32,
    pub jumpifstatus_advance_line: u32,
    pub jumpifstatus2_battler_line: u32,
    pub jumpifstatus2_flags_line: u32,
    pub jumpifstatus2_ptr_line: u32,
    pub jumpifstatus2_if_line: u32,
    pub jumpifstatus2_jump_line: u32,
    pub jumpifstatus2_advance_line: u32,
    pub enum_jumpifstatus_line: u32,
    pub enum_jumpifstatus2_line: u32,
}

pub const BATTLE_SCRIPT_JUMPIFSTATUS_DECOMP_EVIDENCE: BattleScriptJumpifstatusDecompEvidence =
    BattleScriptJumpifstatusDecompEvidence {
        jumpifstatus_dispatch_line: 359,
        jumpifstatus2_dispatch_line: 360,
        jumpifstatus_forward_decl_line: 107,
        jumpifstatus2_forward_decl_line: 108,
        jumpifstatus_handler_line: 3081,
        jumpifstatus2_handler_line: 3093,
        jumpifstatus_battler_line: 3083,
        jumpifstatus_flags_line: 3084,
        jumpifstatus_ptr_line: 3085,
        jumpifstatus_if_line: 3087,
        jumpifstatus_jump_line: 3088,
        jumpifstatus_advance_line: 3090,
        jumpifstatus2_battler_line: 3095,
        jumpifstatus2_flags_line: 3096,
        jumpifstatus2_ptr_line: 3097,
        jumpifstatus2_if_line: 3099,
        jumpifstatus2_jump_line: 3100,
        jumpifstatus2_advance_line: 3102,
        enum_jumpifstatus_line: 34,
        enum_jumpifstatus2_line: 35,
    };

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifstatusMacroEvidence {
    pub jumpifstatus_declaration_line: u32,
    pub jumpifstatus_opcode_line: u32,
    pub jumpifstatus_battler_line: u32,
    pub jumpifstatus_status1_line: u32,
    pub jumpifstatus_pointer_line: u32,
    pub jumpifstatus2_declaration_line: u32,
    pub jumpifstatus2_opcode_line: u32,
    pub jumpifstatus2_battler_line: u32,
    pub jumpifstatus2_status2_line: u32,
    pub jumpifstatus2_pointer_line: u32,
    pub encoded_width_bytes: u8,
}

pub const BATTLE_SCRIPT_JUMPIFSTATUS_MACRO_EVIDENCE: BattleScriptJumpifstatusMacroEvidence =
    BattleScriptJumpifstatusMacroEvidence {
        jumpifstatus_declaration_line: 136,
        jumpifstatus_opcode_line: 137,
        jumpifstatus_battler_line: 138,
        jumpifstatus_status1_line: 139,
        jumpifstatus_pointer_line: 140,
        jumpifstatus2_declaration_line: 143,
        jumpifstatus2_opcode_line: 144,
        jumpifstatus2_battler_line: 145,
        jumpifstatus2_status2_line: 146,
        jumpifstatus2_pointer_line: 147,
        encoded_width_bytes: BATTLE_SCRIPT_JUMPIFSTATUS_ENCODED_WIDTH_BYTES,
    };

#[cfg(test)]
mod tests {
    use super::*;

    fn rules() -> BattleScriptJumpifstatusRules {
        BattleScriptJumpifstatusRules {
            battlers_status1: [0, 0, 0, 0],
            battlers_status2: [0, 0, 0, 0],
            battlers_hp: [100, 100, 100, 100],
        }
    }

    fn execution(status_expression: &str) -> BattleScriptJumpifstatusExecution<'_> {
        BattleScriptJumpifstatusExecution {
            program_counter: 42,
            status_expression,
            battler_operand_expression: "BS_ATTACKER",
            battler: Some(0),
            jump_target_expression: "SomeLabel",
            resolved_jump_program_counter: Some(4242),
        }
    }

    #[test]
    fn status1_single_bits_and_any_resolve() {
        assert_eq!(
            resolve_battle_script_jumpifstatus_status1_mask("STATUS1_SLEEP"),
            Some(0x7)
        );
        assert_eq!(
            resolve_battle_script_jumpifstatus_status1_mask("STATUS1_POISON"),
            Some(1 << 3)
        );
        assert_eq!(
            resolve_battle_script_jumpifstatus_status1_mask("STATUS1_ANY"),
            Some(0xff)
        );
        assert_eq!(
            resolve_battle_script_jumpifstatus_status1_mask("STATUS1_BOGUS"),
            None
        );
    }

    #[test]
    fn status1_four_way_combination_matches_each_constituent_bit() {
        let expression = "STATUS1_POISON | STATUS1_BURN | STATUS1_PARALYSIS | STATUS1_TOXIC_POISON";
        let mask = resolve_battle_script_jumpifstatus_status1_mask(expression).unwrap();
        assert_eq!(mask, (1 << 3) | (1 << 4) | (1 << 6) | (1 << 7));
        // one unknown term anywhere in the combination invalidates the whole expression.
        assert_eq!(
            resolve_battle_script_jumpifstatus_status1_mask(
                "STATUS1_POISON | STATUS1_BOGUS | STATUS1_BURN"
            ),
            None
        );
    }

    #[test]
    fn status2_fixed_map_has_no_combination_support() {
        assert_eq!(
            resolve_battle_script_jumpifstatus2_status2_mask("STATUS2_SUBSTITUTE"),
            Some(1 << 24)
        );
        assert_eq!(
            resolve_battle_script_jumpifstatus2_status2_mask("STATUS2_NIGHTMARE"),
            Some(1 << 27)
        );
        assert_eq!(
            resolve_battle_script_jumpifstatus2_status2_mask(
                "STATUS2_SUBSTITUTE | STATUS2_CONFUSION"
            ),
            None
        );
    }

    #[test]
    fn hp_conjunct_blocks_jump_even_with_matching_status_bit() {
        let mut r = rules();
        r.battlers_status1[0] = STATUS1_SLEEP;
        r.battlers_hp[0] = 0;
        let control = apply_battle_script_jumpifstatus(execution("STATUS1_SLEEP"), &r).unwrap();
        assert_eq!(control, BattleScriptJumpifstatusControl::Advance);
    }

    #[test]
    fn jump_hit_when_bit_set_and_hp_nonzero() {
        let mut r = rules();
        r.battlers_status1[0] = STATUS1_SLEEP;
        let control = apply_battle_script_jumpifstatus(execution("STATUS1_SLEEP"), &r).unwrap();
        assert_eq!(
            control,
            BattleScriptJumpifstatusControl::Jump { program_counter: 4242 }
        );
    }

    #[test]
    fn precedence_unsupported_mask_over_block_over_evaluation() {
        let mut exec = execution("STATUS1_BOGUS");
        exec.battler = None;
        let control = apply_battle_script_jumpifstatus(exec, &rules()).unwrap();
        match control {
            BattleScriptJumpifstatusControl::Halt { source_construct, source_line, .. } => {
                assert_eq!(
                    source_construct,
                    "Cmd_jumpifstatus's status1 value STATUS1_BOGUS is outside the registered set"
                );
                assert_eq!(source_line, 3081);
            }
            other => panic!("expected halt, got {other:?}"),
        }
    }

    #[test]
    fn selector_block_when_battler_unresolved() {
        let mut exec = execution("STATUS1_ANY");
        exec.battler = None;
        let control = apply_battle_script_jumpifstatus(exec, &rules()).unwrap();
        assert_eq!(
            control,
            BattleScriptJumpifstatusControl::Block { operand_expression: "BS_ATTACKER" }
        );
    }

    #[test]
    fn lazy_label_resolution_only_on_taken_branch() {
        let mut r = rules();
        r.battlers_status1[0] = STATUS1_SLEEP;
        let mut exec = execution("STATUS1_SLEEP");
        exec.resolved_jump_program_counter = None;
        // missed: unresolved target never surfaces.
        r.battlers_status1[0] = 0;
        assert_eq!(
            apply_battle_script_jumpifstatus(exec, &r).unwrap(),
            BattleScriptJumpifstatusControl::Advance
        );
        // hit: unresolved target now errors.
        r.battlers_status1[0] = STATUS1_SLEEP;
        let error = apply_battle_script_jumpifstatus(exec, &r).unwrap_err();
        assert_eq!(
            error.to_string(),
            "Cmd_jumpifstatus: unresolved jump target SomeLabel"
        );
    }

    #[test]
    fn jumpifstatus2_dispatcher_text_and_line() {
        let control =
            apply_battle_script_jumpifstatus2(execution("STATUS2_BOGUS"), &rules()).unwrap();
        match control {
            BattleScriptJumpifstatusControl::Halt {
                opcode_id,
                opcode_name,
                source_construct,
                source_line,
                ..
            } => {
                assert_eq!(opcode_id, BATTLE_SCRIPT_JUMPIFSTATUS2_OPCODE);
                assert_eq!(opcode_name, BATTLE_SCRIPT_JUMPIFSTATUS2_OPCODE_NAME);
                assert_eq!(
                    source_construct,
                    "Cmd_jumpifstatus2's status2 value STATUS2_BOGUS is outside the registered set"
                );
                assert_eq!(source_line, 3096);
            }
            other => panic!("expected halt, got {other:?}"),
        }
        let mut r = rules();
        r.battlers_status2[0] = STATUS2_SUBSTITUTE;
        let error = apply_battle_script_jumpifstatus2(
            BattleScriptJumpifstatusExecution {
                resolved_jump_program_counter: None,
                ..execution("STATUS2_SUBSTITUTE")
            },
            &r,
        )
        .unwrap_err();
        assert_eq!(
            error.to_string(),
            "Cmd_jumpifstatus2: unresolved jump target SomeLabel"
        );
    }

    #[test]
    fn registration_required_vs_optional_conventions() {
        let present = [BattleScriptJumpifstatusRegistrationInstruction {
            opcode_name: BATTLE_SCRIPT_JUMPIFSTATUS_OPCODE_NAME,
            opcode_id: 0x1c,
        }];
        assert_eq!(register_battle_script_jumpifstatus(&present).unwrap(), 0x1c);
        let missing = register_battle_script_jumpifstatus(&[]).unwrap_err();
        assert_eq!(
            missing.to_string(),
            "committed Battle Script program does not emit B_SCR_OP_JUMPIFSTATUS"
        );

        let present2 = [BattleScriptJumpifstatusRegistrationInstruction {
            opcode_name: BATTLE_SCRIPT_JUMPIFSTATUS2_OPCODE_NAME,
            opcode_id: 0x1d,
        }];
        assert_eq!(register_battle_script_jumpifstatus2(&present2), Some(0x1d));
        assert_eq!(register_battle_script_jumpifstatus2(&[]), None);
    }
}
