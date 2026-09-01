// Reproducible source extraction for MOVE_GRUDGE's 16x128 purple-flame sheet.
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
  : join(root, "src/animation/assets/purple-flame.json");
const sourcePath = join(ref, "graphics/battle_anims/sprites/purple_flame.png");
const image = decodeIndexedPng(sourcePath);
const sliced = sliceTiles(image);
if (image.width !== 16 || image.height !== 128
  || sliced.columns !== 2 || sliced.rows !== 16 || sliced.tiles.length !== 32) {
  throw new Error("Purple Flame source asset geometry changed");
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    art: "graphics/battle_anims/sprites/purple_flame.png",
    graphics: "gBattleAnimSpriteGfx_PurpleFlame; ANIM_TAG_PURPLE_FLAME",
    palette: "gBattleAnimSpritePal_PurpleFlame; ANIM_TAG_PURPLE_FLAME",
    template: "gGrudgeFlameSpriteTemplate; gOamData_AffineOff_ObjBlend_16x32",
  },
  flame: {
    tileset: {
      columns: sliced.columns,
      rows: sliced.rows,
      tiles: sliced.tiles.map((tile) => [...tile.pixels]),
    },
    palette: image.palette,
  },
})}\n`);
console.log(`wrote ${out}`);
