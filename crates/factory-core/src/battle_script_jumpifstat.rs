//! Pure `B_SCR_OP_JUMPIFSTAT` registration and handler leaf.
//!
//! This is the machine-independent port of canonical
//! `battleScriptJumpifstatOpcode.ts`. Registration filters the committed
//! program by opcode name, requires exactly the 18 concrete starts, validates
//! all five operands (battler selector, comparator, stat, comparand, jump
//! pointer) eagerly -- INCLUDING the jump target, unlike
//! `Cmd_jumpifstatus3condition`'s late resolution -- and binds the shared
//! handler to the first selected opcode id. Execution resolves the battler
//! selector through an injected result (mirroring
//! `resolveRulesBattlerForBattleScript`); an unresolved selector produces a
//! typed `Block` control instead of a decode error, matching the canonical
//! handler's `"source-context-unavailable"` transition. A miss on the
//! comparator advances without consulting the label; a hit resolves the
//! (already-validated) pointer and jumps. No state, RNG, event, scheduler,
//! presentation, or WASM boundary is owned here.

use core::fmt;

pub const BATTLE_SCRIPT_JUMPIFSTAT_BATTLER_COUNT: usize = 4;
/// `include/constants/pokemon.h:75-84` -- `NUM_BATTLE_STATS` (`NUM_STATS(6) +
/// 2`), the width of `gBattleMons[battler].statStages[]`. Index 0 (`STAT_HP`)
/// is never a `jumpifstat` operand but is still carried so stat ids index
/// directly.
pub const BATTLE_SCRIPT_JUMPIFSTAT_STAT_SLOT_COUNT: usize = 8;
pub const BATTLE_SCRIPT_JUMPIFSTAT_OPCODE_NAME: &str = "B_SCR_OP_JUMPIFSTAT";
pub const BATTLE_SCRIPT_JUMPIFSTAT_OPCODE: u8 = 0x20;
pub const BATTLE_SCRIPT_JUMPIFSTAT_DISPATCHER: &str = "Cmd_jumpifstat";
pub const BATTLE_SCRIPT_JUMPIFSTAT_CONCRETE_START_COUNT: usize = 18;
pub const BATTLE_SCRIPT_JUMPIFSTAT_BATTLER_WIDTH_BYTES: u8 = 1;
pub const BATTLE_SCRIPT_JUMPIFSTAT_COMPARATOR_WIDTH_BYTES: u8 = 1;
pub const BATTLE_SCRIPT_JUMPIFSTAT_STAT_WIDTH_BYTES: u8 = 1;
pub const BATTLE_SCRIPT_JUMPIFSTAT_VALUE_WIDTH_BYTES: u8 = 1;
pub const BATTLE_SCRIPT_JUMPIFSTAT_POINTER_WIDTH_BYTES: u8 = 4;
pub const BATTLE_SCRIPT_JUMPIFSTAT_ENCODED_WIDTH_BYTES: u8 = 9;
/// `include/constants/pokemon.h:89,91` -- the only two named comparand
/// expressions any concrete call site in the committed program supplies.
pub const BATTLE_SCRIPT_JUMPIFSTAT_MIN_STAT_STAGE: u8 = 0;
pub const BATTLE_SCRIPT_JUMPIFSTAT_MAX_STAT_STAGE: u8 = 12;

/// `include/constants/battle_script_commands.h:326-331` -- shared with
/// `jumpifbyte`/`jumpifword`/`jumpifhalfword`'s own identical 6-comparator
/// family. Implemented source-completely: only `GreaterThan`/`NotEqual`/
/// `Equal`/`LessThan` appear in the committed program, but a 7th `CMP_*`
/// value never exists to fall through to, so the switch itself covers all
/// six.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptJumpifstatComparator {
    Equal = 0,
    NotEqual = 1,
    GreaterThan = 2,
    LessThan = 3,
    CommonBits = 4,
    NoCommonBits = 5,
}

