//! Pure `B_SCR_OP_ORWORD` registration and `Cmd_orword` state projection.
//!
//! This is the narrow native twin of
//! `src/engine/battleScriptOrwordOpcode.ts`. Registration deliberately scans
//! every source-complete concrete start before returning the **first** opcode
//! id, just as the canonical TypeScript handler-map creation does. The command
//! itself only decodes its already-validated value expression, ORs it into the
//! sole supported pointer (`gHitMarker`), and advances.
//!
//! Source authority is `Cmd_orword` at
//! `reference/pokeemerald/src/battle_script_commands.c:3880-3887`, its `0x35`
//! dispatch at `:384`, the nine-byte macro at
//! `reference/pokeemerald/asm/macros/battle_script.inc:302-306`, and all 43
//! program sites in `reference/pokeemerald/data/battle_scripts_1.s`.

use core::fmt;

pub const BATTLE_SCRIPT_ORWORD_OPCODE_NAME: &str = "B_SCR_OP_ORWORD";
pub const BATTLE_SCRIPT_ORWORD_OPCODE: u8 = 0x35;
pub const BATTLE_SCRIPT_ORWORD_DISPATCHER: &str = "Cmd_orword";
pub const BATTLE_SCRIPT_ORWORD_POINTER_WIDTH_BYTES: u8 = 4;
pub const BATTLE_SCRIPT_ORWORD_VALUE_WIDTH_BYTES: u8 = 4;
pub const BATTLE_SCRIPT_ORWORD_ENCODED_WIDTH_BYTES: u8 = 9;
pub const BATTLE_SCRIPT_ORWORD_CONCRETE_START_COUNT: usize = 43;
pub const BATTLE_SCRIPT_ORWORD_POINTER_EXPRESSION: &str = "gHitMarker";
pub const BATTLE_SCRIPT_ORWORD_BATTLER_COUNT: usize = 4;

/// `HITMARKER_IGNORE_BIDE` from `include/constants/battle.h:182`.
pub const BATTLE_SCRIPT_HITMARKER_IGNORE_BIDE: u32 = 1 << 5;
/// `HITMARKER_IGNORE_SUBSTITUTE` from `include/constants/battle.h:185`.
pub const BATTLE_SCRIPT_HITMARKER_IGNORE_SUBSTITUTE: u32 = 1 << 8;
/// `HITMARKER_ATTACKSTRING_PRINTED` from `include/constants/battle.h:187`.
pub const BATTLE_SCRIPT_HITMARKER_ATTACKSTRING_PRINTED: u32 = 1 << 10;
/// `HITMARKER_NO_PPDEDUCT` from `include/constants/battle.h:188`.
pub const BATTLE_SCRIPT_HITMARKER_NO_PPDEDUCT: u32 = 1 << 11;
/// `HITMARKER_IGNORE_ON_AIR` from `include/constants/battle.h:193`.
pub const BATTLE_SCRIPT_HITMARKER_IGNORE_ON_AIR: u32 = 1 << 16;
/// `HITMARKER_IGNORE_UNDERGROUND` from `include/constants/battle.h:194`.
pub const BATTLE_SCRIPT_HITMARKER_IGNORE_UNDERGROUND: u32 = 1 << 17;
/// `HITMARKER_IGNORE_UNDERWATER` from `include/constants/battle.h:195`.
pub const BATTLE_SCRIPT_HITMARKER_IGNORE_UNDERWATER: u32 = 1 << 18;
/// `HITMARKER_PASSIVE_HP_UPDATE` from `include/constants/battle.h:197`.
pub const BATTLE_SCRIPT_HITMARKER_PASSIVE_HP_UPDATE: u32 = 1 << 20;
/// `HITMARKER_ALLOW_NO_PP` from `include/constants/battle.h:200`.
pub const BATTLE_SCRIPT_HITMARKER_ALLOW_NO_PP: u32 = 1 << 23;
/// `HITMARKER_GRUDGE` from `include/constants/battle.h:201`.
pub const BATTLE_SCRIPT_HITMARKER_GRUDGE: u32 = 1 << 24;
/// `HITMARKER_CHARGING` from `include/constants/battle.h:204`.
pub const BATTLE_SCRIPT_HITMARKER_CHARGING: u32 = 1 << 27;

