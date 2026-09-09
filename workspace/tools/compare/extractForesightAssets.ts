// Reproducible dev-time extraction for MOVE_FORESIGHT's magnifying glass.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const outFlag = process.argv.indexOf("--out");
const out = outFlag >= 0 && process.argv[outFlag + 1]
  ? resolve(process.argv[outFlag + 1]!)
  : join(root, "src/animation/assets/foresight.json");
const image = decodeIndexedPng(join(
  root, "reference/pokeemerald/graphics/battle_anims/sprites/magnifying_glass.png",
));
const sliced = sliceTiles(image);

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    magnifyingGlass: "graphics/battle_anims/sprites/magnifying_glass.png; gForesightMagnifyingGlassSpriteTemplate; ANIM_TAG_MAGNIFYING_GLASS",
  },
  magnifyingGlass: {
    tileset: { columns: sliced.columns, rows: sliced.rows,
      tiles: sliced.tiles.map((tile) => [...tile.pixels]) },
    palette: image.palette,
  },
})}\n`);
console.log(`wrote ${out}`);
