#!/usr/bin/env node
// Codegen for core-rs/crates/factory-core/src/damage_vectors_gen.rs.
//
// Computes every expected value by EXECUTING the real src/engine/damageCalc.ts
// (read-only import, node --experimental-strip-types - the gen-data.mjs
// precedent) and src/engine/rng.ts's GbaRng (for the seeded structural
// sweep). No value in the emitted file is hand-computed. Deterministic: the
// sweep is seeded from a fixed GbaRng seed, not Math.random/Date.now, so
// reruns are byte-identical.
//
// Usage: node core-rs/tools/gen-damage-vectors.mjs   (from any cwd)

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

const scriptDir = path.dirname(fileURLToPath(import.meta.url)); // core-rs/tools
const workspaceRoot = path.resolve(scriptDir, "..", ".."); // two dirs up
const outPath = path.join(scriptDir, "..", "crates", "factory-core", "src", "damage_vectors_gen.rs");

const damageCalc = await import(path.join(workspaceRoot, "src", "engine", "damageCalc.ts"));
const { GbaRng } = await import(path.join(workspaceRoot, "src", "engine", "rng.ts"));
const typeEffectivenessJson = JSON.parse(
  fs.readFileSync(path.join(workspaceRoot, "src", "data", "gen", "type-effectiveness.json"), "utf8"),
);

