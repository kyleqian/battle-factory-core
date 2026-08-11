// Reproducible assets for MOVE_SLUDGE_BOMB and Factory set-270 WEEPINBELL.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { loadJascPal } from "../extract/jascPal.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const out = join(root, "src/animation/assets/sludgeBomb.json");

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
    poisonBubble:
      "graphics/battle_anims/sprites/poison_bubble.png; ANIM_TAG_POISON_BUBBLE",
    weepinbellBack:
      "graphics/pokemon/weepinbell/back.png; FRONTIER_MON_WEEPINBELL_2 set 270",
    weepinbellFront:
      "graphics/pokemon/weepinbell/anim_front.png frame 0; FRONTIER_MON_WEEPINBELL_2 set 270",
  },
  poisonBubble: sprite("graphics/battle_anims/sprites/poison_bubble.png"),
  weepinbellBack: sprite(
    "graphics/pokemon/weepinbell/back.png",
    "graphics/pokemon/weepinbell/normal.pal",
  ),
  weepinbellFront: sprite(
    "graphics/pokemon/weepinbell/anim_front.png",
    "graphics/pokemon/weepinbell/normal.pal",
  ),
})}\n`);
console.log(`wrote ${out}`);
