//! Pure `B_SCR_OP_COPYFOESTATS` state transformation and control result.
//!
//! This is the intentionally narrow state surface of
//! `src/engine/battleScriptCopyFoeStatsOpcode.ts`, separated from that
//! module's opcode registration and generic Battle Script machine. The
//! canonical handler resolves its optional attacker role first, then its
//! optional target role, copies all eight target `statStages` cells into the
//! attacker, and advances unconditionally.
//!
//! Source authority is Psych Up's `Cmd_copyfoestats` in
//! `reference/pokeemerald/src/battle_script_commands.c:8809-8820`: its loop
//! copies `NUM_BATTLE_STATS` cells from `gBattlerTarget` to
//! `gBattlerAttacker`, then increments over the opcode plus a dead four-byte
//! failure pointer. `BattlePokemon::statStages` is `s8[NUM_BATTLE_STATS]`
//! (`reference/pokeemerald/include/pokemon.h:277`), while
//! `NUM_BATTLE_STATS = 8` and `DEFAULT_STAT_STAGE = 6` are in
//! `reference/pokeemerald/include/constants/pokemon.h:76-90`.
//!
//! The dead source pointer, absolute program counter, opcode registration,
//! generic `BattleState`, ABI/WASM boundary, RNG, scheduler, and presentation
//! are deliberately outside this leaf.

use core::fmt;

/// Source `MAX_BATTLERS_COUNT`; indexed source arrays retain all four slots
/// even when the Factory runs a singles battle.
pub const BATTLE_SCRIPT_COPYFOESTATS_BATTLER_COUNT: usize = 4;

/// Source `NUM_BATTLE_STATS` from `include/constants/pokemon.h:87`.
pub const BATTLE_SCRIPT_COPYFOESTATS_STAT_STAGE_COUNT: usize = 8;

/// Source `DEFAULT_STAT_STAGE` from `include/constants/pokemon.h:90`. This is
/// a corpus boundary only; the opcode copies neutral rows successfully.
pub const BATTLE_SCRIPT_COPYFOESTATS_NEUTRAL_STAT_STAGE: i8 = 6;

/// The complete source `BattleScriptBattlerId` domain used by both selector
/// roles and the indexed `gBattleMons` array.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum BattleScriptCopyFoeStatsBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

/// Canonical fixed battler domain retained for source-array iteration and
/// tests that ratchet every attacker/target pair.
pub const BATTLE_SCRIPT_COPYFOESTATS_BATTLERS: [BattleScriptCopyFoeStatsBattler;
    BATTLE_SCRIPT_COPYFOESTATS_BATTLER_COUNT] = [
    BattleScriptCopyFoeStatsBattler::Battler0,
    BattleScriptCopyFoeStatsBattler::Battler1,
    BattleScriptCopyFoeStatsBattler::Battler2,
    BattleScriptCopyFoeStatsBattler::Battler3,
];

impl BattleScriptCopyFoeStatsBattler {
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
/// error ordering before any stat-stage row is read.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptCopyFoeStatsRoles {
    pub attacker: Option<BattleScriptCopyFoeStatsBattler>,
    pub target: Option<BattleScriptCopyFoeStatsBattler>,
}

/// The complete source-width per-battler projection read or written by this
/// opcode.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptCopyFoeStatsBattlerState {
    /// Source `BattlePokemon::statStages`: all eight signed `s8` cells,
    /// including the complete `-128..=127` canonical TypeScript domain.
    pub stat_stages: [i8; BATTLE_SCRIPT_COPYFOESTATS_STAT_STAGE_COUNT],
}

/// Complete narrow projection read or written by the opcode. It retains all
/// four source-indexed stage rows and the attacker/target role bindings, but
/// is not a generic `BattleState` substitute.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptCopyFoeStatsRules {
    pub battlers: [BattleScriptCopyFoeStatsBattlerState; BATTLE_SCRIPT_COPYFOESTATS_BATTLER_COUNT],
    pub selector_roles: BattleScriptCopyFoeStatsRoles,
}

/// The sole control result for this unconditional command. The surrounding
/// machine owns the ignored failure pointer and program-counter advance.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptCopyFoeStatsControl {
    Advance,
}

/// Complete projected result of one successful handler invocation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptCopyFoeStatsOutcome {
    pub rules: BattleScriptCopyFoeStatsRules,
    pub control: BattleScriptCopyFoeStatsControl,
}

/// Exact typed-reachable errors thrown by the canonical TypeScript handler.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptCopyFoeStatsError {
    MissingAttackerRole,
    MissingTargetRole,
}

impl fmt::Display for BattleScriptCopyFoeStatsError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::MissingAttackerRole => {
                write!(formatter, "B_SCR_OP_COPYFOESTATS requires an attacker role")
            }
            Self::MissingTargetRole => {
                write!(formatter, "B_SCR_OP_COPYFOESTATS requires a target role")
            }
        }
    }
}

impl std::error::Error for BattleScriptCopyFoeStatsError {}

/// Native immutable-value twin of the pure state transformation and control
/// result performed by `Cmd_copyfoestats`' TypeScript handler.
///
/// Resolution intentionally happens attacker first, then target. With both
/// roles present, the target's full signed eight-cell row replaces the
/// attacker's row. The target may equal the attacker and neutral rows are not
/// failures; every valid invocation returns typed `Advance`. Sibling rows and
/// both role bindings remain exact, and a repeated copy is value-idempotent.
pub fn apply_battle_script_copyfoestats(
    rules: &BattleScriptCopyFoeStatsRules,
) -> Result<BattleScriptCopyFoeStatsOutcome, BattleScriptCopyFoeStatsError> {
    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptCopyFoeStatsError::MissingAttackerRole)?;
    let target = rules
        .selector_roles
        .target
        .ok_or(BattleScriptCopyFoeStatsError::MissingTargetRole)?;

    let target_stat_stages = rules.battlers[target.index()].stat_stages;
    let mut next = *rules;
    next.battlers[attacker.index()].stat_stages = target_stat_stages;
    Ok(BattleScriptCopyFoeStatsOutcome {
        rules: next,
        control: BattleScriptCopyFoeStatsControl::Advance,
    })
}