/// The complete named-term domain accepted by the canonical TypeScript
/// resolver. Ordering intentionally mirrors its `Map` declaration.
pub const BATTLE_SCRIPT_ORWORD_HITMARKER_TERMS: [(&str, u32); 11] = [
    ("HITMARKER_IGNORE_BIDE", BATTLE_SCRIPT_HITMARKER_IGNORE_BIDE),
    (
        "HITMARKER_IGNORE_SUBSTITUTE",
        BATTLE_SCRIPT_HITMARKER_IGNORE_SUBSTITUTE,
    ),
    (
        "HITMARKER_ATTACKSTRING_PRINTED",
        BATTLE_SCRIPT_HITMARKER_ATTACKSTRING_PRINTED,
    ),
    ("HITMARKER_NO_PPDEDUCT", BATTLE_SCRIPT_HITMARKER_NO_PPDEDUCT),
    (
        "HITMARKER_IGNORE_ON_AIR",
        BATTLE_SCRIPT_HITMARKER_IGNORE_ON_AIR,
    ),
    (
        "HITMARKER_IGNORE_UNDERGROUND",
        BATTLE_SCRIPT_HITMARKER_IGNORE_UNDERGROUND,
    ),
    (
        "HITMARKER_IGNORE_UNDERWATER",
        BATTLE_SCRIPT_HITMARKER_IGNORE_UNDERWATER,
    ),
    (
        "HITMARKER_PASSIVE_HP_UPDATE",
        BATTLE_SCRIPT_HITMARKER_PASSIVE_HP_UPDATE,
    ),
    ("HITMARKER_GRUDGE", BATTLE_SCRIPT_HITMARKER_GRUDGE),
    ("HITMARKER_ALLOW_NO_PP", BATTLE_SCRIPT_HITMARKER_ALLOW_NO_PP),
    ("HITMARKER_CHARGING", BATTLE_SCRIPT_HITMARKER_CHARGING),
];

/// Narrow, source-indexed battler projection retained to make the command's
/// strict no-write boundary executable.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptOrwordBattlerState {
    pub side: u8,
    pub ability: u8,
    pub hp: u16,
    pub max_hp: u16,
    pub moves: [u16; 4],
    pub pp: [u8; 4],
    pub status1: u32,
    pub status2: u32,
    pub status3: u32,
    pub item: u16,
    pub stat_stages: [i8; 8],
    pub party_index: u8,
}

/// Source selector bindings. `Cmd_orword` reads none of them; all remain in
/// the projection so its immutable sibling boundary is testable.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptOrwordRoles {
    pub attacker: Option<u8>,
    pub target: Option<u8>,
    pub effect_battler: Option<u8>,
    pub fainted: Option<u8>,
}

/// Other source-shaped rules values deliberately carried unchanged through
/// this leaf. This is a narrow projection, not a replacement BattleState.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptOrwordSiblings {
    pub scripting_battler: u8,
    pub battler_with_ability: u8,
    pub atk_canceler_tracker: u8,
    pub battle_outcome: u8,
    pub current_move: u16,
    pub current_move_position: u8,
    pub move_result_flags: u8,
    pub dmg_multiplier: u8,
    pub crit_multiplier: u8,
    pub move_effect_byte: u8,
    pub miss_type: u8,
    pub multi_hit_counter: u8,
    pub battle_move_damage: i32,
    pub pain_split_hp: i32,
    pub bide_dmg: [i32; BATTLE_SCRIPT_ORWORD_BATTLER_COUNT],
    pub locked_moves: [u16; BATTLE_SCRIPT_ORWORD_BATTLER_COUNT],
    pub chosen_move_positions: [u8; BATTLE_SCRIPT_ORWORD_BATTLER_COUNT],
    pub side_statuses: [u32; 2],
    pub weather: u32,
    pub weather_timer: u8,
    pub random_turn_number: u16,
}

