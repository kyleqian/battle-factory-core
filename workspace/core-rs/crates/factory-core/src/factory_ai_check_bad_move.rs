//! Pure port of `AI_CheckBadMove`'s universal preamble plus its M5b-1 batch
//! of per-effect handlers
//! (`src/engine/factoryAiCheckBadMove.ts:1-115,1259-1333,1338-1810,2076-2118,
//! 2410-2419,2639-2711,3158-3266,3286-3294,3311-3361`, itself a port of
//! `data/battle_ai_scripts.s:51-93` plus the handler bodies it dispatches
//! to). Per `docs/rust-m5b-checkbadmove-batching.md` §5 (M5b-0): setup +
//! `isMovePowerOther` classification, the FISSURE/HORN_DRILL short-circuit,
//! the type-immunity `Score_Minus10`, the five ability-negation branches
//! (Volt Absorb/Water Absorb/Flash Fire/Wonder Guard/Levitate), the
//! Soundproof nine-move list, and the trailing `if_effect` table barrier
//! (`NotYetPorted` for every table effect not yet in `cbm_handled_effects()`).
//! Per batching doc §2 "M5b-1": the 18-effect HighRiskForDamage cluster
//! (Counter/Flail/Mirror Coat/Focus Punch/Level Damage/Frustration/Return/
//! Recharge/Endeavor/Superpower/Razor Wind/Psywave/Low Kick/Super Fang/
//! Present/Sonic Boom/Bide/Skull Bash), Teleport, 8 zero-RNG single-flag
//! effects (Ingrain/Perish Song/Nightmare/Foresight/Spikes/Future Sight/
//! Focus Energy/Refresh), the weather quartet (Rain Dance/Sunny Day/Hail/
//! Sandstorm), and Magnitude — 32 effects total, `CBM_HANDLED_EFFECTS_M5B1`.
//! M5b-2/3 grow `cbm_handled_effects()` one batch at a time; every table
//! effect not yet in the union halts at the barrier, and every other move
//! (not in the table at all) scores 0 past the preamble.
//!
//! ## Representation decisions (mirroring `factory_ai_mask.rs`'s precedent)
//! - **Move effect**: TS compares `move.effect` (a string) to `"EFFECT_X"`
//!   literals; this module hand-writes an `EFFECT_*: u16` const block from
//!   `reference/pokeemerald/include/constants/battle_move_effects.h`'s own
//!   `#define`s (every value verified against the header directly, cited per
//!   line below) — the same numeric ids `gen_tables::MoveRow.effect` already
//!   carries (parsed from the same header at codegen time,
//!   `gen_tables.rs:11493-11503`).
//! - **Ability**: TS threads ability by string name
//!   (`"ABILITY_SHADOW_TAG"`, ...); this module threads ability by numeric id
//!   instead, hand-written from `src/data/gen/ability-item-hooks.json`
//!   `.universes.abilities` (verified against that JSON, not recalled — also
//!   matches `reference/pokeemerald/include/constants/abilities.h`'s own
//!   `#define` values). This is the *same* id space
//!   `gen_tables::SpeciesRow.abilities: [u16; 2]` already uses (that table is
//!   sourced from the same JSON universe), so `nextGetAbilityDraw`'s species
//!   lookup below reuses `gen_tables::species_row`/`SPECIES` directly with no
//!   translation layer, unlike TS's separate `species-stats.json`-backed
//!   `SPECIES_BY_ID` (which stores ability *names*, not ids, but resolves to
//!   the exact same values — verified: species 1 (Bulbasaur) has
//!   `ABILITY_OVERGROW` in `species-stats.json` and `abilities: [65, 0]` in
//!   `gen_tables::SPECIES`; `ability-item-hooks.json` gives
//!   `ABILITY_OVERGROW` id 65).
//! - **Type**: TS's local `TYPE_EFFECTIVENESS` re-embeds
//!   `type-effectiveness.json` with string type names; this module reuses
//!   `gen_tables::TYPE_EFFECTIVENESS_TABLE` (M4b-promoted, numeric
//!   `damage_calc::TYPE_*` ids) instead — no re-embedding.
//! - **RNG state**: `BattleRngState` (`battleDecisionBoundary.ts:103-106`,
//!   `{ value: number; calls: number }`) crosses as two `u32`s, defined
//!   locally below (the M5-scout boundary sketch: "no need to encode the
//!   rest of `battleDecisionBoundary.ts`'s boundary/event types").
//! - **Draw `reason`/`FactoryAiCheckBadMoveDraw.kind`**: TS's free-form
//!   `reason` string (`${reasonPrefix}-negates-type` / `${reasonPrefix}-
//!   soundproof`, built for human-readable receipts/UI) and constant
//!   `kind: "get-ability"` tag are dropped, same precedent as
//!   `factory_ai_mask.rs`'s dropped `id`/`condition`/`flags` strings — a
//!   `CheckBadMoveDrawSite` enum distinguishes each call site instead
//!   (extended by later batches per handler; M5b-1 adds
//!   `HighRiskForDamageAbility`/`MagnitudeLevitate`). `reasonPrefix` itself
//!   (a caller-supplied slot-numbering aid, not consumed by any branch) is
//!   dropped from the preamble's own input for the same reason; `ordinal`
//!   alone still numbers draws across a caller's multi-slot pass.
//! - **Draws/Result**: mirrors `factory_ai_mask.rs`'s fixed-array-plus-count
//!   receipt (`FactoryAiMaskSelectionReceipt.evaluations`/`evaluation_count`)
//!   — no heap `Vec` in `CheckBadMoveResult`. `MAX_CHECK_BAD_MOVE_DRAWS = 3`
//!   is the true worst case across the preamble plus every M5b-1 handler:
//!   Magnitude alone can produce 3 (the preamble's own soundproof draw +
//!   its own Levitate draw + the shared HighRiskForDamage body's ability
//!   draw, TS :3342,3352) — the preamble's own negates-type draw never
//!   co-occurs with a handler draw in this batch, since every M5b-1 effect
//!   with a handler-owned draw site (the HighRiskForDamage cluster,
//!   Magnitude) has power ≤1 or sits in `IGNORED_POWERFUL_MOVE_EFFECTS`,
//!   forcing `isMovePowerOther` true and skipping the negates-type block
//!   entirely (verified against `src/data/gen/moves.json` for all 18+1
//!   moves). Later batches that add per-handler draws on top of a
//!   negates-type-eligible move may need to widen this further.
//!
//! ## Scope NOT covered by this step
//! Every per-effect handler outside M5b-1's 32 (`AI_CBM_*`, TS
//! :787-1258,2652-3657) is unported. `run_check_bad_move_preamble`'s
//! trailing barrier returns `NotYetPorted` for the 77 `CBM_TABLE_EFFECTS`
//! members not yet in `cbm_handled_effects()`, and every other move (not in
//! the table at all) scores 0, matching TS's own "genuine, complete port of
//! that path" fallthrough (module doc comment :27-30).

use crate::damage_calc::{TYPE_ELECTRIC, TYPE_FIRE, TYPE_GROUND, TYPE_WATER};
use crate::gen_tables;
use crate::rng::advance_rng_value;

// === EFFECT_* move-effect ids ===============================================
//
// reference/pokeemerald/include/constants/battle_move_effects.h, verified
// against the header directly (each line cited below) — the 113 distinct
// `EFFECT_*` names this module's source (`src/engine/factoryAiCheckBadMove.ts`,
// full file, not just this step's preamble) references, out of the header's
// 214 total. "Only the effects this module's dispatch/table reads need
// consts; do them all at once anyway" per the batching doc — M5b-1/2/3 read
// the same consts, ported once here.

pub const EFFECT_SLEEP: u16 = 1; // battle_move_effects.h:5
pub const EFFECT_EXPLOSION: u16 = 7; // battle_move_effects.h:11
pub const EFFECT_DREAM_EATER: u16 = 8; // battle_move_effects.h:12
pub const EFFECT_ATTACK_UP: u16 = 10; // battle_move_effects.h:14
pub const EFFECT_DEFENSE_UP: u16 = 11; // battle_move_effects.h:15
pub const EFFECT_SPEED_UP: u16 = 12; // battle_move_effects.h:16
pub const EFFECT_SPECIAL_ATTACK_UP: u16 = 13; // battle_move_effects.h:17
pub const EFFECT_SPECIAL_DEFENSE_UP: u16 = 14; // battle_move_effects.h:18
pub const EFFECT_ACCURACY_UP: u16 = 15; // battle_move_effects.h:19
pub const EFFECT_EVASION_UP: u16 = 16; // battle_move_effects.h:20
pub const EFFECT_ATTACK_DOWN: u16 = 18; // battle_move_effects.h:22
pub const EFFECT_DEFENSE_DOWN: u16 = 19; // battle_move_effects.h:23
pub const EFFECT_SPEED_DOWN: u16 = 20; // battle_move_effects.h:24
pub const EFFECT_SPECIAL_ATTACK_DOWN: u16 = 21; // battle_move_effects.h:25
pub const EFFECT_SPECIAL_DEFENSE_DOWN: u16 = 22; // battle_move_effects.h:26
pub const EFFECT_ACCURACY_DOWN: u16 = 23; // battle_move_effects.h:27
pub const EFFECT_EVASION_DOWN: u16 = 24; // battle_move_effects.h:28
pub const EFFECT_HAZE: u16 = 25; // battle_move_effects.h:29
pub const EFFECT_BIDE: u16 = 26; // battle_move_effects.h:30
pub const EFFECT_ROAR: u16 = 28; // battle_move_effects.h:32
pub const EFFECT_TOXIC: u16 = 33; // battle_move_effects.h:37
pub const EFFECT_LIGHT_SCREEN: u16 = 35; // battle_move_effects.h:39
pub const EFFECT_OHKO: u16 = 38; // battle_move_effects.h:42
pub const EFFECT_RAZOR_WIND: u16 = 39; // battle_move_effects.h:43
pub const EFFECT_SUPER_FANG: u16 = 40; // battle_move_effects.h:44
pub const EFFECT_MIST: u16 = 46; // battle_move_effects.h:50
pub const EFFECT_FOCUS_ENERGY: u16 = 47; // battle_move_effects.h:51
pub const EFFECT_CONFUSE: u16 = 49; // battle_move_effects.h:53
pub const EFFECT_ATTACK_UP_2: u16 = 50; // battle_move_effects.h:54
pub const EFFECT_DEFENSE_UP_2: u16 = 51; // battle_move_effects.h:55
pub const EFFECT_SPEED_UP_2: u16 = 52; // battle_move_effects.h:56
pub const EFFECT_SPECIAL_ATTACK_UP_2: u16 = 53; // battle_move_effects.h:57
pub const EFFECT_SPECIAL_DEFENSE_UP_2: u16 = 54; // battle_move_effects.h:58
pub const EFFECT_ACCURACY_UP_2: u16 = 55; // battle_move_effects.h:59
pub const EFFECT_EVASION_UP_2: u16 = 56; // battle_move_effects.h:60
pub const EFFECT_ATTACK_DOWN_2: u16 = 58; // battle_move_effects.h:62
pub const EFFECT_DEFENSE_DOWN_2: u16 = 59; // battle_move_effects.h:63
pub const EFFECT_SPEED_DOWN_2: u16 = 60; // battle_move_effects.h:64
pub const EFFECT_SPECIAL_ATTACK_DOWN_2: u16 = 61; // battle_move_effects.h:65
pub const EFFECT_SPECIAL_DEFENSE_DOWN_2: u16 = 62; // battle_move_effects.h:66
pub const EFFECT_ACCURACY_DOWN_2: u16 = 63; // battle_move_effects.h:67
pub const EFFECT_EVASION_DOWN_2: u16 = 64; // battle_move_effects.h:68
pub const EFFECT_REFLECT: u16 = 65; // battle_move_effects.h:69
pub const EFFECT_POISON: u16 = 66; // battle_move_effects.h:70
pub const EFFECT_PARALYZE: u16 = 67; // battle_move_effects.h:71
pub const EFFECT_SKY_ATTACK: u16 = 75; // battle_move_effects.h:79
pub const EFFECT_SUBSTITUTE: u16 = 79; // battle_move_effects.h:83
pub const EFFECT_RECHARGE: u16 = 80; // battle_move_effects.h:84
pub const EFFECT_LEECH_SEED: u16 = 84; // battle_move_effects.h:88
pub const EFFECT_DISABLE: u16 = 86; // battle_move_effects.h:90
pub const EFFECT_LEVEL_DAMAGE: u16 = 87; // battle_move_effects.h:91
pub const EFFECT_PSYWAVE: u16 = 88; // battle_move_effects.h:92
pub const EFFECT_COUNTER: u16 = 89; // battle_move_effects.h:93
pub const EFFECT_ENCORE: u16 = 90; // battle_move_effects.h:94
pub const EFFECT_SNORE: u16 = 92; // battle_move_effects.h:96
pub const EFFECT_SLEEP_TALK: u16 = 97; // battle_move_effects.h:101
pub const EFFECT_FLAIL: u16 = 99; // battle_move_effects.h:103
pub const EFFECT_MEAN_LOOK: u16 = 106; // battle_move_effects.h:110
pub const EFFECT_NIGHTMARE: u16 = 107; // battle_move_effects.h:111
pub const EFFECT_MINIMIZE: u16 = 108; // battle_move_effects.h:112
pub const EFFECT_CURSE: u16 = 109; // battle_move_effects.h:113
pub const EFFECT_SPIKES: u16 = 112; // battle_move_effects.h:116
pub const EFFECT_FORESIGHT: u16 = 113; // battle_move_effects.h:117
pub const EFFECT_PERISH_SONG: u16 = 114; // battle_move_effects.h:118
pub const EFFECT_SANDSTORM: u16 = 115; // battle_move_effects.h:119
pub const EFFECT_SWAGGER: u16 = 118; // battle_move_effects.h:122
pub const EFFECT_ATTRACT: u16 = 120; // battle_move_effects.h:124
pub const EFFECT_RETURN: u16 = 121; // battle_move_effects.h:125
pub const EFFECT_PRESENT: u16 = 122; // battle_move_effects.h:126
pub const EFFECT_FRUSTRATION: u16 = 123; // battle_move_effects.h:127
pub const EFFECT_SAFEGUARD: u16 = 124; // battle_move_effects.h:128
pub const EFFECT_MAGNITUDE: u16 = 126; // battle_move_effects.h:130
pub const EFFECT_BATON_PASS: u16 = 127; // battle_move_effects.h:131
pub const EFFECT_SONICBOOM: u16 = 130; // battle_move_effects.h:134
pub const EFFECT_RAIN_DANCE: u16 = 136; // battle_move_effects.h:140
pub const EFFECT_SUNNY_DAY: u16 = 137; // battle_move_effects.h:141
pub const EFFECT_BELLY_DRUM: u16 = 142; // battle_move_effects.h:146
pub const EFFECT_PSYCH_UP: u16 = 143; // battle_move_effects.h:147
pub const EFFECT_MIRROR_COAT: u16 = 144; // battle_move_effects.h:148
pub const EFFECT_SKULL_BASH: u16 = 145; // battle_move_effects.h:149
pub const EFFECT_FUTURE_SIGHT: u16 = 148; // battle_move_effects.h:152
pub const EFFECT_SOLAR_BEAM: u16 = 151; // battle_move_effects.h:155
pub const EFFECT_TELEPORT: u16 = 153; // battle_move_effects.h:157
pub const EFFECT_DEFENSE_CURL: u16 = 156; // battle_move_effects.h:160
pub const EFFECT_FAKE_OUT: u16 = 158; // battle_move_effects.h:162
pub const EFFECT_STOCKPILE: u16 = 160; // battle_move_effects.h:164
pub const EFFECT_SPIT_UP: u16 = 161; // battle_move_effects.h:165
pub const EFFECT_SWALLOW: u16 = 162; // battle_move_effects.h:166
pub const EFFECT_HAIL: u16 = 164; // battle_move_effects.h:168
pub const EFFECT_TORMENT: u16 = 165; // battle_move_effects.h:169
pub const EFFECT_FLATTER: u16 = 166; // battle_move_effects.h:170
pub const EFFECT_WILL_O_WISP: u16 = 167; // battle_move_effects.h:171
pub const EFFECT_MEMENTO: u16 = 168; // battle_move_effects.h:172
pub const EFFECT_FOCUS_PUNCH: u16 = 170; // battle_move_effects.h:174
pub const EFFECT_HELPING_HAND: u16 = 176; // battle_move_effects.h:180
pub const EFFECT_TRICK: u16 = 177; // battle_move_effects.h:181
pub const EFFECT_INGRAIN: u16 = 181; // battle_move_effects.h:185
pub const EFFECT_SUPERPOWER: u16 = 182; // battle_move_effects.h:186
pub const EFFECT_RECYCLE: u16 = 184; // battle_move_effects.h:188
pub const EFFECT_KNOCK_OFF: u16 = 188; // battle_move_effects.h:192
pub const EFFECT_ENDEAVOR: u16 = 189; // battle_move_effects.h:193
pub const EFFECT_ERUPTION: u16 = 190; // battle_move_effects.h:194
pub const EFFECT_IMPRISON: u16 = 192; // battle_move_effects.h:196
pub const EFFECT_REFRESH: u16 = 193; // battle_move_effects.h:197
pub const EFFECT_LOW_KICK: u16 = 196; // battle_move_effects.h:200
pub const EFFECT_MUD_SPORT: u16 = 201; // battle_move_effects.h:205
pub const EFFECT_OVERHEAT: u16 = 204; // battle_move_effects.h:208
pub const EFFECT_TICKLE: u16 = 205; // battle_move_effects.h:209
pub const EFFECT_COSMIC_POWER: u16 = 206; // battle_move_effects.h:210
pub const EFFECT_BULK_UP: u16 = 208; // battle_move_effects.h:212
pub const EFFECT_WATER_SPORT: u16 = 210; // battle_move_effects.h:214
pub const EFFECT_CALM_MIND: u16 = 211; // battle_move_effects.h:215
pub const EFFECT_DRAGON_DANCE: u16 = 212; // battle_move_effects.h:216

