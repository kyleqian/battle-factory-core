//! Pure `B_SCR_OP_JUMPIFNOTFIRSTTURN` decision and control result.
//!
//! This is the intentionally narrow state surface of
//! `src/engine/battleScriptJumpifnotfirstturnOpcode.ts`, separated from that
//! module's opcode registration and the generic Battle Script machine. The
//! canonical handler requires its optional `attacker` role, reads only that
//! battler's `isFirstTurn`, and leaves the entire rules context untouched.
//!
//! Source authority is `Cmd_jumpifnotfirstturn` in
//! `reference/pokeemerald/src/battle_script_commands.c:6786-6794`. It reads
//! `gDisableStructs[gBattlerAttacker].isFirstTurn`; nonzero advances over the
//! opcode plus its four-byte failure pointer, while zero assigns that pointer
//! to `gBattlescriptCurrInstr`. `DisableStruct::isFirstTurn` is a source `u8`
//! (`reference/pokeemerald/include/battle.h:95`). Battle initialization and
//! switch-in set the field to 2 (`battle_main.c:3051,3220,3312`), and
//! `TurnValuesCleanUp(FALSE)` decrements a nonzero value, giving the reachable
//! source lifecycle 2 -> 1 -> 0 (`battle_main.c:4875-4876`).
//!
//! The source storage type itself permits all 256 `u8` values and its C truth
//! test would advance for any nonzero byte. The canonical TypeScript rules
//! constructor intentionally narrows this field with
//! `requireUnsigned(..., 2)` in `battleScriptRulesContext.ts`, so its durable
//! domain is exactly 0..=2. This Rust projection mirrors the canonical domain
//! with a validated three-value type rather than widening the port to generic
//! source storage.
//!
//! The source command is five bytes, but this leaf deliberately does not
//! carry, resolve, or validate its absolute failure program counter. `FailJump`
//! records only the semantic branch; the surrounding machine owns operands,
//! labels, instruction shape, and program-counter transitions.
//!
//! This leaf deliberately owns neither opcode registration, instruction
//! shape, a generic BattleState reducer, RNG, scheduler state, controller
//! state, nor presentation.

use core::fmt;

/// Source `MAX_BATTLERS_COUNT`; indexed source arrays retain four battler
/// slots even for the singles battles this Factory models.
pub const BATTLE_SCRIPT_JUMPIFNOTFIRSTTURN_BATTLER_COUNT: usize = 4;

/// The complete source `BattleScriptBattlerId` domain used by the attacker
/// selector and indexed `gDisableStructs` array.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum BattleScriptJumpifnotfirstturnBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

/// Canonical fixed battler domain retained for source-array iteration and
/// tests that ratchet the role range.
pub const BATTLE_SCRIPT_JUMPIFNOTFIRSTTURN_BATTLERS: [BattleScriptJumpifnotfirstturnBattler;
    BATTLE_SCRIPT_JUMPIFNOTFIRSTTURN_BATTLER_COUNT] = [
    BattleScriptJumpifnotfirstturnBattler::Battler0,
    BattleScriptJumpifnotfirstturnBattler::Battler1,
    BattleScriptJumpifnotfirstturnBattler::Battler2,
    BattleScriptJumpifnotfirstturnBattler::Battler3,
];

impl BattleScriptJumpifnotfirstturnBattler {
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

/// Canonically validated values of `DisableStruct::isFirstTurn`.
///
/// The variants deliberately retain the source integers. The TypeScript
/// context constructor rejects any input outside this exact 0..=2 domain
/// before the opcode handler can run.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum BattleScriptJumpifnotfirstturnIsFirstTurn {
    /// Countdown exhausted: the source command takes its failure branch.
    NotFirstTurn = 0,
    /// One cleanup has elapsed since the source initialized the countdown.
    Value1 = 1,
    /// Battle initialization or switch-in's source value.
    Value2 = 2,
}

impl BattleScriptJumpifnotfirstturnIsFirstTurn {
    /// Canonical numeric representation preserved from the source field.
    #[must_use]
    pub const fn as_u8(self) -> u8 {
        self as u8
    }

    /// Whether `Cmd_jumpifnotfirstturn`'s source truth test advances.
    #[must_use]
    pub const fn is_nonzero(self) -> bool {
        self.as_u8() != 0
    }
}

