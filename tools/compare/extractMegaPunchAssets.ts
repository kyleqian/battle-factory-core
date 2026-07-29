import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { loadJascPal } from "../extract/jascPal.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const outArg = process.argv.indexOf("--out");
const out = outArg >= 0
  ? resolve(process.argv[outArg + 1]!)
  : join(root, "src/animation/assets/megaPunch.json");

function sprite(path: string, palettePath: string) {
  const image = decodeIndexedPng(join(ref, path));
  const sliced = sliceTiles(image);
  return {
    tileset: {
      columns: sliced.columns,
      rows: sliced.rows,
      tiles: sliced.tiles.map((tile) => [...tile.pixels]),
    },
    palette: loadJascPal(join(ref, palettePath)),
  };
}

const cacturneFront = sprite(
  "graphics/pokemon/cacturne/anim_front.png",
  "graphics/pokemon/cacturne/normal.pal",
);
cacturneFront.tileset = {
  columns: 8,
  rows: 8,
  tiles: cacturneFront.tileset.tiles.slice(0, 64),
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    carrier:
      "FRONTIER_MON_CACTURNE_1 set 254; SPECIES_CACTURNE 345; "
      + "MOVE_MEGA_PUNCH 5; challenge 1",
    cacturneBack:
      "graphics/pokemon/cacturne/back.png + graphics/pokemon/cacturne/normal.pal",
    cacturneFront:
      "graphics/pokemon/cacturne/anim_front.png frame 0 + "
      + "graphics/pokemon/cacturne/normal.pal",
  },
  cacturneBack: sprite(
    "graphics/pokemon/cacturne/back.png",
    "graphics/pokemon/cacturne/normal.pal",
  ),
  cacturneFront,
})}\n`);
console.log(`wrote ${out}`);
