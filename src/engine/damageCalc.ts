// Gen-3 damage/accuracy/crit math, ported bit-exact from
// reference/pokeemerald/src/pokemon.c (CalculateBaseDamage, :3106-3371) and
// reference/pokeemerald/src/battle_script_commands.c (Cmd_critcalc :1253,
// Cmd_typecalc :1355, Cmd_accuracycheck :1099, ApplyRandomDmgMultiplier
// :1639). Scope: the branches battle 1's turn 1 exercises (level-50
// singles, no weather/screens/double-battle) are fully exercised by
// Tier-1 tests, as is the ability stat/power modifier block (pokemon.c:3158,
// 3203-3226 - Huge/Pure Power, Thick Fat, Hustle, Plus/Minus, Guts, Marvel
// Scale, the Overgrow/Blaze/Torrent/Swarm pinch-power boosts) and the
// hold-item block (pokemon.c:3171-3201 - the sHoldEffectToType type-power
// loop, plus Choice Band and the 6 species-locked items: Soul Dew, Deep Sea
// Tooth/Scale, Light Ball, Metal Powder, Thick Club), ported in exact
// source order (truncation order is load-bearing); the surrounding
// modifier chain (badge boosts, Reflect/Light Screen, double-battle
// target-split) is ported structurally so later S7 slices can enable those
// paths, but is untested this step — see docs/battle-turn-notes.md §10 for
// the exact inventory.
//
// NOT ported (out of scope this step, no battle-1 turn exercises them):
// Wonder Guard/Levitate immunity side-effects beyond the raw multiplier,
// badge boosts (always off -
// ShouldGetStatBadgeBoost returns FALSE unconditionally for
// BATTLE_TYPE_FRONTIER, which every battle this engine models is).

/** include/constants/pokemon.h TYPE_* numeric ids - physical/special split. */
const TYPE_IDS: Record<string, number> = {
  TYPE_NORMAL: 0,
  TYPE_FIGHTING: 1,
  TYPE_FLYING: 2,
  TYPE_POISON: 3,
  TYPE_GROUND: 4,
  TYPE_ROCK: 5,
  TYPE_BUG: 6,
  TYPE_GHOST: 7,
  TYPE_STEEL: 8,
  TYPE_MYSTERY: 9,
  TYPE_FIRE: 10,
  TYPE_WATER: 11,
  TYPE_GRASS: 12,
  TYPE_ELECTRIC: 13,
  TYPE_PSYCHIC: 14,
  TYPE_ICE: 15,
  TYPE_DRAGON: 16,
  TYPE_DARK: 17,
};

/** IS_TYPE_PHYSICAL(moveType) (include/battle.h:466): moveType < TYPE_MYSTERY. */
export function isTypePhysical(moveType: string): boolean {
  return TYPE_IDS[moveType]! < TYPE_IDS.TYPE_MYSTERY!;
}

/** IS_TYPE_SPECIAL(moveType) (include/battle.h:467): moveType > TYPE_MYSTERY. */
export function isTypeSpecial(moveType: string): boolean {
  return TYPE_IDS[moveType]! > TYPE_IDS.TYPE_MYSTERY!;
}

/** gStatStageRatios (pokemon.c:1868-1883), index = stat stage 0..12 (6 = DEFAULT_STAT_STAGE). */
export const STAT_STAGE_RATIOS: ReadonlyArray<readonly [number, number]> = [
  [10, 40],
  [10, 35],
  [10, 30],
  [10, 25],
  [10, 20],
  [10, 15],
  [10, 10],
  [15, 10],
  [20, 10],
  [25, 10],
  [30, 10],
  [35, 10],
  [40, 10],
];

export const DEFAULT_STAT_STAGE = 6;
export const MIN_STAT_STAGE = 0;
export const MAX_STAT_STAGE = 12;

/** APPLY_STAT_MOD (pokemon.c:3100-3104): (stat * ratio[0]) / ratio[1], both integer ops. */
export function applyStatStageMod(stat: number, stage: number): number {
  const [num, den] = STAT_STAGE_RATIOS[stage]!;
  return Math.trunc((stat * num) / den);
}

export interface StatStages {
  atk: number;
  def: number;
  spAtk: number;
  spDef: number;
}

export const NEUTRAL_STAT_STAGES: StatStages = {
  atk: DEFAULT_STAT_STAGE,
  def: DEFAULT_STAT_STAGE,
  spAtk: DEFAULT_STAT_STAGE,
  spDef: DEFAULT_STAT_STAGE,
};

