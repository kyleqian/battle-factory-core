import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { loadJascPal } from "../extract/jascPal.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const outFlag = process.argv.indexOf("--out");
const out = outFlag >= 0 && process.argv[outFlag + 1]
  ? resolve(process.argv[outFlag + 1]!)
  : join(root, "src/animation/assets/covet.json");

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
    carrier:
      "FRONTIER_MON_LINOONE_1 set 203; SPECIES_LINOONE 289; complete legal parties",
    script:
      "Move_COVET loads ANIM_TAG_MAGENTA_HEART and ANIM_TAG_ITEM_BAG; creates no ITEM_BAG sprite",
    itemBag:
      "graphics/battle_anims/sprites/item_bag.png; ANIM_TAG_ITEM_BAG 10224",
  },
  linooneBack: sprite(
    "graphics/pokemon/linoone/back.png",
    "graphics/pokemon/linoone/normal.pal",
  ),
  linooneFront: sprite(
    "graphics/pokemon/linoone/anim_front.png",
    "graphics/pokemon/linoone/normal.pal",
  ),
  itemBag: sprite("graphics/battle_anims/sprites/item_bag.png"),
})}\n`);
console.log(`wrote ${out}`);
