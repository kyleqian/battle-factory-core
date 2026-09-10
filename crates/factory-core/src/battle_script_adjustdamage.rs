//! Pure `B_SCR_OP_ADJUSTNORMALDAMAGE` (0x07, `Cmd_adjustnormaldamage`),
//! `B_SCR_OP_ADJUSTNORMALDAMAGE2` (0x08, `Cmd_adjustnormaldamage2`), and
//! `B_SCR_OP_ADJUSTSETDAMAGE` (0x69, `Cmd_adjustsetdamage`) Battle Script
//! opcode leaves -- the native twins of the shared
//! `adjustNormalDamageOpcodeHandler(context, includeFalseSwipe)` body
//! (`src/engine/battleScriptHitChainOpcode.ts:1999-2076`, doc comment
//! `:1999-2009`) and `adjustsetdamageOpcodeHandler`
//! (`:2126-2199`, doc comment `:2126-2132`). This is the SECOND
//! RNG-drawing battle-script leaf family; it reuses the M77 `critcalc`
//! `drawBattleScriptRng` projection exactly.
//!
//! ## drawBattleScriptRng projection (reused verbatim from M77)
//! See `battle_script_critcalc.rs`'s module doc comment for the full
//! projection contract. The RNG input/output crosses as
//! [`BattleScriptAdjustDamageRngState`] (`value`, `calls`); the TS ledger
//! array itself does NOT cross. Each draw performs
//! `after = advance_rng_value(value)`,
//! `random_value = ((after >> 16) & 0xffff) as u16` natively, and produces a
//! [`BattleScriptAdjustDamageRngDraw`] mirroring the TS ledger entry
//! verbatim (`call`, `reason`, `before`, `after`, `random_value`, six-field
//! [`BattleScriptAdjustDamageProvenance`]).
//!
//! Unlike `critcalc` (which draws exactly zero or one time), an execution
//! here can emit ZERO, ONE, or TWO draws **in order**: the variance draw
//! first (only on the two `adjustnormaldamage*` opcodes), then the Focus
//! Band draw (only when the target's resolved hold effect is Focus Band).
//! The outcome carries them as an ordered
//! `Vec<`[`BattleScriptAdjustDamageRngDraw`]`>` (chosen over a fixed
//! two-slot `Option` pair because the pairing differs per opcode --
//! `adjustsetdamage` never has a variance slot at all -- and a flat
//! consumption-ordered list avoids a per-opcode slot-meaning table);
//! `calls` increments by one per draw, in draw order.
//!
//! ## Evaluation order (exact; each step's error preempts later ones)
//! 1. `requireBattlerRole(rules, "target")` -- `"Battle Script hit-chain
//!    command requires a target role"`. NOTE: no attacker role is ever
//!    required by any of the three opcodes, and (on the two
//!    `adjustnormaldamage*` opcodes) the variance draw precedes every other
//!    observable effect.
//! 2. `adjustnormaldamage`/`adjustnormaldamage2` only: variance draw with
//!    reason literal `"adjustnormaldamage"` / `"adjustnormaldamage2"`;
//!    `damage = apply_random_damage_multiplier(battle_move_damage,
//!    random_value)`. `adjustsetdamage` skips this step entirely; `damage`
//!    starts at `battle_move_damage` unmodified.
//! 3. `focus_banded := target.special_status_focus_banded == 1`
//!    (pre-existing bit; source `gSpecialStatuses[gBattlerTarget].focusBanded`).
//! 4. [`resolve_battler_hold_effect`] on the target; its own
//!    `ItemOutOfRange` propagates verbatim. If the resolved id equals
//!    `HOLD_EFFECT_FOCUS_BAND` (39, `hold_effects.h:43`): a SECOND draw with
//!    reason `"<base>-focus-band"`
//!    (`"adjustnormaldamage-focus-band"` / `"adjustnormaldamage2-focus-band"`
//!    / `"adjustsetdamage-focus-band"`); if
//!    `random_value % 100 < resolve_battler_hold_effect_param(rules,
//!    target)`: `focus_banded := true`, the target's
//!    `special_status_focus_banded` is written to 1, and
//!    [`record_battle_script_item_effect_reveal`] fires for the target with
//!    hold effect 39. A NON-holder draws nothing; a holder ALWAYS draws --
//!    even when damage is non-lethal, and even when the pre-existing bit is
//!    already 1 (both pinned by the generated corpus).
//! 5. `false_swipe_applies`:
//!    - `adjustnormaldamage` (0x07): `requireMoveRow(current_move).effect ==
//!      EFFECT_FALSE_SWIPE` (101, `battle_move_effects.h:105`) --
//!      `requireMoveRow` is reached HERE, AFTER both possible draws, and its
//!      "no source-derived gBattleMoves row" error can fire even with no
//!      Focus Band holder present.
//!    - `adjustnormaldamage2` (0x08): always `false`; `requireMoveRow` is
//!      NEVER called (an unknown `current_move` does not error under 0x08).
//!    - `adjustsetdamage` (0x69): `requireMoveRow(current_move).effect ==
//!      EFFECT_FALSE_SWIPE`, called UNCONDITIONALLY (no `includeFalseSwipe`
//!      gate at all) -- an unknown `current_move` errors even when no Focus
//!      Band holder is present.
//! 6. Clamp: if `!(target.status2 & STATUS2_SUBSTITUTE (1<<24,
//!    `include/constants/battle.h:148`)) && (false_swipe_applies ||
//!    target.endured == 1 || focus_banded) && target.hp <= damage`:
//!    `damage := target.hp - 1`; then if `endured == 1`:
//!    `move_result_flags |= MOVE_RESULT_FOE_ENDURED` (1<<6,
//!    `battle.h:226`); else if `focus_banded`: `move_result_flags |=
//!    MOVE_RESULT_FOE_HUNG_ON` (1<<7, `battle.h:227`) and `last_used_item :=
//!    target.item`. Endured wins over focusBanded when both are set --
//!    pinned by a dedicated case.
//! 7. Outcome: rules with `battle_move_damage`/`move_result_flags`/
//!    `last_used_item`/target `special_status_focus_banded` write-back, RNG
//!    after all draws, the ordered ledger of draws, always advance. No other
//!    branch.
//!
//! Source authority:
//! - `Cmd_adjustnormaldamage`: `reference/pokeemerald/src/battle_script_commands.c:1658-1698`.
//! - `Cmd_adjustnormaldamage2`: `:1701-1741` (source comment `:1700` --
//!   "The same as adjustnormaldamage except it doesn't check for false
//!   swipe move effect").
//! - `Cmd_adjustsetdamage`: `:5861-5899` (source comment `:5860` -- "The
//!   same as adjustnormaldamage, except there's no random damage
//!   multiplier").
//! - `ApplyRandomDmgMultiplier`: `:1639-1651` (already ported as
//!   [`crate::damage_calc::apply_random_damage_multiplier`], M75).
//! - Dispatch rows: `:338` (`[B_SCR_OP_ADJUSTNORMALDAMAGE] =
//!   Cmd_adjustnormaldamage, //0x7`), `:339` (`//0x8`), `:436` (`//0x69`).
//! - Forward declarations: `:86` (`Cmd_adjustnormaldamage`), `:87`
//!   (`Cmd_adjustnormaldamage2`), `:184` (`Cmd_adjustsetdamage`).
//! - Opcode enum positions: `include/constants/battle_script_commands.h:13`
//!   (`B_SCR_OP_ADJUSTNORMALDAMAGE`), `:14`
//!   (`B_SCR_OP_ADJUSTNORMALDAMAGE2`), `:111` (`B_SCR_OP_ADJUSTSETDAMAGE`).
//! - Macros: `asm/macros/battle_script.inc:32` (`adjustnormaldamage`, a
//!   single `.byte B_SCR_OP_ADJUSTNORMALDAMAGE`, no operand), `:36`
//!   (`adjustnormaldamage2`, same shape), `:603` (`adjustsetdamage`, same
//!   shape).
//! - Call sites in `data/battle_scripts_1.s` (grep counts): 12 bare
//!   `adjustnormaldamage` (first `:252`), 2 bare `adjustnormaldamage2`
//!   (first `:3517`), 9 bare `adjustsetdamage` (first `:827`).
//! - `MOVE_RESULT_FOE_ENDURED` / `MOVE_RESULT_FOE_HUNG_ON`:
//!   `include/constants/battle.h:226-227`. `STATUS2_SUBSTITUTE`:
//!   `include/constants/battle.h:148`. `HOLD_EFFECT_FOCUS_BAND`:
//!   `include/constants/hold_effects.h:43`. `EFFECT_FALSE_SWIPE`:
//!   `include/constants/battle_move_effects.h:105`.
//! - The C source's `gPotentialItemEffectBattler = gBattlerTarget` write on
//!   every one of the three handlers is presentation-side state the
//!   canonical TypeScript handlers do not model; this port omits it for the
//!   same reason critcalc omits the attacker-side write.
//!
//! This leaf deliberately owns neither a generic machine, scheduler/event
//! transport, presentation, nor the WASM ABI.