// === ABILITY_* ids ===========================================================
//
// src/data/gen/ability-item-hooks.json `.universes.abilities`, verified
// against that JSON directly (not recalled) — the subset this step's
// preamble/shared infra reads (weather-collision table, trapper/negating
// abilities, Soundproof). Also matches
// reference/pokeemerald/include/constants/abilities.h's own `#define`
// values (cross-checked, not the citation source per the batching doc).

pub const ABILITY_NONE: u16 = 0;
pub const ABILITY_STENCH: u16 = 1;
pub const ABILITY_DRIZZLE: u16 = 2;
pub const ABILITY_SPEED_BOOST: u16 = 3;
pub const ABILITY_VOLT_ABSORB: u16 = 10;
pub const ABILITY_WATER_ABSORB: u16 = 11;
pub const ABILITY_FLASH_FIRE: u16 = 18;
pub const ABILITY_SHADOW_TAG: u16 = 23;
pub const ABILITY_WONDER_GUARD: u16 = 25;
pub const ABILITY_LEVITATE: u16 = 26;
pub const ABILITY_MAGNET_PULL: u16 = 42;
pub const ABILITY_SOUNDPROOF: u16 = 43;
pub const ABILITY_ARENA_TRAP: u16 = 71;

// === AI_WEATHER_* + the stale-funcResult collision table ====================

/// `AI_WEATHER_*` (`include/constants/battle_ai.h:27-30`), the encoding
/// `Cmd_get_weather` writes to `funcResult` — NOT `gBattleWeather`'s own raw
/// bit layout. Mirrors `factoryAiCheckBadMove.ts:144-147`. Consumed by
/// M5b-1's weather quartet, ported here per the batching doc's data-head
/// grouping.
pub const AI_WEATHER_SUN: u8 = 0;
pub const AI_WEATHER_RAIN: u8 = 1;
pub const AI_WEATHER_SANDSTORM: u8 = 2;
pub const AI_WEATHER_HAIL: u8 = 3;

/// `ABILITY_ID_IN_WEATHER_RANGE` (`factoryAiCheckBadMove.ts:154-169`) —
/// `Cmd_get_weather`'s stale-`funcResult` bug: only ability ids 0-3 can ever
/// collide with an `AI_WEATHER_*` compare. `None` for every other ability id
/// (TS: `Map.get` returning `undefined`).
#[must_use]
pub fn ability_id_in_weather_range(ability: u16) -> Option<u8> {
    match ability {
        ABILITY_NONE => Some(AI_WEATHER_SUN),
        ABILITY_STENCH => Some(AI_WEATHER_RAIN),
        ABILITY_DRIZZLE => Some(AI_WEATHER_SANDSTORM),
        ABILITY_SPEED_BOOST => Some(AI_WEATHER_HAIL),
        _ => None,
    }
}

// === other data heads (batching doc §1) =====================================

/// `sIgnoredPowerfulMoveEffects` (`battle_ai_script_commands.c:266-281`),
/// mirroring `factoryAiCheckBadMove.ts:171-185` (12 entries).
pub const IGNORED_POWERFUL_MOVE_EFFECTS: [u16; 12] = [
    EFFECT_EXPLOSION,
    EFFECT_DREAM_EATER,
    EFFECT_RAZOR_WIND,
    EFFECT_SKY_ATTACK,
    EFFECT_RECHARGE,
    EFFECT_SKULL_BASH,
    EFFECT_SOLAR_BEAM,
    EFFECT_SPIT_UP,
    EFFECT_FOCUS_PUNCH,
    EFFECT_SUPERPOWER,
    EFFECT_ERUPTION,
    EFFECT_OVERHEAT,
];

/// `factoryAiCheckBadMove.ts:187-188`, verified against
/// `src/data/gen/moves.json` (id 90 = `MOVE_FISSURE`, effect `EFFECT_OHKO`,
/// power 1, `TYPE_GROUND`; id 32 = `MOVE_HORN_DRILL`, effect `EFFECT_OHKO`,
/// power 1, `TYPE_NORMAL`).
pub const MOVE_FISSURE: u16 = 90;
pub const MOVE_HORN_DRILL: u16 = 32;

/// Trapper abilities (`Cmd_get_ability`'s "abilities that prevent fleeing"
/// branch), mirroring `factoryAiCheckBadMove.ts:190-195`.
pub const TRAPPER_ABILITIES: [u16; 3] =
    [ABILITY_SHADOW_TAG, ABILITY_MAGNET_PULL, ABILITY_ARENA_TRAP];

/// The five type-immunity-negating abilities `run_check_bad_move_preamble`'s
/// ability-negation block checks in this order, mirroring
/// `NEGATING_ABILITIES` (`factoryAiCheckBadMove.ts:197-203`). TS threads this
/// as a named-field object for readable `===` comparisons in an if/else-if
/// chain; the Rust preamble below does the same comparisons directly against
/// the individual `ABILITY_*` consts. Kept as its own array purely for the
/// data-head citation the batching doc asks for.
pub const NEGATING_ABILITIES: [u16; 5] = [
    ABILITY_VOLT_ABSORB,
    ABILITY_WATER_ABSORB,
    ABILITY_FLASH_FIRE,
    ABILITY_WONDER_GUARD,
    ABILITY_LEVITATE,
];

/// Mirrors `SOUNDPROOF_MOVES` (`factoryAiCheckBadMove.ts:205-215`), move ids
/// verified against `src/data/gen/moves.json` (name + effect checked for
/// every entry, not recalled).
pub const SOUNDPROOF_MOVES: [u16; 9] = [
    45,  // MOVE_GROWL
    46,  // MOVE_ROAR
    47,  // MOVE_SING
    48,  // MOVE_SUPERSONIC
    103, // MOVE_SCREECH
    173, // MOVE_SNORE
    253, // MOVE_UPROAR
    319, // MOVE_METAL_SOUND
    320, // MOVE_GRASS_WHISTLE
];

// === completeness-probe machinery (batching doc §3) =========================

/// `AI_CHECK_BAD_MOVE_TABLE_EFFECTS` (`factoryAiCheckBadMove.ts:223-252`),
/// translated to numeric effect ids — every `EFFECT_*` with an
/// `AI_CheckBadMove_CheckEffect` `if_effect` table entry (109, source-complete
/// and script-verified per `docs/rust-m5b-checkbadmove-batching.md`).
pub const CBM_TABLE_EFFECTS: [u16; 109] = [
    EFFECT_SLEEP,
    EFFECT_EXPLOSION,
    EFFECT_DREAM_EATER,
    EFFECT_ATTACK_UP,
    EFFECT_DEFENSE_UP,
    EFFECT_SPEED_UP,
    EFFECT_SPECIAL_ATTACK_UP,
    EFFECT_SPECIAL_DEFENSE_UP,
    EFFECT_ACCURACY_UP,
    EFFECT_EVASION_UP,
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
    EFFECT_TOXIC,
    EFFECT_LIGHT_SCREEN,
    EFFECT_OHKO,
    EFFECT_RAZOR_WIND,
    EFFECT_SUPER_FANG,
    EFFECT_MIST,
    EFFECT_FOCUS_ENERGY,
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
    EFFECT_SUBSTITUTE,
    EFFECT_RECHARGE,
    EFFECT_LEECH_SEED,
    EFFECT_DISABLE,
    EFFECT_LEVEL_DAMAGE,
    EFFECT_PSYWAVE,
    EFFECT_COUNTER,
    EFFECT_ENCORE,
    EFFECT_SNORE,
    EFFECT_SLEEP_TALK,
    EFFECT_FLAIL,
    EFFECT_MEAN_LOOK,
    EFFECT_NIGHTMARE,
    EFFECT_MINIMIZE,
    EFFECT_CURSE,
    EFFECT_SPIKES,
    EFFECT_FORESIGHT,
    EFFECT_PERISH_SONG,
    EFFECT_SANDSTORM,
    EFFECT_SWAGGER,
    EFFECT_ATTRACT,
    EFFECT_RETURN,
    EFFECT_PRESENT,
    EFFECT_FRUSTRATION,
    EFFECT_SAFEGUARD,
    EFFECT_MAGNITUDE,
    EFFECT_BATON_PASS,
    EFFECT_SONICBOOM,
    EFFECT_RAIN_DANCE,
    EFFECT_SUNNY_DAY,
    EFFECT_BELLY_DRUM,
    EFFECT_PSYCH_UP,
    EFFECT_MIRROR_COAT,
    EFFECT_SKULL_BASH,
    EFFECT_FUTURE_SIGHT,
    EFFECT_TELEPORT,
    EFFECT_DEFENSE_CURL,
    EFFECT_FAKE_OUT,
    EFFECT_STOCKPILE,
    EFFECT_SPIT_UP,
    EFFECT_SWALLOW,
    EFFECT_HAIL,
    EFFECT_TORMENT,
    EFFECT_FLATTER,
    EFFECT_WILL_O_WISP,
    EFFECT_MEMENTO,
    EFFECT_FOCUS_PUNCH,
    EFFECT_HELPING_HAND,
    EFFECT_TRICK,
    EFFECT_INGRAIN,
    EFFECT_SUPERPOWER,
    EFFECT_RECYCLE,
    EFFECT_KNOCK_OFF,
    EFFECT_ENDEAVOR,
    EFFECT_IMPRISON,
    EFFECT_REFRESH,
    EFFECT_LOW_KICK,
    EFFECT_MUD_SPORT,
    EFFECT_TICKLE,
    EFFECT_COSMIC_POWER,
    EFFECT_BULK_UP,
    EFFECT_WATER_SPORT,
    EFFECT_CALM_MIND,
    EFFECT_DRAGON_DANCE,
];

/// M5b-1's landed batch (`docs/rust-m5b-checkbadmove-batching.md` §2
/// "M5b-1"), TS dispatch source order: the 18-effect HighRiskForDamage
/// cluster (TS :1338-1689), Teleport (:1694-1701), the 8 zero-RNG
/// single-flag effects (:1707-1809), the weather quartet (:2076-2118), and
/// Magnitude (:2410-2419) — exactly 32 effects.
pub const CBM_HANDLED_EFFECTS_M5B1: &[u16] = &[
    EFFECT_COUNTER,
    EFFECT_FLAIL,
    EFFECT_MIRROR_COAT,
    EFFECT_FOCUS_PUNCH,
    EFFECT_LEVEL_DAMAGE,
    EFFECT_FRUSTRATION,
    EFFECT_RETURN,
    EFFECT_RECHARGE,
    EFFECT_ENDEAVOR,
    EFFECT_SUPERPOWER,
    EFFECT_RAZOR_WIND,
    EFFECT_PSYWAVE,
    EFFECT_LOW_KICK,
    EFFECT_SUPER_FANG,
    EFFECT_PRESENT,
    EFFECT_SONICBOOM,
    EFFECT_BIDE,
    EFFECT_SKULL_BASH,
    EFFECT_TELEPORT,
    EFFECT_INGRAIN,
    EFFECT_PERISH_SONG,
    EFFECT_NIGHTMARE,
    EFFECT_FORESIGHT,
    EFFECT_SPIKES,
    EFFECT_FUTURE_SIGHT,
    EFFECT_FOCUS_ENERGY,
    EFFECT_REFRESH,
    EFFECT_RAIN_DANCE,
    EFFECT_SUNNY_DAY,
    EFFECT_HAIL,
    EFFECT_SANDSTORM,
    EFFECT_MAGNITUDE,
];

/// Union of every landed batch's handled-effect consts, mirroring
/// `CHECK_BAD_MOVE_HANDLED_TABLE_EFFECTS` (`factoryAiCheckBadMove.ts:266-302`).
/// M5b-2/3 each add their own `CBM_HANDLED_EFFECTS_M5BN: &[u16]` const and
/// union it in here, "add the effect in the same commit as its handler" (TS
/// doc comment :262-264).
#[must_use]
pub fn cbm_handled_effects() -> &'static [u16] {
    CBM_HANDLED_EFFECTS_M5B1
}

/// Direct port of `unportedCheckBadMoveTableEffects`
/// (`factoryAiCheckBadMove.ts:312-316`): `CBM_TABLE_EFFECTS` minus
/// `cbm_handled_effects()`, sorted. Returns 77 table effects after M5b-1.
#[must_use]
pub fn unported_cbm_table_effects() -> Vec<u16> {
    let handled = cbm_handled_effects();
    let mut unported: Vec<u16> = CBM_TABLE_EFFECTS
        .iter()
        .copied()
        .filter(|effect| !handled.contains(effect))
        .collect();
    unported.sort_unstable();
    unported
}

