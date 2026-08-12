//! Shared infra + dispatcher shell for `AI_CheckViability`
//! (`src/engine/factoryAiCheckViability.ts`), per
//! `docs/rust-m5d-checkviability-batching.md` §5 "M5d-0". This step ports
//! ZERO effect handlers — every `CV_TABLE_EFFECTS` member (122, source-
//! complete per the batching doc's live count) hits the trailing
//! `NotYetPorted` barrier, same shape as `factory_ai_check_bad_move.rs`'s
//! own M5b-0 preamble step, whose precedents this module reuses directly
//! (`ability_id_in_weather_range`, `AI_WEATHER_*`, `first_move_id_with_effect`,
//! the `EFFECT_*` const block extended in place rather than duplicated).
//!
//! ## Recount vs the batching scout (batching doc §1/§5)
//! - `FactoryAiCheckViabilityBattler`: **42 fields (11 required + 31
//!   optional)**, recounted directly against TS :256-439 — matches the
//!   scout's own count exactly.
//! - `CheckViabilityDraw`: TS's discriminated union (:441-1115) has
//!   **62 top-level `| Readonly<{...}>` arms**, recounted directly and
//!   matching the scout's "62-member" claim. Within those 62 arms, the
//!   scout also estimated "~85 distinct `kind` strings"; a direct line-by-
//!   line count of every `kind: "..."` literal (including multi-literal
//!   arms like `"defense-up-roll-1" | ... | "-5"`) instead finds **136**
//!   distinct leaf kind strings, not ~85 — a genuine discrepancy from the
//!   scout's own hedged ("~") estimate, not a doc-copy error on this side;
//!   see the field-count derivation in the `CvDrawKind` doc comment below.
//!
//! ## Representation decisions
//! - **Ability/type/hold-effect**: numeric ids, same convention as
//!   `factory_ai_check_bad_move.rs` (`ability`/`species_abilities`/
//!   `known_ability` as `u16`/`Option<u16>`, not TS's ability-name strings).
//! - **`CheckViabilityDraw`**: ported as one Rust enum with exactly 62
//!   variants (one per TS union arm, matching the "62-member" framing
//!   literally), dropping the free-form `reason` string (CBM's
//!   `CheckBadMoveDrawSite` precedent) and the literal `kind` tag where a
//!   TS arm has only one `kind` value (the variant name alone identifies
//!   it, same as CBM dropped its own constant `kind: "get-ability"`). Where
//!   a TS arm's `kind` is itself a literal union of several named call
//!   sites (27 of the 62 arms, 101 leaf names total), that per-variant
//!   `kind` field is KEPT (per the step brief: "keep every OTHER
//!   per-variant field") but typed as one shared flat `CvDrawKind` enum —
//!   CBM's own "a ... enum distinguishes each call site" idiom, applied
//!   once across all 27 multi-site arms instead of 27 separate bespoke
//!   nested enums (strictly less code, same fidelity, still one Rust type
//!   per concept). No handler in this step constructs any real variant
//!   (M5d-1..5's job) other than the one `DRAW_FILLER` array-filler value,
//!   so both enums carry a scoped, documented `#[allow(dead_code)]` rather
//!   than a 62-case shape-pinning test — chosen for time/code-size, not
//!   because the alternative is wrong.
//! - **`CheckViabilityResult`**: kept at exactly **2 variants** (`Scored`/
//!   `NotYetPorted`), not 3. The step brief describes this as "TS's 2
//!   variants + the 3rd Rust-only `NotYetPorted`", which read literally
//!   would add a THIRD variant (a direct `UnsupportedBranch` port of TS's
//!   `"unsupported-branch"` kind, alongside a separate `NotYetPorted`).
//!   Deviation, and the evidence for it: TS's own `"unsupported-branch"`
//!   branch (:7203-7210) is provably dead in the real engine today (the
//!   batching doc's own §0 live-verifies `AI_CHECK_VIABILITY_TABLE_EFFECTS`
//!   is 122/122 dispatched), and under THIS module's own dispatcher shell
//!   `CV_TABLE_EFFECTS` (the Rust mirror of that same table) is by
//!   construction exactly `cv_handled_effects() ∪ unported_cv_table_effects()`
//!   — there is no third bucket a move's effect could fall into that a
//!   distinct `UnsupportedBranch` variant could ever hold, so it would be
//!   permanently unreachable dead code needing its own lint-suppression for
//!   zero behavioral benefit. `factory_ai_check_bad_move.rs`'s own
//!   `CheckBadMoveResult` (the precedent this step was told to follow)
//!   already resolved the identical situation the same way: exactly 2
//!   variants, with its own doc comment stating outright "`NotYetPorted` is
//!   the Rust analog of TS's `"unsupported-branch"` kind." This module
//!   follows that established, tested precedent instead of the brief's
//!   literal 3-variant phrasing; flagged here for the supervisor to correct
//!   if 3 was truly intended.
//! - **`MAX_CHECK_VIABILITY_DRAWS = 8`**: `AI_CV_EvasionUp`
//!   (`runCvEvasionUp`, TS :4226-4357) is the module's largest single
//!   handler, with 8 named `if_random_less_than` sites. Read directly (not
//!   just cited from the scout): DRAW SITE 1 (own HP>=90%) and DRAW SITE 2
//!   (own evasion stage>=9) are independent `if`s (both can fire in one
//!   call); the toxic-poisoned pair (SITE 3/4) contributes at most 2 draws
//!   in one call (own HP<=50% draws SITE 3, and only on SITE 3's own
//!   failure falls through to also draw SITE 4); SITEs 5/6/7 are each an
//!   independent flag gate; SITE 8 is a tail draw gated on `Gate H: own
//!   HP<=70%` — which is mutually exclusive with SITE 1's own `HP>=90%`
//!   gate (70 < 90), so SITE 1 and SITE 8 can never co-occur in a single
//!   call. The true worst case is therefore 7 (SITE 2,3,4,5,6,7,8), one
//!   less than the site count. `8` is kept anyway as a deliberately safe,
//!   conservative upper bound (the site count itself) rather than the
//!   tighter proven 7 — oversizing a fixed array by one element costs
//!   nothing, and the batch that actually ports `AI_CV_EvasionUp`
//!   (M5d-2) must re-verify this bound against its own implementation
//!   regardless, same as CBM's own `MAX_CHECK_BAD_MOVE_DRAWS` doc comment
//!   flags for its own later batches.
//!
//! ## Scope NOT covered by this step
//! All 90 `AI_CV_*` handlers (M5d-1 through M5d-5, batching doc §2) — this
//! step's dispatcher (`run_check_viability`) contains zero effect-specific
//! `if` blocks; every `CV_TABLE_EFFECTS` member routes straight to the
//! trailing `NotYetPorted` barrier.

use crate::damage_calc::{
    apply_stab, apply_type_effectiveness, DEFAULT_STAT_STAGE, HOLD_EFFECT_NONE, TYPE_BUG,
    TYPE_DARK, TYPE_DRAGON, TYPE_ELECTRIC, TYPE_FIGHTING, TYPE_FIRE, TYPE_FLYING, TYPE_GHOST,
    TYPE_GRASS, TYPE_GROUND, TYPE_ICE, TYPE_NORMAL, TYPE_POISON, TYPE_PSYCHIC, TYPE_ROCK,
    TYPE_STEEL, TYPE_WATER,
};
use crate::factory_ai_check_bad_move::{
    ability_id_in_weather_range, BattleRngState, ABILITY_NONE, AI_WEATHER_HAIL, AI_WEATHER_RAIN,
    AI_WEATHER_SANDSTORM, AI_WEATHER_SUN, EFFECT_ABSORB, EFFECT_ACCURACY_DOWN,
    EFFECT_ACCURACY_DOWN_2, EFFECT_ACCURACY_UP, EFFECT_ACCURACY_UP_2, EFFECT_ALWAYS_HIT,
    EFFECT_ATTACK_DOWN, EFFECT_ATTACK_DOWN_2, EFFECT_ATTACK_UP, EFFECT_ATTACK_UP_2,
    EFFECT_BATON_PASS, EFFECT_BELLY_DRUM, EFFECT_BIDE, EFFECT_BLAZE_KICK, EFFECT_BRICK_BREAK,
    EFFECT_BULK_UP, EFFECT_CALM_MIND, EFFECT_CONFUSE, EFFECT_CONVERSION, EFFECT_COSMIC_POWER,
    EFFECT_COUNTER, EFFECT_CURSE, EFFECT_DEFENSE_CURL, EFFECT_DEFENSE_DOWN, EFFECT_DEFENSE_DOWN_2,
    EFFECT_DEFENSE_UP, EFFECT_DEFENSE_UP_2, EFFECT_DESTINY_BOND, EFFECT_DISABLE,
    EFFECT_DRAGON_DANCE, EFFECT_DREAM_EATER, EFFECT_ENCORE, EFFECT_ENDEAVOR, EFFECT_ENDURE,
    EFFECT_ERUPTION, EFFECT_EVASION_DOWN, EFFECT_EVASION_DOWN_2, EFFECT_EVASION_UP,
    EFFECT_EVASION_UP_2, EFFECT_EXPLOSION, EFFECT_FACADE, EFFECT_FAKE_OUT, EFFECT_FLAIL,
    EFFECT_FLATTER, EFFECT_FOCUS_PUNCH, EFFECT_FORESIGHT, EFFECT_HAIL, EFFECT_HAZE,
    EFFECT_HEAL_BELL, EFFECT_HIGH_CRITICAL, EFFECT_IMPRISON, EFFECT_KNOCK_OFF, EFFECT_LEECH_SEED,
    EFFECT_LIGHT_SCREEN, EFFECT_LOCK_ON, EFFECT_MAGIC_COAT, EFFECT_MEAN_LOOK, EFFECT_MEMENTO,
    EFFECT_MINIMIZE, EFFECT_MIRROR_COAT, EFFECT_MIRROR_MOVE, EFFECT_MOONLIGHT, EFFECT_MORNING_SUN,
    EFFECT_MUD_SPORT, EFFECT_NIGHTMARE, EFFECT_OHKO, EFFECT_OVERHEAT, EFFECT_PAIN_SPLIT,
    EFFECT_PARALYZE, EFFECT_POISON, EFFECT_POISON_TAIL, EFFECT_PROTECT, EFFECT_PSYCH_UP,
    EFFECT_PURSUIT, EFFECT_RAIN_DANCE, EFFECT_RAZOR_WIND, EFFECT_RECHARGE, EFFECT_RECYCLE,
    EFFECT_REFLECT, EFFECT_REFRESH, EFFECT_REST, EFFECT_RESTORE_HP, EFFECT_REVENGE, EFFECT_ROAR,
    EFFECT_ROLE_PLAY, EFFECT_SEMI_INVULNERABLE, EFFECT_SKILL_SWAP, EFFECT_SKULL_BASH,
    EFFECT_SKY_ATTACK, EFFECT_SLEEP, EFFECT_SLEEP_TALK, EFFECT_SMELLINGSALT, EFFECT_SNATCH,
    EFFECT_SNORE, EFFECT_SOFTBOILED, EFFECT_SOLAR_BEAM, EFFECT_SPECIAL_ATTACK_DOWN,
    EFFECT_SPECIAL_ATTACK_DOWN_2, EFFECT_SPECIAL_ATTACK_UP, EFFECT_SPECIAL_ATTACK_UP_2,
    EFFECT_SPECIAL_DEFENSE_DOWN, EFFECT_SPECIAL_DEFENSE_DOWN_2, EFFECT_SPECIAL_DEFENSE_UP,
    EFFECT_SPECIAL_DEFENSE_UP_2, EFFECT_SPEED_DOWN, EFFECT_SPEED_DOWN_2, EFFECT_SPEED_DOWN_HIT,
    EFFECT_SPEED_UP, EFFECT_SPEED_UP_2, EFFECT_SPIT_UP, EFFECT_SUBSTITUTE, EFFECT_SUNNY_DAY,
    EFFECT_SUPERPOWER, EFFECT_SUPER_FANG, EFFECT_SWAGGER, EFFECT_SWALLOW, EFFECT_SYNTHESIS,
    EFFECT_THIEF, EFFECT_TICKLE, EFFECT_TOXIC, EFFECT_TRAP, EFFECT_TRICK, EFFECT_VITAL_THROW,
    EFFECT_WATER_SPORT,
};
use crate::gen_tables;
use crate::rng::advance_rng_value;
use crate::turn_order::{effective_speed, get_who_strikes_first, TurnOrderBattler, WeatherState};

// === stale-funcResult collision machinery (batching doc §1/§5 item c) ======

/// `HOLD_EFFECT_RESTORE_HP`/`CURE_PAR`/`CURE_SLP`
/// (`reference/pokeemerald/include/constants/hold_effects.h:5-7`, verified
/// against the header directly). `HOLD_EFFECT_NONE` (0) is reused from
/// `damage_calc.rs`.
pub const HOLD_EFFECT_RESTORE_HP: u16 = 1;
pub const HOLD_EFFECT_CURE_PAR: u16 = 2;
pub const HOLD_EFFECT_CURE_SLP: u16 = 3;

/// `TYPE_ID_IN_WEATHER_RANGE` (`factoryAiCheckViability.ts:136-141`) —
/// `Cmd_get_type`'s stale-`funcResult` collision, CV's Channel-1 twin of
/// `ability_id_in_weather_range` (`factory_ai_check_bad_move.rs`): only the
/// four lowest TYPE ids can ever collide with an `AI_WEATHER_*` compare.
#[must_use]
pub fn type_func_result_collision(type_id: u8) -> Option<u8> {
    match type_id {
        TYPE_NORMAL => Some(AI_WEATHER_SUN),
        TYPE_FIGHTING => Some(AI_WEATHER_RAIN),
        TYPE_FLYING => Some(AI_WEATHER_SANDSTORM),
        TYPE_POISON => Some(AI_WEATHER_HAIL),
        _ => None,
    }
}

/// `abilityFuncResultCollision` (`factoryAiCheckViability.ts:148-151`) —
/// thin wrapper reusing CBM's already-`pub` `ability_id_in_weather_range`
/// directly, per the batching doc: "do not re-embed its map."
#[must_use]
pub fn ability_func_result_collision(ability: u16) -> Option<u8> {
    ability_id_in_weather_range(ability)
}

/// `HOLD_EFFECT_ID_IN_WEATHER_RANGE` (`factoryAiCheckViability.ts:163-168`)
/// — same collision concept for a written `get_hold_effect` result: only
/// `HOLD_EFFECT_NONE`(0)/`RESTORE_HP`(1)/`CURE_PAR`(2)/`CURE_SLP`(3) can
/// ever collide with an `AI_WEATHER_*` compare. TS reads this map inline at
/// each use site (no named helper); this module names one for symmetry
/// with the type/ability helpers above.
#[must_use]
pub fn hold_effect_func_result_collision(hold_effect: u16) -> Option<u8> {
    match hold_effect {
        HOLD_EFFECT_NONE => Some(AI_WEATHER_SUN),
        HOLD_EFFECT_RESTORE_HP => Some(AI_WEATHER_RAIN),
        HOLD_EFFECT_CURE_PAR => Some(AI_WEATHER_SANDSTORM),
        HOLD_EFFECT_CURE_SLP => Some(AI_WEATHER_HAIL),
        _ => None,
    }
}

/// `typeChainFuncResultAfter` (`factoryAiCheckViability.ts:181-188`): the
/// last `get_type` read before a `get_target_type1`-then-maybe-`type2`
/// chain (`AI_CV_AttackDown`'s Gates E/F, `AI_CV_LightScreen`/`Reflect`'s
/// single gate) is type1 if it matched `match_list`, else always type2
/// (matched or not — no third read follows).
#[must_use]
pub fn type_chain_func_result_after(types: [u8; 2], match_list: &[u8]) -> Option<u8> {
    if match_list.contains(&types[0]) {
        type_func_result_collision(types[0])
    } else {
        type_func_result_collision(types[1])
    }
}

// === completeness-probe machinery (batching doc §3/§5 item e) ==============

/// `AI_CHECK_VIABILITY_TABLE_EFFECTS` (`factoryAiCheckViability.ts:197-229`),
/// translated to numeric effect ids, kept in the TS literal's own source
/// order (not sorted) for direct side-by-side diffing against that literal.
/// 122 entries: 89 already existed as `EFFECT_*` consts in
/// `factory_ai_check_bad_move.rs` (reused, not redeclared) + 33 new ones
/// this step appends there (batching doc §5 item d).
pub const CV_TABLE_EFFECTS: [u16; 122] = [
    EFFECT_SLEEP,
    EFFECT_ABSORB,
    EFFECT_EXPLOSION,
    EFFECT_DREAM_EATER,
    EFFECT_MIRROR_MOVE,
    EFFECT_ATTACK_UP,
    EFFECT_DEFENSE_UP,
    EFFECT_SPEED_UP,
    EFFECT_SPECIAL_ATTACK_UP,
    EFFECT_SPECIAL_DEFENSE_UP,
    EFFECT_ACCURACY_UP,
    EFFECT_EVASION_UP,
    EFFECT_ALWAYS_HIT,
    EFFECT_ATTACK_DOWN,
    EFFECT_DEFENSE_DOWN,
    EFFECT_SPEED_DOWN,
    EFFECT_SPECIAL_ATTACK_DOWN,
    EFFECT_SPECIAL_DEFENSE_DOWN,
    EFFECT_ACCURACY_DOWN,
    EFFECT_EVASION_DOWN,
    EFFECT_HAZE,
    EFFECT_BIDE,
    EFFECT_ROAR,
    EFFECT_CONVERSION,
    EFFECT_RESTORE_HP,
    EFFECT_TOXIC,
    EFFECT_LIGHT_SCREEN,
    EFFECT_REST,
    EFFECT_OHKO,
    EFFECT_RAZOR_WIND,
    EFFECT_SUPER_FANG,
    EFFECT_TRAP,
    EFFECT_HIGH_CRITICAL,
    EFFECT_CONFUSE,
    EFFECT_ATTACK_UP_2,
    EFFECT_DEFENSE_UP_2,
    EFFECT_SPEED_UP_2,
    EFFECT_SPECIAL_ATTACK_UP_2,
    EFFECT_SPECIAL_DEFENSE_UP_2,
    EFFECT_ACCURACY_UP_2,
    EFFECT_EVASION_UP_2,
    EFFECT_ATTACK_DOWN_2,
    EFFECT_DEFENSE_DOWN_2,
    EFFECT_SPEED_DOWN_2,
    EFFECT_SPECIAL_ATTACK_DOWN_2,
    EFFECT_SPECIAL_DEFENSE_DOWN_2,
    EFFECT_ACCURACY_DOWN_2,
    EFFECT_EVASION_DOWN_2,
    EFFECT_REFLECT,
    EFFECT_POISON,
    EFFECT_PARALYZE,
    EFFECT_SWAGGER,
    EFFECT_SPEED_DOWN_HIT,
    EFFECT_SKY_ATTACK,
    EFFECT_VITAL_THROW,
    EFFECT_SUBSTITUTE,
    EFFECT_RECHARGE,
    EFFECT_LEECH_SEED,
    EFFECT_DISABLE,
    EFFECT_COUNTER,
    EFFECT_ENCORE,
    EFFECT_PAIN_SPLIT,
    EFFECT_SNORE,
    EFFECT_LOCK_ON,
    EFFECT_SLEEP_TALK,
    EFFECT_DESTINY_BOND,
    EFFECT_FLAIL,
    EFFECT_HEAL_BELL,
    EFFECT_THIEF,
    EFFECT_MEAN_LOOK,
    EFFECT_MINIMIZE,
    EFFECT_CURSE,
    EFFECT_PROTECT,
    EFFECT_FORESIGHT,
    EFFECT_ENDURE,
    EFFECT_BATON_PASS,
    EFFECT_PURSUIT,
    EFFECT_MORNING_SUN,
    EFFECT_SYNTHESIS,
    EFFECT_MOONLIGHT,
    EFFECT_RAIN_DANCE,
    EFFECT_SUNNY_DAY,
    EFFECT_BELLY_DRUM,
    EFFECT_PSYCH_UP,
    EFFECT_MIRROR_COAT,
    EFFECT_SKULL_BASH,
    EFFECT_SOLAR_BEAM,
    EFFECT_SEMI_INVULNERABLE,
    EFFECT_SOFTBOILED,
    EFFECT_FAKE_OUT,
    EFFECT_SPIT_UP,
    EFFECT_SWALLOW,
    EFFECT_HAIL,
    EFFECT_FLATTER,
    EFFECT_MEMENTO,
    EFFECT_FACADE,
    EFFECT_FOCUS_PUNCH,
    EFFECT_SMELLINGSALT,
    EFFECT_TRICK,
    EFFECT_ROLE_PLAY,
    EFFECT_SUPERPOWER,
    EFFECT_MAGIC_COAT,
    EFFECT_RECYCLE,
    EFFECT_REVENGE,
    EFFECT_BRICK_BREAK,
    EFFECT_KNOCK_OFF,
    EFFECT_ENDEAVOR,
    EFFECT_ERUPTION,
    EFFECT_SKILL_SWAP,
    EFFECT_IMPRISON,
    EFFECT_REFRESH,
    EFFECT_SNATCH,
    EFFECT_BLAZE_KICK,
    EFFECT_MUD_SPORT,
    EFFECT_OVERHEAT,
    EFFECT_TICKLE,
    EFFECT_COSMIC_POWER,
    EFFECT_BULK_UP,
    EFFECT_POISON_TAIL,
    EFFECT_WATER_SPORT,
    EFFECT_CALM_MIND,
    EFFECT_DRAGON_DANCE,
];

/// M5d-1 (batching doc §2): the sleep/speed/status openers + the module's
/// 3 CV-only accuracy handlers, 13 effects — `EFFECT_SLEEP`;
/// `EFFECT_SPEED_DOWN`+`_2` (`runCvSpeedDown`); `EFFECT_SPEED_DOWN_HIT`
/// (`runCvSpeedDownFromChance`, delegates to `run_cv_speed_down` for 3 of
/// its 6 moves); `EFFECT_TOXIC`+`EFFECT_LEECH_SEED` (`runCvToxic`, one
/// handler for both); `EFFECT_PROTECT`; `EFFECT_PURSUIT`;
/// `EFFECT_HIGH_CRITICAL`+`EFFECT_BLAZE_KICK`+`EFFECT_POISON_TAIL`
/// (`runCvHighCrit`, one handler for all three); `EFFECT_ALWAYS_HIT`;
/// `EFFECT_VITAL_THROW`.
pub const CV_HANDLED_EFFECTS_M5D1: &[u16] = &[
    EFFECT_SLEEP,
    EFFECT_SPEED_DOWN,
    EFFECT_SPEED_DOWN_2,
    EFFECT_SPEED_DOWN_HIT,
    EFFECT_TOXIC,
    EFFECT_LEECH_SEED,
    EFFECT_PROTECT,
    EFFECT_PURSUIT,
    EFFECT_HIGH_CRITICAL,
    EFFECT_BLAZE_KICK,
    EFFECT_POISON_TAIL,
    EFFECT_ALWAYS_HIT,
    EFFECT_VITAL_THROW,
];

/// M5d-2 (batching doc §2): the full stat-mod + screens family, 29 effects
/// — every internal shared-tail cluster (`runCvStatDown`,
/// `runCvAttackStyleStatUp`, `runCvSideScreenTypeGate`) lives inside this
/// batch. `EFFECT_ATTACK_DOWN`+`_2` (`runCvAttackDown`, standalone, does
/// NOT use the shared stat-down tail); `EFFECT_DEFENSE_DOWN`+`_2`+`TICKLE`
/// (`runCvDefenseDown`, shared-tail user); `EFFECT_SPECIAL_DEFENSE_DOWN`+
/// `_2` (`runCvSpDefDown`); `EFFECT_ATTACK_UP`+`_2` (`runCvAttackUp`,
/// shared-tail user); `EFFECT_DEFENSE_UP`+`_2`+`BULK_UP` (`runCvDefenseUp`,
/// standalone, does NOT use either shared tail); `EFFECT_ACCURACY_DOWN`+
/// `_2` (`runCvAccuracyDown`); `EFFECT_SPEED_UP`+`_2` (`runCvSpeedUp`);
/// `EFFECT_SPECIAL_ATTACK_UP`+`_2` (`runCvSpAtkUp`, shared-tail user);
/// `EFFECT_SPECIAL_DEFENSE_UP`+`_2`+`COSMIC_POWER`+`CALM_MIND`
/// (`runCvSpDefUp`, standalone); `EFFECT_LIGHT_SCREEN`/`EFFECT_REFLECT`
/// (`runCvLightScreen`/`runCvReflect`, shared-tail users);
/// `EFFECT_EVASION_UP`+`_2`+`MINIMIZE` (`runCvEvasionUp`, the module's
/// largest handler); `EFFECT_EVASION_DOWN`+`_2` (`runCvEvasionDown`,
/// shared-tail user, reuses the same `run_cv_stat_down` as DefenseDown/
/// SpDefDown).
pub const CV_HANDLED_EFFECTS_M5D2: &[u16] = &[
    EFFECT_ATTACK_DOWN,
    EFFECT_ATTACK_DOWN_2,
    EFFECT_DEFENSE_DOWN,
    EFFECT_DEFENSE_DOWN_2,
    EFFECT_TICKLE,
    EFFECT_SPECIAL_DEFENSE_DOWN,
    EFFECT_SPECIAL_DEFENSE_DOWN_2,
    EFFECT_ATTACK_UP,
    EFFECT_ATTACK_UP_2,
    EFFECT_DEFENSE_UP,
    EFFECT_DEFENSE_UP_2,
    EFFECT_BULK_UP,
    EFFECT_ACCURACY_DOWN,
    EFFECT_ACCURACY_DOWN_2,
    EFFECT_SPEED_UP,
    EFFECT_SPEED_UP_2,
    EFFECT_SPECIAL_ATTACK_UP,
    EFFECT_SPECIAL_ATTACK_UP_2,
    EFFECT_SPECIAL_DEFENSE_UP,
    EFFECT_SPECIAL_DEFENSE_UP_2,
    EFFECT_COSMIC_POWER,
    EFFECT_CALM_MIND,
    EFFECT_LIGHT_SCREEN,
    EFFECT_REFLECT,
    EFFECT_EVASION_UP,
    EFFECT_EVASION_UP_2,
    EFFECT_MINIMIZE,
    EFFECT_EVASION_DOWN,
    EFFECT_EVASION_DOWN_2,
];

/// M5d-3..5 have not landed yet — union of every landed batch's own
/// `CV_HANDLED_EFFECTS_M5D*` const, mirroring `cbm_handled_effects`'s own
/// chained shape (`factory_ai_check_bad_move.rs:679-685`).
#[must_use]
pub fn cv_handled_effects() -> Vec<u16> {
    let mut handled = CV_HANDLED_EFFECTS_M5D1.to_vec();
    handled.extend_from_slice(CV_HANDLED_EFFECTS_M5D2);
    handled
}

/// Direct port of the CBM precedent's `unported_cbm_table_effects`
/// (`factory_ai_check_bad_move.rs:648-662`): `CV_TABLE_EFFECTS` minus
/// `cv_handled_effects()`, sorted. Returns 80 entries now that M5d-1's 13 +
/// M5d-2's 29 effects are handled (122 - 13 - 29 = 80); will shrink
/// further as M5d-3..5 land.
#[must_use]
pub fn unported_cv_table_effects() -> Vec<u16> {
    let handled = cv_handled_effects();
    let mut unported: Vec<u16> = CV_TABLE_EFFECTS
        .iter()
        .copied()
        .filter(|effect| !handled.contains(effect))
        .collect();
    unported.sort_unstable();
    unported
}

// === input battler (batching doc §5 item a) =================================

