//! Pure `B_SCR_OP_SETFOCUSENERGY` decision, state transformation, and control
//! result.
//!
//! This is the intentionally narrow state surface of
//! `src/engine/battleScriptSetfocusenergyOpcode.ts`, separated from that
//! module's opcode registration and the generic Battle Script machine. The
//! TypeScript handler requires its optional `attacker` role first. When that
//! battler already has Focus Energy, it ORs `MOVE_RESULT_FAILED` into the
//! packed result flags and selects the failure message; otherwise it ORs
//! `STATUS2_FOCUS_ENERGY` into only that battler and selects the success
//! message. Both paths advance the operand-free command.
//!
//! Source authority is `Cmd_setfocusenergy` in
//! `reference/pokeemerald/src/battle_script_commands.c:7749-7762`. Its packed
//! constants are `STATUS2_FOCUS_ENERGY` and `MOVE_RESULT_FAILED` at
//! `reference/pokeemerald/include/constants/battle.h:144,225`; the two
//! `gFocusEnergyUsedStringIds` indices are `B_MSG_GETTING_PUMPED` and
//! `B_MSG_FOCUS_ENERGY_FAILED` at
//! `reference/pokeemerald/include/constants/battle_string_ids.h:499-501`.
//! The opcode table identifies `B_SCR_OP_SETFOCUSENERGY` as `0x9A` at
//! `reference/pokeemerald/src/battle_script_commands.c:485`.
//!
//! This leaf deliberately owns neither absolute program counters, opcode
//! registration, a generic BattleState reducer, the surrounding duplicate
//! guard, RNG, scheduler state, controller state, nor presentation.

use core::fmt;

/// Source `MAX_BATTLERS_COUNT`; indexed source arrays always have four
/// battler slots, including the singles battles this Factory models.
pub const BATTLE_SCRIPT_SETFOCUSENERGY_BATTLER_COUNT: usize = 4;

/// `STATUS2_FOCUS_ENERGY` from `include/constants/battle.h:144`.
pub const BATTLE_SCRIPT_STATUS2_FOCUS_ENERGY: u32 = 1 << 20;

/// `MOVE_RESULT_FAILED` from `include/constants/battle.h:225`.
pub const BATTLE_SCRIPT_MOVE_RESULT_FAILED: u32 = 1 << 5;

/// `B_MSG_GETTING_PUMPED` from `battle_string_ids.h:500`, an index into
/// `gFocusEnergyUsedStringIds`.
pub const BATTLE_SCRIPT_B_MSG_GETTING_PUMPED: u8 = 0;

/// `B_MSG_FOCUS_ENERGY_FAILED` from `battle_string_ids.h:501`, an index into
/// `gFocusEnergyUsedStringIds`.
pub const BATTLE_SCRIPT_B_MSG_FOCUS_ENERGY_FAILED: u8 = 1;

/// The complete source `BattleScriptBattlerId` domain used by the attacker
/// selector and indexed `gBattleMons` array.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum BattleScriptSetfocusenergyBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

/// Canonical fixed battler domain retained for source-array iteration and
/// tests that ratchet the role range.
pub const BATTLE_SCRIPT_SETFOCUSENERGY_BATTLERS: [BattleScriptSetfocusenergyBattler;
    BATTLE_SCRIPT_SETFOCUSENERGY_BATTLER_COUNT] = [
    BattleScriptSetfocusenergyBattler::Battler0,
    BattleScriptSetfocusenergyBattler::Battler1,
    BattleScriptSetfocusenergyBattler::Battler2,
    BattleScriptSetfocusenergyBattler::Battler3,
];

impl BattleScriptSetfocusenergyBattler {
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
/// it lets this leaf preserve the exact canonical missing-role error before
/// it reads either a battler or the other projected scalar fields.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetfocusenergyRoles {
    pub attacker: Option<BattleScriptSetfocusenergyBattler>,
}

/// The complete per-battler projection read or written by this opcode.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetfocusenergyBattlerState {
    /// Source `gBattleMons[battler].status2`, an unsigned 32-bit packed field.
    pub status2: u32,
}

/// Complete narrow projection read or written by the opcode. It holds four
/// source-indexed battlers, the unsigned packed move-result flags, the source
/// `u8` message-table chooser, and only the attacker role binding this leaf
/// needs; it is not a generic BattleState substitute.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetfocusenergyRules {
    pub battlers:
        [BattleScriptSetfocusenergyBattlerState; BATTLE_SCRIPT_SETFOCUSENERGY_BATTLER_COUNT],
    /// Source `gMoveResultFlags`; the TypeScript expression explicitly uses
    /// `>>> 0`, so this narrow projection preserves the full `u32` bitwise
    /// behavior rather than narrowing to the source storage byte.
    pub move_result_flags: u32,
    /// Source `gBattleCommunication[MULTISTRING_CHOOSER]`, a `u8` table index.
    pub multistring_chooser: u8,
    pub selector_roles: BattleScriptSetfocusenergyRoles,
}

/// The sole control result for this unconditional, operand-free command.
/// Absolute program counters stay in the machine layer that this leaf does
/// not model.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptSetfocusenergyControl {
    Advance,
}

/// Complete projected result of one successful handler invocation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetfocusenergyOutcome {
    pub rules: BattleScriptSetfocusenergyRules,
    pub control: BattleScriptSetfocusenergyControl,
}

/// Exact typed-reachable error thrown by the TypeScript handler's
/// `requireBattlerRole(rules, "attacker")` call.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptSetfocusenergyError {
    MissingAttackerRole,
}

impl fmt::Display for BattleScriptSetfocusenergyError {
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

impl std::error::Error for BattleScriptSetfocusenergyError {}

/// Native immutable-value twin of the pure decision, state transformation,
/// and control result performed by `Cmd_setfocusenergy`'s TypeScript handler.
///
/// Role resolution intentionally comes first. On the already-focused branch,
/// every battler stays exact while only `move_result_flags` receives the
/// failure bit and the chooser is overwritten with the failure message. On
/// the clear branch, the packed status bit is ORed into only the attacker,
/// `move_result_flags` stays exact, and the chooser is overwritten with the
/// success message. Both successful applications advance.
pub fn apply_battle_script_setfocusenergy(
    rules: &BattleScriptSetfocusenergyRules,
) -> Result<BattleScriptSetfocusenergyOutcome, BattleScriptSetfocusenergyError> {
    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptSetfocusenergyError::MissingAttackerRole)?;

    let mut next = *rules;
    if rules.battlers[attacker.index()].status2 & BATTLE_SCRIPT_STATUS2_FOCUS_ENERGY != 0 {
        next.move_result_flags |= BATTLE_SCRIPT_MOVE_RESULT_FAILED;
        next.multistring_chooser = BATTLE_SCRIPT_B_MSG_FOCUS_ENERGY_FAILED;
    } else {
        next.battlers[attacker.index()].status2 |= BATTLE_SCRIPT_STATUS2_FOCUS_ENERGY;
        next.multistring_chooser = BATTLE_SCRIPT_B_MSG_GETTING_PUMPED;
    }

    Ok(BattleScriptSetfocusenergyOutcome {
        rules: next,
        control: BattleScriptSetfocusenergyControl::Advance,
    })
}