/// Direct port of `firstMoveIdWithEffect` (`factoryAiCheckBadMove.ts:323-328`),
/// scanning `gen_tables::MOVES` (dense id order) instead of `MOVES_BY_ID`'s
/// insertion order — both yield the lowest move id carrying `effect`.
#[must_use]
pub fn first_move_id_with_effect(effect: u16) -> Option<u16> {
    gen_tables::MOVES
        .iter()
        .find(|row| row.effect == effect)
        .map(|row| row.id)
}

// === RNG state ===============================================================

/// Mirrors `BattleRngState` (`battleDecisionBoundary.ts:103-106`).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BattleRngState {
    pub value: u32,
    pub calls: u32,
}

// === gender =================================================================

/// Mirrors `FactoryAiMonGender` (`factoryAiCheckBadMove.ts:330-340`,
/// `MON_MALE`/`MON_FEMALE`/`MON_GENDERLESS`). Not read by this step's
/// preamble (`AI_CBM_Attract`-only, M5b-2).
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FactoryAiMonGender {
    Male = 0,
    Female = 1,
    Genderless = 2,
}

// === input structs ===========================================================

/// Mirrors `FactoryAiCheckBadMoveTarget` (`factoryAiCheckBadMove.ts:342-487`,
/// 28 fields, 20 `?:` optional). Only `species`/`types`/`known_ability`/
/// `real_ability` are read by this step's preamble/shared infra; every other
/// field is ported now (full struct shape) for M5b-1/2/3 to consume, each
/// documented with its TS default, applied by the *consuming* handler code
/// (not yet ported) exactly where TS applies it — not here.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryAiCheckBadMoveTarget {
    pub species: u16,
    /// `[type0, type1]`, `damage_calc::TYPE_*` ids.
    pub types: [u8; 2],
    /// BattleHistory-style known ability, or `None` if never observed this
    /// battle (TS: `string | null`, a required-but-nullable field, not
    /// `?:`).
    pub known_ability: Option<u16>,
    /// The target's real, engine-known ability — the trapper check reads
    /// this directly, not a guess.
    pub real_ability: u16,
    /// 0..12, `AI_CBM_SpeedDown`'s `MIN_STAT_STAGE` gate.
    pub speed_stage: u8,
    /// 0..12, `AI_CBM_AttackDown`'s `MIN_STAT_STAGE` gate.
    pub atk_stage: u8,
    /// 0..12, `AI_CBM_DefenseDown`'s `MIN_STAT_STAGE` gate.
    pub def_stage: u8,
    /// 0..12, `AI_CBM_SpDefDown`'s `MIN_STAT_STAGE` gate.
    pub sp_def_stage: u8,
    /// `AI_CBM_AccDown`'s `MIN_STAT_STAGE` gate. Default `DEFAULT_STAT_STAGE`
    /// (6, TS :359).
    pub acc_stage: Option<u8>,
    /// `AI_CBM_EvasionDown`'s `MIN_STAT_STAGE` gate. Default
    /// `DEFAULT_STAT_STAGE` (TS :366).
    pub evasion_stage: Option<u8>,
    /// `AI_CBM_Toxic`'s primary-status gate. Default `false` (TS :374).
    pub has_any_status: Option<bool>,
    /// `AI_CBM_Toxic`'s final gate. Default `false` (TS :379).
    pub safeguard_up: Option<bool>,
    /// `AI_CBM_Confuse`'s first rejection gate. Default `false` (TS :385).
    pub is_confused: Option<bool>,
    /// `AI_CBM_LeechSeed`'s first rejection gate. Default `false` (TS :391).
    pub is_leech_seeded: Option<bool>,
    /// `AI_CBM_DreamEater`'s first rejection gate (`EFFECT_DREAM_EATER`).
    /// Default `false` (TS :397).
    pub is_asleep: Option<bool>,
    /// `AI_CBM_CantEscape`'s single gate (`EFFECT_MEAN_LOOK`, Block, Spider
    /// Web). Default `false` (TS :403).
    pub is_escape_prevented: Option<bool>,
    /// `AI_CBM_Torment`'s single gate (`EFFECT_TORMENT`). Default `false`
    /// (TS :409).
    pub is_tormented: Option<bool>,
    /// `AI_CBM_PerishSong`'s single gate (`EFFECT_PERISH_SONG`). Default
    /// `false` (TS :415).
    pub has_perish_song: Option<bool>,
    /// `AI_CBM_Nightmare`'s first rejection gate (`EFFECT_NIGHTMARE`).
    /// Default `false` (TS :421).
    pub is_nightmared: Option<bool>,
    /// `AI_CBM_Foresight`'s single gate (`EFFECT_FORESIGHT`). Default
    /// `false` (TS :427).
    pub is_foresighted: Option<bool>,
    /// `AI_CBM_Spikes`'s single gate (`EFFECT_SPIKES`). Default `false`
    /// (TS :433).
    pub spikes_up: Option<bool>,
    /// `AI_CBM_FutureSight`'s first gate (`EFFECT_FUTURE_SIGHT`). Default
    /// `false` (TS :439).
    pub target_future_attack_up: Option<bool>,
    /// `AI_CBM_OneHitKO`'s `if_level_cond 1` operand. Default 0, the neutral
    /// "not lower" outcome (TS :446).
    pub level: Option<u8>,
    /// `AI_CBM_SpAtkDown`'s own gate and `AI_CBM_Haze`'s target-side gate.
    /// Default `DEFAULT_STAT_STAGE` (TS :454).
    pub sp_atk_stage: Option<u8>,
    /// `AI_CBM_Attract`'s first rejection gate (`EFFECT_ATTRACT`). Default
    /// `false` (TS :461).
    pub is_infatuated: Option<bool>,
    /// `AI_CBM_Disable`'s single gate (`EFFECT_DISABLE`). Default `false`
    /// (TS :469).
    pub any_move_disabled: Option<bool>,
    /// `AI_CBM_Encore`'s single gate (`EFFECT_ENCORE`). Default `false`
    /// (TS :477).
    pub any_move_encored: Option<bool>,
    /// `AI_CBM_Attract`'s own `get_gender AI_TARGET` gates. `None` behaves
    /// exactly like `MON_GENDERLESS` (TS :486).
    pub gender: Option<FactoryAiMonGender>,
}

/// Mirrors `FactoryAiCheckBadMoveAttacker` (`factoryAiCheckBadMove.ts:498-687`,
/// 29 fields, 27 `?:` optional) — `AI_USER`'s own state, needed only by
/// stat-UP/self-targeted CBM handlers (none ported this step; not read by
/// `run_check_bad_move_preamble` at all). Ported in full now for the same
/// reason as `FactoryAiCheckBadMoveTarget` above.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryAiCheckBadMoveAttacker {
    /// `AI_CBM_AttackUp`/`AI_CBM_BulkUp`'s own `MAX_STAT_STAGE` gate.
    pub atk_stage: u8,
    /// `AI_CBM_DefenseUp`/`AI_CBM_BulkUp`'s own `MAX_STAT_STAGE` gate.
    pub def_stage: u8,
    /// `AI_CBM_SpeedUp`'s own gate. Default `DEFAULT_STAT_STAGE` (TS :510).
    pub speed_stage: Option<u8>,
    /// `AI_CBM_SpAtkUp`'s own gate. Default `DEFAULT_STAT_STAGE` (TS :516).
    pub sp_atk_stage: Option<u8>,
    /// `AI_CBM_CosmicPower`/`AI_CBM_CalmMind`'s own second gate. Default
    /// `DEFAULT_STAT_STAGE` (TS :522).
    pub sp_def_stage: Option<u8>,
    /// `AI_CBM_LightScreen`'s single side-status gate. Default `false`
    /// (TS :530).
    pub light_screen_up: Option<bool>,
    /// `AI_CBM_Reflect`'s single side-status gate. Default `false`
    /// (TS :536).
    pub reflect_up: Option<bool>,
    /// `AI_CBM_EvasionUp`'s own gate. Default `DEFAULT_STAT_STAGE` (TS :542).
    pub evasion_stage: Option<u8>,
    /// `AI_CBM_FutureSight`'s second gate (`EFFECT_FUTURE_SIGHT`). Default
    /// `false` (TS :548).
    pub attacker_future_attack_up: Option<bool>,
    /// `AI_CBM_FocusEnergy`'s single gate (`EFFECT_FOCUS_ENERGY`). Default
    /// `false` (TS :553).
    pub has_focus_energy: Option<bool>,
    /// `AI_CBM_Refresh`'s single gate (`EFFECT_REFRESH`). Default `false`
    /// (TS :559).
    pub has_curable_status: Option<bool>,
    /// `AI_CBM_RainDance`/`SunnyDay`/`Hail`'s own `get_weather` read,
    /// `AI_WEATHER_*`-encoded. Default `None` (no weather bit set,
    /// TS :569).
    pub current_weather: Option<u8>,
    /// `AI_CBM_OneHitKO`'s `if_level_cond 1` gate. Default 0 (TS :575).
    pub level: Option<u8>,
    /// `AI_CBM_FakeOut`'s single gate, domain 0..2. Default 0 ("not first
    /// turn", TS :583).
    pub is_first_turn: Option<u8>,
    /// `AI_CBM_Safeguard`'s single side-status gate. Default `false`
    /// (TS :590).
    pub safeguard_up: Option<bool>,
    /// `AI_CBM_DamageDuringSleep`'s single gate (`EFFECT_SNORE`/
    /// `EFFECT_SLEEP_TALK`). Default `false` (TS :598).
    pub is_asleep: Option<bool>,
    /// `AI_CBM_Explosion`/`AI_CBM_BatonPass`'s own AI_USER bench-count gate.
    /// Default 0 (TS :606).
    pub usable_party_mons: Option<u8>,
    /// `AI_CBM_Substitute`'s first gate. Default `false` (TS :611).
    pub has_substitute: Option<bool>,
    /// `AI_CBM_Substitute`'s second gate (`if_hp_less_than AI_USER, 26`).
    /// Default: unset (100%, so the <26% gate never fires, TS :613-617).
    pub hp: Option<i32>,
    pub max_hp: Option<i32>,
    /// `AI_CBM_Ingrain`'s single gate. Default `false` (TS :624).
    pub is_rooted: Option<bool>,
    /// `AI_CBM_AccUp`'s own gate and `AI_CBM_Haze`'s user-side gate. Default
    /// `DEFAULT_STAT_STAGE` (TS :632).
    pub acc_stage: Option<u8>,
    /// `AI_CBM_Mist`'s single side-status gate. Default `false` (TS :639).
    pub mist_up: Option<bool>,
    /// `AI_CBM_Attract`'s own `get_gender AI_USER` gates. `None` behaves
    /// like `MON_GENDERLESS` (TS :648).
    pub gender: Option<FactoryAiMonGender>,
    /// `AI_CBM_Imprison`'s single gate. Default `false` (TS :654).
    pub imprisoned_others: Option<bool>,
    /// `AI_CBM_MudSport`'s single gate. Default `false` (TS :660).
    pub mud_sport_up: Option<bool>,
    /// `AI_CBM_WaterSport`'s single gate. Default `false` (TS :666).
    pub water_sport_up: Option<bool>,
    /// `AI_CBM_Recycle`'s single gate (`if_equal ITEM_NONE`). Default 0
    /// (`ITEM_NONE`, TS :675).
    pub used_held_item_id: Option<u16>,
    /// `AI_CBM_Stockpile`/`AI_CBM_SpitUpAndSwallow`'s gates, domain 0..3.
    /// Default 0 (TS :686).
    pub stockpile_count: Option<u8>,
}

/// Mirrors `FactoryAiCheckBadMoveRoarTarget` (`factoryAiCheckBadMove.ts:2708-2711`)
/// — `FactoryAiCheckBadMoveTarget` plus Roar/Explosion's own target-side
/// bench count. TS models this as an intersection type (structural
/// subtyping over the base type); Rust composes it explicitly since there's
/// no structural typing here. `run_check_bad_move_preamble`'s `target` input
/// is this extended type (TS :1262), matching the source signature exactly,
/// even though this step's preamble never reads `usable_party_mons`
/// (Roar/Explosion are M5b-2).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryAiCheckBadMoveRoarTarget {
    pub target: FactoryAiCheckBadMoveTarget,
    /// Alive, non-empty, non-Egg target-side bench count, excluding the
    /// active singles party index. Default 0.
    pub usable_party_mons: Option<u8>,
}

// === draws/result =============================================================

/// The true worst case across the preamble's own two call sites (negates-
/// type + soundproof, TS :1297,1329) plus every M5b-1 handler's own draws:
/// Magnitude's own Levitate draw (TS :3342) plus the shared
/// `run_cbm_high_risk_for_damage` body's own ability draw (TS :2696) can
/// both fire on top of the preamble's soundproof draw (3 total) — see the
/// module doc comment for why the negates-type draw never co-occurs with a
/// handler draw in this batch.
pub const MAX_CHECK_BAD_MOVE_DRAWS: usize = 3;

/// Distinguishes `run_check_bad_move_preamble`'s `next_get_ability_draw`
/// call sites, replacing TS's free-form `reason` string (see the module doc
/// comment). Extended by later batches, one variant per handler call site.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CheckBadMoveDrawSite {
    /// `AI_CBM_CheckIfNegatesType`'s ability read (TS :1297).
    NegatesType = 0,
    /// `AI_CheckBadMove_CheckSoundproof`'s ability read (TS :1329).
    Soundproof = 1,
    /// `AI_CBM_HighRiskForDamage`'s own ability read (TS :2696), reached
    /// directly by the 18-effect cluster or via Magnitude's fall-through
    /// (TS :3352-3357).
    HighRiskForDamageAbility = 2,
    /// `AI_CBM_Magnitude`'s own Levitate read, before its fall-through into
    /// `AI_CBM_HighRiskForDamage` (TS :3342).
    MagnitudeLevitate = 3,
}

/// Mirrors `FactoryAiCheckBadMoveDraw` (`factoryAiCheckBadMove.ts:689-698`),
/// minus the free-form `reason` string and constant `kind: "get-ability"`
/// tag (see the module doc comment). `guessed_ability` is the numeric
/// ability id.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct CheckBadMoveDraw {
    pub ordinal: u32,
    pub site: CheckBadMoveDrawSite,
    pub before: BattleRngState,
    pub after: BattleRngState,
    pub raw_rng_value: u32,
    pub random_value: u16,
    pub guessed_ability: u16,
}

const DRAW_FILLER: CheckBadMoveDraw = CheckBadMoveDraw {
    ordinal: 0,
    site: CheckBadMoveDrawSite::NegatesType,
    before: BattleRngState { value: 0, calls: 0 },
    after: BattleRngState { value: 0, calls: 0 },
    raw_rng_value: 0,
    random_value: 0,
    guessed_ability: 0,
};

/// Mirrors `FactoryAiCheckBadMoveResult` (`factoryAiCheckBadMove.ts:700-712`).
/// `Scored.draws`/`draw_count` is the fixed-array-plus-count receipt (see the
/// module doc comment); slots `draw_count..` hold `DRAW_FILLER` and must not
/// be read. `NotYetPorted` is the Rust analog of TS's `"unsupported-branch"`
/// kind (`docs/rust-m5b-checkbadmove-batching.md` §3), returned by the
/// trailing barrier for any of the 109 `CBM_TABLE_EFFECTS` not yet in
/// `cbm_handled_effects()` — 77, after M5b-1.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CheckBadMoveResult {
    Scored {
        rng: BattleRngState,
        draws: [CheckBadMoveDraw; MAX_CHECK_BAD_MOVE_DRAWS],
        draw_count: u8,
        score_delta: i32,
    },
    NotYetPorted {
        effect: u16,
        move_id: u16,
    },
}

