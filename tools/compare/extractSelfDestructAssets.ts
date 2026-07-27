// Reproducible source extraction for MOVE_SELF_DESTRUCT and its real
// Level-50 Factory set-298 SUDOWOODO carrier.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { loadJascPal } from "../extract/jascPal.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const out = join(root, "src/animation/assets/selfDestruct.json");

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
    explosion:
      "graphics/battle_anims/sprites/explosion.png; ANIM_TAG_EXPLOSION; gExplosionSpriteTemplate",
    sudowoodoBack:
      "graphics/pokemon/sudowoodo/back.png; FRONTIER_MON_SUDOWOODO_2 set 298",
    sudowoodoFront:
      "graphics/pokemon/sudowoodo/anim_front.png frame 0; FRONTIER_MON_SUDOWOODO_2 set 298",
  },
  explosion: sprite("graphics/battle_anims/sprites/explosion.png"),
  sudowoodoBack: sprite(
    "graphics/pokemon/sudowoodo/back.png",
    "graphics/pokemon/sudowoodo/normal.pal",
  ),
  sudowoodoFront: sprite(
    "graphics/pokemon/sudowoodo/anim_front.png",
    "graphics/pokemon/sudowoodo/normal.pal",
  ),
})}\n`);
console.log(`wrote ${out}`);
