// abl261 (ISSUES #202; docs/abl261-ability-damage.md): the hit-chain damage / accuracy inputs resolve every numeric
// ability id (include/constants/abilities.h) instead of the old 4-entry table, and WEATHER_HAS_EFFECT counts live
// Cloud Nine / Air Lock battlers (battle_util.h:47, battle_util.c:3140-3149).
import { describe, expect, it } from "vitest";
import { ABILITY_NAME_BY_ID, abilityNameOrNull } from "../src/engine/abilityNameById.ts";
import { advanceBattleScriptAttackCancelerConfused } from "../src/engine/battleScriptActionAdmission.ts";
import { calculateBattleScriptBaseDamageWithPowerForCurrentMove } from "../src/engine/battleScriptHitChainOpcode.ts";
import { weatherHasEffect } from "../src/engine/battleEndTurnOrchestration.ts";
import {
  createBattleScriptRulesContext,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
} from "../src/engine/battleScriptRulesContext.ts";
import { BATTLE_SCRIPT_ATTACK_CANCELER_PHASES } from "../src/engine/battleScriptSourceConstants.ts";

const HUGE_POWER = 37;
const THICK_FAT = 47;
const PLUS = 57;
const MINUS = 58;
const MARVEL_SCALE = 63;
const OVERGROW = 65;
const BLAZE = 66;
const TORRENT = 67;
const SWARM = 68;
const PURE_POWER = 74;
const HUSTLE = 55;
const GUTS = 62;
const CLOUD_NINE = 13;
const AIR_LOCK = 77;
const TACKLE = 33;
const VINE_WHIP = 22;
const FLAMETHROWER = 53;
const WATER_GUN = 55;
const ICE_BEAM = 58;
const PIN_MISSILE = 42;
const WEATHER_RAIN = 1 << 0;
const STATUS1_BURN = 1 << 4;
const STATUS1_POISON = 1 << 3;

function battler(side: 0 | 1, changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 150,
    maxHP: changes.maxHP ?? 150,
    moves: [TACKLE, 0, 0, 0] as const,
    pp: [10, 0, 0, 0] as const,
    status1: changes.status1 ?? 0,
    status2: changes.status2 ?? 0,
    status3: 0,
    substituteHP: 0,
    rolloutTimer: 0,
    furyCutterCounter: 0,
    truantCounter: 0,
    rechargeTimer: 0,
    flinchImmobility: 0,
    disabledMove: 0,
    usedDisabledMove: 0,
    tauntTimer: 0,
    usedTauntedMove: 0,
    usedImprisonedMove: 0,
    attack: changes.attack ?? 100,
    defense: changes.defense ?? 100,
    spAttack: changes.spAttack ?? 100,
    spDefense: changes.spDefense ?? 100,
    level: 50,
    statStages: [6, 6, 6, 6, 6, 6, 6, 6],
    types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    species: 1,
    partyIndex: 0,
  });
}

function rules(
  move: number,
  attacker: Partial<BattleScriptRulesBattler> = {},
  defender: Partial<BattleScriptRulesBattler> = {},
  weather = 0,
): BattleScriptRulesContext {
  return createBattleScriptRulesContext({
    battlers: [battler(0, attacker), battler(1, defender), battler(0, { hp: 0 }), battler(1, { hp: 0 })],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1 },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: move,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    weather,
  });
}

const calc = (r: BattleScriptRulesContext) => calculateBattleScriptBaseDamageWithPowerForCurrentMove(r);

describe("abl261 shared ability id resolver", () => {
  it("resolves the whole ability universe, not four ids", () => {
    expect(ABILITY_NAME_BY_ID.size).toBe(78);
    expect(abilityNameOrNull(HUGE_POWER)).toBe("ABILITY_HUGE_POWER");
    expect(abilityNameOrNull(BLAZE)).toBe("ABILITY_BLAZE");
    expect(abilityNameOrNull(AIR_LOCK)).toBe("ABILITY_AIR_LOCK");
    expect(abilityNameOrNull(500)).toBeNull();
  });
});

