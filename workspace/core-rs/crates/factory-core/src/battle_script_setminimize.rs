//! Pure `B_SCR_OP_SETMINIMIZE` state transformation.
//!
//! This is the intentionally narrow state surface of
//! `src/engine/battleScriptSetminimizeOpcode.ts`, separated from that
//! module's opcode registration and the generic Battle Script machine. The
//! TypeScript handler first tests `HITMARKER_OBEYS`; only the set branch
//! resolves its optional `attacker` role and ORs the source minimized bit
//! into that battler's own `status3`.
//!
//! Source authority is `Cmd_setminimize` in
//! `reference/pokeemerald/src/battle_script_commands.c:9047-9053`: when
//! `gHitMarker & HITMARKER_OBEYS`, it ORs `STATUS3_MINIMIZED` into
//! `gStatuses3[gBattlerAttacker]`, then always advances one instruction.
//! The bit definitions are `STATUS3_MINIMIZED` and `HITMARKER_OBEYS` at
//! `reference/pokeemerald/include/constants/battle.h:165,202`; the opcode
//! table entry is `B_SCR_OP_SETMINIMIZE` (`0xC7`) at
//! `reference/pokeemerald/src/battle_script_commands.c:530`.
//!
//! This leaf deliberately owns neither opcode registration, a BattleState
//! reducer, scheduler state, RNG, controller state, nor presentation.

use core::fmt;

/// Source `MAX_BATTLERS_COUNT`; the indexed source arrays always have four
/// battler slots, including the singles battles this Factory models.
pub const BATTLE_SCRIPT_SETMINIMIZE_BATTLER_COUNT: usize = 4;

/// `STATUS3_MINIMIZED` from `include/constants/battle.h:165`.
pub const BATTLE_SCRIPT_STATUS3_MINIMIZED: u32 = 1 << 8;

/// `HITMARKER_OBEYS` from `include/constants/battle.h:202`.
pub const BATTLE_SCRIPT_HITMARKER_OBEYS: u32 = 1 << 25;

/// The complete source `BattleScriptBattlerId` domain used by the attacker
/// selector and `gStatuses3` array.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum BattleScriptSetminimizeBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

/// Canonical fixed battler domain retained for source-array iteration and
/// tests that ratchet the role range.
pub const BATTLE_SCRIPT_SETMINIMIZE_BATTLERS: [BattleScriptSetminimizeBattler;
    BATTLE_SCRIPT_SETMINIMIZE_BATTLER_COUNT] = [
    BattleScriptSetminimizeBattler::Battler0,
    BattleScriptSetminimizeBattler::Battler1,
    BattleScriptSetminimizeBattler::Battler2,
    BattleScriptSetminimizeBattler::Battler3,
];

impl BattleScriptSetminimizeBattler {
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

/// The only selector binding conditionally read by the canonical handler.
///
/// `None` is typed-reachable. It is valid while `HITMARKER_OBEYS` is clear,
/// because that branch must return before attempting attacker resolution.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetminimizeRoles {
    pub attacker: Option<BattleScriptSetminimizeBattler>,
}

/// The only battler field this opcode can observe or replace.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetminimizeBattlerState {
    /// Source `gStatuses3[battler]`, an unsigned 32-bit packed field.
    pub status3: u32,
}

/// Complete narrow projection read or written by the opcode. It holds four
/// source-indexed battlers, canonical unsigned `hitMarker`, and only the
/// attacker role binding this leaf may need; it is not a generic BattleState.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetminimizeRules {
    pub battlers: [BattleScriptSetminimizeBattlerState; BATTLE_SCRIPT_SETMINIMIZE_BATTLER_COUNT],
    pub hit_marker: u32,
    pub selector_roles: BattleScriptSetminimizeRoles,
}

/// Exact typed-reachable error thrown by the TypeScript handler's
/// `requireBattlerRole(rules, "attacker")` call.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptSetminimizeError {
    MissingAttackerRole,
}

impl fmt::Display for BattleScriptSetminimizeError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::MissingAttackerRole => {
                write!(
                    formatter,
                    "Battle Script hit-chain command requires a attacker role"
                )
            }
        }
    }
}

impl std::error::Error for BattleScriptSetminimizeError {}

/// Native immutable-value twin of the pure state transformation performed by
/// `Cmd_setminimize`'s TypeScript handler.
///
/// Gate ordering is semantic: with `HITMARKER_OBEYS` clear, the complete
/// projected value is returned unchanged and the optional attacker is never
/// resolved. With the bit set, attacker resolution must succeed before only
/// that battler receives `STATUS3_MINIMIZED`; unrelated packed bits, sibling
/// battlers, `hit_marker`, and the role binding remain exact.
pub fn apply_battle_script_setminimize(
    rules: &BattleScriptSetminimizeRules,
) -> Result<BattleScriptSetminimizeRules, BattleScriptSetminimizeError> {
    if rules.hit_marker & BATTLE_SCRIPT_HITMARKER_OBEYS == 0 {
        return Ok(*rules);
    }

    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptSetminimizeError::MissingAttackerRole)?;

    let mut next = *rules;
    next.battlers[attacker.index()].status3 |= BATTLE_SCRIPT_STATUS3_MINIMIZED;
    Ok(next)
}