// === shared infra (batching doc §1 "RNG draw plumbing") =====================

/// Result of one `next_get_ability_draw` call, mirroring the TS function's
/// inline object return (`factoryAiCheckBadMove.ts:714-747`, three fields).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct NextGetAbilityDrawResult {
    pub rng: BattleRngState,
    pub draw: Option<CheckBadMoveDraw>,
    pub ability: u16,
}

/// `nextGetAbilityDraw` (`factoryAiCheckBadMove.ts:714-747`) — the module's
/// headline quirk (file doc comment :1-12): trapper short-circuit -> known-
/// ability cache -> single-ability species short-circuit -> genuine
/// `advanceRngValue` draw. **Never caches**: `target.known_ability` is read
/// but never written here, so every call site (both preamble sites, and
/// every future handler site) redraws fresh, even within the same slot's
/// pass.
#[must_use]
pub fn next_get_ability_draw(
    rng: BattleRngState,
    ordinal: u32,
    site: CheckBadMoveDrawSite,
    target: &FactoryAiCheckBadMoveTarget,
) -> NextGetAbilityDrawResult {
    if TRAPPER_ABILITIES.contains(&target.real_ability) {
        return NextGetAbilityDrawResult { rng, draw: None, ability: target.real_ability };
    }
    if let Some(known) = target.known_ability {
        return NextGetAbilityDrawResult { rng, draw: None, ability: known };
    }
    let species = gen_tables::species_row(target.species).expect(
        "factory-ai-check-bad-move: target.species is drawn from the Factory rental corpus, \
         which gen_tables::SPECIES fully covers (TS :726-727 throws on a genuinely unknown id)",
    );
    let [ability0, ability1] = species.abilities;
    if ability1 == ABILITY_NONE {
        return NextGetAbilityDrawResult { rng, draw: None, ability: ability0 };
    }
    let raw_rng_value = advance_rng_value(rng.value);
    let after = BattleRngState { value: raw_rng_value, calls: rng.calls + 1 };
    let random_value = ((raw_rng_value >> 16) & 0xffff) as u16;
    let guessed_ability = if random_value & 1 != 0 {
        ability0
    } else {
        ability1
    };
    let draw = CheckBadMoveDraw {
        ordinal,
        site,
        before: rng,
        after,
        raw_rng_value,
        random_value,
        guessed_ability,
    };
    NextGetAbilityDrawResult { rng: after, draw: Some(draw), ability: guessed_ability }
}

/// `checkAbilityAiTarget` (`factoryAiCheckBadMove.ts:758-785`) — zero-RNG,
/// unlike `next_get_ability_draw`: a known/trapper/single-ability species
/// compares exactly, but a species with two distinct, unobserved abilities
/// can NEVER register a match (the source's own `abilityDummyVariable`
/// collapse — both "neither ability matches" and "one matches but the
/// engine can't answer" outcomes reduce to non-match). Ported exactly, not
/// simplified. Used by `AI_CBM_SpeedDown`'s Speed Boost gate (M5b-1), not by
/// this step's preamble.
#[must_use]
pub fn check_ability_ai_target(target: &FactoryAiCheckBadMoveTarget, wanted_ability: u16) -> bool {
    if TRAPPER_ABILITIES.contains(&target.real_ability) {
        return target.real_ability == wanted_ability;
    }
    if let Some(known) = target.known_ability {
        return known == wanted_ability;
    }
    let species = gen_tables::species_row(target.species).expect(
        "factory-ai-check-bad-move: target.species is drawn from the Factory rental corpus, \
         which gen_tables::SPECIES fully covers (TS :726-727 throws on a genuinely unknown id)",
    );
    let [ability0, ability1] = species.abilities;
    if ability1 == ABILITY_NONE {
        return ability0 == wanted_ability;
    }
    false
}

/// `typeMultiplierTenths` (`factoryAiCheckBadMove.ts:1242-1252`), reusing
/// `gen_tables::TYPE_EFFECTIVENESS_TABLE` (M4b) instead of TS's own
/// re-embedded string-keyed table (see the module doc comment). Distinct
/// from `damage_calc::apply_type_effectiveness`'s no-effect-then-nonzero
/// damage clamp (that clamp applies to a *damage* value, not the
/// multiplier itself) — this function has no such clamp, matching TS
/// exactly.
#[must_use]
pub fn type_multiplier_tenths(attacking_type: u8, defending_types: [u8; 2]) -> i32 {
    let distinct: &[u8] = if defending_types[0] == defending_types[1] {
        &defending_types[..1]
    } else {
        &defending_types[..]
    };
    let mut mult: i32 = 10;
    for &def_type in distinct {
        if let Some(entry) = gen_tables::TYPE_EFFECTIVENESS_TABLE
            .iter()
            .find(|e| e.attacking_type == attacking_type && e.defending_type == def_type)
        {
            mult = (mult * entry.multiplier_tenths) / 10;
        }
    }
    mult
}

// === M5b-1 handlers (batching doc §2 "M5b-1") ================================

/// `AI_CBM_HighRiskForDamage` (`data/battle_ai_scripts.s:368-376`,
/// `factoryAiCheckBadMove.ts:2681-2706`), the shared body for the 18-effect
/// HighRiskForDamage cluster (Counter/Flail/Mirror Coat/Focus Punch/Level
/// Damage/Frustration/Return/Recharge/Endeavor/Superpower/Razor Wind/
/// Psywave/Low Kick/Super Fang/Present/Sonic Boom/Bide/Skull Bash) and,
/// via fall-through, `run_cbm_magnitude` below. Its own ability read is
/// fresh even though the universal Soundproof prologue already read the
/// same target.
#[must_use]
fn run_cbm_high_risk_for_damage(
    move_type: u8,
    target: &FactoryAiCheckBadMoveTarget,
    rng: BattleRngState,
    ordinal: u32,
) -> (BattleRngState, Option<CheckBadMoveDraw>, i32) {
    let effectiveness_tenths = type_multiplier_tenths(move_type, target.types);
    if effectiveness_tenths == 0 {
        return (rng, None, -10);
    }
    let ability = next_get_ability_draw(
        rng,
        ordinal,
        CheckBadMoveDrawSite::HighRiskForDamageAbility,
        target,
    );
    let score_delta = if ability.ability == ABILITY_WONDER_GUARD && effectiveness_tenths != 20 {
        -10
    } else {
        0
    };
    (ability.rng, ability.draw, score_delta)
}

/// `AI_CBM_Ingrain` (`data/battle_ai_scripts.s:550-552`, EFFECT_INGRAIN,
/// TS :1707-1714/3158-3160): a single `if_status3 AI_USER, STATUS3_ROOTED,
/// Score_Minus10`. Zero ability/type reads.
#[must_use]
fn run_cbm_ingrain(attacker_is_rooted: bool) -> i32 {
    if attacker_is_rooted {
        -10
    } else {
        0
    }
}

/// `AI_CBM_PerishSong` (`data/battle_ai_scripts.s:447-449`,
/// EFFECT_PERISH_SONG, TS :1720-1727/3168-3170): a single
/// `if_status3 AI_TARGET, STATUS3_PERISH_SONG, Score_Minus10`. Zero
/// ability/type reads.
#[must_use]
fn run_cbm_perish_song(target_has_perish_song: bool) -> i32 {
    if target_has_perish_song {
        -10
    } else {
        0
    }
}

/// `AI_CBM_Nightmare` (`data/battle_ai_scripts.s:237-240`, EFFECT_NIGHTMARE,
/// TS :1733-1740/3187-3192): existing Nightmare JUMPs to -10 first; a
/// not-asleep target then JUMPs to -8 (Nightmare needs the target asleep).
/// Sequential Score_Minus10 then Score_Minus8 JUMPs, never additive — a
/// Nightmared target never reaches the sleep check. Zero ability/type reads.
#[must_use]
fn run_cbm_nightmare(target_nightmared: bool, target_asleep: bool) -> i32 {
    if target_nightmared {
        return -10;
    }
    if target_asleep {
        0
    } else {
        -8
    }
}

/// `AI_CBM_Foresight` (`data/battle_ai_scripts.s:443-445`,
/// EFFECT_FORESIGHT, TS :1746-1753/3200-3202): a single
/// `if_status2 AI_TARGET, STATUS2_FORESIGHT, Score_Minus10`. Zero
/// ability/type reads.
#[must_use]
fn run_cbm_foresight(target_foresighted: bool) -> i32 {
    if target_foresighted {
        -10
    } else {
        0
    }
}

/// `AI_CBM_Spikes` (`data/battle_ai_scripts.s:439-441`, EFFECT_SPIKES,
/// TS :1759-1766/3210-3212): a single `if_side_affecting AI_TARGET,
/// SIDE_STATUS_SPIKES, Score_Minus10`. Zero ability/type reads.
#[must_use]
fn run_cbm_spikes(target_spikes_up: bool) -> i32 {
    if target_spikes_up {
        -10
    } else {
        0
    }
}

/// `AI_CBM_FutureSight` (`data/battle_ai_scripts.s:500-504`,
/// EFFECT_FUTURE_SIGHT, TS :1772-1782/3230-3235): either side already
/// carrying a Future Sight attack JUMPs to -12; the all-clear path FALLS
/// THROUGH to `score +5` (Future Sight is positively valued when unused).
/// Sequential Score_Minus12 JUMPs then a Score_Plus5, never additive. Zero
/// ability/type reads.
#[must_use]
fn run_cbm_future_sight(target_future_attack_up: bool, attacker_future_attack_up: bool) -> i32 {
    if target_future_attack_up || attacker_future_attack_up {
        -12
    } else {
        5
    }
}

/// `AI_CBM_FocusEnergy` (`data/battle_ai_scripts.s:382-384`,
/// EFFECT_FOCUS_ENERGY, TS :1788-1795/3243-3245): a single
/// `if_status2 AI_USER, STATUS2_FOCUS_ENERGY, Score_Minus10`. Zero
/// ability/type reads.
#[must_use]
fn run_cbm_focus_energy(attacker_has_focus_energy: bool) -> i32 {
    if attacker_has_focus_energy {
        -10
    } else {
        0
    }
}

/// `AI_CBM_Refresh` (`data/battle_ai_scripts.s:563-565`, EFFECT_REFRESH,
/// TS :1802-1809/3253-3255): a single `if_not_status AI_USER, STATUS1_POISON
/// | STATUS1_BURN | STATUS1_PARALYSIS | STATUS1_TOXIC_POISON,
/// Score_Minus10` — penalized when the AI has none of the four curable
/// statuses. Zero ability/type reads.
#[must_use]
fn run_cbm_refresh(attacker_has_curable_status: bool) -> i32 {
    if attacker_has_curable_status {
        0
    } else {
        -10
    }
}

/// `AI_CBM_RainDance`/`AI_CBM_SunnyDay`/`AI_CBM_Hail`/`AI_CBM_Sandstorm`
/// (`data/battle_ai_scripts.s:490-493`/`:495-498`/`:522-525`/`:451-454`,
/// TS `runCbmWeatherSetter` :1209-1230 + `runCbmSandstorm` :1238-1240) —
/// four separate, individually named dispatch targets sharing one
/// byte-for-byte 3-instruction body: `get_weather; if_equal
/// <OWN_WEATHER>, Score_Minus8; end`.
///
/// **`get_weather`'s own stale-`funcResult` bug** (TS :1191-1207): only
/// writes `funcResult` when a real weather bit is set. On a genuinely
/// weatherless battle (`current_weather == None`), the read is whatever the
/// *previous* AI script command left in `funcResult` — for these four
/// handlers specifically, that's always this same pass's own
/// `AI_CheckBadMove_CheckSoundproof` ability guess (`soundproof_guess`,
/// already computed by `run_check_bad_move_preamble` before any dispatch —
/// not a fresh read, no new RNG draw). Only ability ids 0-3
/// (`ability_id_in_weather_range`) can ever collide with an `AI_WEATHER_*`
/// constant; every other ability leaves the compare as genuine
/// non-equality, matching the clean "no weather" outcome anyway.
#[must_use]
fn run_cbm_weather_setter(
    current_weather: Option<u8>,
    stale_ability_guess: u16,
    own_weather_constant: u8,
) -> i32 {
    let func_result = current_weather.or_else(|| ability_id_in_weather_range(stale_ability_guess));
    if func_result == Some(own_weather_constant) {
        -8
    } else {
        0
    }
}

#[must_use]
fn run_cbm_rain_dance(current_weather: Option<u8>, stale_ability_guess: u16) -> i32 {
    run_cbm_weather_setter(current_weather, stale_ability_guess, AI_WEATHER_RAIN)
}

#[must_use]
fn run_cbm_sunny_day(current_weather: Option<u8>, stale_ability_guess: u16) -> i32 {
    run_cbm_weather_setter(current_weather, stale_ability_guess, AI_WEATHER_SUN)
}

#[must_use]
fn run_cbm_hail(current_weather: Option<u8>, stale_ability_guess: u16) -> i32 {
    run_cbm_weather_setter(current_weather, stale_ability_guess, AI_WEATHER_HAIL)
}

#[must_use]
fn run_cbm_sandstorm(current_weather: Option<u8>, stale_ability_guess: u16) -> i32 {
    run_cbm_weather_setter(current_weather, stale_ability_guess, AI_WEATHER_SANDSTORM)
}

/// `AI_CBM_Magnitude` (`data/battle_ai_scripts.s:365-367`, EFFECT_MAGNITUDE,
/// TS :3331-3361): one fresh own ability read for the Levitate gate, then a
/// genuine fall-through into `run_cbm_high_risk_for_damage`'s own body (its
/// own x0 type check and its own second fresh ability read). A non-Levitate
/// result therefore draws twice inside this handler; a Levitate result
/// returns -10 after its single draw.
#[must_use]
fn run_cbm_magnitude(
    move_type: u8,
    target: &FactoryAiCheckBadMoveTarget,
    rng: BattleRngState,
    ordinal: u32,
) -> (
    BattleRngState,
    Option<CheckBadMoveDraw>,
    Option<CheckBadMoveDraw>,
    i32,
) {
    let levitate = next_get_ability_draw(
        rng,
        ordinal,
        CheckBadMoveDrawSite::MagnitudeLevitate,
        target,
    );
    if levitate.ability == ABILITY_LEVITATE {
        return (levitate.rng, levitate.draw, None, -10);
    }
    let next_ordinal = if levitate.draw.is_some() {
        ordinal + 1
    } else {
        ordinal
    };
    let (rng, high_risk_draw, score_delta) =
        run_cbm_high_risk_for_damage(move_type, target, levitate.rng, next_ordinal);
    (rng, levitate.draw, high_risk_draw, score_delta)
}

// === universal preamble ======================================================

