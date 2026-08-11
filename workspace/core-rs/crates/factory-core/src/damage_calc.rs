//! Gen-3 damage/accuracy/crit math, ported bit-exact from
//! `reference/pokeemerald/src/pokemon.c` (`CalculateBaseDamage`, :3106-3371)
//! and `reference/pokeemerald/src/battle_script_commands.c`
//! (`Cmd_critcalc` :1253, `Cmd_typecalc` :1355, `Cmd_accuracycheck` :1099,
//! `ApplyRandomDmgMultiplier` :1639), ported from `src/engine/damageCalc.ts`
//! (671 lines, zero imports). The TS module's own header comment documents
//! the exact ported-vs-out-of-scope branch inventory (badge boosts,
//! Wonder Guard/Levitate immunity side-effects); this port carries the same
//! scope, unchanged.
//!
//! ## Numeric id spaces
//! - **Move/mon types**: `TYPE_*` `u8` consts 0..17, mirroring the
//!   `TYPE_IDS` table inline in `damageCalc.ts`
//!   (`include/constants/pokemon.h`). The M4b adapter maps TS type strings
//!   to these same ids TS-side.
//! - **Abilities / hold effects**: the canonical ids from
//!   `src/data/gen/ability-item-hooks.json` `.universes` (`ABILITY_NONE`=0,
//!   `HOLD_EFFECT_NONE`=0), the same id space `gen_tables.rs` uses. Only the
//!   ids this module actually reads are named below; each was checked
//!   against that JSON, not recalled.
//! - **Weather**: mirrors the TS's local bit-range combos (`rain`,
//!   `sandstorm`, `sun`, `hail`) over the source `u32 gBattleWeather`
//!   bitfield (`include/constants/battle.h:232-244`) — the TS itself does
//!   not name individual bits either, only the OR'd ranges this function
//!   treats identically.
//!
//! ## Arithmetic widths
//! This port uses `i32` throughout (stats, power, damage, accuracy `calc`,
//! stat-stage values), mirroring the C source's `s32 damage`/`damageHelper`
//! (`CalculateBaseDamage`, pokemon.c:3106-3109) and `s8 buff`/`u16 calc`
//! (`Cmd_accuracycheck`, battle_script_commands.c:1113-1120) — one signed
//! width sized comfortably above every real GBA stat/power/percentage range
//! (`u16` attack/defense max 65535, movePower max ~250) avoids repeated
//! widening casts and never overflows for in-game-valid inputs. Rust's `/`
//! on signed integers truncates toward zero, exactly matching the ported
//! TS's `Math.trunc(a / b)`. Where the TS does two *separate* truncating
//! divisions in sequence (not one combined division), this port keeps them
//! separate too — truncation order is load-bearing (see `calculate_base_damage`).

// --- TYPE_* ids (include/constants/pokemon.h) ---------------------------

pub const TYPE_NORMAL: u8 = 0;
pub const TYPE_FIGHTING: u8 = 1;
pub const TYPE_FLYING: u8 = 2;
pub const TYPE_POISON: u8 = 3;
pub const TYPE_GROUND: u8 = 4;
pub const TYPE_ROCK: u8 = 5;
pub const TYPE_BUG: u8 = 6;
pub const TYPE_GHOST: u8 = 7;
pub const TYPE_STEEL: u8 = 8;
pub const TYPE_MYSTERY: u8 = 9;
pub const TYPE_FIRE: u8 = 10;
pub const TYPE_WATER: u8 = 11;
pub const TYPE_GRASS: u8 = 12;
pub const TYPE_ELECTRIC: u8 = 13;
pub const TYPE_PSYCHIC: u8 = 14;
pub const TYPE_ICE: u8 = 15;
pub const TYPE_DRAGON: u8 = 16;
pub const TYPE_DARK: u8 = 17;

/// `IS_TYPE_PHYSICAL(moveType)` (`include/battle.h:466`): `moveType < TYPE_MYSTERY`.
#[must_use]
pub fn is_type_physical(move_type: u8) -> bool {
    move_type < TYPE_MYSTERY
}

/// `IS_TYPE_SPECIAL(moveType)` (`include/battle.h:467`): `moveType > TYPE_MYSTERY`.
#[must_use]
pub fn is_type_special(move_type: u8) -> bool {
    move_type > TYPE_MYSTERY
}

// --- Ability / hold-effect ids this module reads -------------------------
// Verified against src/data/gen/ability-item-hooks.json .universes
// (abilities / holdEffects) at port time, not recalled.

pub const ABILITY_NONE: u16 = 0;
pub const ABILITY_HUGE_POWER: u16 = 37;
pub const ABILITY_PURE_POWER: u16 = 74;
pub const ABILITY_THICK_FAT: u16 = 47;
pub const ABILITY_HUSTLE: u16 = 55;
pub const ABILITY_PLUS: u16 = 57;
pub const ABILITY_MINUS: u16 = 58;
pub const ABILITY_GUTS: u16 = 62;
pub const ABILITY_MARVEL_SCALE: u16 = 63;
pub const ABILITY_OVERGROW: u16 = 65;
pub const ABILITY_BLAZE: u16 = 66;
pub const ABILITY_TORRENT: u16 = 67;
pub const ABILITY_SWARM: u16 = 68;
pub const ABILITY_COMPOUND_EYES: u16 = 14;
pub const ABILITY_SAND_VEIL: u16 = 8;

