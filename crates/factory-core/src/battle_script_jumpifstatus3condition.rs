//! Pure `B_SCR_OP_JUMPIFSTATUS3CONDITION` registration and handler leaf.
//!
//! This is the machine-independent port of canonical
//! `battleScriptJumpifstatus3conditionOpcode.ts`. Registration filters the
//! committed program by opcode name, requires exactly the seven concrete
//! starts, validates all four operands (battler selector, status3 mask,
//! condition byte, jump pointer) eagerly, and binds the shared handler to
//! the first selected opcode id. Execution reads only the resolved
//! `BS_TARGET` battler's `status3` word: a miss advances without consulting
//! the label; a hit resolves the pointer late and jumps. No state, RNG,
//! event, scheduler, presentation, or WASM boundary is owned here.

use core::fmt;

pub const BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_BATTLER_COUNT: usize = 4;
pub const BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_OPCODE_NAME: &str =
    "B_SCR_OP_JUMPIFSTATUS3CONDITION";
pub const BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_OPCODE: u8 = 0x21;
pub const BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_DISPATCHER: &str = "Cmd_jumpifstatus3condition";
pub const BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_CONCRETE_START_COUNT: usize = 7;
pub const BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_BATTLER_WIDTH_BYTES: u8 = 1;
pub const BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_STATUS_WIDTH_BYTES: u8 = 4;
pub const BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_CONDITION_WIDTH_BYTES: u8 = 1;
pub const BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_POINTER_WIDTH_BYTES: u8 = 4;
pub const BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_ENCODED_WIDTH_BYTES: u8 = 11;
pub const BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_BATTLER_SELECTOR: &str = "BS_TARGET";

/// `include/constants/battle.h:163-175` -- every `STATUS3_*` bit a concrete
/// call site in the committed program names.
#[repr(u32)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptJumpifstatus3conditionStatus3 {
    OnAir = 1 << 6,
    Underground = 1 << 7,
    Minimized = 1 << 8,
    Rooted = 1 << 10,
    Underwater = 1 << 18,
}

pub const BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_STATUS3_MASKS:
    [BattleScriptJumpifstatus3conditionStatus3; 5] = [
    BattleScriptJumpifstatus3conditionStatus3::OnAir,
    BattleScriptJumpifstatus3conditionStatus3::Underground,
    BattleScriptJumpifstatus3conditionStatus3::Minimized,
    BattleScriptJumpifstatus3conditionStatus3::Rooted,
    BattleScriptJumpifstatus3conditionStatus3::Underwater,
];

impl BattleScriptJumpifstatus3conditionStatus3 {
    #[must_use]
    pub const fn mask(self) -> u32 {
        self as u32
    }

    #[must_use]
    pub const fn expression(self) -> &'static str {
        match self {
            Self::OnAir => "STATUS3_ON_AIR",
            Self::Underground => "STATUS3_UNDERGROUND",
            Self::Minimized => "STATUS3_MINIMIZED",
            Self::Rooted => "STATUS3_ROOTED",
            Self::Underwater => "STATUS3_UNDERWATER",
        }
    }
}

#[must_use]
pub fn battle_script_jumpifstatus3condition_status3_from_expression(
    expression: &str,
) -> Option<BattleScriptJumpifstatus3conditionStatus3> {
    match expression {
        "STATUS3_ON_AIR" => Some(BattleScriptJumpifstatus3conditionStatus3::OnAir),
        "STATUS3_UNDERGROUND" => Some(BattleScriptJumpifstatus3conditionStatus3::Underground),
        "STATUS3_MINIMIZED" => Some(BattleScriptJumpifstatus3conditionStatus3::Minimized),
        "STATUS3_ROOTED" => Some(BattleScriptJumpifstatus3conditionStatus3::Rooted),
        "STATUS3_UNDERWATER" => Some(BattleScriptJumpifstatus3conditionStatus3::Underwater),
        _ => None,
    }
}

/// The literal `TRUE`/`FALSE` byte `jumpifstatus3`/`jumpifnostatus3` always
/// supply.
#[must_use]
pub fn battle_script_jumpifstatus3condition_condition_from_expression(
    expression: &str,
) -> Option<bool> {
    match expression {
        "TRUE" => Some(true),
        "FALSE" => Some(false),
        _ => None,
    }
}

