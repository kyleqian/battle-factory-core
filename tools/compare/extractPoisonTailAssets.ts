// Reproducible source extraction for Poison Tail's shared art and the real
// Level-50 Factory SEVIPER set-239 carrier.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { loadJascPal } from "../extract/jascPal.ts";
import { sliceTiles } from "../extract/tiles.ts";
import { parseTilemap } from "../extract/tilemap.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const out = join(root, "src/animation/assets/poisonTail.json");
function sprite(path: string, palettePath?: string) {
  const image = decodeIndexedPng(join(ref, path));
  const sliced = sliceTiles(image);
  return {
    tileset: { columns: sliced.columns, rows: sliced.rows,
      tiles: sliced.tiles.map((tile) => [...tile.pixels]) },
    palette: palettePath ? loadJascPal(join(ref, palettePath)) : image.palette,
  };
}
const metal = sprite("graphics/battle_anims/masks/metal_shine.png");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    metal: "graphics/battle_anims/masks/metal_shine.png + metal_shine.bin",
    impact: "graphics/battle_anims/sprites/impact.png; ANIM_TAG_IMPACT",
    poisonBubble: "graphics/battle_anims/sprites/poison_bubble.png; ANIM_TAG_POISON_BUBBLE",
    seviperBack: "graphics/pokemon/seviper/back.png; FRONTIER_MON_SEVIPER_1 set 239",
    seviperFront: "graphics/pokemon/seviper/anim_front.png frame 0; FRONTIER_MON_SEVIPER_1 set 239",
  },
  metal: { ...metal, tilemap: parseTilemap(
    readFileSync(join(ref, "graphics/battle_anims/masks/metal_shine.bin")), 32, 32,
  ) },
  impact: sprite("graphics/battle_anims/sprites/impact.png"),
  poisonBubble: sprite("graphics/battle_anims/sprites/poison_bubble.png"),
  seviperBack: sprite("graphics/pokemon/seviper/back.png", "graphics/pokemon/seviper/normal.pal"),
  seviperFront: sprite("graphics/pokemon/seviper/anim_front.png", "graphics/pokemon/seviper/normal.pal"),
})}\n`);
console.log(`wrote ${out}`);
