// Dev-time, source-only extractor for the psychic-family opposite orientation.
// Keeps the runtime asset animation-owned instead of widening shared catalogs.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { loadJascPal } from "../extract/jascPal.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const speciesDir = join(root, "reference/pokeemerald/graphics/pokemon/kadabra");
const output = join(root, "src/animation/assets/kadabra-front.json");

const animated = decodeIndexedPng(join(speciesDir, "anim_front.png"));
if (animated.width !== 64 || animated.height !== 128) {
  throw new Error(`KADABRA anim_front.png must be 64x128, got ${animated.width}x${animated.height}`);
}

const stacked = sliceTiles(animated);
const columns = stacked.columns;
const rows = stacked.rows / 2;
const frameTiles = columns * rows;

const tileset = (tiles: typeof stacked.tiles) => ({
  columns,
  rows,
  tiles: tiles.map((tile) => [...tile.pixels]),
});
const asset = {
  source: {
    frontCoords: { width: 56, height: 56, yOffset: 5 },
    frameProgram: [
      { frame: 0, duration: 12 },
      { frame: 1, duration: 45 },
      { frame: 0, duration: 15 },
    ],
    frontAnimFamily: "ANIM_GROW_VIBRATE",
  },
  tileset: tileset(stacked.tiles.slice(0, frameTiles)),
  frame2: tileset(stacked.tiles.slice(frameTiles)),
  palette: loadJascPal(join(speciesDir, "normal.pal")),
};

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(asset)}\n`);
console.log(`wrote ${output}`);