describe("abl261 CalculateBaseDamage abilities (pokemon.c:3158-3226) through the hit chain", () => {
  it("Huge Power / Pure Power double the attacker's Attack (:3158)", () => {
    const doubled = calc(rules(TACKLE, { attack: 200 })).damage;
    const base = calc(rules(TACKLE)).damage;
    expect(doubled).toBeGreaterThan(base);
    expect(calc(rules(TACKLE, { ability: HUGE_POWER })).damage).toBe(doubled);
    expect(calc(rules(TACKLE, { ability: PURE_POWER })).damage).toBe(doubled);
  });

  it("Thick Fat halves the Sp. Attack against Fire and Ice only (:3204)", () => {
    const halved = calc(rules(FLAMETHROWER, { spAttack: 50 })).damage;
    expect(halved).toBeLessThan(calc(rules(FLAMETHROWER)).damage);
    expect(calc(rules(FLAMETHROWER, {}, { ability: THICK_FAT })).damage).toBe(halved);
    const iceHalved = calc(rules(ICE_BEAM, { spAttack: 50 })).damage;
    expect(calc(rules(ICE_BEAM, {}, { ability: THICK_FAT })).damage).toBe(iceHalved);
    expect(calc(rules(WATER_GUN, {}, { ability: THICK_FAT })).damage).toBe(calc(rules(WATER_GUN)).damage);
  });

  it("Marvel Scale x1.5 Defense only while the defender has a status1 (:3212)", () => {
    const boosted = calc(rules(TACKLE, {}, { defense: 150 })).damage;
    expect(calc(rules(TACKLE, {}, { ability: MARVEL_SCALE, status1: STATUS1_POISON })).damage).toBe(boosted);
    expect(calc(rules(TACKLE, {}, { ability: MARVEL_SCALE })).damage).toBe(calc(rules(TACKLE)).damage);
  });

  it("Plus / Minus x1.5 Sp. Attack only with the other ability on the field (:3208-3211)", () => {
    const boosted = calc(rules(WATER_GUN, { spAttack: 150 })).damage;
    expect(calc(rules(WATER_GUN, { ability: PLUS }, { ability: MINUS })).damage).toBe(boosted);
    expect(calc(rules(WATER_GUN, { ability: MINUS }, { ability: PLUS })).damage).toBe(boosted);
    expect(calc(rules(WATER_GUN, { ability: PLUS }, { ability: PLUS })).damage).toBe(calc(rules(WATER_GUN)).damage);
    expect(calc(rules(WATER_GUN, { ability: PLUS })).damage).toBe(calc(rules(WATER_GUN)).damage);
  });

  it("Hustle and Guts (already mapped) still apply", () => {
    expect(calc(rules(TACKLE, { ability: HUSTLE })).damage).toBe(calc(rules(TACKLE, { attack: 150 })).damage);
    expect(calc(rules(TACKLE, { ability: GUTS, status1: STATUS1_BURN })).damage)
      .toBe(calc(rules(TACKLE, { attack: 150 })).damage);
  });

  it("pinch abilities x1.5 move power at hp <= maxHP/3 and not above it (:3219-3226)", () => {
    const cases = [
      [BLAZE, FLAMETHROWER, "TYPE_FIRE", 95],
      [OVERGROW, VINE_WHIP, "TYPE_GRASS", 35],
      [TORRENT, WATER_GUN, "TYPE_WATER", 40],
      [SWARM, PIN_MISSILE, "TYPE_BUG", 14],
    ] as const;
    for (const [ability, move, , power] of cases) {
      const boosted = Math.trunc((150 * power) / 100);
      // maxHP 150: threshold trunc(150/3) = 50
      expect(calc(rules(move, { ability, hp: 50 })).movePower, `ability ${ability} at 1/3`).toBe(boosted);
      expect(calc(rules(move, { ability, hp: 1 })).movePower).toBe(boosted);
      expect(calc(rules(move, { ability, hp: 51 })).movePower, `ability ${ability} above 1/3`).toBe(power);
      expect(calc(rules(move, { ability: 0, hp: 1 })).movePower).toBe(power);
    }
    // wrong type for the ability: no boost
    expect(calc(rules(WATER_GUN, { ability: BLAZE, hp: 1 })).movePower).toBe(40);
    // the boosted power reaches the damage
    expect(calc(rules(FLAMETHROWER, { ability: BLAZE, hp: 50 })).damage)
      .toBeGreaterThan(calc(rules(FLAMETHROWER, { ability: BLAZE, hp: 51 })).damage);
  });

  it("Cloud Nine / Air Lock suppress the weather damage modifier (:3331 WEATHER_HAS_EFFECT2)", () => {
    const rainBoosted = calc(rules(WATER_GUN, {}, {}, WEATHER_RAIN)).damage;
    expect(rainBoosted).toBeGreaterThan(calc(rules(WATER_GUN)).damage);
    expect(calc(rules(WATER_GUN, {}, { ability: CLOUD_NINE }, WEATHER_RAIN)).damage).toBe(calc(rules(WATER_GUN)).damage);
    expect(calc(rules(WATER_GUN, {}, { ability: AIR_LOCK }, WEATHER_RAIN)).damage).toBe(calc(rules(WATER_GUN)).damage);
  });
});

