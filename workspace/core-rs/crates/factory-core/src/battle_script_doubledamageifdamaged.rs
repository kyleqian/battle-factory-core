//! Pure B_SCR_OP_DOUBLEDAMAGEDEALTIFDAMAGED decision, state transformation,
//! and control result.
//!
//! This is the intentionally narrow state surface of
//! src/engine/battleScriptDoubleDamageIfDamagedOpcode.ts, separated from that
//! module's opcode registration and the generic Battle Script machine. The
//! canonical handler resolves the optional attacker role first, then the
//! optional target role, before reading the attacker's ProtectStruct receipt.
//! A nonzero physical or special receipt qualifies only when its recorded
//! owner is the target. A qualifying receipt overwrites dmgMultiplier with
//! two; a non-qualifying receipt preserves it. Every successful path advances.
//!
//! Source authority is Cmd_doubledamagedealtifdamaged in
//! reference/pokeemerald/src/battle_script_commands.c:9339-9349. ProtectStruct
//! declares physicalDmg, specialDmg, physicalBattlerId, and specialBattlerId
//! at reference/pokeemerald/include/battle.h:126-129. The canonical TypeScript
//! rules projection intentionally validates both damage receipts with
//! requireSigned32 at src/engine/battleScriptRulesContext.ts:2359-2375, so this
//! narrow port retains its signed i32 domain rather than reinterpreting source
//! storage.
//!
//! This leaf deliberately owns neither absolute program counters, opcode
//! registration, a generic BattleState reducer, damage calculation, RNG,
//! scheduler state, controller state, nor presentation.

use core::fmt;

/// Source MAX_BATTLERS_COUNT; the canonical TypeScript rules projection always
/// carries four source-indexed battler receipt records.
pub const BATTLE_SCRIPT_DOUBLEDAMAGEIFDAMAGED_BATTLER_COUNT: usize = 4;

/// Source gBattleScripting.dmgMultiplier assignment in
/// Cmd_doubledamagedealtifdamaged.
pub const BATTLE_SCRIPT_DOUBLEDAMAGEIFDAMAGED_QUALIFYING_MULTIPLIER: u8 = 2;

/// The complete source BattleScriptBattlerId domain used by attacker, target,
/// receipt-owner bindings, and the indexed ProtectStruct projection.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum BattleScriptDoubledamageifdamagedBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

/// Canonical fixed battler domain retained for source-array iteration and
/// tests that ratchet all role and receipt-owner values.
pub const BATTLE_SCRIPT_DOUBLEDAMAGEIFDAMAGED_BATTLERS: [BattleScriptDoubledamageifdamagedBattler;
    BATTLE_SCRIPT_DOUBLEDAMAGEIFDAMAGED_BATTLER_COUNT] = [
    BattleScriptDoubledamageifdamagedBattler::Battler0,
    BattleScriptDoubledamageifdamagedBattler::Battler1,
    BattleScriptDoubledamageifdamagedBattler::Battler2,
    BattleScriptDoubledamageifdamagedBattler::Battler3,
];

impl BattleScriptDoubledamageifdamagedBattler {
    /// Zero-based source array index.
    #[must_use]
    pub const fn index(self) -> usize {
        self as usize
    }

    /// Source u8 battler id.
    #[must_use]
    pub const fn as_u8(self) -> u8 {
        self as u8
    }
}

/// The selector bindings read by the canonical opcode handler.
///
/// Both None variants are typed-reachable in BattleScriptSelectorRoleBindings.
/// Keeping them distinct retains the exact source order: attacker is required
/// before target, and both are required before receipt indexing.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptDoubledamageifdamagedRoles {
    pub attacker: Option<BattleScriptDoubledamageifdamagedBattler>,
    pub target: Option<BattleScriptDoubledamageifdamagedBattler>,
}

