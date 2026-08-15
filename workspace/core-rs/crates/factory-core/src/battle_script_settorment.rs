//! Pure `B_SCR_OP_SETTORMENT` state transformation and control result.
//!
//! This is the deliberately narrow, machine-independent port of
//! `src/engine/battleScriptSettormentOpcode.ts`. It retains that handler's
//! instruction-shape validation and deliberately late failure-label
//! resolution: malformed instructions fail before a target role is read; an
//! absent target fails before its status word is read; and an unresolved label
//! matters only after an already-Tormented target selects the failure branch.
//! It otherwise owns neither opcode registration, an absolute machine cursor,
//! scheduler/RNG state, controller state, presentation, nor a generic battle
//! reducer.
//!
//! Source authority is `Cmd_settorment` in
//! `reference/pokeemerald/src/battle_script_commands.c:9135-9146`, dispatched
//! as `B_SCR_OP_SETTORMENT` / opcode `0xCE` at `:537`. The source macro is
//! the five-byte `settorment ptr:req` at
//! `reference/pokeemerald/asm/macros/battle_script.inc:1056-1059`, and its
//! concrete move-effect call is `BattleScript_EffectTorment` at
//! `reference/pokeemerald/data/battle_scripts_1.s:2139-2149`.
//!
//! `STATUS2_TORMENT` is `(1 << 31)` at
//! `reference/pokeemerald/include/constants/battle.h:155`. Source stores it
//! in `gBattleMons[gBattlerTarget].status2`; canonical TypeScript preserves
//! the complete unsigned `u32` word, so this leaf does too rather than
//! narrowing status2 to named flags.

use core::fmt;

/// Source `MAX_BATTLERS_COUNT`; indexed source arrays retain all four slots,
/// including the Factory's singles battles.
pub const BATTLE_SCRIPT_SETTORMENT_BATTLER_COUNT: usize = 4;

/// `B_SCR_OP_SETTORMENT` from
/// `include/constants/battle_script_commands.h:212` and the dispatch table at
/// `src/battle_script_commands.c:537`.
pub const BATTLE_SCRIPT_SETTORMENT_OPCODE: u8 = 0xce;

/// `settorment` is one opcode byte followed by one four-byte failure pointer.
pub const BATTLE_SCRIPT_SETTORMENT_FAILURE_POINTER_WIDTH_BYTES: u8 = 4;

/// `STATUS2_TORMENT` from `include/constants/battle.h:155`.
pub const BATTLE_SCRIPT_STATUS2_TORMENT: u32 = 1 << 31;

/// Complete source `BattleScriptBattlerId` domain used by all selector roles
/// and the indexed `gBattleMons` projection.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum BattleScriptSettormentBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

/// Canonical fixed battler domain retained for source-array iteration and
/// selector-alias ratchets.
pub const BATTLE_SCRIPT_SETTORMENT_BATTLERS: [BattleScriptSettormentBattler;
    BATTLE_SCRIPT_SETTORMENT_BATTLER_COUNT] = [
    BattleScriptSettormentBattler::Battler0,
    BattleScriptSettormentBattler::Battler1,
    BattleScriptSettormentBattler::Battler2,
    BattleScriptSettormentBattler::Battler3,
];

impl BattleScriptSettormentBattler {
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

/// Complete selector-binding projection carried through the TypeScript
/// handler's `{ ...rules }` / `withBattler` result. Only `target` is read,
/// but all role aliases are retained so their immutability is executable.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSettormentRoles {
    pub attacker: Option<BattleScriptSettormentBattler>,
    pub target: Option<BattleScriptSettormentBattler>,
    pub effect_battler: Option<BattleScriptSettormentBattler>,
    pub fainted: Option<BattleScriptSettormentBattler>,
}

/// Representative complete per-battler projection retained by this narrow
/// leaf. `Cmd_settorment` reads and writes only `status2`, while `withBattler`
/// copies every sibling field of the selected canonical battler unchanged.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSettormentBattlerState {
    pub side: u8,
    pub ability: u8,
    pub hp: u16,
    pub max_hp: u16,
    pub moves: [u16; 4],
    pub pp: [u8; 4],
    pub status1: u32,
    /// Source `gBattleMons[battler].status2`, retained as the full unsigned
    /// 32-bit packed word.
    pub status2: u32,
    pub status3: u32,
    pub item: u16,
    pub stat_stages: [u8; 8],
    pub party_index: u8,
}

/// Independent rules-context fields carried through `withBattler` unchanged.
/// They make the leaf's copy-only context behavior explicit without claiming
/// ownership of the generic Battle Script state machine.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSettormentContextState {
    pub scripting_battler: BattleScriptSettormentBattler,
    pub atk_canceler_tracker: u8,
    pub battle_outcome: u8,
    pub current_move: u16,
    pub current_move_position: u8,
    pub move_result_flags: u8,
    pub hit_marker: u32,
    pub multi_hit_counter: u8,
}

