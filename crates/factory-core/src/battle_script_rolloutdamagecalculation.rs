//! Pure `B_SCR_OP_ROLLOUTDAMAGECALCULATION` state transformation and control
//! result.
//!
//! This is the deliberately narrow, machine-independent port of
//! `src/engine/battleScriptRolloutOpcode.ts`, including its two projected
//! helpers `cancelBattleScriptMultiTurnMoves`
//! (`src/engine/battleScriptMultiTurnCancellation.ts`, a pure mirror of
//! `CancelMultiTurnMoves` in `battle_util.c:877-888`) and `requireBattlerRole`
//! (`src/engine/battleScriptHitChainOpcode.ts`). It retains that module's
//! registration validation, attacker-first handler order, late
//! `BattleScript_MoveMissedPause` resolution on the no-effect branch, and the
//! escalating dynamic-power arithmetic, in the same style as
//! `battle_script_furycutter.rs` (the closest behavioral cousin: same
//! operandless single-start registration, same late-resolved-label no-effect
//! jump). `battle_script_confuseifrepeatingattackends.rs` shows the
//! `STATUS2` lock-mask style this module also uses.
//!
//! It deliberately owns neither a generic Battle Script machine, absolute
//! program counters, scheduler/RNG state, controller state, presentation, nor
//! a WASM ABI.
//!
//! Source authority:
//! - `B_SCR_OP_ROLLOUTDAMAGECALCULATION` is opcode `0xB3` in
//!   `reference/pokeemerald/include/constants/battle_script_commands.h:185`
//!   and dispatches to `Cmd_rolloutdamagecalculation` at
//!   `reference/pokeemerald/src/battle_script_commands.c:510`; its forward
//!   declaration is `:258`.
//! - The command body is `battle_script_commands.c:8536-8569`.
//! - The operandless `rolloutdamagecalculation` macro is at
//!   `reference/pokeemerald/asm/macros/battle_script.inc:937-939` (one
//!   encoded byte); its one concrete use is `rolloutdamagecalculation` at
//!   `reference/pokeemerald/data/battle_scripts_1.s:1605`, inside
//!   `BattleScript_RolloutHit::` (`:1603`), reached from
//!   `BattleScript_EffectRollout::` at `:1596`.
//! - `MOVE_RESULT_NO_EFFECT` is the three-bit `u8` mask `(1 << 0) | (1 << 3)
//!   | (1 << 5)` in `reference/pokeemerald/include/constants/battle.h:220-228`.
//! - Status masks, all from `include/constants/battle.h`: `STATUS2_UPROAR`
//!   (`:132`, `1 << 4 | 1 << 5 | 1 << 6`), `STATUS2_BIDE` (`:135`,
//!   `1 << 8 | 1 << 9`), `STATUS2_LOCK_CONFUSE` (`:137`, `1 << 10 | 1 << 11`),
//!   `STATUS2_MULTIPLETURNS` (`:139`, `1 << 12`), `STATUS2_DEFENSE_CURL`
//!   (`:154`, `1 << 30`), `STATUS3_ON_AIR` (`:163`, `1 << 6`),
//!   `STATUS3_UNDERGROUND` (`:164`, `1 << 7`), `STATUS3_UNDERWATER` (`:175`,
//!   `1 << 18`), `STATUS3_SEMI_INVULNERABLE` (`:178`, the OR of those three).
//! - `CancelMultiTurnMoves` is `reference/pokeemerald/src/battle_util.c:877-888`.

use core::fmt;

/// Source `MAX_BATTLERS_COUNT`; active battle arrays always retain all four
/// indexed cells, including Factory singles.
pub const BATTLE_SCRIPT_ROLLOUT_BATTLER_COUNT: usize = 4;

/// Canonical concrete opcode-name selector used by registration.
pub const BATTLE_SCRIPT_ROLLOUT_OPCODE_NAME: &str = "B_SCR_OP_ROLLOUTDAMAGECALCULATION";

/// `B_SCR_OP_ROLLOUTDAMAGECALCULATION` from the source command table.
pub const BATTLE_SCRIPT_ROLLOUT_OPCODE: u8 = 0xb3;

/// Source dispatcher retained by registration validation.
pub const BATTLE_SCRIPT_ROLLOUT_DISPATCHER: &str = "Cmd_rolloutdamagecalculation";

