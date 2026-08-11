// Reproducible source extraction for legal Factory set-44 Taillow and
// ANIM_TAG_FOCUS_ENERGY. No ROM, oracle, or recorded framebuffer is used.
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
  : join(root, "src/animation/assets/focus-energy.json");

function sprite(path: string, palettePath?: string) {
  const image = decodeIndexedPng(join(ref, path));
  const tiles = sliceTiles(image);
  return {
    tileset: {
      columns: tiles.columns,
      rows: tiles.rows,
      tiles: tiles.tiles.map((tile) => [...tile.pixels]),
    },
    palette: palettePath ? loadJascPal(join(ref, palettePath)) : image.palette,
  };
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    taillowBack:
      "graphics/pokemon/taillow/back.png; FRONTIER_MON_TAILLOW set 44; SPECIES_TAILLOW 304",
    taillowFront:
      "graphics/pokemon/taillow/anim_front.png frame 0; FRONTIER_MON_TAILLOW set 44; SPECIES_TAILLOW 304",
    focusEnergy:
      "graphics/battle_anims/sprites/focus_energy.png; ANIM_TAG_FOCUS_ENERGY; gEndureEnergySpriteTemplate",
  },
  taillowBack: sprite(
    "graphics/pokemon/taillow/back.png",
    "graphics/pokemon/taillow/normal.pal",
  ),
  taillowFront: sprite(
    "graphics/pokemon/taillow/anim_front.png",
    "graphics/pokemon/taillow/normal.pal",
  ),
  focusEnergy: sprite("graphics/battle_anims/sprites/focus_energy.png"),
})}\n`);
console.log(`wrote ${out}`);
