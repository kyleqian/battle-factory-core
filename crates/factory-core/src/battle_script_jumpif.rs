//! Pure `B_SCR_OP_JUMPIFBYTE` (0x29) / `B_SCR_OP_JUMPIFHALFWORD` (0x2A) /
//! `B_SCR_OP_JUMPIFWORD` (0x2B) compare-and-jump family -- the deliberately
//! narrow native twin of `src/engine/battleScriptJumpifbyteOpcode.ts`,
//! `battleScriptJumpifhalfwordOpcode.ts`, and `battleScriptJumpifwordOpcode.ts`.
//!
//! All three share one shape: decode `[ifflag:1, memPtr:4, value:W, target:4]`
//! (`W` is 1/2/4 for byte/halfword/word), resolve `ifflag`'s expression to one
//! of the 6 comparators (`include/constants/battle_script_commands.h:326-331`),
//! read the `memPtr` pointer, resolve the `value` operand, and either advance
//! (comparison false), jump (true, resolving the target label LAZILY -- only
//! on the taken branch), or -- when the pointer or value operand is outside
//! this leaf's modeled universe -- halt through a first-class
//! [`BattleScriptJumpifControl::Halt`] outcome (never an error), mirroring the
//! canonical `unsupportedBranch` reason object verbatim (R76 barrier-
//! projection decision, `RUST_PROGRESS.md`).
//!
//! The modeled pointer universes (hand-ported; small and enumerated directly
//! in the TS source):
//! - byte (`readJumpifbyteMemByte`): `cMULTISTRING_CHOOSER`,
//!   `gMoveResultFlags`, `gBattleCommunication`, `gBattleCommunication + 1`,
//!   `gBattleOutcome`, `cMISS_TYPE`, `gCritMultiplier`, `sB_ANIM_TURN`,
//!   `sMULTIHIT_STRING + 4`.
//! - halfword (`readJumpifhalfwordMemHword`): `gCurrentMove`, `gChosenMove`,
//!   `gBattleWeather`.
//! - word (`readJumpifwordMemWord`): `gBattleTypeFlags`, `gHitMarker`,
//!   `gBattleMoveDamage`.
//!
//! Value resolution is catalog-based (supervisor decision, `RUST_PROGRESS.md`
//! M74 brief): rather than hand-porting the ~130-entry `SETBYTE_VALUES` map
//! (`battleScriptSetByte.ts`) or the complete move-name catalog
//! (`src/data/gen/moves.json`), [`battle_script_jumpif_catalog_gen`] records,
//! per opcode, every DISTINCT value-operand expression the committed program
//! and this leaf's own test corpus actually use, resolved once through the
//! canonical TS resolvers by the generator. `resolve_jumpif_value` is a plain
//! catalog lookup; any expression absent from the catalog is unmodeled,
//! exactly like an absent pointer. This matches the TS resolvers exactly over
//! the committed program's operand universe and diverges only for
//! expressions no committed call site (or this leaf's tests) emit, where the
//! TS's wider literal map would still resolve but this port halts.
//!
//! Source authority:
//! - `Cmd_jumpifbyte` is `reference/pokeemerald/src/battle_script_commands.c:3657-3692`;
//!   `Cmd_jumpifhalfword` is `:3695-3731`; `Cmd_jumpifword` is `:3733-3762`.
//! - Dispatch rows `:372-374` (`//0x29`-`//0x2B`); forward decls `:120-122`.
//! - `asm/macros/battle_script.inc:217-240` (`jumpifbyte`/`jumpifhalfword`/
//!   `jumpifword` operand encodings) and the wrapper macros `:1406-1440`:
//!   `jumpifmove`/`jumpifnotmove` `:1414-1421` (jumpifhalfword),
//!   `jumpifmovehadnoeffect` `:1430-1432` (jumpifhalfword),
//!   `jumpifbattletype`/`jumpifnotbattletype` `:1434-1440` (jumpifword) --
//!   all expand to this family.
//! - Comparators `include/constants/battle_script_commands.h:326-331`;
//!   opcode enum `:47-49`.
//!
//! This leaf deliberately owns neither a generic machine, scheduler/event
//! transport, RNG advancement, presentation, nor the WASM ABI. No branch ever
//! mutates rules -- all three canonical handlers are pure reads.