/// Mirrors `runCheckBadMovePreamble`'s input (`factoryAiCheckBadMove.ts:1259-1266`),
/// minus `reasonPrefix` (see the module doc comment).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct CheckBadMovePreambleInput {
    pub rng: BattleRngState,
    pub move_id: u16,
    pub target: FactoryAiCheckBadMoveRoarTarget,
    pub attacker: FactoryAiCheckBadMoveAttacker,
    pub draw_ordinal_start: u32,
}

/// `AI_CheckBadMove`'s universal preamble for one move slot against one
/// target, plus M5b-1's 32-effect dispatch (`data/battle_ai_scripts.s:51-93`
/// and handler bodies, `factoryAiCheckBadMove.ts:1259-1333,1338-1810,
/// 2076-2118,2410-2419,2639-2650`): setup and `isMovePowerOther`
/// classification, the FISSURE/HORN_DRILL short-circuit, the type-immunity
/// `Score_Minus10`, the five ability-negation branches, the Soundproof
/// check, the M5b-1 dispatch blocks (TS source order), and the trailing
/// `if_effect` table barrier for every effect not yet in
/// `cbm_handled_effects()`. `input.attacker` is read by several M5b-1
/// handlers (Ingrain/FocusEnergy/Refresh/FutureSight/the weather quartet),
/// unlike M5b-0's own preamble-only scope.
#[must_use]
pub fn run_check_bad_move_preamble(input: CheckBadMovePreambleInput) -> CheckBadMoveResult {
    let move_row = gen_tables::MOVES.get(input.move_id as usize).unwrap_or_else(|| {
        panic!(
            "factory-ai-check-bad-move: unknown move id {} (TS :1268-1269 throws; gen_tables::MOVES is dense 0..355)",
            input.move_id
        )
    });
    let target = &input.target.target;

    let mut rng = input.rng;
    let mut draws = [DRAW_FILLER; MAX_CHECK_BAD_MOVE_DRAWS];
    let mut draw_count: u8 = 0;
    let mut ordinal = input.draw_ordinal_start;

    // isOhko/isMovePowerOther classification (TS :1284-1286): FISSURE/
    // HORN_DRILL force isMovePowerOther false regardless of their own power
    // (1) or effect (EFFECT_OHKO, not in IGNORED_POWERFUL_MOVE_EFFECTS
    // anyway) -- the "short-circuit" that keeps them inside the type/
    // ability-negation block below despite their trivially low power.
    let is_ohko = input.move_id == MOVE_FISSURE || input.move_id == MOVE_HORN_DRILL;
    let is_move_power_other = !is_ohko
        && (move_row.power <= 1 || IGNORED_POWERFUL_MOVE_EFFECTS.contains(&move_row.effect));

    if !is_move_power_other {
        // AI_CBM_CheckIfNegatesType (TS :1290-1296): x0 effectiveness jumps
        // straight to Score_Minus10, before any ability draw.
        let effectiveness_tenths = type_multiplier_tenths(move_row.move_type, target.types);
        if effectiveness_tenths == 0 {
            return CheckBadMoveResult::Scored { rng, draws, draw_count, score_delta: -10 };
        }

        let negates_type =
            next_get_ability_draw(rng, ordinal, CheckBadMoveDrawSite::NegatesType, target);
        rng = negates_type.rng;
        if let Some(draw) = negates_type.draw {
            draws[draw_count as usize] = draw;
            draw_count += 1;
            ordinal += 1;
        }
        let guessed = negates_type.ability;

        // The five ability-negation branches (TS :1297-1325), an if/else-if
        // chain in the source on a single `guessed` value: written here as
        // five independent flat conditions, which is behaviorally identical
        // since ABILITY_VOLT_ABSORB/WATER_ABSORB/FLASH_FIRE/WONDER_GUARD/
        // LEVITATE are mutually exclusive (at most one can ever match).
        // TS's own `negated` local is set in every branch's fallthrough and
        // immediately voided (`void negated;` :1325) -- genuinely dead, not
        // ported.
        if guessed == ABILITY_VOLT_ABSORB && move_row.move_type == TYPE_ELECTRIC {
            return CheckBadMoveResult::Scored { rng, draws, draw_count, score_delta: -12 };
        }
        if guessed == ABILITY_WATER_ABSORB && move_row.move_type == TYPE_WATER {
            return CheckBadMoveResult::Scored { rng, draws, draw_count, score_delta: -12 };
        }
        if guessed == ABILITY_FLASH_FIRE && move_row.move_type == TYPE_FIRE {
            return CheckBadMoveResult::Scored { rng, draws, draw_count, score_delta: -12 };
        }
        if guessed == ABILITY_WONDER_GUARD && effectiveness_tenths != 20 {
            return CheckBadMoveResult::Scored { rng, draws, draw_count, score_delta: -10 };
        }
        if guessed == ABILITY_LEVITATE && move_row.move_type == TYPE_GROUND {
            return CheckBadMoveResult::Scored { rng, draws, draw_count, score_delta: -10 };
        }
    }

    // AI_CheckBadMove_CheckSoundproof_ / AI_CheckBadMove_CheckSoundproof
    // (TS :1328-1333). `soundproof_guess` is exactly the value M5b-1's
    // weather quartet reads as the stale-`funcResult` fallback (batching doc
    // §2/§4) -- exposed here as a same-scope local, matching how TS's own
    // single, unsplit `runCheckBadMovePreamble` exposes it (the weather
    // handlers are later `if` blocks in the same function body, not a
    // separate call needing an explicit return-value channel).
    let soundproof = next_get_ability_draw(rng, ordinal, CheckBadMoveDrawSite::Soundproof, target);
    rng = soundproof.rng;
    if let Some(draw) = soundproof.draw {
        draws[draw_count as usize] = draw;
        draw_count += 1;
        ordinal += 1;
    }
    let soundproof_guess = soundproof.ability;
    if soundproof_guess == ABILITY_SOUNDPROOF && SOUNDPROOF_MOVES.contains(&input.move_id) {
        return CheckBadMoveResult::Scored { rng, draws, draw_count, score_delta: -10 };
    }

    // AI_CheckBadMove_CheckEffect: EFFECT_COUNTER/FLAIL/MIRROR_COAT/
    // FOCUS_PUNCH/LEVEL_DAMAGE/FRUSTRATION/RETURN/RECHARGE/ENDEAVOR/
    // SUPERPOWER/RAZOR_WIND/PSYWAVE/LOW_KICK/SUPER_FANG/PRESENT/SONICBOOM/
    // BIDE/SKULL_BASH -> AI_CBM_HighRiskForDamage, the shared 18-effect
    // cluster (TS :1338-1689, `data/battle_ai_scripts.s:156,160,182,196,
    // 154,173,171,151,203,200,128,155,206,129,172,177,123,183` -- one shared
    // handler body per the batching doc, not split into 18 separate Rust
    // arms).
    if move_row.effect == EFFECT_COUNTER
        || move_row.effect == EFFECT_FLAIL
        || move_row.effect == EFFECT_MIRROR_COAT
        || move_row.effect == EFFECT_FOCUS_PUNCH
        || move_row.effect == EFFECT_LEVEL_DAMAGE
        || move_row.effect == EFFECT_FRUSTRATION
        || move_row.effect == EFFECT_RETURN
        || move_row.effect == EFFECT_RECHARGE
        || move_row.effect == EFFECT_ENDEAVOR
        || move_row.effect == EFFECT_SUPERPOWER
        || move_row.effect == EFFECT_RAZOR_WIND
        || move_row.effect == EFFECT_PSYWAVE
        || move_row.effect == EFFECT_LOW_KICK
        || move_row.effect == EFFECT_SUPER_FANG
        || move_row.effect == EFFECT_PRESENT
        || move_row.effect == EFFECT_SONICBOOM
        || move_row.effect == EFFECT_BIDE
        || move_row.effect == EFFECT_SKULL_BASH
    {
        let (next_rng, draw, score_delta) =
            run_cbm_high_risk_for_damage(move_row.move_type, target, rng, ordinal);
        rng = next_rng;
        if let Some(draw) = draw {
            draws[draw_count as usize] = draw;
            draw_count += 1;
        }
        return CheckBadMoveResult::Scored { rng, draws, draw_count, score_delta };
    }

    // AI_CheckBadMove_CheckEffect: EFFECT_TELEPORT -> Score_Minus10 directly
    // (`data/battle_ai_scripts.s:185`, TS :1694-1701): the table entry is a
    // bare Score_Minus10 jump with no handler body. Teleport is penalized
    // unconditionally.
    if move_row.effect == EFFECT_TELEPORT {
        return CheckBadMoveResult::Scored { rng, draws, draw_count, score_delta: -10 };
    }

    // AI_CheckBadMove_CheckEffect: EFFECT_INGRAIN -> AI_CBM_Ingrain
    // (`data/battle_ai_scripts.s:199,550-552`, TS :1707-1714).
    if move_row.effect == EFFECT_INGRAIN {
        let score_delta = run_cbm_ingrain(input.attacker.is_rooted.unwrap_or(false));
        return CheckBadMoveResult::Scored { rng, draws, draw_count, score_delta };
    }

    // AI_CheckBadMove_CheckEffect: EFFECT_PERISH_SONG -> AI_CBM_PerishSong
    // (`data/battle_ai_scripts.s:167,447-449`, TS :1720-1727).
    if move_row.effect == EFFECT_PERISH_SONG {
        let score_delta = run_cbm_perish_song(target.has_perish_song.unwrap_or(false));
        return CheckBadMoveResult::Scored { rng, draws, draw_count, score_delta };
    }

    // AI_CheckBadMove_CheckEffect: EFFECT_NIGHTMARE -> AI_CBM_Nightmare
    // (`data/battle_ai_scripts.s:162,237-240`, TS :1733-1740).
    if move_row.effect == EFFECT_NIGHTMARE {
        let score_delta = run_cbm_nightmare(
            target.is_nightmared.unwrap_or(false),
            target.is_asleep.unwrap_or(false),
        );
        return CheckBadMoveResult::Scored { rng, draws, draw_count, score_delta };
    }

    // AI_CheckBadMove_CheckEffect: EFFECT_FORESIGHT -> AI_CBM_Foresight
    // (`data/battle_ai_scripts.s:166,443-445`, TS :1746-1753).
    if move_row.effect == EFFECT_FORESIGHT {
        let score_delta = run_cbm_foresight(target.is_foresighted.unwrap_or(false));
        return CheckBadMoveResult::Scored { rng, draws, draw_count, score_delta };
    }

    // AI_CheckBadMove_CheckEffect: EFFECT_SPIKES -> AI_CBM_Spikes
    // (`data/battle_ai_scripts.s:165,439-441`, TS :1759-1766).
    if move_row.effect == EFFECT_SPIKES {
        let score_delta = run_cbm_spikes(target.spikes_up.unwrap_or(false));
        return CheckBadMoveResult::Scored { rng, draws, draw_count, score_delta };
    }

    // AI_CheckBadMove_CheckEffect: EFFECT_FUTURE_SIGHT -> AI_CBM_FutureSight
    // (`data/battle_ai_scripts.s:184,500-504`, TS :1772-1782).
    if move_row.effect == EFFECT_FUTURE_SIGHT {
        let score_delta = run_cbm_future_sight(
            target.target_future_attack_up.unwrap_or(false),
            input.attacker.attacker_future_attack_up.unwrap_or(false),
        );
        return CheckBadMoveResult::Scored { rng, draws, draw_count, score_delta };
    }

    // AI_CheckBadMove_CheckEffect: EFFECT_FOCUS_ENERGY -> AI_CBM_FocusEnergy
    // (`data/battle_ai_scripts.s:131,382-384`, TS :1788-1795).
    if move_row.effect == EFFECT_FOCUS_ENERGY {
        let score_delta = run_cbm_focus_energy(input.attacker.has_focus_energy.unwrap_or(false));
        return CheckBadMoveResult::Scored { rng, draws, draw_count, score_delta };
    }

    // AI_CheckBadMove_CheckEffect: EFFECT_REFRESH -> AI_CBM_Refresh
    // (`data/battle_ai_scripts.s:205,563-565`, TS :1802-1809).
    if move_row.effect == EFFECT_REFRESH {
        let score_delta = run_cbm_refresh(input.attacker.has_curable_status.unwrap_or(false));
        return CheckBadMoveResult::Scored { rng, draws, draw_count, score_delta };
    }

    // AI_CheckBadMove_CheckEffect: EFFECT_RAIN_DANCE -> AI_CBM_RainDance
    // (`data/battle_ai_scripts.s:490-493`, TS :2076-2083).
    if move_row.effect == EFFECT_RAIN_DANCE {
        let score_delta = run_cbm_rain_dance(input.attacker.current_weather, soundproof_guess);
        return CheckBadMoveResult::Scored { rng, draws, draw_count, score_delta };
    }

    // AI_CheckBadMove_CheckEffect: EFFECT_SUNNY_DAY -> AI_CBM_SunnyDay
    // (`data/battle_ai_scripts.s:495-498`, TS :2085-2094).
    if move_row.effect == EFFECT_SUNNY_DAY {
        let score_delta = run_cbm_sunny_day(input.attacker.current_weather, soundproof_guess);
        return CheckBadMoveResult::Scored { rng, draws, draw_count, score_delta };
    }

    // AI_CheckBadMove_CheckEffect: EFFECT_HAIL -> AI_CBM_Hail
    // (`data/battle_ai_scripts.s:522-525`, TS :2096-2105).
    if move_row.effect == EFFECT_HAIL {
        let score_delta = run_cbm_hail(input.attacker.current_weather, soundproof_guess);
        return CheckBadMoveResult::Scored { rng, draws, draw_count, score_delta };
    }

    // AI_CheckBadMove_CheckEffect: EFFECT_SANDSTORM -> AI_CBM_Sandstorm
    // (`data/battle_ai_scripts.s:168,451-454`, TS :2107-2118).
    if move_row.effect == EFFECT_SANDSTORM {
        let score_delta = run_cbm_sandstorm(input.attacker.current_weather, soundproof_guess);
        return CheckBadMoveResult::Scored { rng, draws, draw_count, score_delta };
    }

    // AI_CheckBadMove_CheckEffect: EFFECT_MAGNITUDE -> AI_CBM_Magnitude
    // (`data/battle_ai_scripts.s:175,365-367`, TS :2410-2419): a fresh own
    // ability read (Levitate -> -10), then FALLS THROUGH into
    // AI_CBM_HighRiskForDamage's own x0/Wonder Guard body with a second
    // fresh ability read.
    if move_row.effect == EFFECT_MAGNITUDE {
        let (next_rng, levitate_draw, high_risk_draw, score_delta) =
            run_cbm_magnitude(move_row.move_type, target, rng, ordinal);
        rng = next_rng;
        if let Some(draw) = levitate_draw {
            draws[draw_count as usize] = draw;
            draw_count += 1;
        }
        if let Some(draw) = high_risk_draw {
            draws[draw_count as usize] = draw;
            draw_count += 1;
        }
        return CheckBadMoveResult::Scored { rng, draws, draw_count, score_delta };
    }

    // AI_CheckBadMove_CheckEffect: source-complete if_effect table lookup
    // (TS :2639-2647). Every table effect not yet in `cbm_handled_effects()`
    // halts here.
    if CBM_TABLE_EFFECTS.contains(&move_row.effect) {
        return CheckBadMoveResult::NotYetPorted {
            effect: move_row.effect,
            move_id: input.move_id,
        };
    }

    CheckBadMoveResult::Scored { rng, draws, draw_count, score_delta: 0 }
}

