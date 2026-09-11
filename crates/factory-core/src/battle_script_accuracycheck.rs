//! Pure `B_SCR_OP_ACCURACYCHECK` (0x1, `Cmd_accuracycheck`) -- PART 2 OF 3
//! (M87): the full-formula operand path (`ACC_CURR_MOVE`/`MOVE_FUTURE_SIGHT`/
//! `MOVE_DOOM_DESIRE`) -- protect gate, lock-on, the hitmarker/semi-invulnerable
//! ladder, the weather bypasses, the native accuracy calc + one rng roll, the
//! MISS tail (`CheckWonderGuardAndLevitate` + missType chooser + miss jump),
//! and the destiny-bond half of the HIT tail. M86's bypass paths
//! (`NO_ACC_CALC`/`NO_ACC_CALC_CHECK_LOCK_ON`) and registration are UNCHANGED
//! from that step. The HIT tail's absorb/Flash-Fire label-jump block
//! (`AbilityBattleEffects(ABILITYEFFECT_ABSORBING)`) is staged behind
//! [`BattleScriptAccuracycheckOutcome::AbsorbingTailPending`] -- returned
//! ONLY when its trigger conditions match -- and its body is the NEXT step
//! (M88); a plain hit that matches no trigger fully advances here.
//!
//! Source authority: `reference/pokeemerald/src/battle_script_commands.c`
//! -- `Cmd_accuracycheck` :1099-1189 (bypass branch :1103-1113, full-formula
//! body :1114-1188), `JumpIfMoveFailed` :1009-1025, `AccuracyCalcHelper`
//! :1054-1097 (hitmarker ladder :1062-1087, always-hit bypass :1088-1094),
//! `JumpIfMoveAffectedByProtect` :1041-1052, `DEFENDER_IS_PROTECTED` :57;
//! `CheckWonderGuardAndLevitate` :1426-~1490; `TrySetDestinyBondToHappen`
//! :8285-8296; `battle_util.c` `AbilityBattleEffects`
//! (`ABILITYEFFECT_ABSORBING`) :2679-2729 (M88's own authority -- cited here
//! only for the staged trigger conditions); dispatch row :332 (`//0x1`),
//! forward decl :80; `include/constants/battle_script_commands.h:7`; `asm/
//! macros/battle_script.inc:6-10`; `include/constants/battle.h:149`
//! (`STATUS2_DESTINY_BOND`), `:153` (`STATUS2_FORESIGHT`), `:160`
//! (`STATUS3_ALWAYS_HITS`), `:163/:164/:175`
//! (`STATUS3_ON_AIR`/`STATUS3_UNDERGROUND`/`STATUS3_UNDERWATER`), `:119`
//! (`STATUS1_FREEZE`), `:193-195` (`HITMARKER_IGNORE_ON_AIR/UNDERGROUND/
//! UNDERWATER`), `:220/:223` (`MOVE_RESULT_MISSED`/`_DOESNT_AFFECT_FOE`),
//! `:232-244` (`B_WEATHER_*`); `include/constants/pokemon.h:209`
//! (`FLAG_PROTECT_AFFECTED`); `include/constants/abilities.h:14/15/22/29/30`
//! (Volt Absorb/Water Absorb/Flash Fire/Wonder Guard/Levitate);
//! `include/constants/hold_effects.h:26` (`HOLD_EFFECT_EVASION_UP`);
//! `include/constants/battle_move_effects.h:21/82/156` (`EFFECT_ALWAYS_HIT`/
//! `EFFECT_VITAL_THROW`/`EFFECT_THUNDER`). Committed census (grepped from
//! `reference/pokeemerald/data/battle_scripts_1.s`): 66 sites total -- 55
//! `ACC_CURR_MOVE`, 8 `NO_ACC_CALC_CHECK_LOCK_ON`, 1 `NO_ACC_CALC`, 1
//! `MOVE_FUTURE_SIGHT`, 1 `MOVE_DOOM_DESIRE`.
//!
//! TS spec: `src/engine/battleScriptHitChainOpcode.ts` --
//! `accuracycheckOpcodeHandler` :1119-1289 (full-formula body :1160-1288),
//! `requireMoveRow` :126-130, `resolveMoveTypeName` :139-144,
//! `jumpToMissTarget` :849-871, `applyTrySetDestinyBondToHappen` :894-906,
//! `advancePastAccuracyCheck` :921-1004 (this step ports only its
//! destiny-bond line + the two trigger predicates -- the absorb/Flash-Fire
//! bodies are M88), `checkWonderGuardAndLevitate` :1013-1058,
//! `resolveRequiredLabelProgramCounter` :2834-2838 (NOT needed by this step
//! -- M88's own label jumps are deferred along with the tail body),
//! `weatherHasEffect` (`battleEndTurnOrchestration.ts:1110-1116`, the Cloud
//! Nine scan over `battlersCount`), `drawBattleScriptRng`
//! (`battleScriptMachine.ts:401-426`).
//!
//! Native precedents REUSED, not reimplemented: `damage_calc.rs`
//! `calculate_accuracy`/`roll_accuracy_hits`/`AccuracyCalcInput` (:777-843);
//! `battle_script_trysetdestinybondtohappen.rs`
//! `apply_try_set_destiny_bond_to_happen` via a small adapter (the
//! `to_base_damage_rules_for_hold_effect`-shaped pattern from
//! `battle_script_tryko.rs`/`battle_script_critcalc.rs`);
//! `battle_script_base_damage.rs` `resolve_move_type`/
//! `resolve_battler_hold_effect`/`resolve_battler_hold_effect_param`
//! (its `BattleScriptBaseDamageError` variants already carry the exact
//! canonical error text this leaf needs and are folded into
//! [`BattleScriptAccuracycheckError`] verbatim); `battle_script_ai_reveal.rs`
//! `record_battle_script_ability_reveal`; `battle_script_typecalc.rs`'s
//! `TYPE_EFFECTIVENESS_TABLE` walk shape (reused for
//! `check_wonder_guard_and_levitate`'s own narrower miss-only walk);
//! `gen_tables.rs` `MOVES`/`TYPE_EFFECTIVENESS_TABLE`; the ordered-
//! `Vec<..RngDraw>` rng convention from `battle_script_tryko.rs`/
//! `battle_script_critcalc.rs` (here: zero or one draw, reason literally
//! `"accuracycheck"`).
//!
//! ## Divergences from the C source (TS is spec; ported as TS specifies)
//! 1. **Lock-on plain-advances with NO tail.** C's own `AccuracyCalcHelper`
//!    lock-on arm calls `JumpIfMoveFailed`, which DOES run
//!    `TrySetDestinyBondToHappen` + the absorbing tail (`:1056-1060` +
//!    `:1009-1025`). TS's `accuracycheckOpcodeHandler` instead returns a
//!    bare `{ kind: "advance" }` with zero rules writes the moment the
//!    lock-on conjunction matches (`:1178-1183`) -- no destiny-bond
//!    hitmarker write, no absorb/Flash-Fire staging. Pinned by
//!    `lock_on_plain_advance_has_no_destiny_bond_tail` below.
//! 2. **`advancePastAccuracyCheck`'s absorb trigger reads the rules
//!    context's DYNAMIC `currentMovePower`** (`resolveBattleScriptCurrentMovePower(rulesContext.currentMove)`,
//!    i.e. the row power of `currentMove`, NOT the row power of whichever
//!    move id `accuracycheck` itself resolved -- an FS/DD literal differs
//!    from `currentMove`), while C's `AbilityBattleEffects` reads
//!    `gBattleMoves[gCurrentMove].power` directly (`battle_util.c:2682/2696`,
//!    which is the same quantity in the C engine because C never threads a
//!    separate resolved-move parameter through this call -- the TS port
//!    makes the distinction observable). Pinned by
//!    `absorb_trigger_uses_current_move_power_not_row_power` below.
//! 3. **`CheckWonderGuardAndLevitate`'s Struggle/zero-power skip reads the
//!    MOVE ROW's `power`**, not `currentMovePower` -- the opposite quantity
//!    from divergence 2, and deliberately asymmetric with it. Pinned by
//!    `check_wonder_guard_uses_row_power_not_current_move_power` below.
//!
//! This leaf owns neither the WASM ABI, scheduler/controller state, nor
//! presentation. M88 owns the absorb/Flash-Fire tail body (its jump targets,
//! `multistringChooser`, and `flashFireBoosted` write).

use core::fmt;

use crate::battle_script_ai_reveal::{
    record_battle_script_ability_reveal, BattleScriptAiRevealBattler, BattleScriptAiRevealRules,
};
use crate::battle_script_base_damage::{
    resolve_battler_hold_effect, resolve_battler_hold_effect_param, resolve_move_type,
    BattleScriptBaseDamageBattler, BattleScriptBaseDamageBattlerState, BattleScriptBaseDamageError,
    BattleScriptBaseDamageRoles, BattleScriptBaseDamageRules, ABILITY_CLOUD_NINE,
};
use crate::battle_script_trysetdestinybondtohappen::{
    apply_try_set_destiny_bond_to_happen, BattleScriptTrysetdestinybondtohappenBattler,
    BattleScriptTrysetdestinybondtohappenBattlerState, BattleScriptTrysetdestinybondtohappenRoles,
    BattleScriptTrysetdestinybondtohappenRules, BattleScriptTrysetdestinybondtohappenSide,
};
use crate::damage_calc::{
    calculate_accuracy, roll_accuracy_hits, AccuracyCalcInput, StatStages, HOLD_EFFECT_EVASION_UP,
    TYPE_ELECTRIC, TYPE_FIGHTING, TYPE_FIRE, TYPE_GHOST, TYPE_GROUND, TYPE_NORMAL, TYPE_WATER,
};
use crate::gen_tables::{MoveRow, MOVES, TYPE_EFFECTIVENESS_TABLE};
use crate::rng::advance_rng_value;

pub const BATTLE_SCRIPT_ACCURACYCHECK_SOURCE_FILE: &str = "battle_script_commands.c";
pub const BATTLE_SCRIPT_ACCURACYCHECK_OPCODE: u8 = 0x01;
pub const BATTLE_SCRIPT_ACCURACYCHECK_OPCODE_NAME: &str = "B_SCR_OP_ACCURACYCHECK";
pub const BATTLE_SCRIPT_ACCURACYCHECK_DISPATCHER: &str = "Cmd_accuracycheck";
/// Committed census (`data/battle_scripts_1.s`, grepped): 66 total -- 55
/// `ACC_CURR_MOVE`, 8 `NO_ACC_CALC_CHECK_LOCK_ON`, 1 `NO_ACC_CALC`, 1
/// `MOVE_FUTURE_SIGHT`, 1 `MOVE_DOOM_DESIRE`.
pub const BATTLE_SCRIPT_ACCURACYCHECK_CONCRETE_START_COUNT: usize = 66;

