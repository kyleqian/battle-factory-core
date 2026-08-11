// Reproducible source extraction for MOVE_WHIRLWIND's lowest legal
// Level-50 Factory carrier and ANIM_TAG_WHIRLWIND_LINES.
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
  : join(root, "src/animation/assets/whirlwind.json");

function sprite(path: string, palettePath?: string) {
  const image = decodeIndexedPng(join(ref, path));
  const sliced = sliceTiles(image);
  return {
    tileset: {
      columns: sliced.columns,
      rows: sliced.rows,
      tiles: sliced.tiles.map((tile) => [...tile.pixels]),
    },
    palette: palettePath
      ? loadJascPal(join(ref, palettePath))
      : image.palette,
  };
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    carrier:
      "FRONTIER_MON_BUTTERFREE set 153; SPECIES_BUTTERFREE 12; complete legal parties",
    back:
      "graphics/pokemon/butterfree/back.png + graphics/pokemon/butterfree/normal.pal",
    front:
      "graphics/pokemon/butterfree/anim_front.png frame 0 + graphics/pokemon/butterfree/normal.pal",
    whirlwindLines:
      "graphics/battle_anims/sprites/whirlwind_lines.png; ANIM_TAG_WHIRLWIND_LINES",
  },
  butterfreeBack: sprite(
    "graphics/pokemon/butterfree/back.png",
    "graphics/pokemon/butterfree/normal.pal",
  ),
  butterfreeFront: sprite(
    "graphics/pokemon/butterfree/anim_front.png",
    "graphics/pokemon/butterfree/normal.pal",
  ),
  whirlwindLines: sprite(
    "graphics/battle_anims/sprites/whirlwind_lines.png",
  ),
})}\n`);
console.log(`wrote ${out}`);