impl BattleScriptJumpifstatComparator {
    #[must_use]
    pub const fn expression(self) -> &'static str {
        match self {
            Self::Equal => "CMP_EQUAL",
            Self::NotEqual => "CMP_NOT_EQUAL",
            Self::GreaterThan => "CMP_GREATER_THAN",
            Self::LessThan => "CMP_LESS_THAN",
            Self::CommonBits => "CMP_COMMON_BITS",
            Self::NoCommonBits => "CMP_NO_COMMON_BITS",
        }
    }

    /// `battle_script_commands.c:3184-3210` -- the `switch` body verbatim.
    #[must_use]
    pub const fn evaluate(self, value: u8, comparand: u8) -> bool {
        match self {
            Self::Equal => value == comparand,
            Self::NotEqual => value != comparand,
            Self::GreaterThan => value > comparand,
            Self::LessThan => value < comparand,
            Self::CommonBits => (value & comparand) != 0,
            Self::NoCommonBits => (value & comparand) == 0,
        }
    }
}

#[must_use]
pub fn battle_script_jumpifstat_comparator_from_expression(
    expression: &str,
) -> Option<BattleScriptJumpifstatComparator> {
    match expression {
        "CMP_EQUAL" => Some(BattleScriptJumpifstatComparator::Equal),
        "CMP_NOT_EQUAL" => Some(BattleScriptJumpifstatComparator::NotEqual),
        "CMP_GREATER_THAN" => Some(BattleScriptJumpifstatComparator::GreaterThan),
        "CMP_LESS_THAN" => Some(BattleScriptJumpifstatComparator::LessThan),
        "CMP_COMMON_BITS" => Some(BattleScriptJumpifstatComparator::CommonBits),
        "CMP_NO_COMMON_BITS" => Some(BattleScriptJumpifstatComparator::NoCommonBits),
        _ => None,
    }
}

/// `include/constants/pokemon.h:76-84`. `STAT_HP`(0) is never a `jumpifstat`
/// operand.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptJumpifstatStat {
    Atk = 1,
    Def = 2,
    Speed = 3,
    SpAtk = 4,
    SpDef = 5,
    Acc = 6,
    Evasion = 7,
}

impl BattleScriptJumpifstatStat {
    #[must_use]
    pub const fn id(self) -> u8 {
        self as u8
    }

    #[must_use]
    pub const fn expression(self) -> &'static str {
        match self {
            Self::Atk => "STAT_ATK",
            Self::Def => "STAT_DEF",
            Self::Speed => "STAT_SPEED",
            Self::SpAtk => "STAT_SPATK",
            Self::SpDef => "STAT_SPDEF",
            Self::Acc => "STAT_ACC",
            Self::Evasion => "STAT_EVASION",
        }
    }
}

#[must_use]
pub fn battle_script_jumpifstat_stat_from_expression(
    expression: &str,
) -> Option<BattleScriptJumpifstatStat> {
    match expression {
        "STAT_ATK" => Some(BattleScriptJumpifstatStat::Atk),
        "STAT_DEF" => Some(BattleScriptJumpifstatStat::Def),
        "STAT_SPEED" => Some(BattleScriptJumpifstatStat::Speed),
        "STAT_SPATK" => Some(BattleScriptJumpifstatStat::SpAtk),
        "STAT_SPDEF" => Some(BattleScriptJumpifstatStat::SpDef),
        "STAT_ACC" => Some(BattleScriptJumpifstatStat::Acc),
        "STAT_EVASION" => Some(BattleScriptJumpifstatStat::Evasion),
        _ => None,
    }
}

/// `include/constants/pokemon.h:89,91` -- the only two concrete `jumpifstat`
/// comparand operands in the committed program.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptJumpifstatValue {
    Min = BATTLE_SCRIPT_JUMPIFSTAT_MIN_STAT_STAGE,
    Max = BATTLE_SCRIPT_JUMPIFSTAT_MAX_STAT_STAGE,
}

impl BattleScriptJumpifstatValue {
    #[must_use]
    pub const fn value(self) -> u8 {
        self as u8
    }

    #[must_use]
    pub const fn expression(self) -> &'static str {
        match self {
            Self::Min => "MIN_STAT_STAGE",
            Self::Max => "MAX_STAT_STAGE",
        }
    }
}

#[must_use]
pub fn battle_script_jumpifstat_value_from_expression(
    expression: &str,
) -> Option<BattleScriptJumpifstatValue> {
    match expression {
        "MIN_STAT_STAGE" => Some(BattleScriptJumpifstatValue::Min),
        "MAX_STAT_STAGE" => Some(BattleScriptJumpifstatValue::Max),
        _ => None,
    }
}