/// Deliberately narrow projection: only the four battlers' `status3` words
/// and the four selector roles are carried, matching what
/// `Cmd_jumpifstatus3condition` can possibly read. Enough to ratchet the
/// canonical TypeScript handler's immutable no-write boundary.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifstatus3conditionRules {
    pub battlers_status3: [u32; BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_BATTLER_COUNT],
    /// `[attacker, target, effectBattler, fainted]`, matching
    /// `resolveRulesBattlerForBattleScript`'s selector roles.
    pub selector_roles: [Option<u8>; 4],
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifstatus3conditionOperand<'a> {
    pub width_bytes: u8,
    pub expression: &'a str,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifstatus3conditionRegistrationInstruction<'a> {
    pub opcode_name: &'a str,
    pub program_counter: u32,
    pub opcode_id: u8,
    pub dispatcher: &'a str,
    pub operands: &'a [BattleScriptJumpifstatus3conditionOperand<'a>],
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifstatus3conditionRegistration {
    pub opcode_id: u8,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptJumpifstatus3conditionRegistrationError<'a> {
    IncorrectConcreteStartCount { count: usize },
    InvalidInstructionShape { program_counter: u32 },
    UnknownBattlerSelector { expression: &'a str },
    UnknownCondition { expression: &'a str },
    UnknownStatus3Value { expression: &'a str },
}

impl fmt::Display for BattleScriptJumpifstatus3conditionRegistrationError<'_> {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::IncorrectConcreteStartCount { count } => write!(
                formatter,
                "B_SCR_OP_JUMPIFSTATUS3CONDITION requires all 7 concrete starts, got {count}"
            ),
            Self::InvalidInstructionShape { program_counter } => write!(
                formatter,
                "invalid B_SCR_OP_JUMPIFSTATUS3CONDITION shape at program counter {program_counter}"
            ),
            Self::UnknownBattlerSelector { expression } => write!(
                formatter,
                "unknown B_SCR_OP_JUMPIFSTATUS3CONDITION battler selector {expression}"
            ),
            Self::UnknownCondition { expression } => write!(
                formatter,
                "unknown B_SCR_OP_JUMPIFSTATUS3CONDITION condition {expression}"
            ),
            Self::UnknownStatus3Value { expression } => write!(
                formatter,
                "unknown B_SCR_OP_JUMPIFSTATUS3CONDITION status3 value {expression}"
            ),
        }
    }
}

impl std::error::Error for BattleScriptJumpifstatus3conditionRegistrationError<'_> {}

/// Canonical registration projection. Dispatcher and opcode identity are not
/// extra predicates: the TypeScript factory checks only the fields below, in
/// the same order (shape, then battler selector, then condition, then
/// status3 value).
pub fn register_battle_script_jumpifstatus3condition_handler<'a>(
    instructions: &[BattleScriptJumpifstatus3conditionRegistrationInstruction<'a>],
) -> Result<
    BattleScriptJumpifstatus3conditionRegistration,
    BattleScriptJumpifstatus3conditionRegistrationError<'a>,
> {
    let mut first = None;
    let mut count = 0;
    for instruction in instructions {
        if instruction.opcode_name == BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_OPCODE_NAME {
            count += 1;
            if first.is_none() {
                first = Some(*instruction);
            }
        }
    }
    if count != BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_CONCRETE_START_COUNT {
        return Err(
            BattleScriptJumpifstatus3conditionRegistrationError::IncorrectConcreteStartCount {
                count,
            },
        );
    }
    for instruction in instructions {
        if instruction.opcode_name != BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_OPCODE_NAME {
            continue;
        }
        let [battler, status, condition, pointer] = instruction.operands else {
            return Err(
                BattleScriptJumpifstatus3conditionRegistrationError::InvalidInstructionShape {
                    program_counter: instruction.program_counter,
                },
            );
        };
        if battler.width_bytes != BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_BATTLER_WIDTH_BYTES
            || status.width_bytes != BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_STATUS_WIDTH_BYTES
            || condition.width_bytes != BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_CONDITION_WIDTH_BYTES
            || pointer.width_bytes != BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_POINTER_WIDTH_BYTES
        {
            return Err(
                BattleScriptJumpifstatus3conditionRegistrationError::InvalidInstructionShape {
                    program_counter: instruction.program_counter,
                },
            );
        }
        if battler.expression != BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_BATTLER_SELECTOR {
            return Err(
                BattleScriptJumpifstatus3conditionRegistrationError::UnknownBattlerSelector {
                    expression: battler.expression,
                },
            );
        }
        if battle_script_jumpifstatus3condition_condition_from_expression(condition.expression)
            .is_none()
        {
            return Err(
                BattleScriptJumpifstatus3conditionRegistrationError::UnknownCondition {
                    expression: condition.expression,
                },
            );
        }
        if battle_script_jumpifstatus3condition_status3_from_expression(status.expression).is_none()
        {
            return Err(
                BattleScriptJumpifstatus3conditionRegistrationError::UnknownStatus3Value {
                    expression: status.expression,
                },
            );
        }
    }
    Ok(BattleScriptJumpifstatus3conditionRegistration {
        opcode_id: first
            .expect("seven selected starts after count check")
            .opcode_id,
    })
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifstatus3conditionExecution<'a> {
    pub program_counter: u32,
    pub status_expression: &'a str,
    pub condition_expression: &'a str,
    /// `resolveRulesBattlerForBattleScript`'s already-resolved result for
    /// the instruction's `BS_TARGET` operand; `None` when the role is
    /// unset, mirroring the canonical handler's `battler === null` check.
    pub battler: Option<u8>,
    pub jump_target_expression: &'a str,
    pub resolved_jump_program_counter: Option<u32>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptJumpifstatus3conditionControl {
    Advance,
    Jump { program_counter: u32 },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifstatus3conditionOutcome {
    pub rules: BattleScriptJumpifstatus3conditionRules,
    pub control: BattleScriptJumpifstatus3conditionControl,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptJumpifstatus3conditionError<'a> {
    Undecodable { program_counter: u32 },
    UnresolvedJumpTarget { expression: &'a str },
}

impl fmt::Display for BattleScriptJumpifstatus3conditionError<'_> {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Undecodable { program_counter } => write!(
                formatter,
                "validated B_SCR_OP_JUMPIFSTATUS3CONDITION became undecodable at {program_counter}"
            ),
            Self::UnresolvedJumpTarget { expression } => write!(
                formatter,
                "Cmd_jumpifstatus3condition: unresolved jump target {expression}"
            ),
        }
    }
}

