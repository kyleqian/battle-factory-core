// Reproducible source extraction for Move_SPIKES's ANIM_TAG_SPIKES 16x16 OBJ.
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
  : join(root, "src/animation/assets/spikes.json");
const sourcePath = join(ref, "graphics/battle_anims/sprites/spikes.png");
const image = decodeIndexedPng(sourcePath);
const sliced = sliceTiles(image);
if (image.width !== 16 || image.height !== 16
  || sliced.columns !== 2 || sliced.rows !== 2 || sliced.tiles.length !== 4) {
  throw new Error("Spikes source asset geometry changed");
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    art: "graphics/battle_anims/sprites/spikes.png",
    graphics: "gBattleAnimSpriteGfx_Spikes; ANIM_TAG_SPIKES",
    palette: "gBattleAnimSpritePal_Spikes; ANIM_TAG_SPIKES",
    template: "gSpikesSpriteTemplate; gOamData_AffineOff_ObjNormal_16x16",
  },
  spike: {
    tileset: {
      columns: sliced.columns,
      rows: sliced.rows,
      tiles: sliced.tiles.map((tile) => [...tile.pixels]),
    },
    palette: image.palette,
  },
})}\n`);
console.log(`wrote ${out}`);