/// Complete narrow projection read or written by this opcode. This is not a
/// generic `BattleState`: every field here is retained solely to pin that the
/// target's `status2` is the one and only successful mutation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSettormentRules {
    pub battlers: [BattleScriptSettormentBattlerState; BATTLE_SCRIPT_SETTORMENT_BATTLER_COUNT],
    pub selector_roles: BattleScriptSettormentRoles,
    pub context_state: BattleScriptSettormentContextState,
}

/// Minimal source-shaped operand preserved by the canonical handler's shape
/// check. The outer program owns its absolute pointer and source metadata.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSettormentOperand<'a> {
    pub width_bytes: u8,
    pub expression: &'a str,
}

/// Handler-time instruction and label-resolution projection.
///
/// `resolved_failure_target` carries the failure expression whose outer-program
/// label lookup succeeded, but the leaf deliberately does not expose that
/// absolute program counter in its semantic `FailJump` control. This follows
/// the established leaf boundary while preserving the observable lookup/error
/// ordering and preventing an unrelated resolved label from satisfying this
/// instruction's pointer.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSettormentInstruction<'a> {
    pub program_counter: u32,
    pub opcode_id: u8,
    pub dispatcher: &'a str,
    pub operands: &'a [BattleScriptSettormentOperand<'a>],
    pub resolved_failure_target: Option<&'a str>,
}

/// Machine-independent result of the source command.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptSettormentControl {
    /// A clear target received `STATUS2_TORMENT`; source advances five bytes.
    Advance,
    /// An already-Tormented target followed the resolved pointer operand.
    FailJump,
}

/// Complete projected result of one successful handler invocation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptSettormentOutcome {
    pub rules: BattleScriptSettormentRules,
    pub control: BattleScriptSettormentControl,
}

/// Exact handler-time errors, in the canonical TypeScript handler's order.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptSettormentError<'a> {
    InvalidInstructionShape { program_counter: u32 },
    MissingTargetRole,
    UnresolvedFailureTarget { expression: &'a str },
}

impl fmt::Display for BattleScriptSettormentError<'_> {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidInstructionShape { program_counter } => write!(
                formatter,
                "invalid B_SCR_OP_SETTORMENT shape at program counter {program_counter}"
            ),
            Self::MissingTargetRole => {
                write!(
                    formatter,
                    "Battle Script hit-chain command requires a target role"
                )
            }
            Self::UnresolvedFailureTarget { expression } => {
                write!(
                    formatter,
                    "Cmd_settorment: unresolved failure target {expression}"
                )
            }
        }
    }
}

impl std::error::Error for BattleScriptSettormentError<'_> {}

