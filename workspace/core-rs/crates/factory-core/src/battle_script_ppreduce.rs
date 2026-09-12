//! Pure `B_SCR_OP_PPREDUCE` (0x03) leaf: pressure counting, the PP-deduct
//! gate/clamp, `notFirstStrike`, the party PP mirror, the TRANSFORMED-gated
//! event/pending emission, and the unconditional `HITMARKER_NO_PPDEDUCT`
//! clear.
//!
//! Native twin of `ppreduceOpcodeHandler`
//! (`src/engine/battleScriptHitChainOpcode.ts:1352-1437`), its role helpers
//! `requireBattlerRole`/`withBattler` (`:787-806`), move-target resolution
//! `resolveBattleScriptMoveTarget` (`src/engine/battleScriptRulesContext.ts:1321-1330`),
//! the party PP mirror `withBattleScriptPartyMemberPp` (`:2049-2070`), and
//! scheduler `markBattleScriptControllerPending`
//! (`src/engine/battleScriptMachine.ts:348-362`).
//!
//! Canonical semantics: `Cmd_ppreduce`
//! (`reference/pokeemerald/src/battle_script_commands.c:1205-1250`) --
//! pressure counting `:1209-1229`, deduct gate + clamp + `notFirstStrike`
//! `:1230-1237` with the `MOVE_IS_PERMANENT` `SetMonData` emit `:1239-1246`,
//! unconditional `gHitMarker &= ~HITMARKER_NO_PPDEDUCT` `:1249` and advance
//! `:1250`; dispatch row `:334` (`//0x3`); forward decl `:82`;
//! `include/constants/battle_script_commands.h:9`; macro
//! `asm/macros/battle_script.inc:16-18`.
//!
//! `Cmd_ppreduce`'s own `if (gBattleControllerExecFlags) return;` spin
//! (`:1208-1209` in decomp numbering, controller-busy boundary) is
//! machine/orchestration-level and intentionally absent from both the
//! canonical TypeScript handler and this port -- TS is the spec.
//!
//! This leaf reuses the generated `gen_tables::MOVES[id].target` byte
//! directly instead of re-deriving move targets from source JSON; that byte
//! and the TS `GENERATED_MOVE_TARGETS` map are both derived from the same
//! `moves.json`/`include/battle.h` provenance, pinned to agree for every
//! corpus move in the differential vector corpus.

use core::fmt;

use crate::gen_tables::MOVES;

/// Source `MAX_BATTLERS_COUNT`; all source-indexed state retains four cells.
pub const BATTLE_SCRIPT_PPREDUCE_BATTLER_COUNT: usize = 4;
/// Native corpus party width (the real source party is six-wide; this port
/// only ever needs to stage the three-member Factory party corpus exercises).
pub const BATTLE_SCRIPT_PPREDUCE_PARTY_SIZE: usize = 3;
/// `B_SCR_OP_PPREDUCE` in the source command enum / dispatch table.
pub const BATTLE_SCRIPT_PPREDUCE_OPCODE: u8 = 0x03;
/// Concrete opcode name selected by canonical registration.
pub const BATTLE_SCRIPT_PPREDUCE_OPCODE_NAME: &str = "B_SCR_OP_PPREDUCE";
/// Source dispatch-table handler identity.
pub const BATTLE_SCRIPT_PPREDUCE_DISPATCHER: &str = "Cmd_ppreduce";
/// `ppreduce` has no operands; the committed corpus carries this many
/// identical concrete sites (`grep -c $'\tppreduce'
/// reference/pokeemerald/data/battle_scripts_1.s`).
pub const BATTLE_SCRIPT_PPREDUCE_CANONICAL_SITE_COUNT: usize = 133;

