//! Pure `B_SCR_OP_SETBIDE` state transformation and control result.
//!
//! This is the intentionally narrow state surface of
//! `src/engine/battleScriptSetbideOpcode.ts`, separated from that module's
//! opcode registration and the generic Battle Script machine. The canonical
//! handler requires its optional attacker role, ORs two source status bits
//! into only that battler, overwrites only that battler's locked move with
//! `currentMove`, zeros only that battler's Bide-damage accumulator, and
//! advances.
//!
//! Source authority is `Cmd_setbide` in
//! `reference/pokeemerald/src/battle_script_commands.c:7121-7130`, in its
//! source write order: set `STATUS2_MULTIPLETURNS`, write
//! `gLockedMoves[gBattlerAttacker]`, zero `gBideDmg[gBattlerAttacker]`, then
//! set `STATUS2_BIDE_TURN(2)`. `BattlePokemon::status2` is a source `u32`
//! (`reference/pokeemerald/include/pokemon.h:293`), and the status-mask
//! definitions identify that packed word as `u32`
//! (`reference/pokeemerald/include/constants/battle.h:127-140`). The move
//! globals/arrays are source `u16` (`reference/pokeemerald/include/battle.h:651,
//! 678`), while `gBideDmg` is source `s32`
//! (`reference/pokeemerald/include/battle.h:656`).
//!
//! Canonical TypeScript validates `battlers[index].status2` over the complete
//! unsigned-32-bit domain (`battleScriptRulesContext.ts:2159`), `currentMove`
//! and `lockedMoves` over `0..=0xffff` (`:2502`, `:2542-2545`), and each Bide
//! damage cell as a signed 32-bit integer (`:2503-2509`). This projection
//! therefore uses `u32`, `u16`, and `i32` respectively rather than narrowing
//! to currently reachable Bide values.
//!
//! `gBideTarget` is a source `u8[4]` (`include/battle.h:682`) written later by
//! `Cmd_datahpupdate` (`battle_script_commands.c:1910-1916`) and restored by
//! the Bide canceler (`battle_util.c:2232-2239`). Its canonical TypeScript
//! projection validates every saved-target byte to the four-value
//! `BattleScriptBattlerId` domain (`battleScriptRulesContext.ts:2510-2520`).
//! This leaf retains that complete typed saved-target array explicitly to
//! ratchet the source command's non-write.
//!
//! This leaf deliberately owns neither instruction shape/registration,
//! absolute program counters, a generic BattleState reducer, Bide canceler or
//! release behavior, RNG, scheduler state, controller state, ABI, nor
//! presentation.

use core::fmt;

/// Source `MAX_BATTLERS_COUNT`; each indexed source array retains four slots.
pub const BATTLE_SCRIPT_SETBIDE_BATTLER_COUNT: usize = 4;

/// `STATUS2_BIDE` from `include/constants/battle.h:135`.
pub const BATTLE_SCRIPT_STATUS2_BIDE: u32 = (1 << 8) | (1 << 9);

/// `STATUS2_BIDE_TURN(2)` from `include/constants/battle.h:136`.
pub const BATTLE_SCRIPT_STATUS2_BIDE_TURN_2: u32 = (2 << 8) & BATTLE_SCRIPT_STATUS2_BIDE;

/// `STATUS2_MULTIPLETURNS` from `include/constants/battle.h:138`.
pub const BATTLE_SCRIPT_STATUS2_MULTIPLETURNS: u32 = 1 << 12;

/// The complete source `BattleScriptBattlerId` domain used by the attacker
/// selector and all four indexed source arrays retained by this projection.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum BattleScriptSetbideBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

/// Canonical fixed battler domain retained for source-array iteration and
/// tests that ratchet the role and saved-target range.
pub const BATTLE_SCRIPT_SETBIDE_BATTLERS: [BattleScriptSetbideBattler;
    BATTLE_SCRIPT_SETBIDE_BATTLER_COUNT] = [
    BattleScriptSetbideBattler::Battler0,
    BattleScriptSetbideBattler::Battler1,
    BattleScriptSetbideBattler::Battler2,
    BattleScriptSetbideBattler::Battler3,
];

