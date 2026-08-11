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
  : join(root, "src/animation/assets/rollingKick.json");

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

const hitmonleeFront = sprite(
  "graphics/pokemon/hitmonlee/anim_front.png",
  "graphics/pokemon/hitmonlee/normal.pal",
);
hitmonleeFront.tileset = {
  columns: 8,
  rows: 8,
  tiles: hitmonleeFront.tileset.tiles.slice(0, 64),
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    carrier:
      "FRONTIER_MON_HITMONLEE_1 set 233; SPECIES_HITMONLEE 106; "
      + "MOVE_ROLLING_KICK 27; challenge 1",
    hitmonleeBack:
      "graphics/pokemon/hitmonlee/back.png + "
      + "graphics/pokemon/hitmonlee/normal.pal",
    hitmonleeFront:
      "graphics/pokemon/hitmonlee/anim_front.png frame 0 + "
      + "graphics/pokemon/hitmonlee/normal.pal",
  },
  hitmonleeBack: sprite(
    "graphics/pokemon/hitmonlee/back.png",
    "graphics/pokemon/hitmonlee/normal.pal",
  ),
  hitmonleeFront,
})}\n`);
console.log(`wrote ${out}`);
