// Reproducible source extraction for MOVE_RAZOR_LEAF's real challenge-0
// Factory set-165 WEEPINBELL carrier and both loaded leaf sprite tags.
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
  : join(root, "src/animation/assets/razorLeaf.json");

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
    weepinbellBack:
      "graphics/pokemon/weepinbell/back.png; FRONTIER_MON_WEEPINBELL_1 set 165; SPECIES_WEEPINBELL 70",
    weepinbellFront:
      "graphics/pokemon/weepinbell/anim_front.png frame 0; FRONTIER_MON_WEEPINBELL_1 set 165; SPECIES_WEEPINBELL 70",
    leaf:
      "graphics/battle_anims/sprites/leaf.png; ANIM_TAG_LEAF; gRazorLeafParticleSpriteTemplate",
    cutter:
      "graphics/battle_anims/sprites/razor_leaf.png; ANIM_TAG_RAZOR_LEAF; gRazorLeafCutterSpriteTemplate",
  },
  weepinbellBack: sprite(
    "graphics/pokemon/weepinbell/back.png",
    "graphics/pokemon/weepinbell/normal.pal",
  ),
  weepinbellFront: sprite(
    "graphics/pokemon/weepinbell/anim_front.png",
    "graphics/pokemon/weepinbell/normal.pal",
  ),
  leaf: sprite("graphics/battle_anims/sprites/leaf.png"),
  cutter: sprite("graphics/battle_anims/sprites/razor_leaf.png"),
})}\n`);
console.log(`wrote ${out}`);
