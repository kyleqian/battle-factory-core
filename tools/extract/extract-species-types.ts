// Dev-time extractor: the full species -> types table from reference/
// pokeemerald's species_info.h, for every real species (SPECIES_BULBASAUR..
// SPECIES_CHIMECHO, ids 1-411; SPECIES_NONE and the SPECIES_EGG placeholder
// excluded). Closes the data gap flagged in PROGRESS.md #116 - species-stats.
// json/summary-info.json only cover the 6-species draft rental pool, so
// opponent-side battle mons (e.g. Grovyle/Murkrow/Pidgeotto in battle 1) had
// no committed source for their types; damageCalc.test.ts previously cited
// them inline instead.
//
// Unlike summary-info.json's extractTypes (which collapses a mono-type
// species' duplicated `.types = { X, X }` down to a single-element display
// array), this table keeps the raw 2-tuple always, duplicated for mono
// types - matching damageCalc.ts's `types: readonly [string, string]`
// contract that every caller here feeds.
//
// 25 of the 411 ids (SPECIES_OLD_UNOWN_B..Z, legacy pre-Emerald Unown-letter
// dex slots 252-276, kept only for old-save compatibility) don't have their
// own `[SPECIES_X] = { ... }` block - they're `= OLD_UNOWN_SPECIES_INFO,`
// shorthand for a single shared macro. Resolve those via the macro's own
// literal .types field instead of failing.
//
// Run with:
//   node --experimental-strip-types tools/extract/extract-species-types.ts
//
// Never imported at runtime - the production build only reads its JSON output.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseIntDefines } from "./defines.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_ROOT = join(HERE, "..", "..");
const REF = join(RUN_ROOT, "reference", "pokeemerald");
const DATA_GEN = join(RUN_ROOT, "src", "data", "gen");

mkdirSync(DATA_GEN, { recursive: true });

const speciesConstantsH = readFileSync(join(REF, "include", "constants", "species.h"), "utf8");
const speciesInfoC = readFileSync(join(REF, "src", "data", "pokemon", "species_info.h"), "utf8");

// SPECIES_NONE = 0, SPECIES_EGG = NUM_SPECIES = 412 - both placeholders, not
// real creatures with types. Real species are exactly ids 1..411. (The
// SPECIES_UNOWN_B.. QMARK letter-form aliases are defined as `(NUM_SPECIES +
// N)` expressions, not plain integer literals, so parseIntDefines already
// excludes them - they have no gSpeciesInfo entry of their own; all Unown
// letters share plain SPECIES_UNOWN's single block.)
const speciesIds = parseIntDefines(speciesConstantsH, "SPECIES_");
const realSpecies = [...speciesIds.entries()].filter(([, id]) => id >= 1 && id <= 411).sort((a, b) => a[1] - b[1]);

function extractDirectTypes(name: string): [string, string] | null {
  const re = new RegExp(`\\[${name}\\]\\s*=\\s*\\{[\\s\\S]*?\\.types\\s*=\\s*\\{\\s*(TYPE_\\w+)\\s*,\\s*(TYPE_\\w+)\\s*\\}`);
  const m = re.exec(speciesInfoC);
  if (!m) return null;
  return [m[1]!, m[2]!];
}

function extractMacroTypes(macroName: string): [string, string] {
  const re = new RegExp(`#define\\s+${macroName}\\b[\\s\\S]*?\\.types\\s*=\\s*\\{\\s*(TYPE_\\w+)\\s*,\\s*(TYPE_\\w+)\\s*\\}`);
  const m = re.exec(speciesInfoC);
  if (!m) throw new Error(`macro ${macroName} has no .types field`);
  return [m[1]!, m[2]!];
}

function extractTypes(name: string): [string, string] {
  const direct = extractDirectTypes(name);
  if (direct) return direct;
  const macroRe = new RegExp(`\\[${name}\\]\\s*=\\s*(\\w+_SPECIES_INFO)\\s*,`);
  const macroMatch = macroRe.exec(speciesInfoC);
  if (macroMatch) return extractMacroTypes(macroMatch[1]!);
  throw new Error(`no .types field found for ${name} (neither a direct block nor a *_SPECIES_INFO macro shorthand)`);
}

const species = realSpecies.map(([name]) => ({ name, types: extractTypes(name) }));

if (species.length !== 411) {
  throw new Error(`expected 411 real species, extracted ${species.length}`);
}

writeFileSync(join(DATA_GEN, "species-types.json"), `${JSON.stringify({ species })}\n`);
console.log(`wrote ${join(DATA_GEN, "species-types.json")} (${species.length} species)`);
