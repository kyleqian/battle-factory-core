//! Pure `B_SCR_OP_TRYSETPERISHSONG` registration, state, and control leaf.
//!
//! This is the deliberately narrow native twin of
//! `src/engine/battleScriptTrysetperishsongOpcode.ts`, not a generic Battle
//! Script machine. It keeps the canonical handler's observable ordering:
//! instruction shape, the per-battler Perish Song affliction pass over
//! `battlersCount`, the attacker role requirement, `PressurePPLoseOnUsingPerishSong`,
//! and only then late failure-label resolution. Thus the Pressure PP loss
//! still applies even when every battler is unaffected and the command takes
//! its failure branch. No branch consumes RNG, emits an event, changes
//! scheduler state, or touches presentation.
//!
//! Source authority:
//! - `Cmd_trysetperishsong` is `reference/pokeemerald/src/battle_script_commands.c:8508-8534`;
//!   dispatch `:509` (`//0xB2`), forward declaration `:257`.
//! - `PressurePPLoseOnUsingPerishSong` is `reference/pokeemerald/src/battle_util.c:799-830`;
//!   this leaf ports only its `gBattleMons[attacker].pp[perishSongPos]` write,
//!   matching the canonical TypeScript handler (the source's party-mirror
//!   `EmitSetMonData` is owned elsewhere).
//! - The five-byte macro is `asm/macros/battle_script.inc:932-935`.
//! - The sole concrete call is `BattleScript_EffectPerishSong` at
//!   `data/battle_scripts_1.s:1567-1571`.
//! - `STATUS3_PERISH_SONG` is `include/constants/battle.h:162`;
//!   `ABILITY_SOUNDPROOF`/`ABILITY_PRESSURE` are
//!   `include/constants/abilities.h:47,50`; `MOVE_PERISH_SONG` is
//!   `include/constants/moves.h:199`.
//!
//! This leaf deliberately owns neither a generic machine, scheduler/event
//! transport, RNG advancement, presentation, nor the WASM ABI.

use core::fmt;

/// Source `MAX_BATTLERS_COUNT`; all source-indexed state retains four cells.
pub const BATTLE_SCRIPT_TRYSETPERISHSONG_BATTLER_COUNT: usize = 4;
/// Source `MAX_MON_MOVES`; the width of each battler's `moves`/`pp` arrays.
pub const BATTLE_SCRIPT_TRYSETPERISHSONG_MOVE_SLOT_COUNT: usize = 4;
/// `B_SCR_OP_TRYSETPERISHSONG` in the source command enum / dispatch table.
pub const BATTLE_SCRIPT_TRYSETPERISHSONG_OPCODE: u8 = 0xb2;
/// Concrete opcode name selected by canonical registration.
pub const BATTLE_SCRIPT_TRYSETPERISHSONG_OPCODE_NAME: &str = "B_SCR_OP_TRYSETPERISHSONG";
/// Source dispatch-table handler identity.
pub const BATTLE_SCRIPT_TRYSETPERISHSONG_DISPATCHER: &str = "Cmd_trysetperishsong";
/// The canonical factory accepts exactly this many concrete starts.
pub const BATTLE_SCRIPT_TRYSETPERISHSONG_CONCRETE_START_COUNT: usize = 1;
/// One four-byte failure pointer follows the opcode byte.
pub const BATTLE_SCRIPT_TRYSETPERISHSONG_FAILURE_POINTER_WIDTH_BYTES: u8 = 4;
/// The source macro's encoded byte width.
pub const BATTLE_SCRIPT_TRYSETPERISHSONG_ENCODED_WIDTH_BYTES: u8 = 5;
/// `include/constants/battle.h:162` -- `STATUS3_PERISH_SONG` (`1 << 5`).
pub const BATTLE_SCRIPT_STATUS3_PERISH_SONG: u32 = 1 << 5;
/// `include/constants/abilities.h:47` -- `ABILITY_SOUNDPROOF`.
pub const BATTLE_SCRIPT_ABILITY_SOUNDPROOF: u8 = 43;
/// `include/constants/abilities.h:50` -- `ABILITY_PRESSURE`.
pub const BATTLE_SCRIPT_ABILITY_PRESSURE: u8 = 46;
/// `include/constants/moves.h:199` -- `MOVE_PERISH_SONG`.
pub const BATTLE_SCRIPT_MOVE_PERISH_SONG: u16 = 195;
/// Source literal `3` written to both the timer and its start value on the
/// affected path.
pub const BATTLE_SCRIPT_TRYSETPERISHSONG_TIMER_VALUE: u8 = 3;