use core::fmt;

use crate::battle_script_ai_reveal::{
    record_battle_script_item_effect_reveal, BattleScriptAiRevealBattler, BattleScriptAiRevealRules,
};
use crate::battle_script_base_damage::{
    resolve_battler_hold_effect, resolve_battler_hold_effect_param, BattleScriptBaseDamageBattler,
    BattleScriptBaseDamageBattlerState, BattleScriptBaseDamageError, BattleScriptBaseDamageRoles,
    BattleScriptBaseDamageRules,
};
use crate::damage_calc::{apply_random_damage_multiplier, StatStages};
use crate::gen_tables::MOVES;
use crate::rng::advance_rng_value;

/// Source `MAX_BATTLERS_COUNT`; all source-indexed state retains four cells.
pub const BATTLE_SCRIPT_ADJUSTDAMAGE_BATTLER_COUNT: usize = 4;

/// `B_SCR_OP_ADJUSTNORMALDAMAGE` in the source command enum / dispatch table.
pub const BATTLE_SCRIPT_ADJUSTNORMALDAMAGE_OPCODE: u8 = 0x07;
pub const BATTLE_SCRIPT_ADJUSTNORMALDAMAGE_OPCODE_NAME: &str = "B_SCR_OP_ADJUSTNORMALDAMAGE";
pub const BATTLE_SCRIPT_ADJUSTNORMALDAMAGE_DISPATCHER: &str = "Cmd_adjustnormaldamage";

/// `B_SCR_OP_ADJUSTNORMALDAMAGE2` in the source command enum / dispatch table.
pub const BATTLE_SCRIPT_ADJUSTNORMALDAMAGE2_OPCODE: u8 = 0x08;
pub const BATTLE_SCRIPT_ADJUSTNORMALDAMAGE2_OPCODE_NAME: &str = "B_SCR_OP_ADJUSTNORMALDAMAGE2";
pub const BATTLE_SCRIPT_ADJUSTNORMALDAMAGE2_DISPATCHER: &str = "Cmd_adjustnormaldamage2";

/// `B_SCR_OP_ADJUSTSETDAMAGE` in the source command enum / dispatch table.
pub const BATTLE_SCRIPT_ADJUSTSETDAMAGE_OPCODE: u8 = 0x69;
pub const BATTLE_SCRIPT_ADJUSTSETDAMAGE_OPCODE_NAME: &str = "B_SCR_OP_ADJUSTSETDAMAGE";
pub const BATTLE_SCRIPT_ADJUSTSETDAMAGE_DISPATCHER: &str = "Cmd_adjustsetdamage";

/// Every family member's encoded byte width: opcode byte only, no operand.
pub const BATTLE_SCRIPT_ADJUSTDAMAGE_ENCODED_WIDTH_BYTES: u8 = 1;

/// `include/constants/hold_effects.h:43`.
pub const BATTLE_SCRIPT_ADJUSTDAMAGE_HOLD_EFFECT_FOCUS_BAND: u16 = 39;
/// `include/constants/battle.h:148`.
pub const BATTLE_SCRIPT_ADJUSTDAMAGE_STATUS2_SUBSTITUTE: u32 = 1 << 24;
/// `include/constants/battle.h:226`.
pub const BATTLE_SCRIPT_ADJUSTDAMAGE_MOVE_RESULT_FOE_ENDURED: u32 = 1 << 6;
/// `include/constants/battle.h:227`.
pub const BATTLE_SCRIPT_ADJUSTDAMAGE_MOVE_RESULT_FOE_HUNG_ON: u32 = 1 << 7;
/// `include/constants/battle_move_effects.h:105`.
pub const BATTLE_SCRIPT_ADJUSTDAMAGE_EFFECT_FALSE_SWIPE: u16 = 101;