/// `include/constants/abilities.h` -- `ABILITY_PRESSURE`.
pub const BATTLE_SCRIPT_PPREDUCE_ABILITY_PRESSURE: u8 = 46;
/// `src/engine/battleScriptSourceConstants.ts:126` -- `HITMARKER_NO_ATTACKSTRING`.
pub const BATTLE_SCRIPT_PPREDUCE_HITMARKER_NO_ATTACKSTRING: u32 = 1 << 9;
/// `src/engine/battleScriptSourceConstants.ts:128` -- `HITMARKER_NO_PPDEDUCT`.
pub const BATTLE_SCRIPT_PPREDUCE_HITMARKER_NO_PPDEDUCT: u32 = 1 << 11;
/// `src/engine/battleScriptSourceConstants.ts:115` -- `STATUS2_TRANSFORMED`,
/// consumed here as C's `MOVE_IS_PERMANENT` complement.
pub const BATTLE_SCRIPT_PPREDUCE_STATUS2_TRANSFORMED: u32 = 1 << 21;

/// `MOVE_TARGET_BOTH` bit within `gen_tables::MoveRow.target`.
const MOVE_TARGET_BOTH: u8 = 1 << 3;
/// `MOVE_TARGET_FOES_AND_ALLY` bit within `gen_tables::MoveRow.target`.
const MOVE_TARGET_FOES_AND_ALLY: u8 = 1 << 5;
/// `MOVE_TARGET_OPPONENTS_FIELD` bit within `gen_tables::MoveRow.target`.
const MOVE_TARGET_OPPONENTS_FIELD: u8 = 1 << 6;

/// Complete source battler-id domain used by roles and source-indexed arrays.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptPpreduceBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

/// Fixed source battler domain, including inactive cells in singles.
pub const BATTLE_SCRIPT_PPREDUCE_BATTLERS: [BattleScriptPpreduceBattler;
    BATTLE_SCRIPT_PPREDUCE_BATTLER_COUNT] = [
    BattleScriptPpreduceBattler::Battler0,
    BattleScriptPpreduceBattler::Battler1,
    BattleScriptPpreduceBattler::Battler2,
    BattleScriptPpreduceBattler::Battler3,
];

impl BattleScriptPpreduceBattler {
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
pub enum BattleScriptPpreduceSide {
    Player = 0,
    Opponent = 1,
}

impl BattleScriptPpreduceSide {
    /// Zero-based source-array index.
    #[must_use]
    pub const fn index(self) -> usize {
        self as usize
    }
}

/// The complete per-battler projection read or written by this opcode.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptPpreduceBattlerState {
    pub side: BattleScriptPpreduceSide,
    pub party_index: u8,
    /// Source `gBattleMons[battler].pp[4]`.
    pub pp: [u8; 4],
    /// Only Pressure (46) is ever compared; the full byte is retained.
    pub ability: u8,
    /// Only bit 21 (`STATUS2_TRANSFORMED`) is ever read.
    pub status2: u32,
    /// Source `SpecialStatus::ppNotAffectedByPressure`; pinned `0|1` domain,
    /// with the TS `!== 1` comparison (not truthiness) reachable by any
    /// other byte value.
    pub pp_not_affected_by_pressure: u8,
    /// Source `ProtectStruct::notFirstStrike`, written unconditionally
    /// whenever the deduct gate holds.
    pub not_first_strike: u8,
}

/// One persistent party member's projection; only `pp` participates.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptPpreducePartyMember {
    pub pp: [u8; 4],
}

/// Canonical selector bindings. Both are required.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptPpreduceRoles {
    pub attacker: Option<BattleScriptPpreduceBattler>,
    pub target: Option<BattleScriptPpreduceBattler>,
}

/// Complete narrow rules slice read or written by this command.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptPpreduceRules {
    pub battlers: [BattleScriptPpreduceBattlerState; BATTLE_SCRIPT_PPREDUCE_BATTLER_COUNT],
    pub party: [[BattleScriptPpreducePartyMember; BATTLE_SCRIPT_PPREDUCE_PARTY_SIZE]; 2],
    pub selector_roles: BattleScriptPpreduceRoles,
    pub current_move: u16,
    pub current_move_position: u8,
    pub hit_marker: u32,
    pub battlers_count: u8,
}

