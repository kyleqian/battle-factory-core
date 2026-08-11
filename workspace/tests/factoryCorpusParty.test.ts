import { describe, expect, it } from "vitest";
import anchorStateData from "../src/data/gen/anchor-state.json" with { type: "json" };
import abilityItemHooksData from "../src/data/gen/ability-item-hooks.json" with { type: "json" };
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import movesData from "../src/data/gen/moves.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };
import speciesStatsData from "../src/data/gen/species-stats.json" with { type: "json" };
import {
  createFactoryCorpusParty,
  createFactoryCorpusPartyMember,
} from "../src/engine/factoryCorpusParty.ts";

const frontierMons = frontierMonsData.entries;
const natureIndexByName = new Map(naturesData.natures.map((nature) => [nature.name, nature.index]));
const speciesByName = new Map(speciesStatsData.species.map((species) => [species.name, species]));
const moveIdByName = new Map(movesData.moves.map((move) => [move.move, move.id]));
const holdEffectIds = new Set(abilityItemHooksData.universes.holdEffects.map((row) => row.id));

describe("Factory corpus-to-kernel party adapter", () => {
  it("constructs every one of the 850 Level-50 Frontier sets from generated catalogs", () => {
    const level50Sets = frontierMons.slice(0, 850);
    expect(level50Sets).toHaveLength(850);
    expect(level50Sets.at(-1)?.index).toBe(849);
    for (const set of level50Sets) {
      const nature = natureIndexByName.get(set.nature);
      expect(nature, `set ${set.index} nature`).toBeDefined();
      const species = speciesByName.get(set.species)!;
      const member = createFactoryCorpusPartyMember({
        setId: set.index,
        // GetNatureFromPersonality is personality % 25. This is the smallest
        // legal instance personality for each catalog nature.
        personality: nature!,
        fixedIv: 3,
        abilitySlot: species.abilities[1] === "ABILITY_NONE" ? 0 : 1,
        otId: 0,
      });

      expect(member.setId).toBe(set.index);
      expect(member.species).toBeGreaterThan(0);
      expect(member.level).toBe(50);
      expect(member.moves.some((move) => move !== 0)).toBe(true);
      expect(member.pp.every((pp, index) => member.moves[index] === 0 ? pp === 0 : pp > 0)).toBe(true);
      expect(member.maxHP).toBeGreaterThan(0);
      for (const stat of [
        member.maxHP, member.attack, member.defense, member.speed, member.spAttack, member.spDefense,
      ]) {
        expect(stat).toBeGreaterThan(0);
        expect(stat).toBeLessThanOrEqual(999);
      }
      expect(member.hp).toBe(member.maxHP);
      expect(member.ppBonuses).toBe(0);
      expect(member.ppUps).toEqual([0, 0, 0, 0]);
      expect(holdEffectIds.has(member.holdEffect)).toBe(true);
      expect(member.holdEffectName).toMatch(/^HOLD_EFFECT_/);
      expect(member.holdEffectParam).toBeGreaterThanOrEqual(0);
    }
  });

  it("exactly reproduces the OFF bootstrap's six RAM-dumped rental literals", () => {
    const anchor = anchorStateData as {
      rentals: Array<{
        frontierMonIndex: number;
        personality: number;
        otId: number;
        species: string;
        nature: string;
        abilityNum: 0 | 1;
        ability: string;
        ivs: Record<string, number>;
        evs: Record<string, number>;
        moves: string[];
        pp: number[];
        level: number;
        status: number;
        stats: {
          hp: number;
          maxHp: number;
          attack: number;
          defense: number;
          speed: number;
          spAttack: number;
          spDefense: number;
        };
      }>;
    };

    for (const rental of anchor.rentals) {
      const fixedIv = rental.ivs.hp!;
      expect(Object.values(rental.ivs).every((iv) => iv === fixedIv)).toBe(true);
      const member = createFactoryCorpusPartyMember({
        setId: rental.frontierMonIndex,
        personality: rental.personality,
        fixedIv,
        abilitySlot: rental.abilityNum,
        otId: rental.otId,
      });
      const set = frontierMons[rental.frontierMonIndex]!;

      expect(member).toMatchObject({
        setId: rental.frontierMonIndex,
        speciesName: rental.species,
        natureName: rental.nature,
        personality: rental.personality,
        isEgg: false,
        abilityNum: rental.abilityNum,
        abilitySlot: rental.abilityNum,
        abilityName: rental.ability,
        ivs: rental.ivs,
        evs: rental.evs,
        level: rental.level,
        friendship: 0,
        hp: rental.stats.hp,
        maxHP: rental.stats.maxHp,
        attack: rental.stats.attack,
        defense: rental.stats.defense,
        speed: rental.stats.speed,
        spAttack: rental.stats.spAttack,
        spDefense: rental.stats.spDefense,
        status1: rental.status,
        pp: rental.pp,
        ppUps: [0, 0, 0, 0],
        ppBonuses: 0,
        shiny: false,
      });
      expect(member.moves).toEqual(set.moves.map((name) => moveIdByName.get(name)));
    }
  });

  it("builds a three-member kernel-compatible party and normalizes impossible single-ability slot 1", () => {
    const instances = anchorStateData.rentals.slice(0, 3).map((rental) => ({
      setId: rental.frontierMonIndex,
      personality: rental.personality,
      fixedIv: rental.ivs.hp,
      abilitySlot: 1 as const,
      otId: rental.otId,
    })) as unknown as Parameters<typeof createFactoryCorpusParty>[0];
    const party = createFactoryCorpusParty(instances);

    expect(party).toHaveLength(3);
    expect(party.map((member) => member.speciesName)).toEqual([
      "SPECIES_ONIX", "SPECIES_MAGBY", "SPECIES_BAYLEEF",
    ]);
    expect(party.map((member) => member.abilitySlot)).toEqual([1, 0, 0]);
    expect(party.every((member) => member.hp === member.maxHP && member.status1 === 0)).toBe(true);
  });

  it("rejects a personality that did not pass the set-nature rejection loop", () => {
    const set = frontierMons[0]!;
    const required = natureIndexByName.get(set.nature)!;
    expect(() => createFactoryCorpusPartyMember({
      setId: 0,
      personality: (required + 1) % 25,
      fixedIv: 3,
      abilitySlot: 0,
    })).toThrow(/requires nature/);
  });
});
