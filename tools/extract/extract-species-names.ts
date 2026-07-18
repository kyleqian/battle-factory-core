// Dev-time extractor: species id -> display name (all species, not just the
// anchor rental pool that extract-species-header.ts covers) - needed by
// battle-message placeholders like B_ATK_NAME_WITH_PREFIX/B_DEF_NAME_WITH_PREFIX,
// which resolve to a battler's nickname; Battle Factory rentals/opponent trainer
// mons are never custom-nicknamed, so their in-battle name is always the plain
// species name (e.g. "GROVYLE used DOUBLE TEAM!" - confirmed on-screen text,
// docs/battle-turn-notes.md).
// Source: src/data/text/species_names.h's gSpeciesNames[].
// Run with:
//   node --experimental-strip-types tools/extract/extract-species-names.ts
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

const speciesNamesC = readFileSync(join(REF, "src", "data", "text", "species_names.h"), "utf8");

const species = [...speciesNamesC.matchAll(/\[SPECIES_(\w+)\]\s*=\s*_\("([^"]*)"\)/g)].map((m) => ({
  species: `SPECIES_${m[1]!}`,
  name: m[2]!,
}));

if (species.length < 400) throw new Error(`expected 400+ species names, parsed ${species.length}`);

const bySymbol = new Map(species.map((s) => [s.species, s.name]));
const expected: Record<string, string> = {
  SPECIES_ONIX: "ONIX",
  SPECIES_GROVYLE: "GROVYLE",
  SPECIES_MURKROW: "MURKROW",
  SPECIES_PIDGEOTTO: "PIDGEOTTO",
};
for (const [sym, name] of Object.entries(expected)) {
  if (bySymbol.get(sym) !== name) throw new Error(`${sym}: expected ${name}, got ${bySymbol.get(sym)}`);
}

writeFileSync(join(DATA_GEN, "species-names.json"), `${JSON.stringify({ species }, null, 0)}\n`);
console.log(`wrote ${join(DATA_GEN, "species-names.json")} (${species.length} species)`);
