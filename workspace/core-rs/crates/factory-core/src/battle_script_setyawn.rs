//! Pure `B_SCR_OP_SETYAWN` decision and state transformation.
//!
//! This is the intentionally narrow state surface of
//! `src/engine/battleScriptSetyawnOpcode.ts`, separated from that module's
//! opcode registration and the generic Battle Script machine. The TypeScript
//! handler first requires its optional `target` role. It then takes the
//! canonical fail jump when that target is already yawning or has any
//! non-volatile status; otherwise it ORs a fresh two-turn Yawn counter into
//! only that target's `status3` and advances.
//!
//! Source authority is `Cmd_setyawn` in
//! `reference/pokeemerald/src/battle_script_commands.c:9352-9364`: it tests
//! `gStatuses3[gBattlerTarget] & STATUS3_YAWN` before
//! `gBattleMons[gBattlerTarget].status1 & STATUS1_ANY`, jumps through its
//! sole pointer operand on failure, and otherwise ORs
//! `STATUS3_YAWN_TURN(2)` before the five-byte advance. The status constants
//! are defined in `reference/pokeemerald/include/constants/battle.h:117-125,
//! 168-169`; the opcode table identifies `B_SCR_OP_SETYAWN` as `0xD7` at
//! `reference/pokeemerald/src/battle_script_commands.c:546`.
//!
//! This leaf deliberately owns neither opcode registration, absolute program
//! counters, a generic BattleState reducer, scheduler state, RNG, controller
//! state, nor presentation.

use core::fmt;

/// Source `MAX_BATTLERS_COUNT`; the indexed source arrays always have four
/// battler slots, including the singles battles this Factory models.
pub const BATTLE_SCRIPT_SETYAWN_BATTLER_COUNT: usize = 4;

/// `STATUS1_SLEEP` from `include/constants/battle.h:117`: the three packed
/// sleep-turn bits, each of which blocks Yawn.
pub const BATTLE_SCRIPT_STATUS1_SLEEP: u32 = 0x0000_0007;
/// `STATUS1_POISON` from `include/constants/battle.h:119`.
pub const BATTLE_SCRIPT_STATUS1_POISON: u32 = 1 << 3;
/// `STATUS1_BURN` from `include/constants/battle.h:120`.
pub const BATTLE_SCRIPT_STATUS1_BURN: u32 = 1 << 4;
/// `STATUS1_FREEZE` from `include/constants/battle.h:121`.
pub const BATTLE_SCRIPT_STATUS1_FREEZE: u32 = 1 << 5;
/// `STATUS1_PARALYSIS` from `include/constants/battle.h:122`.
pub const BATTLE_SCRIPT_STATUS1_PARALYSIS: u32 = 1 << 6;
/// `STATUS1_TOXIC_POISON` from `include/constants/battle.h:123`.
pub const BATTLE_SCRIPT_STATUS1_TOXIC_POISON: u32 = 1 << 7;
/// Exact source `STATUS1_ANY` union from `include/constants/battle.h:125`.
pub const BATTLE_SCRIPT_STATUS1_ANY: u32 = BATTLE_SCRIPT_STATUS1_SLEEP
    | BATTLE_SCRIPT_STATUS1_POISON
    | BATTLE_SCRIPT_STATUS1_BURN
    | BATTLE_SCRIPT_STATUS1_FREEZE
    | BATTLE_SCRIPT_STATUS1_PARALYSIS
    | BATTLE_SCRIPT_STATUS1_TOXIC_POISON;

/// `STATUS3_YAWN` from `include/constants/battle.h:168`, the two-bit packed
/// countdown field at bits 11-12.
pub const BATTLE_SCRIPT_STATUS3_YAWN: u32 = (1 << 11) | (1 << 12);
/// `STATUS3_YAWN_TURN(2)` from `include/constants/battle.h:169`, the fresh
/// countdown written by successful `Cmd_setyawn` execution.
pub const BATTLE_SCRIPT_STATUS3_YAWN_TURN_2: u32 = (2 << 11) & BATTLE_SCRIPT_STATUS3_YAWN;