pub const HOLD_EFFECT_NONE: u16 = 0;
pub const HOLD_EFFECT_BUG_POWER: u16 = 31;
pub const HOLD_EFFECT_STEEL_POWER: u16 = 42;
pub const HOLD_EFFECT_GROUND_POWER: u16 = 46;
pub const HOLD_EFFECT_ROCK_POWER: u16 = 47;
pub const HOLD_EFFECT_GRASS_POWER: u16 = 48;
pub const HOLD_EFFECT_DARK_POWER: u16 = 49;
pub const HOLD_EFFECT_FIGHTING_POWER: u16 = 50;
pub const HOLD_EFFECT_ELECTRIC_POWER: u16 = 51;
pub const HOLD_EFFECT_WATER_POWER: u16 = 52;
pub const HOLD_EFFECT_FLYING_POWER: u16 = 53;
pub const HOLD_EFFECT_POISON_POWER: u16 = 54;
pub const HOLD_EFFECT_ICE_POWER: u16 = 55;
pub const HOLD_EFFECT_GHOST_POWER: u16 = 56;
pub const HOLD_EFFECT_PSYCHIC_POWER: u16 = 57;
pub const HOLD_EFFECT_FIRE_POWER: u16 = 58;
pub const HOLD_EFFECT_DRAGON_POWER: u16 = 59;
pub const HOLD_EFFECT_NORMAL_POWER: u16 = 60;
pub const HOLD_EFFECT_CHOICE_BAND: u16 = 29;
pub const HOLD_EFFECT_SOUL_DEW: u16 = 34;
pub const HOLD_EFFECT_DEEP_SEA_TOOTH: u16 = 35;
pub const HOLD_EFFECT_DEEP_SEA_SCALE: u16 = 36;
pub const HOLD_EFFECT_LIGHT_BALL: u16 = 45;
pub const HOLD_EFFECT_METAL_POWDER: u16 = 64;
pub const HOLD_EFFECT_THICK_CLUB: u16 = 65;
pub const HOLD_EFFECT_SCOPE_LENS: u16 = 41;
pub const HOLD_EFFECT_LUCKY_PUNCH: u16 = 63;
pub const HOLD_EFFECT_STICK: u16 = 66;
pub const HOLD_EFFECT_EVASION_UP: u16 = 22;

/// `include/constants/species.h` ids — the species-locked hold items' gates.
/// Verified against src/data/gen/species-stats.json at port time.
pub const SPECIES_PIKACHU: u16 = 25;
pub const SPECIES_CUBONE: u16 = 104;
pub const SPECIES_MAROWAK: u16 = 105;
pub const SPECIES_DITTO: u16 = 132;
pub const SPECIES_CLAMPERL: u16 = 373;
pub const SPECIES_LATIAS: u16 = 407;
pub const SPECIES_LATIOS: u16 = 408;
/// `Cmd_critcalc`'s Lucky Punch species gate (battle_script_commands.c:1272).
pub const SPECIES_CHANSEY: u16 = 113;
/// `Cmd_critcalc`'s Stick species gate (battle_script_commands.c:1273).
pub const SPECIES_FARFETCHD: u16 = 83;

/// `MOVE_SOLAR_BEAM` (`include/constants/moves.h:80`) — the weather block's
/// move-id-gated (not type-gated) exception.
pub const MOVE_SOLAR_BEAM: u32 = 76;

/// `sHoldEffectToType` (`pokemon.c:1919-1938`): attacker hold effect -> the
/// move type it boosts, first-match-break order (matches `HOLD_EFFECT_TO_TYPE`
/// in `damageCalc.ts`; no two rows can share a hold effect so match order is
/// moot in practice, but ported in the same order for fidelity).
const HOLD_EFFECT_TO_TYPE: [(u16, u8); 17] = [
    (HOLD_EFFECT_BUG_POWER, TYPE_BUG),
    (HOLD_EFFECT_STEEL_POWER, TYPE_STEEL),
    (HOLD_EFFECT_GROUND_POWER, TYPE_GROUND),
    (HOLD_EFFECT_ROCK_POWER, TYPE_ROCK),
    (HOLD_EFFECT_GRASS_POWER, TYPE_GRASS),
    (HOLD_EFFECT_DARK_POWER, TYPE_DARK),
    (HOLD_EFFECT_FIGHTING_POWER, TYPE_FIGHTING),
    (HOLD_EFFECT_ELECTRIC_POWER, TYPE_ELECTRIC),
    (HOLD_EFFECT_WATER_POWER, TYPE_WATER),
    (HOLD_EFFECT_FLYING_POWER, TYPE_FLYING),
    (HOLD_EFFECT_POISON_POWER, TYPE_POISON),
    (HOLD_EFFECT_ICE_POWER, TYPE_ICE),
    (HOLD_EFFECT_GHOST_POWER, TYPE_GHOST),
    (HOLD_EFFECT_PSYCHIC_POWER, TYPE_PSYCHIC),
    (HOLD_EFFECT_FIRE_POWER, TYPE_FIRE),
    (HOLD_EFFECT_DRAGON_POWER, TYPE_DRAGON),
    (HOLD_EFFECT_NORMAL_POWER, TYPE_NORMAL),
];

/// `pokemon.c:3219-3226` — the pinch-power ability keyed by the boosted type.
fn pinch_boost_ability_for_type(move_type: u8) -> Option<u16> {
    match move_type {
        TYPE_GRASS => Some(ABILITY_OVERGROW),
        TYPE_FIRE => Some(ABILITY_BLAZE),
        TYPE_WATER => Some(ABILITY_TORRENT),
        TYPE_BUG => Some(ABILITY_SWARM),
        _ => None,
    }
}

// --- Stat stages -----------------------------------------------------------

/// `gStatStageRatios` (`pokemon.c:1868-1883`), index = stat stage 0..12
/// (6 = `DEFAULT_STAT_STAGE`).
pub const STAT_STAGE_RATIOS: [(i32, i32); 13] = [
    (10, 40),
    (10, 35),
    (10, 30),
    (10, 25),
    (10, 20),
    (10, 15),
    (10, 10),
    (15, 10),
    (20, 10),
    (25, 10),
    (30, 10),
    (35, 10),
    (40, 10),
];

pub const DEFAULT_STAT_STAGE: u8 = 6;
pub const MIN_STAT_STAGE: u8 = 0;
pub const MAX_STAT_STAGE: u8 = 12;

