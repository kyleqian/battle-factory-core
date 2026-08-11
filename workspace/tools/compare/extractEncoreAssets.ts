// Reproducible source extraction for Encore and its real set-187 carrier.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { loadJascPal } from "../extract/jascPal.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const out = join(root, "src/animation/assets/encore.json");

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

const tagHand = sprite("graphics/battle_anims/sprites/tag_hand.png");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    spotlight: "graphics/battle_anims/sprites/spotlight.png; ANIM_TAG_SPOTLIGHT",
    clappingHand: "graphics/battle_anims/sprites/tag_hand.png tiles 16..31; ANIM_TAG_TAG_HAND",
    minunBack: "graphics/pokemon/minun/back.png; FRONTIER_MON_MINUN_1 set 187",
    minunFront: "graphics/pokemon/minun/anim_front.png frame 0; FRONTIER_MON_MINUN_1 set 187",
  },
  spotlight: sprite("graphics/battle_anims/sprites/spotlight.png"),
  clappingHand: {
    tileset: {
      columns: 4,
      rows: 4,
      tiles: tagHand.tileset.tiles.slice(16, 32),
    },
    palette: tagHand.palette,
  },
  minunBack: sprite(
    "graphics/pokemon/minun/back.png",
    "graphics/pokemon/minun/normal.pal",
  ),
  minunFront: sprite(
    "graphics/pokemon/minun/anim_front.png",
    "graphics/pokemon/minun/normal.pal",
  ),
})}\n`);
console.log(`wrote ${out}`);