/** Minimal battler view CalculateBaseDamage needs (struct BattlePokemon subset). */
export interface DamageBattler {
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  level: number;
  types: readonly [string, string];
  statStages: StatStages;
  /** STATUS1_BURN set (pokemon.c:3263); halves physical damage unless GUTS. */
  isBurned?: boolean;
  /** status1 != 0 (pokemon.c:3211/3213 Guts/Marvel Scale gate - ANY status, not just burn). */
  hasStatus1?: boolean;
  /** Current/max HP (pokemon.c:3219-3226 pinch-boost gate: hp <= maxHP/3). Only the attacker's is read. */
  hp?: number;
  maxHP?: number;
  /** ABILITY_* id, structurally present - see the modifier-chain notes above for what's wired. */
  ability?: string | null;
  species?: number;
  /** GetItemHoldEffect(...)'s result (Enigma Berry's per-battler override already folded in by the caller) - pokemon.c:3132-3150. */
  holdEffect?: string | null;
  /** GetItemHoldEffectParam(...) - pokemon.c:3132-3150; only the attacker's is read (the sHoldEffectToType loop's magnitude). */
  holdEffectParam?: number;
}

export interface DamageCalcInput {
  attacker: DamageBattler;
  defender: DamageBattler;
  movePower: number;
  moveType: string;
  isCriticalHit: boolean;
  /** SIDE_STATUS_REFLECT/LIGHTSCREEN on the defender's side (battle_script_commands.c:3267/3315). */
  sideStatusReflect?: boolean;
  sideStatusLightScreen?: boolean;
  isDoubleBattleSpreadMove?: boolean;
  /**
   * gBattleMoves[gCurrentMove].effect (pokemon.c:3228-3230) - Self-Destruct/
   * Explosion cut the defender's raw Defense in half (truncated) before the
   * crit-adjusted-stat step, EFFECT_EXPLOSION's only entry in
   * CalculateBaseDamage. Source reads gCurrentMove here rather than this
   * function's own `move` parameter, but they're identical on every call
   * site this engine drives CalculateBaseDamage from.
   */
  moveEffect?: string;
  /** Source u32 gBattleWeather bitfield (include/constants/battle.h:232-244). */
  weather?: number;
  /**
   * WEATHER_HAS_EFFECT2 result (battle_util.h:48). The caller owns the
   * source-shaped Cloud Nine/Air Lock field scan; false suppresses every
   * weather modifier without clearing the weather bits themselves.
   */
  weatherHasEffect?: boolean;
  /** Source gCurrentMove, used by the weather block's Solar Beam exception. */
  currentMove?: number;
  /**
   * ABILITY_ON_FIELD2's battler scan (battle_util.c ABILITYEFFECT_FIELD_SPORT
   * case, :3111-3135): every active battler's ability, gBattlersCount-wide -
   * the real field scan Plus/Minus read (pokemon.c:3207-3210), not a
   * doubles-shaped stub. Defaults to `[attacker.ability, defender.ability]`,
   * which IS the full field in singles (gBattlersCount == 2).
   */
  activeBattlerAbilities?: ReadonlyArray<string | null | undefined>;
  /**
   * `!(gBattleTypeFlags & BATTLE_TYPE_FRONTIER)` (pokemon.c:3187,3189) -
   * gates Soul Dew's spAttack/spDefense boost off. Every real battle this
   * engine drives sets BATTLE_TYPE_FACTORY (a BATTLE_TYPE_FRONTIER member),
   * so this is a structural no-op in practice - wired so the gate itself is
   * provable (see damageCalc.test.ts's Soul Dew frontier case).
   */
  isFrontierBattle?: boolean;
  /**
   * gBattleResources->flags->flags[battlerIdAtk] &
   * RESOURCE_FLAG_FLASH_FIRE. The caller owns the per-battler resource flag;
   * this function owns its source-ordered 1.5x modifier before the final +2.
   */
  flashFireBoosted?: boolean;
}

/**
 * The attacking-stat side of APPLY_STAT_MOD's crit override (pokemon.c
 * :3234-3243/:3288-3296): a crit ignores an attack-stat DROP (stage <=
 * DEFAULT), using the raw stat instead; a non-crit (or a crit with a raised
 * stage) always applies the stage modifier.
 */
