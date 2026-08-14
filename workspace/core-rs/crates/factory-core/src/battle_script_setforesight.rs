//! Pure `B_SCR_OP_SETFORESIGHT` state transformation and control result.
//!
//! This is the intentionally narrow state surface of
//! `src/engine/battleScriptSetforesightOpcode.ts`, separated from that
//! module's opcode registration and the generic Battle Script machine. The
//! TypeScript handler requires only its optional `target` role, ORs the
//! source Foresight bit into that target's `status2`, and advances.
//!
//! Source authority is `Cmd_setforesight` in
//! `reference/pokeemerald/src/battle_script_commands.c:8502-8506`: it ORs
//! `STATUS2_FORESIGHT` into `gBattleMons[gBattlerTarget].status2` and takes
//! the one-byte instruction advance unconditionally. The bit definition is
//! `STATUS2_FORESIGHT` at
//! `reference/pokeemerald/include/constants/battle.h:153`; the opcode table
//! identifies `B_SCR_OP_SETFORESIGHT` as `0xB1` at
//! `reference/pokeemerald/src/battle_script_commands.c:508`.
//!
//! This leaf deliberately owns neither opcode registration, absolute program
//! counters, a generic BattleState reducer, scheduler state, RNG, controller
//! state, nor presentation.

use core::fmt;

/// Source `MAX_BATTLERS_COUNT`; indexed source arrays always have four
/// battler slots, including the singles battles this Factory models.
pub const BATTLE_SCRIPT_SETFORESIGHT_BATTLER_COUNT: usize = 4;

/// `STATUS2_FORESIGHT` from `include/constants/battle.h:153`.
pub const BATTLE_SCRIPT_STATUS2_FORESIGHT: u32 = 1 << 29;

/// The complete source `BattleScriptBattlerId` domain used by the target
/// selector and the indexed `gBattleMons` array.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum BattleScriptSetforesightBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

/// Canonical fixed battler domain retained for source-array iteration and
/// tests that ratchet the role range.
pub const BATTLE_SCRIPT_SETFORESIGHT_BATTLERS: [BattleScriptSetforesightBattler;
    BATTLE_SCRIPT_SETFORESIGHT_BATTLER_COUNT] = [
    BattleScriptSetforesightBattler::Battler0,
    BattleScriptSetforesightBattler::Battler1,
    BattleScriptSetforesightBattler::Battler2,
    BattleScriptSetforesightBattler::Battler3,
];

impl BattleScriptSetforesightBattler {
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

/// The only selector binding read by the canonical opcode handler.
///
/// `None` is typed-reachable in `BattleScriptSelectorRoleBindings`; retaining
/// it lets this leaf preserve the exact canonical missing-target error before
/// it observes any battler state.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetforesightRoles {
    pub target: Option<BattleScriptSetforesightBattler>,
}

/// The complete per-battler projection read or written by this opcode.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetforesightBattlerState {
    /// Source `gBattleMons[battler].status2`, an unsigned 32-bit packed field.
    pub status2: u32,
}

/// Complete narrow projection read or written by the opcode. It holds four
/// source-indexed battlers and only the target role binding this leaf needs;
/// it is not a generic BattleState substitute.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetforesightRules {
    pub battlers: [BattleScriptSetforesightBattlerState; BATTLE_SCRIPT_SETFORESIGHT_BATTLER_COUNT],
    pub selector_roles: BattleScriptSetforesightRoles,
}

/// The sole control result for this unconditional, operand-free command.
/// Absolute program counters stay in the machine layer that this leaf does
/// not model.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptSetforesightControl {
    Advance,
}

/// Complete projected result of one successful handler invocation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetforesightOutcome {
    pub rules: BattleScriptSetforesightRules,
    pub control: BattleScriptSetforesightControl,
}

/// Exact typed-reachable error thrown by the TypeScript handler's
/// `requireBattlerRole(rules, "target")` call.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptSetforesightError {
    MissingTargetRole,
}

impl fmt::Display for BattleScriptSetforesightError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::MissingTargetRole => {
                write!(
                    formatter,
                    "Battle Script hit-chain command requires a target role"
                )
            }
        }
    }
}

impl std::error::Error for BattleScriptSetforesightError {}

/// Native immutable-value twin of the pure state transformation and control
/// result performed by `Cmd_setforesight`'s TypeScript handler.
///
/// Role resolution intentionally comes first. Once a target exists, only that
/// battler's packed `status2` receives `STATUS2_FORESIGHT`; unrelated packed
/// bits, sibling battlers, and the target binding remain exact. The source
/// command advances after every successful application, including a repeated
/// idempotent OR.
pub fn apply_battle_script_setforesight(
    rules: &BattleScriptSetforesightRules,
) -> Result<BattleScriptSetforesightOutcome, BattleScriptSetforesightError> {
    let target = rules
        .selector_roles
        .target
        .ok_or(BattleScriptSetforesightError::MissingTargetRole)?;

    let mut next = *rules;
    next.battlers[target.index()].status2 |= BATTLE_SCRIPT_STATUS2_FORESIGHT;
    Ok(BattleScriptSetforesightOutcome {
        rules: next,
        control: BattleScriptSetforesightControl::Advance,
    })
}