#[cfg(test)]
mod tests {
    use super::*;

    // Species fixtures (verified against gen_tables::SPECIES directly, not
    // recalled): 105 SPECIES_MAROWAK abilities [69 ROCK_HEAD, 31
    // LIGHTNING_ROD] (two distinct, non-trapper, non-negating, non-Soundproof
    // -- TS's own MAROWAK preamble-test fixture, factoryAiCheckBadMove.test.ts:19-28);
    // 25 SPECIES_PIKACHU abilities [9 STATIC, 0 NONE] (single-ability); 213
    // SPECIES_SHUCKLE abilities [5 STURDY, 0 NONE] (single-ability, TS's own
    // GENERIC_BARRIER_TARGET fixture, test.ts:1484-1493).
    const MAROWAK: u16 = 105;
    const ABILITY_ROCK_HEAD: u16 = 69;
    const PIKACHU: u16 = 25;
    const ABILITY_STATIC: u16 = 9;
    const SHUCKLE: u16 = 213;
    const ABILITY_STURDY: u16 = 5;

    const TYPE_NORMAL: u8 = 0;
    const TYPE_PSYCHIC: u8 = 14;
    const TYPE_FLYING: u8 = 2;
    const TYPE_GRASS: u8 = 12;
    const TYPE_GHOST: u8 = 7;
    const TYPE_ROCK: u8 = 5;
    const TYPE_BUG: u8 = 6;

    fn target(
        species: u16,
        types: [u8; 2],
        known_ability: Option<u16>,
        real_ability: u16,
    ) -> FactoryAiCheckBadMoveTarget {
        FactoryAiCheckBadMoveTarget {
            species,
            types,
            known_ability,
            real_ability,
            speed_stage: 6,
            atk_stage: 6,
            def_stage: 6,
            sp_def_stage: 6,
            acc_stage: None,
            evasion_stage: None,
            has_any_status: None,
            safeguard_up: None,
            is_confused: None,
            is_leech_seeded: None,
            is_asleep: None,
            is_escape_prevented: None,
            is_tormented: None,
            has_perish_song: None,
            is_nightmared: None,
            is_foresighted: None,
            spikes_up: None,
            target_future_attack_up: None,
            level: None,
            sp_atk_stage: None,
            is_infatuated: None,
            any_move_disabled: None,
            any_move_encored: None,
            gender: None,
        }
    }

    fn roar_target(t: FactoryAiCheckBadMoveTarget) -> FactoryAiCheckBadMoveRoarTarget {
        FactoryAiCheckBadMoveRoarTarget { target: t, usable_party_mons: None }
    }

    fn neutral_attacker() -> FactoryAiCheckBadMoveAttacker {
        FactoryAiCheckBadMoveAttacker {
            atk_stage: 6,
            def_stage: 6,
            speed_stage: None,
            sp_atk_stage: None,
            sp_def_stage: None,
            light_screen_up: None,
            reflect_up: None,
            evasion_stage: None,
            attacker_future_attack_up: None,
            has_focus_energy: None,
            has_curable_status: None,
            current_weather: None,
            level: None,
            is_first_turn: None,
            safeguard_up: None,
            is_asleep: None,
            usable_party_mons: None,
            has_substitute: None,
            hp: None,
            max_hp: None,
            is_rooted: None,
            acc_stage: None,
            mist_up: None,
            gender: None,
            imprisoned_others: None,
            mud_sport_up: None,
            water_sport_up: None,
            used_held_item_id: None,
            stockpile_count: None,
        }
    }

    fn run(move_id: u16, t: FactoryAiCheckBadMoveTarget, rng_value: u32) -> CheckBadMoveResult {
        run_check_bad_move_preamble(CheckBadMovePreambleInput {
            rng: BattleRngState { value: rng_value, calls: 0 },
            move_id,
            target: roar_target(t),
            attacker: neutral_attacker(),
            draw_ordinal_start: 1,
        })
    }

    fn run_with_attacker(
        move_id: u16,
        t: FactoryAiCheckBadMoveTarget,
        rng_value: u32,
        attacker: FactoryAiCheckBadMoveAttacker,
    ) -> CheckBadMoveResult {
        run_check_bad_move_preamble(CheckBadMovePreambleInput {
            rng: BattleRngState { value: rng_value, calls: 0 },
            move_id,
            target: roar_target(t),
            attacker,
            draw_ordinal_start: 1,
        })
    }

    const RNG_SEED: u32 = 249_678_687; // tests/factoryAiCheckBadMove.test.ts:1541 (`run`'s default rngValue).

    // === next_get_ability_draw (draw-plumbing quirks, module doc comment :1-12) ===

    #[test]
    fn trapper_ability_short_circuits_without_a_draw() {
        // TS :720-722.
        let t = target(
            PIKACHU,
            [TYPE_NORMAL, TYPE_NORMAL],
            None,
            ABILITY_SHADOW_TAG,
        );
        let result = next_get_ability_draw(
            BattleRngState { value: RNG_SEED, calls: 0 },
            1,
            CheckBadMoveDrawSite::NegatesType,
            &t,
        );
        assert_eq!(result.ability, ABILITY_SHADOW_TAG);
        assert!(result.draw.is_none());
        assert_eq!(result.rng, BattleRngState { value: RNG_SEED, calls: 0 });
    }

    #[test]
    fn known_ability_short_circuits_without_a_draw() {
        // TS :723-725.
        let t = target(
            MAROWAK,
            [TYPE_NORMAL, TYPE_NORMAL],
            Some(ABILITY_ROCK_HEAD),
            ABILITY_ROCK_HEAD,
        );
        let result = next_get_ability_draw(
            BattleRngState { value: RNG_SEED, calls: 0 },
            1,
            CheckBadMoveDrawSite::NegatesType,
            &t,
        );
        assert_eq!(result.ability, ABILITY_ROCK_HEAD);
        assert!(result.draw.is_none());
    }

    #[test]
    fn single_ability_species_short_circuits_without_a_draw() {
        // TS :728-730 (ability1 === "ABILITY_NONE").
        let t = target(PIKACHU, [TYPE_NORMAL, TYPE_NORMAL], None, ABILITY_STATIC);
        let result = next_get_ability_draw(
            BattleRngState { value: RNG_SEED, calls: 0 },
            1,
            CheckBadMoveDrawSite::NegatesType,
            &t,
        );
        assert_eq!(result.ability, ABILITY_STATIC);
        assert!(result.draw.is_none());
    }

    #[test]
    fn two_ability_species_with_unknown_ability_draws_and_advances_rng() {
        // TS :732-746: a genuine `advanceRngValue` draw, guessed_ability one
        // of the species' two abilities (69 ROCK_HEAD / 31 LIGHTNING_ROD).
        let t = target(MAROWAK, [TYPE_NORMAL, TYPE_NORMAL], None, ABILITY_ROCK_HEAD);
        let before = BattleRngState { value: RNG_SEED, calls: 0 };
        let result = next_get_ability_draw(before, 3, CheckBadMoveDrawSite::NegatesType, &t);
        let draw = result
            .draw
            .expect("two distinct unknown abilities must draw");
        assert_eq!(draw.ordinal, 3);
        assert_eq!(draw.site, CheckBadMoveDrawSite::NegatesType);
        assert_eq!(draw.before, before);
        assert_eq!(draw.raw_rng_value, advance_rng_value(RNG_SEED));
        assert_eq!(
            draw.after,
            BattleRngState { value: draw.raw_rng_value, calls: 1 }
        );
        assert!(draw.guessed_ability == 69 || draw.guessed_ability == 31);
        assert_eq!(result.rng, draw.after);
        assert_ne!(result.rng, before);
    }

    #[test]
    fn never_caches_two_calls_against_the_same_target_both_draw_and_advance() {
        // module doc comment :1-12 / test.ts:1582-1593: both static preamble
        // call sites redraw fresh, even reusing the identical `target`.
        let t = target(MAROWAK, [TYPE_NORMAL, TYPE_NORMAL], None, ABILITY_ROCK_HEAD);
        let first = next_get_ability_draw(
            BattleRngState { value: RNG_SEED, calls: 0 },
            1,
            CheckBadMoveDrawSite::NegatesType,
            &t,
        );
        let first_draw = first.draw.expect("first call draws");
        let second = next_get_ability_draw(first.rng, 2, CheckBadMoveDrawSite::Soundproof, &t);
        let second_draw = second.draw.expect("second call also draws -- never cached");
        assert_eq!(first_draw.after, second_draw.before);
        assert_ne!(first_draw.before, second_draw.before);
    }

    // === check_ability_ai_target (abilityDummyVariable collapse, TS :758-769) ===

    #[test]
    fn check_ability_ai_target_trapper_compares_real_ability_directly() {
        let t = target(
            PIKACHU,
            [TYPE_NORMAL, TYPE_NORMAL],
            None,
            ABILITY_SHADOW_TAG,
        );
        assert!(check_ability_ai_target(&t, ABILITY_SHADOW_TAG));
        assert!(!check_ability_ai_target(&t, ABILITY_MAGNET_PULL));
    }

    #[test]
    fn check_ability_ai_target_known_ability_compares_directly() {
        let t = target(
            MAROWAK,
            [TYPE_NORMAL, TYPE_NORMAL],
            Some(ABILITY_ROCK_HEAD),
            ABILITY_ROCK_HEAD,
        );
        assert!(check_ability_ai_target(&t, ABILITY_ROCK_HEAD));
        assert!(!check_ability_ai_target(&t, ABILITY_STATIC));
    }

    #[test]
    fn check_ability_ai_target_single_ability_species_compares_directly() {
        let t = target(PIKACHU, [TYPE_NORMAL, TYPE_NORMAL], None, ABILITY_STATIC);
        assert!(check_ability_ai_target(&t, ABILITY_STATIC));
        assert!(!check_ability_ai_target(&t, ABILITY_ROCK_HEAD));
    }

    #[test]
    fn check_ability_ai_target_two_ability_species_never_matches_either_ability() {
        // The abilityDummyVariable collapse: neither "one of the two" nor
        // "neither" ever registers a match when the ability is unobserved.
        let t = target(MAROWAK, [TYPE_NORMAL, TYPE_NORMAL], None, ABILITY_ROCK_HEAD);
        assert!(!check_ability_ai_target(&t, ABILITY_ROCK_HEAD)); // slot 0, still no match
        assert!(!check_ability_ai_target(&t, 31)); // LIGHTNING_ROD, slot 1
        assert!(!check_ability_ai_target(&t, ABILITY_STURDY)); // neither slot
    }

    // === type_multiplier_tenths (TS :1242-1252) ==================================

    #[test]
    fn type_multiplier_tenths_dual_same_type_counts_once() {
        // Electric vs Ground/Ground: a single 0x application, not squared.
        assert_eq!(
            type_multiplier_tenths(TYPE_ELECTRIC, [TYPE_GROUND, TYPE_GROUND]),
            0
        );
    }

    #[test]
    fn type_multiplier_tenths_stacks_across_distinct_defending_types() {
        // Ice vs Dragon/Flying: 2x * 2x = 4x (gen_tables::TYPE_EFFECTIVENESS_TABLE
        // rows attacking_type=15 -> defending_type=16 and ->defending_type=2,
        // both multiplier_tenths 20).
        const TYPE_ICE: u8 = 15;
        const TYPE_DRAGON: u8 = 16;
        assert_eq!(
            type_multiplier_tenths(TYPE_ICE, [TYPE_DRAGON, TYPE_FLYING]),
            40
        );
    }

    #[test]
    fn type_multiplier_tenths_missing_entry_is_neutral() {
        assert_eq!(
            type_multiplier_tenths(TYPE_NORMAL, [TYPE_NORMAL, TYPE_PSYCHIC]),
            10
        );
    }

    // === completeness-probe machinery ============================================

    #[test]
    fn unported_returns_77_effects_after_m5b1_lands() {
        assert_eq!(cbm_handled_effects().len(), 32);
        assert_eq!(CBM_HANDLED_EFFECTS_M5B1.len(), 32);
        let unported = unported_cbm_table_effects();
        assert_eq!(unported.len(), 77);
        let mut expected: Vec<u16> = CBM_TABLE_EFFECTS
            .iter()
            .copied()
            .filter(|effect| !CBM_HANDLED_EFFECTS_M5B1.contains(effect))
            .collect();
        expected.sort_unstable();
        assert_eq!(unported, expected);
    }

    #[test]
    fn first_move_id_with_effect_finds_a_real_move_for_most_table_effects() {
        // 99 of the 109 table effects reach a real Gen-3 move; 10 are
        // vestigial (verified directly against src/data/gen/moves.json, not
        // recalled) -- ACCURACY_DOWN_2/ACCURACY_UP(+_2)/SPECIAL_ATTACK_DOWN(+_2)/
        // SPEED_UP/SPECIAL_DEFENSE_UP/SPECIAL_DEFENSE_DOWN/EVASION_UP_2.
        let with_move = CBM_TABLE_EFFECTS
            .iter()
            .filter(|&&e| first_move_id_with_effect(e).is_some())
            .count();
        assert_eq!(with_move, 99);
    }

    // === universal preamble: directed cases ported from
    // tests/factoryAiCheckBadMove.test.ts's "AI_CheckBadMove universal
    // preamble" describe block (:1554-1716), plus the FISSURE/HORN_DRILL
    // short-circuit pair. ===

    #[test]
    fn type_immune_move_scores_minus10_with_zero_draws() {
        // test.ts:1555-1561 (MOVE_THUNDERBOLT vs MAROWAK, Electric vs
        // Ground/Ground = 0x).
        let t = target(MAROWAK, [TYPE_GROUND, TYPE_GROUND], None, ABILITY_ROCK_HEAD);
        let result = run(85 /* MOVE_THUNDERBOLT */, t, RNG_SEED);
        assert_eq!(
            result,
            CheckBadMoveResult::Scored {
                rng: BattleRngState { value: RNG_SEED, calls: 0 },
                draws: [DRAW_FILLER; MAX_CHECK_BAD_MOVE_DRAWS],
                draw_count: 0,
                score_delta: -10,
            }
        );
    }

    #[test]
    fn non_immune_no_table_entry_move_draws_exactly_two_and_scores_zero() {
        // test.ts:1563-1580 (Surf/RockSlide/BodySlam vs MAROWAK).
        for move_id in [57u16, 157, 34] {
            let t = target(MAROWAK, [TYPE_GROUND, TYPE_GROUND], None, ABILITY_ROCK_HEAD);
            let result = run(move_id, t, RNG_SEED);
            match result {
                CheckBadMoveResult::Scored { rng, draw_count, score_delta, draws } => {
                    assert_eq!(draw_count, 2, "move {move_id}");
                    assert_eq!(score_delta, 0, "move {move_id}");
                    assert_eq!(rng.calls, 2, "move {move_id}");
                    assert_eq!(
                        draws[0].site,
                        CheckBadMoveDrawSite::NegatesType,
                        "move {move_id}"
                    );
                    assert_eq!(
                        draws[1].site,
                        CheckBadMoveDrawSite::Soundproof,
                        "move {move_id}"
                    );
                }
                other => panic!("move {move_id}: expected Scored, got {other:?}"),
            }
        }
    }