/// Complete source battler-id domain used by roles and source-indexed arrays.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptTrysetperishsongBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

/// Fixed source battler domain, including inactive cells in singles.
pub const BATTLE_SCRIPT_TRYSETPERISHSONG_BATTLERS: [BattleScriptTrysetperishsongBattler;
    BATTLE_SCRIPT_TRYSETPERISHSONG_BATTLER_COUNT] = [
    BattleScriptTrysetperishsongBattler::Battler0,
    BattleScriptTrysetperishsongBattler::Battler1,
    BattleScriptTrysetperishsongBattler::Battler2,
    BattleScriptTrysetperishsongBattler::Battler3,
];

impl BattleScriptTrysetperishsongBattler {
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

    #[must_use]
    pub const fn from_u8(value: u8) -> Option<Self> {
        match value {
            0 => Some(Self::Battler0),
            1 => Some(Self::Battler1),
            2 => Some(Self::Battler2),
            3 => Some(Self::Battler3),
            _ => None,
        }
    }
}

/// Canonically validated `gBattlersCount` values.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum BattleScriptTrysetperishsongBattlersCount {
    Singles = 2,
    Doubles = 4,
}

impl BattleScriptTrysetperishsongBattlersCount {
    #[must_use]
    pub const fn as_u8(self) -> u8 {
        self as u8
    }

    #[must_use]
    pub const fn as_usize(self) -> usize {
        self as usize
    }

    #[must_use]
    pub const fn from_u8(value: u8) -> Option<Self> {
        match value {
            2 => Some(Self::Singles),
            4 => Some(Self::Doubles),
            _ => None,
        }
    }
}

/// Complete per-battler narrow projection. `moves`/`pp` are carried for
/// every battler even though only the resolved attacker's slots are ever
/// read or written, matching the salted-sibling immutability style of
/// nearby leaves.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetperishsongBattlerState {
    pub status3: u32,
    pub ability: u8,
    pub moves: [u16; BATTLE_SCRIPT_TRYSETPERISHSONG_MOVE_SLOT_COUNT],
    pub pp: [u8; BATTLE_SCRIPT_TRYSETPERISHSONG_MOVE_SLOT_COUNT],
    pub perish_song_timer: u8,
    pub perish_song_timer_start_value: u8,
}

/// Canonical selector bindings. Only `attacker` is ever read; the others are
/// carried solely to prove the handler never touches them.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetperishsongRoles {
    pub attacker: Option<BattleScriptTrysetperishsongBattler>,
    pub target: Option<BattleScriptTrysetperishsongBattler>,
    pub effect_battler: Option<BattleScriptTrysetperishsongBattler>,
    pub fainted: Option<BattleScriptTrysetperishsongBattler>,
}

/// Context siblings copied by the canonical object spread and untouched by
/// `Cmd_trysetperishsong`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetperishsongContextSiblings {
    pub scripting_battler: BattleScriptTrysetperishsongBattler,
    pub current_move: u16,
    pub hit_marker: u32,
    pub battle_communication0: u8,
}

