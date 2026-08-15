//! Pure `B_SCR_OP_RECOVERBASEDONSUNLIGHT` registration and handler leaf.
//!
//! This is the machine-independent port of canonical
//! `battleScriptRecoverbasedonsunlightOpcode.ts`. Registration deliberately
//! mirrors `Array.find`: the first opcode-name match wins, duplicates and a
//! malformed selected instruction are accepted, and only a missing name is an
//! error. The handler requires attacker, always rebinds target to it, then
//! uses exact `hp == maxHP` equality. Full HP resolves operand zero late,
//! jumps, and preserves prior damage. Every non-full value (including corrupt
//! `hp > maxHP`) writes a negative weather-scaled heal and advances.
//!
//! `WEATHER_HAS_EFFECT` uses the canonical `abilityPresentOnField` semantics:
//! scan only `0..battlersCount`, require nonzero HP, and compare the effective
//! ability field. `absentBattlerFlags` is intentionally not consulted by that
//! canonical helper. Cloud Nine (13) and Air Lock (77) both suppress weather.
//! No RNG, events, scheduler, presentation, or WASM ABI is owned here.

use core::fmt;

pub const BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_BATTLER_COUNT: usize = 4;
pub const BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_OPCODE_NAME: &str =
    "B_SCR_OP_RECOVERBASEDONSUNLIGHT";
pub const BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_OPCODE: u8 = 0xc0;
pub const BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_DISPATCHER: &str = "Cmd_recoverbasedonsunlight";
pub const BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_POINTER_WIDTH_BYTES: u8 = 4;
pub const BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_ENCODED_WIDTH_BYTES: u8 = 5;
pub const BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_FULL_HP_LABEL: &str = "BattleScript_AlreadyAtFullHp";
pub const BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_EFFECT_LABELS: [&str; 3] = [
    "BattleScript_EffectMorningSun",
    "BattleScript_EffectSynthesis",
    "BattleScript_EffectMoonlight",
];
pub const BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_ABILITY_CLOUD_NINE: u8 = 13;
pub const BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_ABILITY_AIR_LOCK: u8 = 77;
pub const BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_WEATHER_SUN: u32 = (1 << 5) | (1 << 6);

#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptRecoverbasedonsunlightBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

pub const BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_BATTLERS:
    [BattleScriptRecoverbasedonsunlightBattler; 4] = [
    BattleScriptRecoverbasedonsunlightBattler::Battler0,
    BattleScriptRecoverbasedonsunlightBattler::Battler1,
    BattleScriptRecoverbasedonsunlightBattler::Battler2,
    BattleScriptRecoverbasedonsunlightBattler::Battler3,
];

