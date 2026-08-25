// Reproducible source extraction for MOVE_MEAN_LOOK's EYE tag.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const outFlag = process.argv.indexOf("--out");
const output = outFlag >= 0 && process.argv[outFlag + 1]
  ? resolve(process.argv[outFlag + 1]!)
  : join(root, "src/animation/assets/mean-look.json");
const image = decodeIndexedPng(join(
  root,
  "reference/pokeemerald/graphics/battle_anims/sprites/eye.png",
));
const sliced = sliceTiles(image);
if (image.width !== 64 || image.height !== 64
  || sliced.columns !== 8 || sliced.rows !== 8 || sliced.tiles.length !== 64) {
  throw new Error("Mean Look EYE source asset geometry changed");
}
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify({
  source: {
    art: "graphics/battle_anims/sprites/eye.png",
    graphics: "gBattleAnimSpriteGfx_Eye; ANIM_TAG_EYE; 0x0800 bytes",
    palette: "gBattleAnimSpritePal_Eye; ANIM_TAG_EYE",
    template: "gMeanLookEyeSpriteTemplate; gOamData_AffineDouble_ObjBlend_64x64",
  },
  eye: {
    tileset: { columns: sliced.columns, rows: sliced.rows, tiles: sliced.tiles.map((tile) => [...tile.pixels]) },
    palette: image.palette,
  },
})}\n`);
console.log(`wrote ${output}`);