/// `hitChainOpcode.ts:1481`-style literal reasons, one per opcode/draw kind.
pub const BATTLE_SCRIPT_ADJUSTNORMALDAMAGE_RNG_REASON: &str = "adjustnormaldamage";
pub const BATTLE_SCRIPT_ADJUSTNORMALDAMAGE_FOCUS_BAND_RNG_REASON: &str =
    "adjustnormaldamage-focus-band";
pub const BATTLE_SCRIPT_ADJUSTNORMALDAMAGE2_RNG_REASON: &str = "adjustnormaldamage2";
pub const BATTLE_SCRIPT_ADJUSTNORMALDAMAGE2_FOCUS_BAND_RNG_REASON: &str =
    "adjustnormaldamage2-focus-band";
pub const BATTLE_SCRIPT_ADJUSTSETDAMAGE_FOCUS_BAND_RNG_REASON: &str = "adjustsetdamage-focus-band";

/// Complete source battler-id domain used by roles and source-indexed arrays.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptAdjustDamageBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

impl BattleScriptAdjustDamageBattler {
    #[must_use]
    pub const fn index(self) -> usize {
        self as usize
    }

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

    /// Native twin of `BattleScriptBaseDamageBattler` -- both enums share
    /// the same four-slot source domain, so conversion is an identity
    /// re-tag rather than a lookup.
    #[must_use]
    pub const fn as_base_damage_battler(self) -> BattleScriptBaseDamageBattler {
        match self {
            Self::Battler0 => BattleScriptBaseDamageBattler::Battler0,
            Self::Battler1 => BattleScriptBaseDamageBattler::Battler1,
            Self::Battler2 => BattleScriptBaseDamageBattler::Battler2,
            Self::Battler3 => BattleScriptBaseDamageBattler::Battler3,
        }
    }

    /// Native twin of `BattleScriptAiRevealBattler`, same identity re-tag.
    #[must_use]
    pub const fn as_ai_reveal_battler(self) -> BattleScriptAiRevealBattler {
        match self {
            Self::Battler0 => BattleScriptAiRevealBattler::Battler0,
            Self::Battler1 => BattleScriptAiRevealBattler::Battler1,
            Self::Battler2 => BattleScriptAiRevealBattler::Battler2,
            Self::Battler3 => BattleScriptAiRevealBattler::Battler3,
        }
    }
}

/// The complete per-battler projection this leaf reads or writes. Only the
/// target's fields are ever read/written, but every battler carries the
/// same uniform shape (matching the sibling leaves' convention).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptAdjustDamageBattlerState {
    pub item: u16,
    pub status2: u32,
    pub hp: i32,
    /// Source `gProtectStructs[battler].endured`; 0 or 1.
    pub endured: u8,
    /// Source `gSpecialStatuses[battler].focusBanded`; 0 or 1.
    pub special_status_focus_banded: u8,
}

/// Canonical selector bindings; only `target` is ever read.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptAdjustDamageRoles {
    pub target: Option<BattleScriptAdjustDamageBattler>,
}

/// Complete narrow rules slice this leaf reads or writes. No scheduler and
/// no events -- the canonical handlers emit neither.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptAdjustDamageRules {
    pub battlers: [BattleScriptAdjustDamageBattlerState; BATTLE_SCRIPT_ADJUSTDAMAGE_BATTLER_COUNT],
    pub current_move: u16,
    /// Source `gBattleMoveDamage`; input starting value and the field this
    /// leaf ultimately overwrites.
    pub battle_move_damage: i32,
    pub move_result_flags: u32,
    pub last_used_item: u16,
    /// Per-battler `BattleEnigmaBerry` override, forwarded verbatim to
    /// [`resolve_battler_hold_effect`]/[`resolve_battler_hold_effect_param`].
    pub enigma_berry_hold_effects: [u16; BATTLE_SCRIPT_ADJUSTDAMAGE_BATTLER_COUNT],
    pub enigma_berry_hold_effect_params: [i32; BATTLE_SCRIPT_ADJUSTDAMAGE_BATTLER_COUNT],
    /// The shared identity-preserving AI observation overlay this leaf
    /// writes through on a successful Focus Band reveal.
    pub ai_reveal: BattleScriptAiRevealRules,
    pub selector_roles: BattleScriptAdjustDamageRoles,
}

/// The projected `{ value, calls }` RNG crossing (see the module doc
/// comment's projection section, reused verbatim from `critcalc`). The TS
/// ledger array does NOT cross.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptAdjustDamageRngState {
    pub value: u32,
    pub calls: u32,
}

/// Mirrors `instructionProvenance`'s six fields
/// (`battleScriptMachine.ts:275-287`) verbatim.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BattleScriptAdjustDamageProvenance {
    pub program_counter: u32,
    pub opcode_id: u8,
    pub opcode_name: String,
    pub dispatcher: String,
    pub source_label: String,
    pub source_statement_line: u32,
}

/// Mirrors one `BattleScriptRngLedgerEntry` (`battleScriptMachine.ts:138-145`)
/// verbatim.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BattleScriptAdjustDamageRngDraw {
    pub call: u32,
    pub reason: &'static str,
    pub before: u32,
    pub after: u32,
    pub random_value: u16,
    pub provenance: BattleScriptAdjustDamageProvenance,
}

/// One committed-program instruction, used for BOTH registration (find-first
/// by `opcode_name`, ignoring every other field, per opcode) and, for the
/// single executing instruction passed to the `apply_*` functions, the
/// source of every provenance field on a real draw. No shape or cardinality
/// validation exists at registration or execution.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptAdjustDamageInstruction<'a> {
    pub opcode_name: &'a str,
    pub opcode_id: u8,
    pub program_counter: u32,
    pub dispatcher: &'a str,
    pub source_label: &'a str,
    pub source_statement_line: u32,
}

/// Exact observable errors in canonical evaluation order.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptAdjustDamageError {
    /// `requireBattlerRole(rulesContext, "target")`.
    MissingTargetRole,
    /// `resolveBattleScriptBattlerHoldEffect(Param)`'s own item-range check
    /// (`battleScriptRulesContext.ts:1647-1677`), forwarded verbatim from
    /// [`resolve_battler_hold_effect`].
    ItemOutOfRange { item: u16 },
    /// `requireMoveRow` -- reached only where the module doc comment's
    /// evaluation order says so (0x07/0x69 always when reached; 0x08 never).
    UnknownMoveRow { move_id: u16 },
}