/// Complete narrow rules slice read or written by this command.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetperishsongRules {
    pub battlers:
        [BattleScriptTrysetperishsongBattlerState; BATTLE_SCRIPT_TRYSETPERISHSONG_BATTLER_COUNT],
    pub battlers_count: BattleScriptTrysetperishsongBattlersCount,
    pub selector_roles: BattleScriptTrysetperishsongRoles,
    pub context_siblings: BattleScriptTrysetperishsongContextSiblings,
}

/// Scheduler values carried solely to prove the opcode does not write them.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetperishsongScheduler {
    pub message_display_active: bool,
    pub pause_counter_battle: u16,
    pub active_battler: Option<BattleScriptTrysetperishsongBattler>,
    pub pending_controller_battlers:
        [Option<BattleScriptTrysetperishsongBattler>; BATTLE_SCRIPT_TRYSETPERISHSONG_BATTLER_COUNT],
    pub pending_count: u8,
}

/// Machine siblings this command preserves byte-for-byte. It owns no RNG
/// draw, so both raw value and canonical call count remain unchanged.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetperishsongMachineSiblings {
    pub scheduler: BattleScriptTrysetperishsongScheduler,
    pub rng_value: u32,
    pub rng_calls: u32,
}

/// One source-macro operand retained for canonical shape validation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetperishsongOperand<'a> {
    pub width_bytes: u8,
    pub expression: &'a str,
}

/// A resolved source failure label.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetperishsongResolvedLabel<'a> {
    pub expression: &'a str,
    pub program_counter: u32,
}

/// Instruction projection used for both singleton registration and execution.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetperishsongInstruction<'a> {
    pub opcode_name: &'a str,
    pub program_counter: u32,
    pub opcode_id: u8,
    pub dispatcher: &'a str,
    pub operands: &'a [BattleScriptTrysetperishsongOperand<'a>],
    /// Late label resolution is a scheduler/program concern this leaf does
    /// not own; the caller resolves the pointer operand's expression and
    /// reports the result here, exactly like the canonical TypeScript
    /// factory's own `resolveBattleScriptLabel` call inside the handler.
    pub resolved_failure_target: Option<BattleScriptTrysetperishsongResolvedLabel<'a>>,
}

/// The one dynamic opcode key emitted by successful singleton registration.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetperishsongRegistration {
    pub opcode_id: u8,
}

/// Exact control directive emitted by the narrow opcode leaf.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTrysetperishsongControl {
    Advance,
    Jump { program_counter: u32 },
}

/// Complete immutable result of one successful handler application.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetperishsongOutcome {
    pub rules: BattleScriptTrysetperishsongRules,
    pub machine_siblings: BattleScriptTrysetperishsongMachineSiblings,
    pub control: BattleScriptTrysetperishsongControl,
}

/// Exact observable errors in canonical evaluation order.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTrysetperishsongError<'a> {
    WrongCardinality { count: usize },
    InvalidInstructionShape { program_counter: u32 },
    MissingAttackerRole,
    UnresolvedFailureTarget { expression: &'a str },
}

impl fmt::Display for BattleScriptTrysetperishsongError<'_> {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::WrongCardinality { count } => write!(
                formatter,
                "B_SCR_OP_TRYSETPERISHSONG requires exactly 1 concrete start, got {count}"
            ),
            Self::InvalidInstructionShape { program_counter } => write!(
                formatter,
                "invalid B_SCR_OP_TRYSETPERISHSONG shape at program counter {program_counter}"
            ),
            Self::MissingAttackerRole => write!(
                formatter,
                "Battle Script hit-chain command requires a attacker role"
            ),
            Self::UnresolvedFailureTarget { expression } => write!(
                formatter,
                "Cmd_trysetperishsong unresolved failure target {expression}"
            ),
        }
    }
}

impl std::error::Error for BattleScriptTrysetperishsongError<'_> {}

