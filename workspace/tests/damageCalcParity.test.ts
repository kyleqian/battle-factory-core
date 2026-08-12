// Differential spec for core-rs/adapter/damageEngine.ts: proves the TS
// engine (src/engine/damageCalc.ts) and the factory-wasm engine
// (fw_calculate_base_damage et al.) agree on the full damage/accuracy/crit
// math surface for identical inputs — not just that either one
// individually looks right.
//
// Structure mirrors tests/factoryRentalParity.test.ts:
//   Part A — spec-conformance: the RAM-pinned regression cases from
//     tests/damageCalc.test.ts (read, not edited), run against whichever
//     engine POKEBENCH_ENGINE selects (defaultEngineId()) — so this same
//     block proves both "TS mode reproduces the pinned fixtures" (the
//     default invocation) and "wasm mode reproduces the pinned fixtures"
//     (the POKEBENCH_ENGINE=wasm invocation).
//   Part B — ABI pin: fw_abi_version() === 1 through the loader.
//   Part C — differential sweeps: TS is the expected value, wasm must
//     equal it exactly (skipped when the wasm artifact is absent and no
//     opt-in was requested).
//
// Availability rules mirror tests/rngEngineParity.test.ts: POKEBENCH_ENGINE=wasm
// with the artifact missing is a hard failure; the artifact merely being
// absent (no opt-in) skips only the wasm-dependent Part C suites.
//
// Invocations (from the workspace root):
//   ./core-rs/build-wasm.sh
//   NODE_OPTIONS=--max-old-space-size=8192 npx vitest run tests/damageCalcParity.test.ts --no-watch --pool=forks
//   POKEBENCH_ENGINE=wasm NODE_OPTIONS=--max-old-space-size=8192 npx vitest run tests/damageCalcParity.test.ts --no-watch --pool=forks

import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  defaultEngineId,
  resolveWasmArtifactPath,
} from "../core-rs/adapter/rngEngine.ts";
import { loadFactoryWasm } from "../core-rs/adapter/loadFactoryWasm.ts";
import { tsDamageEngine, wasmDamageEngine, type DamageEngine } from "../core-rs/adapter/damageEngine.ts";
import {
  NEUTRAL_STAT_STAGES,
  type AccuracyCalcInput,
  type CritChanceInput,
  type DamageBattler,
  type DamageCalcInput,
  type TypeEffectivenessEntry,
} from "../src/engine/damageCalc.ts";
import { GbaRng } from "../src/engine/rng.ts";
import typeEffectivenessData from "../src/data/gen/type-effectiveness.json" with { type: "json" };
import speciesTypesData from "../src/data/gen/species-types.json" with { type: "json" };

const TYPE_TABLE = typeEffectivenessData.typeEffectiveness as TypeEffectivenessEntry[];

type SpeciesTypes = { name: string; types: [string, string] };
const speciesTypes = new Map<string, [string, string]>(
  (speciesTypesData.species as SpeciesTypes[]).map((s) => [s.name, s.types]),
);
function typesOf(species: string): [string, string] {
  const types = speciesTypes.get(species);
  if (!types) throw new Error(`no species-types.json entry for ${species}`);
  return types;
}

const requestedEngine = defaultEngineId();
const wasmArtifactPath = resolveWasmArtifactPath();
const wasmAvailable = existsSync(wasmArtifactPath);

if (requestedEngine === "wasm" && !wasmAvailable) {
  throw new Error(
    `POKEBENCH_ENGINE=wasm requires the factory-wasm artifact at ${wasmArtifactPath}, ` +
      `which does not exist. Build it with: core-rs/build-wasm.sh`,
  );
}

let currentEnginePromise: Promise<DamageEngine> | undefined;
function getCurrentEngine(): Promise<DamageEngine> {
  currentEnginePromise ??= requestedEngine === "wasm"
    ? wasmDamageEngine()
    : Promise.resolve(tsDamageEngine());
  return currentEnginePromise;
}

let wasmEnginePromise: Promise<DamageEngine> | undefined;
function getWasmEngine(): Promise<DamageEngine> {
  wasmEnginePromise ??= wasmDamageEngine();
  return wasmEnginePromise;
}

const ts: DamageEngine = tsDamageEngine();

// === Part A: spec-conformance — RAM-pinned regression cases, mirroring ====
// tests/damageCalc.test.ts's "calculateBaseDamage - RAM-pinned regression
// cases" describe block exactly (same battler blocks, same expected
// values), run against whichever engine defaultEngineId() selects.

