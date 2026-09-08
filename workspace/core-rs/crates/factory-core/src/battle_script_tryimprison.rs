//! Pure `B_SCR_OP_TRYIMPRISON` registration, state, and control leaf.
//!
//! This is the deliberately narrow native twin of
//! `src/engine/battleScriptTryimprisonOpcode.ts`, not a generic Battle
//! Script machine. Unlike most hit-chain leaves, the failure pointer is
//! resolved *eagerly* -- immediately after shape validation and before the
//! attacker role, the already-imprisoned early jump, the Pressure PP loop,
//! or the overlap scan -- so an unresolved label errors even on a path that
//! would otherwise advance. The already-imprisoned check short-circuits
//! everything else (no PP loss, no event, rules/scheduler unchanged).
//! Otherwise `PressurePPLoseOnUsingImprison` runs unconditionally: for every
//! opposing Pressure-ability battler it locates the attacker's fixed
//! Imprison-move slot and chain-decrements (floor zero) one shared PP
//! value; the attacker's active PP always updates when a slot was found,
//! but the party mirror, `scheduler.active_battler` write, pending-controller
//! append, and the single PP event are gated on move permanence
//! (untransformed and unmimicked at that slot). The subsequent move-overlap
//! scan runs on the post-PP rules and decides Advance (overlap found, sets
//! `STATUS3_IMPRISONED_OTHERS`) or Jump (no overlap); the PP side effects
//! from the loop persist on either outcome. No branch consumes RNG.
//!
//! Source authority:
//! - `Cmd_tryimprison` is `reference/pokeemerald/src/battle_script_commands.c:9412-9451`;
//!   dispatch `:550` (`//0xDB`), forward declaration `:298`.
//! - `PressurePPLoseOnUsingImprison` is `reference/pokeemerald/src/battle_util.c:767-797`.
//! - The five-byte macro is `asm/macros/battle_script.inc:1120-1123`.
//! - The sole concrete call site is `data/battle_scripts_1.s:2513`
//!   (`tryimprison BattleScript_ButItFailed`, inside
//!   `BattleScript_EffectImprison`).
//! - `include/constants/battle.h:145` (`STATUS2_TRANSFORMED`) and `:170`
//!   (`STATUS3_IMPRISONED_OTHERS`); `include/constants/abilities.h:50`
//!   (`ABILITY_PRESSURE`); `include/constants/moves.h:290` (`MOVE_IMPRISON`);
//!   `include/constants/battle_script_commands.h:225`.
//!
//! This leaf deliberately owns neither a generic machine, scheduler/event
//! transport, RNG advancement, presentation, nor the WASM ABI.

use core::fmt;

/// Source `MAX_BATTLERS_COUNT`; all source-indexed state retains four cells.
pub const BATTLE_SCRIPT_TRYIMPRISON_BATTLER_COUNT: usize = 4;
/// Source `MAX_MON_MOVES`; the width of each battler's `moves`/`pp` arrays.
pub const BATTLE_SCRIPT_TRYIMPRISON_MOVE_COUNT: usize = 4;
/// Source party size; both sides carry six member cells.
pub const BATTLE_SCRIPT_TRYIMPRISON_PARTY_SIZE: usize = 6;
/// `B_SCR_OP_TRYIMPRISON` in the source command enum / dispatch table.
pub const BATTLE_SCRIPT_TRYIMPRISON_OPCODE: u8 = 0xdb;
/// Concrete opcode name selected by canonical registration.
pub const BATTLE_SCRIPT_TRYIMPRISON_OPCODE_NAME: &str = "B_SCR_OP_TRYIMPRISON";
/// Source dispatch-table handler identity.
pub const BATTLE_SCRIPT_TRYIMPRISON_DISPATCHER: &str = "Cmd_tryimprison";
/// The canonical factory accepts exactly this many concrete starts.
pub const BATTLE_SCRIPT_TRYIMPRISON_CONCRETE_START_COUNT: usize = 1;
/// One four-byte failure pointer follows the opcode byte.
pub const BATTLE_SCRIPT_TRYIMPRISON_FAILURE_POINTER_WIDTH_BYTES: u8 = 4;
/// The source macro's encoded byte width.
pub const BATTLE_SCRIPT_TRYIMPRISON_ENCODED_WIDTH_BYTES: u8 = 5;