/// Complete narrow projection mutated by `Cmd_orword`: only `hit_marker`
/// changes on success.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptOrwordRules {
    pub battlers: [BattleScriptOrwordBattlerState; BATTLE_SCRIPT_ORWORD_BATTLER_COUNT],
    pub selector_roles: BattleScriptOrwordRoles,
    pub siblings: BattleScriptOrwordSiblings,
    pub hit_marker: u32,
}

/// One source macro operand used by eager registration and direct handler
/// evaluation. The runtime handler accepts the already-validated instruction
/// shape, matching the TypeScript closure's registration precondition.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptOrwordOperand<'a> {
    pub width_bytes: u8,
    pub expression: &'a str,
}

/// Program instruction projection. `dispatcher` is preserved as program
/// provenance but is intentionally not registration-validated: canonical
/// TypeScript filters only `opcodeName`, then checks operand shape/pointer/
/// value and returns the first selected opcode id.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptOrwordInstruction<'a> {
    pub opcode_name: &'a str,
    pub program_counter: u32,
    pub opcode_id: u8,
    pub dispatcher: &'a str,
    pub operands: &'a [BattleScriptOrwordOperand<'a>],
}

/// The sole dynamic handler-map binding produced by successful registration.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptOrwordRegistration {
    pub opcode_id: u8,
}

/// `Cmd_orword` always uses the generic script-command advance control.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptOrwordControl {
    Advance,
}

/// Complete immutable successful result.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptOrwordOutcome {
    pub rules: BattleScriptOrwordRules,
    pub control: BattleScriptOrwordControl,
}

/// Exact eager-registration failures in canonical evaluation order.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptOrwordRegistrationError<'a> {
    WrongCardinality { count: usize },
    InvalidInstructionShape { program_counter: u32 },
    UnknownPointer { expression: &'a str },
    UnknownValue { expression: &'a str },
}

impl fmt::Display for BattleScriptOrwordRegistrationError<'_> {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::WrongCardinality { count } => write!(
                formatter,
                "B_SCR_OP_ORWORD requires all 43 concrete starts, got {count}"
            ),
            Self::InvalidInstructionShape { program_counter } => write!(
                formatter,
                "invalid B_SCR_OP_ORWORD shape at program counter {program_counter}"
            ),
            Self::UnknownPointer { expression } => {
                write!(formatter, "unknown B_SCR_OP_ORWORD pointer {expression}")
            }
            Self::UnknownValue { expression } => {
                write!(formatter, "unknown B_SCR_OP_ORWORD value {expression}")
            }
        }
    }
}

impl std::error::Error for BattleScriptOrwordRegistrationError<'_> {}

/// This is reachable only if a caller bypasses successful registration or a
/// previously validated source program changes under a live handler.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptOrwordError {
    ValidatedInstructionBecameUndecodable { program_counter: u32 },
}

impl fmt::Display for BattleScriptOrwordError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ValidatedInstructionBecameUndecodable { program_counter } => write!(
                formatter,
                "validated B_SCR_OP_ORWORD became undecodable at {program_counter}"
            ),
        }
    }
}

impl std::error::Error for BattleScriptOrwordError {}

/// Canonical `resolveOrwordValue`: split literal source text on `|`, trim each
/// term, reject the entire expression on the first unknown term, and combine
/// values using unsigned 32-bit OR semantics.
#[must_use]
pub fn resolve_battle_script_orword_value(expression: &str) -> Option<u32> {
    let mut result = 0_u32;
    for term in expression.split('|') {
        let bit = BATTLE_SCRIPT_ORWORD_HITMARKER_TERMS
            .iter()
            .find_map(|(name, value)| (*name == term.trim()).then_some(*value))?;
        result |= bit;
    }
    Some(result)
}