impl fmt::Display for BattleScriptAdjustDamageError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::MissingTargetRole => write!(
                formatter,
                "Battle Script hit-chain command requires a target role"
            ),
            Self::ItemOutOfRange { item } => {
                write!(formatter, "item {item} is outside the source gItems corpus")
            }
            Self::UnknownMoveRow { move_id } => write!(
                formatter,
                "accuracycheck/ppreduce: move {move_id} has no source-derived gBattleMoves row"
            ),
        }
    }
}

impl std::error::Error for BattleScriptAdjustDamageError {}

/// `committed Battle Script program does not emit <opcode_name>`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptAdjustDamageRegistrationError {
    pub opcode_name: &'static str,
}

impl fmt::Display for BattleScriptAdjustDamageRegistrationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            formatter,
            "committed Battle Script program does not emit {}",
            self.opcode_name
        )
    }
}

impl std::error::Error for BattleScriptAdjustDamageRegistrationError {}

/// The three resolved opcode ids after find-first registration of all three
/// family members.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptAdjustDamageRegistration {
    pub adjustnormaldamage_opcode_id: u8,
    pub adjustnormaldamage2_opcode_id: u8,
    pub adjustsetdamage_opcode_id: u8,
}

fn register_family_member<'a>(
    instructions: &[BattleScriptAdjustDamageInstruction<'a>],
    opcode_name: &'static str,
) -> Result<u8, BattleScriptAdjustDamageRegistrationError> {
    instructions
        .iter()
        .find(|instruction| instruction.opcode_name == opcode_name)
        .map(|instruction| instruction.opcode_id)
        .ok_or(BattleScriptAdjustDamageRegistrationError { opcode_name })
}

/// Native projection of the three `install(...)` lines inside
/// `createBattleScriptHitChainOpcodeHandlers`
/// (`battleScriptHitChainOpcode.ts:4722,4723,4725`): find the FIRST
/// instruction with each opcode name -- no shape or cardinality validation,
/// exactly like `critcalc`. Resolves all three in declaration order
/// (0x07, 0x08, 0x69); the first missing name's error wins.
pub fn register_battle_script_adjustdamage_handlers<'a>(
    instructions: &[BattleScriptAdjustDamageInstruction<'a>],
) -> Result<BattleScriptAdjustDamageRegistration, BattleScriptAdjustDamageRegistrationError> {
    Ok(BattleScriptAdjustDamageRegistration {
        adjustnormaldamage_opcode_id: register_family_member(
            instructions,
            BATTLE_SCRIPT_ADJUSTNORMALDAMAGE_OPCODE_NAME,
        )?,
        adjustnormaldamage2_opcode_id: register_family_member(
            instructions,
            BATTLE_SCRIPT_ADJUSTNORMALDAMAGE2_OPCODE_NAME,
        )?,
        adjustsetdamage_opcode_id: register_family_member(
            instructions,
            BATTLE_SCRIPT_ADJUSTSETDAMAGE_OPCODE_NAME,
        )?,
    })
}

/// Adapter to the shared hold-effect helper: [`resolve_battler_hold_effect`]/
/// [`resolve_battler_hold_effect_param`] only ever read a battler's `.item`
/// and the two `enigma_berry_hold_effect*` arrays, so every other field on
/// this placeholder is inert.
fn to_base_damage_rules_for_hold_effect(
    rules: &BattleScriptAdjustDamageRules,
) -> BattleScriptBaseDamageRules {
    BattleScriptBaseDamageRules {
        battlers: rules
            .battlers
            .map(|battler| BattleScriptBaseDamageBattlerState {
                item: battler.item,
                ability: 0,
                species: 0,
                types: [0, 0],
                level: 0,
                attack: 0,
                defense: 0,
                sp_attack: 0,
                sp_defense: 0,
                stat_stages: StatStages { atk: 0, def: 0, sp_atk: 0, sp_def: 0 },
                hp: 0,
                max_hp: 0,
                status1: 0,
                status3: 0,
                flash_fire_boosted: 0,
            }),
        battlers_count: 0,
        battle_type_flags: 0,
        weather: 0,
        current_move: 0,
        dynamic_base_power: 0,
        dynamic_move_type: 0,
        crit_multiplier: 0,
        selector_roles: BattleScriptBaseDamageRoles { attacker: None, target: None },
        enigma_berry_hold_effects: rules.enigma_berry_hold_effects,
        enigma_berry_hold_effect_params: rules.enigma_berry_hold_effect_params,
    }
}

/// The complete leaf output: the rules with `battle_move_damage`/
/// `move_result_flags`/`last_used_item`/target `special_status_focus_banded`
/// written back, the RNG state after every draw, and the ordered draws that
/// actually occurred (see the module doc comment's projection section for
/// why this is a `Vec` rather than a fixed slot pair).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BattleScriptAdjustDamageOutcome {
    pub rules: BattleScriptAdjustDamageRules,
    pub rng: BattleScriptAdjustDamageRngState,
    pub draws: Vec<BattleScriptAdjustDamageRngDraw>,
}

fn draw_battle_script_adjustdamage_rng(
    rng: BattleScriptAdjustDamageRngState,
    reason: &'static str,
    instruction: &BattleScriptAdjustDamageInstruction<'_>,
) -> (
    BattleScriptAdjustDamageRngState,
    BattleScriptAdjustDamageRngDraw,
) {
    let after = advance_rng_value(rng.value);
    let random_value = ((after >> 16) & 0xffff) as u16;
    let call = rng.calls + 1;
    let draw = BattleScriptAdjustDamageRngDraw {
        call,
        reason,
        before: rng.value,
        after,
        random_value,
        provenance: BattleScriptAdjustDamageProvenance {
            program_counter: instruction.program_counter,
            opcode_id: instruction.opcode_id,
            opcode_name: instruction.opcode_name.to_owned(),
            dispatcher: instruction.dispatcher.to_owned(),
            source_label: instruction.source_label.to_owned(),
            source_statement_line: instruction.source_statement_line,
        },
    };
    (
        BattleScriptAdjustDamageRngState { value: after, calls: call },
        draw,
    )
}