/// Deliberately narrow projection: only the four battlers' stat-stage arrays
/// and the four selector roles are carried, matching what `Cmd_jumpifstat`
/// can possibly read. Enough to ratchet the canonical TypeScript handler's
/// immutable no-write boundary.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifstatRules {
    pub battlers_stat_stages:
        [[u8; BATTLE_SCRIPT_JUMPIFSTAT_STAT_SLOT_COUNT]; BATTLE_SCRIPT_JUMPIFSTAT_BATTLER_COUNT],
    /// `[attacker, target, effectBattler, fainted]`, matching
    /// `resolveRulesBattlerForBattleScript`'s selector roles.
    pub selector_roles: [Option<u8>; 4],
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifstatOperand<'a> {
    pub width_bytes: u8,
    pub expression: &'a str,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifstatRegistrationInstruction<'a> {
    pub opcode_name: &'a str,
    pub program_counter: u32,
    pub opcode_id: u8,
    pub dispatcher: &'a str,
    pub operands: &'a [BattleScriptJumpifstatOperand<'a>],
    /// Late label resolution is a scheduler/program concern this leaf does
    /// not own; the caller resolves the pointer operand's expression and
    /// reports the result here so registration can validate it eagerly,
    /// exactly like the canonical TypeScript factory's own
    /// `resolveBattleScriptLabel` call.
    pub resolved_jump_program_counter: Option<u32>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifstatRegistration {
    pub opcode_id: u8,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptJumpifstatRegistrationError<'a> {
    IncorrectConcreteStartCount { count: usize },
    InvalidInstructionShape { program_counter: u32 },
    UnknownComparator { expression: &'a str },
    UnknownStat { expression: &'a str },
    UnknownValue { expression: &'a str },
    UnresolvedJumpTarget { expression: &'a str },
}

impl fmt::Display for BattleScriptJumpifstatRegistrationError<'_> {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::IncorrectConcreteStartCount { count } => write!(
                formatter,
                "B_SCR_OP_JUMPIFSTAT requires all 18 concrete starts, got {count}"
            ),
            Self::InvalidInstructionShape { program_counter } => write!(
                formatter,
                "invalid B_SCR_OP_JUMPIFSTAT shape at program counter {program_counter}"
            ),
            Self::UnknownComparator { expression } => {
                write!(
                    formatter,
                    "unknown B_SCR_OP_JUMPIFSTAT comparator {expression}"
                )
            }
            Self::UnknownStat { expression } => {
                write!(formatter, "unknown B_SCR_OP_JUMPIFSTAT stat {expression}")
            }
            Self::UnknownValue { expression } => {
                write!(formatter, "unknown B_SCR_OP_JUMPIFSTAT value {expression}")
            }
            Self::UnresolvedJumpTarget { expression } => write!(
                formatter,
                "unresolved B_SCR_OP_JUMPIFSTAT jump target {expression}"
            ),
        }
    }
}

impl std::error::Error for BattleScriptJumpifstatRegistrationError<'_> {}