/// `APPLY_STAT_MOD` (`pokemon.c:3100-3104`): `(stat * ratio[0]) / ratio[1]`,
/// both integer ops.
#[must_use]
pub fn apply_stat_stage_mod(stat: i32, stage: u8) -> i32 {
    let (num, den) = STAT_STAGE_RATIOS[stage as usize];
    (stat * num) / den
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct StatStages {
    pub atk: u8,
    pub def: u8,
    pub sp_atk: u8,
    pub sp_def: u8,
}

pub const NEUTRAL_STAT_STAGES: StatStages = StatStages {
    atk: DEFAULT_STAT_STAGE,
    def: DEFAULT_STAT_STAGE,
    sp_atk: DEFAULT_STAT_STAGE,
    sp_def: DEFAULT_STAT_STAGE,
};

/// The attacking-stat side of `APPLY_STAT_MOD`'s crit override
/// (`pokemon.c:3234-3243`/`:3288-3296`): a crit ignores an attack-stat DROP
/// (stage <= DEFAULT), using the raw stat instead; a non-crit (or a crit
/// with a raised stage) always applies the stage modifier.
fn crit_adjusted_attack_stat(raw_stat: i32, stage: u8, is_critical_hit: bool) -> i32 {
    if is_critical_hit && stage <= DEFAULT_STAT_STAGE {
        raw_stat
    } else {
        apply_stat_stage_mod(raw_stat, stage)
    }
}

/// The defending-stat side (`pokemon.c:3248-3257`/`:3298-3307`): a crit
/// ignores a defense-stat RAISE (stage >= DEFAULT), using the raw stat
/// instead.
fn crit_adjusted_defense_stat(raw_stat: i32, stage: u8, is_critical_hit: bool) -> i32 {
    if is_critical_hit && stage >= DEFAULT_STAT_STAGE {
        raw_stat
    } else {
        apply_stat_stage_mod(raw_stat, stage)
    }
}

// --- calculateBaseDamage ----------------------------------------------------

/// Minimal battler view `CalculateBaseDamage` needs (struct `BattlePokemon`
/// subset). Mirrors `DamageBattler` (`damageCalc.ts:99-121`).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DamageBattler {
    pub attack: i32,
    pub defense: i32,
    pub sp_attack: i32,
    pub sp_defense: i32,
    pub level: i32,
    pub types: [u8; 2],
    pub stat_stages: StatStages,
    /// `STATUS1_BURN` set (`pokemon.c:3263`); halves physical damage unless GUTS.
    pub is_burned: bool,
    /// `status1 != 0` (`pokemon.c:3211/3213` Guts/Marvel Scale gate - ANY
    /// status, not just burn).
    pub has_status1: bool,
    /// Current/max HP (`pokemon.c:3219-3226` pinch-boost gate: `hp <=
    /// maxHP/3`). Only the attacker's is read. `None` mirrors the TS
    /// `hp?: number` field being unset.
    pub hp: Option<i32>,
    pub max_hp: Option<i32>,
    /// `ABILITY_*` id; `ABILITY_NONE` (0) mirrors the TS field being
    /// unset/null.
    pub ability: u16,
    /// 0 mirrors the TS `species?: number` field being unset (no real
    /// species has id 0).
    pub species: u16,
    /// `GetItemHoldEffect(...)`'s result (Enigma Berry's per-battler
    /// override already folded in by the caller) - `pokemon.c:3132-3150`.
    /// `HOLD_EFFECT_NONE` (0) mirrors the TS field being unset/null.
    pub hold_effect: u16,
    /// `GetItemHoldEffectParam(...)` - `pokemon.c:3132-3150`; only the
    /// attacker's is read (the `sHoldEffectToType` loop's magnitude).
    pub hold_effect_param: i32,
}

/// Mirrors `DamageCalcInput` (`damageCalc.ts:123-174`).
#[derive(Debug, Clone)]
pub struct DamageCalcInput {
    pub attacker: DamageBattler,
    pub defender: DamageBattler,
    pub move_power: i32,
    pub move_type: u8,
    pub is_critical_hit: bool,
    /// `SIDE_STATUS_REFLECT`/`LIGHTSCREEN` on the defender's side
    /// (`battle_script_commands.c:3267`/`3315`).
    pub side_status_reflect: bool,
    pub side_status_light_screen: bool,
    pub is_double_battle_spread_move: bool,
    /// `gBattleMoves[gCurrentMove].effect === EFFECT_EXPLOSION`
    /// (`pokemon.c:3228-3230`) — the only move-effect branch this function
    /// reads, so it's modeled as a single bool rather than an id/string
    /// (every other effect id behaves identically to "not set").
    pub is_explosion_effect: bool,
    /// Source `u32 gBattleWeather` bitfield (`include/constants/battle.h:232-244`).
    pub weather: u32,
    /// `WEATHER_HAS_EFFECT2` result (`battle_util.h:48`). The caller owns
    /// the source-shaped Cloud Nine/Air Lock field scan; `false` suppresses
    /// every weather modifier without clearing the weather bits themselves.
    /// TS default (unset) is "has effect" (`!== false`), so the natural
    /// `true` default reproduces that.
    pub weather_has_effect: bool,
    /// Source `gCurrentMove`, used by the weather block's Solar Beam
    /// exception (compare against `MOVE_SOLAR_BEAM`). 0 (`MOVE_NONE`)
    /// mirrors the TS field being unset — never equal to `MOVE_SOLAR_BEAM`.
    pub current_move: u32,
    /// `ABILITY_ON_FIELD2`'s battler scan (`battle_util.c`
    /// `ABILITYEFFECT_FIELD_SPORT` case, `:3111-3135`): every active
    /// battler's ability, `gBattlersCount`-wide - the real field scan
    /// Plus/Minus reads (`pokemon.c:3207-3210`), not a doubles-shaped stub.
    /// `None` mirrors the TS default `[attacker.ability, defender.ability]`,
    /// which IS the full field in singles (`gBattlersCount == 2`).
    pub active_battler_abilities: Option<Vec<u16>>,
    /// `!(gBattleTypeFlags & BATTLE_TYPE_FRONTIER)` (`pokemon.c:3187,3189`) -
    /// gates Soul Dew's spAttack/spDefense boost off. Every real battle this
    /// engine drives sets `BATTLE_TYPE_FACTORY` (a `BATTLE_TYPE_FRONTIER`
    /// member), so this is a structural no-op in practice. The TS default
    /// (unset) is `!undefined === true` (boost enabled); the natural Rust
    /// `false` default reproduces that exactly.
    pub is_frontier_battle: bool,
    /// `gBattleResources->flags->flags[battlerIdAtk] & RESOURCE_FLAG_FLASH_FIRE`.
    /// The caller owns the per-battler resource flag; this function owns
    /// its source-ordered 1.5x modifier before the final +2.
    pub flash_fire_boosted: bool,
}