use core::fmt;

/// `include/constants/battle_script_commands.h:326-331` -- shared by all
/// three opcodes.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptJumpifComparator {
    Equal,
    NotEqual,
    GreaterThan,
    LessThan,
    CommonBits,
    NoCommonBits,
}

impl BattleScriptJumpifComparator {
    #[must_use]
    pub fn from_expression(expression: &str) -> Option<Self> {
        match expression {
            "CMP_EQUAL" => Some(Self::Equal),
            "CMP_NOT_EQUAL" => Some(Self::NotEqual),
            "CMP_GREATER_THAN" => Some(Self::GreaterThan),
            "CMP_LESS_THAN" => Some(Self::LessThan),
            "CMP_COMMON_BITS" => Some(Self::CommonBits),
            "CMP_NO_COMMON_BITS" => Some(Self::NoCommonBits),
            _ => None,
        }
    }

    #[must_use]
    pub fn evaluate(self, mem: i64, value: i64) -> bool {
        match self {
            Self::Equal => mem == value,
            Self::NotEqual => mem != value,
            Self::GreaterThan => mem > value,
            Self::LessThan => mem < value,
            Self::CommonBits => (mem & value) != 0,
            Self::NoCommonBits => (mem & value) == 0,
        }
    }
}

pub const BATTLE_SCRIPT_JUMPIFBYTE_OPCODE: u8 = 0x29;
pub const BATTLE_SCRIPT_JUMPIFBYTE_OPCODE_NAME: &str = "B_SCR_OP_JUMPIFBYTE";
pub const BATTLE_SCRIPT_JUMPIFBYTE_DISPATCHER: &str = "Cmd_jumpifbyte";
pub const BATTLE_SCRIPT_JUMPIFBYTE_VALUE_WIDTH_BYTES: u8 = 1;

pub const BATTLE_SCRIPT_JUMPIFHALFWORD_OPCODE: u8 = 0x2a;
pub const BATTLE_SCRIPT_JUMPIFHALFWORD_OPCODE_NAME: &str = "B_SCR_OP_JUMPIFHALFWORD";
pub const BATTLE_SCRIPT_JUMPIFHALFWORD_DISPATCHER: &str = "Cmd_jumpifhalfword";
pub const BATTLE_SCRIPT_JUMPIFHALFWORD_VALUE_WIDTH_BYTES: u8 = 2;

pub const BATTLE_SCRIPT_JUMPIFWORD_OPCODE: u8 = 0x2b;
pub const BATTLE_SCRIPT_JUMPIFWORD_OPCODE_NAME: &str = "B_SCR_OP_JUMPIFWORD";
pub const BATTLE_SCRIPT_JUMPIFWORD_DISPATCHER: &str = "Cmd_jumpifword";
pub const BATTLE_SCRIPT_JUMPIFWORD_VALUE_WIDTH_BYTES: u8 = 4;

/// Shared across all three: the `ifflag` comparator operand.
pub const BATTLE_SCRIPT_JUMPIF_IFFLAG_WIDTH_BYTES: u8 = 1;
/// Shared across all three: the `memPtr` pointer operand.
pub const BATTLE_SCRIPT_JUMPIF_MEM_PTR_WIDTH_BYTES: u8 = 4;
/// Shared across all three: the jump-target pointer operand.
pub const BATTLE_SCRIPT_JUMPIF_TARGET_WIDTH_BYTES: u8 = 4;
/// `unsupportedBranch`'s fixed `sourceFile` argument for this family.
pub const BATTLE_SCRIPT_JUMPIF_SOURCE_FILE: &str = "data/battle_scripts_1.s";

/// The narrow rules slice the three pointer universes read. No branch ever
/// writes any of these fields.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifRules {
    pub multistring_chooser: u8,
    pub move_result_flags: u8,
    pub battle_communication0: u8,
    pub battle_communication1: u8,
    pub battle_outcome: u8,
    pub miss_type: u8,
    pub crit_multiplier: u8,
    pub anim_turn: u8,
    pub multi_hit_string_counter: u8,
    pub current_move: u16,
    pub chosen_move: u16,
    pub weather: u32,
    pub battle_type_flags: u32,
    pub hit_marker: u32,
    pub battle_move_damage: i32,
}

