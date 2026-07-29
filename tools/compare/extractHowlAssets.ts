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
  : join(root, "src/animation/assets/howl.json");

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
      "FRONTIER_MON_LOUDRED set 144; SPECIES_LOUDRED 371; MOVE_HOWL 336; challenge 0",
    loudredBack:
      "graphics/pokemon/loudred/back.png + graphics/pokemon/loudred/normal.pal",
    loudredFront:
      "graphics/pokemon/loudred/anim_front.png frame 0 + graphics/pokemon/loudred/normal.pal",
    noiseLine:
      "graphics/battle_anims/sprites/noise_line.png; ANIM_TAG_NOISE_LINE; gRoarNoiseLineSpriteTemplate",
  },
  loudredBack: sprite(
    "graphics/pokemon/loudred/back.png",
    "graphics/pokemon/loudred/normal.pal",
  ),
  loudredFront: sprite(
    "graphics/pokemon/loudred/anim_front.png",
    "graphics/pokemon/loudred/normal.pal",
  ),
  noiseLine: sprite("graphics/battle_anims/sprites/noise_line.png"),
})}\n`);
console.log(`wrote ${out}`);
