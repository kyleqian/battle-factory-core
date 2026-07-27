// Reproducible source extraction for MOVE_EXPLOSION's real Level-50
// Factory set-495 GLALIE carrier. The shared explosion and SHUCKLE field
// assets stay owned by selfDestruct.json and are not duplicated here.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { loadJascPal } from "../extract/jascPal.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const out = join(root, "src/animation/assets/explosion.json");

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

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    glalieBack:
      "graphics/pokemon/glalie/back.png; FRONTIER_MON_GLALIE_4 set 495",
    glalieFront:
      "graphics/pokemon/glalie/anim_front.png frame 0; FRONTIER_MON_GLALIE_4 set 495",
  },
  glalieBack: sprite(
    "graphics/pokemon/glalie/back.png",
    "graphics/pokemon/glalie/normal.pal",
  ),
  glalieFront: sprite(
    "graphics/pokemon/glalie/anim_front.png",
    "graphics/pokemon/glalie/normal.pal",
  ),
})}\n`);
console.log(`wrote ${out}`);
