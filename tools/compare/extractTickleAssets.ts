// Reproducible source extraction for MOVE_TICKLE's legal set-138 OMANYTE
// carrier and its EYE_SPARKLE tag. ONIX/chrome remain shared exact assets.
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
  : join(root, "src/animation/assets/tickle.json");

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
    omanyteBack:
      "graphics/pokemon/omanyte/back.png; FRONTIER_MON_OMANYTE set 138; SPECIES_OMANYTE 139",
    omanyteFront:
      "graphics/pokemon/omanyte/anim_front.png frame 0; FRONTIER_MON_OMANYTE set 138; SPECIES_OMANYTE 139",
    target: "reuse generated ONIX front/back exact battle assets",
    eyeSparkle:
      "graphics/battle_anims/sprites/eye_sparkle.png; ANIM_TAG_EYE_SPARKLE; gEyeSparkleSpriteTemplate",
  },
  omanyteBack: sprite(
    "graphics/pokemon/omanyte/back.png",
    "graphics/pokemon/omanyte/normal.pal",
  ),
  omanyteFront: sprite(
    "graphics/pokemon/omanyte/anim_front.png",
    "graphics/pokemon/omanyte/normal.pal",
  ),
  eyeSparkle: sprite("graphics/battle_anims/sprites/eye_sparkle.png"),
})}\n`);
console.log(`wrote ${out}`);
