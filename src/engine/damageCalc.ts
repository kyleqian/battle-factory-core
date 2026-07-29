// Gen-3 damage/accuracy/crit math, ported bit-exact from
// reference/pokeemerald/src/pokemon.c (CalculateBaseDamage, :3106-3371) and
// reference/pokeemerald/src/battle_script_commands.c (Cmd_critcalc :1253,
// Cmd_typecalc :1355, Cmd_accuracycheck :1099, ApplyRandomDmgMultiplier
// :1639). Scope: the branches battle 1's turn 1 exercises (level-50
// singles, no weather/screens/double-battle) are fully exercised by
// Tier-1 tests; the surrounding modifier chain (held items, abilities,
// Reflect/Light Screen, double-battle target-split) is ported structurally
// so later S7 slices can enable those paths, but is untested this step —
// see docs/battle-turn-notes.md §10 for the exact inventory.
//
// NOT ported (out of scope this step, no battle-1 turn exercises them):
// Flash Fire's triggered damage modifier, the 6 species-locked hold items
// (Soul Dew, Deep Sea Tooth/Scale,
// Light Ball, Metal Powder, Thick Club - none of battle 1's 6 mons are
// eligible species), Wonder Guard/Levitate immunity side-effects beyond the
// raw multiplier, badge boosts (always off - ShouldGetStatBadgeBoost
// returns FALSE unconditionally for BATTLE_TYPE_FRONTIER, which every
// battle this engine models is).

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
  /** ABILITY_* id, structurally present - see the modifier-chain notes above for what's wired. */
  ability?: string | null;
  species?: number;
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
 * CalculateBaseDamage (pokemon.c:3106-3371), physical/special branches only
 * (TYPE_MYSTERY's "damage = 0" branch is also ported). Item type-boosts,
 * badge boosts and the 6 species-locked hold items are NOT applied (see
 * module doc comment) - battle 1 turn 1 needs none of them
 * (src/data/gen/item-hold-effects.json + docs/battle-turn-notes.md §7
 * confirm battle 1's held items don't touch this function).
 */
export function calculateBaseDamage(input: DamageCalcInput): number {
  const { attacker, defender, movePower, moveType, isCriticalHit } = input;
  let damage: number;
  const defenderDefense = input.moveEffect === "EFFECT_EXPLOSION"
    ? Math.trunc(defender.defense / 2)
    : defender.defense;

  if (isTypePhysical(moveType)) {
    damage = critAdjustedAttackStat(attacker.attack, attacker.statStages.atk, isCriticalHit);

    damage = damage * movePower;
    damage *= Math.trunc((2 * attacker.level) / 5) + 2;

    const damageHelper = critAdjustedDefenseStat(defenderDefense, defender.statStages.def, isCriticalHit);

    damage = Math.trunc(damage / damageHelper);
    damage = Math.trunc(damage / 50);

    if (attacker.isBurned && attacker.ability !== "ABILITY_GUTS") damage = Math.trunc(damage / 2);

    if (input.sideStatusReflect && !isCriticalHit) {
      damage = input.isDoubleBattleSpreadMove ? 2 * Math.trunc(damage / 3) : Math.trunc(damage / 2);
    }
    if (input.isDoubleBattleSpreadMove) damage = Math.trunc(damage / 2);
    if (damage === 0) damage = 1;
  } else if (moveType === "TYPE_MYSTERY") {
    damage = 0;
  } else {
    // Special branch (pokemon.c:3287-3368); Flash Fire remains outside the
    // ported modifier inventory described in the module comment.
    damage = critAdjustedAttackStat(attacker.spAttack, attacker.statStages.spAtk, isCriticalHit);

    damage = damage * movePower;
    damage *= Math.trunc((2 * attacker.level) / 5) + 2;

    const damageHelper = critAdjustedDefenseStat(defender.spDefense, defender.statStages.spDef, isCriticalHit);

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
