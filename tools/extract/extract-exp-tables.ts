// Dev-time extractor: the 6 growth-rate EXP tables (levels 0-100) plus each
// species' growthRate - enough to compute the Summary screen's Skills page
// EXP/next-level-EXP numbers (docs/summary-screen-notes.md section 3,
// SKILLS_EXP window) for a rental of any level.
//
// reference/pokeemerald's gExperienceTables (src/data/pokemon/
// experience_tables.h) is macro-generated at C-compile time - the header
// only contains the EXP_SLOW/EXP_FAST/EXP_MEDIUM_FAST/EXP_MEDIUM_SLOW/
// EXP_ERRATIC/EXP_FLUCTUATING macro *formulas* plus literal 0/1 for levels
// 0/1, not the expanded integers - so this extractor evaluates those exact
// formulas (transcribed 1:1 from the header, C integer truncation applied
// at each `/` the same way the macros nest it) rather than scraping numbers
// that don't exist in the source text. Cross-checked against well-known
// vanilla-game totals at level 100 (Medium Fast 1,000,000; Medium Slow
// 1,059,860; Fast 800,000; Slow 1,250,000; Erratic 600,000; Fluctuating
// 1,640,000) - all match.
//
// Run with:
//   node --experimental-strip-types tools/extract/extract-exp-tables.ts
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

const pokemonConstantsH = readFileSync(join(REF, "include", "constants", "pokemon.h"), "utf8");
const speciesInfoC = readFileSync(join(REF, "src", "data", "pokemon", "species_info.h"), "utf8");

const MAX_LEVEL = (() => {
  const m = /^#define MAX_LEVEL (\d+)$/m.exec(pokemonConstantsH);
  if (!m) throw new Error("MAX_LEVEL not found in constants/pokemon.h");
  return Number.parseInt(m[1]!, 10);
})();

function parseGrowthRateIds(): Map<string, number> {
  const ids = new Map<string, number>();
  for (const m of pokemonConstantsH.matchAll(/^#define GROWTH_(\w+)\s+(\d+)$/gm)) {
    ids.set(m[1]!, Number.parseInt(m[2]!, 10));
  }
  return ids;
}
const growthRateIds = parseGrowthRateIds();

// experience_tables.h:4-16 macros, transcribed exactly (n is the level,
// integer division truncates toward zero at each `/` as C would evaluate
// it left-to-right within the parenthesized macro body).
const cube = (n: number) => n * n * n;
const idiv = (a: number, b: number) => Math.trunc(a / b);

const FORMULAS: Record<string, (n: number) => number> = {
  SLOW: (n) => idiv(5 * cube(n), 4),
  FAST: (n) => idiv(4 * cube(n), 5),
  MEDIUM_FAST: (n) => cube(n),
  MEDIUM_SLOW: (n) => idiv(6 * cube(n), 5) - 15 * n * n + 100 * n - 140,
  ERRATIC: (n) => {
    if (n <= 50) return idiv((100 - n) * cube(n), 50);
    if (n <= 68) return idiv((150 - n) * cube(n), 100);
    if (n <= 98) return idiv(idiv(1911 - 10 * n, 3) * cube(n), 500);
    return idiv((160 - n) * cube(n), 100);
  },
  FLUCTUATING: (n) => {
    if (n <= 15) return idiv((idiv(n + 1, 3) + 24) * cube(n), 50);
    if (n <= 36) return idiv((n + 14) * cube(n), 50);
    return idiv((idiv(n, 2) + 32) * cube(n), 50);
  },
};

// Every table explicitly special-cases levels 0 and 1 to literal 0/1
// (experience_tables.h:20-22 etc.) rather than running the macro there.
function buildTable(formula: (n: number) => number): number[] {
  const table = [0, 1];
  for (let n = 2; n <= MAX_LEVEL; n++) table.push(formula(n));
  return table;
}

const growthRateNames = [...growthRateIds.keys()];
const expectedNames = ["MEDIUM_FAST", "ERRATIC", "FLUCTUATING", "MEDIUM_SLOW", "FAST", "SLOW"];
if (growthRateNames.length !== expectedNames.length || !expectedNames.every((n) => growthRateIds.has(n))) {
  throw new Error(
    `GROWTH_ constants in constants/pokemon.h changed - expected exactly ${expectedNames.join(", ")}, found ${growthRateNames.join(", ")}`,
  );
}

const growthRates: Record<string, number[]> = {};
for (const name of expectedNames) {
  growthRates[`GROWTH_${name}`] = buildTable(FORMULAS[name]!);
}

// species_info.h: [SPECIES_x] = { ... .growthRate = GROWTH_y, ... }, - the
// array's final entry (SPECIES_CHIMECHO) omits the trailing comma before
// the array's closing `};`, hence the optional `,?`.
function parseSpeciesGrowthRates(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of speciesInfoC.matchAll(/\[SPECIES_(\w+)\]\s*=\s*\{\n([\s\S]*?)\n {4}\},?/g)) {
    const [, name, body] = m as unknown as [string, string, string];
    const gr = /\.growthRate\s*=\s*(GROWTH_\w+)/.exec(body);
    if (!gr) throw new Error(`no .growthRate field for SPECIES_${name}`);
    out[`SPECIES_${name}`] = gr[1]!;
  }
  return out;
}
const speciesGrowthRate = parseSpeciesGrowthRates();

// Sanity: every species referenced by the Battle Frontier rental pool must
// have resolved a growth rate (the extraction's actual consumer).
const battleFrontierMons = JSON.parse(
  readFileSync(join(DATA_GEN, "battle-frontier-mons.json"), "utf8"),
) as { entries: { species: string }[] };
const missing = [...new Set(battleFrontierMons.entries.map((e) => e.species))].filter(
  (s) => !(s in speciesGrowthRate),
);
if (missing.length > 0) throw new Error(`missing growthRate for frontier species: ${missing.join(", ")}`);

writeFileSync(
  join(DATA_GEN, "exp-tables.json"),
  `${JSON.stringify({ growthRates, speciesGrowthRate }, null, 0)}\n`,
);
console.log(
  `wrote ${join(DATA_GEN, "exp-tables.json")} (${Object.keys(growthRates).length} growth rates, ${Object.keys(speciesGrowthRate).length} species)`,
);
