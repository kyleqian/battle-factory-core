// Dev-time extractor: reads reference/pokeemerald's species name + Pokedex
// category strings for every species present in gBattleFrontierMons. The
// draft screen uses them for its per-slot header:
// "<CATEGORY> POKeMON" / "<SPECIES NAME>".
// Run with:
//   node --experimental-strip-types tools/extract/extract-species-header.ts
//
// Never imported at runtime - the production build only reads its JSON output.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_ROOT = join(HERE, "..", "..");
const REF = join(RUN_ROOT, "reference", "pokeemerald");
const DATA_GEN = join(RUN_ROOT, "src", "data", "gen");

mkdirSync(DATA_GEN, { recursive: true });

// Anchor rental pool order (slots 1-6, see bin/oracle info's bootstrap
// description) - fixed for the canonical traces, not RNG-derived.
const POOL_SPECIES = [
  "SPECIES_ONIX",
  "SPECIES_MAGBY",
  "SPECIES_BAYLEEF",
  "SPECIES_BUTTERFREE",
  "SPECIES_HAUNTER",
  "SPECIES_QUILAVA",
];

const speciesNamesC = readFileSync(join(REF, "src", "data", "text", "species_names.h"), "utf8");
const pokedexEntriesC = readFileSync(join(REF, "src", "data", "pokemon", "pokedex_entries.h"), "utf8");
const frontierMons = JSON.parse(
  readFileSync(join(DATA_GEN, "battle-frontier-mons.json"), "utf8"),
) as { entries: Array<{ species: string }> };

function extractSpeciesName(species: string): string {
  const re = new RegExp(`\\[${species}\\]\\s*=\\s*_\\("([^"]*)"\\)`);
  const m = re.exec(speciesNamesC);
  if (!m) throw new Error(`species name not found for ${species}`);
  return m[1]!;
}

function extractCategory(species: string): string {
  const dexSpecies = species.replace(/^SPECIES_/, "");
  const re = new RegExp(`\\[NATIONAL_DEX_${dexSpecies}\\]\\s*=\\s*\\{\\s*\\.categoryName\\s*=\\s*_\\("([^"]*)"\\)`);
  const m = re.exec(pokedexEntriesC);
  if (!m) throw new Error(`categoryName not found for NATIONAL_DEX_${dexSpecies}`);
  return m[1]!;
}

const frontierSpecies = [...new Set(frontierMons.entries.map((entry) => entry.species))];
const speciesHeaders = frontierSpecies.map((species) => ({
  species,
  name: extractSpeciesName(species),
  category: extractCategory(species),
}));
const headersBySpecies = new Map(speciesHeaders.map((header) => [header.species, header]));
const pool = POOL_SPECIES.map((species) => {
  const header = headersBySpecies.get(species);
  if (header === undefined) throw new Error(`anchor pool species ${species} is absent from Factory data`);
  return { species: header.name, category: header.category };
});

writeFileSync(
  join(DATA_GEN, "draft-pool-header.json"),
  `${JSON.stringify({ pool, speciesHeaders }, null, 0)}\n`,
);
console.log(`wrote ${join(DATA_GEN, "draft-pool-header.json")}`);
console.log(`wrote ${speciesHeaders.length} Factory species headers`);
