// Reproducible source extraction for MOVE_LUSTER_PURGE's unique particle.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { loadJascPal } from "../extract/jascPal.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const outAt = process.argv.indexOf("--out");
const output = outAt >= 0 && process.argv[outAt + 1]
  ? resolve(process.argv[outAt + 1]!)
  : join(root, "src/animation/assets/luster-purge.json");

const image = decodeIndexedPng(join(
  ref,
  "graphics/battle_anims/sprites/circle_of_light.png",
));
const sliced = sliceTiles(image);

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify({
  source: {
    circle:
      "graphics/battle_anims/sprites/circle_of_light.png + white_circle_of_light.pal; gLusterPurgeCircleSpriteTemplate; ANIM_TAG_WHITE_CIRCLE_OF_LIGHT",
  },
  circle: {
    tileset: {
      columns: sliced.columns,
      rows: sliced.rows,
      tiles: sliced.tiles.map((tile) => [...tile.pixels]),
    },
    palette: loadJascPal(join(
      ref,
      "graphics/battle_anims/sprites/white_circle_of_light.pal",
    )),
  },
})}\n`);
console.log(`wrote ${output}`);
