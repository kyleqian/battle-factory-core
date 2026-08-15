//! Pure `B_SCR_OP_TRYSETSNATCH` state transformation and control result.
//!
//! This is the deliberately narrow, machine-independent port of only
//! `Cmd_trysetsnatch` from `src/engine/battleScriptSnatchOpcode.ts`. The
//! sibling TypeScript commands `B_SCR_OP_SNATCHSETBATTLERS` and
//! `B_SCR_OP_SWAPATTACKERWITHTARGET` remain independent future leaves.
//!
//! Source authority is `Cmd_trysetsnatch` in
//! `reference/pokeemerald/src/battle_script_commands.c:9553-9565`. It first
//! assigns `gSpecialStatuses[gBattlerAttacker].ppNotAffectedByPressure = 1`,
//! then compares the complete `u8 gCurrentTurnActionNumber` with
//! `gBattlersCount - 1`; only the non-final branch assigns
//! `gProtectStructs[gBattlerAttacker].stealMove = 1`. `stealMove` and
//! `ppNotAffectedByPressure` are distinct one-bit fields in
//! `reference/pokeemerald/include/battle.h:106-111,132-140`.
//!
//! The dispatcher associates `B_SCR_OP_TRYSETSNATCH` / opcode `0xE0` with
//! this command at `battle_script_commands.c:552-558`; its canonical five-byte
//! shape is the opcode followed by a four-byte pointer
//! (`asm/macros/battle_script.inc:1144-1147`). The concrete Snatch call site
//! is `BattleScript_EffectSnatch` in `data/battle_scripts_1.s:2543-2545`,
//! where that pointer is `BattleScript_FailedFromAtkString`.
//!
//! The TypeScript handler resolves the pointer only when returning its generic
//! machine jump transition. This leaf intentionally returns unit-like
//! `FailJump`: it keeps the semantic failure branch while omitting the
//! machine-owned resolved absolute program counter.
//!
//! This leaf deliberately owns neither opcode registration, program operand
//! validation, scheduler, RNG, controller state, presentation, ABI/WASM
//! exports, nor a generic battle-state reducer.

use core::fmt;

/// Source `MAX_BATTLERS_COUNT`; source arrays retain four slots even in
/// Factory singles battles.
pub const BATTLE_SCRIPT_TRYSETSNATCH_BATTLER_COUNT: usize = 4;

/// `BATTLE_TYPE_DOUBLE` from `include/constants/battle.h:59` and canonical
/// `BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE` in `battleScriptRulesContext.ts:155`.
pub const BATTLE_SCRIPT_TRYSETSNATCH_BATTLE_TYPE_DOUBLE: u32 = 1 << 0;

/// Complete source battler-id domain used by the attacker role, selector-role
/// siblings, and the fixed source-indexed status arrays.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum BattleScriptTrysetsnatchBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

/// Canonical fixed battler domain retained for source-array iteration and
/// coverage of every valid doubles attacker.
pub const BATTLE_SCRIPT_TRYSETSNATCH_BATTLERS: [BattleScriptTrysetsnatchBattler;
    BATTLE_SCRIPT_TRYSETSNATCH_BATTLER_COUNT] = [
    BattleScriptTrysetsnatchBattler::Battler0,
    BattleScriptTrysetsnatchBattler::Battler1,
    BattleScriptTrysetsnatchBattler::Battler2,
    BattleScriptTrysetsnatchBattler::Battler3,
];

impl BattleScriptTrysetsnatchBattler {
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

/// Canonically valid `gBattlersCount` values for a regular singles or doubles
/// battle. Source storage is `u8`, while the canonical rules context rejects
/// all other bytes before this command can run.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum BattleScriptTrysetsnatchBattlersCount {
    Singles = 2,
    Doubles = 4,
}

impl BattleScriptTrysetsnatchBattlersCount {
    /// Canonical/source `gBattlersCount` byte.
    #[must_use]
    pub const fn as_u8(self) -> u8 {
        self as u8
    }

