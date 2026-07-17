import { describe, expect, it } from "vitest";
import expTables from "../src/data/gen/exp-tables.json" with { type: "json" };
import anchorState from "../src/data/gen/anchor-state.json" with { type: "json" };

describe("exp-tables.json (Skills page EXP / next-level-EXP extraction)", () => {
  it("has all 6 growth rates, each with 101 levels (0-100)", () => {
    const names = Object.keys(expTables.growthRates).sort();
    expect(names).toEqual(
      [
        "GROWTH_ERRATIC",
        "GROWTH_FAST",
        "GROWTH_FLUCTUATING",
        "GROWTH_MEDIUM_FAST",
        "GROWTH_MEDIUM_SLOW",
        "GROWTH_SLOW",
      ].sort(),
    );
    for (const table of Object.values(expTables.growthRates)) {
      expect(table).toHaveLength(101);
      expect(table[0]).toBe(0);
      expect(table[1]).toBe(1);
    }
  });

  it("pins level-100 totals against well-known vanilla-game values", () => {
    expect(expTables.growthRates.GROWTH_MEDIUM_FAST[100]).toBe(1_000_000);
    expect(expTables.growthRates.GROWTH_MEDIUM_SLOW[100]).toBe(1_059_860);
    expect(expTables.growthRates.GROWTH_FAST[100]).toBe(800_000);
    expect(expTables.growthRates.GROWTH_SLOW[100]).toBe(1_250_000);
    expect(expTables.growthRates.GROWTH_ERRATIC[100]).toBe(600_000);
    expect(expTables.growthRates.GROWTH_FLUCTUATING[100]).toBe(1_640_000);
  });

  it("pins a Lv-50 row (a rental's actual level) for Medium Fast", () => {
    expect(expTables.growthRates.GROWTH_MEDIUM_FAST[50]).toBe(125_000); // 50^3
  });

  it("has a growthRate for every anchor rental species, matching the known real growth rates", () => {
    expect(expTables.speciesGrowthRate.SPECIES_ONIX).toBe("GROWTH_MEDIUM_FAST");
    expect(expTables.speciesGrowthRate.SPECIES_MAGBY).toBe("GROWTH_MEDIUM_FAST");
    expect(expTables.speciesGrowthRate.SPECIES_BAYLEEF).toBe("GROWTH_MEDIUM_SLOW");
    expect(expTables.speciesGrowthRate.SPECIES_BUTTERFREE).toBe("GROWTH_MEDIUM_FAST");
    expect(expTables.speciesGrowthRate.SPECIES_HAUNTER).toBe("GROWTH_MEDIUM_SLOW");
    expect(expTables.speciesGrowthRate.SPECIES_QUILAVA).toBe("GROWTH_MEDIUM_SLOW");
    for (const rental of anchorState.rentals) {
      expect(expTables.speciesGrowthRate[rental.species as keyof typeof expTables.speciesGrowthRate]).toBeDefined();
    }
  });
});
