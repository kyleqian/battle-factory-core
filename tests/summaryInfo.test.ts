import { describe, expect, it } from "vitest";
import summaryInfo from "../src/data/gen/summary-info.json" with { type: "json" };
import anchorState from "../src/data/gen/anchor-state.json" with { type: "json" };
import { getMonGender } from "../src/engine/monGender.ts";

type SpeciesInfo = { species: string; dexNumber: number; types: string[]; genderRatio: number };
const bySpecies = new Map<string, SpeciesInfo>((summaryInfo.species as SpeciesInfo[]).map((s) => [s.species, s]));

describe("summary-info.json (Info page extraction)", () => {
  it("has an entry for all 6 anchor rental-pool species", () => {
    expect(bySpecies.size).toBe(6);
    for (const rental of anchorState.rentals) {
      expect(bySpecies.has(rental.species)).toBe(true);
    }
  });

  it("pins National Dex numbers (IsNationalPokedexEnabled confirmed TRUE at the anchor via RAM probe)", () => {
    expect(bySpecies.get("SPECIES_ONIX")!.dexNumber).toBe(95);
    expect(bySpecies.get("SPECIES_MAGBY")!.dexNumber).toBe(240);
    expect(bySpecies.get("SPECIES_BAYLEEF")!.dexNumber).toBe(153);
    expect(bySpecies.get("SPECIES_BUTTERFREE")!.dexNumber).toBe(12);
    expect(bySpecies.get("SPECIES_HAUNTER")!.dexNumber).toBe(93);
    expect(bySpecies.get("SPECIES_QUILAVA")!.dexNumber).toBe(156);
  });

  it("pins types, collapsing dual-identical-type entries to a single-element array", () => {
    expect(bySpecies.get("SPECIES_ONIX")!.types).toEqual(["TYPE_ROCK", "TYPE_GROUND"]);
    expect(bySpecies.get("SPECIES_BUTTERFREE")!.types).toEqual(["TYPE_BUG", "TYPE_FLYING"]);
    expect(bySpecies.get("SPECIES_HAUNTER")!.types).toEqual(["TYPE_GHOST", "TYPE_POISON"]);
    // MAGBY/BAYLEEF/QUILAVA are mono-type in the source (types = {X, X}).
    expect(bySpecies.get("SPECIES_MAGBY")!.types).toEqual(["TYPE_FIRE"]);
    expect(bySpecies.get("SPECIES_BAYLEEF")!.types).toEqual(["TYPE_GRASS"]);
    expect(bySpecies.get("SPECIES_QUILAVA")!.types).toEqual(["TYPE_FIRE"]);
  });

  it("pins genderRatio (species_info.h PERCENT_FEMALE macro, C truncating division)", () => {
    expect(bySpecies.get("SPECIES_ONIX")!.genderRatio).toBe(127); // 50%
    expect(bySpecies.get("SPECIES_MAGBY")!.genderRatio).toBe(63); // 25%
    expect(bySpecies.get("SPECIES_BAYLEEF")!.genderRatio).toBe(31); // 12.5%
    expect(bySpecies.get("SPECIES_QUILAVA")!.genderRatio).toBe(31); // 12.5%
  });

  it("pins ability name + description text for every ability the pool uses", () => {
    expect(summaryInfo.abilities.ABILITY_STURDY).toEqual({ name: "STURDY", description: "Negates 1-hit KO attacks." });
    expect(summaryInfo.abilities.ABILITY_FLAME_BODY).toEqual({ name: "FLAME BODY", description: "Burns the foe on contact." });
    expect(summaryInfo.abilities.ABILITY_LEVITATE).toEqual({ name: "LEVITATE", description: "Not hit by GROUND attacks." });
    expect(summaryInfo.abilities.ABILITY_NONE).toEqual({ name: "-------", description: "No special ability." });
  });
});

describe("getMonGender", () => {
  it("returns the fixed literal genders verbatim", () => {
    expect(getMonGender(0x00, 0xffffffff)).toBe("male");
    expect(getMonGender(0xfe, 0)).toBe("female");
    expect(getMonGender(0xff, 12345)).toBe("genderless");
  });

  it("thresholds on the personality value's low byte (pokemon.c:3481-3484)", () => {
    expect(getMonGender(127, 0)).toBe("female"); // 127 > 0
    expect(getMonGender(127, 127)).toBe("male"); // 127 > 127 is false
    expect(getMonGender(127, 126)).toBe("female");
  });

  it("matches the anchor's 6 rentals against their real personality values", () => {
    // frontierMonIndex order per anchor-state.json; genderRatio from summary-info.json.
    const cases: [string, number, "male" | "female"][] = [
      ["SPECIES_ONIX", 1205102525, "male"],
      ["SPECIES_MAGBY", 1534575931, "female"],
      ["SPECIES_BAYLEEF", 1550278706, "male"],
      ["SPECIES_BUTTERFREE", 2653995674, "male"],
      ["SPECIES_HAUNTER", 1206438594, "male"],
      ["SPECIES_QUILAVA", 2355253556, "male"],
    ];
    for (const [species, personality, expected] of cases) {
      const genderRatio = bySpecies.get(species)!.genderRatio;
      expect(getMonGender(genderRatio, personality)).toBe(expected);
    }
  });
});
