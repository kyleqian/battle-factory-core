//! Pure `B_SCR_OP_TRYSETMAGICCOAT` state transformation and control result.
//!
//! This is the deliberately narrow, machine-independent port of
//! `src/engine/battleScriptTrysetmagiccoatOpcode.ts`, separated from that
//! module's opcode registration and generic Battle Script machine. The
//! canonical handler resolves only its optional attacker role. It then makes
//! that attacker the target, exempts its PP from Pressure, and either arms
//! Magic Coat's `bounceMove` bit or follows the instruction's failure pointer
//! when this is the final action of the turn.
//!
//! Source authority is `Cmd_trysetmagiccoat` in
//! `reference/pokeemerald/src/battle_script_commands.c:9537-9550`. Its source
//! stores `gProtectStructs[battler].bounceMove` and
//! `gSpecialStatuses[battler].ppNotAffectedByPressure` as one-bit fields in
//! `reference/pokeemerald/include/battle.h:106-111,134-140`; the command
//! assigns both rather than XORing or conditionally preserving them.
//! `gBattlersCount` and `gCurrentTurnActionNumber` are source `u8` globals
//! (`include/battle.h:640,645`). Canonical TypeScript admits the entire `u8`
//! domain for the latter, while restricting the former through its validated
//! battle topology to the real two- or four-battler shapes
//! (`src/engine/battleScriptRulesContext.ts:1813-1854`).
//!
//! The source command is five bytes: opcode `0xDF` followed by a four-byte
//! failure pointer (`include/constants/battle_script_commands.h:229`; the
//! Magic Coat script is `data/battle_scripts_1.s:2392-2395`). The TypeScript
//! handler resolves that pointer before returning a machine transition. This
//! leaf intentionally returns a unit-like `FailJump` instead: it preserves
//! the semantic failure branch without carrying, embedding, or resolving a
//! machine-owned absolute program counter.
//!
//! This leaf deliberately owns neither program/instruction validation,
//! scheduler, RNG, controller state, presentation, ABI/WASM exports, nor a
//! generic BattleState reducer.

use core::fmt;

/// Source `MAX_BATTLERS_COUNT`; indexed source arrays retain all four slots
/// even in the Factory's singles battles.
pub const BATTLE_SCRIPT_TRYSETMAGICCOAT_BATTLER_COUNT: usize = 4;

/// `BATTLE_TYPE_DOUBLE` from `include/constants/battle.h:59` and canonical
/// `BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE` in `battleScriptRulesContext.ts:155`.
pub const BATTLE_SCRIPT_TRYSETMAGICCOAT_BATTLE_TYPE_DOUBLE: u32 = 1 << 0;

/// The complete source `BattleScriptBattlerId` domain used by the attacker
/// role, target role, selector siblings, and source-indexed status arrays.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum BattleScriptTrysetmagiccoatBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

/// Canonical fixed battler domain retained for source-array iteration and
/// coverage of every valid double-battle attacker.
pub const BATTLE_SCRIPT_TRYSETMAGICCOAT_BATTLERS: [BattleScriptTrysetmagiccoatBattler;
    BATTLE_SCRIPT_TRYSETMAGICCOAT_BATTLER_COUNT] = [
    BattleScriptTrysetmagiccoatBattler::Battler0,
    BattleScriptTrysetmagiccoatBattler::Battler1,
    BattleScriptTrysetmagiccoatBattler::Battler2,
    BattleScriptTrysetmagiccoatBattler::Battler3,
];

impl BattleScriptTrysetmagiccoatBattler {
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
/// battle. Source storage is `u8`, but the canonical rules-context constructor
/// rejects every other value before this command can run.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum BattleScriptTrysetmagiccoatBattlersCount {
    Singles = 2,
    Doubles = 4,
}

impl BattleScriptTrysetmagiccoatBattlersCount {
    /// Canonical/source `u8` count.
    #[must_use]
    pub const fn as_u8(self) -> u8 {
        self as u8
    }

    /// The source `gBattlersCount - 1` comparison operand for the last valid
    /// action index. Both enum values are nonzero by construction.
    #[must_use]
    pub const fn final_action_number(self) -> u8 {
        self.as_u8() - 1
    }
}

