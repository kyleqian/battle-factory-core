//! Pure `B_SCR_OP_TRYSETENCORE` registration, decision, RNG, state, and
//! control projection.
//!
//! This is the deliberately narrow native twin of
//! `src/engine/battleScriptTrysetencoreOpcode.ts`, not a generic Battle Script
//! machine. It preserves the factory's exact-one concrete-start check and the
//! handler's validation order: instruction shape, target role, target move
//! scan/eligibility, then failure-label resolution only on the ineligible
//! path. A successful command takes exactly one Gen-3 `Random()` draw,
//! records its three-to-six turn duration, writes exactly four target Disable
//! struct fields, and advances its five-byte instruction. An ineligible
//! command consumes no RNG, writes nothing, and jumps to its resolved failure
//! label.
//!
//! Source authority:
//! - `B_SCR_OP_TRYSETENCORE` / `0xA4` dispatches to `Cmd_trysetencore` at
//!   `reference/pokeemerald/src/battle_script_commands.c:495`; its complete
//!   body is at `:8017-8046`.
//! - The five-byte `trysetencore ptr:req` macro is at
//!   `reference/pokeemerald/asm/macros/battle_script.inc:868-871`.
//! - The sole concrete site is `BattleScript_EffectEncore`,
//!   `reference/pokeemerald/data/battle_scripts_1.s:1227-1237`, where the
//!   command is at `:1232`.
//! - `MOVE_MIRROR_MOVE`, `MOVE_STRUGGLE`, and `MOVE_ENCORE` are 119, 165,
//!   and 227 in `include/constants/moves.h:123,169,231`.
//!
//! This leaf owns neither a generic program representation, scheduler
//! progression, semantic-event transport, controller state mutation,
//! presentation, nor the WASM ABI.

use core::fmt;

use crate::rng::advance_rng_value;

/// Source `MAX_BATTLERS_COUNT`; all source-indexed arrays retain four cells.
pub const BATTLE_SCRIPT_TRYSETENCORE_BATTLER_COUNT: usize = 4;
/// Source `MAX_MON_MOVES`.
pub const BATTLE_SCRIPT_TRYSETENCORE_MOVE_SLOT_COUNT: usize = 4;

/// The concrete instruction name selected by the canonical registration
/// factory.
pub const BATTLE_SCRIPT_TRYSETENCORE_OPCODE_NAME: &str = "B_SCR_OP_TRYSETENCORE";
/// `B_SCR_OP_TRYSETENCORE` in the source dispatch table.
pub const BATTLE_SCRIPT_TRYSETENCORE_OPCODE: u8 = 0xa4;
/// Source dispatch-table handler identity.
pub const BATTLE_SCRIPT_TRYSETENCORE_DISPATCHER: &str = "Cmd_trysetencore";
/// The canonical factory admits exactly this many concrete starts.
pub const BATTLE_SCRIPT_TRYSETENCORE_CONCRETE_START_COUNT: usize = 1;
/// The macro's failure pointer operand width.
pub const BATTLE_SCRIPT_TRYSETENCORE_FAILURE_POINTER_WIDTH_BYTES: u8 = 4;
/// One opcode byte plus one four-byte failure pointer.
pub const BATTLE_SCRIPT_TRYSETENCORE_ENCODED_WIDTH_BYTES: u8 = 5;

/// Source move ids rejected even when they are present in a target move slot.
pub const BATTLE_SCRIPT_TRYSETENCORE_MOVE_MIRROR_MOVE: u16 = 119;
pub const BATTLE_SCRIPT_TRYSETENCORE_MOVE_STRUGGLE: u16 = 165;
pub const BATTLE_SCRIPT_TRYSETENCORE_MOVE_ENCORE: u16 = 227;
/// `Random() & 3` adds this source lower bound.
pub const BATTLE_SCRIPT_TRYSETENCORE_DURATION_MIN: u8 = 3;
/// The inclusive source upper bound of `(Random() & 3) + 3`.
pub const BATTLE_SCRIPT_TRYSETENCORE_DURATION_MAX: u8 = 6;

/// Complete source battler-id domain for selector roles and indexed arrays.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptTrysetencoreBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

