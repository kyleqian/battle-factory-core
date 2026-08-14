//! Pure `B_SCR_OP_CONFUSEIFREPEATINGATTACKENDS` state transformation and
//! control result.
//!
//! This is the intentionally narrow state surface of
//! `src/engine/battleScriptConfuseifrepeatingattackendsOpcode.ts`, separated
//! from that module's instruction registration and the generic Battle Script
//! machine. The canonical handler first resolves its optional `attacker`
//! role. When that attacker's Thrash-family lock field is clear, it overwrites
//! `moveEffectByte` with `MOVE_EFFECT_THRASH | MOVE_EFFECT_AFFECTS_USER`;
//! when either lock bit is set, it preserves the complete narrow projection.
//! Both successful paths advance the operand-free command.
//!
//! Source authority is `Cmd_confuseifrepeatingattackends` in
//! `reference/pokeemerald/src/battle_script_commands.c:7131-7136`: it reads
//! `gBattleMons[gBattlerAttacker].status2`, tests `STATUS2_LOCK_CONFUSE`,
//! conditionally writes `gBattleCommunication[MOVE_EFFECT_BYTE]`, then
//! increments the one-byte instruction. The command table names
//! `B_SCR_OP_CONFUSEIFREPEATINGATTACKENDS` as `0x8C` at
//! `battle_script_commands.c:471`; `BattleScript_EffectRampage2` emits it at
//! `data/battle_scripts_1.s:589-591`.
//!
//! `BattlePokemon::status2` is a complete packed source `u32`
//! (`reference/pokeemerald/include/pokemon.h:293`), and its two-bit
//! `STATUS2_LOCK_CONFUSE` field is bits 10-11 (`include/constants/battle.h:137`).
//! This projection therefore retains each complete `u32`, rather than a
//! hand-reduced lock boolean. `gBattleCommunication` is a source `u8` array
//! (`reference/pokeemerald/src/battle_main.c:209`), so `MOVE_EFFECT_BYTE` is
//! exactly one byte; the canonical TypeScript constructor independently
//! validates `moveEffectByte` over `0..=0xff`
//! (`src/engine/battleScriptRulesContext.ts:2622`). Rust's `u8` preserves that
//! full domain. `MOVE_EFFECT_THRASH` is 53 and `MOVE_EFFECT_AFFECTS_USER` is
//! bit 6 / 64 (`include/constants/battle.h:300,309`), producing byte 117.
//!
//! This leaf deliberately owns neither instruction shape or registration,
//! downstream `SetMoveEffect`, a generic `BattleState`, RNG, scheduling,
//! presentation, nor any ABI or WASM export.

use core::fmt;

/// Source `MAX_BATTLERS_COUNT`; indexed source arrays always have four
/// battler slots, including the singles battles this Factory models.
pub const BATTLE_SCRIPT_CONFUSEIFREPEATINGATTACKENDS_BATTLER_COUNT: usize = 4;

/// `STATUS2_LOCK_CONFUSE` from `include/constants/battle.h:137`.
pub const BATTLE_SCRIPT_STATUS2_LOCK_CONFUSE: u32 = (1 << 10) | (1 << 11);

/// The first individual bit in `STATUS2_LOCK_CONFUSE`, retained so the
/// generated differential matrix proves either sub-bit selects preservation.
pub const BATTLE_SCRIPT_STATUS2_LOCK_CONFUSE_TURN_1: u32 = 1 << 10;

/// The second individual bit in `STATUS2_LOCK_CONFUSE`, retained so the
/// generated differential matrix proves either sub-bit selects preservation.
pub const BATTLE_SCRIPT_STATUS2_LOCK_CONFUSE_TURN_2: u32 = 1 << 11;

/// `MOVE_EFFECT_THRASH` from `include/constants/battle.h:300`.
pub const BATTLE_SCRIPT_MOVE_EFFECT_THRASH: u8 = 53;

/// `MOVE_EFFECT_AFFECTS_USER` from `include/constants/battle.h:309`.
pub const BATTLE_SCRIPT_MOVE_EFFECT_AFFECTS_USER: u8 = 1 << 6;

/// The exact `MOVE_EFFECT_BYTE` written by this handler when its attacker is
/// not already in the Thrash-family lock state: `53 | 64 == 117`.
pub const BATTLE_SCRIPT_CONFUSEIFREPEATINGATTACKENDS_MOVE_EFFECT_BYTE: u8 =
    BATTLE_SCRIPT_MOVE_EFFECT_THRASH | BATTLE_SCRIPT_MOVE_EFFECT_AFFECTS_USER;

/// The complete source `BattleScriptBattlerId` domain used by the attacker
/// selector and the indexed `gBattleMons` array.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum BattleScriptConfuseifrepeatingattackendsBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