/// The source macro's encoded byte width (opcode byte only, no operands).
pub const BATTLE_SCRIPT_ROLLOUT_ENCODED_WIDTH_BYTES: u8 = 1;

/// `MOVE_RESULT_NO_EFFECT` from `include/constants/battle.h:228`.
pub const BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT: u32 = (1 << 0) | (1 << 3) | (1 << 5);

/// `STATUS2_UPROAR` from `include/constants/battle.h:132`.
pub const BATTLE_SCRIPT_STATUS2_UPROAR: u32 = (1 << 4) | (1 << 5) | (1 << 6);
/// `STATUS2_BIDE` from `include/constants/battle.h:135`.
pub const BATTLE_SCRIPT_STATUS2_BIDE: u32 = (1 << 8) | (1 << 9);
/// `STATUS2_LOCK_CONFUSE` from `include/constants/battle.h:137`.
pub const BATTLE_SCRIPT_STATUS2_LOCK_CONFUSE: u32 = (1 << 10) | (1 << 11);
/// `STATUS2_MULTIPLETURNS` from `include/constants/battle.h:139`.
pub const BATTLE_SCRIPT_STATUS2_MULTIPLETURNS: u32 = 1 << 12;
/// `STATUS2_DEFENSE_CURL` from `include/constants/battle.h:154`.
pub const BATTLE_SCRIPT_STATUS2_DEFENSE_CURL: u32 = 1 << 30;
/// `CancelMultiTurnMoves`'s complete `status2` clear mask
/// (`battle_util.c:879-882`).
pub const BATTLE_SCRIPT_CANCEL_MULTI_TURN_STATUS2_MASK: u32 = BATTLE_SCRIPT_STATUS2_MULTIPLETURNS
    | BATTLE_SCRIPT_STATUS2_LOCK_CONFUSE
    | BATTLE_SCRIPT_STATUS2_UPROAR
    | BATTLE_SCRIPT_STATUS2_BIDE;

/// `STATUS3_ON_AIR` from `include/constants/battle.h:163`.
pub const BATTLE_SCRIPT_STATUS3_ON_AIR: u32 = 1 << 6;
/// `STATUS3_UNDERGROUND` from `include/constants/battle.h:164`.
pub const BATTLE_SCRIPT_STATUS3_UNDERGROUND: u32 = 1 << 7;
/// `STATUS3_UNDERWATER` from `include/constants/battle.h:175`.
pub const BATTLE_SCRIPT_STATUS3_UNDERWATER: u32 = 1 << 18;
/// `STATUS3_SEMI_INVULNERABLE` from `include/constants/battle.h:178`.
pub const BATTLE_SCRIPT_STATUS3_SEMI_INVULNERABLE: u32 = BATTLE_SCRIPT_STATUS3_UNDERGROUND
    | BATTLE_SCRIPT_STATUS3_ON_AIR
    | BATTLE_SCRIPT_STATUS3_UNDERWATER;

/// Fixed Rollout/Ice Ball hit count: the source literal `5` used both as the
/// initial `rolloutTimer` and the stored `rolloutTimerStartValue`.
pub const BATTLE_SCRIPT_ROLLOUT_HIT_COUNT: u8 = 5;

/// The exact source label resolved only by the no-effect branch.
pub const BATTLE_SCRIPT_ROLLOUT_MOVE_MISSED_PAUSE_LABEL: &str = "BattleScript_MoveMissedPause";

/// Complete source `BattleScriptBattlerId` domain used by the selector roles
/// and indexed battler array.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum BattleScriptRolloutBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

/// Canonical fixed battler domain retained for attacker and sibling ratchets.
pub const BATTLE_SCRIPT_ROLLOUT_BATTLERS: [BattleScriptRolloutBattler;
    BATTLE_SCRIPT_ROLLOUT_BATTLER_COUNT] = [
    BattleScriptRolloutBattler::Battler0,
    BattleScriptRolloutBattler::Battler1,
    BattleScriptRolloutBattler::Battler2,
    BattleScriptRolloutBattler::Battler3,
];

