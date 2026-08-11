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
  : join(root, "src/animation/assets/spore.json");

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
      "FRONTIER_MON_PARASECT_2 set 282; SPECIES_PARASECT 47; MOVE_SPORE 147; challenge 2",
    parasectBack:
      "graphics/pokemon/parasect/back.png + graphics/pokemon/parasect/normal.pal",
    parasectFront:
      "graphics/pokemon/parasect/anim_front.png frame 0 + graphics/pokemon/parasect/normal.pal",
    spore:
      "graphics/battle_anims/sprites/spore.png; ANIM_TAG_SPORE",
  },
  parasectBack: sprite(
    "graphics/pokemon/parasect/back.png",
    "graphics/pokemon/parasect/normal.pal",
  ),
  parasectFront: sprite(
    "graphics/pokemon/parasect/anim_front.png",
    "graphics/pokemon/parasect/normal.pal",
  ),
  spore: sprite("graphics/battle_anims/sprites/spore.png"),
})}\n`);
console.log(`wrote ${out}`);
