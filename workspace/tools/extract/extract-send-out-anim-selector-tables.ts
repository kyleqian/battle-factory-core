// Dev-time extractor: the five species/nature selector tables that pick a
// battler's per-species send-out intro animation (docs/send-out-intro-
// animation-program.md - rung 1 of the proposed ladder, §6). Two source
// files, five literal tables:
//
//   sMonFrontAnimIdsTable    reference/pokeemerald/src/pokemon.c:1405-1793
//   sMonAnimationDelayTable  reference/pokeemerald/src/pokemon.c:1795-1852
//   sSpeciesToBackAnimSet    reference/pokeemerald/src/pokemon_animation.c:213-601
//   sBackAnimNatureModTable  reference/pokeemerald/src/pokemon_animation.c:817-844
//   sBackAnimationIds        reference/pokeemerald/src/pokemon_animation.c:788-815
//
// Values are kept as their literal C symbol spellings (ANIM_*/BACK_ANIM_*/
// NATURE_*), never resolved to numeric enum values or split/concatenated -
// so a census grepping for a real constant spelling finds it here too
// (AGENTS.md identity-const idiom).
//
// Each of the first three tables is a C designated-initializer array over
// (nearly) the whole species range and is sparse: entries missing from the
// literal source are absent from this JSON's `species` map, not filled with
// a computed default. Consumers must apply each table's own `absentDefault`
// explicitly - see per-table `absentNote` for the exact fallback mechanism
// (mirrors src/data/gen/enemy-mon-elevations.json's sparse-table precedent).
//
// Run with:
//   node --experimental-strip-types tools/extract/extract-send-out-anim-selector-tables.ts
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

const pokemonC = readFileSync(join(REF, "src", "pokemon.c"), "utf8");
const pokemonAnimC = readFileSync(join(REF, "src", "pokemon_animation.c"), "utf8");
const pokemonAnimH = readFileSync(join(REF, "include", "pokemon_animation.h"), "utf8");
const pokemonConstantsH = readFileSync(join(REF, "include", "constants", "pokemon.h"), "utf8");

type SpeciesStatsRow = Readonly<{ id: number; name: string }>;
const speciesStats = (
  JSON.parse(readFileSync(join(RUN_ROOT, "src", "data", "gen", "species-stats.json"), "utf8")) as {
    species: SpeciesStatsRow[];
  }
).species;
const knownSpecies = new Set(speciesStats.map((row) => row.name.replace(/^SPECIES_/, "")));

