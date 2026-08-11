// Reproducible source extraction for legal Factory set-113 Eevee.
// FOCUS_ENERGY art is intentionally reused from the exact shared component.
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
  : join(root, "src/animation/assets/endure.json");

function sprite(path: string, palettePath: string) {
  const image = decodeIndexedPng(join(ref, path));
  const tiles = sliceTiles(image);
  return {
    tileset: {
      columns: tiles.columns,
      rows: tiles.rows,
      tiles: tiles.tiles.map((tile) => [...tile.pixels]),
    },
    palette: loadJascPal(join(ref, palettePath)),
  };
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    eeveeBack:
      "graphics/pokemon/eevee/back.png; FRONTIER_MON_EEVEE set 113; SPECIES_EEVEE 133",
    eeveeFront:
      "graphics/pokemon/eevee/anim_front.png frame 0; FRONTIER_MON_EEVEE set 113; SPECIES_EEVEE 133",
    focusEnergy:
      "shared source-exact src/animation/assets/focus-energy.json; ANIM_TAG_FOCUS_ENERGY; gEndureEnergySpriteTemplate",
  },
  eeveeBack: sprite(
    "graphics/pokemon/eevee/back.png",
    "graphics/pokemon/eevee/normal.pal",
  ),
  eeveeFront: sprite(
    "graphics/pokemon/eevee/anim_front.png",
    "graphics/pokemon/eevee/normal.pal",
  ),
})}\n`);
console.log(`wrote ${out}`);