/// Canonical registration projection. Dispatcher, opcode identity, and the
/// battler-selector operand's expression are not extra predicates: the
/// TypeScript factory checks only the fields below, in the same order
/// (shape, then comparator, then stat, then value, then eager label
/// resolution).
pub fn register_battle_script_jumpifstat_handler<'a>(
    instructions: &[BattleScriptJumpifstatRegistrationInstruction<'a>],
) -> Result<BattleScriptJumpifstatRegistration, BattleScriptJumpifstatRegistrationError<'a>> {
    let mut first = None;
    let mut count = 0;
    for instruction in instructions {
        if instruction.opcode_name == BATTLE_SCRIPT_JUMPIFSTAT_OPCODE_NAME {
            count += 1;
            if first.is_none() {
                first = Some(*instruction);
            }
        }
    }
    if count != BATTLE_SCRIPT_JUMPIFSTAT_CONCRETE_START_COUNT {
        return Err(BattleScriptJumpifstatRegistrationError::IncorrectConcreteStartCount { count });
    }
    for instruction in instructions {
        if instruction.opcode_name != BATTLE_SCRIPT_JUMPIFSTAT_OPCODE_NAME {
            continue;
        }
        let [battler, comparator, stat, value, pointer] = instruction.operands else {
            return Err(
                BattleScriptJumpifstatRegistrationError::InvalidInstructionShape {
                    program_counter: instruction.program_counter,
                },
            );
        };
        if battler.width_bytes != BATTLE_SCRIPT_JUMPIFSTAT_BATTLER_WIDTH_BYTES
            || comparator.width_bytes != BATTLE_SCRIPT_JUMPIFSTAT_COMPARATOR_WIDTH_BYTES
            || stat.width_bytes != BATTLE_SCRIPT_JUMPIFSTAT_STAT_WIDTH_BYTES
            || value.width_bytes != BATTLE_SCRIPT_JUMPIFSTAT_VALUE_WIDTH_BYTES
            || pointer.width_bytes != BATTLE_SCRIPT_JUMPIFSTAT_POINTER_WIDTH_BYTES
        {
            return Err(
                BattleScriptJumpifstatRegistrationError::InvalidInstructionShape {
                    program_counter: instruction.program_counter,
                },
            );
        }
        if battle_script_jumpifstat_comparator_from_expression(comparator.expression).is_none() {
            return Err(BattleScriptJumpifstatRegistrationError::UnknownComparator {
                expression: comparator.expression,
            });
        }
        if battle_script_jumpifstat_stat_from_expression(stat.expression).is_none() {
            return Err(BattleScriptJumpifstatRegistrationError::UnknownStat {
                expression: stat.expression,
            });
        }
        if battle_script_jumpifstat_value_from_expression(value.expression).is_none() {
            return Err(BattleScriptJumpifstatRegistrationError::UnknownValue {
                expression: value.expression,
            });
        }
        if instruction.resolved_jump_program_counter.is_none() {
            return Err(
                BattleScriptJumpifstatRegistrationError::UnresolvedJumpTarget {
                    expression: pointer.expression,
                },
            );
        }
    }
    Ok(BattleScriptJumpifstatRegistration {
        opcode_id: first
            .expect("eighteen selected starts after count check")
            .opcode_id,
    })
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifstatExecution<'a> {
    pub program_counter: u32,
    pub comparator_expression: &'a str,
    pub stat_expression: &'a str,
    pub value_expression: &'a str,
    pub battler_operand_expression: &'a str,
    /// Already-resolved result of `resolveBattlerForBattleScript` for the
    /// instruction's battler operand; `None` mirrors the canonical handler's
    /// `battler === null` branch.
    pub battler: Option<u8>,
    pub jump_target_expression: &'a str,
    pub resolved_jump_program_counter: Option<u32>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptJumpifstatControl<'a> {
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
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifstatOutcome<'a> {
    pub rules: BattleScriptJumpifstatRules,
    pub control: BattleScriptJumpifstatControl<'a>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptJumpifstatError<'a> {
    Undecodable { program_counter: u32 },
    UnresolvedJumpTarget { expression: &'a str },
}

impl fmt::Display for BattleScriptJumpifstatError<'_> {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Undecodable { program_counter } => write!(
                formatter,
                "validated B_SCR_OP_JUMPIFSTAT became undecodable at {program_counter}"
            ),
            Self::UnresolvedJumpTarget { expression } => {
                write!(
                    formatter,
                    "Cmd_jumpifstat: unresolved jump target {expression}"
                )
            }
        }
    }
}

impl std::error::Error for BattleScriptJumpifstatError<'_> {}

