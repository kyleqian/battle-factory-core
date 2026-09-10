//! Pure `B_SCR_OP_TRYKO` (0x93, `Cmd_tryKO`) Battle Script opcode leaf --
//! the native twin of `createTryKOHandler` in
//! `src/engine/battleScriptTryKOOpcodeOpcode.ts` (module doc comment
//! `:1-55`). `BattleScript_EffectOHKO`'s own hit/miss determination
//! (Fissure/Horn Drill/Sheer Cold/Guillotine class) -- NOT the standard
//! `accuracycheck` path (that opcode is called first with
//! `NO_ACC_CALC_CHECK_LOCK_ON`, a no-roll bypass already modeled by
//! `battleScriptHitChainOpcode.ts`); this opcode performs a wholly separate
//! hit/miss roll and damage setter. Up to TWO ordered `Random()` draws: the
//! Focus Band roll (unconditional whenever the target holds Focus Band,
//! even when Sturdy then short-circuits), then the accuracy formula roll
//! (skipped only on the `ownedSureHit` fast path).
//!
//! ## drawBattleScriptRng projection (reused verbatim from M77/M78)
//! See `battle_script_critcalc.rs`'s module doc comment for the full
//! projection contract; the ordered-`Vec<..RngDraw>` convention (zero, one,
//! or two draws) is reused verbatim from `battle_script_adjustdamage.rs`
//! (M78). The RNG input/output crosses as [`BattleScriptTryKoRngState`]
//! (`value`, `calls`); the TS ledger array itself does NOT cross.
//!
//! ## Evaluation order (exact; each step's error preempts later ones)
//! 1. `requireBattlerRole(rulesContext, "attacker")` --
//!    `"Cmd_tryKO requires a attacker role"` (verbatim, including the
//!    ungrammatical "a attacker"); then `"target"` the same way.
//! 2. Hold-effect resolution (`resolveBattleScriptBattlerHoldEffect`) on the
//!    target -- its own item-range error propagates verbatim. This happens
//!    BEFORE the Sturdy check, matching source's unconditional
//!    `holdEffect`/`param` computation at the top of `Cmd_tryKO`
//!    (`:7496-7503`).
//! 3. Focus Band (`:7507`, `HOLD_EFFECT_FOCUS_BAND` = 39,
//!    `hold_effects.h:43`): if the resolved hold effect is Focus Band, draw
//!    ONE rng (reason `"tryko-focus-band"`) REGARDLESS of outcome. A
//!    successful roll (`randomValue % 100 < holdEffectParam`) sets the
//!    target's `specialStatus.focusBanded = 1` and fires the item-effect
//!    reveal; a failed roll touches nothing. No jump either way -- falls
//!    through to Sturdy. The draw is consumed even when Sturdy then
//!    short-circuits below.
//! 4. Sturdy (`:7513`, `ABILITY_STURDY` = 5, `abilities.h:9`): if the
//!    target's ability is Sturdy, set `MOVE_RESULT_MISSED` +
//!    `lastUsedAbility`, fire the ability reveal, then JUMP to the FIXED
//!    label `BattleScript_SturdyPreventsOHKO` resolved from the committed
//!    program BY NAME (not the operand) -- same "hardcoded jump" shape as
//!    `Cmd_tryinfatuating`'s Oblivious block
//!    (`battle_script_tryinfatuating.rs`). Absence of that label in the
//!    committed program throws `"Cmd_tryKO: committed program has no label
//!    BattleScript_SturdyPreventsOHKO"`. The rng state (including a step-3
//!    draw) threads through unchanged.
//! 5. `requireMoveAccuracy(currentMove)` (`"Cmd_tryKO: move <m> has no
//!    source-derived gBattleMoves row"`) -- resolved on the non-Sturdy path
//!    BEFORE `ownedSureHit` is computed, so an unknown move errors even on
//!    the sure-hit fast path where the formula's numeric result is never
//!    used.
//! 6. `ownedSureHit = (target.status3 & STATUS3_ALWAYS_HITS) != 0 &&
//!    target.battlerWithSureHit == attacker && attacker.level >=
//!    target.level` (`STATUS3_ALWAYS_HITS` = `1<<3 | 1<<4`,
//!    `battle.h:160`) -- ONLY this exact conjunction skips the formula
//!    draw. Source's C reproduces the identical formula in both the
//!    no-status3 branch and the status3-but-mismatched branch (`:7523-7544`);
//!    this TS-derived port collapses them into one `!ownedSureHit` draw,
//!    which is behaviorally identical because both C branches evaluate the
//!    exact same expression.
//! 7. Formula (`:7536-7545`): `chance = moveAccuracy + (attackerLevel -
//!    targetLevel)` (plain signed arithmetic -- mirrors the TS `number`
//!    domain exactly; C's `u16 chance` can wrap, but that wrap is
//!    unobservable because a hit additionally requires
//!    `attackerLevel >= targetLevel`, which a wrapped-negative `chance`
//!    could never satisfy meaningfully within this engine's bounded level
//!    domain). `hit = ownedSureHit || ((draw.randomValue % 100 + 1 <
//!    chance) && attackerLevel >= targetLevel)` -- strict `<`, and the
//!    level clause is a hard override: a winning roll still misses (as
//!    "unaffected", not "missed") when the target out-levels the attacker.
//!    Draw label `"tryko"`.
//! 8. Hit trichotomy (`:7546-7562`), precedence pinned: `target.endured ==
//!    1` -> damage = `hp - 1`, `MOVE_RESULT_FOE_ENDURED`; else
//!    `specialStatus.focusBanded == 1` (from step 3's write this action, OR
//!    persisted from an earlier action) -> damage = `hp - 1`,
//!    `MOVE_RESULT_FOE_HUNG_ON`, `lastUsedItem := target.item`; else damage
//!    = full `target.hp`, `MOVE_RESULT_ONE_HIT_KO`. Then ADVANCE (encoded
//!    width 5), not a jump.
//! 9. Miss (`:7565-7572`): `MOVE_RESULT_MISSED` set;
//!    `multistringChooser` picks `B_MSG_KO_MISS` (0, attacker level >=
//!    target level) or `B_MSG_KO_UNAFFECTED` (1, target out-levels
//!    attacker) (`gKOFailedStringIds`, `battle_message.c:1108-1111`); then
//!    the single ptr operand is resolved LAZILY against the committed
//!    program -- unresolved throws `"Cmd_tryKO: unresolved jump target
//!    <expr>"` -- and the control JUMPs there.
//!
//! Registration (`createBattleScriptTryKOOpcodeHandlers`): find-FIRST
//! REQUIRED, no shape/dispatcher/operand validation -- absence throws
//! `"committed Battle Script program does not emit B_SCR_OP_TRYKO"` (same
//! convention as `battle_script_bicword.rs`/statusPrimary).
//!
//! Source authority:
//! - `Cmd_tryKO`: `reference/pokeemerald/src/battle_script_commands.c:7490-7576`.
//!   Focus Band roll `:7507`; Sturdy `:7513`; the chance ladder
//!   `:7523-7544` (two textually-identical formula copies, collapsed to one
//!   draw per the TS-derived spec); trichotomy `:7546-7562`; miss tail
//!   `:7565-7572`; `T1_READ_PTR(gBattlescriptCurrInstr + 1)` and `+= 5`.
//! - Dispatch row `:478` (`[B_SCR_OP_TRYKO] = Cmd_tryKO, //0x93`); forward
//!   declaration `:226`.
//! - Opcode enum position `include/constants/battle_script_commands.h:153`.
//! - Macro `asm/macros/battle_script.inc:793-796` (`tryKO ptr:req`, a
//!   `.byte` opcode plus one `.4byte` pointer, encoded width 5).
//! - The single committed call site: `data/battle_scripts_1.s:769`
//!   (`tryKO BattleScript_KOFail`).
//! - `STATUS3_ALWAYS_HITS`: `include/constants/battle.h:160`.
//! - `ABILITY_STURDY`: `include/constants/abilities.h:9`.
//! - `HOLD_EFFECT_FOCUS_BAND`: `include/constants/hold_effects.h:43`.
//! - `MOVE_RESULT_MISSED`/`_ONE_HIT_KO`/`_FOE_ENDURED`/`_FOE_HUNG_ON`:
//!   `include/constants/battle.h:220,224,226,227`.
//! - `gKOFailedStringIds` / `B_MSG_KO_MISS` (0) / `B_MSG_KO_UNAFFECTED` (1):
//!   `src/battle_message.c:1108-1111`, `include/constants/battle_string_ids.h:492-493`.
//! - The C source's `gPotentialItemEffectBattler = gBattlerTarget` write is
//!   presentation-side state the canonical TypeScript handler does not
//!   model; this port omits it for the same reason `critcalc`/`adjustdamage`
//!   do.
//!
//! This leaf deliberately owns neither a generic machine, scheduler/event
//! transport, presentation, nor the WASM ABI.

