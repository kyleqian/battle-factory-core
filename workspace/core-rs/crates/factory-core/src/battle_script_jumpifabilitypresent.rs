//! Pure `B_SCR_OP_JUMPIFABILITYPRESENT` registration and handler leaf.
//!
//! This is the machine-independent port of canonical
//! `battleScriptJumpifabilitypresentOpcode.ts`. Registration filters the
//! committed program by opcode name, requires exactly the two Solar Beam
//! starts, validates both operands eagerly, and binds the shared handler to
//! the first selected opcode id. Execution scans only active topology slots
//! and only living battlers. A miss advances without consulting the label;
//! a hit resolves the pointer late and jumps. No state, RNG, event,
//! scheduler, presentation, or WASM boundary is owned here.

use core::fmt;

pub const BATTLE_SCRIPT_JUMPIFABILITYPRESENT_BATTLER_COUNT: usize = 4;
pub const BATTLE_SCRIPT_JUMPIFABILITYPRESENT_OPCODE_NAME: &str = "B_SCR_OP_JUMPIFABILITYPRESENT";
pub const BATTLE_SCRIPT_JUMPIFABILITYPRESENT_OPCODE: u8 = 0x43;
pub const BATTLE_SCRIPT_JUMPIFABILITYPRESENT_DISPATCHER: &str = "Cmd_jumpifabilitypresent";
pub const BATTLE_SCRIPT_JUMPIFABILITYPRESENT_CONCRETE_START_COUNT: usize = 2;
pub const BATTLE_SCRIPT_JUMPIFABILITYPRESENT_ABILITY_WIDTH_BYTES: u8 = 1;
pub const BATTLE_SCRIPT_JUMPIFABILITYPRESENT_POINTER_WIDTH_BYTES: u8 = 4;
pub const BATTLE_SCRIPT_JUMPIFABILITYPRESENT_ENCODED_WIDTH_BYTES: u8 = 6;
pub const BATTLE_SCRIPT_JUMPIFABILITYPRESENT_TARGET_LABEL: &str =
    "BattleScript_SolarBeamDecideTurn";
pub const BATTLE_SCRIPT_JUMPIFABILITYPRESENT_TARGET_PROGRAM_COUNTER: u32 = 1320;

#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptJumpifabilitypresentAbility {
    CloudNine = 13,
    AirLock = 77,
}

pub const BATTLE_SCRIPT_JUMPIFABILITYPRESENT_ABILITIES: [BattleScriptJumpifabilitypresentAbility;
    BATTLE_SCRIPT_JUMPIFABILITYPRESENT_CONCRETE_START_COUNT] = [
    BattleScriptJumpifabilitypresentAbility::CloudNine,
    BattleScriptJumpifabilitypresentAbility::AirLock,
];

impl BattleScriptJumpifabilitypresentAbility {
    #[must_use]
    pub const fn id(self) -> u8 {
        self as u8
    }

    #[must_use]
    pub const fn expression(self) -> &'static str {
        match self {
            Self::CloudNine => "ABILITY_CLOUD_NINE",
            Self::AirLock => "ABILITY_AIR_LOCK",
        }
    }
}

#[must_use]
pub fn battle_script_jumpifabilitypresent_ability_from_expression(
    expression: &str,
) -> Option<BattleScriptJumpifabilitypresentAbility> {
    match expression {
        "ABILITY_CLOUD_NINE" => Some(BattleScriptJumpifabilitypresentAbility::CloudNine),
        "ABILITY_AIR_LOCK" => Some(BattleScriptJumpifabilitypresentAbility::AirLock),
        _ => None,
    }
}

#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptJumpifabilitypresentBattlersCount {
    Singles = 2,
    Doubles = 4,
}