fn validate_instruction<'a>(
    instruction: BattleScriptTrysetperishsongInstruction<'a>,
) -> Result<&'a str, BattleScriptTrysetperishsongError<'a>> {
    let [failure] = instruction.operands else {
        return Err(BattleScriptTrysetperishsongError::InvalidInstructionShape {
            program_counter: instruction.program_counter,
        });
    };
    if instruction.opcode_id != BATTLE_SCRIPT_TRYSETPERISHSONG_OPCODE
        || instruction.dispatcher != BATTLE_SCRIPT_TRYSETPERISHSONG_DISPATCHER
        || failure.width_bytes != BATTLE_SCRIPT_TRYSETPERISHSONG_FAILURE_POINTER_WIDTH_BYTES
    {
        return Err(BattleScriptTrysetperishsongError::InvalidInstructionShape {
            program_counter: instruction.program_counter,
        });
    }
    Ok(failure.expression)
}

/// Native projection of `createBattleScriptTrysetperishsongOpcodeHandlers`.
/// Noise instructions are ignored; selected duplicates fail before shape
/// inspection, and successful registration contains precisely one opcode key.
pub fn register_battle_script_trysetperishsong_handler<'a>(
    instructions: &[BattleScriptTrysetperishsongInstruction<'a>],
) -> Result<BattleScriptTrysetperishsongRegistration, BattleScriptTrysetperishsongError<'a>> {
    let matching = instructions
        .iter()
        .filter(|instruction| instruction.opcode_name == BATTLE_SCRIPT_TRYSETPERISHSONG_OPCODE_NAME)
        .collect::<Vec<_>>();
    if matching.len() != BATTLE_SCRIPT_TRYSETPERISHSONG_CONCRETE_START_COUNT {
        return Err(BattleScriptTrysetperishsongError::WrongCardinality { count: matching.len() });
    }
    validate_instruction(*matching[0])?;
    Ok(BattleScriptTrysetperishsongRegistration { opcode_id: matching[0].opcode_id })
}

/// Native immutable-value twin of canonical `Cmd_trysetperishsong` plus the
/// `gBattleMons`-only slice of `PressurePPLoseOnUsingPerishSong`.
///
/// Evaluation order matches the canonical handler exactly: shape validation,
/// then the per-battler affliction pass over `battlersCount` (unconditional,
/// independent of any later error), then the attacker role requirement, then
/// the Pressure PP loss scan, and only then -- because every earlier step
/// already ran -- late failure-label resolution. A failing attacker role
/// discards the pass-1 mutation along with the whole outcome, matching the
/// canonical handler throwing before returning any transition.
pub fn apply_battle_script_trysetperishsong<'a>(
    instruction: BattleScriptTrysetperishsongInstruction<'a>,
    rules: &BattleScriptTrysetperishsongRules,
    machine_siblings: &BattleScriptTrysetperishsongMachineSiblings,
) -> Result<BattleScriptTrysetperishsongOutcome, BattleScriptTrysetperishsongError<'a>> {
    let failure_expression = validate_instruction(instruction)?;

    let count = rules.battlers_count.as_usize();
    let mut next_rules = *rules;
    let mut not_affected_count = 0usize;
    for i in 0..count {
        let battler = rules.battlers[i];
        if battler.status3 & BATTLE_SCRIPT_STATUS3_PERISH_SONG != 0
            || battler.ability == BATTLE_SCRIPT_ABILITY_SOUNDPROOF
        {
            not_affected_count += 1;
        } else {
            next_rules.battlers[i].status3 = battler.status3 | BATTLE_SCRIPT_STATUS3_PERISH_SONG;
            next_rules.battlers[i].perish_song_timer = BATTLE_SCRIPT_TRYSETPERISHSONG_TIMER_VALUE;
            next_rules.battlers[i].perish_song_timer_start_value =
                BATTLE_SCRIPT_TRYSETPERISHSONG_TIMER_VALUE;
        }
    }

    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptTrysetperishsongError::MissingAttackerRole)?;
    let attacker_state = rules.battlers[attacker.index()];
    if let Some(perish_song_pos) = attacker_state
        .moves
        .iter()
        .position(|&move_id| move_id == BATTLE_SCRIPT_MOVE_PERISH_SONG)
    {
        let mut pp = attacker_state.pp[perish_song_pos];
        for i in 0..count {
            if i != attacker.index()
                && rules.battlers[i].ability == BATTLE_SCRIPT_ABILITY_PRESSURE
                && pp != 0
            {
                pp -= 1;
            }
        }
        if pp != attacker_state.pp[perish_song_pos] {
            next_rules.battlers[attacker.index()].pp[perish_song_pos] = pp;
        }
    }

    if not_affected_count == count {
        let resolved = instruction.resolved_failure_target.ok_or(
            BattleScriptTrysetperishsongError::UnresolvedFailureTarget {
                expression: failure_expression,
            },
        )?;
        if resolved.expression != failure_expression {
            return Err(BattleScriptTrysetperishsongError::UnresolvedFailureTarget {
                expression: failure_expression,
            });
        }
        return Ok(BattleScriptTrysetperishsongOutcome {
            rules: next_rules,
            machine_siblings: *machine_siblings,
            control: BattleScriptTrysetperishsongControl::Jump {
                program_counter: resolved.program_counter,
            },
        });
    }
    Ok(BattleScriptTrysetperishsongOutcome {
        rules: next_rules,
        machine_siblings: *machine_siblings,
        control: BattleScriptTrysetperishsongControl::Advance,
    })
}

