//! Pure `B_SCR_OP_PAINSPLITDMGCALC` registration and state/control projection.
//!
//! This is the deliberately narrow, machine-independent port of
//! `src/engine/battleScriptPainSplitOpcode.ts`. The canonical registration
//! factory filters by opcode name, requires one concrete instruction, and
//! validates the selected opcode, dispatcher, and one four-byte failure
//! pointer. The direct handler repeats that validation before resolving roles:
//! attacker first, target second. A target Substitute follows its pointer
//! without writing state; otherwise the source-u16 HP average writes the two
//! signed scratch globals and only the target's Shell Bell receipt.
//!
//! Source authority:
//! - `B_SCR_OP_PAINSPLITDMGCALC` / `0xA5` is bound to
//!   `Cmd_painsplitdmgcalc` in
//!   `reference/pokeemerald/src/battle_script_commands.c:496`.
//! - The handler body is at `battle_script_commands.c:8049-8071`; it tests
//!   `STATUS2_SUBSTITUTE`, divides the sum of two source `u16` HP fields by
//!   two, writes `gBattleScripting.painSplitHp` and `gBattleMoveDamage`, and
//!   sets only `gSpecialStatuses[target].shellBellDmg`.
//! - The five-byte `painsplitdmgcalc ptr:req` macro is at
//!   `reference/pokeemerald/asm/macros/battle_script.inc:873-876`; its single
//!   concrete use is `BattleScript_EffectPainSplit` at
//!   `reference/pokeemerald/data/battle_scripts_1.s:1239-1253`.
//! - `BattlePokemon::{hp,status2}` are source `u16` / `u32`
//!   (`reference/pokeemerald/include/pokemon.h`), while `painSplitHp`,
//!   `gBattleMoveDamage`, and `SpecialStatus::{shellBellDmg,physicalDmg,
//!   specialDmg}` are source signed 32-bit values.
//!
//! The generic script program, label-table lookup, absolute program counters,
//! battle reducer, later HP application, scheduler, RNG, presentation, and
//! WASM boundary intentionally remain outside this pure leaf.

use core::fmt;

/// Source `MAX_BATTLERS_COUNT`; all active source arrays retain four cells.
pub const BATTLE_SCRIPT_PAINSPLIT_BATTLER_COUNT: usize = 4;

/// The sole name selected by the canonical registration factory.
pub const BATTLE_SCRIPT_PAINSPLIT_OPCODE_NAME: &str = "B_SCR_OP_PAINSPLITDMGCALC";

/// `B_SCR_OP_PAINSPLITDMGCALC`, separately ratcheted source identity.
pub const BATTLE_SCRIPT_PAINSPLIT_OPCODE: u8 = 0xa5;

/// Source dispatch-table identity, separately ratcheted from the factory.
pub const BATTLE_SCRIPT_PAINSPLIT_DISPATCHER: &str = "Cmd_painsplitdmgcalc";

/// The one operand in the five-byte source macro is a four-byte pointer.
pub const BATTLE_SCRIPT_PAINSPLIT_FAILURE_POINTER_WIDTH_BYTES: u8 = 4;

/// `STATUS2_SUBSTITUTE` from `include/constants/battle.h:148`.
pub const BATTLE_SCRIPT_PAINSPLIT_STATUS2_SUBSTITUTE: u32 = 1 << 24;

/// `IGNORE_SHELL_BELL` from `include/battle.h:60`.
pub const BATTLE_SCRIPT_PAINSPLIT_IGNORE_SHELL_BELL: i32 = 0xffff;

/// Complete source `BattleScriptBattlerId` domain used by roles and active
/// battler arrays.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptPainSplitBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

/// Fixed domain retained for selector/alias and source-array ratchets.
pub const BATTLE_SCRIPT_PAINSPLIT_BATTLERS: [BattleScriptPainSplitBattler;
    BATTLE_SCRIPT_PAINSPLIT_BATTLER_COUNT] = [
    BattleScriptPainSplitBattler::Battler0,
    BattleScriptPainSplitBattler::Battler1,
    BattleScriptPainSplitBattler::Battler2,
    BattleScriptPainSplitBattler::Battler3,
];