/// Scheduler projection carrying only the unique pending-controller list this
/// command appends to on a permanent deduct. Shape copied from
/// `battle_script_tryswapitems`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptPpreduceScheduler {
    pub pending_controller_battlers:
        [Option<BattleScriptPpreduceBattler>; BATTLE_SCRIPT_PPREDUCE_BATTLER_COUNT],
    pub pending_count: u8,
}

/// The one event emitted only on a non-TRANSFORMED permanent deduct.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptPpreduceEvent {
    pub battler: BattleScriptPpreduceBattler,
    pub move_position: u8,
    pub pp: u8,
}

/// Complete immutable result of one handler application. `ppreduce` never
/// jumps, blocks, or consumes RNG -- it always advances.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptPpreduceOutcome {
    pub rules: BattleScriptPpreduceRules,
    pub scheduler: BattleScriptPpreduceScheduler,
    /// `Some([event])` only when the deduct gate holds AND the attacker is
    /// not TRANSFORMED; `None` on a blocked deduct or a TRANSFORMED deduct.
    pub events: Option<[BattleScriptPpreduceEvent; 1]>,
}

/// Registration-only instruction projection: `ppreduce` has no operands, so
/// canonical `install` performs no shape validation beyond finding the
/// first matching opcode name.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptPpreduceInstruction<'a> {
    pub opcode_name: &'a str,
    pub opcode_id: u8,
}

/// The one dynamic opcode key emitted by successful registration.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptPpreduceRegistration {
    pub opcode_id: u8,
}

/// Exact observable errors in canonical evaluation order.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptPpreduceError {
    MissingAttackerRole,
    MissingTargetRole,
    UnknownMoveTarget { move_id: u16 },
    HandlerNotRegistered,
}

impl fmt::Display for BattleScriptPpreduceError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::MissingAttackerRole => write!(
                formatter,
                "Battle Script hit-chain command requires a attacker role"
            ),
            Self::MissingTargetRole => write!(
                formatter,
                "Battle Script hit-chain command requires a target role"
            ),
            Self::UnknownMoveTarget { move_id } => write!(
                formatter,
                "move {move_id} has no source-derived gBattleMoves target"
            ),
            Self::HandlerNotRegistered => write!(
                formatter,
                "committed Battle Script program does not emit {BATTLE_SCRIPT_PPREDUCE_OPCODE_NAME}"
            ),
        }
    }
}

impl std::error::Error for BattleScriptPpreduceError {}

/// Native projection of `createBattleScriptHitChainOpcodeHandlers`'s
/// module-local `install`: find the FIRST instruction by opcode name;
/// absence errors verbatim; no other validation (there are no operands to
/// check).
pub fn register_battle_script_ppreduce_handler<'a>(
    instructions: &[BattleScriptPpreduceInstruction<'a>],
) -> Result<BattleScriptPpreduceRegistration, BattleScriptPpreduceError> {
    instructions
        .iter()
        .find(|instruction| instruction.opcode_name == BATTLE_SCRIPT_PPREDUCE_OPCODE_NAME)
        .map(|instruction| BattleScriptPpreduceRegistration { opcode_id: instruction.opcode_id })
        .ok_or(BattleScriptPpreduceError::HandlerNotRegistered)
}

