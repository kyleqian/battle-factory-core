import { describe, expect, it } from "vitest";
import abilityItemHooksData from "../src/data/gen/ability-item-hooks.json" with { type: "json" };
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import speciesStatsData from "../src/data/gen/species-stats.json" with { type: "json" };
import summaryInfoData from "../src/data/gen/summary-info.json" with { type: "json" };
import { resolveFactoryAbilityDisplayName } from "../src/engine/factoryBattleScriptFullTurnDecision.ts";

type AbilitySymbolIdRow = Readonly<{ name: string; id: number }>;
type FrontierMonRow = Readonly<{ index: number; species: string }>;
type SpeciesStatsRow = Readonly<{ name: string; abilities: readonly string[] }>;
type AbilitySummaryRow = Readonly<{ name: string }>;

describe("Factory ability display-name source join", () => {
  it("resolves every legal non-NONE ability across Level-50 set IDs 110..849", () => {
    const speciesByName = new Map(
      (speciesStatsData.species as readonly SpeciesStatsRow[]).map((species) => [species.name, species]),
    );
    const idBySymbol = new Map(
      (abilityItemHooksData.universes.abilities as readonly AbilitySymbolIdRow[])
        .map((ability) => [ability.name, ability.id]),
    );
    const summaries = summaryInfoData.abilities as Readonly<Record<string, AbilitySummaryRow>>;
    const legalAbilitySymbols = new Set<string>();

    for (const mon of frontierMonsData.entries as readonly FrontierMonRow[]) {
      if (mon.index < 110 || mon.index > 849) continue;
      const species = speciesByName.get(mon.species);
      if (species === undefined) throw new Error(`missing species stats for ${mon.species}`);
      for (const ability of species.abilities) {
        if (ability !== "ABILITY_NONE") legalAbilitySymbols.add(ability);
      }
    }

    expect(legalAbilitySymbols.size).toBe(71);
    for (const symbol of legalAbilitySymbols) {
      const id = idBySymbol.get(symbol);
      if (id === undefined) throw new Error(`missing canonical ID for ${symbol}`);
      expect(resolveFactoryAbilityDisplayName(id), symbol).toBe(summaries[symbol]?.name);
    }
  });

  it("retains a fatal guard for IDs absent from the canonical source universe", () => {
    expect(() => resolveFactoryAbilityDisplayName(255))
      .toThrowError("prepareMessage: no display name mapped for ability 255");
  });
});