impl BattleScriptRolloutBattler {
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

/// The only selector bindings read by the canonical opcode handler. `target`
/// is retained (unread) so a successful copy can prove it never changes.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptRolloutRoles {
    pub attacker: Option<BattleScriptRolloutBattler>,
    pub target: Option<BattleScriptRolloutBattler>,
}

/// Complete per-battler projection read or written by this opcode. `side`,
/// `ability`, `hp`, `max_hp`, `item`, and `party_index` are salted noise that
/// must survive both branches untouched, proving the command's narrow
/// ownership boundary; `status2`, `status3`, `rollout_timer`, and
/// `fury_cutter_counter` are the genuine source fields the handler and the
/// projected `CancelMultiTurnMoves` helper read and write.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptRolloutBattlerState {
    pub side: u8,
    pub ability: u8,
    pub hp: u16,
    pub max_hp: u16,
    pub item: u16,
    pub party_index: u8,
    /// Source `gBattleMons[battler].status2`.
    pub status2: u32,
    /// Source `gStatuses3[battler]`.
    pub status3: u32,
    /// Source `gDisableStructs[battler].rolloutTimer`.
    pub rollout_timer: u8,
    /// Source `gDisableStructs[battler].furyCutterCounter`; only touched by
    /// the projected `CancelMultiTurnMoves` helper on the no-effect branch.
    pub fury_cutter_counter: u8,
}

/// Complete narrow rules slice read or written by this command.
///
/// `move_result_flags` deliberately retains a `u32` bit-pattern projection,
/// mirroring the sibling leaves' source-`u8`-domain-in-a-`u32` convention.
/// `current_move_power` is a source `u16`; `dynamic_base_power` retains the
/// full canonical TypeScript `number` semantics (`power * 2 ** k`, doubled
/// again for Defense Curl, with no clamp or wraparound) rather than the
/// source's narrower `u16 gDynamicBasePower` storage width.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptRolloutRules {
    pub battlers: [BattleScriptRolloutBattlerState; BATTLE_SCRIPT_ROLLOUT_BATTLER_COUNT],
    pub selector_roles: BattleScriptRolloutRoles,
    /// Source `gLockedMoves[MAX_BATTLERS_COUNT]`, written only by the
    /// success branch's first-hit case.
    pub locked_moves: [u16; BATTLE_SCRIPT_ROLLOUT_BATTLER_COUNT],
    /// Source `gDisableStructs[*].rolloutTimerStartValue`, written only by
    /// the success branch's first-hit case.
    pub rollout_timer_start_values: [u8; BATTLE_SCRIPT_ROLLOUT_BATTLER_COUNT],
    /// Source `gCurrentMove`, read only by the success branch's first-hit
    /// case.
    pub current_move: u16,
    /// Source `gBattleMoves[gCurrentMove].power`, read only by the success
    /// branch.
    pub current_move_power: u16,
    pub move_result_flags: u32,
    /// Source `gDynamicBasePower`, written only by the success branch.
    pub dynamic_base_power: u32,
}

/// Minimal concrete-program instruction projection. The canonical macro has
/// no operands; keeping only its observable count avoids inventing a fake
/// operand payload.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptRolloutInstruction<'a> {
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
pub struct BattleScriptRolloutLabels {
    pub move_missed_pause_resolved: bool,
}

/// Machine-independent control result of `Cmd_rolloutdamagecalculation`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptRolloutControl {
    /// Source increments `gBattlescriptCurrInstr` by its operandless width.
    Advance,
    /// A no-effect result resolves and jumps to `BattleScript_MoveMissedPause`.
    MoveMissedPauseJump,
}

/// Complete projected result of one successful handler invocation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptRolloutOutcome {
    pub rules: BattleScriptRolloutRules,
    pub control: BattleScriptRolloutControl,
}

/// Exact registration and handler failures in canonical TypeScript order.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptRolloutError {
    ExpectedExactlyOneConcreteStart { count: usize },
    InvalidInstructionShape { program_counter: u32 },
    MissingAttackerRole,
    MissingMoveMissedPause,
    ZeroRolloutTimer,
}