const ONIX = {
  attack: 51,
  defense: 187,
  spAttack: 36,
  spDefense: 72,
  level: 50,
  types: typesOf("SPECIES_ONIX"),
  statStages: { ...NEUTRAL_STAT_STAGES },
};
const GROVYLE = {
  attack: 103,
  defense: 56,
  spAttack: 91,
  spDefense: 71,
  level: 50,
  types: typesOf("SPECIES_GROVYLE"),
  statStages: { ...NEUTRAL_STAT_STAGES },
};
const HAUNTER = {
  attack: 88,
  defense: 51,
  spAttack: 126,
  spDefense: 76,
  level: 50,
  types: typesOf("SPECIES_HAUNTER"),
  statStages: { ...NEUTRAL_STAT_STAGES },
};

describe("calculateBaseDamage - RAM-pinned regression cases, parameterized over the selected engine", () => {
  it(`[engine=${requestedEngine}] Rock Slide base (pre-STAB) locks to 32, STAB takes it to 48, spread roll gives 42`, async () => {
    const engine = await getCurrentEngine();
    const base = engine.calculateBaseDamage({
      attacker: ONIX,
      defender: GROVYLE,
      movePower: 75,
      moveType: "TYPE_ROCK",
      isCriticalHit: false,
    });
    expect(base).toBe(32);

    const stabbed = engine.applyStab(32, ONIX.types, "TYPE_ROCK");
    expect(stabbed).toBe(48);

    const { damage, multiplierTenths } = engine.applyTypeEffectiveness(48, "TYPE_ROCK", GROVYLE.types, TYPE_TABLE);
    expect(multiplierTenths).toBe(10);
    expect(damage).toBe(48);

    // gRngValue transition 2176095973 -> 435971572 (tick 2337 of the
    // committed dump, the damage-spread RNG step).
    const rng = new GbaRng(2176095973);
    const roll = rng.next();
    expect(rng.rngValue).toBe(435971572);
    expect(engine.applyRandomDamageMultiplier(48, roll)).toBe(42);
  });

  it(`[engine=${requestedEngine}] Fury Cutter (corrected) base locks to 4`, async () => {
    const engine = await getCurrentEngine();
    const base = engine.calculateBaseDamage({
      attacker: GROVYLE,
      defender: ONIX,
      movePower: 10,
      moveType: "TYPE_BUG",
      isCriticalHit: false,
    });
    expect(base).toBe(4);

    for (let rand16 = 1; rand16 < 16; rand16++) {
      expect(engine.applyRandomDamageMultiplier(4, rand16)).toBe(3);
    }
    expect(engine.applyRandomDamageMultiplier(4, 0)).toBe(4);
  });

  it(`[engine=${requestedEngine}] Fury Cutter into HAUNTER reproduces the source 10 -> 5 -> 2 -> 1 chain`, async () => {
    const engine = await getCurrentEngine();
    const base = engine.calculateBaseDamage({
      attacker: GROVYLE,
      defender: HAUNTER,
      movePower: 10,
      moveType: "TYPE_BUG",
      isCriticalHit: false,
    });
    expect(base).toBe(10);

    expect(engine.applyTypeEffectiveness(base, "TYPE_BUG", HAUNTER.types, TYPE_TABLE)).toEqual({
      damage: 2,
      multiplierTenths: 2,
    });
    expect(engine.applyRandomDamageMultiplier(2, 50_015)).toBe(1);

    expect(
      engine.applyTypeEffectiveness(base, "TYPE_BUG", ["TYPE_WATER", "TYPE_WATER"], TYPE_TABLE),
    ).toEqual({ damage: 10, multiplierTenths: 10 });
    expect(engine.applyRandomDamageMultiplier(10, 50_015)).toBe(8);
  });
});

// === Part B: ABI pin =========================================================

describe.skipIf(!wasmAvailable)("factory-wasm ABI pin", () => {
  it("fw_abi_version() === 1 through the loader", async () => {
    const exports = await loadFactoryWasm();
    expect(exports.fw_abi_version()).toBe(1);
  });
});

// === Part C: differential sweeps — TS is the expected value, wasm must ====
// equal it exactly on every case.

const REAL_TYPE_NAMES = [
  "TYPE_NORMAL", "TYPE_FIGHTING", "TYPE_FLYING", "TYPE_POISON", "TYPE_GROUND",
  "TYPE_ROCK", "TYPE_BUG", "TYPE_GHOST", "TYPE_STEEL", "TYPE_MYSTERY",
  "TYPE_FIRE", "TYPE_WATER", "TYPE_GRASS", "TYPE_ELECTRIC", "TYPE_PSYCHIC",
  "TYPE_ICE", "TYPE_DRAGON", "TYPE_DARK",
] as const;

