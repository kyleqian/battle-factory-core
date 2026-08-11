// Reproducible source extraction for MetallicShine and the real set-259 carrier.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { loadJascPal } from "../extract/jascPal.ts";
import { sliceTiles } from "../extract/tiles.ts";
import { parseTilemap } from "../extract/tilemap.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const out = join(root, "src/animation/assets/harden.json");

function sprite(path: string, palettePath?: string) {
  const image = decodeIndexedPng(join(ref, path));
  const sliced = sliceTiles(image);
  return {
    tileset: {
      columns: sliced.columns,
      rows: sliced.rows,
      tiles: sliced.tiles.map((tile) => [...tile.pixels]),
    },
    palette: palettePath ? loadJascPal(join(ref, palettePath)) : image.palette,
  };
}

mkdirSync(dirname(out), { recursive: true });
const metal = sprite("graphics/battle_anims/masks/metal_shine.png");
writeFileSync(out, `${JSON.stringify({
  source: {
    metal: "graphics/battle_anims/masks/metal_shine.png + metal_shine.bin; gMetalShineGfx/Palette/Tilemap",
    relicanthBack: "graphics/pokemon/relicanth/back.png; real Factory set-259 HARDEN carrier",
    relicanthFront: "graphics/pokemon/relicanth/anim_front.png; real Factory set-259 HARDEN carrier frame 0",
  },
  metal: {
    ...metal,
    tilemap: parseTilemap(
      readFileSync(join(ref, "graphics/battle_anims/masks/metal_shine.bin")),
      32,
      32,
    ),
  },
  relicanthBack: sprite(
    "graphics/pokemon/relicanth/back.png",
    "graphics/pokemon/relicanth/normal.pal",
  ),
  relicanthFront: sprite(
    "graphics/pokemon/relicanth/anim_front.png",
    "graphics/pokemon/relicanth/normal.pal",
  ),
})}\n`);
console.log(`wrote ${out}`);
