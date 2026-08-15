//! Pure `B_SCR_OP_FURYCUTTERCALC` state transformation and control result.
//!
//! This is the deliberately narrow, machine-independent port of
//! `src/engine/battleScriptFuryCutterOpcode.ts`. It retains that module's
//! registration validation, attacker-first handler order, late
//! `BattleScript_MoveMissedPause` resolution, source-`u8` counter behavior,
//! and source-`u16` dynamic-power arithmetic. It deliberately owns neither a
//! generic Battle Script machine, absolute program counters, scheduler/RNG
//! state, controller state, presentation, a WASM ABI, nor damage calculation.
//!
//! Source authority:
//! - `B_SCR_OP_FURYCUTTERCALC` is opcode `0xB5` in
//!   `reference/pokeemerald/include/constants/battle_script_commands.h:187`
//!   and dispatches to `Cmd_furycuttercalc` at
//!   `reference/pokeemerald/src/battle_script_commands.c:512`.
//! - The command body is `battle_script_commands.c:8580-8601`.
//! - The operandless `furycuttercalc` macro is at
//!   `reference/pokeemerald/asm/macros/battle_script.inc:947-949`; its one
//!   concrete use is `BattleScript_FuryCutterHit` at
//!   `reference/pokeemerald/data/battle_scripts_1.s:1636-1641`.
//! - `MOVE_RESULT_NO_EFFECT` is the three-bit `u8` mask `(1 << 0) | (1 << 3)
//!   | (1 << 5)` in `reference/pokeemerald/include/constants/battle.h:221-228`.
//! - `MOVE_FURY_CUTTER` has source power 10 at
//!   `reference/pokeemerald/src/data/battle_moves.h:2733-2742`; the narrow
//!   projection accepts every source-`u16` power because the canonical handler
//!   reads `currentMovePower` rather than the move row itself.

use core::fmt;

/// Source `MAX_BATTLERS_COUNT`; active battle arrays always retain all four
/// indexed cells, including Factory singles.
pub const BATTLE_SCRIPT_FURYCUTTER_BATTLER_COUNT: usize = 4;

/// Canonical concrete opcode-name selector used by registration.
pub const BATTLE_SCRIPT_FURYCUTTER_OPCODE_NAME: &str = "B_SCR_OP_FURYCUTTERCALC";

/// `B_SCR_OP_FURYCUTTERCALC` from the source command table.
pub const BATTLE_SCRIPT_FURYCUTTER_OPCODE: u8 = 0xb5;

/// Source dispatcher retained by registration validation.
pub const BATTLE_SCRIPT_FURYCUTTER_DISPATCHER: &str = "Cmd_furycuttercalc";

/// `MOVE_RESULT_NO_EFFECT` from `include/constants/battle.h:228`.
pub const BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT: u32 = (1 << 0) | (1 << 3) | (1 << 5);

/// The source comparison is exact equality, not a cap: only a counter already
/// equal to five stays at five. Corrupt source-`u8` values retain ordinary
/// wrapping increment behavior.
pub const BATTLE_SCRIPT_FURYCUTTER_COUNTER_FIXED_POINT: u8 = 5;

/// The exact source label resolved only by the no-effect branch.
pub const BATTLE_SCRIPT_FURYCUTTER_MOVE_MISSED_PAUSE_LABEL: &str = "BattleScript_MoveMissedPause";

/// Complete source `BattleScriptBattlerId` domain used by the selector roles
/// and indexed battler array.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum BattleScriptFurycutterBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

/// Canonical fixed battler domain retained for attacker and sibling ratchets.
pub const BATTLE_SCRIPT_FURYCUTTER_BATTLERS: [BattleScriptFurycutterBattler;
    BATTLE_SCRIPT_FURYCUTTER_BATTLER_COUNT] = [
    BattleScriptFurycutterBattler::Battler0,
    BattleScriptFurycutterBattler::Battler1,
    BattleScriptFurycutterBattler::Battler2,
    BattleScriptFurycutterBattler::Battler3,
];