/// Native immutable-value twin of canonical `ppreduceOpcodeHandler`.
pub fn apply_battle_script_ppreduce(
    rules: &BattleScriptPpreduceRules,
    scheduler: &BattleScriptPpreduceScheduler,
) -> Result<BattleScriptPpreduceOutcome, BattleScriptPpreduceError> {
    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptPpreduceError::MissingAttackerRole)?;
    let target = rules
        .selector_roles
        .target
        .ok_or(BattleScriptPpreduceError::MissingTargetRole)?;
    let attacker_state = rules.battlers[attacker.index()];
    let target_state = rules.battlers[target.index()];

    let mut pp_to_deduct: u8 = 1;
    if attacker_state.pp_not_affected_by_pressure != 1 {
        let move_row = MOVES
            .get(usize::from(rules.current_move))
            .ok_or(BattleScriptPpreduceError::UnknownMoveTarget { move_id: rules.current_move })?;
        let move_target = move_row.target;
        let battlers_count = usize::from(rules.battlers_count);
        if move_target & MOVE_TARGET_FOES_AND_ALLY != 0 {
            // MOVE_TARGET_FOES_AND_ALLY -> ABILITYEFFECT_COUNT_ON_FIELD
            // (battle_util.c:3182-3191): every OTHER battler on the field,
            // either side, no hp check. The attacker's own Pressure never
            // counts.
            for i in 0..battlers_count {
                if i != attacker.index()
                    && rules.battlers[i].ability == BATTLE_SCRIPT_PPREDUCE_ABILITY_PRESSURE
                {
                    pp_to_deduct += 1;
                }
            }
        } else if move_target & (MOVE_TARGET_BOTH | MOVE_TARGET_OPPONENTS_FIELD) != 0 {
            // MOVE_TARGET_BOTH/MOVE_TARGET_OPPONENTS_FIELD ->
            // ABILITYEFFECT_COUNT_OTHER_SIDE (battle_util.c:3160-3169):
            // every battler on the opposing side only, no hp check.
            let attacker_side = attacker_state.side;
            for i in 0..battlers_count {
                let candidate = rules.battlers[i];
                if candidate.side != attacker_side
                    && candidate.ability == BATTLE_SCRIPT_PPREDUCE_ABILITY_PRESSURE
                {
                    pp_to_deduct += 1;
                }
            }
        } else if attacker != target
            && target_state.ability == BATTLE_SCRIPT_PPREDUCE_ABILITY_PRESSURE
        {
            pp_to_deduct += 1;
        }
    }

    let slot = usize::from(rules.current_move_position);
    let should_deduct = (rules.hit_marker
        & (BATTLE_SCRIPT_PPREDUCE_HITMARKER_NO_PPDEDUCT
            | BATTLE_SCRIPT_PPREDUCE_HITMARKER_NO_ATTACKSTRING))
        == 0
        && attacker_state.pp[slot] != 0;

    let mut next_rules = *rules;
    let mut next_scheduler = *scheduler;
    let mut events = None;

    if should_deduct {
        let current_pp = attacker_state.pp[slot];
        let next_pp = current_pp.saturating_sub(pp_to_deduct);
        next_rules.battlers[attacker.index()].pp[slot] = next_pp;
        next_rules.battlers[attacker.index()].not_first_strike = 1;

        let party_index = usize::from(attacker_state.party_index);
        next_rules.party[attacker_state.side.index()][party_index].pp[slot] = next_pp;

        let is_permanent =
            (attacker_state.status2 & BATTLE_SCRIPT_PPREDUCE_STATUS2_TRANSFORMED) == 0;
        if is_permanent {
            events = Some([BattleScriptPpreduceEvent {
                battler: attacker,
                move_position: rules.current_move_position,
                pp: next_pp,
            }]);
            let pending_count = usize::from(next_scheduler.pending_count);
            let already_pending = next_scheduler.pending_controller_battlers[..pending_count]
                .contains(&Some(attacker));
            if !already_pending {
                debug_assert!(pending_count < BATTLE_SCRIPT_PPREDUCE_BATTLER_COUNT);
                next_scheduler.pending_controller_battlers[pending_count] = Some(attacker);
                next_scheduler.pending_count += 1;
            }
        }
    }

    // Unconditional, even when shouldDeduct was false (e.g. NO_ATTACKSTRING set).
    next_rules.hit_marker &= !BATTLE_SCRIPT_PPREDUCE_HITMARKER_NO_PPDEDUCT;

    Ok(BattleScriptPpreduceOutcome { rules: next_rules, scheduler: next_scheduler, events })
}

