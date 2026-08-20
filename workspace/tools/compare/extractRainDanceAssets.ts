// Reproducible source extraction for MOVE_RAIN_DANCE's exclusive Rain Drops
// sprite sheet. The 16x224 PNG is seven vertically stacked 16x32 frames,
// exactly matching sAnim_RainDrop's 0,8,...,48 tile offsets.
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
  : join(root, "src/animation/assets/rain-drops.json");
const path = join(
  ref,
  "graphics/battle_anims/sprites/rain_drops.png",
);
const image = decodeIndexedPng(path);
const sliced = sliceTiles(image);
if (image.width !== 16 || image.height !== 224
  || sliced.columns !== 2 || sliced.rows !== 28
  || sliced.tiles.length !== 56) {
  throw new Error("Rain Drops source geometry changed");
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    art: "graphics/battle_anims/sprites/rain_drops.png",
    graphics: "gBattleAnimSpriteGfx_RainDrops; ANIM_TAG_RAIN_DROPS",
    palette: "gBattleAnimSpritePal_RainDrops; ANIM_TAG_RAIN_DROPS",
    template: "gRainDropSpriteTemplate; gOamData_AffineOff_ObjNormal_16x32",
    animation: "sAnim_RainDrop tile offsets 0,8,16,24,32,40,48",
  },
  rainDrops: {
    tileset: {
      columns: sliced.columns,
      rows: sliced.rows,
      tiles: sliced.tiles.map((tile) => [...tile.pixels]),
    },
    palette: image.palette,
    frameTileRows: 4,
    frameCount: 7,
  },
})}\n`);
console.log(`wrote ${out}`);