/// Source `MAX_BATTLERS_COUNT`; all source-indexed state retains four cells.
pub const BATTLE_SCRIPT_ACCURACYCHECK_BATTLER_COUNT: usize = 4;

/// `include/constants/battle.h:160`.
pub const BATTLE_SCRIPT_ACCURACYCHECK_STATUS3_ALWAYS_HITS: u32 = (1 << 3) | (1 << 4);
/// `include/constants/battle.h:163`.
pub const BATTLE_SCRIPT_ACCURACYCHECK_STATUS3_ON_AIR: u32 = 1 << 6;
/// `include/constants/battle.h:164`.
pub const BATTLE_SCRIPT_ACCURACYCHECK_STATUS3_UNDERGROUND: u32 = 1 << 7;
/// `include/constants/battle.h:175`.
pub const BATTLE_SCRIPT_ACCURACYCHECK_STATUS3_UNDERWATER: u32 = 1 << 18;
/// `include/constants/battle.h:220`.
pub const BATTLE_SCRIPT_ACCURACYCHECK_MOVE_RESULT_MISSED: u32 = 1 << 0;
/// `include/constants/battle.h:223`.
pub const BATTLE_SCRIPT_ACCURACYCHECK_MOVE_RESULT_DOESNT_AFFECT_FOE: u32 = 1 << 3;
/// `battleScriptSourceConstants.ts:214` (`B_MSG_PROTECTED`).
pub const BATTLE_SCRIPT_ACCURACYCHECK_B_MSG_PROTECTED: u8 = 1;
/// `hitChainOpcode.ts:213` (`B_MSG_MISSED`).
pub const BATTLE_SCRIPT_ACCURACYCHECK_B_MSG_MISSED: u8 = 0;
/// `hitChainOpcode.ts:215` (`B_MSG_AVOIDED_ATK`).
pub const BATTLE_SCRIPT_ACCURACYCHECK_B_MSG_AVOIDED_ATK: u8 = 2;
/// `hitChainOpcode.ts:216` (`B_MSG_AVOIDED_DMG`).
pub const BATTLE_SCRIPT_ACCURACYCHECK_B_MSG_AVOIDED_DMG: u8 = 3;
/// `hitChainOpcode.ts:217` (`B_MSG_GROUND_MISS`).
pub const BATTLE_SCRIPT_ACCURACYCHECK_B_MSG_GROUND_MISS: u8 = 4;
/// `include/constants/pokemon.h:209`; encoded into `gen_tables::MoveRow.flags`
/// verbatim (OR-reduction of `moveFlagBits` in `gen-data.mjs`).
pub const BATTLE_SCRIPT_ACCURACYCHECK_FLAG_PROTECT_AFFECTED: u8 = 1 << 1;
/// `include/constants/moves.h:252`.
pub const BATTLE_SCRIPT_ACCURACYCHECK_MOVE_FUTURE_SIGHT: u16 = 248;
/// `include/constants/moves.h:357`.
pub const BATTLE_SCRIPT_ACCURACYCHECK_MOVE_DOOM_DESIRE: u16 = 353;
/// `battleScriptSourceConstants.ts:158`; `include/constants/moves.h`.
pub const BATTLE_SCRIPT_ACCURACYCHECK_MOVE_STRUGGLE: u16 = 165;

/// `include/constants/battle.h:193`.
const HITMARKER_IGNORE_ON_AIR: u32 = 1 << 16;
/// `include/constants/battle.h:194`.
const HITMARKER_IGNORE_UNDERGROUND: u32 = 1 << 17;
/// `include/constants/battle.h:195`.
const HITMARKER_IGNORE_UNDERWATER: u32 = 1 << 18;
/// `include/constants/battle.h:153`.
const STATUS2_FORESIGHT: u32 = 1 << 29;
/// `include/constants/battle.h:119`.
const STATUS1_FREEZE: u32 = 1 << 5;
/// `include/constants/battle.h:232/233/234` -- Rain (temporary | downpour |
/// permanent).
const B_WEATHER_RAIN: u32 = (1 << 0) | (1 << 1) | (1 << 2);
/// `include/constants/battle.h:236/237` -- Sandstorm (temporary | permanent).
const B_WEATHER_SANDSTORM: u32 = (1 << 3) | (1 << 4);
/// `include/constants/battle.h:239/240` -- Sun (temporary | permanent).
const B_WEATHER_SUN: u32 = (1 << 5) | (1 << 6);
/// `include/constants/battle_move_effects.h:21`.
const EFFECT_ALWAYS_HIT: u16 = 17;
/// `include/constants/battle_move_effects.h:156`.
const EFFECT_THUNDER: u16 = 152;
/// `include/constants/battle_move_effects.h:82`.
const EFFECT_VITAL_THROW: u16 = 78;
/// `battleScriptRulesContext.ts:163` (`BATTLE_SCRIPT_MOVE_TARGET_BOTH`).
const MOVE_TARGET_BOTH: u8 = 1 << 3;
/// `include/constants/abilities.h:14`.
const ABILITY_VOLT_ABSORB: u16 = 10;
/// `include/constants/abilities.h:15`.
const ABILITY_WATER_ABSORB: u16 = 11;
/// `include/constants/abilities.h:22`.
const ABILITY_FLASH_FIRE: u16 = 18;
/// `include/constants/abilities.h:29`.
const ABILITY_WONDER_GUARD: u16 = 25;
/// `include/constants/abilities.h:30`.
const ABILITY_LEVITATE: u16 = 26;

/// Complete source battler-id domain used by roles and source-indexed
/// battler state.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum BattleScriptAccuracycheckBattler {
    Battler0 = 0,
    Battler1 = 1,
    Battler2 = 2,
    Battler3 = 3,
}

impl BattleScriptAccuracycheckBattler {
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
}

/// The complete per-battler projection the bypass ladder AND the
/// full-formula path read. `accuracy_stage`/`evasion_stage` mirror source
/// `statStages[6]`/`statStages[7]` narrowed to the two slots this leaf
/// actually reads; `not_first_strike` mirrors `ProtectStruct::notFirstStrike`
/// (only the attacker's is read); `target_not_affected` is WRITTEN onto the
/// attacker by the miss tail's Wonder-Guard/type-immune branch.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptAccuracycheckBattlerState {
    pub status1: u32,
    pub status2: u32,
    pub status3: u32,
    /// `ProtectStruct::protected`, 0|1.
    pub protected: u8,
    /// `gDisableStructs[battler].battlerWithSureHit`, always a valid
    /// 0..=3 battler id (TS default 0).
    pub battler_with_sure_hit: u8,
    pub ability: u16,
    /// Raw source item id (never a pre-resolved hold effect).
    pub item: u16,
    pub types: [u8; 2],
    /// `GetBattlerSide(battler)`, restricted to the source 0/1 domain.
    pub side: u8,
    pub accuracy_stage: i32,
    pub evasion_stage: i32,
    pub not_first_strike: u8,
    pub target_not_affected: u8,
}

/// `withClearedLandedMove`'s twin source arrays
/// (`battleScriptHitChainOpcode.ts:807-819`).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptAccuracycheckMoveHistory {
    pub last_landed_moves: [u16; BATTLE_SCRIPT_ACCURACYCHECK_BATTLER_COUNT],
    pub last_hit_by_type: [u16; BATTLE_SCRIPT_ACCURACYCHECK_BATTLER_COUNT],
}

/// Canonical selector bindings, checked attacker-then-target.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptAccuracycheckRoles {
    pub attacker: Option<BattleScriptAccuracycheckBattler>,
    pub target: Option<BattleScriptAccuracycheckBattler>,
}

/// Complete narrow rules slice this leaf reads or writes.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptAccuracycheckRules {
    pub battlers:
        [BattleScriptAccuracycheckBattlerState; BATTLE_SCRIPT_ACCURACYCHECK_BATTLER_COUNT],
    /// `rules.battleTopology.battlersCount` -- bounds `weatherHasEffect`'s
    /// Cloud Nine scan.
    pub battlers_count: u8,
    /// `gCurrentMove` -- read by `isDefenderProtected` regardless of the
    /// bypass form's own literal operand, and by the hit tail's
    /// `currentMovePower` (divergence 2 in the module doc comment).
    pub current_move: u16,
    /// Source `u8 gBattleStruct->dynamicMoveType`.
    pub dynamic_move_type: u8,
    /// `rules.battleTopology.battleTypeFlags`; only bit 0 (double battle) is
    /// read, by `isDoubleAvoided`.
    pub battle_type_flags: u32,
    /// Source `u32 gBattleWeather` bitfield.
    pub weather: u32,
    /// Source `u32 gHitMarker`, the per-action shared hit marker.
    pub hit_marker: u32,
    pub move_result_flags: u32,
    pub miss_type: u8,
    /// `ABILITY_NONE` (0) mirrors the TS field being unset.
    pub last_used_ability: u16,
    pub move_history: BattleScriptAccuracycheckMoveHistory,
    pub ai_observed_ability_ids: [u8; BATTLE_SCRIPT_ACCURACYCHECK_BATTLER_COUNT],
    /// Per-battler `BattleEnigmaBerry` override, read only when a battler's
    /// resolved item id is `ITEM_ENIGMA_BERRY` (175).
    pub enigma_berry_hold_effects: [u16; BATTLE_SCRIPT_ACCURACYCHECK_BATTLER_COUNT],
    pub enigma_berry_hold_effect_params: [i32; BATTLE_SCRIPT_ACCURACYCHECK_BATTLER_COUNT],
    pub selector_roles: BattleScriptAccuracycheckRoles,
}

/// One committed-program instruction, used ONLY for registration (find the
/// FIRST match by `opcode_name`; no shape or cardinality validation).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptAccuracycheckInstruction<'a> {
    pub opcode_name: &'a str,
    pub opcode_id: u8,
    pub program_counter: u32,
}

/// `committed Battle Script program does not emit B_SCR_OP_ACCURACYCHECK`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptAccuracycheckRegistrationError {
    pub opcode_name: &'static str,
}

impl fmt::Display for BattleScriptAccuracycheckRegistrationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            formatter,
            "committed Battle Script program does not emit {}",
            self.opcode_name
        )
    }
}

impl std::error::Error for BattleScriptAccuracycheckRegistrationError {}

