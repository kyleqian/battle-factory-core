//! Pure `B_SCR_OP_CRITCALC` (0x04, `Cmd_critcalc`) Battle Script opcode leaf
//! -- the native twin of `critcalcOpcodeHandler` in
//! `src/engine/battleScriptHitChainOpcode.ts:1437-1489` (doc comment
//! `:1437-1444`). This is the FIRST RNG-drawing battle-script leaf: the
//! crit-chance stage and roll math are composed from
//! [`crate::damage_calc::get_critical_hit_chance_stage`] /
//! [`crate::damage_calc::roll_is_critical_hit`] (already pinned by M75's
//! `damagecalc` sibling's own crit-math dependency), hold-effect resolution
//! is composed from
//! [`crate::battle_script_base_damage::resolve_battler_hold_effect`], and the
//! LCG step is composed from [`crate::rng::advance_rng_value`]. This leaf
//! owns only the opcode wiring: roles, the immunity gate, the
//! `drawBattleScriptRng` projection, and the `critMultiplier` write-back.
//!
//! ## drawBattleScriptRng projection (supervisor decision, R80/M77)
//! Canonical TS keeps RNG state `{ value, calls, ledger[] }`
//! (`battleScriptMachine.ts:147-151`) and each draw appends a frozen ledger
//! entry recording `{ call, reason, before, after, randomValue, provenance }`
//! (`drawBattleScriptRng`, `:401-427`; `instructionProvenance`, `:275-287`).
//! This leaf projects that machinery as follows:
//! - The RNG input crosses as [`BattleScriptCritcalcRngState`] (`value`,
//!   `calls`); the ledger array itself does NOT cross -- it stays a
//!   TS-machine-only construct.
//! - On the non-immune branch the leaf performs the draw NATIVELY:
//!   `after = advance_rng_value(value)`,
//!   `random_value = ((after >> 16) & 0xffff) as u16` -- exactly TS's
//!   `advanceRngValue` plus upper-16 projection.
//! - The outcome carries the updated RNG `{ value: after, calls: calls + 1 }`
//!   plus a first-class [`BattleScriptCritcalcRngDraw`] mirroring the TS
//!   ledger entry verbatim: `call` (= input `calls + 1`), `reason` (always
//!   the literal `"critcalc"`, `hitChainOpcode.ts:1481`), `before`, `after`,
//!   `random_value`, and the six provenance fields
//!   ([`BattleScriptCritcalcProvenance`]) mirrored from the executing
//!   instruction.
//! - Immune branch: NO draw -- RNG crosses through untouched (`value` and
//!   `calls` identical) and the outcome's draw slot is `None`. The TS doc
//!   comment (`hitChainOpcode.ts:1439-1444`) pins this: immunity
//!   short-circuits BEFORE `Random()`; zero RNG is consumed.
//!
//! ## Evaluation order (exact; each step's error preempts later ones)
//! 1. `requireBattlerRole(rules, "attacker")` -- `"Battle Script hit-chain
//!    command requires a attacker role"`.
//! 2. `requireBattlerRole(rules, "target")` -- same text with `"target"`.
//! 3. `requireMoveRow(currentMove)` -- `"accuracycheck/ppreduce: move <N>
//!    has no source-derived gBattleMoves row"`. Unlike `typecalc` there is
//!    NO Struggle short-circuit, and unlike `damagecalc` there is NO
//!    pre-helper type resolution -- critcalc never resolves the move type
//!    at all.
//! 4. Hold effect: [`resolve_battler_hold_effect`] on the attacker; its own
//!    `ItemOutOfRange` error propagates verbatim. The resolved id maps into
//!    the crit gate only via direct equality against `HOLD_EFFECT_SCOPE_LENS`
//!    (41) / `HOLD_EFFECT_LUCKY_PUNCH` (63) / `HOLD_EFFECT_STICK` (66) inside
//!    [`crate::damage_calc::get_critical_hit_chance_stage`] itself -- any
//!    other id compares unequal to all three there, so this leaf passes the
//!    resolved id straight through rather than re-deriving a tri-state gate.
//!    `moveRow.effect` (numeric `u16` in [`crate::gen_tables::MOVES`]) maps
//!    to [`crate::damage_calc::CritMoveEffect`]: 43 `HighCritical`
//!    (`EFFECT_HIGH_CRITICAL`), 75 `SkyAttack` (`EFFECT_SKY_ATTACK`), 200
//!    `BlazeKick` (`EFFECT_BLAZE_KICK`), 209 `PoisonTail`
//!    (`EFFECT_POISON_TAIL`) -- `reference/pokeemerald/include/constants/
//!    battle_move_effects.h:47,79,204,213`; all others `Other`. Species
//!    gates: `is_chansey = attacker.species == 113`, `is_farfetchd =
//!    attacker.species == 83` (`hitChainOpcode.ts:162-163`). `focus_energy
//!    = (attacker.status2 & STATUS2_FOCUS_ENERGY) != 0`
//!    (`battleScriptSourceConstants.ts:153`). Stage is
//!    `get_critical_hit_chance_stage` (clamps at the table's top index, 4).
//! 5. Immunity (evaluated BEFORE any draw): `target.ability ==
//!    ABILITY_BATTLE_ARMOR` (4) `|| target.ability == ABILITY_SHELL_ARMOR`
//!    (75) `|| (attacker.status3 & STATUS3_CANT_SCORE_A_CRIT) != 0`
//!    (`1 << 15`) `|| (battleTypeFlags & (BATTLE_TYPE_WALLY_TUTORIAL |
//!    BATTLE_TYPE_FIRST_BATTLE)) != 0` (`1 << 9 | 1 << 4`;
//!    `battleScriptSourceConstants.ts:154,156-157`).
//! 6. If immune: `is_crit = false`, no draw. Else: draw per the projection
//!    above, `is_crit = roll_is_critical_hit(stage, random_value, false)`.
//! 7. Outcome: rules with `crit_multiplier := if is_crit { 2 } else { 1 }`
//!    (nothing else mutated -- battlers, flags, damage all untouched); RNG
//!    as specified; always advance. There is no other branch, no events, no
//!    reveal, no jump.
//!
//! Source authority:
//! - Handler: `reference/pokeemerald/src/battle_script_commands.c:1253-1288`
//!   (`Cmd_critcalc`) -- hold-effect resolution incl. Enigma Berry, the
//!   `critChance` sum, the `ARRAY_COUNT` clamp, the `&&`-chain immunity gate
//!   around `!(Random() % sCriticalHitChance[critChance])`,
//!   `gCritMultiplier` 2/1, `gBattlescriptCurrInstr++`. `sCriticalHitChance`
//!   `:606`. Dispatch row `:335` (`[B_SCR_OP_CRITCALC] = Cmd_critcalc,
//!   //0x4`); forward declaration `:83`.
//! - Opcode enum position `include/constants/battle_script_commands.h:10`.
//! - Macro: `asm/macros/battle_script.inc:20` -- a single `.byte
//!   B_SCR_OP_CRITCALC`, no operand.
//! - 11 bare `critcalc` call sites in `data/battle_scripts_1.s` (grep
//!   count); the first is `:249` (inside `BattleScript_HitFromCritCalc`).
//! - The C source's `gPotentialItemEffectBattler = gBattlerAttacker` write is
//!   presentation-side state the canonical TypeScript handler does not
//!   model; this port omits it for the same reason.
//!
//! This leaf deliberately owns neither a generic machine, scheduler/event
//! transport, presentation, nor the WASM ABI.

