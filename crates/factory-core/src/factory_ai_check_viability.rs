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

use crate::damage_calc::{HOLD_EFFECT_NONE, TYPE_FIGHTING, TYPE_FLYING, TYPE_NORMAL, TYPE_POISON};
use crate::factory_ai_check_bad_move::{
    ability_id_in_weather_range, BattleRngState, AI_WEATHER_HAIL, AI_WEATHER_RAIN,
    AI_WEATHER_SANDSTORM, AI_WEATHER_SUN, EFFECT_ABSORB, EFFECT_ACCURACY_DOWN,
    EFFECT_ACCURACY_DOWN_2, EFFECT_ACCURACY_UP, EFFECT_ACCURACY_UP_2, EFFECT_ALWAYS_HIT,
    EFFECT_ATTACK_DOWN, EFFECT_ATTACK_DOWN_2, EFFECT_ATTACK_UP, EFFECT_ATTACK_UP_2,
    EFFECT_BATON_PASS, EFFECT_BELLY_DRUM, EFFECT_BIDE, EFFECT_BLAZE_KICK, EFFECT_BRICK_BREAK,
    EFFECT_BULK_UP, EFFECT_CALM_MIND, EFFECT_CONFUSE, EFFECT_CONVERSION, EFFECT_COSMIC_POWER,
    EFFECT_COUNTER, EFFECT_CURSE, EFFECT_DEFENSE_DOWN, EFFECT_DEFENSE_DOWN_2, EFFECT_DEFENSE_UP,
    EFFECT_DEFENSE_UP_2, EFFECT_DESTINY_BOND, EFFECT_DISABLE, EFFECT_DRAGON_DANCE,
    EFFECT_DREAM_EATER, EFFECT_ENCORE, EFFECT_ENDEAVOR, EFFECT_ENDURE, EFFECT_ERUPTION,
    EFFECT_EVASION_DOWN, EFFECT_EVASION_DOWN_2, EFFECT_EVASION_UP, EFFECT_EVASION_UP_2,
    EFFECT_EXPLOSION, EFFECT_FACADE, EFFECT_FAKE_OUT, EFFECT_FLAIL, EFFECT_FLATTER,
    EFFECT_FOCUS_PUNCH, EFFECT_FORESIGHT, EFFECT_HAIL, EFFECT_HAZE, EFFECT_HEAL_BELL,
    EFFECT_HIGH_CRITICAL, EFFECT_IMPRISON, EFFECT_KNOCK_OFF, EFFECT_LEECH_SEED,
    EFFECT_LIGHT_SCREEN, EFFECT_LOCK_ON, EFFECT_MAGIC_COAT, EFFECT_MEAN_LOOK, EFFECT_MEMENTO,
    EFFECT_MINIMIZE, EFFECT_MIRROR_COAT, EFFECT_MIRROR_MOVE, EFFECT_MOONLIGHT, EFFECT_MORNING_SUN,
    EFFECT_MUD_SPORT, EFFECT_OHKO, EFFECT_OVERHEAT, EFFECT_PAIN_SPLIT, EFFECT_PARALYZE,
    EFFECT_POISON, EFFECT_POISON_TAIL, EFFECT_PROTECT, EFFECT_PSYCH_UP, EFFECT_PURSUIT,
    EFFECT_RAIN_DANCE, EFFECT_RAZOR_WIND, EFFECT_RECHARGE, EFFECT_RECYCLE, EFFECT_REFLECT,
    EFFECT_REFRESH, EFFECT_REST, EFFECT_RESTORE_HP, EFFECT_REVENGE, EFFECT_ROAR, EFFECT_ROLE_PLAY,
    EFFECT_SEMI_INVULNERABLE, EFFECT_SKILL_SWAP, EFFECT_SKULL_BASH, EFFECT_SKY_ATTACK,
    EFFECT_SLEEP, EFFECT_SLEEP_TALK, EFFECT_SMELLINGSALT, EFFECT_SNATCH, EFFECT_SNORE,
    EFFECT_SOFTBOILED, EFFECT_SOLAR_BEAM, EFFECT_SPECIAL_ATTACK_DOWN, EFFECT_SPECIAL_ATTACK_DOWN_2,
    EFFECT_SPECIAL_ATTACK_UP, EFFECT_SPECIAL_ATTACK_UP_2, EFFECT_SPECIAL_DEFENSE_DOWN,
    EFFECT_SPECIAL_DEFENSE_DOWN_2, EFFECT_SPECIAL_DEFENSE_UP, EFFECT_SPECIAL_DEFENSE_UP_2,
    EFFECT_SPEED_DOWN, EFFECT_SPEED_DOWN_2, EFFECT_SPEED_DOWN_HIT, EFFECT_SPEED_UP,
    EFFECT_SPEED_UP_2, EFFECT_SPIT_UP, EFFECT_SUBSTITUTE, EFFECT_SUNNY_DAY, EFFECT_SUPERPOWER,
    EFFECT_SUPER_FANG, EFFECT_SWAGGER, EFFECT_SWALLOW, EFFECT_SYNTHESIS, EFFECT_THIEF,
    EFFECT_TICKLE, EFFECT_TOXIC, EFFECT_TRAP, EFFECT_TRICK, EFFECT_VITAL_THROW, EFFECT_WATER_SPORT,
};
use crate::gen_tables;
use crate::rng::advance_rng_value;

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