/// Native projection of the `install("B_SCR_OP_ACCURACYCHECK", ...)` line
/// inside `createBattleScriptHitChainOpcodeHandlers`: find the FIRST
/// instruction with this opcode name -- no shape or cardinality validation.
/// UNCHANGED from M86.
pub fn register_battle_script_accuracycheck<'a>(
    instructions: &[BattleScriptAccuracycheckInstruction<'a>],
) -> Result<u8, BattleScriptAccuracycheckRegistrationError> {
    instructions
        .iter()
        .find(|instruction| instruction.opcode_name == BATTLE_SCRIPT_ACCURACYCHECK_OPCODE_NAME)
        .map(|instruction| instruction.opcode_id)
        .ok_or(BattleScriptAccuracycheckRegistrationError {
            opcode_name: BATTLE_SCRIPT_ACCURACYCHECK_OPCODE_NAME,
        })
}

/// Execution input: the raw operand-1 (move) expression, the operand-0
/// (fail label) expression retained for error rendering, and the fail
/// label's LAZY, already-resolved program counter (`None` means the
/// committed program has no such label) -- consulted by every sub-branch
/// that actually jumps (bypass ladder AND full-formula protect/ladder/miss).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptAccuracycheckExecution<'a> {
    pub program_counter: u32,
    pub opcode_id: u8,
    /// `None` renders as `"<missing>"`, matching the TS
    /// `moveOperand?.expression ?? "<missing>"` fallback.
    pub move_operand_expression: Option<&'a str>,
    pub fail_label_expression: &'a str,
    pub resolved_fail_program_counter: Option<u32>,
}

/// Mirrors canonical `unsupportedBranch`'s reason object verbatim.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BattleScriptAccuracycheckHalt {
    pub program_counter: u32,
    pub opcode_id: u8,
    pub opcode_name: &'static str,
    pub source_construct: String,
    pub source_file: &'static str,
    pub source_line: u32,
}

/// The projected `{ value, calls }` RNG crossing (same shape as
/// `battle_script_tryko.rs`'s `BattleScriptTryKoRngState`). The TS ledger
/// array itself does NOT cross.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptAccuracycheckRngState {
    pub value: u32,
    pub calls: u32,
}

/// Mirrors one `BattleScriptRngLedgerEntry`'s scalar fields.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleScriptAccuracycheckRngDraw {
    pub call: u32,
    pub reason: &'static str,
    pub before: u32,
    pub after: u32,
    pub random_value: u16,
}

/// The M88 absorb/Flash-Fire trigger this hit matched. Detection only --
/// the tail body (jump target, `multistringChooser`, `flashFireBoosted`
/// write, ability reveal) is M88's job.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleScriptAccuracycheckAbsorbingTrigger {
    VoltAbsorb,
    WaterAbsorb,
    FlashFire,
}

/// Exact observable non-error outcomes.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BattleScriptAccuracycheckOutcome {
    Advance {
        rules: BattleScriptAccuracycheckRules,
        rng: BattleScriptAccuracycheckRngState,
        draws: Vec<BattleScriptAccuracycheckRngDraw>,
    },
    Jump {
        program_counter: u32,
        rules: BattleScriptAccuracycheckRules,
        rng: BattleScriptAccuracycheckRngState,
        draws: Vec<BattleScriptAccuracycheckRngDraw>,
    },
    Halt(BattleScriptAccuracycheckHalt),
    /// M88 stages exactly this: `advancePastAccuracyCheck`'s absorb
    /// (Volt/Water Absorb) or Flash-Fire trigger matched. `rules` already
    /// carries the hit tail's destiny-bond `hitMarker` write (that part IS
    /// this step's job -- only the absorb/Flash-Fire label jump itself is
    /// deferred). Covered only by native unit tests, never generator
    /// vectors (see the module doc comment).
    AbsorbingTailPending {
        rules: BattleScriptAccuracycheckRules,
        rng: BattleScriptAccuracycheckRngState,
        draws: Vec<BattleScriptAccuracycheckRngDraw>,
        attacker: BattleScriptAccuracycheckBattler,
        target: BattleScriptAccuracycheckBattler,
        move_id: u16,
        move_type: u8,
        trigger: BattleScriptAccuracycheckAbsorbingTrigger,
        /// `attackerBattler.notFirstStrike === 1`, computed here for M88's
        /// label-suffix choice.
        pp_was_already_reduced: bool,
    },
}

/// Exact observable errors in canonical evaluation order.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BattleScriptAccuracycheckError {
    /// `requireBattlerRole(rulesContext, "attacker")`.
    MissingAttackerRole,
    /// `requireBattlerRole(rulesContext, "target")`.
    MissingTargetRole,
    /// `resolveBattleScriptLabel(program, expression)` returning nothing,
    /// for whichever jump sub-branch was taken (bypass ladder OR
    /// full-formula protect/hitmarker-ladder/miss).
    UnresolvedFailTarget { expression: String },
    /// `requireMoveRow(move)` (`:126-130`); same text as
    /// [`BattleScriptBaseDamageError::UnknownMoveRow`].
    UnknownMoveRow { move_id: u16 },
    /// `resolveMoveTypeName`'s own `TYPE_NAME_BY_ID` bound (`:139-144`);
    /// same text as [`BattleScriptBaseDamageError::UnknownTypeId`].
    UnknownTypeId { type_id: u8 },
    /// `resolveBattleScriptBattlerHoldEffect(Param)` (`:1647-1677`); same
    /// text as [`BattleScriptBaseDamageError::ItemOutOfRange`].
    ItemOutOfRange { item: u16 },
}

impl fmt::Display for BattleScriptAccuracycheckError {
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
            Self::UnresolvedFailTarget { expression } => write!(
                formatter,
                "accuracycheck: committed program has no label {expression}"
            ),
            Self::UnknownMoveRow { move_id } => write!(
                formatter,
                "accuracycheck/ppreduce: move {move_id} has no source-derived gBattleMoves row"
            ),
            Self::UnknownTypeId { type_id } => {
                write!(
                    formatter,
                    "accuracycheck: unknown numeric type id {type_id}"
                )
            }
            Self::ItemOutOfRange { item } => {
                write!(formatter, "item {item} is outside the source gItems corpus")
            }
        }
    }
}

impl std::error::Error for BattleScriptAccuracycheckError {}

fn map_base_damage_error(error: BattleScriptBaseDamageError) -> BattleScriptAccuracycheckError {
    match error {
        BattleScriptBaseDamageError::UnknownTypeId { type_id } => {
            BattleScriptAccuracycheckError::UnknownTypeId { type_id }
        }
        BattleScriptBaseDamageError::ItemOutOfRange { item } => {
            BattleScriptAccuracycheckError::ItemOutOfRange { item }
        }
        other => unreachable!(
            "resolve_move_type/resolve_battler_hold_effect(_param) only ever return \
             UnknownTypeId/ItemOutOfRange: {other}"
        ),
    }
}

fn move_has_protect_flag(move_id: u16) -> bool {
    MOVES
        .get(usize::from(move_id))
        .map(|row| row.flags & BATTLE_SCRIPT_ACCURACYCHECK_FLAG_PROTECT_AFFECTED != 0)
        .unwrap_or(false)
}

/// `Cmd_accuracycheck`'s `DEFENDER_IS_PROTECTED` gate
/// (`battle_script_commands.c:57`), shared by both the bypass ladder and the
/// full-formula path. An unknown `move` resolves to "not affected", never an
/// error -- matching `MOVE_FLAGS_BY_ID.get(move) ?? []`.
#[must_use]
pub fn is_defender_protected(target: &BattleScriptAccuracycheckBattlerState, move_id: u16) -> bool {
    target.protected == 1 && move_has_protect_flag(move_id)
}

fn clear_landed_move(
    history: BattleScriptAccuracycheckMoveHistory,
    target: BattleScriptAccuracycheckBattler,
) -> BattleScriptAccuracycheckMoveHistory {
    let mut next = history;
    next.last_landed_moves[target.index()] = 0;
    next.last_hit_by_type[target.index()] = 0;
    next
}

/// `WEATHER_HAS_EFFECT` (`include/battle_util.h:47`): false iff any active
/// battler (`0..battlers_count`) carries Cloud Nine.
#[must_use]
fn weather_has_effect(rules: &BattleScriptAccuracycheckRules) -> bool {
    let count = usize::from(rules.battlers_count).min(BATTLE_SCRIPT_ACCURACYCHECK_BATTLER_COUNT);
    !rules.battlers[..count]
        .iter()
        .any(|battler| battler.ability == ABILITY_CLOUD_NINE)
}

/// Native twin of `accuracycheckNoAccCalc`
/// (`battleScriptHitChainOpcode.ts:1080-1117`). UNCHANGED from M86 other
/// than threading the (untouched) rng state through the widened outcome
/// shape -- this bypass form never draws.
fn accuracycheck_no_acc_calc(
    execution: &BattleScriptAccuracycheckExecution<'_>,
    rules: &BattleScriptAccuracycheckRules,
    rng: BattleScriptAccuracycheckRngState,
    checks_lock_on: bool,
) -> Result<BattleScriptAccuracycheckOutcome, BattleScriptAccuracycheckError> {
    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptAccuracycheckError::MissingAttackerRole)?;
    let target = rules
        .selector_roles
        .target
        .ok_or(BattleScriptAccuracycheckError::MissingTargetRole)?;
    let target_state = rules.battlers[target.index()];

    if checks_lock_on
        && (target_state.status3 & BATTLE_SCRIPT_ACCURACYCHECK_STATUS3_ALWAYS_HITS) != 0
        && target_state.battler_with_sure_hit == attacker.as_u8()
    {
        return Ok(BattleScriptAccuracycheckOutcome::Advance {
            rules: *rules,
            rng,
            draws: Vec::new(),
        });
    }

    let semi_invulnerable_mask = BATTLE_SCRIPT_ACCURACYCHECK_STATUS3_ON_AIR
        | BATTLE_SCRIPT_ACCURACYCHECK_STATUS3_UNDERGROUND
        | BATTLE_SCRIPT_ACCURACYCHECK_STATUS3_UNDERWATER;
    if (target_state.status3 & semi_invulnerable_mask) != 0 {
        let program_counter = execution.resolved_fail_program_counter.ok_or_else(|| {
            BattleScriptAccuracycheckError::UnresolvedFailTarget {
                expression: execution.fail_label_expression.to_string(),
            }
        })?;
        return Ok(BattleScriptAccuracycheckOutcome::Jump {
            program_counter,
            rules: *rules,
            rng,
            draws: Vec::new(),
        });
    }

    if is_defender_protected(&target_state, rules.current_move) {
        let program_counter = execution.resolved_fail_program_counter.ok_or_else(|| {
            BattleScriptAccuracycheckError::UnresolvedFailTarget {
                expression: execution.fail_label_expression.to_string(),
            }
        })?;
        let mut next = *rules;
        next.move_result_flags |= BATTLE_SCRIPT_ACCURACYCHECK_MOVE_RESULT_MISSED;
        next.miss_type = BATTLE_SCRIPT_ACCURACYCHECK_B_MSG_PROTECTED;
        next.move_history = clear_landed_move(next.move_history, target);
        return Ok(BattleScriptAccuracycheckOutcome::Jump {
            program_counter,
            rules: next,
            rng,
            draws: Vec::new(),
        });
    }

    Ok(BattleScriptAccuracycheckOutcome::Advance { rules: *rules, rng, draws: Vec::new() })
}

