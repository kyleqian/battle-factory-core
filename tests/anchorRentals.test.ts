// Cross-validates the RAM-dumped anchor rental mons (src/data/gen/
// anchor-state.json, captured via tools/extract/inspect-anchor.py) against
// the independently-extracted gBattleFrontierMons table + nature/species
// data (src/data/gen/battle-frontier-mons.json, natures.json,
// species-stats.json). See ROADMAP.md S3 acceptance criteria.

import { describe, expect, it } from "vitest";
import { calculateHpStat, calculateOtherStat, type NatureModifier } from "../src/engine/stats.ts";

import anchorState from "../src/data/gen/anchor-state.json" with { type: "json" };
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };
import speciesStatsData from "../src/data/gen/species-stats.json" with { type: "json" };

const MAX_TOTAL_EVS = 510; // include/constants/pokemon.h

const frontierMonsByIndex = new Map(frontierMonsData.entries.map((e) => [e.index, e]));
const naturesByName = new Map(naturesData.natures.map((n) => [n.name, n]));
const speciesByName = new Map(speciesStatsData.species.map((s) => [s.name, s]));

const EXPECTED_SPECIES_ORDER = [
  "SPECIES_ONIX",
  "SPECIES_MAGBY",
  "SPECIES_BAYLEEF",
  "SPECIES_BUTTERFREE",
  "SPECIES_HAUNTER",
  "SPECIES_QUILAVA",
];

describe("anchor-state.json sanity", () => {
  it("matches the bootstrap anchor's RAM-verified canonical screen hash", () => {
    expect(anchorState.canonicalScreenSha256).toBe(
      "9c89c74113f29e7d4595571c3aceb728417c4fe441b644ec0022fb498463f297",
    );
  });

  it("has the RAM-verified anchor gRngValue", () => {
    expect(anchorState.gRngValue).toBe(0xd2ddeec8);
  });

  it("has exactly six rentals in the documented species order", () => {
    expect(anchorState.rentals.map((r) => r.species)).toEqual(EXPECTED_SPECIES_ORDER);
  });
});

describe("anchor rentals cross-validate against extracted gBattleFrontierMons", () => {
  for (const rental of anchorState.rentals) {
    describe(rental.species, () => {
      const frontierMon = frontierMonsByIndex.get(rental.frontierMonIndex);

      it("has a matching gBattleFrontierMons entry", () => {
        expect(frontierMon).toBeDefined();
      });

      it("species matches", () => {
        expect(frontierMon!.species).toBe(rental.species);
      });

      it("moves match", () => {
        expect(frontierMon!.moves).toEqual(rental.moves);
      });

      it("nature matches", () => {
        expect(frontierMon!.nature).toBe(rental.nature);
      });

      it("EV spread matches (MAX_TOTAL_EVS split evenly across the flagged stats)", () => {
        const flaggedCount = frontierMon!.evSpreadStats.length;
        const evPerStat = Math.floor(MAX_TOTAL_EVS / flaggedCount);
        const expectedEvs = { hp: 0, attack: 0, defense: 0, speed: 0, spAttack: 0, spDefense: 0 };
        const STAT_FROM_FLAG: Record<string, keyof typeof expectedEvs> = {
          F_EV_SPREAD_HP: "hp",
          F_EV_SPREAD_ATTACK: "attack",
          F_EV_SPREAD_DEFENSE: "defense",
          F_EV_SPREAD_SPEED: "speed",
          F_EV_SPREAD_SP_ATTACK: "spAttack",
          F_EV_SPREAD_SP_DEFENSE: "spDefense",
        };
        for (const flag of frontierMon!.evSpreadStats) {
          expectedEvs[STAT_FROM_FLAG[flag]!] = evPerStat;
        }
        expect(rental.evs).toEqual(expectedEvs);
      });
    });
  }
});

describe("anchor rentals' Lv50 stats derive from base data + IVs/EVs/nature", () => {
  for (const rental of anchorState.rentals) {
    it(`${rental.species}: computed stats match the RAM-dumped stats exactly`, () => {
      const base = speciesByName.get(rental.species);
      expect(base).toBeDefined();
      const nature = naturesByName.get(rental.nature);
      expect(nature).toBeDefined();
      expect(rental.level).toBe(50);

      const expectedHp = calculateHpStat(base!.baseHp, rental.ivs.hp, rental.evs.hp, rental.level);
      const expectedAttack = calculateOtherStat(
        base!.baseAttack,
        rental.ivs.attack,
        rental.evs.attack,
        rental.level,
        nature!.attack as NatureModifier,
      );
      const expectedDefense = calculateOtherStat(
        base!.baseDefense,
        rental.ivs.defense,
        rental.evs.defense,
        rental.level,
        nature!.defense as NatureModifier,
      );
      const expectedSpeed = calculateOtherStat(
        base!.baseSpeed,
        rental.ivs.speed,
        rental.evs.speed,
        rental.level,
        nature!.speed as NatureModifier,
      );
      const expectedSpAttack = calculateOtherStat(
        base!.baseSpAttack,
        rental.ivs.spAttack,
        rental.evs.spAttack,
        rental.level,
        nature!.spAttack as NatureModifier,
      );
      const expectedSpDefense = calculateOtherStat(
        base!.baseSpDefense,
        rental.ivs.spDefense,
        rental.evs.spDefense,
        rental.level,
        nature!.spDefense as NatureModifier,
      );

      expect({
        hp: expectedHp,
        maxHp: expectedHp,
        attack: expectedAttack,
        defense: expectedDefense,
        speed: expectedSpeed,
        spAttack: expectedSpAttack,
        spDefense: expectedSpDefense,
      }).toEqual(rental.stats);
    });

    it(`${rental.species}: resolved ability matches base data's abilities[abilityNum]`, () => {
      const base = speciesByName.get(rental.species)!;
      expect(base.abilities[rental.abilityNum]).toBe(rental.ability);
    });
  }
});
