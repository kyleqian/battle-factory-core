// Reproducible source extraction for MOVE_POISON_FANG's shared fang and poison-bubble tags
// and its real Level-50 Factory set-25 carrier.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { loadJascPal } from "../extract/jascPal.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const out = join(root, "src/animation/assets/poisonFang.json");

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
    fang:
      "graphics/battle_anims/sprites/fang_attack.png; ANIM_TAG_FANG_ATTACK; gFangSpriteTemplate",
    poisonBubble:
      "graphics/battle_anims/sprites/poison_bubble.png; ANIM_TAG_POISON_BUBBLE; gSludgeProjectileSpriteTemplate frame 2 / gPoisonBubbleSpriteTemplate frame 0",
    zubatBack:
      "graphics/pokemon/zubat/back.png; FRONTIER_MON_ZUBAT set 25",
    zubatFront:
      "graphics/pokemon/zubat/anim_front.png frame 0; FRONTIER_MON_ZUBAT set 25",
  },
  fang: sprite("graphics/battle_anims/sprites/fang_attack.png"),
  poisonBubble: sprite("graphics/battle_anims/sprites/poison_bubble.png"),
  zubatBack: sprite(
    "graphics/pokemon/zubat/back.png",
    "graphics/pokemon/zubat/normal.pal",
  ),
  zubatFront: sprite(
    "graphics/pokemon/zubat/anim_front.png",
    "graphics/pokemon/zubat/normal.pal",
  ),
})}\n`);
console.log(`wrote ${out}`);