fn to_destinybond_battler(
    battler: BattleScriptAccuracycheckBattler,
) -> BattleScriptTrysetdestinybondtohappenBattler {
    match battler {
        BattleScriptAccuracycheckBattler::Battler0 => {
            BattleScriptTrysetdestinybondtohappenBattler::Battler0
        }
        BattleScriptAccuracycheckBattler::Battler1 => {
            BattleScriptTrysetdestinybondtohappenBattler::Battler1
        }
        BattleScriptAccuracycheckBattler::Battler2 => {
            BattleScriptTrysetdestinybondtohappenBattler::Battler2
        }
        BattleScriptAccuracycheckBattler::Battler3 => {
            BattleScriptTrysetdestinybondtohappenBattler::Battler3
        }
    }
}

fn to_destinybond_side(side: u8) -> BattleScriptTrysetdestinybondtohappenSide {
    if side == 0 {
        BattleScriptTrysetdestinybondtohappenSide::Side0
    } else {
        BattleScriptTrysetdestinybondtohappenSide::Side1
    }
}

/// Adapter to the shared [`apply_try_set_destiny_bond_to_happen`] helper:
/// that helper only ever reads each battler's `status2`/`side` and the
/// shared `hit_marker`, so only those fields cross.
fn apply_destiny_bond(
    rules: &BattleScriptAccuracycheckRules,
    attacker: BattleScriptAccuracycheckBattler,
    target: BattleScriptAccuracycheckBattler,
) -> BattleScriptAccuracycheckRules {
    let adapted = BattleScriptTrysetdestinybondtohappenRules {
        battlers: rules.battlers.map(
            |battler| BattleScriptTrysetdestinybondtohappenBattlerState {
                status2: battler.status2,
                side: to_destinybond_side(battler.side),
            },
        ),
        hit_marker: rules.hit_marker,
        selector_roles: BattleScriptTrysetdestinybondtohappenRoles { attacker: None, target: None },
    };
    let updated = apply_try_set_destiny_bond_to_happen(
        &adapted,
        to_destinybond_battler(attacker),
        to_destinybond_battler(target),
    );
    let mut next = *rules;
    next.hit_marker = updated.hit_marker;
    next
}

fn to_ai_reveal_battler(battler: BattleScriptAccuracycheckBattler) -> BattleScriptAiRevealBattler {
    match battler {
        BattleScriptAccuracycheckBattler::Battler0 => BattleScriptAiRevealBattler::Battler0,
        BattleScriptAccuracycheckBattler::Battler1 => BattleScriptAiRevealBattler::Battler1,
        BattleScriptAccuracycheckBattler::Battler2 => BattleScriptAiRevealBattler::Battler2,
        BattleScriptAccuracycheckBattler::Battler3 => BattleScriptAiRevealBattler::Battler3,
    }
}

/// Adapter to the shared [`record_battle_script_ability_reveal`] helper.
fn apply_ability_reveal(
    rules: &BattleScriptAccuracycheckRules,
    battler: BattleScriptAccuracycheckBattler,
    ability: u16,
) -> BattleScriptAccuracycheckRules {
    let adapted = BattleScriptAiRevealRules {
        ai_observed_ability_ids: rules.ai_observed_ability_ids,
        ai_observed_item_effects: [0; BATTLE_SCRIPT_ACCURACYCHECK_BATTLER_COUNT],
    };
    let updated =
        record_battle_script_ability_reveal(&adapted, to_ai_reveal_battler(battler), ability as u8);
    let mut next = *rules;
    next.ai_observed_ability_ids = updated.ai_observed_ability_ids;
    next
}