/// No batch has landed yet (M5d-0 is shared infra only) — empty union,
/// mirroring `CBM_HANDLED_EFFECTS_M5B1`'s shape one step before any CBM
/// batch existed.
#[must_use]
pub fn cv_handled_effects() -> Vec<u16> {
    Vec::new()
}

/// Direct port of the CBM precedent's `unported_cbm_table_effects`
/// (`factory_ai_check_bad_move.rs:648-662`): `CV_TABLE_EFFECTS` minus
/// `cv_handled_effects()`, sorted. Returns all 122 entries until M5d-1
/// lands.
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
#[allow(dead_code)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CvDrawKind {
    Rest1,
    Rest2,
    RestSnatch,
    RestTail,
    Pursuit,
    Sleep,
    Roar,
    Paralyze,
    CounterLowHp,
    CounterMidHp,
    CounterTaunt,
    CounterPhysical,
    CounterTargetType,
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
    Heal1,
    Heal2,
    Heal3,
    DestinyBond1,
    DestinyBond2,
    DestinyBond3,
    SelfKo1,
    SelfKo2,
    SelfKo3,
    SelfKo4,
    SelfKo5,
    Curse1,
    Curse2,
    Curse3,
    MirrorCoat1,
    MirrorCoat2,
    MirrorCoat3,
    MirrorCoat4,
    MirrorCoat5,
    MirrorCoat6,
    MirrorCoat7,
    DragonDance1,
    DragonDance2,
    FocusPunch1,
    FocusPunch2,
    KnockOff,
    MagicCoat1,
    MagicCoat2,
    MagicCoat3,
    Foresight1,
    Foresight2,
    Substitute1,
    Substitute2,
    Substitute3,
    Substitute4,
    LockOn,
    Imprison,
    Haze1,
    Haze2,
    Haze3,
    MirrorMove1,
    MirrorMove2,
    SpAtkDown1,
    SpAtkDown2,
    Snatch1,
    Snatch2,
    Snatch3,
    Snatch4,
    Snatch5,
}