/// The complete ProtectStruct receipt projection read by this opcode for each
/// source battler slot.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptDoubledamageifdamagedBattlerState {
    /// Canonical ProtectStruct::physicalDmg projection, validated by
    /// requireSigned32 in the TypeScript rules context.
    pub protect_physical_dmg: i32,
    /// Canonical ProtectStruct::physicalBattlerId projection.
    pub protect_physical_battler_id: BattleScriptDoubledamageifdamagedBattler,
    /// Canonical ProtectStruct::specialDmg projection, validated by
    /// requireSigned32 in the TypeScript rules context.
    pub protect_special_dmg: i32,
    /// Canonical ProtectStruct::specialBattlerId projection.
    pub protect_special_battler_id: BattleScriptDoubledamageifdamagedBattler,
}

/// Complete narrow projection read or written by the opcode. It holds the
/// four ProtectStruct receipts, the source u8 damage multiplier, and the two
/// selector role bindings this leaf needs; it is not a generic BattleState
/// substitute.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptDoubledamageifdamagedRules {
    pub battlers: [BattleScriptDoubledamageifdamagedBattlerState;
        BATTLE_SCRIPT_DOUBLEDAMAGEIFDAMAGED_BATTLER_COUNT],
    /// Canonical rulesContext.dmgMultiplier, validated as an unsigned byte by
    /// src/engine/battleScriptRulesContext.ts:2620.
    pub dmg_multiplier: u8,
    pub selector_roles: BattleScriptDoubledamageifdamagedRoles,
}

/// The sole control result for this unconditional, operand-free command.
/// Absolute program counters stay in the machine layer this leaf does not
/// model.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptDoubledamageifdamagedControl {
    Advance,
}

/// Complete projected result of one successful handler invocation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptDoubledamageifdamagedOutcome {
    pub rules: BattleScriptDoubledamageifdamagedRules,
    pub control: BattleScriptDoubledamageifdamagedControl,
}

/// Exact typed-reachable errors thrown by the canonical handler's ordered
/// requireBattlerRole calls.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptDoubledamageifdamagedError {
    MissingAttackerRole,
    MissingTargetRole,
}

impl fmt::Display for BattleScriptDoubledamageifdamagedError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::MissingAttackerRole => {
                write!(
                    formatter,
                    "Battle Script hit-chain command requires a attacker role"
                )
            }
            Self::MissingTargetRole => {
                write!(
                    formatter,
                    "Battle Script hit-chain command requires a target role"
                )
            }
        }
    }
}

impl std::error::Error for BattleScriptDoubledamageifdamagedError {}

/// Native immutable-value twin of the pure decision, state transformation,
/// and control result performed by Cmd_doubledamagedealtifdamaged's TypeScript
/// handler.
///
/// Role resolution intentionally comes first and preserves the canonical
/// attacker-before-target error order. Once both roles exist, the attacker's
/// physical receipt is considered before its special receipt. A qualifying
/// nonzero receipt owned by the target overwrites only dmg_multiplier with
/// two. A no-match result retains every projected value, including a prior
/// multiplier that is already two. Both successful paths advance.
pub fn apply_battle_script_doubledamageifdamaged(
    rules: &BattleScriptDoubledamageifdamagedRules,
) -> Result<BattleScriptDoubledamageifdamagedOutcome, BattleScriptDoubledamageifdamagedError> {
    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptDoubledamageifdamagedError::MissingAttackerRole)?;
    let target = rules
        .selector_roles
        .target
        .ok_or(BattleScriptDoubledamageifdamagedError::MissingTargetRole)?;
    let receipt = rules.battlers[attacker.index()];
    let damaged_by_target = (receipt.protect_physical_dmg != 0
        && receipt.protect_physical_battler_id == target)
        || (receipt.protect_special_dmg != 0 && receipt.protect_special_battler_id == target);

    let mut next = *rules;
    if damaged_by_target {
        next.dmg_multiplier = BATTLE_SCRIPT_DOUBLEDAMAGEIFDAMAGED_QUALIFYING_MULTIPLIER;
    }

    Ok(BattleScriptDoubledamageifdamagedOutcome {
        rules: next,
        control: BattleScriptDoubledamageifdamagedControl::Advance,
    })
}