    #[test]
    fn never_caches_both_preamble_draws_advance_independently() {
        // test.ts:1582-1593.
        let t = target(MAROWAK, [TYPE_GROUND, TYPE_GROUND], None, ABILITY_ROCK_HEAD);
        let CheckBadMoveResult::Scored { draws, draw_count, .. } =
            run(57 /* MOVE_SURF */, t, RNG_SEED)
        else {
            panic!("expected Scored");
        };
        assert_eq!(draw_count, 2);
        assert_eq!(draws[0].after, draws[1].before);
        assert_ne!(draws[0].before, draws[1].before);
    }

    #[test]
    fn skips_redraw_entirely_once_ability_is_known() {
        // test.ts:1595-1601.
        let t = target(
            MAROWAK,
            [TYPE_GROUND, TYPE_GROUND],
            Some(ABILITY_ROCK_HEAD),
            ABILITY_ROCK_HEAD,
        );
        let result = run(57 /* MOVE_SURF */, t, RNG_SEED);
        assert_eq!(
            result,
            CheckBadMoveResult::Scored {
                rng: BattleRngState { value: RNG_SEED, calls: 0 },
                draws: [DRAW_FILLER; MAX_CHECK_BAD_MOVE_DRAWS],
                draw_count: 0,
                score_delta: 0,
            }
        );
    }

    #[test]
    fn trapper_species_uses_real_ability_without_drawing() {
        // test.ts:1603-1618.
        let t = target(
            PIKACHU,
            [TYPE_ELECTRIC, TYPE_ELECTRIC],
            None,
            ABILITY_SHADOW_TAG,
        );
        let result = run(57 /* MOVE_SURF */, t, RNG_SEED);
        let CheckBadMoveResult::Scored { draw_count, .. } = result else {
            panic!("expected Scored")
        };
        assert_eq!(draw_count, 0);
    }

    #[test]
    fn volt_absorb_scores_minus12_against_an_electric_move() {
        // test.ts:1620-1633.
        let t = target(
            171, /* SPECIES_LANTURN, irrelevant: ability known */
            [TYPE_GRASS, TYPE_GRASS],
            Some(ABILITY_VOLT_ABSORB),
            ABILITY_VOLT_ABSORB,
        );
        let result = run(85 /* MOVE_THUNDERBOLT */, t, RNG_SEED);
        let CheckBadMoveResult::Scored { score_delta, draw_count, .. } = result else {
            panic!("expected Scored")
        };
        assert_eq!(score_delta, -12);
        assert_eq!(draw_count, 0);
    }

    #[test]
    fn water_absorb_does_not_negate_an_electric_move_and_falls_through() {
        // test.ts:1635-1650.
        let t = target(
            171,
            [TYPE_GRASS, TYPE_GRASS],
            Some(ABILITY_WATER_ABSORB),
            ABILITY_WATER_ABSORB,
        );
        let result = run(85 /* MOVE_THUNDERBOLT */, t, RNG_SEED);
        let CheckBadMoveResult::Scored { score_delta, draw_count, .. } = result else {
            panic!("expected Scored")
        };
        assert_eq!(score_delta, 0);
        assert_eq!(draw_count, 0);
    }

    #[test]
    fn wonder_guard_scores_minus10_when_the_move_is_not_double_effective() {
        // test.ts:1652-1665.
        let t = target(
            386,
            [TYPE_NORMAL, TYPE_NORMAL],
            Some(ABILITY_WONDER_GUARD),
            ABILITY_WONDER_GUARD,
        );
        let result = run(
            34, /* MOVE_BODY_SLAM, Normal vs Normal = 1x */
            t, RNG_SEED,
        );
        let CheckBadMoveResult::Scored { score_delta, .. } = result else {
            panic!("expected Scored")
        };
        assert_eq!(score_delta, -10);
    }

    #[test]
    fn soundproof_scores_minus10_on_a_sound_move_in_the_nine_move_list() {
        // test.ts:1667-1680.
        let t = target(
            1,
            [TYPE_NORMAL, TYPE_NORMAL],
            Some(ABILITY_SOUNDPROOF),
            ABILITY_SOUNDPROOF,
        );
        let result = run(173 /* MOVE_SNORE */, t, RNG_SEED);
        let CheckBadMoveResult::Scored { score_delta, draw_count, .. } = result else {
            panic!("expected Scored")
        };
        assert_eq!(score_delta, -10);
        assert_eq!(draw_count, 0);
    }

    #[test]
    fn fissure_short_circuit_reaches_the_type_immunity_check_despite_power_1() {
        // Ground (Fissure's type) vs Flying/Flying = 0x
        // (gen_tables::TYPE_EFFECTIVENESS_TABLE attacking_type=4 ->
        // defending_type=2, multiplier_tenths=0). Proves isOhko forces
        // isMovePowerOther false (TS :1284-1286): a non-OHKO power<=1 move
        // would skip this check entirely (see the Psywave contrast test).
        let t = target(
            SHUCKLE,
            [TYPE_FLYING, TYPE_FLYING],
            Some(ABILITY_STURDY),
            ABILITY_STURDY,
        );
        let result = run(MOVE_FISSURE, t, RNG_SEED);
        let CheckBadMoveResult::Scored { score_delta, draw_count, .. } = result else {
            panic!("expected Scored")
        };
        assert_eq!(score_delta, -10);
        assert_eq!(draw_count, 0);
    }

    #[test]
    fn horn_drill_short_circuit_also_reaches_the_type_immunity_check() {
        // Normal (Horn Drill's type) vs Ghost/Ghost = 0x (attacking_type=0
        // -> defending_type=7).
        let t = target(
            SHUCKLE,
            [TYPE_GHOST, TYPE_GHOST],
            Some(ABILITY_STURDY),
            ABILITY_STURDY,
        );
        let result = run(MOVE_HORN_DRILL, t, RNG_SEED);
        let CheckBadMoveResult::Scored { score_delta, .. } = result else {
            panic!("expected Scored")
        };
        assert_eq!(score_delta, -10);
    }

    #[test]
    fn ordinary_power_1_move_skips_the_type_immunity_check_unlike_ohko() {
        // Contrast case: MOVE_MEAN_LOOK (power 0, EFFECT_MEAN_LOOK, not
        // FISSURE/HORN_DRILL, still unported after M5b-1) is movePowerOther,
        // so the immunity block never runs even against Normal-vs-Ghost's
        // genuine 0x matchup (attacking_type=0 -> defending_type=7,
        // multiplier_tenths=0, the same pairing as the Horn Drill test
        // above) -- it falls through to the table barrier instead of
        // scoring -10. (M5b-0 originally used MOVE_PSYWAVE here; M5b-1 ports
        // EFFECT_PSYWAVE into the HighRiskForDamage cluster, so this pin
        // moved to a still-unported effect with the same 0x-immunity shape.)
        let t = target(
            SHUCKLE,
            [TYPE_GHOST, TYPE_GHOST],
            Some(ABILITY_STURDY),
            ABILITY_STURDY,
        );
        let result = run(212 /* MOVE_MEAN_LOOK */, t, RNG_SEED);
        assert_eq!(
            result,
            CheckBadMoveResult::NotYetPorted { effect: EFFECT_MEAN_LOOK, move_id: 212 }
        );
    }

    #[test]
    fn generic_barrier_fires_for_the_first_unported_table_effect() {
        // test.ts:1682-1688 / :1520-1536 (assertGenericCbmBarrierFires),
        // ported as a dynamic lookup so this pin survives future batches.
        let unported = unported_cbm_table_effects();
        let example = unported
            .iter()
            .find_map(|&effect| first_move_id_with_effect(effect).map(|id| (effect, id)));
        let t = target(
            SHUCKLE,
            [TYPE_PSYCHIC, TYPE_PSYCHIC],
            Some(ABILITY_STURDY),
            ABILITY_STURDY,
        );
        match example {
            Some((effect, move_id)) => {
                assert_eq!(
                    run(move_id, t, RNG_SEED),
                    CheckBadMoveResult::NotYetPorted { effect, move_id }
                );
            }
            None => {
                for &effect in CBM_TABLE_EFFECTS.iter() {
                    if let Some(move_id) = first_move_id_with_effect(effect) {
                        let CheckBadMoveResult::Scored { .. } = run(move_id, t, RNG_SEED) else {
                            panic!(
                                "effect {effect} move {move_id}: expected Scored once fully ported"
                            );
                        };
                    }
                }
            }
        }
    }

    #[test]
    fn every_still_unported_table_effect_halts_at_the_notyetported_barrier() {
        // Sweeps every still-unported table effect after M5b-1 (skipping
        // those with no real Gen-3 move, matching TS's "skipped in both
        // directions" comment, test.ts:1517-1518) against the
        // GENERIC_BARRIER_TARGET-equivalent fixture (test.ts:1484-1493):
        // single-ability known Sturdy, so every preamble draw short-circuits
        // and every still-unported table-effect move reaches the barrier
        // untouched. All 32 M5b-1 effects have a real move (verified against
        // src/data/gen/moves.json), so this drops from 99 to 67 = 99 - 32.
        let t = target(
            SHUCKLE,
            [TYPE_PSYCHIC, TYPE_PSYCHIC],
            Some(ABILITY_STURDY),
            ABILITY_STURDY,
        );
        let mut checked = 0;
        for effect in unported_cbm_table_effects() {
            if let Some(move_id) = first_move_id_with_effect(effect) {
                assert_eq!(
                    run(move_id, t, RNG_SEED),
                    CheckBadMoveResult::NotYetPorted { effect, move_id },
                    "effect {effect} move {move_id}"
                );
                checked += 1;
            }
        }
        assert_eq!(checked, 67);
    }

    #[test]
    fn every_m5b1_handled_effect_scores_instead_of_halting() {
        // The converse of the sweep above: every one of M5b-1's 32 handled
        // effects now reaches a `Scored` result (never `NotYetPorted`) for
        // its first reachable Gen-3 move, against the same generic
        // ability-short-circuiting fixture.
        let t = target(
            SHUCKLE,
            [TYPE_PSYCHIC, TYPE_PSYCHIC],
            Some(ABILITY_STURDY),
            ABILITY_STURDY,
        );
        let mut checked = 0;
        for &effect in CBM_HANDLED_EFFECTS_M5B1.iter() {
            let move_id = first_move_id_with_effect(effect)
                .unwrap_or_else(|| panic!("effect {effect}: expected a real Gen-3 move"));
            let CheckBadMoveResult::Scored { .. } = run(move_id, t, RNG_SEED) else {
                panic!(
                    "effect {effect} move {move_id}: expected Scored, M5b-1 handles this effect"
                );
            };
            checked += 1;
        }
        assert_eq!(checked, 32);
    }

    #[test]
    fn reproduces_ground_truth_scenario_a_per_slot_draw_and_score_shape() {
        // test.ts:1690-1713 (docs/factory-ai-ground-truth.md §4 item 2/§0(2)):
        // Surf/RockSlide/BodySlam draw 2 each (ability-negation + soundproof,
        // neither matches Rock Head/Lightning Rod); Thunderbolt draws 0 (x0
        // short-circuit). Expected totals are the TS test's own pinned
        // values, not re-derived here.
        let slots = [57u16, 157, 34, 85];
        let t = target(MAROWAK, [TYPE_GROUND, TYPE_GROUND], None, ABILITY_ROCK_HEAD);
        let mut rng = BattleRngState { value: RNG_SEED, calls: 0 };
        let mut total_draws: u32 = 0;
        let mut scores = Vec::new();
        for move_id in slots {
            let result = run_check_bad_move_preamble(CheckBadMovePreambleInput {
                rng,
                move_id,
                target: roar_target(t),
                attacker: neutral_attacker(),
                draw_ordinal_start: total_draws + 1,
            });
            let CheckBadMoveResult::Scored { rng: next_rng, draw_count, score_delta, .. } = result
            else {
                panic!("move {move_id}: expected Scored");
            };
            rng = next_rng;
            total_draws += draw_count as u32;
            scores.push(score_delta);
        }
        assert_eq!(total_draws, 6);
        assert_eq!(scores, vec![0, 0, 0, -10]);
    }

    // === M5b-1: AI_CBM_HighRiskForDamage (TS :2681-2706, test.ts:30-931) =====

    const TYPE_FIGHTING: u8 = 1;

    #[test]
    fn high_risk_for_damage_x0_effectiveness_scores_minus10_with_no_draw() {
        // Fighting vs Ghost/Ghost = 0x -- JUMPs to -10 before the handler's
        // own ability read (TS :2692-2695, test.ts:46-54).
        let t = target(SHUCKLE, [TYPE_GHOST, TYPE_GHOST], None, ABILITY_STURDY);
        let before = BattleRngState { value: RNG_SEED, calls: 0 };
        let (rng, draw, score_delta) = run_cbm_high_risk_for_damage(TYPE_FIGHTING, &t, before, 1);
        assert_eq!(score_delta, -10);
        assert!(draw.is_none());
        assert_eq!(rng, before);
    }

    #[test]
    fn high_risk_for_damage_non_wonder_guard_falls_through_to_zero() {
        // TS :2696-2705, test.ts:56-61: a non-Wonder-Guard result always
        // scores 0, regardless of which of Marowak's two abilities is
        // guessed.
        let t = target(MAROWAK, [TYPE_WATER, TYPE_WATER], None, ABILITY_ROCK_HEAD);
        let before = BattleRngState { value: RNG_SEED, calls: 0 };
        let (rng, draw, score_delta) = run_cbm_high_risk_for_damage(TYPE_FIGHTING, &t, before, 1);
        assert_eq!(score_delta, 0);
        let draw = draw.expect("two distinct unknown abilities must draw");
        assert_eq!(draw.site, CheckBadMoveDrawSite::HighRiskForDamageAbility);
        assert_eq!(draw.before, before);
        assert_ne!(rng, before);
    }

    #[test]
    fn high_risk_for_damage_wonder_guard_with_x2_effectiveness_scores_zero() {
        // TS :2701-2704, test.ts:63-69: Wonder Guard only ever penalizes
        // when effectiveness is NOT the expected x2 -- an x2 match falls to
        // the end at zero.
        let t = target(
            SHUCKLE,
            [TYPE_NORMAL, TYPE_NORMAL],
            Some(ABILITY_WONDER_GUARD),
            ABILITY_WONDER_GUARD,
        );
        let (_, draw, score_delta) = run_cbm_high_risk_for_damage(
            TYPE_FIGHTING,
            &t,
            BattleRngState { value: RNG_SEED, calls: 0 },
            1,
        );
        assert_eq!(score_delta, 0);
        assert!(draw.is_none()); // known ability -- zero-RNG short-circuit
    }

    #[test]
    fn high_risk_for_damage_wonder_guard_with_non_x2_effectiveness_scores_minus10() {
        // TS :2701-2704, test.ts:71-76.
        let t = target(
            SHUCKLE,
            [TYPE_WATER, TYPE_WATER],
            Some(ABILITY_WONDER_GUARD),
            ABILITY_WONDER_GUARD,
        );
        let (_, _, score_delta) = run_cbm_high_risk_for_damage(
            TYPE_FIGHTING,
            &t,
            BattleRngState { value: RNG_SEED, calls: 0 },
            1,
        );
        assert_eq!(score_delta, -10);
    }