// --- TYPE_IDS: mirrors the (unexported) table inline in damageCalc.ts and
// damage_calc.rs's TYPE_* consts. Verified against both at port time. ---
const TYPE_IDS = {
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
const TYPE_NAMES = Object.keys(TYPE_IDS);
const REAL_TYPE_NAMES = TYPE_NAMES; // all 18 are real move/mon types (TYPE_FORESIGHT is not one of them)

// --- ability/hold-effect ids: same source gen_tables.rs and damage_calc.rs
// use (src/data/gen/ability-item-hooks.json .universes). ---
const abilityItemHooks = JSON.parse(
  fs.readFileSync(path.join(workspaceRoot, "src", "data", "gen", "ability-item-hooks.json"), "utf8"),
);
const abilityIdByName = new Map(abilityItemHooks.universes.abilities.map((a) => [a.name, a.id]));
const holdEffectIdByName = new Map(abilityItemHooks.universes.holdEffects.map((h) => [h.name, h.id]));
function abilityId(name) {
  if (name === null || name === undefined) return 0; // ABILITY_NONE
  if (!abilityIdByName.has(name)) throw new Error(`gen-damage-vectors: unknown ability ${name}`);
  return abilityIdByName.get(name);
}
function holdEffectId(name) {
  if (name === null || name === undefined) return 0; // HOLD_EFFECT_NONE
  if (!holdEffectIdByName.has(name)) throw new Error(`gen-damage-vectors: unknown hold effect ${name}`);
  return holdEffectIdByName.get(name);
}

// species.h ids the hold-item species gates need - same numbers
// damageCalc.ts and damage_calc.rs hardcode (include/constants/species.h).
const SPECIES = {
  PIKACHU: 25,
  CUBONE: 104,
  MAROWAK: 105,
  DITTO: 132,
  CLAMPERL: 373,
  LATIAS: 407,
  LATIOS: 408,
  CHANSEY: 113,
  FARFETCHD: 83,
  BULBASAUR: 1, // any "wrong species" filler
};

const rows = {
  typeEffectiveness: [],
  statStage: [],
  calcBaseDamage: [],
  critChanceStage: [],
  critRoll: [],
  stab: [],
  endeavor: [],
  endeavorResolve: [],
  randomMultiplier: [],
  accuracy: [],
  accuracyRoll: [],
};

// === a. applyTypeEffectiveness =============================================

for (const atk of REAL_TYPE_NAMES) {
  for (const def of REAL_TYPE_NAMES) {
    const { damage, multiplierTenths } = damageCalc.applyTypeEffectiveness(
      100,
      atk,
      [def, def],
      typeEffectivenessJson.typeEffectiveness,
    );
    rows.typeEffectiveness.push({
      attackingType: TYPE_IDS[atk],
      defendingTypeA: TYPE_IDS[def],
      defendingTypeB: TYPE_IDS[def],
      damageIn: 100,
      expectedDamage: damage,
      expectedMultiplierTenths: multiplierTenths,
    });
  }
}

// Directed dual-type samples: immunities, double-weak, and the
// minimum-1-per-step guard at small damage values.
const dualTypeDirected = [
  // ELECTRIC vs GROUND/FLYING: GROUND alone is already a full immunity (0x);
  // the second (FLYING, 2x) step never runs because the total is already 0.
  ["TYPE_ELECTRIC", "TYPE_GROUND", "TYPE_FLYING", 100],
  // POISON vs STEEL(0x)/GRASS(2x): immune regardless of the weak second type.
  ["TYPE_POISON", "TYPE_STEEL", "TYPE_GRASS", 100],
  // FIRE vs GRASS/BUG: 2x then 2x again = 4x double-weak.
  ["TYPE_FIRE", "TYPE_GRASS", "TYPE_BUG", 20],
  // ICE vs GRASS/GROUND: 2x then 2x again = 4x double-weak.
  ["TYPE_ICE", "TYPE_GRASS", "TYPE_GROUND", 25],
  // Minimum-1 guard: small damage, single 0.5x step would floor to 0.
  ["TYPE_NORMAL", "TYPE_ROCK", "TYPE_ROCK", 1],
  ["TYPE_NORMAL", "TYPE_ROCK", "TYPE_ROCK", 0],
  // Minimum-1 guard across two successive halving steps (dual 0.5x/0.5x).
  ["TYPE_ICE", "TYPE_FIRE", "TYPE_ICE", 3],
  // Same-type dual (defenderTypes[0] === defenderTypes[1]) applies once, not twice.
  ["TYPE_WATER", "TYPE_FIRE", "TYPE_FIRE", 10],
];
for (const [atk, defA, defB, damageIn] of dualTypeDirected) {
  const { damage, multiplierTenths } = damageCalc.applyTypeEffectiveness(
    damageIn,
    atk,
    [defA, defB],
    typeEffectivenessJson.typeEffectiveness,
  );
  rows.typeEffectiveness.push({
    attackingType: TYPE_IDS[atk],
    defendingTypeA: TYPE_IDS[defA],
    defendingTypeB: TYPE_IDS[defB],
    damageIn,
    expectedDamage: damage,
    expectedMultiplierTenths: multiplierTenths,
  });
}

// === b. applyStatStageMod ===================================================

const STAT_VALUES = [0, 1, 7, 55, 100, 251, 500, 999];
for (let stage = 0; stage <= 12; stage++) {
  for (const stat of STAT_VALUES) {
    rows.statStage.push({
      stat,
      stage,
      expected: damageCalc.applyStatStageMod(stat, stage),
    });
  }
}

// === c. calculateBaseDamage ================================================

const NEUTRAL_STAGES = { atk: 6, def: 6, spAtk: 6, spDef: 6 };
function battler(overrides = {}) {
  return {
    attack: 100,
    defense: 100,
    spAttack: 100,
    spDefense: 100,
    level: 50,
    types: ["TYPE_NORMAL", "TYPE_NORMAL"],
    statStages: { ...NEUTRAL_STAGES },
    isBurned: false,
    hasStatus1: false,
    hp: undefined,
    maxHP: undefined,
    ability: null,
    species: 0,
    holdEffect: null,
    holdEffectParam: 0,
    ...overrides,
  };
}
function baseInput(overrides = {}) {
  return {
    attacker: battler(),
    defender: battler(),
    movePower: 40,
    moveType: "TYPE_NORMAL",
    isCriticalHit: false,
    sideStatusReflect: false,
    sideStatusLightScreen: false,
    isDoubleBattleSpreadMove: false,
    moveEffect: undefined,
    weather: 0,
    weatherHasEffect: true,
    currentMove: 0,
    isFrontierBattle: false,
    flashFireBoosted: false,
    ...overrides,
  };
}
function pushCalcCase(input, label) {
  const expected = damageCalc.calculateBaseDamage(input);
  rows.calcBaseDamage.push({ input, expected, label });
}

// --- directed: each ability in the modifier block ---
pushCalcCase(baseInput({ attacker: battler({ ability: "ABILITY_HUGE_POWER" }) }), "huge_power");
pushCalcCase(baseInput({ attacker: battler({ ability: "ABILITY_PURE_POWER" }) }), "pure_power");
pushCalcCase(
  baseInput({ moveType: "TYPE_FIRE", defender: battler({ ability: "ABILITY_THICK_FAT" }) }),
  "thick_fat_fire",
);
pushCalcCase(
  baseInput({ moveType: "TYPE_ICE", defender: battler({ ability: "ABILITY_THICK_FAT" }) }),
  "thick_fat_ice",
);
pushCalcCase(baseInput({ attacker: battler({ ability: "ABILITY_HUSTLE" }) }), "hustle");
pushCalcCase(
  baseInput({
    moveType: "TYPE_WATER",
    attacker: battler({ ability: "ABILITY_PLUS", types: ["TYPE_WATER", "TYPE_WATER"] }),
    defender: battler({ ability: "ABILITY_MINUS", types: ["TYPE_WATER", "TYPE_WATER"] }),
  }),
  "plus_minus_default_pairing",
);
pushCalcCase(
  baseInput({ attacker: battler({ ability: "ABILITY_GUTS", hasStatus1: true }) }),
  "guts_with_status",
);
pushCalcCase(
  baseInput({ attacker: battler({ ability: "ABILITY_GUTS", hasStatus1: false }) }),
  "guts_without_status",
);
pushCalcCase(
  baseInput({ defender: battler({ ability: "ABILITY_MARVEL_SCALE", hasStatus1: true }) }),
  "marvel_scale_with_status",
);
const PINCH = [
  ["TYPE_GRASS", "ABILITY_OVERGROW"],
  ["TYPE_FIRE", "ABILITY_BLAZE"],
  ["TYPE_WATER", "ABILITY_TORRENT"],
  ["TYPE_BUG", "ABILITY_SWARM"],
];
for (const [moveType, ability] of PINCH) {
  pushCalcCase(
    baseInput({
      moveType,
      attacker: battler({ ability, hp: 10, maxHP: 30 }), // hp(10) <= maxHP/3(10): in pinch
    }),
    `pinch_${ability}_in_range`,
  );
  pushCalcCase(
    baseInput({
      moveType,
      attacker: battler({ ability, hp: 11, maxHP: 30 }), // hp(11) > maxHP/3(10): not in pinch
    }),
    `pinch_${ability}_out_of_range`,
  );
}

// --- directed: each hold effect in the hold-item block ---
const TYPE_POWER_ITEMS = [
  ["HOLD_EFFECT_BUG_POWER", "TYPE_BUG"],
  ["HOLD_EFFECT_STEEL_POWER", "TYPE_STEEL"],
  ["HOLD_EFFECT_GROUND_POWER", "TYPE_GROUND"],
  ["HOLD_EFFECT_ROCK_POWER", "TYPE_ROCK"],
  ["HOLD_EFFECT_GRASS_POWER", "TYPE_GRASS"],
  ["HOLD_EFFECT_DARK_POWER", "TYPE_DARK"],
  ["HOLD_EFFECT_FIGHTING_POWER", "TYPE_FIGHTING"],
  ["HOLD_EFFECT_ELECTRIC_POWER", "TYPE_ELECTRIC"],
  ["HOLD_EFFECT_WATER_POWER", "TYPE_WATER"],
  ["HOLD_EFFECT_FLYING_POWER", "TYPE_FLYING"],
  ["HOLD_EFFECT_POISON_POWER", "TYPE_POISON"],
  ["HOLD_EFFECT_ICE_POWER", "TYPE_ICE"],
  ["HOLD_EFFECT_GHOST_POWER", "TYPE_GHOST"],
  ["HOLD_EFFECT_PSYCHIC_POWER", "TYPE_PSYCHIC"],
  ["HOLD_EFFECT_FIRE_POWER", "TYPE_FIRE"],
  ["HOLD_EFFECT_DRAGON_POWER", "TYPE_DRAGON"],
  ["HOLD_EFFECT_NORMAL_POWER", "TYPE_NORMAL"],
];
for (const [holdEffect, moveType] of TYPE_POWER_ITEMS) {
  pushCalcCase(
    baseInput({
      moveType,
      attacker: battler({ holdEffect, holdEffectParam: 10 }),
    }),
    `type_power_${holdEffect}`,
  );
}
pushCalcCase(baseInput({ attacker: battler({ holdEffect: "HOLD_EFFECT_CHOICE_BAND" }) }), "choice_band");
pushCalcCase(
  baseInput({
    moveType: "TYPE_WATER",
    attacker: battler({ holdEffect: "HOLD_EFFECT_SOUL_DEW", species: SPECIES.LATIAS }),
    isFrontierBattle: false,
  }),
  "soul_dew_latias_non_frontier",
);
pushCalcCase(
  baseInput({
    moveType: "TYPE_WATER",
    attacker: battler({ holdEffect: "HOLD_EFFECT_SOUL_DEW", species: SPECIES.LATIOS }),
    isFrontierBattle: true,
  }),
  "soul_dew_latios_frontier_gate_off",
);
pushCalcCase(
  baseInput({
    moveType: "TYPE_WATER",
    attacker: battler({ holdEffect: "HOLD_EFFECT_SOUL_DEW", species: SPECIES.BULBASAUR }),
    isFrontierBattle: false,
  }),
  "soul_dew_wrong_species",
);
pushCalcCase(
  baseInput({
    moveType: "TYPE_WATER",
    defender: battler({ holdEffect: "HOLD_EFFECT_SOUL_DEW", species: SPECIES.LATIOS }),
    isFrontierBattle: false,
  }),
  "soul_dew_defender_latios_non_frontier",
);
pushCalcCase(
  baseInput({
    moveType: "TYPE_WATER",
    attacker: battler({ holdEffect: "HOLD_EFFECT_DEEP_SEA_TOOTH", species: SPECIES.CLAMPERL }),
  }),
  "deep_sea_tooth_clamperl",
);
pushCalcCase(
  baseInput({
    moveType: "TYPE_WATER",
    attacker: battler({ holdEffect: "HOLD_EFFECT_DEEP_SEA_TOOTH", species: SPECIES.BULBASAUR }),
  }),
  "deep_sea_tooth_wrong_species",
);
pushCalcCase(
  baseInput({
    moveType: "TYPE_WATER",
    defender: battler({ holdEffect: "HOLD_EFFECT_DEEP_SEA_SCALE", species: SPECIES.CLAMPERL }),
  }),
  "deep_sea_scale_clamperl",
);
pushCalcCase(
  baseInput({
    moveType: "TYPE_WATER",
    defender: battler({ holdEffect: "HOLD_EFFECT_DEEP_SEA_SCALE", species: SPECIES.BULBASAUR }),
  }),
  "deep_sea_scale_wrong_species",
);
pushCalcCase(
  baseInput({
    moveType: "TYPE_WATER",
    attacker: battler({ holdEffect: "HOLD_EFFECT_LIGHT_BALL", species: SPECIES.PIKACHU }),
  }),
  "light_ball_pikachu",
);
pushCalcCase(
  baseInput({
    moveType: "TYPE_WATER",
    attacker: battler({ holdEffect: "HOLD_EFFECT_LIGHT_BALL", species: SPECIES.BULBASAUR }),
  }),
  "light_ball_wrong_species",
);
pushCalcCase(
  baseInput({ defender: battler({ holdEffect: "HOLD_EFFECT_METAL_POWDER", species: SPECIES.DITTO }) }),
  "metal_powder_ditto",
);
pushCalcCase(
  baseInput({ defender: battler({ holdEffect: "HOLD_EFFECT_METAL_POWDER", species: SPECIES.BULBASAUR }) }),
  "metal_powder_wrong_species",
);
pushCalcCase(
  baseInput({ attacker: battler({ holdEffect: "HOLD_EFFECT_THICK_CLUB", species: SPECIES.CUBONE }) }),
  "thick_club_cubone",
);
pushCalcCase(
  baseInput({ attacker: battler({ holdEffect: "HOLD_EFFECT_THICK_CLUB", species: SPECIES.MAROWAK }) }),
  "thick_club_marowak",
);
pushCalcCase(
  baseInput({ attacker: battler({ holdEffect: "HOLD_EFFECT_THICK_CLUB", species: SPECIES.BULBASAUR }) }),
  "thick_club_wrong_species",
);

// --- directed: weather x WEATHER_HAS_EFFECT2 state (special moves only) ---
const RAIN = (1 << 0) | (1 << 1) | (1 << 2);
const SANDSTORM = (1 << 3) | (1 << 4);
const SUN = (1 << 5) | (1 << 6);
const HAIL = 1 << 7;
const weatherDirected = [
  ["rain_fire", RAIN, "TYPE_FIRE", 0, true],
  ["rain_water", RAIN, "TYPE_WATER", 0, true],
  ["sun_fire", SUN, "TYPE_FIRE", 0, true],
  ["sun_water", SUN, "TYPE_WATER", 0, true],
  ["hail_psychic_no_direct_effect", HAIL, "TYPE_PSYCHIC", 0, true],
  ["sandstorm_psychic_no_direct_effect", SANDSTORM, "TYPE_PSYCHIC", 0, true],
  ["solar_beam_in_rain_halved", RAIN, "TYPE_NORMAL", 76, true],
  ["solar_beam_in_sandstorm_halved", SANDSTORM, "TYPE_NORMAL", 76, true],
  ["solar_beam_in_hail_halved", HAIL, "TYPE_NORMAL", 76, true],
  ["solar_beam_in_sun_not_halved", SUN, "TYPE_NORMAL", 76, true],
  ["rain_fire_weather_has_effect_false_suppressed", RAIN, "TYPE_FIRE", 0, false],
  ["sun_water_weather_has_effect_false_suppressed", SUN, "TYPE_WATER", 0, false],
];
for (const [label, weather, moveType, currentMove, weatherHasEffect] of weatherDirected) {
  pushCalcCase(
    baseInput({ moveType, weather, currentMove, weatherHasEffect }),
    `weather_${label}`,
  );
}
pushCalcCase(
  baseInput({ moveType: "TYPE_FIRE", flashFireBoosted: true }),
  "flash_fire_boosted",
);

// --- directed: burn with/without Guts ---
pushCalcCase(baseInput({ attacker: battler({ isBurned: true }) }), "burn_no_guts");
pushCalcCase(
  baseInput({ attacker: battler({ isBurned: true, ability: "ABILITY_GUTS" }) }),
  "burn_with_guts",
);

// --- directed: Reflect/Light Screen (crit bypasses; double-spread splits differently) ---
pushCalcCase(baseInput({ sideStatusReflect: true, isCriticalHit: false }), "reflect_no_crit");
pushCalcCase(baseInput({ sideStatusReflect: true, isCriticalHit: true }), "reflect_crit_bypasses");
pushCalcCase(
  baseInput({ sideStatusReflect: true, isDoubleBattleSpreadMove: true }),
  "reflect_double_spread",
);
pushCalcCase(
  baseInput({ moveType: "TYPE_WATER", sideStatusLightScreen: true, isCriticalHit: false }),
  "light_screen_no_crit",
);
pushCalcCase(
  baseInput({ moveType: "TYPE_WATER", sideStatusLightScreen: true, isCriticalHit: true }),
  "light_screen_crit_bypasses",
);
pushCalcCase(
  baseInput({ moveType: "TYPE_WATER", sideStatusLightScreen: true, isDoubleBattleSpreadMove: true }),
  "light_screen_double_spread",
);

// --- directed: double-battle target split alone (physical and special) ---
pushCalcCase(baseInput({ isDoubleBattleSpreadMove: true }), "double_spread_physical");
pushCalcCase(baseInput({ moveType: "TYPE_WATER", isDoubleBattleSpreadMove: true }), "double_spread_special");

// --- directed: EFFECT_EXPLOSION defense halving (stacks with Marvel Scale) ---
pushCalcCase(baseInput({ moveEffect: "EFFECT_EXPLOSION" }), "explosion_defense_halved");
pushCalcCase(
  baseInput({
    moveEffect: "EFFECT_EXPLOSION",
    defender: battler({ ability: "ABILITY_MARVEL_SCALE", hasStatus1: true }),
  }),
  "explosion_stacks_with_marvel_scale",
);

// --- directed: crit interacting with stat stages, the >6/<6 asymmetry ---
for (const crit of [false, true]) {
  pushCalcCase(
    baseInput({
      isCriticalHit: crit,
      attacker: battler({ statStages: { ...NEUTRAL_STAGES, atk: 10 } }), // raised (>6)
    }),
    `crit_${crit}_attacker_atk_raised`,
  );
  pushCalcCase(
    baseInput({
      isCriticalHit: crit,
      attacker: battler({ statStages: { ...NEUTRAL_STAGES, atk: 2 } }), // lowered (<6)
    }),
    `crit_${crit}_attacker_atk_lowered`,
  );
  pushCalcCase(
    baseInput({
      isCriticalHit: crit,
      defender: battler({ statStages: { ...NEUTRAL_STAGES, def: 10 } }), // raised (>6)
    }),
    `crit_${crit}_defender_def_raised`,
  );
  pushCalcCase(
    baseInput({
      isCriticalHit: crit,
      defender: battler({ statStages: { ...NEUTRAL_STAGES, def: 2 } }), // lowered (<6)
    }),
    `crit_${crit}_defender_def_lowered`,
  );
}

// --- seeded structural sweep across the whole input struct (valid ranges,
// both physical and special move types). Ability/hold-effect are left
// unset here - every branch they gate is covered by the directed cases
// above instead. ---
{
  const rng = new GbaRng(0x1234_5678);
  const pick = (n) => rng.next() % n;
  const SWEEP_TYPES = REAL_TYPE_NAMES.filter((t) => t !== "TYPE_MYSTERY");
  const SWEEP_COUNT = 180;
  for (let i = 0; i < SWEEP_COUNT; i++) {
    const moveType = SWEEP_TYPES[pick(SWEEP_TYPES.length)];
    const attacker = battler({
      attack: 1 + pick(999),
      spAttack: 1 + pick(999),
      level: 1 + pick(100),
      types: [SWEEP_TYPES[pick(SWEEP_TYPES.length)], SWEEP_TYPES[pick(SWEEP_TYPES.length)]],
      statStages: { atk: pick(13), def: pick(13), spAtk: pick(13), spDef: pick(13) },
      isBurned: pick(2) === 0,
    });
    const defender = battler({
      defense: 1 + pick(999),
      spDefense: 1 + pick(999),
      level: 1 + pick(100),
      types: [SWEEP_TYPES[pick(SWEEP_TYPES.length)], SWEEP_TYPES[pick(SWEEP_TYPES.length)]],
      statStages: { atk: pick(13), def: pick(13), spAtk: pick(13), spDef: pick(13) },
    });
    const input = baseInput({
      attacker,
      defender,
      movePower: 1 + pick(250),
      moveType,
      isCriticalHit: pick(2) === 0,
      sideStatusReflect: pick(2) === 0,
      sideStatusLightScreen: pick(2) === 0,
      isDoubleBattleSpreadMove: pick(2) === 0,
      weather: [0, RAIN, SANDSTORM, SUN, HAIL][pick(5)],
      weatherHasEffect: pick(2) === 0,
    });
    pushCalcCase(input, `sweep_${i}`);
  }
}

// === d. getCriticalHitChanceStage / rollIsCriticalHit ======================

const CRIT_MOVE_EFFECTS = [undefined, "EFFECT_HIGH_CRITICAL", "EFFECT_SKY_ATTACK", "EFFECT_BLAZE_KICK", "EFFECT_POISON_TAIL"];
for (const focusEnergy of [false, true]) {
  for (const moveEffect of CRIT_MOVE_EFFECTS) {
    const input = { focusEnergy, moveEffect, attackerHoldEffect: null, isChansey: false, isFarfetchd: false };
    rows.critChanceStage.push({ input, expected: damageCalc.getCriticalHitChanceStage(input) });
  }
}
const critHoldEffectDirected = [
  { attackerHoldEffect: "HOLD_EFFECT_SCOPE_LENS", isChansey: false, isFarfetchd: false },
  { attackerHoldEffect: "HOLD_EFFECT_LUCKY_PUNCH", isChansey: true, isFarfetchd: false },
  { attackerHoldEffect: "HOLD_EFFECT_LUCKY_PUNCH", isChansey: false, isFarfetchd: false },
  { attackerHoldEffect: "HOLD_EFFECT_STICK", isChansey: false, isFarfetchd: true },
  { attackerHoldEffect: "HOLD_EFFECT_STICK", isChansey: false, isFarfetchd: false },
  // Stacked to exercise the clamp to the max stage (index 4).
  { attackerHoldEffect: "HOLD_EFFECT_SCOPE_LENS", isChansey: false, isFarfetchd: false, focusEnergy: true, moveEffect: "EFFECT_HIGH_CRITICAL" },
  { attackerHoldEffect: "HOLD_EFFECT_LUCKY_PUNCH", isChansey: true, isFarfetchd: false, focusEnergy: true, moveEffect: "EFFECT_SKY_ATTACK" },
];
for (const spec of critHoldEffectDirected) {
  const input = { focusEnergy: false, moveEffect: undefined, ...spec };
  rows.critChanceStage.push({ input, expected: damageCalc.getCriticalHitChanceStage(input) });
}

for (let stage = 0; stage < 5; stage++) {
  const divisor = [16, 8, 4, 3, 2][stage];
  const rollsToTry = [0, divisor - 1, divisor, divisor * 2, 65535];
  for (const roll of new Set(rollsToTry.filter((r) => r >= 0 && r <= 65535))) {
    for (const targetImmune of [false, true]) {
      rows.critRoll.push({
        stage,
        roll,
        targetImmune,
        expected: damageCalc.rollIsCriticalHit(stage, roll, targetImmune),
      });
    }
  }
}

// === e. applyStab ============================================================

const stabDirected = [
  // mono-type attacker, matching
  [50, ["TYPE_FIRE", "TYPE_FIRE"], "TYPE_FIRE"],
  // mono-type attacker, not matching
  [50, ["TYPE_FIRE", "TYPE_FIRE"], "TYPE_WATER"],
  // dual-type attacker, matches slot 0 only
  [50, ["TYPE_ROCK", "TYPE_GROUND"], "TYPE_ROCK"],
  // dual-type attacker, matches slot 1 only
  [50, ["TYPE_ROCK", "TYPE_GROUND"], "TYPE_GROUND"],
  // dual-type attacker, matches neither
  [50, ["TYPE_ROCK", "TYPE_GROUND"], "TYPE_WATER"],
  // odd damage values that exercise truncation of *15/10
  [7, ["TYPE_FIRE", "TYPE_FIRE"], "TYPE_FIRE"],
  [1, ["TYPE_FIRE", "TYPE_FIRE"], "TYPE_FIRE"],
  [0, ["TYPE_FIRE", "TYPE_FIRE"], "TYPE_FIRE"],
  [999, ["TYPE_FIRE", "TYPE_FIRE"], "TYPE_FIRE"],
  [13, ["TYPE_ROCK", "TYPE_GROUND"], "TYPE_GROUND"],
];
for (const [damage, attackerTypes, moveType] of stabDirected) {
  rows.stab.push({
    damage,
    attackerTypes: attackerTypes.map((t) => TYPE_IDS[t]),
    moveType: TYPE_IDS[moveType],
    expected: damageCalc.applyStab(damage, attackerTypes, moveType),
  });
}

// === f. calculateEndeavorDamage / resolveEndeavorDamage =====================

const endeavorDirected = [
  [117, 101],
  [101, 117],
  [50, 50],
  [1, 0],
  [0, 0],
  [999, 1],
];
for (const [targetHp, userHp] of endeavorDirected) {
  rows.endeavor.push({ targetHp, userHp, expected: damageCalc.calculateEndeavorDamage(targetHp, userHp) });
}
const endeavorResolveDirected = [
  [117, 101, 10], // RAM-verified 117/101 -> 16 (docs/battle-turn-notes.md §12); nonzero multiplier does NOT scale the result
  [117, 101, 5], // still unscaled - the multiplier only gates immunity, never scales
  [117, 101, 0], // 0x multiplier = immune, no damage regardless of the raw diff
  [101, 117, 10], // user already ahead: diff clamps to 0 before the multiplier gate
  [50, 50, 20],
];
for (const [targetHp, userHp, typeMultiplierTenths] of endeavorResolveDirected) {
  rows.endeavorResolve.push({
    targetHp,
    userHp,
    typeMultiplierTenths,
    expected: damageCalc.resolveEndeavorDamage(targetHp, userHp, typeMultiplierTenths),
  });
}

// === g. applyRandomDamageMultiplier =========================================

const RANDOM_MULTIPLIER_DAMAGES = [0, 1, 2, 7, 48, 100, 999];
for (const damage of RANDOM_MULTIPLIER_DAMAGES) {
  for (let roll = 0; roll < 16; roll++) {
    rows.randomMultiplier.push({
      damage,
      roll,
      expected: damageCalc.applyRandomDamageMultiplier(damage, roll),
    });
  }
}

// === h. calculateAccuracy ===================================================

function accuracyInput(overrides = {}) {
  return {
    moveAccuracy: 100,
    attackerAccuracyStage: 6,
    targetEvasionStage: 6,
    targetHasForesight: false,
    attackerAbility: null,
    targetAbility: null,
    isSandstorm: false,
    moveType: undefined,
    targetHoldEffect: null,
    targetHoldEffectParam: 0,
    ...overrides,
  };
}
function pushAccuracyCase(input, label) {
  rows.accuracy.push({ input, expected: damageCalc.calculateAccuracy(input), label });
}

for (let attackerStage = 0; attackerStage <= 12; attackerStage++) {
  for (let targetStage = 0; targetStage <= 12; targetStage++) {
    pushAccuracyCase(
      accuracyInput({ attackerAccuracyStage: attackerStage, targetEvasionStage: targetStage }),
      `grid_${attackerStage}_${targetStage}`,
    );
  }
}
for (const attackerStage of [0, 3, 6, 9, 12]) {
  pushAccuracyCase(
    accuracyInput({ attackerAccuracyStage: attackerStage, targetEvasionStage: 12, targetHasForesight: true }),
    `foresight_ignores_evasion_${attackerStage}`,
  );
}
pushAccuracyCase(accuracyInput({ attackerAbility: "ABILITY_COMPOUND_EYES" }), "compound_eyes");
pushAccuracyCase(
  accuracyInput({ isSandstorm: true, targetAbility: "ABILITY_SAND_VEIL" }),
  "sand_veil_in_sandstorm",
);
pushAccuracyCase(
  accuracyInput({ isSandstorm: false, targetAbility: "ABILITY_SAND_VEIL" }),
  "sand_veil_no_sandstorm_no_effect",
);
pushAccuracyCase(
  accuracyInput({ attackerAbility: "ABILITY_HUSTLE", moveType: "TYPE_NORMAL" }),
  "hustle_physical",
);
pushAccuracyCase(
  accuracyInput({ attackerAbility: "ABILITY_HUSTLE", moveType: "TYPE_WATER" }),
  "hustle_special_no_effect",
);
pushAccuracyCase(accuracyInput({ attackerAbility: "ABILITY_HUSTLE", moveType: undefined }), "hustle_no_move_type");
for (const param of [0, 10, 20, 30, 50]) {
  pushAccuracyCase(
    accuracyInput({ targetHoldEffect: "HOLD_EFFECT_EVASION_UP", targetHoldEffectParam: param }),
    `bright_powder_param_${param}`,
  );
}
pushAccuracyCase(
  accuracyInput({
    attackerAbility: "ABILITY_COMPOUND_EYES",
    attackerAccuracyStage: 12,
    moveAccuracy: 100,
  }),
  "near_certain_hit_high_accuracy_stage",
);
pushAccuracyCase(accuracyInput({ moveAccuracy: 0 }), "zero_move_accuracy");
pushAccuracyCase(accuracyInput({ moveAccuracy: 255 }), "max_move_accuracy");

// === i. rollAccuracyHits =====================================================

const ACCURACY_ROLL_CALCS = [0, 1, 30, 50, 99, 100, 130];
const ACCURACY_ROLLS = [0, 1, 49, 50, 98, 99];
for (const calc of ACCURACY_ROLL_CALCS) {
  for (const roll of ACCURACY_ROLLS) {
    rows.accuracyRoll.push({ calc, roll, expected: damageCalc.rollAccuracyHits(calc, roll) });
  }
}

// === emit Rust source ========================================================

function b(v) {
  return v ? "true" : "false";
}
function opt(v) {
  return v === undefined || v === null ? "None" : `Some(${v})`;
}
function battlerLiteral(spec) {
  return (
    `BattlerRow { attack: ${spec.attack}, defense: ${spec.defense}, sp_attack: ${spec.spAttack}, ` +
    `sp_defense: ${spec.spDefense}, level: ${spec.level}, types: [${TYPE_IDS[spec.types[0]]}, ${TYPE_IDS[spec.types[1]]}], ` +
    `stages: [${spec.statStages.atk}, ${spec.statStages.def}, ${spec.statStages.spAtk}, ${spec.statStages.spDef}], ` +
    `is_burned: ${b(spec.isBurned)}, has_status1: ${b(spec.hasStatus1)}, hp: ${opt(spec.hp)}, max_hp: ${opt(spec.maxHP)}, ` +
    `ability: ${abilityId(spec.ability)}, species: ${spec.species ?? 0}, hold_effect: ${holdEffectId(spec.holdEffect)}, ` +
    `hold_effect_param: ${spec.holdEffectParam ?? 0} }`
  );
}
function calcCaseLiteral(row) {
  const { input, expected, label } = row;
  return (
    `    // ${label}\n    CalcBaseDamageCase {\n` +
    `        attacker: ${battlerLiteral(input.attacker)},\n` +
    `        defender: ${battlerLiteral(input.defender)},\n` +
    `        move_power: ${input.movePower}, move_type: ${TYPE_IDS[input.moveType]}, is_critical_hit: ${b(input.isCriticalHit)},\n` +
    `        side_status_reflect: ${b(input.sideStatusReflect)}, side_status_light_screen: ${b(input.sideStatusLightScreen)}, is_double_battle_spread_move: ${b(input.isDoubleBattleSpreadMove)},\n` +
    `        is_explosion_effect: ${b(input.moveEffect === "EFFECT_EXPLOSION")}, weather: ${input.weather >>> 0}, weather_has_effect: ${b(input.weatherHasEffect)},\n` +
    `        current_move: ${input.currentMove ?? 0}, is_frontier_battle: ${b(input.isFrontierBattle)}, flash_fire_boosted: ${b(input.flashFireBoosted)},\n` +
    `        expected: ${expected},\n    },`
  );
}

function critMoveEffectVariant(name) {
  return (
    {
      undefined: "Other",
      EFFECT_HIGH_CRITICAL: "HighCritical",
      EFFECT_SKY_ATTACK: "SkyAttack",
      EFFECT_BLAZE_KICK: "BlazeKick",
      EFFECT_POISON_TAIL: "PoisonTail",
    }[String(name)] ?? "Other"
  );
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-damage-vectors.mjs — regenerate: node core-rs/tools/gen-damage-vectors.mjs.");
lines.push("// Source: executing src/engine/damageCalc.ts (the TS engine is the spec) via");
lines.push("// node --experimental-strip-types, plus src/data/gen/type-effectiveness.json and");
lines.push("// src/data/gen/ability-item-hooks.json for id tables. Do not hand-edit.");
lines.push("");
lines.push("use crate::damage_calc::CritMoveEffect;");
lines.push("");

lines.push("/// One `apply_type_effectiveness` case: full 18x18 mono-type-defender grid");
lines.push("/// (`damage_in` fixed at 100) plus directed dual-type/immunity/minimum-guard");
lines.push("/// samples.");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct TypeEffectivenessCase {");
lines.push("    pub attacking_type: u8,");
lines.push("    pub defending_type_a: u8,");
lines.push("    pub defending_type_b: u8,");
lines.push("    pub damage_in: i32,");
lines.push("    pub expected_damage: i32,");
lines.push("    pub expected_multiplier_tenths: i32,");
lines.push("}");
lines.push(`pub static TYPE_EFFECTIVENESS_CASES: [TypeEffectivenessCase; ${rows.typeEffectiveness.length}] = [`);
for (const r of rows.typeEffectiveness) {
  lines.push(
    `    TypeEffectivenessCase { attacking_type: ${r.attackingType}, defending_type_a: ${r.defendingTypeA}, defending_type_b: ${r.defendingTypeB}, damage_in: ${r.damageIn}, expected_damage: ${r.expectedDamage}, expected_multiplier_tenths: ${r.expectedMultiplierTenths} },`,
  );
}
lines.push("];");
lines.push("");

lines.push("/// One `apply_stat_stage_mod` case: all 13 stages x several stat values,");
lines.push("/// including odd values that exercise truncation.");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct StatStageCase {");
lines.push("    pub stat: i32,");
lines.push("    pub stage: u8,");
lines.push("    pub expected: i32,");
lines.push("}");
lines.push(`pub static STAT_STAGE_CASES: [StatStageCase; ${rows.statStage.length}] = [`);
for (const r of rows.statStage) {
  lines.push(`    StatStageCase { stat: ${r.stat}, stage: ${r.stage}, expected: ${r.expected} },`);
}
lines.push("];");
lines.push("");

lines.push("/// One battler's `calculate_base_damage` input fields (mirrors `DamageBattler`");
lines.push("/// minus the `Option`-free numeric/sentinel encoding this generated data uses).");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattlerRow {");
lines.push("    pub attack: i32,");
lines.push("    pub defense: i32,");
lines.push("    pub sp_attack: i32,");
lines.push("    pub sp_defense: i32,");
lines.push("    pub level: i32,");
lines.push("    pub types: [u8; 2],");
lines.push("    /// `[atk, def, sp_atk, sp_def]` stat stages.");
lines.push("    pub stages: [u8; 4],");
lines.push("    pub is_burned: bool,");
lines.push("    pub has_status1: bool,");
lines.push("    pub hp: Option<i32>,");
lines.push("    pub max_hp: Option<i32>,");
lines.push("    pub ability: u16,");
lines.push("    pub species: u16,");
lines.push("    pub hold_effect: u16,");
lines.push("    pub hold_effect_param: i32,");
lines.push("}");
lines.push("");
lines.push("/// One `calculate_base_damage` case. `active_battler_abilities` is not");
lines.push("/// covered here (always the TS default `[attacker.ability, defender.ability]`);");
lines.push("/// the Plus/Minus field-scan override is pinned separately by two");
lines.push("/// hand-directed tests in `damage_calc.rs` itself.");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct CalcBaseDamageCase {");
lines.push("    pub attacker: BattlerRow,");
lines.push("    pub defender: BattlerRow,");
lines.push("    pub move_power: i32,");
lines.push("    pub move_type: u8,");
lines.push("    pub is_critical_hit: bool,");
lines.push("    pub side_status_reflect: bool,");
lines.push("    pub side_status_light_screen: bool,");
lines.push("    pub is_double_battle_spread_move: bool,");
lines.push("    pub is_explosion_effect: bool,");
lines.push("    pub weather: u32,");
lines.push("    pub weather_has_effect: bool,");
lines.push("    pub current_move: u32,");
lines.push("    pub is_frontier_battle: bool,");
lines.push("    pub flash_fire_boosted: bool,");
lines.push("    pub expected: i32,");
lines.push("}");
lines.push(`pub static CALC_BASE_DAMAGE_CASES: [CalcBaseDamageCase; ${rows.calcBaseDamage.length}] = [`);
for (const r of rows.calcBaseDamage) {
  lines.push(calcCaseLiteral(r));
}
lines.push("];");
lines.push("");

lines.push("/// One `get_critical_hit_chance_stage` case.");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct CritChanceStageCase {");
lines.push("    pub focus_energy: bool,");
lines.push("    pub move_effect: CritMoveEffect,");
lines.push("    pub attacker_hold_effect: u16,");
lines.push("    pub is_chansey: bool,");
lines.push("    pub is_farfetchd: bool,");
lines.push("    pub expected: usize,");
lines.push("}");
lines.push(`pub static CRIT_CHANCE_STAGE_CASES: [CritChanceStageCase; ${rows.critChanceStage.length}] = [`);
for (const r of rows.critChanceStage) {
  const i = r.input;
  lines.push(
    `    CritChanceStageCase { focus_energy: ${b(i.focusEnergy)}, move_effect: CritMoveEffect::${critMoveEffectVariant(i.moveEffect)}, attacker_hold_effect: ${holdEffectId(i.attackerHoldEffect)}, is_chansey: ${b(i.isChansey)}, is_farfetchd: ${b(i.isFarfetchd)}, expected: ${r.expected} },`,
  );
}
lines.push("];");
lines.push("");

lines.push("/// One `roll_is_critical_hit` case.");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct CritRollCase {");
lines.push("    pub stage: usize,");
lines.push("    pub roll: u16,");
lines.push("    pub target_immune: bool,");
lines.push("    pub expected: bool,");
lines.push("}");
lines.push(`pub static CRIT_ROLL_CASES: [CritRollCase; ${rows.critRoll.length}] = [`);
for (const r of rows.critRoll) {
  lines.push(
    `    CritRollCase { stage: ${r.stage}, roll: ${r.roll}, target_immune: ${b(r.targetImmune)}, expected: ${b(r.expected)} },`,
  );
}
lines.push("];");
lines.push("");

lines.push("/// One `apply_stab` case.");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct StabCase {");
lines.push("    pub damage: i32,");
lines.push("    pub attacker_types: [u8; 2],");
lines.push("    pub move_type: u8,");
lines.push("    pub expected: i32,");
lines.push("}");
lines.push(`pub static STAB_CASES: [StabCase; ${rows.stab.length}] = [`);
for (const r of rows.stab) {
  lines.push(
    `    StabCase { damage: ${r.damage}, attacker_types: [${r.attackerTypes[0]}, ${r.attackerTypes[1]}], move_type: ${r.moveType}, expected: ${r.expected} },`,
  );
}
lines.push("];");
lines.push("");

lines.push("/// One `calculate_endeavor_damage` case.");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct EndeavorCase {");
lines.push("    pub target_hp: i32,");
lines.push("    pub user_hp: i32,");
lines.push("    pub expected: i32,");
lines.push("}");
lines.push(`pub static ENDEAVOR_CASES: [EndeavorCase; ${rows.endeavor.length}] = [`);
for (const r of rows.endeavor) {
  lines.push(`    EndeavorCase { target_hp: ${r.targetHp}, user_hp: ${r.userHp}, expected: ${r.expected} },`);
}
lines.push("];");
lines.push("");

lines.push("/// One `resolve_endeavor_damage` case.");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct EndeavorResolveCase {");
lines.push("    pub target_hp: i32,");
lines.push("    pub user_hp: i32,");
lines.push("    pub type_multiplier_tenths: i32,");
lines.push("    pub expected: i32,");
lines.push("}");
lines.push(`pub static ENDEAVOR_RESOLVE_CASES: [EndeavorResolveCase; ${rows.endeavorResolve.length}] = [`);
for (const r of rows.endeavorResolve) {
  lines.push(
    `    EndeavorResolveCase { target_hp: ${r.targetHp}, user_hp: ${r.userHp}, type_multiplier_tenths: ${r.typeMultiplierTenths}, expected: ${r.expected} },`,
  );
}
lines.push("];");
lines.push("");

lines.push("/// One `apply_random_damage_multiplier` case: all 16 roll residues at");
lines.push("/// several damages.");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct RandomMultiplierCase {");
lines.push("    pub damage: i32,");
lines.push("    pub roll: u16,");
lines.push("    pub expected: i32,");
lines.push("}");
lines.push(`pub static RANDOM_MULTIPLIER_CASES: [RandomMultiplierCase; ${rows.randomMultiplier.length}] = [`);
for (const r of rows.randomMultiplier) {
  lines.push(`    RandomMultiplierCase { damage: ${r.damage}, roll: ${r.roll}, expected: ${r.expected} },`);
}
lines.push("];");
lines.push("");

lines.push("/// One `calculate_accuracy` case.");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct AccuracyCase {");
lines.push("    pub move_accuracy: i32,");
lines.push("    pub attacker_accuracy_stage: i32,");
lines.push("    pub target_evasion_stage: i32,");
lines.push("    pub target_has_foresight: bool,");
lines.push("    pub attacker_ability: u16,");
lines.push("    pub target_ability: u16,");
lines.push("    pub is_sandstorm: bool,");
lines.push("    pub move_type: Option<u8>,");
lines.push("    pub target_hold_effect: u16,");
lines.push("    pub target_hold_effect_param: i32,");
lines.push("    pub expected: i32,");
lines.push("}");
lines.push(`pub static ACCURACY_CASES: [AccuracyCase; ${rows.accuracy.length}] = [`);
for (const r of rows.accuracy) {
  const i = r.input;
  lines.push(
    `    // ${r.label}\n    AccuracyCase { move_accuracy: ${i.moveAccuracy}, attacker_accuracy_stage: ${i.attackerAccuracyStage}, target_evasion_stage: ${i.targetEvasionStage}, target_has_foresight: ${b(i.targetHasForesight)}, attacker_ability: ${abilityId(i.attackerAbility)}, target_ability: ${abilityId(i.targetAbility)}, is_sandstorm: ${b(i.isSandstorm)}, move_type: ${i.moveType === undefined ? "None" : `Some(${TYPE_IDS[i.moveType]})`}, target_hold_effect: ${holdEffectId(i.targetHoldEffect)}, target_hold_effect_param: ${i.targetHoldEffectParam}, expected: ${r.expected} },`,
  );
}
lines.push("];");
lines.push("");

lines.push("/// One `roll_accuracy_hits` case.");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct AccuracyRollCase {");
lines.push("    pub calc: i32,");
lines.push("    pub roll: u16,");
lines.push("    pub expected: bool,");
lines.push("}");
lines.push(`pub static ACCURACY_ROLL_CASES: [AccuracyRollCase; ${rows.accuracyRoll.length}] = [`);
for (const r of rows.accuracyRoll) {
  lines.push(`    AccuracyRollCase { calc: ${r.calc}, roll: ${r.roll}, expected: ${b(r.expected)} },`);
}
lines.push("];");
lines.push("");

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, lines.join("\n"), "utf8");

// Normalize formatting deterministically (same rustfmt-discovery recipe as
// gen-data.mjs) so reruns are byte-identical regardless of this script's own
// source layout.
const rustupBin = path.join(process.env.HOME ?? "", ".rustup", "toolchains", "stable-aarch64-apple-darwin", "bin");
const rustfmtCandidates = [path.join(rustupBin, "rustfmt"), "rustfmt"];
let formatted = false;
for (const rustfmt of rustfmtCandidates) {
  try {
    execFileSync(rustfmt, ["--edition", "2021", outPath], { stdio: "inherit" });
    formatted = true;
    break;
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
}
if (!formatted) {
  throw new Error("gen-damage-vectors: could not find rustfmt (looked in the rustup stable toolchain and PATH)");
}

const total =
  rows.typeEffectiveness.length +
  rows.statStage.length +
  rows.calcBaseDamage.length +
  rows.critChanceStage.length +
  rows.critRoll.length +
  rows.stab.length +
  rows.endeavor.length +
  rows.endeavorResolve.length +
  rows.randomMultiplier.length +
  rows.accuracy.length +
  rows.accuracyRoll.length;

console.log(`gen-damage-vectors: wrote ${path.relative(workspaceRoot, outPath)}`);
console.log(
  `gen-damage-vectors: ${rows.typeEffectiveness.length} type-effectiveness, ${rows.statStage.length} stat-stage, ` +
    `${rows.calcBaseDamage.length} calc-base-damage, ${rows.critChanceStage.length} crit-chance-stage, ` +
    `${rows.critRoll.length} crit-roll, ${rows.stab.length} stab, ${rows.endeavor.length} endeavor, ` +
    `${rows.endeavorResolve.length} endeavor-resolve, ${rows.randomMultiplier.length} random-multiplier, ` +
    `${rows.accuracy.length} accuracy, ${rows.accuracyRoll.length} accuracy-roll = ${total} total rows`,
);
