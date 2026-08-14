//! Pure `B_SCR_OP_TRYSETGRUDGE` decision, state transformation, and control
//! result.
//!
//! This is the intentionally narrow state surface of
//! `src/engine/battleScriptTrysetgrudgeOpcode.ts`, separated from that
//! module's opcode registration and the generic Battle Script machine. The
//! TypeScript handler requires its optional `attacker` role first. If that
//! battler already has Grudge, it resolves the instruction's failure label and
//! jumps; otherwise it ORs `STATUS3_GRUDGE` into only that battler and
//! advances.
//!
//! Source authority is `Cmd_trysetgrudge` in
//! `reference/pokeemerald/src/battle_script_commands.c:9454-9465`. The source
//! declares `gStatuses3[MAX_BATTLERS_COUNT]` as `u32` in
//! `reference/pokeemerald/include/battle.h:686`, and `STATUS3_GRUDGE` is
//! `(1 << 14)` in `reference/pokeemerald/include/constants/battle.h:171`.
//! Canonical TypeScript deliberately accepts the full unsigned 32-bit domain
//! for every `battlers[index].status3` through `requireUnsigned(...,
//! 0xffff_ffff) >>> 0` in `src/engine/battleScriptRulesContext.ts:2160`.
//! Thus this projection uses `u32` for both the native source storage and the
//! canonical TypeScript integer domain; it does not narrow status3 to the
//! currently named source flags.
//!
//! The source command is five bytes: opcode `0xDC` followed by a four-byte
//! failure pointer. The TypeScript handler resolves that pointer through the
//! Battle Script program before it returns a machine transition. This leaf
//! intentionally returns the unit-like `FailJump` decision instead: it
//! preserves the failure branch without carrying, embedding, or resolving an
//! absolute program counter.
//!
//! This leaf deliberately owns neither absolute program counters, instruction
//! shape validation, opcode registration, a generic BattleState reducer, RNG,
//! scheduler state, controller state, nor presentation.

use core::fmt;

/// Source `MAX_BATTLERS_COUNT`; indexed source arrays always retain four
/// battler slots, including the singles battles this Factory models.
pub const BATTLE_SCRIPT_TRYSETGRUDGE_BATTLER_COUNT: usize = 4;

/// `STATUS3_GRUDGE` from `include/constants/battle.h:171`.
pub const BATTLE_SCRIPT_STATUS3_GRUDGE: u32 = 1 << 14;

/// The complete source `BattleScriptBattlerId` domain used by the attacker
/// selector and indexed `gStatuses3` array.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum BattleScriptTrysetgrudgeBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

/// Canonical fixed battler domain retained for source-array iteration and
/// tests that ratchet the role range.
pub const BATTLE_SCRIPT_TRYSETGRUDGE_BATTLERS: [BattleScriptTrysetgrudgeBattler;
    BATTLE_SCRIPT_TRYSETGRUDGE_BATTLER_COUNT] = [
    BattleScriptTrysetgrudgeBattler::Battler0,
    BattleScriptTrysetgrudgeBattler::Battler1,
    BattleScriptTrysetgrudgeBattler::Battler2,
    BattleScriptTrysetgrudgeBattler::Battler3,
];

impl BattleScriptTrysetgrudgeBattler {
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
/// it lets this leaf preserve the exact canonical missing-role error before it
/// reads a status3 cell or the instruction's failure target.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetgrudgeRoles {
    pub attacker: Option<BattleScriptTrysetgrudgeBattler>,
}

/// The complete per-battler projection read or written by this opcode.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetgrudgeBattlerState {
    /// Source `gStatuses3[battler]` and canonical TypeScript `status3`: the
    /// complete unsigned 32-bit packed flag word.
    pub status3: u32,
}

/// Complete narrow projection read or written by the opcode. It holds four
/// source-indexed status3 words and only the attacker role binding this leaf
/// needs; it is not a generic BattleState substitute.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetgrudgeRules {
    pub battlers: [BattleScriptTrysetgrudgeBattlerState; BATTLE_SCRIPT_TRYSETGRUDGE_BATTLER_COUNT],
    pub selector_roles: BattleScriptTrysetgrudgeRoles,
}

/// The machine-independent control result of this command.
///
/// `FailJump` deliberately carries no program counter. The surrounding Battle
/// Script machine owns the source operand and its absolute label resolution.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTrysetgrudgeControl {
    /// The attacker was already Grudged, so the source command branches to its
    /// four-byte failure target.
    FailJump,
    /// The command set the attacker's Grudge flag and advances five bytes.
    Advance,
}

/// Complete projected result of one successful handler invocation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetgrudgeOutcome {
    pub rules: BattleScriptTrysetgrudgeRules,
    pub control: BattleScriptTrysetgrudgeControl,
}

/// Exact typed-reachable error thrown by the canonical handler's
/// `requireBattlerRole(rules, "attacker")` call.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTrysetgrudgeError {
    MissingAttackerRole,
}

impl fmt::Display for BattleScriptTrysetgrudgeError {
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

impl std::error::Error for BattleScriptTrysetgrudgeError {}

/// Native immutable-value twin of the pure decision, state transformation,
/// and control result performed by `Cmd_trysetgrudge`'s TypeScript handler.
///
/// Role resolution intentionally comes first. On the already-Grudged branch,
/// every projected value remains exact and the unit-like `FailJump` delegates
/// the source pointer's program-counter resolution to the omitted machine
/// layer. On the clear branch, the packed bit is ORed into only the attacker;
/// all siblings and the role binding remain exact, and the command advances.
pub fn apply_battle_script_trysetgrudge(
    rules: &BattleScriptTrysetgrudgeRules,
) -> Result<BattleScriptTrysetgrudgeOutcome, BattleScriptTrysetgrudgeError> {
    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptTrysetgrudgeError::MissingAttackerRole)?;

    if rules.battlers[attacker.index()].status3 & BATTLE_SCRIPT_STATUS3_GRUDGE != 0 {
        return Ok(BattleScriptTrysetgrudgeOutcome {
            rules: *rules,
            control: BattleScriptTrysetgrudgeControl::FailJump,
        });
    }

    let mut next = *rules;
    next.battlers[attacker.index()].status3 |= BATTLE_SCRIPT_STATUS3_GRUDGE;
    Ok(BattleScriptTrysetgrudgeOutcome {
        rules: next,
        control: BattleScriptTrysetgrudgeControl::Advance,
    })
}