fn read_jumpifbyte_mem_byte(rules: &BattleScriptJumpifRules, expression: &str) -> Option<i64> {
    Some(match expression {
        "cMULTISTRING_CHOOSER" => i64::from(rules.multistring_chooser),
        "gMoveResultFlags" => i64::from(rules.move_result_flags),
        "gBattleCommunication" => i64::from(rules.battle_communication0),
        "gBattleCommunication + 1" => i64::from(rules.battle_communication1),
        "gBattleOutcome" => i64::from(rules.battle_outcome),
        "cMISS_TYPE" => i64::from(rules.miss_type),
        "gCritMultiplier" => i64::from(rules.crit_multiplier),
        "sB_ANIM_TURN" => i64::from(rules.anim_turn),
        "sMULTIHIT_STRING + 4" => i64::from(rules.multi_hit_string_counter),
        _ => return None,
    })
}

fn read_jumpifhalfword_mem_hword(rules: &BattleScriptJumpifRules, expression: &str) -> Option<i64> {
    Some(match expression {
        "gCurrentMove" => i64::from(rules.current_move),
        "gChosenMove" => i64::from(rules.chosen_move),
        "gBattleWeather" => i64::from(rules.weather),
        _ => return None,
    })
}

fn read_jumpifword_mem_word(rules: &BattleScriptJumpifRules, expression: &str) -> Option<i64> {
    Some(match expression {
        "gBattleTypeFlags" => i64::from(rules.battle_type_flags),
        "gHitMarker" => i64::from(rules.hit_marker),
        "gBattleMoveDamage" => i64::from(rules.battle_move_damage),
        _ => return None,
    })
}

/// Plain catalog lookup (supervisor decision, see module doc comment):
/// `catalog` entries are `(expression, Some(value))` for every resolvable
/// expression the committed program or this leaf's own tests use; an
/// expression missing from the catalog behaves exactly like one present with
/// `None` -- unmodeled.
fn resolve_jumpif_value(catalog: &[(&str, Option<i64>)], expression: &str) -> Option<i64> {
    catalog
        .iter()
        .find(|(candidate, _)| *candidate == expression)
        .and_then(|(_, value)| *value)
}

/// One source macro operand.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifOperand<'a> {
    pub width_bytes: u8,
    pub expression: &'a str,
}

/// A resolved source jump target.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifResolvedTarget<'a> {
    pub expression: &'a str,
    pub program_counter: u32,
}

/// Instruction projection used for both registration and execution.
/// `operands` is exactly `[ifflag, memPtr, value, target]` when well formed;
/// shape is re-validated on every execution (canonical registration performs
/// none). `resolved_target` is the surrounding program's LAZY late label
/// lookup for the target operand -- the caller resolves it only when this
/// leaf's handler actually needs it (comparison true).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifInstruction<'a> {
    pub opcode_name: &'a str,
    pub opcode_id: u8,
    pub program_counter: u32,
    /// `context.instruction.source.statementLine` -- the halt reason's
    /// `sourceLine`, independent of `program_counter`.
    pub source_statement_line: u32,
    pub operands: &'a [BattleScriptJumpifOperand<'a>],
    pub resolved_target: Option<BattleScriptJumpifResolvedTarget<'a>>,
}

/// Exact control directive emitted by any of the three narrow opcode leaves.
/// No branch ever changes rules -- every canonical handler is a pure read.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BattleScriptJumpifControl<'a> {
    Advance,
    Jump {
        program_counter: u32,
    },
    /// Mirrors the canonical `unsupportedBranch` reason object verbatim: a
    /// first-class outcome, never an error (R76 decision).
    Halt {
        program_counter: u32,
        opcode_id: u8,
        opcode_name: &'a str,
        source_construct: String,
        source_file: &'static str,
        source_line: u32,
    },
}