    /// Exact source `gBattlersCount - 1` operand used by the equality branch.
    #[must_use]
    pub const fn final_action_number(self) -> u8 {
        self.as_u8() - 1
    }
}

/// Error matching canonical `battleTopology.battlersCount` validation when a
/// caller tries to create this narrow topology from a noncanonical source byte.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetsnatchBattlersCountError {
    pub value: u8,
}

impl fmt::Display for BattleScriptTrysetsnatchBattlersCountError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            formatter,
            "battleTopology.battlersCount must be exactly 2 or 4, got {}",
            self.value
        )
    }
}

impl std::error::Error for BattleScriptTrysetsnatchBattlersCountError {}

impl TryFrom<u8> for BattleScriptTrysetsnatchBattlersCount {
    type Error = BattleScriptTrysetsnatchBattlersCountError;

    fn try_from(value: u8) -> Result<Self, Self::Error> {
        match value {
            2 => Ok(Self::Singles),
            4 => Ok(Self::Doubles),
            _ => Err(BattleScriptTrysetsnatchBattlersCountError { value }),
        }
    }
}

/// Source-shaped one-bit value shared by the two distinct fields this command
/// reads or writes. The canonical TypeScript domain is `0 | 1`.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum BattleScriptTrysetsnatchBit {
    Clear = 0,
    Set = 1,
}

impl BattleScriptTrysetsnatchBit {
    /// Source/canonical numeric representation.
    #[must_use]
    pub const fn as_u8(self) -> u8 {
        self as u8
    }
}

/// Canonical topology companion fields retained by this leaf.
///
/// `Cmd_trysetsnatch` reads only `battlers_count`, but the canonical context
/// carries the complete `u32 gBattleTypeFlags` word. Making the matching
/// `BATTLE_TYPE_DOUBLE` invariant unconstructable here keeps the leaf aligned
/// with `createBattleScriptRulesContext` without inventing an opcode-local
/// invalid-topology branch.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetsnatchTopology {
    battlers_count: BattleScriptTrysetsnatchBattlersCount,
    battle_type_flags: u32,
}

impl BattleScriptTrysetsnatchTopology {
    /// Creates a canonical two- or four-battler topology only when its double
    /// flag agrees with its battler count.
    pub const fn new(
        battlers_count: BattleScriptTrysetsnatchBattlersCount,
        battle_type_flags: u32,
    ) -> Result<Self, BattleScriptTrysetsnatchTopologyError> {
        let flag_is_double = battle_type_flags & BATTLE_SCRIPT_TRYSETSNATCH_BATTLE_TYPE_DOUBLE != 0;
        let count_is_double = matches!(
            battlers_count,
            BattleScriptTrysetsnatchBattlersCount::Doubles
        );
        if flag_is_double != count_is_double {
            return Err(BattleScriptTrysetsnatchTopologyError {
                battlers_count,
                battle_type_flags,
            });
        }
        Ok(Self { battlers_count, battle_type_flags })
    }

    /// Canonical/source `gBattlersCount` value.
    #[must_use]
    pub const fn battlers_count(self) -> BattleScriptTrysetsnatchBattlersCount {
        self.battlers_count
    }

    /// Complete preserved source `u32 gBattleTypeFlags` word.
    #[must_use]
    pub const fn battle_type_flags(self) -> u32 {
        self.battle_type_flags
    }
}

/// Error matching the canonical BATTLE_TYPE_DOUBLE/count consistency rule.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetsnatchTopologyError {
    pub battlers_count: BattleScriptTrysetsnatchBattlersCount,
    pub battle_type_flags: u32,
}

impl fmt::Display for BattleScriptTrysetsnatchTopologyError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            formatter,
            "battleTopology BATTLE_TYPE_DOUBLE must be set if and only if battlersCount is 4"
        )
    }
}

impl std::error::Error for BattleScriptTrysetsnatchTopologyError {}

/// Complete per-battler fields read or written by this command.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetsnatchBattlerState {
    /// `gProtectStructs[battler].stealMove`.
    pub steal_move: BattleScriptTrysetsnatchBit,
    /// `gSpecialStatuses[battler].ppNotAffectedByPressure`.
    pub pp_not_affected_by_pressure: BattleScriptTrysetsnatchBit,
}

