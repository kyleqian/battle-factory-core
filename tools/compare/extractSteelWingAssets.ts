import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { loadJascPal } from "../extract/jascPal.ts";
import { sliceTiles } from "../extract/tiles.ts";
import { parseTilemap } from "../extract/tilemap.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const out = join(root, "src/animation/assets/steel-wing.json");
function sprite(path: string, palettePath?: string) {
  const image = decodeIndexedPng(join(ref, path));
  const sliced = sliceTiles(image);
  return { tileset: { columns: sliced.columns, rows: sliced.rows,
    tiles: sliced.tiles.map((tile) => [...tile.pixels]) },
    palette: palettePath ? loadJascPal(join(ref, palettePath)) : image.palette };
}
const metal = sprite("graphics/battle_anims/masks/metal_shine.png");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    gust: "graphics/battle_anims/sprites/gust.png; ANIM_TAG_GUST",
    impact: "graphics/battle_anims/sprites/impact.png; ANIM_TAG_IMPACT",
    wingull: "graphics/pokemon/wingull/{back.png,anim_front.png,normal.pal}; FRONTIER_MON_WINGULL record 45",
    metal: "graphics/battle_anims/masks/metal_shine.png + metal_shine.bin",
  },
  gust: sprite("graphics/battle_anims/sprites/gust.png"),
  impact: sprite("graphics/battle_anims/sprites/impact.png"),
  metal: { ...metal, tilemap: parseTilemap(readFileSync(join(ref, "graphics/battle_anims/masks/metal_shine.bin")), 32, 32) },
  wingullBack: sprite("graphics/pokemon/wingull/back.png", "graphics/pokemon/wingull/normal.pal"),
  wingullFront: sprite("graphics/pokemon/wingull/anim_front.png", "graphics/pokemon/wingull/normal.pal"),
})}\n`);
console.log(`wrote ${out}`);
