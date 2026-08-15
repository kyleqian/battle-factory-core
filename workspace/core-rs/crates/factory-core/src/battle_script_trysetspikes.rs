//! Pure `B_SCR_OP_TRYSETSPIKES` state transformation and control result.
//!
//! This is the deliberately narrow, machine-independent port of
//! `src/engine/battleScriptTrysetspikesOpcode.ts`. It retains the canonical
//! handler's one operand validation and failure-label resolution boundary so
//! its observable malformed-operand, missing-attacker, and unresolved-label
//! ordering stays exact. It otherwise does not own opcode registration, a
//! program counter, a generic battle-state reducer, RNG, controller state, or
//! presentation.
//!
//! Source authority is `Cmd_trysetspikes` in
//! `reference/pokeemerald/src/battle_script_commands.c:8485-8500`, dispatched
//! at `:507` as `B_SCR_OP_TRYSETSPIKES` / opcode `0xB0`. The source macro is
//! the five-byte `trysetspikes ptr:req` at
//! `reference/pokeemerald/asm/macros/battle_script.inc:923-925`, and its one
//! concrete Spikes call is `data/battle_scripts_1.s:1544-1549`.
//!
//! `SIDE_STATUS_SPIKES` is `(1 << 4)` at
//! `reference/pokeemerald/include/constants/battle.h:208-217`; source stores
//! it in `u16 gSideStatuses[NUM_BATTLE_SIDES]`, while canonical TypeScript
//! deliberately preserves the full unsigned `u32` input domain at
//! `src/engine/battleScriptRulesContext.ts:2711-2714`. `SideTimer::spikesAmount`
//! is a source `u8` at `include/battle.h:149-162`, so the source's `++` maps
//! to `u8::wrapping_add`. The handler's exact `== 3` test is intentionally not
//! widened to a greater-than-or-equal cap: representable corrupt values above
//! three take the increment branch in both source and TypeScript.
//!
//! `BATTLE_OPPOSITE(GetBattlerSide(gBattlerAttacker))` is the target-side
//! expression in the source command. `BATTLE_OPPOSITE(id)` is `id ^ BIT_SIDE`
//! (`include/constants/battle.h:45`), and canonical TypeScript projects the
//! resolved attacker-side byte directly. This leaf therefore uses the
//! two-value `opposite` helper rather than deriving a side from battler id;
//! the generated corpus exercises all four battler aliases on both sides.

use core::fmt;

/// Source `MAX_BATTLERS_COUNT`; indexed source arrays retain all four slots
/// even in the Factory's singles battles.
pub const BATTLE_SCRIPT_TRYSETSPIKES_BATTLER_COUNT: usize = 4;

/// Source `NUM_BATTLE_SIDES`; `gSideStatuses` and `gSideTimers` each retain
/// one record for the player and one for the opponent.
pub const BATTLE_SCRIPT_TRYSETSPIKES_SIDE_COUNT: usize = 2;

/// `B_SCR_OP_TRYSETSPIKES` from
/// `include/constants/battle_script_commands.h:182` and the dispatch table at
/// `src/battle_script_commands.c:507`.
pub const BATTLE_SCRIPT_TRYSETSPIKES_OPCODE: u8 = 0xb0;

/// `trysetspikes` is one opcode byte followed by one four-byte pointer.
pub const BATTLE_SCRIPT_TRYSETSPIKES_FAILURE_POINTER_WIDTH_BYTES: u8 = 4;

/// `SIDE_STATUS_SPIKES` from `include/constants/battle.h:213`.
pub const BATTLE_SCRIPT_SIDE_STATUS_SPIKES: u32 = 1 << 4;

/// The complete source `BattlerId` domain used by selector roles, four-slot
/// battler projections, and source timer fields that retain battler ids.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum BattleScriptTrysetspikesBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