use core::fmt;

use crate::battle_script_base_damage::{
    resolve_battler_hold_effect, BattleScriptBaseDamageBattler, BattleScriptBaseDamageBattlerState,
    BattleScriptBaseDamageError, BattleScriptBaseDamageRoles, BattleScriptBaseDamageRules,
};
use crate::damage_calc::{
    get_critical_hit_chance_stage, roll_is_critical_hit, CritChanceInput, CritMoveEffect,
    StatStages,
};
use crate::gen_tables::MOVES;
use crate::rng::advance_rng_value;

/// Source `MAX_BATTLERS_COUNT`; all source-indexed state retains four cells.
pub const BATTLE_SCRIPT_CRITCALC_BATTLER_COUNT: usize = 4;

/// `B_SCR_OP_CRITCALC` in the source command enum / dispatch table.
pub const BATTLE_SCRIPT_CRITCALC_OPCODE: u8 = 0x04;
pub const BATTLE_SCRIPT_CRITCALC_OPCODE_NAME: &str = "B_SCR_OP_CRITCALC";
pub const BATTLE_SCRIPT_CRITCALC_DISPATCHER: &str = "Cmd_critcalc";
/// `critcalc`'s encoded byte width: opcode byte only, no operand.
pub const BATTLE_SCRIPT_CRITCALC_ENCODED_WIDTH_BYTES: u8 = 1;