/// `CalculateBaseDamage` (`pokemon.c:3106-3371`), physical/special branches
/// only (`TYPE_MYSTERY`'s "damage = 0" branch is also ported). Badge boosts
/// are NOT applied (see module doc comment) - always off in this engine.
#[must_use]
pub fn calculate_base_damage(input: &DamageCalcInput) -> i32 {
    let attacker = &input.attacker;
    let defender = &input.defender;
    let move_type = input.move_type;
    let is_critical_hit = input.is_critical_hit;

    // pokemon.c:3158 - Huge/Pure Power double the attacker's raw Attack
    // before every later stat modifier (hold-item/badge boosts between here
    // and the ability block below are out of scope - see module doc comment).
    let mut attack = attacker.attack;
    if attacker.ability == ABILITY_HUGE_POWER || attacker.ability == ABILITY_PURE_POWER {
        attack *= 2;
    }
    let mut sp_attack = attacker.sp_attack;
    let mut defense = defender.defense;
    let mut sp_defense = defender.sp_defense;

    // pokemon.c:3171-3183 - sHoldEffectToType, attacker-only, first-match-
    // break: physical types boost attack, special types boost spAttack, by
    // (holdEffectParam + 100) / 100.
    let attacker_hold_effect = attacker.hold_effect;
    let attacker_hold_effect_param = attacker.hold_effect_param;
    let defender_hold_effect = defender.hold_effect;
    for &(hold_effect, boosted_type) in &HOLD_EFFECT_TO_TYPE {
        if attacker_hold_effect == hold_effect && move_type == boosted_type {
            if is_type_physical(move_type) {
                attack = (attack * (attacker_hold_effect_param + 100)) / 100;
            } else {
                sp_attack = (sp_attack * (attacker_hold_effect_param + 100)) / 100;
            }
            break;
        }
    }

    // pokemon.c:3185-3201 - Choice Band and the 6 species-locked hold items
    // (the badge-boost block between the type-boost loop above and here is
    // link/badge-gated and out of scope for Factory - see module doc comment).
    if attacker_hold_effect == HOLD_EFFECT_CHOICE_BAND {
        attack = (150 * attack) / 100;
    }
    if attacker_hold_effect == HOLD_EFFECT_SOUL_DEW
        && !input.is_frontier_battle
        && (attacker.species == SPECIES_LATIAS || attacker.species == SPECIES_LATIOS)
    {
        sp_attack = (150 * sp_attack) / 100;
    }
    if defender_hold_effect == HOLD_EFFECT_SOUL_DEW
        && !input.is_frontier_battle
        && (defender.species == SPECIES_LATIAS || defender.species == SPECIES_LATIOS)
    {
        sp_defense = (150 * sp_defense) / 100;
    }
    if attacker_hold_effect == HOLD_EFFECT_DEEP_SEA_TOOTH && attacker.species == SPECIES_CLAMPERL {
        sp_attack *= 2;
    }
    if defender_hold_effect == HOLD_EFFECT_DEEP_SEA_SCALE && defender.species == SPECIES_CLAMPERL {
        sp_defense *= 2;
    }
    if attacker_hold_effect == HOLD_EFFECT_LIGHT_BALL && attacker.species == SPECIES_PIKACHU {
        sp_attack *= 2;
    }
    if defender_hold_effect == HOLD_EFFECT_METAL_POWDER && defender.species == SPECIES_DITTO {
        defense *= 2;
    }
    if attacker_hold_effect == HOLD_EFFECT_THICK_CLUB
        && (attacker.species == SPECIES_CUBONE || attacker.species == SPECIES_MAROWAK)
    {
        attack *= 2;
    }

    // pokemon.c:3203-3213 ability block, exact source order.
    if defender.ability == ABILITY_THICK_FAT && (move_type == TYPE_FIRE || move_type == TYPE_ICE) {
        sp_attack /= 2;
    }
    if attacker.ability == ABILITY_HUSTLE {
        attack = (150 * attack) / 100;
    }
    let default_active_abilities = [attacker.ability, defender.ability];
    let active_battler_abilities: &[u16] = input
        .active_battler_abilities
        .as_deref()
        .unwrap_or(&default_active_abilities);
    if attacker.ability == ABILITY_PLUS && active_battler_abilities.contains(&ABILITY_MINUS) {
        sp_attack = (150 * sp_attack) / 100;
    }
    if attacker.ability == ABILITY_MINUS && active_battler_abilities.contains(&ABILITY_PLUS) {
        sp_attack = (150 * sp_attack) / 100;
    }
    if attacker.ability == ABILITY_GUTS && attacker.has_status1 {
        attack = (150 * attack) / 100;
    }
    if defender.ability == ABILITY_MARVEL_SCALE && defender.has_status1 {
        defense = (150 * defense) / 100;
    }

    // pokemon.c:3219-3226 pinch-power boosts (the Mud Sport/Water Sport
    // field-power halving between Marvel Scale and here is out of scope).
    let mut move_power = input.move_power;
    if let Some(pinch_ability) = pinch_boost_ability_for_type(move_type) {
        if attacker.ability == pinch_ability {
            if let (Some(hp), Some(max_hp)) = (attacker.hp, attacker.max_hp) {
                if hp <= max_hp / 3 {
                    move_power = (150 * move_power) / 100;
                }
            }
        }
    }

    // pokemon.c:3228-3230 - Explosion/Self-Destruct halve Defense AFTER the
    // ability block, so it stacks with (not replaces) a Marvel Scale boost.
    let defender_defense = if input.is_explosion_effect {
        defense / 2
    } else {
        defense
    };

    let damage;
    if is_type_physical(move_type) {
        let mut d = crit_adjusted_attack_stat(attack, attacker.stat_stages.atk, is_critical_hit);

        d *= move_power;
        d *= (2 * attacker.level) / 5 + 2;

        let damage_helper =
            crit_adjusted_defense_stat(defender_defense, defender.stat_stages.def, is_critical_hit);

        d /= damage_helper;
        d /= 50;

        if attacker.is_burned && attacker.ability != ABILITY_GUTS {
            d /= 2;
        }

        if input.side_status_reflect && !is_critical_hit {
            d = if input.is_double_battle_spread_move {
                2 * (d / 3)
            } else {
                d / 2
            };
        }
        if input.is_double_battle_spread_move {
            d /= 2;
        }
        if d == 0 {
            d = 1;
        }
        damage = d;
    } else if move_type == TYPE_MYSTERY {
        damage = 0;
    } else {
        // Special branch (pokemon.c:3287-3368).
        let mut d =
            crit_adjusted_attack_stat(sp_attack, attacker.stat_stages.sp_atk, is_critical_hit);

        d *= move_power;
        d *= (2 * attacker.level) / 5 + 2;

        let damage_helper =
            crit_adjusted_defense_stat(sp_defense, defender.stat_stages.sp_def, is_critical_hit);

        d /= damage_helper;
        d /= 50;

        if input.side_status_light_screen && !is_critical_hit {
            d = if input.is_double_battle_spread_move {
                2 * (d / 3)
            } else {
                d / 2
            };
        }
        if input.is_double_battle_spread_move {
            d /= 2;
        }

        // WEATHER_HAS_EFFECT2-gated block (pokemon.c:3331-3363), after the
        // main special arithmetic/screens/spread and before Flash Fire and
        // the unconditional +2. Each operation truncates independently in
        // source.
        if input.weather_has_effect {
            let weather = input.weather;
            let rain = (1 << 0) | (1 << 1) | (1 << 2);
            let sandstorm = (1 << 3) | (1 << 4);
            let sun = (1 << 5) | (1 << 6);
            let hail = 1 << 7;

            if (weather & rain) != 0 {
                if move_type == TYPE_FIRE {
                    d /= 2;
                } else if move_type == TYPE_WATER {
                    d = (15 * d) / 10;
                }
            }

            // MOVE_SOLAR_BEAM is weakened by every modeled weather except
            // sun. This is move-id-gated, not type-gated.
            if (weather & (rain | sandstorm | hail)) != 0 && input.current_move == MOVE_SOLAR_BEAM {
                d /= 2;
            }

            if (weather & sun) != 0 {
                if move_type == TYPE_FIRE {
                    d = (15 * d) / 10;
                } else if move_type == TYPE_WATER {
                    d /= 2;
                }
            }
        }

        // pokemon.c:3367-3368 -- after weather and before the unconditional +2.
        if input.flash_fire_boosted && move_type == TYPE_FIRE {
            d = (15 * d) / 10;
        }
        damage = d;
    }

    // Unconditional +2 (pokemon.c:3371) - every CalculateBaseDamage return
    // path adds this, regardless of physical/special/mystery branch. Easy to
    // miss reading the function top-down (it lives at the very end, after
    // the weather block) - confirmed against the committed RAM dump: Rock
    // Slide's actual pre-STAB gBattleMoveDamage is 32, not floor(...)=30 -
    // see docs/battle-turn-notes.md §10.
    damage + 2
}