function critAdjustedAttackStat(rawStat: number, stage: number, isCriticalHit: boolean): number {
  if (isCriticalHit && stage <= DEFAULT_STAT_STAGE) return rawStat;
  return applyStatStageMod(rawStat, stage);
}

/**
 * The defending-stat side (pokemon.c:3248-3257/:3298-3307): a crit ignores
 * a defense-stat RAISE (stage >= DEFAULT), using the raw stat instead.
 */
function critAdjustedDefenseStat(rawStat: number, stage: number, isCriticalHit: boolean): number {
  if (isCriticalHit && stage >= DEFAULT_STAT_STAGE) return rawStat;
  return applyStatStageMod(rawStat, stage);
}

/**
 * Local identity aliases for the ability spellings this module's stat/power
 * block implements. `attacker.ability === "ABILITY_HUGE_POWER"` would work
 * identically at runtime, but the ability/item parity census only counts
 * identifier-form references (tools/report/ability-item-parity-census.ts's
 * `insideStringLiteral` gate excludes quoted literals - see that file's
 * comment for why: the engine's id<->name tables spell the entire ability
 * universe as strings, which would make every ability trivially "referenced").
 */
const ABILITY_HUGE_POWER = "ABILITY_HUGE_POWER";
const ABILITY_PURE_POWER = "ABILITY_PURE_POWER";
const ABILITY_THICK_FAT = "ABILITY_THICK_FAT";
const ABILITY_HUSTLE = "ABILITY_HUSTLE";
const ABILITY_PLUS = "ABILITY_PLUS";
const ABILITY_MINUS = "ABILITY_MINUS";
const ABILITY_GUTS = "ABILITY_GUTS";
const ABILITY_MARVEL_SCALE = "ABILITY_MARVEL_SCALE";
const ABILITY_OVERGROW = "ABILITY_OVERGROW";
const ABILITY_BLAZE = "ABILITY_BLAZE";
const ABILITY_TORRENT = "ABILITY_TORRENT";
const ABILITY_SWARM = "ABILITY_SWARM";

/** pokemon.c:3219-3226 - the pinch-power ability keyed by the boosted type. */
const PINCH_BOOST_OWNER_BY_TYPE: Readonly<Record<string, string>> = {
  TYPE_GRASS: ABILITY_OVERGROW,
  TYPE_FIRE: ABILITY_BLAZE,
  TYPE_WATER: ABILITY_TORRENT,
  TYPE_BUG: ABILITY_SWARM,
};

/** Same identity-alias idiom as the ABILITY_* consts above, for this module's hold-item block. */
const HOLD_EFFECT_BUG_POWER = "HOLD_EFFECT_BUG_POWER";
const HOLD_EFFECT_STEEL_POWER = "HOLD_EFFECT_STEEL_POWER";
const HOLD_EFFECT_GROUND_POWER = "HOLD_EFFECT_GROUND_POWER";
const HOLD_EFFECT_ROCK_POWER = "HOLD_EFFECT_ROCK_POWER";
const HOLD_EFFECT_GRASS_POWER = "HOLD_EFFECT_GRASS_POWER";
const HOLD_EFFECT_DARK_POWER = "HOLD_EFFECT_DARK_POWER";
const HOLD_EFFECT_FIGHTING_POWER = "HOLD_EFFECT_FIGHTING_POWER";
const HOLD_EFFECT_ELECTRIC_POWER = "HOLD_EFFECT_ELECTRIC_POWER";
const HOLD_EFFECT_WATER_POWER = "HOLD_EFFECT_WATER_POWER";
const HOLD_EFFECT_FLYING_POWER = "HOLD_EFFECT_FLYING_POWER";
const HOLD_EFFECT_POISON_POWER = "HOLD_EFFECT_POISON_POWER";
const HOLD_EFFECT_ICE_POWER = "HOLD_EFFECT_ICE_POWER";
const HOLD_EFFECT_GHOST_POWER = "HOLD_EFFECT_GHOST_POWER";
const HOLD_EFFECT_PSYCHIC_POWER = "HOLD_EFFECT_PSYCHIC_POWER";
const HOLD_EFFECT_FIRE_POWER = "HOLD_EFFECT_FIRE_POWER";
const HOLD_EFFECT_DRAGON_POWER = "HOLD_EFFECT_DRAGON_POWER";
const HOLD_EFFECT_NORMAL_POWER = "HOLD_EFFECT_NORMAL_POWER";
const HOLD_EFFECT_CHOICE_BAND = "HOLD_EFFECT_CHOICE_BAND";
const HOLD_EFFECT_SOUL_DEW = "HOLD_EFFECT_SOUL_DEW";
const HOLD_EFFECT_DEEP_SEA_TOOTH = "HOLD_EFFECT_DEEP_SEA_TOOTH";
const HOLD_EFFECT_DEEP_SEA_SCALE = "HOLD_EFFECT_DEEP_SEA_SCALE";
const HOLD_EFFECT_LIGHT_BALL = "HOLD_EFFECT_LIGHT_BALL";
const HOLD_EFFECT_METAL_POWDER = "HOLD_EFFECT_METAL_POWDER";
const HOLD_EFFECT_THICK_CLUB = "HOLD_EFFECT_THICK_CLUB";