pub fn apply_battle_script_jumpifstat<'a>(
    execution: BattleScriptJumpifstatExecution<'a>,
    rules: &BattleScriptJumpifstatRules,
) -> Result<BattleScriptJumpifstatOutcome<'a>, BattleScriptJumpifstatError<'a>> {
    let comparator =
        battle_script_jumpifstat_comparator_from_expression(execution.comparator_expression);
    let stat = battle_script_jumpifstat_stat_from_expression(execution.stat_expression);
    let comparand = battle_script_jumpifstat_value_from_expression(execution.value_expression);
    let (Some(comparator), Some(stat), Some(comparand)) = (comparator, stat, comparand) else {
        return Err(BattleScriptJumpifstatError::Undecodable {
            program_counter: execution.program_counter,
        });
    };

    let Some(battler) = execution.battler else {
        return Ok(BattleScriptJumpifstatOutcome {
            rules: *rules,
            control: BattleScriptJumpifstatControl::Block {
                operand_expression: execution.battler_operand_expression,
            },
        });
    };

    let value = rules.battlers_stat_stages[battler as usize][stat.id() as usize];
    if !comparator.evaluate(value, comparand.value()) {
        return Ok(BattleScriptJumpifstatOutcome {
            rules: *rules,
            control: BattleScriptJumpifstatControl::Advance,
        });
    }
    let program_counter = execution.resolved_jump_program_counter.ok_or(
        BattleScriptJumpifstatError::UnresolvedJumpTarget {
            expression: execution.jump_target_expression,
        },
    )?;
    Ok(BattleScriptJumpifstatOutcome {
        rules: *rules,
        control: BattleScriptJumpifstatControl::Jump { program_counter },
    })
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifstatDecompDispatchEvidence {
    pub opcode_name: &'static str,
    pub opcode_id: u8,
    pub dispatcher: &'static str,
    pub dispatch_line: u32,
    pub forward_decl_line: u32,
    pub handler_line: u32,
    pub battler_line: u32,
    pub value_line: u32,
    pub switch_line: u32,
    pub case_equal_line: u32,
    pub case_not_equal_line: u32,
    pub case_greater_than_line: u32,
    pub case_less_than_line: u32,
    pub case_common_bits_line: u32,
    pub case_no_common_bits_line: u32,
    pub jump_line: u32,
    pub advance_line: u32,
}

pub const BATTLE_SCRIPT_JUMPIFSTAT_DECOMP_DISPATCH_EVIDENCE:
    BattleScriptJumpifstatDecompDispatchEvidence = BattleScriptJumpifstatDecompDispatchEvidence {
    opcode_name: BATTLE_SCRIPT_JUMPIFSTAT_OPCODE_NAME,
    opcode_id: BATTLE_SCRIPT_JUMPIFSTAT_OPCODE,
    dispatcher: BATTLE_SCRIPT_JUMPIFSTAT_DISPATCHER,
    dispatch_line: 363,
    forward_decl_line: 111,
    handler_line: 3178,
    battler_line: 3181,
    value_line: 3182,
    switch_line: 3184,
    case_equal_line: 3186,
    case_not_equal_line: 3190,
    case_greater_than_line: 3194,
    case_less_than_line: 3198,
    case_common_bits_line: 3202,
    case_no_common_bits_line: 3206,
    jump_line: 3213,
    advance_line: 3215,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifstatMacroEvidence {
    pub declaration_line: u32,
    pub opcode_line: u32,
    pub battler_line: u32,
    pub ifflag_line: u32,
    pub stat_line: u32,
    pub value_line: u32,
    pub pointer_line: u32,
    pub encoded_width_bytes: u8,
}

pub const BATTLE_SCRIPT_JUMPIFSTAT_MACRO_EVIDENCE: BattleScriptJumpifstatMacroEvidence =
    BattleScriptJumpifstatMacroEvidence {
        declaration_line: 164,
        opcode_line: 165,
        battler_line: 166,
        ifflag_line: 167,
        stat_line: 168,
        value_line: 169,
        pointer_line: 170,
        encoded_width_bytes: BATTLE_SCRIPT_JUMPIFSTAT_ENCODED_WIDTH_BYTES,
    };

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifstatCallSiteEvidence {
    pub entry_label: &'static str,
    pub entry_label_line: u32,
    pub statement_line: u32,
    pub instruction_program_counter: u32,
    pub battler_selector_expression: &'static str,
    pub comparator_expression: &'static str,
    pub stat_expression: &'static str,
    pub value_expression: &'static str,
    pub target_expression: &'static str,
    pub target_program_counter: u32,
}

pub const BATTLE_SCRIPT_JUMPIFSTAT_CALL_SITE_EVIDENCE: [BattleScriptJumpifstatCallSiteEvidence;
    BATTLE_SCRIPT_JUMPIFSTAT_CONCRETE_START_COUNT] = [
    BattleScriptJumpifstatCallSiteEvidence {
        entry_label: "BattleScript_EffectCurse",
        entry_label_line: 1482,
        statement_line: 1487,
        instruction_program_counter: 988,
        battler_selector_expression: "BS_ATTACKER",
        comparator_expression: "CMP_GREATER_THAN",
        stat_expression: "STAT_SPEED",
        value_expression: "MIN_STAT_STAGE",
        target_expression: "BattleScript_CurseTrySpeed",
        target_program_counter: 991,
    },
    BattleScriptJumpifstatCallSiteEvidence {
        entry_label: "BattleScript_EffectCurse",
        entry_label_line: 1482,
        statement_line: 1488,
        instruction_program_counter: 989,
        battler_selector_expression: "BS_ATTACKER",
        comparator_expression: "CMP_NOT_EQUAL",
        stat_expression: "STAT_ATK",
        value_expression: "MAX_STAT_STAGE",
        target_expression: "BattleScript_CurseTrySpeed",
        target_program_counter: 991,
    },
    BattleScriptJumpifstatCallSiteEvidence {
        entry_label: "BattleScript_EffectCurse",
        entry_label_line: 1482,
        statement_line: 1489,
        instruction_program_counter: 990,
        battler_selector_expression: "BS_ATTACKER",
        comparator_expression: "CMP_EQUAL",
        stat_expression: "STAT_DEF",
        value_expression: "MAX_STAT_STAGE",
        target_expression: "BattleScript_ButItFailed",
        target_program_counter: 1434,
    },
    BattleScriptJumpifstatCallSiteEvidence {
        entry_label: "BattleScript_EffectTickle",
        entry_label_line: 2652,
        statement_line: 2656,
        instruction_program_counter: 1900,
        battler_selector_expression: "BS_TARGET",
        comparator_expression: "CMP_GREATER_THAN",
        stat_expression: "STAT_ATK",
        value_expression: "MIN_STAT_STAGE",
        target_expression: "BattleScript_TickleDoMoveAnim",
        target_program_counter: 1902,
    },
    BattleScriptJumpifstatCallSiteEvidence {
        entry_label: "BattleScript_EffectTickle",
        entry_label_line: 2652,
        statement_line: 2657,
        instruction_program_counter: 1901,
        battler_selector_expression: "BS_TARGET",
        comparator_expression: "CMP_EQUAL",
        stat_expression: "STAT_DEF",
        value_expression: "MIN_STAT_STAGE",
        target_expression: "BattleScript_CantLowerMultipleStats",
        target_program_counter: 1920,
    },
    BattleScriptJumpifstatCallSiteEvidence {
        entry_label: "BattleScript_EffectCosmicPower",
        entry_label_line: 2687,
        statement_line: 2691,
        instruction_program_counter: 1928,
        battler_selector_expression: "BS_ATTACKER",
        comparator_expression: "CMP_LESS_THAN",
        stat_expression: "STAT_DEF",
        value_expression: "MAX_STAT_STAGE",
        target_expression: "BattleScript_CosmicPowerDoMoveAnim",
        target_program_counter: 1930,
    },
    BattleScriptJumpifstatCallSiteEvidence {
        entry_label: "BattleScript_EffectCosmicPower",
        entry_label_line: 2687,
        statement_line: 2692,
        instruction_program_counter: 1929,
        battler_selector_expression: "BS_ATTACKER",
        comparator_expression: "CMP_EQUAL",
        stat_expression: "STAT_SPDEF",
        value_expression: "MAX_STAT_STAGE",
        target_expression: "BattleScript_CantRaiseMultipleStats",
        target_program_counter: 1987,
    },
    BattleScriptJumpifstatCallSiteEvidence {
        entry_label: "BattleScript_EffectBulkUp",
        entry_label_line: 2716,
        statement_line: 2720,
        instruction_program_counter: 1950,
        battler_selector_expression: "BS_ATTACKER",
        comparator_expression: "CMP_LESS_THAN",
        stat_expression: "STAT_ATK",
        value_expression: "MAX_STAT_STAGE",
        target_expression: "BattleScript_BulkUpDoMoveAnim",
        target_program_counter: 1952,
    },
    BattleScriptJumpifstatCallSiteEvidence {
        entry_label: "BattleScript_EffectBulkUp",
        entry_label_line: 2716,
        statement_line: 2721,
        instruction_program_counter: 1951,
        battler_selector_expression: "BS_ATTACKER",
        comparator_expression: "CMP_EQUAL",
        stat_expression: "STAT_DEF",
        value_expression: "MAX_STAT_STAGE",
        target_expression: "BattleScript_CantRaiseMultipleStats",
        target_program_counter: 1987,
    },
    BattleScriptJumpifstatCallSiteEvidence {
        entry_label: "BattleScript_EffectCalmMind",
        entry_label_line: 2741,
        statement_line: 2745,
        instruction_program_counter: 1970,
        battler_selector_expression: "BS_ATTACKER",
        comparator_expression: "CMP_LESS_THAN",
        stat_expression: "STAT_SPATK",
        value_expression: "MAX_STAT_STAGE",
        target_expression: "BattleScript_CalmMindDoMoveAnim",
        target_program_counter: 1972,
    },
    BattleScriptJumpifstatCallSiteEvidence {
        entry_label: "BattleScript_EffectCalmMind",
        entry_label_line: 2741,
        statement_line: 2746,
        instruction_program_counter: 1971,
        battler_selector_expression: "BS_ATTACKER",
        comparator_expression: "CMP_EQUAL",
        stat_expression: "STAT_SPDEF",
        value_expression: "MAX_STAT_STAGE",
        target_expression: "BattleScript_CantRaiseMultipleStats",
        target_program_counter: 1987,
    },
    BattleScriptJumpifstatCallSiteEvidence {
        entry_label: "BattleScript_EffectDragonDance",
        entry_label_line: 2773,
        statement_line: 2777,
        instruction_program_counter: 1995,
        battler_selector_expression: "BS_ATTACKER",
        comparator_expression: "CMP_LESS_THAN",
        stat_expression: "STAT_ATK",
        value_expression: "MAX_STAT_STAGE",
        target_expression: "BattleScript_DragonDanceDoMoveAnim",
        target_program_counter: 1997,
    },
    BattleScriptJumpifstatCallSiteEvidence {
        entry_label: "BattleScript_EffectDragonDance",
        entry_label_line: 2773,
        statement_line: 2778,
        instruction_program_counter: 1996,
        battler_selector_expression: "BS_ATTACKER",
        comparator_expression: "CMP_EQUAL",
        stat_expression: "STAT_SPEED",
        value_expression: "MAX_STAT_STAGE",
        target_expression: "BattleScript_CantRaiseMultipleStats",
        target_program_counter: 1987,
    },
    BattleScriptJumpifstatCallSiteEvidence {
        entry_label: "BattleScript_AllStatsUp",
        entry_label_line: 3452,
        statement_line: 3453,
        instruction_program_counter: 2517,
        battler_selector_expression: "BS_ATTACKER",
        comparator_expression: "CMP_LESS_THAN",
        stat_expression: "STAT_ATK",
        value_expression: "MAX_STAT_STAGE",
        target_expression: "BattleScript_AllStatsUpAtk",
        target_program_counter: 2522,
    },
    BattleScriptJumpifstatCallSiteEvidence {
        entry_label: "BattleScript_AllStatsUp",
        entry_label_line: 3452,
        statement_line: 3454,
        instruction_program_counter: 2518,
        battler_selector_expression: "BS_ATTACKER",
        comparator_expression: "CMP_LESS_THAN",
        stat_expression: "STAT_DEF",
        value_expression: "MAX_STAT_STAGE",
        target_expression: "BattleScript_AllStatsUpAtk",
        target_program_counter: 2522,
    },
    BattleScriptJumpifstatCallSiteEvidence {
        entry_label: "BattleScript_AllStatsUp",
        entry_label_line: 3452,
        statement_line: 3455,
        instruction_program_counter: 2519,
        battler_selector_expression: "BS_ATTACKER",
        comparator_expression: "CMP_LESS_THAN",
        stat_expression: "STAT_SPEED",
        value_expression: "MAX_STAT_STAGE",
        target_expression: "BattleScript_AllStatsUpAtk",
        target_program_counter: 2522,
    },
    BattleScriptJumpifstatCallSiteEvidence {
        entry_label: "BattleScript_AllStatsUp",
        entry_label_line: 3452,
        statement_line: 3456,
        instruction_program_counter: 2520,
        battler_selector_expression: "BS_ATTACKER",
        comparator_expression: "CMP_LESS_THAN",
        stat_expression: "STAT_SPATK",
        value_expression: "MAX_STAT_STAGE",
        target_expression: "BattleScript_AllStatsUpAtk",
        target_program_counter: 2522,
    },
    BattleScriptJumpifstatCallSiteEvidence {
        entry_label: "BattleScript_AllStatsUp",
        entry_label_line: 3452,
        statement_line: 3457,
        instruction_program_counter: 2521,
        battler_selector_expression: "BS_ATTACKER",
        comparator_expression: "CMP_EQUAL",
        stat_expression: "STAT_SPDEF",
        value_expression: "MAX_STAT_STAGE",
        target_expression: "BattleScript_AllStatsUpRet",
        target_program_counter: 2544,
    },
];
