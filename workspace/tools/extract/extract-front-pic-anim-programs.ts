// Dev-time extractor: the per-species front-pic ANIMCMD programs that the
// send-out sprite plays, keyed the same way the send-out selector tables are.
//
// Source: reference/pokeemerald/src/data/pokemon_graphics/front_pic_anims.h
//   sAnim_<Name>_1[] tables .............. lines 1-4808 (ANIMCMD_FRAME/END only)
//   SINGLE_ANIMATION/DOUBLE_ANIMATION .... macros 4810-4823, invocations 4825-5253
//   hand-written sAnims_ arrays ........... Blaziken 5083, Spinda 5115, Castform 5194
//   gMonFrontAnimsPtrTable[] .............. lines 5255-5697
//
// The battle-entry program is INDEX 1 of each species' sAnims array — that is
// what `StartSpriteAnim(sprite, 1)` plays from `SpriteCB_OpponentMonFromBall`
// (reference/pokeemerald/src/battle_main.c:2838) once
// `HasTwoFramesAnimation(species)` (src/pokemon.c:6988) is true. Only
// `ANIMCMD_FRAME(f, d)` and `ANIMCMD_END` appear anywhere in the file; this
// extractor throws if any other ANIMCMD form shows up. Programs are recorded
// verbatim, including for the four species the runtime predicate excludes
// (CASTFORM, DEOXYS, SPINDA, UNOWN) — the predicate, not the data, decides
// whether the program starts.
//
// Keys are the bare species-constant names (SPECIES_ONIX -> "ONIX") mirroring
// `frontAnimIds.species` in send-out-anim-selector-tables.json, so the two
// generated JSONs line up. A species keyed in gMonFrontAnimsPtrTable whose
// sAnims array has no index-1 program (currently only SPINDA) is omitted.
//
// Run with:
//   node --experimental-strip-types tools/extract/extract-front-pic-anim-programs.ts
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

const src = readFileSync(join(REF, "src", "data", "pokemon_graphics", "front_pic_anims.h"), "utf8");

// --- index-1 ANIMCMD programs -------------------------------------------------
// `sAnim_<Name>_1[]` is the battle-entry program every send-out sprite runs.
const programs: Record<string, ReadonlyArray<{ frame: number; duration: number }>> = {};
for (const match of src.matchAll(/static const union AnimCmd sAnim_(\w+)_1\[\] =\n\{(.*?)\n\};/gs)) {
  const name = match[1]!;
  const body = match[2]!;
  const steps: Array<{ frame: number; duration: number }> = [];
  let endCount = 0;
  for (const cmd of body.matchAll(/ANIMCMD_(\w+)(?:\(([^)]*)\))?/g)) {
    const kind = cmd[1]!;
    const args = cmd[2];
    if (kind === "END") {
      if (args !== undefined) throw new Error(`${name}: ANIMCMD_END must not carry arguments`);
      endCount++;
      continue;
    }
    if (kind !== "FRAME") {
      throw new Error(`${name}: unexpected ANIMCMD form ANIMCMD_${kind} in index-1 program`);
    }
    if (endCount > 0) throw new Error(`${name}: ANIMCMD_FRAME after ANIMCMD_END`);
    const parts = args!.split(",").map((s) => s.trim());
    if (parts.length !== 2) throw new Error(`${name}: ANIMCMD_FRAME needs (frame, duration)`);
    const frame = Number(parts[0]);
    const duration = Number(parts[1]);
    if (!Number.isInteger(frame) || !Number.isInteger(duration)) {
      throw new Error(`${name}: ANIMCMD_FRAME arguments must be integers`);
    }
    steps.push({ frame, duration });
  }
  if (endCount !== 1) throw new Error(`${name}: expected exactly one ANIMCMD_END, got ${endCount}`);
  if (steps.length === 0) throw new Error(`${name}: no ANIMCMD_FRAME steps`);
  programs[name] = steps;
}

// --- sAnims array contents ----------------------------------------------------
// Macro-invoked arrays are reconstructed from the SINGLE/DOUBLE_ANIMATION calls;
// the three hand-written arrays are parsed literally and take precedence.
type AnimArray = ReadonlyArray<string>;
const animArrays: Record<string, AnimArray> = {};

for (const match of src.matchAll(/static const union AnimCmd \*const sAnims_(\w+)\[\] =\s*\{(.*?)\n\};/gs)) {
  const name = match[1]!;
  const body = match[2]!;
  const refs = [...body.matchAll(/sAnim_(\w+)/g)].map((m) => m[1]!);
  if (refs.length < 1) throw new Error(`sAnims_${name}: no sAnim_ references`);
  animArrays[name] = refs;
}

const macroPattern = /(?:SINGLE_ANIMATION|DOUBLE_ANIMATION)\((\w+)\);/g;
for (const match of src.matchAll(macroPattern)) {
  const name = match[1]!;
  if (name in animArrays) continue; // hand-written arrays win
  const macro = match[0]!;
  if (macro.startsWith("SINGLE_ANIMATION")) {
    animArrays[name] = ["GeneralFrame0", `${name}_1`];
  } else {
    animArrays[name] = ["GeneralFrame0", `${name}_1`, `${name}_2`];
  }
}

// --- gMonFrontAnimsPtrTable species mapping -----------------------------------
const ptrBlock = src.match(/gMonFrontAnimsPtrTable\[\] =\s*\{(.*?)\n\};/s);
if (!ptrBlock) throw new Error("gMonFrontAnimsPtrTable: table body not found");

const speciesPrograms: Record<string, ReadonlyArray<{ frame: number; duration: number }>> = {};
let count = 0;
for (const m of ptrBlock[1]!.matchAll(/\[SPECIES_(\w+)\]\s*=\s*sAnims_(\w+)/g)) {
  const species = m[1]!;
  const arrName = m[2]!;
  const arr = animArrays[arrName];
  if (!arr) throw new Error(`SPECIES_${species}: sAnims_${arrName} declaration not found`);
  if (arr.length < 2) {
    // No index-1 program (e.g. SPINDA's GeneralFrame0-only array). Omitted,
    // matching the predicate's `species in programs` absence check.
    continue;
  }
  const indexOne = arr[1]!;
  if (!indexOne.endsWith("_1")) {
    throw new Error(`SPECIES_${species}: index-1 element ${indexOne} is not an _1 table`);
  }
  const program = programs[indexOne.slice(0, -2)];
  if (!program) throw new Error(`SPECIES_${species}: sAnim_${indexOne} program not found`);
  if (species in speciesPrograms) throw new Error(`SPECIES_${species}: duplicate ptr-table entry`);
  speciesPrograms[species] = program;
  count++;
}

const output = {
  schema: "front-pic-anim-programs/v1",
  source:
    "reference/pokeemerald/src/data/pokemon_graphics/front_pic_anims.h:1-4808 (sAnim_<Name>_1 index-1 ANIMCMD programs), :4810-4823 (SINGLE/DOUBLE_ANIMATION macros), :4825-5253 (macro invocations), :5083/:5115/:5194 (hand-written sAnims_Blaziken/Spinda/Castform), :5255-5697 (gMonFrontAnimsPtrTable). Regenerate with: node --experimental-strip-types tools/extract/extract-front-pic-anim-programs.ts",
  species: speciesPrograms,
};

writeFileSync(join(DATA_GEN, "front-pic-anim-programs.json"), `${JSON.stringify(output)}\n`);
console.log(
  `wrote ${join(DATA_GEN, "front-pic-anim-programs.json")} ` +
    `(species=${count} programs=${Object.keys(programs).length} index-1 tables)`,
);