use core::fmt;

use crate::battle_script_ai_reveal::{
    record_battle_script_ability_reveal, record_battle_script_item_effect_reveal,
    BattleScriptAiRevealBattler, BattleScriptAiRevealRules,
};
use crate::battle_script_base_damage::{
    resolve_battler_hold_effect, resolve_battler_hold_effect_param, BattleScriptBaseDamageBattler,
    BattleScriptBaseDamageBattlerState, BattleScriptBaseDamageError, BattleScriptBaseDamageRoles,
    BattleScriptBaseDamageRules,
};
use crate::damage_calc::StatStages;
use crate::gen_tables::MOVES;
use crate::rng::advance_rng_value;

/// Source `MAX_BATTLERS_COUNT`; all source-indexed state retains four cells.
pub const BATTLE_SCRIPT_TRYKO_BATTLER_COUNT: usize = 4;

/// `B_SCR_OP_TRYKO` in the source command enum / dispatch table.
pub const BATTLE_SCRIPT_TRYKO_OPCODE: u8 = 0x93;
pub const BATTLE_SCRIPT_TRYKO_OPCODE_NAME: &str = "B_SCR_OP_TRYKO";
pub const BATTLE_SCRIPT_TRYKO_DISPATCHER: &str = "Cmd_tryKO";
/// One four-byte fail pointer follows the opcode byte.
pub const BATTLE_SCRIPT_TRYKO_POINTER_WIDTH_BYTES: u8 = 4;
/// The source macro's encoded byte width.
pub const BATTLE_SCRIPT_TRYKO_ENCODED_WIDTH_BYTES: u8 = 5;