/// Canonical fixed battler domain retained for source-array iteration and
/// explicit selector-alias coverage.
pub const BATTLE_SCRIPT_TRYSETSPIKES_BATTLERS: [BattleScriptTrysetspikesBattler;
    BATTLE_SCRIPT_TRYSETSPIKES_BATTLER_COUNT] = [
    BattleScriptTrysetspikesBattler::Battler0,
    BattleScriptTrysetspikesBattler::Battler1,
    BattleScriptTrysetspikesBattler::Battler2,
    BattleScriptTrysetspikesBattler::Battler3,
];

impl BattleScriptTrysetspikesBattler {
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

/// Source `B_SIDE_PLAYER` / `B_SIDE_OPPONENT` domain used to index the two
/// side-status and side-timer rows.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum BattleScriptTrysetspikesSide {
    Player = 0,
    Opponent = 1,
}

/// Canonical two-side domain retained for target-side inversion coverage.
pub const BATTLE_SCRIPT_TRYSETSPIKES_SIDES: [BattleScriptTrysetspikesSide;
    BATTLE_SCRIPT_TRYSETSPIKES_SIDE_COUNT] = [
    BattleScriptTrysetspikesSide::Player,
    BattleScriptTrysetspikesSide::Opponent,
];

impl BattleScriptTrysetspikesSide {
    /// Zero-based `gSideStatuses` / `gSideTimers` index.
    #[must_use]
    pub const fn index(self) -> usize {
        self as usize
    }

    /// Source `u8` side value.
    #[must_use]
    pub const fn as_u8(self) -> u8 {
        self as u8
    }

    /// Exact two-value `BATTLE_OPPOSITE(side)` relation used by the source
    /// command after `GetBattlerSide(gBattlerAttacker)`.
    #[must_use]
    pub const fn opposite(self) -> Self {
        match self {
            Self::Player => Self::Opponent,
            Self::Opponent => Self::Player,
        }
    }
}

/// Source-shaped one-bit value for
/// `gSpecialStatuses[battler].ppNotAffectedByPressure`.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum BattleScriptTrysetspikesBit {
    Clear = 0,
    Set = 1,
}

impl BattleScriptTrysetspikesBit {
    /// Canonical numeric representation.
    #[must_use]
    pub const fn as_u8(self) -> u8 {
        self as u8
    }
}

/// The two fields of each battler that this leaf reads or writes.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetspikesBattlerState {
    /// Canonical `BattleScriptRulesBattlerState::side`, mirroring source
    /// `GetBattlerSide(gBattlerAttacker)`.
    pub side: BattleScriptTrysetspikesSide,
    /// `gSpecialStatuses[battler].ppNotAffectedByPressure`.
    pub pp_not_affected_by_pressure: BattleScriptTrysetspikesBit,
}

/// Canonical `BattleScriptSideTimerState` projection that the TypeScript
/// handler spreads when it replaces only target-side `spikesAmount`.
///
/// Source's `mistTimer` is intentionally not in this record because canonical
/// TypeScript projects it separately as `mistTimers`; that separate pair is
/// retained on [`BattleScriptTrysetspikesRules`] below.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetspikesSideTimerState {
    pub reflect_timer: u8,
    pub reflect_battler_id: BattleScriptTrysetspikesBattler,
    pub lightscreen_timer: u8,
    pub lightscreen_battler_id: BattleScriptTrysetspikesBattler,
    pub safeguard_timer: u8,
    pub safeguard_battler_id: BattleScriptTrysetspikesBattler,
    pub mist_battler_id: BattleScriptTrysetspikesBattler,
    pub followme_timer: u8,
    pub followme_target: BattleScriptTrysetspikesBattler,
    /// Source `u8 SideTimer::spikesAmount`.
    pub spikes_amount: u8,
}

/// All selector siblings carried through this handler's `{ ...rules }`
/// replacement. Only `attacker` is read, but the other optional bindings are
/// deliberately retained so aliasing and immutable sibling preservation are
/// part of the native contract.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetspikesRoles {
    pub attacker: Option<BattleScriptTrysetspikesBattler>,
    pub target: Option<BattleScriptTrysetspikesBattler>,
    pub effect_battler: Option<BattleScriptTrysetspikesBattler>,
    pub fainted: Option<BattleScriptTrysetspikesBattler>,
}