/// Independent source, dispatch, and body evidence.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetperishsongDecompDispatchEvidence {
    pub opcode_name: &'static str,
    pub opcode_id: u8,
    pub dispatcher: &'static str,
    pub dispatch_line: u32,
    pub forward_decl_line: u32,
    pub handler_line: u32,
    pub loop_line: u32,
    pub condition_line_1: u32,
    pub condition_line_2: u32,
    pub not_affected_increment_line: u32,
    pub status3_write_line: u32,
    pub timer_write_line: u32,
    pub timer_start_value_write_line: u32,
    pub pressure_call_line: u32,
    pub failure_check_line: u32,
    pub jump_line: u32,
    pub advance_line: u32,
    pub pressure_fn_line: u32,
    pub pressure_loop_line: u32,
    pub pressure_condition_line: u32,
    pub pressure_move_search_line: u32,
    pub pressure_pp_decrement_line: u32,
}

pub const BATTLE_SCRIPT_TRYSETPERISHSONG_DECOMP_DISPATCH_EVIDENCE:
    BattleScriptTrysetperishsongDecompDispatchEvidence =
    BattleScriptTrysetperishsongDecompDispatchEvidence {
        opcode_name: BATTLE_SCRIPT_TRYSETPERISHSONG_OPCODE_NAME,
        opcode_id: BATTLE_SCRIPT_TRYSETPERISHSONG_OPCODE,
        dispatcher: BATTLE_SCRIPT_TRYSETPERISHSONG_DISPATCHER,
        dispatch_line: 509,
        forward_decl_line: 257,
        handler_line: 8508,
        loop_line: 8513,
        condition_line_1: 8515,
        condition_line_2: 8516,
        not_affected_increment_line: 8518,
        status3_write_line: 8522,
        timer_write_line: 8523,
        timer_start_value_write_line: 8524,
        pressure_call_line: 8528,
        failure_check_line: 8530,
        jump_line: 8531,
        advance_line: 8533,
        pressure_fn_line: 799,
        pressure_loop_line: 804,
        pressure_condition_line: 806,
        pressure_move_search_line: 810,
        pressure_pp_decrement_line: 817,
    };

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetperishsongMacroEvidence {
    pub declaration_line: u32,
    pub opcode_line: u32,
    pub pointer_line: u32,
    pub encoded_width_bytes: u8,
}

