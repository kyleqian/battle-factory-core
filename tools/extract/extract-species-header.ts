// Dev-time extractor: reads reference/pokeemerald's species name + Pokedex
// category strings for the 6 Battle Factory anchor rental-pool species (the
// draft screen's per-slot header: "<CATEGORY> POKeMON" / "<SPECIES NAME>").
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
// description) - fixed for this stage's traces, not RNG-derived.
const POOL_SPECIES = ["ONIX", "MAGBY", "BAYLEEF", "BUTTERFREE", "HAUNTER", "QUILAVA"];

const speciesNamesC = readFileSync(join(REF, "src", "data", "text", "species_names.h"), "utf8");
const pokedexEntriesC = readFileSync(join(REF, "src", "data", "pokemon", "pokedex_entries.h"), "utf8");

function extractSpeciesName(species: string): string {
  const re = new RegExp(`\\[SPECIES_${species}\\]\\s*=\\s*_\\("([^"]*)"\\)`);
  const m = re.exec(speciesNamesC);
  if (!m) throw new Error(`species name not found for SPECIES_${species}`);
  return m[1]!;
}

function extractCategory(species: string): string {
  const re = new RegExp(`\\[NATIONAL_DEX_${species}\\]\\s*=\\s*\\{\\s*\\.categoryName\\s*=\\s*_\\("([^"]*)"\\)`);
  const m = re.exec(pokedexEntriesC);
  if (!m) throw new Error(`categoryName not found for NATIONAL_DEX_${species}`);
  return m[1]!;
}

const pool = POOL_SPECIES.map((species) => ({
  species: extractSpeciesName(species),
  category: extractCategory(species),
}));

writeFileSync(join(DATA_GEN, "draft-pool-header.json"), `${JSON.stringify({ pool }, null, 0)}\n`);
console.log(`wrote ${join(DATA_GEN, "draft-pool-header.json")}`);
console.log(pool);
