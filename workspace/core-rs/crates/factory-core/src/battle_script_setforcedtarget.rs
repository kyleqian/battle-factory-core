//! Pure `B_SCR_OP_SETFORCEDTARGET` state transformation and control result.
//!
//! This is the intentionally narrow state surface of
//! `src/engine/battleScriptSetforcedtargetOpcode.ts`, separated from that
//! module's opcode registration and the generic Battle Script machine. The
//! TypeScript handler first requires its optional attacker role, reads that
//! attacker's `side` field, replaces only that side's Follow Me timer/target,
//! and advances.
//!
//! Source authority is `Cmd_setforcedtarget` in
//! `reference/pokeemerald/src/battle_script_commands.c:9093-9098`: it writes
//! `gSideTimers[GetBattlerSide(gBattlerAttacker)].followmeTimer = 1` and
//! `followmeTarget = gBattlerAttacker`, then takes the one-byte instruction
//! advance. The source `SideTimer` layout is
//! `reference/pokeemerald/include/battle.h:149-162`. The canonical TypeScript
//! projection carries `mistTimer` separately as `mistTimers`; this leaf
//! therefore exactly retains the `sideTimers` record fields that its handler
//! spreads and does not stand in for a generic battle state.
//!
//! This leaf deliberately owns neither opcode registration, absolute program
//! counters, a generic `BattleState` reducer, targeting, HP, failure/message
//! behavior, RNG, scheduler state, controller state, nor presentation.

use core::fmt;

/// Source `MAX_BATTLERS_COUNT`; indexed source arrays always have four
/// battler slots, including the singles battles this Factory models.
pub const BATTLE_SCRIPT_SETFORCEDTARGET_BATTLER_COUNT: usize = 4;

/// Source `NUM_BATTLE_SIDES` / the two entries in `gSideTimers`.
pub const BATTLE_SCRIPT_SETFORCEDTARGET_SIDE_COUNT: usize = 2;

/// The unconditional source write to `SideTimer::followmeTimer`.
pub const BATTLE_SCRIPT_SETFORCEDTARGET_FOLLOWME_TIMER_SET: u8 = 1;

/// The complete source `BattleScriptBattlerId` domain used by the attacker
/// selector and indexed source arrays.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum BattleScriptSetforcedtargetBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

/// Canonical fixed battler domain retained for source-array iteration and
/// tests that ratchet the role range.
pub const BATTLE_SCRIPT_SETFORCEDTARGET_BATTLERS: [BattleScriptSetforcedtargetBattler;
    BATTLE_SCRIPT_SETFORCEDTARGET_BATTLER_COUNT] = [
    BattleScriptSetforcedtargetBattler::Battler0,
    BattleScriptSetforcedtargetBattler::Battler1,
    BattleScriptSetforcedtargetBattler::Battler2,
    BattleScriptSetforcedtargetBattler::Battler3,
];

impl BattleScriptSetforcedtargetBattler {
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

/// Source `B_SIDE_PLAYER` / `B_SIDE_OPPONENT` domain used to index
/// `gSideTimers`.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum BattleScriptSetforcedtargetSide {
    Player = 0,
    Opponent = 1,
}

/// Canonical side domain retained for both `sideTimers` records.
pub const BATTLE_SCRIPT_SETFORCEDTARGET_SIDES: [BattleScriptSetforcedtargetSide;
    BATTLE_SCRIPT_SETFORCEDTARGET_SIDE_COUNT] = [
    BattleScriptSetforcedtargetSide::Player,
    BattleScriptSetforcedtargetSide::Opponent,
];

impl BattleScriptSetforcedtargetSide {
    /// Zero-based `gSideTimers` index.
    #[must_use]
    pub const fn index(self) -> usize {
        self as usize
    }

    /// Source `u8` side value.
    #[must_use]
    pub const fn as_u8(self) -> u8 {
        self as u8
    }

    /// The other source `gSideTimers` record.
    #[must_use]
    pub const fn opposite(self) -> Self {
        match self {
            Self::Player => Self::Opponent,
            Self::Opponent => Self::Player,
        }
    }
}