/// `include/constants/battle.h:145` -- `STATUS2_TRANSFORMED (1 << 21)`.
pub const BATTLE_SCRIPT_TRYIMPRISON_STATUS2_TRANSFORMED: u32 = 1 << 21;
/// `include/constants/battle.h:170` -- `STATUS3_IMPRISONED_OTHERS (1 << 13)`.
pub const BATTLE_SCRIPT_TRYIMPRISON_STATUS3_IMPRISONED_OTHERS: u32 = 1 << 13;
/// `include/constants/abilities.h:50` -- `ABILITY_PRESSURE`.
pub const BATTLE_SCRIPT_TRYIMPRISON_ABILITY_PRESSURE: u8 = 46;
/// Local `MOVE_NONE` from the canonical TypeScript handler.
pub const BATTLE_SCRIPT_TRYIMPRISON_MOVE_NONE: u16 = 0;
/// `include/constants/moves.h:290` -- `MOVE_IMPRISON`.
pub const BATTLE_SCRIPT_TRYIMPRISON_MOVE_IMPRISON: u16 = 286;

/// Complete source battler-id domain used by roles and source-indexed arrays.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptTryimprisonBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

/// Fixed source battler domain, including inactive cells in singles.
pub const BATTLE_SCRIPT_TRYIMPRISON_BATTLERS: [BattleScriptTryimprisonBattler;
    BATTLE_SCRIPT_TRYIMPRISON_BATTLER_COUNT] = [
    BattleScriptTryimprisonBattler::Battler0,
    BattleScriptTryimprisonBattler::Battler1,
    BattleScriptTryimprisonBattler::Battler2,
    BattleScriptTryimprisonBattler::Battler3,
];

impl BattleScriptTryimprisonBattler {
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

/// Source battle side, indexing the two persistent party arrays.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptTryimprisonSide {
    Player = 0,
    Opponent = 1,
}

impl BattleScriptTryimprisonSide {
    /// Zero-based source-array index.
    #[must_use]
    pub const fn index(self) -> usize {
        self as usize
    }
}

/// `rules.battleTopology.battlersCount`; only 2 (singles) and 4 (doubles)
/// are reachable Gen-3 values.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptTryimprisonBattlersCount {
    Singles = 2,
    Doubles = 4,
}

impl BattleScriptTryimprisonBattlersCount {
    #[must_use]
    pub const fn get(self) -> usize {
        self as usize
    }
}

/// The complete per-battler projection read or written by this opcode.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryimprisonBattlerState {
    pub side: BattleScriptTryimprisonSide,
    pub party_index: u8,
    pub ability: u8,
    pub status2: u32,
    pub status3: u32,
    pub moves: [u16; BATTLE_SCRIPT_TRYIMPRISON_MOVE_COUNT],
    pub pp: [u8; BATTLE_SCRIPT_TRYIMPRISON_MOVE_COUNT],
    /// Source four-bit `DisableStruct::mimickedMoves` mask.
    pub mimicked_moves: u8,
}

/// One persistent party member's projection. Only `pp` participates.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryimprisonPartyMember {
    pub pp: [u8; BATTLE_SCRIPT_TRYIMPRISON_MOVE_COUNT],
}

/// Canonical selector bindings. Only `attacker` is ever read.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryimprisonRoles {
    pub attacker: Option<BattleScriptTryimprisonBattler>,
}

/// Complete narrow rules slice read or written by this command.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryimprisonRules {
    pub battlers: [BattleScriptTryimprisonBattlerState; BATTLE_SCRIPT_TRYIMPRISON_BATTLER_COUNT],
    pub party: [[BattleScriptTryimprisonPartyMember; BATTLE_SCRIPT_TRYIMPRISON_PARTY_SIZE]; 2],
    pub selector_roles: BattleScriptTryimprisonRoles,
    pub battlers_count: BattleScriptTryimprisonBattlersCount,
}

/// Scheduler projection carrying the pending-controller list this command
/// appends to, and `active_battler`, which this command writes only on the
/// permanent-PP branch (retained unchanged otherwise). Shape copied from
/// `battle_script_refresh`'s scheduler, narrowed to the two fields this leaf
/// touches.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryimprisonScheduler {
    pub active_battler: Option<BattleScriptTryimprisonBattler>,
    pub pending_controller_battlers:
        [Option<BattleScriptTryimprisonBattler>; BATTLE_SCRIPT_TRYIMPRISON_BATTLER_COUNT],
    pub pending_count: u8,
}