/// Error matching canonical `battleTopology.battlersCount` validation when a
/// caller tries to create this narrow topology from a noncanonical source byte.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetmagiccoatBattlersCountError {
    pub value: u8,
}

impl fmt::Display for BattleScriptTrysetmagiccoatBattlersCountError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            formatter,
            "battleTopology.battlersCount must be exactly 2 or 4, got {}",
            self.value
        )
    }
}

impl std::error::Error for BattleScriptTrysetmagiccoatBattlersCountError {}

impl TryFrom<u8> for BattleScriptTrysetmagiccoatBattlersCount {
    type Error = BattleScriptTrysetmagiccoatBattlersCountError;

    fn try_from(value: u8) -> Result<Self, Self::Error> {
        match value {
            2 => Ok(Self::Singles),
            4 => Ok(Self::Doubles),
            _ => Err(BattleScriptTrysetmagiccoatBattlersCountError { value }),
        }
    }
}

/// Source-shaped bit value shared by the two fields this command writes.
///
/// Both fields are distinct one-bit members of different source structs, not
/// aliases. The enum retains their canonical TypeScript `0 | 1` domain rather
/// than widening them to arbitrary bytes.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum BattleScriptTrysetmagiccoatBit {
    Clear = 0,
    Set = 1,
}

impl BattleScriptTrysetmagiccoatBit {
    /// Source/canonical numeric representation.
    #[must_use]
    pub const fn as_u8(self) -> u8 {
        self as u8
    }
}

/// The canonical battle-topology companion fields retained by this leaf.
///
/// `Cmd_trysetmagiccoat` reads only `battlers_count`, but the context also
/// preserves a full `u32 gBattleTypeFlags` word. Making the matching
/// BATTLE_TYPE_DOUBLE invariant unconstructable here keeps the leaf aligned
/// with `createBattleScriptRulesContext` without inventing an opcode-local
/// invalid-topology branch.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetmagiccoatTopology {
    battlers_count: BattleScriptTrysetmagiccoatBattlersCount,
    battle_type_flags: u32,
}

impl BattleScriptTrysetmagiccoatTopology {
    /// Creates a canonical two- or four-battler topology only when its double
    /// flag agrees with its battler count.
    pub const fn new(
        battlers_count: BattleScriptTrysetmagiccoatBattlersCount,
        battle_type_flags: u32,
    ) -> Result<Self, BattleScriptTrysetmagiccoatTopologyError> {
        let flag_is_double =
            battle_type_flags & BATTLE_SCRIPT_TRYSETMAGICCOAT_BATTLE_TYPE_DOUBLE != 0;
        let count_is_double = matches!(
            battlers_count,
            BattleScriptTrysetmagiccoatBattlersCount::Doubles
        );
        if flag_is_double != count_is_double {
            return Err(BattleScriptTrysetmagiccoatTopologyError {
                battlers_count,
                battle_type_flags,
            });
        }
        Ok(Self { battlers_count, battle_type_flags })
    }

    /// Canonical/source `gBattlersCount` value.
    #[must_use]
    pub const fn battlers_count(self) -> BattleScriptTrysetmagiccoatBattlersCount {
        self.battlers_count
    }

    /// Complete preserved source `u32 gBattleTypeFlags` word.
    #[must_use]
    pub const fn battle_type_flags(self) -> u32 {
        self.battle_type_flags
    }
}

/// Error matching canonical topology's BATTLE_TYPE_DOUBLE/count consistency
/// rule (`battleScriptRulesContext.ts:1843-1848`).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetmagiccoatTopologyError {
    pub battlers_count: BattleScriptTrysetmagiccoatBattlersCount,
    pub battle_type_flags: u32,
}

impl fmt::Display for BattleScriptTrysetmagiccoatTopologyError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            formatter,
            "battleTopology BATTLE_TYPE_DOUBLE must be set if and only if battlersCount is 4"
        )
    }
}

impl std::error::Error for BattleScriptTrysetmagiccoatTopologyError {}

/// The complete per-battler fields read or written by this command.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetmagiccoatBattlerState {
    /// `gProtectStructs[battler].bounceMove`.
    pub bounce_move: BattleScriptTrysetmagiccoatBit,
    /// `gSpecialStatuses[battler].ppNotAffectedByPressure`.
    pub pp_not_affected_by_pressure: BattleScriptTrysetmagiccoatBit,
}