/// Independent source, dispatch, and body evidence.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptPpreduceDecompDispatchEvidence {
    pub opcode_name: &'static str,
    pub opcode_id: u8,
    pub dispatcher: &'static str,
    pub dispatch_line: u32,
    pub forward_decl_line: u32,
    pub handler_line: u32,
    pub header_enum_line: u32,
    pub pp_to_deduct_init_line: u32,
    pub pressure_guard_line: u32,
    pub foes_and_ally_case_line: u32,
    pub foes_and_ally_call_line: u32,
    pub both_case_line: u32,
    pub opponents_field_case_line: u32,
    pub other_side_call_line: u32,
    pub default_increment_line: u32,
    pub deduct_gate_line: u32,
    pub not_first_strike_line: u32,
    pub clamp_line: u32,
    pub move_is_permanent_line: u32,
    pub emit_set_mon_data_line: u32,
    pub mark_controller_exec_line: u32,
    pub hitmarker_clear_line: u32,
    pub advance_line: u32,
    pub macro_declaration_line: u32,
    pub macro_opcode_line: u32,
}

pub const BATTLE_SCRIPT_PPREDUCE_DECOMP_DISPATCH_EVIDENCE:
    BattleScriptPpreduceDecompDispatchEvidence = BattleScriptPpreduceDecompDispatchEvidence {
    opcode_name: BATTLE_SCRIPT_PPREDUCE_OPCODE_NAME,
    opcode_id: BATTLE_SCRIPT_PPREDUCE_OPCODE,
    dispatcher: BATTLE_SCRIPT_PPREDUCE_DISPATCHER,
    dispatch_line: 334,
    forward_decl_line: 82,
    handler_line: 1205,
    header_enum_line: 9,
    pp_to_deduct_init_line: 1207,
    pressure_guard_line: 1212,
    foes_and_ally_case_line: 1216,
    foes_and_ally_call_line: 1217,
    both_case_line: 1219,
    opponents_field_case_line: 1220,
    other_side_call_line: 1221,
    default_increment_line: 1225,
    deduct_gate_line: 1230,
    not_first_strike_line: 1232,
    clamp_line: 1234,
    move_is_permanent_line: 1239,
    emit_set_mon_data_line: 1242,
    mark_controller_exec_line: 1245,
    hitmarker_clear_line: 1249,
    advance_line: 1250,
    macro_declaration_line: 16,
    macro_opcode_line: 17,
};

#[cfg(test)]
mod tests {
    use super::*;

    fn battler(
        side: BattleScriptPpreduceSide,
        party_index: u8,
        pp: [u8; 4],
        ability: u8,
        status2: u32,
        pp_not_affected_by_pressure: u8,
    ) -> BattleScriptPpreduceBattlerState {
        BattleScriptPpreduceBattlerState {
            side,
            party_index,
            pp,
            ability,
            status2,
            pp_not_affected_by_pressure,
            not_first_strike: 0,
        }
    }

    fn member(pp: [u8; 4]) -> BattleScriptPpreducePartyMember {
        BattleScriptPpreducePartyMember { pp }
    }

    fn base_rules() -> BattleScriptPpreduceRules {
        BattleScriptPpreduceRules {
            battlers: [
                battler(
                    BattleScriptPpreduceSide::Player,
                    0,
                    [35, 10, 15, 20],
                    0,
                    0,
                    0,
                ),
                battler(
                    BattleScriptPpreduceSide::Opponent,
                    0,
                    [35, 10, 15, 20],
                    0,
                    0,
                    0,
                ),
                battler(
                    BattleScriptPpreduceSide::Player,
                    1,
                    [35, 10, 15, 20],
                    0,
                    0,
                    0,
                ),
                battler(
                    BattleScriptPpreduceSide::Opponent,
                    1,
                    [35, 10, 15, 20],
                    0,
                    0,
                    0,
                ),
            ],
            party: [
                [
                    member([35, 10, 15, 20]),
                    member([1, 2, 3, 4]),
                    member([5, 6, 7, 8]),
                ],
                [
                    member([35, 10, 15, 20]),
                    member([9, 10, 11, 12]),
                    member([13, 14, 15, 16]),
                ],
            ],
            selector_roles: BattleScriptPpreduceRoles {
                attacker: Some(BattleScriptPpreduceBattler::Battler0),
                target: Some(BattleScriptPpreduceBattler::Battler1),
            },
            current_move: 33, // MOVE_TACKLE: MOVE_TARGET_SELECTED (0)
            current_move_position: 0,
            hit_marker: 0,
            battlers_count: 2,
        }
    }

