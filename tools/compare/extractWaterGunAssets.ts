// Reproducible dev-time extraction for MOVE_WATER_GUN's two source tags.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const out = join(root, "src/animation/assets/water-gun.json");

function sprite(name: string) {
  const image = decodeIndexedPng(join(ref, `graphics/battle_anims/sprites/${name}.png`));
  const sliced = sliceTiles(image);
  return {
    tileset: {
      columns: sliced.columns,
      rows: sliced.rows,
      tiles: sliced.tiles.map((tile) => [...tile.pixels]),
    },
    palette: image.palette,
  };
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    smallBubbles: "graphics/battle_anims/sprites/small_bubbles.png; ANIM_TAG_SMALL_BUBBLES",
    waterImpact: "graphics/battle_anims/sprites/water_impact.png; ANIM_TAG_WATER_IMPACT",
  },
  smallBubbles: sprite("small_bubbles"),
  waterImpact: sprite("water_impact"),
})}\n`);
console.log(`wrote ${out}`);
