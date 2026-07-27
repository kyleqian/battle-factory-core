// Reproducible source extraction for MOVE_SLUDGE's shared poison-bubble tag
// and its real Level-50 Factory set-110 carrier.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { loadJascPal } from "../extract/jascPal.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const out = join(root, "src/animation/assets/sludge.json");

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
      "graphics/battle_anims/sprites/poison_bubble.png; ANIM_TAG_POISON_BUBBLE; gSludgeProjectileSpriteTemplate frame 2 / gPoisonBubbleSpriteTemplate frame 0",
    grimerBack:
      "graphics/pokemon/grimer/back.png; FRONTIER_MON_GRIMER_1 set 110",
    grimerFront:
      "graphics/pokemon/grimer/anim_front.png frame 0; FRONTIER_MON_GRIMER_1 set 110",
  },
  poisonBubble: sprite("graphics/battle_anims/sprites/poison_bubble.png"),
  grimerBack: sprite(
    "graphics/pokemon/grimer/back.png",
    "graphics/pokemon/grimer/normal.pal",
  ),
  grimerFront: sprite(
    "graphics/pokemon/grimer/anim_front.png",
    "graphics/pokemon/grimer/normal.pal",
  ),
})}\n`);
console.log(`wrote ${out}`);
