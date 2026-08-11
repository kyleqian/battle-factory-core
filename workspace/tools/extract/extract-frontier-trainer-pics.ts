// Dev-time extractor for every trainer front picture reachable by the ordinary
// 300-entry Battle Frontier trainer corpus. The corpus identifies a facility
// class; Emerald resolves that through gFacilityClassToPicIndex and then
// gTrainerFrontPicTable. Keep this complete catalog indexed by TRAINER_PIC id
// so presentation can choose an arbitrary generated trainer without reading
// reference assets at runtime.
//
// Run with: node --experimental-strip-types tools/extract/extract-frontier-trainer-pics.ts
// Never imported at runtime - the production build reads only the JSON output.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "./indexedPng.ts";
import { sliceTiles } from "./tiles.ts";

type FrontierTrainerCorpus = {
  count: number;
  entries: Array<{ id: number; facilityClass: { id: number } }>;
};

type FacilityClassLookups = {
  entries: Array<{
    facilityClass: { id: number };
    trainerPic: { symbol: string; id: number; frontPicCoords: { size: number; yOffset: number } };
  }>;
};

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const REF = join(ROOT, "reference", "pokeemerald");
const DATA_GEN = join(ROOT, "src", "data", "gen");
const OUT = join(ROOT, "src", "assets", "gen", "frontier-trainer-pics.json");

function readReference(...parts: string[]): string {
  return readFileSync(join(REF, ...parts), "utf8");
}

function readGenerated<T>(name: string): T {
  return JSON.parse(readFileSync(join(DATA_GEN, name), "utf8")) as T;
}

function numericDefines(text: string, prefix: string): Map<string, number> {
  const out = new Map<string, number>();
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^#define\\s+(${escaped}[A-Z0-9_]+)\\s+(0x[0-9a-fA-F]+|\\d+)\\b`, "gm");
  for (const match of text.matchAll(re)) {
    out.set(match[1]!, Number.parseInt(match[2]!, match[2]!.startsWith("0x") ? 16 : 10));
  }
  return out;
}

const corpus = readGenerated<FrontierTrainerCorpus>("battle-frontier-trainers.json");
const facilityLookups = readGenerated<FacilityClassLookups>("facility-class-lookups.json");
if (corpus.count !== 300 || corpus.entries.length !== corpus.count) {
  throw new Error(`expected ordinary 300-entry Frontier corpus, got ${corpus.entries.length}`);
}

const facilityById = new Map(facilityLookups.entries.map((entry) => [entry.facilityClass.id, entry]));
const usedPics = new Map<number, FacilityClassLookups["entries"][number]["trainerPic"]>();
for (const trainer of corpus.entries) {
  const facility = facilityById.get(trainer.facilityClass.id);
  if (!facility) throw new Error(`trainer ${trainer.id}: unknown facility class ${trainer.facilityClass.id}`);
  const prior = usedPics.get(facility.trainerPic.id);
  if (prior && prior.symbol !== facility.trainerPic.symbol) {
    throw new Error(`trainer pic id ${facility.trainerPic.id} aliases ${prior.symbol} and ${facility.trainerPic.symbol}`);
  }
  usedPics.set(facility.trainerPic.id, facility.trainerPic);
}

const trainerPicIds = numericDefines(readReference("include", "constants", "trainers.h"), "TRAINER_PIC_");
const frontPicTables = readReference("src", "data", "trainer_graphics", "front_pic_tables.h");
const graphics = readReference("src", "data", "graphics", "trainers.h");
const spriteByPic = new Map<string, string>();
for (const match of frontPicTables.matchAll(/TRAINER_SPRITE\(([A-Z0-9_]+),\s*(gTrainerFrontPic_[A-Za-z0-9_]+),/g)) {
  spriteByPic.set(`TRAINER_PIC_${match[1]!}`, match[2]!);
}
const pngBySprite = new Map<string, string>();
for (const match of graphics.matchAll(/const u32 (gTrainerFrontPic_[A-Za-z0-9_]+)\[\] = INCGFX_U32\("([^"]+)", "\.4bpp\.lz"\);/g)) {
  pngBySprite.set(match[1]!, match[2]!);
}

const entries = [...usedPics.values()]
  .sort((a, b) => a.id - b.id)
  .map((trainerPic) => {
    if (trainerPicIds.get(trainerPic.symbol) !== trainerPic.id) {
      throw new Error(`${trainerPic.symbol}: generated id ${trainerPic.id} disagrees with trainers.h`);
    }
    const sprite = spriteByPic.get(trainerPic.symbol);
    if (!sprite) throw new Error(`${trainerPic.symbol}: missing gTrainerFrontPicTable row`);
    const sourcePath = pngBySprite.get(sprite);
    if (!sourcePath) throw new Error(`${trainerPic.symbol}: missing INCGFX source for ${sprite}`);
    const image = decodeIndexedPng(join(REF, sourcePath));
    if (image.width !== 64 || image.height !== 64) {
      throw new Error(`${sourcePath}: expected source-exact 64x64 trainer pic, got ${image.width}x${image.height}`);
    }
    const { columns, rows, tiles } = sliceTiles(image);
    return {
      id: trainerPic.id,
      symbol: trainerPic.symbol,
      sourcePath,
      width: image.width,
      height: image.height,
      yOffsetPx: trainerPic.frontPicCoords.yOffset * 8,
      tileset: { columns, rows, tiles: tiles.map((tile) => [...tile.pixels]) },
      palette: image.palette,
    };
  });

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify({
  schema: "frontier-trainer-pics/v1",
  count: entries.length,
  sources: {
    trainerCorpus: "src/data/gen/battle-frontier-trainers.json",
    facilityClassLookups: "src/data/gen/facility-class-lookups.json",
    trainerPicTable: "src/data/trainer_graphics/front_pic_tables.h:gTrainerFrontPicTable",
    graphics: "src/data/graphics/trainers.h",
  },
  entries,
})}\n`);
console.log(`wrote ${OUT} (${entries.length} used trainer front pictures for ${corpus.count} ordinary Frontier trainers)`);