/** include/constants/species.h ids - the species-locked hold items' gates. */
const SPECIES_PIKACHU = 25;
const SPECIES_CUBONE = 104;
const SPECIES_MAROWAK = 105;
const SPECIES_DITTO = 132;
const SPECIES_CLAMPERL = 373;
const SPECIES_LATIAS = 407;
const SPECIES_LATIOS = 408;

/**
 * sHoldEffectToType (pokemon.c:1919-1938): attacker hold effect -> the move
 * type it boosts, first-match-break (source iterates in this exact array
 * order, though no two rows can ever share a hold effect so match order is
 * moot in practice).
 */
const HOLD_EFFECT_TO_TYPE: ReadonlyArray<readonly [string, string]> = [
  [HOLD_EFFECT_BUG_POWER, "TYPE_BUG"],
  [HOLD_EFFECT_STEEL_POWER, "TYPE_STEEL"],
  [HOLD_EFFECT_GROUND_POWER, "TYPE_GROUND"],
  [HOLD_EFFECT_ROCK_POWER, "TYPE_ROCK"],
  [HOLD_EFFECT_GRASS_POWER, "TYPE_GRASS"],
  [HOLD_EFFECT_DARK_POWER, "TYPE_DARK"],
  [HOLD_EFFECT_FIGHTING_POWER, "TYPE_FIGHTING"],
  [HOLD_EFFECT_ELECTRIC_POWER, "TYPE_ELECTRIC"],
  [HOLD_EFFECT_WATER_POWER, "TYPE_WATER"],
  [HOLD_EFFECT_FLYING_POWER, "TYPE_FLYING"],
  [HOLD_EFFECT_POISON_POWER, "TYPE_POISON"],
  [HOLD_EFFECT_ICE_POWER, "TYPE_ICE"],
  [HOLD_EFFECT_GHOST_POWER, "TYPE_GHOST"],
  [HOLD_EFFECT_PSYCHIC_POWER, "TYPE_PSYCHIC"],
  [HOLD_EFFECT_FIRE_POWER, "TYPE_FIRE"],
  [HOLD_EFFECT_DRAGON_POWER, "TYPE_DRAGON"],
  [HOLD_EFFECT_NORMAL_POWER, "TYPE_NORMAL"],
];

/**
 * CalculateBaseDamage (pokemon.c:3106-3371), physical/special branches only
 * (TYPE_MYSTERY's "damage = 0" branch is also ported). Badge boosts are NOT
 * applied (see module doc comment) - always off in this engine.
 */
