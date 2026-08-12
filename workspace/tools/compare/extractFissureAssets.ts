import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { parseTilemap } from "../extract/tilemap.ts";
import { sliceTiles } from "../extract/tiles.ts";
import { readFileSync } from "node:fs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const outFlag = process.argv.indexOf("--out");
const out = outFlag >= 0 && process.argv[outFlag + 1]
  ? resolve(process.argv[outFlag + 1]!)
  : join(root, "src/animation/assets/fissure.json");

const image = decodeIndexedPng(join(
  ref,
  "graphics/battle_anims/backgrounds/fissure.png",
));
const sliced = sliceTiles(image);
const rawTilemap = parseTilemap(readFileSync(join(
  ref,
  "graphics/battle_anims/backgrounds/fissure.bin",
)), 64, 32);
// A 512x256 text BG is two adjacent 32x32 screenblocks in VRAM. The .bin
// stores each complete screenblock contiguously rather than as flat 64-wide
// rows, so normalize it to the renderer's row-major Tilemap contract.
const tilemap = {
  ...rawTilemap,
  entries: Array.from({ length: 64 * 32 }, (_, index) => {
    const x = index % 64;
    const y = Math.floor(index / 64);
    return rawTilemap.entries[(x >= 32 ? 32 * 32 : 0) + y * 32 + (x % 32)]!;
  }),
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    dirtPlume:
      "ANIM_TAG_MUD_SAND; source-identical src/assets/gen/battle-anim-mud-sand.json from tools/extract/extract-sandattack-dirt.ts",
    background:
      "graphics/battle_anims/backgrounds/fissure.png + fissure.bin; BG_FISSURE",
  },
  background: {
    tileset: {
      columns: sliced.columns,
      rows: sliced.rows,
      tiles: sliced.tiles.map((tile) => [...tile.pixels]),
    },
    palette: image.palette,
    tilemap,
  },
})}\n`);
console.log(`wrote ${out}`);
