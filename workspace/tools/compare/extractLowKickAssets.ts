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
  : join(root, "src/animation/assets/lowKick.json");

function sprite(path: string, palettePath: string) {
  const sliced = sliceTiles(decodeIndexedPng(join(ref, path)));
  return {
    tileset: {
      columns: sliced.columns,
      rows: sliced.rows,
      tiles: sliced.tiles.map((tile) => [...tile.pixels]),
    },
    palette: loadJascPal(join(ref, palettePath)),
  };
}

const machokeFront = sprite(
  "graphics/pokemon/machoke/anim_front.png",
  "graphics/pokemon/machoke/normal.pal",
);
machokeFront.tileset = {
  columns: 8,
  rows: 8,
  tiles: machokeFront.tileset.tiles.slice(0, 64),
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    carrier:
      "FRONTIER_MON_MACHOKE_1 set 178; SPECIES_MACHOKE 67; "
      + "MOVE_LOW_KICK 67; challenge 1",
    machokeBack:
      "graphics/pokemon/machoke/back.png + graphics/pokemon/machoke/normal.pal",
    machokeFront:
      "graphics/pokemon/machoke/anim_front.png frame 0 + "
      + "graphics/pokemon/machoke/normal.pal",
  },
  machokeBack: sprite(
    "graphics/pokemon/machoke/back.png",
    "graphics/pokemon/machoke/normal.pal",
  ),
  machokeFront,
})}\n`);
console.log(`wrote ${out}`);