// --- Critical hits -----------------------------------------------------------

/// `sCriticalHitChance` (`battle_script_commands.c:606`): chance is 1-in-N
/// per stage.
pub const CRITICAL_HIT_CHANCE_ONE_IN: [u16; 5] = [16, 8, 4, 3, 2];

/// `gBattleMoves[gCurrentMove].effect`'s crit-boosting values
/// (`Cmd_critcalc`, battle_script_commands.c:1266-1270). Only the effect ids
/// this module's crit-chance branch reads are modeled; every other real
/// effect id compares unequal to all of these (`Other`), mirroring the TS's
/// string-equality checks against a single optional `moveEffect` field.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum CritMoveEffect {
    #[default]
    Other,
    HighCritical,
    SkyAttack,
    BlazeKick,
    PoisonTail,
}

/// Mirrors `CritChanceInput` (`damageCalc.ts:487-496`). The TS interface
/// also declares `attackerSpecies?: number`, but `getCriticalHitChanceStage`
/// never reads it (`isChansey`/`isFarfetchd` pre-resolve the species gates
/// instead) - dead in the TS source, so not ported here.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct CritChanceInput {
    pub focus_energy: bool,
    pub move_effect: CritMoveEffect,
    /// `HOLD_EFFECT_NONE` (0) mirrors the TS field being unset/null.
    pub attacker_hold_effect: u16,
    /// `SPECIES_CHANSEY` - Lucky Punch's +2 stage boost is species-gated.
    pub is_chansey: bool,
    /// `SPECIES_FARFETCHD` - Stick's +2 stage boost is species-gated.
    pub is_farfetchd: bool,
}

/// `critChance` stage computation (`Cmd_critcalc`, battle_script_commands.c:1266-1276).
#[must_use]
pub fn get_critical_hit_chance_stage(input: &CritChanceInput) -> usize {
    let mut crit_chance: u8 = 0;
    if input.focus_energy {
        crit_chance += 2;
    }
    if input.move_effect == CritMoveEffect::HighCritical {
        crit_chance += 1;
    }
    if input.move_effect == CritMoveEffect::SkyAttack {
        crit_chance += 1;
    }
    if input.move_effect == CritMoveEffect::BlazeKick {
        crit_chance += 1;
    }
    if input.move_effect == CritMoveEffect::PoisonTail {
        crit_chance += 1;
    }
    if input.attacker_hold_effect == HOLD_EFFECT_SCOPE_LENS {
        crit_chance += 1;
    }
    if input.attacker_hold_effect == HOLD_EFFECT_LUCKY_PUNCH && input.is_chansey {
        crit_chance += 2;
    }
    if input.attacker_hold_effect == HOLD_EFFECT_STICK && input.is_farfetchd {
        crit_chance += 2;
    }
    (crit_chance as usize).min(CRITICAL_HIT_CHANCE_ONE_IN.len() - 1)
}

/// `Cmd_critcalc`'s final roll (`battle_script_commands.c:1279-1283`):
/// `!(Random() % sCriticalHitChance[critChance])`, gated on Battle
/// Armor/Shell Armor/`STATUS3_CANT_SCORE_A_CRIT`/tutorial-battle flags (all
/// false for battle 1). `rng_roll` is the raw `Random()` u16 output
/// (consumes 1 step).
#[must_use]
pub fn roll_is_critical_hit(crit_chance_stage: usize, rng_roll: u16, target_immune: bool) -> bool {
    if target_immune {
        return false;
    }
    rng_roll.is_multiple_of(CRITICAL_HIT_CHANCE_ONE_IN[crit_chance_stage])
}

// --- STAB / type effectiveness ----------------------------------------------

