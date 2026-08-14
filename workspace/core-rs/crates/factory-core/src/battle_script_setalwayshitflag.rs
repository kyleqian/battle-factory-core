//! Pure `B_SCR_OP_SETALWAYSHITFLAG` state transformation.
//!
//! This is the intentionally narrow state surface of
//! `src/engine/battleScriptSetalwayshitflagOpcode.ts`, separated from that
//! module's opcode registration and the generic Battle Script machine. The
//! TypeScript handler resolves its `attacker` and `target` roles through
//! `requireBattlerRole`, then calls `withBattler` to replace exactly the
//! target's `status3` and `battlerWithSureHit` fields.
//!
//! Source authority is `Cmd_setalwayshitflag` in
//! `reference/pokeemerald/src/battle_script_commands.c:8134-8139`:
//! it clears `STATUS3_ALWAYS_HITS`, writes `STATUS3_ALWAYS_HITS_TURN(2)`, and
//! stores `gBattlerAttacker` in the target's `DisableStruct::battlerWithSureHit`.
//! The packed-field definitions are in
//! `reference/pokeemerald/include/constants/battle.h:160-161`; the owner
//! field is the `u8` member in `reference/pokeemerald/include/battle.h:94`.
//! The sole operand-free opcode is emitted by `setalwayshitflag` in
//! `reference/pokeemerald/data/battle_scripts_1.s:1286-1294` (the opcode is
//! at `:1292`) for Lock On and Mind Reader's shared effect script.
//!
//! This leaf deliberately owns neither opcode registration, a BattleState
//! reducer, scheduler state, RNG, controller state, nor presentation.

use core::fmt;

/// Source `MAX_BATTLERS_COUNT`; every relevant source array has exactly four
/// indexed battler slots, even when the active battle is singles.
pub const BATTLE_SCRIPT_SETALWAYSHITFLAG_BATTLER_COUNT: usize = 4;

/// `STATUS3_ALWAYS_HITS` from `include/constants/battle.h:160`.
pub const BATTLE_SCRIPT_STATUS3_ALWAYS_HITS: u32 = (1 << 3) | (1 << 4);

/// `STATUS3_ALWAYS_HITS_TURN(2)` from `include/constants/battle.h:161`.
pub const BATTLE_SCRIPT_STATUS3_ALWAYS_HITS_TURN_2: u32 =
    (2 << 3) & BATTLE_SCRIPT_STATUS3_ALWAYS_HITS;

/// The complete `BattleScriptBattlerId` domain used by the source's attacker,
/// target, status, and DisableStruct arrays.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum BattleScriptSetalwayshitflagBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

/// Canonical fixed battler domain, retained for source-array iteration and
/// tests that ratchet the role range.
pub const BATTLE_SCRIPT_SETALWAYSHITFLAG_BATTLERS: [BattleScriptSetalwayshitflagBattler;
    BATTLE_SCRIPT_SETALWAYSHITFLAG_BATTLER_COUNT] = [
    BattleScriptSetalwayshitflagBattler::Battler0,
    BattleScriptSetalwayshitflagBattler::Battler1,
    BattleScriptSetalwayshitflagBattler::Battler2,
    BattleScriptSetalwayshitflagBattler::Battler3,
];

impl BattleScriptSetalwayshitflagBattler {
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

/// The two fields `Cmd_setalwayshitflag` can observe or replace on one
/// target battler. Every other BattlePokemon/DisableStruct field is outside
/// this pure projection.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetalwayshitflagBattlerState {
    /// Source `gStatuses3[battler]`, an unsigned 32-bit packed field.
    pub status3: u32,
    /// Source `gDisableStructs[battler].battlerWithSureHit`, always a valid
    /// source battler id after rules-context construction.
    pub battler_with_sure_hit: BattleScriptSetalwayshitflagBattler,
}

/// The only selector bindings read by the canonical opcode handler.
///
/// Null is typed-reachable in `BattleScriptSelectorRoleBindings`; retaining it
/// lets this leaf preserve the exact canonical missing-role errors instead of
/// silently fabricating a battler.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetalwayshitflagRoles {
    pub attacker: Option<BattleScriptSetalwayshitflagBattler>,
    pub target: Option<BattleScriptSetalwayshitflagBattler>,
}

/// Complete narrow projection read or written by the opcode. It holds four
/// source-indexed battlers and only the attacker/target role bindings needed
/// by `requireBattlerRole`; it is not a generic BattleState substitute.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSetalwayshitflagRules {
    pub battlers:
        [BattleScriptSetalwayshitflagBattlerState; BATTLE_SCRIPT_SETALWAYSHITFLAG_BATTLER_COUNT],
    pub selector_roles: BattleScriptSetalwayshitflagRoles,
}

/// Exact typed-reachable errors thrown by the TypeScript handler's two
/// `requireBattlerRole` calls.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptSetalwayshitflagError {
    MissingAttackerRole,
    MissingTargetRole,
}

impl fmt::Display for BattleScriptSetalwayshitflagError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::MissingAttackerRole => {
                write!(
                    formatter,
                    "Battle Script hit-chain command requires a attacker role"
                )
            }
            Self::MissingTargetRole => {
                write!(
                    formatter,
                    "Battle Script hit-chain command requires a target role"
                )
            }
        }
    }
}

impl std::error::Error for BattleScriptSetalwayshitflagError {}

/// Native immutable-value twin of the pure state transformation performed by
/// `Cmd_setalwayshitflag`'s TypeScript handler.
///
/// Resolution order intentionally matches the source seam: attacker is
/// required before target, so a state missing both roles returns
/// `MissingAttackerRole`. On success only the selected target is changed:
/// the entire two-bit always-hits packed field is replaced with turn 2 and
/// the target's sure-hit owner becomes the attacker.
pub fn apply_battle_script_setalwayshitflag(
    rules: &BattleScriptSetalwayshitflagRules,
) -> Result<BattleScriptSetalwayshitflagRules, BattleScriptSetalwayshitflagError> {
    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptSetalwayshitflagError::MissingAttackerRole)?;
    let target = rules
        .selector_roles
        .target
        .ok_or(BattleScriptSetalwayshitflagError::MissingTargetRole)?;

    let mut next = *rules;
    let target_state = &mut next.battlers[target.index()];
    target_state.status3 = (target_state.status3 & !BATTLE_SCRIPT_STATUS3_ALWAYS_HITS)
        | BATTLE_SCRIPT_STATUS3_ALWAYS_HITS_TURN_2;
    target_state.battler_with_sure_hit = attacker;
    Ok(next)
}