/// The shared core evaluated by all three exported `apply_*` functions --
/// see the module doc comment's evaluation order for the exact ordered
/// contract. `variance_reason` is `Some` only for the two
/// `adjustnormaldamage*` opcodes (which draw the variance roll before
/// anything else); `call_require_move_row` mirrors each opcode's own
/// `includeFalseSwipe`/unconditional-call wiring exactly.
fn apply_battle_script_adjustdamage_core(
    rules: &BattleScriptAdjustDamageRules,
    rng: BattleScriptAdjustDamageRngState,
    instruction: &BattleScriptAdjustDamageInstruction<'_>,
    variance_reason: Option<&'static str>,
    focus_band_reason: &'static str,
    call_require_move_row: bool,
) -> Result<BattleScriptAdjustDamageOutcome, BattleScriptAdjustDamageError> {
    let target = rules
        .selector_roles
        .target
        .ok_or(BattleScriptAdjustDamageError::MissingTargetRole)?;

    let mut rng_state = rng;
    let mut draws = Vec::new();
    let mut damage = rules.battle_move_damage;

    if let Some(reason) = variance_reason {
        let (next_rng, draw) = draw_battle_script_adjustdamage_rng(rng_state, reason, instruction);
        damage = apply_random_damage_multiplier(damage, draw.random_value);
        rng_state = next_rng;
        draws.push(draw);
    }

    let target_state = rules.battlers[target.index()];
    let mut focus_banded = target_state.special_status_focus_banded == 1;

    let hold_effect_rules = to_base_damage_rules_for_hold_effect(rules);
    let hold_effect_id =
        match resolve_battler_hold_effect(&hold_effect_rules, target.as_base_damage_battler()) {
            Ok(id) => id,
            Err(BattleScriptBaseDamageError::ItemOutOfRange { item }) => {
                return Err(BattleScriptAdjustDamageError::ItemOutOfRange { item });
            }
            Err(other) => {
                unreachable!(
                    "resolve_battler_hold_effect only ever returns ItemOutOfRange: {other}"
                )
            }
        };

    let mut next_rules = *rules;
    if hold_effect_id == BATTLE_SCRIPT_ADJUSTDAMAGE_HOLD_EFFECT_FOCUS_BAND {
        let (next_rng, draw) =
            draw_battle_script_adjustdamage_rng(rng_state, focus_band_reason, instruction);
        rng_state = next_rng;
        let param = match resolve_battler_hold_effect_param(
            &hold_effect_rules,
            target.as_base_damage_battler(),
        ) {
            Ok(param) => param,
            Err(other) => unreachable!(
                "the target's item already resolved above; the param lookup cannot newly error: {other}"
            ),
        };
        let random_value = draw.random_value;
        draws.push(draw);
        if i32::from(random_value % 100) < param {
            focus_banded = true;
            next_rules.battlers[target.index()].special_status_focus_banded = 1;
            next_rules.ai_reveal = record_battle_script_item_effect_reveal(
                &next_rules.ai_reveal,
                target.as_ai_reveal_battler(),
                hold_effect_id as u8,
            );
        }
    }

    let false_swipe_applies = if call_require_move_row {
        let move_row = MOVES
            .get(usize::from(rules.current_move))
            .ok_or(BattleScriptAdjustDamageError::UnknownMoveRow { move_id: rules.current_move })?;
        move_row.effect == BATTLE_SCRIPT_ADJUSTDAMAGE_EFFECT_FALSE_SWIPE
    } else {
        false
    };

    let has_substitute =
        (target_state.status2 & BATTLE_SCRIPT_ADJUSTDAMAGE_STATUS2_SUBSTITUTE) != 0;
    let should_clamp = !has_substitute
        && (false_swipe_applies || target_state.endured == 1 || focus_banded)
        && target_state.hp <= damage;

    let mut move_result_flags = next_rules.move_result_flags;
    let mut last_used_item = next_rules.last_used_item;
    if should_clamp {
        damage = target_state.hp - 1;
        if target_state.endured == 1 {
            move_result_flags |= BATTLE_SCRIPT_ADJUSTDAMAGE_MOVE_RESULT_FOE_ENDURED;
        } else if focus_banded {
            move_result_flags |= BATTLE_SCRIPT_ADJUSTDAMAGE_MOVE_RESULT_FOE_HUNG_ON;
            last_used_item = target_state.item;
        }
    }

    next_rules.battle_move_damage = damage;
    next_rules.move_result_flags = move_result_flags;
    next_rules.last_used_item = last_used_item;

    Ok(BattleScriptAdjustDamageOutcome { rules: next_rules, rng: rng_state, draws })
}

/// Native immutable-value twin of `adjustnormaldamageOpcodeHandler`
/// (`includeFalseSwipe = true`). See the module doc comment for the
/// complete ordered evaluation contract.
///
/// # Errors
/// See [`BattleScriptAdjustDamageError`] for the exact ordered error set.
pub fn apply_battle_script_adjustnormaldamage(
    rules: &BattleScriptAdjustDamageRules,
    rng: BattleScriptAdjustDamageRngState,
    instruction: &BattleScriptAdjustDamageInstruction<'_>,
) -> Result<BattleScriptAdjustDamageOutcome, BattleScriptAdjustDamageError> {
    apply_battle_script_adjustdamage_core(
        rules,
        rng,
        instruction,
        Some(BATTLE_SCRIPT_ADJUSTNORMALDAMAGE_RNG_REASON),
        BATTLE_SCRIPT_ADJUSTNORMALDAMAGE_FOCUS_BAND_RNG_REASON,
        true,
    )
}

/// Native immutable-value twin of `adjustnormaldamage2OpcodeHandler`
/// (`includeFalseSwipe = false`). See the module doc comment for the
/// complete ordered evaluation contract.
///
/// # Errors
/// See [`BattleScriptAdjustDamageError`] for the exact ordered error set
/// (this opcode never reaches [`BattleScriptAdjustDamageError::UnknownMoveRow`]).
pub fn apply_battle_script_adjustnormaldamage2(
    rules: &BattleScriptAdjustDamageRules,
    rng: BattleScriptAdjustDamageRngState,
    instruction: &BattleScriptAdjustDamageInstruction<'_>,
) -> Result<BattleScriptAdjustDamageOutcome, BattleScriptAdjustDamageError> {
    apply_battle_script_adjustdamage_core(
        rules,
        rng,
        instruction,
        Some(BATTLE_SCRIPT_ADJUSTNORMALDAMAGE2_RNG_REASON),
        BATTLE_SCRIPT_ADJUSTNORMALDAMAGE2_FOCUS_BAND_RNG_REASON,
        false,
    )
}