/// `battleScriptSourceConstants.ts:153` -- `include/constants/battle.h:144`.
pub const BATTLE_SCRIPT_CRITCALC_STATUS2_FOCUS_ENERGY: u32 = 1 << 20;
/// `battleScriptSourceConstants.ts:154` -- `include/constants/battle.h:172`.
pub const BATTLE_SCRIPT_CRITCALC_STATUS3_CANT_SCORE_A_CRIT: u32 = 1 << 15;
/// `battleScriptSourceConstants.ts:157` -- `include/constants/battle.h:63`.
pub const BATTLE_SCRIPT_CRITCALC_BATTLE_TYPE_WALLY_TUTORIAL: u32 = 1 << 9;
/// `battleScriptSourceConstants.ts:156` -- `include/constants/battle.h:68`.
pub const BATTLE_SCRIPT_CRITCALC_BATTLE_TYPE_FIRST_BATTLE: u32 = 1 << 4;
/// `hitChainOpcode.ts:146` -- `ABILITY_BATTLE_ARMOR`.
pub const BATTLE_SCRIPT_CRITCALC_ABILITY_BATTLE_ARMOR: u16 = 4;
/// `hitChainOpcode.ts:150` -- `ABILITY_SHELL_ARMOR`.
pub const BATTLE_SCRIPT_CRITCALC_ABILITY_SHELL_ARMOR: u16 = 75;
/// `hitChainOpcode.ts:162` -- `SPECIES_FARFETCHD`.
pub const BATTLE_SCRIPT_CRITCALC_SPECIES_FARFETCHD: u16 = 83;
/// `hitChainOpcode.ts:163` -- `SPECIES_CHANSEY`.
pub const BATTLE_SCRIPT_CRITCALC_SPECIES_CHANSEY: u16 = 113;
/// `hitChainOpcode.ts:1481` -- the draw's literal reason string.
pub const BATTLE_SCRIPT_CRITCALC_RNG_REASON: &str = "critcalc";

/// Complete source battler-id domain used by roles and source-indexed arrays.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptCritcalcBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

impl BattleScriptCritcalcBattler {
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
}

/// The complete per-battler projection this leaf reads. Only the attacker's
/// `item`/`species`/`status2` and the target's `ability`/`status2`-adjacent
/// fields are ever read, but every battler carries the same uniform shape
/// (matching the sibling leaves' convention).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptCritcalcBattlerState {
    pub item: u16,
    pub ability: u16,
    pub species: u16,
    pub status2: u32,
    pub status3: u32,
}

/// Canonical selector bindings, checked attacker-then-target.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptCritcalcRoles {
    pub attacker: Option<BattleScriptCritcalcBattler>,
    pub target: Option<BattleScriptCritcalcBattler>,
}

/// Complete narrow rules slice this leaf reads or writes. No scheduler and
/// no events -- the canonical handler emits neither.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptCritcalcRules {
    pub battlers: [BattleScriptCritcalcBattlerState; BATTLE_SCRIPT_CRITCALC_BATTLER_COUNT],
    /// `rules.battleTopology.battleTypeFlags`.
    pub battle_type_flags: u32,
    pub current_move: u16,
    /// Source `gCritMultiplier`; the only field this leaf ever writes.
    pub crit_multiplier: u8,
    /// Per-battler `BattleEnigmaBerry` override, forwarded verbatim to
    /// [`resolve_battler_hold_effect`].
    pub enigma_berry_hold_effects: [u16; BATTLE_SCRIPT_CRITCALC_BATTLER_COUNT],
    pub selector_roles: BattleScriptCritcalcRoles,
}

/// The projected `{ value, calls }` RNG crossing (see the module doc
/// comment's projection section). The TS ledger array does NOT cross.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptCritcalcRngState {
    pub value: u32,
    pub calls: u32,
}

/// Mirrors `instructionProvenance`'s six fields
/// (`battleScriptMachine.ts:275-287`) verbatim.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BattleScriptCritcalcProvenance {
    pub program_counter: u32,
    pub opcode_id: u8,
    pub opcode_name: String,
    pub dispatcher: String,
    pub source_label: String,
    pub source_statement_line: u32,
}

/// Mirrors one `BattleScriptRngLedgerEntry` (`battleScriptMachine.ts:138-145`)
/// verbatim; only ever produced on the non-immune branch.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BattleScriptCritcalcRngDraw {
    pub call: u32,
    pub reason: &'static str,
    pub before: u32,
    pub after: u32,
    pub random_value: u16,
    pub provenance: BattleScriptCritcalcProvenance,
}

/// One committed-program instruction, used for BOTH registration (find-first
/// by `opcode_name`, ignoring every other field) and, for the single
/// executing instruction passed to [`apply_battle_script_critcalc`], the
/// source of every provenance field on a real draw. No shape or cardinality
/// validation exists at registration or execution -- the canonical
/// `install()` line never checks operands
/// (`battleScriptHitChainOpcode.ts:4700-4717`), so this leaf faithfully
/// omits any shape check.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptCritcalcInstruction<'a> {
    pub opcode_name: &'a str,
    pub opcode_id: u8,
    pub program_counter: u32,
    pub dispatcher: &'a str,
    pub source_label: &'a str,
    pub source_statement_line: u32,
}