impl BattleScriptFurycutterBattler {
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

/// Complete selector binding projection. Only `attacker` is read, while the
/// other aliases stay present so a successful copy can prove they did not
/// change.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptFurycutterRoles {
    pub attacker: Option<BattleScriptFurycutterBattler>,
    pub target: Option<BattleScriptFurycutterBattler>,
    pub effect_battler: Option<BattleScriptFurycutterBattler>,
    pub fainted: Option<BattleScriptFurycutterBattler>,
}

/// Representative complete battler projection for this leaf. The source
/// command reads and writes only `fury_cutter_counter`; every other field is
/// preserved in the immutable value result to make `withBattler` sibling
/// behavior executable.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptFurycutterBattlerState {
    pub side: u8,
    pub ability: u8,
    pub hp: u16,
    pub max_hp: u16,
    pub moves: [u16; 4],
    pub pp: [u8; 4],
    pub status1: u32,
    pub status2: u32,
    pub status3: u32,
    pub item: u16,
    pub stat_stages: [u8; 8],
    pub party_index: u8,
    /// Source `gDisableStructs[battler].furyCutterCounter` (`u8`).
    pub fury_cutter_counter: u8,
}

/// Independent rules-context values copied by the canonical `{ ...rules }`
/// projection. The leaf does not interpret them, but retaining them prevents a
/// narrowly successful port from silently discarding siblings.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptFurycutterContextState {
    pub scripting_battler: BattleScriptFurycutterBattler,
    pub atk_canceler_tracker: u8,
    pub battle_outcome: u8,
    pub current_move: u16,
    pub current_move_position: u8,
    pub hit_marker: u32,
    pub multi_hit_counter: u8,
}

/// Complete narrow state projection read or written by the opcode.
///
/// `move_result_flags` deliberately retains a `u32` bit-pattern projection.
/// Source-valid rules use its low source-`u8` range, while direct canonical
/// handler calls (and the differential corpus) demonstrate that JavaScript's
/// bitwise `&` is still well-defined at all `u32` boundaries. `current_move_power`
/// and `dynamic_base_power` are source `u16` values.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptFurycutterRules {
    pub battlers: [BattleScriptFurycutterBattlerState; BATTLE_SCRIPT_FURYCUTTER_BATTLER_COUNT],
    pub selector_roles: BattleScriptFurycutterRoles,
    pub context_state: BattleScriptFurycutterContextState,
    pub move_result_flags: u32,
    pub current_move_power: u16,
    pub dynamic_base_power: u16,
}

/// Minimal concrete-program instruction projection. The canonical macro has
/// no operands; keeping only its observable count avoids inventing a fake
/// operand payload.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptFurycutterInstruction<'a> {
    pub opcode_name: &'a str,
    pub program_counter: u32,
    pub opcode_id: u8,
    pub dispatcher: &'a str,
    pub operand_count: usize,
}

/// Outer-program label resolution visible to this leaf. No absolute jump
/// cursor is carried: the parent machine owns it, while this boolean retains
/// the only behavior the canonical handler observes from label lookup.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptFurycutterLabels {
    pub move_missed_pause_resolved: bool,
}

/// Machine-independent control result of `Cmd_furycuttercalc`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptFurycutterControl {
    /// Source increments `gBattlescriptCurrInstr` by its operandless width.
    Advance,
    /// A no-effect result resolves and jumps to `BattleScript_MoveMissedPause`.
    MoveMissedPauseJump,
}

/// Complete projected result of one successful handler invocation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptFurycutterOutcome {
    pub rules: BattleScriptFurycutterRules,
    pub control: BattleScriptFurycutterControl,
}

/// Exact registration and handler failures in canonical TypeScript order.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptFurycutterError {
    ExpectedExactlyOneConcreteStart { count: usize },
    InvalidInstructionShape { program_counter: u32 },
    MissingAttackerRole,
    MissingMoveMissedPause,
}