impl BattleScriptPainSplitBattler {
    /// Zero-based source-array index.
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

/// Every SpecialStatus field preserved by the canonical shallow battler copy.
/// Only `shell_bell_dmg` is replaced on a non-Substitute result.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptPainSplitSpecialStatus {
    pub restored_battler_sprite: u8,
    pub focus_banded: u8,
    pub shell_bell_dmg: i32,
    pub physical_dmg: i32,
    pub special_dmg: i32,
}

/// Per-battler projection that makes all data adjacent to the HP/status/
/// SpecialStatus write boundary executable. `max_hp` is retained even though
/// this command reads current HP only, proving it is not accidentally changed.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptPainSplitBattlerState {
    pub side: u8,
    pub ability: u8,
    pub hp: u16,
    pub max_hp: u16,
    pub status1: u32,
    pub status2: u32,
    pub status3: u32,
    pub special_status: BattleScriptPainSplitSpecialStatus,
    pub moves: [u16; 4],
    pub pp: [u8; 4],
    pub substitute_hp: u8,
    pub rollout_timer: u8,
    pub fury_cutter_counter: u8,
    pub truant_counter: u8,
    pub recharge_timer: u8,
    pub flinch_immobility: u8,
    pub disabled_move: u16,
    pub used_disabled_move: u8,
    pub taunt_timer: u8,
    pub used_taunted_move: u8,
    pub used_imprisoned_move: u8,
    pub item: u16,
    pub stat_stages: [i8; 8],
    pub party_index: u8,
    pub speed: u16,
}

/// Complete selector projection. Only attacker and target are read, but the
/// two remaining nullable bindings prove the canonical object spread preserves
/// aliases exactly.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptPainSplitRoles {
    pub attacker: Option<BattleScriptPainSplitBattler>,
    pub target: Option<BattleScriptPainSplitBattler>,
    pub effect_battler: Option<BattleScriptPainSplitBattler>,
    pub fainted: Option<BattleScriptPainSplitBattler>,
}

/// Independent context fields preserved by the canonical `{ ...rulesContext }`
/// result. This leaf neither interprets nor rewrites any of them.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptPainSplitSiblings {
    pub scripting_battler: BattleScriptPainSplitBattler,
    pub battler_with_ability: BattleScriptPainSplitBattler,
    pub atk_canceler_tracker: u8,
    pub battle_outcome: u8,
    pub current_move: u16,
    pub current_move_effect: u8,
    pub current_move_position: u8,
    pub move_result_flags: u32,
    pub dmg_multiplier: u8,
    pub crit_multiplier: u8,
    pub move_effect_byte: u8,
    pub miss_type: u8,
    pub hit_marker: u32,
    pub multi_hit_counter: u8,
    pub multi_hit_string_counter: u8,
    pub multistring_chooser: u8,
    pub dynamic_base_power: u16,
    pub hp_dealt: i32,
    pub bide_dmg: [i32; BATTLE_SCRIPT_PAINSPLIT_BATTLER_COUNT],
    pub locked_moves: [u16; BATTLE_SCRIPT_PAINSPLIT_BATTLER_COUNT],
    pub side_statuses: [u32; 2],
    pub weather: u32,
    pub weather_timer: u8,
}

/// Complete narrow projection read or written by `Cmd_painsplitdmgcalc`.
/// This is intentionally not a generic BattleState: every retained field
/// exists to prove the command's immutable ownership boundary.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptPainSplitRules {
    pub battlers: [BattleScriptPainSplitBattlerState; BATTLE_SCRIPT_PAINSPLIT_BATTLER_COUNT],
    pub selector_roles: BattleScriptPainSplitRoles,
    /// Source `s32 gBattleScripting.painSplitHp`.
    pub pain_split_hp: i32,
    /// Source `s32 gBattleMoveDamage`.
    pub battle_move_damage: i32,
    pub siblings: BattleScriptPainSplitSiblings,
}