impl fmt::Display for BattleScriptRolloutError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ExpectedExactlyOneConcreteStart { count } => write!(
                formatter,
                "B_SCR_OP_ROLLOUTDAMAGECALCULATION requires exactly 1 concrete start, got {count}"
            ),
            Self::InvalidInstructionShape { program_counter } => write!(
                formatter,
                "invalid B_SCR_OP_ROLLOUTDAMAGECALCULATION shape at program counter {program_counter}"
            ),
            Self::MissingAttackerRole => {
                write!(
                    formatter,
                    "Battle Script hit-chain command requires a attacker role"
                )
            }
            Self::MissingMoveMissedPause => write!(
                formatter,
                "Cmd_rolloutdamagecalculation requires {BATTLE_SCRIPT_ROLLOUT_MOVE_MISSED_PAUSE_LABEL}"
            ),
            Self::ZeroRolloutTimer => write!(
                formatter,
                "Cmd_rolloutdamagecalculation found STATUS2_MULTIPLETURNS with a zero rolloutTimer"
            ),
        }
    }
}

impl std::error::Error for BattleScriptRolloutError {}

/// Validates the selected concrete instruction exactly as
/// `createBattleScriptRolloutOpcodeHandlers` does after filtering by opcode
/// name.
pub fn validate_battle_script_rollout_instruction(
    instruction: BattleScriptRolloutInstruction<'_>,
) -> Result<(), BattleScriptRolloutError> {
    if instruction.opcode_name != BATTLE_SCRIPT_ROLLOUT_OPCODE_NAME
        || instruction.opcode_id != BATTLE_SCRIPT_ROLLOUT_OPCODE
        || instruction.dispatcher != BATTLE_SCRIPT_ROLLOUT_DISPATCHER
        || instruction.operand_count != 0
    {
        return Err(BattleScriptRolloutError::InvalidInstructionShape {
            program_counter: instruction.program_counter,
        });
    }
    Ok(())
}

/// Native projection of `createBattleScriptRolloutOpcodeHandlers(program)`.
///
/// The program slice is filtered by the canonical opcode name first. Thus
/// cardinality errors precede all selected-instruction shape checks, exactly
/// as the TypeScript factory does, and unrelated instructions are invisible.
pub fn validate_battle_script_rollout_registration<'a>(
    instructions: &'a [BattleScriptRolloutInstruction<'a>],
) -> Result<BattleScriptRolloutInstruction<'a>, BattleScriptRolloutError> {
    let mut matches = instructions
        .iter()
        .copied()
        .filter(|instruction| instruction.opcode_name == BATTLE_SCRIPT_ROLLOUT_OPCODE_NAME);
    let candidate = matches.next();
    let count = 1 + matches.count();
    let Some(instruction) = candidate else {
        return Err(BattleScriptRolloutError::ExpectedExactlyOneConcreteStart { count: 0 });
    };
    if count != 1 {
        return Err(BattleScriptRolloutError::ExpectedExactlyOneConcreteStart { count });
    }
    validate_battle_script_rollout_instruction(instruction)?;
    Ok(instruction)
}

/// Pure projection of `CancelMultiTurnMoves` (`battle_util.c:877-888`) onto
/// one battler cell, mirroring
/// `cancelBattleScriptMultiTurnMoves` in
/// `src/engine/battleScriptMultiTurnCancellation.ts`. The canonical
/// TypeScript helper additionally tracks an internal write-only-if-changed
/// identity optimization and a receipt describing each field's before/after
/// values; neither is observable here, so this projection always returns the
/// fully cleared cell.
#[must_use]
pub fn cancel_battle_script_multi_turn_moves(
    battler: BattleScriptRolloutBattlerState,
) -> BattleScriptRolloutBattlerState {
    let mut next = battler;
    next.status2 &= !BATTLE_SCRIPT_CANCEL_MULTI_TURN_STATUS2_MASK;
    next.status3 &= !BATTLE_SCRIPT_STATUS3_SEMI_INVULNERABLE;
    next.rollout_timer = 0;
    next.fury_cutter_counter = 0;
    next
}

