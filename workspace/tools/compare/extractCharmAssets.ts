// Reproducible source extraction for MOVE_CHARM's exclusive loaded sprite tag.
// MINUN and SHUCKLE field assets are reused from the exact SPARK presentation.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const outFlag = process.argv.indexOf("--out");
const out = outFlag >= 0 && process.argv[outFlag + 1]
  ? resolve(process.argv[outFlag + 1]!)
  : join(root, "src/animation/assets/charm.json");

const image = decodeIndexedPng(
  join(ref, "graphics/battle_anims/sprites/magenta_heart.png"),
);
const sliced = sliceTiles(image);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    carrier:
      "FRONTIER_MON_MINUN_1 set 187; reuse src/animation/assets/encore.json MINUN back/front",
    target:
      "reuse src/animation/assets/selfDestruct.json SHUCKLE back/front",
    magentaHeart:
      "graphics/battle_anims/sprites/magenta_heart.png; ANIM_TAG_MAGENTA_HEART; gMagentaHeartSpriteTemplate",
  },
  magentaHeart: {
    tileset: {
      columns: sliced.columns,
      rows: sliced.rows,
      tiles: sliced.tiles.map((tile) => [...tile.pixels]),
    },
    palette: image.palette,
  },
})}\n`);
console.log(`wrote ${out}`);
