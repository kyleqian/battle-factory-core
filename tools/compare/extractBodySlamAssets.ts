// Reproducible source extraction for MOVE_BODY_SLAM's legal Level-50
// LICKITUNG carrier. IMPACT is reused from the shared source-generated asset.
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
  : join(root, "src/animation/assets/body-slam.json");

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
    carrier:
      "FRONTIER_MON_LICKITUNG_1 set 269; SPECIES_LICKITUNG 108; complete legal parties",
    back:
      "graphics/pokemon/lickitung/back.png + graphics/pokemon/lickitung/normal.pal",
    front:
      "graphics/pokemon/lickitung/anim_front.png frame 0 + graphics/pokemon/lickitung/normal.pal",
    reused:
      "ANIM_TAG_IMPACT from src/assets/gen/battle-anim-hitsplat.json, generated from graphics/battle_anims/sprites/impact.png",
  },
  lickitungBack: sprite(
    "graphics/pokemon/lickitung/back.png",
    "graphics/pokemon/lickitung/normal.pal",
  ),
  lickitungFront: sprite(
    "graphics/pokemon/lickitung/anim_front.png",
    "graphics/pokemon/lickitung/normal.pal",
  ),
})}\n`);
console.log(`wrote ${out}`);