/// The only selector binding read by the canonical handler.
///
/// `None` is typed-reachable in `BattleScriptSelectorRoleBindings`; retaining
/// it preserves the exact canonical missing-attacker error before any battler
/// or side-timer indexed access occurs.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetforcedtargetRoles {
    pub attacker: Option<BattleScriptSetforcedtargetBattler>,
}

/// The complete per-battler projection read by this opcode.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetforcedtargetBattlerState {
    /// Canonical `BattleScriptRulesBattlerState::side`, mirroring the source
    /// `GetBattlerSide(gBattlerAttacker)` lookup performed by the command.
    pub side: BattleScriptSetforcedtargetSide,
}

/// The complete canonical `BattleScriptSideTimerState` projection that this
/// handler spreads. Every field is a source `u8`; battler-id fields use the
/// fixed four-value typed domain instead of accepting arbitrary bytes.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetforcedtargetSideTimerState {
    pub reflect_timer: u8,
    pub reflect_battler_id: BattleScriptSetforcedtargetBattler,
    pub lightscreen_timer: u8,
    pub lightscreen_battler_id: BattleScriptSetforcedtargetBattler,
    pub safeguard_timer: u8,
    pub safeguard_battler_id: BattleScriptSetforcedtargetBattler,
    pub mist_battler_id: BattleScriptSetforcedtargetBattler,
    pub followme_timer: u8,
    pub followme_target: BattleScriptSetforcedtargetBattler,
    pub spikes_amount: u8,
}

/// Complete narrow projection read or written by the opcode. It holds the
/// four source-indexed battler-side records, both `SideTimer` projections,
/// and only the attacker role binding this leaf needs; it is not a generic
/// `BattleState` substitute.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetforcedtargetRules {
    pub battlers:
        [BattleScriptSetforcedtargetBattlerState; BATTLE_SCRIPT_SETFORCEDTARGET_BATTLER_COUNT],
    pub side_timers:
        [BattleScriptSetforcedtargetSideTimerState; BATTLE_SCRIPT_SETFORCEDTARGET_SIDE_COUNT],
    pub selector_roles: BattleScriptSetforcedtargetRoles,
}

/// The sole control result for this unconditional, operand-free command.
/// Absolute program counters stay in the machine layer that this leaf does
/// not model.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptSetforcedtargetControl {
    Advance,
}

/// Complete projected result of one successful handler invocation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetforcedtargetOutcome {
    pub rules: BattleScriptSetforcedtargetRules,
    pub control: BattleScriptSetforcedtargetControl,
}

/// Exact typed-reachable error thrown by the TypeScript handler's
/// `requireBattlerRole(rules, "attacker")` call.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptSetforcedtargetError {
    MissingAttackerRole,
}

impl fmt::Display for BattleScriptSetforcedtargetError {
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

impl std::error::Error for BattleScriptSetforcedtargetError {}

/// Native immutable-value twin of the pure state transformation and control
/// result performed by `Cmd_setforcedtarget`'s TypeScript handler.
///
/// Role resolution intentionally comes first. Once an attacker exists, its
/// own battler record selects the `SideTimer` slot. Only that record's
/// `followme_timer` and `followme_target` are overwritten; all sibling timer,
/// id, and amount fields plus the opposite side record remain exact. The
/// source command advances after every successful application, including a
/// repeated overwrite.
pub fn apply_battle_script_setforcedtarget(
    rules: &BattleScriptSetforcedtargetRules,
) -> Result<BattleScriptSetforcedtargetOutcome, BattleScriptSetforcedtargetError> {
    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptSetforcedtargetError::MissingAttackerRole)?;

    let side = rules.battlers[attacker.index()].side;
    let mut next = *rules;
    let timer = &mut next.side_timers[side.index()];
    timer.followme_timer = BATTLE_SCRIPT_SETFORCEDTARGET_FOLLOWME_TIMER_SET;
    timer.followme_target = attacker;

    Ok(BattleScriptSetforcedtargetOutcome {
        rules: next,
        control: BattleScriptSetforcedtargetControl::Advance,
    })
}
