import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const source = join(root, "reference/pokeemerald/graphics/battle_anims/sprites/pain_split.png");
const outFlag = process.argv.indexOf("--out");
const out = outFlag >= 0 && process.argv[outFlag + 1]
  ? resolve(process.argv[outFlag + 1]!)
  : join(root, "src/animation/assets/pain-split.json");
const image = decodeIndexedPng(source);
const sheet = sliceTiles(image);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    carrier: "FRONTIER_MON_MISDREAVUS_1 set 374; MOVE_PAIN_SPLIT 220",
    projectile: "graphics/battle_anims/sprites/pain_split.png; ANIM_TAG_PAIN_SPLIT",
  },
  projectile: {
    tileset: { columns: sheet.columns, rows: sheet.rows,
      tiles: sheet.tiles.map((tile) => [...tile.pixels]) },
    palette: image.palette,
  },
})}\n`);
console.log(`wrote ${out}`);
