import { describe, expect, it } from "vitest";
import speciesTypesData from "../src/data/gen/species-types.json" with { type: "json" };

type SpeciesTypes = { name: string; types: [string, string] };
const bySpecies = new Map<string, SpeciesTypes>((speciesTypesData.species as SpeciesTypes[]).map((s) => [s.name, s]));

describe("species-types.json (full species -> types table)", () => {
  it("covers all 411 real species (SPECIES_BULBASAUR..SPECIES_CHIMECHO)", () => {
    expect(bySpecies.size).toBe(411);
  });

  it("pins known types, including mono-type species duplicated as [X, X]", () => {
    expect(bySpecies.get("SPECIES_ONIX")!.types).toEqual(["TYPE_ROCK", "TYPE_GROUND"]);
    expect(bySpecies.get("SPECIES_GROVYLE")!.types).toEqual(["TYPE_GRASS", "TYPE_GRASS"]);
    expect(bySpecies.get("SPECIES_MURKROW")!.types).toEqual(["TYPE_DARK", "TYPE_FLYING"]);
    expect(bySpecies.get("SPECIES_PIDGEOTTO")!.types).toEqual(["TYPE_NORMAL", "TYPE_FLYING"]);
    expect(bySpecies.get("SPECIES_MAGBY")!.types).toEqual(["TYPE_FIRE", "TYPE_FIRE"]);
    expect(bySpecies.get("SPECIES_BAYLEEF")!.types).toEqual(["TYPE_GRASS", "TYPE_GRASS"]);
  });

  it("does not include SPECIES_NONE or the SPECIES_EGG placeholder", () => {
    expect(bySpecies.has("SPECIES_NONE")).toBe(false);
    expect(bySpecies.has("SPECIES_EGG")).toBe(false);
  });
});