/// Complete narrow projection read or written by this handler.
///
/// The full two-word canonical side-status domain, all tracked SideTimer
/// siblings, the separately modeled source `mistTimer` pair, all four
/// battler-side/Pressure cells, and all selector bindings are retained. This
/// is intentionally not a generic `BattleState` substitute.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetspikesRules {
    pub battlers: [BattleScriptTrysetspikesBattlerState; BATTLE_SCRIPT_TRYSETSPIKES_BATTLER_COUNT],
    /// Canonical full-`u32` projection of source `gSideStatuses[2]`.
    pub side_statuses: [u32; BATTLE_SCRIPT_TRYSETSPIKES_SIDE_COUNT],
    pub side_timers:
        [BattleScriptTrysetspikesSideTimerState; BATTLE_SCRIPT_TRYSETSPIKES_SIDE_COUNT],
    /// Canonical separately projected source `SideTimer::mistTimer` bytes.
    pub mist_timers: [u8; BATTLE_SCRIPT_TRYSETSPIKES_SIDE_COUNT],
    pub selector_roles: BattleScriptTrysetspikesRoles,
}

/// Minimal source-shaped operand retained by the canonical TypeScript handler.
/// It is not an absolute machine pointer: the surrounding program owns that
/// address, while this leaf only needs its four-byte width and source label
/// expression for exact validation/error behavior.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetspikesOperand<'a> {
    pub width_bytes: u8,
    pub expression: &'a str,
}

/// Handler-time instruction and label-resolution projection.
///
/// `resolved_failure_target` carries the source expression whose label lookup
/// succeeded. No program counter crosses this leaf: equality with the valid
/// operand expression is all `Cmd_trysetspikes` needs before its semantic
/// `FailJump` result can be returned.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetspikesInstruction<'a> {
    pub operands: &'a [BattleScriptTrysetspikesOperand<'a>],
    pub resolved_failure_target: Option<&'a str>,
}

/// Machine-independent control result of this command.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTrysetspikesControl {
    /// `spikesAmount == 3` after successful failure-label resolution. Source
    /// writes only the attacker's Pressure exemption then follows the pointer.
    FailJump,
    /// Every other `u8` layer count ORs the target-side status and increments
    /// that side's source byte, then advances five bytes.
    Advance,
}

/// Complete projected result of one successful handler invocation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetspikesOutcome {
    pub rules: BattleScriptTrysetspikesRules,
    pub control: BattleScriptTrysetspikesControl,
}

/// Exact handler-time errors, ordered like the canonical TypeScript function:
/// operand shape before attacker role, and failure-label resolution only after
/// a resolved attacker has selected a target-side `spikesAmount` of exactly 3.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTrysetspikesError<'a> {
    InvalidFailurePointerOperand,
    MissingAttackerRole,
    UnresolvedFailureTarget { expression: &'a str },
}

impl fmt::Display for BattleScriptTrysetspikesError<'_> {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidFailurePointerOperand => {
                write!(
                    formatter,
                    "Cmd_trysetspikes requires exactly one four-byte failure pointer"
                )
            }
            Self::MissingAttackerRole => {
                write!(
                    formatter,
                    "Battle Script hit-chain command requires a attacker role"
                )
            }
            Self::UnresolvedFailureTarget { expression } => {
                write!(
                    formatter,
                    "Cmd_trysetspikes unresolved failure target {expression}"
                )
            }
        }
    }
}

impl std::error::Error for BattleScriptTrysetspikesError<'_> {}