pub const BATTLE_SCRIPT_TRYSETPERISHSONG_MACRO_EVIDENCE: BattleScriptTrysetperishsongMacroEvidence =
    BattleScriptTrysetperishsongMacroEvidence {
        declaration_line: 932,
        opcode_line: 933,
        pointer_line: 934,
        encoded_width_bytes: BATTLE_SCRIPT_TRYSETPERISHSONG_ENCODED_WIDTH_BYTES,
    };

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTrysetperishsongCallSiteEvidence {
    pub entry_label: &'static str,
    pub entry_label_line: u32,
    pub statement_line: u32,
    pub instruction_program_counter: u32,
    pub failure_target_expression: &'static str,
    pub failure_target_program_counter: u32,
}

pub const BATTLE_SCRIPT_TRYSETPERISHSONG_CALL_SITE_EVIDENCE:
    BattleScriptTrysetperishsongCallSiteEvidence = BattleScriptTrysetperishsongCallSiteEvidence {
    entry_label: "BattleScript_EffectPerishSong",
    entry_label_line: 1567,
    statement_line: 1571,
    instruction_program_counter: 1057,
    failure_target_expression: "BattleScript_ButItFailed",
    failure_target_program_counter: 1434,
};

#[cfg(test)]
mod tests {
    use super::*;

    const OPERAND: BattleScriptTrysetperishsongOperand<'static> =
        BattleScriptTrysetperishsongOperand {
            width_bytes: 4,
            expression: "BattleScript_ButItFailed",
        };
    const OPERANDS: [BattleScriptTrysetperishsongOperand<'static>; 1] = [OPERAND];

    fn plain_battler() -> BattleScriptTrysetperishsongBattlerState {
        BattleScriptTrysetperishsongBattlerState {
            status3: 0,
            ability: 0,
            moves: [0, 0, 0, 0],
            pp: [0, 0, 0, 0],
            perish_song_timer: 0,
            perish_song_timer_start_value: 0,
        }
    }

    fn rules(
        battlers_count: BattleScriptTrysetperishsongBattlersCount,
        battlers: [BattleScriptTrysetperishsongBattlerState; 4],
        attacker: Option<BattleScriptTrysetperishsongBattler>,
    ) -> BattleScriptTrysetperishsongRules {
        BattleScriptTrysetperishsongRules {
            battlers,
            battlers_count,
            selector_roles: BattleScriptTrysetperishsongRoles {
                attacker,
                target: Some(BattleScriptTrysetperishsongBattler::Battler1),
                effect_battler: Some(BattleScriptTrysetperishsongBattler::Battler2),
                fainted: None,
            },
            context_siblings: BattleScriptTrysetperishsongContextSiblings {
                scripting_battler: BattleScriptTrysetperishsongBattler::Battler0,
                current_move: BATTLE_SCRIPT_MOVE_PERISH_SONG,
                hit_marker: 0x8000_0001,
                battle_communication0: 0xf0,
            },
        }
    }

    fn machine() -> BattleScriptTrysetperishsongMachineSiblings {
        BattleScriptTrysetperishsongMachineSiblings {
            scheduler: BattleScriptTrysetperishsongScheduler {
                message_display_active: true,
                pause_counter_battle: 5,
                active_battler: None,
                pending_controller_battlers: [None, None, None, None],
                pending_count: 0,
            },
            rng_value: 0x1234_5678,
            rng_calls: 3,
        }
    }

    fn instruction() -> BattleScriptTrysetperishsongInstruction<'static> {
        BattleScriptTrysetperishsongInstruction {
            opcode_name: BATTLE_SCRIPT_TRYSETPERISHSONG_OPCODE_NAME,
            program_counter: 1057,
            opcode_id: BATTLE_SCRIPT_TRYSETPERISHSONG_OPCODE,
            dispatcher: BATTLE_SCRIPT_TRYSETPERISHSONG_DISPATCHER,
            operands: &OPERANDS,
            resolved_failure_target: Some(BattleScriptTrysetperishsongResolvedLabel {
                expression: "BattleScript_ButItFailed",
                program_counter: 1434,
            }),
        }
    }

