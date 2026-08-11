// Reproducible dev-time extraction for MOVE_SUPERSONIC's source sprites.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { loadJascPal } from "../extract/jascPal.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const out = join(root, "src/animation/assets/supersonic.json");

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
writeFileSync(out, `${JSON.stringify({
  source: {
    goldRing: "graphics/battle_anims/sprites/gold_ring.png; gSupersonicRingSpriteTemplate; ANIM_TAG_GOLD_RING",
    dustoxBack: "graphics/pokemon/dustox/back.png; mechanicLab route chrome for the Loudred RAM override",
    dustoxFront: "graphics/pokemon/dustox/anim_front.png; mechanicLab route chrome for the Loudred RAM override, resting frame 0",
  },
  goldRing: sprite("graphics/battle_anims/sprites/gold_ring.png"),
  dustoxBack: sprite(
    "graphics/pokemon/dustox/back.png",
    "graphics/pokemon/dustox/normal.pal",
  ),
  dustoxFront: sprite(
    "graphics/pokemon/dustox/anim_front.png",
    "graphics/pokemon/dustox/normal.pal",
  ),
})}\n`);
console.log(`wrote ${out}`);
