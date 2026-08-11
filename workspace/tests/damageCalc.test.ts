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
const HAUNTER = {
  attack: 88,
  defense: 51,
  spAttack: 126,
  spDefense: 76,
  level: 50,
  types: typesOf("SPECIES_HAUNTER"),
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

// Round, symmetric synthetic battlers for the ability stat/power modifier
// block (pokemon.c:3158,3203-3226) - chosen so physical and special baseline
// damage are identical (24) and every 1.5x boost lands on a clean 35, making
// the modifier's effect legible independent of the RAM-pinned fixtures above.
const MOD_ATTACKER = {
  attack: 100,
  defense: 100,
  spAttack: 100,
  spDefense: 100,
  level: 50,
  types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
  statStages: { ...NEUTRAL_STAT_STAGES },
};
const MOD_DEFENDER = {
  attack: 100,
  defense: 100,
  spAttack: 100,
  spDefense: 100,
  level: 50,
  types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
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

  it("Fury Cutter into exact HAUNTER reproduces the source 10 -> 5 -> 2 -> 1 chain without over-clamping neutral damage", () => {
    // CalculateBaseDamage (pokemon.c:3106-3371):
    // trunc(trunc(trunc(103 * 10 * 22 / 51) / 50)) + 2 = 10.
    const base = calculateBaseDamage({
      attacker: GROVYLE,
      defender: HAUNTER,
      movePower: 10,
      moveType: "TYPE_BUG",
      isCriticalHit: false,
    });
    expect(base).toBe(10);

    // Cmd_typecalc / ModulateDmgByType2 (battle_script_commands.c):
    // BUG->GHOST floors 10*5/10 to 5, then BUG->POISON floors 5*5/10 to 2.
    // Each nonzero type multiplier has the source's minimum-1 guard.
    expect(
      applyTypeEffectiveness(base, "TYPE_BUG", HAUNTER.types, TYPE_TABLE),
    ).toEqual({ damage: 2, multiplierTenths: 2 });

    // Cmd_adjustnormaldamage's source RNG draw is 50015 (`% 16 === 15`,
    // 85%), which floors 2 to 1. Only the 100% endpoint could retain 2;
    // this exact draw rules the random-band mismatch out for the anchor.
    expect(applyRandomDamageMultiplier(2, 50_015)).toBe(1);

    // Neutral effectiveness must preserve the ordinary value; the minimum
    // guard is not a blanket clamp of every hit to one.
    expect(
      applyTypeEffectiveness(
        base,
        "TYPE_BUG",
        ["TYPE_WATER", "TYPE_WATER"],
        TYPE_TABLE,
      ),
    ).toEqual({ damage: 10, multiplierTenths: 10 });
    expect(applyRandomDamageMultiplier(10, 50_015)).toBe(8);
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

  it("a consumed Flash Fire resource flag boosts only Fire damage by 1.5x before the unconditional +2", () => {
    const boosted = (moveType: "TYPE_FIRE" | "TYPE_WATER", weather = 0) =>
      calculateBaseDamage({
        attacker: neutralSpecialAttacker,
        defender: neutralSpecialDefender,
        movePower: 53,
        moveType,
        isCriticalHit: false,
        weather,
        flashFireBoosted: true,
      });
    expect(boosted("TYPE_FIRE")).toBe(36); // raw 23 -> floor(34.5) -> 34 + 2
    expect(boosted("TYPE_WATER")).toBe(25);
    expect(boosted("TYPE_FIRE", B_WEATHER_SUN)).toBe(53); // raw 23 -> sun 34 -> Flash Fire 51 -> +2
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
    // Burned Guts attacker (pokemon.c:3211 gates Guts' 1.5x Attack on ANY
    // status1, so a burned Guts attacker gets both: no burn halving (already
    // pinned above) AND the 1.5x boost - 91 -> 136 (trunc) rather than the
    // unboosted 91 the pre-existing partial produced.
    expect(calculateBaseDamage({
      ...input,
      attacker: { ...MURKROW, ability: "ABILITY_GUTS", hasStatus1: true },
    })).toBe(85);
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

describe("calculateBaseDamage - ability stat/power modifier block (pokemon.c:3158,3203-3226)", () => {
  it("Huge Power / Pure Power double the attacker's Attack", () => {
    for (const ability of ["ABILITY_HUGE_POWER", "ABILITY_PURE_POWER"]) {
      const damage = calculateBaseDamage({
        attacker: { ...MOD_ATTACKER, ability },
        defender: MOD_DEFENDER,
        movePower: 50,
        moveType: "TYPE_NORMAL",
        isCriticalHit: false,
      });
      expect(damage).toBe(46);
    }
  });

  it("Huge Power's doubling happens before the stat-stage modifier (pokemon.c:3158, ahead of APPLY_STAT_MOD) - order changes the truncated result", () => {
    const attacker = {
      ...MOD_ATTACKER,
      attack: 15,
      statStages: { ...NEUTRAL_STAT_STAGES, atk: 0 },
      ability: "ABILITY_HUGE_POWER",
    };
    const defender = { ...MOD_DEFENDER, defense: 10 };
    const damage = calculateBaseDamage({
      attacker,
      defender,
      movePower: 50,
      moveType: "TYPE_NORMAL",
      isCriticalHit: false,
    });
    // Correct (double 15->30, then stage-0 ratio 10/40): trunc(30*10/40)=7 -> 17.
    // Doubling after the stage mod would give trunc(15*10/40)=3, *2=6 -> 15.
    expect(damage).toBe(17);
  });

  it("Thick Fat halves the attacker's Special Attack for Fire and Ice moves, not other types", () => {
    const thickFatDefender = { ...MOD_DEFENDER, ability: "ABILITY_THICK_FAT" };
    const damageOf = (moveType: string) => calculateBaseDamage({
      attacker: MOD_ATTACKER,
      defender: thickFatDefender,
      movePower: 50,
      moveType,
      isCriticalHit: false,
    });
    expect(damageOf("TYPE_FIRE")).toBe(13);
    expect(damageOf("TYPE_ICE")).toBe(13);
    expect(damageOf("TYPE_PSYCHIC")).toBe(24);
  });

  it("Hustle boosts the attacker's Attack by 1.5x for physical moves", () => {
    const damage = calculateBaseDamage({
      attacker: { ...MOD_ATTACKER, ability: "ABILITY_HUSTLE" },
      defender: MOD_DEFENDER,
      movePower: 50,
      moveType: "TYPE_NORMAL",
      isCriticalHit: false,
    });
    expect(damage).toBe(35);
  });

  it("Guts boosts Attack by 1.5x only when the attacker has any status1 (not gated on burn specifically)", () => {
    const gutsAttacker = { ...MOD_ATTACKER, ability: "ABILITY_GUTS" };
    const damageOf = (hasStatus1: boolean) => calculateBaseDamage({
      attacker: { ...gutsAttacker, hasStatus1 },
      defender: MOD_DEFENDER,
      movePower: 50,
      moveType: "TYPE_NORMAL",
      isCriticalHit: false,
    });
    expect(damageOf(false)).toBe(24);
    expect(damageOf(true)).toBe(35);
  });

  it("Marvel Scale boosts the defender's Defense by 1.5x only when it has any status1", () => {
    const marvelDefender = { ...MOD_DEFENDER, ability: "ABILITY_MARVEL_SCALE" };
    const damageOf = (hasStatus1: boolean) => calculateBaseDamage({
      attacker: MOD_ATTACKER,
      defender: { ...marvelDefender, hasStatus1 },
      movePower: 50,
      moveType: "TYPE_NORMAL",
      isCriticalHit: false,
    });
    expect(damageOf(false)).toBe(24);
    expect(damageOf(true)).toBe(16);
  });

  it("Marvel Scale's Defense boost applies before Explosion's halving (pokemon.c:3213 precedes :3228 - they stack, not replace)", () => {
    const damage = calculateBaseDamage({
      attacker: MOD_ATTACKER,
      defender: { ...MOD_DEFENDER, ability: "ABILITY_MARVEL_SCALE", hasStatus1: true },
      movePower: 50,
      moveType: "TYPE_NORMAL",
      isCriticalHit: false,
      moveEffect: "EFFECT_EXPLOSION",
    });
    // defense 100 -> Marvel Scale 150 -> Explosion halved (trunc) to 75.
    expect(damage).toBe(31);
  });

  it("Plus alone (no Minus active) gives no Special Attack boost", () => {
    const damage = calculateBaseDamage({
      attacker: { ...MOD_ATTACKER, ability: "ABILITY_PLUS" },
      defender: MOD_DEFENDER,
      movePower: 50,
      moveType: "TYPE_PSYCHIC",
      isCriticalHit: false,
    });
    expect(damage).toBe(24);
  });

  it("Plus with an opposing Minus active boosts Special Attack by 1.5x, symmetrically for Minus with Plus active", () => {
    const plusVsMinus = calculateBaseDamage({
      attacker: { ...MOD_ATTACKER, ability: "ABILITY_PLUS" },
      defender: { ...MOD_DEFENDER, ability: "ABILITY_MINUS" },
      movePower: 50,
      moveType: "TYPE_PSYCHIC",
      isCriticalHit: false,
    });
    const minusVsPlus = calculateBaseDamage({
      attacker: { ...MOD_ATTACKER, ability: "ABILITY_MINUS" },
      defender: { ...MOD_DEFENDER, ability: "ABILITY_PLUS" },
      movePower: 50,
      moveType: "TYPE_PSYCHIC",
      isCriticalHit: false,
    });
    expect(plusVsMinus).toBe(35);
    expect(minusVsPlus).toBe(35);
  });

  it("Plus/Minus reads the full active-battler field scan (ABILITY_ON_FIELD2), not just the defender", () => {
    const damage = calculateBaseDamage({
      attacker: { ...MOD_ATTACKER, ability: "ABILITY_PLUS" },
      defender: MOD_DEFENDER, // the defender itself does not have Minus
      movePower: 50,
      moveType: "TYPE_PSYCHIC",
      isCriticalHit: false,
      activeBattlerAbilities: ["ABILITY_PLUS", "ABILITY_NONE", "ABILITY_MINUS", "ABILITY_NONE"],
    });
    expect(damage).toBe(35);
  });

  it.each([
    ["Overgrow", "ABILITY_OVERGROW", "TYPE_GRASS"],
    ["Blaze", "ABILITY_BLAZE", "TYPE_FIRE"],
    ["Torrent", "ABILITY_TORRENT", "TYPE_WATER"],
    ["Swarm", "ABILITY_SWARM", "TYPE_BUG"],
  ] as const)("%s boosts move power by 1.5x at hp <= maxHP/3", (_label, ability, moveType) => {
    const damage = calculateBaseDamage({
      attacker: { ...MOD_ATTACKER, ability, hp: 100, maxHP: 300 },
      defender: MOD_DEFENDER,
      movePower: 50,
      moveType,
      isCriticalHit: false,
    });
    expect(damage).toBe(35);
  });

  it("pinch boost triggers exactly at the hp == maxHP/3 boundary (<=, source-exact) but not just above it", () => {
    const damageAt = (hp: number) => calculateBaseDamage({
      attacker: { ...MOD_ATTACKER, ability: "ABILITY_OVERGROW", hp, maxHP: 300 },
      defender: MOD_DEFENDER,
      movePower: 50,
      moveType: "TYPE_GRASS",
      isCriticalHit: false,
    });
    expect(damageAt(100)).toBe(35);
    expect(damageAt(101)).toBe(24);
  });

  it("pinch boost requires the matching move type - Overgrow does nothing for a Fire move", () => {
    const damage = calculateBaseDamage({
      attacker: { ...MOD_ATTACKER, ability: "ABILITY_OVERGROW", hp: 100, maxHP: 300 },
      defender: MOD_DEFENDER,
      movePower: 50,
      moveType: "TYPE_FIRE",
      isCriticalHit: false,
    });
    expect(damage).toBe(24);
  });
});

describe("calculateBaseDamage - hold-item block (pokemon.c:3171-3201)", () => {
  it("sHoldEffectToType boosts Attack for a matching physical type", () => {
    const damage = calculateBaseDamage({
      attacker: { ...MOD_ATTACKER, holdEffect: "HOLD_EFFECT_FIGHTING_POWER", holdEffectParam: 100 },
      defender: MOD_DEFENDER,
      movePower: 50,
      moveType: "TYPE_FIGHTING",
      isCriticalHit: false,
    });
    // attack 100 -> (100 + 100)/100 -> 200, same shape as the Huge Power case.
    expect(damage).toBe(46);
  });

  it("sHoldEffectToType boosts Special Attack for a matching special type", () => {
    const damage = calculateBaseDamage({
      attacker: { ...MOD_ATTACKER, holdEffect: "HOLD_EFFECT_PSYCHIC_POWER", holdEffectParam: 100 },
      defender: MOD_DEFENDER,
      movePower: 50,
      moveType: "TYPE_PSYCHIC",
      isCriticalHit: false,
    });
    expect(damage).toBe(46);
  });

  it("sHoldEffectToType requires the exact boosted type - no boost for a mismatched move type", () => {
    const damage = calculateBaseDamage({
      attacker: { ...MOD_ATTACKER, holdEffect: "HOLD_EFFECT_FIGHTING_POWER", holdEffectParam: 100 },
      defender: MOD_DEFENDER,
      movePower: 50,
      moveType: "TYPE_NORMAL",
      isCriticalHit: false,
    });
    expect(damage).toBe(24);
  });

  it("sHoldEffectToType's (param + 100) / 100 truncates rather than rounds", () => {
    const damage = calculateBaseDamage({
      attacker: { ...MOD_ATTACKER, attack: 17, holdEffect: "HOLD_EFFECT_NORMAL_POWER", holdEffectParam: 33 },
      defender: MOD_DEFENDER,
      movePower: 50,
      moveType: "TYPE_NORMAL",
      isCriticalHit: false,
    });
    // attack: trunc(17 * 133 / 100) = trunc(22.61) = 22 (not 23).
    // damage: 22*50*22=24200; /100=242; /50=4.84->4; +2=6.
    expect(damage).toBe(6);
  });

  it("Choice Band boosts the attacker's Attack by 1.5x", () => {
    const damage = calculateBaseDamage({
      attacker: { ...MOD_ATTACKER, holdEffect: "HOLD_EFFECT_CHOICE_BAND" },
      defender: MOD_DEFENDER,
      movePower: 50,
      moveType: "TYPE_NORMAL",
      isCriticalHit: false,
    });
    expect(damage).toBe(35);
  });

  it.each([
    ["Thick Club", "HOLD_EFFECT_THICK_CLUB", "attacker", 104 /* SPECIES_CUBONE */, "TYPE_NORMAL"],
    ["Thick Club (Marowak)", "HOLD_EFFECT_THICK_CLUB", "attacker", 105 /* SPECIES_MAROWAK */, "TYPE_NORMAL"],
    ["Light Ball", "HOLD_EFFECT_LIGHT_BALL", "attacker", 25 /* SPECIES_PIKACHU */, "TYPE_PSYCHIC"],
    ["Deep Sea Tooth", "HOLD_EFFECT_DEEP_SEA_TOOTH", "attacker", 373 /* SPECIES_CLAMPERL */, "TYPE_PSYCHIC"],
  ] as const)("%s doubles the eligible species' stat, and does nothing for any other species", (
    _label, holdEffect, side, eligibleSpecies, moveType,
  ) => {
    const damageWith = (species: number | undefined) => calculateBaseDamage({
      attacker: side === "attacker" ? { ...MOD_ATTACKER, holdEffect, species } : MOD_ATTACKER,
      defender: MOD_DEFENDER,
      movePower: 50,
      moveType,
      isCriticalHit: false,
    });
    expect(damageWith(eligibleSpecies)).toBe(46);
    expect(damageWith(1 /* unrelated species */)).toBe(24);
    expect(damageWith(undefined)).toBe(24);
  });

  it.each([
    ["Deep Sea Scale", "HOLD_EFFECT_DEEP_SEA_SCALE", 373 /* SPECIES_CLAMPERL */, "TYPE_PSYCHIC"],
    ["Metal Powder", "HOLD_EFFECT_METAL_POWDER", 132 /* SPECIES_DITTO */, "TYPE_NORMAL"],
  ] as const)("%s doubles the defender's eligible-species stat, and does nothing for any other species", (
    _label, holdEffect, eligibleSpecies, moveType,
  ) => {
    const damageWith = (species: number | undefined) => calculateBaseDamage({
      attacker: MOD_ATTACKER,
      defender: { ...MOD_DEFENDER, holdEffect, species },
      movePower: 50,
      moveType,
      isCriticalHit: false,
    });
    // defender's stat 100 -> 200 halves the damage's denominator vs. baseline 24: 13.
    expect(damageWith(eligibleSpecies)).toBe(13);
    expect(damageWith(1 /* unrelated species */)).toBe(24);
  });

  it("Soul Dew boosts the attacker's Special Attack by 1.5x for Latias/Latios, but is a structural no-op under BATTLE_TYPE_FRONTIER", () => {
    const damageOf = (isFrontierBattle: boolean, species: number) => calculateBaseDamage({
      attacker: { ...MOD_ATTACKER, holdEffect: "HOLD_EFFECT_SOUL_DEW", species },
      defender: MOD_DEFENDER,
      movePower: 50,
      moveType: "TYPE_PSYCHIC",
      isCriticalHit: false,
      isFrontierBattle,
    });
    expect(damageOf(false, 407 /* SPECIES_LATIAS */)).toBe(35);
    expect(damageOf(false, 408 /* SPECIES_LATIOS */)).toBe(35);
    // Factory battles always set BATTLE_TYPE_FACTORY (a BATTLE_TYPE_FRONTIER
    // member) - this is the structural no-op this engine actually exercises.
    expect(damageOf(true, 407 /* SPECIES_LATIAS */)).toBe(24);
    // Species gate still applies even outside a frontier battle.
    expect(damageOf(false, 1 /* unrelated species */)).toBe(24);
  });

  it("Soul Dew boosts the defender's Special Defense by 1.5x for Latias/Latios, gated the same way", () => {
    const damageOf = (isFrontierBattle: boolean, species: number) => calculateBaseDamage({
      attacker: MOD_ATTACKER,
      defender: { ...MOD_DEFENDER, holdEffect: "HOLD_EFFECT_SOUL_DEW", species },
      movePower: 50,
      moveType: "TYPE_PSYCHIC",
      isCriticalHit: false,
      isFrontierBattle,
    });
    // spDefense 100 -> 150: 100*50*22=110000; /150=733; /50=14; +2=16.
    expect(damageOf(false, 407 /* SPECIES_LATIAS */)).toBe(16);
    expect(damageOf(true, 407 /* SPECIES_LATIAS */)).toBe(24);
  });

  it("combined order: Huge Power (:3158) -> Choice Band (item block, :3185) -> Marvel Scale (ability block, :3213) -> Explosion (:3228) all compose in exact source order", () => {
    const damage = calculateBaseDamage({
      attacker: {
        ...MOD_ATTACKER,
        attack: 19,
        ability: "ABILITY_HUGE_POWER",
        holdEffect: "HOLD_EFFECT_CHOICE_BAND",
      },
      defender: {
        ...MOD_DEFENDER,
        defense: 10,
        ability: "ABILITY_MARVEL_SCALE",
        hasStatus1: true,
      },
      movePower: 50,
      moveType: "TYPE_NORMAL",
      isCriticalHit: false,
      moveEffect: "EFFECT_EXPLOSION",
    });
    // attack: Huge Power 19*2=38, then Choice Band trunc(150*38/100)=57
    // (applying Choice Band BEFORE Huge Power would instead give
    // trunc(150*19/100)=28, *2=56 - a different, wrong number).
    // defense: Marvel Scale trunc(150*10/100)=15, then Explosion trunc(15/2)=7.
    // damage: 57*50*22=62700; /7=8957; /50=179; +2=181.
    expect(damage).toBe(181);
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