impl BattleScriptSetbideBattler {
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

/// The complete canonical selector-role record retained to prove that this
/// command changes no selector binding. Only `attacker` is read; the other
/// source roles stay typed rather than being silently discarded.
///
/// Every field is nullable because `BattleScriptSelectorRoleBindings` allows
/// the typed `null` sentinel. `attacker: None` is the one error this leaf can
/// return; all other values are preserved on a successful application.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetbideRoles {
    pub attacker: Option<BattleScriptSetbideBattler>,
    pub target: Option<BattleScriptSetbideBattler>,
    pub effect_battler: Option<BattleScriptSetbideBattler>,
    pub fainted: Option<BattleScriptSetbideBattler>,
}

/// The sole per-battler field read or written by this command.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetbideBattlerState {
    /// Source `gBattleMons[battler].status2`: a complete packed unsigned
    /// 32-bit word, not a Bide-only bitfield.
    pub status2: u32,
}

/// Complete narrow projection read or written by `Cmd_setbide`. It holds the
/// four source-indexed status, locked-move, damage, and saved-target arrays;
/// the u16 current move; and all selector roles whose preservation the
/// canonical handler's spreads guarantee. It is not a generic BattleState
/// substitute.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetbideRules {
    pub battlers: [BattleScriptSetbideBattlerState; BATTLE_SCRIPT_SETBIDE_BATTLER_COUNT],
    /// Source `gCurrentMove`, canonically a u16.
    pub current_move: u16,
    /// Source `gLockedMoves[MAX_BATTLERS_COUNT]`, canonically four u16 cells.
    pub locked_moves: [u16; BATTLE_SCRIPT_SETBIDE_BATTLER_COUNT],
    /// Source `gBideDmg[MAX_BATTLERS_COUNT]`, canonically four signed-i32
    /// cells.
    pub bide_dmg: [i32; BATTLE_SCRIPT_SETBIDE_BATTLER_COUNT],
    /// Source `gBideTarget[MAX_BATTLERS_COUNT]`: four canonically validated
    /// battler-id saved-target cells. `Cmd_setbide` must preserve every cell.
    pub bide_targets: [BattleScriptSetbideBattler; BATTLE_SCRIPT_SETBIDE_BATTLER_COUNT],
    pub selector_roles: BattleScriptSetbideRoles,
}

/// The sole control result for this unconditional, operand-free command.
/// Absolute program-counter advancement stays in the omitted machine layer.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptSetbideControl {
    Advance,
}

/// Complete projected result of one successful handler invocation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetbideOutcome {
    pub rules: BattleScriptSetbideRules,
    pub control: BattleScriptSetbideControl,
}

/// Exact typed-reachable error thrown by the canonical handler's
/// `requireBattlerRole(rules, "attacker")` call.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptSetbideError {
    MissingAttackerRole,
}

impl fmt::Display for BattleScriptSetbideError {
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

impl std::error::Error for BattleScriptSetbideError {}

/// Native immutable-value twin of the pure state transformation and control
/// result performed by the canonical `Cmd_setbide` handler.
///
/// Attacker resolution intentionally happens before every read and write, so
/// a missing role returns the exact canonical error without changing any
/// projected state. On success the four source writes occur in source order:
/// status2 OR with `STATUS2_MULTIPLETURNS`; attacker locked-move overwrite;
/// attacker signed-damage zero; then status2 OR with `STATUS2_BIDE_TURN(2)`.
/// All sibling cells, every selector role, `current_move`, and the complete
/// saved-target array remain exact. A repeated successful application remains
/// state-idempotent while still returning typed `Advance` each time.
pub fn apply_battle_script_setbide(
    rules: &BattleScriptSetbideRules,
) -> Result<BattleScriptSetbideOutcome, BattleScriptSetbideError> {
    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptSetbideError::MissingAttackerRole)?;
    let attacker_index = attacker.index();

    let mut next = *rules;
    next.battlers[attacker_index].status2 |= BATTLE_SCRIPT_STATUS2_MULTIPLETURNS;
    next.locked_moves[attacker_index] = rules.current_move;
    next.bide_dmg[attacker_index] = 0;
    next.battlers[attacker_index].status2 |= BATTLE_SCRIPT_STATUS2_BIDE_TURN_2;

    Ok(BattleScriptSetbideOutcome { rules: next, control: BattleScriptSetbideControl::Advance })
}