/// Exact observable errors in canonical evaluation order.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptCritcalcError {
    /// `requireBattlerRole(rulesContext, "attacker")`.
    MissingAttackerRole,
    /// `requireBattlerRole(rulesContext, "target")`.
    MissingTargetRole,
    /// `requireMoveRow` -- fires with NO prior type resolution (unlike
    /// `typecalc`/`damagecalc`, critcalc never resolves the move type).
    UnknownMoveRow { move_id: u16 },
    /// `resolveBattleScriptBattlerHoldEffect`'s own item-range check
    /// (`battleScriptRulesContext.ts:1647-1658`), forwarded verbatim from
    /// [`resolve_battler_hold_effect`].
    ItemOutOfRange { item: u16 },
}

impl fmt::Display for BattleScriptCritcalcError {
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
            Self::UnknownMoveRow { move_id } => write!(
                formatter,
                "accuracycheck/ppreduce: move {move_id} has no source-derived gBattleMoves row"
            ),
            Self::ItemOutOfRange { item } => {
                write!(formatter, "item {item} is outside the source gItems corpus")
            }
        }
    }
}

impl std::error::Error for BattleScriptCritcalcError {}

/// `committed Battle Script program does not emit B_SCR_OP_CRITCALC`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptCritcalcRegistrationError {
    pub opcode_name: &'static str,
}

impl fmt::Display for BattleScriptCritcalcRegistrationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            formatter,
            "committed Battle Script program does not emit {}",
            self.opcode_name
        )
    }
}

impl std::error::Error for BattleScriptCritcalcRegistrationError {}

/// Native projection of the `install("B_SCR_OP_CRITCALC", ...)` line inside
/// `createBattleScriptHitChainOpcodeHandlers`: find the FIRST instruction
/// with this opcode name -- no shape or cardinality validation.
pub fn register_battle_script_critcalc<'a>(
    instructions: &[BattleScriptCritcalcInstruction<'a>],
) -> Result<u8, BattleScriptCritcalcRegistrationError> {
    instructions
        .iter()
        .find(|instruction| instruction.opcode_name == BATTLE_SCRIPT_CRITCALC_OPCODE_NAME)
        .map(|instruction| instruction.opcode_id)
        .ok_or(BattleScriptCritcalcRegistrationError {
            opcode_name: BATTLE_SCRIPT_CRITCALC_OPCODE_NAME,
        })
}

/// `gBattleMoves[gCurrentMove].effect`'s crit-boosting values
/// (`battle_move_effects.h:47,79,204,213`).
fn crit_move_effect(effect: u16) -> CritMoveEffect {
    match effect {
        43 => CritMoveEffect::HighCritical,
        75 => CritMoveEffect::SkyAttack,
        200 => CritMoveEffect::BlazeKick,
        209 => CritMoveEffect::PoisonTail,
        _ => CritMoveEffect::Other,
    }
}

/// Adapter to the shared hold-effect helper: [`resolve_battler_hold_effect`]
/// only ever reads a battler's `.item` and the `.enigma_berry_hold_effects`
/// array, so every other field on this placeholder is inert.
fn to_base_damage_rules_for_hold_effect(
    rules: &BattleScriptCritcalcRules,
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
        enigma_berry_hold_effect_params: [0; BATTLE_SCRIPT_CRITCALC_BATTLER_COUNT],
    }
}

/// The complete leaf output: the rules with `crit_multiplier` written back,
/// the RNG state after the (possibly absent) draw, and the draw itself when
/// one occurred.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BattleScriptCritcalcOutcome {
    pub rules: BattleScriptCritcalcRules,
    pub rng: BattleScriptCritcalcRngState,
    pub draw: Option<BattleScriptCritcalcRngDraw>,
}