    fn empty_scheduler() -> BattleScriptPpreduceScheduler {
        BattleScriptPpreduceScheduler { pending_controller_battlers: [None; 4], pending_count: 0 }
    }

    #[test]
    fn baseline_no_pressure_deducts_exactly_one() {
        let rules = base_rules();
        let outcome = apply_battle_script_ppreduce(&rules, &empty_scheduler()).unwrap();
        assert_eq!(outcome.rules.battlers[0].pp[0], 34);
        assert_eq!(outcome.rules.battlers[0].not_first_strike, 1);
        assert_eq!(outcome.rules.party[0][0].pp[0], 34);
    }

    #[test]
    fn default_target_pressure_adds_one_but_self_target_does_not() {
        let mut with_target_pressure = base_rules();
        with_target_pressure.battlers[1].ability = BATTLE_SCRIPT_PPREDUCE_ABILITY_PRESSURE;
        let outcome =
            apply_battle_script_ppreduce(&with_target_pressure, &empty_scheduler()).unwrap();
        assert_eq!(outcome.rules.battlers[0].pp[0], 33); // 35 - 2

        let mut self_target = base_rules();
        self_target.selector_roles.target = Some(BattleScriptPpreduceBattler::Battler0);
        self_target.battlers[0].ability = BATTLE_SCRIPT_PPREDUCE_ABILITY_PRESSURE;
        let outcome = apply_battle_script_ppreduce(&self_target, &empty_scheduler()).unwrap();
        assert_eq!(outcome.rules.battlers[0].pp[0], 34); // still just 1
    }

    #[test]
    fn foes_and_ally_counts_every_other_battler_but_not_attacker() {
        let mut rules = base_rules();
        rules.battlers_count = 4;
        rules.current_move = 89; // MOVE_EARTHQUAKE: MOVE_TARGET_FOES_AND_ALLY
        rules.battlers[0].ability = BATTLE_SCRIPT_PPREDUCE_ABILITY_PRESSURE; // attacker: ignored
        rules.battlers[1].ability = BATTLE_SCRIPT_PPREDUCE_ABILITY_PRESSURE; // opponent: counted
        rules.battlers[2].ability = BATTLE_SCRIPT_PPREDUCE_ABILITY_PRESSURE; // ally: counted
        rules.battlers[3].ability = 0;
        let outcome = apply_battle_script_ppreduce(&rules, &empty_scheduler()).unwrap();
        assert_eq!(outcome.rules.battlers[0].pp[0], 32); // 35 - (1+2)
    }

    #[test]
    fn both_and_opponents_field_count_only_opposing_side_including_ally_exclusion() {
        let mut rules = base_rules();
        rules.battlers_count = 4;
        rules.current_move = 57; // MOVE_SURF: MOVE_TARGET_BOTH
        rules.battlers[1].ability = BATTLE_SCRIPT_PPREDUCE_ABILITY_PRESSURE; // opposing: counted
        rules.battlers[3].ability = BATTLE_SCRIPT_PPREDUCE_ABILITY_PRESSURE; // opposing: counted
        rules.battlers[2].ability = BATTLE_SCRIPT_PPREDUCE_ABILITY_PRESSURE; // ally: NOT counted
        let outcome = apply_battle_script_ppreduce(&rules, &empty_scheduler()).unwrap();
        assert_eq!(outcome.rules.battlers[0].pp[0], 32); // 35 - (1+2)
    }