/// Native immutable-value twin of the canonical `Cmd_rolloutdamagecalculation`
/// handler.
///
/// Attacker resolution deliberately precedes flag inspection and label
/// lookup. A no-effect result applies the `CancelMultiTurnMoves` projection
/// to the attacker cell, resolves `BattleScript_MoveMissedPause` only after
/// that role is known, and returns a jump. A successful result decrements
/// (or restarts) the attacker's five-hit timer, tracks
/// `STATUS2_MULTIPLETURNS` across the first and last hits, installs the
/// locked move and start value only on the first hit, computes the
/// escalating dynamic base power, doubles it again under Defense Curl, and
/// advances.
pub fn apply_battle_script_rollout(
    labels: BattleScriptRolloutLabels,
    rules: &BattleScriptRolloutRules,
) -> Result<BattleScriptRolloutOutcome, BattleScriptRolloutError> {
    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptRolloutError::MissingAttackerRole)?;

    if rules.move_result_flags & BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT != 0 {
        if !labels.move_missed_pause_resolved {
            return Err(BattleScriptRolloutError::MissingMoveMissedPause);
        }
        let mut next = *rules;
        next.battlers[attacker.index()] =
            cancel_battle_script_multi_turn_moves(rules.battlers[attacker.index()]);
        return Ok(BattleScriptRolloutOutcome {
            rules: next,
            control: BattleScriptRolloutControl::MoveMissedPauseJump,
        });
    }

    let source_attacker = rules.battlers[attacker.index()];
    let first_hit = source_attacker.status2 & BATTLE_SCRIPT_STATUS2_MULTIPLETURNS == 0;
    let timer_before_decrement = if first_hit {
        BATTLE_SCRIPT_ROLLOUT_HIT_COUNT
    } else {
        source_attacker.rollout_timer
    };
    if timer_before_decrement == 0 {
        return Err(BattleScriptRolloutError::ZeroRolloutTimer);
    }
    let rollout_timer = timer_before_decrement - 1;
    let status2_with_lock = if first_hit {
        source_attacker.status2 | BATTLE_SCRIPT_STATUS2_MULTIPLETURNS
    } else {
        source_attacker.status2
    };
    let status2 = if rollout_timer == 0 {
        status2_with_lock & !BATTLE_SCRIPT_STATUS2_MULTIPLETURNS
    } else {
        status2_with_lock
    };

    let mut next = *rules;
    next.battlers[attacker.index()].status2 = status2;
    next.battlers[attacker.index()].rollout_timer = rollout_timer;

    if first_hit {
        next.locked_moves[attacker.index()] = rules.current_move;
        next.rollout_timer_start_values[attacker.index()] = BATTLE_SCRIPT_ROLLOUT_HIT_COUNT;
    }

    let successful_hits = BATTLE_SCRIPT_ROLLOUT_HIT_COUNT - rollout_timer;
    let mut dynamic_base_power =
        u32::from(rules.current_move_power) * (1u32 << (successful_hits - 1));
    if status2 & BATTLE_SCRIPT_STATUS2_DEFENSE_CURL != 0 {
        dynamic_base_power *= 2;
    }
    next.dynamic_base_power = dynamic_base_power;

    Ok(BattleScriptRolloutOutcome { rules: next, control: BattleScriptRolloutControl::Advance })
}

/// Independent source, dispatch, and body evidence.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptRolloutDecompDispatchEvidence {
    pub opcode_name: &'static str,
    pub opcode_id: u8,
    pub dispatcher: &'static str,
    pub dispatch_line: u32,
    pub forward_decl_line: u32,
    pub handler_line: u32,
    pub no_effect_check_line: u32,
    pub cancel_call_line: u32,
    pub move_missed_pause_jump_line: u32,
    pub first_hit_check_line: u32,
    pub set_rollout_timer_line: u32,
    pub set_start_value_line: u32,
    pub set_multipleturns_line: u32,
    pub set_locked_move_line: u32,
    pub decrement_and_last_hit_check_line: u32,
    pub clear_multipleturns_line: u32,
    pub set_dynamic_power_line: u32,
    pub power_loop_line: u32,
    pub power_loop_body_line: u32,
    pub defense_curl_check_line: u32,
    pub defense_curl_double_line: u32,
    pub advance_line: u32,
}

