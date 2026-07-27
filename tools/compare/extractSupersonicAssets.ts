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
    loudredBack: "graphics/pokemon/loudred/back.png; gMonBackPic_Loudred",
    loudredFront: "graphics/pokemon/loudred/anim_front.png; gMonFrontPic_Loudred resting frame 0",
  },
  goldRing: sprite("graphics/battle_anims/sprites/gold_ring.png"),
  loudredBack: sprite(
    "graphics/pokemon/loudred/back.png",
    "graphics/pokemon/loudred/normal.pal",
  ),
  loudredFront: sprite(
    "graphics/pokemon/loudred/anim_front.png",
    "graphics/pokemon/loudred/normal.pal",
  ),
})}\n`);
console.log(`wrote ${out}`);
