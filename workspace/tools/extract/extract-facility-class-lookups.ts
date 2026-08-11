// Dev-time extraction of Emerald's Facility Class presentation indirection.
// This deliberately preserves duplicate PIC / TRAINER_CLASS rows: aliases are
// source behavior (for example Brendan's three facility-class variants), not
// entries to collapse. It emits metadata only, never trainer artwork.
// Run with: node --experimental-strip-types tools/extract/extract-facility-class-lookups.ts

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const REF = join(ROOT, "reference", "pokeemerald");
const OUT = join(ROOT, "src", "data", "gen", "facility-class-lookups.json");

const read = (...parts: string[]) => readFileSync(join(REF, ...parts), "utf8");

function numericDefines(text: string, prefix: string): Map<string, number> {
  const out = new Map<string, number>();
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^#define\\s+(${escaped}[A-Z0-9_]+)\\s+(0x[0-9a-fA-F]+|\\d+)\\b`, "gm");
  for (const match of text.matchAll(re)) {
    out.set(match[1]!, Number.parseInt(match[2]!, match[2]!.startsWith("0x") ? 16 : 10));
  }
  return out;
}

function countDefine(text: string, name: string): number {
  const match = new RegExp(`^#define\\s+${name}\\s+(0x[0-9a-fA-F]+|\\d+)\\b`, "m").exec(text);
  if (!match) throw new Error(`missing ${name}`);
  return Number.parseInt(match[1]!, match[1]!.startsWith("0x") ? 16 : 10);
}

function designatedSymbolRows(text: string, arrayName: string): Map<string, string> {
  const at = text.indexOf(`const u8 ${arrayName}[]`);
  if (at < 0) throw new Error(`missing ${arrayName}`);
  const end = text.indexOf("};", at);
  if (end < 0) throw new Error(`unterminated ${arrayName}`);
  const rows = new Map<string, string>();
  for (const match of text.slice(at, end).matchAll(/\[(FACILITY_CLASS_[A-Z0-9_]+)\]\s*=\s*([A-Z0-9_]+)\s*,/g)) {
    if (rows.has(match[1]!)) throw new Error(`duplicate ${arrayName} row ${match[1]}`);
    rows.set(match[1]!, match[2]!);
  }
  return rows;
}

function frontPicCoords(text: string): Map<string, { size: number; yOffset: number }> {
  const at = text.indexOf("const struct MonCoords gTrainerFrontPicCoords[]");
  if (at < 0) throw new Error("missing gTrainerFrontPicCoords");
  const end = text.indexOf("};", at);
  if (end < 0) throw new Error("unterminated gTrainerFrontPicCoords");
  const rows = new Map<string, { size: number; yOffset: number }>();
  for (const match of text.slice(at, end).matchAll(/\[(TRAINER_PIC_[A-Z0-9_]+)\]\s*=\s*\{\s*\.size\s*=\s*(\d+),\s*\.y_offset\s*=\s*(\d+)\s*\}\s*,/g)) {
    rows.set(match[1]!, { size: Number(match[2]), yOffset: Number(match[3]) });
  }
  return rows;
}

function trainerClassNames(text: string): Map<string, string> {
  const rows = new Map<string, string>();
  for (const match of text.matchAll(/\[(TRAINER_CLASS_[A-Z0-9_]+)\]\s*=\s*_\("([^"]*)"\),/g)) rows.set(match[1]!, match[2]!);
  return rows;
}

const trainersHeader = read("include", "constants", "trainers.h");
const facilityClasses = numericDefines(trainersHeader, "FACILITY_CLASS_");
const facilityClassCount = countDefine(trainersHeader, "FACILITY_CLASSES_COUNT");
facilityClasses.delete("FACILITY_CLASSES_COUNT");
const trainerPics = numericDefines(trainersHeader, "TRAINER_PIC_");
const trainerClasses = numericDefines(trainersHeader, "TRAINER_CLASS_");
const lookupText = read("src", "data", "pokemon", "trainer_class_lookups.h");
const picRows = designatedSymbolRows(lookupText, "gFacilityClassToPicIndex");
const classRows = designatedSymbolRows(lookupText, "gFacilityClassToTrainerClass");
const coords = frontPicCoords(read("src", "data", "trainer_graphics", "front_pic_tables.h"));
const classNames = trainerClassNames(read("src", "data", "text", "trainer_class_names.h"));

if (facilityClasses.size !== facilityClassCount) {
  throw new Error(`FACILITY_CLASSES_COUNT=${facilityClassCount}, parsed ${facilityClasses.size} classes`);
}
if (picRows.size !== facilityClassCount || classRows.size !== facilityClassCount) {
  throw new Error(`expected ${facilityClassCount} source lookup rows, got ${picRows.size} pic and ${classRows.size} trainer-class`);
}

const entries = [...facilityClasses.entries()]
  .map(([facilityClass, facilityClassId]) => {
    const trainerPic = picRows.get(facilityClass);
    const trainerClass = classRows.get(facilityClass);
    if (!trainerPic || !trainerClass) throw new Error(`${facilityClass}: missing source lookup row`);
    const trainerPicId = trainerPics.get(trainerPic);
    const trainerClassId = trainerClasses.get(trainerClass);
    const coord = coords.get(trainerPic);
    const displayName = classNames.get(trainerClass);
    if (trainerPicId === undefined || trainerClassId === undefined || !coord || displayName === undefined) {
      throw new Error(`${facilityClass}: unresolved ${trainerPic}/${trainerClass}`);
    }
    return {
      facilityClass: { symbol: facilityClass, id: facilityClassId },
      trainerPic: { symbol: trainerPic, id: trainerPicId, frontPicCoords: coord },
      trainerClass: { symbol: trainerClass, id: trainerClassId, displayName },
    };
  })
  .sort((a, b) => a.facilityClass.id - b.facilityClass.id);

for (const [id, entry] of entries.entries()) {
  if (entry.facilityClass.id !== id) throw new Error(`facility class numeric order gap at ${id}: ${entry.facilityClass.symbol}=${entry.facilityClass.id}`);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify({
  schema: "facility-class-lookups/v1",
  count: entries.length,
  sources: {
    facilityClasses: "include/constants/trainers.h",
    picLookup: "src/data/pokemon/trainer_class_lookups.h:gFacilityClassToPicIndex",
    trainerClassLookup: "src/data/pokemon/trainer_class_lookups.h:gFacilityClassToTrainerClass",
    trainerClassNames: "src/data/text/trainer_class_names.h:gTrainerClassNames",
    frontPicCoords: "src/data/trainer_graphics/front_pic_tables.h:gTrainerFrontPicCoords",
  },
  entries,
})}\n`);
console.log(`wrote ${OUT} (${entries.length} facility classes)`);