pub const BATTLE_SCRIPT_ROLLOUT_DECOMP_DISPATCH_EVIDENCE:
    BattleScriptRolloutDecompDispatchEvidence = BattleScriptRolloutDecompDispatchEvidence {
    opcode_name: BATTLE_SCRIPT_ROLLOUT_OPCODE_NAME,
    opcode_id: BATTLE_SCRIPT_ROLLOUT_OPCODE,
    dispatcher: BATTLE_SCRIPT_ROLLOUT_DISPATCHER,
    dispatch_line: 510,
    forward_decl_line: 258,
    handler_line: 8536,
    no_effect_check_line: 8538,
    cancel_call_line: 8540,
    move_missed_pause_jump_line: 8541,
    first_hit_check_line: 8547,
    set_rollout_timer_line: 8549,
    set_start_value_line: 8550,
    set_multipleturns_line: 8551,
    set_locked_move_line: 8552,
    decrement_and_last_hit_check_line: 8554,
    clear_multipleturns_line: 8556,
    set_dynamic_power_line: 8559,
    power_loop_line: 8561,
    power_loop_body_line: 8562,
    defense_curl_check_line: 8564,
    defense_curl_double_line: 8565,
    advance_line: 8567,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptRolloutMacroEvidence {
    pub declaration_line: u32,
    pub opcode_line: u32,
    pub end_line: u32,
    pub encoded_width_bytes: u8,
}

pub const BATTLE_SCRIPT_ROLLOUT_MACRO_EVIDENCE: BattleScriptRolloutMacroEvidence =
    BattleScriptRolloutMacroEvidence {
        declaration_line: 937,
        opcode_line: 938,
        end_line: 939,
        encoded_width_bytes: BATTLE_SCRIPT_ROLLOUT_ENCODED_WIDTH_BYTES,
    };

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptRolloutCallSiteEvidence {
    pub entry_label: &'static str,
    pub entry_label_line: u32,
    pub hit_label: &'static str,
    pub hit_label_line: u32,
    pub statement_line: u32,
}

pub const BATTLE_SCRIPT_ROLLOUT_CALL_SITE_EVIDENCE: BattleScriptRolloutCallSiteEvidence =
    BattleScriptRolloutCallSiteEvidence {
        entry_label: "BattleScript_EffectRollout",
        entry_label_line: 1596,
        hit_label: "BattleScript_RolloutHit",
        hit_label_line: 1603,
        statement_line: 1605,
    };

/// Independent `battle_util.c` `CancelMultiTurnMoves` evidence.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptRolloutCancelMultiTurnMovesEvidence {
    pub handler_line: u32,
    pub clear_multipleturns_line: u32,
    pub clear_lock_confuse_line: u32,
    pub clear_uproar_line: u32,
    pub clear_bide_line: u32,
    pub clear_semi_invulnerable_line: u32,
    pub clear_rollout_timer_line: u32,
    pub clear_fury_cutter_counter_line: u32,
}

pub const BATTLE_SCRIPT_ROLLOUT_CANCEL_MULTI_TURN_MOVES_EVIDENCE:
    BattleScriptRolloutCancelMultiTurnMovesEvidence =
    BattleScriptRolloutCancelMultiTurnMovesEvidence {
        handler_line: 877,
        clear_multipleturns_line: 879,
        clear_lock_confuse_line: 880,
        clear_uproar_line: 881,
        clear_bide_line: 882,
        clear_semi_invulnerable_line: 884,
        clear_rollout_timer_line: 886,
        clear_fury_cutter_counter_line: 887,
    };

#[cfg(test)]
mod tests {
    use super::*;

    const BATTLER: BattleScriptRolloutBattlerState = BattleScriptRolloutBattlerState {
        side: 0,
        ability: 0,
        hp: 100,
        max_hp: 100,
        item: 0,
        party_index: 0,
        status2: 0,
        status3: 0,
        rollout_timer: 0,
        fury_cutter_counter: 0,
    };

    const CANONICAL_INSTRUCTION: BattleScriptRolloutInstruction<'static> =
        BattleScriptRolloutInstruction {
            opcode_name: BATTLE_SCRIPT_ROLLOUT_OPCODE_NAME,
            program_counter: 1712,
            opcode_id: BATTLE_SCRIPT_ROLLOUT_OPCODE,
            dispatcher: BATTLE_SCRIPT_ROLLOUT_DISPATCHER,
            operand_count: 0,
        };