/// Fixed source battler domain, retained for independent target/sibling
/// ratchets even when the Factory currently runs singles battles.
pub const BATTLE_SCRIPT_TRYSETENCORE_BATTLERS: [BattleScriptTrysetencoreBattler;
    BATTLE_SCRIPT_TRYSETENCORE_BATTLER_COUNT] = [
    BattleScriptTrysetencoreBattler::Battler0,
    BattleScriptTrysetencoreBattler::Battler1,
    BattleScriptTrysetencoreBattler::Battler2,
    BattleScriptTrysetencoreBattler::Battler3,
];

impl BattleScriptTrysetencoreBattler {
    /// Zero-based index into source `MAX_BATTLERS_COUNT` arrays.
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

/// Full selector binding projection preserved by canonical `withBattler`.
/// Only `target` is read by this opcode.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetencoreRoles {
    pub attacker: Option<BattleScriptTrysetencoreBattler>,
    pub target: Option<BattleScriptTrysetencoreBattler>,
    pub effect_battler: Option<BattleScriptTrysetencoreBattler>,
    pub fainted: Option<BattleScriptTrysetencoreBattler>,
}

/// Complete per-battler projection retained for exact target-only mutation.
///
/// The four Encore fields mirror `gDisableStructs[target]`; all remaining
/// values are sibling state copied by the TypeScript object spread and make
/// no-write and target-only behavior executable at the leaf boundary.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetencoreBattlerState {
    pub side: u8,
    pub ability: u8,
    pub hp: u16,
    pub max_hp: u16,
    pub moves: [u16; BATTLE_SCRIPT_TRYSETENCORE_MOVE_SLOT_COUNT],
    pub pp: [u8; BATTLE_SCRIPT_TRYSETENCORE_MOVE_SLOT_COUNT],
    pub status1: u32,
    pub status2: u32,
    pub status3: u32,
    pub item: u16,
    pub stat_stages: [i8; 8],
    pub party_index: u8,
    /// Source `gDisableStructs[battler].encoredMove`.
    pub encored_move: u16,
    /// Source `gDisableStructs[battler].encoredMovePos`.
    pub encored_move_pos: u8,
    /// Source `gDisableStructs[battler].encoreTimer`.
    pub encore_timer: u8,
    /// Source `gDisableStructs[battler].encoreTimerStartValue`.
    pub encore_timer_start_value: u8,
}

/// Source-shaped move history projection. The handler reads `last_moves`
/// only, but every carried sibling demonstrates that the successful
/// `withBattler` call does not replace history.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetencoreMoveHistory {
    pub last_printed_moves: [u16; BATTLE_SCRIPT_TRYSETENCORE_BATTLER_COUNT],
    pub last_moves: [u16; BATTLE_SCRIPT_TRYSETENCORE_BATTLER_COUNT],
    pub last_resulting_moves: [u16; BATTLE_SCRIPT_TRYSETENCORE_BATTLER_COUNT],
    pub last_landed_moves: [u16; BATTLE_SCRIPT_TRYSETENCORE_BATTLER_COUNT],
    pub last_hit_by_type: [u16; BATTLE_SCRIPT_TRYSETENCORE_BATTLER_COUNT],
    pub last_hit_by: [u8; BATTLE_SCRIPT_TRYSETENCORE_BATTLER_COUNT],
}

/// Independent rules-context values copied by the canonical transition.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetencoreContextState {
    pub scripting_battler: BattleScriptTrysetencoreBattler,
    pub atk_canceler_tracker: u8,
    pub battle_outcome: u8,
    pub current_move: u16,
    pub current_move_position: u8,
    pub move_result_flags: u8,
    pub hit_marker: u32,
    pub multi_hit_counter: u8,
}

/// Complete narrow rules projection read or written by this opcode.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetencoreRules {
    pub battlers: [BattleScriptTrysetencoreBattlerState; BATTLE_SCRIPT_TRYSETENCORE_BATTLER_COUNT],
    pub selector_roles: BattleScriptTrysetencoreRoles,
    pub move_history: BattleScriptTrysetencoreMoveHistory,
    pub context_state: BattleScriptTrysetencoreContextState,
}

/// Scheduler state is intentionally carried as an immutable machine sibling:
/// `Cmd_trysetencore` does not touch controller or message scheduling.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetencoreScheduler {
    pub message_display_active: bool,
    pub pause_counter_battle: u16,
    pub active_battler: Option<BattleScriptTrysetencoreBattler>,
    pub pending_controller_battlers:
        [Option<BattleScriptTrysetencoreBattler>; BATTLE_SCRIPT_TRYSETENCORE_BATTLER_COUNT],
    pub pending_count: u8,
}

