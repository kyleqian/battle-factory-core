//! Pure `B_SCR_OP_TRYSETDESTINYBONDTOHAPPEN` state transformation and control
//! result.
//!
//! This is the deliberately narrow, machine-independent port of
//! `src/engine/battleScriptTrysetdestinybondtohappenOpcode.ts` and its shared
//! `applyTrySetDestinyBondToHappen` helper. The canonical handler resolves an
//! optional attacker role before an optional target role, invokes that helper,
//! and advances unconditionally. The helper only ORs the per-action
//! `HITMARKER_DESTINYBOND` bit when the target has Destiny Bond, the active
//! battlers are on opposite sides, and Grudge has not claimed the hit marker.
//!
//! Source authority is `TrySetDestinyBondToHappen` and
//! `Cmd_trysetdestinybondtohappen` in
//! `reference/pokeemerald/src/battle_script_commands.c:8285-8300`.
//! `STATUS2_DESTINY_BOND`, `HITMARKER_DESTINYBOND`, and `HITMARKER_GRUDGE`
//! are respectively bits 25, 6, and 24 in
//! `reference/pokeemerald/include/constants/battle.h:149,183,201`. The source
//! `gBattleMons[battler].status2` and `gHitMarker` are complete packed `u32`
//! words; canonical TypeScript likewise admits the full unsigned 32-bit
//! domain for `status2` and `hitMarker` in
//! `src/engine/battleScriptRulesContext.ts:2159,2629`.
//!
//! Instruction shape/registration, generic `BattleState`, the shared hit-chain
//! call site, ABI/WASM export, RNG, scheduler, controller, and presentation
//! deliberately remain outside this pure leaf.

use core::fmt;

/// Source `MAX_BATTLERS_COUNT`; source-indexed active-battler arrays retain
/// four slots even in the Factory's singles battles.
pub const BATTLE_SCRIPT_TRYSETDESTINYBONDTOHAPPEN_BATTLER_COUNT: usize = 4;

/// Canonical `side: 0 | 1` domain from
/// `battleScriptRulesContext.ts:241-243,2111`.
pub const BATTLE_SCRIPT_TRYSETDESTINYBONDTOHAPPEN_SIDE_COUNT: usize = 2;

/// `STATUS2_DESTINY_BOND` from `include/constants/battle.h:149`.
pub const BATTLE_SCRIPT_STATUS2_DESTINY_BOND: u32 = 1 << 25;

/// `HITMARKER_DESTINYBOND` from `include/constants/battle.h:183`.
pub const BATTLE_SCRIPT_HITMARKER_DESTINYBOND: u32 = 1 << 6;

/// `HITMARKER_GRUDGE` from `include/constants/battle.h:201`.
pub const BATTLE_SCRIPT_HITMARKER_GRUDGE: u32 = 1 << 24;

/// The complete source `BattleScriptBattlerId` domain used by both selector
/// bindings and the indexed active-battler array.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum BattleScriptTrysetdestinybondtohappenBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

/// Canonical fixed battler domain retained for source-array iteration and
/// complete role-pair coverage.
pub const BATTLE_SCRIPT_TRYSETDESTINYBONDTOHAPPEN_BATTLERS:
    [BattleScriptTrysetdestinybondtohappenBattler;
        BATTLE_SCRIPT_TRYSETDESTINYBONDTOHAPPEN_BATTLER_COUNT] = [
    BattleScriptTrysetdestinybondtohappenBattler::Battler0,
    BattleScriptTrysetdestinybondtohappenBattler::Battler1,
    BattleScriptTrysetdestinybondtohappenBattler::Battler2,
    BattleScriptTrysetdestinybondtohappenBattler::Battler3,
];

impl BattleScriptTrysetdestinybondtohappenBattler {
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

/// The complete canonical active-battler side domain.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum BattleScriptTrysetdestinybondtohappenSide {
    Side0 = 0,
    Side1 = 1,
}

/// Canonical fixed source-side domain. A side is represented as an enum rather
/// than a loose `u8` so this leaf cannot construct a state that TypeScript's
/// `requireUnsigned(..., 1, ...)` would reject.
pub const BATTLE_SCRIPT_TRYSETDESTINYBONDTOHAPPEN_SIDES:
    [BattleScriptTrysetdestinybondtohappenSide; BATTLE_SCRIPT_TRYSETDESTINYBONDTOHAPPEN_SIDE_COUNT] = [
    BattleScriptTrysetdestinybondtohappenSide::Side0,
    BattleScriptTrysetdestinybondtohappenSide::Side1,
];

impl BattleScriptTrysetdestinybondtohappenSide {
    /// Source `u8` side value (0 for player, 1 for opponent).
    #[must_use]
    pub const fn as_u8(self) -> u8 {
        self as u8
    }
}