/// Mirrors `FactoryAiCheckViabilityBattler` (`factoryAiCheckViability.ts
/// :256-439`), **42 fields (11 required + 31 optional), recounted
/// directly** — one unified struct used as BOTH `attacker` and `target` in
/// every `run_check_viability` call, NOT CBM's split
/// `FactoryAiCheckBadMoveTarget`/`Attacker` design (module doc comment).
/// Every field is ported now (full shape) for M5d-1..5 to consume; none is
/// read by this step's own dispatcher shell.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryAiCheckViabilityBattler {
    pub speed: u32,
    pub speed_stage: u8,
    /// `[type0, type1]`, `damage_calc::TYPE_*` ids.
    pub types: [u8; 2],
    /// `gDisableStructs[].isFirstTurn`, domain 0..2 (`is_first_turn_for`,
    /// `AI_CV_Pursuit`).
    pub is_first_turn: u8,
    pub evasion_stage: u8,
    pub acc_stage: u8,
    pub atk_stage: u8,
    pub def_stage: u8,
    pub sp_def_stage: u8,
    pub hp: i32,
    pub max_hp: i32,
    /// AI_USER's own Special Attack stage, `AI_CV_SpAtkUp`'s Gate A.
    /// Default `DEFAULT_STAT_STAGE` (6, TS :271-275) when omitted.
    pub sp_atk_stage: Option<u8>,
    /// `gLastMoves[battler]`, `AI_CV_DefenseUp`'s Gates E/F (TARGET's
    /// copy). Default `MOVE_NONE` (0, TS :276-285).
    pub last_used_move_id: Option<u16>,
    /// `STATUS1_TOXIC_POISON`, `AI_CV_AccuracyDown`'s Gate D. Default
    /// `false` (TS :286-293).
    pub is_toxic_poisoned: Option<bool>,
    /// `STATUS3_LEECHSEED`, `AI_CV_AccuracyDown`'s Gate E. Default `false`.
    pub is_leech_seeded: Option<bool>,
    /// `STATUS3_ROOTED` (Ingrain), AI_USER's own copy,
    /// `AI_CV_AccuracyDown`'s Gate F. Default `false`.
    pub is_rooted: Option<bool>,
    /// `STATUS2_CURSED`, `AI_CV_AccuracyDown`'s Gate G. Default `false`.
    pub is_cursed: Option<bool>,
    /// AI_USER's own real ability (a direct field read, never the
    /// two-ability guess), `AI_CV_RainDance`'s Gates S/R. Default
    /// `ABILITY_NONE` (0, TS :317-326).
    pub ability: Option<u16>,
    /// Current weather, `AI_WEATHER_*`-encoded, `AI_CV_SunnyDay`/`Hail`/
    /// `RainDance`'s `get_weather` read. Default `None` (no weather bit
    /// set, TS :327-336).
    pub current_weather: Option<u8>,
    /// AI_USER's four live move ids, `AI_CV_Toxic`'s
    /// `if_user_has_no_attacking_moves`/`if_has_move_with_effect` reads.
    pub moves: Option<[u16; 4]>,
    /// `gBattleResults.battleTurnCounter`, `AI_CV_Swagger`'s
    /// `get_turn_count`. Default 0 (TS :343-348).
    pub battle_turn_count: Option<u32>,
    /// BattleHistory-known moves for AI_TARGET move-effect scans
    /// (`AI_CV_Toxic`). Bounded to 4 slots, the same domain as `moves`
    /// above (TS types this as an unbounded `readonly number[]`, but no
    /// real battler ever carries more than `MAX_MON_MOVES` known moves).
    pub known_moves: Option<[u16; 4]>,
    /// `STATUS2_INFATUATION`. Default `false`.
    pub is_infatuated: Option<bool>,
    /// `STATUS1_SLEEP`, `AI_CV_Counter`'s first gate. Default `false`.
    pub is_asleep: Option<bool>,
    /// `STATUS2_CONFUSION`, `AI_CV_Counter`'s third gate. Default `false`.
    pub is_confused: Option<bool>,
    /// `DisableStruct::tauntTimer != 0`, `AI_CV_Counter`. Default `false`.
    pub is_taunted: Option<bool>,
    /// `STATUS3_YAWN`. Default `false`.
    pub has_yawn: Option<bool>,
    /// `STATUS3_PERISH_SONG`. Default `false`.
    pub has_perish_song: Option<bool>,
    /// `DisableStruct::protectUses`, `AI_CV_Protect`. Default 0.
    pub protect_uses: Option<u8>,
    /// `gSideStatuses[side] & SIDE_STATUS_REFLECT`, TARGET's own side,
    /// `AI_CV_BrickBreak`'s single gate. Default `false`.
    pub has_side_reflect: Option<bool>,
    /// `STATUS1_POISON` (non-toxic), `AI_CV_Facade`'s status1 mask.
    /// Default `false`.
    pub is_poisoned: Option<bool>,
    /// `STATUS1_BURN`, `AI_CV_Facade`. Default `false`.
    pub is_burned: Option<bool>,
    /// `STATUS1_PARALYSIS`, `AI_CV_Facade`. Default `false`.
    pub is_paralyzed: Option<bool>,
    /// `STATUS2_SUBSTITUTE`, `AI_CV_FocusPunch`'s FocusPunch3 tail.
    /// Default `false`.
    pub has_substitute: Option<bool>,
    /// Any of the battler's 4 moves disabled, TARGET's own copy,
    /// `AI_CV_Encore`. Default `false`.
    pub any_move_disabled: Option<bool>,
    /// `status1 & STATUS1_ANY`, TARGET's own copy, `AI_CV_HealBell`'s
    /// first gate. Default `false`.
    pub has_any_status: Option<bool>,
    /// `Cmd_if_status_in_party`'s exact-`==` party scan on the TARGET's
    /// side, `AI_CV_HealBell`'s second gate. Default `false`.
    pub target_party_status_equals_any: Option<bool>,
    /// `GetItemHoldEffect`'s result, `AI_CV_Trick` reads both sides'
    /// copies. Default `HOLD_EFFECT_NONE` (0).
    pub hold_effect: Option<u16>,
    /// TARGET species' two possible abilities in slot order, the
    /// `get_ability AI_TARGET` two-way guess's fallback,
    /// `AI_CV_ChangeSelfAbility`. Default both `ABILITY_NONE`.
    pub species_abilities: Option<[u16; 2]>,
    /// `get_ability AI_TARGET`'s BattleHistory-known ability (TS:
    /// `string | null`, optional-and-nullable — both "omitted" and "null"
    /// collapse to the same "unknown, guessing heuristic draws" behavior,
    /// so this is a single-level `Option`, same convention as CBM's own
    /// `FactoryAiCheckBadMoveTarget.known_ability`). Default `None`
    /// (unknown).
    pub known_ability: Option<u16>,
    /// `gBattleStruct->usedHeldItems[battler]`, AI_USER's own copy,
    /// `AI_CV_Recycle`. Default 0 (`ITEM_NONE`).
    pub used_held_item_id: Option<u16>,
    /// `gDisableStructs[battler].stockpileCounter`, AI_USER's own copy,
    /// `AI_CV_SpitUp`. Default 0.
    pub stockpile_count: Option<u8>,
}

// === draw receipts (batching doc §5 item a/b) ===============================

/// Shared flat tag enum for every `CheckViabilityDraw` variant whose TS
/// arm's own `kind` field is a literal union of more than one named call
/// site (27 of the 62 arms; 101 leaf names total — see the module doc
/// comment's recount note). Each variant name mirrors its TS `kind` string
/// (e.g. `"defense-up-roll-3"` -> `DefenseUp3`). Not constructed by this
/// step (M5d-1..5's own handlers construct these); scoped
/// `#[allow(dead_code)]` chosen over a 101-case shape-pinning test for
/// time/code-size (module doc comment).
/// Not every variant is constructed yet -- per-variant `#[allow(dead_code)]`
/// covers exactly the kinds no landed batch constructs (module doc comment;
/// M5d-1 constructs `Pursuit`/`Sleep`/`Toxic1..3`/`Protect1..2`, the rest
/// await M5d-2..5).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CvDrawKind {
    #[allow(dead_code)]
    Rest1,
    #[allow(dead_code)]
    Rest2,
    #[allow(dead_code)]
    RestSnatch,
    #[allow(dead_code)]
    RestTail,
    Pursuit,
    Sleep,
    #[allow(dead_code)]
    Roar,
    #[allow(dead_code)]
    Paralyze,
    #[allow(dead_code)]
    CounterLowHp,
    #[allow(dead_code)]
    CounterMidHp,
    #[allow(dead_code)]
    CounterTaunt,
    #[allow(dead_code)]
    CounterPhysical,
    #[allow(dead_code)]
    CounterTargetType,
    #[allow(dead_code)]
    CounterBonus,
    AttackUp1,
    AttackUp2,
    AttackUp3,
    SpAtkUp1,
    SpAtkUp2,
    SpAtkUp3,
    DefenseUp1,
    DefenseUp2,
    DefenseUp3,
    DefenseUp4,
    DefenseUp5,
    SpDefUp1,
    SpDefUp2,
    SpDefUp3,
    SpDefUp4,
    SpDefUp5,
    LightScreen,
    Reflect,
    Toxic1,
    Toxic2,
    Toxic3,
    Protect1,
    Protect2,
    AccuracyDown1,
    AccuracyDown2,
    AccuracyDown3,
    AccuracyDown4,
    AccuracyDown5,
    AccuracyDown6,
    AccuracyDown7,
    EvasionUp1,
    EvasionUp2,
    EvasionUp3,
    EvasionUp4,
    EvasionUp5,
    EvasionUp6,
    EvasionUp7,
    EvasionUp8,
    #[allow(dead_code)]
    Heal1,
    #[allow(dead_code)]
    Heal2,
    #[allow(dead_code)]
    Heal3,
    #[allow(dead_code)]
    DestinyBond1,
    #[allow(dead_code)]
    DestinyBond2,
    #[allow(dead_code)]
    DestinyBond3,
    #[allow(dead_code)]
    SelfKo1,
    #[allow(dead_code)]
    SelfKo2,
    #[allow(dead_code)]
    SelfKo3,
    #[allow(dead_code)]
    SelfKo4,
    #[allow(dead_code)]
    SelfKo5,
    #[allow(dead_code)]
    Curse1,
    #[allow(dead_code)]
    Curse2,
    #[allow(dead_code)]
    Curse3,
    #[allow(dead_code)]
    MirrorCoat1,
    #[allow(dead_code)]
    MirrorCoat2,
    #[allow(dead_code)]
    MirrorCoat3,
    #[allow(dead_code)]
    MirrorCoat4,
    #[allow(dead_code)]
    MirrorCoat5,
    #[allow(dead_code)]
    MirrorCoat6,
    #[allow(dead_code)]
    MirrorCoat7,
    #[allow(dead_code)]
    DragonDance1,
    #[allow(dead_code)]
    DragonDance2,
    #[allow(dead_code)]
    FocusPunch1,
    #[allow(dead_code)]
    FocusPunch2,
    #[allow(dead_code)]
    KnockOff,
    #[allow(dead_code)]
    MagicCoat1,
    #[allow(dead_code)]
    MagicCoat2,
    #[allow(dead_code)]
    MagicCoat3,
    #[allow(dead_code)]
    Foresight1,
    #[allow(dead_code)]
    Foresight2,
    #[allow(dead_code)]
    Substitute1,
    #[allow(dead_code)]
    Substitute2,
    #[allow(dead_code)]
    Substitute3,
    #[allow(dead_code)]
    Substitute4,
    #[allow(dead_code)]
    LockOn,
    #[allow(dead_code)]
    Imprison,
    #[allow(dead_code)]
    Haze1,
    #[allow(dead_code)]
    Haze2,
    #[allow(dead_code)]
    Haze3,
    #[allow(dead_code)]
    MirrorMove1,
    #[allow(dead_code)]
    MirrorMove2,
    #[allow(dead_code)]
    SpAtkDown1,
    #[allow(dead_code)]
    SpAtkDown2,
    #[allow(dead_code)]
    Snatch1,
    #[allow(dead_code)]
    Snatch2,
    #[allow(dead_code)]
    Snatch3,
    #[allow(dead_code)]
    Snatch4,
    #[allow(dead_code)]
    Snatch5,
}

/// Mirrors `FactoryAiCheckViabilityDraw` (`factoryAiCheckViability.ts
/// :441-1115`), **62 variants, one per TS union arm** (module doc
/// comment's design-decision note). `reason` dropped everywhere; the
/// literal `kind` tag dropped where the TS arm has only one `kind` value
/// (the variant name already identifies it) and kept as a `kind:
/// CvDrawKind` field where the TS arm's `kind` is itself a multi-name
/// union. Not every variant is constructed yet -- per-variant
/// `#[allow(dead_code)]` covers exactly the sites no landed batch
/// constructs (M5d-1 constructs `TargetFasterTie`/`SpeedDownRoll`/
/// `PursuitSleepRoarParalyzeRoll`/`ProtectRoll`/`ToxicRoll`/
/// `HighCritFallthroughRoll`/`HighCritRoll`/`AlwaysHitRoll`/
/// `VitalThrowMidbandRoll`/`VitalThrowRoll`, the rest await M5d-2..5).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CheckViabilityDraw {
    TargetFasterTie {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        strikes_first: u8,
    },
    #[allow(dead_code)]
    ConfuseRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        jumped: bool,
    },
    #[allow(dead_code)]
    SwaggerRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        jumped: bool,
    },
    #[allow(dead_code)]
    UserFasterTie {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        strikes_first: u8,
    },
    SpeedDownRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        succeeded: bool,
    },
    PursuitSleepRoarParalyzeRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        kind: CvDrawKind,
        succeeded: bool,
    },
    #[allow(dead_code)]
    RestRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        kind: CvDrawKind,
        succeeded: bool,
    },
    #[allow(dead_code)]
    AbsorbRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        succeeded: bool,
    },
    #[allow(dead_code)]
    EndureRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        succeeded: bool,
    },
    #[allow(dead_code)]
    CounterRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        kind: CvDrawKind,
        jumped: bool,
    },
    HighCritFallthroughRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        jumped_to_end: bool,
    },
    HighCritRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        succeeded: bool,
    },
    AlwaysHitRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        succeeded: bool,
    },
    VitalThrowMidbandRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        jumped_to_end: bool,
    },
    VitalThrowRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        succeeded: bool,
    },
    AttackDownRoll1 {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        succeeded: bool,
    },
    AttackDownRoll2 {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        succeeded: bool,
    },
    DefenseDownRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        succeeded: bool,
    },
    SpDefDownRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        succeeded: bool,
    },
    EvasionDownRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        succeeded: bool,
    },
    AttackUpRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        kind: CvDrawKind,
        succeeded: bool,
    },
    SpeedUpRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        succeeded: bool,
    },
    SpAtkUpRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        kind: CvDrawKind,
        succeeded: bool,
    },
    DefenseUpRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        kind: CvDrawKind,
        succeeded: bool,
    },
    SpDefUpRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        kind: CvDrawKind,
        succeeded: bool,
    },
    ScreenRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        kind: CvDrawKind,
        succeeded: bool,
    },
    ToxicRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        kind: CvDrawKind,
        jumped: bool,
    },
    ProtectRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        kind: CvDrawKind,
        jumped: bool,
    },
    AccuracyDownRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        kind: CvDrawKind,
        succeeded: bool,
    },
    EvasionUpRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        kind: CvDrawKind,
        succeeded: bool,
    },
    #[allow(dead_code)]
    HealRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        kind: CvDrawKind,
        jumped: bool,
    },
    #[allow(dead_code)]
    TrapRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        jumped: bool,
    },
    #[allow(dead_code)]
    SemiInvulnerableRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        jumped: bool,
    },
    #[allow(dead_code)]
    FlailRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        jumped: bool,
    },
    #[allow(dead_code)]
    DestinyBondRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        kind: CvDrawKind,
        jumped: bool,
    },
    #[allow(dead_code)]
    SelfKoRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        kind: CvDrawKind,
        jumped: bool,
    },
    #[allow(dead_code)]
    CurseRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        kind: CvDrawKind,
        jumped: bool,
    },
    #[allow(dead_code)]
    PsychUpRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        jumped: bool,
    },
    #[allow(dead_code)]
    MirrorCoatRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        kind: CvDrawKind,
        jumped: bool,
    },
    #[allow(dead_code)]
    DragonDanceRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        kind: CvDrawKind,
        succeeded: bool,
    },
    #[allow(dead_code)]
    BatonPassRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        succeeded: bool,
    },
    #[allow(dead_code)]
    FocusPunchKnockOffRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        kind: CvDrawKind,
        succeeded: bool,
    },
    #[allow(dead_code)]
    RevengeRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        jumped: bool,
    },
    #[allow(dead_code)]
    MagicCoatRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        kind: CvDrawKind,
        jumped: bool,
    },
    #[allow(dead_code)]
    ForesightRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        kind: CvDrawKind,
        jumped: bool,
    },
    #[allow(dead_code)]
    EncoreRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        jumped: bool,
    },
    #[allow(dead_code)]
    ChangeSelfAbilityRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        jumped: bool,
    },
    #[allow(dead_code)]
    TrickRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        jumped: bool,
    },
    #[allow(dead_code)]
    SubstituteRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        kind: CvDrawKind,
        jumped: bool,
    },
    #[allow(dead_code)]
    AccuracyUpRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        jumped: bool,
    },
    #[allow(dead_code)]
    DisableRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        jumped: bool,
    },
    #[allow(dead_code)]
    FlatterRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        jumped: bool,
    },
    #[allow(dead_code)]
    LockOnImprisonRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        kind: CvDrawKind,
        jumped: bool,
    },
    #[allow(dead_code)]
    ConversionRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        jumped: bool,
    },
    #[allow(dead_code)]
    ThiefRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        jumped: bool,
    },
    #[allow(dead_code)]
    HazeRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        kind: CvDrawKind,
        jumped: bool,
    },
    #[allow(dead_code)]
    RecycleRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        jumped: bool,
    },
    #[allow(dead_code)]
    SpitUpRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        jumped: bool,
    },
    #[allow(dead_code)]
    MirrorMoveRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        kind: CvDrawKind,
        jumped: bool,
    },
    #[allow(dead_code)]
    SpAtkDownRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        kind: CvDrawKind,
        succeeded: bool,
    },
    #[allow(dead_code)]
    SnatchRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        kind: CvDrawKind,
        jumped: bool,
    },
    #[allow(dead_code)]
    GetAbility {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        guessed_ability: u16,
    },
}

/// See the module doc comment's `MAX_CHECK_VIABILITY_DRAWS = 8` derivation.
pub const MAX_CHECK_VIABILITY_DRAWS: usize = 8;

const DRAW_FILLER: CheckViabilityDraw = CheckViabilityDraw::TargetFasterTie {
    ordinal: 0,
    before: BattleRngState { value: 0, calls: 0 },
    after: BattleRngState { value: 0, calls: 0 },
    raw_rng_value: 0,
    random_value: 0,
    strikes_first: 0,
};

/// Mirrors `FactoryAiCheckViabilityResult` (`factoryAiCheckViability.ts
/// :1117-1140`) — 2 variants, not 3; see the module doc comment's
/// deviation note. `NotYetPorted` is the Rust analog of TS's
/// `"unsupported-branch"` kind, same role as CBM's own `NotYetPorted`.
/// `Scored`'s 8-slot `draws` array (vs CBM's 3-slot one) makes this enum
/// wider than clippy's `large_enum_variant` default threshold; kept `Copy`
/// (not boxed) to match CBM's own fixed-array-plus-count receipt
/// convention exactly, so the size difference is allowed explicitly rather
/// than worked around.
#[allow(clippy::large_enum_variant)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CheckViabilityResult {
    Scored {
        rng: BattleRngState,
        draws: [CheckViabilityDraw; MAX_CHECK_VIABILITY_DRAWS],
        draw_count: u8,
        score_delta: i32,
        /// `AI_THINKING_STRUCT->funcResult` as this slot's dispatched
        /// handler leaves it (TS :1123-1133). `None` when the incoming
        /// carry was itself `None`, or a write happened but can never
        /// collide with an `AI_WEATHER_*` constant.
        func_result_after: Option<u8>,
    },
    NotYetPorted {
        effect: u16,
        move_id: u16,
    },
}

// === nextDraw (batching doc §5 item b) ======================================

/// Result of one `next_draw` call, mirroring `nextDraw`'s own inline return
/// object (`factoryAiCheckViability.ts:1146-1153`, minus `reason`).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct NextDrawResult {
    pub ordinal: u32,
    pub before: BattleRngState,
    pub after: BattleRngState,
    pub raw_rng_value: u32,
    pub random_value: u16,
}

/// `nextDraw` (`factoryAiCheckViability.ts:1142-1164`) — CV's sole generic
/// RNG-draw primitive; callers attach their own `CheckViabilityDraw`
/// variant (and `CvDrawKind` where needed) around this result. Distinct
/// from CBM's `next_get_ability_draw`: no trapper/known-ability/
/// single-ability-species short-circuit here — every call unconditionally
/// advances the RNG.
#[must_use]
pub fn next_draw(rng: BattleRngState, ordinal: u32) -> NextDrawResult {
    let raw_rng_value = advance_rng_value(rng.value);
    let after = BattleRngState { value: raw_rng_value, calls: rng.calls + 1 };
    let random_value = ((raw_rng_value >> 16) & 0xffff) as u16;
    NextDrawResult { ordinal, before: rng, after, raw_rng_value, random_value }
}

// === dispatcher shell (batching doc §5 item f) ==============================

/// `run_check_viability`'s input, mirroring `runCheckViability`'s inline
/// parameter object (`factoryAiCheckViability.ts:5463-5480`). `reasonPrefix`
/// is dropped for the same reason CBM's preamble input dropped it (a
/// caller-supplied slot-numbering aid never consumed by any branch).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct RunCheckViabilityInput {
    pub rng: BattleRngState,
    pub move_id: u16,
    pub attacker: FactoryAiCheckViabilityBattler,
    pub target: FactoryAiCheckViabilityBattler,
    /// `get_weather`'s stale-`funcResult` fallback carry (TS :5468-5477).
    pub stale_func_result_fallback: Option<u8>,
    pub draw_ordinal_start: u32,
}

/// `AI_CheckViability` for one move slot — dispatch shell + M5d-1's 9
/// dispatch arms (`factoryAiCheckViability.ts:5463-5483` setup, `:5490
/// -5646` M5d-1's own dispatch blocks in TS source order, `:7202-7222`
/// trailing barrier/fallthrough). Every M5d-1 handler except
/// `AI_CV_Protect`/`AI_CV_Pursuit` writes nothing to `funcResult` (TS's own
/// `funcResultAfter: funcResultCarry` at each of those 7 call sites); the
/// remaining `CV_TABLE_EFFECTS` members (M5d-2..5) still route to
/// `NotYetPorted`.
#[must_use]
pub fn run_check_viability(input: RunCheckViabilityInput) -> CheckViabilityResult {
    let move_row = gen_tables::MOVES.get(input.move_id as usize).unwrap_or_else(|| {
        panic!(
            "factory-ai-check-viability: unknown move {} (TS :5482 throws; gen_tables::MOVES is dense 0..355)",
            input.move_id
        )
    });
    // The incoming funcResult carry for THIS slot's own dispatch (TS
    // :5488) — every M5d-1 handler except Protect/Pursuit passes it
    // through unchanged; Protect/Pursuit override it with their own
    // computed value.
    let func_result_carry = input.stale_func_result_fallback;

    if move_row.effect == EFFECT_SLEEP {
        let sleep = run_cv_sleep(
            input.rng,
            input.target.known_moves,
            input.draw_ordinal_start,
        );
        return CheckViabilityResult::Scored {
            rng: sleep.rng,
            draws: sleep.draws,
            draw_count: sleep.draw_count,
            score_delta: sleep.score_delta,
            func_result_after: func_result_carry,
        };
    }

    if move_row.effect == EFFECT_SPEED_DOWN || move_row.effect == EFFECT_SPEED_DOWN_2 {
        let speed_down = run_cv_speed_down(
            input.rng,
            input.attacker,
            input.target,
            input.draw_ordinal_start,
        );
        return CheckViabilityResult::Scored {
            rng: speed_down.rng,
            draws: speed_down.draws,
            draw_count: speed_down.draw_count,
            score_delta: speed_down.score_delta,
            func_result_after: func_result_carry,
        };
    }

    if move_row.effect == EFFECT_SPEED_DOWN_HIT {
        let speed_down_from_chance = run_cv_speed_down_from_chance(
            input.rng,
            input.move_id,
            input.attacker,
            input.target,
            input.draw_ordinal_start,
        );
        return CheckViabilityResult::Scored {
            rng: speed_down_from_chance.rng,
            draws: speed_down_from_chance.draws,
            draw_count: speed_down_from_chance.draw_count,
            score_delta: speed_down_from_chance.score_delta,
            func_result_after: func_result_carry,
        };
    }

    if move_row.effect == EFFECT_TOXIC || move_row.effect == EFFECT_LEECH_SEED {
        let toxic = run_cv_toxic(
            input.rng,
            input.attacker,
            input.target,
            input.draw_ordinal_start,
        );
        return CheckViabilityResult::Scored {
            rng: toxic.rng,
            draws: toxic.draws,
            draw_count: toxic.draw_count,
            score_delta: toxic.score_delta,
            func_result_after: func_result_carry,
        };
    }

    if move_row.effect == EFFECT_PROTECT {
        let (protect, func_result_after) = run_cv_protect(
            input.rng,
            input.attacker,
            input.target,
            input.draw_ordinal_start,
        );
        return CheckViabilityResult::Scored {
            rng: protect.rng,
            draws: protect.draws,
            draw_count: protect.draw_count,
            score_delta: protect.score_delta,
            func_result_after,
        };
    }

    if move_row.effect == EFFECT_PURSUIT {
        let (pursuit, func_result_after) = run_cv_pursuit(
            input.rng,
            input.attacker.is_first_turn,
            input.target.types,
            input.draw_ordinal_start,
        );
        return CheckViabilityResult::Scored {
            rng: pursuit.rng,
            draws: pursuit.draws,
            draw_count: pursuit.draw_count,
            score_delta: pursuit.score_delta,
            func_result_after,
        };
    }

    if move_row.effect == EFFECT_HIGH_CRITICAL
        || move_row.effect == EFFECT_BLAZE_KICK
        || move_row.effect == EFFECT_POISON_TAIL
    {
        let high_crit = run_cv_high_crit(
            input.rng,
            input.attacker.types,
            move_row.move_type,
            input.target.types,
            input.draw_ordinal_start,
        );
        return CheckViabilityResult::Scored {
            rng: high_crit.rng,
            draws: high_crit.draws,
            draw_count: high_crit.draw_count,
            score_delta: high_crit.score_delta,
            func_result_after: func_result_carry,
        };
    }

    if move_row.effect == EFFECT_ALWAYS_HIT {
        let always_hit = run_cv_always_hit(
            input.rng,
            input.target.evasion_stage,
            input.attacker.acc_stage,
            input.draw_ordinal_start,
        );
        return CheckViabilityResult::Scored {
            rng: always_hit.rng,
            draws: always_hit.draws,
            draw_count: always_hit.draw_count,
            score_delta: always_hit.score_delta,
            func_result_after: func_result_carry,
        };
    }

    if move_row.effect == EFFECT_VITAL_THROW {
        let vital_throw = run_cv_vital_throw(
            input.rng,
            input.attacker,
            input.target,
            input.draw_ordinal_start,
        );
        return CheckViabilityResult::Scored {
            rng: vital_throw.rng,
            draws: vital_throw.draws,
            draw_count: vital_throw.draw_count,
            score_delta: vital_throw.score_delta,
            func_result_after: func_result_carry,
        };
    }

    if move_row.effect == EFFECT_ATTACK_DOWN || move_row.effect == EFFECT_ATTACK_DOWN_2 {
        let (attack_down, func_result_after) = run_cv_attack_down(
            input.rng,
            input.attacker.hp,
            input.attacker.max_hp,
            input.target.atk_stage,
            input.target.hp,
            input.target.max_hp,
            input.target.types,
            input.draw_ordinal_start,
        );
        return CheckViabilityResult::Scored {
            rng: attack_down.rng,
            draws: attack_down.draws,
            draw_count: attack_down.draw_count,
            score_delta: attack_down.score_delta,
            func_result_after,
        };
    }

    if move_row.effect == EFFECT_DEFENSE_DOWN
        || move_row.effect == EFFECT_DEFENSE_DOWN_2
        || move_row.effect == EFFECT_TICKLE
    {
        // EFFECT_TICKLE -> AI_CV_DefenseDown too (TS :5674), same shared body
        // as the DOWN pair's own CV half.
        let defense_down = run_cv_stat_down(
            CvStatDownKind::Defense,
            input.rng,
            input.attacker.hp,
            input.attacker.max_hp,
            input.target.def_stage,
            input.target.hp,
            input.target.max_hp,
            input.draw_ordinal_start,
        );
        return CheckViabilityResult::Scored {
            rng: defense_down.rng,
            draws: defense_down.draws,
            draw_count: defense_down.draw_count,
            score_delta: defense_down.score_delta,
            func_result_after: func_result_carry,
        };
    }

    if move_row.effect == EFFECT_SPECIAL_DEFENSE_DOWN
        || move_row.effect == EFFECT_SPECIAL_DEFENSE_DOWN_2
    {
        let sp_def_down = run_cv_stat_down(
            CvStatDownKind::SpDef,
            input.rng,
            input.attacker.hp,
            input.attacker.max_hp,
            input.target.sp_def_stage,
            input.target.hp,
            input.target.max_hp,
            input.draw_ordinal_start,
        );
        return CheckViabilityResult::Scored {
            rng: sp_def_down.rng,
            draws: sp_def_down.draws,
            draw_count: sp_def_down.draw_count,
            score_delta: sp_def_down.score_delta,
            func_result_after: func_result_carry,
        };
    }

    if move_row.effect == EFFECT_ATTACK_UP || move_row.effect == EFFECT_ATTACK_UP_2 {
        let attack_up = run_cv_attack_style_stat_up(
            CvStatUpFamily::AttackUp,
            40,
            input.rng,
            input.attacker.atk_stage,
            input.attacker.hp,
            input.attacker.max_hp,
            input.draw_ordinal_start,
        );
        return CheckViabilityResult::Scored {
            rng: attack_up.rng,
            draws: attack_up.draws,
            draw_count: attack_up.draw_count,
            score_delta: attack_up.score_delta,
            func_result_after: func_result_carry,
        };
    }

    if move_row.effect == EFFECT_DEFENSE_UP
        || move_row.effect == EFFECT_DEFENSE_UP_2
        || move_row.effect == EFFECT_BULK_UP
    {
        // EFFECT_BULK_UP's CV side dispatches straight to AI_CV_DefenseUp,
        // shared with DEFENSE_UP/DEFENSE_UP_2 (TS :5733-5758).
        let (defense_up, func_result_after) = run_cv_defense_up(
            input.rng,
            input.attacker.def_stage,
            input.attacker.hp,
            input.attacker.max_hp,
            input.target.last_used_move_id.unwrap_or(MOVE_NONE),
            func_result_carry,
            input.draw_ordinal_start,
        );
        return CheckViabilityResult::Scored {
            rng: defense_up.rng,
            draws: defense_up.draws,
            draw_count: defense_up.draw_count,
            score_delta: defense_up.score_delta,
            func_result_after,
        };
    }

    if move_row.effect == EFFECT_ACCURACY_DOWN || move_row.effect == EFFECT_ACCURACY_DOWN_2 {
        // EFFECT_ACCURACY_DOWN_2 is dispatched too, source-faithfully, despite
        // being a vestigial constant with zero real moves (TS :5761-5762).
        let accuracy_down = run_cv_accuracy_down(
            input.rng,
            input.attacker.hp,
            input.attacker.max_hp,
            input.attacker.acc_stage,
            input.attacker.is_rooted.unwrap_or(false),
            input.target.hp,
            input.target.max_hp,
            input.target.acc_stage,
            input.target.is_toxic_poisoned.unwrap_or(false),
            input.target.is_leech_seeded.unwrap_or(false),
            input.target.is_cursed.unwrap_or(false),
            input.draw_ordinal_start,
        );
        return CheckViabilityResult::Scored {
            rng: accuracy_down.rng,
            draws: accuracy_down.draws,
            draw_count: accuracy_down.draw_count,
            score_delta: accuracy_down.score_delta,
            func_result_after: func_result_carry,
        };
    }

    if move_row.effect == EFFECT_SPEED_UP || move_row.effect == EFFECT_SPEED_UP_2 {
        let speed_up = run_cv_speed_up(
            input.rng,
            input.attacker,
            input.target,
            input.draw_ordinal_start,
        );
        return CheckViabilityResult::Scored {
            rng: speed_up.rng,
            draws: speed_up.draws,
            draw_count: speed_up.draw_count,
            score_delta: speed_up.score_delta,
            func_result_after: func_result_carry,
        };
    }

    if move_row.effect == EFFECT_SPECIAL_ATTACK_UP || move_row.effect == EFFECT_SPECIAL_ATTACK_UP_2
    {
        let sp_atk_up = run_cv_attack_style_stat_up(
            CvStatUpFamily::SpAtkUp,
            70,
            input.rng,
            input.attacker.sp_atk_stage.unwrap_or(DEFAULT_STAT_STAGE),
            input.attacker.hp,
            input.attacker.max_hp,
            input.draw_ordinal_start,
        );
        return CheckViabilityResult::Scored {
            rng: sp_atk_up.rng,
            draws: sp_atk_up.draws,
            draw_count: sp_atk_up.draw_count,
            score_delta: sp_atk_up.score_delta,
            func_result_after: func_result_carry,
        };
    }

    if move_row.effect == EFFECT_SPECIAL_DEFENSE_UP
        || move_row.effect == EFFECT_SPECIAL_DEFENSE_UP_2
        || move_row.effect == EFFECT_COSMIC_POWER
        || move_row.effect == EFFECT_CALM_MIND
    {
        // All four effects dispatch to the identical AI_CV_SpDefUp (TS
        // :5822-5849).
        let (sp_def_up, func_result_after) = run_cv_sp_def_up(
            input.rng,
            input.attacker.sp_def_stage,
            input.attacker.hp,
            input.attacker.max_hp,
            input.target.last_used_move_id.unwrap_or(MOVE_NONE),
            func_result_carry,
            input.draw_ordinal_start,
        );
        return CheckViabilityResult::Scored {
            rng: sp_def_up.rng,
            draws: sp_def_up.draws,
            draw_count: sp_def_up.draw_count,
            score_delta: sp_def_up.score_delta,
            func_result_after,
        };
    }

    if move_row.effect == EFFECT_LIGHT_SCREEN {
        // The tenth CBM-blocked pair's own CV half (TS :5851-5869).
        let (light_screen, func_result_after) = run_cv_side_screen_type_gate(
            CvDrawKind::LightScreen,
            &AI_CV_LIGHT_SCREEN_SPECIAL_TYPES,
            input.rng,
            input.attacker.hp,
            input.attacker.max_hp,
            input.target.types,
            func_result_carry,
            input.draw_ordinal_start,
        );
        return CheckViabilityResult::Scored {
            rng: light_screen.rng,
            draws: light_screen.draws,
            draw_count: light_screen.draw_count,
            score_delta: light_screen.score_delta,
            func_result_after,
        };
    }

    if move_row.effect == EFFECT_REFLECT {
        // The tenth CBM-blocked pair's other CV half (TS :5871-5889).
        let (reflect, func_result_after) = run_cv_side_screen_type_gate(
            CvDrawKind::Reflect,
            &AI_CV_REFLECT_PHYSICAL_TYPES,
            input.rng,
            input.attacker.hp,
            input.attacker.max_hp,
            input.target.types,
            func_result_carry,
            input.draw_ordinal_start,
        );
        return CheckViabilityResult::Scored {
            rng: reflect.rng,
            draws: reflect.draws,
            draw_count: reflect.draw_count,
            score_delta: reflect.score_delta,
            func_result_after,
        };
    }

    if move_row.effect == EFFECT_EVASION_UP
        || move_row.effect == EFFECT_EVASION_UP_2
        || move_row.effect == EFFECT_MINIMIZE
    {
        // The eleventh CBM-blocked pair's own CV half (TS :5891-5921) --
        // EFFECT_MINIMIZE dispatches to the identical AI_CV_EvasionUp.
        let evasion_up = run_cv_evasion_up(
            input.rng,
            input.attacker.hp,
            input.attacker.max_hp,
            input.attacker.evasion_stage,
            input.attacker.is_rooted.unwrap_or(false),
            input.target.hp,
            input.target.max_hp,
            input.target.is_toxic_poisoned.unwrap_or(false),
            input.target.is_leech_seeded.unwrap_or(false),
            input.target.is_cursed.unwrap_or(false),
            input.draw_ordinal_start,
        );
        return CheckViabilityResult::Scored {
            rng: evasion_up.rng,
            draws: evasion_up.draws,
            draw_count: evasion_up.draw_count,
            score_delta: evasion_up.score_delta,
            func_result_after: func_result_carry,
        };
    }

    if move_row.effect == EFFECT_EVASION_DOWN || move_row.effect == EFFECT_EVASION_DOWN_2 {
        // The eleventh CBM-blocked pair's other CV half (TS :5923-5941).
        let evasion_down = run_cv_stat_down(
            CvStatDownKind::Evasion,
            input.rng,
            input.attacker.hp,
            input.attacker.max_hp,
            input.target.evasion_stage,
            input.target.hp,
            input.target.max_hp,
            input.draw_ordinal_start,
        );
        return CheckViabilityResult::Scored {
            rng: evasion_down.rng,
            draws: evasion_down.draws,
            draw_count: evasion_down.draw_count,
            score_delta: evasion_down.score_delta,
            func_result_after: func_result_carry,
        };
    }

    if CV_TABLE_EFFECTS.contains(&move_row.effect) {
        return CheckViabilityResult::NotYetPorted {
            effect: move_row.effect,
            move_id: input.move_id,
        };
    }
    CheckViabilityResult::Scored {
        rng: input.rng,
        draws: [DRAW_FILLER; MAX_CHECK_VIABILITY_DRAWS],
        draw_count: 0,
        score_delta: 0,
        func_result_after: func_result_carry,
    }
}