/// Exact observable execution errors in canonical evaluation order.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptJumpifError<'a> {
    /// `invalid B_SCR_OP_JUMPIFX shape at program counter <pc>`.
    InvalidShape {
        opcode_name: &'a str,
        program_counter: u32,
    },
    /// `Cmd_jumpifX: unknown comparator <expr>`.
    UnknownComparator {
        dispatcher: &'static str,
        expression: &'a str,
    },
    /// `Cmd_jumpifX: unresolved jump target <expr>`.
    UnresolvedJumpTarget {
        dispatcher: &'static str,
        expression: &'a str,
    },
}

impl fmt::Display for BattleScriptJumpifError<'_> {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidShape { opcode_name, program_counter } => write!(
                formatter,
                "invalid {opcode_name} shape at program counter {program_counter}"
            ),
            Self::UnknownComparator { dispatcher, expression } => {
                write!(formatter, "{dispatcher}: unknown comparator {expression}")
            }
            Self::UnresolvedJumpTarget { dispatcher, expression } => {
                write!(
                    formatter,
                    "{dispatcher}: unresolved jump target {expression}"
                )
            }
        }
    }
}

impl std::error::Error for BattleScriptJumpifError<'_> {}

/// `committed Battle Script program does not emit B_SCR_OP_JUMPIFX`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifRegistrationError {
    pub opcode_name: &'static str,
}

impl fmt::Display for BattleScriptJumpifRegistrationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            formatter,
            "committed Battle Script program does not emit {}",
            self.opcode_name
        )
    }
}

impl std::error::Error for BattleScriptJumpifRegistrationError {}

/// Native projection of `createBattleScriptJumpifXOpcodeHandlers`: find the
/// FIRST instruction with the given opcode name -- no shape or cardinality
/// validation at registration, unlike every other leaf in this lane.
fn register_first<'a>(
    instructions: &[BattleScriptJumpifInstruction<'a>],
    opcode_name: &'static str,
) -> Result<u8, BattleScriptJumpifRegistrationError> {
    instructions
        .iter()
        .find(|instruction| instruction.opcode_name == opcode_name)
        .map(|instruction| instruction.opcode_id)
        .ok_or(BattleScriptJumpifRegistrationError { opcode_name })
}

pub fn register_battle_script_jumpifbyte<'a>(
    instructions: &[BattleScriptJumpifInstruction<'a>],
) -> Result<u8, BattleScriptJumpifRegistrationError> {
    register_first(instructions, BATTLE_SCRIPT_JUMPIFBYTE_OPCODE_NAME)
}

pub fn register_battle_script_jumpifhalfword<'a>(
    instructions: &[BattleScriptJumpifInstruction<'a>],
) -> Result<u8, BattleScriptJumpifRegistrationError> {
    register_first(instructions, BATTLE_SCRIPT_JUMPIFHALFWORD_OPCODE_NAME)
}

pub fn register_battle_script_jumpifword<'a>(
    instructions: &[BattleScriptJumpifInstruction<'a>],
) -> Result<u8, BattleScriptJumpifRegistrationError> {
    register_first(instructions, BATTLE_SCRIPT_JUMPIFWORD_OPCODE_NAME)
}

