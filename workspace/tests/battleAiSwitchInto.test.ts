import { describe, expect, it } from "vitest";
import {
  getMostSuitableMonToSwitchInto,
  type BattleAiSwitchBench,
  type BattleAiSwitchBenchMember,
} from "../src/engine/battleAiSwitchInto.ts";

const MOVE_KARATE_CHOP = 2;
const MOVE_TACKLE = 33;
const MOVE_WATER_GUN = 55;
const MOVE_NONE = 0;

const URSARING_TYPES = ["TYPE_NORMAL", "TYPE_NORMAL"] as const;

function member(changes: Partial<BattleAiSwitchBenchMember> = {}): BattleAiSwitchBenchMember {
  return Object.freeze({
    species: changes.species ?? 0,
    hp: changes.hp ?? 0,
    types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    moves: changes.moves ?? Object.freeze([MOVE_NONE, MOVE_NONE, MOVE_NONE, MOVE_NONE]),
  });
}

function bench(slots: readonly Partial<BattleAiSwitchBenchMember>[]): BattleAiSwitchBench {
  const filled = [0, 1, 2, 3, 4, 5].map((i) => member(slots[i] ?? {}));
  return filled as unknown as BattleAiSwitchBench;
}

describe("GetMostSuitableMonToSwitchInto pass 1 (type matchup + super-effective-move gate)", () => {
  it(
    "docs/forced-switch-ground-truth.md §2a live ledger: AI sends MACHOP (index 2), skipping PIDGEY "
      + "(index 1, the 'next living index' decoy) -- PIDGEY's Tackle is neutral vs NORMAL, MACHOP's "
      + "Karate Chop is super effective",
    () => {
      const result = getMostSuitableMonToSwitchInto(
        bench([
          { species: 191, hp: 0, types: ["TYPE_GRASS", "TYPE_GRASS"], moves: [MOVE_TACKLE, 0, 0, 0] }, // SUNKERN, fainted (active slot)
          { species: 16, hp: 100, types: ["TYPE_NORMAL", "TYPE_FLYING"], moves: [MOVE_TACKLE, 0, 0, 0] }, // PIDGEY
          { species: 66, hp: 100, types: ["TYPE_FIGHTING", "TYPE_FIGHTING"], moves: [MOVE_KARATE_CHOP, 0, 0, 0] }, // MACHOP
        ]),
        0, // activePartyIndex: SUNKERN's own slot
        URSARING_TYPES,
      );
      expect(result).toEqual({ kind: "resolved", partyIndex: 2 });
    },
  );

  it("excludes the active battler's own party slot even if it were (impossibly) still HP > 0", () => {
    const result = getMostSuitableMonToSwitchInto(
      bench([
        { species: 66, hp: 100, types: ["TYPE_FIGHTING", "TYPE_FIGHTING"], moves: [MOVE_KARATE_CHOP, 0, 0, 0] },
        { species: 16, hp: 100, types: ["TYPE_NORMAL", "TYPE_FLYING"], moves: [MOVE_KARATE_CHOP, 0, 0, 0] },
      ]),
      0,
      URSARING_TYPES,
    );
    expect(result).toEqual({ kind: "resolved", partyIndex: 1 });
  });

  it("skips empty (species 0) and fainted (hp 0) slots", () => {
    const result = getMostSuitableMonToSwitchInto(
      bench([
        { species: 191, hp: 0 },
        { species: 0, hp: 0 },
        { species: 66, hp: 0, types: ["TYPE_FIGHTING", "TYPE_FIGHTING"], moves: [MOVE_KARATE_CHOP, 0, 0, 0] },
        { species: 16, hp: 50, types: ["TYPE_NORMAL", "TYPE_FLYING"], moves: [MOVE_KARATE_CHOP, 0, 0, 0] },
      ]),
      0,
      URSARING_TYPES,
    );
    expect(result).toEqual({ kind: "resolved", partyIndex: 3 });
  });

  it("damage-fallback-needed: no bench mon has a super-effective move (pass 2's own scope, not modeled here)", () => {
    const result = getMostSuitableMonToSwitchInto(
      bench([
        { species: 191, hp: 0 },
        { species: 16, hp: 100, types: ["TYPE_NORMAL", "TYPE_FLYING"], moves: [MOVE_TACKLE, 0, 0, 0] },
      ]),
      0,
      URSARING_TYPES,
    );
    expect(result).toEqual({ kind: "damage-fallback-needed" });
  });

  it("MOVE_NONE slots never count as a super-effective move", () => {
    const result = getMostSuitableMonToSwitchInto(
      bench([
        { species: 191, hp: 0 },
        { species: 16, hp: 100, types: ["TYPE_NORMAL", "TYPE_FLYING"], moves: [MOVE_NONE, MOVE_NONE, MOVE_NONE, MOVE_NONE] },
      ]),
      0,
      URSARING_TYPES,
    );
    expect(result).toEqual({ kind: "damage-fallback-needed" });
  });
});