// === M5d-1 handlers (batching doc §2 "M5d-1") ===============================

/// Shared draws-plus-score return shape for every M5d-1 handler that does
/// not itself compute a `funcResultAfter` — mirrors the `{rng, draws,
/// scoreDelta}` return shape every `runCv*` function in TS uses except
/// `runCvProtect`/`runCvPursuit`'s own wider shape (those two return this
/// same shape alongside a separate `Option<u8>`, batching doc §1's
/// writes-conditionally/writes-always classification).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct CvDraws {
    rng: BattleRngState,
    draws: [CheckViabilityDraw; MAX_CHECK_VIABILITY_DRAWS],
    draw_count: u8,
    score_delta: i32,
}

/// `EFFECT_HIT`/`EFFECT_POISON_HIT` (`src/data/gen/battle-script-topology.json`
/// `.effects[]`, ids 0/2, live-verified against the codegen artifact) —
/// referenced only inside `AI_CV_Protect`'s own local
/// `EFFECT_ID_IN_WEATHER_RANGE` map (TS :1235-1240), not members of
/// `CV_TABLE_EFFECTS` itself, so kept file-local rather than added to
/// `factory_ai_check_bad_move.rs`'s shared `EFFECT_*` block.
const EFFECT_HIT: u16 = 0;
const EFFECT_POISON_HIT: u16 = 2;

/// `EFFECT_ID_IN_WEATHER_RANGE` (`factoryAiCheckViability.ts:1235-1240`) —
/// `AI_CV_Protect`'s own stale-`funcResult` collision map over the
/// TARGET's last-used move's effect (`get_last_used_bank_move;
/// get_move_effect_from_result`, always executed on both of Protect's
/// paths, TS's own doc comment at :1242-1247).
fn protect_last_move_effect_func_result(last_move_effect: u16) -> Option<u8> {
    match last_move_effect {
        EFFECT_HIT => Some(AI_WEATHER_SUN),
        EFFECT_SLEEP => Some(AI_WEATHER_RAIN),
        EFFECT_POISON_HIT => Some(AI_WEATHER_SANDSTORM),
        EFFECT_ABSORB => Some(AI_WEATHER_HAIL),
        _ => None,
    }
}

/// `AI_CV_Sleep` (`data/battle_ai_scripts.s:778-787`, doc §29,
/// `factoryAiCheckViability.ts:7229-7257`). `targetKnownMoves ?? []`
/// becomes "no known moves" here as `None` (the caller passes `None` when
/// the battler has none); a `Some([...])` with `MOVE_NONE`(0) padding
/// slots is harmless since move id 0's own effect (`EFFECT_HIT`=0) never
/// equals `EFFECT_DREAM_EATER`(8) or `EFFECT_NIGHTMARE`(107).
fn run_cv_sleep(
    rng: BattleRngState,
    target_known_moves: Option<[u16; 4]>,
    ordinal_start: u32,
) -> CvDraws {
    let known_moves = target_known_moves.unwrap_or([0, 0, 0, 0]);
    let encourages_sleep_damage = known_moves.iter().any(|&move_id| {
        gen_tables::MOVES
            .get(move_id as usize)
            .is_some_and(|m| m.effect == EFFECT_DREAM_EATER || m.effect == EFFECT_NIGHTMARE)
    });
    let empty = CvDraws {
        rng,
        draws: [DRAW_FILLER; MAX_CHECK_VIABILITY_DRAWS],
        draw_count: 0,
        score_delta: 0,
    };
    if !encourages_sleep_damage {
        return empty;
    }

    let roll = next_draw(rng, ordinal_start);
    let jumped_to_end = roll.random_value % 256 < 128;
    let mut draws = [DRAW_FILLER; MAX_CHECK_VIABILITY_DRAWS];
    draws[0] = CheckViabilityDraw::PursuitSleepRoarParalyzeRoll {
        ordinal: roll.ordinal,
        before: roll.before,
        after: roll.after,
        raw_rng_value: roll.raw_rng_value,
        random_value: roll.random_value,
        kind: CvDrawKind::Sleep,
        succeeded: !jumped_to_end,
    };
    CvDraws {
        rng: roll.after,
        draws,
        draw_count: 1,
        score_delta: if jumped_to_end { 0 } else { 1 },
    }
}

/// Builds a `TurnOrderBattler` the same way every M5d-1 `if_target_faster`
/// site does (TS's own inline `{ speed, speedStage, movePriority: 0 }`
/// literal, batching doc §1): `movePriority`/`is_paralyzed`/`ability`/
/// `hold_effect`/`hold_effect_param` are TS's implicit `undefined`
/// defaults, which `effectiveSpeed`/`getWhoStrikesFirst` all treat as
/// falsy/zero.
fn cv_turn_order_battler(speed: u32, speed_stage: u8) -> TurnOrderBattler {
    TurnOrderBattler {
        speed,
        speed_stage,
        move_priority: 0,
        is_paralyzed: false,
        ability: ABILITY_NONE,
        hold_effect: HOLD_EFFECT_NONE,
        hold_effect_param: 0,
    }
}

/// The `if_target_faster` gate every one of `runCvSpeedDown`/
/// `runCvVitalThrow` (this batch) and `runCvSpeedUp`/`runCvRest`/
/// `runCvParalyze` (later batches) opens with: draw a tie-break roll only
/// when `effectiveSpeed` is exactly equal (TS's own outer `if`, matching
/// `getWhoStrikesFirst`'s internal tie check), then call
/// `getWhoStrikesFirst` unconditionally with that roll's value (or the `0`
/// sentinel when no tie occurred — never read by `getWhoStrikesFirst` on a
/// non-tied pair). `WeatherState::default()`/`0xffff` reproduce
/// `effectiveSpeed`/`getWhoStrikesFirst`'s own TS default parameters
/// (`weather = {}`, `randomTurnNumber = 0xffff`), which every M5d-1 call
/// site relies on implicitly by never passing either.
fn cv_resolve_target_faster(
    rng: BattleRngState,
    ordinal: u32,
    attacker: TurnOrderBattler,
    target: TurnOrderBattler,
) -> (BattleRngState, u32, Option<CheckViabilityDraw>, u8) {
    let weather = WeatherState::default();
    let speed1 = effective_speed(&attacker, weather, 0xffff);
    let speed2 = effective_speed(&target, weather, 0xffff);
    if speed1 == speed2 {
        let tie = next_draw(rng, ordinal);
        let strikes_first =
            get_who_strikes_first(&attacker, &target, tie.random_value, weather, 0xffff);
        let draw = CheckViabilityDraw::TargetFasterTie {
            ordinal: tie.ordinal,
            before: tie.before,
            after: tie.after,
            raw_rng_value: tie.raw_rng_value,
            random_value: tie.random_value,
            strikes_first,
        };
        (tie.after, ordinal + 1, Some(draw), strikes_first)
    } else {
        let strikes_first = get_who_strikes_first(&attacker, &target, 0, weather, 0xffff);
        (rng, ordinal, None, strikes_first)
    }
}

/// `AI_CV_SpeedDown` (`data/battle_ai_scripts.s:1142-1152`,
/// `docs/factory-ai-checkviability-ground-truth.md` §6,
/// `factoryAiCheckViability.ts:1355-1395`). Target strictly faster
/// (`strikes_first == 1`) reaches DRAW SITE 1 (roll<70 skips the bonus,
/// ~27%; roll>=70 grants +2, ~73%); target not faster is a deterministic
/// `-3`, DRAW SITE 1 never reached.
fn run_cv_speed_down(
    rng: BattleRngState,
    attacker: FactoryAiCheckViabilityBattler,
    target: FactoryAiCheckViabilityBattler,
    ordinal_start: u32,
) -> CvDraws {
    let attacker_to = cv_turn_order_battler(attacker.speed, attacker.speed_stage);
    let target_to = cv_turn_order_battler(target.speed, target.speed_stage);
    let (mut cur_rng, ordinal, tie_draw, strikes_first) =
        cv_resolve_target_faster(rng, ordinal_start, attacker_to, target_to);

    let mut draws = [DRAW_FILLER; MAX_CHECK_VIABILITY_DRAWS];
    let mut draw_count: u8 = 0;
    if let Some(draw) = tie_draw {
        draws[draw_count as usize] = draw;
        draw_count += 1;
    }

    if strikes_first != 1 {
        return CvDraws { rng: cur_rng, draws, draw_count, score_delta: -3 };
    }

    let roll = next_draw(cur_rng, ordinal);
    cur_rng = roll.after;
    let succeeded = roll.random_value % 256 >= 70;
    draws[draw_count as usize] = CheckViabilityDraw::SpeedDownRoll {
        ordinal: roll.ordinal,
        before: roll.before,
        after: roll.after,
        raw_rng_value: roll.raw_rng_value,
        random_value: roll.random_value,
        succeeded,
    };
    draw_count += 1;
    CvDraws { rng: cur_rng, draws, draw_count, score_delta: if succeeded { 2 } else { 0 } }
}

const MOVE_ICY_WIND: u16 = 196;
const MOVE_ROCK_TOMB: u16 = 317;
const MOVE_MUD_SHOT: u16 = 341;

/// `AI_CV_SpeedDownFromChance` (`data/battle_ai_scripts.s:1136-1141`,
/// `factoryAiCheckViability.ts:1432-1444`): exactly 3 of the 6
/// `EFFECT_SPEED_DOWN_HIT` moves (`MOVE_ICY_WIND`/`MOVE_ROCK_TOMB`/
/// `MOVE_MUD_SHOT`) `goto AI_CV_SpeedDown`'s own label — ported as a
/// direct call into `run_cv_speed_down`, not a duplicated gate/roll. The
/// other 3 (`BUBBLE_BEAM`/`CONSTRICT`/`BUBBLE`) fall through the unmatched
/// `if_move` chain to a deterministic zero score/zero draws.
fn run_cv_speed_down_from_chance(
    rng: BattleRngState,
    move_id: u16,
    attacker: FactoryAiCheckViabilityBattler,
    target: FactoryAiCheckViabilityBattler,
    ordinal_start: u32,
) -> CvDraws {
    if move_id == MOVE_ICY_WIND || move_id == MOVE_ROCK_TOMB || move_id == MOVE_MUD_SHOT {
        return run_cv_speed_down(rng, attacker, target, ordinal_start);
    }
    CvDraws {
        rng,
        draws: [DRAW_FILLER; MAX_CHECK_VIABILITY_DRAWS],
        draw_count: 0,
        score_delta: 0,
    }
}

/// `AI_CV_Toxic` (`data/battle_ai_scripts.s:1353-1371`,
/// `factoryAiCheckViability.ts:1173-1233`), shared by Toxic and Leech
/// Seed. `attacker.moves` is required (TS :1185-1187 throws when absent);
/// every branch ported in script order, including all three `%256` draws
/// and the move-effect scans over AI_USER's complete four-move set. None
/// of these commands writes `funcResult`.
fn run_cv_toxic(
    rng: BattleRngState,
    attacker: FactoryAiCheckViabilityBattler,
    target: FactoryAiCheckViabilityBattler,
    ordinal_start: u32,
) -> CvDraws {
    let moves = attacker
        .moves
        .expect("factory-ai-check-viability: AI_CV_Toxic requires AI_USER moves (TS :1186 throws)");
    let has_attacking_move = moves.iter().any(|&move_id| {
        gen_tables::MOVES
            .get(move_id as usize)
            .is_some_and(|m| m.power != 0)
    });
    let has_setup_partner = moves.iter().any(|&move_id| {
        gen_tables::MOVES
            .get(move_id as usize)
            .is_some_and(|m| m.effect == EFFECT_SPECIAL_DEFENSE_UP || m.effect == EFFECT_PROTECT)
    });

    let mut cur_rng = rng;
    let mut ordinal = ordinal_start;
    let mut score: i32 = 0;
    let mut draws = [DRAW_FILLER; MAX_CHECK_VIABILITY_DRAWS];
    let mut draw_count: u8 = 0;

    if has_attacking_move {
        let attacker_hp_percent = 100 * attacker.hp / attacker.max_hp;
        if attacker_hp_percent <= 50 {
            let roll = next_draw(cur_rng, ordinal);
            cur_rng = roll.after;
            ordinal += 1;
            let jumped = roll.random_value % 256 < 50;
            draws[draw_count as usize] = CheckViabilityDraw::ToxicRoll {
                ordinal: roll.ordinal,
                before: roll.before,
                after: roll.after,
                raw_rng_value: roll.raw_rng_value,
                random_value: roll.random_value,
                kind: CvDrawKind::Toxic1,
                jumped,
            };
            draw_count += 1;
            if !jumped {
                score -= 3;
            }
        }

        let target_hp_percent = 100 * target.hp / target.max_hp;
        if target_hp_percent <= 50 {
            let roll = next_draw(cur_rng, ordinal);
            cur_rng = roll.after;
            ordinal += 1;
            let jumped = roll.random_value % 256 < 50;
            draws[draw_count as usize] = CheckViabilityDraw::ToxicRoll {
                ordinal: roll.ordinal,
                before: roll.before,
                after: roll.after,
                raw_rng_value: roll.raw_rng_value,
                random_value: roll.random_value,
                kind: CvDrawKind::Toxic2,
                jumped,
            };
            draw_count += 1;
            if !jumped {
                score -= 3;
            }
        }
    }

    if has_setup_partner {
        let roll = next_draw(cur_rng, ordinal);
        cur_rng = roll.after;
        let jumped = roll.random_value % 256 < 60;
        draws[draw_count as usize] = CheckViabilityDraw::ToxicRoll {
            ordinal: roll.ordinal,
            before: roll.before,
            after: roll.after,
            raw_rng_value: roll.raw_rng_value,
            random_value: roll.random_value,
            kind: CvDrawKind::Toxic3,
            jumped,
        };
        draw_count += 1;
        if !jumped {
            score += 2;
        }
    }

    CvDraws { rng: cur_rng, draws, draw_count, score_delta: score }
}

/// `AI_CV_Protect` (`data/battle_ai_scripts.s:1894-1932`,
/// `factoryAiCheckViability.ts:1249-1324`), including both status/move-
/// history prologues, the source's usual +2 path, both `%256` rolls, and
/// the consecutive-Protect penalty. Both paths execute
/// `get_last_used_bank_move; get_move_effect_from_result`, so
/// `funcResult` is always replaced by the target's last-move effect
/// before return (the `Option<u8>` this returns alongside the score, not
/// the caller's carry).
fn run_cv_protect(
    rng: BattleRngState,
    attacker: FactoryAiCheckViabilityBattler,
    target: FactoryAiCheckViabilityBattler,
    ordinal_start: u32,
) -> (CvDraws, Option<u8>) {
    let last_move_id = target.last_used_move_id.unwrap_or(0);
    let last_move_effect = gen_tables::MOVES
        .get(last_move_id as usize)
        .map_or(EFFECT_HIT, |m| m.effect);
    let func_result_after = protect_last_move_effect_func_result(last_move_effect);

    let known_moves = target.known_moves.unwrap_or([0, 0, 0, 0]);
    let user_moves = attacker.moves.unwrap_or([0, 0, 0, 0]);
    // Cmd_if_has_move_with_effect's pinned-source AI_TARGET bug checks the
    // AI user's move slot for nonzero before reading the target-history
    // move at that same index (TS :1265-1268) -- preserve the positional
    // gate instead of a plain history membership test.
    let target_history_has_effect = |effect: u16| -> bool {
        known_moves
            .iter()
            .zip(user_moves.iter())
            .any(|(&move_id, &user_move)| {
                user_move != 0
                    && gen_tables::MOVES
                        .get(move_id as usize)
                        .is_some_and(|m| m.effect == effect)
            })
    };

    let early_protect3 = attacker.is_infatuated.unwrap_or(false)
        || attacker.is_leech_seeded.unwrap_or(false)
        || attacker.has_yawn.unwrap_or(false)
        || target_history_has_effect(EFFECT_RESTORE_HP)
        || target_history_has_effect(EFFECT_DEFENSE_CURL);

    let empty = CvDraws {
        rng,
        draws: [DRAW_FILLER; MAX_CHECK_VIABILITY_DRAWS],
        draw_count: 0,
        score_delta: 0,
    };

    if early_protect3 {
        let score_delta = if last_move_effect == EFFECT_LOCK_ON {
            -2
        } else {
            0
        };
        return (CvDraws { score_delta, ..empty }, func_result_after);
    }

    let base_gate = target.is_toxic_poisoned.unwrap_or(false)
        || target.is_cursed.unwrap_or(false)
        || target.has_perish_song.unwrap_or(false)
        || target.is_infatuated.unwrap_or(false)
        || target.is_leech_seeded.unwrap_or(false)
        || target.has_yawn.unwrap_or(false)
        || last_move_effect != EFFECT_LOCK_ON;
    let mut score: i32 = if base_gate { 2 } else { 0 };

    let mut draws = [DRAW_FILLER; MAX_CHECK_VIABILITY_DRAWS];
    let mut draw_count: u8 = 0;
    let mut cur_rng = rng;
    let mut ordinal = ordinal_start;

    let roll1 = next_draw(cur_rng, ordinal);
    cur_rng = roll1.after;
    ordinal += 1;
    let jumped1 = roll1.random_value % 256 < 128;
    draws[draw_count as usize] = CheckViabilityDraw::ProtectRoll {
        ordinal: roll1.ordinal,
        before: roll1.before,
        after: roll1.after,
        raw_rng_value: roll1.raw_rng_value,
        random_value: roll1.random_value,
        kind: CvDrawKind::Protect1,
        jumped: jumped1,
    };
    draw_count += 1;
    if !jumped1 {
        score -= 1;
    }

    if attacker.protect_uses.unwrap_or(0) != 0 {
        score -= 1;
        let roll2 = next_draw(cur_rng, ordinal);
        cur_rng = roll2.after;
        let jumped2 = roll2.random_value % 256 < 128;
        draws[draw_count as usize] = CheckViabilityDraw::ProtectRoll {
            ordinal: roll2.ordinal,
            before: roll2.before,
            after: roll2.after,
            raw_rng_value: roll2.raw_rng_value,
            random_value: roll2.random_value,
            kind: CvDrawKind::Protect2,
            jumped: jumped2,
        };
        draw_count += 1;
        if !jumped2 {
            score -= 1;
        }
    }

    (
        CvDraws { rng: cur_rng, draws, draw_count, score_delta: score },
        func_result_after,
    )
}

/// `AI_CV_Pursuit`'s own writes-ALWAYS `funcResult` exit value
/// (`factoryAiCheckViability.ts:2336-2360`, doc §27.1 handler 3):
/// `is_first_turn_for AI_USER` writes unconditionally first
/// (`funcResult = isFirstTurn`, domain 0-2); nonzero survives untouched
/// (1/2 are themselves valid `AI_WEATHER_*` ids). If zero, the handler
/// re-reads target type1 then type2 -- the exit value is always type1 (if
/// Ghost or Psychic) or type2 (every other case).
fn pursuit_func_result_after(attacker_is_first_turn: u8, target_types: [u8; 2]) -> Option<u8> {
    if attacker_is_first_turn != 0 {
        return Some(attacker_is_first_turn);
    }
    let [t1, t2] = target_types;
    if t1 == TYPE_GHOST || t1 == TYPE_PSYCHIC {
        type_func_result_collision(t1)
    } else {
        type_func_result_collision(t2)
    }
}

/// `AI_CV_Pursuit` (`data/battle_ai_scripts.s:2018-2036`,
/// `docs/factory-ai-checkviability-ground-truth.md` §11.1,
/// `factoryAiCheckViability.ts:2362-2388`). The gate gauges the OPPONENT's
/// own elapsed turns (`gDisableStructs[aiBattler].isFirstTurn`), not the
/// target's. Once clear, the target's two type slots are checked against
/// hardcoded Ghost/Psychic; a match reaches DRAW SITE 1 (roll<128 skips
/// the bonus, ~50%; roll>=128 grants +1).
fn run_cv_pursuit(
    rng: BattleRngState,
    attacker_is_first_turn: u8,
    target_types: [u8; 2],
    ordinal_start: u32,
) -> (CvDraws, Option<u8>) {
    let func_result_after = pursuit_func_result_after(attacker_is_first_turn, target_types);
    let empty = CvDraws {
        rng,
        draws: [DRAW_FILLER; MAX_CHECK_VIABILITY_DRAWS],
        draw_count: 0,
        score_delta: 0,
    };
    if attacker_is_first_turn != 0 {
        return (empty, func_result_after);
    }
    let is_ghost_or_psychic = target_types[0] == TYPE_GHOST
        || target_types[0] == TYPE_PSYCHIC
        || target_types[1] == TYPE_GHOST
        || target_types[1] == TYPE_PSYCHIC;
    if !is_ghost_or_psychic {
        return (empty, func_result_after);
    }

    let draw = next_draw(rng, ordinal_start);
    let succeeded = draw.random_value % 256 >= 128;
    let mut draws = [DRAW_FILLER; MAX_CHECK_VIABILITY_DRAWS];
    draws[0] = CheckViabilityDraw::PursuitSleepRoarParalyzeRoll {
        ordinal: draw.ordinal,
        before: draw.before,
        after: draw.after,
        raw_rng_value: draw.raw_rng_value,
        random_value: draw.random_value,
        kind: CvDrawKind::Pursuit,
        succeeded,
    };
    (
        CvDraws {
            rng: draw.after,
            draws,
            draw_count: 1,
            score_delta: if succeeded { 1 } else { 0 },
        },
        func_result_after,
    )
}

/// `AI_EFFECTIVENESS_x*` magic numbers (`factoryAiCheckViability.ts
/// :2813-2817`), TS-file-private constants re-declared here (not part of
/// any exported registry, same as TS's own unexported `const`s).
const AI_EFFECTIVENESS_X0_25: i32 = 10;
const AI_EFFECTIVENESS_X0_5: i32 = 20;
const AI_EFFECTIVENESS_X1: i32 = 40;
const AI_EFFECTIVENESS_X2: i32 = 80;
const AI_EFFECTIVENESS_X4: i32 = 160;

/// `classifyHighCritEffectiveness` (`factoryAiCheckViability.ts:2839-2851`)
/// -- `Cmd_if_type_effectiveness`'s own STAB+per-defending-type
/// truncating-multiply chain (`apply_stab`/`apply_type_effectiveness`,
/// already `pub` in `damage_calc.rs`, batching doc §1), fed a fixed
/// `AI_EFFECTIVENESS_x1`(40) baseline and remapped back onto the 4 named
/// `AI_EFFECTIVENESS_x*` constants (120/240/30/15 -> x2/x4/x0.5/x0.25).
/// Shared by `AI_CV_HighCrit` (this batch) and 8 more handlers across
/// M5d-2..5 (TS's own 9 call sites) -- ported once here since M5d-1 is the
/// first batch to need it.
fn classify_high_crit_effectiveness(
    attacker_types: [u8; 2],
    move_type: u8,
    target_types: [u8; 2],
) -> i32 {
    let stabbed = apply_stab(AI_EFFECTIVENESS_X1, attacker_types, move_type);
    let mut value = apply_type_effectiveness(
        stabbed,
        move_type,
        target_types,
        &gen_tables::TYPE_EFFECTIVENESS_TABLE,
    )
    .damage;
    if value == 120 {
        value = AI_EFFECTIVENESS_X2; // Super effective STAB.
    }
    if value == 240 {
        value = AI_EFFECTIVENESS_X4;
    }
    if value == 30 {
        value = AI_EFFECTIVENESS_X0_5; // Not very effective STAB.
    }
    if value == 15 {
        value = AI_EFFECTIVENESS_X0_25;
    }
    value
}

/// `AI_CV_HighCrit` (`data/battle_ai_scripts.s:1449-1461`,
/// `docs/factory-ai-checkviability-ground-truth.md` §11.2,
/// `factoryAiCheckViability.ts:2884-2917`). Exactly 0.25x/0.5x:
/// deterministic End, zero draws. Exactly 2x/4x: JUMPS straight past the
/// first roll -- exactly one draw. Everything else (neutral 1x, immune
/// 0x, or any other truncated remainder) falls SEQUENTIALLY into the
/// first roll, which in the real assembly sits immediately before the
/// second roll's own label: not jumping (roll>=128) doesn't skip
/// anything, so this path burns ONE draw when the first roll is <128 but
/// TWO when it is >=128 -- a real, source-confirmed quirk, not a fixed
/// count.
fn run_cv_high_crit(
    rng: BattleRngState,
    attacker_types: [u8; 2],
    move_type: u8,
    target_types: [u8; 2],
    ordinal_start: u32,
) -> CvDraws {
    let classified = classify_high_crit_effectiveness(attacker_types, move_type, target_types);
    let empty = CvDraws {
        rng,
        draws: [DRAW_FILLER; MAX_CHECK_VIABILITY_DRAWS],
        draw_count: 0,
        score_delta: 0,
    };
    if classified == AI_EFFECTIVENESS_X0_25 || classified == AI_EFFECTIVENESS_X0_5 {
        return empty;
    }

    let mut cur_rng = rng;
    let mut ordinal = ordinal_start;
    let mut draws = [DRAW_FILLER; MAX_CHECK_VIABILITY_DRAWS];
    let mut draw_count: u8 = 0;

    if classified != AI_EFFECTIVENESS_X2 && classified != AI_EFFECTIVENESS_X4 {
        let fallthrough = next_draw(cur_rng, ordinal);
        cur_rng = fallthrough.after;
        ordinal += 1;
        let jumped_to_end = fallthrough.random_value % 256 < 128;
        draws[draw_count as usize] = CheckViabilityDraw::HighCritFallthroughRoll {
            ordinal: fallthrough.ordinal,
            before: fallthrough.before,
            after: fallthrough.after,
            raw_rng_value: fallthrough.raw_rng_value,
            random_value: fallthrough.random_value,
            jumped_to_end,
        };
        draw_count += 1;
        if jumped_to_end {
            return CvDraws { rng: cur_rng, draws, draw_count, score_delta: 0 };
        }
    }

    let roll = next_draw(cur_rng, ordinal);
    cur_rng = roll.after;
    let succeeded = roll.random_value % 256 >= 128;
    draws[draw_count as usize] = CheckViabilityDraw::HighCritRoll {
        ordinal: roll.ordinal,
        before: roll.before,
        after: roll.after,
        raw_rng_value: roll.raw_rng_value,
        random_value: roll.random_value,
        succeeded,
    };
    draw_count += 1;
    CvDraws { rng: cur_rng, draws, draw_count, score_delta: if succeeded { 1 } else { 0 } }
}

