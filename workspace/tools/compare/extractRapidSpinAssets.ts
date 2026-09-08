// Reproducible source extraction for Rapid Spin's move-owned sprite sheet.
// ANIM_TAG_IMPACT is already source-derived in battle-anim-hitsplat.json.
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
  : join(root, "src/animation/assets/rapid-spin.json");

const image = decodeIndexedPng(join(
  ref,
  "graphics/battle_anims/sprites/rapid_spin.png",
));
const sliced = sliceTiles(image);

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    rapidSpin: "graphics/battle_anims/sprites/rapid_spin.png; gRapidSpinSpriteTemplate; ANIM_TAG_RAPID_SPIN",
    impact: "reuses src/assets/gen/battle-anim-hitsplat.json; gBasicHitSplatSpriteTemplate animation 2; ANIM_TAG_IMPACT",
  },
  rapidSpin: {
    tileset: {
      columns: sliced.columns,
      rows: sliced.rows,
      tiles: sliced.tiles.map((tile) => [...tile.pixels]),
    },
    palette: image.palette,
  },
})}\n`);
console.log(`wrote ${out}`);