    #[test]
    fn advances_and_sets_ordinary_holders_while_skipping_soundproof() {
        let mut battler0 = plain_battler();
        battler0.moves = [BATTLE_SCRIPT_MOVE_PERISH_SONG, 0, 0, 0];
        battler0.pp = [5, 0, 0, 0];
        let mut battler1 = plain_battler();
        battler1.ability = BATTLE_SCRIPT_ABILITY_SOUNDPROOF;
        let input = rules(
            BattleScriptTrysetperishsongBattlersCount::Singles,
            [battler0, battler1, plain_battler(), plain_battler()],
            Some(BattleScriptTrysetperishsongBattler::Battler0),
        );
        let outcome = apply_battle_script_trysetperishsong(instruction(), &input, &machine())
            .expect("one holder remains eligible");
        assert_eq!(
            outcome.control,
            BattleScriptTrysetperishsongControl::Advance
        );
        assert_eq!(
            outcome.rules.battlers[0].status3,
            BATTLE_SCRIPT_STATUS3_PERISH_SONG
        );
        assert_eq!(outcome.rules.battlers[0].perish_song_timer, 3);
        assert_eq!(outcome.rules.battlers[0].perish_song_timer_start_value, 3);
        assert_eq!(
            outcome.rules.battlers[0].pp[0], 5,
            "no Pressure holder is present"
        );
        assert_eq!(outcome.rules.battlers[1], input.battlers[1]);
        assert_eq!(outcome.machine_siblings, machine());
    }

    #[test]
    fn all_not_affected_takes_late_failure_pointer_while_pressure_pp_loss_still_applies() {
        let mut battler0 = plain_battler();
        battler0.status3 = BATTLE_SCRIPT_STATUS3_PERISH_SONG;
        battler0.moves = [BATTLE_SCRIPT_MOVE_PERISH_SONG, 0, 0, 0];
        battler0.pp = [5, 0, 0, 0];
        let mut battler1 = plain_battler();
        battler1.ability = BATTLE_SCRIPT_ABILITY_PRESSURE;
        battler1.status3 = BATTLE_SCRIPT_STATUS3_PERISH_SONG;
        let input = rules(
            BattleScriptTrysetperishsongBattlersCount::Singles,
            [battler0, battler1, plain_battler(), plain_battler()],
            Some(BattleScriptTrysetperishsongBattler::Battler0),
        );
        let outcome = apply_battle_script_trysetperishsong(instruction(), &input, &machine())
            .expect("late failure pointer resolves");
        assert_eq!(
            outcome.control,
            BattleScriptTrysetperishsongControl::Jump { program_counter: 1434 }
        );
        assert_eq!(
            outcome.rules.battlers[0].pp[0], 4,
            "Pressure PP loss applies on failure"
        );
        assert_eq!(outcome.rules.battlers[0].perish_song_timer, 0);
    }

    #[test]
    fn multiple_pressure_holders_floor_pp_at_zero_and_attacker_own_pressure_is_ignored() {
        let mut battler0 = plain_battler();
        battler0.ability = BATTLE_SCRIPT_ABILITY_PRESSURE;
        battler0.moves = [BATTLE_SCRIPT_MOVE_PERISH_SONG, 0, 0, 0];
        battler0.pp = [1, 0, 0, 0];
        let mut battler1 = plain_battler();
        battler1.ability = BATTLE_SCRIPT_ABILITY_PRESSURE;
        let mut battler2 = plain_battler();
        battler2.ability = BATTLE_SCRIPT_ABILITY_PRESSURE;
        let input = rules(
            BattleScriptTrysetperishsongBattlersCount::Doubles,
            [battler0, battler1, battler2, plain_battler()],
            Some(BattleScriptTrysetperishsongBattler::Battler0),
        );
        let outcome = apply_battle_script_trysetperishsong(instruction(), &input, &machine())
            .expect("valid case");
        assert_eq!(
            outcome.rules.battlers[0].pp[0], 0,
            "attacker's own Pressure is ignored, floors at 0"
        );
    }

