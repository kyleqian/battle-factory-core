/** Reproducible extraction for Seismic Toss's BG_IN_AIR source asset. */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { parseTilemap } from "../extract/tilemap.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(import.meta.dirname, "../..");
const ref = join(root, "reference/pokeemerald");
const image = decodeIndexedPng(join(ref, "graphics/battle_anims/backgrounds/in_air.png"));
const sliced = sliceTiles(image);
const map = parseTilemap(readFileSync(join(ref,
  "graphics/battle_anims/backgrounds/in_air.bin")), 32, 32);
const outFlag = process.argv.indexOf("--out");
const out = outFlag >= 0 && process.argv[outFlag + 1]
  ? resolve(process.argv[outFlag + 1]!)
  : join(root, "src/animation/assets/seismic-toss.json");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: "BG_IN_AIR: graphics/battle_anims/backgrounds/in_air.png + in_air.bin",
  background: { tileset: { columns: sliced.columns, rows: sliced.rows,
    tiles: sliced.tiles.map((tile) => [...tile.pixels]) }, palette: image.palette,
  tilemap: { ...map, entries: map.entries.map((entry) => ({ ...entry, palette: 0 })) } },
})}\n`);
console.log(`wrote ${out}`);