impl std::error::Error for BattleScriptJumpifstatus3conditionError<'_> {}

pub fn apply_battle_script_jumpifstatus3condition<'a>(
    execution: BattleScriptJumpifstatus3conditionExecution<'a>,
    rules: &BattleScriptJumpifstatus3conditionRules,
) -> Result<BattleScriptJumpifstatus3conditionOutcome, BattleScriptJumpifstatus3conditionError<'a>>
{
    let condition = battle_script_jumpifstatus3condition_condition_from_expression(
        execution.condition_expression,
    );
    let mask =
        battle_script_jumpifstatus3condition_status3_from_expression(execution.status_expression);
    let (Some(condition), Some(mask), Some(battler)) = (condition, mask, execution.battler) else {
        return Err(BattleScriptJumpifstatus3conditionError::Undecodable {
            program_counter: execution.program_counter,
        });
    };

    let status3 = rules.battlers_status3[battler as usize];
    let bit_set = (status3 & mask.mask()) != 0;
    let should_jump = if condition { !bit_set } else { bit_set };

    if !should_jump {
        return Ok(BattleScriptJumpifstatus3conditionOutcome {
            rules: *rules,
            control: BattleScriptJumpifstatus3conditionControl::Advance,
        });
    }
    let program_counter = execution.resolved_jump_program_counter.ok_or(
        BattleScriptJumpifstatus3conditionError::UnresolvedJumpTarget {
            expression: execution.jump_target_expression,
        },
    )?;
    Ok(BattleScriptJumpifstatus3conditionOutcome {
        rules: *rules,
        control: BattleScriptJumpifstatus3conditionControl::Jump { program_counter },
    })
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifstatus3conditionDecompDispatchEvidence {
    pub opcode_name: &'static str,
    pub opcode_id: u8,
    pub dispatcher: &'static str,
    pub dispatch_line: u32,
    pub forward_decl_line: u32,
    pub handler_line: u32,
    pub battler_line: u32,
    pub status_line: u32,
    pub pointer_line: u32,
    pub condition_check_line: u32,
    pub condition_true_bit_set_advance_line: u32,
    pub condition_true_bit_clear_jump_line: u32,
    pub condition_false_bit_set_jump_line: u32,
    pub condition_false_bit_clear_advance_line: u32,
}

pub const BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_DECOMP_DISPATCH_EVIDENCE:
    BattleScriptJumpifstatus3conditionDecompDispatchEvidence =
    BattleScriptJumpifstatus3conditionDecompDispatchEvidence {
        opcode_name: BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_OPCODE_NAME,
        opcode_id: BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_OPCODE,
        dispatcher: BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_DISPATCHER,
        dispatch_line: 364,
        forward_decl_line: 112,
        handler_line: 3218,
        battler_line: 3223,
        status_line: 3224,
        pointer_line: 3225,
        condition_check_line: 3227,
        condition_true_bit_set_advance_line: 3230,
        condition_true_bit_clear_jump_line: 3232,
        condition_false_bit_set_jump_line: 3237,
        condition_false_bit_clear_advance_line: 3239,
    };

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifstatus3conditionMacroEvidence {
    pub declaration_line: u32,
    pub opcode_line: u32,
    pub battler_line: u32,
    pub status3_line: u32,
    pub condition_line: u32,
    pub pointer_line: u32,
    pub jumpifstatus3_macro_line: u32,
    pub jumpifnostatus3_macro_line: u32,
    pub encoded_width_bytes: u8,
}

pub const BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_MACRO_EVIDENCE:
    BattleScriptJumpifstatus3conditionMacroEvidence =
    BattleScriptJumpifstatus3conditionMacroEvidence {
        declaration_line: 173,
        opcode_line: 174,
        battler_line: 175,
        status3_line: 176,
        condition_line: 177,
        pointer_line: 178,
        jumpifstatus3_macro_line: 1422,
        jumpifnostatus3_macro_line: 1426,
        encoded_width_bytes: BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_ENCODED_WIDTH_BYTES,
    };

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifstatus3conditionCallSiteEvidence {
    pub entry_label: &'static str,
    pub entry_label_line: u32,
    pub statement_line: u32,
    pub instruction_program_counter: u32,
    pub status_expression: &'static str,
    pub status_mask: u32,
    pub condition_expression: &'static str,
    pub condition: bool,
    pub target_expression: &'static str,
    pub target_program_counter: u32,
}

pub const BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_CALL_SITE_EVIDENCE:
    [BattleScriptJumpifstatus3conditionCallSiteEvidence;
        BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_CONCRETE_START_COUNT] = [
    BattleScriptJumpifstatus3conditionCallSiteEvidence {
        entry_label: "BattleScript_EffectHit",
        entry_label_line: 236,
        statement_line: 238,
        instruction_program_counter: 1,
        status_expression: "STATUS3_UNDERWATER",
        status_mask: BattleScriptJumpifstatus3conditionStatus3::Underwater.mask(),
        condition_expression: "TRUE",
        condition: true,
        target_expression: "BattleScript_HitFromAtkCanceler",
        target_program_counter: 4,
    },
    BattleScriptJumpifstatus3conditionCallSiteEvidence {
        entry_label: "BattleScript_EffectRoar",
        entry_label_line: 593,
        statement_line: 598,
        instruction_program_counter: 276,
        status_expression: "STATUS3_ROOTED",
        status_mask: BattleScriptJumpifstatus3conditionStatus3::Rooted.mask(),
        condition_expression: "FALSE",
        condition: false,
        target_expression: "BattleScript_PrintMonIsRooted",
        target_program_counter: 2636,
    },
    BattleScriptJumpifstatus3conditionCallSiteEvidence {
        entry_label: "BattleScript_EffectTrap",
        entry_label_line: 830,
        statement_line: 832,
        instruction_program_counter: 470,
        status_expression: "STATUS3_UNDERWATER",
        status_mask: BattleScriptJumpifstatus3conditionStatus3::Underwater.mask(),
        condition_expression: "TRUE",
        condition: true,
        target_expression: "BattleScript_DoWrapEffect",
        target_program_counter: 473,
    },
    BattleScriptJumpifstatus3conditionCallSiteEvidence {
        entry_label: "BattleScript_EffectTwister",
        entry_label_line: 1826,
        statement_line: 1827,
        instruction_program_counter: 1253,
        status_expression: "STATUS3_ON_AIR",
        status_mask: BattleScriptJumpifstatus3conditionStatus3::OnAir.mask(),
        condition_expression: "TRUE",
        condition: true,
        target_expression: "BattleScript_FlinchEffect",
        target_program_counter: 1256,
    },
    BattleScriptJumpifstatus3conditionCallSiteEvidence {
        entry_label: "BattleScript_HitsAllWithUndergroundBonusLoop",
        entry_label_line: 1839,
        statement_line: 1841,
        instruction_program_counter: 1263,
        status_expression: "STATUS3_UNDERGROUND",
        status_mask: BattleScriptJumpifstatus3conditionStatus3::Underground.mask(),
        condition_expression: "TRUE",
        condition: true,
        target_expression: "BattleScript_HitsAllNoUndergroundBonus",
        target_program_counter: 1267,
    },
    BattleScriptJumpifstatus3conditionCallSiteEvidence {
        entry_label: "BattleScript_EffectGust",
        entry_label_line: 1892,
        statement_line: 1893,
        instruction_program_counter: 1310,
        status_expression: "STATUS3_ON_AIR",
        status_mask: BattleScriptJumpifstatus3conditionStatus3::OnAir.mask(),
        condition_expression: "TRUE",
        condition: true,
        target_expression: "BattleScript_EffectHit",
        target_program_counter: 0,
    },
    BattleScriptJumpifstatus3conditionCallSiteEvidence {
        entry_label: "BattleScript_EffectStomp",
        entry_label_line: 1898,
        statement_line: 1899,
        instruction_program_counter: 1314,
        status_expression: "STATUS3_MINIMIZED",
        status_mask: BattleScriptJumpifstatus3conditionStatus3::Minimized.mask(),
        condition_expression: "TRUE",
        condition: true,
        target_expression: "BattleScript_FlinchEffect",
        target_program_counter: 1256,
    },
];