/// Minimal source operand projection. The handler validates width and count;
/// expression is carried so the surrounding program can resolve its own
/// pointer late on the Substitute branch.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptPainSplitOperand<'a> {
    pub width_bytes: u8,
    pub expression: &'a str,
}

/// Instruction projection seen both by registration and direct execution.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptPainSplitInstruction<'a> {
    pub opcode_name: &'a str,
    pub program_counter: u32,
    pub opcode_id: u8,
    pub dispatcher: &'a str,
    pub operands: &'a [BattleScriptPainSplitOperand<'a>],
}

/// The single dynamic handler-map binding made after canonical registration.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptPainSplitRegistration {
    pub opcode_id: u8,
}

/// Machine-independent control result. The actual label entry and program
/// counter deliberately remain in the omitted generic Battle Script machine.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptPainSplitControl {
    Advance,
    FailJump,
}

/// Complete projected result of one successful handler invocation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptPainSplitOutcome {
    pub rules: BattleScriptPainSplitRules,
    pub control: BattleScriptPainSplitControl,
}

/// Exact registration-time failures in canonical evaluation order.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptPainSplitRegistrationError {
    IncorrectConcreteStartCount { count: usize },
    InvalidInstructionShape { program_counter: u32 },
}

impl fmt::Display for BattleScriptPainSplitRegistrationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::IncorrectConcreteStartCount { count } => write!(
                formatter,
                "B_SCR_OP_PAINSPLITDMGCALC requires exactly 1 concrete start, got {count}"
            ),
            Self::InvalidInstructionShape { program_counter } => write!(
                formatter,
                "invalid B_SCR_OP_PAINSPLITDMGCALC shape at program counter {program_counter}"
            ),
        }
    }
}

impl std::error::Error for BattleScriptPainSplitRegistrationError {}

/// Exact direct-handler failures in canonical evaluation order.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptPainSplitError<'a> {
    InvalidInstructionShape { program_counter: u32 },
    MissingAttackerRole,
    MissingTargetRole,
    UnresolvedFailureTarget { expression: &'a str },
}

impl fmt::Display for BattleScriptPainSplitError<'_> {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidInstructionShape { program_counter } => write!(
                formatter,
                "invalid B_SCR_OP_PAINSPLITDMGCALC shape at program counter {program_counter}"
            ),
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
            Self::UnresolvedFailureTarget { expression } => write!(
                formatter,
                "Cmd_painsplitdmgcalc unresolved failure target {expression}"
            ),
        }
    }
}

impl std::error::Error for BattleScriptPainSplitError<'_> {}

fn failure_expression<'a>(
    instruction: BattleScriptPainSplitInstruction<'a>,
) -> Result<&'a str, u32> {
    let [failure] = instruction.operands else {
        return Err(instruction.program_counter);
    };
    if instruction.opcode_id != BATTLE_SCRIPT_PAINSPLIT_OPCODE
        || instruction.dispatcher != BATTLE_SCRIPT_PAINSPLIT_DISPATCHER
        || failure.width_bytes != BATTLE_SCRIPT_PAINSPLIT_FAILURE_POINTER_WIDTH_BYTES
    {
        return Err(instruction.program_counter);
    }
    Ok(failure.expression)
}