/// One source-macro operand retained for canonical shape validation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryimprisonOperand<'a> {
    pub width_bytes: u8,
    pub expression: &'a str,
}

/// A resolved source failure label.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryimprisonResolvedLabel<'a> {
    pub expression: &'a str,
    pub program_counter: u32,
}

/// Instruction projection used for both singleton registration and
/// execution. Unlike lazily-resolved siblings, `resolved_failure_target` is
/// consulted unconditionally (eager resolution), so callers must resolve
/// the pointer operand's expression before calling
/// [`apply_battle_script_tryimprison`] regardless of which branch will run.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryimprisonInstruction<'a> {
    pub opcode_name: &'a str,
    pub program_counter: u32,
    pub opcode_id: u8,
    pub dispatcher: &'a str,
    pub operands: &'a [BattleScriptTryimprisonOperand<'a>],
    pub resolved_failure_target: Option<BattleScriptTryimprisonResolvedLabel<'a>>,
}

/// The one dynamic opcode key emitted by successful singleton registration.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryimprisonRegistration {
    pub opcode_id: u8,
}

/// Exact control directive emitted by the narrow opcode leaf.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTryimprisonControl {
    Advance,
    Jump { program_counter: u32 },
}

/// The sole event this command ever emits, gated on move permanence.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTryimprisonEvent {
    SetBattlerPpData {
        battler: BattleScriptTryimprisonBattler,
        move_position: u8,
        pp: u8,
    },
}

/// Complete immutable result of one successful handler application.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryimprisonOutcome {
    pub rules: BattleScriptTryimprisonRules,
    pub scheduler: BattleScriptTryimprisonScheduler,
    pub control: BattleScriptTryimprisonControl,
    pub emitted_event: Option<BattleScriptTryimprisonEvent>,
}

/// Exact observable errors in canonical evaluation order.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTryimprisonError<'a> {
    WrongCardinality {
        count: usize,
    },
    InvalidInstructionShape {
        program_counter: u32,
    },
    UnresolvedFailureTarget {
        expression: &'a str,
    },
    MissingAttackerRole,
    InvalidPartyIndex {
        side: BattleScriptTryimprisonSide,
        party_index: u8,
    },
}

impl fmt::Display for BattleScriptTryimprisonError<'_> {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::WrongCardinality { count } => write!(
                formatter,
                "B_SCR_OP_TRYIMPRISON requires exactly 1 concrete start, got {count}"
            ),
            Self::InvalidInstructionShape { program_counter } => write!(
                formatter,
                "invalid B_SCR_OP_TRYIMPRISON shape at program counter {program_counter}"
            ),
            Self::UnresolvedFailureTarget { expression } => write!(
                formatter,
                "Cmd_tryimprison unresolved failure target {expression}"
            ),
            Self::MissingAttackerRole => write!(
                formatter,
                "Battle Script hit-chain command requires a attacker role"
            ),
            Self::InvalidPartyIndex { side, party_index } => write!(
                formatter,
                "Cmd_tryimprison: invalid {side:?} party index {party_index}"
            ),
        }
    }
}

impl std::error::Error for BattleScriptTryimprisonError<'_> {}

fn validate_instruction<'a>(
    instruction: BattleScriptTryimprisonInstruction<'a>,
) -> Result<&'a str, BattleScriptTryimprisonError<'a>> {
    let [failure] = instruction.operands else {
        return Err(BattleScriptTryimprisonError::InvalidInstructionShape {
            program_counter: instruction.program_counter,
        });
    };
    if instruction.opcode_id != BATTLE_SCRIPT_TRYIMPRISON_OPCODE
        || instruction.dispatcher != BATTLE_SCRIPT_TRYIMPRISON_DISPATCHER
        || failure.width_bytes != BATTLE_SCRIPT_TRYIMPRISON_FAILURE_POINTER_WIDTH_BYTES
    {
        return Err(BattleScriptTryimprisonError::InvalidInstructionShape {
            program_counter: instruction.program_counter,
        });
    }
    Ok(failure.expression)
}