/// The state-machine siblings this command must preserve or update. The
/// source's RNG is a raw u32; `rng_calls` is the canonical TS receipt count
/// and remains a narrow `u32` in this pure leaf just as neighboring ports do.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetencoreMachineSiblings {
    pub scheduler: BattleScriptTrysetencoreScheduler,
    pub rng_value: u32,
    pub rng_calls: u32,
}

/// One source-macro operand retained by instruction validation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetencoreOperand<'a> {
    pub width_bytes: u8,
    pub expression: &'a str,
}

/// A resolved failure label, retained so the leaf can report the exact
/// handler-time unresolved-label error and preserve the actual jump target.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetencoreResolvedLabel<'a> {
    pub expression: &'a str,
    pub program_counter: u32,
}

/// The instruction projection used by both registration and handler-time
/// validation. `opcode_name` is observed only by the singleton factory.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetencoreInstruction<'a> {
    pub opcode_name: &'a str,
    pub program_counter: u32,
    pub opcode_id: u8,
    pub dispatcher: &'a str,
    pub operands: &'a [BattleScriptTrysetencoreOperand<'a>],
    pub resolved_failure_target: Option<BattleScriptTrysetencoreResolvedLabel<'a>>,
}

/// The one dynamic opcode key emitted by successful singleton registration.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetencoreRegistration {
    pub opcode_id: u8,
}

/// Exact machine-independent control result of the source command.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTrysetencoreControl {
    /// The successful source command advances its encoded five bytes.
    Advance,
    /// The ineligible source command follows its resolved failure pointer.
    Jump { program_counter: u32 },
}

/// Complete immutable output of one successful opcode application.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetencoreOutcome {
    pub rules: BattleScriptTrysetencoreRules,
    pub machine_siblings: BattleScriptTrysetencoreMachineSiblings,
    pub control: BattleScriptTrysetencoreControl,
}

/// Exact canonical errors in their observable evaluation order.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTrysetencoreError<'a> {
    WrongCardinality { count: usize },
    InvalidInstructionShape { program_counter: u32 },
    MissingTargetRole,
    UnresolvedFailureTarget { expression: &'a str },
}

impl fmt::Display for BattleScriptTrysetencoreError<'_> {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::WrongCardinality { count } => write!(
                formatter,
                "B_SCR_OP_TRYSETENCORE requires exactly 1 concrete start, got {count}"
            ),
            Self::InvalidInstructionShape { program_counter } => write!(
                formatter,
                "invalid B_SCR_OP_TRYSETENCORE shape at program counter {program_counter}"
            ),
            Self::MissingTargetRole => {
                write!(
                    formatter,
                    "Battle Script hit-chain command requires a target role"
                )
            }
            Self::UnresolvedFailureTarget { expression } => write!(
                formatter,
                "Cmd_trysetencore unresolved failure target {expression}"
            ),
        }
    }
}

impl std::error::Error for BattleScriptTrysetencoreError<'_> {}

fn validate_instruction<'a>(
    instruction: BattleScriptTrysetencoreInstruction<'a>,
) -> Result<&'a str, BattleScriptTrysetencoreError<'a>> {
    let [failure] = instruction.operands else {
        return Err(BattleScriptTrysetencoreError::InvalidInstructionShape {
            program_counter: instruction.program_counter,
        });
    };
    if instruction.opcode_id != BATTLE_SCRIPT_TRYSETENCORE_OPCODE
        || instruction.dispatcher != BATTLE_SCRIPT_TRYSETENCORE_DISPATCHER
        || failure.width_bytes != BATTLE_SCRIPT_TRYSETENCORE_FAILURE_POINTER_WIDTH_BYTES
    {
        return Err(BattleScriptTrysetencoreError::InvalidInstructionShape {
            program_counter: instruction.program_counter,
        });
    }
    Ok(failure.expression)
}