/// Native immutable-value twin of `adjustsetdamageOpcodeHandler`: no
/// variance draw, and `requireMoveRow` is called unconditionally. See the
/// module doc comment for the complete ordered evaluation contract.
///
/// # Errors
/// See [`BattleScriptAdjustDamageError`] for the exact ordered error set
/// (this opcode always reaches [`BattleScriptAdjustDamageError::UnknownMoveRow`]
/// when `current_move` is unknown, even absent a Focus Band holder).
pub fn apply_battle_script_adjustsetdamage(
    rules: &BattleScriptAdjustDamageRules,
    rng: BattleScriptAdjustDamageRngState,
    instruction: &BattleScriptAdjustDamageInstruction<'_>,
) -> Result<BattleScriptAdjustDamageOutcome, BattleScriptAdjustDamageError> {
    apply_battle_script_adjustdamage_core(
        rules,
        rng,
        instruction,
        None,
        BATTLE_SCRIPT_ADJUSTSETDAMAGE_FOCUS_BAND_RNG_REASON,
        true,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    /// `ITEM_FOCUS_BAND` (196) resolves to `HOLD_EFFECT_FOCUS_BAND` (39),
    /// param 10 (`mon_construction.rs`'s own Focus Band fixture citation).
    const ITEM_FOCUS_BAND: u16 = 196;
    /// `ITEM_ENIGMA_BERRY` (175); resolves via the per-battler override
    /// arrays instead of the static item catalog.
    const ITEM_ENIGMA_BERRY: u16 = 175;
    const MOVE_FALSE_SWIPE: u16 = 206; // EFFECT_FALSE_SWIPE (MOVE_FALSE_SWIPE)
    const MOVE_TACKLE: u16 = 33; // EFFECT_HIT (not false swipe)

    fn battler(
        item: u16,
        status2: u32,
        hp: i32,
        endured: u8,
        focus_banded: u8,
    ) -> BattleScriptAdjustDamageBattlerState {
        BattleScriptAdjustDamageBattlerState {
            item,
            status2,
            hp,
            endured,
            special_status_focus_banded: focus_banded,
        }
    }

    fn rules() -> BattleScriptAdjustDamageRules {
        BattleScriptAdjustDamageRules {
            battlers: [
                battler(0, 0, 100, 0, 0),
                battler(0, 0, 20, 0, 0),
                battler(0, 0, 100, 0, 0),
                battler(0, 0, 100, 0, 0),
            ],
            current_move: MOVE_TACKLE,
            battle_move_damage: 10,
            move_result_flags: 0,
            last_used_item: 0,
            enigma_berry_hold_effects: [0, 0, 0, 0],
            enigma_berry_hold_effect_params: [0, 0, 0, 0],
            ai_reveal: BattleScriptAiRevealRules::default(),
            selector_roles: BattleScriptAdjustDamageRoles {
                target: Some(BattleScriptAdjustDamageBattler::Battler1),
            },
        }
    }

    fn instruction() -> BattleScriptAdjustDamageInstruction<'static> {
        BattleScriptAdjustDamageInstruction {
            opcode_name: BATTLE_SCRIPT_ADJUSTNORMALDAMAGE_OPCODE_NAME,
            opcode_id: BATTLE_SCRIPT_ADJUSTNORMALDAMAGE_OPCODE,
            program_counter: 42,
            dispatcher: BATTLE_SCRIPT_ADJUSTNORMALDAMAGE_DISPATCHER,
            source_label: "BattleScript_EffectHit",
            source_statement_line: 252,
        }
    }

    #[test]
    fn missing_target_role_errors_on_all_three_opcodes() {
        let mut r = rules();
        r.selector_roles.target = None;
        let rng = BattleScriptAdjustDamageRngState { value: 0, calls: 0 };
        assert_eq!(
            apply_battle_script_adjustnormaldamage(&r, rng, &instruction()),
            Err(BattleScriptAdjustDamageError::MissingTargetRole)
        );
        assert_eq!(
            apply_battle_script_adjustnormaldamage2(&r, rng, &instruction()),
            Err(BattleScriptAdjustDamageError::MissingTargetRole)
        );
        assert_eq!(
            apply_battle_script_adjustsetdamage(&r, rng, &instruction()),
            Err(BattleScriptAdjustDamageError::MissingTargetRole)
        );
    }

    #[test]
    fn variance_draw_precedes_hold_effect_and_increments_calls() {
        let r = rules();
        let rng = BattleScriptAdjustDamageRngState { value: 0x1234_5678, calls: 5 };
        let result = apply_battle_script_adjustnormaldamage(&r, rng, &instruction()).unwrap();
        assert_eq!(result.draws.len(), 1);
        assert_eq!(result.draws[0].reason, "adjustnormaldamage");
        assert_eq!(result.draws[0].before, 0x1234_5678);
        assert_eq!(result.rng.calls, 6);
    }

    #[test]
    fn adjustsetdamage_never_draws_variance() {
        let r = rules();
        let rng = BattleScriptAdjustDamageRngState { value: 7, calls: 0 };
        let result = apply_battle_script_adjustsetdamage(&r, rng, &instruction()).unwrap();
        assert!(result.draws.is_empty());
        assert_eq!(
            result.rng, rng,
            "no rng consumed absent a focus band holder"
        );
        assert_eq!(
            result.rules.battle_move_damage, 10,
            "damage starts unmodified"
        );
    }

    #[test]
    fn focus_band_holder_always_draws_second_and_before_equals_first_after() {
        let mut r = rules();
        r.battlers[1].item = ITEM_FOCUS_BAND;
        r.battlers[1].hp = 100; // non-lethal: pins the "always draws" rule
        r.battle_move_damage = 1;
        let rng = BattleScriptAdjustDamageRngState { value: 999, calls: 0 };
        let result = apply_battle_script_adjustnormaldamage(&r, rng, &instruction()).unwrap();
        assert_eq!(result.draws.len(), 2);
        assert_eq!(result.draws[0].reason, "adjustnormaldamage");
        assert_eq!(result.draws[1].reason, "adjustnormaldamage-focus-band");
        assert_eq!(result.draws[1].before, result.draws[0].after);
        assert_eq!(result.rng.calls, 2);
    }

    #[test]
    fn focus_band_success_sets_bit_and_reveals_item_effect() {
        let mut r = rules();
        r.battlers[1].item = ITEM_FOCUS_BAND;
        r.battlers[1].hp = 1;
        r.battle_move_damage = 100;
        // param is looked up via the static item catalog for a real item id;
        // search for a seed whose second-draw roll%100 < param (whatever it
        // resolves to) by brute force over a bounded range.
        let seed = (0u32..5000)
            .find(|&candidate| {
                let rng = BattleScriptAdjustDamageRngState { value: candidate, calls: 0 };
                let result =
                    apply_battle_script_adjustnormaldamage(&r, rng, &instruction()).unwrap();
                result.rules.battlers[1].special_status_focus_banded == 1
            })
            .expect("a seed exists where the focus band roll succeeds");
        let rng = BattleScriptAdjustDamageRngState { value: seed, calls: 0 };
        let result = apply_battle_script_adjustnormaldamage(&r, rng, &instruction()).unwrap();
        assert_eq!(result.rules.battlers[1].special_status_focus_banded, 1);
        assert_eq!(
            result.rules.ai_reveal.ai_observed_item_effects[1],
            BATTLE_SCRIPT_ADJUSTDAMAGE_HOLD_EFFECT_FOCUS_BAND as u8
        );
        assert_eq!(
            result.rules.move_result_flags & BATTLE_SCRIPT_ADJUSTDAMAGE_MOVE_RESULT_FOE_HUNG_ON,
            BATTLE_SCRIPT_ADJUSTDAMAGE_MOVE_RESULT_FOE_HUNG_ON
        );
        assert_eq!(result.rules.last_used_item, ITEM_FOCUS_BAND);
    }

    #[test]
    fn pre_existing_focus_banded_bit_clamps_without_any_band_draw() {
        let mut r = rules();
        r.battlers[1].special_status_focus_banded = 1;
        r.battlers[1].hp = 1;
        r.battle_move_damage = 100;
        let rng = BattleScriptAdjustDamageRngState { value: 12345, calls: 0 };
        let result = apply_battle_script_adjustnormaldamage(&r, rng, &instruction()).unwrap();
        assert_eq!(
            result.draws.len(),
            1,
            "only the variance draw; no band draw for a non-holder"
        );
        assert_eq!(result.rules.battle_move_damage, 0, "clamped to hp - 1");
        assert_eq!(
            result.rules.move_result_flags & BATTLE_SCRIPT_ADJUSTDAMAGE_MOVE_RESULT_FOE_HUNG_ON,
            BATTLE_SCRIPT_ADJUSTDAMAGE_MOVE_RESULT_FOE_HUNG_ON
        );
    }

    #[test]
    fn enigma_berry_holder_uses_override_arrays() {
        let mut r = rules();
        r.battlers[1].item = ITEM_ENIGMA_BERRY;
        r.enigma_berry_hold_effects[1] = BATTLE_SCRIPT_ADJUSTDAMAGE_HOLD_EFFECT_FOCUS_BAND;
        r.enigma_berry_hold_effect_params[1] = 100; // always succeeds
        r.battlers[1].hp = 1;
        r.battle_move_damage = 100;
        let rng = BattleScriptAdjustDamageRngState { value: 0, calls: 0 };
        let result = apply_battle_script_adjustnormaldamage(&r, rng, &instruction()).unwrap();
        assert_eq!(result.draws.len(), 2);
        assert_eq!(result.rules.battlers[1].special_status_focus_banded, 1);
    }

    #[test]
    fn endured_wins_over_focus_banded_when_both_set() {
        let mut r = rules();
        r.battlers[1].endured = 1;
        r.battlers[1].special_status_focus_banded = 1;
        r.battlers[1].hp = 1;
        r.battle_move_damage = 100;
        let rng = BattleScriptAdjustDamageRngState { value: 0, calls: 0 };
        let result = apply_battle_script_adjustnormaldamage(&r, rng, &instruction()).unwrap();
        assert_eq!(
            result.rules.move_result_flags,
            BATTLE_SCRIPT_ADJUSTDAMAGE_MOVE_RESULT_FOE_ENDURED
        );
        assert_eq!(result.rules.last_used_item, 0, "hung-on branch never taken");
    }

    #[test]
    fn substitute_suppresses_an_otherwise_lethal_clamp() {
        let mut r = rules();
        r.battlers[1].endured = 1;
        r.battlers[1].status2 = BATTLE_SCRIPT_ADJUSTDAMAGE_STATUS2_SUBSTITUTE;
        r.battlers[1].hp = 1;
        r.battle_move_damage = 100;
        let rng = BattleScriptAdjustDamageRngState { value: 0, calls: 0 };
        let result = apply_battle_script_adjustnormaldamage(&r, rng, &instruction()).unwrap();
        assert_ne!(
            result.rules.battle_move_damage, 0,
            "no clamp under substitute"
        );
        assert_eq!(result.rules.move_result_flags, 0);
    }

    #[test]
    fn hp_boundary_hp_equals_damage_clamps_hp_plus_one_does_not() {
        let mut r = rules();
        r.battlers[1].endured = 1;
        r.battlers[1].hp = 5;
        r.battle_move_damage = 0; // will be overwritten by the direct-damage helper below
        let clamp_case = {
            let mut rc = r;
            rc.battlers[1].hp = 5;
            // Force damage == hp exactly via adjustsetdamage (no variance draw).
            rc.battle_move_damage = 5;
            apply_battle_script_adjustsetdamage(
                &rc,
                BattleScriptAdjustDamageRngState { value: 0, calls: 0 },
                &instruction(),
            )
            .unwrap()
        };
        assert_eq!(
            clamp_case.rules.battle_move_damage, 4,
            "hp==damage clamps to hp-1"
        );

        let no_clamp_case = {
            let mut rc = r;
            rc.battlers[1].hp = 5;
            rc.battle_move_damage = 4; // hp == damage + 1
            apply_battle_script_adjustsetdamage(
                &rc,
                BattleScriptAdjustDamageRngState { value: 0, calls: 0 },
                &instruction(),
            )
            .unwrap()
        };
        assert_eq!(
            no_clamp_case.rules.battle_move_damage, 4,
            "hp==damage+1 does not clamp"
        );
    }

    #[test]
    fn false_swipe_clamps_under_0x07_but_not_under_0x08_and_unknown_move_errors_only_under_0x07() {
        let mut r = rules();
        r.current_move = MOVE_FALSE_SWIPE;
        r.battlers[1].hp = 1;
        r.battle_move_damage = 100;
        let rng07 = BattleScriptAdjustDamageRngState { value: 0x2000_0000, calls: 0 };
        let result07 = apply_battle_script_adjustnormaldamage(&r, rng07, &instruction()).unwrap();
        assert_eq!(
            result07.rules.battle_move_damage, 0,
            "false swipe clamps under 0x07"
        );

        let rng08 = BattleScriptAdjustDamageRngState { value: 0x2000_0000, calls: 0 };
        let result08 = apply_battle_script_adjustnormaldamage2(&r, rng08, &instruction()).unwrap();
        assert_ne!(
            result08.rules.battle_move_damage, 0,
            "false swipe effect is never consulted under 0x08"
        );

        let mut unknown = rules();
        unknown.current_move = 60000;
        assert_eq!(
            apply_battle_script_adjustnormaldamage(
                &unknown,
                BattleScriptAdjustDamageRngState { value: 0, calls: 0 },
                &instruction()
            )
            .unwrap_err(),
            BattleScriptAdjustDamageError::UnknownMoveRow { move_id: 60000 }
        );
        assert!(apply_battle_script_adjustnormaldamage2(
            &unknown,
            BattleScriptAdjustDamageRngState { value: 0, calls: 0 },
            &instruction()
        )
        .is_ok());
    }

    #[test]
    fn adjustsetdamage_unknown_move_errors_even_absent_a_focus_band_holder() {
        let mut r = rules();
        r.current_move = 60000;
        assert_eq!(
            apply_battle_script_adjustsetdamage(
                &r,
                BattleScriptAdjustDamageRngState { value: 0, calls: 0 },
                &instruction()
            )
            .unwrap_err(),
            BattleScriptAdjustDamageError::UnknownMoveRow { move_id: 60000 }
        );
    }

    #[test]
    fn item_out_of_range_propagates() {
        let mut r = rules();
        r.battlers[1].item = 60000;
        assert_eq!(
            apply_battle_script_adjustnormaldamage(
                &r,
                BattleScriptAdjustDamageRngState { value: 0, calls: 0 },
                &instruction()
            )
            .unwrap_err()
            .to_string(),
            "item 60000 is outside the source gItems corpus"
        );
    }

    #[test]
    fn battler_ids_round_trip_from_u8() {
        for value in 0u8..4 {
            assert_eq!(
                BattleScriptAdjustDamageBattler::from_u8(value)
                    .unwrap()
                    .as_u8(),
                value
            );
        }
        assert_eq!(BattleScriptAdjustDamageBattler::from_u8(4), None);
    }

    #[test]
    fn registration_finds_first_for_all_three_and_ignores_shape() {
        let instructions = [
            BattleScriptAdjustDamageInstruction {
                opcode_name: "B_SCR_OP_OTHER",
                opcode_id: 0x01,
                program_counter: 10,
                dispatcher: "Cmd_other",
                source_label: "SomeLabel",
                source_statement_line: 1,
            },
            BattleScriptAdjustDamageInstruction {
                opcode_name: BATTLE_SCRIPT_ADJUSTNORMALDAMAGE_OPCODE_NAME,
                opcode_id: BATTLE_SCRIPT_ADJUSTNORMALDAMAGE_OPCODE,
                program_counter: 20,
                dispatcher: BATTLE_SCRIPT_ADJUSTNORMALDAMAGE_DISPATCHER,
                source_label: "L1",
                source_statement_line: 2,
            },
            BattleScriptAdjustDamageInstruction {
                opcode_name: BATTLE_SCRIPT_ADJUSTNORMALDAMAGE2_OPCODE_NAME,
                opcode_id: BATTLE_SCRIPT_ADJUSTNORMALDAMAGE2_OPCODE,
                program_counter: 30,
                dispatcher: BATTLE_SCRIPT_ADJUSTNORMALDAMAGE2_DISPATCHER,
                source_label: "L2",
                source_statement_line: 3,
            },
            BattleScriptAdjustDamageInstruction {
                opcode_name: BATTLE_SCRIPT_ADJUSTSETDAMAGE_OPCODE_NAME,
                opcode_id: BATTLE_SCRIPT_ADJUSTSETDAMAGE_OPCODE,
                program_counter: 40,
                dispatcher: BATTLE_SCRIPT_ADJUSTSETDAMAGE_DISPATCHER,
                source_label: "L3",
                source_statement_line: 4,
            },
            BattleScriptAdjustDamageInstruction {
                opcode_name: BATTLE_SCRIPT_ADJUSTNORMALDAMAGE_OPCODE_NAME,
                opcode_id: 0xff, // ill-shaped/duplicate later entry: never inspected.
                program_counter: 999,
                dispatcher: "ignored",
                source_label: "ignored",
                source_statement_line: 0,
            },
        ];
        assert_eq!(
            register_battle_script_adjustdamage_handlers(&instructions),
            Ok(BattleScriptAdjustDamageRegistration {
                adjustnormaldamage_opcode_id: BATTLE_SCRIPT_ADJUSTNORMALDAMAGE_OPCODE,
                adjustnormaldamage2_opcode_id: BATTLE_SCRIPT_ADJUSTNORMALDAMAGE2_OPCODE,
                adjustsetdamage_opcode_id: BATTLE_SCRIPT_ADJUSTSETDAMAGE_OPCODE,
            })
        );

        let missing_normal = &instructions[2..4];
        assert_eq!(
            register_battle_script_adjustdamage_handlers(missing_normal)
                .unwrap_err()
                .to_string(),
            "committed Battle Script program does not emit B_SCR_OP_ADJUSTNORMALDAMAGE"
        );

        let missing_normal2 = [instructions[1], instructions[3]];
        assert_eq!(
            register_battle_script_adjustdamage_handlers(&missing_normal2)
                .unwrap_err()
                .to_string(),
            "committed Battle Script program does not emit B_SCR_OP_ADJUSTNORMALDAMAGE2"
        );

        let missing_set = [instructions[1], instructions[2]];
        assert_eq!(
            register_battle_script_adjustdamage_handlers(&missing_set)
                .unwrap_err()
                .to_string(),
            "committed Battle Script program does not emit B_SCR_OP_ADJUSTSETDAMAGE"
        );
    }
}