impl BattleScriptJumpifabilitypresentBattlersCount {
    #[must_use]
    pub const fn get(self) -> usize {
        self as usize
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifabilitypresentBattlerState {
    pub ability: u8,
    pub hp: u16,
    pub max_hp: u16,
    pub status1: u32,
    pub status2: u32,
    pub status3: u32,
    pub item: u16,
    pub moves: [u16; 4],
    pub pp: [u8; 4],
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifabilitypresentRules {
    pub battlers: [BattleScriptJumpifabilitypresentBattlerState;
        BATTLE_SCRIPT_JUMPIFABILITYPRESENT_BATTLER_COUNT],
    pub battlers_count: BattleScriptJumpifabilitypresentBattlersCount,
    /// Preserved and deliberately ignored, matching canonical field-scan semantics.
    pub absent_battler_flags: u8,
    pub selector_roles: [Option<u8>; 4],
    pub current_move: u16,
    pub battle_move_damage: i32,
    pub move_result_flags: u8,
    pub hit_marker: u32,
    pub weather: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifabilitypresentOperand<'a> {
    pub width_bytes: u8,
    pub expression: &'a str,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifabilitypresentRegistrationInstruction<'a> {
    pub opcode_name: &'a str,
    pub program_counter: u32,
    pub opcode_id: u8,
    pub dispatcher: &'a str,
    pub operands: &'a [BattleScriptJumpifabilitypresentOperand<'a>],
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifabilitypresentRegistration {
    pub opcode_id: u8,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptJumpifabilitypresentRegistrationError {
    IncorrectConcreteStartCount { count: usize },
    InvalidInstructionShape { program_counter: u32 },
}

impl fmt::Display for BattleScriptJumpifabilitypresentRegistrationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::IncorrectConcreteStartCount { count } => write!(
                formatter,
                "B_SCR_OP_JUMPIFABILITYPRESENT requires both concrete starts, got {count}"
            ),
            Self::InvalidInstructionShape { program_counter } => write!(
                formatter,
                "invalid B_SCR_OP_JUMPIFABILITYPRESENT shape at program counter {program_counter}"
            ),
        }
    }
}

impl std::error::Error for BattleScriptJumpifabilitypresentRegistrationError {}

/// Canonical registration projection. Dispatcher, opcode identity, concrete
/// expression ordering, pointer expression, and label resolution are not
/// extra predicates: the TypeScript factory checks only the fields below.
pub fn register_battle_script_jumpifabilitypresent_handler(
    instructions: &[BattleScriptJumpifabilitypresentRegistrationInstruction<'_>],
) -> Result<
    BattleScriptJumpifabilitypresentRegistration,
    BattleScriptJumpifabilitypresentRegistrationError,
> {
    let mut first = None;
    let mut count = 0;
    for instruction in instructions {
        if instruction.opcode_name == BATTLE_SCRIPT_JUMPIFABILITYPRESENT_OPCODE_NAME {
            count += 1;
            if first.is_none() {
                first = Some(*instruction);
            }
        }
    }
    if count != BATTLE_SCRIPT_JUMPIFABILITYPRESENT_CONCRETE_START_COUNT {
        return Err(
            BattleScriptJumpifabilitypresentRegistrationError::IncorrectConcreteStartCount {
                count,
            },
        );
    }
    for instruction in instructions {
        if instruction.opcode_name != BATTLE_SCRIPT_JUMPIFABILITYPRESENT_OPCODE_NAME {
            continue;
        }
        let [ability, pointer] = instruction.operands else {
            return Err(
                BattleScriptJumpifabilitypresentRegistrationError::InvalidInstructionShape {
                    program_counter: instruction.program_counter,
                },
            );
        };
        if ability.width_bytes != BATTLE_SCRIPT_JUMPIFABILITYPRESENT_ABILITY_WIDTH_BYTES
            || battle_script_jumpifabilitypresent_ability_from_expression(ability.expression)
                .is_none()
            || pointer.width_bytes != BATTLE_SCRIPT_JUMPIFABILITYPRESENT_POINTER_WIDTH_BYTES
        {
            return Err(
                BattleScriptJumpifabilitypresentRegistrationError::InvalidInstructionShape {
                    program_counter: instruction.program_counter,
                },
            );
        }
    }
    Ok(BattleScriptJumpifabilitypresentRegistration {
        opcode_id: first
            .expect("two selected starts after count check")
            .opcode_id,
    })
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifabilitypresentExecution<'a> {
    pub ability_expression: &'a str,
    pub jump_target_expression: &'a str,
    pub resolved_jump_program_counter: Option<u32>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptJumpifabilitypresentControl {
    Advance,
    Jump { program_counter: u32 },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifabilitypresentOutcome {
    pub rules: BattleScriptJumpifabilitypresentRules,
    pub control: BattleScriptJumpifabilitypresentControl,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptJumpifabilitypresentError<'a> {
    UnvalidatedAbilityOperand { expression: &'a str },
    UnresolvedJumpTarget { expression: &'a str },
}

impl fmt::Display for BattleScriptJumpifabilitypresentError<'_> {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::UnvalidatedAbilityOperand { expression } => write!(
                formatter,
                "Cmd_jumpifabilitypresent: unvalidated ability operand {expression}"
            ),
            Self::UnresolvedJumpTarget { expression } => write!(
                formatter,
                "Cmd_jumpifabilitypresent: unresolved jump target {expression}"
            ),
        }
    }
}

impl std::error::Error for BattleScriptJumpifabilitypresentError<'_> {}

#[must_use]
pub fn battle_script_jumpifabilitypresent_ability_present_on_field(
    rules: &BattleScriptJumpifabilitypresentRules,
    ability: BattleScriptJumpifabilitypresentAbility,
) -> bool {
    rules.battlers[..rules.battlers_count.get()]
        .iter()
        .any(|battler| battler.ability == ability.id() && battler.hp != 0)
}

pub fn apply_battle_script_jumpifabilitypresent<'a>(
    execution: BattleScriptJumpifabilitypresentExecution<'a>,
    rules: &BattleScriptJumpifabilitypresentRules,
) -> Result<BattleScriptJumpifabilitypresentOutcome, BattleScriptJumpifabilitypresentError<'a>> {
    let ability =
        battle_script_jumpifabilitypresent_ability_from_expression(execution.ability_expression)
            .ok_or(
                BattleScriptJumpifabilitypresentError::UnvalidatedAbilityOperand {
                    expression: execution.ability_expression,
                },
            )?;
    if !battle_script_jumpifabilitypresent_ability_present_on_field(rules, ability) {
        return Ok(BattleScriptJumpifabilitypresentOutcome {
            rules: *rules,
            control: BattleScriptJumpifabilitypresentControl::Advance,
        });
    }
    let program_counter = execution.resolved_jump_program_counter.ok_or(
        BattleScriptJumpifabilitypresentError::UnresolvedJumpTarget {
            expression: execution.jump_target_expression,
        },
    )?;
    Ok(BattleScriptJumpifabilitypresentOutcome {
        rules: *rules,
        control: BattleScriptJumpifabilitypresentControl::Jump { program_counter },
    })
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifabilitypresentDecompDispatchEvidence {
    pub opcode_name: &'static str,
    pub opcode_id: u8,
    pub dispatcher: &'static str,
    pub dispatch_line: u32,
    pub handler_line: u32,
    pub ability_effect_line: u32,
    pub jump_line: u32,
    pub advance_line: u32,
    pub field_scan_case_line: u32,
    pub topology_loop_line: u32,
    pub living_match_line: u32,
}

pub const BATTLE_SCRIPT_JUMPIFABILITYPRESENT_DECOMP_DISPATCH_EVIDENCE:
    BattleScriptJumpifabilitypresentDecompDispatchEvidence =
    BattleScriptJumpifabilitypresentDecompDispatchEvidence {
        opcode_name: BATTLE_SCRIPT_JUMPIFABILITYPRESENT_OPCODE_NAME,
        opcode_id: BATTLE_SCRIPT_JUMPIFABILITYPRESENT_OPCODE,
        dispatcher: BATTLE_SCRIPT_JUMPIFABILITYPRESENT_DISPATCHER,
        dispatch_line: 398,
        handler_line: 3991,
        ability_effect_line: 3993,
        jump_line: 3994,
        advance_line: 3996,
        field_scan_case_line: 3140,
        topology_loop_line: 3141,
        living_match_line: 3143,
    };

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifabilitypresentMacroEvidence {
    pub declaration_line: u32,
    pub opcode_line: u32,
    pub ability_line: u32,
    pub pointer_line: u32,
    pub encoded_width_bytes: u8,
}

pub const BATTLE_SCRIPT_JUMPIFABILITYPRESENT_MACRO_EVIDENCE:
    BattleScriptJumpifabilitypresentMacroEvidence = BattleScriptJumpifabilitypresentMacroEvidence {
    declaration_line: 373,
    opcode_line: 374,
    ability_line: 375,
    pointer_line: 376,
    encoded_width_bytes: BATTLE_SCRIPT_JUMPIFABILITYPRESENT_ENCODED_WIDTH_BYTES,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifabilitypresentCallSiteEvidence {
    pub entry_label: &'static str,
    pub entry_label_line: u32,
    pub statement_line: u32,
    pub instruction_program_counter: u32,
    pub ability_expression: &'static str,
    pub ability_id: u8,
    pub target_expression: &'static str,
    pub target_program_counter: u32,
}

pub const BATTLE_SCRIPT_JUMPIFABILITYPRESENT_CALL_SITE_EVIDENCE:
    [BattleScriptJumpifabilitypresentCallSiteEvidence;
        BATTLE_SCRIPT_JUMPIFABILITYPRESENT_CONCRETE_START_COUNT] = [
    BattleScriptJumpifabilitypresentCallSiteEvidence {
        entry_label: "BattleScript_EffectSolarBeam",
        entry_label_line: 1903,
        statement_line: 1904,
        instruction_program_counter: 1317,
        ability_expression: "ABILITY_CLOUD_NINE",
        ability_id: 13,
        target_expression: BATTLE_SCRIPT_JUMPIFABILITYPRESENT_TARGET_LABEL,
        target_program_counter: BATTLE_SCRIPT_JUMPIFABILITYPRESENT_TARGET_PROGRAM_COUNTER,
    },
    BattleScriptJumpifabilitypresentCallSiteEvidence {
        entry_label: "BattleScript_EffectSolarBeam",
        entry_label_line: 1903,
        statement_line: 1905,
        instruction_program_counter: 1318,
        ability_expression: "ABILITY_AIR_LOCK",
        ability_id: 77,
        target_expression: BATTLE_SCRIPT_JUMPIFABILITYPRESENT_TARGET_LABEL,
        target_program_counter: BATTLE_SCRIPT_JUMPIFABILITYPRESENT_TARGET_PROGRAM_COUNTER,
    },
];