/// The selector bindings the canonical handler preserves or writes.
///
/// Only `attacker` is read and required. `target` is deliberately optional:
/// its prior value, including `None`, is overwritten with the resolved
/// attacker. `effect_battler` and `fainted` are retained as selector siblings
/// because the handler spreads its complete canonical binding object.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetmagiccoatRoles {
    pub attacker: Option<BattleScriptTrysetmagiccoatBattler>,
    pub target: Option<BattleScriptTrysetmagiccoatBattler>,
    pub effect_battler: Option<BattleScriptTrysetmagiccoatBattler>,
    pub fainted: Option<BattleScriptTrysetmagiccoatBattler>,
}

/// Complete narrow projection read or written by `Cmd_trysetmagiccoat`.
///
/// The four source-indexed bitfield pairs, validated topology, full `u8`
/// current-action counter, and all selector bindings are intentionally
/// retained. It is not a generic `BattleState` substitute.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetmagiccoatRules {
    pub battlers:
        [BattleScriptTrysetmagiccoatBattlerState; BATTLE_SCRIPT_TRYSETMAGICCOAT_BATTLER_COUNT],
    pub topology: BattleScriptTrysetmagiccoatTopology,
    pub current_turn_action_number: u8,
    pub selector_roles: BattleScriptTrysetmagiccoatRoles,
}

/// Machine-independent control result of this command.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTrysetmagiccoatControl {
    /// The attacker acted last, so source follows its four-byte failure
    /// pointer *after* writing target and PP exemption.
    FailJump,
    /// The attacker did not act last, so source arms `bounceMove` and advances
    /// the five-byte command.
    Advance,
}

/// Complete projected result of one successful handler invocation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetmagiccoatOutcome {
    pub rules: BattleScriptTrysetmagiccoatRules,
    pub control: BattleScriptTrysetmagiccoatControl,
}

/// Exact typed-reachable error thrown by canonical TypeScript's first
/// `requireBattlerRole(rules, "attacker")` call.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTrysetmagiccoatError {
    MissingAttackerRole,
}

impl fmt::Display for BattleScriptTrysetmagiccoatError {
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

impl std::error::Error for BattleScriptTrysetmagiccoatError {}

/// Native immutable-value twin of the state transformation and semantic
/// control result performed by `Cmd_trysetmagiccoat`'s TypeScript handler.
///
/// Attacker resolution intentionally occurs before any field reads or writes.
/// Every valid call sets the resolved attacker as `target` and sets its PP
/// Pressure exemption. The source's exact equality check then decides whether
/// the attacker acted last: a final action preserves its prior `bounceMove`
/// and returns `FailJump`; every other complete-domain `u8` action number
/// arms `bounceMove` and returns `Advance`. All sibling cells, selector
/// siblings, the full topology flag word, and the action counter remain exact.
pub fn apply_battle_script_trysetmagiccoat(
    rules: &BattleScriptTrysetmagiccoatRules,
) -> Result<BattleScriptTrysetmagiccoatOutcome, BattleScriptTrysetmagiccoatError> {
    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptTrysetmagiccoatError::MissingAttackerRole)?;
    let acting_last =
        rules.current_turn_action_number == rules.topology.battlers_count().final_action_number();

    let mut next = *rules;
    next.selector_roles.target = Some(attacker);
    next.battlers[attacker.index()].pp_not_affected_by_pressure =
        BattleScriptTrysetmagiccoatBit::Set;
    if !acting_last {
        next.battlers[attacker.index()].bounce_move = BattleScriptTrysetmagiccoatBit::Set;
    }