/// The selector bindings read by the canonical opcode handler.
///
/// Both `None` variants are typed-reachable in the canonical rules context.
/// Retaining both preserves the exact attacker-before-target error ordering
/// before the helper reads a battler or hit-marker word.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetdestinybondtohappenRoles {
    pub attacker: Option<BattleScriptTrysetdestinybondtohappenBattler>,
    pub target: Option<BattleScriptTrysetdestinybondtohappenBattler>,
}

/// The complete source-width per-active-battler projection read by the helper.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetdestinybondtohappenBattlerState {
    /// Source `gBattleMons[battler].status2`: the full unsigned packed word,
    /// not merely the named Destiny Bond bit.
    pub status2: u32,
    /// `GetBattlerSide(battler)` / canonical `battler.side`, restricted to the
    /// source 0/1 domain.
    pub side: BattleScriptTrysetdestinybondtohappenSide,
}

/// Complete narrow projection read or written by the opcode. It retains all
/// four source-indexed status/side records, the full per-action `hitMarker`,
/// and both selector bindings; it is not a generic `BattleState` substitute.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetdestinybondtohappenRules {
    pub battlers: [BattleScriptTrysetdestinybondtohappenBattlerState;
        BATTLE_SCRIPT_TRYSETDESTINYBONDTOHAPPEN_BATTLER_COUNT],
    /// Source `u32 gHitMarker`, retained as a complete packed word.
    pub hit_marker: u32,
    pub selector_roles: BattleScriptTrysetdestinybondtohappenRoles,
}

/// The only machine-independent control result of this operand-free command.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTrysetdestinybondtohappenControl {
    /// Both roles resolved. The source increments its one-byte instruction
    /// regardless of whether the marker predicate writes a bit.
    Advance,
}

/// Complete projected result of one successful handler invocation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetdestinybondtohappenOutcome {
    pub rules: BattleScriptTrysetdestinybondtohappenRules,
    pub control: BattleScriptTrysetdestinybondtohappenControl,
}

/// Exact typed-reachable errors thrown by the canonical TypeScript handler.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTrysetdestinybondtohappenError {
    MissingAttackerRole,
    MissingTargetRole,
}

impl fmt::Display for BattleScriptTrysetdestinybondtohappenError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::MissingAttackerRole => write!(
                formatter,
                "Cmd_trysetdestinybondtohappen requires a attacker role"
            ),
            Self::MissingTargetRole => write!(
                formatter,
                "Cmd_trysetdestinybondtohappen requires a target role"
            ),
        }
    }
}

impl std::error::Error for BattleScriptTrysetdestinybondtohappenError {}

/// Native immutable-value twin of canonical TypeScript's shared
/// `applyTrySetDestinyBondToHappen` helper.
///
/// Concrete attacker/target roles are supplied by the caller. The only write
/// is an OR of `HITMARKER_DESTINYBOND`, and only when the target currently has
/// Destiny Bond, the source sides differ, and Grudge is clear. Every status2
/// word, side, role binding, and unrelated hit-marker bit remains exact.
#[must_use]
pub fn apply_try_set_destiny_bond_to_happen(
    rules: &BattleScriptTrysetdestinybondtohappenRules,
    attacker: BattleScriptTrysetdestinybondtohappenBattler,
    target: BattleScriptTrysetdestinybondtohappenBattler,
) -> BattleScriptTrysetdestinybondtohappenRules {
    let attacker_state = rules.battlers[attacker.index()];
    let target_state = rules.battlers[target.index()];
    let should_set = target_state.status2 & BATTLE_SCRIPT_STATUS2_DESTINY_BOND != 0
        && attacker_state.side != target_state.side
        && rules.hit_marker & BATTLE_SCRIPT_HITMARKER_GRUDGE == 0;

    if !should_set {
        return *rules;
    }

    let mut next = *rules;
    next.hit_marker |= BATTLE_SCRIPT_HITMARKER_DESTINYBOND;
    next
}

/// Native immutable-value twin of the pure state transformation and control
/// result performed by `Cmd_trysetdestinybondtohappen`'s TypeScript handler.
///
/// Resolution intentionally happens attacker first, then target. Every valid
/// call invokes the shared helper and returns typed `Advance`, including
/// same-side, self-target, Grudge, and no-Destiny-Bond no-write cases.
pub fn apply_battle_script_trysetdestinybondtohappen(
    rules: &BattleScriptTrysetdestinybondtohappenRules,
) -> Result<BattleScriptTrysetdestinybondtohappenOutcome, BattleScriptTrysetdestinybondtohappenError>
{
    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptTrysetdestinybondtohappenError::MissingAttackerRole)?;
    let target = rules
        .selector_roles
        .target
        .ok_or(BattleScriptTrysetdestinybondtohappenError::MissingTargetRole)?;

    Ok(BattleScriptTrysetdestinybondtohappenOutcome {
        rules: apply_try_set_destiny_bond_to_happen(rules, attacker, target),
        control: BattleScriptTrysetdestinybondtohappenControl::Advance,
    })
}