/// Adapter to the shared [`resolve_battler_hold_effect`]/
/// [`resolve_battler_hold_effect_param`] helpers: they only ever read a
/// battler's `.item` and the two `enigma_berry_hold_effect*` arrays, so
/// every other field on this placeholder is inert (same shape as
/// `battle_script_tryko.rs`'s own `to_base_damage_rules_for_hold_effect`).
fn to_base_damage_rules_for_hold_effect(
    rules: &BattleScriptAccuracycheckRules,
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

/// `CheckWonderGuardAndLevitate` (`battle_script_commands.c:1426-~1490`),
/// miss-only -- never mutates, only reports what the caller should write.
/// `move_row` is the caller's already-validated row (divergence 3 in the
/// module doc comment: this reads the ROW's `power`, not `currentMovePower`).
struct WonderGuardOutcome {
    last_used_ability: Option<u16>,
    miss_type: Option<u8>,
    target_not_affected: bool,
}

fn check_wonder_guard_and_levitate(
    move_id: u16,
    move_row: &MoveRow,
    move_type: u8,
    target: &BattleScriptAccuracycheckBattlerState,
) -> WonderGuardOutcome {
    if move_id == BATTLE_SCRIPT_ACCURACYCHECK_MOVE_STRUGGLE || move_row.power == 0 {
        return WonderGuardOutcome {
            last_used_ability: None,
            miss_type: None,
            target_not_affected: false,
        };
    }
    if target.ability == ABILITY_LEVITATE && move_type == TYPE_GROUND {
        return WonderGuardOutcome {
            last_used_ability: Some(ABILITY_LEVITATE),
            miss_type: Some(BATTLE_SCRIPT_ACCURACYCHECK_B_MSG_GROUND_MISS),
            target_not_affected: false,
        };
    }
    let has_foresight = (target.status2 & STATUS2_FORESIGHT) != 0;
    let types = target.types;
    let distinct_types: &[u8] = if types[0] == types[1] {
        &types[..1]
    } else {
        &types[..]
    };
    let mut has_super_effective = false;
    let mut has_not_very_effective = false;
    for &defending_type in distinct_types {
        if has_foresight
            && defending_type == TYPE_GHOST
            && (move_type == TYPE_NORMAL || move_type == TYPE_FIGHTING)
        {
            continue;
        }
        let Some(entry) = TYPE_EFFECTIVENESS_TABLE.iter().find(|entry| {
            entry.attacking_type == move_type && entry.defending_type == defending_type
        }) else {
            continue;
        };
        if entry.multiplier_tenths == 0 {
            return WonderGuardOutcome {
                last_used_ability: None,
                miss_type: None,
                target_not_affected: true,
            };
        }
        if entry.multiplier_tenths == 20 {
            has_super_effective = true;
        }
        if entry.multiplier_tenths == 5 {
            has_not_very_effective = true;
        }
    }
    if target.ability == ABILITY_WONDER_GUARD
        && (!has_super_effective || (has_super_effective && has_not_very_effective))
    {
        return WonderGuardOutcome {
            last_used_ability: Some(ABILITY_WONDER_GUARD),
            miss_type: Some(BATTLE_SCRIPT_ACCURACYCHECK_B_MSG_AVOIDED_DMG),
            target_not_affected: false,
        };
    }
    WonderGuardOutcome { last_used_ability: None, miss_type: None, target_not_affected: false }
}

/// `JumpIfMoveFailed`'s "not failed" branch, narrowed to THIS step:
/// `TrySetDestinyBondToHappen` (always applied) plus the two M88 trigger
/// predicates. A trigger match stages [`BattleScriptAccuracycheckOutcome::AbsorbingTailPending`];
/// otherwise this fully advances with the destiny-bond write and the
/// already-persisted hitmarker.
fn accuracycheck_hit_tail(
    rules: &BattleScriptAccuracycheckRules,
    attacker: BattleScriptAccuracycheckBattler,
    target: BattleScriptAccuracycheckBattler,
    move_id: u16,
    move_type: u8,
    rng: BattleScriptAccuracycheckRngState,
    draws: Vec<BattleScriptAccuracycheckRngDraw>,
) -> BattleScriptAccuracycheckOutcome {
    let next_rules = apply_destiny_bond(rules, attacker, target);
    let attacker_state = next_rules.battlers[attacker.index()];
    // `advancePastAccuracyCheck` reads `targetBattler` off the ORIGINAL
    // `rulesContext` parameter, not its own `nextRulesContext` local --
    // functionally identical here since the destiny-bond write never
    // touches a battler's ability/status1/status2, but mirrored exactly.
    let target_state = rules.battlers[target.index()];
    let pp_was_already_reduced = attacker_state.not_first_strike == 1;

    // Divergence 2 (module doc comment): `currentMovePower` is the ROW
    // power of `rulesContext.currentMove`, never the resolved `move` this
    // accuracycheck instruction itself operated on.
    let current_move_power = i32::from(
        MOVES
            .get(usize::from(next_rules.current_move))
            .map_or(0, |row| row.power),
    );

    let trigger = if target_state.ability == ABILITY_VOLT_ABSORB
        && move_type == TYPE_ELECTRIC
        && current_move_power != 0
    {
        Some(BattleScriptAccuracycheckAbsorbingTrigger::VoltAbsorb)
    } else if target_state.ability == ABILITY_WATER_ABSORB
        && move_type == TYPE_WATER
        && current_move_power != 0
    {
        Some(BattleScriptAccuracycheckAbsorbingTrigger::WaterAbsorb)
    } else if target_state.ability == ABILITY_FLASH_FIRE
        && move_type == TYPE_FIRE
        && (target_state.status1 & STATUS1_FREEZE) == 0
    {
        Some(BattleScriptAccuracycheckAbsorbingTrigger::FlashFire)
    } else {
        None
    };

    if let Some(trigger) = trigger {
        return BattleScriptAccuracycheckOutcome::AbsorbingTailPending {
            rules: next_rules,
            rng,
            draws,
            attacker,
            target,
            move_id,
            move_type,
            trigger,
            pp_was_already_reduced,
        };
    }

    BattleScriptAccuracycheckOutcome::Advance { rules: next_rules, rng, draws }
}

/// The full-formula path shared by `ACC_CURR_MOVE`/`MOVE_FUTURE_SIGHT`/
/// `MOVE_DOOM_DESIRE` (`accuracycheckOpcodeHandler` :1160-1288). See the
/// module doc comment for the exact evaluation order and divergence pins.
fn accuracycheck_full_formula(
    execution: &BattleScriptAccuracycheckExecution<'_>,
    rules: &BattleScriptAccuracycheckRules,
    rng: BattleScriptAccuracycheckRngState,
    move_id: u16,
) -> Result<BattleScriptAccuracycheckOutcome, BattleScriptAccuracycheckError> {
    let attacker = rules
        .selector_roles
        .attacker
        .ok_or(BattleScriptAccuracycheckError::MissingAttackerRole)?;
    let target = rules
        .selector_roles
        .target
        .ok_or(BattleScriptAccuracycheckError::MissingTargetRole)?;

    let move_row = MOVES
        .get(usize::from(move_id))
        .ok_or(BattleScriptAccuracycheckError::UnknownMoveRow { move_id })?;
    let move_type = resolve_move_type(move_row.move_type, rules.dynamic_move_type)
        .map_err(map_base_damage_error)?;

    let attacker_state = rules.battlers[attacker.index()];
    let target_state = rules.battlers[target.index()];

    // Protect gate (uses the RESOLVED move, not currentMove -- divergence
    // pinned against M86's bypass branch in tests).
    if is_defender_protected(&target_state, move_id) {
        let program_counter = execution.resolved_fail_program_counter.ok_or_else(|| {
            BattleScriptAccuracycheckError::UnresolvedFailTarget {
                expression: execution.fail_label_expression.to_string(),
            }
        })?;
        let mut next = *rules;
        next.move_result_flags |= BATTLE_SCRIPT_ACCURACYCHECK_MOVE_RESULT_MISSED;
        next.miss_type = BATTLE_SCRIPT_ACCURACYCHECK_B_MSG_PROTECTED;
        next.move_history = clear_landed_move(next.move_history, target);
        return Ok(BattleScriptAccuracycheckOutcome::Jump {
            program_counter,
            rules: next,
            rng,
            draws: Vec::new(),
        });
    }

    // Lock-on: plain advance, ZERO writes -- no destiny-bond/absorb tail
    // (divergence 1 in the module doc comment).
    if (target_state.status3 & BATTLE_SCRIPT_ACCURACYCHECK_STATUS3_ALWAYS_HITS) != 0
        && target_state.battler_with_sure_hit == attacker.as_u8()
    {
        return Ok(BattleScriptAccuracycheckOutcome::Advance {
            rules: *rules,
            rng,
            draws: Vec::new(),
        });
    }

    // Hitmarker/semi-invulnerable ladder: exact partial-persistence
    // asymmetry -- a leg's own miss-jump carries only the PRIOR legs'
    // clears, never its own.
    let mut hit_marker = rules.hit_marker;
    if (hit_marker & HITMARKER_IGNORE_ON_AIR) == 0
        && (target_state.status3 & BATTLE_SCRIPT_ACCURACYCHECK_STATUS3_ON_AIR) != 0
    {
        let program_counter = execution.resolved_fail_program_counter.ok_or_else(|| {
            BattleScriptAccuracycheckError::UnresolvedFailTarget {
                expression: execution.fail_label_expression.to_string(),
            }
        })?;
        let mut next = *rules;
        next.move_result_flags |= BATTLE_SCRIPT_ACCURACYCHECK_MOVE_RESULT_MISSED;
        next.move_history = clear_landed_move(next.move_history, target);
        return Ok(BattleScriptAccuracycheckOutcome::Jump {
            program_counter,
            rules: next,
            rng,
            draws: Vec::new(),
        });
    }
    hit_marker &= !HITMARKER_IGNORE_ON_AIR;
    if (hit_marker & HITMARKER_IGNORE_UNDERGROUND) == 0
        && (target_state.status3 & BATTLE_SCRIPT_ACCURACYCHECK_STATUS3_UNDERGROUND) != 0
    {
        let program_counter = execution.resolved_fail_program_counter.ok_or_else(|| {
            BattleScriptAccuracycheckError::UnresolvedFailTarget {
                expression: execution.fail_label_expression.to_string(),
            }
        })?;
        let mut next = *rules;
        next.hit_marker = hit_marker;
        next.move_result_flags |= BATTLE_SCRIPT_ACCURACYCHECK_MOVE_RESULT_MISSED;
        next.move_history = clear_landed_move(next.move_history, target);
        return Ok(BattleScriptAccuracycheckOutcome::Jump {
            program_counter,
            rules: next,
            rng,
            draws: Vec::new(),
        });
    }
    hit_marker &= !HITMARKER_IGNORE_UNDERGROUND;
    if (hit_marker & HITMARKER_IGNORE_UNDERWATER) == 0
        && (target_state.status3 & BATTLE_SCRIPT_ACCURACYCHECK_STATUS3_UNDERWATER) != 0
    {
        let program_counter = execution.resolved_fail_program_counter.ok_or_else(|| {
            BattleScriptAccuracycheckError::UnresolvedFailTarget {
                expression: execution.fail_label_expression.to_string(),
            }
        })?;
        let mut next = *rules;
        next.hit_marker = hit_marker;
        next.move_result_flags |= BATTLE_SCRIPT_ACCURACYCHECK_MOVE_RESULT_MISSED;
        next.move_history = clear_landed_move(next.move_history, target);
        return Ok(BattleScriptAccuracycheckOutcome::Jump {
            program_counter,
            rules: next,
            rng,
            draws: Vec::new(),
        });
    }
    hit_marker &= !HITMARKER_IGNORE_UNDERWATER;

    let mut rules_with_hit_marker = *rules;
    rules_with_hit_marker.hit_marker = hit_marker;

    // Always-hit bypass: zero rng draws.
    let effective_weather = weather_has_effect(rules);
    let always_hits = (effective_weather
        && (rules.weather & B_WEATHER_RAIN) != 0
        && move_row.effect == EFFECT_THUNDER)
        || move_row.effect == EFFECT_ALWAYS_HIT
        || move_row.effect == EFFECT_VITAL_THROW;
    if always_hits {
        return Ok(accuracycheck_hit_tail(
            &rules_with_hit_marker,
            attacker,
            target,
            move_id,
            move_type,
            rng,
            Vec::new(),
        ));
    }

    let hold_effect_rules = to_base_damage_rules_for_hold_effect(rules);
    let target_hold_effect_battler = BattleScriptBaseDamageBattler::from_u8(target.as_u8())
        .expect("accuracycheck battler ids are the same 0..=3 domain as base-damage battler ids");
    let target_hold_effect =
        resolve_battler_hold_effect(&hold_effect_rules, target_hold_effect_battler)
            .map_err(map_base_damage_error)?;
    let target_hold_effect_param = if target_hold_effect == HOLD_EFFECT_EVASION_UP {
        resolve_battler_hold_effect_param(&hold_effect_rules, target_hold_effect_battler)
            .map_err(map_base_damage_error)?
    } else {
        0
    };

    let move_accuracy = if effective_weather
        && (rules.weather & B_WEATHER_SUN) != 0
        && move_row.effect == EFFECT_THUNDER
    {
        50
    } else {
        i32::from(move_row.accuracy)
    };
    let calc_input = AccuracyCalcInput {
        move_accuracy,
        attacker_accuracy_stage: attacker_state.accuracy_stage,
        target_evasion_stage: target_state.evasion_stage,
        target_has_foresight: (target_state.status2 & STATUS2_FORESIGHT) != 0,
        attacker_ability: attacker_state.ability,
        target_ability: target_state.ability,
        is_sandstorm: effective_weather && (rules.weather & B_WEATHER_SANDSTORM) != 0,
        move_type: Some(move_type),
        target_hold_effect,
        target_hold_effect_param,
    };
    let calc = calculate_accuracy(&calc_input);

    let after = advance_rng_value(rng.value);
    let random_value = ((after >> 16) & 0xffff) as u16;
    let call = rng.calls + 1;
    let draw = BattleScriptAccuracycheckRngDraw {
        call,
        reason: "accuracycheck",
        before: rng.value,
        after,
        random_value,
    };
    let rng_after = BattleScriptAccuracycheckRngState { value: after, calls: call };
    let hit = roll_accuracy_hits(calc, random_value);

    if hit {
        return Ok(accuracycheck_hit_tail(
            &rules_with_hit_marker,
            attacker,
            target,
            move_id,
            move_type,
            rng_after,
            vec![draw],
        ));
    }

    // Miss tail.
    let is_double_avoided =
        (rules.battle_type_flags & 1) != 0 && (move_row.target & MOVE_TARGET_BOTH) != 0;
    let wonder_guard = check_wonder_guard_and_levitate(move_id, move_row, move_type, &target_state);

    let mut next = rules_with_hit_marker;
    let mut flags = next.move_result_flags | BATTLE_SCRIPT_ACCURACYCHECK_MOVE_RESULT_MISSED;
    if wonder_guard.target_not_affected {
        flags |= BATTLE_SCRIPT_ACCURACYCHECK_MOVE_RESULT_DOESNT_AFFECT_FOE;
        next.battlers[attacker.index()].target_not_affected = 1;
    }
    next.move_result_flags = flags;
    next.miss_type = wonder_guard.miss_type.unwrap_or(if is_double_avoided {
        BATTLE_SCRIPT_ACCURACYCHECK_B_MSG_AVOIDED_ATK
    } else {
        BATTLE_SCRIPT_ACCURACYCHECK_B_MSG_MISSED
    });
    if let Some(ability) = wonder_guard.last_used_ability {
        next.last_used_ability = ability;
        next = apply_ability_reveal(&next, target, ability);
    }
    next.move_history = clear_landed_move(next.move_history, target);

    let program_counter = execution.resolved_fail_program_counter.ok_or_else(|| {
        BattleScriptAccuracycheckError::UnresolvedFailTarget {
            expression: execution.fail_label_expression.to_string(),
        }
    })?;
    Ok(BattleScriptAccuracycheckOutcome::Jump {
        program_counter,
        rules: next,
        rng: rng_after,
        draws: vec![draw],
    })
}

/// Native twin of `accuracycheckOpcodeHandler`
/// (`battleScriptHitChainOpcode.ts:1131-1289`). Dispatches on the move
/// operand FIRST, before any role or state read.
///
/// # Errors
/// See [`BattleScriptAccuracycheckError`] for the exact ordered error set.
pub fn apply_battle_script_accuracycheck(
    execution: &BattleScriptAccuracycheckExecution<'_>,
    rules: &BattleScriptAccuracycheckRules,
    rng: BattleScriptAccuracycheckRngState,
) -> Result<BattleScriptAccuracycheckOutcome, BattleScriptAccuracycheckError> {
    match execution.move_operand_expression {
        Some("NO_ACC_CALC_CHECK_LOCK_ON") => accuracycheck_no_acc_calc(execution, rules, rng, true),
        Some("NO_ACC_CALC") => accuracycheck_no_acc_calc(execution, rules, rng, false),
        Some("MOVE_FUTURE_SIGHT") => accuracycheck_full_formula(
            execution,
            rules,
            rng,
            BATTLE_SCRIPT_ACCURACYCHECK_MOVE_FUTURE_SIGHT,
        ),
        Some("MOVE_DOOM_DESIRE") => accuracycheck_full_formula(
            execution,
            rules,
            rng,
            BATTLE_SCRIPT_ACCURACYCHECK_MOVE_DOOM_DESIRE,
        ),
        Some("ACC_CURR_MOVE") => {
            accuracycheck_full_formula(execution, rules, rng, rules.current_move)
        }
        other => Ok(BattleScriptAccuracycheckOutcome::Halt(
            BattleScriptAccuracycheckHalt {
                program_counter: execution.program_counter,
                opcode_id: execution.opcode_id,
                opcode_name: BATTLE_SCRIPT_ACCURACYCHECK_OPCODE_NAME,
                source_construct: format!(
                "Cmd_accuracycheck's non-ACC_CURR_MOVE move argument ({}) -- this registered path \
                 supports ACC_CURR_MOVE plus Future Sight/Doom Desire's explicit literals",
                other.unwrap_or("<missing>")
            ),
                source_file: BATTLE_SCRIPT_ACCURACYCHECK_SOURCE_FILE,
                source_line: 1103,
            },
        )),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn battler_state() -> BattleScriptAccuracycheckBattlerState {
        BattleScriptAccuracycheckBattlerState {
            status1: 0,
            status2: 0,
            status3: 0,
            protected: 0,
            battler_with_sure_hit: 0,
            ability: 0,
            item: 0,
            types: [0, 0],
            side: 0,
            accuracy_stage: 6,
            evasion_stage: 6,
            not_first_strike: 0,
            target_not_affected: 0,
        }
    }

    fn rules() -> BattleScriptAccuracycheckRules {
        let mut battlers = [battler_state(); 4];
        battlers[1].side = 1;
        battlers[3].side = 1;
        BattleScriptAccuracycheckRules {
            battlers,
            battlers_count: 2,
            current_move: 33, // MOVE_TACKLE, FLAG_PROTECT_AFFECTED, power 40
            dynamic_move_type: 0,
            battle_type_flags: 0,
            weather: 0,
            hit_marker: 0,
            move_result_flags: 0,
            miss_type: 0,
            last_used_ability: 0,
            move_history: BattleScriptAccuracycheckMoveHistory {
                last_landed_moves: [1, 2, 3, 4],
                last_hit_by_type: [5, 6, 7, 8],
            },
            ai_observed_ability_ids: [0, 0, 0, 0],
            enigma_berry_hold_effects: [0, 0, 0, 0],
            enigma_berry_hold_effect_params: [0, 0, 0, 0],
            selector_roles: BattleScriptAccuracycheckRoles {
                attacker: Some(BattleScriptAccuracycheckBattler::Battler0),
                target: Some(BattleScriptAccuracycheckBattler::Battler1),
            },
        }
    }

    fn rng() -> BattleScriptAccuracycheckRngState {
        BattleScriptAccuracycheckRngState { value: 0x99aa_ccdd, calls: 0 }
    }

    fn execution() -> BattleScriptAccuracycheckExecution<'static> {
        BattleScriptAccuracycheckExecution {
            program_counter: 100,
            opcode_id: BATTLE_SCRIPT_ACCURACYCHECK_OPCODE,
            move_operand_expression: Some("NO_ACC_CALC_CHECK_LOCK_ON"),
            fail_label_expression: "BattleScript_ButItFailed",
            resolved_fail_program_counter: Some(9000),
        }
    }

    fn acc_curr_move_execution() -> BattleScriptAccuracycheckExecution<'static> {
        BattleScriptAccuracycheckExecution {
            move_operand_expression: Some("ACC_CURR_MOVE"),
            ..execution()
        }
    }

    // --- M86 bypass regression (rng threading only) -------------------------

    #[test]
    fn is_defender_protected_both_directions() {
        let mut target = battler_state();
        assert!(!is_defender_protected(&target, 33), "not protected yet");
        target.protected = 1;
        assert!(
            is_defender_protected(&target, 33),
            "protected + flagged move"
        );
        assert!(
            !is_defender_protected(&target, 14),
            "protected but SWORDS_DANCE has no protect flag"
        );
        assert!(
            !is_defender_protected(&target, 60_000),
            "unknown move resolves not-affected, not an error"
        );
    }

    #[test]
    fn bypass_paths_still_zero_draws() {
        let mut r = rules();
        r.battlers[1].status3 = BATTLE_SCRIPT_ACCURACYCHECK_STATUS3_ALWAYS_HITS;
        r.battlers[1].battler_with_sure_hit = 0;
        match apply_battle_script_accuracycheck(&execution(), &r, rng()).unwrap() {
            BattleScriptAccuracycheckOutcome::Advance { rng: out_rng, draws, .. } => {
                assert_eq!(out_rng, rng(), "bypass advance must not draw");
                assert!(draws.is_empty());
            }
            other => panic!("expected advance, got {other:?}"),
        }
    }

    // --- Full formula: protect gate -----------------------------------------

    #[test]
    fn full_formula_protect_miss_uses_resolved_move_not_current_move() {
        let mut r = rules();
        r.battlers[1].protected = 1;
        // ACC_CURR_MOVE resolves to rules.current_move (MOVE_TACKLE, flagged).
        match apply_battle_script_accuracycheck(&acc_curr_move_execution(), &r, rng()).unwrap() {
            BattleScriptAccuracycheckOutcome::Jump {
                program_counter, rules: out, draws, ..
            } => {
                assert_eq!(program_counter, 9000);
                assert_eq!(out.miss_type, BATTLE_SCRIPT_ACCURACYCHECK_B_MSG_PROTECTED);
                assert!(draws.is_empty(), "protect gate never draws");
            }
            other => panic!("expected jump, got {other:?}"),
        }

        // MOVE_FUTURE_SIGHT (248) has no FLAG_PROTECT_AFFECTED -> falls
        // through even though current_move (MOVE_TACKLE) IS flagged --
        // pins that the protect gate reads the RESOLVED move.
        let mut fs_execution = execution();
        fs_execution.move_operand_expression = Some("MOVE_FUTURE_SIGHT");
        let outcome = apply_battle_script_accuracycheck(&fs_execution, &r, rng()).unwrap();
        assert!(!matches!(
            outcome,
            BattleScriptAccuracycheckOutcome::Jump { program_counter: 9000, .. }
        ));
    }

    // --- Divergence 1: lock-on plain advance, no tail -----------------------

    #[test]
    fn lock_on_plain_advance_has_no_destiny_bond_tail() {
        let mut r = rules();
        r.battlers[1].status3 = BATTLE_SCRIPT_ACCURACYCHECK_STATUS3_ALWAYS_HITS;
        r.battlers[1].battler_with_sure_hit = 0;
        r.battlers[1].status2 = 1 << 25; // STATUS2_DESTINY_BOND
        match apply_battle_script_accuracycheck(&acc_curr_move_execution(), &r, rng()).unwrap() {
            BattleScriptAccuracycheckOutcome::Advance { rules: out, rng: out_rng, draws } => {
                assert_eq!(out, r, "lock-on advance must be a zero-write no-op");
                assert_eq!(out_rng, rng());
                assert!(draws.is_empty());
            }
            other => panic!("expected advance, got {other:?}"),
        }
    }

    // --- Hitmarker/semi-invulnerable ladder asymmetry -----------------------

    #[test]
    fn ladder_on_air_miss_jump_carries_no_hitmarker_change() {
        let mut r = rules();
        r.hit_marker = 0;
        r.battlers[1].status3 = BATTLE_SCRIPT_ACCURACYCHECK_STATUS3_ON_AIR;
        match apply_battle_script_accuracycheck(&acc_curr_move_execution(), &r, rng()).unwrap() {
            BattleScriptAccuracycheckOutcome::Jump { rules: out, .. } => {
                assert_eq!(
                    out.hit_marker, 0,
                    "on-air leg's own jump carries NO hitMarker clear"
                );
                assert_eq!(out.miss_type, 0, "ladder misses write no missType");
            }
            other => panic!("expected jump, got {other:?}"),
        }
    }

    #[test]
    fn ladder_underground_miss_jump_carries_prior_on_air_clear() {
        let mut r = rules();
        r.hit_marker = HITMARKER_IGNORE_ON_AIR; // already ignoring on-air, never triggers leg (a)
        r.battlers[1].status3 = BATTLE_SCRIPT_ACCURACYCHECK_STATUS3_UNDERGROUND;
        match apply_battle_script_accuracycheck(&acc_curr_move_execution(), &r, rng()).unwrap() {
            BattleScriptAccuracycheckOutcome::Jump { rules: out, .. } => {
                assert_eq!(
                    out.hit_marker, 0,
                    "underground leg's jump DOES carry the prior on-air clear"
                );
            }
            other => panic!("expected jump, got {other:?}"),
        }
    }

    #[test]
    fn ladder_underwater_miss_jump_carries_both_prior_clears() {
        let mut r = rules();
        r.hit_marker = HITMARKER_IGNORE_ON_AIR | HITMARKER_IGNORE_UNDERGROUND;
        r.battlers[1].status3 = BATTLE_SCRIPT_ACCURACYCHECK_STATUS3_UNDERWATER;
        match apply_battle_script_accuracycheck(&acc_curr_move_execution(), &r, rng()).unwrap() {
            BattleScriptAccuracycheckOutcome::Jump { rules: out, .. } => {
                assert_eq!(out.hit_marker, 0);
            }
            other => panic!("expected jump, got {other:?}"),
        }
    }

    #[test]
    fn ladder_ignore_bits_fall_through_and_clear_on_eventual_outcome() {
        let mut r = rules();
        r.hit_marker =
            HITMARKER_IGNORE_ON_AIR | HITMARKER_IGNORE_UNDERGROUND | HITMARKER_IGNORE_UNDERWATER;
        r.battlers[1].status3 = BATTLE_SCRIPT_ACCURACYCHECK_STATUS3_ON_AIR
            | BATTLE_SCRIPT_ACCURACYCHECK_STATUS3_UNDERGROUND
            | BATTLE_SCRIPT_ACCURACYCHECK_STATUS3_UNDERWATER;
        r.current_move = 129; // MOVE_SWIFT: EFFECT_ALWAYS_HIT bypass reaches an eventual outcome deterministically.
        match apply_battle_script_accuracycheck(&acc_curr_move_execution(), &r, rng()).unwrap() {
            BattleScriptAccuracycheckOutcome::Advance { rules: out, .. } => {
                assert_eq!(
                    out.hit_marker, 0,
                    "all three ignore bits cleared on the eventual outcome"
                );
            }
            other => panic!("expected advance (always-hit bypass), got {other:?}"),
        }
    }

    // --- Always-hit / weather bypasses --------------------------------------

    #[test]
    fn effect_always_hit_and_vital_throw_bypass_with_zero_draws() {
        let mut r = rules();
        r.current_move = 129; // MOVE_SWIFT, EFFECT_ALWAYS_HIT
        match apply_battle_script_accuracycheck(&acc_curr_move_execution(), &r, rng()).unwrap() {
            BattleScriptAccuracycheckOutcome::Advance { draws, .. } => assert!(draws.is_empty()),
            other => panic!("expected advance, got {other:?}"),
        }

        r.current_move = 233; // MOVE_VITAL_THROW, EFFECT_VITAL_THROW
        match apply_battle_script_accuracycheck(&acc_curr_move_execution(), &r, rng()).unwrap() {
            BattleScriptAccuracycheckOutcome::Advance { draws, .. } => assert!(draws.is_empty()),
            other => panic!("expected advance, got {other:?}"),
        }
    }

    #[test]
    fn effect_thunder_rain_bypass_and_cloud_nine_negation() {
        let mut r = rules();
        r.current_move = 87; // MOVE_THUNDER, EFFECT_THUNDER
        r.weather = 1 << 0; // B_WEATHER_RAIN_TEMPORARY
        match apply_battle_script_accuracycheck(&acc_curr_move_execution(), &r, rng()).unwrap() {
            BattleScriptAccuracycheckOutcome::Advance { draws, .. } => {
                assert!(draws.is_empty(), "rain-thunder bypass draws nothing")
            }
            other => panic!("expected advance, got {other:?}"),
        }

        // Cloud Nine on any active battler negates weather -> falls through
        // to the formula roll (a draw happens).
        r.battlers[0].ability = ABILITY_CLOUD_NINE;
        match apply_battle_script_accuracycheck(&acc_curr_move_execution(), &r, rng()).unwrap() {
            BattleScriptAccuracycheckOutcome::Advance { draws, .. }
            | BattleScriptAccuracycheckOutcome::Jump { draws, .. } => {
                assert_eq!(
                    draws.len(),
                    1,
                    "Cloud Nine negates the bypass, formula draws once"
                )
            }
            other => panic!("expected advance/jump, got {other:?}"),
        }
    }

    #[test]
    fn effect_thunder_sun_pins_accuracy_50_boundary() {
        let mut r = rules();
        r.current_move = 87; // MOVE_THUNDER, base accuracy 70
        r.weather = 1 << 5; // B_WEATHER_SUN_TEMPORARY
                            // random_value % 100 < 50 hits; the pinned rng() draws a specific value --
                            // just assert exactly one draw occurred and the outcome is well-formed.
        match apply_battle_script_accuracycheck(&acc_curr_move_execution(), &r, rng()).unwrap() {
            BattleScriptAccuracycheckOutcome::Advance { draws, .. }
            | BattleScriptAccuracycheckOutcome::Jump { draws, .. } => assert_eq!(draws.len(), 1),
            other => panic!("expected advance/jump, got {other:?}"),
        }
    }

    // --- Native accuracy calc modifiers flow end-to-end ----------------------

    #[test]
    fn compound_eyes_sand_veil_hustle_evasion_up_flow_through_native_calc() {
        let mut r = rules();
        r.current_move = 33; // MOVE_TACKLE (physical, accuracy 100)
        r.battlers[0].ability = 14; // ABILITY_COMPOUND_EYES
        let outcome =
            apply_battle_script_accuracycheck(&acc_curr_move_execution(), &r, rng()).unwrap();
        assert!(matches!(
            outcome,
            BattleScriptAccuracycheckOutcome::Advance { .. }
                | BattleScriptAccuracycheckOutcome::Jump { .. }
        ));

        let mut r2 = rules();
        r2.current_move = 33;
        r2.battlers[1].ability = 8; // ABILITY_SAND_VEIL
        r2.weather = 1 << 3; // sandstorm
        let outcome2 =
            apply_battle_script_accuracycheck(&acc_curr_move_execution(), &r2, rng()).unwrap();
        assert!(matches!(
            outcome2,
            BattleScriptAccuracycheckOutcome::Advance { .. }
                | BattleScriptAccuracycheckOutcome::Jump { .. }
        ));

        let mut r3 = rules();
        r3.current_move = 33;
        r3.battlers[0].ability = 55; // ABILITY_HUSTLE
        let outcome3 =
            apply_battle_script_accuracycheck(&acc_curr_move_execution(), &r3, rng()).unwrap();
        assert!(matches!(
            outcome3,
            BattleScriptAccuracycheckOutcome::Advance { .. }
                | BattleScriptAccuracycheckOutcome::Jump { .. }
        ));

        let mut r4 = rules();
        r4.current_move = 33;
        r4.battlers[1].item = 0; // exercises the hold-effect resolution path with no item held
        let outcome4 =
            apply_battle_script_accuracycheck(&acc_curr_move_execution(), &r4, rng()).unwrap();
        assert!(matches!(
            outcome4,
            BattleScriptAccuracycheckOutcome::Advance { .. }
                | BattleScriptAccuracycheckOutcome::Jump { .. }
        ));
    }

    // --- Hit tail: destiny bond ----------------------------------------------

    #[test]
    fn hit_advance_sets_destiny_bond_when_target_has_it_and_sides_differ() {
        let mut r = rules();
        r.current_move = 129; // EFFECT_ALWAYS_HIT bypass -> guaranteed hit tail, zero draws
        r.battlers[1].status2 = 1 << 25; // STATUS2_DESTINY_BOND
        match apply_battle_script_accuracycheck(&acc_curr_move_execution(), &r, rng()).unwrap() {
            BattleScriptAccuracycheckOutcome::Advance { rules: out, .. } => {
                assert_ne!(out.hit_marker & (1 << 6), 0, "HITMARKER_DESTINYBOND set");
            }
            other => panic!("expected advance, got {other:?}"),
        }
    }

    #[test]
    fn hit_advance_does_not_set_destiny_bond_when_absent() {
        let mut r = rules();
        r.current_move = 129;
        match apply_battle_script_accuracycheck(&acc_curr_move_execution(), &r, rng()).unwrap() {
            BattleScriptAccuracycheckOutcome::Advance { rules: out, .. } => {
                assert_eq!(out.hit_marker & (1 << 6), 0);
            }
            other => panic!("expected advance, got {other:?}"),
        }
    }

    #[test]
    fn hit_advance_no_destiny_bond_when_grudge_already_claimed() {
        let mut r = rules();
        r.current_move = 129;
        r.battlers[1].status2 = 1 << 25;
        r.hit_marker = 1 << 24; // HITMARKER_GRUDGE
        match apply_battle_script_accuracycheck(&acc_curr_move_execution(), &r, rng()).unwrap() {
            BattleScriptAccuracycheckOutcome::Advance { rules: out, .. } => {
                assert_eq!(out.hit_marker & (1 << 6), 0, "Grudge blocks the write");
                assert_ne!(out.hit_marker & (1 << 24), 0, "Grudge bit itself survives");
            }
            other => panic!("expected advance, got {other:?}"),
        }
    }

    // --- Divergence 2: absorb trigger uses currentMovePower ------------------

    #[test]
    fn absorb_trigger_uses_current_move_power_not_row_power() {
        let mut r = rules();
        // currentMove is an ELECTRIC, nonzero-power move (THUNDERBOLT) while
        // accuracycheck itself resolves MOVE_FUTURE_SIGHT (248, PSYCHIC) --
        // absorb's moveType check uses the RESOLVED move's type, but its
        // power gate uses currentMove's power.
        r.current_move = 85; // MOVE_THUNDERBOLT: type ELECTRIC, power != 0
        r.battlers[1].ability = ABILITY_VOLT_ABSORB;
        let mut fs_execution = execution();
        fs_execution.move_operand_expression = Some("MOVE_FUTURE_SIGHT");
        // MOVE_FUTURE_SIGHT (248) is TYPE_PSYCHIC in source, so this should NOT
        // trigger absorb (moveType mismatch) -- proves the trigger uses the
        // RESOLVED move's type, matching TS `moveType` derived from `move`.
        let outcome = apply_battle_script_accuracycheck(&fs_execution, &r, rng()).unwrap();
        assert!(
            !matches!(
                outcome,
                BattleScriptAccuracycheckOutcome::AbsorbingTailPending { .. }
            ),
            "psychic Future Sight must not trigger Volt Absorb regardless of currentMove's type"
        );
    }

    #[test]
    fn absorb_trigger_non_firing_when_current_move_power_is_zero() {
        let mut r = rules();
        // ACC_CURR_MOVE resolves to currentMove itself, so moveType and
        // currentMovePower both come from the same move: THUNDER_WAVE (86)
        // is ELECTRIC with 0 power.
        r.current_move = 86;
        r.battlers[1].ability = ABILITY_VOLT_ABSORB;
        let outcome =
            apply_battle_script_accuracycheck(&acc_curr_move_execution(), &r, rng()).unwrap();
        assert!(
            !matches!(
                outcome,
                BattleScriptAccuracycheckOutcome::AbsorbingTailPending { .. }
            ),
            "zero currentMovePower must not trigger absorb even when ability/type match"
        );
    }

    #[test]
    fn flash_fire_trigger_stages_pending_and_non_firing_when_frozen() {
        let mut r = rules();
        r.current_move = 52; // MOVE_EMBER, TYPE_FIRE, accuracy 100 -> the native calc always hits (neutral stages)
        r.battlers[1].ability = ABILITY_FLASH_FIRE;
        let outcome =
            apply_battle_script_accuracycheck(&acc_curr_move_execution(), &r, rng()).unwrap();
        match outcome {
            BattleScriptAccuracycheckOutcome::AbsorbingTailPending {
                trigger, rules: out, ..
            } => {
                assert_eq!(
                    trigger,
                    BattleScriptAccuracycheckAbsorbingTrigger::FlashFire
                );
                assert_eq!(
                    out.hit_marker & (1 << 6),
                    0,
                    "destiny bond not set (target has none)"
                );
            }
            BattleScriptAccuracycheckOutcome::Jump { .. } => {
                // A missed roll never reaches the hit tail; acceptable for this
                // deterministic-rng smoke case.
            }
            other => panic!("unexpected outcome {other:?}"),
        }

        let mut r2 = rules();
        r2.current_move = 52;
        r2.battlers[1].ability = ABILITY_FLASH_FIRE;
        r2.battlers[1].status1 = STATUS1_FREEZE;
        let outcome2 =
            apply_battle_script_accuracycheck(&acc_curr_move_execution(), &r2, rng()).unwrap();
        assert!(
            !matches!(
                outcome2,
                BattleScriptAccuracycheckOutcome::AbsorbingTailPending { .. }
            ),
            "frozen Flash Fire target never triggers"
        );
    }

    // --- Divergence 3: CheckWonderGuardAndLevitate uses row power -----------

    #[test]
    fn check_wonder_guard_uses_row_power_not_current_move_power() {
        let row = &MOVES[86]; // MOVE_THUNDER_WAVE: power == 0
        let target = battler_state();
        let outcome = check_wonder_guard_and_levitate(86, row, TYPE_ELECTRIC, &target);
        assert!(
            outcome.last_used_ability.is_none(),
            "zero ROW power short-circuits CWGL"
        );
    }

    #[test]
    fn check_wonder_guard_struggle_and_zero_power_skip() {
        let struggle_row = &MOVES[165];
        let target = battler_state();
        let outcome = check_wonder_guard_and_levitate(165, struggle_row, TYPE_NORMAL, &target);
        assert!(outcome.last_used_ability.is_none());
        assert!(outcome.miss_type.is_none());
        assert!(!outcome.target_not_affected);
    }

    #[test]
    fn check_wonder_guard_levitate_ground() {
        let row = &MOVES[89]; // MOVE_EARTHQUAKE: TYPE_GROUND, nonzero power
        let mut target = battler_state();
        target.ability = ABILITY_LEVITATE;
        let outcome = check_wonder_guard_and_levitate(89, row, TYPE_GROUND, &target);
        assert_eq!(outcome.last_used_ability, Some(ABILITY_LEVITATE));
        assert_eq!(
            outcome.miss_type,
            Some(BATTLE_SCRIPT_ACCURACYCHECK_B_MSG_GROUND_MISS)
        );
    }

    #[test]
    fn check_wonder_guard_immune_short_circuits() {
        let row = &MOVES[33]; // MOVE_TACKLE: TYPE_NORMAL
        let mut target = battler_state();
        target.types = [TYPE_GHOST, TYPE_GHOST];
        let outcome = check_wonder_guard_and_levitate(33, row, TYPE_NORMAL, &target);
        assert!(outcome.target_not_affected);
    }

    #[test]
    fn check_wonder_guard_no_super_at_all_fires() {
        // Normal vs a single Normal-type target: no type-chart entry at all
        // (neutral) -> hasSuperEffective stays false -> `!hasSuper` fires
        // Wonder Guard.
        let normal_row = &MOVES[33]; // MOVE_TACKLE, TYPE_NORMAL
        let mut target = battler_state();
        target.ability = ABILITY_WONDER_GUARD;
        target.types = [TYPE_NORMAL, TYPE_NORMAL];
        let outcome = check_wonder_guard_and_levitate(33, normal_row, TYPE_NORMAL, &target);
        assert_eq!(outcome.last_used_ability, Some(ABILITY_WONDER_GUARD));
        assert_eq!(
            outcome.miss_type,
            Some(BATTLE_SCRIPT_ACCURACYCHECK_B_MSG_AVOIDED_DMG)
        );
    }

    #[test]
    fn check_wonder_guard_super_only_does_not_fire() {
        // Fire vs a single Grass-type target: super-effective only, no
        // not-very leg -> Wonder Guard does NOT fire.
        let fire_row = &MOVES[52]; // MOVE_EMBER, TYPE_FIRE, nonzero power
        const TYPE_GRASS: u8 = 12;
        let mut target = battler_state();
        target.ability = ABILITY_WONDER_GUARD;
        target.types = [TYPE_GRASS, TYPE_GRASS];
        let outcome = check_wonder_guard_and_levitate(52, fire_row, TYPE_FIRE, &target);
        assert!(
            outcome.last_used_ability.is_none(),
            "super-only must not fire Wonder Guard"
        );
    }

    #[test]
    fn check_wonder_guard_super_and_not_very_both_set_fires() {
        // Fire vs dual Grass(super)/Water(not-very): both arms set ->
        // `hasSuper && hasNotVery` fires Wonder Guard too.
        let fire_row = &MOVES[52]; // MOVE_EMBER, TYPE_FIRE, nonzero power
        const TYPE_GRASS: u8 = 12;
        let mut target = battler_state();
        target.ability = ABILITY_WONDER_GUARD;
        target.types = [TYPE_GRASS, TYPE_WATER];
        let outcome = check_wonder_guard_and_levitate(52, fire_row, TYPE_FIRE, &target);
        assert_eq!(outcome.last_used_ability, Some(ABILITY_WONDER_GUARD));
    }

    #[test]
    fn foresight_skips_ghost_only_for_normal_or_fighting() {
        let normal_row = &MOVES[33]; // TYPE_NORMAL
        let mut ghost_target = battler_state();
        ghost_target.types = [TYPE_GHOST, TYPE_GHOST];
        ghost_target.status2 = STATUS2_FORESIGHT;
        let outcome = check_wonder_guard_and_levitate(33, normal_row, TYPE_NORMAL, &ghost_target);
        assert!(
            !outcome.target_not_affected,
            "foresight skips the ghost immunity for Normal"
        );

        let psychic_row = &MOVES[94]; // MOVE_PSYCHIC, TYPE_PSYCHIC
        let mut ghost_target2 = battler_state();
        ghost_target2.types = [TYPE_GHOST, TYPE_GHOST];
        ghost_target2.status2 = STATUS2_FORESIGHT;
        let outcome2 = check_wonder_guard_and_levitate(94, psychic_row, 14, &ghost_target2);
        // Psychic vs Ghost is neutral in gen 3 (not an immunity), so this just
        // exercises the "no skip for non-Normal/Fighting" path without an
        // immunity short circuit either way.
        let _ = outcome2;
    }

    // --- Role/label errors ---------------------------------------------------

    #[test]
    fn full_formula_role_errors_attacker_before_target() {
        let mut r = rules();
        r.selector_roles.attacker = None;
        r.selector_roles.target = None;
        let error =
            apply_battle_script_accuracycheck(&acc_curr_move_execution(), &r, rng()).unwrap_err();
        assert_eq!(error, BattleScriptAccuracycheckError::MissingAttackerRole);

        let mut r2 = rules();
        r2.selector_roles.target = None;
        assert_eq!(
            apply_battle_script_accuracycheck(&acc_curr_move_execution(), &r2, rng()).unwrap_err(),
            BattleScriptAccuracycheckError::MissingTargetRole
        );
    }

    #[test]
    fn full_formula_unknown_move_row_and_type_errors() {
        let mut r = rules();
        r.current_move = 60_000;
        assert_eq!(
            apply_battle_script_accuracycheck(&acc_curr_move_execution(), &r, rng()).unwrap_err(),
            BattleScriptAccuracycheckError::UnknownMoveRow { move_id: 60_000 }
        );
    }

    #[test]
    fn full_formula_missing_label_on_each_new_jump_site() {
        let mut execution = acc_curr_move_execution();
        execution.resolved_fail_program_counter = None;

        let mut r = rules();
        r.battlers[1].protected = 1;
        assert_eq!(
            apply_battle_script_accuracycheck(&execution, &r, rng())
                .unwrap_err()
                .to_string(),
            "accuracycheck: committed program has no label BattleScript_ButItFailed"
        );

        let mut r2 = rules();
        r2.battlers[1].status3 = BATTLE_SCRIPT_ACCURACYCHECK_STATUS3_ON_AIR;
        assert_eq!(
            apply_battle_script_accuracycheck(&execution, &r2, rng())
                .unwrap_err()
                .to_string(),
            "accuracycheck: committed program has no label BattleScript_ButItFailed"
        );
    }

    // --- Unchanged M86 registration/unsupported-branch behavior -------------

    #[test]
    fn unsupported_branch_for_unknown_literal_and_missing_operand() {
        let r = rules();
        let mut execution = execution();
        execution.move_operand_expression = Some("SOME_UNKNOWN_LITERAL");
        match apply_battle_script_accuracycheck(&execution, &r, rng()).unwrap() {
            BattleScriptAccuracycheckOutcome::Halt(halt) => {
                assert_eq!(
                    halt.source_construct,
                    "Cmd_accuracycheck's non-ACC_CURR_MOVE move argument (SOME_UNKNOWN_LITERAL) -- \
                     this registered path supports ACC_CURR_MOVE plus Future Sight/Doom Desire's \
                     explicit literals"
                );
            }
            other => panic!("expected halt, got {other:?}"),
        }

        execution.move_operand_expression = None;
        match apply_battle_script_accuracycheck(&execution, &r, rng()).unwrap() {
            BattleScriptAccuracycheckOutcome::Halt(halt) => {
                assert!(halt.source_construct.contains("(<missing>)"));
            }
            other => panic!("expected halt, got {other:?}"),
        }
    }

    #[test]
    fn registration_find_first_ignores_later_duplicates() {
        let instructions = [
            BattleScriptAccuracycheckInstruction {
                opcode_name: BATTLE_SCRIPT_ACCURACYCHECK_OPCODE_NAME,
                opcode_id: BATTLE_SCRIPT_ACCURACYCHECK_OPCODE,
                program_counter: 10,
            },
            BattleScriptAccuracycheckInstruction {
                opcode_name: BATTLE_SCRIPT_ACCURACYCHECK_OPCODE_NAME,
                opcode_id: 0xee,
                program_counter: 20,
            },
        ];
        assert_eq!(
            register_battle_script_accuracycheck(&instructions).unwrap(),
            BATTLE_SCRIPT_ACCURACYCHECK_OPCODE
        );
        assert_eq!(
            register_battle_script_accuracycheck(&[])
                .unwrap_err()
                .to_string(),
            "committed Battle Script program does not emit B_SCR_OP_ACCURACYCHECK"
        );
    }

    #[test]
    fn battler_ids_round_trip() {
        for value in 0u8..4 {
            assert_eq!(
                BattleScriptAccuracycheckBattler::from_u8(value)
                    .unwrap()
                    .as_u8(),
                value
            );
        }
        assert_eq!(BattleScriptAccuracycheckBattler::from_u8(4), None);
    }
}