fn validate_instruction<'a>(
    instruction: BattleScriptOrwordInstruction<'a>,
) -> Result<(), BattleScriptOrwordRegistrationError<'a>> {
    let [pointer, value] = instruction.operands else {
        return Err(
            BattleScriptOrwordRegistrationError::InvalidInstructionShape {
                program_counter: instruction.program_counter,
            },
        );
    };
    if pointer.width_bytes != BATTLE_SCRIPT_ORWORD_POINTER_WIDTH_BYTES
        || value.width_bytes != BATTLE_SCRIPT_ORWORD_VALUE_WIDTH_BYTES
    {
        return Err(
            BattleScriptOrwordRegistrationError::InvalidInstructionShape {
                program_counter: instruction.program_counter,
            },
        );
    }
    if pointer.expression != BATTLE_SCRIPT_ORWORD_POINTER_EXPRESSION {
        return Err(BattleScriptOrwordRegistrationError::UnknownPointer {
            expression: pointer.expression,
        });
    }
    if resolve_battle_script_orword_value(value.expression).is_none() {
        return Err(BattleScriptOrwordRegistrationError::UnknownValue {
            expression: value.expression,
        });
    }
    Ok(())
}

/// Native projection of `createBattleScriptOrwordOpcodeHandlers(program)`.
///
/// It deliberately does not validate the selected instructions' opcode ids or
/// dispatcher names; TypeScript neither reads them during this registration
/// pass nor requires all starts to agree. After the cardinality guard, every
/// selected start is validated in input order, and the first selected opcode
/// id becomes the only handler-map key.
pub fn register_battle_script_orword_handler<'a>(
    instructions: &[BattleScriptOrwordInstruction<'a>],
) -> Result<BattleScriptOrwordRegistration, BattleScriptOrwordRegistrationError<'a>> {
    let matching = instructions
        .iter()
        .filter(|instruction| instruction.opcode_name == BATTLE_SCRIPT_ORWORD_OPCODE_NAME)
        .collect::<Vec<_>>();
    if matching.len() != BATTLE_SCRIPT_ORWORD_CONCRETE_START_COUNT {
        return Err(BattleScriptOrwordRegistrationError::WrongCardinality {
            count: matching.len(),
        });
    }
    for instruction in &matching {
        validate_instruction(**instruction)?;
    }
    Ok(BattleScriptOrwordRegistration { opcode_id: matching[0].opcode_id })
}

/// Native immutable-value twin of the registered TypeScript handler. It only
/// reads the second operand because the pointer/shape were already proven at
/// registration; a late unknown expression retains the canonical error text.
pub fn apply_battle_script_orword(
    instruction: BattleScriptOrwordInstruction<'_>,
    rules: &BattleScriptOrwordRules,
) -> Result<BattleScriptOrwordOutcome, BattleScriptOrwordError> {
    let value = instruction
        .operands
        .get(1)
        .and_then(|operand| resolve_battle_script_orword_value(operand.expression))
        .ok_or(
            BattleScriptOrwordError::ValidatedInstructionBecameUndecodable {
                program_counter: instruction.program_counter,
            },
        )?;
    let mut next_rules = *rules;
    next_rules.hit_marker |= value;
    Ok(
        BattleScriptOrwordOutcome {
            rules: next_rules,
            control: BattleScriptOrwordControl::Advance,
        },
    )
}

/// Source-line anchors read independently by the metadata ratchet.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptOrwordSourceMetadata {
    pub dispatch_line: u16,
    pub handler_line: u16,
    pub pointer_read_line: u16,
    pub value_read_line: u16,
    pub or_write_line: u16,
    pub advance_line: u16,
    pub macro_declaration_line: u16,
    pub macro_opcode_line: u16,
    pub macro_pointer_line: u16,
    pub macro_value_line: u16,
}

pub const BATTLE_SCRIPT_ORWORD_SOURCE_METADATA: BattleScriptOrwordSourceMetadata =
    BattleScriptOrwordSourceMetadata {
        dispatch_line: 384,
        handler_line: 3880,
        pointer_read_line: 3882,
        value_read_line: 3883,
        or_write_line: 3885,
        advance_line: 3886,
        macro_declaration_line: 302,
        macro_opcode_line: 303,
        macro_pointer_line: 304,
        macro_value_line: 305,
    };