/// Canonical fixed battler domain retained for source-array iteration and
/// tests that ratchet the role range.
pub const BATTLE_SCRIPT_CONFUSEIFREPEATINGATTACKENDS_BATTLERS:
    [BattleScriptConfuseifrepeatingattackendsBattler;
        BATTLE_SCRIPT_CONFUSEIFREPEATINGATTACKENDS_BATTLER_COUNT] = [
    BattleScriptConfuseifrepeatingattackendsBattler::Battler0,
    BattleScriptConfuseifrepeatingattackendsBattler::Battler1,
    BattleScriptConfuseifrepeatingattackendsBattler::Battler2,
    BattleScriptConfuseifrepeatingattackendsBattler::Battler3,
];

impl BattleScriptConfuseifrepeatingattackendsBattler {
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
/// it lets this leaf preserve the handler's exact custom missing-attacker
/// error before it reads an indexed packed status word.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptConfuseifrepeatingattackendsRoles {
    pub attacker: Option<BattleScriptConfuseifrepeatingattackendsBattler>,
}

/// The complete per-battler projection read by this opcode.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptConfuseifrepeatingattackendsBattlerState {
    /// Source `gBattleMons[battler].status2`: a complete packed unsigned
    /// 32-bit word, not a Thrash-only bitfield.
    pub status2: u32,
}

/// Complete narrow projection read or written by the opcode. It holds four
/// source-indexed packed status words, the full source-byte
/// `MOVE_EFFECT_BYTE`, and the only selector role this leaf needs; it is not
/// a generic `BattleState` substitute.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptConfuseifrepeatingattackendsRules {
    pub battlers: [BattleScriptConfuseifrepeatingattackendsBattlerState;
        BATTLE_SCRIPT_CONFUSEIFREPEATINGATTACKENDS_BATTLER_COUNT],
    /// Source `gBattleCommunication[MOVE_EFFECT_BYTE]`, a complete `u8` over
    /// the canonical TypeScript domain `0..=255`.
    pub move_effect_byte: u8,
    pub selector_roles: BattleScriptConfuseifrepeatingattackendsRoles,
}

/// The sole control result for this unconditional, operand-free command.
/// Absolute program counters stay in the machine layer that this leaf does
/// not model.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptConfuseifrepeatingattackendsControl {
    Advance,
}

/// Complete projected result of one successful handler invocation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptConfuseifrepeatingattackendsOutcome {
    pub rules: BattleScriptConfuseifrepeatingattackendsRules,
    pub control: BattleScriptConfuseifrepeatingattackendsControl,
}

/// Exact typed-reachable custom error thrown by the canonical TypeScript
/// handler when the surrounding action has not supplied an attacker role.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptConfuseifrepeatingattackendsError {
    MissingAttackerRole,
}

impl fmt::Display for BattleScriptConfuseifrepeatingattackendsError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::MissingAttackerRole => {
                write!(
                    formatter,
                    "Cmd_confuseifrepeatingattackends requires an attacker role"
                )
            }
        }
    }
}

impl std::error::Error for BattleScriptConfuseifrepeatingattackendsError {}

/// Native immutable-value twin of the pure state transformation and control
/// result performed by `Cmd_confuseifrepeatingattackends`'s TypeScript
/// handler.
///
/// Role resolution intentionally happens before every source-field read. If
/// either `STATUS2_LOCK_CONFUSE` bit is present, the full narrow state is
/// preserved exactly and the command still returns `Advance`. Otherwise only
/// `move_effect_byte` is overwritten with the fixed Thrash/self byte; every
/// packed status word, sibling, and role binding remains exact. Repeated
/// successful applications always return typed `Advance`.
pub fn apply_battle_script_confuseifrepeatingattackends(
    rules: &BattleScriptConfuseifrepeatingattackendsRules,
) -> Result<
    BattleScriptConfuseifrepeatingattackendsOutcome,
    BattleScriptConfuseifrepeatingattackendsError,
> {
    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptConfuseifrepeatingattackendsError::MissingAttackerRole)?;

    if rules.battlers[attacker.index()].status2 & BATTLE_SCRIPT_STATUS2_LOCK_CONFUSE != 0 {
        return Ok(BattleScriptConfuseifrepeatingattackendsOutcome {
            rules: *rules,
            control: BattleScriptConfuseifrepeatingattackendsControl::Advance,
        });
    }

    let mut next = *rules;
    next.move_effect_byte = BATTLE_SCRIPT_CONFUSEIFREPEATINGATTACKENDS_MOVE_EFFECT_BYTE;
    Ok(BattleScriptConfuseifrepeatingattackendsOutcome {
        rules: next,
        control: BattleScriptConfuseifrepeatingattackendsControl::Advance,
    })
}