/// Native projection of `createBattleScriptTrysetencoreOpcodeHandlers`.
///
/// The source factory filters by the concrete opcode name, requires exactly
/// one match, validates that selected instruction, and exposes a single
/// dynamically keyed handler. Noise instructions are deliberately ignored;
/// selected duplicates fail before either shape can be inspected.
pub fn register_battle_script_trysetencore_handler<'a>(
    instructions: &[BattleScriptTrysetencoreInstruction<'a>],
) -> Result<BattleScriptTrysetencoreRegistration, BattleScriptTrysetencoreError<'a>> {
    let matching = instructions
        .iter()
        .filter(|instruction| instruction.opcode_name == BATTLE_SCRIPT_TRYSETENCORE_OPCODE_NAME)
        .collect::<Vec<_>>();
    if matching.len() != BATTLE_SCRIPT_TRYSETENCORE_CONCRETE_START_COUNT {
        return Err(BattleScriptTrysetencoreError::WrongCardinality { count: matching.len() });
    }
    validate_instruction(*matching[0])?;
    Ok(BattleScriptTrysetencoreRegistration { opcode_id: matching[0].opcode_id })
}

fn is_forbidden_move(move_id: u16) -> bool {
    matches!(
        move_id,
        BATTLE_SCRIPT_TRYSETENCORE_MOVE_STRUGGLE
            | BATTLE_SCRIPT_TRYSETENCORE_MOVE_ENCORE
            | BATTLE_SCRIPT_TRYSETENCORE_MOVE_MIRROR_MOVE
    )
}

/// Native immutable-value twin of canonical `Cmd_trysetencore`.
///
/// Its slot scan deliberately uses `position`, preserving the source's first
/// match when duplicate move ids occupy a battler's four slots. The complete
/// eligibility predicate keeps existing Encore, missing slot, zero PP, and
/// forbidden moves on the same fail-jump path. Label lookup is deliberately
/// deferred until that path; an eligible target never observes a bad failure
/// label. Success takes precisely one RNG draw, derives `(Random() & 3) + 3`,
/// writes exactly `encored_move`, `encored_move_pos`, `encore_timer`, and
/// `encore_timer_start_value`, and leaves every other projected field exact.
pub fn apply_battle_script_trysetencore<'a>(
    instruction: BattleScriptTrysetencoreInstruction<'a>,
    rules: &BattleScriptTrysetencoreRules,
    machine_siblings: &BattleScriptTrysetencoreMachineSiblings,
) -> Result<BattleScriptTrysetencoreOutcome, BattleScriptTrysetencoreError<'a>> {
    let failure_expression = validate_instruction(instruction)?;
    let target = rules
        .selector_roles
        .target
        .ok_or(BattleScriptTrysetencoreError::MissingTargetRole)?;
    let target_state = rules.battlers[target.index()];
    let last_move = rules.move_history.last_moves[target.index()];
    let slot = target_state
        .moves
        .iter()
        .position(|&move_id| move_id == last_move);
    let eligible = target_state.encored_move == 0
        && slot.is_some_and(|move_position| target_state.pp[move_position] != 0)
        && !is_forbidden_move(last_move);

    if !eligible {
        let resolved = instruction.resolved_failure_target.ok_or(
            BattleScriptTrysetencoreError::UnresolvedFailureTarget {
                expression: failure_expression,
            },
        )?;
        if resolved.expression != failure_expression {
            return Err(BattleScriptTrysetencoreError::UnresolvedFailureTarget {
                expression: failure_expression,
            });
        }
        return Ok(BattleScriptTrysetencoreOutcome {
            rules: *rules,
            machine_siblings: *machine_siblings,
            control: BattleScriptTrysetencoreControl::Jump {
                program_counter: resolved.program_counter,
            },
        });
    }

    let move_position = slot.expect("eligible Encore target must have a move slot");
    let next_rng_value = advance_rng_value(machine_siblings.rng_value);
    let duration = ((next_rng_value >> 16) as u8 & 3) + BATTLE_SCRIPT_TRYSETENCORE_DURATION_MIN;
    debug_assert!(duration <= BATTLE_SCRIPT_TRYSETENCORE_DURATION_MAX);

    let mut next_rules = *rules;
    let next_target = &mut next_rules.battlers[target.index()];
    next_target.encored_move = target_state.moves[move_position];
    next_target.encored_move_pos = move_position as u8;
    next_target.encore_timer = duration;
    next_target.encore_timer_start_value = duration;

    let mut next_machine = *machine_siblings;
    next_machine.rng_value = next_rng_value;
    next_machine.rng_calls = next_machine.rng_calls.wrapping_add(1);

    Ok(BattleScriptTrysetencoreOutcome {
        rules: next_rules,
        machine_siblings: next_machine,
        control: BattleScriptTrysetencoreControl::Advance,
    })
}