describe("GetMostSuitableMonToSwitchInto pass 2 (source-quirked damage fallback)", () => {
  it("chooses the strongest candidate TypeCalc scaling with zero RNG: active-type STAB on Water Gun", () => {
    const result = getMostSuitableMonToSwitchInto(
      bench([
        { species: 191, hp: 0, types: ["TYPE_GRASS", "TYPE_GRASS"] },
        { species: 16, hp: 100, types: ["TYPE_NORMAL", "TYPE_FLYING"], moves: [MOVE_TACKLE, 0, 0, 0] },
        { species: 66, hp: 100, types: ["TYPE_FIGHTING", "TYPE_FIGHTING"], moves: [MOVE_WATER_GUN, 0, 0, 0] },
      ]),
      0,
      URSARING_TYPES,
      {
        baseDamage: 100,
        // Source uses the fainted active's types for candidate-move STAB.
        activeTypes: ["TYPE_WATER", "TYPE_WATER"],
        opposingTypes: URSARING_TYPES,
        opposingAbility: 0,
        opposingStatus2: 0,
      },
    );
    expect(result).toEqual({ kind: "resolved", partyIndex: 2 });
  });

  it("strict greater-than keeps the earliest party/move on an exact damage tie", () => {
    const result = getMostSuitableMonToSwitchInto(
      bench([
        { species: 191, hp: 0 },
        { species: 16, hp: 100, moves: [MOVE_TACKLE, 0, 0, 0] },
        { species: 66, hp: 100, moves: [MOVE_TACKLE, 0, 0, 0] },
      ]),
      0,
      URSARING_TYPES,
      {
        baseDamage: 80,
        activeTypes: ["TYPE_GRASS", "TYPE_GRASS"],
        opposingTypes: URSARING_TYPES,
        opposingAbility: 0,
        opposingStatus2: 0,
      },
    );
    expect(result).toEqual({ kind: "resolved", partyIndex: 1 });
  });

  it("preserves the pinned non-BUGFIX u8 bestDmg assignment wrap", () => {
    const result = getMostSuitableMonToSwitchInto(
      bench([
        { species: 191, hp: 0 },
        { species: 16, hp: 100, moves: [MOVE_WATER_GUN, 0, 0, 0] },
        { species: 66, hp: 100, moves: [MOVE_TACKLE, 0, 0, 0] },
      ]),
      0,
      URSARING_TYPES,
      {
        baseDamage: 200,
        activeTypes: ["TYPE_WATER", "TYPE_WATER"],
        opposingTypes: URSARING_TYPES,
        opposingAbility: 0,
        opposingStatus2: 0,
      },
    );
    // Water Gun scores 300 through the fainted active's STAB, but bestDmg
    // becomes u8(300)=44; the later
    // neutral Tackle's 200 then wins the strict comparison.
    expect(result).toEqual({ kind: "resolved", partyIndex: 2 });
  });
});

/**
 * docs/parity-mac/opponent-replacement-pass1.md: pass 1's "has a super effective move" is TypeCalc's FLAG
 * (battle_ai_switch_items.c:733 -> battle_script_commands.c:1536-1591), not a type-chart multiplier.
 * Fixtures are the benches of ROM-replayed census seeds (romDriveSeed.sh SEED off).
 */