impl BattleScriptRecoverbasedonsunlightBattler {
    #[must_use]
    pub const fn index(self) -> usize {
        self as usize
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptRecoverbasedonsunlightBattlerState {
    /// The effective ability observed by canonical `abilityPresentOnField`.
    pub ability: u8,
    pub hp: u16,
    pub max_hp: u16,
    /// Representative untouched battler payload.
    pub status1: u32,
    pub status2: u32,
    pub status3: u32,
    pub item: u16,
    pub moves: [u16; 4],
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptRecoverbasedonsunlightRoles {
    pub attacker: Option<BattleScriptRecoverbasedonsunlightBattler>,
    pub target: Option<BattleScriptRecoverbasedonsunlightBattler>,
    pub effect_battler: Option<BattleScriptRecoverbasedonsunlightBattler>,
    pub fainted: Option<BattleScriptRecoverbasedonsunlightBattler>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptRecoverbasedonsunlightSiblings {
    /// Canonical domain is exactly 2 or 4; retained as a source-width value so
    /// the pure leaf can be tested without widening the shared ABI.
    pub battlers_count: u8,
    /// Preserved and intentionally ignored by `abilityPresentOnField`.
    pub absent_battler_flags: u8,
    pub weather: u32,
    pub weather_timer: u8,
    pub current_move: u16,
    pub move_result_flags: u32,
    pub hit_marker: u32,
    pub side_statuses: [u32; 2],
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptRecoverbasedonsunlightRules {
    pub battlers: [BattleScriptRecoverbasedonsunlightBattlerState; 4],
    pub selector_roles: BattleScriptRecoverbasedonsunlightRoles,
    pub battle_move_damage: i32,
    pub siblings: BattleScriptRecoverbasedonsunlightSiblings,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptRecoverbasedonsunlightOperand<'a> {
    pub width_bytes: u8,
    pub expression: &'a str,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptRecoverbasedonsunlightInstruction<'a> {
    pub opcode_name: &'a str,
    pub program_counter: u32,
    pub opcode_id: u8,
    pub dispatcher: &'a str,
    pub operands: &'a [BattleScriptRecoverbasedonsunlightOperand<'a>],
    /// The surrounding machine's resolution of operand zero.
    pub resolved_failure_target: Option<&'a str>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptRecoverbasedonsunlightRegistration {
    pub opcode_id: u8,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptRecoverbasedonsunlightControl {
    Advance,
    FailJump,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptRecoverbasedonsunlightOutcome {
    pub rules: BattleScriptRecoverbasedonsunlightRules,
    pub control: BattleScriptRecoverbasedonsunlightControl,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptRecoverbasedonsunlightRegistrationError {
    MissingConcreteInstruction,
}

impl fmt::Display for BattleScriptRecoverbasedonsunlightRegistrationError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "committed Battle Script program does not emit B_SCR_OP_RECOVERBASEDONSUNLIGHT"
        )
    }
}

impl std::error::Error for BattleScriptRecoverbasedonsunlightRegistrationError {}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptRecoverbasedonsunlightError<'a> {
    MissingAttackerRole,
    UnresolvedJumpTarget { expression: &'a str },
}

impl fmt::Display for BattleScriptRecoverbasedonsunlightError<'_> {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::MissingAttackerRole => {
                write!(
                    f,
                    "Battle Script hit-chain command requires a attacker role"
                )
            }
            Self::UnresolvedJumpTarget { expression } => write!(
                f,
                "Cmd_recoverbasedonsunlight: unresolved jump target {expression}"
            ),
        }
    }
}

impl std::error::Error for BattleScriptRecoverbasedonsunlightError<'_> {}

/// Canonical `Array.find` registration projection. No selected-instruction
/// shape, cardinality, opcode-id, dispatcher, or operand predicate is added.
pub fn register_battle_script_recoverbasedonsunlight_handler(
    instructions: &[BattleScriptRecoverbasedonsunlightInstruction<'_>],
) -> Result<
    BattleScriptRecoverbasedonsunlightRegistration,
    BattleScriptRecoverbasedonsunlightRegistrationError,
> {
    let instruction = instructions
        .iter()
        .find(|instruction| {
            instruction.opcode_name == BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_OPCODE_NAME
        })
        .ok_or(BattleScriptRecoverbasedonsunlightRegistrationError::MissingConcreteInstruction)?;
    Ok(BattleScriptRecoverbasedonsunlightRegistration { opcode_id: instruction.opcode_id })
}

/// Canonical field scan shared with `Cmd_jumpifabilitypresent`: only present
/// topology slots, nonzero HP, and the effective ability field participate.
#[must_use]
pub fn battle_script_recoverbasedonsunlight_ability_present_on_field(
    rules: &BattleScriptRecoverbasedonsunlightRules,
    ability: u8,
) -> bool {
    rules.battlers[..usize::from(rules.siblings.battlers_count)]
        .iter()
        .any(|battler| battler.ability == ability && battler.hp != 0)
}

#[must_use]
pub fn battle_script_recoverbasedonsunlight_weather_has_effect(
    rules: &BattleScriptRecoverbasedonsunlightRules,
) -> bool {
    !battle_script_recoverbasedonsunlight_ability_present_on_field(
        rules,
        BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_ABILITY_CLOUD_NINE,
    ) && !battle_script_recoverbasedonsunlight_ability_present_on_field(
        rules,
        BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_ABILITY_AIR_LOCK,
    )
}

/// Positive heal amount, preserving source arithmetic order (`20*maxHP/30`).
#[must_use]
pub fn battle_script_recoverbasedonsunlight_heal(
    max_hp: u16,
    weather: u32,
    weather_has_effect: bool,
) -> u16 {
    let raw = if weather == 0 || !weather_has_effect {
        u32::from(max_hp) / 2
    } else if weather & BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_WEATHER_SUN != 0 {
        20 * u32::from(max_hp) / 30
    } else {
        u32::from(max_hp) / 4
    };
    u16::try_from(raw.max(1)).expect("weather heal remains in u16")
}

/// Native immutable-value twin of `Cmd_recoverbasedonsunlight`.
pub fn apply_battle_script_recoverbasedonsunlight<'a>(
    instruction: BattleScriptRecoverbasedonsunlightInstruction<'a>,
    rules: &BattleScriptRecoverbasedonsunlightRules,
) -> Result<BattleScriptRecoverbasedonsunlightOutcome, BattleScriptRecoverbasedonsunlightError<'a>>
{
    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptRecoverbasedonsunlightError::MissingAttackerRole)?;
    let mut next = *rules;
    next.selector_roles.target = Some(attacker);
    let attacker_state = rules.battlers[attacker.index()];

    if attacker_state.hp == attacker_state.max_hp {
        let expression = instruction.operands[0].expression;
        if instruction.resolved_failure_target != Some(expression) {
            return Err(
                BattleScriptRecoverbasedonsunlightError::UnresolvedJumpTarget { expression },
            );
        }
        return Ok(BattleScriptRecoverbasedonsunlightOutcome {
            rules: next,
            control: BattleScriptRecoverbasedonsunlightControl::FailJump,
        });
    }

    let heal = battle_script_recoverbasedonsunlight_heal(
        attacker_state.max_hp,
        rules.siblings.weather,
        battle_script_recoverbasedonsunlight_weather_has_effect(rules),
    );
    next.battle_move_damage = -i32::from(heal);
    Ok(BattleScriptRecoverbasedonsunlightOutcome {
        rules: next,
        control: BattleScriptRecoverbasedonsunlightControl::Advance,
    })
}