/// Native immutable-value twin of `critcalcOpcodeHandler`. See the module
/// doc comment for the complete ordered evaluation contract and the
/// `drawBattleScriptRng` projection.
///
/// # Errors
/// See [`BattleScriptCritcalcError`] for the exact ordered error set.
pub fn apply_battle_script_critcalc(
    rules: &BattleScriptCritcalcRules,
    rng: BattleScriptCritcalcRngState,
    instruction: &BattleScriptCritcalcInstruction<'_>,
) -> Result<BattleScriptCritcalcOutcome, BattleScriptCritcalcError> {
    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptCritcalcError::MissingAttackerRole)?;
    let target = rules
        .selector_roles
        .target
        .ok_or(BattleScriptCritcalcError::MissingTargetRole)?;

    let move_row = MOVES
        .get(usize::from(rules.current_move))
        .ok_or(BattleScriptCritcalcError::UnknownMoveRow { move_id: rules.current_move })?;

    let base_damage_rules = to_base_damage_rules_for_hold_effect(rules);
    let hold_effect_id =
        match resolve_battler_hold_effect(&base_damage_rules, attacker.as_base_damage_battler()) {
            Ok(id) => id,
            Err(BattleScriptBaseDamageError::ItemOutOfRange { item }) => {
                return Err(BattleScriptCritcalcError::ItemOutOfRange { item });
            }
            Err(other) => {
                unreachable!(
                    "resolve_battler_hold_effect only ever returns ItemOutOfRange: {other}"
                )
            }
        };

    let attacker_state = rules.battlers[attacker.index()];
    let target_state = rules.battlers[target.index()];

    let stage = get_critical_hit_chance_stage(&CritChanceInput {
        focus_energy: (attacker_state.status2 & BATTLE_SCRIPT_CRITCALC_STATUS2_FOCUS_ENERGY) != 0,
        move_effect: crit_move_effect(move_row.effect),
        attacker_hold_effect: hold_effect_id,
        is_chansey: attacker_state.species == BATTLE_SCRIPT_CRITCALC_SPECIES_CHANSEY,
        is_farfetchd: attacker_state.species == BATTLE_SCRIPT_CRITCALC_SPECIES_FARFETCHD,
    });

    let immune = target_state.ability == BATTLE_SCRIPT_CRITCALC_ABILITY_BATTLE_ARMOR
        || target_state.ability == BATTLE_SCRIPT_CRITCALC_ABILITY_SHELL_ARMOR
        || (attacker_state.status3 & BATTLE_SCRIPT_CRITCALC_STATUS3_CANT_SCORE_A_CRIT) != 0
        || (rules.battle_type_flags
            & (BATTLE_SCRIPT_CRITCALC_BATTLE_TYPE_WALLY_TUTORIAL
                | BATTLE_SCRIPT_CRITCALC_BATTLE_TYPE_FIRST_BATTLE))
            != 0;

    let (is_crit, next_rng, draw) = if immune {
        (false, rng, None)
    } else {
        let after = advance_rng_value(rng.value);
        let random_value = ((after >> 16) & 0xffff) as u16;
        let call = rng.calls + 1;
        let draw = BattleScriptCritcalcRngDraw {
            call,
            reason: BATTLE_SCRIPT_CRITCALC_RNG_REASON,
            before: rng.value,
            after,
            random_value,
            provenance: BattleScriptCritcalcProvenance {
                program_counter: instruction.program_counter,
                opcode_id: instruction.opcode_id,
                opcode_name: instruction.opcode_name.to_owned(),
                dispatcher: instruction.dispatcher.to_owned(),
                source_label: instruction.source_label.to_owned(),
                source_statement_line: instruction.source_statement_line,
            },
        };
        let is_crit = roll_is_critical_hit(stage, random_value, false);
        (
            is_crit,
            BattleScriptCritcalcRngState { value: after, calls: call },
            Some(draw),
        )
    };

    let mut next_rules = *rules;
    next_rules.crit_multiplier = if is_crit { 2 } else { 1 };

    Ok(BattleScriptCritcalcOutcome { rules: next_rules, rng: next_rng, draw })
}

#[cfg(test)]
mod tests {
    use super::*;

    /// `ITEM_SCOPE_LENS` (198) resolves to `HOLD_EFFECT_SCOPE_LENS` (41) per
    /// `battle_script_base_damage_item_catalog_gen.rs`.
    const ITEM_SCOPE_LENS: u16 = 198;
    /// `ITEM_LUCKY_PUNCH` (222) resolves to `HOLD_EFFECT_LUCKY_PUNCH` (63).
    const ITEM_LUCKY_PUNCH: u16 = 222;
    /// `ITEM_STICK` (225) resolves to `HOLD_EFFECT_STICK` (66).
    const ITEM_STICK: u16 = 225;
    const MOVE_KARATE_CHOP: u16 = 2; // EFFECT_HIGH_CRITICAL
    const MOVE_TACKLE: u16 = 33; // EFFECT_HIT (Other)

    fn battler(item: u16, ability: u16, species: u16) -> BattleScriptCritcalcBattlerState {
        BattleScriptCritcalcBattlerState { item, ability, species, status2: 0, status3: 0 }
    }

    fn rules() -> BattleScriptCritcalcRules {
        BattleScriptCritcalcRules {
            battlers: [
                battler(0, 0, 1),
                battler(0, 0, 2),
                battler(0, 0, 3),
                battler(0, 0, 4),
            ],
            battle_type_flags: 0,
            current_move: MOVE_TACKLE,
            crit_multiplier: 1,
            enigma_berry_hold_effects: [0, 0, 0, 0],
            selector_roles: BattleScriptCritcalcRoles {
                attacker: Some(BattleScriptCritcalcBattler::Battler0),
                target: Some(BattleScriptCritcalcBattler::Battler1),
            },
        }
    }