/// Source, macro, and concrete-program facts held outside generated behavior
/// vectors so a TS differential corpus cannot substitute for source evidence.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetencoreSourceMetadata {
    pub opcode_enum_line: u16,
    pub dispatch_line: u16,
    pub handler_line: u16,
    pub scan_line: u16,
    pub first_match_line: u16,
    pub forbidden_gate_line: u16,
    pub eligibility_gate_line: u16,
    pub write_move_line: u16,
    pub write_position_line: u16,
    pub duration_line: u16,
    pub start_value_line: u16,
    pub advance_line: u16,
    pub failure_line: u16,
    pub macro_declaration_line: u16,
    pub macro_opcode_line: u16,
    pub macro_pointer_line: u16,
    pub site_label_line: u16,
    pub site_statement_line: u16,
    pub site_program_counter: u32,
}

pub const BATTLE_SCRIPT_TRYSETENCORE_SOURCE_METADATA: BattleScriptTrysetencoreSourceMetadata =
    BattleScriptTrysetencoreSourceMetadata {
        opcode_enum_line: 170,
        dispatch_line: 495,
        handler_line: 8017,
        scan_line: 8021,
        first_match_line: 8023,
        forbidden_gate_line: 8027,
        eligibility_gate_line: 8034,
        write_move_line: 8037,
        write_position_line: 8038,
        duration_line: 8039,
        start_value_line: 8040,
        advance_line: 8041,
        failure_line: 8045,
        macro_declaration_line: 868,
        macro_opcode_line: 869,
        macro_pointer_line: 870,
        site_label_line: 1227,
        site_statement_line: 1232,
        site_program_counter: 774,
    };

#[cfg(test)]
mod tests {
    use super::*;