    #[test]
    fn pp_not_affected_by_pressure_only_skips_ladder_when_exactly_one() {
        let mut rules = base_rules();
        rules.battlers[1].ability = BATTLE_SCRIPT_PPREDUCE_ABILITY_PRESSURE;
        rules.battlers[0].pp_not_affected_by_pressure = 1;
        let outcome = apply_battle_script_ppreduce(&rules, &empty_scheduler()).unwrap();
        assert_eq!(outcome.rules.battlers[0].pp[0], 34); // ladder skipped: deduct 1

        rules.battlers[0].pp_not_affected_by_pressure = 2; // truthy but not === 1
        let outcome = apply_battle_script_ppreduce(&rules, &empty_scheduler()).unwrap();
        assert_eq!(outcome.rules.battlers[0].pp[0], 33); // ladder still runs: deduct 2
    }

    #[test]
    fn deduct_gate_blocks_on_no_ppdeduct_no_attackstring_and_zero_pp_but_always_clears_flag() {
        let mut no_ppdeduct = base_rules();
        no_ppdeduct.hit_marker = BATTLE_SCRIPT_PPREDUCE_HITMARKER_NO_PPDEDUCT;
        let outcome = apply_battle_script_ppreduce(&no_ppdeduct, &empty_scheduler()).unwrap();
        assert_eq!(outcome.rules.battlers[0].pp[0], 35); // unchanged
        assert_eq!(outcome.rules.hit_marker, 0); // still cleared

        let mut no_attackstring = base_rules();
        no_attackstring.hit_marker = BATTLE_SCRIPT_PPREDUCE_HITMARKER_NO_ATTACKSTRING;
        let outcome = apply_battle_script_ppreduce(&no_attackstring, &empty_scheduler()).unwrap();
        assert_eq!(outcome.rules.battlers[0].pp[0], 35);
        assert_eq!(
            outcome.rules.hit_marker,
            BATTLE_SCRIPT_PPREDUCE_HITMARKER_NO_ATTACKSTRING
        );

        let mut zero_pp = base_rules();
        zero_pp.battlers[0].pp[0] = 0;
        let outcome = apply_battle_script_ppreduce(&zero_pp, &empty_scheduler()).unwrap();
        assert_eq!(outcome.rules.battlers[0].pp[0], 0);
        assert_eq!(outcome.rules.battlers[0].not_first_strike, 0);
    }

    #[test]
    fn clamp_never_wraps_below_zero() {
        let mut rules = base_rules();
        rules.battlers[0].pp[0] = 1;
        rules.battlers[1].ability = BATTLE_SCRIPT_PPREDUCE_ABILITY_PRESSURE; // pp_to_deduct=2
        let outcome = apply_battle_script_ppreduce(&rules, &empty_scheduler()).unwrap();
        assert_eq!(outcome.rules.battlers[0].pp[0], 0);
    }

    #[test]
    fn every_move_position_slot_is_independently_addressable() {
        let original_pp = base_rules().battlers[0].pp;
        for slot in 0u8..4 {
            let mut rules = base_rules();
            rules.current_move_position = slot;
            let outcome = apply_battle_script_ppreduce(&rules, &empty_scheduler()).unwrap();
            for (index, value) in outcome.rules.battlers[0].pp.iter().enumerate() {
                if index == usize::from(slot) {
                    assert_eq!(*value, original_pp[index] - 1);
                } else {
                    assert_eq!(*value, original_pp[index]);
                }
            }
        }
    }

    #[test]
    fn transformed_attacker_deducts_and_mirrors_but_emits_no_event_and_no_pending() {
        let mut rules = base_rules();
        rules.battlers[0].status2 = BATTLE_SCRIPT_PPREDUCE_STATUS2_TRANSFORMED;
        let outcome = apply_battle_script_ppreduce(&rules, &empty_scheduler()).unwrap();
        assert_eq!(outcome.rules.battlers[0].pp[0], 34);
        assert_eq!(outcome.rules.party[0][0].pp[0], 34);
        assert_eq!(outcome.events, None);
        assert_eq!(outcome.scheduler.pending_count, 0);
    }

