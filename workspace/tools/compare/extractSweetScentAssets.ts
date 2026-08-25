// Reproducible source extraction for MOVE_SWEET_SCENT's PINK_PETAL tag.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const reference = join(root, "reference/pokeemerald");
const outFlag = process.argv.indexOf("--out");
const output = outFlag >= 0 && process.argv[outFlag + 1]
  ? resolve(process.argv[outFlag + 1]!)
  : join(root, "src/animation/assets/sweet-scent.json");
const sourcePath = join(
  reference,
  "graphics/battle_anims/sprites/pink_petal.png",
);
const image = decodeIndexedPng(sourcePath);
const sliced = sliceTiles(image);

if (image.width !== 8 || image.height !== 32
  || sliced.columns !== 1 || sliced.rows !== 4
  || sliced.tiles.length !== 4) {
  throw new Error("Sweet Scent PINK_PETAL source asset geometry changed");
}

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify({
  source: {
    art: "graphics/battle_anims/sprites/pink_petal.png",
    graphics: "gBattleAnimSpriteGfx_PinkPetal; ANIM_TAG_PINK_PETAL",
    palette: "gBattleAnimSpritePal_PinkPetal; ANIM_TAG_PINK_PETAL",
    template:
      "gSweetScentPetalSpriteTemplate; gOamData_AffineOff_ObjNormal_8x8",
    animation:
      "gSweetScentPetalAnimCmds1/gSweetScentPetalAnimCmds2; four 8-tick cells with hFlip/vFlip variants",
  },
  pinkPetal: {
    tileset: {
      columns: sliced.columns,
      rows: sliced.rows,
      tiles: sliced.tiles.map((tile) => [...tile.pixels]),
    },
    palette: image.palette,
  },
})}\n`);
console.log(`wrote ${output}`);