/// Selector bindings the canonical handler preserves unchanged.
///
/// Only `attacker` is read and required. `target`, `effect_battler`, and
/// `fainted` are retained because the TypeScript handler spreads the complete
/// binding object; unlike Magic Coat, Snatch does not write any selector role.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetsnatchRoles {
    pub attacker: Option<BattleScriptTrysetsnatchBattler>,
    pub target: Option<BattleScriptTrysetsnatchBattler>,
    pub effect_battler: Option<BattleScriptTrysetsnatchBattler>,
    pub fainted: Option<BattleScriptTrysetsnatchBattler>,
}

/// Complete narrow projection read or written by `Cmd_trysetsnatch`.
///
/// The four source-indexed bitfield pairs, validated topology, full `u8`
/// current-action counter, and all selector bindings are intentionally
/// retained. It is not a generic `BattleState` substitute.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetsnatchRules {
    pub battlers: [BattleScriptTrysetsnatchBattlerState; BATTLE_SCRIPT_TRYSETSNATCH_BATTLER_COUNT],
    pub topology: BattleScriptTrysetsnatchTopology,
    pub current_turn_action_number: u8,
    pub selector_roles: BattleScriptTrysetsnatchRoles,
}

/// Machine-independent control result of this command.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTrysetsnatchControl {
    /// The attacker acted last, so source follows its four-byte failure pointer
    /// after setting only the attacker's PP Pressure exemption.
    FailJump,
    /// The attacker did not act last, so source arms `stealMove` and advances
    /// the five-byte command.
    Advance,
}

/// Complete projected result of one successful handler invocation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetsnatchOutcome {
    pub rules: BattleScriptTrysetsnatchRules,
    pub control: BattleScriptTrysetsnatchControl,
}

/// Exact typed-reachable error thrown by the canonical TypeScript handler's
/// first `requireBattlerRole(rules, "attacker")` call.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTrysetsnatchError {
    MissingAttackerRole,
}

impl fmt::Display for BattleScriptTrysetsnatchError {
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

impl std::error::Error for BattleScriptTrysetsnatchError {}

/// Native immutable-value twin of the state transformation and semantic
/// control result performed by `Cmd_trysetsnatch`'s TypeScript handler.
///
/// Attacker resolution intentionally occurs before any field read or write.
/// Every valid call sets the resolved attacker's PP Pressure exemption before
/// the exact source equality branch. A final action preserves `stealMove` and
/// returns `FailJump`; every other complete-domain `u8` action number sets
/// only that attacker's `stealMove` and returns `Advance`. All sibling cells,
/// all selector roles, the full topology flag word, and the action counter
/// remain exact.
pub fn apply_battle_script_trysetsnatch(
    rules: &BattleScriptTrysetsnatchRules,
) -> Result<BattleScriptTrysetsnatchOutcome, BattleScriptTrysetsnatchError> {
    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptTrysetsnatchError::MissingAttackerRole)?;
    let acting_last =
        rules.current_turn_action_number == rules.topology.battlers_count().final_action_number();

    let mut next = *rules;
    next.battlers[attacker.index()].pp_not_affected_by_pressure = BattleScriptTrysetsnatchBit::Set;
    if !acting_last {
        next.battlers[attacker.index()].steal_move = BattleScriptTrysetsnatchBit::Set;
    }