    #[test]
    fn malformed_instruction_precedes_missing_attacker_and_failure_label_is_late() {
        let missing = rules(
            BattleScriptTrysetperishsongBattlersCount::Singles,
            [
                plain_battler(),
                plain_battler(),
                plain_battler(),
                plain_battler(),
            ],
            None,
        );
        let malformed =
            BattleScriptTrysetperishsongInstruction { opcode_id: 0xb0, ..instruction() };
        assert_eq!(
            apply_battle_script_trysetperishsong(malformed, &missing, &machine())
                .expect_err("shape precedes attacker")
                .to_string(),
            "invalid B_SCR_OP_TRYSETPERISHSONG shape at program counter 1057"
        );
        assert_eq!(
            apply_battle_script_trysetperishsong(instruction(), &missing, &machine())
                .expect_err("attacker role required")
                .to_string(),
            "Battle Script hit-chain command requires a attacker role"
        );

        let mut affected = plain_battler();
        affected.status3 = BATTLE_SCRIPT_STATUS3_PERISH_SONG;
        let unresolved = rules(
            BattleScriptTrysetperishsongBattlersCount::Singles,
            [affected, affected, plain_battler(), plain_battler()],
            Some(BattleScriptTrysetperishsongBattler::Battler0),
        );
        let instruction_no_label = BattleScriptTrysetperishsongInstruction {
            resolved_failure_target: None,
            ..instruction()
        };
        assert_eq!(
            apply_battle_script_trysetperishsong(instruction_no_label, &unresolved, &machine())
                .expect_err("unresolved failure target")
                .to_string(),
            "Cmd_trysetperishsong unresolved failure target BattleScript_ButItFailed"
        );
    }

    #[test]
    fn registration_accepts_singleton_and_rejects_wrong_cardinality_and_shape() {
        assert_eq!(
            register_battle_script_trysetperishsong_handler(&[instruction()])
                .expect("singleton registers")
                .opcode_id,
            BATTLE_SCRIPT_TRYSETPERISHSONG_OPCODE
        );
        assert_eq!(
            register_battle_script_trysetperishsong_handler(&[])
                .expect_err("zero starts")
                .to_string(),
            "B_SCR_OP_TRYSETPERISHSONG requires exactly 1 concrete start, got 0"
        );
        assert_eq!(
            register_battle_script_trysetperishsong_handler(&[instruction(), instruction()])
                .expect_err("two starts")
                .to_string(),
            "B_SCR_OP_TRYSETPERISHSONG requires exactly 1 concrete start, got 2"
        );
        let wrong_dispatcher =
            BattleScriptTrysetperishsongInstruction { dispatcher: "Cmd_other", ..instruction() };
        assert_eq!(
            register_battle_script_trysetperishsong_handler(&[wrong_dispatcher])
                .expect_err("wrong dispatcher")
                .to_string(),
            "invalid B_SCR_OP_TRYSETPERISHSONG shape at program counter 1057"
        );
    }

    #[test]
    fn battler_ids_round_trip_from_u8() {
        for battler in BATTLE_SCRIPT_TRYSETPERISHSONG_BATTLERS {
            assert_eq!(
                BattleScriptTrysetperishsongBattler::from_u8(battler.as_u8()),
                Some(battler)
            );
        }
        assert_eq!(BattleScriptTrysetperishsongBattler::from_u8(4), None);
        assert_eq!(
            BattleScriptTrysetperishsongBattlersCount::from_u8(2),
            Some(BattleScriptTrysetperishsongBattlersCount::Singles)
        );
        assert_eq!(
            BattleScriptTrysetperishsongBattlersCount::from_u8(4),
            Some(BattleScriptTrysetperishsongBattlersCount::Doubles)
        );
        assert_eq!(BattleScriptTrysetperishsongBattlersCount::from_u8(3), None);
    }
}