export function calculateBaseDamage(input: DamageCalcInput): number {
  const { attacker, defender, moveType, isCriticalHit } = input;
  let damage: number;

  // pokemon.c:3158 - Huge/Pure Power double the attacker's raw Attack
  // before every later stat modifier (hold-item/badge boosts between here
  // and the ability block below are out of scope - see module doc comment).
  let attack = attacker.attack;
  if (attacker.ability === ABILITY_HUGE_POWER || attacker.ability === ABILITY_PURE_POWER) {
    attack *= 2;
  }
  let spAttack = attacker.spAttack;
  let defense = defender.defense;
  let spDefense = defender.spDefense;

  // pokemon.c:3171-3183 - sHoldEffectToType, attacker-only, first-match-
  // break: physical types boost attack, special types boost spAttack, by
  // (holdEffectParam + 100) / 100.
  const attackerHoldEffect = attacker.holdEffect ?? null;
  const attackerHoldEffectParam = attacker.holdEffectParam ?? 0;
  const defenderHoldEffect = defender.holdEffect ?? null;
  for (const [holdEffect, boostedType] of HOLD_EFFECT_TO_TYPE) {
    if (attackerHoldEffect === holdEffect && moveType === boostedType) {
      if (isTypePhysical(moveType)) {
        attack = Math.trunc((attack * (attackerHoldEffectParam + 100)) / 100);
      } else {
        spAttack = Math.trunc((spAttack * (attackerHoldEffectParam + 100)) / 100);
      }
      break;
    }
  }

  // pokemon.c:3185-3201 - Choice Band and the 6 species-locked hold items
  // (the badge-boost block between the type-boost loop above and here is
  // link/badge-gated and out of scope for Factory - see module doc comment).
  if (attackerHoldEffect === HOLD_EFFECT_CHOICE_BAND) {
    attack = Math.trunc((150 * attack) / 100);
  }
  if (
    attackerHoldEffect === HOLD_EFFECT_SOUL_DEW
    && !input.isFrontierBattle
    && (attacker.species === SPECIES_LATIAS || attacker.species === SPECIES_LATIOS)
  ) {
    spAttack = Math.trunc((150 * spAttack) / 100);
  }
  if (
    defenderHoldEffect === HOLD_EFFECT_SOUL_DEW
    && !input.isFrontierBattle
    && (defender.species === SPECIES_LATIAS || defender.species === SPECIES_LATIOS)
  ) {
    spDefense = Math.trunc((150 * spDefense) / 100);
  }
  if (attackerHoldEffect === HOLD_EFFECT_DEEP_SEA_TOOTH && attacker.species === SPECIES_CLAMPERL) {
    spAttack *= 2;
  }
  if (defenderHoldEffect === HOLD_EFFECT_DEEP_SEA_SCALE && defender.species === SPECIES_CLAMPERL) {
    spDefense *= 2;
  }
  if (attackerHoldEffect === HOLD_EFFECT_LIGHT_BALL && attacker.species === SPECIES_PIKACHU) {
    spAttack *= 2;
  }
  if (defenderHoldEffect === HOLD_EFFECT_METAL_POWDER && defender.species === SPECIES_DITTO) {
    defense *= 2;
  }
  if (
    attackerHoldEffect === HOLD_EFFECT_THICK_CLUB
    && (attacker.species === SPECIES_CUBONE || attacker.species === SPECIES_MAROWAK)
  ) {
    attack *= 2;
  }

  // pokemon.c:3203-3213 ability block, exact source order.
  if (defender.ability === ABILITY_THICK_FAT && (moveType === "TYPE_FIRE" || moveType === "TYPE_ICE")) {
    spAttack = Math.trunc(spAttack / 2);
  }
  if (attacker.ability === ABILITY_HUSTLE) {
    attack = Math.trunc((150 * attack) / 100);
  }
  const activeBattlerAbilities = input.activeBattlerAbilities ?? [attacker.ability, defender.ability];
  if (attacker.ability === ABILITY_PLUS && activeBattlerAbilities.some((a) => a === ABILITY_MINUS)) {
    spAttack = Math.trunc((150 * spAttack) / 100);
  }
  if (attacker.ability === ABILITY_MINUS && activeBattlerAbilities.some((a) => a === ABILITY_PLUS)) {
    spAttack = Math.trunc((150 * spAttack) / 100);
  }
  if (attacker.ability === ABILITY_GUTS && attacker.hasStatus1) {
    attack = Math.trunc((150 * attack) / 100);
  }
  if (defender.ability === ABILITY_MARVEL_SCALE && defender.hasStatus1) {
    defense = Math.trunc((150 * defense) / 100);
  }

  // pokemon.c:3219-3226 pinch-power boosts (the Mud Sport/Water Sport
  // field-power halving between Marvel Scale and here is out of scope).
  let movePower = input.movePower;
  const pinchAbility = PINCH_BOOST_OWNER_BY_TYPE[moveType];
  if (
    pinchAbility !== undefined
    && attacker.ability === pinchAbility
    && attacker.hp !== undefined
    && attacker.maxHP !== undefined
    && attacker.hp <= Math.trunc(attacker.maxHP / 3)
  ) {
    movePower = Math.trunc((150 * movePower) / 100);
  }

  // pokemon.c:3228-3230 - Explosion/Self-Destruct halve Defense AFTER the
  // ability block, so it stacks with (not replaces) a Marvel Scale boost.
  const defenderDefense = input.moveEffect === "EFFECT_EXPLOSION" ? Math.trunc(defense / 2) : defense;

  if (isTypePhysical(moveType)) {
    damage = critAdjustedAttackStat(attack, attacker.statStages.atk, isCriticalHit);

    damage = damage * movePower;
    damage *= Math.trunc((2 * attacker.level) / 5) + 2;

    const damageHelper = critAdjustedDefenseStat(defenderDefense, defender.statStages.def, isCriticalHit);

    damage = Math.trunc(damage / damageHelper);
    damage = Math.trunc(damage / 50);

    if (attacker.isBurned && attacker.ability !== ABILITY_GUTS) damage = Math.trunc(damage / 2);

    if (input.sideStatusReflect && !isCriticalHit) {
      damage = input.isDoubleBattleSpreadMove ? 2 * Math.trunc(damage / 3) : Math.trunc(damage / 2);
    }
    if (input.isDoubleBattleSpreadMove) damage = Math.trunc(damage / 2);
    if (damage === 0) damage = 1;
  } else if (moveType === "TYPE_MYSTERY") {
    damage = 0;
  } else {
    // Special branch (pokemon.c:3287-3368).
    damage = critAdjustedAttackStat(spAttack, attacker.statStages.spAtk, isCriticalHit);

    damage = damage * movePower;
    damage *= Math.trunc((2 * attacker.level) / 5) + 2;

    const damageHelper = critAdjustedDefenseStat(spDefense, defender.statStages.spDef, isCriticalHit);

    damage = Math.trunc(damage / damageHelper);
    damage = Math.trunc(damage / 50);

    if (input.sideStatusLightScreen && !isCriticalHit) {
      damage = input.isDoubleBattleSpreadMove ? 2 * Math.trunc(damage / 3) : Math.trunc(damage / 2);
    }
    if (input.isDoubleBattleSpreadMove) damage = Math.trunc(damage / 2);

    // WEATHER_HAS_EFFECT2-gated block (pokemon.c:3331-3363), after the main
    // special arithmetic/screens/spread and before Flash Fire and the
    // unconditional +2. Each operation truncates independently in source.
    if (input.weatherHasEffect !== false) {
      const weather = input.weather ?? 0;
      const rain = (1 << 0) | (1 << 1) | (1 << 2);
      const sandstorm = (1 << 3) | (1 << 4);
      const sun = (1 << 5) | (1 << 6);
      const hail = 1 << 7;

      if ((weather & rain) !== 0) {
        if (moveType === "TYPE_FIRE") damage = Math.trunc(damage / 2);
        else if (moveType === "TYPE_WATER") damage = Math.trunc((15 * damage) / 10);
      }

      // MOVE_SOLAR_BEAM (include/constants/moves.h:80) is weakened by every
      // modeled weather except sun. This is move-id-gated, not type-gated.
      if (
        (weather & (rain | sandstorm | hail)) !== 0
        && input.currentMove === 76
      ) {
        damage = Math.trunc(damage / 2);
      }

      if ((weather & sun) !== 0) {
        if (moveType === "TYPE_FIRE") damage = Math.trunc((15 * damage) / 10);
        else if (moveType === "TYPE_WATER") damage = Math.trunc(damage / 2);
      }
    }

    // pokemon.c:3367-3368 -- after weather and before the unconditional +2.
    if (input.flashFireBoosted && moveType === "TYPE_FIRE") {
      damage = Math.trunc((15 * damage) / 10);
    }
  }

  // Unconditional +2 (pokemon.c:3371) - every CalculateBaseDamage return
  // path adds this, regardless of physical/special/mystery branch. Easy to
  // miss reading the function top-down (it lives at the very end, after
  // the weather block) - confirmed against the committed RAM dump: Rock
  // Slide's actual pre-STAB gBattleMoveDamage is 32, not floor(...)=30 -
  // see docs/battle-turn-notes.md §10.
  return damage + 2;
}

