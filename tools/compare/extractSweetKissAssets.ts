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
  : join(root, "src/animation/assets/sweet-kiss.json");

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
      "FRONTIER_MON_LUVDISC set 123; SPECIES_LUVDISC 325; MOVE_SWEET_KISS 186; challenge 0",
    luvdiscBack:
      "graphics/pokemon/luvdisc/back.png + graphics/pokemon/luvdisc/normal.pal",
    luvdiscFront:
      "graphics/pokemon/luvdisc/anim_front.png frame 0 + graphics/pokemon/luvdisc/normal.pal",
    redHeart:
      "graphics/battle_anims/sprites/magenta_heart.png + red_heart.pal; ANIM_TAG_RED_HEART",
    angel:
      "graphics/battle_anims/sprites/angel.png; ANIM_TAG_ANGEL",
  },
  luvdiscBack: sprite(
    "graphics/pokemon/luvdisc/back.png",
    "graphics/pokemon/luvdisc/normal.pal",
  ),
  luvdiscFront: sprite(
    "graphics/pokemon/luvdisc/anim_front.png",
    "graphics/pokemon/luvdisc/normal.pal",
  ),
  redHeart: sprite(
    "graphics/battle_anims/sprites/magenta_heart.png",
    "graphics/battle_anims/sprites/red_heart.pal",
  ),
  angel: sprite("graphics/battle_anims/sprites/angel.png"),
})}\n`);
console.log(`wrote ${out}`);