describe.skipIf(!wasmAvailable)("damage_calc differential sweeps — ts vs wasm", () => {
  it("applyTypeEffectiveness: full 18x18 mono-type grid + directed dual-type/immunity samples", async () => {
    const wasm = await getWasmEngine();
    let cursor = 0;
    for (const atk of REAL_TYPE_NAMES) {
      for (const def of REAL_TYPE_NAMES) {
        const expected = ts.applyTypeEffectiveness(100, atk, [def, def], TYPE_TABLE);
        const actual = wasm.applyTypeEffectiveness(100, atk, [def, def], TYPE_TABLE);
        expect(actual, `[${cursor}] ${atk} -> ${def}/${def}`).toEqual(expected);
        cursor++;
      }
    }

    const dualTypeDirected: ReadonlyArray<[string, string, string, number]> = [
      ["TYPE_ELECTRIC", "TYPE_GROUND", "TYPE_FLYING", 100],
      ["TYPE_POISON", "TYPE_STEEL", "TYPE_GRASS", 100],
      ["TYPE_FIRE", "TYPE_GRASS", "TYPE_BUG", 20],
      ["TYPE_ICE", "TYPE_GRASS", "TYPE_GROUND", 25],
      ["TYPE_NORMAL", "TYPE_ROCK", "TYPE_ROCK", 1],
      ["TYPE_NORMAL", "TYPE_ROCK", "TYPE_ROCK", 0],
      ["TYPE_ICE", "TYPE_FIRE", "TYPE_ICE", 3],
      ["TYPE_WATER", "TYPE_FIRE", "TYPE_FIRE", 10],
    ];
    for (const [atk, defA, defB, damageIn] of dualTypeDirected) {
      const expected = ts.applyTypeEffectiveness(damageIn, atk, [defA, defB], TYPE_TABLE);
      const actual = wasm.applyTypeEffectiveness(damageIn, atk, [defA, defB], TYPE_TABLE);
      expect(actual, `[${cursor}] ${atk} -> ${defA}/${defB} @ ${damageIn}`).toEqual(expected);
      cursor++;
    }
  });

  it("applyStatStageMod: stages 0..12 x several stat values incl. odd ones", async () => {
    const wasm = await getWasmEngine();
    const STAT_VALUES = [0, 1, 7, 55, 100, 251, 500, 999];
    let cursor = 0;
    for (let stage = 0; stage <= 12; stage++) {
      for (const stat of STAT_VALUES) {
        const expected = ts.applyStatStageMod(stat, stage);
        const actual = wasm.applyStatStageMod(stat, stage);
        expect(actual, `[${cursor}] stat=${stat} stage=${stage}`).toBe(expected);
        cursor++;
      }
    }
  });

  // --- calculateBaseDamage: directed branch cases + a seeded structural sweep ---

  const NEUTRAL_STAGES = { atk: 6, def: 6, spAtk: 6, spDef: 6 };
  function battler(overrides: Partial<DamageBattler> = {}): DamageBattler {
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
  function baseInput(overrides: Partial<DamageCalcInput> = {}): DamageCalcInput {
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

  const SPECIES = {
    PIKACHU: 25, CUBONE: 104, MAROWAK: 105, DITTO: 132, CLAMPERL: 373,
    LATIAS: 407, LATIOS: 408, BULBASAUR: 1,
  };

  function directedCalcBaseDamageCases(): Array<{ label: string; input: DamageCalcInput }> {
    const cases: Array<{ label: string; input: DamageCalcInput }> = [];
    const push = (label: string, input: DamageCalcInput) => cases.push({ label, input });

    push("huge_power", baseInput({ attacker: battler({ ability: "ABILITY_HUGE_POWER" }) }));
    push("pure_power", baseInput({ attacker: battler({ ability: "ABILITY_PURE_POWER" }) }));
    push("thick_fat_fire", baseInput({ moveType: "TYPE_FIRE", defender: battler({ ability: "ABILITY_THICK_FAT" }) }));
    push("thick_fat_ice", baseInput({ moveType: "TYPE_ICE", defender: battler({ ability: "ABILITY_THICK_FAT" }) }));
    push("hustle", baseInput({ attacker: battler({ ability: "ABILITY_HUSTLE" }) }));
    push("plus_minus_default_pairing", baseInput({
      moveType: "TYPE_WATER",
      attacker: battler({ ability: "ABILITY_PLUS", types: ["TYPE_WATER", "TYPE_WATER"] }),
      defender: battler({ ability: "ABILITY_MINUS", types: ["TYPE_WATER", "TYPE_WATER"] }),
    }));
    push("guts_with_status", baseInput({ attacker: battler({ ability: "ABILITY_GUTS", hasStatus1: true }) }));
    push("guts_without_status", baseInput({ attacker: battler({ ability: "ABILITY_GUTS", hasStatus1: false }) }));
    push("marvel_scale_with_status", baseInput({
      defender: battler({ ability: "ABILITY_MARVEL_SCALE", hasStatus1: true }),
    }));

    const PINCH: ReadonlyArray<[string, string]> = [
      ["TYPE_GRASS", "ABILITY_OVERGROW"], ["TYPE_FIRE", "ABILITY_BLAZE"],
      ["TYPE_WATER", "ABILITY_TORRENT"], ["TYPE_BUG", "ABILITY_SWARM"],
    ];
    for (const [moveType, ability] of PINCH) {
      push(`pinch_${ability}_in_range`, baseInput({
        moveType, attacker: battler({ ability, hp: 10, maxHP: 30 }),
      }));
      push(`pinch_${ability}_out_of_range`, baseInput({
        moveType, attacker: battler({ ability, hp: 11, maxHP: 30 }),
      }));
    }

    const TYPE_POWER_ITEMS: ReadonlyArray<[string, string]> = [
      ["HOLD_EFFECT_BUG_POWER", "TYPE_BUG"], ["HOLD_EFFECT_STEEL_POWER", "TYPE_STEEL"],
      ["HOLD_EFFECT_GROUND_POWER", "TYPE_GROUND"], ["HOLD_EFFECT_ROCK_POWER", "TYPE_ROCK"],
      ["HOLD_EFFECT_GRASS_POWER", "TYPE_GRASS"], ["HOLD_EFFECT_DARK_POWER", "TYPE_DARK"],
      ["HOLD_EFFECT_FIGHTING_POWER", "TYPE_FIGHTING"], ["HOLD_EFFECT_ELECTRIC_POWER", "TYPE_ELECTRIC"],
      ["HOLD_EFFECT_WATER_POWER", "TYPE_WATER"], ["HOLD_EFFECT_FLYING_POWER", "TYPE_FLYING"],
      ["HOLD_EFFECT_POISON_POWER", "TYPE_POISON"], ["HOLD_EFFECT_ICE_POWER", "TYPE_ICE"],
      ["HOLD_EFFECT_GHOST_POWER", "TYPE_GHOST"], ["HOLD_EFFECT_PSYCHIC_POWER", "TYPE_PSYCHIC"],
      ["HOLD_EFFECT_FIRE_POWER", "TYPE_FIRE"], ["HOLD_EFFECT_DRAGON_POWER", "TYPE_DRAGON"],
      ["HOLD_EFFECT_NORMAL_POWER", "TYPE_NORMAL"],
    ];
    for (const [holdEffect, moveType] of TYPE_POWER_ITEMS) {
      push(`type_power_${holdEffect}`, baseInput({
        moveType, attacker: battler({ holdEffect, holdEffectParam: 10 }),
      }));
    }
    push("choice_band", baseInput({ attacker: battler({ holdEffect: "HOLD_EFFECT_CHOICE_BAND" }) }));
    push("soul_dew_latias_non_frontier", baseInput({
      moveType: "TYPE_WATER",
      attacker: battler({ holdEffect: "HOLD_EFFECT_SOUL_DEW", species: SPECIES.LATIAS }),
      isFrontierBattle: false,
    }));
    push("soul_dew_latios_frontier_gate_off", baseInput({
      moveType: "TYPE_WATER",
      attacker: battler({ holdEffect: "HOLD_EFFECT_SOUL_DEW", species: SPECIES.LATIOS }),
      isFrontierBattle: true,
    }));
    push("soul_dew_wrong_species", baseInput({
      moveType: "TYPE_WATER",
      attacker: battler({ holdEffect: "HOLD_EFFECT_SOUL_DEW", species: SPECIES.BULBASAUR }),
    }));
    push("soul_dew_defender_latios_non_frontier", baseInput({
      moveType: "TYPE_WATER",
      defender: battler({ holdEffect: "HOLD_EFFECT_SOUL_DEW", species: SPECIES.LATIOS }),
    }));
    push("deep_sea_tooth_clamperl", baseInput({
      moveType: "TYPE_WATER",
      attacker: battler({ holdEffect: "HOLD_EFFECT_DEEP_SEA_TOOTH", species: SPECIES.CLAMPERL }),
    }));
    push("deep_sea_tooth_wrong_species", baseInput({
      moveType: "TYPE_WATER",
      attacker: battler({ holdEffect: "HOLD_EFFECT_DEEP_SEA_TOOTH", species: SPECIES.BULBASAUR }),
    }));
    push("deep_sea_scale_clamperl", baseInput({
      moveType: "TYPE_WATER",
      defender: battler({ holdEffect: "HOLD_EFFECT_DEEP_SEA_SCALE", species: SPECIES.CLAMPERL }),
    }));
    push("deep_sea_scale_wrong_species", baseInput({
      moveType: "TYPE_WATER",
      defender: battler({ holdEffect: "HOLD_EFFECT_DEEP_SEA_SCALE", species: SPECIES.BULBASAUR }),
    }));
    push("light_ball_pikachu", baseInput({
      moveType: "TYPE_WATER",
      attacker: battler({ holdEffect: "HOLD_EFFECT_LIGHT_BALL", species: SPECIES.PIKACHU }),
    }));
    push("light_ball_wrong_species", baseInput({
      moveType: "TYPE_WATER",
      attacker: battler({ holdEffect: "HOLD_EFFECT_LIGHT_BALL", species: SPECIES.BULBASAUR }),
    }));
    push("metal_powder_ditto", baseInput({
      defender: battler({ holdEffect: "HOLD_EFFECT_METAL_POWDER", species: SPECIES.DITTO }),
    }));
    push("metal_powder_wrong_species", baseInput({
      defender: battler({ holdEffect: "HOLD_EFFECT_METAL_POWDER", species: SPECIES.BULBASAUR }),
    }));
    push("thick_club_cubone", baseInput({
      attacker: battler({ holdEffect: "HOLD_EFFECT_THICK_CLUB", species: SPECIES.CUBONE }),
    }));
    push("thick_club_marowak", baseInput({
      attacker: battler({ holdEffect: "HOLD_EFFECT_THICK_CLUB", species: SPECIES.MAROWAK }),
    }));
    push("thick_club_wrong_species", baseInput({
      attacker: battler({ holdEffect: "HOLD_EFFECT_THICK_CLUB", species: SPECIES.BULBASAUR }),
    }));

    const RAIN = (1 << 0) | (1 << 1) | (1 << 2);
    const SANDSTORM = (1 << 3) | (1 << 4);
    const SUN = (1 << 5) | (1 << 6);
    const HAIL = 1 << 7;
    const weatherDirected: ReadonlyArray<[string, number, string, number, boolean]> = [
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
      push(`weather_${label}`, baseInput({ moveType, weather, currentMove, weatherHasEffect }));
    }
    push("flash_fire_boosted", baseInput({ moveType: "TYPE_FIRE", flashFireBoosted: true }));

    push("burn_no_guts", baseInput({ attacker: battler({ isBurned: true }) }));
    push("burn_with_guts", baseInput({ attacker: battler({ isBurned: true, ability: "ABILITY_GUTS" }) }));

    push("reflect_no_crit", baseInput({ sideStatusReflect: true, isCriticalHit: false }));
    push("reflect_crit_bypasses", baseInput({ sideStatusReflect: true, isCriticalHit: true }));
    push("reflect_double_spread", baseInput({ sideStatusReflect: true, isDoubleBattleSpreadMove: true }));
    push("light_screen_no_crit", baseInput({ moveType: "TYPE_WATER", sideStatusLightScreen: true, isCriticalHit: false }));
    push("light_screen_crit_bypasses", baseInput({ moveType: "TYPE_WATER", sideStatusLightScreen: true, isCriticalHit: true }));
    push("light_screen_double_spread", baseInput({ moveType: "TYPE_WATER", sideStatusLightScreen: true, isDoubleBattleSpreadMove: true }));

    push("double_spread_physical", baseInput({ isDoubleBattleSpreadMove: true }));
    push("double_spread_special", baseInput({ moveType: "TYPE_WATER", isDoubleBattleSpreadMove: true }));

    push("explosion_defense_halved", baseInput({ moveEffect: "EFFECT_EXPLOSION" }));
    push("explosion_stacks_with_marvel_scale", baseInput({
      moveEffect: "EFFECT_EXPLOSION",
      defender: battler({ ability: "ABILITY_MARVEL_SCALE", hasStatus1: true }),
    }));

    for (const crit of [false, true]) {
      push(`crit_${crit}_attacker_atk_raised`, baseInput({
        isCriticalHit: crit, attacker: battler({ statStages: { ...NEUTRAL_STAGES, atk: 10 } }),
      }));
      push(`crit_${crit}_attacker_atk_lowered`, baseInput({
        isCriticalHit: crit, attacker: battler({ statStages: { ...NEUTRAL_STAGES, atk: 2 } }),
      }));
      push(`crit_${crit}_defender_def_raised`, baseInput({
        isCriticalHit: crit, defender: battler({ statStages: { ...NEUTRAL_STAGES, def: 10 } }),
      }));
      push(`crit_${crit}_defender_def_lowered`, baseInput({
        isCriticalHit: crit, defender: battler({ statStages: { ...NEUTRAL_STAGES, def: 2 } }),
      }));
    }

    return cases;
  }

  function seededCalcBaseDamageCases(): Array<{ label: string; input: DamageCalcInput }> {
    const cases: Array<{ label: string; input: DamageCalcInput }> = [];
    const rng = new GbaRng(0x4442_5f31);
    const pick = (n: number) => rng.next() % n;
    const SWEEP_TYPES = REAL_TYPE_NAMES.filter((t) => t !== "TYPE_MYSTERY");
    const RAIN = (1 << 0) | (1 << 1) | (1 << 2);
    const SANDSTORM = (1 << 3) | (1 << 4);
    const SUN = (1 << 5) | (1 << 6);
    const HAIL = 1 << 7;
    const SWEEP_COUNT = 180;
    for (let i = 0; i < SWEEP_COUNT; i++) {
      const moveType = SWEEP_TYPES[pick(SWEEP_TYPES.length)]!;
      const attacker = battler({
        attack: 1 + pick(999),
        spAttack: 1 + pick(999),
        level: 1 + pick(100),
        types: [SWEEP_TYPES[pick(SWEEP_TYPES.length)]!, SWEEP_TYPES[pick(SWEEP_TYPES.length)]!],
        statStages: { atk: pick(13), def: pick(13), spAtk: pick(13), spDef: pick(13) },
        isBurned: pick(2) === 0,
      });
      const defender = battler({
        defense: 1 + pick(999),
        spDefense: 1 + pick(999),
        level: 1 + pick(100),
        types: [SWEEP_TYPES[pick(SWEEP_TYPES.length)]!, SWEEP_TYPES[pick(SWEEP_TYPES.length)]!],
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
      cases.push({ label: `sweep_${i}`, input });
    }
    return cases;
  }

  it("calculateBaseDamage: directed branch cases (each ability/hold-effect/weather/screen/crit branch)", async () => {
    const wasm = await getWasmEngine();
    const cases = directedCalcBaseDamageCases();
    cases.forEach(({ label, input }, cursor) => {
      const expected = ts.calculateBaseDamage(input);
      const actual = wasm.calculateBaseDamage(input);
      expect(actual, `[${cursor}/${cases.length}] ${label}`).toBe(expected);
    });
  });

  it("calculateBaseDamage: deterministic seeded sweep over the whole input struct", async () => {
    const wasm = await getWasmEngine();
    const cases = seededCalcBaseDamageCases();
    cases.forEach(({ label, input }, cursor) => {
      const expected = ts.calculateBaseDamage(input);
      const actual = wasm.calculateBaseDamage(input);
      expect(actual, `[${cursor}/${cases.length}] ${label}`).toBe(expected);
    });
  });

  // --- crit chance stage / roll ---

  it("getCriticalHitChanceStage + rollIsCriticalHit: directed inputs and stage/roll/immune matrix", async () => {
    const wasm = await getWasmEngine();
    let cursor = 0;
    const CRIT_MOVE_EFFECTS = [undefined, "EFFECT_HIGH_CRITICAL", "EFFECT_SKY_ATTACK", "EFFECT_BLAZE_KICK", "EFFECT_POISON_TAIL"];
    for (const focusEnergy of [false, true]) {
      for (const moveEffect of CRIT_MOVE_EFFECTS) {
        const input: CritChanceInput = { focusEnergy, moveEffect, attackerHoldEffect: null, isChansey: false, isFarfetchd: false };
        const expected = ts.getCriticalHitChanceStage(input);
        const actual = wasm.getCriticalHitChanceStage(input);
        expect(actual, `[${cursor}] focusEnergy=${focusEnergy} moveEffect=${moveEffect}`).toBe(expected);
        cursor++;
      }
    }
    const critHoldEffectDirected: CritChanceInput[] = [
      { focusEnergy: false, moveEffect: undefined, attackerHoldEffect: "HOLD_EFFECT_SCOPE_LENS", isChansey: false, isFarfetchd: false },
      { focusEnergy: false, moveEffect: undefined, attackerHoldEffect: "HOLD_EFFECT_LUCKY_PUNCH", isChansey: true, isFarfetchd: false },
      { focusEnergy: false, moveEffect: undefined, attackerHoldEffect: "HOLD_EFFECT_LUCKY_PUNCH", isChansey: false, isFarfetchd: false },
      { focusEnergy: false, moveEffect: undefined, attackerHoldEffect: "HOLD_EFFECT_STICK", isChansey: false, isFarfetchd: true },
      { focusEnergy: false, moveEffect: undefined, attackerHoldEffect: "HOLD_EFFECT_STICK", isChansey: false, isFarfetchd: false },
      { focusEnergy: true, moveEffect: "EFFECT_HIGH_CRITICAL", attackerHoldEffect: "HOLD_EFFECT_SCOPE_LENS", isChansey: false, isFarfetchd: false },
      { focusEnergy: true, moveEffect: "EFFECT_SKY_ATTACK", attackerHoldEffect: "HOLD_EFFECT_LUCKY_PUNCH", isChansey: true, isFarfetchd: false },
    ];
    for (const input of critHoldEffectDirected) {
      const expected = ts.getCriticalHitChanceStage(input);
      const actual = wasm.getCriticalHitChanceStage(input);
      expect(actual, `[${cursor}] ${JSON.stringify(input)}`).toBe(expected);
      cursor++;
    }

    for (let stage = 0; stage < 5; stage++) {
      const divisor = [16, 8, 4, 3, 2][stage]!;
      const rollsToTry = new Set([0, divisor - 1, divisor, divisor * 2, 65535].filter((r) => r >= 0 && r <= 65535));
      for (const roll of rollsToTry) {
        for (const targetImmune of [false, true]) {
          const expected = ts.rollIsCriticalHit(stage, roll, targetImmune);
          const actual = wasm.rollIsCriticalHit(stage, roll, targetImmune);
          expect(actual, `[${cursor}] stage=${stage} roll=${roll} targetImmune=${targetImmune}`).toBe(expected);
          cursor++;
        }
      }
    }
  });

  it("applyStab: mono/dual-type attacker matrix + truncation-exercising damages", async () => {
    const wasm = await getWasmEngine();
    const stabDirected: ReadonlyArray<[number, [string, string], string]> = [
      [50, ["TYPE_FIRE", "TYPE_FIRE"], "TYPE_FIRE"],
      [50, ["TYPE_FIRE", "TYPE_FIRE"], "TYPE_WATER"],
      [50, ["TYPE_ROCK", "TYPE_GROUND"], "TYPE_ROCK"],
      [50, ["TYPE_ROCK", "TYPE_GROUND"], "TYPE_GROUND"],
      [50, ["TYPE_ROCK", "TYPE_GROUND"], "TYPE_WATER"],
      [7, ["TYPE_FIRE", "TYPE_FIRE"], "TYPE_FIRE"],
      [1, ["TYPE_FIRE", "TYPE_FIRE"], "TYPE_FIRE"],
      [0, ["TYPE_FIRE", "TYPE_FIRE"], "TYPE_FIRE"],
      [999, ["TYPE_FIRE", "TYPE_FIRE"], "TYPE_FIRE"],
      [13, ["TYPE_ROCK", "TYPE_GROUND"], "TYPE_GROUND"],
    ];
    stabDirected.forEach(([damage, attackerTypes, moveType], cursor) => {
      const expected = ts.applyStab(damage, attackerTypes, moveType);
      const actual = wasm.applyStab(damage, attackerTypes, moveType);
      expect(actual, `[${cursor}] damage=${damage} types=${attackerTypes} moveType=${moveType}`).toBe(expected);
    });
  });

  it("calculateEndeavorDamage / resolveEndeavorDamage: directed HP-diff and multiplier-gate cases", async () => {
    const wasm = await getWasmEngine();
    const endeavorDirected: ReadonlyArray<[number, number]> = [[117, 101], [101, 117], [50, 50], [1, 0], [0, 0], [999, 1]];
    endeavorDirected.forEach(([targetHp, userHp], cursor) => {
      const expected = ts.calculateEndeavorDamage(targetHp, userHp);
      const actual = wasm.calculateEndeavorDamage(targetHp, userHp);
      expect(actual, `[endeavor ${cursor}] targetHp=${targetHp} userHp=${userHp}`).toBe(expected);
    });
    const endeavorResolveDirected: ReadonlyArray<[number, number, number]> = [
      [117, 101, 10], [117, 101, 5], [117, 101, 0], [101, 117, 10], [50, 50, 20],
    ];
    endeavorResolveDirected.forEach(([targetHp, userHp, typeMultiplierTenths], cursor) => {
      const expected = ts.resolveEndeavorDamage(targetHp, userHp, typeMultiplierTenths);
      const actual = wasm.resolveEndeavorDamage(targetHp, userHp, typeMultiplierTenths);
      expect(actual, `[resolve ${cursor}] targetHp=${targetHp} userHp=${userHp} mult=${typeMultiplierTenths}`).toBe(expected);
    });
  });

  it("applyRandomDamageMultiplier: all 16 roll residues at several damages", async () => {
    const wasm = await getWasmEngine();
    const DAMAGES = [0, 1, 2, 7, 48, 100, 999];
    let cursor = 0;
    for (const damage of DAMAGES) {
      for (let roll = 0; roll < 16; roll++) {
        const expected = ts.applyRandomDamageMultiplier(damage, roll);
        const actual = wasm.applyRandomDamageMultiplier(damage, roll);
        expect(actual, `[${cursor}] damage=${damage} roll=${roll}`).toBe(expected);
        cursor++;
      }
    }
  });

  it("calculateAccuracy: stages 0..12 both sides + item/ability directed inputs", async () => {
    const wasm = await getWasmEngine();
    function accuracyInput(overrides: Partial<AccuracyCalcInput> = {}): AccuracyCalcInput {
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
    let cursor = 0;
    for (let attackerStage = 0; attackerStage <= 12; attackerStage++) {
      for (let targetStage = 0; targetStage <= 12; targetStage++) {
        const input = accuracyInput({ attackerAccuracyStage: attackerStage, targetEvasionStage: targetStage });
        const expected = ts.calculateAccuracy(input);
        const actual = wasm.calculateAccuracy(input);
        expect(actual, `[${cursor}] grid attacker=${attackerStage} target=${targetStage}`).toBe(expected);
        cursor++;
      }
    }
    const directed: Array<{ label: string; input: AccuracyCalcInput }> = [];
    for (const attackerStage of [0, 3, 6, 9, 12]) {
      directed.push({
        label: `foresight_ignores_evasion_${attackerStage}`,
        input: accuracyInput({ attackerAccuracyStage: attackerStage, targetEvasionStage: 12, targetHasForesight: true }),
      });
    }
    directed.push({ label: "compound_eyes", input: accuracyInput({ attackerAbility: "ABILITY_COMPOUND_EYES" }) });
    directed.push({ label: "sand_veil_in_sandstorm", input: accuracyInput({ isSandstorm: true, targetAbility: "ABILITY_SAND_VEIL" }) });
    directed.push({ label: "sand_veil_no_sandstorm_no_effect", input: accuracyInput({ isSandstorm: false, targetAbility: "ABILITY_SAND_VEIL" }) });
    directed.push({ label: "hustle_physical", input: accuracyInput({ attackerAbility: "ABILITY_HUSTLE", moveType: "TYPE_NORMAL" }) });
    directed.push({ label: "hustle_special_no_effect", input: accuracyInput({ attackerAbility: "ABILITY_HUSTLE", moveType: "TYPE_WATER" }) });
    directed.push({ label: "hustle_no_move_type", input: accuracyInput({ attackerAbility: "ABILITY_HUSTLE", moveType: undefined }) });
    for (const param of [0, 10, 20, 30, 50]) {
      directed.push({
        label: `bright_powder_param_${param}`,
        input: accuracyInput({ targetHoldEffect: "HOLD_EFFECT_EVASION_UP", targetHoldEffectParam: param }),
      });
    }
    directed.push({
      label: "near_certain_hit_high_accuracy_stage",
      input: accuracyInput({ attackerAbility: "ABILITY_COMPOUND_EYES", attackerAccuracyStage: 12, moveAccuracy: 100 }),
    });
    directed.push({ label: "zero_move_accuracy", input: accuracyInput({ moveAccuracy: 0 }) });
    directed.push({ label: "max_move_accuracy", input: accuracyInput({ moveAccuracy: 255 }) });

    directed.forEach(({ label, input }) => {
      const expected = ts.calculateAccuracy(input);
      const actual = wasm.calculateAccuracy(input);
      expect(actual, `[${cursor}] ${label}`).toBe(expected);
      cursor++;
    });
  });

  it("rollAccuracyHits: calc x roll boundary matrix", async () => {
    const wasm = await getWasmEngine();
    const CALCS = [0, 1, 30, 50, 99, 100, 130];
    const ROLLS = [0, 1, 49, 50, 98, 99];
    let cursor = 0;
    for (const calc of CALCS) {
      for (const roll of ROLLS) {
        const expected = ts.rollAccuracyHits(calc, roll);
        const actual = wasm.rollAccuracyHits(calc, roll);
        expect(actual, `[${cursor}] calc=${calc} roll=${roll}`).toBe(expected);
        cursor++;
      }
    }
  });
});