describe("GetMostSuitableMonToSwitchInto pass 1 reads TypeCalc's flags (power gate, Levitate)", () => {
  const AGGRON_TYPES = ["TYPE_STEEL", "TYPE_ROCK"] as const;
  const RELICANTH_TYPES = ["TYPE_WATER", "TYPE_ROCK"] as const;
  const WEEZING_TYPES = ["TYPE_POISON", "TYPE_POISON"] as const;
  const neverPass2 = () => {
    throw new Error("AI_CalcDmg must not run when pass 1 resolves");
  };

  it("seed 1414: the type score applies gTypeEffectiveness rows in TABLE order (Rock into Bug/Fighting = 5 -> 2 -> 4, not 5) -- ROM sends MACHAMP, not HERACROSS", () => {
    // docs/parity-mac/replacement-type-score-table-order.md. Player RHYDON (Ground/Rock). HERACROSS (Bug/Fighting): Ground x0.5 on Bug
    // = 5, then `ROCK, FIGHTING, x0.5` (battle_main.c:422) = 2, then `ROCK, BUG, x2` (:425) = 4. MACHAMP (Fighting): 5. The higher
    // score wins (battle_ai_switch_items.c:704), so MACHAMP; in type1-then-type2 order HERACROSS also scored 5 and won as the first slot.
    const RHYDON_TYPES = ["TYPE_GROUND", "TYPE_ROCK"] as const;
    const result = getMostSuitableMonToSwitchInto(
      bench([
        { species: 384, hp: 0 }, // AGGRON, fainted active
        { species: 214, hp: 146, types: ["TYPE_BUG", "TYPE_FIGHTING"], moves: [224, 280, 317, 68] }, // Megahorn, Brick Break, Rock Tomb, Counter
        { species: 68, hp: 187, types: ["TYPE_FIGHTING", "TYPE_FIGHTING"], moves: [238, 157, 68, 184] }, // Cross Chop, Rock Slide, Counter, Scary Face
      ]),
      0,
      RHYDON_TYPES,
      { baseDamage: neverPass2, activeTypes: ["TYPE_STEEL", "TYPE_ROCK"], opposingTypes: RHYDON_TYPES, opposingAbility: 69, opposingStatus2: 0 },
    );
    expect(result).toEqual({ kind: "resolved", partyIndex: 2 });
  });

  it("seed 332: a status move of a super-effective type (Rain Dance into Steel/Rock) is not a super effective move -- ROM sends SLOWKING (Brick Break), not AMPHAROS", () => {
    const result = getMostSuitableMonToSwitchInto(
      bench([
        { species: 213, hp: 0 }, // SHUCKLE, fainted active
        { species: 181, hp: 187, types: ["TYPE_ELECTRIC", "TYPE_ELECTRIC"], moves: [87, 240, 86, 213] }, // Thunder, Rain Dance, Thunder Wave, Attract
        { species: 199, hp: 192, types: ["TYPE_WATER", "TYPE_PSYCHIC"], moves: [94, 280, 133, 213] }, // Psychic, Brick Break, Amnesia, Attract
      ]),
      0,
      AGGRON_TYPES,
      { baseDamage: neverPass2, activeTypes: ["TYPE_BUG", "TYPE_ROCK"], opposingTypes: AGGRON_TYPES, opposingAbility: 5, opposingStatus2: 0 },
    );
    expect(result).toEqual({ kind: "resolved", partyIndex: 2 });
  });

  it("seed 491: Sand-Attack (Ground, power 0) does not count, Counter (Fighting, power 1) does -- ROM sends WOBBUFFET, not LINOONE", () => {
    const result = getMostSuitableMonToSwitchInto(
      bench([
        { species: 28, hp: 0 }, // SANDSLASH, fainted active
        { species: 289, hp: 172, types: ["TYPE_NORMAL", "TYPE_NORMAL"], moves: [290, 28, 343, 321] }, // Secret Power, Sand-Attack, Covet, Tickle
        { species: 202, hp: 274, types: ["TYPE_PSYCHIC", "TYPE_PSYCHIC"], moves: [68, 243, 204, 219] }, // Counter, Mirror Coat, Charm, Safeguard
      ]),
      0,
      RELICANTH_TYPES,
      { baseDamage: neverPass2, activeTypes: ["TYPE_GROUND", "TYPE_GROUND"], opposingTypes: RELICANTH_TYPES, opposingAbility: 69, opposingStatus2: 0 },
    );
    expect(result).toEqual({ kind: "resolved", partyIndex: 2 });
  });

  it("seed 284: Earthquake into a Levitate target is not super effective in pass 1, and pass 2 scores Rest (Psychic, power 0) x2 -- ROM AI_CalcDmg 64, Rest 128, sends WHISCASH", () => {
    let calcDmgCalls = 0;
    const result = getMostSuitableMonToSwitchInto(
      bench([
        { species: 78, hp: 0 }, // RAPIDASH, fainted active
        { species: 195, hp: 165, types: ["TYPE_WATER", "TYPE_GROUND"], moves: [89, 188, 38, 174] }, // Earthquake, Sludge Bomb, Double-Edge, Curse
        { species: 324, hp: 180, types: ["TYPE_WATER", "TYPE_GROUND"], moves: [214, 156, 57, 90] }, // Sleep Talk, Rest, Surf, Fissure
      ]),
      0,
      WEEZING_TYPES,
      {
        baseDamage: () => {
          calcDmgCalls += 1;
          return 64;
        },
        activeTypes: ["TYPE_FIRE", "TYPE_FIRE"],
        opposingTypes: WEEZING_TYPES,
        opposingAbility: 26, // ABILITY_LEVITATE
        opposingStatus2: 0,
      },
    );
    expect(result).toEqual({ kind: "resolved", partyIndex: 2 });
    expect(calcDmgCalls).toBe(1);
  });

  it("the same bench against a target WITHOUT Levitate resolves in pass 1 on Earthquake (QUAGSIRE) and never runs AI_CalcDmg", () => {
    const result = getMostSuitableMonToSwitchInto(
      bench([
        { species: 78, hp: 0 },
        { species: 195, hp: 165, types: ["TYPE_WATER", "TYPE_GROUND"], moves: [89, 188, 38, 174] },
        { species: 324, hp: 180, types: ["TYPE_WATER", "TYPE_GROUND"], moves: [214, 156, 57, 90] },
      ]),
      0,
      WEEZING_TYPES,
      { baseDamage: neverPass2, activeTypes: ["TYPE_FIRE", "TYPE_FIRE"], opposingTypes: WEEZING_TYPES, opposingAbility: 0, opposingStatus2: 0 },
    );
    expect(result).toEqual({ kind: "resolved", partyIndex: 1 });
  });
});