    #[test]
    fn non_transformed_attacker_emits_exact_event_and_marks_pending() {
        let rules = base_rules();
        let outcome = apply_battle_script_ppreduce(&rules, &empty_scheduler()).unwrap();
        assert_eq!(
            outcome.events,
            Some([BattleScriptPpreduceEvent {
                battler: BattleScriptPpreduceBattler::Battler0,
                move_position: 0,
                pp: 34,
            }])
        );
        assert_eq!(outcome.scheduler.pending_count, 1);
        assert_eq!(
            outcome.scheduler.pending_controller_battlers[0],
            Some(BattleScriptPpreduceBattler::Battler0)
        );
    }

    #[test]
    fn already_pending_attacker_is_not_duplicated() {
        let rules = base_rules();
        let mut scheduler = empty_scheduler();
        scheduler.pending_controller_battlers[0] = Some(BattleScriptPpreduceBattler::Battler0);
        scheduler.pending_count = 1;
        let outcome = apply_battle_script_ppreduce(&rules, &scheduler).unwrap();
        assert_eq!(outcome.scheduler.pending_count, 1);
    }

    #[test]
    fn missing_roles_and_unknown_move_produce_exact_errors() {
        let mut missing_attacker = base_rules();
        missing_attacker.selector_roles.attacker = None;
        assert_eq!(
            apply_battle_script_ppreduce(&missing_attacker, &empty_scheduler())
                .unwrap_err()
                .to_string(),
            "Battle Script hit-chain command requires a attacker role"
        );

        let mut missing_target = base_rules();
        missing_target.selector_roles.target = None;
        assert_eq!(
            apply_battle_script_ppreduce(&missing_target, &empty_scheduler())
                .unwrap_err()
                .to_string(),
            "Battle Script hit-chain command requires a target role"
        );

        let mut unknown_move = base_rules();
        unknown_move.current_move = 60_000;
        assert_eq!(
            apply_battle_script_ppreduce(&unknown_move, &empty_scheduler())
                .unwrap_err()
                .to_string(),
            "move 60000 has no source-derived gBattleMoves target"
        );
    }

    #[test]
    fn registration_finds_first_and_reports_verbatim_absence() {
        let present = [
            BattleScriptPpreduceInstruction {
                opcode_name: "B_SCR_OP_ATTACKSTRING",
                opcode_id: 0x02,
            },
            BattleScriptPpreduceInstruction {
                opcode_name: BATTLE_SCRIPT_PPREDUCE_OPCODE_NAME,
                opcode_id: BATTLE_SCRIPT_PPREDUCE_OPCODE,
            },
            BattleScriptPpreduceInstruction {
                opcode_name: BATTLE_SCRIPT_PPREDUCE_OPCODE_NAME,
                opcode_id: 0x99,
            },
        ];
        assert_eq!(
            register_battle_script_ppreduce_handler(&present)
                .unwrap()
                .opcode_id,
            BATTLE_SCRIPT_PPREDUCE_OPCODE
        );

        let absent = [BattleScriptPpreduceInstruction {
            opcode_name: "B_SCR_OP_ATTACKSTRING",
            opcode_id: 0x02,
        }];
        assert_eq!(
            register_battle_script_ppreduce_handler(&absent)
                .unwrap_err()
                .to_string(),
            "committed Battle Script program does not emit B_SCR_OP_PPREDUCE"
        );
    }

    #[test]
    fn battler_ids_round_trip_from_u8() {
        for battler in BATTLE_SCRIPT_PPREDUCE_BATTLERS {
            assert_eq!(
                BattleScriptPpreduceBattler::from_u8(battler.as_u8()),
                Some(battler)
            );
        }
        assert_eq!(BattleScriptPpreduceBattler::from_u8(4), None);
    }
}
