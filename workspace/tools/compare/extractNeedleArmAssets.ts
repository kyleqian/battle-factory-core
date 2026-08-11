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
  : join(root, "src/animation/assets/needle-arm.json");

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
    cacneaBack: "graphics/pokemon/cacnea/back.png; FRONTIER_MON_CACNEA set 125; SPECIES_CACNEA 344",
    cacneaFront: "graphics/pokemon/cacnea/anim_front.png frame 0; FRONTIER_MON_CACNEA set 125; SPECIES_CACNEA 344",
    greenSpike: "graphics/battle_anims/sprites/green_spike.png; ANIM_TAG_GREEN_SPIKE; gNeedleArmSpikeSpriteTemplate",
  },
  cacneaBack: sprite(
    "graphics/pokemon/cacnea/back.png",
    "graphics/pokemon/cacnea/normal.pal",
  ),
  cacneaFront: sprite(
    "graphics/pokemon/cacnea/anim_front.png",
    "graphics/pokemon/cacnea/normal.pal",
  ),
  greenSpike: sprite("graphics/battle_anims/sprites/green_spike.png"),
})}\n`);
console.log(`wrote ${out}`);