/// IS_BATTLER_OF_TYPE-style STAB check + `Cmd_typecalc`'s STAB step (`:1368-1371`).
#[must_use]
pub fn apply_stab(damage: i32, attacker_types: [u8; 2], move_type: u8) -> i32 {
    if attacker_types[0] == move_type || attacker_types[1] == move_type {
        (damage * 15) / 10
    } else {
        damage
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TypeEffectivenessEntry {
    pub attacking_type: u8,
    pub defending_type: u8,
    pub multiplier_tenths: i32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TypeEffectivenessResult {
    pub damage: i32,
    pub multiplier_tenths: i32,
}

/// `ModulateDmgByType` (`battle_script_commands.c:1321-1326`) applied once
/// per distinct defender type that has a table entry for `moveType`
/// (`Cmd_typecalc`, `:1385-1404`) - a dual-type defender can have the
/// multiplier applied twice (e.g. 4x for a double-weak matchup). Missing
/// table entry = neutral (1x), matching `src/data/gen/type-effectiveness.json`'s
/// own convention (only non-1x matchups are listed).
#[must_use]
pub fn apply_type_effectiveness(
    damage: i32,
    move_type: u8,
    defender_types: [u8; 2],
    table: &[TypeEffectivenessEntry],
) -> TypeEffectivenessResult {
    let mut result = damage;
    let mut total_multiplier_tenths = 10;
    let distinct_types: &[u8] = if defender_types[0] == defender_types[1] {
        &defender_types[..1]
    } else {
        &defender_types[..]
    };
    for &def_type in distinct_types {
        let Some(entry) = table
            .iter()
            .find(|e| e.attacking_type == move_type && e.defending_type == def_type)
        else {
            continue;
        };
        total_multiplier_tenths = (total_multiplier_tenths * entry.multiplier_tenths) / 10;
        result = (result * entry.multiplier_tenths) / 10;
        if result == 0 && entry.multiplier_tenths != 0 {
            result = 1;
        }
    }
    TypeEffectivenessResult { damage: result, multiplier_tenths: total_multiplier_tenths }
}

// --- Endeavor ----------------------------------------------------------------

/// `EFFECT_ENDEAVOR`'s `setdamagetohealthdifference` (`Cmd_setdamagetohealthdifference`,
/// battle_script_commands.c; docs/battle-turn-notes.md §12): sets the raw
/// damage to `targetHp - userHp`, clamped to 0 (never negative - if the user
/// is already at or below the target's HP, the effect deals no damage; the
/// move's own `jumpifmovehadnoeffect`/accuracy gating decides failure
/// separately, not modeled here).
#[must_use]
pub fn calculate_endeavor_damage(target_hp: i32, user_hp: i32) -> i32 {
    (target_hp - user_hp).max(0)
}

/// `EFFECT_ENDEAVOR`'s full damage resolution end-to-end
/// (`BattleScript_EffectEndeavor`, data/battle_scripts_1.s:2479-2491;
/// docs/battle-turn-notes.md §12, RAM-verified 117/101 -> 16): `typecalc`
/// still runs after `setdamagetohealthdifference` and visibly scales
/// `gBattleMoveDamage` by the type multiplier (e.g. 16 -> 8 for a 0.5x
/// matchup) - but that scaled value only gates whether the move has any
/// effect at all (a 0x multiplier = immune, no damage); the script's very
/// next command (`copyword gBattleMoveDamage, gHpDealt`) restores the
/// original, UNSCALED HP-diff before it's ever applied. So type
/// effectiveness never actually scales ENDEAVOR's dealt damage, only its
/// immunity check - genuinely different from `calculate_base_damage`'s own
/// moves, where `apply_type_effectiveness`'s result IS the final damage.
#[must_use]
pub fn resolve_endeavor_damage(target_hp: i32, user_hp: i32, type_multiplier_tenths: i32) -> i32 {
    let hp_diff = calculate_endeavor_damage(target_hp, user_hp);
    if type_multiplier_tenths == 0 {
        0
    } else {
        hp_diff
    }
}

// --- Random damage spread ----------------------------------------------------

/// `ApplyRandomDmgMultiplier` (`battle_script_commands.c:1639-1651`): 85-100%
/// inclusive spread, `rng_roll` is the raw `Random()` u16 output (1 RNG step).
#[must_use]
pub fn apply_random_damage_multiplier(damage: i32, rng_roll: u16) -> i32 {
    if damage == 0 {
        return 0;
    }
    let rand_percent = 100 - i32::from(rng_roll % 16);
    let mut result = damage * rand_percent;
    result /= 100;
    if result == 0 {
        result = 1;
    }
    result
}

// --- Accuracy ------------------------------------------------------------

/// `sAccuracyStageRatios` (`battle_script_commands.c:588-603`), index = stage 0..12.
pub const ACCURACY_STAGE_RATIOS: [(i32, i32); 13] = [
    (33, 100),
    (36, 100),
    (43, 100),
    (50, 100),
    (60, 100),
    (75, 100),
    (1, 1),
    (133, 100),
    (166, 100),
    (2, 1),
    (233, 100),
    (133, 50),
    (3, 1),
];

/// Mirrors `AccuracyCalcInput` (`damageCalc.ts:626-639`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct AccuracyCalcInput {
    pub move_accuracy: i32,
    pub attacker_accuracy_stage: i32,
    pub target_evasion_stage: i32,
    /// `STATUS2_FORESIGHT` on the target - ignores its evasion stage
    /// (`battle_script_commands.c:1127-1135`).
    pub target_has_foresight: bool,
    /// `ABILITY_NONE` (0) mirrors the TS field being unset/null.
    pub attacker_ability: u16,
    pub target_ability: u16,
    pub is_sandstorm: bool,
    /// `None` mirrors the TS `moveType?: string` field being unset (the
    /// Hustle-accuracy check then never fires, matching `input.moveType &&
    /// isTypePhysical(...)`'s short-circuit on a falsy `moveType`).
    pub move_type: Option<u8>,
    /// The TARGET's held item (`Cmd_accuracycheck` reads
    /// `gBattleMons[gBattlerTarget].item`, `:1163-1170`). `HOLD_EFFECT_NONE`
    /// (0) mirrors the TS field being unset/null.
    pub target_hold_effect: u16,
    pub target_hold_effect_param: i32,
}

/// `Cmd_accuracycheck`'s `calc` value (`battle_script_commands.c:1120-1170`),
/// i.e. the attacker's actual hit chance out of 100 for this move, after
/// stat-stage/ability/item modifiers - everything up to but not including
/// the final `(Random() % 100 + 1) > calc` roll.
#[must_use]
pub fn calculate_accuracy(input: &AccuracyCalcInput) -> i32 {
    let mut buff = if input.target_has_foresight {
        input.attacker_accuracy_stage
    } else {
        input.attacker_accuracy_stage + i32::from(DEFAULT_STAT_STAGE) - input.target_evasion_stage
    };
    if buff < i32::from(MIN_STAT_STAGE) {
        buff = i32::from(MIN_STAT_STAGE);
    }
    if buff > i32::from(MAX_STAT_STAGE) {
        buff = i32::from(MAX_STAT_STAGE);
    }

    let (dividend, divisor) = ACCURACY_STAGE_RATIOS[buff as usize];
    let mut calc = (dividend * input.move_accuracy) / divisor;

    if input.attacker_ability == ABILITY_COMPOUND_EYES {
        calc = (calc * 130) / 100;
    }
    if input.is_sandstorm && input.target_ability == ABILITY_SAND_VEIL {
        calc = (calc * 80) / 100;
    }
    if input.attacker_ability == ABILITY_HUSTLE && input.move_type.is_some_and(is_type_physical) {
        calc = (calc * 80) / 100;
    }
    if input.target_hold_effect == HOLD_EFFECT_EVASION_UP {
        calc = (calc * (100 - input.target_hold_effect_param)) / 100;
    }
    calc
}

/// `Cmd_accuracycheck`'s final roll (`battle_script_commands.c:1168`):
/// `(Random()%100+1) > calc` means miss, i.e. hits when `(Random()%100)+1 <=
/// calc` - algebraically `(Random()%100) < calc` for integers, the form
/// clippy prefers.
#[must_use]
pub fn roll_accuracy_hits(calc: i32, rng_roll: u16) -> bool {
    i32::from(rng_roll % 100) < calc
}

#[cfg(test)]
mod tests {
    use super::*;

    // --- RAM-pinned regression cases, carried over from
    // tests/damageCalc.test.ts's "calculateBaseDamage - RAM-pinned
    // regression cases (turn-resolution-notes.md §6 item 1)" describe block.
    // Battle 1's real, RAM-confirmed level-50 stat blocks (src/data/gen/
    // battle1-turn1-ram-dump.json's battlerSnapshots.before_turn, also
    // matching docs/battle-turn-notes.md §5 and turn-resolution-notes.md §2).
    // SPECIES_ONIX types [TYPE_ROCK, TYPE_GROUND]; SPECIES_GROVYLE types
    // [TYPE_GRASS, TYPE_GRASS]; SPECIES_HAUNTER types [TYPE_GHOST, TYPE_POISON]
    // (src/data/gen/species-types.json).

    const ONIX: DamageBattler = DamageBattler {
        attack: 51,
        defense: 187,
        sp_attack: 36,
        sp_defense: 72,
        level: 50,
        types: [TYPE_ROCK, TYPE_GROUND],
        stat_stages: NEUTRAL_STAT_STAGES,
        is_burned: false,
        has_status1: false,
        hp: None,
        max_hp: None,
        ability: ABILITY_NONE,
        species: 0,
        hold_effect: HOLD_EFFECT_NONE,
        hold_effect_param: 0,
    };
    const GROVYLE: DamageBattler = DamageBattler {
        attack: 103,
        defense: 56,
        sp_attack: 91,
        sp_defense: 71,
        level: 50,
        types: [TYPE_GRASS, TYPE_GRASS],
        stat_stages: NEUTRAL_STAT_STAGES,
        is_burned: false,
        has_status1: false,
        hp: None,
        max_hp: None,
        ability: ABILITY_NONE,
        species: 0,
        hold_effect: HOLD_EFFECT_NONE,
        hold_effect_param: 0,
    };
    const HAUNTER: DamageBattler = DamageBattler {
        attack: 88,
        defense: 51,
        sp_attack: 126,
        sp_defense: 76,
        level: 50,
        types: [TYPE_GHOST, TYPE_POISON],
        stat_stages: NEUTRAL_STAT_STAGES,
        is_burned: false,
        has_status1: false,
        hp: None,
        max_hp: None,
        ability: ABILITY_NONE,
        species: 0,
        hold_effect: HOLD_EFFECT_NONE,
        hold_effect_param: 0,
    };

    fn no_frills_input(
        attacker: DamageBattler,
        defender: DamageBattler,
        move_power: i32,
        move_type: u8,
    ) -> DamageCalcInput {
        DamageCalcInput {
            attacker,
            defender,
            move_power,
            move_type,
            is_critical_hit: false,
            side_status_reflect: false,
            side_status_light_screen: false,
            is_double_battle_spread_move: false,
            is_explosion_effect: false,
            weather: 0,
            weather_has_effect: true,
            current_move: 0,
            active_battler_abilities: None,
            is_frontier_battle: false,
            flash_fire_boosted: false,
        }
    }

    #[test]
    fn rock_slide_base_damage_locks_to_32() {
        // gBattleMoveDamage RAM-read as 32 at tick 2335 of
        // battle1-turn1-ram-dump.json, immediately after Cmd_damagecalc and
        // before Cmd_typecalc's STAB step - NOT 30, which a naive
        // floor(...)-without-the-final-"+2" reading of CalculateBaseDamage
        // (pokemon.c:3106-3371) would give (the "+2" lives at the very end
        // of the function, pokemon.c:3371, easy to miss reading top-down -
        // see docs/battle-turn-notes.md §10).
        let input = no_frills_input(ONIX, GROVYLE, 75, TYPE_ROCK);
        assert_eq!(calculate_base_damage(&input), 32);
    }

    #[test]
    fn rock_slide_stab_takes_32_to_48() {
        assert_eq!(apply_stab(32, ONIX.types, TYPE_ROCK), 48);
    }

    #[test]
    fn rock_slide_type_effectiveness_is_neutral() {
        // ROCK vs GRASS/GRASS has no table entry.
        let result = apply_type_effectiveness(48, TYPE_ROCK, GROVYLE.types, &[]);
        assert_eq!(result.multiplier_tenths, 10);
        assert_eq!(result.damage, 48);
    }

    #[test]
    fn rock_slide_random_spread_roll_gives_exactly_42() {
        // gRngValue transition 2176095973 -> 435971572 (tick 2337 of the
        // committed dump, the damage-spread RNG step) - decode the real
        // Random() u16 output via the shared LCG, not an assumed roll.
        let mut rng = crate::rng::GbaRng::new(2_176_095_973);
        let roll = rng.next();
        assert_eq!(rng.rng_value(), 435_971_572);
        assert_eq!(apply_random_damage_multiplier(48, roll), 42);
    }

    #[test]
    fn fury_cutter_corrected_base_damage_locks_to_4() {
        // CORRECTION (see docs/battle-turn-notes.md §10 for the full
        // writeup): the real defender is ONIX (def187, not GROVYLE's own
        // def56). With the corrected def187 AND the CalculateBaseDamage
        // "+2" (pokemon.c:3371), base = 4.
        let input = no_frills_input(GROVYLE, ONIX, 10, TYPE_BUG);
        assert_eq!(calculate_base_damage(&input), 4);
    }

    #[test]
    fn fury_cutter_corrected_damage_3_reachable_without_crit() {
        // No STAB (Grovyle is pure GRASS, move is BUG); BUG vs ROCK/GROUND
        // is neutral (no type-effectiveness table entry either direction).
        // 85-99% (15 of the 16 equally-likely rand%16 outcomes) floor to 3;
        // only the 100% outcome (rand%16 === 0) floors to 4.
        for rand16 in 1..16u16 {
            assert_eq!(
                apply_random_damage_multiplier(4, rand16),
                3,
                "rand16={rand16}"
            );
        }
        assert_eq!(apply_random_damage_multiplier(4, 0), 4);
    }

    #[test]
    fn fury_cutter_into_haunter_reproduces_the_source_chain() {
        // CalculateBaseDamage (pokemon.c:3106-3371):
        // trunc(trunc(trunc(103 * 10 * 22 / 51) / 50)) + 2 = 10.
        let input = no_frills_input(GROVYLE, HAUNTER, 10, TYPE_BUG);
        let base = calculate_base_damage(&input);
        assert_eq!(base, 10);

        // Cmd_typecalc / ModulateDmgByType2: BUG->GHOST floors 10*5/10 to 5,
        // then BUG->POISON floors 5*5/10 to 2. Each nonzero type multiplier
        // has the source's minimum-1 guard.
        let table = [
            TypeEffectivenessEntry {
                attacking_type: TYPE_BUG,
                defending_type: TYPE_GHOST,
                multiplier_tenths: 5,
            },
            TypeEffectivenessEntry {
                attacking_type: TYPE_BUG,
                defending_type: TYPE_POISON,
                multiplier_tenths: 5,
            },
        ];
        let result = apply_type_effectiveness(base, TYPE_BUG, HAUNTER.types, &table);
        assert_eq!(result.damage, 2);
        assert_eq!(result.multiplier_tenths, 2);

        // Cmd_adjustnormaldamage's source RNG draw is 50015 (`% 16 === 15`,
        // 85%), which floors 2 to 1. Only the 100% endpoint could retain 2;
        // this exact draw rules the random-band mismatch out for the anchor.
        assert_eq!(apply_random_damage_multiplier(2, 50_015), 1);

        // Neutral effectiveness must preserve the ordinary value; the
        // minimum guard is not a blanket clamp of every hit to one.
        let neutral = apply_type_effectiveness(base, TYPE_BUG, [TYPE_WATER, TYPE_WATER], &table);
        assert_eq!(neutral.damage, 10);
        assert_eq!(neutral.multiplier_tenths, 10);
        assert_eq!(apply_random_damage_multiplier(10, 50_015), 8);
    }

    // --- active_battler_abilities override (Plus/Minus field scan) ---
    // Plus/Minus boost spAttack, so the move must be SPECIAL (TYPE_WATER)
    // for the boost to show up in the physical-vs-special branch split.
    // Expected values generated from the real TS module (not hand-computed)
    // via:
    //   node --experimental-strip-types -e '
    //     import("./src/engine/damageCalc.ts").then((m) => {
    //       const base = { attack: 100, defense: 100, spAttack: 100, spDefense: 100,
    //         level: 50, types: ["TYPE_WATER", "TYPE_WATER"],
    //         statStages: { atk: 6, def: 6, spAtk: 6, spDef: 6 } };
    //       const attacker = { ...base, ability: "ABILITY_PLUS" };
    //       const defender = { ...base };
    //       const teammateHasMinus = m.calculateBaseDamage({
    //         attacker, defender, movePower: 40, moveType: "TYPE_WATER",
    //         isCriticalHit: false,
    //         activeBattlerAbilities: ["ABILITY_PLUS", "ABILITY_NONE", "ABILITY_MINUS", "ABILITY_NONE"],
    //       });
    //       const noMinusOnField = m.calculateBaseDamage({
    //         attacker, defender, movePower: 40, moveType: "TYPE_WATER",
    //         isCriticalHit: false,
    //         activeBattlerAbilities: ["ABILITY_PLUS", "ABILITY_NONE", "ABILITY_NONE", "ABILITY_NONE"],
    //       });
    //       console.log("teammateHasMinus ->", teammateHasMinus);
    //       console.log("noMinusOnField ->", noMinusOnField);
    //     });
    //   '
    // Output (run from the workspace root, 2026-08-11):
    //   teammateHasMinus -> 28
    //   noMinusOnField -> 19

    fn plus_minus_base(ability: u16) -> DamageBattler {
        DamageBattler {
            attack: 100,
            defense: 100,
            sp_attack: 100,
            sp_defense: 100,
            level: 50,
            types: [TYPE_WATER, TYPE_WATER],
            stat_stages: NEUTRAL_STAT_STAGES,
            is_burned: false,
            has_status1: false,
            hp: None,
            max_hp: None,
            ability,
            species: 0,
            hold_effect: HOLD_EFFECT_NONE,
            hold_effect_param: 0,
        }
    }

    #[test]
    fn active_battler_abilities_scans_a_teammates_minus_not_just_the_defender() {
        let mut input = no_frills_input(
            plus_minus_base(ABILITY_PLUS),
            plus_minus_base(ABILITY_NONE),
            40,
            TYPE_WATER,
        );
        input.active_battler_abilities = Some(vec![
            ABILITY_PLUS,
            ABILITY_NONE,
            ABILITY_MINUS,
            ABILITY_NONE,
        ]);
        assert_eq!(calculate_base_damage(&input), 28);
    }

    #[test]
    fn active_battler_abilities_no_boost_when_no_minus_anywhere_on_field() {
        let mut input = no_frills_input(
            plus_minus_base(ABILITY_PLUS),
            plus_minus_base(ABILITY_NONE),
            40,
            TYPE_WATER,
        );
        input.active_battler_abilities =
            Some(vec![ABILITY_PLUS, ABILITY_NONE, ABILITY_NONE, ABILITY_NONE]);
        assert_eq!(calculate_base_damage(&input), 19);
    }
}
