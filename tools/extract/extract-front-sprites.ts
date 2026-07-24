// Dev-time extractor: reads reference/pokeemerald's front-pic art for the
// six anchor rental species and writes a committed, decoded artifact under
// src/assets/gen/. Run with:
//   node --experimental-strip-types tools/extract/extract-front-sprites.ts
//
// Never imported at runtime - the production build only reads its JSON
// output. front.png is already a 64x64 raster with the mon fully positioned
// within the canvas (confirmed by inspection - no separate Y-offset table is
// consulted by Select_CreateMonSprite's CreateMonPicSprite_HandleDeoxys path,
// unlike the battle engine's coordinate tables), so no extra placement logic
// is needed beyond slicing the PNG into tiles. Pixel indices come from
// front.png; the palette comes from the sibling normal.pal (what
// gMonPalette_<Species> actually loads in reference/pokeemerald/src/data/
// graphics/pokemon.h) - verified byte-identical to front.png's own embedded
// PLTE for all six anchor species, but normal.pal is the authoritative
// source per the C data tables, so it's what we read.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "./indexedPng.ts";
import { sliceTiles } from "./tiles.ts";
import { loadJascPal } from "./jascPal.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_ROOT = join(HERE, "..", "..");
const REF = join(RUN_ROOT, "reference", "pokeemerald");
const ASSETS_GEN = join(RUN_ROOT, "src", "assets", "gen");

mkdirSync(ASSETS_GEN, { recursive: true });

// species display name (matches src/data/gen/draft-pool-header.json) -> the
// reference repo's graphics/pokemon/<dir>/ directory name.
const ANCHOR_SPECIES: Record<string, string> = {
  ONIX: "onix",
  MAGBY: "magby",
  BAYLEEF: "bayleef",
  BUTTERFREE: "butterfree",
  HAUNTER: "haunter",
  QUILAVA: "quilava",
};

const sprites: Record<string, {
  tileset: { columns: number; rows: number; tiles: number[][] };
  animationFrame1: { columns: number; rows: number; tiles: number[][] };
  palette: { r: number; g: number; b: number }[];
}> = {};

for (const [species, dir] of Object.entries(ANCHOR_SPECIES)) {
  const speciesDir = join(REF, "graphics", "pokemon", dir);
  const frontImage = decodeIndexedPng(join(speciesDir, "front.png"));
  if (frontImage.width !== 64 || frontImage.height !== 64) {
    throw new Error(`${species}: expected a 64x64 front pic, got ${frontImage.width}x${frontImage.height}`);
  }
  const { columns, rows, tiles } = sliceTiles(frontImage);
  const animationImage = decodeIndexedPng(join(speciesDir, "anim_front.png"));
  if (animationImage.width !== 64 || animationImage.height !== 128) {
    throw new Error(`${species}: expected a 64x128 anim front pic, got ${animationImage.width}x${animationImage.height}`);
  }
  const frame1Image = {
    ...animationImage,
    height: 64,
    indices: animationImage.indices.slice(64 * 64),
  };
  const animationFrame1 = sliceTiles(frame1Image);
  const palette = loadJascPal(join(speciesDir, "normal.pal"));
  sprites[species] = {
    tileset: { columns, rows, tiles: tiles.map((t) => [...t.pixels]) },
    animationFrame1: {
      columns: animationFrame1.columns,
      rows: animationFrame1.rows,
      tiles: animationFrame1.tiles.map((t) => [...t.pixels]),
    },
    palette,
  };
}

const outPath = join(ASSETS_GEN, "front-sprites.json");
writeFileSync(outPath, `${JSON.stringify(sprites)}\n`);
console.log(`wrote ${outPath}`);