describe("abl261 WEATHER_HAS_EFFECT (battle_util.h:47, ABILITYEFFECT_CHECK_ON_FIELD) in end-turn / turn-order", () => {
  it("Air Lock suppresses like Cloud Nine; a fainted carrier does not", () => {
    const plain = rules(TACKLE);
    expect(weatherHasEffect(plain)).toBe(true);
    expect(weatherHasEffect(rules(TACKLE, {}, { ability: CLOUD_NINE }))).toBe(false);
    expect(weatherHasEffect(rules(TACKLE, {}, { ability: AIR_LOCK }))).toBe(false);
    expect(weatherHasEffect(rules(TACKLE, {}, { ability: AIR_LOCK, hp: 0 }))).toBe(true);
    expect(weatherHasEffect(rules(TACKLE, {}, { ability: CLOUD_NINE, hp: 0 }))).toBe(true);
  });
});

describe("abl261 confusion self-hit (battle_util.c:2157-2175: CalculateBaseDamage on the live record)", () => {
  function selfHit(ability: number, status1 = 0): number {
    const source = createBattleScriptRulesContext({
      battlers: [
        battler(0, { ability, status1, status2: 5 }),
        battler(1),
        battler(0, { hp: 0 }),
        battler(1, { hp: 0 }),
      ],
      selectorRoles: { attacker: 0, target: 1, effectBattler: 1 },
      scriptingBattler: 0,
      atkCancelerTracker: BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_CONFUSED,
      battleOutcome: 0,
      currentMove: TACKLE,
      currentMovePosition: 0,
      moveResultFlags: 0,
      dmgMultiplier: 1,
      critMultiplier: 1,
      moveEffectByte: 0,
      missType: 0,
      hitMarker: 0x40,
      multiHitCounter: 0,
    });
    for (let seed = 1; seed < 64; seed += 1) {
      const result = advanceBattleScriptAttackCancelerConfused(source, 0x1234, seed);
      if (result.reason === "confusion-self-hit") return result.rulesContext.battleMoveDamage;
    }
    throw new Error("no self-hit seed");
  }

  it("Huge Power / Hustle / Marvel Scale-with-status change the self-hit damage", () => {
    const plain = selfHit(0);
    expect(selfHit(HUGE_POWER)).toBeGreaterThan(plain);
    expect(selfHit(HUSTLE)).toBeGreaterThan(plain);
    expect(selfHit(GUTS, STATUS1_POISON)).toBeGreaterThan(plain);
    expect(selfHit(MARVEL_SCALE, STATUS1_POISON)).toBeLessThan(plain);
    expect(selfHit(MARVEL_SCALE)).toBe(plain);
  });
});