/// Shared evaluation core for all three opcodes. `read_pointer` and
/// `resolve_value` close over the caller's rules/catalog; `dispatcher` is
/// only used for error/halt-message text.
#[allow(clippy::too_many_arguments)]
fn apply<'a>(
    instruction: &BattleScriptJumpifInstruction<'a>,
    opcode: u8,
    dispatcher: &'static str,
    value_width_bytes: u8,
    read_pointer: impl Fn(&str) -> Option<i64>,
    resolve_value: impl Fn(&str) -> Option<i64>,
) -> Result<BattleScriptJumpifControl<'a>, BattleScriptJumpifError<'a>> {
    let shape_ok = instruction.opcode_id == opcode
        && instruction.operands.len() == 4
        && instruction.operands[0].width_bytes == BATTLE_SCRIPT_JUMPIF_IFFLAG_WIDTH_BYTES
        && instruction.operands[1].width_bytes == BATTLE_SCRIPT_JUMPIF_MEM_PTR_WIDTH_BYTES
        && instruction.operands[2].width_bytes == value_width_bytes
        && instruction.operands[3].width_bytes == BATTLE_SCRIPT_JUMPIF_TARGET_WIDTH_BYTES;
    if !shape_ok {
        return Err(BattleScriptJumpifError::InvalidShape {
            opcode_name: instruction.opcode_name,
            program_counter: instruction.program_counter,
        });
    }

    let comparator = BattleScriptJumpifComparator::from_expression(
        instruction.operands[0].expression,
    )
    .ok_or(BattleScriptJumpifError::UnknownComparator {
        dispatcher,
        expression: instruction.operands[0].expression,
    })?;

    let mem_ptr_expression = instruction.operands[1].expression;
    let value_expression = instruction.operands[2].expression;
    let mem = read_pointer(mem_ptr_expression);
    let value = resolve_value(value_expression);
    let (mem, value) = match (mem, value) {
        (Some(mem), Some(value)) => (mem, value),
        _ => {
            let unresolved_expression = if mem.is_none() {
                mem_ptr_expression
            } else {
                value_expression
            };
            return Ok(BattleScriptJumpifControl::Halt {
                program_counter: instruction.program_counter,
                opcode_id: instruction.opcode_id,
                opcode_name: instruction.opcode_name,
                source_construct: format!(
                    "{dispatcher}'s operand ({unresolved_expression}) is not modeled"
                ),
                source_file: BATTLE_SCRIPT_JUMPIF_SOURCE_FILE,
                source_line: instruction.source_statement_line,
            });
        }
    };

    if !comparator.evaluate(mem, value) {
        return Ok(BattleScriptJumpifControl::Advance);
    }
    let target_expression = instruction.operands[3].expression;
    let resolved =
        instruction
            .resolved_target
            .ok_or(BattleScriptJumpifError::UnresolvedJumpTarget {
                dispatcher,
                expression: target_expression,
            })?;
    Ok(BattleScriptJumpifControl::Jump { program_counter: resolved.program_counter })
}

/// Native immutable-value twin of canonical `Cmd_jumpifbyte`.
pub fn apply_battle_script_jumpifbyte<'a>(
    instruction: &BattleScriptJumpifInstruction<'a>,
    rules: &BattleScriptJumpifRules,
    value_catalog: &[(&str, Option<i64>)],
) -> Result<BattleScriptJumpifControl<'a>, BattleScriptJumpifError<'a>> {
    apply(
        instruction,
        BATTLE_SCRIPT_JUMPIFBYTE_OPCODE,
        BATTLE_SCRIPT_JUMPIFBYTE_DISPATCHER,
        BATTLE_SCRIPT_JUMPIFBYTE_VALUE_WIDTH_BYTES,
        |expression| read_jumpifbyte_mem_byte(rules, expression),
        |expression| resolve_jumpif_value(value_catalog, expression),
    )
}

/// Native immutable-value twin of canonical `Cmd_jumpifhalfword`.
pub fn apply_battle_script_jumpifhalfword<'a>(
    instruction: &BattleScriptJumpifInstruction<'a>,
    rules: &BattleScriptJumpifRules,
    value_catalog: &[(&str, Option<i64>)],
) -> Result<BattleScriptJumpifControl<'a>, BattleScriptJumpifError<'a>> {
    apply(
        instruction,
        BATTLE_SCRIPT_JUMPIFHALFWORD_OPCODE,
        BATTLE_SCRIPT_JUMPIFHALFWORD_DISPATCHER,
        BATTLE_SCRIPT_JUMPIFHALFWORD_VALUE_WIDTH_BYTES,
        |expression| read_jumpifhalfword_mem_hword(rules, expression),
        |expression| resolve_jumpif_value(value_catalog, expression),
    )
}

