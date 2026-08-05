// Reproducible source extraction for MOVE_BULK_UP's legal Level-50 Factory
// carrier FRONTIER_MON_PRIMEAPE_2 (set 337, SPECIES_PRIMEAPE). The ANIM_TAG
// _BREATH sprite is shared source-identical with the accepted SWAGGER asset
// (graphics/battle_anims/sprites/breath.png), so it is not duplicated here.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { loadJascPal } from "../extract/jascPal.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const out = join(root, "src/animation/assets/bulk-up.json");

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
    primeapeBack:
      "graphics/pokemon/primeape/back.png; FRONTIER_MON_PRIMEAPE_2 set 337",
    primeapeFront:
      "graphics/pokemon/primeape/anim_front.png frame 0; FRONTIER_MON_PRIMEAPE_2 set 337",
    breath:
      "graphics/battle_anims/sprites/breath.png; ANIM_TAG_BREATH; gBreathPuffSpriteTemplate (shared with SWAGGER)",
  },
  primeapeBack: sprite(
    "graphics/pokemon/primeape/back.png",
    "graphics/pokemon/primeape/normal.pal",
  ),
  primeapeFront: sprite(
    "graphics/pokemon/primeape/anim_front.png",
    "graphics/pokemon/primeape/normal.pal",
  ),
})}\n`);
console.log(`wrote ${out}`);