/// Native projection of `createBattleScriptTryimprisonOpcodeHandlers`.
/// Wrong cardinality fails before shape inspection; the one matching
/// instruction is then validated, returning the first offender; successful
/// registration contains precisely one opcode key taken from that
/// instruction.
pub fn register_battle_script_tryimprison_handler<'a>(
    instructions: &[BattleScriptTryimprisonInstruction<'a>],
) -> Result<BattleScriptTryimprisonRegistration, BattleScriptTryimprisonError<'a>> {
    let matching = instructions
        .iter()
        .filter(|instruction| instruction.opcode_name == BATTLE_SCRIPT_TRYIMPRISON_OPCODE_NAME)
        .collect::<Vec<_>>();
    if matching.len() != BATTLE_SCRIPT_TRYIMPRISON_CONCRETE_START_COUNT {
        return Err(BattleScriptTryimprisonError::WrongCardinality { count: matching.len() });
    }
    validate_instruction(*matching[0])?;
    Ok(BattleScriptTryimprisonRegistration { opcode_id: matching[0].opcode_id })
}

/// Native immutable-value twin of canonical `Cmd_tryimprison`, including its
/// dedicated `PressurePPLoseOnUsingImprison` pass.
///
/// Evaluation order matches the canonical handler exactly: shape validation,
/// then eager failure-label resolution (unlike lazily-resolved siblings,
/// this happens unconditionally, before the attacker role or any branch),
/// then the attacker role, then the already-imprisoned early jump (rules and
/// scheduler unchanged, no PP loss), then the Pressure PP loop (attacker
/// active PP always updates when an Imprison slot is found; the party
/// mirror, `scheduler.active_battler`, the pending-controller append, and
/// the PP event are gated on move permanence), then the move-overlap scan
/// on the post-PP rules, deciding Advance (with `STATUS3_IMPRISONED_OTHERS`
/// set) or Jump. PP side effects from the loop persist on either outcome.
pub fn apply_battle_script_tryimprison<'a>(
    instruction: BattleScriptTryimprisonInstruction<'a>,
    rules: &BattleScriptTryimprisonRules,
    scheduler: &BattleScriptTryimprisonScheduler,
) -> Result<BattleScriptTryimprisonOutcome, BattleScriptTryimprisonError<'a>> {
    let failure_expression = validate_instruction(instruction)?;
    let resolved_failure = instruction.resolved_failure_target.ok_or(
        BattleScriptTryimprisonError::UnresolvedFailureTarget { expression: failure_expression },
    )?;

    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptTryimprisonError::MissingAttackerRole)?;
    let attacker_state = rules.battlers[attacker.index()];

    if attacker_state.status3 & BATTLE_SCRIPT_TRYIMPRISON_STATUS3_IMPRISONED_OTHERS != 0 {
        return Ok(BattleScriptTryimprisonOutcome {
            rules: *rules,
            scheduler: *scheduler,
            control: BattleScriptTryimprisonControl::Jump {
                program_counter: resolved_failure.program_counter,
            },
            emitted_event: None,
        });
    }

    let attacker_side = attacker_state.side;
    let battlers_count = rules.battlers_count.get();

    let mut imprison_position: Option<usize> = None;
    let mut next_pp_value: Option<u8> = None;
    for battler_index in 0..battlers_count {
        let candidate = rules.battlers[battler_index];
        if candidate.side == attacker_side
            || candidate.ability != BATTLE_SCRIPT_TRYIMPRISON_ABILITY_PRESSURE
        {
            continue;
        }
        let Some(position) = attacker_state
            .moves
            .iter()
            .position(|&move_id| move_id == BATTLE_SCRIPT_TRYIMPRISON_MOVE_IMPRISON)
        else {
            continue;
        };
        imprison_position = Some(position);
        let current = next_pp_value.unwrap_or(attacker_state.pp[position]);
        next_pp_value = Some(if current == 0 { 0 } else { current - 1 });
    }

    let mut next_rules = *rules;
    let mut next_scheduler = *scheduler;
    let mut emitted_event = None;

    if let (Some(position), Some(next_pp)) = (imprison_position, next_pp_value) {
        next_rules.battlers[attacker.index()].pp[position] = next_pp;

        let permanent = attacker_state.status2 & BATTLE_SCRIPT_TRYIMPRISON_STATUS2_TRANSFORMED == 0
            && attacker_state.mimicked_moves & (1 << position) == 0;
        if permanent {
            let party_index = usize::from(attacker_state.party_index);
            if party_index >= BATTLE_SCRIPT_TRYIMPRISON_PARTY_SIZE {
                return Err(BattleScriptTryimprisonError::InvalidPartyIndex {
                    side: attacker_state.side,
                    party_index: attacker_state.party_index,
                });
            }
            next_rules.party[attacker_state.side.index()][party_index].pp[position] = next_pp;

            next_scheduler.active_battler = Some(attacker);
            let pending_count = usize::from(next_scheduler.pending_count);
            let already_pending = next_scheduler.pending_controller_battlers[..pending_count]
                .contains(&Some(attacker));
            if !already_pending {
                debug_assert!(pending_count < BATTLE_SCRIPT_TRYIMPRISON_BATTLER_COUNT);
                next_scheduler.pending_controller_battlers[pending_count] = Some(attacker);
                next_scheduler.pending_count += 1;
            }

            emitted_event = Some(BattleScriptTryimprisonEvent::SetBattlerPpData {
                battler: attacker,
                move_position: position as u8,
                pp: next_pp,
            });
        }
    }

    let next_attacker_state = next_rules.battlers[attacker.index()];
    let mut overlap = false;
    'outer: for battler_index in 0..battlers_count {
        let candidate = next_rules.battlers[battler_index];
        if candidate.side == attacker_side {
            continue;
        }
        for &attacker_move in &next_attacker_state.moves {
            if attacker_move != BATTLE_SCRIPT_TRYIMPRISON_MOVE_NONE
                && candidate.moves.contains(&attacker_move)
            {
                overlap = true;
                break 'outer;
            }
        }
    }

    let control = if overlap {
        next_rules.battlers[attacker.index()].status3 =
            next_attacker_state.status3 | BATTLE_SCRIPT_TRYIMPRISON_STATUS3_IMPRISONED_OTHERS;
        BattleScriptTryimprisonControl::Advance
    } else {
        BattleScriptTryimprisonControl::Jump { program_counter: resolved_failure.program_counter }
    };

    Ok(BattleScriptTryimprisonOutcome {
        rules: next_rules,
        scheduler: next_scheduler,
        control,
        emitted_event,
    })
}

