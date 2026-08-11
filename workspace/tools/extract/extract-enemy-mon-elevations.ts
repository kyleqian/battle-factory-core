// Dev-time extractor: gEnemyMonElevation (reference/pokeemerald/src/data/
// pokemon_graphics/enemy_mon_elevation.h), the per-species "how much higher
// above the usual position the enemy Pokemon is" table consumed by
// GetBattlerElevation/GetBattlerSpriteFinal_Y (battle_anim_mons.c:250-283)
// for opponent-side battler placement. Only species that float or fly get a
// nonzero entry; the source is a sparse struct initializer over
// NUM_SPECIES, so this table is sparse too - species absent here are
// elevation 0 by construction (GetBattlerElevation falls through the same
// `else ret = gEnemyMonElevation[species]` on an implicit-zero array slot).
// Consumers must model that fallback explicitly (`?? 0`), not assume every
// species has an entry.
//
// docs/opponent-release-tint-third-species.md (ISSUES #56 item 3) is the
// evidence chain: origin.y = 8 + coords.yOffset - gEnemyMonElevation[species]
// for opponent-side materialize placement, confirmed on 4 species.
//
// Run with:
//   node --experimental-strip-types tools/extract/extract-enemy-mon-elevations.ts
//
// Never imported at runtime - the production build only reads its JSON output.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_ROOT = join(HERE, "..", "..");
const REF = join(RUN_ROOT, "reference", "pokeemerald");
const outDirIndex = process.argv.indexOf("--out-dir");
const outDir = outDirIndex < 0 ? undefined : process.argv[outDirIndex + 1];
if (outDirIndex >= 0 && !outDir) throw new Error("--out-dir requires a directory");
const DATA_GEN = outDir === undefined ? join(RUN_ROOT, "src", "data", "gen") : isAbsolute(outDir) ? outDir : join(RUN_ROOT, outDir);

mkdirSync(DATA_GEN, { recursive: true });

const source = readFileSync(
  join(REF, "src", "data", "pokemon_graphics", "enemy_mon_elevation.h"),
  "utf8",
);

type SpeciesStatsRow = Readonly<{ id: number; name: string }>;
const speciesStats = (
  JSON.parse(readFileSync(join(RUN_ROOT, "src", "data", "gen", "species-stats.json"), "utf8")) as {
    species: SpeciesStatsRow[];
  }
).species;
const idByName = new Map(speciesStats.map((row) => [row.name, row.id]));

const elevations: Record<string, number> = {};
let count = 0;
for (const match of source.matchAll(/\[SPECIES_([A-Z0-9_]+)\]\s*=\s*(\d+)/g)) {
  const symbol = `SPECIES_${match[1]!}`;
  if (!idByName.has(symbol)) throw new Error(`${symbol}: no species-stats.json entry`);
  elevations[match[1]!] = Number(match[2]);
  count += 1;
}
if (count < 50) throw new Error(`only parsed ${count} gEnemyMonElevation entries, expected 60+`);

writeFileSync(join(DATA_GEN, "enemy-mon-elevations.json"), `${JSON.stringify(elevations)}\n`);
console.log(`wrote ${join(DATA_GEN, "enemy-mon-elevations.json")} (${count} species)`);