/// The complete source `BattleScriptBattlerId` domain used by the target
/// selector and the `gBattleMons` / `gStatuses3` arrays.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum BattleScriptSetyawnBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

/// Canonical fixed battler domain retained for source-array iteration and
/// tests that ratchet the role range.
pub const BATTLE_SCRIPT_SETYAWN_BATTLERS: [BattleScriptSetyawnBattler;
    BATTLE_SCRIPT_SETYAWN_BATTLER_COUNT] = [
    BattleScriptSetyawnBattler::Battler0,
    BattleScriptSetyawnBattler::Battler1,
    BattleScriptSetyawnBattler::Battler2,
    BattleScriptSetyawnBattler::Battler3,
];

impl BattleScriptSetyawnBattler {
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

/// The only selector binding read by the canonical handler.
///
/// `None` is typed-reachable in `BattleScriptSelectorRoleBindings`; retaining
/// it lets this leaf preserve the exact canonical missing-target error before
/// it observes either target packed-status field.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetyawnRoles {
    pub target: Option<BattleScriptSetyawnBattler>,
}

/// The complete per-battler projection read or written by this opcode.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetyawnBattlerState {
    /// Source `gBattleMons[battler].status1`, an unsigned 32-bit packed field.
    pub status1: u32,
    /// Source `gStatuses3[battler]`, an unsigned 32-bit packed field.
    pub status3: u32,
}

/// Complete narrow projection read or written by the opcode. It holds four
/// source-indexed battlers and only the target role binding this leaf needs;
/// it is not a generic BattleState substitute.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetyawnRules {
    pub battlers: [BattleScriptSetyawnBattlerState; BATTLE_SCRIPT_SETYAWN_BATTLER_COUNT],
    pub selector_roles: BattleScriptSetyawnRoles,
}

/// The source control distinction preserved without representing absolute
/// script addresses. `Cmd_setyawn` advances only on the write path; either
/// blocked condition uses the opcode's canonical fail-label jump.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptSetyawnControl {
    Advance,
    FailJump,
}

/// Complete projected result of one successful handler invocation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetyawnOutcome {
    pub rules: BattleScriptSetyawnRules,
    pub control: BattleScriptSetyawnControl,
}

/// Exact typed-reachable error thrown by the TypeScript handler when the
/// surrounding action has not supplied a target role.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptSetyawnError {
    MissingTargetRole,
}

impl fmt::Display for BattleScriptSetyawnError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::MissingTargetRole => write!(formatter, "Cmd_setyawn requires a target role"),
        }
    }
}

impl std::error::Error for BattleScriptSetyawnError {}

/// Native immutable-value twin of the pure decision and state transformation
/// performed by `Cmd_setyawn`'s TypeScript handler.
///
/// Role resolution intentionally comes first. Once a target exists, the
/// source-order short circuit is retained: a nonzero packed `STATUS3_YAWN`
/// field takes the fail jump before the `STATUS1_ANY` predicate; otherwise a
/// matching primary status takes the same fail jump. Both failure paths retain
/// the complete narrow projection unchanged. Only the clear success path ORs
/// `STATUS3_YAWN_TURN(2)` into the selected target's `status3` and advances.
pub fn apply_battle_script_setyawn(
    rules: &BattleScriptSetyawnRules,
) -> Result<BattleScriptSetyawnOutcome, BattleScriptSetyawnError> {
    let target = rules
        .selector_roles
        .target
        .ok_or(BattleScriptSetyawnError::MissingTargetRole)?;
    let target_state = rules.battlers[target.index()];

    if target_state.status3 & BATTLE_SCRIPT_STATUS3_YAWN != 0
        || target_state.status1 & BATTLE_SCRIPT_STATUS1_ANY != 0
    {
        return Ok(BattleScriptSetyawnOutcome {
            rules: *rules,
            control: BattleScriptSetyawnControl::FailJump,
        });
    }

    let mut next = *rules;
    next.battlers[target.index()].status3 |= BATTLE_SCRIPT_STATUS3_YAWN_TURN_2;
    Ok(BattleScriptSetyawnOutcome { rules: next, control: BattleScriptSetyawnControl::Advance })
}