    fn instruction() -> BattleScriptCritcalcInstruction<'static> {
        BattleScriptCritcalcInstruction {
            opcode_name: BATTLE_SCRIPT_CRITCALC_OPCODE_NAME,
            opcode_id: BATTLE_SCRIPT_CRITCALC_OPCODE,
            program_counter: 42,
            dispatcher: BATTLE_SCRIPT_CRITCALC_DISPATCHER,
            source_label: "BattleScript_HitFromCritCalc",
            source_statement_line: 249,
        }
    }

    #[test]
    fn missing_attacker_role_checked_before_target() {
        let mut r = rules();
        r.selector_roles.attacker = None;
        r.selector_roles.target = None;
        assert_eq!(
            apply_battle_script_critcalc(
                &r,
                BattleScriptCritcalcRngState { value: 0, calls: 0 },
                &instruction()
            ),
            Err(BattleScriptCritcalcError::MissingAttackerRole)
        );
    }

    #[test]
    fn missing_target_role_errors() {
        let mut r = rules();
        r.selector_roles.target = None;
        assert_eq!(
            apply_battle_script_critcalc(
                &r,
                BattleScriptCritcalcRngState { value: 0, calls: 0 },
                &instruction()
            ),
            Err(BattleScriptCritcalcError::MissingTargetRole)
        );
    }

    #[test]
    fn unknown_move_row_errors() {
        let mut r = rules();
        r.current_move = 60000;
        assert_eq!(
            apply_battle_script_critcalc(
                &r,
                BattleScriptCritcalcRngState { value: 0, calls: 0 },
                &instruction()
            ),
            Err(BattleScriptCritcalcError::UnknownMoveRow { move_id: 60000 })
        );
    }

    #[test]
    fn item_out_of_range_propagates_from_hold_effect_helper() {
        let mut r = rules();
        r.battlers[0].item = 60000;
        assert_eq!(
            apply_battle_script_critcalc(
                &r,
                BattleScriptCritcalcRngState { value: 0, calls: 0 },
                &instruction()
            )
            .unwrap_err()
            .to_string(),
            "item 60000 is outside the source gItems corpus"
        );
    }

    #[test]
    fn effect_mapping_covers_all_four_boosting_ids_and_default() {
        assert_eq!(crit_move_effect(43), CritMoveEffect::HighCritical);
        assert_eq!(crit_move_effect(75), CritMoveEffect::SkyAttack);
        assert_eq!(crit_move_effect(200), CritMoveEffect::BlazeKick);
        assert_eq!(crit_move_effect(209), CritMoveEffect::PoisonTail);
        assert_eq!(crit_move_effect(0), CritMoveEffect::Other);
        assert_eq!(crit_move_effect(9999), CritMoveEffect::Other);
    }

    #[test]
    fn hold_effect_gate_needs_both_item_and_species() {
        // Lucky Punch on a non-Chansey attacker: no stage bump (stage stays 0,
        // so even rng_roll=0 (%16==0) is the only crit threshold, same as base).
        let mut with_item_wrong_species = rules();
        with_item_wrong_species.battlers[0].item = ITEM_LUCKY_PUNCH;
        with_item_wrong_species.battlers[0].species = 1; // not Chansey (113)
        let base = apply_battle_script_critcalc(
            &with_item_wrong_species,
            BattleScriptCritcalcRngState { value: 0, calls: 0 },
            &instruction(),
        )
        .unwrap();

        let mut with_item_and_species = with_item_wrong_species;
        with_item_and_species.battlers[0].species = BATTLE_SCRIPT_CRITCALC_SPECIES_CHANSEY;
        let boosted = apply_battle_script_critcalc(
            &with_item_and_species,
            BattleScriptCritcalcRngState { value: 0, calls: 0 },
            &instruction(),
        )
        .unwrap();

        // Stage 0 -> 1-in-16; stage 2 (Lucky Punch +2, gated) -> 1-in-4.
        // Use a seed whose upper-16 output is a multiple of 4 but not 16 to
        // distinguish: search deterministically for such a seed.
        let seed = (0u32..4096)
            .find(|&candidate| {
                let after = advance_rng_value(candidate);
                let random_value = (after >> 16) as u16;
                random_value.is_multiple_of(4) && !random_value.is_multiple_of(16)
            })
            .expect("a seed exists whose output is %4==0 but %16!=0 in range");
        let base_crit = apply_battle_script_critcalc(
            &with_item_wrong_species,
            BattleScriptCritcalcRngState { value: seed, calls: 0 },
            &instruction(),
        )
        .unwrap();
        let boosted_crit = apply_battle_script_critcalc(
            &with_item_and_species,
            BattleScriptCritcalcRngState { value: seed, calls: 0 },
            &instruction(),
        )
        .unwrap();
        assert_eq!(
            base_crit.rules.crit_multiplier, 1,
            "not boosted: stage 0 misses this roll"
        );
        assert_eq!(
            boosted_crit.rules.crit_multiplier, 2,
            "boosted: stage 2 hits this roll"
        );
        assert_eq!(base.rules.crit_multiplier, boosted.rules.crit_multiplier);
    }

    #[test]
    fn scope_lens_and_stick_resolve_through_the_real_item_catalog() {
        let mut r = rules();
        r.battlers[0].item = ITEM_SCOPE_LENS;
        let result = apply_battle_script_critcalc(
            &r,
            BattleScriptCritcalcRngState { value: 0, calls: 0 },
            &instruction(),
        )
        .unwrap();
        // Stage 1 (Scope Lens) at rng_roll upper16(advance_rng_value(0)) -- just
        // confirm it evaluates without error; the stage math itself is pinned
        // in damage_calc.rs's own tests. Here we only prove wiring.
        assert!(result.draw.is_some());

        let mut r2 = rules();
        r2.battlers[0].item = ITEM_STICK;
        r2.battlers[0].species = BATTLE_SCRIPT_CRITCALC_SPECIES_FARFETCHD;
        let result2 = apply_battle_script_critcalc(
            &r2,
            BattleScriptCritcalcRngState { value: 0, calls: 0 },
            &instruction(),
        )
        .unwrap();
        assert!(result2.draw.is_some());
    }

    #[test]
    fn karate_chop_high_critical_effect_raises_stage() {
        let mut low = rules();
        low.current_move = MOVE_TACKLE;
        let mut high = rules();
        high.current_move = MOVE_KARATE_CHOP;

        // Find a seed whose output is %4==0 (stage-1 crit range) but %16!=0
        // (stage-0 non-crit range), proving EFFECT_HIGH_CRITICAL raised the
        // stage from 0 (1-in-16) to 1 (1-in-8)... use 8 not 4: stage1 is 1-in-8.
        let seed = (0u32..4096)
            .find(|&candidate| {
                let after = advance_rng_value(candidate);
                let random_value = (after >> 16) as u16;
                random_value.is_multiple_of(8) && !random_value.is_multiple_of(16)
            })
            .expect("a seed exists whose output is %8==0 but %16!=0 in range");
        let low_result = apply_battle_script_critcalc(
            &low,
            BattleScriptCritcalcRngState { value: seed, calls: 0 },
            &instruction(),
        )
        .unwrap();
        let high_result = apply_battle_script_critcalc(
            &high,
            BattleScriptCritcalcRngState { value: seed, calls: 0 },
            &instruction(),
        )
        .unwrap();
        assert_eq!(low_result.rules.crit_multiplier, 1);
        assert_eq!(high_result.rules.crit_multiplier, 2);
    }

    #[test]
    fn immunity_short_circuits_before_any_draw_battle_armor() {
        let mut r = rules();
        r.battlers[1].ability = BATTLE_SCRIPT_CRITCALC_ABILITY_BATTLE_ARMOR;
        let rng_in = BattleScriptCritcalcRngState { value: 0x1234_5678, calls: 3 };
        let result = apply_battle_script_critcalc(&r, rng_in, &instruction()).unwrap();
        assert_eq!(result.rng, rng_in, "rng passes through untouched");
        assert!(result.draw.is_none());
        assert_eq!(result.rules.crit_multiplier, 1);
    }

    #[test]
    fn immunity_short_circuits_before_any_draw_shell_armor() {
        let mut r = rules();
        r.battlers[1].ability = BATTLE_SCRIPT_CRITCALC_ABILITY_SHELL_ARMOR;
        let rng_in = BattleScriptCritcalcRngState { value: 0xaaaa_bbbb, calls: 7 };
        let result = apply_battle_script_critcalc(&r, rng_in, &instruction()).unwrap();
        assert_eq!(result.rng, rng_in);
        assert!(result.draw.is_none());
    }

    #[test]
    fn immunity_short_circuits_before_any_draw_status3_bit() {
        let mut r = rules();
        r.battlers[0].status3 = BATTLE_SCRIPT_CRITCALC_STATUS3_CANT_SCORE_A_CRIT;
        let rng_in = BattleScriptCritcalcRngState { value: 5, calls: 0 };
        let result = apply_battle_script_critcalc(&r, rng_in, &instruction()).unwrap();
        assert_eq!(result.rng, rng_in);
        assert!(result.draw.is_none());
    }

    #[test]
    fn immunity_short_circuits_before_any_draw_wally_tutorial() {
        let mut r = rules();
        r.battle_type_flags = BATTLE_SCRIPT_CRITCALC_BATTLE_TYPE_WALLY_TUTORIAL;
        let rng_in = BattleScriptCritcalcRngState { value: 9, calls: 1 };
        let result = apply_battle_script_critcalc(&r, rng_in, &instruction()).unwrap();
        assert_eq!(result.rng, rng_in);
        assert!(result.draw.is_none());
    }

    #[test]
    fn immunity_short_circuits_before_any_draw_first_battle() {
        let mut r = rules();
        r.battle_type_flags = BATTLE_SCRIPT_CRITCALC_BATTLE_TYPE_FIRST_BATTLE;
        let rng_in = BattleScriptCritcalcRngState { value: 9, calls: 1 };
        let result = apply_battle_script_critcalc(&r, rng_in, &instruction()).unwrap();
        assert_eq!(result.rng, rng_in);
        assert!(result.draw.is_none());
    }

    #[test]
    fn draw_projection_matches_advance_rng_value_upper_sixteen() {
        let r = rules();
        let rng_in = BattleScriptCritcalcRngState { value: 0xdead_beef, calls: 4 };
        let result = apply_battle_script_critcalc(&r, rng_in, &instruction()).unwrap();
        let expected_after = advance_rng_value(0xdead_beef);
        let expected_random = ((expected_after >> 16) & 0xffff) as u16;
        assert_eq!(result.rng.value, expected_after);
        assert_eq!(result.rng.calls, 5);
        let draw = result.draw.expect("non-immune draws");
        assert_eq!(draw.call, 5);
        assert_eq!(draw.before, 0xdead_beef);
        assert_eq!(draw.after, expected_after);
        assert_eq!(draw.random_value, expected_random);
        assert_eq!(draw.reason, "critcalc");
    }

    #[test]
    fn provenance_mirrors_the_executing_instruction() {
        let r = rules();
        let instr = BattleScriptCritcalcInstruction {
            opcode_name: "B_SCR_OP_CRITCALC",
            opcode_id: 0x04,
            program_counter: 777,
            dispatcher: "Cmd_critcalc",
            source_label: "BattleScript_SomeOtherSite",
            source_statement_line: 620,
        };
        let result = apply_battle_script_critcalc(
            &r,
            BattleScriptCritcalcRngState { value: 1, calls: 0 },
            &instr,
        )
        .unwrap();
        let draw = result.draw.unwrap();
        assert_eq!(draw.provenance.program_counter, 777);
        assert_eq!(draw.provenance.opcode_id, 0x04);
        assert_eq!(draw.provenance.opcode_name, "B_SCR_OP_CRITCALC");
        assert_eq!(draw.provenance.dispatcher, "Cmd_critcalc");
        assert_eq!(draw.provenance.source_label, "BattleScript_SomeOtherSite");
        assert_eq!(draw.provenance.source_statement_line, 620);
    }

    #[test]
    fn nonzero_starting_calls_increments_by_one() {
        let r = rules();
        let result = apply_battle_script_critcalc(
            &r,
            BattleScriptCritcalcRngState { value: 123, calls: 41 },
            &instruction(),
        )
        .unwrap();
        assert_eq!(result.rng.calls, 42);
        assert_eq!(result.draw.unwrap().call, 42);
    }

    #[test]
    fn battler_ids_round_trip_from_u8() {
        for value in 0u8..4 {
            assert_eq!(
                BattleScriptCritcalcBattler::from_u8(value).unwrap().as_u8(),
                value
            );
        }
        assert_eq!(BattleScriptCritcalcBattler::from_u8(4), None);
    }

    #[test]
    fn registration_finds_first_and_ignores_shape() {
        let instructions = [
            BattleScriptCritcalcInstruction {
                opcode_name: "B_SCR_OP_OTHER",
                opcode_id: 0x01,
                program_counter: 10,
                dispatcher: "Cmd_other",
                source_label: "SomeLabel",
                source_statement_line: 1,
            },
            BattleScriptCritcalcInstruction {
                opcode_name: BATTLE_SCRIPT_CRITCALC_OPCODE_NAME,
                opcode_id: BATTLE_SCRIPT_CRITCALC_OPCODE,
                program_counter: 20,
                dispatcher: BATTLE_SCRIPT_CRITCALC_DISPATCHER,
                source_label: "AnotherLabel",
                source_statement_line: 2,
            },
            BattleScriptCritcalcInstruction {
                opcode_name: BATTLE_SCRIPT_CRITCALC_OPCODE_NAME,
                opcode_id: 0xff, // ill-shaped/duplicate later entry: never inspected.
                program_counter: 30,
                dispatcher: "ignored",
                source_label: "ignored",
                source_statement_line: 0,
            },
        ];
        assert_eq!(
            register_battle_script_critcalc(&instructions),
            Ok(BATTLE_SCRIPT_CRITCALC_OPCODE)
        );

        let missing = [BattleScriptCritcalcInstruction {
            opcode_name: "B_SCR_OP_OTHER",
            opcode_id: 0x01,
            program_counter: 10,
            dispatcher: "Cmd_other",
            source_label: "SomeLabel",
            source_statement_line: 1,
        }];
        assert_eq!(
            register_battle_script_critcalc(&missing)
                .unwrap_err()
                .to_string(),
            "committed Battle Script program does not emit B_SCR_OP_CRITCALC"
        );
    }
}