/// Independent source, dispatch, and body evidence.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryimprisonDecompDispatchEvidence {
    pub opcode_name: &'static str,
    pub opcode_id: u8,
    pub dispatcher: &'static str,
    pub dispatch_line: u32,
    pub forward_decl_line: u32,
    pub handler_line: u32,
    pub imprisoned_guard_line: u32,
    pub pressure_call_line: u32,
    pub overlap_set_line: u32,
    pub gen3_fail_comment_line: u32,
}

pub const BATTLE_SCRIPT_TRYIMPRISON_DECOMP_DISPATCH_EVIDENCE:
    BattleScriptTryimprisonDecompDispatchEvidence = BattleScriptTryimprisonDecompDispatchEvidence {
    opcode_name: BATTLE_SCRIPT_TRYIMPRISON_OPCODE_NAME,
    opcode_id: BATTLE_SCRIPT_TRYIMPRISON_OPCODE,
    dispatcher: BATTLE_SCRIPT_TRYIMPRISON_DISPATCHER,
    dispatch_line: 550,
    forward_decl_line: 298,
    handler_line: 9412,
    imprisoned_guard_line: 9414,
    pressure_call_line: 9423,
    overlap_set_line: 9443,
    gen3_fail_comment_line: 9449,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryimprisonPressureUtilEvidence {
    pub header_line: u32,
    pub decrement_line: u32,
    pub permanent_gate_line: u32,
}

pub const BATTLE_SCRIPT_TRYIMPRISON_PRESSURE_UTIL_EVIDENCE:
    BattleScriptTryimprisonPressureUtilEvidence = BattleScriptTryimprisonPressureUtilEvidence {
    header_line: 767,
    decrement_line: 786,
    permanent_gate_line: 791,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryimprisonMacroEvidence {
    pub declaration_line: u32,
    pub opcode_line: u32,
    pub pointer_line: u32,
    pub encoded_width_bytes: u8,
}

pub const BATTLE_SCRIPT_TRYIMPRISON_MACRO_EVIDENCE: BattleScriptTryimprisonMacroEvidence =
    BattleScriptTryimprisonMacroEvidence {
        declaration_line: 1120,
        opcode_line: 1121,
        pointer_line: 1122,
        encoded_width_bytes: BATTLE_SCRIPT_TRYIMPRISON_ENCODED_WIDTH_BYTES,
    };

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryimprisonCallSiteEvidence {
    pub entry_label: &'static str,
    pub entry_label_line: u32,
    pub statement_line: u32,
    pub instruction_program_counter: u32,
    pub failure_target_expression: &'static str,
    pub failure_target_program_counter: u32,
}

pub const BATTLE_SCRIPT_TRYIMPRISON_CALL_SITE_EVIDENCE: BattleScriptTryimprisonCallSiteEvidence =
    BattleScriptTryimprisonCallSiteEvidence {
        entry_label: "BattleScript_EffectImprison",
        entry_label_line: 2509,
        statement_line: 2513,
        instruction_program_counter: 1794,
        failure_target_expression: "BattleScript_ButItFailed",
        failure_target_program_counter: 1434,
    };

#[cfg(test)]
mod tests {
    use super::*;

    const FAILED_OPERAND: [BattleScriptTryimprisonOperand<'static>; 1] = [
        BattleScriptTryimprisonOperand { width_bytes: 4, expression: "BattleScript_ButItFailed" },
    ];

    const RESOLVED: BattleScriptTryimprisonResolvedLabel<'static> =
        BattleScriptTryimprisonResolvedLabel {
            expression: "BattleScript_ButItFailed",
            program_counter: 1434,
        };

    fn battler(
        side: BattleScriptTryimprisonSide,
        party_index: u8,
        ability: u8,
        moves: [u16; 4],
        pp: [u8; 4],
    ) -> BattleScriptTryimprisonBattlerState {
        BattleScriptTryimprisonBattlerState {
            side,
            party_index,
            ability,
            status2: 0,
            status3: 0,
            moves,
            pp,
            mimicked_moves: 0,
        }
    }

    fn member(pp: [u8; 4]) -> BattleScriptTryimprisonPartyMember {
        BattleScriptTryimprisonPartyMember { pp }
    }

    fn base_rules(
        attacker_moves: [u16; 4],
        attacker_pp: [u8; 4],
        opposing_ability: u8,
    ) -> BattleScriptTryimprisonRules {
        BattleScriptTryimprisonRules {
            battlers: [
                battler(
                    BattleScriptTryimprisonSide::Player,
                    0,
                    0,
                    attacker_moves,
                    attacker_pp,
                ),
                battler(
                    BattleScriptTryimprisonSide::Opponent,
                    0,
                    opposing_ability,
                    [7, 8, 9, 10],
                    [5, 5, 5, 5],
                ),
                battler(
                    BattleScriptTryimprisonSide::Player,
                    1,
                    0,
                    [0, 0, 0, 0],
                    [0, 0, 0, 0],
                ),
                battler(
                    BattleScriptTryimprisonSide::Opponent,
                    1,
                    0,
                    [0, 0, 0, 0],
                    [0, 0, 0, 0],
                ),
            ],
            party: [
                [member([0; 4]); BATTLE_SCRIPT_TRYIMPRISON_PARTY_SIZE],
                [member([0; 4]); BATTLE_SCRIPT_TRYIMPRISON_PARTY_SIZE],
            ],
            selector_roles: BattleScriptTryimprisonRoles {
                attacker: Some(BattleScriptTryimprisonBattler::Battler0),
            },
            battlers_count: BattleScriptTryimprisonBattlersCount::Singles,
        }
    }

    fn scheduler(
        pending: &[BattleScriptTryimprisonBattler],
        active: Option<BattleScriptTryimprisonBattler>,
    ) -> BattleScriptTryimprisonScheduler {
        let mut cells = [None; 4];
        for (index, value) in pending.iter().enumerate() {
            cells[index] = Some(*value);
        }
        BattleScriptTryimprisonScheduler {
            active_battler: active,
            pending_controller_battlers: cells,
            pending_count: pending.len() as u8,
        }
    }

    fn instruction<'a>(
        resolved: Option<BattleScriptTryimprisonResolvedLabel<'a>>,
    ) -> BattleScriptTryimprisonInstruction<'a> {
        BattleScriptTryimprisonInstruction {
            opcode_name: BATTLE_SCRIPT_TRYIMPRISON_OPCODE_NAME,
            program_counter: 1794,
            opcode_id: BATTLE_SCRIPT_TRYIMPRISON_OPCODE,
            dispatcher: BATTLE_SCRIPT_TRYIMPRISON_DISPATCHER,
            operands: &FAILED_OPERAND,
            resolved_failure_target: resolved,
        }
    }

    #[test]
    fn eager_unresolved_label_errors_even_on_a_would_be_advance_path() {
        // No opposing pressure, but attacker shares a move with the opponent
        // (would Advance if the label resolved).
        let rules = base_rules([286, 7, 0, 0], [5, 5, 5, 5], 0);
        let outcome =
            apply_battle_script_tryimprison(instruction(None), &rules, &scheduler(&[], None));
        assert_eq!(
            outcome.unwrap_err().to_string(),
            "Cmd_tryimprison unresolved failure target BattleScript_ButItFailed"
        );
    }

    #[test]
    fn already_imprisoned_jumps_without_pp_loss_even_with_opposing_pressure() {
        let mut rules = base_rules([286, 0, 0, 0], [5, 5, 5, 5], 46);
        rules.battlers[0].status3 = BATTLE_SCRIPT_TRYIMPRISON_STATUS3_IMPRISONED_OTHERS;
        let outcome = apply_battle_script_tryimprison(
            instruction(Some(RESOLVED)),
            &rules,
            &scheduler(&[], None),
        )
        .expect("clean jump");
        assert_eq!(
            outcome.control,
            BattleScriptTryimprisonControl::Jump { program_counter: 1434 }
        );
        assert_eq!(outcome.rules, rules);
        assert_eq!(outcome.emitted_event, None);
    }

    #[test]
    fn chain_decrement_applies_once_per_qualifying_pressure_holder() {
        let mut rules = base_rules([286, 0, 0, 0], [5, 0, 0, 0], 46);
        rules.battlers_count = BattleScriptTryimprisonBattlersCount::Doubles;
        rules.battlers[3].ability = BATTLE_SCRIPT_TRYIMPRISON_ABILITY_PRESSURE;
        rules.battlers[3].side = BattleScriptTryimprisonSide::Opponent;
        let outcome = apply_battle_script_tryimprison(
            instruction(Some(RESOLVED)),
            &rules,
            &scheduler(&[], None),
        )
        .expect("two pressure holders decrement twice");
        assert_eq!(outcome.rules.battlers[0].pp[0], 3);
    }

    #[test]
    fn pp_floors_at_zero() {
        let rules = base_rules([286, 0, 0, 0], [0, 0, 0, 0], 46);
        let outcome = apply_battle_script_tryimprison(
            instruction(Some(RESOLVED)),
            &rules,
            &scheduler(&[], None),
        )
        .expect("floor at zero");
        assert_eq!(outcome.rules.battlers[0].pp[0], 0);
    }

    #[test]
    fn non_permanent_move_updates_active_pp_only() {
        let mut rules = base_rules([286, 0, 0, 0], [5, 0, 0, 0], 46);
        rules.battlers[0].status2 = BATTLE_SCRIPT_TRYIMPRISON_STATUS2_TRANSFORMED;
        let before_pending = scheduler(&[], Some(BattleScriptTryimprisonBattler::Battler2));
        let outcome =
            apply_battle_script_tryimprison(instruction(Some(RESOLVED)), &rules, &before_pending)
                .expect("non-permanent still evaluates");
        assert_eq!(outcome.rules.battlers[0].pp[0], 4);
        assert_eq!(
            outcome.rules.party[0][0].pp[0], 0,
            "party mirror must not update"
        );
        assert_eq!(
            outcome.scheduler.active_battler,
            Some(BattleScriptTryimprisonBattler::Battler2),
            "activeBattler retained when not permanent"
        );
        assert_eq!(outcome.emitted_event, None);
    }

    #[test]
    fn permanent_move_writes_party_active_battler_and_event() {
        let rules = base_rules([286, 0, 0, 0], [5, 0, 0, 0], 46);
        let before_pending = scheduler(&[], Some(BattleScriptTryimprisonBattler::Battler2));
        let outcome =
            apply_battle_script_tryimprison(instruction(Some(RESOLVED)), &rules, &before_pending)
                .expect("permanent success");
        assert_eq!(outcome.rules.party[0][0].pp[0], 4);
        assert_eq!(
            outcome.scheduler.active_battler,
            Some(BattleScriptTryimprisonBattler::Battler0)
        );
        assert_eq!(
            outcome.emitted_event,
            Some(BattleScriptTryimprisonEvent::SetBattlerPpData {
                battler: BattleScriptTryimprisonBattler::Battler0,
                move_position: 0,
                pp: 4,
            })
        );
    }

    #[test]
    fn move_none_never_counts_as_overlap() {
        let rules = base_rules([0, 7, 8, 9], [5, 5, 5, 5], 0);
        let mut rules = rules;
        rules.battlers[1].moves = [0, 1, 2, 3];
        let outcome = apply_battle_script_tryimprison(
            instruction(Some(RESOLVED)),
            &rules,
            &scheduler(&[], None),
        )
        .expect("no overlap because MOVE_NONE excluded");
        assert_eq!(
            outcome.control,
            BattleScriptTryimprisonControl::Jump { program_counter: 1434 }
        );
    }

    #[test]
    fn pending_append_happens_once() {
        let rules = base_rules([286, 0, 0, 0], [5, 0, 0, 0], 46);
        let outcome = apply_battle_script_tryimprison(
            instruction(Some(RESOLVED)),
            &rules,
            &scheduler(&[], None),
        )
        .expect("first append");
        assert_eq!(outcome.scheduler.pending_count, 1);

        let already = scheduler(&[BattleScriptTryimprisonBattler::Battler0], None);
        let idempotent =
            apply_battle_script_tryimprison(instruction(Some(RESOLVED)), &rules, &already)
                .expect("idempotent append");
        assert_eq!(idempotent.scheduler.pending_count, 1);
    }

    #[test]
    fn overlap_sets_status3_and_advances() {
        let rules = base_rules([286, 7, 0, 0], [5, 5, 5, 5], 0);
        let outcome = apply_battle_script_tryimprison(
            instruction(Some(RESOLVED)),
            &rules,
            &scheduler(&[], None),
        )
        .expect("overlap advances");
        assert_eq!(outcome.control, BattleScriptTryimprisonControl::Advance);
        assert_eq!(
            outcome.rules.battlers[0].status3 & BATTLE_SCRIPT_TRYIMPRISON_STATUS3_IMPRISONED_OTHERS,
            BATTLE_SCRIPT_TRYIMPRISON_STATUS3_IMPRISONED_OTHERS
        );
    }

    #[test]
    fn malformed_instruction_precedes_unresolved_label_and_attacker_role() {
        let bad = BattleScriptTryimprisonInstruction { opcode_id: 0xdc, ..instruction(None) };
        let rules = base_rules([286, 0, 0, 0], [5, 5, 5, 5], 0);
        assert_eq!(
            apply_battle_script_tryimprison(bad, &rules, &scheduler(&[], None))
                .expect_err("shape precedes everything")
                .to_string(),
            "invalid B_SCR_OP_TRYIMPRISON shape at program counter 1794"
        );
    }

    #[test]
    fn registration_accepts_one_start_and_rejects_wrong_cardinality_and_shape() {
        let good = instruction(Some(RESOLVED));
        assert_eq!(
            register_battle_script_tryimprison_handler(&[good])
                .expect("one start registers")
                .opcode_id,
            BATTLE_SCRIPT_TRYIMPRISON_OPCODE
        );
        assert_eq!(
            register_battle_script_tryimprison_handler(&[])
                .expect_err("zero starts")
                .to_string(),
            "B_SCR_OP_TRYIMPRISON requires exactly 1 concrete start, got 0"
        );
        let bad = BattleScriptTryimprisonInstruction { opcode_id: 0xdc, ..good };
        assert_eq!(
            register_battle_script_tryimprison_handler(&[bad])
                .expect_err("shape offender reported")
                .to_string(),
            "invalid B_SCR_OP_TRYIMPRISON shape at program counter 1794"
        );
    }

    #[test]
    fn battler_ids_round_trip_from_u8() {
        for value in BATTLE_SCRIPT_TRYIMPRISON_BATTLERS {
            assert_eq!(
                BattleScriptTryimprisonBattler::from_u8(value.as_u8()),
                Some(value)
            );
        }
        assert_eq!(BattleScriptTryimprisonBattler::from_u8(4), None);
    }
}