/** sCriticalHitChance (battle_script_commands.c:606): chance is 1-in-N per stage. */
export const CRITICAL_HIT_CHANCE_ONE_IN: readonly number[] = [16, 8, 4, 3, 2];

export interface CritChanceInput {
  focusEnergy?: boolean;
  moveEffect?: string;
  attackerHoldEffect?: string | null;
  attackerSpecies?: number;
  /** SPECIES_CHANSEY - Lucky Punch's +2 stage boost is species-gated. */
  isChansey?: boolean;
  /** SPECIES_FARFETCHD - Stick's +2 stage boost is species-gated. */
  isFarfetchd?: boolean;
}

/** critChance stage computation (Cmd_critcalc, battle_script_commands.c:1266-1276). */
export function getCriticalHitChanceStage(input: CritChanceInput): number {
  let critChance = 0;
  if (input.focusEnergy) critChance += 2;
  if (input.moveEffect === "EFFECT_HIGH_CRITICAL") critChance += 1;
  if (input.moveEffect === "EFFECT_SKY_ATTACK") critChance += 1;
  if (input.moveEffect === "EFFECT_BLAZE_KICK") critChance += 1;
  if (input.moveEffect === "EFFECT_POISON_TAIL") critChance += 1;
  if (input.attackerHoldEffect === "HOLD_EFFECT_SCOPE_LENS") critChance += 1;
  if (input.attackerHoldEffect === "HOLD_EFFECT_LUCKY_PUNCH" && input.isChansey) critChance += 2;
  if (input.attackerHoldEffect === "HOLD_EFFECT_STICK" && input.isFarfetchd) critChance += 2;
  if (critChance >= CRITICAL_HIT_CHANCE_ONE_IN.length) critChance = CRITICAL_HIT_CHANCE_ONE_IN.length - 1;
  return critChance;
}