    Ok(BattleScriptTrysetsnatchOutcome {
        rules: next,
        control: if acting_last {
            BattleScriptTrysetsnatchControl::FailJump
        } else {
            BattleScriptTrysetsnatchControl::Advance
        },
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    const CLEAR: BattleScriptTrysetsnatchBattlerState = BattleScriptTrysetsnatchBattlerState {
        steal_move: BattleScriptTrysetsnatchBit::Clear,
        pp_not_affected_by_pressure: BattleScriptTrysetsnatchBit::Clear,
    };

    // Direct native pins for Cmd_trysetsnatch's source ordering at
    // battle_script_commands.c:9553-9565. The larger integration corpus
    // executes the canonical TypeScript handler for every expected value.
    #[test]
    fn acting_last_fails_after_pp_write_but_preserves_steal_and_all_roles() {
        let rules = BattleScriptTrysetsnatchRules {
            battlers: [
                CLEAR,
                BattleScriptTrysetsnatchBattlerState {
                    steal_move: BattleScriptTrysetsnatchBit::Clear,
                    pp_not_affected_by_pressure: BattleScriptTrysetsnatchBit::Set,
                },
                CLEAR,
                CLEAR,
            ],
            topology: BattleScriptTrysetsnatchTopology::new(
                BattleScriptTrysetsnatchBattlersCount::Singles,
                0,
            )
            .expect("singles topology"),
            current_turn_action_number: 1,
            selector_roles: BattleScriptTrysetsnatchRoles {
                attacker: Some(BattleScriptTrysetsnatchBattler::Battler1),
                target: Some(BattleScriptTrysetsnatchBattler::Battler0),
                effect_battler: Some(BattleScriptTrysetsnatchBattler::Battler2),
                fainted: Some(BattleScriptTrysetsnatchBattler::Battler3),
            },
        };

        let outcome = apply_battle_script_trysetsnatch(&rules).expect("attacker role");
        assert_eq!(outcome.control, BattleScriptTrysetsnatchControl::FailJump);
        assert_eq!(
            outcome.rules.battlers[1].pp_not_affected_by_pressure,
            BattleScriptTrysetsnatchBit::Set
        );
        assert_eq!(
            outcome.rules.battlers[1].steal_move,
            BattleScriptTrysetsnatchBit::Clear
        );
        assert_eq!(outcome.rules.selector_roles, rules.selector_roles);
        assert_eq!(outcome.rules.battlers[0], rules.battlers[0]);
        assert_eq!(outcome.rules.battlers[2], rules.battlers[2]);
        assert_eq!(outcome.rules.battlers[3], rules.battlers[3]);
    }

    #[test]
    fn nonlast_arms_only_attacker_steal_and_missing_attacker_precedes_every_mutation() {
        let nonlast = BattleScriptTrysetsnatchRules {
            battlers: [CLEAR; BATTLE_SCRIPT_TRYSETSNATCH_BATTLER_COUNT],
            topology: BattleScriptTrysetsnatchTopology::new(
                BattleScriptTrysetsnatchBattlersCount::Doubles,
                BATTLE_SCRIPT_TRYSETSNATCH_BATTLE_TYPE_DOUBLE,
            )
            .expect("doubles topology"),
            current_turn_action_number: 2,
            selector_roles: BattleScriptTrysetsnatchRoles {
                attacker: Some(BattleScriptTrysetsnatchBattler::Battler2),
                target: Some(BattleScriptTrysetsnatchBattler::Battler0),
                effect_battler: Some(BattleScriptTrysetsnatchBattler::Battler1),
                fainted: Some(BattleScriptTrysetsnatchBattler::Battler3),
            },
        };
        let armed = apply_battle_script_trysetsnatch(&nonlast).expect("attacker role");
        assert_eq!(armed.control, BattleScriptTrysetsnatchControl::Advance);
        assert_eq!(
            armed.rules.battlers[2].steal_move,
            BattleScriptTrysetsnatchBit::Set
        );
        assert_eq!(
            armed.rules.battlers[2].pp_not_affected_by_pressure,
            BattleScriptTrysetsnatchBit::Set
        );
        assert_eq!(armed.rules.selector_roles, nonlast.selector_roles);

        let missing = BattleScriptTrysetsnatchRules {
            selector_roles: BattleScriptTrysetsnatchRoles {
                attacker: None,
                ..nonlast.selector_roles
            },
            ..nonlast
        };
        assert_eq!(
            apply_battle_script_trysetsnatch(&missing)
                .expect_err("missing attacker must be first error")
                .to_string(),
            "Battle Script hit-chain command requires a attacker role"
        );
    }
}