const animIds = new Set([...pokemonAnimH.matchAll(/#define (ANIM_\w+)\s+\d+/g)].map((m) => m[1]!));
const backAnimIds = new Set([...pokemonAnimH.matchAll(/#define (BACK_ANIM_\w+)\s+\d+/g)].map((m) => m[1]!));
const natureIds = new Set([...pokemonConstantsH.matchAll(/#define (NATURE_\w+)\s+\d+/g)].map((m) => m[1]!));

function extractBlock(source: string, header: RegExp, label: string): string {
  const match = source.match(header);
  if (!match) throw new Error(`${label}: table body not found`);
  return match[1]!;
}

// --- sMonFrontAnimIdsTable ---
const frontBlock = extractBlock(pokemonC, /sMonFrontAnimIdsTable\[NUM_SPECIES - 1\] =\s*\{(.*?)\n\};/s, "sMonFrontAnimIdsTable");
const frontAnimIds: Record<string, string> = {};
for (const m of frontBlock.matchAll(/\[SPECIES_(\w+)\s*-\s*1\]\s*=\s*(ANIM_\w+)/g)) {
  const species = m[1]!;
  const anim = m[2]!;
  if (!knownSpecies.has(species)) throw new Error(`sMonFrontAnimIdsTable: unknown species SPECIES_${species}`);
  if (!animIds.has(anim)) throw new Error(`sMonFrontAnimIdsTable: unknown anim id ${anim}`);
  frontAnimIds[species] = anim;
}
if (Object.keys(frontAnimIds).length < 350) {
  throw new Error(`sMonFrontAnimIdsTable: only parsed ${Object.keys(frontAnimIds).length} entries, expected 350+`);
}

// --- sMonAnimationDelayTable ---
const delayBlock = extractBlock(pokemonC, /sMonAnimationDelayTable\[NUM_SPECIES - 1\] =\s*\{(.*?)\n\};/s, "sMonAnimationDelayTable");
const animationDelay: Record<string, number> = {};
for (const m of delayBlock.matchAll(/\[SPECIES_(\w+)\s*-\s*1\]\s*=\s*(\d+)/g)) {
  const species = m[1]!;
  if (!knownSpecies.has(species)) throw new Error(`sMonAnimationDelayTable: unknown species SPECIES_${species}`);
  animationDelay[species] = Number(m[2]);
}
if (Object.keys(animationDelay).length < 40) {
  throw new Error(`sMonAnimationDelayTable: only parsed ${Object.keys(animationDelay).length} entries, expected 40+`);
}

// --- sSpeciesToBackAnimSet ---
const backSetBlock = extractBlock(pokemonAnimC, /sSpeciesToBackAnimSet\[\] =\s*\{(.*?)\n\};/s, "sSpeciesToBackAnimSet");
const speciesToBackAnimSet: Record<string, string> = {};
for (const m of backSetBlock.matchAll(/\[SPECIES_(\w+)\]\s*=\s*(BACK_ANIM_\w+)/g)) {
  const species = m[1]!;
  const backAnim = m[2]!;
  if (!knownSpecies.has(species)) throw new Error(`sSpeciesToBackAnimSet: unknown species SPECIES_${species}`);
  if (!backAnimIds.has(backAnim)) throw new Error(`sSpeciesToBackAnimSet: unknown back anim id ${backAnim}`);
  speciesToBackAnimSet[species] = backAnim;
}
if (Object.keys(speciesToBackAnimSet).length < 350) {
  throw new Error(`sSpeciesToBackAnimSet: only parsed ${Object.keys(speciesToBackAnimSet).length} entries, expected 350+`);
}

// --- sBackAnimNatureModTable ---
const natureModBlock = extractBlock(pokemonAnimC, /sBackAnimNatureModTable\[NUM_NATURES\] =\s*\{(.*?)\n\};/s, "sBackAnimNatureModTable");
const backAnimNatureMod: Record<string, number> = {};
for (const m of natureModBlock.matchAll(/\[(NATURE_\w+)\]\s*=\s*(\d+)/g)) {
  const nature = m[1]!;
  if (!natureIds.has(nature)) throw new Error(`sBackAnimNatureModTable: unknown nature ${nature}`);
  backAnimNatureMod[nature] = Number(m[2]);
}
if (Object.keys(backAnimNatureMod).length !== 25) {
  throw new Error(`sBackAnimNatureModTable: expected 25 natures, got ${Object.keys(backAnimNatureMod).length}`);
}

// --- sBackAnimationIds ---
const backAnimationIdsBlock = extractBlock(pokemonAnimC, /sBackAnimationIds\[\] =\s*\{(.*?)\n\};/s, "sBackAnimationIds");
const backAnimationIds: Record<string, [string, string, string]> = {};
for (const m of backAnimationIdsBlock.matchAll(
  /\[\(BACK_ANIM_(\w+)\s*-\s*1\)\s*\*\s*3\]\s*=\s*(ANIM_\w+),\s*(ANIM_\w+),\s*(ANIM_\w+)/g,
)) {
  const set = `BACK_ANIM_${m[1]!}`;
  const triple: [string, string, string] = [m[2]!, m[3]!, m[4]!];
  if (!backAnimIds.has(set)) throw new Error(`sBackAnimationIds: unknown back anim set ${set}`);
  for (const anim of triple) {
    if (!animIds.has(anim)) throw new Error(`sBackAnimationIds: unknown anim id ${anim}`);
  }
  backAnimationIds[set] = triple;
}
if (Object.keys(backAnimationIds).length !== 25) {
  throw new Error(`sBackAnimationIds: expected 25 back anim sets, got ${Object.keys(backAnimationIds).length}`);
}

const output = {
  frontAnimIds: {
    source: "reference/pokeemerald/src/pokemon.c:1405-1793 (sMonFrontAnimIdsTable[NUM_SPECIES - 1], indexed [SPECIES_x - 1])",
    absentDefault: "ANIM_V_SQUISH_AND_BOUNCE",
    absentNote:
      "C designated-initializer zero-default (ANIM_V_SQUISH_AND_BOUNCE == 0, pokemon_animation.h:40). Every gap is one of the 25 unused SPECIES_OLD_UNOWN_* legacy ids, none Factory-reachable - every real reachable species carries an explicit entry.",
    species: frontAnimIds,
  },
  animationDelay: {
    source: "reference/pokeemerald/src/pokemon.c:1795-1852 (sMonAnimationDelayTable[NUM_SPECIES - 1], indexed [SPECIES_x - 1])",
    absentDefault: 0,
    absentNote: "C designated-initializer zero-default; an absent species gets no anim-start delay (pokemon.c:6841,6862 checks `!= 0`).",
    species: animationDelay,
  },
  speciesToBackAnimSet: {
    source: "reference/pokeemerald/src/pokemon_animation.c:213-601 (sSpeciesToBackAnimSet[], indexed [SPECIES_x])",
    absentDefault: "BACK_ANIM_NONE",
    absentNote:
      "GetSpeciesBackAnimSet (pokemon_animation.c:885-891) maps a BACK_ANIM_NONE entry (including any absent/implicit-zero slot) to back-anim-set index 0, i.e. BACK_ANIM_H_VIBRATE's triple in backAnimationIds.",
    species: speciesToBackAnimSet,
  },
  backAnimNatureMod: {
    source: "reference/pokeemerald/src/pokemon_animation.c:817-844 (sBackAnimNatureModTable[NUM_NATURES], indexed [NATURE_x])",
    natures: backAnimNatureMod,
  },
  backAnimationIds: {
    source:
      "reference/pokeemerald/src/pokemon_animation.c:788-815 (sBackAnimationIds[], indexed [(BACK_ANIM_x - 1) * 3 + natureMod]); LaunchAnimationTaskForBackSprite (pokemon_animation.c:956-970) computes animId = 3 * backAnimSet + sBackAnimNatureModTable[nature]",
    tripleOrder: "[natureMod 0, natureMod 1, natureMod 2] in source declaration order",
    sets: backAnimationIds,
  },
};

writeFileSync(join(DATA_GEN, "send-out-anim-selector-tables.json"), `${JSON.stringify(output)}\n`);
console.log(
  `wrote ${join(DATA_GEN, "send-out-anim-selector-tables.json")} ` +
    `(front=${Object.keys(frontAnimIds).length} delay=${Object.keys(animationDelay).length} ` +
    `backSet=${Object.keys(speciesToBackAnimSet).length} natureMod=${Object.keys(backAnimNatureMod).length} ` +
    `backAnimIds=${Object.keys(backAnimationIds).length})`,
);
