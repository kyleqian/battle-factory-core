//! Pure B_SCR_OP_SETDEFENSECURLBIT state transformation and control result.
//!
//! This is the intentionally narrow state surface of
//! src/engine/battleScriptSetDefenseCurlBitOpcode.ts, separated from that
//! module's opcode registration and the generic Battle Script machine. The
//! TypeScript handler requires only its optional attacker role, ORs the source
//! Defense Curl bit into that attacker's own status2, and advances.
//!
//! Source authority is Cmd_setdefensecurlbit in
//! reference/pokeemerald/src/battle_script_commands.c:8858-8862: it ORs
//! STATUS2_DEFENSE_CURL into gBattleMons[gBattlerAttacker].status2 and takes
//! the one-byte instruction advance unconditionally. The bit definition is
//! STATUS2_DEFENSE_CURL at
//! reference/pokeemerald/include/constants/battle.h:154; the opcode table
//! identifies B_SCR_OP_SETDEFENSECURLBIT as 0xBF at
//! reference/pokeemerald/src/battle_script_commands.c:522.
//!
//! This leaf deliberately owns neither opcode registration, absolute program
//! counters, a generic BattleState reducer, scheduler state, RNG, controller
//! state, stat-change behavior, nor presentation.

use core::fmt;

/// Source MAX_BATTLERS_COUNT; indexed source arrays always have four battler
/// slots, including the singles battles this Factory models.
pub const BATTLE_SCRIPT_SETDEFENSECURLBIT_BATTLER_COUNT: usize = 4;

/// STATUS2_DEFENSE_CURL from include/constants/battle.h:154.
pub const BATTLE_SCRIPT_STATUS2_DEFENSE_CURL: u32 = 1 << 30;

/// The complete source BattleScriptBattlerId domain used by the attacker
/// selector and the indexed gBattleMons array.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum BattleScriptSetdefensecurlbitBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

/// Canonical fixed battler domain retained for source-array iteration and
/// tests that ratchet the role range.
pub const BATTLE_SCRIPT_SETDEFENSECURLBIT_BATTLERS: [BattleScriptSetdefensecurlbitBattler;
    BATTLE_SCRIPT_SETDEFENSECURLBIT_BATTLER_COUNT] = [
    BattleScriptSetdefensecurlbitBattler::Battler0,
    BattleScriptSetdefensecurlbitBattler::Battler1,
    BattleScriptSetdefensecurlbitBattler::Battler2,
    BattleScriptSetdefensecurlbitBattler::Battler3,
];

impl BattleScriptSetdefensecurlbitBattler {
    /// Zero-based source array index.
    #[must_use]
    pub const fn index(self) -> usize {
        self as usize
    }

    /// Source u8 battler id.
    #[must_use]
    pub const fn as_u8(self) -> u8 {
        self as u8
    }
}

/// The only selector binding read by the canonical opcode handler.
///
/// None is typed-reachable in BattleScriptSelectorRoleBindings; retaining it
/// lets this leaf preserve the exact canonical missing-role error instead of
/// silently fabricating an attacker.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetdefensecurlbitRoles {
    pub attacker: Option<BattleScriptSetdefensecurlbitBattler>,
}

/// The complete per-battler projection read or written by this opcode.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetdefensecurlbitBattlerState {
    /// Source gBattleMons[battler].status2, an unsigned 32-bit packed field.
    pub status2: u32,
}

/// Complete narrow projection read or written by the opcode. It holds four
/// source-indexed battlers and only the attacker role binding this leaf needs;
/// it is not a generic BattleState substitute.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetdefensecurlbitRules {
    pub battlers:
        [BattleScriptSetdefensecurlbitBattlerState; BATTLE_SCRIPT_SETDEFENSECURLBIT_BATTLER_COUNT],
    pub selector_roles: BattleScriptSetdefensecurlbitRoles,
}

/// The sole control result for this unconditional, operand-free command.
/// Absolute program counters stay in the machine layer that this leaf does
/// not model.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptSetdefensecurlbitControl {
    Advance,
}

/// Complete projected result of one successful handler invocation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetdefensecurlbitOutcome {
    pub rules: BattleScriptSetdefensecurlbitRules,
    pub control: BattleScriptSetdefensecurlbitControl,
}

/// Exact typed-reachable error thrown by the TypeScript handler's
/// requireBattlerRole(rules, "attacker") call.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptSetdefensecurlbitError {
    MissingAttackerRole,
}

impl fmt::Display for BattleScriptSetdefensecurlbitError {
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

impl std::error::Error for BattleScriptSetdefensecurlbitError {}

/// Native immutable-value twin of the pure state transformation and control
/// result performed by Cmd_setdefensecurlbit's TypeScript handler.
///
/// Role resolution intentionally comes first. Once an attacker exists, only
/// that battler's packed status2 receives STATUS2_DEFENSE_CURL; unrelated
/// packed bits, sibling battlers, and the attacker binding remain exact. The
/// source command advances after every successful application, including a
/// repeated idempotent OR.
pub fn apply_battle_script_setdefensecurlbit(
    rules: &BattleScriptSetdefensecurlbitRules,
) -> Result<BattleScriptSetdefensecurlbitOutcome, BattleScriptSetdefensecurlbitError> {
    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptSetdefensecurlbitError::MissingAttackerRole)?;

    let mut next = *rules;
    next.battlers[attacker.index()].status2 |= BATTLE_SCRIPT_STATUS2_DEFENSE_CURL;
    Ok(BattleScriptSetdefensecurlbitOutcome {
        rules: next,
        control: BattleScriptSetdefensecurlbitControl::Advance,
    })
}