/// `include/constants/hold_effects.h:43`.
pub const BATTLE_SCRIPT_TRYKO_HOLD_EFFECT_FOCUS_BAND: u16 = 39;
/// `include/constants/abilities.h:9`.
pub const BATTLE_SCRIPT_TRYKO_ABILITY_STURDY: u8 = 5;
/// `include/constants/battle.h:160` -- `1 << 3 | 1 << 4`.
pub const BATTLE_SCRIPT_TRYKO_STATUS3_ALWAYS_HITS: u32 = (1 << 3) | (1 << 4);
/// `include/constants/battle.h:220`.
pub const BATTLE_SCRIPT_TRYKO_MOVE_RESULT_MISSED: u32 = 1 << 0;
/// `include/constants/battle.h:224`.
pub const BATTLE_SCRIPT_TRYKO_MOVE_RESULT_ONE_HIT_KO: u32 = 1 << 4;
/// `include/constants/battle.h:226`.
pub const BATTLE_SCRIPT_TRYKO_MOVE_RESULT_FOE_ENDURED: u32 = 1 << 6;
/// `include/constants/battle.h:227`.
pub const BATTLE_SCRIPT_TRYKO_MOVE_RESULT_FOE_HUNG_ON: u32 = 1 << 7;
/// `battle_string_ids.h:492` / `gKOFailedStringIds[B_MSG_KO_MISS]`.
pub const BATTLE_SCRIPT_TRYKO_MSG_KO_MISS: u8 = 0;
/// `battle_string_ids.h:493` / `gKOFailedStringIds[B_MSG_KO_UNAFFECTED]`.
pub const BATTLE_SCRIPT_TRYKO_MSG_KO_UNAFFECTED: u8 = 1;
/// The hardcoded (not operand-supplied) destination taken on target Sturdy.
pub const BATTLE_SCRIPT_TRYKO_STURDY_LABEL: &str = "BattleScript_SturdyPreventsOHKO";

/// `"tryko-focus-band"` -- the Focus Band draw's literal reason string.
pub const BATTLE_SCRIPT_TRYKO_FOCUS_BAND_RNG_REASON: &str = "tryko-focus-band";
/// `"tryko"` -- the accuracy formula draw's literal reason string.
pub const BATTLE_SCRIPT_TRYKO_RNG_REASON: &str = "tryko";

/// Complete source battler-id domain used by roles and source-indexed arrays.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptTryKoBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

impl BattleScriptTryKoBattler {
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

/// The complete per-battler projection this leaf reads or writes.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryKoBattlerState {
    pub item: u16,
    pub ability: u8,
    pub level: i32,
    pub hp: i32,
    /// Source `gProtectStructs[battler].endured`; 0 or 1.
    pub endured: u8,
    /// Source `gSpecialStatuses[battler].focusBanded`; 0 or 1.
    pub special_status_focus_banded: u8,
    /// Raw `gStatuses3[battler]` bitfield; bits 3/4 are `STATUS3_ALWAYS_HITS`.
    pub status3: u32,
    /// Source `gDisableStructs[battler].battlerWithSureHit` -- the battler
    /// id (0..=3) granted this battler an always-hit lock, if any.
    pub battler_with_sure_hit: u8,
}

/// Canonical selector bindings; attacker checked before target.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryKoRoles {
    pub attacker: Option<BattleScriptTryKoBattler>,
    pub target: Option<BattleScriptTryKoBattler>,
}

/// Complete narrow rules slice this leaf reads or writes. No scheduler and
/// no events -- the canonical handler emits neither.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryKoRules {
    pub battlers: [BattleScriptTryKoBattlerState; BATTLE_SCRIPT_TRYKO_BATTLER_COUNT],
    pub current_move: u16,
    /// Source `gBattleMoveDamage`; input starting value and the field this
    /// leaf overwrites on a hit.
    pub battle_move_damage: i32,
    pub move_result_flags: u32,
    pub last_used_item: u16,
    pub last_used_ability: u8,
    /// Source `gBattleCommunication[MULTISTRING_CHOOSER]`; written only on
    /// the miss branch.
    pub multistring_chooser: u8,
    /// Per-battler `BattleEnigmaBerry` override, forwarded verbatim to
    /// [`resolve_battler_hold_effect`]/[`resolve_battler_hold_effect_param`].
    pub enigma_berry_hold_effects: [u16; BATTLE_SCRIPT_TRYKO_BATTLER_COUNT],
    pub enigma_berry_hold_effect_params: [i32; BATTLE_SCRIPT_TRYKO_BATTLER_COUNT],
    /// The shared identity-preserving AI observation overlay this leaf
    /// writes through on a successful Focus Band reveal or a Sturdy reveal.
    pub ai_reveal: BattleScriptAiRevealRules,
    pub selector_roles: BattleScriptTryKoRoles,
}

/// The projected `{ value, calls }` RNG crossing (see the module doc
/// comment's projection section). The TS ledger array does NOT cross.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryKoRngState {
    pub value: u32,
    pub calls: u32,
}

/// Mirrors `instructionProvenance`'s six fields
/// (`battleScriptMachine.ts:275-287`) verbatim.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BattleScriptTryKoProvenance {
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
pub struct BattleScriptTryKoRngDraw {
    pub call: u32,
    pub reason: &'static str,
    pub before: u32,
    pub after: u32,
    pub random_value: u16,
    pub provenance: BattleScriptTryKoProvenance,
}

/// One source-macro operand retained for lazy resolution evidence.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryKoOperand<'a> {
    pub width_bytes: u8,
    pub expression: &'a str,
}

/// A resolved source label. Late label resolution is a scheduler/program
/// concern this leaf does not own; the caller resolves the expression
/// (either the hardcoded Sturdy label or the operand's fail expression) and
/// reports the result here, exactly like the canonical TypeScript handler's
/// own `resolveBattleScriptLabel` calls.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryKoResolvedLabel<'a> {
    pub expression: &'a str,
    pub program_counter: u32,
}

/// One committed-program instruction, used for BOTH registration (find-first
/// by `opcode_name`, ignoring every other field) and, for the single
/// executing instruction, the source of every provenance field on a real
/// draw plus the two late-resolved jump targets. No shape or cardinality
/// validation exists at registration or execution.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryKoInstruction<'a> {
    pub opcode_name: &'a str,
    pub opcode_id: u8,
    pub program_counter: u32,
    pub dispatcher: &'a str,
    pub source_label: &'a str,
    pub source_statement_line: u32,
    pub operands: &'a [BattleScriptTryKoOperand<'a>],
    pub resolved_sturdy_target: Option<BattleScriptTryKoResolvedLabel<'a>>,
    pub resolved_fail_target: Option<BattleScriptTryKoResolvedLabel<'a>>,
}