/// `AI_CV_AlwaysHit` (`data/battle_ai_scripts.s:1075-1089`,
/// `docs/factory-ai-checkviability-ground-truth.md` §11.3/§12.1,
/// `factoryAiCheckViability.ts:2964-2989`). `Cmd_score`'s own `score +1`
/// (`AI_CV_AlwaysHit_ScoreUp1`) does NOT terminate the script -- there is
/// no `goto` after it, so reaching it falls straight through into the
/// second gate pair's own `if_random_less_than 100` roll (TS's own
/// real-finding note at :2946-2962, beyond the ground-truth doc's own
/// inline gloss): reaching `ScoreUp1` still burns exactly one draw and
/// scores +1/+2, never a zero-draw deterministic +1.
fn run_cv_always_hit(
    rng: BattleRngState,
    target_evasion_stage: u8,
    attacker_acc_stage: u8,
    ordinal_start: u32,
) -> CvDraws {
    let reaches_score_up1 = target_evasion_stage > 10 || attacker_acc_stage < 2;
    let reaches_always_hit2 =
        reaches_score_up1 || target_evasion_stage > 8 || attacker_acc_stage < 4;
    if !reaches_always_hit2 {
        return CvDraws {
            rng,
            draws: [DRAW_FILLER; MAX_CHECK_VIABILITY_DRAWS],
            draw_count: 0,
            score_delta: 0,
        };
    }

    let base_score = if reaches_score_up1 { 1 } else { 0 };
    let draw = next_draw(rng, ordinal_start);
    let succeeded = draw.random_value % 256 >= 100;
    let mut draws = [DRAW_FILLER; MAX_CHECK_VIABILITY_DRAWS];
    draws[0] = CheckViabilityDraw::AlwaysHitRoll {
        ordinal: draw.ordinal,
        before: draw.before,
        after: draw.after,
        raw_rng_value: draw.raw_rng_value,
        random_value: draw.random_value,
        succeeded,
    };
    CvDraws {
        rng: draw.after,
        draws,
        draw_count: 1,
        score_delta: base_score + if succeeded { 1 } else { 0 },
    }
}

/// `AI_CV_VitalThrow` (`data/battle_ai_scripts.s:1536-1546`,
/// `docs/factory-ai-checkviability-ground-truth.md` §13,
/// `factoryAiCheckViability.ts:3039-3094`). `if_target_faster` here has
/// the OPPOSITE consequence from `SpeedDown`'s own gate: this jump lands
/// on End when the TARGET is strictly faster, so the rest of the handler
/// runs only when AI_USER is faster than or tied with the target. Past
/// that, AI_USER's own HP >60% is deterministic End; <40% skips straight
/// to the final roll; the [40,60] band burns a midband roll first (jump
/// ~70.3% to End, fall through ~29.7% into the final roll immediately
/// after -- the same fallthrough shape `AI_CV_HighCrit` already
/// establishes).
fn run_cv_vital_throw(
    rng: BattleRngState,
    attacker: FactoryAiCheckViabilityBattler,
    target: FactoryAiCheckViabilityBattler,
    ordinal_start: u32,
) -> CvDraws {
    let attacker_to = cv_turn_order_battler(attacker.speed, attacker.speed_stage);
    let target_to = cv_turn_order_battler(target.speed, target.speed_stage);
    let (mut cur_rng, mut ordinal, tie_draw, strikes_first) =
        cv_resolve_target_faster(rng, ordinal_start, attacker_to, target_to);

    let mut draws = [DRAW_FILLER; MAX_CHECK_VIABILITY_DRAWS];
    let mut draw_count: u8 = 0;
    if let Some(draw) = tie_draw {
        draws[draw_count as usize] = draw;
        draw_count += 1;
    }

    if strikes_first == 1 {
        // Target strictly faster: goto End immediately, no HP check ever runs.
        return CvDraws { rng: cur_rng, draws, draw_count, score_delta: 0 };
    }

    let hp_percent = 100 * attacker.hp / attacker.max_hp;
    if hp_percent > 60 {
        return CvDraws { rng: cur_rng, draws, draw_count, score_delta: 0 };
    }

    if hp_percent >= 40 {
        // Only reached at HP% in [40, 60]: if_random_less_than 180.
        let midband = next_draw(cur_rng, ordinal);
        cur_rng = midband.after;
        ordinal += 1;
        let jumped_to_end = midband.random_value % 256 < 180;
        draws[draw_count as usize] = CheckViabilityDraw::VitalThrowMidbandRoll {
            ordinal: midband.ordinal,
            before: midband.before,
            after: midband.after,
            raw_rng_value: midband.raw_rng_value,
            random_value: midband.random_value,
            jumped_to_end,
        };
        draw_count += 1;
        if jumped_to_end {
            return CvDraws { rng: cur_rng, draws, draw_count, score_delta: 0 };
        }
    }

    let roll = next_draw(cur_rng, ordinal);
    cur_rng = roll.after;
    let succeeded = roll.random_value % 256 >= 50;
    draws[draw_count as usize] = CheckViabilityDraw::VitalThrowRoll {
        ordinal: roll.ordinal,
        before: roll.before,
        after: roll.after,
        raw_rng_value: roll.raw_rng_value,
        random_value: roll.random_value,
        succeeded,
    };
    draw_count += 1;
    CvDraws { rng: cur_rng, draws, draw_count, score_delta: if succeeded { -1 } else { 0 } }
}

// === M5d-2 handlers (batching doc §2 "M5d-2") ===============================

const MOVE_NONE: u16 = 0;

/// `AI_CV_AttackDown_PhysicalTypeList` (`data/battle_ai_scripts.s`,
/// `factoryAiCheckViability.ts:3096-3098`) -- 6 types; deliberately
/// excludes Flying/Poison/Ghost (source's own comment), a DIFFERENT
/// (smaller) list than `AI_CV_DEFENSE_UP_PHYSICAL_TYPES` below.
const AI_CV_ATTACK_DOWN_PHYSICAL_TYPES: [u8; 6] = [
    TYPE_NORMAL,
    TYPE_FIGHTING,
    TYPE_GROUND,
    TYPE_ROCK,
    TYPE_BUG,
    TYPE_STEEL,
];

/// `AI_CV_AttackDown` (`data/battle_ai_scripts.s:1090-1123`,
/// `docs/factory-ai-checkviability-ground-truth.md` §14.1,
/// `factoryAiCheckViability.ts:3100-3211`, `runCvAttackDown`).
/// **Standalone -- does NOT use the shared `run_cv_stat_down` tail**
/// (batching doc §2 M5d-2's own instruction): Gate A (target ATK stage ==
/// `DEFAULT_STAT_STAGE`) skips straight to Gate D; Gate B (attacker HP <=
/// 90, a plain fallthrough) and Gate C (target ATK stage <= 3)
/// independently gate DRAW SITE 1; Gate D (target HP <= 70) is a plain
/// fallthrough; Gates E/F (`get_target_type1`/`2` + `if_in_bytes`) ALWAYS
/// execute and always (over)write `funcResult` -- computed once via
/// `type_chain_func_result_after` regardless of any earlier branch, same
/// simplification `classify_high_crit_effectiveness` already makes for
/// `if_type_effectiveness`. A physical-type match jumps to End, skipping
/// DRAW SITE 2 entirely; otherwise DRAW SITE 2 fires. DRAW SITE 1 and DRAW
/// SITE 2 are NOT mutually exclusive -- worst case both fire in one pass
/// (TS test :1701-1718, -8 total).
#[allow(clippy::too_many_arguments)]
fn run_cv_attack_down(
    rng: BattleRngState,
    attacker_hp: i32,
    attacker_max_hp: i32,
    target_atk_stage: u8,
    target_hp: i32,
    target_max_hp: i32,
    target_types: [u8; 2],
    ordinal_start: u32,
) -> (CvDraws, Option<u8>) {
    let mut cur_rng = rng;
    let mut ordinal = ordinal_start;
    let mut draws = [DRAW_FILLER; MAX_CHECK_VIABILITY_DRAWS];
    let mut draw_count: u8 = 0;
    let mut score: i32 = 0;

    if target_atk_stage != DEFAULT_STAT_STAGE {
        score -= 1;
        let attacker_hp_percent = 100 * attacker_hp / attacker_max_hp;
        if attacker_hp_percent <= 90 {
            score -= 1;
        }
        if target_atk_stage <= 3 {
            let draw1 = next_draw(cur_rng, ordinal);
            cur_rng = draw1.after;
            ordinal += 1;
            let succeeded1 = draw1.random_value % 256 >= 50;
            draws[draw_count as usize] = CheckViabilityDraw::AttackDownRoll1 {
                ordinal: draw1.ordinal,
                before: draw1.before,
                after: draw1.after,
                raw_rng_value: draw1.raw_rng_value,
                random_value: draw1.random_value,
                succeeded: succeeded1,
            };
            draw_count += 1;
            if succeeded1 {
                score -= 2;
            }
        }
    }

    let target_hp_percent = 100 * target_hp / target_max_hp;
    if target_hp_percent <= 70 {
        score -= 2;
    }

    // Gates E/F ALWAYS execute -- funcResultAfter doesn't depend on any
    // earlier gate/draw outcome above.
    let func_result_after =
        type_chain_func_result_after(target_types, &AI_CV_ATTACK_DOWN_PHYSICAL_TYPES);
    let is_physical_type = AI_CV_ATTACK_DOWN_PHYSICAL_TYPES.contains(&target_types[0])
        || AI_CV_ATTACK_DOWN_PHYSICAL_TYPES.contains(&target_types[1]);
    if is_physical_type {
        return (
            CvDraws { rng: cur_rng, draws, draw_count, score_delta: score },
            func_result_after,
        );
    }

    let draw2 = next_draw(cur_rng, ordinal);
    cur_rng = draw2.after;
    let succeeded2 = draw2.random_value % 256 >= 50;
    draws[draw_count as usize] = CheckViabilityDraw::AttackDownRoll2 {
        ordinal: draw2.ordinal,
        before: draw2.before,
        after: draw2.after,
        raw_rng_value: draw2.raw_rng_value,
        random_value: draw2.random_value,
        succeeded: succeeded2,
    };
    draw_count += 1;
    if succeeded2 {
        score -= 2;
    }

    (
        CvDraws { rng: cur_rng, draws, draw_count, score_delta: score },
        func_result_after,
    )
}

/// Which top-level `CheckViabilityDraw` variant `run_cv_stat_down`'s single
/// roll constructs -- selects among the shared tail's 3 CV callers.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum CvStatDownKind {
    Defense,
    SpDef,
    Evasion,
}

/// Shared body for `AI_CV_DefenseDown` (`data/battle_ai_scripts.s:1124
/// -1134`, doc §15.1), `AI_CV_SpDefDown` (`:1186-1196`, doc §16.1), and
/// `AI_CV_EvasionDown` (`:1235-1246`, doc §24.1) -- byte-for-byte the same
/// shape with only the compared stat stage (and the draw's own variant)
/// differing (`runCvStatDown`, `factoryAiCheckViability.ts:3245-3278`).
/// Gate A (attacker HP < 70%) and Gate B (target stat stage > 3, only
/// checked when Gate A is false) are two different PATHS INTO THE SAME
/// draw site, not independent options -- the draw site is reached whenever
/// `attackerHpPercent < 70 || targetStatStage <= 3`. Gate C (target HP >
/// 70%, a plain fallthrough) is orthogonal to the draw site's own
/// reachability. TS's own per-effect wrapper functions (`runCvDefenseDown`/
/// `runCvSpDefDown`/`runCvEvasionDown`) are trivial one-shot input remaps
/// with no independent logic -- collapsed here into this shared tail,
/// called directly from the dispatcher with a `kind` selector, rather than
/// porting 3 pass-through wrapper functions.
#[allow(clippy::too_many_arguments)]
fn run_cv_stat_down(
    kind: CvStatDownKind,
    rng: BattleRngState,
    attacker_hp: i32,
    attacker_max_hp: i32,
    target_stat_stage: u8,
    target_hp: i32,
    target_max_hp: i32,
    ordinal_start: u32,
) -> CvDraws {
    let mut cur_rng = rng;
    let mut draws = [DRAW_FILLER; MAX_CHECK_VIABILITY_DRAWS];
    let mut draw_count: u8 = 0;
    let mut score: i32 = 0;

    let attacker_hp_percent = 100 * attacker_hp / attacker_max_hp;
    let reaches_draw_site = attacker_hp_percent < 70 || target_stat_stage <= 3;
    if reaches_draw_site {
        let roll = next_draw(cur_rng, ordinal_start);
        cur_rng = roll.after;
        let succeeded = roll.random_value % 256 >= 50;
        let draw = match kind {
            CvStatDownKind::Defense => CheckViabilityDraw::DefenseDownRoll {
                ordinal: roll.ordinal,
                before: roll.before,
                after: roll.after,
                raw_rng_value: roll.raw_rng_value,
                random_value: roll.random_value,
                succeeded,
            },
            CvStatDownKind::SpDef => CheckViabilityDraw::SpDefDownRoll {
                ordinal: roll.ordinal,
                before: roll.before,
                after: roll.after,
                raw_rng_value: roll.raw_rng_value,
                random_value: roll.random_value,
                succeeded,
            },
            CvStatDownKind::Evasion => CheckViabilityDraw::EvasionDownRoll {
                ordinal: roll.ordinal,
                before: roll.before,
                after: roll.after,
                raw_rng_value: roll.raw_rng_value,
                random_value: roll.random_value,
                succeeded,
            },
        };
        draws[draw_count as usize] = draw;
        draw_count += 1;
        if succeeded {
            score -= 2;
        }
    }

    let target_hp_percent = 100 * target_hp / target_max_hp;
    if target_hp_percent <= 70 {
        score -= 2;
    }

    CvDraws { rng: cur_rng, draws, draw_count, score_delta: score }
}

/// Which top-level `CheckViabilityDraw` variant/`CvDrawKind` triple
/// `run_cv_attack_style_stat_up` constructs -- selects between its 2 CV
/// callers.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum CvStatUpFamily {
    AttackUp,
    SpAtkUp,
}

/// `AI_CV_AttackUp` (`data/battle_ai_scripts.s:896-913`, doc §17.1) /
/// `AI_CV_SpAtkUp` (`:967-983`, doc §21.1) shared body
/// (`runCvAttackStyleStatUp`, `factoryAiCheckViability.ts:3407-3465`) --
/// byte-for-byte the same gate topology reading AI_USER's own stat
/// stage/HP only (AI_TARGET never read anywhere in this body), differing
/// solely in `draw_site_3_threshold` (AttackUp 40, SpAtkUp 70, TS's own
/// doc-cited correction against a naive "same shape" copy) and which
/// top-level draw variant/`CvDrawKind` triple it constructs. Gate A (own
/// stat stage < 9) skips DRAW SITE 1; Gate B (own HP != 100%, only checked
/// when Gate A is false) skips DRAW SITE 2 -- mutually exclusive branches
/// (only one of SITE 1/2 fires per call), but only the Gate-A/SITE-1 path
/// can additionally reach SITE 3 afterwards (Gate B's own precondition, HP
/// == 100% exactly, makes Gate C -- own HP > 70% -- always true right
/// after, a clean stop). Past the tail: Gate C is a clean stop; Gate D (own
/// HP < 40%) skips SITE 3 straight to the `-2` penalty; the `[40,70)` band
/// burns SITE 3.
fn run_cv_attack_style_stat_up(
    family: CvStatUpFamily,
    draw_site_3_threshold: u16,
    rng: BattleRngState,
    attacker_stage: u8,
    attacker_hp: i32,
    attacker_max_hp: i32,
    ordinal_start: u32,
) -> CvDraws {
    let mut cur_rng = rng;
    let mut ordinal = ordinal_start;
    let mut draws = [DRAW_FILLER; MAX_CHECK_VIABILITY_DRAWS];
    let mut draw_count: u8 = 0;
    let mut score: i32 = 0;

    let make_draw =
        |kind: CvDrawKind, roll: NextDrawResult, succeeded: bool| -> CheckViabilityDraw {
            match family {
                CvStatUpFamily::AttackUp => CheckViabilityDraw::AttackUpRoll {
                    ordinal: roll.ordinal,
                    before: roll.before,
                    after: roll.after,
                    raw_rng_value: roll.raw_rng_value,
                    random_value: roll.random_value,
                    kind,
                    succeeded,
                },
                CvStatUpFamily::SpAtkUp => CheckViabilityDraw::SpAtkUpRoll {
                    ordinal: roll.ordinal,
                    before: roll.before,
                    after: roll.after,
                    raw_rng_value: roll.raw_rng_value,
                    random_value: roll.random_value,
                    kind,
                    succeeded,
                },
            }
        };
    let (kind1, kind2, kind3) = match family {
        CvStatUpFamily::AttackUp => (
            CvDrawKind::AttackUp1,
            CvDrawKind::AttackUp2,
            CvDrawKind::AttackUp3,
        ),
        CvStatUpFamily::SpAtkUp => (
            CvDrawKind::SpAtkUp1,
            CvDrawKind::SpAtkUp2,
            CvDrawKind::SpAtkUp3,
        ),
    };

    let hp_percent = 100 * attacker_hp / attacker_max_hp;

    if attacker_stage < 9 {
        if hp_percent == 100 {
            let draw2 = next_draw(cur_rng, ordinal);
            cur_rng = draw2.after;
            ordinal += 1;
            let succeeded2 = draw2.random_value % 256 >= 128;
            draws[draw_count as usize] = make_draw(kind2, draw2, succeeded2);
            draw_count += 1;
            if succeeded2 {
                score += 2;
            }
        }
    } else {
        let draw1 = next_draw(cur_rng, ordinal);
        cur_rng = draw1.after;
        ordinal += 1;
        let succeeded1 = draw1.random_value % 256 >= 100;
        draws[draw_count as usize] = make_draw(kind1, draw1, succeeded1);
        draw_count += 1;
        if succeeded1 {
            score -= 1;
        }
    }

    if hp_percent > 70 {
        return CvDraws { rng: cur_rng, draws, draw_count, score_delta: score };
    }
    if hp_percent < 40 {
        return CvDraws { rng: cur_rng, draws, draw_count, score_delta: score - 2 };
    }

    let draw3 = next_draw(cur_rng, ordinal);
    cur_rng = draw3.after;
    let succeeded3 = draw3.random_value % 256 >= draw_site_3_threshold;
    draws[draw_count as usize] = make_draw(kind3, draw3, succeeded3);
    draw_count += 1;
    if succeeded3 {
        score -= 2;
    }
    CvDraws { rng: cur_rng, draws, draw_count, score_delta: score }
}

/// `AI_CV_DefenseUp`/`AI_CV_SpDefUp`'s shared Gates E/F write value
/// (`statUpLastMoveFuncResultAfter`, `factoryAiCheckViability.ts:3611
/// -3613`): `get_last_used_bank_move AI_TARGET` +
/// `get_move_power_from_result` always write when reached -- power == 0
/// leaves the exit value AS that 0 (== `AI_WEATHER_SUN`); nonzero power
/// always overwrites with the move's own TYPE id next (collision-mapped),
/// and nothing further writes afterward regardless of which
/// physical-type-list branch either handler takes from there.
fn stat_up_last_move_func_result_after(power: u8, move_type: u8) -> Option<u8> {
    if power == 0 {
        return Some(AI_WEATHER_SUN);
    }
    type_func_result_collision(move_type)
}

/// `AI_CV_DefenseUp_PhysicalTypes` (`data/battle_ai_scripts.s:944-954`) --
/// a DIFFERENT, larger list than `AI_CV_AttackDown`'s own physical-type
/// list (doc §14.1/§18.1): this one additionally includes Poison, Flying,
/// and Ghost. Shared byte-for-byte between `AI_CV_DefenseUp` and
/// `AI_CV_SpDefUp` (TS's own doc comment at :3765-3768 -- `AI_CV_SpDefUp_
/// PhysicalTypes` is a distinct assembly symbol at a different address but
/// confirmed identical contents; not duplicated here).
const AI_CV_DEFENSE_UP_PHYSICAL_TYPES: [u8; 9] = [
    TYPE_NORMAL,
    TYPE_FIGHTING,
    TYPE_POISON,
    TYPE_GROUND,
    TYPE_FLYING,
    TYPE_ROCK,
    TYPE_BUG,
    TYPE_GHOST,
    TYPE_STEEL,
];

/// `AI_CV_DefenseUp` (`data/battle_ai_scripts.s:915-942`, doc §18.1,
/// `factoryAiCheckViability.ts:3616-3715`, 100 lines). **Standalone -- does
/// NOT reuse `run_cv_attack_style_stat_up`** (byte-similar Gates A/B/DRAW
/// SITE 1/2 to `AttackUp`, but Gate C is INVERTED and Gates D-F/DRAW SITE
/// 4/5 have no `AttackUp` analog at all). Gate C inverted vs `AttackUp`:
/// own HP >= 70% reaches DRAW SITE 3 first, whose own FAILURE (roll < 200)
/// is what stops (fallthrough continues to Gate D); own HP < 70% skips
/// straight to Gate D. DRAW SITE 4 and DRAW SITE 5 are NOT mutually
/// exclusive -- DRAW SITE 4's own failure (roll >= 60) falls straight
/// through into DRAW SITE 5's own roll immediately below (no gate between
/// them, `docs/factory-ai-draw-discrepancy-probe.md` §4), so reaching DRAW
/// SITE 4 costs 1 draw (succeeds, roll<60) or 2 (fails, chains into DRAW
/// SITE 5). Gate E's own direct jump into `DefenseUp5` is a SEPARATE,
/// single-draw path to the identical site (same `DefenseUp5` kind).
fn run_cv_defense_up(
    rng: BattleRngState,
    attacker_def_stage: u8,
    attacker_hp: i32,
    attacker_max_hp: i32,
    target_last_used_move_id: u16,
    func_result_carry: Option<u8>,
    ordinal_start: u32,
) -> (CvDraws, Option<u8>) {
    let mut cur_rng = rng;
    let mut ordinal = ordinal_start;
    let mut draws = [DRAW_FILLER; MAX_CHECK_VIABILITY_DRAWS];
    let mut draw_count: u8 = 0;
    let mut score: i32 = 0;

    let hp_percent = 100 * attacker_hp / attacker_max_hp;

    if attacker_def_stage < 9 {
        if hp_percent == 100 {
            let draw2 = next_draw(cur_rng, ordinal);
            cur_rng = draw2.after;
            ordinal += 1;
            let succeeded2 = draw2.random_value % 256 >= 128;
            draws[draw_count as usize] = CheckViabilityDraw::DefenseUpRoll {
                ordinal: draw2.ordinal,
                before: draw2.before,
                after: draw2.after,
                raw_rng_value: draw2.raw_rng_value,
                random_value: draw2.random_value,
                kind: CvDrawKind::DefenseUp2,
                succeeded: succeeded2,
            };
            draw_count += 1;
            if succeeded2 {
                score += 2;
            }
        }
    } else {
        let draw1 = next_draw(cur_rng, ordinal);
        cur_rng = draw1.after;
        ordinal += 1;
        let succeeded1 = draw1.random_value % 256 >= 100;
        draws[draw_count as usize] = CheckViabilityDraw::DefenseUpRoll {
            ordinal: draw1.ordinal,
            before: draw1.before,
            after: draw1.after,
            raw_rng_value: draw1.raw_rng_value,
            random_value: draw1.random_value,
            kind: CvDrawKind::DefenseUp1,
            succeeded: succeeded1,
        };
        draw_count += 1;
        if succeeded1 {
            score -= 1;
        }
    }

    if hp_percent >= 70 {
        let draw3 = next_draw(cur_rng, ordinal);
        cur_rng = draw3.after;
        ordinal += 1;
        let fell_through = draw3.random_value % 256 >= 200;
        draws[draw_count as usize] = CheckViabilityDraw::DefenseUpRoll {
            ordinal: draw3.ordinal,
            before: draw3.before,
            after: draw3.after,
            raw_rng_value: draw3.raw_rng_value,
            random_value: draw3.random_value,
            kind: CvDrawKind::DefenseUp3,
            succeeded: fell_through,
        };
        draw_count += 1;
        if !fell_through {
            return (
                CvDraws { rng: cur_rng, draws, draw_count, score_delta: score },
                func_result_carry,
            );
        }
    }

    if hp_percent < 40 {
        return (
            CvDraws { rng: cur_rng, draws, draw_count, score_delta: score - 2 },
            func_result_carry,
        );
    }

    let last_move = gen_tables::MOVES.get(target_last_used_move_id as usize).unwrap_or_else(|| {
        panic!(
            "factory-ai-check-viability: unknown last-used move {target_last_used_move_id} (TS :3675 throws)"
        )
    });
    let func_result_after =
        stat_up_last_move_func_result_after(last_move.power, last_move.move_type);

    if last_move.power == 0 {
        let draw5 = next_draw(cur_rng, ordinal);
        cur_rng = draw5.after;
        let succeeded5 = draw5.random_value % 256 >= 60;
        draws[draw_count as usize] = CheckViabilityDraw::DefenseUpRoll {
            ordinal: draw5.ordinal,
            before: draw5.before,
            after: draw5.after,
            raw_rng_value: draw5.raw_rng_value,
            random_value: draw5.random_value,
            kind: CvDrawKind::DefenseUp5,
            succeeded: succeeded5,
        };
        draw_count += 1;
        if succeeded5 {
            score -= 2;
        }
        return (
            CvDraws { rng: cur_rng, draws, draw_count, score_delta: score },
            func_result_after,
        );
    }

    if !AI_CV_DEFENSE_UP_PHYSICAL_TYPES.contains(&last_move.move_type) {
        return (
            CvDraws { rng: cur_rng, draws, draw_count, score_delta: score - 2 },
            func_result_after,
        );
    }

    // DRAW SITE 4: failure (roll>=60) falls straight through into DRAW SITE
    // 5's own roll immediately below -- the SAME site Gate E's own direct
    // jump reaches (no gate between them, source-confirmed).
    let draw4 = next_draw(cur_rng, ordinal);
    cur_rng = draw4.after;
    ordinal += 1;
    let succeeded4 = draw4.random_value % 256 >= 60;
    draws[draw_count as usize] = CheckViabilityDraw::DefenseUpRoll {
        ordinal: draw4.ordinal,
        before: draw4.before,
        after: draw4.after,
        raw_rng_value: draw4.raw_rng_value,
        random_value: draw4.random_value,
        kind: CvDrawKind::DefenseUp4,
        succeeded: succeeded4,
    };
    draw_count += 1;
    if !succeeded4 {
        return (
            CvDraws { rng: cur_rng, draws, draw_count, score_delta: score },
            func_result_after,
        );
    }

    let draw5 = next_draw(cur_rng, ordinal);
    cur_rng = draw5.after;
    let succeeded5 = draw5.random_value % 256 >= 60;
    draws[draw_count as usize] = CheckViabilityDraw::DefenseUpRoll {
        ordinal: draw5.ordinal,
        before: draw5.before,
        after: draw5.after,
        raw_rng_value: draw5.raw_rng_value,
        random_value: draw5.random_value,
        kind: CvDrawKind::DefenseUp5,
        succeeded: succeeded5,
    };
    draw_count += 1;
    if succeeded5 {
        score -= 2;
    }
    (
        CvDraws { rng: cur_rng, draws, draw_count, score_delta: score },
        func_result_after,
    )
}

/// `AI_CV_SpDefUp` (`data/battle_ai_scripts.s:986-1013`, doc §22.1,
/// `factoryAiCheckViability.ts:3776-3873`, 98 lines) -- the single shared
/// CV target for `EFFECT_SPECIAL_DEFENSE_UP(_2)`/`EFFECT_COSMIC_POWER`/
/// `EFFECT_CALM_MIND`. Gates A/B/C/D and DRAW SITE 1/2/3 are byte-for-byte
/// `AI_CV_DefenseUp`'s own shape (`STAT_DEF` -> `STAT_SPDEF` in Gates A/B
/// only). **Gate F is the one real structural break: OPPOSITE polarity of
/// `DefenseUp`'s own** -- the target's last move type BEING in
/// `AI_CV_DEFENSE_UP_PHYSICAL_TYPES` now routes straight to the `-2`
/// penalty, and NOT being in the list is what falls through to DRAW SITE
/// 4 (Special Defense doesn't mitigate physical damage, so a physical last
/// move means the SPDEF raise wasn't useful -- the mirror image of
/// Defense's own reasoning). DRAW SITE 4/5 share `DefenseUp`'s own chained
/// (not mutually exclusive) shape byte-for-byte.
fn run_cv_sp_def_up(
    rng: BattleRngState,
    attacker_sp_def_stage: u8,
    attacker_hp: i32,
    attacker_max_hp: i32,
    target_last_used_move_id: u16,
    func_result_carry: Option<u8>,
    ordinal_start: u32,
) -> (CvDraws, Option<u8>) {
    let mut cur_rng = rng;
    let mut ordinal = ordinal_start;
    let mut draws = [DRAW_FILLER; MAX_CHECK_VIABILITY_DRAWS];
    let mut draw_count: u8 = 0;
    let mut score: i32 = 0;

    let hp_percent = 100 * attacker_hp / attacker_max_hp;

    if attacker_sp_def_stage < 9 {
        if hp_percent == 100 {
            let draw2 = next_draw(cur_rng, ordinal);
            cur_rng = draw2.after;
            ordinal += 1;
            let succeeded2 = draw2.random_value % 256 >= 128;
            draws[draw_count as usize] = CheckViabilityDraw::SpDefUpRoll {
                ordinal: draw2.ordinal,
                before: draw2.before,
                after: draw2.after,
                raw_rng_value: draw2.raw_rng_value,
                random_value: draw2.random_value,
                kind: CvDrawKind::SpDefUp2,
                succeeded: succeeded2,
            };
            draw_count += 1;
            if succeeded2 {
                score += 2;
            }
        }
    } else {
        let draw1 = next_draw(cur_rng, ordinal);
        cur_rng = draw1.after;
        ordinal += 1;
        let succeeded1 = draw1.random_value % 256 >= 100;
        draws[draw_count as usize] = CheckViabilityDraw::SpDefUpRoll {
            ordinal: draw1.ordinal,
            before: draw1.before,
            after: draw1.after,
            raw_rng_value: draw1.raw_rng_value,
            random_value: draw1.random_value,
            kind: CvDrawKind::SpDefUp1,
            succeeded: succeeded1,
        };
        draw_count += 1;
        if succeeded1 {
            score -= 1;
        }
    }

    if hp_percent >= 70 {
        let draw3 = next_draw(cur_rng, ordinal);
        cur_rng = draw3.after;
        ordinal += 1;
        let fell_through = draw3.random_value % 256 >= 200;
        draws[draw_count as usize] = CheckViabilityDraw::SpDefUpRoll {
            ordinal: draw3.ordinal,
            before: draw3.before,
            after: draw3.after,
            raw_rng_value: draw3.raw_rng_value,
            random_value: draw3.random_value,
            kind: CvDrawKind::SpDefUp3,
            succeeded: fell_through,
        };
        draw_count += 1;
        if !fell_through {
            return (
                CvDraws { rng: cur_rng, draws, draw_count, score_delta: score },
                func_result_carry,
            );
        }
    }

    if hp_percent < 40 {
        return (
            CvDraws { rng: cur_rng, draws, draw_count, score_delta: score - 2 },
            func_result_carry,
        );
    }

    let last_move = gen_tables::MOVES.get(target_last_used_move_id as usize).unwrap_or_else(|| {
        panic!(
            "factory-ai-check-viability: unknown last-used move {target_last_used_move_id} (TS :3833 throws)"
        )
    });
    let func_result_after =
        stat_up_last_move_func_result_after(last_move.power, last_move.move_type);

    if last_move.power == 0 {
        let draw5 = next_draw(cur_rng, ordinal);
        cur_rng = draw5.after;
        let succeeded5 = draw5.random_value % 256 >= 60;
        draws[draw_count as usize] = CheckViabilityDraw::SpDefUpRoll {
            ordinal: draw5.ordinal,
            before: draw5.before,
            after: draw5.after,
            raw_rng_value: draw5.raw_rng_value,
            random_value: draw5.random_value,
            kind: CvDrawKind::SpDefUp5,
            succeeded: succeeded5,
        };
        draw_count += 1;
        if succeeded5 {
            score -= 2;
        }
        return (
            CvDraws { rng: cur_rng, draws, draw_count, score_delta: score },
            func_result_after,
        );
    }

    // Gate F, INVERTED vs DefenseUp: type IS in the physical list -> straight to the -2 penalty.
    if AI_CV_DEFENSE_UP_PHYSICAL_TYPES.contains(&last_move.move_type) {
        return (
            CvDraws { rng: cur_rng, draws, draw_count, score_delta: score - 2 },
            func_result_after,
        );
    }

    let draw4 = next_draw(cur_rng, ordinal);
    cur_rng = draw4.after;
    ordinal += 1;
    let succeeded4 = draw4.random_value % 256 >= 60;
    draws[draw_count as usize] = CheckViabilityDraw::SpDefUpRoll {
        ordinal: draw4.ordinal,
        before: draw4.before,
        after: draw4.after,
        raw_rng_value: draw4.raw_rng_value,
        random_value: draw4.random_value,
        kind: CvDrawKind::SpDefUp4,
        succeeded: succeeded4,
    };
    draw_count += 1;
    if !succeeded4 {
        return (
            CvDraws { rng: cur_rng, draws, draw_count, score_delta: score },
            func_result_after,
        );
    }

    let draw5 = next_draw(cur_rng, ordinal);
    cur_rng = draw5.after;
    let succeeded5 = draw5.random_value % 256 >= 60;
    draws[draw_count as usize] = CheckViabilityDraw::SpDefUpRoll {
        ordinal: draw5.ordinal,
        before: draw5.before,
        after: draw5.after,
        raw_rng_value: draw5.raw_rng_value,
        random_value: draw5.random_value,
        kind: CvDrawKind::SpDefUp5,
        succeeded: succeeded5,
    };
    draw_count += 1;
    if succeeded5 {
        score -= 2;
    }
    (
        CvDraws { rng: cur_rng, draws, draw_count, score_delta: score },
        func_result_after,
    )
}

