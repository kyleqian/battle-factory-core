// Dev-time extractor: party-menu mon icons for turn 15's forced-switch
// party-select screen (docs/party-menu-notes.md). Same convention as
// extract-front-sprites.ts: reads reference/pokeemerald's own icon.png per
// species and writes a committed, decoded artifact under src/assets/gen/.
//
// icon.png is 32x64 - two stacked 32x32 bitmap frames (top=frame0,
// bottom=frame1), confirmed against sSpriteImageSizes[32x32]=512B/frame in
// reference/pokeemerald/src/pokemon_icon.c. Palette comes from the icon's
// own embedded PLTE chunk (decodeIndexedPng reads it directly) - confirmed
// byte-identical to the authoritative shared table
// (graphics/pokemon/icon_palettes/icon_palette_<gMonIconPaletteIndices[species]>.pal)
// for all three species needed here (species -> palette index: ONIX=2,
// MAGBY=1, BAYLEEF=1, reference/pokeemerald/src/pokemon_icon.c
// gMonIconPaletteIndices).
//
// Run with:
//   node --experimental-strip-types tools/extract/extract-party-mon-icons.ts
//
// Never imported at runtime - the production build only reads its JSON output.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "./indexedPng.ts";
import { sliceTiles } from "./tiles.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_ROOT = join(HERE, "..", "..");
const REF = join(RUN_ROOT, "reference", "pokeemerald");
const ASSETS_GEN = join(RUN_ROOT, "src", "assets", "gen");

mkdirSync(ASSETS_GEN, { recursive: true });

// species display name -> reference repo's graphics/pokemon/<dir>/ directory
// name. Just the three this turn's party-select screen needs (ONIX/MAGBY/
// BAYLEEF) - add more species here if a future session needs them.
const ICON_SPECIES: Record<string, string> = {
  ONIX: "onix",
  MAGBY: "magby",
  BAYLEEF: "bayleef",
};

interface Tileset { columns: number; rows: number; tiles: number[][] }
const icons: Record<string, { frame0: Tileset; frame1: Tileset; palette: { r: number; g: number; b: number }[] }> = {};

for (const [species, dir] of Object.entries(ICON_SPECIES)) {
  const speciesDir = join(REF, "graphics", "pokemon", dir);
  const image = decodeIndexedPng(join(speciesDir, "icon.png"));
  if (image.width !== 32 || image.height !== 64) {
    throw new Error(`${species}: expected a 32x64 icon (2 stacked 32x32 frames), got ${image.width}x${image.height}`);
  }
  const { columns, tiles } = sliceTiles(image); // 4 columns x 8 rows of 8x8 tiles
  const frame0Tiles = tiles.slice(0, 16); // rows 0-3: top 32x32 (frame 0)
  const frame1Tiles = tiles.slice(16, 32); // rows 4-7: bottom 32x32 (frame 1)
  icons[species] = {
    frame0: { columns, rows: 4, tiles: frame0Tiles.map((t) => [...t.pixels]) },
    frame1: { columns, rows: 4, tiles: frame1Tiles.map((t) => [...t.pixels]) },
    palette: image.palette,
  };
}

const outPath = join(ASSETS_GEN, "party-mon-icons.json");
writeFileSync(outPath, `${JSON.stringify(icons)}\n`);
console.log(`wrote ${outPath} (${Object.keys(icons).length} species, 2 frames each)`);
