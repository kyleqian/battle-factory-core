//! Pure `B_SCR_OP_SETDESTINYBOND` state transformation.
//!
//! This is the intentionally narrow state surface of
//! `src/engine/battleScriptSetdestinybondOpcode.ts`, separated from that
//! module's opcode registration and the generic Battle Script machine. The
//! TypeScript handler resolves only its optional `attacker` role and ORs the
//! source destiny-bond bit into that battler's own `status2`.
//!
//! Source authority is `Cmd_setdestinybond` in
//! `reference/pokeemerald/src/battle_script_commands.c:8279-8283`:
//! `gBattleMons[gBattlerAttacker].status2 |= STATUS2_DESTINY_BOND` followed
//! by the one-byte instruction advance. The bit definition is
//! `STATUS2_DESTINY_BOND` at
//! `reference/pokeemerald/include/constants/battle.h:149`; the opcode table
//! entry is `B_SCR_OP_SETDESTINYBOND` (`0xAA`) at
//! `reference/pokeemerald/src/battle_script_commands.c:501`.
//!
//! This leaf deliberately owns neither opcode registration, a BattleState
//! reducer, scheduler state, RNG, controller state, nor presentation.

use core::fmt;

/// Source `MAX_BATTLERS_COUNT`; the indexed source arrays always have four
/// battler slots, including the singles battles this Factory models.
pub const BATTLE_SCRIPT_SETDESTINYBOND_BATTLER_COUNT: usize = 4;

/// `STATUS2_DESTINY_BOND` from `include/constants/battle.h:149`.
pub const BATTLE_SCRIPT_STATUS2_DESTINY_BOND: u32 = 1 << 25;

/// The complete source `BattleScriptBattlerId` domain used by the attacker
/// selector and `gBattleMons` array.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum BattleScriptSetdestinybondBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

/// Canonical fixed battler domain retained for source-array iteration and
/// tests that ratchet the role range.
pub const BATTLE_SCRIPT_SETDESTINYBOND_BATTLERS: [BattleScriptSetdestinybondBattler;
    BATTLE_SCRIPT_SETDESTINYBOND_BATTLER_COUNT] = [
    BattleScriptSetdestinybondBattler::Battler0,
    BattleScriptSetdestinybondBattler::Battler1,
    BattleScriptSetdestinybondBattler::Battler2,
    BattleScriptSetdestinybondBattler::Battler3,
];

impl BattleScriptSetdestinybondBattler {
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
/// it lets this leaf preserve the exact canonical missing-role error instead
/// of fabricating an attacker.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetdestinybondRoles {
    pub attacker: Option<BattleScriptSetdestinybondBattler>,
}

/// Complete narrow projection read or written by the opcode. It holds four
/// source-indexed battlers and the one role binding this leaf needs; it is not
/// a generic BattleState substitute.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetdestinybondBattlerState {
    /// Source `gBattleMons[battler].status2`, an unsigned 32-bit packed field.
    pub status2: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetdestinybondRules {
    pub battlers:
        [BattleScriptSetdestinybondBattlerState; BATTLE_SCRIPT_SETDESTINYBOND_BATTLER_COUNT],
    pub selector_roles: BattleScriptSetdestinybondRoles,
}

/// Exact typed-reachable error thrown by the TypeScript handler when the
/// surrounding action has not supplied an attacker role.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptSetdestinybondError {
    MissingAttackerRole,
}

impl fmt::Display for BattleScriptSetdestinybondError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::MissingAttackerRole => {
                write!(formatter, "Cmd_setdestinybond requires an attacker role")
            }
        }
    }
}

impl std::error::Error for BattleScriptSetdestinybondError {}

/// Native immutable-value twin of the pure state transformation performed by
/// `Cmd_setdestinybond`'s TypeScript handler.
///
/// Resolution first requires the optional attacker role. On success, only
/// that source-indexed battler's `status2` receives the destiny-bond bit;
/// every other battler and the role binding are retained exactly.
pub fn apply_battle_script_setdestinybond(
    rules: &BattleScriptSetdestinybondRules,
) -> Result<BattleScriptSetdestinybondRules, BattleScriptSetdestinybondError> {
    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptSetdestinybondError::MissingAttackerRole)?;

    let mut next = *rules;
    next.battlers[attacker.index()].status2 |= BATTLE_SCRIPT_STATUS2_DESTINY_BOND;
    Ok(next)
}
