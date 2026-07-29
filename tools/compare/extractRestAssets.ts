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
  : join(root, "src/animation/assets/rest.json");

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
    teddiursaBack:
      "graphics/pokemon/teddiursa/back.png; FRONTIER_MON_TEDDIURSA set 117; SPECIES_TEDDIURSA 216",
    teddiursaFront:
      "graphics/pokemon/teddiursa/anim_front.png frame 0; FRONTIER_MON_TEDDIURSA set 117; SPECIES_TEDDIURSA 216",
    letterZ:
      "graphics/battle_anims/sprites/letter_z.png; ANIM_TAG_LETTER_Z; gSleepLetterZSpriteTemplate",
  },
  teddiursaBack: sprite(
    "graphics/pokemon/teddiursa/back.png",
    "graphics/pokemon/teddiursa/normal.pal",
  ),
  teddiursaFront: sprite(
    "graphics/pokemon/teddiursa/anim_front.png",
    "graphics/pokemon/teddiursa/normal.pal",
  ),
  letterZ: sprite("graphics/battle_anims/sprites/letter_z.png"),
})}\n`);
console.log(`wrote ${out}`);