/**
 * Cmd_critcalc's final roll (battle_script_commands.c:1279-1283):
 * !(Random() % sCriticalHitChance[critChance]), gated on Battle Armor/Shell
 * Armor/STATUS3_CANT_SCORE_A_CRIT/tutorial-battle flags (all false for
 * battle 1). `rngRoll` is the raw Random() u16 output (consumes 1 step).
 */
export function rollIsCriticalHit(critChanceStage: number, rngRoll: number, targetImmune = false): boolean {
  if (targetImmune) return false;
  return rngRoll % CRITICAL_HIT_CHANCE_ONE_IN[critChanceStage]! === 0;
}

/** IS_BATTLER_OF_TYPE-style STAB check + Cmd_typecalc's STAB step (:1368-1371). */
export function applyStab(damage: number, attackerTypes: readonly [string, string], moveType: string): number {
  if (attackerTypes[0] === moveType || attackerTypes[1] === moveType) {
    return Math.trunc((damage * 15) / 10);
  }
  return damage;
}

export interface TypeEffectivenessEntry {
  attackingType: string;
  defendingType: string;
  multiplierTenths: number;
}

/**
 * ModulateDmgByType (battle_script_commands.c:1321-1326) applied once per
 * distinct defender type that has a table entry for moveType (Cmd_typecalc,
 * :1385-1404) - a dual-type defender can have the multiplier applied twice
 * (e.g. 4x for a double-weak matchup). Missing table entry = neutral (1x),
 * matching src/data/gen/type-effectiveness.json's own convention (only
 * non-1x matchups are listed).
 */
export function applyTypeEffectiveness(
  damage: number,
  moveType: string,
  defenderTypes: readonly [string, string],
  table: readonly TypeEffectivenessEntry[],
): { damage: number; multiplierTenths: number } {
  let result = damage;
  let totalMultiplierTenths = 10;
  const distinctTypes = defenderTypes[0] === defenderTypes[1] ? [defenderTypes[0]] : defenderTypes;
  for (const defType of distinctTypes) {
    const entry = table.find((e) => e.attackingType === moveType && e.defendingType === defType);
    if (!entry) continue;
    totalMultiplierTenths = Math.trunc((totalMultiplierTenths * entry.multiplierTenths) / 10);
    result = Math.trunc((result * entry.multiplierTenths) / 10);
    if (result === 0 && entry.multiplierTenths !== 0) result = 1;
  }
  return { damage: result, multiplierTenths: totalMultiplierTenths };
}

/**
 * `EFFECT_ENDEAVOR`'s `setdamagetohealthdifference` (`Cmd_setdamagetohealthdifference`,
 * battle_script_commands.c; docs/battle-turn-notes.md §12): sets the raw
 * damage to `targetHp - userHp`, clamped to 0 (never negative - if the user
 * is already at or below the target's HP, the effect deals no damage; the
 * move's own `jumpifmovehadnoeffect`/accuracy gating decides failure
 * separately, not modeled here).
 */
export function calculateEndeavorDamage(targetHp: number, userHp: number): number {
  return Math.max(0, targetHp - userHp);
}