/// Mirrors `FactoryAiCheckViabilityDraw` (`factoryAiCheckViability.ts
/// :441-1115`), **62 variants, one per TS union arm** (module doc
/// comment's design-decision note). `reason` dropped everywhere; the
/// literal `kind` tag dropped where the TS arm has only one `kind` value
/// (the variant name already identifies it) and kept as a `kind:
/// CvDrawKind` field where the TS arm's `kind` is itself a multi-name
/// union. Not constructed by this step except `DRAW_FILLER` below; scoped
/// `#[allow(dead_code)]` (module doc comment).
#[allow(dead_code)]
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
    ConfuseRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        jumped: bool,
    },
    SwaggerRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        jumped: bool,
    },
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
    RestRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        kind: CvDrawKind,
        succeeded: bool,
    },
    AbsorbRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        succeeded: bool,
    },
    EndureRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        succeeded: bool,
    },
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
    HealRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        kind: CvDrawKind,
        jumped: bool,
    },
    TrapRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        jumped: bool,
    },
    SemiInvulnerableRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        jumped: bool,
    },
    FlailRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        jumped: bool,
    },
    DestinyBondRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        kind: CvDrawKind,
        jumped: bool,
    },
    SelfKoRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        kind: CvDrawKind,
        jumped: bool,
    },
    CurseRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        kind: CvDrawKind,
        jumped: bool,
    },
    PsychUpRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        jumped: bool,
    },
    MirrorCoatRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        kind: CvDrawKind,
        jumped: bool,
    },
    DragonDanceRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        kind: CvDrawKind,
        succeeded: bool,
    },
    BatonPassRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        succeeded: bool,
    },
    FocusPunchKnockOffRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        kind: CvDrawKind,
        succeeded: bool,
    },
    RevengeRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        jumped: bool,
    },
    MagicCoatRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        kind: CvDrawKind,
        jumped: bool,
    },
    ForesightRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        kind: CvDrawKind,
        jumped: bool,
    },
    EncoreRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        jumped: bool,
    },
    ChangeSelfAbilityRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        jumped: bool,
    },
    TrickRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        jumped: bool,
    },
    SubstituteRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        kind: CvDrawKind,
        jumped: bool,
    },
    AccuracyUpRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        jumped: bool,
    },
    DisableRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        jumped: bool,
    },
    FlatterRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        jumped: bool,
    },
    LockOnImprisonRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        kind: CvDrawKind,
        jumped: bool,
    },
    ConversionRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        jumped: bool,
    },
    ThiefRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        jumped: bool,
    },
    HazeRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        kind: CvDrawKind,
        jumped: bool,
    },
    RecycleRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        jumped: bool,
    },
    SpitUpRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        jumped: bool,
    },
    MirrorMoveRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        kind: CvDrawKind,
        jumped: bool,
    },
    SpAtkDownRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        kind: CvDrawKind,
        succeeded: bool,
    },
    SnatchRoll {
        ordinal: u32,
        before: BattleRngState,
        after: BattleRngState,
        raw_rng_value: u32,
        random_value: u16,
        kind: CvDrawKind,
        jumped: bool,
    },
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

/// `AI_CheckViability` for one move slot — dispatch shell only
/// (`factoryAiCheckViability.ts:5463-5483` setup +
/// `:7202-7222` trailing barrier/fallthrough). Zero effect-specific `if`
/// blocks this step: every `CV_TABLE_EFFECTS` member routes straight to
/// `NotYetPorted`; every other effect scores 0 with the incoming
/// `funcResultCarry` passed straight through, matching TS's own "zero
/// handler dispatch is the ultimate writes-never case" fallthrough
/// (TS :7211-7214).
#[must_use]
pub fn run_check_viability(input: RunCheckViabilityInput) -> CheckViabilityResult {
    let move_row = gen_tables::MOVES.get(input.move_id as usize).unwrap_or_else(|| {
        panic!(
            "factory-ai-check-viability: unknown move {} (TS :5482 throws; gen_tables::MOVES is dense 0..355)",
            input.move_id
        )
    });
    // The incoming funcResult carry for THIS slot's own dispatch (TS
    // :5488) — with zero handlers landed, every path below either returns
    // it unchanged (the fallthrough) or abandons it entirely (the barrier,
    // which reports no score at all yet).
    let func_result_carry = input.stale_func_result_fallback;

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

#[cfg(test)]
mod tests {
    use super::*;
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
    fn barrier_fires_for_every_table_effects_first_move() {
        // Inverted vs TS's own `expectNoUnportedViabilityBarrier` (test
        // :16-23): TS is 122/122 handler-complete so every table effect's
        // first move scores; this Rust step ports zero handlers, so every
        // one instead hits NotYetPorted. Same dynamic-lookup shape as
        // CBM's `generic_barrier_fires_for_the_first_unported_table_effect`.
        let mut checked = 0;
        for &effect in CV_TABLE_EFFECTS.iter() {
            if let Some(move_id) = first_move_id_with_effect(effect) {
                assert_eq!(
                    run(move_id, 1),
                    CheckViabilityResult::NotYetPorted { effect, move_id },
                    "effect {effect} move {move_id}"
                );
                checked += 1;
            }
        }
        assert!(checked > 0);
    }

    // === completeness-probe machinery ========================================

    #[test]
    fn unported_is_all_122_effects_before_any_batch_lands() {
        assert!(cv_handled_effects().is_empty());
        assert_eq!(unported_cv_table_effects().len(), 122);
        assert_eq!(unported_cv_table_effects(), {
            let mut sorted = CV_TABLE_EFFECTS;
            sorted.sort_unstable();
            sorted
        });
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
}
