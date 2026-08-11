// Reproducible source extraction for Dragon Claw and Factory set-412 ALTARIA.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { loadJascPal } from "../extract/jascPal.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const out = join(root, "src/animation/assets/dragon-claw.json");

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
    smallEmber: "graphics/battle_anims/sprites/small_ember.png; ANIM_TAG_SMALL_EMBER / gFireSpinSpriteTemplate",
    clawSlash: "graphics/battle_anims/sprites/claw_slash.png; ANIM_TAG_CLAW_SLASH / gClawSlashSpriteTemplate",
    altariaBack: "graphics/pokemon/altaria/back.png; real Factory set-412 DRAGON CLAW carrier",
    altariaFront: "graphics/pokemon/altaria/anim_front.png frame 0; real Factory set-412 DRAGON CLAW carrier",
  },
  smallEmber: sprite("graphics/battle_anims/sprites/small_ember.png"),
  clawSlash: sprite("graphics/battle_anims/sprites/claw_slash.png"),
  altariaBack: sprite(
    "graphics/pokemon/altaria/back.png",
    "graphics/pokemon/altaria/normal.pal",
  ),
  altariaFront: sprite(
    "graphics/pokemon/altaria/anim_front.png",
    "graphics/pokemon/altaria/normal.pal",
  ),
})}\n`);
console.log(`wrote ${out}`);