impl fmt::Display for BattleScriptFurycutterError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ExpectedExactlyOneConcreteStart { count } => write!(
                formatter,
                "B_SCR_OP_FURYCUTTERCALC requires exactly 1 concrete start, got {count}"
            ),
            Self::InvalidInstructionShape { program_counter } => write!(
                formatter,
                "invalid B_SCR_OP_FURYCUTTERCALC shape at program counter {program_counter}"
            ),
            Self::MissingAttackerRole => {
                write!(
                    formatter,
                    "Battle Script hit-chain command requires a attacker role"
                )
            }
            Self::MissingMoveMissedPause => write!(
                formatter,
                "Cmd_furycuttercalc requires {BATTLE_SCRIPT_FURYCUTTER_MOVE_MISSED_PAUSE_LABEL}"
            ),
        }
    }
}

impl std::error::Error for BattleScriptFurycutterError {}

/// Validates the selected concrete instruction exactly as
/// `createBattleScriptFuryCutterOpcodeHandlers` does after filtering by opcode
/// name. Unlike several neighboring leaves, this registration guard explicitly
/// validates the selected opcode id against `0xB5`.
pub fn validate_battle_script_furycutter_instruction(
    instruction: BattleScriptFurycutterInstruction<'_>,
) -> Result<(), BattleScriptFurycutterError> {
    if instruction.opcode_name != BATTLE_SCRIPT_FURYCUTTER_OPCODE_NAME
        || instruction.opcode_id != BATTLE_SCRIPT_FURYCUTTER_OPCODE
        || instruction.dispatcher != BATTLE_SCRIPT_FURYCUTTER_DISPATCHER
        || instruction.operand_count != 0
    {
        return Err(BattleScriptFurycutterError::InvalidInstructionShape {
            program_counter: instruction.program_counter,
        });
    }
    Ok(())
}

/// Native projection of
/// `createBattleScriptFuryCutterOpcodeHandlers(program)`.
///
/// The program slice is filtered by the canonical opcode name first. Thus
/// cardinality errors precede all selected-instruction shape checks, exactly as
/// the TypeScript factory does, and unrelated instructions are invisible.
pub fn validate_battle_script_furycutter_registration<'a>(
    instructions: &'a [BattleScriptFurycutterInstruction<'a>],
) -> Result<BattleScriptFurycutterInstruction<'a>, BattleScriptFurycutterError> {
    let mut matches = instructions
        .iter()
        .copied()
        .filter(|instruction| instruction.opcode_name == BATTLE_SCRIPT_FURYCUTTER_OPCODE_NAME);
    let candidate = matches.next();
    let count = 1 + matches.count();
    let Some(instruction) = candidate else {
        return Err(BattleScriptFurycutterError::ExpectedExactlyOneConcreteStart { count: 0 });
    };
    if count != 1 {
        return Err(BattleScriptFurycutterError::ExpectedExactlyOneConcreteStart { count });
    }
    validate_battle_script_furycutter_instruction(instruction)?;
    Ok(instruction)
}

/// Source-shaped counter transition and `gDynamicBasePower` calculation.
///
/// The exact comparison intentionally occurs before increment. A source
/// counter of five therefore remains five, while every other `u8` value uses
/// ordinary wrapping increment. The source assigns `gBattleMoves[gCurrentMove].power`
/// first, then performs `counter - 1` multiply-and-store operations through a
/// `u16`; `wrapping_mul` retains that store-width behavior at every doubling.
#[must_use]
pub fn fury_cutter_counter_and_dynamic_base_power(
    current_move_power: u16,
    source_counter: u8,
) -> (u8, u16) {
    let counter = if source_counter == BATTLE_SCRIPT_FURYCUTTER_COUNTER_FIXED_POINT {
        source_counter
    } else {
        source_counter.wrapping_add(1)
    };
    let mut dynamic_base_power = current_move_power;
    for _ in 1..counter {
        dynamic_base_power = dynamic_base_power.wrapping_mul(2);
    }
    (counter, dynamic_base_power)
}

