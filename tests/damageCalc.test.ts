import { describe, expect, it } from "vitest";
import {
  applyRandomDamageMultiplier,
  applyStab,
  applyTypeEffectiveness,
  calculateAccuracy,
  calculateBaseDamage,
  calculateEndeavorDamage,
  DEFAULT_STAT_STAGE,
  getCriticalHitChanceStage,
  NEUTRAL_STAT_STAGES,
  resolveEndeavorDamage,
  rollAccuracyHits,
  rollIsCriticalHit,
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

// Battle 1's real, RAM-confirmed level-50 stat blocks (src/data/gen/
// battle1-turn1-ram-dump.json's battlerSnapshots.before_turn, also matching
// docs/battle-turn-notes.md §5 and turn-resolution-notes.md §2).
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
const MURKROW = {
  attack: 91,
  defense: 69,
  spAttack: 91,
  spDefense: 69,
  level: 50,
  types: typesOf("SPECIES_MURKROW"),
  statStages: { ...NEUTRAL_STAT_STAGES },
  isBurned: true,
  ability: "ABILITY_INSOMNIA",
};
const MAGBY = {
  attack: 81,
  defense: 43,
  spAttack: 108,
  spDefense: 61,
  level: 50,
  types: typesOf("SPECIES_MAGBY"),
  statStages: { ...NEUTRAL_STAT_STAGES },
};

describe("calculateBaseDamage - RAM-pinned regression cases (turn-resolution-notes.md §6 item 1)", () => {
  it("Rock Slide: atk51/def56/pow75/lvl50/no-crit/STAB/neutral - base (pre-STAB) locks to 32", () => {
    // gBattleMoveDamage RAM-read as 32 at tick 2335 of battle1-turn1-ram-dump.json,
    // immediately after Cmd_damagecalc and before Cmd_typecalc's STAB step -
    // NOT 30, which a naive floor(...)-without-the-final-"+2" reading of
    // CalculateBaseDamage (pokemon.c:3106-3371) would give (the "+2" lives at
    // the very end of the function, pokemon.c:3371, easy to miss reading
    // top-down - see docs/battle-turn-notes.md §10).
    const base = calculateBaseDamage({
      attacker: ONIX,
      defender: GROVYLE,
      movePower: 75,
      moveType: "TYPE_ROCK",
      isCriticalHit: false,
    });
    expect(base).toBe(32);
  });

  it("Rock Slide: STAB (Onix is ROCK/GROUND, move is ROCK) takes 32 -> 48", () => {
    const stabbed = applyStab(32, ONIX.types, "TYPE_ROCK");
    expect(stabbed).toBe(48);
  });

  it("Rock Slide: type effectiveness is neutral (ROCK vs GRASS/GRASS has no table entry)", () => {
    const { damage, multiplierTenths } = applyTypeEffectiveness(48, "TYPE_ROCK", GROVYLE.types, TYPE_TABLE);
    expect(multiplierTenths).toBe(10);
    expect(damage).toBe(48);
  });

  it("Rock Slide: the real 85-100% roll (LCG-decoded from the committed dump) gives exactly 42", () => {
    // gRngValue transition 2176095973 -> 435971572 (tick 2337 of the
    // committed dump, the damage-spread RNG step) - decode the real
    // Random() u16 output via the shared LCG, not an assumed roll.
    const rng = new GbaRng(2176095973);
    const roll = rng.next();
    expect(rng.rngValue).toBe(435971572);
    expect(applyRandomDamageMultiplier(48, roll)).toBe(42);
  });

  it("Fury Cutter (corrected): atk103/def187/pow10/lvl50/no-STAB/neutral - base locks to 4, not the brief's stated def56", () => {
    // CORRECTION (see docs/battle-turn-notes.md §10 for the full writeup):
    // the brief's literal "atk103/def56" is unreachable under the verified
    // formula - it produces a spread range of [17,20] (no-crit) or [8,10]
    // (crit), never 3, for ANY 85-100% roll. def56 is GROVYLE's OWN defense
    // (irrelevant - Grovyle is the attacker here, not the defender); the
    // real defender is ONIX (def187), matching turn-resolution-notes.md
    // §3's own worked prose (not that document's own §6 item 1 one-liner,
    // which appears to have transcribed Rock Slide's def56 onto this case
    // by mistake). With the corrected def187 AND the CalculateBaseDamage
    // "+2" (pokemon.c:3371, the same term Rock Slide's regression case
    // above pins), base = 4 - and 3 is reachable via the ordinary 85-100%
    // spread with NO crit needed (see the next test), contradicting
    // turn-resolution-notes.md §3's "this was a critical hit" conclusion,
    // which was itself derived using the same un-"+2"-corrected formula.
    const base = calculateBaseDamage({
      attacker: GROVYLE,
      defender: ONIX,
      movePower: 10,
      moveType: "TYPE_BUG",
      isCriticalHit: false,
    });
    expect(base).toBe(4);
  });

  it("Fury Cutter (corrected): the observed damage of 3 is reachable via the ordinary spread, no crit needed", () => {
    // No STAB (Grovyle is pure GRASS, move is BUG); BUG vs ROCK/GROUND is
    // neutral (no type-effectiveness table entry either direction).
    // 85-99% (15 of the 16 equally-likely rand%16 outcomes) floor to 3;
    // only the 100% outcome (rand%16 === 0) floors to 4.
    for (let rand16 = 1; rand16 < 16; rand16++) {
      expect(applyRandomDamageMultiplier(4, rand16)).toBe(3);
    }
    expect(applyRandomDamageMultiplier(4, 0)).toBe(4);
  });
});

describe("calculateBaseDamage - EFFECT_EXPLOSION defense halving (pokemon.c:3228-3230)", () => {
  it("halves the defender's raw Defense (truncated) before the crit-adjusted-stat step when moveEffect is EFFECT_EXPLOSION", () => {
    const withoutHalving = calculateBaseDamage({
      attacker: GROVYLE,
      defender: ONIX,
      movePower: 200,
      moveType: "TYPE_NORMAL",
      isCriticalHit: false,
    });
    const withHalving = calculateBaseDamage({
      attacker: GROVYLE,
      defender: ONIX,
      movePower: 200,
      moveType: "TYPE_NORMAL",
      isCriticalHit: false,
      moveEffect: "EFFECT_EXPLOSION",
    });
    // ONIX.defense is 187 (odd) -- Math.trunc(187/2) = 93, not a clean halving,
    // exercising the truncation rather than an evenly-divisible stat.
    expect(withoutHalving).toBe(50);
    expect(withHalving).toBe(99);
  });

  it("does not halve defense for any other move effect", () => {
    const hit = calculateBaseDamage({
      attacker: GROVYLE,
      defender: ONIX,
      movePower: 200,
      moveType: "TYPE_NORMAL",
      isCriticalHit: false,
      moveEffect: "EFFECT_HIT",
    });
    expect(hit).toBe(50);
  });
});

describe("calculateBaseDamage - WEATHER_HAS_EFFECT2 damage block (pokemon.c:3331-3363)", () => {
  const neutralSpecialAttacker = {
    ...GROVYLE,
    spAttack: 100,
  };
  const neutralSpecialDefender = {
    ...ONIX,
    spDefense: 100,
  };
  const B_WEATHER_RAIN = (1 << 0) | (1 << 1) | (1 << 2);
  const B_WEATHER_SANDSTORM = (1 << 3) | (1 << 4);
  const B_WEATHER_SUN = (1 << 5) | (1 << 6);
  const B_WEATHER_HAIL = 1 << 7;

  function weatherDamage(moveType: "TYPE_FIRE" | "TYPE_WATER", weather: number, weatherHasEffect = true) {
    return calculateBaseDamage({
      attacker: neutralSpecialAttacker,
      defender: neutralSpecialDefender,
      movePower: 53,
      moveType,
      isCriticalHit: false,
      weather,
      weatherHasEffect,
    });
  }

  it.each([
    ["Fire in rain", "TYPE_FIRE", B_WEATHER_RAIN, 13],
    ["Fire in sun", "TYPE_FIRE", B_WEATHER_SUN, 36],
    ["Water in rain", "TYPE_WATER", B_WEATHER_RAIN, 36],
    ["Water in sun", "TYPE_WATER", B_WEATHER_SUN, 13],
  ] as const)("%s applies the modifier to raw 23 before the unconditional +2", (_label, moveType, weather, expected) => {
    expect(weatherDamage(moveType, weather)).toBe(expected);
  });

  it.each([
    ["Cloud Nine: Fire in rain", "TYPE_FIRE", B_WEATHER_RAIN],
    ["Cloud Nine: Fire in sun", "TYPE_FIRE", B_WEATHER_SUN],
    ["Cloud Nine: Water in rain", "TYPE_WATER", B_WEATHER_RAIN],
    ["Cloud Nine: Water in sun", "TYPE_WATER", B_WEATHER_SUN],
    ["Air Lock: Fire in rain", "TYPE_FIRE", B_WEATHER_RAIN],
    ["Air Lock: Fire in sun", "TYPE_FIRE", B_WEATHER_SUN],
    ["Air Lock: Water in rain", "TYPE_WATER", B_WEATHER_RAIN],
    ["Air Lock: Water in sun", "TYPE_WATER", B_WEATHER_SUN],
  ] as const)("%s leaves the clear-weather result unchanged when the caller suppresses weather", (_label, moveType, weather) => {
    expect(weatherDamage(moveType, weather, false)).toBe(25);
  });

  it("keeps the clear-weather truncation and +2 result unchanged", () => {
    expect(weatherDamage("TYPE_FIRE", 0)).toBe(25);
    expect(weatherDamage("TYPE_WATER", 0)).toBe(25);
  });

  it.each([
    ["rain", B_WEATHER_RAIN, 13],
    ["sandstorm", B_WEATHER_SANDSTORM, 13],
    ["hail", B_WEATHER_HAIL, 13],
    ["sun", B_WEATHER_SUN, 25],
  ])("Solar Beam under %s follows the move-id-specific non-sun weakening", (_label, weather, expected) => {
    expect(calculateBaseDamage({
      attacker: neutralSpecialAttacker,
      defender: neutralSpecialDefender,
      movePower: 53,
      moveType: "TYPE_GRASS",
      isCriticalHit: false,
      currentMove: 76,
      weather,
    })).toBe(expected);
  });
});

describe("calculateBaseDamage - burn and turn 17's RAM-pinned FAINT_ATTACK roll", () => {
  it("halves physical damage before the unconditional +2, unless the attacker has GUTS", () => {
    const input = {
      attacker: MURKROW,
      defender: MAGBY,
      movePower: 60,
      moveType: "TYPE_FLYING",
      isCriticalHit: false,
    } as const;
    expect(calculateBaseDamage({ ...input, attacker: { ...MURKROW, isBurned: false } })).toBe(57);
    expect(calculateBaseDamage(input)).toBe(29);
    expect(calculateBaseDamage({ ...input, attacker: { ...MURKROW, ability: "ABILITY_GUTS" } })).toBe(57);
  });

  it("turn 17 FAINT_ATTACK is DARK/special in gen 3, so burn does not halve it; the RAM RNG roll resolves 61 -> 52", () => {
    const base = calculateBaseDamage({
      attacker: MURKROW,
      defender: MAGBY,
      movePower: 60,
      moveType: "TYPE_DARK",
      isCriticalHit: false,
    });
    expect(base).toBe(41);
    const stabbed = applyStab(base, MURKROW.types, "TYPE_DARK");
    expect(stabbed).toBe(61);
    const rng = new GbaRng(1936653909);
    const roll = rng.next();
    expect(rng.rngValue).toBe(1115590820);
    expect(applyRandomDamageMultiplier(stabbed, roll)).toBe(52);
  });
});

describe("calculateBaseDamage - crit determination (turn 1, no crit)", () => {
  it("critChance stage 0 (no focus energy/high-crit move/scope lens) -> 1-in-16", () => {
    const stage = getCriticalHitChanceStage({});
    expect(stage).toBe(0);
  });

  it("the real crit roll (LCG-decoded from the committed dump) is NOT a crit", () => {
    // gRngValue transition 4000719098 -> 2176095973 (tick 2334, the crit RNG step).
    const rng = new GbaRng(4000719098);
    const roll = rng.next();
    expect(rng.rngValue).toBe(2176095973);
    expect(rollIsCriticalHit(0, roll)).toBe(false);
  });
});

describe("calculateAccuracy / rollAccuracyHits (turn 1's accuracy roll, incl. BRIGHT_POWDER)", () => {
  it("Rock Slide (acc 90) vs Grovyle (evasion stage 7, holding BRIGHT_POWDER) computes calc=60", () => {
    // Grovyle's evasion stage flips 6->7 from DOUBLE_TEAM (RAM-confirmed,
    // docs/battle-turn-notes.md §7 item 2) before Onix's turn; BRIGHT_POWDER
    // = HOLD_EFFECT_EVASION_UP, param 10 (src/data/gen/item-hold-effects.json).
    const calc = calculateAccuracy({
      moveAccuracy: 90,
      attackerAccuracyStage: DEFAULT_STAT_STAGE,
      targetEvasionStage: 7,
      targetHoldEffect: "HOLD_EFFECT_EVASION_UP",
      targetHoldEffectParam: 10,
    });
    expect(calc).toBe(60);
  });

  it("the real accuracy roll (LCG-decoded from the committed dump) hits", () => {
    // gRngValue transition 3485459011 -> 4000719098 (tick 2310, the
    // accuracy RNG step - the very first roll of the turn).
    const rng = new GbaRng(3485459011);
    const roll = rng.next();
    expect(rng.rngValue).toBe(4000719098);
    expect(rollAccuracyHits(60, roll)).toBe(true);
  });
});

describe("calculateEndeavorDamage / resolveEndeavorDamage (turn 2's ENDEAVOR, docs/battle-turn-notes.md §12)", () => {
  it("Grovyle(101)'s ENDEAVOR vs Onix(117) hp-diff is 16, RAM-confirmed (gBattleMoveDamage tick 2981)", () => {
    expect(calculateEndeavorDamage(117, 101)).toBe(16);
  });

  it("clamps to 0 when the user's own HP is already >= the target's (no effect, never negative)", () => {
    expect(calculateEndeavorDamage(101, 117)).toBe(0);
    expect(calculateEndeavorDamage(100, 100)).toBe(0);
  });

  it("typecalc's NORMAL-vs-ROCK/GROUND multiplier scales the diff to 8 (gBattleMoveDamage tick 2984) - the intermediate step ENDEAVOR's own resolution discards", () => {
    const { damage, multiplierTenths } = applyTypeEffectiveness(16, "TYPE_NORMAL", ["TYPE_ROCK", "TYPE_GROUND"], TYPE_TABLE);
    expect(multiplierTenths).toBe(5);
    expect(damage).toBe(8);
  });

  it("resolveEndeavorDamage restores the full 16, not the type-scaled 8 (gBattleMoveDamage tick 2987's copyword restore)", () => {
    const { multiplierTenths } = applyTypeEffectiveness(16, "TYPE_NORMAL", ["TYPE_ROCK", "TYPE_GROUND"], TYPE_TABLE);
    expect(resolveEndeavorDamage(117, 101, multiplierTenths)).toBe(16);
  });

  it("a 0x (immune) type multiplier makes ENDEAVOR deal no damage at all, unlike every scaled-but-nonzero case", () => {
    expect(resolveEndeavorDamage(117, 101, 0)).toBe(0);
  });
});