/// Native immutable-value twin of canonical `Cmd_jumpifword`.
pub fn apply_battle_script_jumpifword<'a>(
    instruction: &BattleScriptJumpifInstruction<'a>,
    rules: &BattleScriptJumpifRules,
    value_catalog: &[(&str, Option<i64>)],
) -> Result<BattleScriptJumpifControl<'a>, BattleScriptJumpifError<'a>> {
    apply(
        instruction,
        BATTLE_SCRIPT_JUMPIFWORD_OPCODE,
        BATTLE_SCRIPT_JUMPIFWORD_DISPATCHER,
        BATTLE_SCRIPT_JUMPIFWORD_VALUE_WIDTH_BYTES,
        |expression| read_jumpifword_mem_word(rules, expression),
        |expression| resolve_jumpif_value(value_catalog, expression),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rules() -> BattleScriptJumpifRules {
        BattleScriptJumpifRules {
            multistring_chooser: 0,
            move_result_flags: 0,
            battle_communication0: 0,
            battle_communication1: 0,
            battle_outcome: 0,
            miss_type: 0,
            crit_multiplier: 1,
            anim_turn: 0,
            multi_hit_string_counter: 0,
            current_move: 33,
            chosen_move: 33,
            weather: 0,
            battle_type_flags: 0,
            hit_marker: 0,
            battle_move_damage: 0,
        }
    }

    fn operands<'a>(value_width: u8, value_expr: &'a str) -> [BattleScriptJumpifOperand<'a>; 4] {
        [
            BattleScriptJumpifOperand { width_bytes: 1, expression: "CMP_EQUAL" },
            BattleScriptJumpifOperand { width_bytes: 4, expression: "gCritMultiplier" },
            BattleScriptJumpifOperand { width_bytes: value_width, expression: value_expr },
            BattleScriptJumpifOperand { width_bytes: 4, expression: "SomeLabel" },
        ]
    }

    fn instruction<'a>(
        operands: &'a [BattleScriptJumpifOperand<'a>],
    ) -> BattleScriptJumpifInstruction<'a> {
        BattleScriptJumpifInstruction {
            opcode_name: BATTLE_SCRIPT_JUMPIFBYTE_OPCODE_NAME,
            opcode_id: BATTLE_SCRIPT_JUMPIFBYTE_OPCODE,
            program_counter: 10,
            source_statement_line: 999,
            operands,
            resolved_target: Some(BattleScriptJumpifResolvedTarget {
                expression: "SomeLabel",
                program_counter: 4242,
            }),
        }
    }

    #[test]
    fn all_six_comparators_boundary_values() {
        assert!(BattleScriptJumpifComparator::Equal.evaluate(3, 3));
        assert!(!BattleScriptJumpifComparator::Equal.evaluate(3, 4));
        assert!(BattleScriptJumpifComparator::NotEqual.evaluate(3, 4));
        assert!(!BattleScriptJumpifComparator::NotEqual.evaluate(3, 3));
        assert!(BattleScriptJumpifComparator::GreaterThan.evaluate(4, 3));
        assert!(!BattleScriptJumpifComparator::GreaterThan.evaluate(3, 3));
        assert!(BattleScriptJumpifComparator::LessThan.evaluate(2, 3));
        assert!(!BattleScriptJumpifComparator::LessThan.evaluate(3, 3));
        assert!(BattleScriptJumpifComparator::CommonBits.evaluate(0b101, 0b100));
        assert!(!BattleScriptJumpifComparator::CommonBits.evaluate(0b101, 0b010));
        assert!(BattleScriptJumpifComparator::NoCommonBits.evaluate(0b101, 0b010));
        assert!(!BattleScriptJumpifComparator::NoCommonBits.evaluate(0b101, 0b100));
    }

    #[test]
    fn unknown_comparator_is_an_error() {
        let ops = [
            BattleScriptJumpifOperand { width_bytes: 1, expression: "CMP_BOGUS" },
            BattleScriptJumpifOperand { width_bytes: 4, expression: "gCritMultiplier" },
            BattleScriptJumpifOperand { width_bytes: 1, expression: "0" },
            BattleScriptJumpifOperand { width_bytes: 4, expression: "SomeLabel" },
        ];
        let instr = instruction(&ops);
        let catalog = [("0", Some(0i64))];
        let error = apply_battle_script_jumpifbyte(&instr, &rules(), &catalog).unwrap_err();
        assert_eq!(
            error.to_string(),
            "Cmd_jumpifbyte: unknown comparator CMP_BOGUS"
        );
    }

    #[test]
    fn halt_construct_string_pointer_side_vs_value_side() {
        let catalog = [("0", Some(0i64))];
        let ops = operands(1, "0");
        let mut ops_bad_ptr = ops;
        ops_bad_ptr[1] = BattleScriptJumpifOperand { width_bytes: 4, expression: "sBATTLE_STYLE" };
        let instr = instruction(&ops_bad_ptr);
        let control = apply_battle_script_jumpifbyte(&instr, &rules(), &catalog).unwrap();
        match control {
            BattleScriptJumpifControl::Halt { source_construct, source_line, .. } => {
                assert_eq!(
                    source_construct,
                    "Cmd_jumpifbyte's operand (sBATTLE_STYLE) is not modeled"
                );
                assert_eq!(source_line, 999);
            }
            other => panic!("expected halt, got {other:?}"),
        }

        let empty_catalog: [(&str, Option<i64>); 0] = [];
        let ops_bad_value = operands(1, "SOME_UNKNOWN_LITERAL");
        let instr = instruction(&ops_bad_value);
        let control = apply_battle_script_jumpifbyte(&instr, &rules(), &empty_catalog).unwrap();
        match control {
            BattleScriptJumpifControl::Halt { source_construct, .. } => {
                assert_eq!(
                    source_construct,
                    "Cmd_jumpifbyte's operand (SOME_UNKNOWN_LITERAL) is not modeled"
                );
            }
            other => panic!("expected halt, got {other:?}"),
        }
    }

    #[test]
    fn lazy_target_resolution_only_on_taken_branch() {
        let catalog = [("1", Some(1i64))];
        let ops = operands(1, "1");
        let mut instr = instruction(&ops);
        instr.resolved_target = None;
        let mut r = rules();
        r.crit_multiplier = 5;
        // comparator is CMP_EQUAL against gCritMultiplier==5 vs value 1: false -> advance, never touches target.
        let control = apply_battle_script_jumpifbyte(&instr, &r, &catalog).unwrap();
        assert_eq!(control, BattleScriptJumpifControl::Advance);

        r.crit_multiplier = 1;
        let error = apply_battle_script_jumpifbyte(&instr, &r, &catalog).unwrap_err();
        assert_eq!(
            error.to_string(),
            "Cmd_jumpifbyte: unresolved jump target SomeLabel"
        );
    }

    #[test]
    fn width_table_across_the_three_opcodes() {
        assert_eq!(BATTLE_SCRIPT_JUMPIFBYTE_VALUE_WIDTH_BYTES, 1);
        assert_eq!(BATTLE_SCRIPT_JUMPIFHALFWORD_VALUE_WIDTH_BYTES, 2);
        assert_eq!(BATTLE_SCRIPT_JUMPIFWORD_VALUE_WIDTH_BYTES, 4);
    }

    #[test]
    fn invalid_shape_rejected_per_opcode() {
        let catalog = [("0", Some(0i64))];
        let ops = operands(2, "0"); // wrong width for jumpifbyte (should be 1)
        let instr = instruction(&ops);
        let error = apply_battle_script_jumpifbyte(&instr, &rules(), &catalog).unwrap_err();
        assert_eq!(
            error.to_string(),
            "invalid B_SCR_OP_JUMPIFBYTE shape at program counter 10"
        );
    }

    #[test]
    fn registration_finds_first_with_no_shape_validation() {
        let good = BattleScriptJumpifInstruction {
            opcode_name: BATTLE_SCRIPT_JUMPIFBYTE_OPCODE_NAME,
            opcode_id: 0x29,
            program_counter: 1,
            source_statement_line: 1,
            operands: &[],
            resolved_target: None,
        };
        let ill_shaped_duplicate = BattleScriptJumpifInstruction {
            opcode_name: BATTLE_SCRIPT_JUMPIFBYTE_OPCODE_NAME,
            opcode_id: 0x29,
            program_counter: 2,
            source_statement_line: 1,
            operands: &[],
            resolved_target: None,
        };
        let registration =
            register_battle_script_jumpifbyte(&[good, ill_shaped_duplicate]).unwrap();
        assert_eq!(registration, 0x29);

        let missing = register_battle_script_jumpifbyte(&[]).unwrap_err();
        assert_eq!(
            missing.to_string(),
            "committed Battle Script program does not emit B_SCR_OP_JUMPIFBYTE"
        );
    }
}