/// Native immutable-value twin of the canonical `Cmd_furycuttercalc` handler.
///
/// Attacker resolution deliberately precedes flag inspection and label lookup.
/// A no-effect result resolves `BattleScript_MoveMissedPause` only after that
/// role is known, resets only that attacker's Fury Cutter counter, leaves prior
/// dynamic power untouched, and returns a jump. A successful result never
/// inspects the label, updates only the attacker's counter plus dynamic base
/// power, and advances.
pub fn apply_battle_script_furycutter(
    labels: BattleScriptFurycutterLabels,
    rules: &BattleScriptFurycutterRules,
) -> Result<BattleScriptFurycutterOutcome, BattleScriptFurycutterError> {
    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptFurycutterError::MissingAttackerRole)?;

    if rules.move_result_flags & BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT != 0 {
        if !labels.move_missed_pause_resolved {
            return Err(BattleScriptFurycutterError::MissingMoveMissedPause);
        }
        let mut next = *rules;
        next.battlers[attacker.index()].fury_cutter_counter = 0;
        return Ok(BattleScriptFurycutterOutcome {
            rules: next,
            control: BattleScriptFurycutterControl::MoveMissedPauseJump,
        });
    }

    let source_counter = rules.battlers[attacker.index()].fury_cutter_counter;
    let (counter, dynamic_base_power) =
        fury_cutter_counter_and_dynamic_base_power(rules.current_move_power, source_counter);
    let mut next = *rules;
    next.battlers[attacker.index()].fury_cutter_counter = counter;
    next.dynamic_base_power = dynamic_base_power;
    Ok(BattleScriptFurycutterOutcome {
        rules: next,
        control: BattleScriptFurycutterControl::Advance,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    const BATTLER: BattleScriptFurycutterBattlerState = BattleScriptFurycutterBattlerState {
        side: 0,
        ability: 0,
        hp: 100,
        max_hp: 100,
        moves: [210, 0, 0, 0],
        pp: [20, 0, 0, 0],
        status1: 0,
        status2: 0,
        status3: 0,
        item: 0,
        stat_stages: [6; 8],
        party_index: 0,
        fury_cutter_counter: 0,
    };

    const CANONICAL_INSTRUCTION: BattleScriptFurycutterInstruction<'static> =
        BattleScriptFurycutterInstruction {
            opcode_name: BATTLE_SCRIPT_FURYCUTTER_OPCODE_NAME,
            program_counter: 1107,
            opcode_id: BATTLE_SCRIPT_FURYCUTTER_OPCODE,
            dispatcher: BATTLE_SCRIPT_FURYCUTTER_DISPATCHER,
            operand_count: 0,
        };

    fn rules(
        attacker: Option<BattleScriptFurycutterBattler>,
        counter: u8,
        move_result_flags: u32,
    ) -> BattleScriptFurycutterRules {
        let mut battlers = [BATTLER; BATTLE_SCRIPT_FURYCUTTER_BATTLER_COUNT];
        battlers[2].fury_cutter_counter = counter;
        BattleScriptFurycutterRules {
            battlers,
            selector_roles: BattleScriptFurycutterRoles {
                attacker,
                target: Some(BattleScriptFurycutterBattler::Battler3),
                effect_battler: Some(BattleScriptFurycutterBattler::Battler0),
                fainted: Some(BattleScriptFurycutterBattler::Battler1),
            },
            context_state: BattleScriptFurycutterContextState {
                scripting_battler: BattleScriptFurycutterBattler::Battler1,
                atk_canceler_tracker: 7,
                battle_outcome: 2,
                current_move: 210,
                current_move_position: 3,
                hit_marker: 0x8000_0001,
                multi_hit_counter: 4,
            },
            move_result_flags,
            current_move_power: 0xffff,
            dynamic_base_power: 0x1234,
        }
    }

    #[test]
    fn source_counter_fixed_point_wrapping_and_u16_power_boundaries() {
        assert_eq!(fury_cutter_counter_and_dynamic_base_power(10, 0), (1, 10));
        assert_eq!(fury_cutter_counter_and_dynamic_base_power(10, 4), (5, 160));
        assert_eq!(fury_cutter_counter_and_dynamic_base_power(10, 5), (5, 160));
        assert_eq!(fury_cutter_counter_and_dynamic_base_power(10, 6), (7, 640));
        assert_eq!(
            fury_cutter_counter_and_dynamic_base_power(u16::MAX, 4),
            (5, 0xfff0)
        );
        assert_eq!(
            fury_cutter_counter_and_dynamic_base_power(u16::MAX, 16),
            (17, 0)
        );
        assert_eq!(
            fury_cutter_counter_and_dynamic_base_power(0x1234, u8::MAX),
            (0, 0x1234)
        );
    }

    #[test]
    fn missing_attacker_precedes_mask_and_label_resolution() {
        let input = rules(None, u8::MAX, BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT);
        let before = input;
        assert_eq!(
            apply_battle_script_furycutter(
                BattleScriptFurycutterLabels { move_missed_pause_resolved: false },
                &input,
            )
            .expect_err("attacker must be resolved first")
            .to_string(),
            "Battle Script hit-chain command requires a attacker role"
        );
        assert_eq!(input, before, "error must not mutate input");
    }

    #[test]
    fn miss_resolves_late_resets_only_attacker_and_jumps() {
        let input = rules(
            Some(BattleScriptFurycutterBattler::Battler2),
            u8::MAX,
            BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT,
        );
        let before = input;
        assert_eq!(
            apply_battle_script_furycutter(
                BattleScriptFurycutterLabels { move_missed_pause_resolved: false },
                &input,
            )
            .expect_err("miss must resolve its label")
            .to_string(),
            "Cmd_furycuttercalc requires BattleScript_MoveMissedPause"
        );
        let outcome = apply_battle_script_furycutter(
            BattleScriptFurycutterLabels { move_missed_pause_resolved: true },
            &input,
        )
        .expect("resolved miss must jump");
        assert_eq!(
            outcome.control,
            BattleScriptFurycutterControl::MoveMissedPauseJump
        );
        assert_eq!(outcome.rules.battlers[2].fury_cutter_counter, 0);
        assert_eq!(outcome.rules.battlers[0], input.battlers[0]);
        assert_eq!(outcome.rules.battlers[1], input.battlers[1]);
        assert_eq!(outcome.rules.battlers[3], input.battlers[3]);
        assert_eq!(outcome.rules.dynamic_base_power, input.dynamic_base_power);
        assert_eq!(input, before, "result must not mutate input");
    }

    #[test]
    fn success_skips_label_lookup_and_overwrites_dynamic_power() {
        let input = rules(
            Some(BattleScriptFurycutterBattler::Battler2),
            4,
            0x8000_0000,
        );
        let outcome = apply_battle_script_furycutter(
            BattleScriptFurycutterLabels { move_missed_pause_resolved: false },
            &input,
        )
        .expect("successful Fury Cutter must not resolve MoveMissedPause");
        assert_eq!(outcome.control, BattleScriptFurycutterControl::Advance);
        assert_eq!(outcome.rules.battlers[2].fury_cutter_counter, 5);
        assert_eq!(outcome.rules.dynamic_base_power, 0xfff0);
    }

    #[test]
    fn registration_checks_cardinality_then_opcode_dispatcher_and_operands() {
        assert_eq!(
            validate_battle_script_furycutter_registration(&[])
                .expect_err("missing concrete start must fail")
                .to_string(),
            "B_SCR_OP_FURYCUTTERCALC requires exactly 1 concrete start, got 0"
        );
        assert_eq!(
            validate_battle_script_furycutter_registration(&[
                CANONICAL_INSTRUCTION,
                CANONICAL_INSTRUCTION,
            ])
            .expect_err("two concrete starts must fail before shape")
            .to_string(),
            "B_SCR_OP_FURYCUTTERCALC requires exactly 1 concrete start, got 2"
        );
        assert_eq!(
            validate_battle_script_furycutter_registration(&[BattleScriptFurycutterInstruction {
                opcode_id: 0xb4,
                ..CANONICAL_INSTRUCTION
            }])
            .expect_err("wrong opcode must fail shape")
            .to_string(),
            "invalid B_SCR_OP_FURYCUTTERCALC shape at program counter 1107"
        );
    }
}