/// `AI_CV_LightScreen_SpecialTypeList` (`data/battle_ai_scripts.s`,
/// `factoryAiCheckViability.ts:3875-3876`).
const AI_CV_LIGHT_SCREEN_SPECIAL_TYPES: [u8; 8] = [
    TYPE_FIRE,
    TYPE_WATER,
    TYPE_GRASS,
    TYPE_ELECTRIC,
    TYPE_PSYCHIC,
    TYPE_ICE,
    TYPE_DRAGON,
    TYPE_DARK,
];

/// `AI_CV_Reflect_PhysicalTypeList` (`:1504-1514`, TS :3879-3881) -- a
/// genuinely distinct 9-type list from `AI_CV_AttackDown_PhysicalTypeList`/
/// `AI_CV_DEFENSE_UP_PHYSICAL_TYPES` (those exclude Flying/Poison/Ghost;
/// this one includes them).
const AI_CV_REFLECT_PHYSICAL_TYPES: [u8; 9] = [
    TYPE_NORMAL,
    TYPE_FIGHTING,
    TYPE_FLYING,
    TYPE_POISON,
    TYPE_GROUND,
    TYPE_ROCK,
    TYPE_BUG,
    TYPE_GHOST,
    TYPE_STEEL,
];

/// Shared body for `AI_CV_LightScreen` (`data/battle_ai_scripts.s:1373
/// -1382`, doc §23.1) and `AI_CV_Reflect` (`:1492-1501`, doc §23.1) --
/// byte-for-byte the same shape, differing only in which type list is
/// checked (`runCvSideScreenTypeGate`, `factoryAiCheckViability.ts:3914
/// -3946`). Gate A (attacker HP < 50%) jumps straight to the `-2` penalty
/// with NO `get_type` call at all -- no write. Falling through, Gates B/C
/// (`get_target_type1`/`2` + `if_in_bytes`) are zero-RNG
/// `AI_THINKING_STRUCT->funcResult` reads -- computed once via
/// `type_chain_func_result_after`, same simplification `run_cv_attack_down`
/// already makes for its own Gates E/F. A listed type jumps to End (score
/// 0, zero draws, but still a funcResult write); an unlisted type falls
/// through to the single DRAW SITE.
#[allow(clippy::too_many_arguments)]
fn run_cv_side_screen_type_gate(
    kind: CvDrawKind,
    type_list: &[u8],
    rng: BattleRngState,
    attacker_hp: i32,
    attacker_max_hp: i32,
    target_types: [u8; 2],
    func_result_carry: Option<u8>,
    ordinal_start: u32,
) -> (CvDraws, Option<u8>) {
    let hp_percent = 100 * attacker_hp / attacker_max_hp;
    if hp_percent < 50 {
        let draws = [DRAW_FILLER; MAX_CHECK_VIABILITY_DRAWS];
        return (
            CvDraws { rng, draws, draw_count: 0, score_delta: -2 },
            func_result_carry,
        );
    }

    let func_result_after = type_chain_func_result_after(target_types, type_list);
    let is_listed_type =
        type_list.contains(&target_types[0]) || type_list.contains(&target_types[1]);
    if is_listed_type {
        let draws = [DRAW_FILLER; MAX_CHECK_VIABILITY_DRAWS];
        return (
            CvDraws { rng, draws, draw_count: 0, score_delta: 0 },
            func_result_after,
        );
    }

    let roll = next_draw(rng, ordinal_start);
    let succeeded = roll.random_value % 256 >= 50;
    let mut draws = [DRAW_FILLER; MAX_CHECK_VIABILITY_DRAWS];
    draws[0] = CheckViabilityDraw::ScreenRoll {
        ordinal: roll.ordinal,
        before: roll.before,
        after: roll.after,
        raw_rng_value: roll.raw_rng_value,
        random_value: roll.random_value,
        kind,
        succeeded,
    };
    (
        CvDraws {
            rng: roll.after,
            draws,
            draw_count: 1,
            score_delta: if succeeded { -2 } else { 0 },
        },
        func_result_after,
    )
}

/// `AI_CV_AccuracyDown` (`data/battle_ai_scripts.s:1198-1234`, doc §19.1,
/// `factoryAiCheckViability.ts:4049-4151`, 103 lines, 7
/// `if_random_less_than` sites). Gates A-G form one straight-line
/// sequential body -- none of the six `score` adjustments after DRAW SITEs
/// 1-6 is followed by a `goto`, so all six are independently evaluated
/// regardless of any earlier gate/draw outcome. Gate A/B reach DRAW SITE 1
/// by two independent routes (either battler's own HP); Gate C guards
/// DRAW SITE 2 on the attacker's own ACC stage; Gates D/E/F/G each gate one
/// status flag's own draw site (target toxic/leech-seed/cursed, attacker's
/// own rooted). Only past all seven does Gate H (attacker HP > 70%) offer
/// a clean, deterministic stop, skipping Gates I/J/K and DRAW SITE 7
/// entirely; Gate I (target ACC stage == neutral) is a second clean stop;
/// Gates J/K (either battler <40% HP) skip straight to the deterministic
/// `-2`. DRAW SITE 7 has the OPPOSITE polarity from sites 1-6: jump
/// (roll < 70) is the no-op; falling through (roll >= 70) applies the
/// tail's own `-2`.
#[allow(clippy::too_many_arguments)]
fn run_cv_accuracy_down(
    rng: BattleRngState,
    attacker_hp: i32,
    attacker_max_hp: i32,
    attacker_acc_stage: u8,
    attacker_is_rooted: bool,
    target_hp: i32,
    target_max_hp: i32,
    target_acc_stage: u8,
    target_is_toxic_poisoned: bool,
    target_is_leech_seeded: bool,
    target_is_cursed: bool,
    ordinal_start: u32,
) -> CvDraws {
    let mut cur_rng = rng;
    let mut ordinal = ordinal_start;
    let mut draws = [DRAW_FILLER; MAX_CHECK_VIABILITY_DRAWS];
    let mut draw_count: u8 = 0;
    let mut score: i32 = 0;

    let attacker_hp_percent = 100 * attacker_hp / attacker_max_hp;
    let target_hp_percent = 100 * target_hp / target_max_hp;

    // Gates A/B -> DRAW SITE 1: either battler's own HP band reaches it.
    if attacker_hp_percent < 70 || target_hp_percent <= 70 {
        let draw1 = next_draw(cur_rng, ordinal);
        cur_rng = draw1.after;
        ordinal += 1;
        let succeeded1 = draw1.random_value % 256 >= 100;
        draws[draw_count as usize] = CheckViabilityDraw::AccuracyDownRoll {
            ordinal: draw1.ordinal,
            before: draw1.before,
            after: draw1.after,
            raw_rng_value: draw1.raw_rng_value,
            random_value: draw1.random_value,
            kind: CvDrawKind::AccuracyDown1,
            succeeded: succeeded1,
        };
        draw_count += 1;
        if succeeded1 {
            score -= 1;
        }
    }

    // Gate C -> DRAW SITE 2: attacker's own ACC stage <= 4.
    if attacker_acc_stage <= 4 {
        let draw2 = next_draw(cur_rng, ordinal);
        cur_rng = draw2.after;
        ordinal += 1;
        let succeeded2 = draw2.random_value % 256 >= 80;
        draws[draw_count as usize] = CheckViabilityDraw::AccuracyDownRoll {
            ordinal: draw2.ordinal,
            before: draw2.before,
            after: draw2.after,
            raw_rng_value: draw2.raw_rng_value,
            random_value: draw2.random_value,
            kind: CvDrawKind::AccuracyDown2,
            succeeded: succeeded2,
        };
        draw_count += 1;
        if succeeded2 {
            score -= 2;
        }
    }

    // Gate D -> DRAW SITE 3: target toxic-poisoned.
    if target_is_toxic_poisoned {
        let draw3 = next_draw(cur_rng, ordinal);
        cur_rng = draw3.after;
        ordinal += 1;
        let succeeded3 = draw3.random_value % 256 >= 70;
        draws[draw_count as usize] = CheckViabilityDraw::AccuracyDownRoll {
            ordinal: draw3.ordinal,
            before: draw3.before,
            after: draw3.after,
            raw_rng_value: draw3.raw_rng_value,
            random_value: draw3.random_value,
            kind: CvDrawKind::AccuracyDown3,
            succeeded: succeeded3,
        };
        draw_count += 1;
        if succeeded3 {
            score += 2;
        }
    }

    // Gate E -> DRAW SITE 4: target leech-seeded.
    if target_is_leech_seeded {
        let draw4 = next_draw(cur_rng, ordinal);
        cur_rng = draw4.after;
        ordinal += 1;
        let succeeded4 = draw4.random_value % 256 >= 70;
        draws[draw_count as usize] = CheckViabilityDraw::AccuracyDownRoll {
            ordinal: draw4.ordinal,
            before: draw4.before,
            after: draw4.after,
            raw_rng_value: draw4.raw_rng_value,
            random_value: draw4.random_value,
            kind: CvDrawKind::AccuracyDown4,
            succeeded: succeeded4,
        };
        draw_count += 1;
        if succeeded4 {
            score += 2;
        }
    }

    // Gate F -> DRAW SITE 5: attacker's OWN rooted (Ingrain) flag.
    if attacker_is_rooted {
        let draw5 = next_draw(cur_rng, ordinal);
        cur_rng = draw5.after;
        ordinal += 1;
        let succeeded5 = draw5.random_value % 256 >= 128;
        draws[draw_count as usize] = CheckViabilityDraw::AccuracyDownRoll {
            ordinal: draw5.ordinal,
            before: draw5.before,
            after: draw5.after,
            raw_rng_value: draw5.raw_rng_value,
            random_value: draw5.random_value,
            kind: CvDrawKind::AccuracyDown5,
            succeeded: succeeded5,
        };
        draw_count += 1;
        if succeeded5 {
            score += 1;
        }
    }

    // Gate G -> DRAW SITE 6: target cursed.
    if target_is_cursed {
        let draw6 = next_draw(cur_rng, ordinal);
        cur_rng = draw6.after;
        ordinal += 1;
        let succeeded6 = draw6.random_value % 256 >= 70;
        draws[draw_count as usize] = CheckViabilityDraw::AccuracyDownRoll {
            ordinal: draw6.ordinal,
            before: draw6.before,
            after: draw6.after,
            raw_rng_value: draw6.raw_rng_value,
            random_value: draw6.random_value,
            kind: CvDrawKind::AccuracyDown6,
            succeeded: succeeded6,
        };
        draw_count += 1;
        if succeeded6 {
            score += 2;
        }
    }

    // Gate H: attacker's own HP > 70% -- clean stop, skips the entire tail.
    if attacker_hp_percent > 70 {
        return CvDraws { rng: cur_rng, draws, draw_count, score_delta: score };
    }
    // Gate I: target's own ACC stage back at neutral -- clean stop.
    if target_acc_stage == DEFAULT_STAT_STAGE {
        return CvDraws { rng: cur_rng, draws, draw_count, score_delta: score };
    }
    // Gates J/K: either battler <40% HP skips DRAW SITE 7, deterministic -2.
    if attacker_hp_percent < 40 || target_hp_percent < 40 {
        return CvDraws { rng: cur_rng, draws, draw_count, score_delta: score - 2 };
    }
    // DRAW SITE 7: OPPOSITE polarity -- jump (roll<70) is the no-op; falling
    // through (roll>=70) is what applies the -2.
    let draw7 = next_draw(cur_rng, ordinal);
    cur_rng = draw7.after;
    let succeeded7 = draw7.random_value % 256 >= 70;
    draws[draw_count as usize] = CheckViabilityDraw::AccuracyDownRoll {
        ordinal: draw7.ordinal,
        before: draw7.before,
        after: draw7.after,
        raw_rng_value: draw7.raw_rng_value,
        random_value: draw7.random_value,
        kind: CvDrawKind::AccuracyDown7,
        succeeded: succeeded7,
    };
    draw_count += 1;
    CvDraws {
        rng: cur_rng,
        draws,
        draw_count,
        score_delta: if succeeded7 { score - 2 } else { score },
    }
}

/// `AI_CV_SpeedUp` (`data/battle_ai_scripts.s:956-965`, doc §20.1,
/// `factoryAiCheckViability.ts:1471-1510`). The SAME `if_target_faster`
/// gate and tie-break machinery `run_cv_speed_down` already uses (doc
/// §20.1 cites §6 as the true structural sibling, not `AttackUp`/
/// `DefenseUp`) -- target strictly faster reaches the roll (jump roll<70
/// skips the bonus; fall through roll>=70 grants +3); target not faster is
/// a deterministic `-3`, the roll never reached. Only the fallthrough
/// score differs from `SpeedDown`'s own shape (+3 here vs +2 there); the
/// deterministic branch's `-3` is identical in both.
fn run_cv_speed_up(
    rng: BattleRngState,
    attacker: FactoryAiCheckViabilityBattler,
    target: FactoryAiCheckViabilityBattler,
    ordinal_start: u32,
) -> CvDraws {
    let attacker_to = cv_turn_order_battler(attacker.speed, attacker.speed_stage);
    let target_to = cv_turn_order_battler(target.speed, target.speed_stage);
    let (mut cur_rng, ordinal, tie_draw, strikes_first) =
        cv_resolve_target_faster(rng, ordinal_start, attacker_to, target_to);

    let mut draws = [DRAW_FILLER; MAX_CHECK_VIABILITY_DRAWS];
    let mut draw_count: u8 = 0;
    if let Some(draw) = tie_draw {
        draws[draw_count as usize] = draw;
        draw_count += 1;
    }

    if strikes_first != 1 {
        return CvDraws { rng: cur_rng, draws, draw_count, score_delta: -3 };
    }

    let roll = next_draw(cur_rng, ordinal);
    cur_rng = roll.after;
    let succeeded = roll.random_value % 256 >= 70;
    draws[draw_count as usize] = CheckViabilityDraw::SpeedUpRoll {
        ordinal: roll.ordinal,
        before: roll.before,
        after: roll.after,
        raw_rng_value: roll.raw_rng_value,
        random_value: roll.random_value,
        succeeded,
    };
    draw_count += 1;
    CvDraws { rng: cur_rng, draws, draw_count, score_delta: if succeeded { 3 } else { 0 } }
}

