// Reproducible source extraction for MOVE_HAIL's exclusive 16x16 particle.
// ICE_CRYSTALS is shared and already extracted by
// tools/extract/extract-battle-move-anim-assets.ts.
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
  : join(root, "src/animation/assets/hail.json");
const sourcePath = join(ref, "graphics/battle_anims/sprites/hail.png");
const image = decodeIndexedPng(sourcePath);
const sliced = sliceTiles(image);
if (image.width !== 16 || image.height !== 16
  || sliced.columns !== 2 || sliced.rows !== 2
  || sliced.tiles.length !== 4) {
  throw new Error("Hail source asset geometry changed");
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    art: "graphics/battle_anims/sprites/hail.png",
    graphics: "gBattleAnimSpriteGfx_Hail; ANIM_TAG_HAIL",
    palette: "gBattleAnimSpritePal_Hail; ANIM_TAG_HAIL",
    template: "gHailParticleSpriteTemplate; gOamData_AffineNormal_ObjNormal_16x16",
    sharedIceCrystals: "src/assets/gen/battle-anim-ice-crystals.json; ANIM_TAG_ICE_CRYSTALS",
  },
  particle: {
    tileset: {
      columns: sliced.columns,
      rows: sliced.rows,
      tiles: sliced.tiles.map((tile) => [...tile.pixels]),
    },
    palette: image.palette,
  },
})}\n`);
console.log(`wrote ${out}`);