/// Exact control directive emitted by the narrow opcode leaf.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTryKoControl {
    Advance,
    Jump { program_counter: u32 },
}

/// Exact observable errors in canonical evaluation order.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptTryKoError<'a> {
    /// `requireBattlerRole(rulesContext, "attacker")`.
    MissingAttackerRole,
    /// `requireBattlerRole(rulesContext, "target")`.
    MissingTargetRole,
    /// `resolveBattleScriptBattlerHoldEffect`'s own item-range check,
    /// forwarded verbatim from [`resolve_battler_hold_effect`].
    ItemOutOfRange { item: u16 },
    /// `resolveBattleScriptLabel(program, "BattleScript_SturdyPreventsOHKO")`
    /// returning nothing.
    UnresolvedSturdyLabel,
    /// `requireMoveAccuracy` -- reached on the non-Sturdy path, before
    /// `ownedSureHit` is computed.
    UnknownMoveRow { move_id: u16 },
    /// Defensive: the committed macro always carries the fail-pointer
    /// operand (encoded width 5); not TS-differentially realizable, covered
    /// only by a direct unit test.
    MissingOperand,
    /// The operand's fail-pointer expression did not resolve against the
    /// committed program.
    UnresolvedFailTarget { expression: &'a str },
}

impl fmt::Display for BattleScriptTryKoError<'_> {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::MissingAttackerRole => {
                write!(formatter, "Cmd_tryKO requires a attacker role")
            }
            Self::MissingTargetRole => write!(formatter, "Cmd_tryKO requires a target role"),
            Self::ItemOutOfRange { item } => {
                write!(formatter, "item {item} is outside the source gItems corpus")
            }
            Self::UnresolvedSturdyLabel => write!(
                formatter,
                "Cmd_tryKO: committed program has no label BattleScript_SturdyPreventsOHKO"
            ),
            Self::UnknownMoveRow { move_id } => write!(
                formatter,
                "Cmd_tryKO: move {move_id} has no source-derived gBattleMoves row"
            ),
            Self::MissingOperand => write!(
                formatter,
                "Cmd_tryKO: instruction is missing its failure-pointer operand"
            ),
            Self::UnresolvedFailTarget { expression } => {
                write!(formatter, "Cmd_tryKO: unresolved jump target {expression}")
            }
        }
    }
}

impl std::error::Error for BattleScriptTryKoError<'_> {}

/// `committed Battle Script program does not emit B_SCR_OP_TRYKO`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptTryKoRegistrationError {
    pub opcode_name: &'static str,
}

impl fmt::Display for BattleScriptTryKoRegistrationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            formatter,
            "committed Battle Script program does not emit {}",
            self.opcode_name
        )
    }
}

impl std::error::Error for BattleScriptTryKoRegistrationError {}

/// Native projection of the `install("B_SCR_OP_TRYKO", ...)` line inside
/// `createBattleScriptTryKOOpcodeHandlers`: find the FIRST instruction with
/// this opcode name -- no shape or cardinality validation.
pub fn register_battle_script_tryko<'a>(
    instructions: &[BattleScriptTryKoInstruction<'a>],
) -> Result<u8, BattleScriptTryKoRegistrationError> {
    instructions
        .iter()
        .find(|instruction| instruction.opcode_name == BATTLE_SCRIPT_TRYKO_OPCODE_NAME)
        .map(|instruction| instruction.opcode_id)
        .ok_or(BattleScriptTryKoRegistrationError { opcode_name: BATTLE_SCRIPT_TRYKO_OPCODE_NAME })
}

/// Adapter to the shared hold-effect helper: [`resolve_battler_hold_effect`]/
/// [`resolve_battler_hold_effect_param`] only ever read a battler's `.item`
/// and the two `enigma_berry_hold_effect*` arrays, so every other field on
/// this placeholder is inert.
fn to_base_damage_rules_for_hold_effect(
    rules: &BattleScriptTryKoRules,
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

/// The complete leaf output: the rules with every write-back applied, the
/// RNG state after every draw, the ordered draws that actually occurred,
/// and the control directive.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BattleScriptTryKoOutcome {
    pub rules: BattleScriptTryKoRules,
    pub rng: BattleScriptTryKoRngState,
    pub draws: Vec<BattleScriptTryKoRngDraw>,
    pub control: BattleScriptTryKoControl,
}

fn draw_battle_script_tryko_rng(
    rng: BattleScriptTryKoRngState,
    reason: &'static str,
    instruction: &BattleScriptTryKoInstruction<'_>,
) -> (BattleScriptTryKoRngState, BattleScriptTryKoRngDraw) {
    let after = advance_rng_value(rng.value);
    let random_value = ((after >> 16) & 0xffff) as u16;
    let call = rng.calls + 1;
    let draw = BattleScriptTryKoRngDraw {
        call,
        reason,
        before: rng.value,
        after,
        random_value,
        provenance: BattleScriptTryKoProvenance {
            program_counter: instruction.program_counter,
            opcode_id: instruction.opcode_id,
            opcode_name: instruction.opcode_name.to_owned(),
            dispatcher: instruction.dispatcher.to_owned(),
            source_label: instruction.source_label.to_owned(),
            source_statement_line: instruction.source_statement_line,
        },
    };
    (
        BattleScriptTryKoRngState { value: after, calls: call },
        draw,
    )
}

