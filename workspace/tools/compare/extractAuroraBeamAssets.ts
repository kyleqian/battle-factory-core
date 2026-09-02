/** Reproducible dev-time extraction for Aurora Beam's BG and rainbow-ring OBJ. */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { parseTilemap } from "../extract/tilemap.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(import.meta.dirname, "../..");
const ref = join(root, "reference/pokeemerald");
const outFlag = process.argv.indexOf("--out");
const out = outFlag >= 0 && process.argv[outFlag + 1]
  ? resolve(process.argv[outFlag + 1]!)
  : join(root, "src/animation/assets/aurora-beam.json");

function indexed(path: string) {
  const image = decodeIndexedPng(join(ref, path));
  const sliced = sliceTiles(image);
  return {
    tileset: { columns: sliced.columns, rows: sliced.rows,
      tiles: sliced.tiles.map((tile) => [...tile.pixels]) },
    palette: image.palette,
  };
}

const background = indexed("graphics/battle_anims/backgrounds/aurora.png");
const rings = indexed("graphics/battle_anims/sprites/rainbow_rings.png");
const map = parseTilemap(readFileSync(join(
  ref, "graphics/battle_anims/backgrounds/aurora.bin",
)), 32, 32);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    background: "graphics/battle_anims/backgrounds/aurora.png + aurora.bin",
    rings: "graphics/battle_anims/sprites/rainbow_rings.png; ANIM_TAG_RAINBOW_RINGS",
  },
  background: { ...background, tilemap: {
    ...map, entries: map.entries.map((entry) => ({ ...entry, palette: 0 })),
  } },
  rings,
})}\n`);
console.log(`wrote ${out}`);
