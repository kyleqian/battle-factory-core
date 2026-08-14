//! Pure `B_SCR_OP_SETTAUNT` decision and state transformation.
//!
//! This is the intentionally narrow state surface of
//! `src/engine/battleScriptSettauntOpcode.ts`, separated from that module's
//! opcode registration and the generic Battle Script machine. The TypeScript
//! handler first resolves its optional `target` role. A nonzero target
//! `tauntTimer` takes the failure jump without changing the complete narrow
//! state; a zero timer receives `2` and advances.
//!
//! Source authority is `Cmd_settaunt` in
//! `reference/pokeemerald/src/battle_script_commands.c:9156-9168`: the
//! command reads `gDisableStructs[gBattlerTarget].tauntTimer`, writes `2`
//! only when it was zero, and otherwise follows its pointer operand. The
//! four-bit `tauntTimer` field is adjacent to `tauntTimer2` in
//! `reference/pokeemerald/include/battle.h:91-92`; the canonical TypeScript
//! rules context and this port intentionally model only the functional
//! `tauntTimer`, never the source-dead adjacent field. The opcode table names
//! `B_SCR_OP_SETTAUNT` as `0xD0` at
//! `reference/pokeemerald/src/battle_script_commands.c:539`.
//!
//! This leaf deliberately owns neither opcode registration, absolute program
//! counters, a generic BattleState reducer, scheduler state, RNG, controller
//! state, nor presentation.

use core::fmt;

/// Source `MAX_BATTLERS_COUNT`; indexed source arrays always have four
/// battler slots, including the singles battles this Factory models.
pub const BATTLE_SCRIPT_SETTAUNT_BATTLER_COUNT: usize = 4;

/// The four-bit width of `DisableStruct::tauntTimer` from
/// `reference/pokeemerald/include/battle.h:91`.
pub const BATTLE_SCRIPT_SETTAUNT_TAUNT_TIMER_MAX: u8 = 0x0f;

/// The fresh timer written by `Cmd_settaunt` on its success path.
pub const BATTLE_SCRIPT_SETTAUNT_TAUNT_TIMER_SET: u8 = 2;

/// The complete source `BattleScriptBattlerId` domain used by the target
/// selector and the indexed `gDisableStructs` array.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum BattleScriptSettauntBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

/// Canonical fixed battler domain retained for source-array iteration and
/// tests that ratchet the role range.
pub const BATTLE_SCRIPT_SETTAUNT_BATTLERS: [BattleScriptSettauntBattler;
    BATTLE_SCRIPT_SETTAUNT_BATTLER_COUNT] = [
    BattleScriptSettauntBattler::Battler0,
    BattleScriptSettauntBattler::Battler1,
    BattleScriptSettauntBattler::Battler2,
    BattleScriptSettauntBattler::Battler3,
];

impl BattleScriptSettauntBattler {
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
/// it observes any target timer.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSettauntRoles {
    pub target: Option<BattleScriptSettauntBattler>,
}

/// The complete per-battler projection read or written by this opcode.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSettauntBattlerState {
    /// Source `DisableStruct::tauntTimer`, a four-bit unsigned timer.
    pub taunt_timer: u8,
}

/// Complete narrow projection read or written by the opcode. It holds four
/// source-indexed battlers and only the target role binding this leaf needs;
/// it is not a generic BattleState substitute.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSettauntRules {
    pub battlers: [BattleScriptSettauntBattlerState; BATTLE_SCRIPT_SETTAUNT_BATTLER_COUNT],
    pub selector_roles: BattleScriptSettauntRoles,
}

/// The source control distinction preserved without representing absolute
/// script addresses. `Cmd_settaunt` advances only on the zero-timer write;
/// the blocked path uses the opcode's canonical fail-label jump.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptSettauntControl {
    Advance,
    FailJump,
}

/// Complete projected result of one handler invocation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSettauntOutcome {
    pub rules: BattleScriptSettauntRules,
    pub control: BattleScriptSettauntControl,
}

/// Exact typed-reachable error thrown by the TypeScript handler when the
/// surrounding action has not supplied a target role.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptSettauntError {
    MissingTargetRole,
}

impl fmt::Display for BattleScriptSettauntError {
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

impl std::error::Error for BattleScriptSettauntError {}

/// Native immutable-value twin of the pure decision and state transformation
/// performed by `Cmd_settaunt`'s TypeScript handler.
///
/// Role resolution intentionally comes first. Once a target exists, any
/// nonzero four-bit timer returns `FailJump` with the complete projection
/// unchanged. Only a zero timer writes `2` into that target and returns
/// `Advance`; siblings and the role binding remain exact.
pub fn apply_battle_script_settaunt(
    rules: &BattleScriptSettauntRules,
) -> Result<BattleScriptSettauntOutcome, BattleScriptSettauntError> {
    let target = rules
        .selector_roles
        .target
        .ok_or(BattleScriptSettauntError::MissingTargetRole)?;

    if rules.battlers[target.index()].taunt_timer != 0 {
        return Ok(BattleScriptSettauntOutcome {
            rules: *rules,
            control: BattleScriptSettauntControl::FailJump,
        });
    }

    let mut next = *rules;
    next.battlers[target.index()].taunt_timer = BATTLE_SCRIPT_SETTAUNT_TAUNT_TIMER_SET;
    Ok(BattleScriptSettauntOutcome { rules: next, control: BattleScriptSettauntControl::Advance })
}