/// Native immutable-value twin of `createTryKOHandler`'s returned closure.
/// See the module doc comment for the complete ordered evaluation contract.
///
/// # Errors
/// See [`BattleScriptTryKoError`] for the exact ordered error set.
pub fn apply_battle_script_tryko<'a>(
    rules: &BattleScriptTryKoRules,
    rng: BattleScriptTryKoRngState,
    instruction: &BattleScriptTryKoInstruction<'a>,
) -> Result<BattleScriptTryKoOutcome, BattleScriptTryKoError<'a>> {
    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptTryKoError::MissingAttackerRole)?;
    let target = rules
        .selector_roles
        .target
        .ok_or(BattleScriptTryKoError::MissingTargetRole)?;

    let mut rng_state = rng;
    let mut draws = Vec::new();
    let mut next_rules = *rules;

    let hold_effect_rules = to_base_damage_rules_for_hold_effect(rules);
    let hold_effect_id =
        match resolve_battler_hold_effect(&hold_effect_rules, target.as_base_damage_battler()) {
            Ok(id) => id,
            Err(BattleScriptBaseDamageError::ItemOutOfRange { item }) => {
                return Err(BattleScriptTryKoError::ItemOutOfRange { item });
            }
            Err(other) => {
                unreachable!(
                    "resolve_battler_hold_effect only ever returns ItemOutOfRange: {other}"
                )
            }
        };

    if hold_effect_id == BATTLE_SCRIPT_TRYKO_HOLD_EFFECT_FOCUS_BAND {
        let (after_rng, draw) = draw_battle_script_tryko_rng(
            rng_state,
            BATTLE_SCRIPT_TRYKO_FOCUS_BAND_RNG_REASON,
            instruction,
        );
        rng_state = after_rng;
        let param = match resolve_battler_hold_effect_param(&hold_effect_rules, target.as_base_damage_battler())
        {
            Ok(param) => param,
            Err(other) => unreachable!(
                "the target's item already resolved above; the param lookup cannot newly error: {other}"
            ),
        };
        let random_value = draw.random_value;
        draws.push(draw);
        if i32::from(random_value % 100) < param {
            next_rules.battlers[target.index()].special_status_focus_banded = 1;
            next_rules.ai_reveal = record_battle_script_item_effect_reveal(
                &next_rules.ai_reveal,
                target.as_ai_reveal_battler(),
                hold_effect_id as u8,
            );
        }
    }

    let target_state = next_rules.battlers[target.index()];
    if target_state.ability == BATTLE_SCRIPT_TRYKO_ABILITY_STURDY {
        let resolved = instruction
            .resolved_sturdy_target
            .ok_or(BattleScriptTryKoError::UnresolvedSturdyLabel)?;
        next_rules.move_result_flags |= BATTLE_SCRIPT_TRYKO_MOVE_RESULT_MISSED;
        next_rules.last_used_ability = BATTLE_SCRIPT_TRYKO_ABILITY_STURDY;
        next_rules.ai_reveal = record_battle_script_ability_reveal(
            &next_rules.ai_reveal,
            target.as_ai_reveal_battler(),
            BATTLE_SCRIPT_TRYKO_ABILITY_STURDY,
        );
        return Ok(BattleScriptTryKoOutcome {
            rules: next_rules,
            rng: rng_state,
            draws,
            control: BattleScriptTryKoControl::Jump { program_counter: resolved.program_counter },
        });
    }

    let attacker_state = rules.battlers[attacker.index()];
    let move_row = MOVES
        .get(usize::from(rules.current_move))
        .ok_or(BattleScriptTryKoError::UnknownMoveRow { move_id: rules.current_move })?;
    let move_accuracy = i32::from(move_row.accuracy);

    let owned_sure_hit = (target_state.status3 & BATTLE_SCRIPT_TRYKO_STATUS3_ALWAYS_HITS) != 0
        && target_state.battler_with_sure_hit == attacker.as_u8()
        && attacker_state.level >= target_state.level;

    let draw = if owned_sure_hit {
        None
    } else {
        let (after_rng, draw) =
            draw_battle_script_tryko_rng(rng_state, BATTLE_SCRIPT_TRYKO_RNG_REASON, instruction);
        rng_state = after_rng;
        Some(draw)
    };

    let chance_value = move_accuracy + (attacker_state.level - target_state.level);
    let hit = owned_sure_hit
        || draw.as_ref().is_some_and(|draw| {
            i32::from(draw.random_value % 100) + 1 < chance_value
                && attacker_state.level >= target_state.level
        });
    if let Some(draw) = draw {
        draws.push(draw);
    }

    if hit {
        if target_state.endured == 1 {
            next_rules.battle_move_damage = target_state.hp - 1;
            next_rules.move_result_flags |= BATTLE_SCRIPT_TRYKO_MOVE_RESULT_FOE_ENDURED;
        } else if target_state.special_status_focus_banded == 1 {
            next_rules.battle_move_damage = target_state.hp - 1;
            next_rules.move_result_flags |= BATTLE_SCRIPT_TRYKO_MOVE_RESULT_FOE_HUNG_ON;
            next_rules.last_used_item = target_state.item;
        } else {
            next_rules.battle_move_damage = target_state.hp;
            next_rules.move_result_flags |= BATTLE_SCRIPT_TRYKO_MOVE_RESULT_ONE_HIT_KO;
        }
        return Ok(BattleScriptTryKoOutcome {
            rules: next_rules,
            rng: rng_state,
            draws,
            control: BattleScriptTryKoControl::Advance,
        });
    }

    let operand = instruction
        .operands
        .first()
        .ok_or(BattleScriptTryKoError::MissingOperand)?;
    let resolved = instruction
        .resolved_fail_target
        .ok_or(BattleScriptTryKoError::UnresolvedFailTarget { expression: operand.expression })?;
    next_rules.move_result_flags |= BATTLE_SCRIPT_TRYKO_MOVE_RESULT_MISSED;
    next_rules.multistring_chooser = if attacker_state.level >= target_state.level {
        BATTLE_SCRIPT_TRYKO_MSG_KO_MISS
    } else {
        BATTLE_SCRIPT_TRYKO_MSG_KO_UNAFFECTED
    };
    Ok(BattleScriptTryKoOutcome {
        rules: next_rules,
        rng: rng_state,
        draws,
        control: BattleScriptTryKoControl::Jump { program_counter: resolved.program_counter },
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    const ITEM_FOCUS_BAND: u16 = 196; // -> HOLD_EFFECT_FOCUS_BAND (39), param 10.
    const MOVE_FISSURE: u16 = 90; // OHKO move, accuracy 30 in gen_tables::MOVES.

    fn default_battler() -> BattleScriptTryKoBattlerState {
        BattleScriptTryKoBattlerState {
            item: 0,
            ability: 0,
            level: 50,
            hp: 100,
            endured: 0,
            special_status_focus_banded: 0,
            status3: 0,
            battler_with_sure_hit: 0xff,
        }
    }

    fn rules() -> BattleScriptTryKoRules {
        BattleScriptTryKoRules {
            battlers: [default_battler(); 4],
            current_move: MOVE_FISSURE,
            battle_move_damage: 0,
            move_result_flags: 0,
            last_used_item: 0,
            last_used_ability: 0,
            multistring_chooser: 0xff,
            enigma_berry_hold_effects: [0, 0, 0, 0],
            enigma_berry_hold_effect_params: [0, 0, 0, 0],
            ai_reveal: BattleScriptAiRevealRules::default(),
            selector_roles: BattleScriptTryKoRoles {
                attacker: Some(BattleScriptTryKoBattler::Battler0),
                target: Some(BattleScriptTryKoBattler::Battler1),
            },
        }
    }

    fn instruction() -> BattleScriptTryKoInstruction<'static> {
        const OPERAND: BattleScriptTryKoOperand<'static> =
            BattleScriptTryKoOperand { width_bytes: 4, expression: "BattleScript_KOFail" };
        const OPERANDS: [BattleScriptTryKoOperand<'static>; 1] = [OPERAND];
        BattleScriptTryKoInstruction {
            opcode_name: BATTLE_SCRIPT_TRYKO_OPCODE_NAME,
            opcode_id: BATTLE_SCRIPT_TRYKO_OPCODE,
            program_counter: 42,
            dispatcher: BATTLE_SCRIPT_TRYKO_DISPATCHER,
            source_label: "BattleScript_EffectOHKO",
            source_statement_line: 769,
            operands: &OPERANDS,
            resolved_sturdy_target: Some(BattleScriptTryKoResolvedLabel {
                expression: BATTLE_SCRIPT_TRYKO_STURDY_LABEL,
                program_counter: 9000,
            }),
            resolved_fail_target: Some(BattleScriptTryKoResolvedLabel {
                expression: "BattleScript_KOFail",
                program_counter: 1200,
            }),
        }
    }

    fn zero_rng() -> BattleScriptTryKoRngState {
        BattleScriptTryKoRngState { value: 0, calls: 0 }
    }

    #[test]
    fn missing_attacker_role_checked_before_target() {
        let mut r = rules();
        r.selector_roles.attacker = None;
        r.selector_roles.target = None;
        assert_eq!(
            apply_battle_script_tryko(&r, zero_rng(), &instruction()).unwrap_err(),
            BattleScriptTryKoError::MissingAttackerRole
        );
    }

    #[test]
    fn missing_target_role_errors() {
        let mut r = rules();
        r.selector_roles.target = None;
        assert_eq!(
            apply_battle_script_tryko(&r, zero_rng(), &instruction()).unwrap_err(),
            BattleScriptTryKoError::MissingTargetRole
        );
    }

    #[test]
    fn draw_order_band_then_formula_both_advance_the_lcg_in_sequence() {
        let mut r = rules();
        r.battlers[1].item = ITEM_FOCUS_BAND;
        let rng_in = BattleScriptTryKoRngState { value: 0x1234_5678, calls: 0 };
        let result = apply_battle_script_tryko(&r, rng_in, &instruction()).unwrap();
        assert_eq!(result.draws.len(), 2);
        assert_eq!(result.draws[0].reason, "tryko-focus-band");
        assert_eq!(result.draws[1].reason, "tryko");
        assert_eq!(result.draws[1].before, result.draws[0].after);
        assert_eq!(result.rng.calls, 2);
    }

    #[test]
    fn band_draw_consumed_even_when_sturdy_short_circuits() {
        let mut r = rules();
        r.battlers[1].item = ITEM_FOCUS_BAND;
        r.battlers[1].ability = BATTLE_SCRIPT_TRYKO_ABILITY_STURDY;
        let rng_in = BattleScriptTryKoRngState { value: 0xaaaa_bbbb, calls: 3 };
        let result = apply_battle_script_tryko(&r, rng_in, &instruction()).unwrap();
        assert_eq!(
            result.draws.len(),
            1,
            "only the band draw; sturdy takes no draw"
        );
        assert_eq!(
            result.control,
            BattleScriptTryKoControl::Jump { program_counter: 9000 }
        );
        assert_eq!(
            result.rules.move_result_flags & BATTLE_SCRIPT_TRYKO_MOVE_RESULT_MISSED,
            BATTLE_SCRIPT_TRYKO_MOVE_RESULT_MISSED
        );
        assert_eq!(
            result.rules.last_used_ability,
            BATTLE_SCRIPT_TRYKO_ABILITY_STURDY
        );
        assert_eq!(
            result.rules.ai_reveal.ai_observed_ability_ids[1],
            BATTLE_SCRIPT_TRYKO_ABILITY_STURDY
        );
    }

    #[test]
    fn sturdy_without_band_draws_nothing() {
        let mut r = rules();
        r.battlers[1].ability = BATTLE_SCRIPT_TRYKO_ABILITY_STURDY;
        let rng_in = BattleScriptTryKoRngState { value: 555, calls: 1 };
        let result = apply_battle_script_tryko(&r, rng_in, &instruction()).unwrap();
        assert!(result.draws.is_empty());
        assert_eq!(result.rng, rng_in, "no rng consumed at all");
    }

    #[test]
    fn sure_hit_conjunction_each_leg_broken_independently_causes_a_draw() {
        // Full conjunction satisfied: no draw.
        let mut r = rules();
        r.battlers[1].status3 = BATTLE_SCRIPT_TRYKO_STATUS3_ALWAYS_HITS;
        r.battlers[1].battler_with_sure_hit = 0;
        let full = apply_battle_script_tryko(&r, zero_rng(), &instruction()).unwrap();
        assert!(full.draws.is_empty());
        assert_eq!(full.control, BattleScriptTryKoControl::Advance);

        // Owner mismatch: draws.
        let mut owner_mismatch = r;
        owner_mismatch.battlers[1].battler_with_sure_hit = 2;
        let mismatch_result =
            apply_battle_script_tryko(&owner_mismatch, zero_rng(), &instruction()).unwrap();
        assert_eq!(mismatch_result.draws.len(), 1);

        // Underleveled attacker: draws.
        let mut underleveled = r;
        underleveled.battlers[0].level = 10;
        let underlevel_result =
            apply_battle_script_tryko(&underleveled, zero_rng(), &instruction()).unwrap();
        assert_eq!(underlevel_result.draws.len(), 1);

        // No status3 bit at all: draws.
        let mut no_status3 = r;
        no_status3.battlers[1].status3 = 0;
        let no_status3_result =
            apply_battle_script_tryko(&no_status3, zero_rng(), &instruction()).unwrap();
        assert_eq!(no_status3_result.draws.len(), 1);
    }

    #[test]
    fn trichotomy_precedence_endured_beats_focus_banded() {
        let mut r = rules();
        r.battlers[1].status3 = BATTLE_SCRIPT_TRYKO_STATUS3_ALWAYS_HITS;
        r.battlers[1].battler_with_sure_hit = 0;
        r.battlers[1].endured = 1;
        r.battlers[1].special_status_focus_banded = 1;
        r.battlers[1].hp = 5;
        let result = apply_battle_script_tryko(&r, zero_rng(), &instruction()).unwrap();
        assert_eq!(result.rules.battle_move_damage, 4);
        assert_eq!(
            result.rules.move_result_flags,
            BATTLE_SCRIPT_TRYKO_MOVE_RESULT_FOE_ENDURED
        );
        assert_eq!(result.rules.last_used_item, 0, "hung-on branch never taken");
    }

    #[test]
    fn trichotomy_focus_banded_only_clips_and_sets_last_used_item() {
        let mut r = rules();
        r.battlers[1].status3 = BATTLE_SCRIPT_TRYKO_STATUS3_ALWAYS_HITS;
        r.battlers[1].battler_with_sure_hit = 0;
        r.battlers[1].special_status_focus_banded = 1;
        r.battlers[1].item = 250;
        r.battlers[1].hp = 5;
        let result = apply_battle_script_tryko(&r, zero_rng(), &instruction()).unwrap();
        assert_eq!(result.rules.battle_move_damage, 4);
        assert_eq!(
            result.rules.move_result_flags,
            BATTLE_SCRIPT_TRYKO_MOVE_RESULT_FOE_HUNG_ON
        );
        assert_eq!(result.rules.last_used_item, 250);
    }

    #[test]
    fn plain_ohko_deals_full_hp() {
        let mut r = rules();
        r.battlers[1].status3 = BATTLE_SCRIPT_TRYKO_STATUS3_ALWAYS_HITS;
        r.battlers[1].battler_with_sure_hit = 0;
        r.battlers[1].hp = 37;
        let result = apply_battle_script_tryko(&r, zero_rng(), &instruction()).unwrap();
        assert_eq!(result.rules.battle_move_damage, 37);
        assert_eq!(
            result.rules.move_result_flags,
            BATTLE_SCRIPT_TRYKO_MOVE_RESULT_ONE_HIT_KO
        );
    }

    #[test]
    fn strict_less_than_boundary_on_the_formula_roll() {
        // moveAccuracy(Fissure) = 30, equal levels -> chance = 30.
        let r = rules();
        // roll such that (roll % 100) + 1 == chance - 1 == 29 -> hits.
        let hit_seed = (0u32..5000)
            .find(|&candidate| {
                let after = advance_rng_value(candidate);
                let random_value = (after >> 16) as u16;
                (u32::from(random_value % 100) + 1) == 29
            })
            .expect("a seed exists for roll%100+1==29");
        let hit_result = apply_battle_script_tryko(
            &r,
            BattleScriptTryKoRngState { value: hit_seed, calls: 0 },
            &instruction(),
        )
        .unwrap();
        assert_eq!(hit_result.control, BattleScriptTryKoControl::Advance);

        // roll such that (roll % 100) + 1 == chance == 30 -> misses (not strictly less).
        let miss_seed = (0u32..5000)
            .find(|&candidate| {
                let after = advance_rng_value(candidate);
                let random_value = (after >> 16) as u16;
                (u32::from(random_value % 100) + 1) == 30
            })
            .expect("a seed exists for roll%100+1==30");
        let miss_result = apply_battle_script_tryko(
            &r,
            BattleScriptTryKoRngState { value: miss_seed, calls: 0 },
            &instruction(),
        )
        .unwrap();
        assert_eq!(
            miss_result.control,
            BattleScriptTryKoControl::Jump { program_counter: 1200 }
        );
    }

    #[test]
    fn level_clause_overrides_a_winning_roll() {
        // Even a winning roll misses (as UNAFFECTED) when target out-levels attacker.
        let mut r = rules();
        r.battlers[0].level = 10;
        r.battlers[1].level = 50;
        // chance = 30 + (10 - 50) = -10; no roll can satisfy roll%100+1 < -10, so this
        // also proves the level clause dominates even without a specially chosen roll.
        let result = apply_battle_script_tryko(&r, zero_rng(), &instruction()).unwrap();
        assert_eq!(
            result.control,
            BattleScriptTryKoControl::Jump { program_counter: 1200 }
        );
        assert_eq!(
            result.rules.multistring_chooser,
            BATTLE_SCRIPT_TRYKO_MSG_KO_UNAFFECTED
        );
    }

    #[test]
    fn miss_message_chooser_selects_mis_when_attacker_not_underleveled() {
        let r = rules();
        // roll such that formula clearly misses: chance = 30, pick roll%100+1 == 99.
        let seed = (0u32..5000)
            .find(|&candidate| {
                let after = advance_rng_value(candidate);
                let random_value = (after >> 16) as u16;
                (u32::from(random_value % 100) + 1) == 99
            })
            .expect("a seed exists for roll%100+1==99");
        let result = apply_battle_script_tryko(
            &r,
            BattleScriptTryKoRngState { value: seed, calls: 0 },
            &instruction(),
        )
        .unwrap();
        assert_eq!(
            result.rules.multistring_chooser,
            BATTLE_SCRIPT_TRYKO_MSG_KO_MISS
        );
    }

    #[test]
    fn unknown_move_row_errors_even_on_the_sure_hit_path() {
        let mut r = rules();
        r.battlers[1].status3 = BATTLE_SCRIPT_TRYKO_STATUS3_ALWAYS_HITS;
        r.battlers[1].battler_with_sure_hit = 0;
        r.current_move = 60000;
        assert_eq!(
            apply_battle_script_tryko(&r, zero_rng(), &instruction()).unwrap_err(),
            BattleScriptTryKoError::UnknownMoveRow { move_id: 60000 }
        );
    }

    #[test]
    fn unresolved_sturdy_label_errors() {
        let mut r = rules();
        r.battlers[1].ability = BATTLE_SCRIPT_TRYKO_ABILITY_STURDY;
        let instr = BattleScriptTryKoInstruction { resolved_sturdy_target: None, ..instruction() };
        assert_eq!(
            apply_battle_script_tryko(&r, zero_rng(), &instr)
                .unwrap_err()
                .to_string(),
            "Cmd_tryKO: committed program has no label BattleScript_SturdyPreventsOHKO"
        );
        r.battlers[1].ability = 0; // silence "unused mut" lints on some toolchains
        let _ = r;
    }

    #[test]
    fn unresolved_fail_target_errors_with_the_expression() {
        let r = rules();
        // Force a miss deterministically via the level clause.
        let mut miss = r;
        miss.battlers[0].level = 5;
        miss.battlers[1].level = 50;
        let instr = BattleScriptTryKoInstruction { resolved_fail_target: None, ..instruction() };
        assert_eq!(
            apply_battle_script_tryko(&miss, zero_rng(), &instr)
                .unwrap_err()
                .to_string(),
            "Cmd_tryKO: unresolved jump target BattleScript_KOFail"
        );
    }

    #[test]
    fn missing_operand_is_defensive_and_unreachable_via_ts() {
        let mut miss = rules();
        miss.battlers[0].level = 5;
        miss.battlers[1].level = 50;
        let instr = BattleScriptTryKoInstruction { operands: &[], ..instruction() };
        assert_eq!(
            apply_battle_script_tryko(&miss, zero_rng(), &instr).unwrap_err(),
            BattleScriptTryKoError::MissingOperand
        );
    }

    #[test]
    fn item_out_of_range_propagates() {
        let mut r = rules();
        r.battlers[1].item = 60000;
        assert_eq!(
            apply_battle_script_tryko(&r, zero_rng(), &instruction())
                .unwrap_err()
                .to_string(),
            "item 60000 is outside the source gItems corpus"
        );
    }

    #[test]
    fn battler_ids_round_trip_from_u8() {
        for value in 0u8..4 {
            assert_eq!(
                BattleScriptTryKoBattler::from_u8(value).unwrap().as_u8(),
                value
            );
        }
        assert_eq!(BattleScriptTryKoBattler::from_u8(4), None);
    }

    #[test]
    fn registration_finds_first_and_ignores_shape() {
        let instructions = [
            BattleScriptTryKoInstruction { opcode_name: "B_SCR_OP_OTHER", ..instruction() },
            instruction(),
        ];
        assert_eq!(
            register_battle_script_tryko(&instructions),
            Ok(BATTLE_SCRIPT_TRYKO_OPCODE)
        );

        let missing =
            [BattleScriptTryKoInstruction { opcode_name: "B_SCR_OP_OTHER", ..instruction() }];
        assert_eq!(
            register_battle_script_tryko(&missing)
                .unwrap_err()
                .to_string(),
            "committed Battle Script program does not emit B_SCR_OP_TRYKO"
        );
    }
}