    Ok(BattleScriptTrysetmagiccoatOutcome {
        rules: next,
        control: if acting_last {
            BattleScriptTrysetmagiccoatControl::FailJump
        } else {
            BattleScriptTrysetmagiccoatControl::Advance
        },
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    const CLEAR: BattleScriptTrysetmagiccoatBattlerState =
        BattleScriptTrysetmagiccoatBattlerState {
            bounce_move: BattleScriptTrysetmagiccoatBit::Clear,
            pp_not_affected_by_pressure: BattleScriptTrysetmagiccoatBit::Clear,
        };

    // Direct native pins for Cmd_trysetmagiccoat's source ordering at
    // battle_script_commands.c:9537-9550. The larger integration corpus
    // executes the canonical TypeScript handler for every expected value.
    #[test]
    fn acting_last_fails_after_target_and_pp_writes_but_preserves_bounce() {
        let rules = BattleScriptTrysetmagiccoatRules {
            battlers: [
                CLEAR,
                BattleScriptTrysetmagiccoatBattlerState {
                    bounce_move: BattleScriptTrysetmagiccoatBit::Clear,
                    pp_not_affected_by_pressure: BattleScriptTrysetmagiccoatBit::Set,
                },
                CLEAR,
                CLEAR,
            ],
            topology: BattleScriptTrysetmagiccoatTopology::new(
                BattleScriptTrysetmagiccoatBattlersCount::Singles,
                0,
            )
            .expect("singles topology"),
            current_turn_action_number: 1,
            selector_roles: BattleScriptTrysetmagiccoatRoles {
                attacker: Some(BattleScriptTrysetmagiccoatBattler::Battler1),
                target: None,
                effect_battler: Some(BattleScriptTrysetmagiccoatBattler::Battler2),
                fainted: None,
            },
        };

        let outcome = apply_battle_script_trysetmagiccoat(&rules).expect("attacker role");
        assert_eq!(
            outcome.control,
            BattleScriptTrysetmagiccoatControl::FailJump
        );
        assert_eq!(
            outcome.rules.selector_roles.target,
            Some(BattleScriptTrysetmagiccoatBattler::Battler1)
        );
        assert_eq!(
            outcome.rules.battlers[1].pp_not_affected_by_pressure,
            BattleScriptTrysetmagiccoatBit::Set
        );
        assert_eq!(
            outcome.rules.battlers[1].bounce_move,
            BattleScriptTrysetmagiccoatBit::Clear
        );
        assert_eq!(
            outcome.rules.selector_roles.effect_battler,
            rules.selector_roles.effect_battler
        );
        assert_eq!(
            outcome.rules.selector_roles.fainted,
            rules.selector_roles.fainted
        );
    }

    #[test]
    fn nonlast_arms_bounce_and_missing_attacker_precedes_every_mutation() {
        let nonlast = BattleScriptTrysetmagiccoatRules {
            battlers: [CLEAR; BATTLE_SCRIPT_TRYSETMAGICCOAT_BATTLER_COUNT],
            topology: BattleScriptTrysetmagiccoatTopology::new(
                BattleScriptTrysetmagiccoatBattlersCount::Doubles,
                BATTLE_SCRIPT_TRYSETMAGICCOAT_BATTLE_TYPE_DOUBLE,
            )
            .expect("doubles topology"),
            current_turn_action_number: 2,
            selector_roles: BattleScriptTrysetmagiccoatRoles {
                attacker: Some(BattleScriptTrysetmagiccoatBattler::Battler2),
                target: Some(BattleScriptTrysetmagiccoatBattler::Battler0),
                effect_battler: Some(BattleScriptTrysetmagiccoatBattler::Battler1),
                fainted: Some(BattleScriptTrysetmagiccoatBattler::Battler3),
            },
        };
        let armed = apply_battle_script_trysetmagiccoat(&nonlast).expect("attacker role");
        assert_eq!(armed.control, BattleScriptTrysetmagiccoatControl::Advance);
        assert_eq!(
            armed.rules.battlers[2].bounce_move,
            BattleScriptTrysetmagiccoatBit::Set
        );
        assert_eq!(
            armed.rules.battlers[2].pp_not_affected_by_pressure,
            BattleScriptTrysetmagiccoatBit::Set
        );

        let missing = BattleScriptTrysetmagiccoatRules {
            selector_roles: BattleScriptTrysetmagiccoatRoles {
                attacker: None,
                ..nonlast.selector_roles
            },
            ..nonlast
        };
        assert_eq!(
            apply_battle_script_trysetmagiccoat(&missing)
                .expect_err("missing attacker must be first error")
                .to_string(),
            "Battle Script hit-chain command requires a attacker role"
        );
    }
}