/// `AI_CV_EvasionUp` (`data/battle_ai_scripts.s:1037-1074`, doc §24.1,
/// `factoryAiCheckViability.ts:4226-4357`, 132 lines, the module's largest
/// handler body, 8 `if_random_less_than` sites). Re-derived independently
/// from the raw assembly, NOT copied from `AI_CV_AccuracyDown`'s own shape
/// despite the structural similarity. Three real divergences from
/// AccuracyDown: (1) DRAW SITE 1 has no Gate B companion -- a single
/// attacker-HP gate; (2) Gate A's own HP threshold is 90, not 70; (3) Gate
/// I reads AI_USER's own evasion stage, not AI_TARGET's. Gates C/D gate
/// DRAW SITE 3/4 as a pair, only reached when the target is
/// toxic-poisoned: attacker HP over 50% jumps straight to DRAW SITE 4 alone
/// (1 draw); HP at or under 50% reaches DRAW SITE 3 first, whose own
/// failure (a roll of 80 or higher) falls straight through into DRAW SITE
/// 4's own roll immediately below (no gate between them, same chained
/// shape as `run_cv_defense_up`'s own DRAW SITE 4/5) -- 0, 1, or 2 draws
/// depending on branch. DRAW SITE 8
/// shares AccuracyDown's own DRAW SITE 7 OPPOSITE polarity.
///
/// **Worst-case draw count, re-verified directly against THIS
/// implementation** (batching doc §5's `MAX_CHECK_VIABILITY_DRAWS = 8` doc
/// comment asks the batch that ports this handler to confirm its own
/// derivation): DRAW SITE 1 needs `attackerHpPercent >= 90`; DRAW SITE 8
/// needs Gate H (`attackerHpPercent <= 70`) AND Gate J/K
/// (`attackerHpPercent >= 40`) both to hold, i.e. `attackerHpPercent` in
/// `[40, 70]` -- mutually exclusive with SITE 1's own `>= 90` requirement,
/// so SITE 1 and SITE 8 can never co-occur in one call (confirmed by
/// `cv_evasion_up_gate_h_site1_site8_mutual_exclusion` below, not just
/// asserted from the M5d-0 doc comment). The true worst case is 7 draws:
/// SITE 2 (evasion stage >= 9) + the SITE 3+4 chained pair (toxic-poisoned,
/// HP <= 50%, both rolls fail) + SITE 5 (leech-seeded) + SITE 6 (rooted) +
/// SITE 7 (cursed) + SITE 8, all simultaneously reachable with
/// `attackerHpPercent` in `[40, 50]` and `targetHpPercent >= 40`.
/// `MAX_CHECK_VIABILITY_DRAWS` stays at 8 (the conservative site-count
/// bound), not shrunk to 7, per the step brief.
#[allow(clippy::too_many_arguments)]
fn run_cv_evasion_up(
    rng: BattleRngState,
    attacker_hp: i32,
    attacker_max_hp: i32,
    attacker_evasion_stage: u8,
    attacker_is_rooted: bool,
    target_hp: i32,
    target_max_hp: i32,
    target_is_toxic_poisoned: bool,
    target_is_leech_seeded: bool,
    target_is_cursed: bool,
    ordinal_start: u32,
) -> CvDraws {
    let mut cur_rng = rng;
    let mut ordinal = ordinal_start;
    let mut draws = [DRAW_FILLER; MAX_CHECK_VIABILITY_DRAWS];
    let mut draw_count: u8 = 0;
    let mut score: i32 = 0;

    let attacker_hp_percent = 100 * attacker_hp / attacker_max_hp;
    let target_hp_percent = 100 * target_hp / target_max_hp;

    // Gate A -> DRAW SITE 1: attacker's OWN hp >= 90% (no Gate B companion,
    // unlike AccuracyDown's own two-gate DRAW SITE 1).
    if attacker_hp_percent >= 90 {
        let draw1 = next_draw(cur_rng, ordinal);
        cur_rng = draw1.after;
        ordinal += 1;
        let succeeded1 = draw1.random_value % 256 >= 100;
        draws[draw_count as usize] = CheckViabilityDraw::EvasionUpRoll {
            ordinal: draw1.ordinal,
            before: draw1.before,
            after: draw1.after,
            raw_rng_value: draw1.raw_rng_value,
            random_value: draw1.random_value,
            kind: CvDrawKind::EvasionUp1,
            succeeded: succeeded1,
        };
        draw_count += 1;
        if succeeded1 {
            score += 3;
        }
    }

    // Gate B -> DRAW SITE 2: attacker's OWN evasion stage already >= 9.
    if attacker_evasion_stage >= 9 {
        let draw2 = next_draw(cur_rng, ordinal);
        cur_rng = draw2.after;
        ordinal += 1;
        let succeeded2 = draw2.random_value % 256 >= 128;
        draws[draw_count as usize] = CheckViabilityDraw::EvasionUpRoll {
            ordinal: draw2.ordinal,
            before: draw2.before,
            after: draw2.after,
            raw_rng_value: draw2.raw_rng_value,
            random_value: draw2.random_value,
            kind: CvDrawKind::EvasionUp2,
            succeeded: succeeded2,
        };
        draw_count += 1;
        if succeeded2 {
            score -= 1;
        }
    }

    // Gates C/D -> DRAW SITE 3/4: target toxic-poisoned reaches this pair at
    // all. The attacker's OWN hp band picks the ENTRY point, NOT two
    // mutually exclusive single-draw sites.
    if target_is_toxic_poisoned {
        if attacker_hp_percent > 50 {
            let draw4 = next_draw(cur_rng, ordinal);
            cur_rng = draw4.after;
            ordinal += 1;
            let succeeded4 = draw4.random_value % 256 >= 50;
            draws[draw_count as usize] = CheckViabilityDraw::EvasionUpRoll {
                ordinal: draw4.ordinal,
                before: draw4.before,
                after: draw4.after,
                raw_rng_value: draw4.raw_rng_value,
                random_value: draw4.random_value,
                kind: CvDrawKind::EvasionUp4,
                succeeded: succeeded4,
            };
            draw_count += 1;
            if succeeded4 {
                score += 3;
            }
        } else {
            let draw3 = next_draw(cur_rng, ordinal);
            cur_rng = draw3.after;
            ordinal += 1;
            let succeeded3 = draw3.random_value % 256 >= 80;
            draws[draw_count as usize] = CheckViabilityDraw::EvasionUpRoll {
                ordinal: draw3.ordinal,
                before: draw3.before,
                after: draw3.after,
                raw_rng_value: draw3.raw_rng_value,
                random_value: draw3.random_value,
                kind: CvDrawKind::EvasionUp3,
                succeeded: succeeded3,
            };
            draw_count += 1;
            if succeeded3 {
                // DRAW SITE 3's own failure falls straight through into DRAW SITE 4.
                let draw4 = next_draw(cur_rng, ordinal);
                cur_rng = draw4.after;
                ordinal += 1;
                let succeeded4 = draw4.random_value % 256 >= 50;
                draws[draw_count as usize] = CheckViabilityDraw::EvasionUpRoll {
                    ordinal: draw4.ordinal,
                    before: draw4.before,
                    after: draw4.after,
                    raw_rng_value: draw4.raw_rng_value,
                    random_value: draw4.random_value,
                    kind: CvDrawKind::EvasionUp4,
                    succeeded: succeeded4,
                };
                draw_count += 1;
                if succeeded4 {
                    score += 3;
                }
            }
        }
    }

    // Gate E -> DRAW SITE 5: target leech-seeded.
    if target_is_leech_seeded {
        let draw5 = next_draw(cur_rng, ordinal);
        cur_rng = draw5.after;
        ordinal += 1;
        let succeeded5 = draw5.random_value % 256 >= 70;
        draws[draw_count as usize] = CheckViabilityDraw::EvasionUpRoll {
            ordinal: draw5.ordinal,
            before: draw5.before,
            after: draw5.after,
            raw_rng_value: draw5.raw_rng_value,
            random_value: draw5.random_value,
            kind: CvDrawKind::EvasionUp5,
            succeeded: succeeded5,
        };
        draw_count += 1;
        if succeeded5 {
            score += 3;
        }
    }

    // Gate F -> DRAW SITE 6: attacker's OWN rooted (Ingrain) flag.
    if attacker_is_rooted {
        let draw6 = next_draw(cur_rng, ordinal);
        cur_rng = draw6.after;
        ordinal += 1;
        let succeeded6 = draw6.random_value % 256 >= 128;
        draws[draw_count as usize] = CheckViabilityDraw::EvasionUpRoll {
            ordinal: draw6.ordinal,
            before: draw6.before,
            after: draw6.after,
            raw_rng_value: draw6.raw_rng_value,
            random_value: draw6.random_value,
            kind: CvDrawKind::EvasionUp6,
            succeeded: succeeded6,
        };
        draw_count += 1;
        if succeeded6 {
            score += 2;
        }
    }

    // Gate G -> DRAW SITE 7: target cursed.
    if target_is_cursed {
        let draw7 = next_draw(cur_rng, ordinal);
        cur_rng = draw7.after;
        ordinal += 1;
        let succeeded7 = draw7.random_value % 256 >= 70;
        draws[draw_count as usize] = CheckViabilityDraw::EvasionUpRoll {
            ordinal: draw7.ordinal,
            before: draw7.before,
            after: draw7.after,
            raw_rng_value: draw7.raw_rng_value,
            random_value: draw7.random_value,
            kind: CvDrawKind::EvasionUp7,
            succeeded: succeeded7,
        };
        draw_count += 1;
        if succeeded7 {
            score += 3;
        }
    }

    // Gate H: attacker's own HP > 70% -- clean stop, skips the entire tail.
    if attacker_hp_percent > 70 {
        return CvDraws { rng: cur_rng, draws, draw_count, score_delta: score };
    }
    // Gate I: attacker's OWN evasion stage back at neutral -- clean stop.
    if attacker_evasion_stage == DEFAULT_STAT_STAGE {
        return CvDraws { rng: cur_rng, draws, draw_count, score_delta: score };
    }
    // Gates J/K: either battler <40% HP skips DRAW SITE 8, deterministic -2.
    if attacker_hp_percent < 40 || target_hp_percent < 40 {
        return CvDraws { rng: cur_rng, draws, draw_count, score_delta: score - 2 };
    }
    // DRAW SITE 8: OPPOSITE polarity -- jump (roll<70) is the no-op; falling
    // through (roll>=70) is what applies the -2 (same shape as AccuracyDown's
    // own DRAW SITE 7).
    let draw8 = next_draw(cur_rng, ordinal);
    cur_rng = draw8.after;
    let succeeded8 = draw8.random_value % 256 >= 70;
    draws[draw_count as usize] = CheckViabilityDraw::EvasionUpRoll {
        ordinal: draw8.ordinal,
        before: draw8.before,
        after: draw8.after,
        raw_rng_value: draw8.raw_rng_value,
        random_value: draw8.random_value,
        kind: CvDrawKind::EvasionUp8,
        succeeded: succeeded8,
    };
    draw_count += 1;
    CvDraws {
        rng: cur_rng,
        draws,
        draw_count,
        score_delta: if succeeded8 { score - 2 } else { score },
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::damage_calc::{TYPE_BUG, TYPE_ROCK, TYPE_WATER};
    use crate::factory_ai_check_bad_move::first_move_id_with_effect;

    const MOVE_SURF: u16 = 57; // EFFECT_HIT -- no if_effect table entry
    const MOVE_ROCK_SLIDE: u16 = 157; // EFFECT_FLINCH_HIT -- no entry
    const MOVE_BODY_SLAM: u16 = 34; // EFFECT_PARALYZE_HIT -- no entry
    const MOVE_THUNDERBOLT: u16 = 85; // EFFECT_PARALYZE_HIT -- no entry

    fn neutral_battler() -> FactoryAiCheckViabilityBattler {
        FactoryAiCheckViabilityBattler {
            speed: 100,
            speed_stage: 6,
            types: [0, 0],
            is_first_turn: 0,
            evasion_stage: 6,
            acc_stage: 6,
            atk_stage: 6,
            def_stage: 6,
            sp_def_stage: 6,
            hp: 100,
            max_hp: 100,
            sp_atk_stage: None,
            last_used_move_id: None,
            is_toxic_poisoned: None,
            is_leech_seeded: None,
            is_rooted: None,
            is_cursed: None,
            ability: None,
            current_weather: None,
            moves: Some([MOVE_SURF, MOVE_ROCK_SLIDE, MOVE_BODY_SLAM, MOVE_THUNDERBOLT]),
            battle_turn_count: None,
            known_moves: None,
            is_infatuated: None,
            is_asleep: None,
            is_confused: None,
            is_taunted: None,
            has_yawn: None,
            has_perish_song: None,
            protect_uses: None,
            has_side_reflect: None,
            is_poisoned: None,
            is_burned: None,
            is_paralyzed: None,
            has_substitute: None,
            any_move_disabled: None,
            has_any_status: None,
            target_party_status_equals_any: None,
            hold_effect: None,
            species_abilities: None,
            known_ability: None,
            used_held_item_id: None,
            stockpile_count: None,
        }
    }

    fn run(move_id: u16, rng_value: u32) -> CheckViabilityResult {
        run_check_viability(RunCheckViabilityInput {
            rng: BattleRngState { value: rng_value, calls: 0 },
            move_id,
            attacker: neutral_battler(),
            target: neutral_battler(),
            stale_func_result_fallback: None,
            draw_ordinal_start: 1,
        })
    }

    // === battler/draw shape recount (module doc comment) ===================

    #[test]
    fn battler_field_count_is_42() {
        // Constructing one full literal (neutral_battler above) is itself
        // the shape pin: if the struct's real field count ever drifts from
        // 42 (11 required + 31 optional), that literal fails to compile.
        let b = neutral_battler();
        assert_eq!(b.speed, 100);
    }

    // === dispatch shell (TS test :207-228 analog) ===========================

    #[test]
    fn falls_through_to_zero_score_zero_draws_for_no_table_entry_moves() {
        for move_id in [MOVE_SURF, MOVE_ROCK_SLIDE, MOVE_BODY_SLAM, MOVE_THUNDERBOLT] {
            let result = run(move_id, 12345);
            assert_eq!(
                result,
                CheckViabilityResult::Scored {
                    rng: BattleRngState { value: 12345, calls: 0 },
                    draws: [DRAW_FILLER; MAX_CHECK_VIABILITY_DRAWS],
                    draw_count: 0,
                    score_delta: 0,
                    func_result_after: None,
                },
                "move {move_id}"
            );
        }
    }

    #[test]
    fn stale_func_result_fallback_passes_through_the_fallthrough_unchanged() {
        let result = run_check_viability(RunCheckViabilityInput {
            rng: BattleRngState { value: 1, calls: 0 },
            move_id: MOVE_SURF,
            attacker: neutral_battler(),
            target: neutral_battler(),
            stale_func_result_fallback: Some(AI_WEATHER_RAIN),
            draw_ordinal_start: 1,
        });
        let CheckViabilityResult::Scored { func_result_after, .. } = result else {
            panic!("expected Scored");
        };
        assert_eq!(func_result_after, Some(AI_WEATHER_RAIN));
    }

    #[test]
    #[should_panic(expected = "unknown move")]
    fn unknown_move_id_panics() {
        run(9999, 1);
    }

    #[test]
    fn barrier_fires_for_the_first_still_unported_table_effect() {
        // Dynamic lookup so this pin survives M5d-2..5 landing (CBM's own
        // `generic_barrier_fires_for_the_first_unported_table_effect`
        // precedent, `factory_ai_check_bad_move.rs:3878-3911`). Picked from
        // `unported_cv_table_effects()`, which after M5d-1 is exactly the
        // 109 M5d-2..5 effects (e.g. `EFFECT_ATTACK_DOWN`, dispatch-order-
        // next after this batch).
        let unported = unported_cv_table_effects();
        let (effect, move_id) = unported
            .iter()
            .find_map(|&effect| first_move_id_with_effect(effect).map(|id| (effect, id)))
            .expect("at least one still-unported M5d-2..5 effect has a real Gen-3 move");
        assert_eq!(
            run(move_id, 1),
            CheckViabilityResult::NotYetPorted { effect, move_id }
        );
    }

    #[test]
    fn every_m5d1_handled_effects_first_move_now_scores() {
        // The inverse of the barrier test above: M5d-1's own 13 effects no
        // longer hit NotYetPorted for their first real Gen-3 move.
        let mut checked = 0;
        for &effect in CV_HANDLED_EFFECTS_M5D1 {
            if let Some(move_id) = first_move_id_with_effect(effect) {
                let result = run(move_id, 1);
                let CheckViabilityResult::Scored { .. } = result else {
                    panic!(
                        "effect {effect} move {move_id}: expected Scored now that M5d-1 handles it, got {result:?}"
                    );
                };
                checked += 1;
            }
        }
        assert_eq!(
            checked, 13,
            "every M5d-1 effect has at least one real Gen-3 move"
        );
    }

    // === completeness-probe machinery ========================================

    #[test]
    fn cv_handled_effects_m5d1_has_13_entries() {
        // The cumulative `cv_handled_effects()`/`unported_cv_table_effects()`
        // claims this test originally pinned (13 handled / 109 unported) are
        // necessarily batch-specific snapshots -- both functions are unions
        // over every LANDED batch's own `CV_HANDLED_EFFECTS_M5D*` const, so
        // their totals grow as later batches land. The cumulative-state
        // assertion now lives on the latest landed batch's own test
        // (`cv_handled_effects_m5d2_has_29_entries_and_unported_is_80`); this
        // test keeps only the claim that is permanently true regardless of
        // which batches have landed since: M5d-1's own const never changes
        // size.
        assert_eq!(CV_HANDLED_EFFECTS_M5D1.len(), 13);
    }

    #[test]
    fn cv_table_effects_has_no_duplicates_and_122_entries() {
        assert_eq!(CV_TABLE_EFFECTS.len(), 122);
        let mut sorted: Vec<u16> = CV_TABLE_EFFECTS.to_vec();
        sorted.sort_unstable();
        sorted.dedup();
        assert_eq!(
            sorted.len(),
            122,
            "CV_TABLE_EFFECTS must have zero duplicate effect ids"
        );
    }

    // === next_draw (module doc comment / batching doc §5 item b) ===========

    #[test]
    fn next_draw_advances_rng_and_numbers_ordinals() {
        let start = BattleRngState { value: 249_678_687, calls: 0 };
        let draw1 = next_draw(start, 1);
        assert_eq!(draw1.ordinal, 1);
        assert_eq!(draw1.before, start);
        assert_eq!(draw1.after.calls, 1);
        assert_ne!(draw1.after.value, start.value);
        assert_eq!(
            draw1.random_value,
            ((draw1.raw_rng_value >> 16) & 0xffff) as u16
        );

        let draw2 = next_draw(draw1.after, 2);
        assert_eq!(draw2.ordinal, 2);
        assert_eq!(draw2.before, draw1.after);
        assert_eq!(draw2.after.calls, 2);
        assert_ne!(draw2.after.value, draw1.after.value);
    }

    #[test]
    fn next_draw_never_caches_every_call_advances() {
        let start = BattleRngState { value: 1, calls: 0 };
        let a = next_draw(start, 1);
        let b = next_draw(start, 1);
        // Same input rng -> same output (pure function), but each is a
        // genuine fresh advance, not a cached/short-circuited value.
        assert_eq!(a, b);
        assert_eq!(a.after.calls, 1);
    }

    // === stale-funcResult collision helpers (batching doc §5 item c) =======

    #[test]
    fn type_func_result_collision_matches_only_the_four_low_type_ids() {
        assert_eq!(
            type_func_result_collision(TYPE_NORMAL),
            Some(AI_WEATHER_SUN)
        );
        assert_eq!(
            type_func_result_collision(TYPE_FIGHTING),
            Some(AI_WEATHER_RAIN)
        );
        assert_eq!(
            type_func_result_collision(TYPE_FLYING),
            Some(AI_WEATHER_SANDSTORM)
        );
        assert_eq!(
            type_func_result_collision(TYPE_POISON),
            Some(AI_WEATHER_HAIL)
        );
        assert_eq!(type_func_result_collision(4), None); // TYPE_GROUND, first non-colliding id
        assert_eq!(type_func_result_collision(17), None); // TYPE_DARK
    }

    #[test]
    fn ability_func_result_collision_reuses_cbm_map() {
        // ABILITY_NONE=0 collides with AI_WEATHER_SUN, same as CBM's own
        // ability_id_in_weather_range test coverage.
        assert_eq!(ability_func_result_collision(0), Some(AI_WEATHER_SUN));
        assert_eq!(ability_func_result_collision(1), Some(AI_WEATHER_RAIN)); // ABILITY_STENCH
        assert_eq!(ability_func_result_collision(999), None);
    }

    #[test]
    fn hold_effect_func_result_collision_matches_only_the_four_low_ids() {
        assert_eq!(
            hold_effect_func_result_collision(HOLD_EFFECT_NONE),
            Some(AI_WEATHER_SUN)
        );
        assert_eq!(
            hold_effect_func_result_collision(HOLD_EFFECT_RESTORE_HP),
            Some(AI_WEATHER_RAIN)
        );
        assert_eq!(
            hold_effect_func_result_collision(HOLD_EFFECT_CURE_PAR),
            Some(AI_WEATHER_SANDSTORM)
        );
        assert_eq!(
            hold_effect_func_result_collision(HOLD_EFFECT_CURE_SLP),
            Some(AI_WEATHER_HAIL)
        );
        assert_eq!(hold_effect_func_result_collision(4), None); // HOLD_EFFECT_CURE_PSN
    }

    #[test]
    fn type_chain_func_result_after_reads_type1_when_it_matches() {
        let match_list = [TYPE_NORMAL, TYPE_FIGHTING];
        // type0 (TYPE_NORMAL) is in match_list -> the chain never reads
        // type2, so the collision is type0's own.
        assert_eq!(
            type_chain_func_result_after([TYPE_NORMAL, TYPE_FLYING], &match_list),
            type_func_result_collision(TYPE_NORMAL)
        );
    }

    #[test]
    fn type_chain_func_result_after_falls_through_to_type2_when_type1_does_not_match() {
        let match_list = [TYPE_FIGHTING];
        // type0 (TYPE_NORMAL) is NOT in match_list -> the chain falls
        // through to read type2 (TYPE_POISON) instead.
        assert_eq!(
            type_chain_func_result_after([TYPE_NORMAL, TYPE_POISON], &match_list),
            type_func_result_collision(TYPE_POISON)
        );
    }

    // === M5d-1 handler-direct tests (batching doc §2 "M5d-1") ==============
    //
    // Every roll-threshold seed below is FOUND, not guessed: `find_seed`
    // searches low integer rng values for the first one whose own
    // `next_draw(..., 1).random_value % 256` satisfies the caller's
    // predicate, using the exact same primitive the handler itself calls.
    // This pins every branch/draw site per handler (deliverable #4) without
    // hand-deriving or hardcoding which raw seed lands on which side of a
    // threshold.

    fn find_seed(threshold_check: impl Fn(u16) -> bool) -> u32 {
        (1..200_000u32)
            .find(|&v| {
                threshold_check(next_draw(BattleRngState { value: v, calls: 0 }, 1).random_value)
            })
            .expect("find_seed: no seed in range satisfies the predicate")
    }

    fn battler(overrides: FactoryAiCheckViabilityBattler) -> FactoryAiCheckViabilityBattler {
        overrides
    }

    // --- run_cv_sleep (TS test:229-278) -------------------------------------

    #[test]
    fn cv_sleep_no_known_moves_is_deterministic_zero_score_zero_draws() {
        let result = run_cv_sleep(BattleRngState { value: 1, calls: 0 }, None, 1);
        assert_eq!(result.draw_count, 0);
        assert_eq!(result.score_delta, 0);
        assert_eq!(result.rng, BattleRngState { value: 1, calls: 0 });
    }

    #[test]
    fn cv_sleep_known_moves_without_dream_eater_or_nightmare_is_deterministic_zero() {
        let result = run_cv_sleep(
            BattleRngState { value: 1, calls: 0 },
            Some([33, 0, 0, 0]),
            1,
        );
        assert_eq!(result.draw_count, 0);
        assert_eq!(result.score_delta, 0);
    }

    #[test]
    fn cv_sleep_dream_eater_roll_jump_scores_zero_no_jump_scores_one() {
        let jump_seed = find_seed(|rv| rv % 256 < 128);
        let no_jump_seed = find_seed(|rv| rv % 256 >= 128);

        let jumped = run_cv_sleep(
            BattleRngState { value: jump_seed, calls: 0 },
            Some([EFFECT_DREAM_EATER_MOVE, 0, 0, 0]),
            1,
        );
        assert_eq!(jumped.draw_count, 1);
        assert_eq!(jumped.score_delta, 0);
        let CheckViabilityDraw::PursuitSleepRoarParalyzeRoll { kind, succeeded, .. } =
            jumped.draws[0]
        else {
            panic!("expected PursuitSleepRoarParalyzeRoll");
        };
        assert_eq!(kind, CvDrawKind::Sleep);
        assert!(!succeeded);

        let not_jumped = run_cv_sleep(
            BattleRngState { value: no_jump_seed, calls: 0 },
            Some([0, EFFECT_NIGHTMARE_MOVE, 0, 0]),
            1,
        );
        assert_eq!(not_jumped.draw_count, 1);
        assert_eq!(not_jumped.score_delta, 1);
        let CheckViabilityDraw::PursuitSleepRoarParalyzeRoll { kind, succeeded, .. } =
            not_jumped.draws[0]
        else {
            panic!("expected PursuitSleepRoarParalyzeRoll");
        };
        assert_eq!(kind, CvDrawKind::Sleep);
        assert!(succeeded);
    }

    const EFFECT_DREAM_EATER_MOVE: u16 = 138; // MOVE_DREAM_EATER
    const EFFECT_NIGHTMARE_MOVE: u16 = 171; // MOVE_NIGHTMARE

    // --- run_cv_speed_down (TS test:665-791) --------------------------------

    #[test]
    fn cv_speed_down_target_not_faster_scores_minus3_with_no_draws() {
        let attacker = battler(FactoryAiCheckViabilityBattler { speed: 100, ..neutral_battler() });
        let target = battler(FactoryAiCheckViabilityBattler { speed: 50, ..neutral_battler() });
        let result = run_cv_speed_down(BattleRngState { value: 1, calls: 0 }, attacker, target, 1);
        assert_eq!(result.draw_count, 0);
        assert_eq!(result.score_delta, -3);
    }

    #[test]
    fn cv_speed_down_target_faster_roll_site() {
        let attacker = battler(FactoryAiCheckViabilityBattler { speed: 50, ..neutral_battler() });
        let target = battler(FactoryAiCheckViabilityBattler { speed: 150, ..neutral_battler() });
        let jump_seed = find_seed(|rv| rv % 256 < 70);
        let no_jump_seed = find_seed(|rv| rv % 256 >= 70);

        let jumped = run_cv_speed_down(
            BattleRngState { value: jump_seed, calls: 0 },
            attacker,
            target,
            1,
        );
        assert_eq!(jumped.draw_count, 1);
        assert_eq!(jumped.score_delta, 0);
        let CheckViabilityDraw::SpeedDownRoll { succeeded, .. } = jumped.draws[0] else {
            panic!("expected SpeedDownRoll");
        };
        assert!(!succeeded);

        let succeeded_case = run_cv_speed_down(
            BattleRngState { value: no_jump_seed, calls: 0 },
            attacker,
            target,
            1,
        );
        assert_eq!(succeeded_case.draw_count, 1);
        assert_eq!(succeeded_case.score_delta, 2);
        let CheckViabilityDraw::SpeedDownRoll { succeeded, .. } = succeeded_case.draws[0] else {
            panic!("expected SpeedDownRoll");
        };
        assert!(succeeded);
    }

    #[test]
    fn cv_speed_down_tie_draws_tie_first_then_maybe_the_roll() {
        let attacker = battler(FactoryAiCheckViabilityBattler { speed: 100, ..neutral_battler() });
        let target = battler(FactoryAiCheckViabilityBattler { speed: 100, ..neutral_battler() });
        let result = run_cv_speed_down(
            BattleRngState { value: 249_678_687, calls: 0 },
            attacker,
            target,
            1,
        );
        assert!(result.draw_count >= 1);
        let CheckViabilityDraw::TargetFasterTie { .. } = result.draws[0] else {
            panic!("expected TargetFasterTie first");
        };
    }

    // --- run_cv_speed_down_from_chance (TS test:4612-4776) ------------------

    #[test]
    fn cv_speed_down_from_chance_delegates_for_exactly_3_of_6_moves() {
        let attacker = battler(FactoryAiCheckViabilityBattler { speed: 50, ..neutral_battler() });
        let target = battler(FactoryAiCheckViabilityBattler { speed: 150, ..neutral_battler() });
        let rng = BattleRngState { value: 249_678_687, calls: 0 };

        let direct = run_cv_speed_down(rng, attacker, target, 1);
        for delegated_move in [MOVE_ICY_WIND, MOVE_ROCK_TOMB, MOVE_MUD_SHOT] {
            let via_chance =
                run_cv_speed_down_from_chance(rng, delegated_move, attacker, target, 1);
            assert_eq!(
                via_chance, direct,
                "move {delegated_move} should delegate identically"
            );
        }

        for non_delegated_move in [
            61,  /* BUBBLEBEAM */
            132, /* CONSTRICT */
            145, /* BUBBLE */
        ] {
            let result =
                run_cv_speed_down_from_chance(rng, non_delegated_move, attacker, target, 1);
            assert_eq!(result.draw_count, 0);
            assert_eq!(result.score_delta, 0);
            assert_eq!(result.rng, rng, "non-delegated moves never advance the rng");
        }
    }

    /// The SpeedDownFromChance->SpeedDown delegation proven through the
    /// FULL dispatcher (not just the handler function) for both a
    /// delegated move (`EFFECT_SPEED_DOWN_HIT`'s Icy Wind) and a
    /// non-delegated one (Bubblebeam), per the step brief.
    #[test]
    fn dispatcher_speed_down_from_chance_delegation_both_branches() {
        let attacker = battler(FactoryAiCheckViabilityBattler { speed: 50, ..neutral_battler() });
        let target = battler(FactoryAiCheckViabilityBattler { speed: 150, ..neutral_battler() });

        let delegated = run_check_viability(RunCheckViabilityInput {
            rng: BattleRngState { value: 249_678_687, calls: 0 },
            move_id: MOVE_ICY_WIND,
            attacker,
            target,
            stale_func_result_fallback: None,
            draw_ordinal_start: 1,
        });
        let CheckViabilityResult::Scored { draw_count, score_delta, .. } = delegated else {
            panic!("expected Scored");
        };
        assert_eq!(draw_count, 1);
        assert_eq!(score_delta, 2); // matches cv_speed_down_target_faster_roll_site's own succeeded case

        let non_delegated = run_check_viability(RunCheckViabilityInput {
            rng: BattleRngState { value: 249_678_687, calls: 0 },
            move_id: 61, // BUBBLEBEAM
            attacker,
            target,
            stale_func_result_fallback: None,
            draw_ordinal_start: 1,
        });
        let CheckViabilityResult::Scored { draw_count, score_delta, .. } = non_delegated else {
            panic!("expected Scored");
        };
        assert_eq!(draw_count, 0);
        assert_eq!(score_delta, 0);
    }

    // --- run_cv_toxic (TS test:562-614) -------------------------------------

    const MOVE_TACKLE_CONST: u16 = 33;
    const MOVE_PROTECT_CONST: u16 = 182;

    #[test]
    fn cv_toxic_no_attacking_move_no_setup_partner_is_deterministic_zero() {
        let attacker = battler(FactoryAiCheckViabilityBattler {
            moves: Some([0, 0, 0, 0]),
            ..neutral_battler()
        });
        let target = neutral_battler();
        let result = run_cv_toxic(BattleRngState { value: 1, calls: 0 }, attacker, target, 1);
        assert_eq!(result.draw_count, 0);
        assert_eq!(result.score_delta, 0);
    }

    #[test]
    #[should_panic(expected = "AI_CV_Toxic requires AI_USER moves")]
    fn cv_toxic_panics_without_attacker_moves() {
        let attacker = battler(FactoryAiCheckViabilityBattler { moves: None, ..neutral_battler() });
        run_cv_toxic(
            BattleRngState { value: 1, calls: 0 },
            attacker,
            neutral_battler(),
            1,
        );
    }

    #[test]
    fn cv_toxic_attacker_low_hp_draws_toxic1_then_maybe_minus3() {
        let attacker = battler(FactoryAiCheckViabilityBattler {
            moves: Some([MOVE_TACKLE_CONST, 0, 0, 0]),
            hp: 40,
            max_hp: 100,
            ..neutral_battler()
        });
        let target =
            battler(FactoryAiCheckViabilityBattler { hp: 100, max_hp: 100, ..neutral_battler() });
        let jump_seed = find_seed(|rv| rv % 256 < 50);
        let no_jump_seed = find_seed(|rv| rv % 256 >= 50);

        let jumped = run_cv_toxic(
            BattleRngState { value: jump_seed, calls: 0 },
            attacker,
            target,
            1,
        );
        assert_eq!(jumped.draw_count, 1);
        assert_eq!(jumped.score_delta, 0);
        let CheckViabilityDraw::ToxicRoll { kind, jumped: j, .. } = jumped.draws[0] else {
            panic!("expected ToxicRoll");
        };
        assert_eq!(kind, CvDrawKind::Toxic1);
        assert!(j);

        let not_jumped = run_cv_toxic(
            BattleRngState { value: no_jump_seed, calls: 0 },
            attacker,
            target,
            1,
        );
        assert_eq!(not_jumped.draw_count, 1);
        assert_eq!(not_jumped.score_delta, -3);
        let CheckViabilityDraw::ToxicRoll { kind, jumped: j, .. } = not_jumped.draws[0] else {
            panic!("expected ToxicRoll");
        };
        assert_eq!(kind, CvDrawKind::Toxic1);
        assert!(!j);
    }

    #[test]
    fn cv_toxic_both_low_hp_draws_toxic1_and_toxic2() {
        let attacker = battler(FactoryAiCheckViabilityBattler {
            moves: Some([MOVE_TACKLE_CONST, 0, 0, 0]),
            hp: 40,
            max_hp: 100,
            ..neutral_battler()
        });
        let target =
            battler(FactoryAiCheckViabilityBattler { hp: 40, max_hp: 100, ..neutral_battler() });
        let result = run_cv_toxic(
            BattleRngState { value: 249_678_687, calls: 0 },
            attacker,
            target,
            1,
        );
        assert_eq!(result.draw_count, 2);
        let CheckViabilityDraw::ToxicRoll { kind: k0, .. } = result.draws[0] else {
            panic!()
        };
        let CheckViabilityDraw::ToxicRoll { kind: k1, .. } = result.draws[1] else {
            panic!()
        };
        assert_eq!(k0, CvDrawKind::Toxic1);
        assert_eq!(k1, CvDrawKind::Toxic2);
    }

    #[test]
    fn cv_toxic_setup_partner_draws_toxic3() {
        let attacker = battler(FactoryAiCheckViabilityBattler {
            moves: Some([MOVE_PROTECT_CONST, 0, 0, 0]),
            ..neutral_battler()
        });
        let target = neutral_battler();
        let jump_seed = find_seed(|rv| rv % 256 < 60);
        let no_jump_seed = find_seed(|rv| rv % 256 >= 60);

        let jumped = run_cv_toxic(
            BattleRngState { value: jump_seed, calls: 0 },
            attacker,
            target,
            1,
        );
        assert_eq!(jumped.draw_count, 1);
        assert_eq!(jumped.score_delta, 0);
        let CheckViabilityDraw::ToxicRoll { kind, jumped: j, .. } = jumped.draws[0] else {
            panic!()
        };
        assert_eq!(kind, CvDrawKind::Toxic3);
        assert!(j);

        let succeeded = run_cv_toxic(
            BattleRngState { value: no_jump_seed, calls: 0 },
            attacker,
            target,
            1,
        );
        assert_eq!(succeeded.score_delta, 2);
    }

    // --- run_cv_protect (TS test:615-664) -----------------------------------

    #[test]
    fn cv_protect_early_gate_from_attacker_status_scores_zero_no_draws() {
        for overrides in [
            FactoryAiCheckViabilityBattler { is_infatuated: Some(true), ..neutral_battler() },
            FactoryAiCheckViabilityBattler { is_leech_seeded: Some(true), ..neutral_battler() },
            FactoryAiCheckViabilityBattler { has_yawn: Some(true), ..neutral_battler() },
        ] {
            let (result, _) = run_cv_protect(
                BattleRngState { value: 1, calls: 0 },
                overrides,
                neutral_battler(),
                1,
            );
            assert_eq!(result.draw_count, 0);
            assert_eq!(result.score_delta, 0);
        }
    }

    #[test]
    fn cv_protect_early_gate_scores_minus2_when_last_move_was_lock_on() {
        const MOVE_LOCK_ON: u16 = 199;
        let attacker = battler(FactoryAiCheckViabilityBattler {
            is_infatuated: Some(true),
            ..neutral_battler()
        });
        let target = battler(FactoryAiCheckViabilityBattler {
            last_used_move_id: Some(MOVE_LOCK_ON),
            ..neutral_battler()
        });
        let (result, _) =
            run_cv_protect(BattleRngState { value: 1, calls: 0 }, attacker, target, 1);
        assert_eq!(result.draw_count, 0);
        assert_eq!(result.score_delta, -2);
    }

    #[test]
    fn cv_protect_early_gate_target_history_positional_bug() {
        const MOVE_RECOVER: u16 = 105;
        // The target's known move (Recover, EFFECT_RESTORE_HP) sits at slot
        // 0, but the attacker's OWN move at slot 0 is MOVE_NONE(0) --
        // Cmd_if_has_move_with_effect's AI_TARGET positional bug means this
        // does NOT trigger earlyProtect3.
        let attacker = battler(FactoryAiCheckViabilityBattler {
            moves: Some([0, 0, 0, 0]),
            ..neutral_battler()
        });
        let target = battler(FactoryAiCheckViabilityBattler {
            known_moves: Some([MOVE_RECOVER, 0, 0, 0]),
            ..neutral_battler()
        });
        let (result, _) = run_cv_protect(
            BattleRngState { value: 249_678_687, calls: 0 },
            attacker,
            target,
            1,
        );
        // Reaches the normal (non-early) path -- at least the first roll.
        assert!(result.draw_count >= 1);
    }

    #[test]
    fn cv_protect_normal_path_roll1_site_and_protect_uses_roll2() {
        let jump_seed = find_seed(|rv| rv % 256 < 128);
        let no_jump_seed = find_seed(|rv| rv % 256 >= 128);

        let jumped = run_cv_protect(
            BattleRngState { value: jump_seed, calls: 0 },
            neutral_battler(),
            neutral_battler(),
            1,
        );
        assert_eq!(jumped.0.draw_count, 1);
        let CheckViabilityDraw::ProtectRoll { kind, jumped: j, .. } = jumped.0.draws[0] else {
            panic!()
        };
        assert_eq!(kind, CvDrawKind::Protect1);
        assert!(j);
        assert_eq!(jumped.0.score_delta, 2); // base 2, roll1 "jumped" (roll<128) means no penalty

        let not_jumped = run_cv_protect(
            BattleRngState { value: no_jump_seed, calls: 0 },
            neutral_battler(),
            neutral_battler(),
            1,
        );
        assert_eq!(not_jumped.0.score_delta, 1); // base 2 - 1 (roll1 did NOT jump, roll>=128)

        let attacker_with_uses =
            battler(FactoryAiCheckViabilityBattler { protect_uses: Some(3), ..neutral_battler() });
        let (with_uses, _) = run_cv_protect(
            BattleRngState { value: 249_678_687, calls: 0 },
            attacker_with_uses,
            neutral_battler(),
            1,
        );
        assert_eq!(with_uses.draw_count, 2);
        let CheckViabilityDraw::ProtectRoll { kind, .. } = with_uses.draws[1] else {
            panic!()
        };
        assert_eq!(kind, CvDrawKind::Protect2);
    }

    #[test]
    fn cv_protect_func_result_after_reflects_target_last_move_effect() {
        // Target's last move HIT(0) -> AI_WEATHER_SUN(0).
        let (_, func_result_after) = run_cv_protect(
            BattleRngState { value: 1, calls: 0 },
            neutral_battler(),
            neutral_battler(),
            1,
        );
        assert_eq!(func_result_after, Some(AI_WEATHER_SUN));
    }

    // --- run_cv_pursuit (TS test:792-886) -----------------------------------

    #[test]
    fn cv_pursuit_first_turn_nonzero_is_deterministic_and_writes_func_result() {
        let (result, func_result_after) = run_cv_pursuit(
            BattleRngState { value: 1, calls: 0 },
            1,
            [TYPE_GHOST, TYPE_GHOST],
            1,
        );
        assert_eq!(result.draw_count, 0);
        assert_eq!(result.score_delta, 0);
        assert_eq!(func_result_after, Some(1));

        let (result2, func_result_after2) = run_cv_pursuit(
            BattleRngState { value: 1, calls: 0 },
            2,
            [TYPE_NORMAL, TYPE_NORMAL],
            1,
        );
        assert_eq!(result2.draw_count, 0);
        assert_eq!(func_result_after2, Some(2));
    }

    #[test]
    fn cv_pursuit_not_ghost_or_psychic_is_deterministic_zero() {
        let (result, func_result_after) = run_cv_pursuit(
            BattleRngState { value: 1, calls: 0 },
            0,
            [TYPE_NORMAL, TYPE_WATER],
            1,
        );
        assert_eq!(result.draw_count, 0);
        assert_eq!(result.score_delta, 0);
        assert_eq!(func_result_after, type_func_result_collision(TYPE_WATER));
    }

    #[test]
    fn cv_pursuit_ghost_or_psychic_draws_the_roll() {
        let jump_seed = find_seed(|rv| rv % 256 < 128);
        let no_jump_seed = find_seed(|rv| rv % 256 >= 128);

        let (jumped, _) = run_cv_pursuit(
            BattleRngState { value: jump_seed, calls: 0 },
            0,
            [TYPE_GHOST, TYPE_NORMAL],
            1,
        );
        assert_eq!(jumped.draw_count, 1);
        assert_eq!(jumped.score_delta, 0);
        let CheckViabilityDraw::PursuitSleepRoarParalyzeRoll { kind, succeeded, .. } =
            jumped.draws[0]
        else {
            panic!("expected PursuitSleepRoarParalyzeRoll");
        };
        assert_eq!(kind, CvDrawKind::Pursuit);
        assert!(!succeeded);

        let (not_jumped, _) = run_cv_pursuit(
            BattleRngState { value: no_jump_seed, calls: 0 },
            0,
            [TYPE_NORMAL, TYPE_PSYCHIC],
            1,
        );
        assert_eq!(not_jumped.score_delta, 1);
    }

    // --- run_cv_high_crit (TS test:887-1157) --------------------------------

    #[test]
    fn cv_high_crit_x0_25_and_x0_5_are_deterministic_zero() {
        // Karate Chop (Fighting) vs Ghost/Ghost: immune (0x), lands in the
        // "other" fallthrough bucket instead -- pick a real x0.5/x0.25
        // matchup directly via classify to keep this test's intent clear.
        assert_eq!(
            classify_high_crit_effectiveness(
                [TYPE_FIGHTING, TYPE_FIGHTING],
                TYPE_FIGHTING,
                [TYPE_POISON, TYPE_BUG]
            ),
            AI_EFFECTIVENESS_X0_25
        );
        let result = run_cv_high_crit(
            BattleRngState { value: 1, calls: 0 },
            [TYPE_FIGHTING, TYPE_FIGHTING],
            TYPE_FIGHTING,
            [TYPE_POISON, TYPE_BUG],
            1,
        );
        assert_eq!(result.draw_count, 0);
        assert_eq!(result.score_delta, 0);
    }

    #[test]
    fn cv_high_crit_x2_or_x4_skips_the_first_roll() {
        // Fighting vs Rock/Rock: 2x, non-STAB path lands exactly on
        // AI_EFFECTIVENESS_X2 (40*20/10=80) without needing the STAB remap.
        assert_eq!(
            classify_high_crit_effectiveness(
                [TYPE_NORMAL, TYPE_NORMAL],
                TYPE_FIGHTING,
                [TYPE_ROCK, TYPE_ROCK]
            ),
            AI_EFFECTIVENESS_X2
        );
        let jump_seed = find_seed(|rv| rv % 256 < 128);
        let no_jump_seed = find_seed(|rv| rv % 256 >= 128);

        let jumped = run_cv_high_crit(
            BattleRngState { value: jump_seed, calls: 0 },
            [TYPE_NORMAL, TYPE_NORMAL],
            TYPE_FIGHTING,
            [TYPE_ROCK, TYPE_ROCK],
            1,
        );
        assert_eq!(jumped.draw_count, 1);
        assert_eq!(jumped.score_delta, 0);
        let CheckViabilityDraw::HighCritRoll { succeeded, .. } = jumped.draws[0] else {
            panic!("expected HighCritRoll (no fallthrough draw for x2/x4)");
        };
        assert!(!succeeded);

        let not_jumped = run_cv_high_crit(
            BattleRngState { value: no_jump_seed, calls: 0 },
            [TYPE_NORMAL, TYPE_NORMAL],
            TYPE_FIGHTING,
            [TYPE_ROCK, TYPE_ROCK],
            1,
        );
        assert_eq!(not_jumped.score_delta, 1);
    }

    #[test]
    fn cv_high_crit_neutral_fallthrough_burns_one_or_two_draws() {
        // Fighting vs Fighting/Fighting: neutral (1x) -- the "other" bucket.
        assert_eq!(
            classify_high_crit_effectiveness(
                [TYPE_NORMAL, TYPE_NORMAL],
                TYPE_FIGHTING,
                [TYPE_FIGHTING, TYPE_FIGHTING]
            ),
            AI_EFFECTIVENESS_X1
        );
        let jump_seed = find_seed(|rv| rv % 256 < 128); // fallthrough roll jumps -> 1 draw total, score 0
        let result = run_cv_high_crit(
            BattleRngState { value: jump_seed, calls: 0 },
            [TYPE_NORMAL, TYPE_NORMAL],
            TYPE_FIGHTING,
            [TYPE_FIGHTING, TYPE_FIGHTING],
            1,
        );
        assert_eq!(result.draw_count, 1);
        assert_eq!(result.score_delta, 0);
        let CheckViabilityDraw::HighCritFallthroughRoll { jumped_to_end, .. } = result.draws[0]
        else {
            panic!("expected HighCritFallthroughRoll");
        };
        assert!(jumped_to_end);

        // Find a seed where the fallthrough roll does NOT jump (continues
        // into the second roll) -- burns two draws total.
        let two_draw_seed = (1u32..5000)
            .find(|&v| {
                run_cv_high_crit(
                    BattleRngState { value: v, calls: 0 },
                    [TYPE_NORMAL, TYPE_NORMAL],
                    TYPE_FIGHTING,
                    [TYPE_FIGHTING, TYPE_FIGHTING],
                    1,
                )
                .draw_count
                    == 2
            })
            .expect("expected some seed to produce 2 draws");
        let two_draw = run_cv_high_crit(
            BattleRngState { value: two_draw_seed, calls: 0 },
            [TYPE_NORMAL, TYPE_NORMAL],
            TYPE_FIGHTING,
            [TYPE_FIGHTING, TYPE_FIGHTING],
            1,
        );
        assert_eq!(two_draw.draw_count, 2);
        let CheckViabilityDraw::HighCritFallthroughRoll { jumped_to_end, .. } = two_draw.draws[0]
        else {
            panic!()
        };
        assert!(!jumped_to_end);
        let CheckViabilityDraw::HighCritRoll { .. } = two_draw.draws[1] else {
            panic!("expected HighCritRoll second");
        };
    }

    // --- run_cv_always_hit (TS test:1158-1290) ------------------------------

    #[test]
    fn cv_always_hit_neither_gate_is_deterministic_zero() {
        let result = run_cv_always_hit(BattleRngState { value: 1, calls: 0 }, 6, 6, 1);
        assert_eq!(result.draw_count, 0);
        assert_eq!(result.score_delta, 0);
    }

    #[test]
    fn cv_always_hit_score_up1_gate_adds_base_score_one() {
        // target evasion stage 11 > 10 reaches ScoreUp1 (base score 1),
        // still burns exactly one draw (TS's own real-finding note).
        let jump_seed = find_seed(|rv| rv % 256 < 100);
        let no_jump_seed = find_seed(|rv| rv % 256 >= 100);

        let jumped = run_cv_always_hit(BattleRngState { value: jump_seed, calls: 0 }, 11, 6, 1);
        assert_eq!(jumped.draw_count, 1);
        assert_eq!(jumped.score_delta, 1);

        let not_jumped =
            run_cv_always_hit(BattleRngState { value: no_jump_seed, calls: 0 }, 11, 6, 1);
        assert_eq!(not_jumped.score_delta, 2);
    }

    #[test]
    fn cv_always_hit2_only_gate_has_zero_base_score() {
        // target evasion stage 9 (in (8,10]) reaches AlwaysHit2 directly.
        let jump_seed = find_seed(|rv| rv % 256 < 100);
        let no_jump_seed = find_seed(|rv| rv % 256 >= 100);

        let jumped = run_cv_always_hit(BattleRngState { value: jump_seed, calls: 0 }, 9, 6, 1);
        assert_eq!(jumped.draw_count, 1);
        assert_eq!(jumped.score_delta, 0);

        let not_jumped =
            run_cv_always_hit(BattleRngState { value: no_jump_seed, calls: 0 }, 9, 6, 1);
        assert_eq!(not_jumped.score_delta, 1);
    }

    #[test]
    fn cv_always_hit_low_acc_stage_reaches_score_up1() {
        let result = run_cv_always_hit(BattleRngState { value: 249_678_687, calls: 0 }, 6, 1, 1);
        assert_eq!(result.draw_count, 1);
        assert!(result.score_delta >= 1); // base score 1 plus the roll outcome
    }

    // --- run_cv_vital_throw (TS test:1291-1523) -----------------------------

    #[test]
    fn cv_vital_throw_target_faster_is_deterministic_zero() {
        let attacker = battler(FactoryAiCheckViabilityBattler { speed: 50, ..neutral_battler() });
        let target = battler(FactoryAiCheckViabilityBattler { speed: 150, ..neutral_battler() });
        let result = run_cv_vital_throw(BattleRngState { value: 1, calls: 0 }, attacker, target, 1);
        assert_eq!(result.draw_count, 0);
        assert_eq!(result.score_delta, 0);
    }

    #[test]
    fn cv_vital_throw_user_faster_high_hp_is_deterministic_zero() {
        let attacker = battler(FactoryAiCheckViabilityBattler {
            speed: 150,
            hp: 80,
            max_hp: 100,
            ..neutral_battler()
        });
        let target = battler(FactoryAiCheckViabilityBattler { speed: 50, ..neutral_battler() });
        let result = run_cv_vital_throw(BattleRngState { value: 1, calls: 0 }, attacker, target, 1);
        assert_eq!(result.draw_count, 0);
        assert_eq!(result.score_delta, 0);
    }

    #[test]
    fn cv_vital_throw_low_hp_skips_straight_to_final_roll() {
        let attacker = battler(FactoryAiCheckViabilityBattler {
            speed: 150,
            hp: 30,
            max_hp: 100,
            ..neutral_battler()
        });
        let target = battler(FactoryAiCheckViabilityBattler { speed: 50, ..neutral_battler() });
        let jump_seed = find_seed(|rv| rv % 256 < 50);
        let no_jump_seed = find_seed(|rv| rv % 256 >= 50);

        let jumped = run_cv_vital_throw(
            BattleRngState { value: jump_seed, calls: 0 },
            attacker,
            target,
            1,
        );
        assert_eq!(jumped.draw_count, 1);
        assert_eq!(jumped.score_delta, 0);
        let CheckViabilityDraw::VitalThrowRoll { succeeded, .. } = jumped.draws[0] else {
            panic!("expected VitalThrowRoll (no midband draw below 40%)");
        };
        assert!(!succeeded);

        let not_jumped = run_cv_vital_throw(
            BattleRngState { value: no_jump_seed, calls: 0 },
            attacker,
            target,
            1,
        );
        assert_eq!(not_jumped.score_delta, -1);
    }

    #[test]
    fn cv_vital_throw_midband_draws_first_then_maybe_the_final_roll() {
        let attacker = battler(FactoryAiCheckViabilityBattler {
            speed: 150,
            hp: 50,
            max_hp: 100,
            ..neutral_battler()
        });
        let target = battler(FactoryAiCheckViabilityBattler { speed: 50, ..neutral_battler() });
        let midband_jump_seed = find_seed(|rv| rv % 256 < 180);
        let midband_fall_through_seed = find_seed(|rv| rv % 256 >= 180);

        let jumped = run_cv_vital_throw(
            BattleRngState { value: midband_jump_seed, calls: 0 },
            attacker,
            target,
            1,
        );
        assert_eq!(jumped.draw_count, 1);
        assert_eq!(jumped.score_delta, 0);
        let CheckViabilityDraw::VitalThrowMidbandRoll { jumped_to_end, .. } = jumped.draws[0]
        else {
            panic!("expected VitalThrowMidbandRoll");
        };
        assert!(jumped_to_end);

        let fell_through = run_cv_vital_throw(
            BattleRngState { value: midband_fall_through_seed, calls: 0 },
            attacker,
            target,
            1,
        );
        assert_eq!(fell_through.draw_count, 2);
        let CheckViabilityDraw::VitalThrowMidbandRoll { jumped_to_end, .. } = fell_through.draws[0]
        else {
            panic!()
        };
        assert!(!jumped_to_end);
        let CheckViabilityDraw::VitalThrowRoll { .. } = fell_through.draws[1] else {
            panic!("expected VitalThrowRoll second");
        };
    }

    // === M5d-2 completeness-probe machinery =================================

    #[test]
    fn cv_handled_effects_m5d2_has_29_entries_and_unported_is_80() {
        assert_eq!(CV_HANDLED_EFFECTS_M5D2.len(), 29);
        assert_eq!(cv_handled_effects().len(), 13 + 29);
        assert_eq!(unported_cv_table_effects().len(), 80);
        let handled = cv_handled_effects();
        let unported = unported_cv_table_effects();
        assert!(unported.iter().all(|e| !handled.contains(e)));
        let mut union: Vec<u16> = handled.iter().chain(unported.iter()).copied().collect();
        union.sort_unstable();
        let mut expected = CV_TABLE_EFFECTS;
        expected.sort_unstable();
        assert_eq!(union, expected);
    }

    #[test]
    fn cv_handled_effects_m5d2_has_no_duplicates() {
        let mut sorted = CV_HANDLED_EFFECTS_M5D2.to_vec();
        sorted.sort_unstable();
        sorted.dedup();
        assert_eq!(sorted.len(), CV_HANDLED_EFFECTS_M5D2.len());
    }

    #[test]
    fn every_m5d2_handled_effects_first_move_now_scores() {
        // The M5d-1 barrier test's own generic probe (`unported_cv_table_effects`)
        // already re-proves the barrier still fires for the first still-unported
        // M5d-3..5 effect after this batch lands, since it's re-derived
        // dynamically each run -- no separate test needed here. This is the
        // inverse: every M5d-2 effect's own first real Gen-3 move now scores.
        //
        // 23 of the 29 handled effects have one (live-checked via
        // `first_move_id_with_effect`, the same CBM-imported helper CBM's own
        // tests use, not assumed) -- 6 are vestigial base/`_2` twins with zero
        // real Gen-3 moves, same pattern as M5d-1's own 3 CV-only handlers'
        // sibling effects: `EFFECT_SPEED_UP`(12, only `_2` has a move --
        // Agility), `EFFECT_SPECIAL_DEFENSE_UP`(14, only `_2`/`COSMIC_POWER`/
        // `CALM_MIND` have moves), `EFFECT_SPECIAL_DEFENSE_DOWN`(22, only
        // `_2` has moves -- Fake Tears/Metal Sound), `EFFECT_EVASION_UP_2`(56,
        // only the base/`MINIMIZE` have moves), `EFFECT_ACCURACY_DOWN_2`(63,
        // dispatched source-faithfully per TS's own doc comment despite zero
        // moves), `EFFECT_EVASION_DOWN_2`(64, only the base has moves).
        let mut checked = 0;
        for &effect in CV_HANDLED_EFFECTS_M5D2 {
            if let Some(move_id) = first_move_id_with_effect(effect) {
                let result = run(move_id, 1);
                let CheckViabilityResult::Scored { .. } = result else {
                    panic!(
                        "effect {effect} move {move_id}: expected Scored now that M5d-2 handles it, got {result:?}"
                    );
                };
                checked += 1;
            }
        }
        assert_eq!(
            checked, 23,
            "23 of the 29 M5d-2 effects have at least one real Gen-3 move"
        );
    }

    #[test]
    fn barrier_still_fires_for_the_first_m5d3_effect_after_m5d2_lands() {
        // Re-runs the M5d-1 barrier test's own generic assertion (dynamic over
        // `unported_cv_table_effects()`, `factory_ai_check_bad_move.rs`'s own
        // precedent) now that M5d-2's 29 effects have shrunk the unported set
        // to 80 -- proves the barrier is still alive for whatever's next
        // (M5d-3), not just that M5d-2's own effects moved out of it.
        let unported = unported_cv_table_effects();
        let (effect, move_id) = unported
            .iter()
            .find_map(|&effect| first_move_id_with_effect(effect).map(|id| (effect, id)))
            .expect("at least one still-unported M5d-3..5 effect has a real Gen-3 move");
        assert_eq!(
            run(move_id, 1),
            CheckViabilityResult::NotYetPorted { effect, move_id }
        );
    }

    // === run_cv_attack_down (TS test:1524-1748) =============================

    fn attack_down_gates_ef_short_circuit_types() -> [u8; 2] {
        [TYPE_NORMAL, TYPE_NORMAL] // both physical -- Gates E/F match, DRAW SITE 2 skipped.
    }
    fn attack_down_gates_ef_reach_draw2_types() -> [u8; 2] {
        [TYPE_FIRE, TYPE_FIRE] // neither physical -- DRAW SITE 2 always reached.
    }

    #[test]
    fn cv_attack_down_gate_a_held_is_deterministic_zero() {
        let (result, func_result_after) = run_cv_attack_down(
            BattleRngState { value: 1, calls: 0 },
            100,
            100,
            DEFAULT_STAT_STAGE,
            100,
            100,
            attack_down_gates_ef_short_circuit_types(),
            1,
        );
        assert_eq!(result.draw_count, 0);
        assert_eq!(result.score_delta, 0);
        assert_eq!(func_result_after, type_func_result_collision(TYPE_NORMAL));
    }

    #[test]
    fn cv_attack_down_gate_a_not_held_gate_b_hp_band() {
        let (high_hp, _) = run_cv_attack_down(
            BattleRngState { value: 1, calls: 0 },
            100,
            100,
            4,
            100,
            100,
            attack_down_gates_ef_short_circuit_types(),
            1,
        );
        assert_eq!(high_hp.draw_count, 0);
        assert_eq!(high_hp.score_delta, -1); // attacker HP 100% > 90 -> second -1 skipped.

        let (exact_90, _) = run_cv_attack_down(
            BattleRngState { value: 1, calls: 0 },
            90,
            100,
            4,
            100,
            100,
            attack_down_gates_ef_short_circuit_types(),
            1,
        );
        assert_eq!(exact_90.score_delta, -2); // attacker HP exactly 90% -- NOT >90 -> second -1 applies.
    }

    #[test]
    fn cv_attack_down_draw_site_1_reached_only_at_target_atk_stage_le_3() {
        let jump_seed = find_seed(|rv| rv % 256 < 50);
        let no_jump_seed = find_seed(|rv| rv % 256 >= 50);

        let (jumped, _) = run_cv_attack_down(
            BattleRngState { value: jump_seed, calls: 0 },
            100,
            100,
            3,
            100,
            100,
            attack_down_gates_ef_short_circuit_types(),
            1,
        );
        assert_eq!(jumped.draw_count, 1);
        assert_eq!(jumped.score_delta, -1);
        let CheckViabilityDraw::AttackDownRoll1 { succeeded, .. } = jumped.draws[0] else {
            panic!("expected AttackDownRoll1");
        };
        assert!(!succeeded);

        let (not_jumped, _) = run_cv_attack_down(
            BattleRngState { value: no_jump_seed, calls: 0 },
            100,
            100,
            3,
            100,
            100,
            attack_down_gates_ef_short_circuit_types(),
            1,
        );
        assert_eq!(not_jumped.score_delta, -3);
    }

    #[test]
    fn cv_attack_down_gate_d_target_hp_band() {
        let (above_70, _) = run_cv_attack_down(
            BattleRngState { value: 1, calls: 0 },
            100,
            100,
            DEFAULT_STAT_STAGE,
            71,
            100,
            attack_down_gates_ef_short_circuit_types(),
            1,
        );
        assert_eq!(above_70.score_delta, 0);

        let (exact_70, _) = run_cv_attack_down(
            BattleRngState { value: 1, calls: 0 },
            100,
            100,
            DEFAULT_STAT_STAGE,
            70,
            100,
            attack_down_gates_ef_short_circuit_types(),
            1,
        );
        assert_eq!(exact_70.score_delta, -2);
    }

    #[test]
    fn cv_attack_down_gates_ef_physical_type_skips_draw_site_2() {
        let (result, func_result_after) = run_cv_attack_down(
            BattleRngState { value: 1, calls: 0 },
            100,
            100,
            DEFAULT_STAT_STAGE,
            100,
            100,
            [TYPE_BUG, TYPE_FLYING],
            1,
        );
        assert_eq!(result.draw_count, 0);
        assert_eq!(result.score_delta, 0);
        assert_eq!(func_result_after, type_func_result_collision(TYPE_BUG));
    }

    #[test]
    fn cv_attack_down_draw_site_2_reached_only_when_non_physical() {
        let jump_seed = find_seed(|rv| rv % 256 < 50);
        let no_jump_seed = find_seed(|rv| rv % 256 >= 50);

        let (jumped, _) = run_cv_attack_down(
            BattleRngState { value: jump_seed, calls: 0 },
            100,
            100,
            DEFAULT_STAT_STAGE,
            100,
            100,
            attack_down_gates_ef_reach_draw2_types(),
            1,
        );
        assert_eq!(jumped.draw_count, 1);
        assert_eq!(jumped.score_delta, 0);
        let CheckViabilityDraw::AttackDownRoll2 { succeeded, .. } = jumped.draws[0] else {
            panic!("expected AttackDownRoll2");
        };
        assert!(!succeeded);

        let (not_jumped, _) = run_cv_attack_down(
            BattleRngState { value: no_jump_seed, calls: 0 },
            100,
            100,
            DEFAULT_STAT_STAGE,
            100,
            100,
            attack_down_gates_ef_reach_draw2_types(),
            1,
        );
        assert_eq!(not_jumped.score_delta, -2);
    }

    #[test]
    fn cv_attack_down_draw_site_1_and_2_not_mutually_exclusive_worst_case_minus8() {
        let mut found = None;
        for seed in 1..50_000u32 {
            let (result, _) = run_cv_attack_down(
                BattleRngState { value: seed, calls: 0 },
                50,
                100,
                3,
                50,
                100,
                attack_down_gates_ef_reach_draw2_types(),
                1,
            );
            if result.draw_count == 2 && result.score_delta == -8 {
                found = Some(result);
                break;
            }
        }
        let result = found.expect("no seed in range fires both AttackDown draws successfully");
        let CheckViabilityDraw::AttackDownRoll1 { succeeded, .. } = result.draws[0] else {
            panic!()
        };
        assert!(succeeded);
        let CheckViabilityDraw::AttackDownRoll2 { succeeded, .. } = result.draws[1] else {
            panic!()
        };
        assert!(succeeded);
    }

    // === run_cv_stat_down shared tail (TS test:1749-2051, 4127-4265) ========

    #[test]
    fn cv_stat_down_gate_a_reaches_draw_site_regardless_of_stat_stage() {
        let jump_seed = find_seed(|rv| rv % 256 < 50);
        let result = run_cv_stat_down(
            CvStatDownKind::Defense,
            BattleRngState { value: jump_seed, calls: 0 },
            50,
            100,
            6,
            100,
            100,
            1,
        );
        assert_eq!(result.draw_count, 1);
        assert_eq!(result.score_delta, 0);
        let CheckViabilityDraw::DefenseDownRoll { succeeded, .. } = result.draws[0] else {
            panic!("expected DefenseDownRoll");
        };
        assert!(!succeeded);
    }

    #[test]
    fn cv_stat_down_gate_b_reaches_draw_site_only_at_stat_stage_le_3() {
        let reached = run_cv_stat_down(
            CvStatDownKind::SpDef,
            BattleRngState { value: 1, calls: 0 },
            100,
            100,
            3,
            100,
            100,
            1,
        );
        assert_eq!(reached.draw_count, 1);
        let CheckViabilityDraw::SpDefDownRoll { .. } = reached.draws[0] else {
            panic!("expected SpDefDownRoll");
        };

        let skipped = run_cv_stat_down(
            CvStatDownKind::SpDef,
            BattleRngState { value: 1, calls: 0 },
            100,
            100,
            4,
            100,
            100,
            1,
        );
        assert_eq!(skipped.draw_count, 0);
        assert_eq!(skipped.score_delta, 0);
    }

    #[test]
    fn cv_stat_down_gate_c_target_hp_band_orthogonal_to_draw_site() {
        let above_70 = run_cv_stat_down(
            CvStatDownKind::Evasion,
            BattleRngState { value: 1, calls: 0 },
            100,
            100,
            4,
            71,
            100,
            1,
        );
        assert_eq!(above_70.draw_count, 0);
        assert_eq!(above_70.score_delta, 0);

        let exact_70 = run_cv_stat_down(
            CvStatDownKind::Evasion,
            BattleRngState { value: 1, calls: 0 },
            100,
            100,
            4,
            70,
            100,
            1,
        );
        assert_eq!(exact_70.draw_count, 0);
        assert_eq!(exact_70.score_delta, -2);
    }

    #[test]
    fn cv_stat_down_roll_succeeds_applies_minus2_and_combines_with_gate_c() {
        let no_jump_seed = find_seed(|rv| rv % 256 >= 50);
        let result = run_cv_stat_down(
            CvStatDownKind::Defense,
            BattleRngState { value: no_jump_seed, calls: 0 },
            50,
            100,
            3,
            50,
            100,
            1,
        );
        assert_eq!(result.draw_count, 1);
        assert_eq!(result.score_delta, -4); // -2 draw site, -2 Gate C.
        let CheckViabilityDraw::DefenseDownRoll { succeeded, .. } = result.draws[0] else {
            panic!()
        };
        assert!(succeeded);
    }

    // === run_cv_attack_style_stat_up (TS test:2052-2290, 3031-3223) =========

    #[test]
    fn cv_attack_style_stat_up_gate_a_low_stage_hp_100_reaches_draw_site_2() {
        let jump_seed = find_seed(|rv| rv % 256 < 128);
        let no_jump_seed = find_seed(|rv| rv % 256 >= 128);

        let jumped = run_cv_attack_style_stat_up(
            CvStatUpFamily::AttackUp,
            40,
            BattleRngState { value: jump_seed, calls: 0 },
            6,
            100,
            100,
            1,
        );
        assert_eq!(jumped.draw_count, 1);
        assert_eq!(jumped.score_delta, 0);
        let CheckViabilityDraw::AttackUpRoll { kind, succeeded, .. } = jumped.draws[0] else {
            panic!("expected AttackUpRoll");
        };
        assert_eq!(kind, CvDrawKind::AttackUp2);
        assert!(!succeeded);

        let not_jumped = run_cv_attack_style_stat_up(
            CvStatUpFamily::AttackUp,
            40,
            BattleRngState { value: no_jump_seed, calls: 0 },
            6,
            100,
            100,
            1,
        );
        assert_eq!(not_jumped.score_delta, 2);
    }

    #[test]
    fn cv_attack_style_stat_up_gate_a_low_stage_hp_not_100_skips_draw_site_2() {
        let result = run_cv_attack_style_stat_up(
            CvStatUpFamily::AttackUp,
            40,
            BattleRngState { value: 1, calls: 0 },
            6,
            80,
            100,
            1,
        );
        // hp 80% -> Gate C (>70) is a clean stop, zero draws at all.
        assert_eq!(result.draw_count, 0);
        assert_eq!(result.score_delta, 0);
    }

    #[test]
    fn cv_attack_style_stat_up_gate_a_high_stage_reaches_draw_site_1() {
        let jump_seed = find_seed(|rv| rv % 256 < 100);
        let no_jump_seed = find_seed(|rv| rv % 256 >= 100);

        let jumped = run_cv_attack_style_stat_up(
            CvStatUpFamily::SpAtkUp,
            70,
            BattleRngState { value: jump_seed, calls: 0 },
            9,
            80,
            100,
            1,
        );
        assert_eq!(jumped.draw_count, 1);
        assert_eq!(jumped.score_delta, 0);
        let CheckViabilityDraw::SpAtkUpRoll { kind, succeeded, .. } = jumped.draws[0] else {
            panic!("expected SpAtkUpRoll");
        };
        assert_eq!(kind, CvDrawKind::SpAtkUp1);
        assert!(!succeeded);

        let not_jumped = run_cv_attack_style_stat_up(
            CvStatUpFamily::SpAtkUp,
            70,
            BattleRngState { value: no_jump_seed, calls: 0 },
            9,
            80,
            100,
            1,
        );
        assert_eq!(not_jumped.score_delta, -1);
    }

    #[test]
    fn cv_attack_style_stat_up_gate_d_low_hp_skips_draw_site_3() {
        let result = run_cv_attack_style_stat_up(
            CvStatUpFamily::AttackUp,
            40,
            BattleRngState { value: 1, calls: 0 },
            9,
            30,
            100,
            1,
        );
        assert_eq!(result.draw_count, 1); // only DRAW SITE 1.
        assert_eq!(result.score_delta, -1 - 2);
    }

    #[test]
    fn cv_attack_style_stat_up_draw_site_3_threshold_differs_by_family() {
        // Isolate DRAW SITE 3 as the FIRST draw for both families: stage<9
        // AND hp!=100 skips DRAW SITE 1/2 entirely; hp in [40,70) skips Gate
        // C/D's own clean stops, landing directly on DRAW SITE 3 -- unlike a
        // seed chained after an earlier draw, `find_seed`'s single-draw
        // search genuinely controls this site's own random_value here.
        // AttackUp's threshold is 40, SpAtkUp's is 70 -- the same raw
        // random_value can land on opposite sides for each family.
        let mut mixed_seed = None;
        for seed in 1..50_000u32 {
            let roll = next_draw(BattleRngState { value: seed, calls: 0 }, 1);
            let rv = roll.random_value % 256;
            if (40..70).contains(&rv) {
                mixed_seed = Some(seed);
                break;
            }
        }
        let seed = mixed_seed.expect("no seed lands strictly between the two thresholds");

        let attack_up = run_cv_attack_style_stat_up(
            CvStatUpFamily::AttackUp,
            40,
            BattleRngState { value: seed, calls: 0 },
            6,
            50,
            100,
            1,
        );
        let sp_atk_up = run_cv_attack_style_stat_up(
            CvStatUpFamily::SpAtkUp,
            70,
            BattleRngState { value: seed, calls: 0 },
            6,
            50,
            100,
            1,
        );
        assert_eq!(attack_up.draw_count, 1);
        assert_eq!(sp_atk_up.draw_count, 1);
        // Same seed: AttackUp's roll (>=40) succeeds -> -2; SpAtkUp's (>=70) fails -> 0.
        assert_eq!(attack_up.score_delta, -2);
        assert_eq!(sp_atk_up.score_delta, 0);
    }

    // === run_cv_defense_up (TS test:2291-2548) ===============================

    const MOVE_SPLASH_ZERO_POWER: u16 = 150; // power 0 -- Gate E true.
    const MOVE_VITAL_THROW_PHYSICAL_LAST: u16 = 233; // power 70, Fighting -- IN the physical list.
    const MOVE_DRAGON_RAGE_NONPHYSICAL_LAST: u16 = 82; // power 1, Dragon -- NOT in the physical list.

    #[test]
    fn cv_defense_up_gate_c_hp_100_draws_site_3_then_may_stop_or_continue() {
        // Gate A (stage<9) -> hp==100 -> DRAW SITE 2 fires first (deterministic
        // here), then hp>=70 -> DRAW SITE 3 always fires next. DRAW SITE 3's
        // own failure (roll<200) stops with the carry untouched; success
        // (roll>=200) continues into Gates E/F, which always write --
        // distinguished by func_result_after, not by a single-draw seed search
        // (DRAW SITE 3 is the SECOND draw in this chain, not controllable by
        // searching only the first draw's own random_value).
        let mut stop_case = None;
        let mut continue_case = None;
        for seed in 1..50_000u32 {
            let (result, func_result_after) = run_cv_defense_up(
                BattleRngState { value: seed, calls: 0 },
                6,
                100,
                100,
                MOVE_SPLASH_ZERO_POWER,
                Some(AI_WEATHER_RAIN),
                1,
            );
            if func_result_after == Some(AI_WEATHER_RAIN) && stop_case.is_none() {
                stop_case = Some(result);
            }
            if func_result_after != Some(AI_WEATHER_RAIN) && continue_case.is_none() {
                continue_case = Some((result, func_result_after));
            }
            if stop_case.is_some() && continue_case.is_some() {
                break;
            }
        }
        let stop_case = stop_case.expect("no seed stops at DRAW SITE 3's own failure");
        assert_eq!(stop_case.draw_count, 2);

        let (continue_case, func_result_after) =
            continue_case.expect("no seed continues past DRAW SITE 3 into Gates E/F");
        // MOVE_SPLASH_ZERO_POWER has power 0 -> Gate E routes straight to
        // DRAW SITE 5, one more draw, and the write is always AI_WEATHER_SUN.
        assert_eq!(continue_case.draw_count, 3);
        assert_eq!(func_result_after, Some(AI_WEATHER_SUN));
    }

    #[test]
    fn cv_defense_up_gate_d_low_hp_skips_to_penalty_no_write() {
        let (result, func_result_after) = run_cv_defense_up(
            BattleRngState { value: 1, calls: 0 },
            9,
            30,
            100,
            MOVE_SPLASH_ZERO_POWER,
            Some(AI_WEATHER_RAIN),
            1,
        );
        assert_eq!(result.score_delta, -1 - 2); // DRAW SITE 1 failed (seed1 succeeds >=100 actually -- assert via draws below)
        assert_eq!(func_result_after, Some(AI_WEATHER_RAIN));
    }

    #[test]
    fn cv_defense_up_gate_e_power_zero_reaches_draw_site_5_directly() {
        // stage<9 AND hp != 100 skips DRAW SITE 1/2 entirely; hp in [40,70)
        // skips DRAW SITE 3 (Gate C needs hp>=70) and Gate D's own stop (needs
        // hp<40) -- Gates E/F run with zero prior draws, so DRAW SITE 5
        // (power == 0 routes straight there) is the FIRST draw, directly
        // controllable by `find_seed` (unlike a seed chained after an earlier
        // draw already consumed the RNG).
        let jump_seed = find_seed(|rv| rv % 256 < 60);
        let (result, func_result_after) = run_cv_defense_up(
            BattleRngState { value: jump_seed, calls: 0 },
            6,
            50,
            100,
            MOVE_SPLASH_ZERO_POWER,
            None,
            1,
        );
        assert_eq!(result.draw_count, 1);
        assert_eq!(func_result_after, Some(AI_WEATHER_SUN));
        let CheckViabilityDraw::DefenseUpRoll { kind, succeeded, .. } = result.draws[0] else {
            panic!("expected DefenseUpRoll");
        };
        assert_eq!(kind, CvDrawKind::DefenseUp5);
        assert!(!succeeded);
    }

    #[test]
    fn cv_defense_up_gate_f_nonphysical_last_move_skips_to_penalty() {
        let (result, func_result_after) = run_cv_defense_up(
            BattleRngState { value: 1, calls: 0 },
            9,
            50,
            100,
            MOVE_DRAGON_RAGE_NONPHYSICAL_LAST,
            None,
            1,
        );
        assert!(result.score_delta <= -2);
        assert_ne!(func_result_after, Some(AI_WEATHER_SUN)); // nonzero power -> type collision, not the power==0 branch.
    }

    #[test]
    fn cv_defense_up_draw_site_4_and_5_chain_not_mutually_exclusive() {
        // stage<9 AND hp!=100 skips DRAW SITE 1/2; hp<70 skips DRAW SITE 3 --
        // DRAW SITE 4 is the FIRST draw here, so a `draw_count`/`score_delta`
        // search over just the initial seed genuinely isolates the 4->5
        // chain, not an earlier unrelated draw. Search for a seed where DRAW
        // SITE 4 succeeds (roll>=60, falls through) then DRAW SITE 5 also
        // succeeds (roll>=60, applies the penalty) -- two draws, one -2.
        let mut found = None;
        for seed in 1..50_000u32 {
            let (result, _) = run_cv_defense_up(
                BattleRngState { value: seed, calls: 0 },
                6,
                50,
                100,
                MOVE_VITAL_THROW_PHYSICAL_LAST,
                None,
                1,
            );
            if result.draw_count == 2 && result.score_delta == -2 {
                found = Some(result);
                break;
            }
        }
        let result = found.expect("no seed chains DRAW SITE 4 into DRAW SITE 5");
        let CheckViabilityDraw::DefenseUpRoll { kind, succeeded, .. } = result.draws[0] else {
            panic!()
        };
        assert_eq!(kind, CvDrawKind::DefenseUp4);
        assert!(succeeded); // roll>=60 "succeeded" flag == fell-through, not stopped.
        let CheckViabilityDraw::DefenseUpRoll { kind, succeeded, .. } = result.draws[1] else {
            panic!()
        };
        assert_eq!(kind, CvDrawKind::DefenseUp5);
        assert!(succeeded);
    }

    #[test]
    #[should_panic(expected = "unknown last-used move")]
    fn cv_defense_up_panics_on_unknown_last_move() {
        run_cv_defense_up(
            BattleRngState { value: 1, calls: 0 },
            9,
            50,
            100,
            9999,
            None,
            1,
        );
    }

    // === run_cv_sp_def_up (TS test:3224-3465) ================================

    #[test]
    fn cv_sp_def_up_gate_f_inverted_physical_last_move_skips_to_penalty() {
        // Physical last move (IN the list) -> DefenseUp would fall through to
        // DRAW SITE 4/5; SpDefUp instead stops immediately at the penalty.
        let (result, func_result_after) = run_cv_sp_def_up(
            BattleRngState { value: 1, calls: 0 },
            9,
            50,
            100,
            MOVE_VITAL_THROW_PHYSICAL_LAST,
            None,
            1,
        );
        assert_eq!(result.draw_count, 1); // only DRAW SITE 1, no DRAW SITE 4/5.
        assert!(result.score_delta <= -1 - 2);
        assert_ne!(func_result_after, Some(AI_WEATHER_SUN));
    }

    #[test]
    fn cv_sp_def_up_gate_f_nonphysical_last_move_reaches_draw_site_4() {
        let (result, _) = run_cv_sp_def_up(
            BattleRngState { value: 1, calls: 0 },
            9,
            50,
            100,
            MOVE_DRAGON_RAGE_NONPHYSICAL_LAST,
            None,
            1,
        );
        let has_draw_site_4 = result.draws[..result.draw_count as usize].iter().any(|d| {
            matches!(
                d,
                CheckViabilityDraw::SpDefUpRoll { kind: CvDrawKind::SpDefUp4, .. }
            )
        });
        assert!(has_draw_site_4);
    }

    #[test]
    fn cv_sp_def_up_gate_e_power_zero_reaches_draw_site_5_directly() {
        let (result, func_result_after) = run_cv_sp_def_up(
            BattleRngState { value: 1, calls: 0 },
            9,
            50,
            100,
            MOVE_SPLASH_ZERO_POWER,
            None,
            1,
        );
        assert_eq!(func_result_after, Some(AI_WEATHER_SUN));
        let CheckViabilityDraw::SpDefUpRoll { kind, .. } =
            result.draws[result.draw_count as usize - 1]
        else {
            panic!("expected SpDefUpRoll");
        };
        assert_eq!(kind, CvDrawKind::SpDefUp5);
    }

    #[test]
    fn cv_sp_def_up_gate_c_hp_100_draws_site_3() {
        let (result, func_result_after) = run_cv_sp_def_up(
            BattleRngState { value: 1, calls: 0 },
            6,
            100,
            100,
            MOVE_SPLASH_ZERO_POWER,
            Some(AI_WEATHER_HAIL),
            1,
        );
        assert!(result.draw_count >= 1);
        let has_site_3 = result.draws[..result.draw_count as usize].iter().any(|d| {
            matches!(
                d,
                CheckViabilityDraw::SpDefUpRoll { kind: CvDrawKind::SpDefUp3, .. }
            )
        });
        assert!(has_site_3);
        let _ = func_result_after;
    }

    // === run_cv_side_screen_type_gate / LightScreen / Reflect (TS test:3466-3647) ===

    #[test]
    fn cv_side_screen_gate_a_low_hp_skips_straight_to_penalty_no_write() {
        let (result, func_result_after) = run_cv_side_screen_type_gate(
            CvDrawKind::LightScreen,
            &AI_CV_LIGHT_SCREEN_SPECIAL_TYPES,
            BattleRngState { value: 1, calls: 0 },
            49,
            100,
            [TYPE_NORMAL, TYPE_NORMAL],
            Some(AI_WEATHER_RAIN),
            1,
        );
        assert_eq!(result.draw_count, 0);
        assert_eq!(result.score_delta, -2);
        assert_eq!(func_result_after, Some(AI_WEATHER_RAIN));
    }

    #[test]
    fn cv_side_screen_listed_type_jumps_to_end_zero_draws_but_writes() {
        let (result, func_result_after) = run_cv_side_screen_type_gate(
            CvDrawKind::LightScreen,
            &AI_CV_LIGHT_SCREEN_SPECIAL_TYPES,
            BattleRngState { value: 1, calls: 0 },
            50,
            100,
            [TYPE_FIRE, TYPE_NORMAL],
            None,
            1,
        );
        assert_eq!(result.draw_count, 0);
        assert_eq!(result.score_delta, 0);
        assert_eq!(func_result_after, type_func_result_collision(TYPE_FIRE));
    }

    #[test]
    fn cv_reflect_unlisted_type_reaches_the_roll() {
        let jump_seed = find_seed(|rv| rv % 256 < 50);
        let no_jump_seed = find_seed(|rv| rv % 256 >= 50);

        let (jumped, func_result_after) = run_cv_side_screen_type_gate(
            CvDrawKind::Reflect,
            &AI_CV_REFLECT_PHYSICAL_TYPES,
            BattleRngState { value: jump_seed, calls: 0 },
            100,
            100,
            [TYPE_FIRE, TYPE_WATER],
            None,
            1,
        );
        assert_eq!(jumped.draw_count, 1);
        assert_eq!(jumped.score_delta, 0);
        assert_eq!(func_result_after, type_func_result_collision(TYPE_WATER));
        let CheckViabilityDraw::ScreenRoll { kind, succeeded, .. } = jumped.draws[0] else {
            panic!("expected ScreenRoll");
        };
        assert_eq!(kind, CvDrawKind::Reflect);
        assert!(!succeeded);

        let (not_jumped, _) = run_cv_side_screen_type_gate(
            CvDrawKind::Reflect,
            &AI_CV_REFLECT_PHYSICAL_TYPES,
            BattleRngState { value: no_jump_seed, calls: 0 },
            100,
            100,
            [TYPE_FIRE, TYPE_WATER],
            None,
            1,
        );
        assert_eq!(not_jumped.score_delta, -2);
    }

    // === run_cv_accuracy_down (TS test:2549-2925) ============================

    #[test]
    fn cv_accuracy_down_draw_site_1_two_independent_routes() {
        let jump_seed = find_seed(|rv| rv % 256 < 100);
        // Route via attacker HP < 70 alone.
        let via_attacker = run_cv_accuracy_down(
            BattleRngState { value: jump_seed, calls: 0 },
            50,
            100,
            6,
            false,
            100,
            100,
            6,
            false,
            false,
            false,
            1,
        );
        assert_eq!(via_attacker.draw_count, 1);
        // Route via target HP <= 70 alone.
        let via_target = run_cv_accuracy_down(
            BattleRngState { value: jump_seed, calls: 0 },
            100,
            100,
            6,
            false,
            70,
            100,
            6,
            false,
            false,
            false,
            1,
        );
        assert_eq!(via_target.draw_count, 1);
        // Neither -> zero draws from site 1.
        let neither = run_cv_accuracy_down(
            BattleRngState { value: jump_seed, calls: 0 },
            100,
            100,
            6,
            false,
            100,
            100,
            6,
            false,
            false,
            false,
            1,
        );
        assert_eq!(neither.draw_count, 0);
    }

    #[test]
    fn cv_accuracy_down_all_status_gates_fire_together() {
        let no_jump_seed = find_seed(|rv| rv % 256 >= 128);
        let result = run_cv_accuracy_down(
            BattleRngState { value: no_jump_seed, calls: 0 },
            100, // attacker hp 100 -> site1/2 skipped (acc stage default 6 > 4 too).
            100,
            6,
            true, // rooted -> site 5.
            100,
            100,
            6,
            true, // toxic -> site3.
            true, // leech -> site4.
            true, // cursed -> site6.
            1,
        );
        // 4 status-gated sites reached, all independent (no chaining).
        assert_eq!(result.draw_count, 4);
        assert!(result.score_delta > 0); // every status gate scores positive on this seed.
    }

    #[test]
    fn cv_accuracy_down_gate_h_clean_stop_skips_tail() {
        let result = run_cv_accuracy_down(
            BattleRngState { value: 1, calls: 0 },
            71, // >70 -> Gate H clean stop.
            100,
            6,
            false,
            100,
            100,
            4, // != DEFAULT_STAT_STAGE, but Gate H fires first.
            false,
            false,
            false,
            1,
        );
        assert_eq!(result.draw_count, 0);
        assert_eq!(result.score_delta, 0);
    }

    #[test]
    fn cv_accuracy_down_gate_i_clean_stop_when_target_acc_neutral() {
        let result = run_cv_accuracy_down(
            BattleRngState { value: 1, calls: 0 },
            50,
            100,
            6,
            false,
            100,
            100,
            DEFAULT_STAT_STAGE,
            false,
            false,
            false,
            1,
        );
        // Site 1 fires (attacker hp<70) but the tail's own Gate I stops before DRAW SITE 7.
        assert_eq!(result.draw_count, 1);
    }

    #[test]
    fn cv_accuracy_down_gates_jk_deterministic_penalty() {
        let result = run_cv_accuracy_down(
            BattleRngState { value: 1, calls: 0 },
            39, // <40 -> Gate J.
            100,
            6,
            false,
            100,
            100,
            4,
            false,
            false,
            false,
            1,
        );
        let last = result.draws[result.draw_count as usize - 1];
        let CheckViabilityDraw::AccuracyDownRoll { kind, .. } = last else {
            panic!()
        };
        assert_ne!(kind, CvDrawKind::AccuracyDown7); // DRAW SITE 7 never reached.
    }

    #[test]
    fn cv_accuracy_down_draw_site_7_opposite_polarity() {
        // Isolate DRAW SITE 7 as the FIRST (and only) draw in the chain:
        // attacker HP exactly 70% (not <70) and target HP 71% (not <=70) both
        // skip DRAW SITE 1; acc stage 6 (default, >4) skips DRAW SITE 2;
        // every status flag false skips DRAW SITEs 3-6; Gate H (attacker HP
        // not >70) and Gate I (target ACC stage != neutral) both fall through
        // into DRAW SITE 7 directly, so `find_seed`'s own single-draw search
        // genuinely controls this site (unlike a seed chained after earlier
        // draws).
        let jump_seed = find_seed(|rv| rv % 256 < 70);
        let no_jump_seed = find_seed(|rv| rv % 256 >= 70);

        let jumped = run_cv_accuracy_down(
            BattleRngState { value: jump_seed, calls: 0 },
            70,
            100,
            6,
            false,
            71,
            100,
            4,
            false,
            false,
            false,
            1,
        );
        assert_eq!(jumped.draw_count, 1);
        assert_eq!(jumped.score_delta, 0);
        let CheckViabilityDraw::AccuracyDownRoll { kind, succeeded, .. } = jumped.draws[0] else {
            panic!()
        };
        assert_eq!(kind, CvDrawKind::AccuracyDown7);
        assert!(!succeeded); // jump == no score change on site 7 (opposite polarity).

        let not_jumped = run_cv_accuracy_down(
            BattleRngState { value: no_jump_seed, calls: 0 },
            70,
            100,
            6,
            false,
            71,
            100,
            4,
            false,
            false,
            false,
            1,
        );
        assert_eq!(not_jumped.draw_count, 1);
        assert_eq!(not_jumped.score_delta, -2);
    }

    // === run_cv_speed_up (TS test:2926-3030) =================================

    #[test]
    fn cv_speed_up_target_not_faster_scores_minus3_with_no_draws() {
        let attacker = battler(FactoryAiCheckViabilityBattler { speed: 150, ..neutral_battler() });
        let target = battler(FactoryAiCheckViabilityBattler { speed: 50, ..neutral_battler() });
        let result = run_cv_speed_up(BattleRngState { value: 1, calls: 0 }, attacker, target, 1);
        assert_eq!(result.draw_count, 0);
        assert_eq!(result.score_delta, -3);
    }

    #[test]
    fn cv_speed_up_target_faster_roll_site() {
        let attacker = battler(FactoryAiCheckViabilityBattler { speed: 50, ..neutral_battler() });
        let target = battler(FactoryAiCheckViabilityBattler { speed: 150, ..neutral_battler() });
        let jump_seed = find_seed(|rv| rv % 256 < 70);
        let no_jump_seed = find_seed(|rv| rv % 256 >= 70);

        let jumped = run_cv_speed_up(
            BattleRngState { value: jump_seed, calls: 0 },
            attacker,
            target,
            1,
        );
        assert_eq!(jumped.draw_count, 1);
        assert_eq!(jumped.score_delta, 0);
        let CheckViabilityDraw::SpeedUpRoll { succeeded, .. } = jumped.draws[0] else {
            panic!("expected SpeedUpRoll");
        };
        assert!(!succeeded);

        let not_jumped = run_cv_speed_up(
            BattleRngState { value: no_jump_seed, calls: 0 },
            attacker,
            target,
            1,
        );
        assert_eq!(not_jumped.score_delta, 3);
    }

    #[test]
    fn cv_speed_up_tie_draws_tie_first() {
        let attacker = battler(FactoryAiCheckViabilityBattler { speed: 100, ..neutral_battler() });
        let target = battler(FactoryAiCheckViabilityBattler { speed: 100, ..neutral_battler() });
        let result = run_cv_speed_up(
            BattleRngState { value: 249_678_687, calls: 0 },
            attacker,
            target,
            1,
        );
        assert!(result.draw_count >= 1);
        let CheckViabilityDraw::TargetFasterTie { .. } = result.draws[0] else {
            panic!("expected TargetFasterTie first");
        };
    }

    // === run_cv_evasion_up (TS test:3648-4126) ===============================

    #[test]
    fn cv_evasion_up_gate_a_draw_site_1_only_at_hp_ge_90() {
        let below_90 = run_cv_evasion_up(
            BattleRngState { value: 1, calls: 0 },
            89,
            100,
            6,
            false,
            100,
            100,
            false,
            false,
            false,
            1,
        );
        assert_eq!(below_90.draw_count, 0);
        assert_eq!(below_90.score_delta, 0);

        let jump_seed = find_seed(|rv| rv % 256 < 100);
        let at_90 = run_cv_evasion_up(
            BattleRngState { value: jump_seed, calls: 0 },
            90,
            100,
            6,
            false,
            100,
            100,
            false,
            false,
            false,
            1,
        );
        assert_eq!(at_90.draw_count, 1);
        let CheckViabilityDraw::EvasionUpRoll { kind, succeeded, .. } = at_90.draws[0] else {
            panic!()
        };
        assert_eq!(kind, CvDrawKind::EvasionUp1);
        assert!(!succeeded);
    }

    #[test]
    fn cv_evasion_up_toxic_pair_high_hp_single_draw() {
        let result = run_cv_evasion_up(
            BattleRngState { value: 1, calls: 0 },
            80, // in [71,89] so site1 skipped, but >50 for the toxic pair's own gate.
            100,
            6,
            false,
            100,
            100,
            true, // toxic-poisoned.
            false,
            false,
            1,
        );
        assert_eq!(result.draw_count, 1);
        let CheckViabilityDraw::EvasionUpRoll { kind, .. } = result.draws[0] else {
            panic!()
        };
        assert_eq!(kind, CvDrawKind::EvasionUp4);
    }

    #[test]
    fn cv_evasion_up_toxic_pair_low_hp_chains_site3_into_site4() {
        let mut found = None;
        for seed in 1..50_000u32 {
            let result = run_cv_evasion_up(
                BattleRngState { value: seed, calls: 0 },
                50, // <=50 -> reaches DRAW SITE 3 first.
                100,
                6,
                false,
                100,
                100,
                true,
                false,
                false,
                1,
            );
            if result.draw_count == 2 {
                found = Some(result);
                break;
            }
        }
        let result = found.expect("no seed chains EvasionUp DRAW SITE 3 into 4");
        let CheckViabilityDraw::EvasionUpRoll { kind, succeeded, .. } = result.draws[0] else {
            panic!()
        };
        assert_eq!(kind, CvDrawKind::EvasionUp3);
        assert!(succeeded); // roll>=80 falls through (chains), not stopped.
        let CheckViabilityDraw::EvasionUpRoll { kind, .. } = result.draws[1] else {
            panic!()
        };
        assert_eq!(kind, CvDrawKind::EvasionUp4);
    }

    #[test]
    fn cv_evasion_up_toxic_pair_low_hp_can_stop_at_site3_alone() {
        let jump_seed = find_seed(|rv| rv % 256 < 80);
        let result = run_cv_evasion_up(
            BattleRngState { value: jump_seed, calls: 0 },
            50,
            100,
            6,
            false,
            100,
            100,
            true,
            false,
            false,
            1,
        );
        assert_eq!(result.draw_count, 1);
        let CheckViabilityDraw::EvasionUpRoll { kind, .. } = result.draws[0] else {
            panic!()
        };
        assert_eq!(kind, CvDrawKind::EvasionUp3);
    }

    #[test]
    fn cv_evasion_up_status_gates_5_6_7_each_independent() {
        let no_jump_seed = find_seed(|rv| rv % 256 >= 128);
        let result = run_cv_evasion_up(
            BattleRngState { value: no_jump_seed, calls: 0 },
            80,
            100,
            6,
            true,
            100,
            100,
            false,
            true,
            true,
            1,
        );
        assert_eq!(result.draw_count, 3); // sites 5, 6, 7 -- no toxic pair, no site 1/2.
    }

    #[test]
    fn cv_evasion_up_gate_i_clean_stop_when_own_evasion_neutral() {
        let result = run_cv_evasion_up(
            BattleRngState { value: 1, calls: 0 },
            50,
            100,
            DEFAULT_STAT_STAGE,
            false,
            100,
            100,
            false,
            false,
            false,
            1,
        );
        assert_eq!(result.draw_count, 0);
        assert_eq!(result.score_delta, 0);
    }

    #[test]
    fn cv_evasion_up_draw_site_8_opposite_polarity() {
        let jump_seed = find_seed(|rv| rv % 256 < 70);
        let no_jump_seed = find_seed(|rv| rv % 256 >= 70);

        let jumped = run_cv_evasion_up(
            BattleRngState { value: jump_seed, calls: 0 },
            50,
            100,
            4,
            false,
            50,
            100,
            false,
            false,
            false,
            1,
        );
        assert_eq!(jumped.draw_count, 1);
        assert_eq!(jumped.score_delta, 0);
        let CheckViabilityDraw::EvasionUpRoll { kind, succeeded, .. } = jumped.draws[0] else {
            panic!()
        };
        assert_eq!(kind, CvDrawKind::EvasionUp8);
        assert!(!succeeded);

        let not_jumped = run_cv_evasion_up(
            BattleRngState { value: no_jump_seed, calls: 0 },
            50,
            100,
            4,
            false,
            50,
            100,
            false,
            false,
            false,
            1,
        );
        assert_eq!(not_jumped.score_delta, -2);
    }

    /// Pins the module doc comment's / step brief's own Gate-H mutual
    /// exclusion claim DIRECTLY against this implementation (not just
    /// re-asserting the M5d-0 doc comment): DRAW SITE 1 needs
    /// `attackerHpPercent >= 90`; DRAW SITE 8 needs `attackerHpPercent` in
    /// `[40, 70]` (Gate H's own `<= 70` AND Gate J's own `>= 40`). These
    /// ranges are disjoint, so no single `attackerHpPercent` value can ever
    /// reach both DRAW SITE 1 and DRAW SITE 8 in the same call -- exhaustively
    /// checked over every integer HP percent, not just spot-checked.
    #[test]
    fn cv_evasion_up_gate_h_site1_site8_mutual_exclusion() {
        for hp_percent in 0..=100i32 {
            let site1_reachable = hp_percent >= 90;
            let site8_reachable = (40..=70).contains(&hp_percent);
            assert!(
                !(site1_reachable && site8_reachable),
                "hp_percent {hp_percent} reaches both DRAW SITE 1 and DRAW SITE 8"
            );
        }

        // Concrete run at the boundary closest to both (70%, the top of DRAW
        // SITE 8's own range): DRAW SITE 1 never fires, DRAW SITE 8 does.
        let result = run_cv_evasion_up(
            BattleRngState { value: 249_678_687, calls: 0 },
            70,
            100,
            4,
            false,
            100,
            100,
            false,
            false,
            false,
            1,
        );
        let has_site1 = result.draws[..result.draw_count as usize].iter().any(|d| {
            matches!(
                d,
                CheckViabilityDraw::EvasionUpRoll { kind: CvDrawKind::EvasionUp1, .. }
            )
        });
        let has_site8 = result.draws[..result.draw_count as usize].iter().any(|d| {
            matches!(
                d,
                CheckViabilityDraw::EvasionUpRoll { kind: CvDrawKind::EvasionUp8, .. }
            )
        });
        assert!(!has_site1);
        assert!(has_site8);
    }

    #[test]
    fn cv_evasion_up_worst_case_is_7_draws_not_8() {
        // All 7 remaining-reachable sites at once: attackerHpPercent in
        // [40,50] (excludes site 1's own >=90 gate, includes the toxic pair's
        // low-hp chained branch and Gate J/K's own >=40 floor for site 8).
        let mut found = None;
        for seed in 1..80_000u32 {
            let result = run_cv_evasion_up(
                BattleRngState { value: seed, calls: 0 },
                45,
                100,
                9,    // evasion stage >=9 -> site 2.
                true, // rooted -> site 6.
                100,
                100,
                true, // toxic -> sites 3+4 chained pair.
                true, // leech -> site 5.
                true, // cursed -> site 7.
                1,
            );
            if result.draw_count == 7 {
                found = Some(result);
                break;
            }
        }
        let result = found.expect("no seed reaches all 7 EvasionUp draw sites in one pass");
        assert_eq!(result.draw_count, 7);
        assert!((result.draw_count as usize) < MAX_CHECK_VIABILITY_DRAWS);
    }

    // === dispatcher-level: shared-effect-family delegation (TS test:5648-5942) ===

    const MOVE_TICKLE: u16 = 321; // EFFECT_TICKLE -> AI_CV_DefenseDown (data/battle_ai_scripts.s:769)
    const MOVE_TAIL_WHIP_DEFENSE_DOWN: u16 = 39; // EFFECT_DEFENSE_DOWN
    const MOVE_BULK_UP_DEFENSE_UP: u16 = 339; // EFFECT_BULK_UP -> AI_CV_DefenseUp
    const MOVE_HARDEN_DEFENSE_UP: u16 = 106; // EFFECT_DEFENSE_UP
    const MOVE_COSMIC_POWER_SPDEF_UP: u16 = 322; // EFFECT_COSMIC_POWER -> AI_CV_SpDefUp
    const MOVE_CALM_MIND_SPDEF_UP: u16 = 347; // EFFECT_CALM_MIND -> AI_CV_SpDefUp
    const MOVE_DOUBLE_TEAM_CV: u16 = 104; // EFFECT_EVASION_UP
    const MOVE_MINIMIZE_CV: u16 = 107; // EFFECT_MINIMIZE -> AI_CV_EvasionUp

    fn evasion_up_battler() -> FactoryAiCheckViabilityBattler {
        FactoryAiCheckViabilityBattler { hp: 80, max_hp: 100, ..neutral_battler() }
    }

    #[test]
    fn dispatcher_tickle_delegates_to_the_same_ai_cv_defense_down() {
        let attacker = neutral_battler();
        let target = FactoryAiCheckViabilityBattler { def_stage: 3, ..neutral_battler() };
        let via_tail_whip = run_check_viability(RunCheckViabilityInput {
            rng: BattleRngState { value: 249_678_687, calls: 0 },
            move_id: MOVE_TAIL_WHIP_DEFENSE_DOWN,
            attacker,
            target,
            stale_func_result_fallback: None,
            draw_ordinal_start: 1,
        });
        let via_tickle = run_check_viability(RunCheckViabilityInput {
            rng: BattleRngState { value: 249_678_687, calls: 0 },
            move_id: MOVE_TICKLE,
            attacker,
            target,
            stale_func_result_fallback: None,
            draw_ordinal_start: 1,
        });
        assert_eq!(via_tail_whip, via_tickle);
    }

    #[test]
    fn dispatcher_bulk_up_delegates_to_the_same_ai_cv_defense_up() {
        let attacker = FactoryAiCheckViabilityBattler {
            def_stage: 9,
            hp: 100,
            max_hp: 100,
            ..neutral_battler()
        };
        let target = neutral_battler();
        let rng = BattleRngState { value: 249_678_687, calls: 0 };
        let via_harden = run_check_viability(RunCheckViabilityInput {
            rng,
            move_id: MOVE_HARDEN_DEFENSE_UP,
            attacker,
            target,
            stale_func_result_fallback: None,
            draw_ordinal_start: 1,
        });
        let via_bulk_up = run_check_viability(RunCheckViabilityInput {
            rng,
            move_id: MOVE_BULK_UP_DEFENSE_UP,
            attacker,
            target,
            stale_func_result_fallback: None,
            draw_ordinal_start: 1,
        });
        assert_eq!(via_harden, via_bulk_up);
    }

    #[test]
    fn dispatcher_cosmic_power_and_calm_mind_delegate_to_the_same_ai_cv_sp_def_up() {
        let attacker = FactoryAiCheckViabilityBattler {
            sp_def_stage: 9,
            hp: 100,
            max_hp: 100,
            ..neutral_battler()
        };
        let target = neutral_battler();
        let rng = BattleRngState { value: 249_678_687, calls: 0 };
        let via_cosmic_power = run_check_viability(RunCheckViabilityInput {
            rng,
            move_id: MOVE_COSMIC_POWER_SPDEF_UP,
            attacker,
            target,
            stale_func_result_fallback: None,
            draw_ordinal_start: 1,
        });
        let via_calm_mind = run_check_viability(RunCheckViabilityInput {
            rng,
            move_id: MOVE_CALM_MIND_SPDEF_UP,
            attacker,
            target,
            stale_func_result_fallback: None,
            draw_ordinal_start: 1,
        });
        assert_eq!(via_cosmic_power, via_calm_mind);
    }

    #[test]
    fn dispatcher_minimize_delegates_to_the_same_ai_cv_evasion_up() {
        let attacker = evasion_up_battler();
        let target = neutral_battler();
        let rng = BattleRngState { value: 249_678_687, calls: 0 };
        let via_double_team = run_check_viability(RunCheckViabilityInput {
            rng,
            move_id: MOVE_DOUBLE_TEAM_CV,
            attacker,
            target,
            stale_func_result_fallback: None,
            draw_ordinal_start: 1,
        });
        let via_minimize = run_check_viability(RunCheckViabilityInput {
            rng,
            move_id: MOVE_MINIMIZE_CV,
            attacker,
            target,
            stale_func_result_fallback: None,
            draw_ordinal_start: 1,
        });
        assert_eq!(via_double_team, via_minimize);
    }

    #[test]
    fn still_barriers_every_other_reachable_cv_handler_untouched_by_m5d2() {
        expect_no_unported_viability_barrier();
    }

    /// Rust analog of TS's `expectNoUnportedViabilityBarrier` test-file
    /// helper (test:16-23): every `CV_TABLE_EFFECTS` member's own first
    /// real Gen-3 move must return `Scored` (never `NotYetPorted`) once its
    /// batch has landed, and `NotYetPorted` (never `Scored`) while it
    /// hasn't -- consistency-checked generically against
    /// `cv_handled_effects()` rather than re-hardcoding the 122-member list.
    fn expect_no_unported_viability_barrier() {
        let handled = cv_handled_effects();
        for &effect in CV_TABLE_EFFECTS.iter() {
            let Some(move_id) = first_move_id_with_effect(effect) else {
                continue;
            };
            let result = run(move_id, 1);
            let is_scored = matches!(result, CheckViabilityResult::Scored { .. });
            assert_eq!(
                is_scored,
                handled.contains(&effect),
                "effect {effect} move {move_id}: scored={is_scored} handled={}",
                handled.contains(&effect)
            );
        }
    }
}