    #[test]
    fn high_risk_for_damage_cluster_dispatch_reaches_the_shared_handler() {
        // Two representative cluster members through the full preamble:
        // Counter (own power 1, NOT in IGNORED_POWERFUL_MOVE_EFFECTS) and
        // Skull Bash (power 100, IS in the ignored list) -- both are
        // isMovePowerOther regardless, so neither ever draws a negates-type
        // ability; only soundproof + the handler's own draw fire (TS
        // test.ts:30-90 / Skull Bash's own describe block).
        let t = target(MAROWAK, [TYPE_WATER, TYPE_WATER], None, ABILITY_ROCK_HEAD);
        for move_id in [68u16 /* Counter */, 130 /* Skull Bash */] {
            let result = run(move_id, t, RNG_SEED);
            let CheckBadMoveResult::Scored { draws, draw_count, .. } = result else {
                panic!("move {move_id}: expected Scored")
            };
            assert_eq!(draw_count, 2, "move {move_id}");
            assert_eq!(
                draws[0].site,
                CheckBadMoveDrawSite::Soundproof,
                "move {move_id}"
            );
            assert_eq!(
                draws[1].site,
                CheckBadMoveDrawSite::HighRiskForDamageAbility,
                "move {move_id}"
            );
        }
    }

    // === M5b-1: EFFECT_TELEPORT (TS :1694-1701, test.ts:932-939) =============

    #[test]
    fn teleport_scores_minus10_unconditionally_with_zero_draws() {
        let t = target(
            MAROWAK,
            [TYPE_GROUND, TYPE_GROUND],
            Some(ABILITY_ROCK_HEAD),
            ABILITY_ROCK_HEAD,
        );
        let result = run(100 /* MOVE_TELEPORT */, t, RNG_SEED);
        let CheckBadMoveResult::Scored { score_delta, draw_count, .. } = result else {
            panic!("expected Scored")
        };
        assert_eq!(score_delta, -10);
        assert_eq!(draw_count, 0);
    }

    // === M5b-1: the 8 zero-RNG single-flag handlers (TS :3158-3255, ==========
    // test.ts:941-1207) ==========================================================

    #[test]
    fn run_cbm_ingrain_branches() {
        // TS :3158-3160, test.ts:958-971.
        assert_eq!(run_cbm_ingrain(true), -10);
        assert_eq!(run_cbm_ingrain(false), 0);
    }

    #[test]
    fn run_cbm_perish_song_branches() {
        // TS :3168-3170, test.ts:991-1002.
        assert_eq!(run_cbm_perish_song(true), -10);
        assert_eq!(run_cbm_perish_song(false), 0);
    }

    #[test]
    fn run_cbm_nightmare_branches() {
        // TS :3187-3192, test.ts:1022-1040: sequential JUMPs, never
        // additive -- a Nightmared target never reaches the sleep check.
        assert_eq!(run_cbm_nightmare(true, true), -10);
        assert_eq!(run_cbm_nightmare(true, false), -10);
        assert_eq!(run_cbm_nightmare(false, true), 0);
        assert_eq!(run_cbm_nightmare(false, false), -8);
    }

    #[test]
    fn run_cbm_foresight_branches() {
        // TS :3200-3202, test.ts:1060-1071.
        assert_eq!(run_cbm_foresight(true), -10);
        assert_eq!(run_cbm_foresight(false), 0);
    }

    #[test]
    fn run_cbm_spikes_branches() {
        // TS :3210-3212, test.ts:1091-1102.
        assert_eq!(run_cbm_spikes(true), -10);
        assert_eq!(run_cbm_spikes(false), 0);
    }

    #[test]
    fn run_cbm_future_sight_branches() {
        // TS :3230-3235, test.ts:1122-1140: either side JUMPs to -12; the
        // all-clear path FALLS THROUGH to +5, never additive.
        assert_eq!(run_cbm_future_sight(true, false), -12);
        assert_eq!(run_cbm_future_sight(false, true), -12);
        assert_eq!(run_cbm_future_sight(true, true), -12);
        assert_eq!(run_cbm_future_sight(false, false), 5);
    }

    #[test]
    fn run_cbm_focus_energy_branches() {
        // TS :3243-3245, test.ts:1160-1173.
        assert_eq!(run_cbm_focus_energy(true), -10);
        assert_eq!(run_cbm_focus_energy(false), 0);
    }

    #[test]
    fn run_cbm_refresh_branches() {
        // TS :3253-3255, test.ts:1193-1206.
        assert_eq!(run_cbm_refresh(true), 0);
        assert_eq!(run_cbm_refresh(false), -10);
    }

    #[test]
    fn singles_dispatch_threads_attacker_and_target_fields_through_the_preamble() {
        // Dispatch-level spot-check (handler-direct tests above cover the
        // pure logic): Ingrain reads input.attacker.is_rooted, FutureSight
        // reads the target's own flag -- both through the full preamble,
        // zero draws when the ability is known.
        let t = target(
            MAROWAK,
            [TYPE_GROUND, TYPE_GROUND],
            Some(ABILITY_ROCK_HEAD),
            ABILITY_ROCK_HEAD,
        );
        let rooted_attacker =
            FactoryAiCheckBadMoveAttacker { is_rooted: Some(true), ..neutral_attacker() };
        let result = run_with_attacker(275 /* MOVE_INGRAIN */, t, RNG_SEED, rooted_attacker);
        assert_eq!(
            result,
            CheckBadMoveResult::Scored {
                rng: BattleRngState { value: RNG_SEED, calls: 0 },
                draws: [DRAW_FILLER; MAX_CHECK_BAD_MOVE_DRAWS],
                draw_count: 0,
                score_delta: -10,
            }
        );

        let future_sight_target = FactoryAiCheckBadMoveTarget {
            target_future_attack_up: Some(true),
            ..target(
                MAROWAK,
                [TYPE_GROUND, TYPE_GROUND],
                Some(ABILITY_ROCK_HEAD),
                ABILITY_ROCK_HEAD,
            )
        };
        let result = run(
            248, /* MOVE_FUTURE_SIGHT */
            future_sight_target,
            RNG_SEED,
        );
        let CheckBadMoveResult::Scored { score_delta, draw_count, .. } = result else {
            panic!("expected Scored")
        };
        assert_eq!(score_delta, -12);
        assert_eq!(draw_count, 0);
    }

    // === M5b-1: weather quartet (TS :1209-1240, dispatch :2076-2118, ==========
    // test.ts:3277-3496) =========================================================

    #[test]
    fn run_cbm_weather_setter_matches_current_weather_scores_minus8_with_no_stale_read() {
        // TS :1209-1218, test.ts:3297-3306: a genuinely set weather always
        // wins, the stale ability guess is never consulted.
        assert_eq!(
            run_cbm_weather_setter(Some(AI_WEATHER_RAIN), ABILITY_STENCH, AI_WEATHER_RAIN),
            -8
        );
    }

    #[test]
    fn run_cbm_weather_setter_different_current_weather_scores_zero() {
        // test.ts:3308-3317.
        assert_eq!(
            run_cbm_weather_setter(Some(AI_WEATHER_SUN), ABILITY_STENCH, AI_WEATHER_RAIN),
            0
        );
    }

    #[test]
    fn run_cbm_weather_setter_no_weather_and_non_colliding_ability_scores_zero() {
        // test.ts:3323-3328: currentWeather omitted, stale guess doesn't
        // collide with any AI_WEATHER_* value at all (Sturdy, id 5).
        assert_eq!(
            run_cbm_weather_setter(None, ABILITY_STURDY, AI_WEATHER_RAIN),
            0
        );
    }

    #[test]
    fn run_cbm_weather_setter_stale_funcresult_collision_scores_minus8() {
        // TS :1191-1218 (stale-funcResult bug), test.ts:3357-3366: weatherless
        // + a target ability ID (0-3) that collides with this handler's own
        // weather constant.
        assert_eq!(
            run_cbm_weather_setter(None, ABILITY_NONE, AI_WEATHER_SUN),
            -8
        ); // id 0
        assert_eq!(
            run_cbm_weather_setter(None, ABILITY_STENCH, AI_WEATHER_RAIN),
            -8
        ); // id 1
        assert_eq!(
            run_cbm_weather_setter(None, ABILITY_SPEED_BOOST, AI_WEATHER_HAIL),
            -8
        ); // id 3
    }

    #[test]
    fn run_cbm_weather_setter_stale_funcresult_wrong_collision_scores_zero() {
        // test.ts:3368-3380: the colliding ID belongs to a DIFFERENT
        // handler's own constant (id 1 == Rain, checked against Hail).
        assert_eq!(
            run_cbm_weather_setter(None, ABILITY_STENCH, AI_WEATHER_HAIL),
            0
        );
    }

    #[test]
    fn weather_wrappers_each_check_their_own_ai_weather_constant() {
        // test.ts:3297-3340, :3461-3489: byte-for-byte identical shape,
        // each wired to a distinct AI_WEATHER_* constant.
        assert_eq!(run_cbm_rain_dance(Some(AI_WEATHER_RAIN), ABILITY_NONE), -8);
        assert_eq!(run_cbm_sunny_day(Some(AI_WEATHER_SUN), ABILITY_NONE), -8);
        assert_eq!(run_cbm_hail(Some(AI_WEATHER_HAIL), ABILITY_NONE), -8);
        assert_eq!(
            run_cbm_sandstorm(Some(AI_WEATHER_SANDSTORM), ABILITY_NONE),
            -8
        );
        assert_eq!(run_cbm_sandstorm(None, ABILITY_DRIZZLE), -8); // id 2 collides with Sandstorm
        assert_eq!(run_cbm_rain_dance(None, ABILITY_DRIZZLE), 0); // id 2 doesn't collide with Rain
    }

    #[test]
    fn weather_dispatch_reads_soundproof_guess_as_the_stale_funcresult_fallback() {
        // Dispatch-level: the preamble's own soundproof_guess local (from
        // its ability read, TS :1329) is exactly what the weather handlers
        // read when weatherless -- reproduces doc §25.10.2's Ninjask
        // fixture (Speed Boost, id 3, single-ability species so zero draws
        // either way), test.ts:3407-3412.
        let ninjask = target(
            302, /* SPECIES_NINJASK */
            [TYPE_BUG, TYPE_FLYING],
            None,
            ABILITY_SPEED_BOOST,
        );
        let weatherless =
            FactoryAiCheckBadMoveAttacker { current_weather: None, ..neutral_attacker() };
        let result = run_with_attacker(258 /* MOVE_HAIL */, ninjask, RNG_SEED, weatherless);
        let CheckBadMoveResult::Scored { score_delta, draw_count, .. } = result else {
            panic!("expected Scored")
        };
        assert_eq!(score_delta, -8);
        assert_eq!(draw_count, 0);
    }

    // === M5b-1: AI_CBM_Magnitude (TS :3331-3361, dispatch :2410-2419, =========
    // test.ts:4012-4072) =========================================================

    #[test]
    fn magnitude_levitate_scores_minus10_after_its_own_first_ability_read() {
        // test.ts:4029-4035.
        let t = target(
            SHUCKLE,
            [TYPE_ROCK, TYPE_BUG],
            Some(ABILITY_LEVITATE),
            ABILITY_LEVITATE,
        );
        let before = BattleRngState { value: RNG_SEED, calls: 0 };
        let (rng, levitate_draw, high_risk_draw, score_delta) =
            run_cbm_magnitude(TYPE_GROUND, &t, before, 1);
        assert_eq!(score_delta, -10);
        assert!(levitate_draw.is_none()); // known ability -- zero-RNG short-circuit
        assert!(high_risk_draw.is_none());
        assert_eq!(rng, before);
    }

    #[test]
    fn magnitude_non_levitate_x0_effectiveness_scores_minus10_via_the_fallthrough() {
        // test.ts:4037-4047: Ground vs Flying/Flying = 0x.
        let t = target(
            SHUCKLE,
            [TYPE_FLYING, TYPE_FLYING],
            Some(ABILITY_STURDY),
            ABILITY_STURDY,
        );
        let (_, levitate_draw, high_risk_draw, score_delta) = run_cbm_magnitude(
            TYPE_GROUND,
            &t,
            BattleRngState { value: RNG_SEED, calls: 0 },
            1,
        );
        assert_eq!(score_delta, -10);
        assert!(levitate_draw.is_none());
        assert!(high_risk_draw.is_none()); // the x0 short-circuit adds no draw of its own
    }

    #[test]
    fn magnitude_non_levitate_non_wonder_guard_falls_through_to_zero() {
        // test.ts:4049-4052.
        let t = target(
            SHUCKLE,
            [TYPE_ROCK, TYPE_BUG],
            Some(ABILITY_STURDY),
            ABILITY_STURDY,
        );
        let (_, _, _, score_delta) = run_cbm_magnitude(
            TYPE_GROUND,
            &t,
            BattleRngState { value: RNG_SEED, calls: 0 },
            1,
        );
        assert_eq!(score_delta, 0);
    }

    #[test]
    fn magnitude_ambiguous_non_levitate_target_draws_twice_never_caches() {
        // test.ts:4054-4071: Lanturn (Volt Absorb / Water Absorb) draws at
        // both the handler's own Levitate gate and HighRisk's own
        // get_ability -- the never-caches quirk applied twice inside one
        // handler.
        let t = target(
            171, /* SPECIES_LANTURN */
            [TYPE_ROCK, TYPE_BUG],
            None,
            ABILITY_VOLT_ABSORB,
        );
        let before = BattleRngState { value: RNG_SEED, calls: 0 };
        let (rng, levitate_draw, high_risk_draw, score_delta) =
            run_cbm_magnitude(TYPE_GROUND, &t, before, 1);
        assert_eq!(score_delta, 0);
        let levitate_draw = levitate_draw.expect("ambiguous species draws at the levitate gate");
        let high_risk_draw =
            high_risk_draw.expect("ambiguous species draws again at the high-risk gate");
        assert_eq!(levitate_draw.site, CheckBadMoveDrawSite::MagnitudeLevitate);
        assert_eq!(
            high_risk_draw.site,
            CheckBadMoveDrawSite::HighRiskForDamageAbility
        );
        assert_eq!(levitate_draw.before, before);
        assert_eq!(levitate_draw.after, high_risk_draw.before); // never-caches: advances at both
        assert_ne!(levitate_draw.before, high_risk_draw.before);
        assert_eq!(rng, high_risk_draw.after);
    }

    #[test]
    fn magnitude_dispatch_through_the_full_preamble_draws_soundproof_then_both_handler_sites() {
        // Dispatch-level: MOVE_MAGNITUDE (id 222, power 1) is
        // movePowerOther, so the preamble's own negates-type draw never
        // fires -- only soundproof plus the handler's own two draws,
        // exactly filling MAX_CHECK_BAD_MOVE_DRAWS (test.ts:4054-4071).
        let t = target(171, [TYPE_ROCK, TYPE_BUG], None, ABILITY_VOLT_ABSORB);
        let result = run(222 /* MOVE_MAGNITUDE */, t, RNG_SEED);
        let CheckBadMoveResult::Scored { draws, draw_count, score_delta, .. } = result else {
            panic!("expected Scored")
        };
        assert_eq!(score_delta, 0);
        assert_eq!(draw_count, 3);
        assert_eq!(draws[0].site, CheckBadMoveDrawSite::Soundproof);
        assert_eq!(draws[1].site, CheckBadMoveDrawSite::MagnitudeLevitate);
        assert_eq!(
            draws[2].site,
            CheckBadMoveDrawSite::HighRiskForDamageAbility
        );
    }
}