    fn rules(
        attacker: Option<BattleScriptRolloutBattler>,
        status2: u32,
        rollout_timer: u8,
        move_result_flags: u32,
        current_move_power: u16,
    ) -> BattleScriptRolloutRules {
        let mut battlers = [BATTLER; BATTLE_SCRIPT_ROLLOUT_BATTLER_COUNT];
        battlers[2].status2 = status2;
        battlers[2].status3 = BATTLE_SCRIPT_STATUS3_ON_AIR;
        battlers[2].rollout_timer = rollout_timer;
        battlers[2].fury_cutter_counter = 3;
        BattleScriptRolloutRules {
            battlers,
            selector_roles: BattleScriptRolloutRoles {
                attacker,
                target: Some(BattleScriptRolloutBattler::Battler3),
            },
            locked_moves: [9, 9, 9, 9],
            rollout_timer_start_values: [7, 7, 7, 7],
            current_move: 205,
            current_move_power,
            move_result_flags,
            dynamic_base_power: 0x1234,
        }
    }

    #[test]
    fn missing_attacker_precedes_mask_and_lock_inspection() {
        let input = rules(None, BATTLE_SCRIPT_STATUS2_MULTIPLETURNS, 4, 0, 30);
        let before = input;
        assert_eq!(
            apply_battle_script_rollout(
                BattleScriptRolloutLabels { move_missed_pause_resolved: false },
                &input,
            )
            .expect_err("attacker must be resolved first")
            .to_string(),
            "Battle Script hit-chain command requires a attacker role"
        );
        assert_eq!(input, before, "error must not mutate input");
    }

    #[test]
    fn no_effect_cancels_and_resolves_move_missed_pause_lazily() {
        let input = rules(
            Some(BattleScriptRolloutBattler::Battler2),
            BATTLE_SCRIPT_STATUS2_MULTIPLETURNS | BATTLE_SCRIPT_STATUS2_LOCK_CONFUSE,
            3,
            BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT,
            30,
        );
        assert_eq!(
            apply_battle_script_rollout(
                BattleScriptRolloutLabels { move_missed_pause_resolved: false },
                &input,
            )
            .expect_err("must resolve BattleScript_MoveMissedPause")
            .to_string(),
            "Cmd_rolloutdamagecalculation requires BattleScript_MoveMissedPause"
        );
        let outcome = apply_battle_script_rollout(
            BattleScriptRolloutLabels { move_missed_pause_resolved: true },
            &input,
        )
        .expect("resolved no-effect must jump");
        assert_eq!(
            outcome.control,
            BattleScriptRolloutControl::MoveMissedPauseJump
        );
        let attacker_after = outcome.rules.battlers[2];
        assert_eq!(attacker_after.status2, 0);
        assert_eq!(attacker_after.status3, 0);
        assert_eq!(attacker_after.rollout_timer, 0);
        assert_eq!(attacker_after.fury_cutter_counter, 0);
        assert_eq!(outcome.rules.battlers[0], input.battlers[0]);
        assert_eq!(outcome.rules.battlers[1], input.battlers[1]);
        assert_eq!(outcome.rules.battlers[3], input.battlers[3]);
        assert_eq!(outcome.rules.locked_moves, input.locked_moves);
        assert_eq!(
            outcome.rules.rollout_timer_start_values,
            input.rollout_timer_start_values
        );
        assert_eq!(outcome.rules.dynamic_base_power, input.dynamic_base_power);
    }

    #[test]
    fn zero_timer_with_multipleturns_set_is_a_premise_error() {
        let input = rules(
            Some(BattleScriptRolloutBattler::Battler2),
            BATTLE_SCRIPT_STATUS2_MULTIPLETURNS,
            0,
            0,
            30,
        );
        assert_eq!(
            apply_battle_script_rollout(
                BattleScriptRolloutLabels { move_missed_pause_resolved: false },
                &input,
            )
            .expect_err("zero timer with active lock is impossible")
            .to_string(),
            "Cmd_rolloutdamagecalculation found STATUS2_MULTIPLETURNS with a zero rolloutTimer"
        );
    }

