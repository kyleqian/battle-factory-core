// Dev-time extractor for the Frontier Brain's (Noland's) battle-start front
// picture. Deliberately a SEPARATE catalog from frontier-trainer-pics.json:
// that file's own schema/tests pin it as "the ordinary 300-trainer front-
// picture surface" (every TRAINER_PIC id reachable via gFacilityClassToPicIndex
// from a gFacilityTrainers row). Noland is not reachable that way -- the ROM
// resolves his pic via gTrainers[TRAINER_NOLAND].trainerPic directly
// (frontier_util.c:2443-2453, GetFrontierBrainTrainerPicIndex; see
// docs/noland-brain-staging-design.md §2.3) -- so folding him into that file
// would misrepresent both his identity and the file's own "ordinary" scope
// exactly like the design doc's §1 argument against widening the ordinary
// trainerId field. Reuses that catalog's extractor pattern and PNG/tile
// helpers verbatim; only the source-symbol selection differs.
//
// Run with: node --experimental-strip-types tools/extract/extract-frontier-brain-trainer-pic.ts
// Never imported at runtime - the production build reads only the JSON output.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "./indexedPng.ts";
import { sliceTiles } from "./tiles.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const REF = join(ROOT, "reference", "pokeemerald");
const OUT = join(ROOT, "src", "assets", "gen", "frontier-brain-trainer-pic.json");

const TRAINER_PIC_SYMBOL = "TRAINER_PIC_FACTORY_HEAD_NOLAND";

function readReference(...parts: string[]): string {
  return readFileSync(join(REF, ...parts), "utf8");
}

function numericDefine(text: string, name: string): number {
  const match = new RegExp(`^#define\\s+${name}\\s+(0x[0-9a-fA-F]+|\\d+)\\b`, "m").exec(text);
  if (!match) throw new Error(`missing ${name}`);
  return Number.parseInt(match[1]!, match[1]!.startsWith("0x") ? 16 : 10);
}

function frontPicCoord(text: string, picSymbol: string): { size: number; yOffset: number } {
  const at = text.indexOf("const struct MonCoords gTrainerFrontPicCoords[]");
  if (at < 0) throw new Error("missing gTrainerFrontPicCoords");
  const end = text.indexOf("};", at);
  if (end < 0) throw new Error("unterminated gTrainerFrontPicCoords");
  const re = new RegExp(`\\[${picSymbol}\\]\\s*=\\s*\\{\\s*\\.size\\s*=\\s*(\\d+),\\s*\\.y_offset\\s*=\\s*(\\d+)\\s*\\}\\s*,`);
  const match = re.exec(text.slice(at, end));
  if (!match) throw new Error(`missing gTrainerFrontPicCoords row for ${picSymbol}`);
  return { size: Number(match[1]), yOffset: Number(match[2]) };
}

const trainerPicId = numericDefine(
  readReference("include", "constants", "trainers.h"),
  TRAINER_PIC_SYMBOL,
);
const frontPicTables = readReference("src", "data", "trainer_graphics", "front_pic_tables.h");
const coord = frontPicCoord(frontPicTables, TRAINER_PIC_SYMBOL);

const spriteMatch = new RegExp(
  `TRAINER_SPRITE\\(FACTORY_HEAD_NOLAND,\\s*(gTrainerFrontPic_[A-Za-z0-9_]+),`,
).exec(frontPicTables);
if (!spriteMatch) throw new Error(`missing gTrainerFrontPicTable row for ${TRAINER_PIC_SYMBOL}`);
const spriteName = spriteMatch[1]!;

const graphics = readReference("src", "data", "graphics", "trainers.h");
const pngMatch = new RegExp(
  `const u32 ${spriteName}\\[\\] = INCGFX_U32\\("([^"]+)", "\\.4bpp\\.lz"\\);`,
).exec(graphics);
if (!pngMatch) throw new Error(`missing INCGFX source for ${spriteName}`);
const sourcePath = pngMatch[1]!;

const image = decodeIndexedPng(join(REF, sourcePath));
if (image.width !== 64 || image.height !== 64) {
  throw new Error(`${sourcePath}: expected source-exact 64x64 trainer pic, got ${image.width}x${image.height}`);
}
const { columns, rows, tiles } = sliceTiles(image);

const entries = [{
  id: trainerPicId,
  symbol: TRAINER_PIC_SYMBOL,
  sourcePath,
  width: image.width,
  height: image.height,
  yOffsetPx: coord.yOffset * 8,
  tileset: { columns, rows, tiles: tiles.map((tile) => [...tile.pixels]) },
  palette: image.palette,
}];

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify({
  schema: "frontier-brain-trainer-pic/v1",
  count: entries.length,
  sources: {
    trainerPicId: "include/constants/trainers.h:TRAINER_PIC_FACTORY_HEAD_NOLAND",
    frontPicCoords: "src/data/trainer_graphics/front_pic_tables.h:gTrainerFrontPicCoords",
    trainerSpriteTable: "src/data/trainer_graphics/front_pic_tables.h:gTrainerFrontPicTable",
    graphics: "src/data/graphics/trainers.h",
    brainRouting: "src/frontier_util.c:2443-2453,719-728 (GetFrontierBrainTrainerPicIndex, sFrontierBrainTrainerIds[FRONTIER_FACILITY_FACTORY] = TRAINER_NOLAND)",
  },
  entries,
})}\n`);
console.log(`wrote ${OUT} (${TRAINER_PIC_SYMBOL} id ${trainerPicId})`);