    const BATTLER: BattleScriptTrysetencoreBattlerState = BattleScriptTrysetencoreBattlerState {
        side: 0,
        ability: 0,
        hp: 100,
        max_hp: 100,
        moves: [33, 45, 98, 259],
        pp: [35, 25, 20, 15],
        status1: 0,
        status2: 0,
        status3: 0,
        item: 0,
        stat_stages: [0; 8],
        party_index: 0,
        encored_move: 0,
        encored_move_pos: 0,
        encore_timer: 0,
        encore_timer_start_value: 0,
    };
    const OPERAND: BattleScriptTrysetencoreOperand<'static> = BattleScriptTrysetencoreOperand {
        width_bytes: BATTLE_SCRIPT_TRYSETENCORE_FAILURE_POINTER_WIDTH_BYTES,
        expression: "BattleScript_ButItFailed",
    };
    const OPERANDS: [BattleScriptTrysetencoreOperand<'static>; 1] = [OPERAND];

    fn instruction() -> BattleScriptTrysetencoreInstruction<'static> {
        BattleScriptTrysetencoreInstruction {
            opcode_name: BATTLE_SCRIPT_TRYSETENCORE_OPCODE_NAME,
            program_counter: 774,
            opcode_id: BATTLE_SCRIPT_TRYSETENCORE_OPCODE,
            dispatcher: BATTLE_SCRIPT_TRYSETENCORE_DISPATCHER,
            operands: &OPERANDS,
            resolved_failure_target: Some(BattleScriptTrysetencoreResolvedLabel {
                expression: "BattleScript_ButItFailed",
                program_counter: 1250,
            }),
        }
    }

    fn rules(target: Option<BattleScriptTrysetencoreBattler>) -> BattleScriptTrysetencoreRules {
        let mut battlers = [BATTLER; BATTLE_SCRIPT_TRYSETENCORE_BATTLER_COUNT];
        battlers[2] = BattleScriptTrysetencoreBattlerState {
            moves: [45, 45, 98, 259],
            pp: [25, 0, 20, 15],
            ..BATTLER
        };
        BattleScriptTrysetencoreRules {
            battlers,
            selector_roles: BattleScriptTrysetencoreRoles {
                attacker: Some(BattleScriptTrysetencoreBattler::Battler0),
                target,
                effect_battler: Some(BattleScriptTrysetencoreBattler::Battler1),
                fainted: Some(BattleScriptTrysetencoreBattler::Battler3),
            },
            move_history: BattleScriptTrysetencoreMoveHistory {
                last_printed_moves: [33, 45, 98, 259],
                last_moves: [33, 45, 45, 259],
                last_resulting_moves: [33, 45, 98, 259],
                last_landed_moves: [33, 45, 98, 259],
                last_hit_by_type: [0, 1, 2, 3],
                last_hit_by: [3, 2, 1, 0],
            },
            context_state: BattleScriptTrysetencoreContextState {
                scripting_battler: BattleScriptTrysetencoreBattler::Battler3,
                atk_canceler_tracker: 7,
                battle_outcome: 2,
                current_move: 227,
                current_move_position: 3,
                move_result_flags: 0x80,
                hit_marker: 0x8000_0001,
                multi_hit_counter: 4,
            },
        }
    }

    fn machine() -> BattleScriptTrysetencoreMachineSiblings {
        BattleScriptTrysetencoreMachineSiblings {
            scheduler: BattleScriptTrysetencoreScheduler {
                message_display_active: true,
                pause_counter_battle: 99,
                active_battler: Some(BattleScriptTrysetencoreBattler::Battler1),
                pending_controller_battlers: [
                    Some(BattleScriptTrysetencoreBattler::Battler2),
                    Some(BattleScriptTrysetencoreBattler::Battler0),
                    None,
                    None,
                ],
                pending_count: 2,
            },
            rng_value: 0,
            rng_calls: 9,
        }
    }

    #[test]
    fn first_matching_slot_and_only_four_encore_fields_change_after_one_draw() {
        let input = rules(Some(BattleScriptTrysetencoreBattler::Battler2));
        let machine_input = machine();
        let before_rules = input;
        let before_machine = machine_input;
        let outcome = apply_battle_script_trysetencore(instruction(), &input, &machine_input)
            .expect("first duplicate slot is eligible");

        assert_eq!(outcome.control, BattleScriptTrysetencoreControl::Advance);
        assert_eq!(outcome.rules.battlers[2].encored_move, 45);
        assert_eq!(outcome.rules.battlers[2].encored_move_pos, 0);
        assert!((BATTLE_SCRIPT_TRYSETENCORE_DURATION_MIN
            ..=BATTLE_SCRIPT_TRYSETENCORE_DURATION_MAX)
            .contains(&outcome.rules.battlers[2].encore_timer));
        assert_eq!(
            outcome.rules.battlers[2].encore_timer,
            outcome.rules.battlers[2].encore_timer_start_value
        );
        assert_eq!(outcome.rules.battlers[0], input.battlers[0]);
        assert_eq!(outcome.rules.battlers[1], input.battlers[1]);
        assert_eq!(outcome.rules.battlers[3], input.battlers[3]);
        assert_eq!(outcome.rules.selector_roles, input.selector_roles);
        assert_eq!(outcome.rules.move_history, input.move_history);
        assert_eq!(outcome.rules.context_state, input.context_state);
        assert_eq!(outcome.machine_siblings.scheduler, machine_input.scheduler);
        assert_eq!(outcome.machine_siblings.rng_value, advance_rng_value(0));
        assert_eq!(outcome.machine_siblings.rng_calls, 10);
        assert_eq!(
            input, before_rules,
            "native leaf must not mutate rules input"
        );
        assert_eq!(
            machine_input, before_machine,
            "native leaf must not mutate machine input"
        );
    }

    #[test]
    fn failure_is_late_and_rng_free_after_shape_then_target_validation() {
        let missing_target = rules(None);
        let machine_input = machine();
        let malformed = BattleScriptTrysetencoreInstruction { opcode_id: 0xa3, ..instruction() };
        assert_eq!(
            apply_battle_script_trysetencore(malformed, &missing_target, &machine_input)
                .expect_err("shape must precede target lookup")
                .to_string(),
            "invalid B_SCR_OP_TRYSETENCORE shape at program counter 774"
        );
        assert_eq!(
            apply_battle_script_trysetencore(instruction(), &missing_target, &machine_input)
                .expect_err("target must precede move history read")
                .to_string(),
            "Battle Script hit-chain command requires a target role"
        );

        let mut blocked = rules(Some(BattleScriptTrysetencoreBattler::Battler2));
        blocked.battlers[2].encored_move = 7;
        let outcome = apply_battle_script_trysetencore(instruction(), &blocked, &machine_input)
            .expect("blocked target resolves failure label");
        assert_eq!(
            outcome.control,
            BattleScriptTrysetencoreControl::Jump { program_counter: 1250 }
        );
        assert_eq!(outcome.rules, blocked);
        assert_eq!(outcome.machine_siblings, machine_input);
    }
}