/// Native immutable-value twin of the handler work performed by
/// `Cmd_trysetspikes`'s TypeScript opcode implementation.
///
/// The operand check happens before any rule inspection. A valid operand then
/// requires the attacker before reading the attacker-side row. Exactly three
/// existing layers validates the failure label, sets only that attacker's
/// Pressure exemption, preserves all side state, and returns `FailJump`.
/// Every other source-byte value preserves every battler (including the
/// attacker's prior Pressure bit), ORs only the opposite side's complete
/// `u32` status word, wraps only that side's `spikesAmount`, and returns
/// `Advance`. The input is never mutated.
pub fn apply_battle_script_trysetspikes<'a>(
    instruction: BattleScriptTrysetspikesInstruction<'a>,
    rules: &BattleScriptTrysetspikesRules,
) -> Result<BattleScriptTrysetspikesOutcome, BattleScriptTrysetspikesError<'a>> {
    let [failure_pointer] = instruction.operands else {
        return Err(BattleScriptTrysetspikesError::InvalidFailurePointerOperand);
    };
    if failure_pointer.width_bytes != BATTLE_SCRIPT_TRYSETSPIKES_FAILURE_POINTER_WIDTH_BYTES {
        return Err(BattleScriptTrysetspikesError::InvalidFailurePointerOperand);
    }

    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptTrysetspikesError::MissingAttackerRole)?;
    let target_side = rules.battlers[attacker.index()].side.opposite();
    let amount = rules.side_timers[target_side.index()].spikes_amount;

    if amount == 3 {
        if instruction.resolved_failure_target != Some(failure_pointer.expression) {
            return Err(BattleScriptTrysetspikesError::UnresolvedFailureTarget {
                expression: failure_pointer.expression,
            });
        }
        let mut next = *rules;
        next.battlers[attacker.index()].pp_not_affected_by_pressure =
            BattleScriptTrysetspikesBit::Set;
        return Ok(BattleScriptTrysetspikesOutcome {
            rules: next,
            control: BattleScriptTrysetspikesControl::FailJump,
        });
    }

    let mut next = *rules;
    next.side_statuses[target_side.index()] |= BATTLE_SCRIPT_SIDE_STATUS_SPIKES;
    next.side_timers[target_side.index()].spikes_amount = amount.wrapping_add(1);
    Ok(BattleScriptTrysetspikesOutcome {
        rules: next,
        control: BattleScriptTrysetspikesControl::Advance,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    const CANONICAL_FAILURE_POINTER: BattleScriptTrysetspikesOperand<'static> =
        BattleScriptTrysetspikesOperand {
            width_bytes: BATTLE_SCRIPT_TRYSETSPIKES_FAILURE_POINTER_WIDTH_BYTES,
            expression: "BattleScript_FailedFromAtkString",
        };
    const CANONICAL_OPERANDS: [BattleScriptTrysetspikesOperand<'static>; 1] =
        [CANONICAL_FAILURE_POINTER];
    const CLEAR: BattleScriptTrysetspikesBattlerState = BattleScriptTrysetspikesBattlerState {
        side: BattleScriptTrysetspikesSide::Player,
        pp_not_affected_by_pressure: BattleScriptTrysetspikesBit::Clear,
    };
    const TIMER: BattleScriptTrysetspikesSideTimerState = BattleScriptTrysetspikesSideTimerState {
        reflect_timer: 7,
        reflect_battler_id: BattleScriptTrysetspikesBattler::Battler3,
        lightscreen_timer: 8,
        lightscreen_battler_id: BattleScriptTrysetspikesBattler::Battler2,
        safeguard_timer: 9,
        safeguard_battler_id: BattleScriptTrysetspikesBattler::Battler1,
        mist_battler_id: BattleScriptTrysetspikesBattler::Battler0,
        followme_timer: 10,
        followme_target: BattleScriptTrysetspikesBattler::Battler3,
        spikes_amount: 0,
    };

    fn instruction() -> BattleScriptTrysetspikesInstruction<'static> {
        BattleScriptTrysetspikesInstruction {
            operands: &CANONICAL_OPERANDS,
            resolved_failure_target: Some("BattleScript_FailedFromAtkString"),
        }
    }

    fn rules() -> BattleScriptTrysetspikesRules {
        BattleScriptTrysetspikesRules {
            battlers: [
                CLEAR,
                BattleScriptTrysetspikesBattlerState {
                    side: BattleScriptTrysetspikesSide::Opponent,
                    pp_not_affected_by_pressure: BattleScriptTrysetspikesBit::Clear,
                },
                BattleScriptTrysetspikesBattlerState {
                    side: BattleScriptTrysetspikesSide::Player,
                    pp_not_affected_by_pressure: BattleScriptTrysetspikesBit::Set,
                },
                BattleScriptTrysetspikesBattlerState {
                    side: BattleScriptTrysetspikesSide::Opponent,
                    pp_not_affected_by_pressure: BattleScriptTrysetspikesBit::Clear,
                },
            ],
            side_statuses: [0x8000_0001, 0x4000_0002],
            side_timers: [
                TIMER,
                BattleScriptTrysetspikesSideTimerState { spikes_amount: 3, ..TIMER },
            ],
            mist_timers: [11, 12],
            selector_roles: BattleScriptTrysetspikesRoles {
                attacker: Some(BattleScriptTrysetspikesBattler::Battler0),
                target: Some(BattleScriptTrysetspikesBattler::Battler0),
                effect_battler: Some(BattleScriptTrysetspikesBattler::Battler2),
                fainted: Some(BattleScriptTrysetspikesBattler::Battler3),
            },
        }
    }

    #[test]
    fn malformed_operand_precedes_missing_attacker_and_rule_reads() {
        let mut input = rules();
        input.selector_roles.attacker = None;
        let before = input;
        let outcome = apply_battle_script_trysetspikes(
            BattleScriptTrysetspikesInstruction { operands: &[], resolved_failure_target: None },
            &input,
        );
        assert_eq!(
            outcome
                .expect_err("zero operands must be rejected first")
                .to_string(),
            "Cmd_trysetspikes requires exactly one four-byte failure pointer"
        );
        assert_eq!(input, before, "input remains immutable after an error");
    }

    #[test]
    fn exact_three_fails_after_only_attacker_pressure_exemption() {
        let input = rules();
        let outcome = apply_battle_script_trysetspikes(instruction(), &input)
            .expect("canonical failure pointer resolves");
        assert_eq!(outcome.control, BattleScriptTrysetspikesControl::FailJump);
        assert_eq!(
            outcome.rules.battlers[0].pp_not_affected_by_pressure,
            BattleScriptTrysetspikesBit::Set
        );
        assert_eq!(outcome.rules.battlers[1], input.battlers[1]);
        assert_eq!(outcome.rules.battlers[2], input.battlers[2]);
        assert_eq!(outcome.rules.battlers[3], input.battlers[3]);
        assert_eq!(outcome.rules.side_statuses, input.side_statuses);
        assert_eq!(outcome.rules.side_timers, input.side_timers);
        assert_eq!(outcome.rules.mist_timers, input.mist_timers);
        assert_eq!(outcome.rules.selector_roles, input.selector_roles);
        assert_eq!(input, rules(), "input remains immutable on fail jump");
    }

    #[test]
    fn nonthree_inverts_side_ors_full_u32_and_wraps_only_target_amount() {
        let mut input = rules();
        input.selector_roles.attacker = Some(BattleScriptTrysetspikesBattler::Battler1);
        input.side_timers[0].spikes_amount = u8::MAX;
        let outcome = apply_battle_script_trysetspikes(instruction(), &input)
            .expect("255 is not the exact failure value");
        assert_eq!(outcome.control, BattleScriptTrysetspikesControl::Advance);
        assert_eq!(outcome.rules.side_statuses[0], 0x8000_0011);
        assert_eq!(outcome.rules.side_statuses[1], input.side_statuses[1]);
        assert_eq!(outcome.rules.side_timers[0].spikes_amount, 0);
        assert_eq!(outcome.rules.side_timers[1], input.side_timers[1]);
        assert_eq!(outcome.rules.battlers, input.battlers);
        assert_eq!(outcome.rules.mist_timers, input.mist_timers);
        assert_eq!(outcome.rules.selector_roles, input.selector_roles);
        assert_eq!(input.side_timers[0].spikes_amount, u8::MAX);
    }
}