    #[test]
    fn five_hit_ladder_without_defense_curl() {
        let mut status2 = 0u32;
        let mut rollout_timer = 0u8;
        let expected_powers = [30u32, 60, 120, 240, 480];
        for (hit_index, expected_power) in expected_powers.iter().enumerate() {
            let input = rules(
                Some(BattleScriptRolloutBattler::Battler2),
                status2,
                rollout_timer,
                0,
                30,
            );
            let outcome = apply_battle_script_rollout(
                BattleScriptRolloutLabels { move_missed_pause_resolved: false },
                &input,
            )
            .unwrap_or_else(|error| panic!("hit {hit_index} must succeed: {error}"));
            assert_eq!(outcome.control, BattleScriptRolloutControl::Advance);
            assert_eq!(
                outcome.rules.dynamic_base_power, *expected_power,
                "hit {hit_index} power"
            );
            let expected_timer = 4 - hit_index as u8;
            assert_eq!(
                outcome.rules.battlers[2].rollout_timer, expected_timer,
                "hit {hit_index} timer"
            );
            let locked_on_first_hit = hit_index == 0;
            if locked_on_first_hit {
                assert_eq!(outcome.rules.locked_moves[2], input.current_move);
                assert_eq!(
                    outcome.rules.rollout_timer_start_values[2],
                    BATTLE_SCRIPT_ROLLOUT_HIT_COUNT
                );
            } else {
                assert_eq!(outcome.rules.locked_moves, input.locked_moves);
                assert_eq!(
                    outcome.rules.rollout_timer_start_values,
                    input.rollout_timer_start_values
                );
            }
            let last_hit = hit_index == expected_powers.len() - 1;
            let has_lock =
                outcome.rules.battlers[2].status2 & BATTLE_SCRIPT_STATUS2_MULTIPLETURNS != 0;
            assert_eq!(has_lock, !last_hit, "hit {hit_index} lock state");
            status2 = outcome.rules.battlers[2].status2;
            rollout_timer = outcome.rules.battlers[2].rollout_timer;
        }
    }

    #[test]
    fn defense_curl_doubles_every_hit_of_the_ladder() {
        let mut status2 = BATTLE_SCRIPT_STATUS2_DEFENSE_CURL;
        let mut rollout_timer = 0u8;
        let expected_powers = [60u32, 120, 240, 480, 960];
        for (hit_index, expected_power) in expected_powers.iter().enumerate() {
            let input = rules(
                Some(BattleScriptRolloutBattler::Battler2),
                status2,
                rollout_timer,
                0,
                30,
            );
            let outcome = apply_battle_script_rollout(
                BattleScriptRolloutLabels { move_missed_pause_resolved: false },
                &input,
            )
            .unwrap_or_else(|error| panic!("hit {hit_index} must succeed: {error}"));
            assert_eq!(
                outcome.rules.dynamic_base_power, *expected_power,
                "hit {hit_index} power"
            );
            status2 = outcome.rules.battlers[2].status2;
            rollout_timer = outcome.rules.battlers[2].rollout_timer;
        }
    }

    #[test]
    fn registration_checks_cardinality_then_opcode_dispatcher_and_operands() {
        assert_eq!(
            validate_battle_script_rollout_registration(&[])
                .expect_err("missing concrete start must fail")
                .to_string(),
            "B_SCR_OP_ROLLOUTDAMAGECALCULATION requires exactly 1 concrete start, got 0"
        );
        assert_eq!(
            validate_battle_script_rollout_registration(&[
                CANONICAL_INSTRUCTION,
                CANONICAL_INSTRUCTION,
            ])
            .expect_err("two concrete starts must fail before shape")
            .to_string(),
            "B_SCR_OP_ROLLOUTDAMAGECALCULATION requires exactly 1 concrete start, got 2"
        );
        assert_eq!(
            validate_battle_script_rollout_registration(&[BattleScriptRolloutInstruction {
                opcode_id: 0xb4,
                ..CANONICAL_INSTRUCTION
            }])
            .expect_err("wrong opcode must fail shape")
            .to_string(),
            "invalid B_SCR_OP_ROLLOUTDAMAGECALCULATION shape at program counter 1712"
        );
    }

    #[test]
    fn battler_ids_round_trip_from_u8() {
        for battler in BATTLE_SCRIPT_ROLLOUT_BATTLERS {
            assert_eq!(
                BattleScriptRolloutBattler::from_u8(battler.as_u8()),
                Some(battler)
            );
        }
        assert_eq!(BattleScriptRolloutBattler::from_u8(4), None);
    }
}
