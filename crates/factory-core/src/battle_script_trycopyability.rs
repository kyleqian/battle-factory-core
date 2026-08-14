//! Pure `B_SCR_OP_TRYCOPYABILITY` decision, state transformation, and control
//! result.
//!
//! This is the intentionally narrow state surface of
//! `src/engine/battleScriptTrycopyabilityOpcode.ts`, separated from that
//! module's opcode registration and generic Battle Script machine. The
//! canonical handler resolves its optional attacker role before its optional
//! target role, reads the target's active ability, and either jumps without
//! changing state or copies that ability to the attacker and `gLastUsedAbility`.
//!
//! Source authority is Role Play's `Cmd_trycopyability` in
//! `reference/pokeemerald/src/battle_script_commands.c:9277-9290`. It rejects
//! exactly `ABILITY_NONE` and `ABILITY_WONDER_GUARD` (`include/constants/
//! abilities.h:4,29`), otherwise writes the active
//! `gBattleMons[gBattlerAttacker].ability` and `gLastUsedAbility`. Both source
//! ability fields are `u8`; the canonical TypeScript rules-context constructor
//! likewise accepts the complete `0..=255` domain for each active ability and
//! `lastUsedAbility`.
//!
//! The source command is five bytes: opcode `0xD3` followed by a four-byte
//! failure pointer. The TypeScript handler resolves that pointer before it
//! returns a machine transition. This leaf intentionally returns the unit-like
//! `FailJump` decision instead: it preserves the failure branch without
//! carrying, embedding, or resolving an absolute program counter.
//!
//! Party ability slots, the failure pointer, absolute program counter, opcode
//! registration, generic `BattleState`, ABI/WASM adapter/export, RNG,
//! scheduler, controller state, and presentation are deliberately outside
//! this leaf.

use core::fmt;

/// Source `MAX_BATTLERS_COUNT`; indexed source arrays retain all four slots
/// even when the Factory runs a singles battle.
pub const BATTLE_SCRIPT_TRYCOPYABILITY_BATTLER_COUNT: usize = 4;

/// `ABILITY_NONE` from `include/constants/abilities.h:4`.
pub const BATTLE_SCRIPT_TRYCOPYABILITY_ABILITY_NONE: u8 = 0;

/// `ABILITY_WONDER_GUARD` from `include/constants/abilities.h:29`.
pub const BATTLE_SCRIPT_TRYCOPYABILITY_ABILITY_WONDER_GUARD: u8 = 25;

/// The complete source `BattleScriptBattlerId` domain used by both selector
/// roles and the indexed active-battler array.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum BattleScriptTrycopyabilityBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

/// Canonical fixed battler domain retained for source-array iteration and
/// tests that ratchet every attacker/target pair.
pub const BATTLE_SCRIPT_TRYCOPYABILITY_BATTLERS: [BattleScriptTrycopyabilityBattler;
    BATTLE_SCRIPT_TRYCOPYABILITY_BATTLER_COUNT] = [
    BattleScriptTrycopyabilityBattler::Battler0,
    BattleScriptTrycopyabilityBattler::Battler1,
    BattleScriptTrycopyabilityBattler::Battler2,
    BattleScriptTrycopyabilityBattler::Battler3,
];

impl BattleScriptTrycopyabilityBattler {
    /// Zero-based source array index.
    #[must_use]
    pub const fn index(self) -> usize {
        self as usize
    }

    /// Source `u8` battler id.
    #[must_use]
    pub const fn as_u8(self) -> u8 {
        self as u8
    }
}

/// The selector bindings read by the canonical opcode handler.
///
/// Both `None` variants are typed-reachable in the canonical rules context.
/// Keeping them separate preserves the handler's exact attacker-before-target
/// error ordering before it reads any active ability.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrycopyabilityRoles {
    pub attacker: Option<BattleScriptTrycopyabilityBattler>,
    pub target: Option<BattleScriptTrycopyabilityBattler>,
}

/// The complete source-width per-active-battler projection read or written by
/// this opcode. This is deliberately an active ability, not a party ability
/// slot or ability-number derivation input.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrycopyabilityBattlerState {
    /// Source `gBattleMons[battler].ability` and canonical TypeScript active
    /// ability: the complete unsigned eight-bit domain.
    pub ability: u8,
}

/// Complete narrow projection read or written by the opcode. It retains all
/// four source-indexed active abilities, the `gLastUsedAbility` byte, and the
/// two selector bindings this leaf needs; it is not a generic `BattleState`
/// substitute.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrycopyabilityRules {
    pub battlers:
        [BattleScriptTrycopyabilityBattlerState; BATTLE_SCRIPT_TRYCOPYABILITY_BATTLER_COUNT],
    /// Source `u8 gLastUsedAbility`.
    pub last_used_ability: u8,
    pub selector_roles: BattleScriptTrycopyabilityRoles,
}

/// The machine-independent control result of this command.
///
/// `FailJump` deliberately carries no program counter. The surrounding Battle
/// Script machine owns the source operand and its absolute label resolution.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTrycopyabilityControl {
    /// The target has `ABILITY_NONE` or `ABILITY_WONDER_GUARD`, so the source
    /// command branches to its four-byte failure target without mutation.
    FailJump,
    /// The target's allowed active ability was copied to the attacker and
    /// `gLastUsedAbility`; the source command advances five bytes.
    Advance,
}

/// Complete projected result of one successful handler invocation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrycopyabilityOutcome {
    pub rules: BattleScriptTrycopyabilityRules,
    pub control: BattleScriptTrycopyabilityControl,
}

/// Exact typed-reachable errors thrown by the canonical TypeScript handler.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTrycopyabilityError {
    MissingAttackerRole,
    MissingTargetRole,
}

impl fmt::Display for BattleScriptTrycopyabilityError {
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

impl std::error::Error for BattleScriptTrycopyabilityError {}

/// Native immutable-value twin of the pure decision, state transformation,
/// and control result performed by `Cmd_trycopyability`'s TypeScript handler.
///
/// Resolution intentionally happens attacker first, then target. With both
/// roles present, only target ability `0` (`ABILITY_NONE`) and `25`
/// (`ABILITY_WONDER_GUARD`) preserve the complete narrow state and return
/// `FailJump`. Every other complete-domain `u8` ability replaces exactly the
/// active attacker's ability and `last_used_ability`, then returns `Advance`.
/// Sibling cells and both role bindings remain exact; attacker and target may
/// validly alias.
pub fn apply_battle_script_trycopyability(
    rules: &BattleScriptTrycopyabilityRules,
) -> Result<BattleScriptTrycopyabilityOutcome, BattleScriptTrycopyabilityError> {
    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptTrycopyabilityError::MissingAttackerRole)?;
    let target = rules
        .selector_roles
        .target
        .ok_or(BattleScriptTrycopyabilityError::MissingTargetRole)?;

    let ability = rules.battlers[target.index()].ability;
    if ability == BATTLE_SCRIPT_TRYCOPYABILITY_ABILITY_NONE
        || ability == BATTLE_SCRIPT_TRYCOPYABILITY_ABILITY_WONDER_GUARD
    {
        return Ok(BattleScriptTrycopyabilityOutcome {
            rules: *rules,
            control: BattleScriptTrycopyabilityControl::FailJump,
        });
    }

    let mut next = *rules;
    next.battlers[attacker.index()].ability = ability;
    next.last_used_ability = ability;
    Ok(BattleScriptTrycopyabilityOutcome {
        rules: next,
        control: BattleScriptTrycopyabilityControl::Advance,
    })
}
