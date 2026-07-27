// Reproducible dev-time extraction for MOVE_ACID's source sprite tag and
// real Level-50 Factory carrier chrome.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { loadJascPal } from "../extract/jascPal.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const out = join(root, "src/animation/assets/acid.json");

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
    poisonBubble: "graphics/battle_anims/sprites/poison_bubble.png; ANIM_TAG_POISON_BUBBLE",
    ekansBack: "graphics/pokemon/ekans/back.png; real Factory set-53 Acid carrier",
    ekansFront: "graphics/pokemon/ekans/anim_front.png; real Factory set-53 Acid carrier resting frame 0",
  },
  poisonBubble: sprite("graphics/battle_anims/sprites/poison_bubble.png"),
  ekansBack: sprite(
    "graphics/pokemon/ekans/back.png",
    "graphics/pokemon/ekans/normal.pal",
  ),
  ekansFront: sprite(
    "graphics/pokemon/ekans/anim_front.png",
    "graphics/pokemon/ekans/normal.pal",
  ),
})}\n`);
console.log(`wrote ${out}`);