/// Rejection for a source-storage byte outside the canonical TypeScript
/// `isFirstTurn` domain. This narrow port intentionally does not represent a
/// generic source `u8` value after validation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifnotfirstturnIsFirstTurnError {
    pub value: u8,
}

impl fmt::Display for BattleScriptJumpifnotfirstturnIsFirstTurnError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            formatter,
            "isFirstTurn must be in 0..=2, got {}",
            self.value
        )
    }
}

impl std::error::Error for BattleScriptJumpifnotfirstturnIsFirstTurnError {}

impl TryFrom<u8> for BattleScriptJumpifnotfirstturnIsFirstTurn {
    type Error = BattleScriptJumpifnotfirstturnIsFirstTurnError;

    fn try_from(value: u8) -> Result<Self, Self::Error> {
        match value {
            0 => Ok(Self::NotFirstTurn),
            1 => Ok(Self::Value1),
            2 => Ok(Self::Value2),
            _ => Err(BattleScriptJumpifnotfirstturnIsFirstTurnError { value }),
        }
    }
}

/// The only per-battler field observed by the opcode.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifnotfirstturnBattlerState {
    /// Canonically validated source `gDisableStructs[battler].isFirstTurn`.
    pub is_first_turn: BattleScriptJumpifnotfirstturnIsFirstTurn,
}

/// The only selector binding read by the canonical opcode handler.
///
/// `None` is typed-reachable in `BattleScriptSelectorRoleBindings`; retaining
/// it lets this leaf preserve the handler's exact missing-attacker error.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifnotfirstturnRoles {
    pub attacker: Option<BattleScriptJumpifnotfirstturnBattler>,
}

/// Complete narrow projection read by the opcode. It holds all four
/// source-indexed `isFirstTurn` cells and the optional attacker role, but is
/// not a generic BattleState substitute.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifnotfirstturnRules {
    pub battlers: [BattleScriptJumpifnotfirstturnBattlerState;
        BATTLE_SCRIPT_JUMPIFNOTFIRSTTURN_BATTLER_COUNT],
    pub selector_roles: BattleScriptJumpifnotfirstturnRoles,
}

/// Machine-independent control result of this command.
///
/// `FailJump` deliberately carries no program counter. The surrounding Battle
/// Script machine owns the source pointer operand and its label resolution.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptJumpifnotfirstturnControl {
    /// The attacker has a nonzero first-turn countdown, so source advances.
    Advance,
    /// The countdown is zero, so source follows its failure pointer.
    FailJump,
}

/// Complete projected result of one successful handler invocation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptJumpifnotfirstturnOutcome {
    pub rules: BattleScriptJumpifnotfirstturnRules,
    pub control: BattleScriptJumpifnotfirstturnControl,
}

/// Exact typed-reachable error thrown by the canonical handler's
/// `requireBattlerRole(rules, "attacker")` call.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptJumpifnotfirstturnError {
    MissingAttackerRole,
}

impl fmt::Display for BattleScriptJumpifnotfirstturnError {
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

impl std::error::Error for BattleScriptJumpifnotfirstturnError {}

/// Native immutable-value twin of the pure decision and control result
/// performed by `Cmd_jumpifnotfirstturn`'s TypeScript handler.
///
/// Attacker resolution intentionally happens before the source field read.
/// On either valid branch, every field in this complete narrow projection is
/// returned unchanged. Nonzero canonical countdown values return `Advance`;
/// zero returns the unit-like `FailJump` and delegates pointer resolution to
/// the omitted Battle Script machine layer.
pub fn apply_battle_script_jumpifnotfirstturn(
    rules: &BattleScriptJumpifnotfirstturnRules,
) -> Result<BattleScriptJumpifnotfirstturnOutcome, BattleScriptJumpifnotfirstturnError> {
    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptJumpifnotfirstturnError::MissingAttackerRole)?;
    let control = if rules.battlers[attacker.index()].is_first_turn.is_nonzero() {
        BattleScriptJumpifnotfirstturnControl::Advance
    } else {
        BattleScriptJumpifnotfirstturnControl::FailJump
    };

    Ok(BattleScriptJumpifnotfirstturnOutcome { rules: *rules, control })
}