/// Native projection of `createBattleScriptPainSplitOpcodeHandlers(program)`.
///
/// Filtering happens before cardinality validation, and shape validation is
/// reached only for exactly one selected instruction. The returned binding is
/// only the handler-map key; the surrounding script machine owns its closure.
pub fn register_battle_script_painsplit_handler(
    instructions: &[BattleScriptPainSplitInstruction<'_>],
) -> Result<BattleScriptPainSplitRegistration, BattleScriptPainSplitRegistrationError> {
    let selected: Vec<_> = instructions
        .iter()
        .filter(|instruction| instruction.opcode_name == BATTLE_SCRIPT_PAINSPLIT_OPCODE_NAME)
        .collect();
    if selected.len() != 1 {
        return Err(
            BattleScriptPainSplitRegistrationError::IncorrectConcreteStartCount {
                count: selected.len(),
            },
        );
    }
    let instruction = *selected[0];
    failure_expression(instruction).map_err(|program_counter| {
        BattleScriptPainSplitRegistrationError::InvalidInstructionShape { program_counter }
    })?;
    Ok(BattleScriptPainSplitRegistration { opcode_id: instruction.opcode_id })
}

/// Native immutable-value twin of the canonical `Cmd_painsplitdmgcalc`
/// handler.
///
/// Instruction shape is checked before either role. Attacker resolution wins
/// over target resolution. A target Substitute performs the surrounding
/// program's failure-label lookup only after those reads and returns its
/// no-write jump. The non-Substitute path uses a `u32` intermediate for the
/// complete source-u16 sum, so division is the source's non-negative floor;
/// all resulting signed differences fit `i32` without narrowing.
pub fn apply_battle_script_painsplit<'a>(
    instruction: BattleScriptPainSplitInstruction<'a>,
    rules: &BattleScriptPainSplitRules,
    resolved_failure_target: Option<&str>,
) -> Result<BattleScriptPainSplitOutcome, BattleScriptPainSplitError<'a>> {
    let failure = failure_expression(instruction).map_err(|program_counter| {
        BattleScriptPainSplitError::InvalidInstructionShape { program_counter }
    })?;
    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptPainSplitError::MissingAttackerRole)?;
    let target = rules
        .selector_roles
        .target
        .ok_or(BattleScriptPainSplitError::MissingTargetRole)?;
    let target_state = rules.battlers[target.index()];

    if target_state.status2 & BATTLE_SCRIPT_PAINSPLIT_STATUS2_SUBSTITUTE != 0 {
        if resolved_failure_target != Some(failure) {
            return Err(BattleScriptPainSplitError::UnresolvedFailureTarget {
                expression: failure,
            });
        }
        return Ok(BattleScriptPainSplitOutcome {
            rules: *rules,
            control: BattleScriptPainSplitControl::FailJump,
        });
    }

    let attacker_hp = rules.battlers[attacker.index()].hp;
    let average = (u32::from(attacker_hp) + u32::from(target_state.hp)) / 2;
    let average = average as i32;
    let mut next = *rules;
    next.pain_split_hp = i32::from(target_state.hp) - average;
    next.battle_move_damage = i32::from(attacker_hp) - average;
    next.battlers[target.index()].special_status.shell_bell_dmg =
        BATTLE_SCRIPT_PAINSPLIT_IGNORE_SHELL_BELL;
    Ok(
        BattleScriptPainSplitOutcome {
            rules: next,
            control: BattleScriptPainSplitControl::Advance,
        },
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::battle_script_painsplit_vectors_gen::{
        BattleScriptPainSplitVectorBattlerState, BattleScriptPainSplitVectorCase,
        BattleScriptPainSplitVectorInstruction, BattleScriptPainSplitVectorSiblings,
        BattleScriptPainSplitVectorSpecialStatus, BattleScriptPainSplitVectorState,
        BATTLE_SCRIPT_PAINSPLIT_CALL_SITE_EVIDENCE,
        BATTLE_SCRIPT_PAINSPLIT_CANONICAL_DECOMP_DISPATCH_EVIDENCE, BATTLE_SCRIPT_PAINSPLIT_CASES,
        BATTLE_SCRIPT_PAINSPLIT_CATEGORY_CENSUS, BATTLE_SCRIPT_PAINSPLIT_MACRO_EVIDENCE,
        BATTLE_SCRIPT_PAINSPLIT_REGISTRATION_CASES,
    };

    fn special_status(
        value: BattleScriptPainSplitVectorSpecialStatus,
    ) -> BattleScriptPainSplitSpecialStatus {
        BattleScriptPainSplitSpecialStatus {
            restored_battler_sprite: value.restored_battler_sprite,
            focus_banded: value.focus_banded,
            shell_bell_dmg: value.shell_bell_dmg,
            physical_dmg: value.physical_dmg,
            special_dmg: value.special_dmg,
        }
    }

    fn battler(
        value: BattleScriptPainSplitVectorBattlerState,
    ) -> BattleScriptPainSplitBattlerState {
        BattleScriptPainSplitBattlerState {
            side: value.side,
            ability: value.ability,
            hp: value.hp,
            max_hp: value.max_hp,
            status1: value.status1,
            status2: value.status2,
            status3: value.status3,
            special_status: special_status(value.special_status),
            moves: value.moves,
            pp: value.pp,
            substitute_hp: value.substitute_hp,
            rollout_timer: value.rollout_timer,
            fury_cutter_counter: value.fury_cutter_counter,
            truant_counter: value.truant_counter,
            recharge_timer: value.recharge_timer,
            flinch_immobility: value.flinch_immobility,
            disabled_move: value.disabled_move,
            used_disabled_move: value.used_disabled_move,
            taunt_timer: value.taunt_timer,
            used_taunted_move: value.used_taunted_move,
            used_imprisoned_move: value.used_imprisoned_move,
            item: value.item,
            stat_stages: value.stat_stages,
            party_index: value.party_index,
            speed: value.speed,
        }
    }

    fn siblings(value: BattleScriptPainSplitVectorSiblings) -> BattleScriptPainSplitSiblings {
        BattleScriptPainSplitSiblings {
            scripting_battler: value.scripting_battler,
            battler_with_ability: value.battler_with_ability,
            atk_canceler_tracker: value.atk_canceler_tracker,
            battle_outcome: value.battle_outcome,
            current_move: value.current_move,
            current_move_effect: value.current_move_effect,
            current_move_position: value.current_move_position,
            move_result_flags: value.move_result_flags,
            dmg_multiplier: value.dmg_multiplier,
            crit_multiplier: value.crit_multiplier,
            move_effect_byte: value.move_effect_byte,
            miss_type: value.miss_type,
            hit_marker: value.hit_marker,
            multi_hit_counter: value.multi_hit_counter,
            multi_hit_string_counter: value.multi_hit_string_counter,
            multistring_chooser: value.multistring_chooser,
            dynamic_base_power: value.dynamic_base_power,
            hp_dealt: value.hp_dealt,
            bide_dmg: value.bide_dmg,
            locked_moves: value.locked_moves,
            side_statuses: value.side_statuses,
            weather: value.weather,
            weather_timer: value.weather_timer,
        }
    }

    fn rules(value: BattleScriptPainSplitVectorState) -> BattleScriptPainSplitRules {
        BattleScriptPainSplitRules {
            battlers: value.battlers.map(battler),
            selector_roles: BattleScriptPainSplitRoles {
                attacker: value.attacker,
                target: value.target,
                effect_battler: value.effect_battler,
                fainted: value.fainted,
            },
            pain_split_hp: value.pain_split_hp,
            battle_move_damage: value.battle_move_damage,
            siblings: siblings(value.siblings),
        }
    }

    fn instruction<'a>(
        value: BattleScriptPainSplitVectorInstruction,
        operands: &'a [BattleScriptPainSplitOperand<'a>],
    ) -> BattleScriptPainSplitInstruction<'a> {
        BattleScriptPainSplitInstruction {
            opcode_name: value.opcode_name,
            program_counter: value.program_counter,
            opcode_id: value.opcode_id,
            dispatcher: value.dispatcher,
            operands,
        }
    }

    fn check_case(case: &BattleScriptPainSplitVectorCase) {
        let operands: Vec<_> = case
            .instruction
            .operand_widths
            .iter()
            .zip(case.instruction.operand_expressions)
            .map(|(&width_bytes, &expression)| BattleScriptPainSplitOperand {
                width_bytes,
                expression,
            })
            .collect();
        let instruction = instruction(case.instruction, &operands);
        let mut current = rules(case.initial);
        let original = current;
        let mut controls = Vec::new();
        let mut actual_error = None;
        for _ in 0..case.applications {
            let before = current;
            match apply_battle_script_painsplit(
                instruction,
                &current,
                case.instruction.resolved_failure_target,
            ) {
                Ok(outcome) => {
                    assert_eq!(current, before, "{} mutated its input", case.label);
                    controls.push(outcome.control);
                    current = outcome.rules;
                }
                Err(error) => {
                    assert_eq!(current, before, "{} mutated its failing input", case.label);
                    actual_error = Some(error.to_string());
                    break;
                }
            }
        }
        assert_eq!(
            rules(case.initial),
            original,
            "{} changed initial state",
            case.label
        );
        assert_eq!(
            controls.as_slice(),
            case.controls,
            "{} controls",
            case.label
        );
        assert_eq!(
            actual_error.as_deref(),
            case.expected_error,
            "{} error",
            case.label
        );
        assert_eq!(
            case.expected.map(rules),
            if actual_error.is_none() {
                Some(current)
            } else {
                None
            },
            "{} result",
            case.label,
        );
    }

    #[test]
    fn canonical_generated_vectors_match_native_port() {
        for case in &BATTLE_SCRIPT_PAINSPLIT_CASES {
            check_case(case);
        }
    }

    #[test]
    fn canonical_registration_vectors_match_native_port() {
        for case in &BATTLE_SCRIPT_PAINSPLIT_REGISTRATION_CASES {
            let operand_sets: Vec<Vec<_>> = case
                .instructions
                .iter()
                .map(|source| {
                    source
                        .operand_widths
                        .iter()
                        .zip(source.operand_expressions)
                        .map(|(&width_bytes, &expression)| BattleScriptPainSplitOperand {
                            width_bytes,
                            expression,
                        })
                        .collect()
                })
                .collect();
            let instructions: Vec<_> = case
                .instructions
                .iter()
                .zip(&operand_sets)
                .map(|(&source, operands)| instruction(source, operands))
                .collect();
            match register_battle_script_painsplit_handler(&instructions) {
                Ok(registration) => {
                    assert_eq!(
                        case.expected_error, None,
                        "{} unexpected success",
                        case.label
                    );
                    assert_eq!(
                        case.expected_bindings,
                        &[registration.opcode_id],
                        "{} binding",
                        case.label
                    );
                }
                Err(error) => {
                    assert!(
                        case.expected_bindings.is_empty(),
                        "{} unexpected failure",
                        case.label
                    );
                    assert_eq!(
                        Some(error.to_string()).as_deref(),
                        case.expected_error,
                        "{} error",
                        case.label
                    );
                }
            }
        }
    }

    #[test]
    fn canonical_source_evidence_is_separately_pinned() {
        assert_eq!(
            BATTLE_SCRIPT_PAINSPLIT_CANONICAL_DECOMP_DISPATCH_EVIDENCE.opcode_id,
            0xa5
        );
        assert_eq!(
            BATTLE_SCRIPT_PAINSPLIT_CANONICAL_DECOMP_DISPATCH_EVIDENCE.dispatch_line,
            496
        );
        assert_eq!(
            BATTLE_SCRIPT_PAINSPLIT_MACRO_EVIDENCE.pointer_width_bytes,
            4
        );
        assert_eq!(
            BATTLE_SCRIPT_PAINSPLIT_CALL_SITE_EVIDENCE.concrete_call_sites,
            1
        );
        assert_eq!(
            BATTLE_SCRIPT_PAINSPLIT_CALL_SITE_EVIDENCE.statement_line,
            1244
        );
        assert!(BATTLE_SCRIPT_PAINSPLIT_CATEGORY_CENSUS
            .iter()
            .any(|&(category, count)| category == "complete-selector-matrix" && count == 625));
    }
}