/**
 * `EFFECT_ENDEAVOR`'s full damage resolution end-to-end
 * (`BattleScript_EffectEndeavor`, data/battle_scripts_1.s:2479-2491;
 * docs/battle-turn-notes.md §12, RAM-verified 117/101 -> 16): `typecalc`
 * still runs after `setdamagetohealthdifference` and visibly scales
 * `gBattleMoveDamage` by the type multiplier (e.g. 16 -> 8 for a 0.5x
 * matchup) - but that scaled value only gates whether the move has any
 * effect at all (a 0x multiplier = immune, no damage); the script's very
 * next command (`copyword gBattleMoveDamage, gHpDealt`) restores the
 * original, UNSCALED HP-diff before it's ever applied. So type
 * effectiveness never actually scales ENDEAVOR's dealt damage, only its
 * immunity check - genuinely different from `calculateBaseDamage`'s own
 * moves, where `applyTypeEffectiveness`'s result IS the final damage.
 */
export function resolveEndeavorDamage(targetHp: number, userHp: number, typeMultiplierTenths: number): number {
  const hpDiff = calculateEndeavorDamage(targetHp, userHp);
  return typeMultiplierTenths === 0 ? 0 : hpDiff;
}

/**
 * ApplyRandomDmgMultiplier (battle_script_commands.c:1639-1651): 85-100%
 * inclusive spread, `rngRoll` is the raw Random() u16 output (1 RNG step).
 */
export function applyRandomDamageMultiplier(damage: number, rngRoll: number): number {
  if (damage === 0) return 0;
  const randPercent = 100 - (rngRoll % 16);
  let result = damage * randPercent;
  result = Math.trunc(result / 100);
  if (result === 0) result = 1;
  return result;
}

/** sAccuracyStageRatios (battle_script_commands.c:588-603), index = stage 0..12. */
export const ACCURACY_STAGE_RATIOS: ReadonlyArray<readonly [number, number]> = [
  [33, 100],
  [36, 100],
  [43, 100],
  [50, 100],
  [60, 100],
  [75, 100],
  [1, 1],
  [133, 100],
  [166, 100],
  [2, 1],
  [233, 100],
  [133, 50],
  [3, 1],
];

export interface AccuracyCalcInput {
  moveAccuracy: number;
  attackerAccuracyStage: number;
  targetEvasionStage: number;
  /** STATUS2_FORESIGHT on the target - ignores its evasion stage (battle_script_commands.c:1127-1135). */
  targetHasForesight?: boolean;
  attackerAbility?: string | null;
  targetAbility?: string | null;
  isSandstorm?: boolean;
  moveType?: string;
  /** The TARGET's held item (Cmd_accuracycheck reads gBattleMons[gBattlerTarget].item, :1163-1170). */
  targetHoldEffect?: string | null;
  targetHoldEffectParam?: number;
}

/**
 * Cmd_accuracycheck's `calc` value (battle_script_commands.c:1120-1170),
 * i.e. the attacker's actual hit chance out of 100 for this move, after
 * stat-stage/ability/item modifiers - everything up to but not including
 * the final `(Random() % 100 + 1) > calc` roll.
 */
export function calculateAccuracy(input: AccuracyCalcInput): number {
  let buff = input.targetHasForesight
    ? input.attackerAccuracyStage
    : input.attackerAccuracyStage + DEFAULT_STAT_STAGE - input.targetEvasionStage;
  if (buff < MIN_STAT_STAGE) buff = MIN_STAT_STAGE;
  if (buff > MAX_STAT_STAGE) buff = MAX_STAT_STAGE;

  const [dividend, divisor] = ACCURACY_STAGE_RATIOS[buff]!;
  let calc = Math.trunc((dividend * input.moveAccuracy) / divisor);

  if (input.attackerAbility === "ABILITY_COMPOUND_EYES") calc = Math.trunc((calc * 130) / 100);
  if (input.isSandstorm && input.targetAbility === "ABILITY_SAND_VEIL") calc = Math.trunc((calc * 80) / 100);
  if (input.attackerAbility === "ABILITY_HUSTLE" && input.moveType && isTypePhysical(input.moveType)) {
    calc = Math.trunc((calc * 80) / 100);
  }
  if (input.targetHoldEffect === "HOLD_EFFECT_EVASION_UP") {
    calc = Math.trunc((calc * (100 - (input.targetHoldEffectParam ?? 0))) / 100);
  }
  return calc;
}

/** Cmd_accuracycheck's final roll (battle_script_commands.c:1168): (Random()%100+1) > calc means miss. */
export function rollAccuracyHits(calc: number, rngRoll: number): boolean {
  return (rngRoll % 100) + 1 <= calc;
}