/// Native immutable-value twin of the canonical `Cmd_settorment` handler.
///
/// It validates the exact `0xCE`/`Cmd_settorment`/one-four-byte-pointer shape
/// before inspecting roles. A valid shape then requires `target` before
/// reading target state. The failure label is resolved only on the
/// already-Tormented branch; that branch has no state writes. Only a clear
/// target ORs `STATUS2_TORMENT` into its full `u32` status word and advances.
/// Every non-target battler, all selector aliases, and independent context
/// state are retained exactly, and no input is mutated.
pub fn apply_battle_script_settorment<'a>(
    instruction: BattleScriptSettormentInstruction<'a>,
    rules: &BattleScriptSettormentRules,
) -> Result<BattleScriptSettormentOutcome, BattleScriptSettormentError<'a>> {
    let [failure_pointer] = instruction.operands else {
        return Err(BattleScriptSettormentError::InvalidInstructionShape {
            program_counter: instruction.program_counter,
        });
    };
    if instruction.opcode_id != BATTLE_SCRIPT_SETTORMENT_OPCODE
        || instruction.dispatcher != "Cmd_settorment"
        || failure_pointer.width_bytes != BATTLE_SCRIPT_SETTORMENT_FAILURE_POINTER_WIDTH_BYTES
    {
        return Err(BattleScriptSettormentError::InvalidInstructionShape {
            program_counter: instruction.program_counter,
        });
    }

    let target = rules
        .selector_roles
        .target
        .ok_or(BattleScriptSettormentError::MissingTargetRole)?;

    if rules.battlers[target.index()].status2 & BATTLE_SCRIPT_STATUS2_TORMENT != 0 {
        if instruction.resolved_failure_target != Some(failure_pointer.expression) {
            return Err(BattleScriptSettormentError::UnresolvedFailureTarget {
                expression: failure_pointer.expression,
            });
        }
        return Ok(BattleScriptSettormentOutcome {
            rules: *rules,
            control: BattleScriptSettormentControl::FailJump,
        });
    }

    let mut next = *rules;
    next.battlers[target.index()].status2 |= BATTLE_SCRIPT_STATUS2_TORMENT;
    Ok(BattleScriptSettormentOutcome {
        rules: next,
        control: BattleScriptSettormentControl::Advance,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    const FAILURE_OPERAND: BattleScriptSettormentOperand<'static> = BattleScriptSettormentOperand {
        width_bytes: BATTLE_SCRIPT_SETTORMENT_FAILURE_POINTER_WIDTH_BYTES,
        expression: "BattleScript_ButItFailed",
    };
    const FAILURE_OPERANDS: [BattleScriptSettormentOperand<'static>; 1] = [FAILURE_OPERAND];
    const CLEAR_BATTLER: BattleScriptSettormentBattlerState = BattleScriptSettormentBattlerState {
        side: 0,
        ability: 0,
        hp: 100,
        max_hp: 100,
        moves: [33, 0, 0, 0],
        pp: [35, 0, 0, 0],
        status1: 0,
        status2: 0,
        status3: 0,
        item: 0,
        stat_stages: [6; 8],
        party_index: 0,
    };

    fn instruction(
        resolved_failure_target: Option<&'static str>,
    ) -> BattleScriptSettormentInstruction<'static> {
        BattleScriptSettormentInstruction {
            program_counter: 1499,
            opcode_id: BATTLE_SCRIPT_SETTORMENT_OPCODE,
            dispatcher: "Cmd_settorment",
            operands: &FAILURE_OPERANDS,
            resolved_failure_target,
        }
    }

    fn rules(
        target: Option<BattleScriptSettormentBattler>,
        target_status2: u32,
    ) -> BattleScriptSettormentRules {
        let mut battlers = [CLEAR_BATTLER; BATTLE_SCRIPT_SETTORMENT_BATTLER_COUNT];
        battlers[2] = BattleScriptSettormentBattlerState {
            side: 1,
            ability: 46,
            hp: 73,
            max_hp: 121,
            moves: [259, 33, 45, 98],
            pp: [15, 35, 40, 30],
            status1: 0x0000_0040,
            status2: target_status2,
            status3: 0x0000_4000,
            item: 186,
            stat_stages: [0, 1, 2, 3, 4, 5, 6, 7],
            party_index: 5,
        };
        BattleScriptSettormentRules {
            battlers,
            selector_roles: BattleScriptSettormentRoles {
                attacker: Some(BattleScriptSettormentBattler::Battler1),
                target,
                effect_battler: Some(BattleScriptSettormentBattler::Battler3),
                fainted: Some(BattleScriptSettormentBattler::Battler0),
            },
            context_state: BattleScriptSettormentContextState {
                scripting_battler: BattleScriptSettormentBattler::Battler3,
                atk_canceler_tracker: 7,
                battle_outcome: 2,
                current_move: 259,
                current_move_position: 3,
                move_result_flags: 0x80,
                hit_marker: 0x8000_0001,
                multi_hit_counter: 4,
            },
        }
    }

    #[test]
    fn malformed_shape_precedes_missing_target_role() {
        let input = rules(None, u32::MAX);
        let before = input;
        let outcome = apply_battle_script_settorment(
            BattleScriptSettormentInstruction { opcode_id: 0xcd, ..instruction(None) },
            &input,
        );
        assert_eq!(
            outcome
                .expect_err("malformed opcode must be rejected first")
                .to_string(),
            "invalid B_SCR_OP_SETTORMENT shape at program counter 1499"
        );
        assert_eq!(input, before, "error must not mutate input");
    }

    #[test]
    fn missing_target_precedes_status_read_and_label_resolution() {
        let input = rules(None, u32::MAX);
        let before = input;
        let outcome = apply_battle_script_settorment(instruction(None), &input);
        assert_eq!(
            outcome
                .expect_err("target role is required after shape validation")
                .to_string(),
            "Battle Script hit-chain command requires a target role"
        );
        assert_eq!(input, before, "error must not mutate input");
    }

    #[test]
    fn clear_target_advances_without_resolving_failure_label() {
        let input = rules(Some(BattleScriptSettormentBattler::Battler2), 0x4000_0001);
        let before = input;
        let outcome = apply_battle_script_settorment(instruction(None), &input)
            .expect("success must not look up its failure label");
        assert_eq!(outcome.control, BattleScriptSettormentControl::Advance);
        assert_eq!(outcome.rules.battlers[2].status2, 0xc000_0001);
        assert_eq!(outcome.rules.battlers[0], input.battlers[0]);
        assert_eq!(outcome.rules.battlers[1], input.battlers[1]);
        assert_eq!(outcome.rules.battlers[3], input.battlers[3]);
        assert_eq!(outcome.rules.selector_roles, input.selector_roles);
        assert_eq!(outcome.rules.context_state, input.context_state);
        assert_eq!(input, before, "success must not mutate input");
    }

    #[test]
    fn set_target_resolves_late_then_fails_without_writes() {
        let input = rules(
            Some(BattleScriptSettormentBattler::Battler2),
            BATTLE_SCRIPT_STATUS2_TORMENT | 0x4000_0001,
        );
        let before = input;
        let unresolved = apply_battle_script_settorment(instruction(None), &input);
        assert_eq!(
            unresolved
                .expect_err("set target must resolve failure label")
                .to_string(),
            "Cmd_settorment: unresolved failure target BattleScript_ButItFailed"
        );
        assert_eq!(input, before, "unresolved failure must not mutate input");

        let outcome =
            apply_battle_script_settorment(instruction(Some("BattleScript_ButItFailed")), &input)
                .expect("resolved failure target must produce a fail jump");
        assert_eq!(outcome.control, BattleScriptSettormentControl::FailJump);
        assert_eq!(
            outcome.rules, input,
            "already-set branch must not write state"
        );
    }
}
