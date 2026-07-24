import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import speciesNamesData from "../src/data/gen/species-names.json" with { type: "json" };
import speciesStatsData from "../src/data/gen/species-stats.json" with { type: "json" };
import speciesTypesData from "../src/data/gen/species-types.json" with { type: "json" };

type SpeciesStats = {
  id: number;
  name: string;
  baseHp: number;
  baseAttack: number;
  baseDefense: number;
  baseSpeed: number;
  baseSpAttack: number;
  baseSpDefense: number;
  abilities: [string, string];
};

const stats = speciesStatsData.species as SpeciesStats[];
const statsByName = new Map(stats.map((species) => [species.name, species]));
const typesByName = new Map((speciesTypesData.species as Array<{ name: string; types: [string, string] }>).map((species) => [species.name, species]));
const namesBySpecies = new Map((speciesNamesData.species as Array<{ species: string; name: string }>).map((species) => [species.species, species]));

describe("species-stats.json (complete Emerald base-stat and ability corpus)", () => {
  it("reproduces the committed artifact byte-for-byte", () => {
    const before = readFileSync("src/data/gen/species-stats.json", "utf8");
    const outputDirectory = mkdtempSync(join(tmpdir(), "pokeemerald-factory-species-stats-"));
    execFileSync("node", ["--experimental-strip-types", "tools/extract/extract-battle-frontier-data.ts", "--out-dir", outputDirectory], {
      stdio: "pipe",
    });
    expect(readFileSync(join(outputDirectory, "species-stats.json"), "utf8")).toBe(before);
  });

  it("covers the 411 real source species in numeric order with exactly two ability slots", () => {
    expect(stats).toHaveLength(411);
    for (const [offset, species] of stats.entries()) {
      expect(species.id).toBe(offset + 1);
      expect(species.name).toMatch(/^SPECIES_[A-Z0-9_]+$/);
      expect(species.abilities).toHaveLength(2);
      expect(species.abilities).toEqual([expect.stringMatching(/^ABILITY_[A-Z0-9_]+$/), expect.stringMatching(/^ABILITY_[A-Z0-9_]+$/)]);
      for (const stat of [
        species.baseHp,
        species.baseAttack,
        species.baseDefense,
        species.baseSpeed,
        species.baseSpAttack,
        species.baseSpDefense,
      ]) {
        expect(stat).toBeGreaterThan(0);
      }
    }
  });

  it("pins direct entries, macro shorthand, and intentionally duplicated ability slots", () => {
    expect(statsByName.get("SPECIES_ONIX")).toMatchObject({
      id: 95,
      baseHp: 35,
      baseAttack: 45,
      baseDefense: 160,
      baseSpeed: 70,
      baseSpAttack: 30,
      baseSpDefense: 45,
      abilities: ["ABILITY_ROCK_HEAD", "ABILITY_STURDY"],
    });
    expect(statsByName.get("SPECIES_OLD_UNOWN_B")).toMatchObject({
      id: 252,
      baseHp: 50,
      baseAttack: 150,
      baseSpeed: 150,
      abilities: ["ABILITY_NONE", "ABILITY_NONE"],
    });
    expect(statsByName.get("SPECIES_FLYGON")!.abilities).toEqual(["ABILITY_LEVITATE", "ABILITY_LEVITATE"]);
  });

  it("resolves every Frontier set species against stats, types, and display names", () => {
    expect(frontierMonsData.count).toBe(882);
    for (const mon of frontierMonsData.entries) {
      expect(statsByName.get(mon.species), `stats missing for ${mon.label}`).toBeDefined();
      expect(typesByName.get(mon.species), `types missing for ${mon.label}`).toBeDefined();
      expect(namesBySpecies.get(mon.species), `display name missing for ${mon.label}`).toBeDefined();
    }
  });
});
